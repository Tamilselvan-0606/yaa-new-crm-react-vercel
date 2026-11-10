import { HistoryTimelineView } from "../../../components/common/HistoryTimelineView";
import { CommonTableHead } from '../../../components/common/CommonTableHead';
import { SupplierSearchableSelect, ProductSearchableSelect } from '../../../components/common/paginated-select';
import { getNextPurchaseReturnNumber } from '../../../utils/documentNumbering';
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowDownLeft,
  Plus,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  RotateCcw,
  IndianRupee,
  Printer,
  MoreVertical,
  Check,
  X,
  Forward,
  FileSpreadsheet,
  Loader2,
  PackageCheck,
  Building2,
  History,
  Trash2,
  Download,
} from 'lucide-react';
import {
  PurchaseReturn,
  PurchaseReturnItem,
  PurchaseReturnStatus,
  PurchaseOrder,
} from '../../../store/useSalesManagementStore';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { DeleteConfirmationModal } from '../../../components/common/DeleteConfirmationModal';
import { Pagination } from '../../../components/common/Pagination';
import { SearchBar } from '../../../components/common/SearchBar';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { exportTableToExcel } from '../../../utils/excelExport';
import { UniversalShareDropdown, formatPurchaseReturnShare } from '../../../utils/shareUtils';
import { printBusinessDocument, printTableReport, downloadBusinessDocument, DocumentPrintOptions } from '../../../utils/printUtils';
import { toast } from "../../../utils/toast";
import { useDispatch } from 'react-redux';
import {
  commercePurchaseReturnApi,
  mapApiPurchaseReturnToUi,
  mapUiToCreatePayload,
  mapUiToUpdatePayload,
  ensureValidUuid,
  UUID_REGEX,
} from '../../../api/commerce/purchaseReturnApi';
import { workPurchaseOrderApi, mapApiPurchaseOrderToUi, stockApi, baseApi } from '../../../api';
import { productApi, ApiProduct } from '../../../api/commerce/productApi';
import { SearchableSelect } from '../../../components/common/SearchableSelect';
import { FormLabel, FORM_INPUT_CLS, FORM_INPUT_DISABLED_CLS, FORM_SELECT_CLS, FORM_TEXTAREA_CLS, handleNonNegativeKeyDown } from '../utils/formUtils';
import { SaleActionDropdown } from '../utils';
import { FormError } from '../../../components/common/FormError';
import {
  FieldErrors,
  checkRequiredSelection,
  checkRecordId,
  checkQuantity,
  checkMoney,
  checkRequiredDate,
  checkDateNotBefore,
  checkTotalConsistency,
  collectErrors,
  useFieldErrors,
  useRevalidateAfterSubmit,
  useSubmitGuard,
  fieldAttr,
  focusField,
  extractApiFieldErrors,
  getApiErrorMessage,
} from '../../../utils/formValidation';

import { formatDate } from '../utils/dateUtils';

// -----------------------------------------------------------------------------
// Validation (pure functions - no API calls, no state changes)
// -----------------------------------------------------------------------------

const round2Return = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const fmtInrReturn = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** A row the user never touched (no product, price, batch or remarks) is ignored, exactly like before. */
const isBlankReturnRow = (it: PurchaseReturnItem): boolean =>
  !it.productId &&
  !(it.productName || '').trim() &&
  !Number(it.unitPrice) &&
  !(it.batch || '').trim() &&
  !(it.remarks || '').trim();

/**
 * Rows that will actually be submitted. When a purchase bill was picked its lines are pre-loaded with
 * quantity 0, so a zero quantity there simply means "this line is not being returned".
 */
const getReturnRowsToSubmit = (items: PurchaseReturnItem[], purchaseSelected: boolean) =>
  items.filter(
    (it) =>
      !isBlankReturnRow(it) && !(purchaseSelected && Number(it.returnQuantity) === 0),
  );

interface ReturnFormValidationInput {
  supplierId: string;
  returnDate: string;
  items: PurchaseReturnItem[];
  /** Purchase bill chosen from the list (authoritative purchased quantities). */
  purchase?: PurchaseOrder;
  purchaseSelected: boolean;
  /** Quantity of a product already returned against the chosen purchase bill (excluding this return). */
  alreadyReturned: (productId: string, productName: string) => number;
  totalReturnAmount: number;
}

/** Validates the whole purchase return form. Returns `fieldKey -> message` (empty when valid). */
const validatePurchaseReturnForm = (f: ReturnFormValidationInput): FieldErrors => {
  const errors: FieldErrors = {};

  const supplierErr = !f.supplierId
    ? checkRequiredSelection('', 'supplier')
    : checkRecordId(f.supplierId, 'supplier');
  Object.assign(
    errors,
    collectErrors([
      ['supplierId', supplierErr],
      ['returnDate', checkRequiredDate(f.returnDate, 'return date')],
    ]),
  );
  if (errors.returnDate === undefined && f.purchase) {
    const e = checkDateNotBefore(f.returnDate, f.purchase.purchaseDate, 'return date', 'purchase date');
    if (e) errors.returnDate = e;
  }

  let included = 0;
  let expectedTotal = 0;
  f.items.forEach((it, i) => {
    if (isBlankReturnRow(it)) return;
    if (f.purchaseSelected && Number(it.returnQuantity) === 0) return;
    included++;
    const key = (k: string) => `items.${i}.${k}`;

    // Product must be a real record chosen from the list - never a guessed / generated one.
    const productErr = !it.productId
      ? checkRequiredSelection('', 'product')
      : checkRecordId(it.productId, 'product') ||
        ((it.productName || '').trim() ? null : 'Please choose the product from the list.');
    if (productErr) errors[key('product')] = productErr;

    const qtyErr = checkQuantity(it.returnQuantity, { label: 'return quantity' });
    if (qtyErr) {
      errors[key('quantity')] = qtyErr;
    } else {
      const qty = Number(it.returnQuantity);
      // Quantity originally purchased: prefer the purchase bill's own lines over the editable column.
      let purchased = Number(it.purchasedQuantity) || 0;
      if (f.purchase) {
        const matches = (f.purchase.items || []).filter(
          (pi) =>
            (it.productId && pi.productId === it.productId) ||
            (pi.productName || '').trim().toLowerCase() === (it.productName || '').trim().toLowerCase(),
        );
        if (matches.length > 0) {
          purchased = matches.reduce((s, pi) => s + (Number(pi.quantity) || 0), 0);
        }
      }
      const already = f.purchase ? f.alreadyReturned(it.productId, it.productName) : 0;
      const available = purchased - already;
      if (purchased > 0 && qty > available + 0.0005) {
        errors[key('quantity')] =
          f.purchase && already > 0
            ? available <= 0
              ? `All ${purchased} units of this product have already been returned.`
              : `Only ${available} left to return (purchased ${purchased}, already returned ${already}).`
            : `Return quantity cannot exceed the purchased quantity of ${purchased}.`;
      }
    }

    const priceErr = checkMoney(it.unitPrice, 'unit price', { allowZero: true });
    if (priceErr) errors[key('price')] = priceErr;

    if (!qtyErr && !priceErr) {
      const expected = round2Return(Number(it.returnQuantity) * Number(it.unitPrice));
      expectedTotal += expected;
      const totalErr = checkTotalConsistency(expected, it.returnAmount, 'line total', 0.02);
      if (totalErr) errors[key('total')] = totalErr;
    }
  });

  if (included === 0) {
    errors.items = 'Please add at least one item with a return quantity greater than zero.';
  } else if (!Object.keys(errors).some((k) => k.startsWith('items.'))) {
    const totalErr = checkTotalConsistency(
      expectedTotal,
      f.totalReturnAmount,
      'return amount',
      0.01 * included + 0.05,
    );
    const billTotal = Number(f.purchase?.grandTotal) || 0;
    if (totalErr) {
      errors.total = totalErr;
    } else if (f.purchase && billTotal > 0 && f.totalReturnAmount > billTotal + 0.005) {
      errors.total = `The return amount cannot exceed the purchase bill total of ${fmtInrReturn(billTotal)}.`;
    }
  }

  return errors;
};

/** Checks a saved return before a quick status action (approve / complete). Returns a friendly sentence or null. */
const validateReturnStatusChange = (
  pret: PurchaseReturn,
  nextStatus: PurchaseReturnStatus,
): string | null => {
  const current = pret.returnStatus;
  if (current === nextStatus) return `This return is already ${nextStatus.toLowerCase()}.`;
  if (current === 'Completed' || current === 'Returned') {
    return 'Completed returns are final and cannot be changed.';
  }
  if (current === 'Cancelled' || current === 'Rejected') {
    return `A ${current.toLowerCase()} return cannot be changed.`;
  }
  if (nextStatus === 'Approved' && current !== 'Requested') {
    return 'Only requested returns can be approved.';
  }
  if (nextStatus === 'Completed' || nextStatus === 'Dispatched' || nextStatus === 'Returned') {
    if (!pret.items || pret.items.length === 0) return 'This return has no items to send back.';
    for (let i = 0; i < pret.items.length; i++) {
      const it = pret.items[i];
      const name = it.productName || `item ${i + 1}`;
      if (!pret.stockDeducted) {
        if (checkRecordId(it.productId, 'product')) {
          return `Please choose the product from the list for "${name}" before completing this return.`;
        }
      }
      if (!(Number(it.returnQuantity) > 0)) {
        return `Return quantity must be greater than zero for "${name}".`;
      }
    }
  }
  return null;
};

/** Maps backend field paths (`items.0.returnQuantity`) onto this form's field keys. */
const mapReturnApiFieldKey = (path: string): string => {
  const m = path.match(/^items\.(\d+)\.(.+)$/);
  if (m) {
    const map: Record<string, string> = {
      productId: 'product',
      productName: 'product',
      returnQuantity: 'quantity',
      purchasedQuantity: 'quantity',
      unitPrice: 'price',
      returnAmount: 'total',
    };
    return `items.${m[1]}.${map[m[2]] || m[2]}`;
  }
  const top: Record<string, string> = {
    supplierId: 'supplierId',
    supplierName: 'supplierId',
    returnDate: 'returnDate',
    returnAmount: 'total',
    items: 'items',
  };
  return top[path] || path;
};

export const PurchaseReturnView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  // Inline validation state and double-submit guards
  const retErr = useFieldErrors();
  const saveGuard = useSubmitGuard();
  const statusGuard = useSubmitGuard();
  const deleteGuard = useSubmitGuard();

  // Track converted Purchase Order ID to update its status to 'Returned' upon saving
  const [originatingPurchaseId, setOriginatingPurchaseId] = useState<string | null>(null);
  const hasConvertedPoRef = useRef(false);

  // ---------------------------------------------------------
  // Live Commerce API State
  // ---------------------------------------------------------
  const [liveReturns, setLiveReturns] = useState<PurchaseReturn[]>([]);

  // Computed next preview number based on currently loaded purchase returns
  const computedPreviewNo = useMemo(() => {
    return getNextPurchaseReturnNumber(liveReturns);
  }, [liveReturns]);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState<boolean | null>(null);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const [totalApiRecords, setTotalApiRecords] = useState<number | null>(null);
  const [apiSummary, setApiSummary] = useState<NonNullable<import("../../../api/commerce/purchaseReturnTypes").PurchaseReturnListResponse["summary"]> | null>(null);
  const [totalApiPages, setTotalApiPages] = useState<number | null>(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<ApiProduct[]>([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  // Purchase bills offered in the "Purchase Order" picker, loaded from the API each time the form opens
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);

  // Deduplication refs for fetch
  const isFetchingRef = useRef(false);
  const lastFetchKeyRef = useRef<string | null>(null);

  // Filter & Pagination State
  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pendingStatus, setPendingStatus] = useState('All');
  const [appliedStatus, setAppliedStatus] = useState('All');
  const [pendingRefundStatus, setPendingRefundStatus] = useState('All');
  const [appliedRefundStatus, setAppliedRefundStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // 3-Dots Action dropdown & Share Popover State
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [activeShareId, setActiveShareId] = useState<string | null>(null);
  const [sharePos, setSharePos] = useState<{ top?: number; bottom?: number; right?: number } | null>(null);

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingReturn, setEditingReturn] = useState<PurchaseReturn | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [historyReturn, setHistoryReturn] = useState<PurchaseReturn | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<PurchaseReturn | null>(null);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetReturn, setDeleteTargetReturn] = useState<PurchaseReturn | null>(null);
  const [isDeletingReturn, setIsDeletingReturn] = useState(false);
  const [deleteReturnError, setDeleteReturnError] = useState<string | null>(null);
  const [isDownloadingReturn, setIsDownloadingReturn] = useState(false);

  const handleOpenHistory = async (pret: PurchaseReturn) => {
    setActiveDropdownId(null);
    setHistoryReturn(pret);
    setIsLoadingHistory(true);
    try {
      if (pret.id) {
        const res = await commercePurchaseReturnApi.getPurchaseReturnById(pret.id);
        if (res?.data) {
          const freshReturn = mapApiPurchaseReturnToUi(res.data);
          setHistoryReturn(freshReturn);
        }
      }
    } catch (err) {
      console.warn('Failed to load live purchase return history from API:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  type RefundStatusType = 'Pending' | 'Refunded' | 'Supplier Credit' | 'Adjusted';

  // Form State
  const [selectedPurchaseId, setSelectedPurchaseId] = useState('');
  const [manualPurchaseNo, setManualPurchaseNo] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  // Display name of the supplier picked from the paginated selector / loaded from a saved return
  const [selectedSupplierName, setSelectedSupplierName] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnItems, setReturnItems] = useState<PurchaseReturnItem[]>([]);
  const [refundStatus, setRefundStatus] = useState<RefundStatusType>('Supplier Credit');
  const [returnStatus, setReturnStatus] = useState<string>('Requested');
  const [notes, setNotes] = useState('');

  // On-demand product search: calls products API when user is searching or opening product selector
  const handleProductSearch = useCallback(async (query = '') => {
    const trimmed = query.trim();
    setIsSearchingProducts(true);
    try {
      const res = await productApi.getProducts({
        search: trimmed || undefined,
        page_size: 50,
        pagination_required: false,
      });
      if (res && res.data && Array.isArray(res.data)) {
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
      console.warn('Failed to search products in PurchaseReturnView:', err);
    } finally {
      setIsSearchingProducts(false);
    }
  }, []);

  // Load initial products list when the return form modal first opens (once per screen session)
  const hasLoadedInitialProductsRef = useRef(false);
  useEffect(() => {
    if (isCreateModalOpen && !hasLoadedInitialProductsRef.current) {
      hasLoadedInitialProductsRef.current = true;
      handleProductSearch('');
    }
  }, [isCreateModalOpen, handleProductSearch]);

  useEffect(() => {
    if (!isCreateModalOpen) return;
    let cancelled = false;
    workPurchaseOrderApi
      .getPurchaseOrders({ limit: 100, pagination_required: false })
      .then((res) => {
        if (!cancelled) setPurchases(Array.isArray(res?.data) ? res.data.map(mapApiPurchaseOrderToUi) : []);
      })
      .catch(() => {
        if (!cancelled) setPurchases([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isCreateModalOpen]);

  // Product options: searched API products plus items already on this return
  const productOptions = useMemo(() => {
    const map = new Map<string, { value: string; label: string; subLabel?: string; badge?: string }>();
    availableProducts.forEach((p) => {
      map.set(p.id, {
        value: p.id,
        label: p.productName || (p as any).name || 'Product',
        subLabel: p.productCode ? `Code: ${p.productCode}` : undefined,
        badge: p.productCode || undefined,
      });
    });
    returnItems.forEach((it) => {
      if (it.productId && !map.has(it.productId)) {
        map.set(it.productId, {
          value: it.productId,
          label: it.productName || 'Product',
        });
      }
    });
    // Only products returned by the products API are selectable (no stale inventory-store fallback).
    return Array.from(map.values());
  }, [availableProducts, returnItems]);

  // If navigated from Purchase Bills (Convert to Return) - open creation modal with pre-filled items
  useEffect(() => {
    const locState = location.state as
      | {
          newReturn?: PurchaseReturn;
          convertFromPo?: {
            purchaseId: string;
            purchaseNo: string;
            supplierId?: string;
            supplierName?: string;
            items: PurchaseReturnItem[];
            totalAmount?: number;
            notes?: string;
          };
        }
      | undefined;

    if (locState?.convertFromPo && !hasConvertedPoRef.current) {
      hasConvertedPoRef.current = true;
      const poData = locState.convertFromPo;

      retErr.reset();
      setEditingReturn(null);
      setSelectedPurchaseId(poData.purchaseId || '');
      setManualPurchaseNo(poData.purchaseNo || '');
      setSelectedSupplierId(poData.supplierId || '');
      setSelectedSupplierName(poData.supplierName || '');
      setReturnDate(new Date().toISOString().split('T')[0]);
      setRefundStatus('Supplier Credit');
      setReturnStatus('Requested');
      setNotes(poData.notes || `Return from Purchase Bill ${poData.purchaseNo}`);
      setReturnItems(
        poData.items && poData.items.length > 0
          ? poData.items
          : [
              {
                id: `pr_ret_it_${Date.now()}_0`,
                productId: '',
                productName: '',
                purchasedQuantity: 1,
                returnQuantity: 1,
                unitPrice: 0,
                returnAmount: 0,
                reason: 'Defective',
                remarks: '',
              },
            ]
      );
      if (poData.purchaseId) {
        setOriginatingPurchaseId(poData.purchaseId);
      }

      setIsCreateModalOpen(true);
      // Clean up React Router state so closing/refreshing won't bounce back
      navigate(location.pathname, { replace: true, state: {} });
      toast.info(`Opened Purchase Return form prefilled from ${poData.purchaseNo}.`);
      return;
    }

    if (locState?.newReturn) {
      const incoming = locState.newReturn;
      setLiveReturns((prev) => {
        if (!prev.some((r) => r.id === incoming.id || r.returnNo === incoming.returnNo)) {
          return [incoming, ...prev];
        }
        return prev;
      });
      setTotalApiRecords((prev) => (prev !== null ? prev + 1 : 1));
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);


  // ---------------------------------------------------------
  // 2. Fetch Purchase Returns from Commerce API with deduplication
  // ---------------------------------------------------------
  const fetchPurchaseReturns = useCallback(
    async (
      forceRefresh = false,
      overrides?: {
        search?: string;
        status?: string;
        refundStatus?: string;
        page?: number;
      }
    ) => {
      const targetPage = overrides?.page ?? currentPage;
      const targetSearch = overrides?.search !== undefined ? overrides.search : appliedSearch;
      const targetStatus = overrides?.status !== undefined ? overrides.status : appliedStatus;
      const targetRefund = overrides?.refundStatus !== undefined ? overrides.refundStatus : appliedRefundStatus;
      const fetchKey = `${targetPage}_${pageSize}_${targetSearch.trim()}_${targetStatus}_${targetRefund}`;
      if (isFetchingRef.current) return;
      if (!forceRefresh && lastFetchKeyRef.current === fetchKey) return;

      isFetchingRef.current = true;
      lastFetchKeyRef.current = fetchKey;
      setIsApiLoading(true);

      try {
        const response = await commercePurchaseReturnApi.getPurchaseReturns({
          page_no: targetPage,
          page_size: pageSize,
          pagination_required: true,
          sortOrder: 'desc',
          search: targetSearch.trim() || undefined,
          returnStatus: targetStatus !== 'All' ? targetStatus : undefined,
          refundStatus: targetRefund !== 'All' ? targetRefund : undefined,
        });

        if (response && response.success && Array.isArray(response.data)) {
          const mappedReturns = response.data.map((r) => mapApiPurchaseReturnToUi(r));
          setLiveReturns(mappedReturns);
          setIsApiConnected(true);
          setApiErrorMessage(null);

          setApiSummary(response.summary ?? null);
          if (response.pagination) {
            setTotalApiRecords(response.pagination.totalRecords ?? mappedReturns.length);
            setTotalApiPages(response.pagination.totalPages ?? 1);
          } else {
            setTotalApiRecords(mappedReturns.length);
            setTotalApiPages(Math.ceil(mappedReturns.length / pageSize) || 1);
          }
        } else {
          setIsApiConnected(true);
          setLiveReturns([]);
          setTotalApiRecords(0);
          setTotalApiPages(1);
        }
      } catch (err: any) {
        const errMsg =
          err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          err?.message ||
          'Failed to load purchase returns from the API';
        console.warn('Commerce Purchase Returns API unavailable:', errMsg);
        setIsApiConnected(false);
        setApiErrorMessage(errMsg);
        setLiveReturns([]);
        setTotalApiRecords(null);
        setTotalApiPages(null);
      } finally {
        isFetchingRef.current = false;
        setIsApiLoading(false);
      }
    },
    [currentPage, pageSize, appliedSearch, appliedStatus, appliedRefundStatus]
  );

  // Initial and reactive fetch on filter change
  useEffect(() => {
    fetchPurchaseReturns();
  }, [fetchPurchaseReturns]);


  // Close dropdowns on outside click or scroll
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

  // ---------------------------------------------------------
  // Effective Display Records & Summary Metrics
  // ---------------------------------------------------------
  const effectiveReturns = useMemo(() => {
    const sourceList = liveReturns;

    if (isApiConnected && totalApiRecords !== null) {
      return sourceList;
    }

    return sourceList.filter((r) => {
      const q = appliedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.returnNo.toLowerCase().includes(q) ||
        r.purchaseNo.toLowerCase().includes(q) ||
        r.supplierName.toLowerCase().includes(q);

      const matchesStatus =
        appliedStatus === 'All' || r.returnStatus.toLowerCase() === appliedStatus.toLowerCase();

      const matchesRefund =
        appliedRefundStatus === 'All' || r.refundStatus.toLowerCase() === appliedRefundStatus.toLowerCase();

      return matchesSearch && matchesStatus && matchesRefund;
    });
  }, [liveReturns, isApiConnected, totalApiRecords, appliedSearch, appliedStatus, appliedRefundStatus]);

  const localSummary = useMemo(() => {
    const all = liveReturns;
    const totalCount = totalApiRecords !== null ? totalApiRecords : all.length;
    const pendingCount = all.filter((r) => r.returnStatus === 'Requested').length;
    const approvedCount = all.filter(
      (r) => r.returnStatus === 'Approved' || r.returnStatus === 'Dispatched'
    ).length;
    const completedCount = all.filter((r) => r.returnStatus === 'Completed').length;
    const returnAmount = all.reduce((acc, r) => acc + (Number(r.returnAmount) || 0), 0);

    return {
      totalCount,
      pendingCount,
      approvedCount,
      completedCount,
      returnAmount,
    };
  }, [liveReturns, totalApiRecords]);
  const summary = apiSummary ?? localSummary;

  // Pagination calculation
  const totalPages =
    totalApiPages !== null
      ? totalApiPages
      : Math.ceil(effectiveReturns.length / pageSize) || 1;

  const paginatedReturns = useMemo(() => {
    if (isApiConnected && totalApiRecords !== null && effectiveReturns.length <= pageSize) {
      return effectiveReturns;
    }
    const start = (currentPage - 1) * pageSize;
    return effectiveReturns.slice(start, start + pageSize);
  }, [effectiveReturns, isApiConnected, totalApiRecords, currentPage, pageSize]);

  // ---------------------------------------------------------
  // Form Helpers & Calculations
  // ---------------------------------------------------------
  const chosenPurchase = useMemo(() => {
    return purchases.find((p) => p.id === selectedPurchaseId);
  }, [purchases, selectedPurchaseId]);

  const chosenSupplier = useMemo(() => {
    if (chosenPurchase) {
      return { id: chosenPurchase.supplierId, name: chosenPurchase.supplierName };
    }
    return { id: selectedSupplierId, name: selectedSupplierName };
  }, [chosenPurchase, selectedSupplierId, selectedSupplierName]);

  // Quantity of a product already returned against the chosen purchase bill (other, non-cancelled returns).
  const getAlreadyReturnedQty = (productId: string, productName: string): number => {
    if (!chosenPurchase) return 0;
    const all = new Map<string, PurchaseReturn>();
    liveReturns.forEach((r) => all.set(r.id, r));
    let total = 0;
    all.forEach((r) => {
      if (editingReturn && r.id === editingReturn.id) return;
      if (r.returnStatus === 'Cancelled' || r.returnStatus === 'Rejected') return;
      const samePurchase =
        (r.purchaseId && r.purchaseId === chosenPurchase.id) ||
        (r.purchaseNo && r.purchaseNo === chosenPurchase.purchaseNo);
      if (!samePurchase) return;
      (r.items || []).forEach((ri) => {
        const sameProduct =
          (productId && ri.productId === productId) ||
          (ri.productName || '').trim().toLowerCase() === (productName || '').trim().toLowerCase();
        if (sameProduct) total += Number(ri.returnQuantity) || 0;
      });
    });
    return total;
  };

  const totalCalculatedReturnAmount = useMemo(() => {
    return returnItems.reduce((acc, it) => acc + (Number(it.returnAmount) || 0), 0);
  }, [returnItems]);

  // Handle PO selection: auto-fills items from PO
  const handleSelectPurchase = (poId: string) => {
    retErr.reset();
    setSelectedPurchaseId(poId);
    const po = purchases.find((p) => p.id === poId);
    if (po) {
      setSelectedSupplierId(po.supplierId);
      setSelectedSupplierName(po.supplierName || '');
      setManualPurchaseNo(po.purchaseNo);
      const items: PurchaseReturnItem[] = po.items.map((it, idx) => ({
        id: `pr_ret_it_${Date.now()}_${idx}`,
        // Keep the real id: a missing / non-UUID id is reported at save time instead of
        // being replaced by a randomly generated one.
        productId: it.productId || '',
        productName: it.productName,
        batch: (it.batch && it.batch !== 'SELECT BATCH' ? it.batch : (it as any).batchNo || '').trim(),
        purchasedQuantity: Number(it.quantity) || 1,
        returnQuantity: 0,
        unitPrice: Number(it.purchasePrice) || 0,
        returnAmount: 0,
        reason: 'Damaged',
        remarks: '',
      }));
      setReturnItems(items);
    } else {
      setReturnItems([]);
    }
  };

  const handleReturnQtyChange = (index: number, qty: number) => {
    // Errors are shown/cleared by submit + useRevalidateAfterSubmit, never while typing first.
    if (isNaN(qty) || qty < 0) {
      return;
    }
    setReturnItems((prev) => {
      const copy = [...prev];
      const it = { ...copy[index] };
      // Not clamped to the purchased quantity: an excess is reported inline on submit.
      const cleanQty = Math.max(0, qty);
      it.returnQuantity = cleanQty;
      it.returnAmount = Math.round(cleanQty * it.unitPrice * 100) / 100;
      copy[index] = it;
      return copy;
    });
  };

  const handleUnitPriceChange = (index: number, price: number) => {
    if (isNaN(price) || price < 0) {
      return;
    }
    setReturnItems((prev) => {
      const copy = [...prev];
      const it = { ...copy[index] };
      it.unitPrice = Math.max(0, price);
      it.returnAmount = Math.round(it.returnQuantity * it.unitPrice * 100) / 100;
      copy[index] = it;
      return copy;
    });
  };

  const handleReasonChange = (index: number, reason: any) => {
    setReturnItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], reason };
      return copy;
    });
  };

  const handleRemarksChange = (index: number, remarks: string) => {
    setReturnItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], remarks };
      return copy;
    });
  };

  const handleProductSelect = (index: number, productId: string) => {
    const foundApi = availableProducts.find((p) => p.id === productId);
    const foundOption = productOptions.find((o) => o.value === productId);

    const name = foundApi?.productName || (foundApi as any)?.name || foundOption?.label || '';
    const price = foundApi?.purchasePrice ?? (foundApi as any)?.costPrice ?? 0;

    retErr.clearError(`items.${index}.product`);
    retErr.clearError(`items.${index}.price`);
    retErr.clearError(`items.${index}.total`);
    retErr.clearError('items');
    retErr.clearError('total');
    setReturnItems((prev) => {
      const copy = [...prev];
      const it = { ...copy[index] };
      // Keep the id the user actually picked; a non-UUID id is flagged at save time
      // ("Please choose the product from the list.") instead of being swapped for a random one.
      it.productId = productId;
      it.productName = name;
      it.unitPrice = Number(price) || 0;
      it.returnAmount = Math.round(it.returnQuantity * it.unitPrice * 100) / 100;
      copy[index] = it;
      return copy;
    });
  };

  const handleAddReturnItem = () => {
    setReturnItems((prev) => [
      ...prev,
      {
        id: `pr_ret_it_${Date.now()}_${prev.length}`,
        productId: '',
        productName: '',
        purchasedQuantity: 1,
        returnQuantity: 1,
        unitPrice: 0,
        returnAmount: 0,
        reason: 'Damaged',
        remarks: '',
      },
    ]);
  };

  const handleRemoveReturnItem = (index: number) => {
    // Row indexes shift after a removal, so drop all per-row messages.
    retErr.clearGroup('items.');
    retErr.clearError('total');
    setReturnItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Open Create Modal with clean defaults
  const handleOpenCreateModal = () => {
    retErr.reset();
    setEditingReturn(null);
    setSelectedPurchaseId('');
    setManualPurchaseNo('');
    setSelectedSupplierId('');
    setSelectedSupplierName('');
    setReturnDate(new Date().toISOString().split('T')[0]);
    setRefundStatus('Supplier Credit');
    setReturnStatus('Requested');
    setNotes('');
    setReturnItems([
      {
        id: `pr_ret_it_${Date.now()}_0`,
        productId: '',
        productName: '',
        purchasedQuantity: 1,
        returnQuantity: 1,
        unitPrice: 0,
        returnAmount: 0,
        reason: 'Damaged',
        remarks: '',
      },
    ]);
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  // Open the view modal, then load the latest record (GET /purchase-returns/:id)
  const handleOpenViewModal = async (pret: PurchaseReturn) => {
    setSelectedReturn(pret);
    setIsDetailModalOpen(true);
    try {
      if (pret.id) {
        const res = await commercePurchaseReturnApi.getPurchaseReturnById(pret.id);
        if (res?.data) {
          const fresh = mapApiPurchaseReturnToUi(res.data);
          setSelectedReturn((prev) => (prev && prev.id === pret.id ? { ...prev, ...fresh } : prev));
        }
      }
    } catch (err) {
      console.warn('Could not fetch purchase return details:', err);
    }
  };

  const handleOpenEditModal = (pret: PurchaseReturn) => {
    // Completed / returned / cancelled returns are locked: show the read-only view instead of the edit form.
    if (['Completed', 'Returned', 'Cancelled'].includes(pret.returnStatus as string)) {
      toast.warning(
        `Purchase return ${pret.returnNo} is ${String(pret.returnStatus).toLowerCase()} and locked from modifications.`,
      );
      handleOpenViewModal(pret);
      return;
    }
    retErr.reset();
    setEditingReturn(pret);
    setSelectedPurchaseId(pret.purchaseId || '');
    setManualPurchaseNo(pret.purchaseNo || '');
    setSelectedSupplierId(pret.supplierId || '');
    setSelectedSupplierName(pret.supplierName || '');
    setReturnDate(pret.returnDate || new Date().toISOString().split('T')[0]);
    setReturnItems(
      pret.items && pret.items.length > 0
        ? JSON.parse(JSON.stringify(pret.items))
        : [
            {
              id: `pr_ret_it_${Date.now()}_0`,
              productId: '',
              productName: '',
              purchasedQuantity: 1,
              returnQuantity: 1,
              unitPrice: 0,
              returnAmount: 0,
              reason: 'Damaged',
              remarks: '',
            },
          ]
    );
    setRefundStatus((pret.refundStatus as RefundStatusType) || 'Supplier Credit');
    setReturnStatus(pret.returnStatus || 'Requested');
    setNotes(pret.notes || '');
    setIsCreateModalOpen(true);
  };

  // Save / Submit Return (Enter key and the submit button both land here).
  // The submit guard stops double-clicks / repeated Enter from sending it twice.
  const handleSubmitReturnForm = (e: React.FormEvent) => {
    e.preventDefault();
    return saveGuard.runOnce(() => performSubmitReturn());
  };

  const purchaseSelected = Boolean(selectedPurchaseId);
  const computeReturnErrors = (): FieldErrors =>
    validatePurchaseReturnForm({
      supplierId: chosenSupplier.id || '',
      returnDate,
      items: returnItems,
      purchase: chosenPurchase,
      purchaseSelected,
      alreadyReturned: getAlreadyReturnedQty,
      totalReturnAmount: totalCalculatedReturnAmount,
    });

  // After the first Save attempt keep errors in sync with the values (cleared only when valid).
  useRevalidateAfterSubmit(retErr, computeReturnErrors, [
    chosenSupplier.id,
    returnDate,
    returnItems,
    chosenPurchase,
    purchaseSelected,
    totalCalculatedReturnAmount,
  ]);

  // The form starts and ends clean: no errors carried across open/close.
  useEffect(() => {
    retErr.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreateModalOpen]);

  const performSubmitReturn = async () => {
    // Validate EVERYTHING first. Nothing below (API call, stock outward, PO status patch,
    // list refresh, modal close) runs unless the form is valid.
    if (!retErr.validateAll(computeReturnErrors())) {
      return;
    }

    const targetSupplierName = (chosenSupplier.name || '').trim();
    const validItems = getReturnRowsToSubmit(returnItems, purchaseSelected);

    const effectivePurchaseNo =
      (chosenPurchase ? chosenPurchase.purchaseNo : manualPurchaseNo.trim()) ||
      `PO-MANUAL-${new Date().getFullYear()}`;

    const effectivePurchaseId =
      chosenPurchase?.id && UUID_REGEX.test(chosenPurchase.id) ? chosenPurchase.id : undefined;
    // Validated above as a real supplier record id (never a generated one).
    const effectiveSupplierId = chosenSupplier.id;

    setIsSubmittingForm(true);

    try {
      if (editingReturn) {
        // UPDATE MODE
        const updatePayload = mapUiToUpdatePayload({
          id: editingReturn.id,
          returnNo: editingReturn.returnNo,
          purchaseId: effectivePurchaseId,
          purchaseNo: effectivePurchaseNo,
          supplierId: effectiveSupplierId,
          supplierName: targetSupplierName,
          returnDate: returnDate,
          items: validItems,
          returnAmount: totalCalculatedReturnAmount,
          refundStatus: refundStatus,
          returnStatus: returnStatus as PurchaseReturnStatus,
          notes: notes,
        });

        let updatedReturn: PurchaseReturn;
        try {
          const apiRes = await commercePurchaseReturnApi.updatePurchaseReturn(
            editingReturn.id,
            updatePayload
          );

          if (apiRes?.data) {
            updatedReturn = mapApiPurchaseReturnToUi(apiRes.data);
          } else {
            throw new Error('No data returned from update API');
          }
        } catch (apiErr: any) {
          // The server answered and rejected the change: show the problem and keep the form as it is,
          // instead of pretending the update succeeded locally.
          if (apiErr?.response && UUID_REGEX.test(editingReturn.id)) throw apiErr;
          console.warn('API update failed (no server response or local-only record), updating local state:', apiErr);
          updatedReturn = {
            ...editingReturn,
            purchaseId: effectivePurchaseId,
            purchaseNo: effectivePurchaseNo,
            supplierId: effectiveSupplierId,
            supplierName: targetSupplierName,
            returnDate: returnDate,
            items: validItems,
            returnAmount: totalCalculatedReturnAmount,
            refundStatus: refundStatus,
            returnStatus: returnStatus as PurchaseReturnStatus,
            notes: notes,
            updatedAt: new Date().toISOString(),
          };
        }

        const isEnactedStatus =
          updatedReturn.returnStatus === 'Completed' ||
          updatedReturn.returnStatus === 'Returned' ||
          updatedReturn.returnStatus === 'Dispatched';

        if (isEnactedStatus && !editingReturn.stockDeducted) {
          let outwardCount = 0;
          for (const item of updatedReturn.items) {
            if (!item.productId || !item.returnQuantity) continue;
            try {
              const cleanBatch =
                (item.batch && item.batch.trim() && item.batch !== 'SELECT BATCH')
                  ? item.batch.trim()
                  : (((item as any).batchNo && (item as any).batchNo.trim() && (item as any).batchNo !== 'SELECT BATCH')
                      ? (item as any).batchNo.trim()
                      : undefined);
              await stockApi.adjustStock({
                productId: item.productId,
                quantity: -Math.abs(item.returnQuantity),
                batchNo: cleanBatch,
                adjustmentType: 'OUTWARD',
                reason: `Purchase Return ${updatedReturn.returnNo} (${updatedReturn.returnStatus})`,
                costPrice: item.unitPrice,
                supplierName: updatedReturn.supplierName,
              });
              outwardCount++;
            } catch (stkErr) {
              console.warn('API Stock outward return warning on edit:', stkErr);
            }
          }
          if (outwardCount > 0) {
            updatedReturn.stockDeducted = true;
            dispatch(
              baseApi.util.invalidateTags([
                { type: 'Stock', id: 'LIST' },
                { type: 'Batch', id: 'LIST' },
                { type: 'Stock', id: 'LEDGER' },
                { type: 'Product', id: 'LIST' },
              ])
            );
          }
        }

        toast.success(`Purchase return ${updatedReturn.returnNo} updated successfully!`);
      } else {
        // CREATE MODE
        const createPayload = mapUiToCreatePayload(
          {
            purchaseId: effectivePurchaseId,
            purchaseNo: effectivePurchaseNo,
            supplierId: effectiveSupplierId,
            supplierName: targetSupplierName,
            returnDate: returnDate,
            refundStatus: refundStatus,
            returnStatus: returnStatus,
            notes: notes,
          },
          validItems
        );

        let newReturn: PurchaseReturn;
        try {
          let apiRes;
          try {
            apiRes = await commercePurchaseReturnApi.createPurchaseReturn(createPayload);
          } catch (createErr: any) {
            // If backend rejects because purchaseId is not found in database, retry without purchaseId
            if (createErr?.response?.data?.error?.code === 'INVALID_PURCHASE' && createPayload.purchaseId) {
              console.warn('Purchase order not in backend DB; retrying create without purchaseId...');
              const { purchaseId, ...payloadWithoutPurchaseId } = createPayload;
              apiRes = await commercePurchaseReturnApi.createPurchaseReturn(payloadWithoutPurchaseId);
            } else {
              throw createErr;
            }
          }

          if (apiRes?.data) {
            newReturn = mapApiPurchaseReturnToUi(apiRes.data);
          } else {
            throw new Error('No data returned from create API');
          }
        } catch (apiErr: any) {
          console.warn('API create failed, saving to local store:', apiErr);
          const generatedNo = '';
          newReturn = {
            id: ensureValidUuid(),
            returnNo: generatedNo,
            purchaseId: effectivePurchaseId,
            purchaseNo: effectivePurchaseNo,
            supplierId: effectiveSupplierId,
            supplierName: targetSupplierName,
            returnDate: returnDate,
            items: validItems,
            returnAmount: totalCalculatedReturnAmount,
            refundStatus: refundStatus,
            returnStatus: returnStatus as PurchaseReturnStatus,
            notes: notes,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }

        // Outward stock deduction if created directly in an enacted return state
        if (newReturn.returnStatus === 'Completed' || newReturn.returnStatus === 'Returned' || newReturn.returnStatus === 'Dispatched') {
          let outwardCount = 0;
          for (const item of newReturn.items) {
            if (!item.productId || !item.returnQuantity) continue;
            try {
              const cleanBatch =
                (item.batch && item.batch.trim() && item.batch !== 'SELECT BATCH')
                  ? item.batch.trim()
                  : (((item as any).batchNo && (item as any).batchNo.trim() && (item as any).batchNo !== 'SELECT BATCH')
                      ? (item as any).batchNo.trim()
                      : undefined);
              await stockApi.adjustStock({
                productId: item.productId,
                quantity: -Math.abs(item.returnQuantity),
                batchNo: cleanBatch,
                adjustmentType: 'OUTWARD',
                reason: `Purchase Return ${newReturn.returnNo} (${newReturn.returnStatus})`,
                costPrice: item.unitPrice,
                supplierName: newReturn.supplierName,
              });
              outwardCount++;
            } catch (stkErr) {
              console.warn('API Stock outward return warning:', stkErr);
            }
          }
          if (outwardCount > 0) {
            newReturn.stockDeducted = true;
            dispatch(
              baseApi.util.invalidateTags([
                { type: 'Stock', id: 'LIST' },
                { type: 'Batch', id: 'LIST' },
                { type: 'Stock', id: 'LEDGER' },
                { type: 'Product', id: 'LIST' },
              ])
            );
          }
        }


        // If this return originated from a Purchase Bill, update the PO status to 'Returned' now
        if (originatingPurchaseId) {
          try {
            if (UUID_REGEX.test(originatingPurchaseId)) {
              await workPurchaseOrderApi.patchPurchaseOrderStatus(originatingPurchaseId, 'Returned' as any);
            }
          } catch (poStatusErr) {
            console.warn('API purchase order status update warning:', poStatusErr);
          }
          setOriginatingPurchaseId(null);
        }

        toast.success(`Purchase return ${newReturn.returnNo} created successfully!`);
      }

      setIsCreateModalOpen(false);
      setEditingReturn(null);
      fetchPurchaseReturns(true);
    } catch (err: any) {
      // Keep everything the user typed; show backend field problems next to the fields.
      const mapped: FieldErrors = {};
      Object.entries(extractApiFieldErrors(err)).forEach(([path, msg]) => {
        mapped[mapReturnApiFieldKey(path)] = msg;
      });
      if (Object.keys(mapped).length > 0) {
        retErr.merge(mapped);
        requestAnimationFrame(() => focusField(Object.keys(mapped)[0]));
      }
      toast.error(getApiErrorMessage(err, 'We could not save the purchase return. Please review the details and try again.'));
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Quick Status Update
  const handleQuickStatusChange = (pret: PurchaseReturn, nextStatus: PurchaseReturnStatus) =>
    statusGuard.runOnce(async () => {
      setActiveDropdownId(null);
      setDropdownPos(null);
      // Check the action is allowed BEFORE any API call or stock outward adjustment.
      const problem = validateReturnStatusChange(pret, nextStatus);
      if (problem) {
        toast.warning(problem);
        return;
      }
      await performQuickStatusChange(pret, nextStatus);
    });

  const performQuickStatusChange = async (pret: PurchaseReturn, nextStatus: PurchaseReturnStatus) => {
    try {
      try {
        // Records that only exist locally (non-UUID id) have nothing to update on the server.
        if (UUID_REGEX.test(pret.id)) {
          await commercePurchaseReturnApi.updatePurchaseReturn(pret.id, {
            returnStatus: nextStatus,
          });
        }
      } catch (err: any) {
        // A server rejection must stop here: no stock outward, no local "success".
        if (err?.response) throw err;
        console.warn('Quick status update fallback to local store:', err);
      }

      let stockDeducted = pret.stockDeducted;
      if ((nextStatus === 'Completed' || nextStatus === 'Returned' || nextStatus === 'Dispatched') && !stockDeducted) {
        let outwardCount = 0;
        for (const item of pret.items) {
          if (!item.productId || !item.returnQuantity) continue;
          try {
            const cleanBatch =
              (item.batch && item.batch.trim() && item.batch !== 'SELECT BATCH')
                ? item.batch.trim()
                : (((item as any).batchNo && (item as any).batchNo.trim() && (item as any).batchNo !== 'SELECT BATCH')
                    ? (item as any).batchNo.trim()
                    : undefined);
            await stockApi.adjustStock({
              productId: item.productId,
              quantity: -Math.abs(item.returnQuantity),
              batchNo: cleanBatch,
              adjustmentType: 'OUTWARD',
              reason: `Purchase Return ${pret.returnNo} (${nextStatus})`,
              costPrice: item.unitPrice,
              supplierName: pret.supplierName,
            });
            outwardCount++;
          } catch (stkErr) {
            console.warn('API Stock outward return warning:', stkErr);
          }
        }
        if (outwardCount > 0) {
          stockDeducted = true;
          dispatch(
            baseApi.util.invalidateTags([
              { type: 'Stock', id: 'LIST' },
              { type: 'Batch', id: 'LIST' },
              { type: 'Stock', id: 'LEDGER' },
              { type: 'Product', id: 'LIST' },
            ])
          );
        }
      }

      const updated: PurchaseReturn = {
        ...pret,
        returnStatus: nextStatus,
        stockDeducted,
        updatedAt: new Date().toISOString(),
      };
      toast.success(`Purchase return ${pret.returnNo} marked as ${nextStatus}`);
      fetchPurchaseReturns(true);
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'We could not update the return status. Please try again.'));
    }
  };

  // Duplicate Return into Editor
  const handleDuplicateReturn = (pret: PurchaseReturn) => {
    retErr.reset();
    setEditingReturn(null);
    setSelectedPurchaseId(pret.purchaseId || '');
    setManualPurchaseNo(pret.purchaseNo || '');
    setSelectedSupplierId(pret.supplierId || '');
    setSelectedSupplierName(pret.supplierName || '');
    setReturnDate(new Date().toISOString().split('T')[0]);
    setReturnItems(
      pret.items && pret.items.length > 0
        ? pret.items.map((it, idx) => ({
            ...it,
            id: `pr_ret_it_${Date.now()}_${idx}`,
          }))
        : [
            {
              id: `pr_ret_it_${Date.now()}_0`,
              productId: '',
              productName: '',
              purchasedQuantity: 1,
              returnQuantity: 1,
              unitPrice: 0,
              returnAmount: 0,
              reason: 'Damaged',
              remarks: '',
            },
          ]
    );
    setRefundStatus((pret.refundStatus as RefundStatusType) || 'Supplier Credit');
    setReturnStatus('Requested');
    setNotes(pret.notes ? `Duplicated from ${pret.returnNo}. ${pret.notes}` : `Duplicated from ${pret.returnNo}`);
    setIsCreateModalOpen(true);
    toast.info(`Duplicated return details from ${pret.returnNo} into editor. Review and save when ready.`);
  };

  // Delete Return with confirmation modal
  const handleOpenDeleteModal = (pret: PurchaseReturn) => {
    setActiveDropdownId(null);
    setDropdownPos(null);
    setDeleteTargetReturn(pret);
    setDeleteReturnError(null);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteReturn = () => deleteGuard.runOnce(() => performDeleteReturn());

  const performDeleteReturn = async () => {
    if (!deleteTargetReturn) return;
    setIsDeletingReturn(true);
    setDeleteReturnError(null);
    try {
      if (UUID_REGEX.test(deleteTargetReturn.id)) {
        await commercePurchaseReturnApi.deletePurchaseReturn(deleteTargetReturn.id);
      }
      toast.success(`Purchase return "${deleteTargetReturn.returnNo}" deleted successfully.`);
      setIsDeleteModalOpen(false);
      setDeleteTargetReturn(null);
      fetchPurchaseReturns(true);
    } catch (err: any) {
      console.error('Failed to delete purchase return:', err);
      const errMsg = getApiErrorMessage(err, 'We could not delete this purchase return. Please try again.');
      setDeleteReturnError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsDeletingReturn(false);
    }
  };

  // Export Purchase Returns to Excel
  const handleExportExcel = () => {
    const listToExport = effectiveReturns;
    if (listToExport.length === 0) {
      toast.error('No purchase return records available to export.');
      return;
    }

    const excelRows = listToExport.map((r, idx) => ({
      sNo: idx + 1,
      returnNo: r.returnNo,
      purchaseNo: r.purchaseNo,
      returnDate: r.returnDate,
      supplierName: r.supplierName,
      itemCount: r.items?.length || 0,
      returnAmount: Number(r.returnAmount || 0),
      refundStatus: r.refundStatus,
      returnStatus: r.returnStatus,
      notes: r.notes || '',
    }));

    const totalReturnAmt = excelRows.reduce((acc, row) => acc + row.returnAmount, 0);

    exportTableToExcel({
      filename: `Purchase_Returns_Report_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Purchase Returns',
      title: 'YAA CREATIONS CRM - PURCHASE RETURNS & DEBIT DIRECTORY',
      subtitle: `Total Returns: ${listToExport.length} | Generated: ${new Date().toLocaleDateString('en-GB')}`,
      columns: [
        { header: '#', key: 'sNo', align: 'center', width: 8 },
        { header: 'Return #', key: 'returnNo', align: 'center', width: 18 },
        { header: 'Purchase PO #', key: 'purchaseNo', align: 'center', width: 16 },
        { header: 'Return Date', key: 'returnDate', align: 'center', width: 14 },
        { header: 'Supplier Name', key: 'supplierName', align: 'left', width: 24 },
        { header: 'Items Count', key: 'itemCount', align: 'center', width: 12 },
        { header: 'Return Amount (₹)', key: 'returnAmount', align: 'right', type: 'currency', width: 18 },
        { header: 'Refund Status', key: 'refundStatus', align: 'center', width: 16 },
        { header: 'Return Status', key: 'returnStatus', align: 'center', width: 14 },
        { header: 'Notes', key: 'notes', align: 'left', width: 24 },
      ],
      data: excelRows,
      summaryRow: {
        sNo: 'TOTAL',
        returnNo: `${listToExport.length} Returns`,
        returnAmount: totalReturnAmt,
      },
    });

    toast.success(`Purchase Returns Excel report downloaded (${listToExport.length} records)!`);
  };

  // Print & Download Debit Note via universal printUtils
  const buildDebitNotePrintOptions = (pret: PurchaseReturn): DocumentPrintOptions => {
    return {
      docTypeTitle: 'DEBIT NOTE / PURCHASE RETURN',
      docNo: pret.returnNo,
      docDate: pret.returnDate,
      status: pret.returnStatus,
      statusColor: pret.returnStatus === 'Completed' ? 'emerald' : pret.returnStatus === 'Rejected' ? 'rose' : 'purple',
      referenceNo: pret.purchaseNo,
      partyTitle: 'Supplier / Vendor',
      partyName: pret.supplierName,
      extraMeta: [
        { label: 'Original Purchase Bill', value: pret.purchaseNo || 'N/A' },
        { label: 'Refund Method / Status', value: pret.refundStatus },
      ],
      columns: [
        { header: 'Returned Product Item', width: '38%' },
        { header: 'Batch', align: 'center', width: '14%' },
        { header: 'Return Qty', align: 'center', width: '12%' },
        { header: 'Unit Price (₹)', align: 'right', width: '18%' },
        { header: 'Total Refund (₹)', align: 'right', width: '18%' },
      ],
      items: pret.items.map((it) => ({
        name: it.productName,
        batch: it.batch,
        quantity: it.returnQuantity,
        unitPrice: it.unitPrice,
        total: it.returnAmount,
        remarks: `${it.reason}${it.remarks ? ` - ${it.remarks}` : ''}`,
      })),
      subtotal: Number(pret.returnAmount || 0),
      grandTotal: Number(pret.returnAmount || 0),
      notes: pret.notes,
    };
  };

  const handlePrintDebitNote = (pret: PurchaseReturn) => {
    printBusinessDocument(buildDebitNotePrintOptions(pret));
  };

  const handleDownloadPurchaseReturn = async (pret: PurchaseReturn) => {
    if (isDownloadingReturn) return;
    setIsDownloadingReturn(true);
    const filename = `DebitNote_${(pret.returnNo || 'return').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    try {
      await downloadBusinessDocument(buildDebitNotePrintOptions(pret), filename);
      toast.success(`Downloaded ${filename}`);
    } catch (err) {
      console.error('Failed to download debit note PDF:', err);
      toast.error('Failed to download debit note PDF. Please try again.');
    } finally {
      setIsDownloadingReturn(false);
    }
  };

  // Print Table Report for Purchase Returns
  const handlePrintTableReport = () => {
    const listToPrint = effectiveReturns;
    if (listToPrint.length === 0) {
      toast.info('No purchase returns available to print.');
      return;
    }

    const printRows = listToPrint.map((r) => ({
      returnNo: r.returnNo,
      returnDate: r.returnDate,
      purchaseNo: r.purchaseNo,
      supplierName: r.supplierName,
      refundStatus: r.refundStatus,
      returnStatus: r.returnStatus,
      returnAmount: Number(r.returnAmount || 0),
    }));

    const totalReturnAmt = printRows.reduce((acc, r) => acc + r.returnAmount, 0);

    printTableReport({
      title: 'Purchase Returns & Debit Notes Report',
      subtitle: `Total Returns: ${listToPrint.length} | Status Filter: ${appliedStatus} | Refund Filter: ${appliedRefundStatus}`,
      columns: [
        { header: 'Debit Note #', key: 'returnNo', width: '16%' },
        { header: 'Return Date', key: 'returnDate', width: '12%' },
        { header: 'Purchase Bill #', key: 'purchaseNo', width: '16%' },
        { header: 'Supplier Name', key: 'supplierName', width: '22%' },
        { header: 'Refund Mode', key: 'refundStatus', align: 'center', width: '12%' },
        { header: 'Status', key: 'returnStatus', align: 'center', width: '10%' },
        { header: 'Return Value (₹)', key: 'returnAmount', align: 'right', type: 'currency', width: '12%' },
      ],
      data: printRows,
      metrics: [
        { label: 'Total Debit Notes', value: listToPrint.length },
        { label: 'Total Debit Amount', value: totalReturnAmt },
        { label: 'Pending Refunds', value: listToPrint.filter((r) => r.refundStatus === 'Pending').length },
      ],
      summaryRow: {
        returnNo: 'Total',
        returnAmount: totalReturnAmt,
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
              <ArrowDownLeft className="w-4.5 h-4.5" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Purchase Returns & Supplier Credits
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Return damaged or excess goods back to suppliers and issue debit adjustments
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
            Create Purchase Return
          </Button>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Returns</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#33077C] flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">{summary.totalCount}</div>
            <div className="text-xs text-slate-500 mt-0.5">Supplier return cases</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Review</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-amber-600">{summary.pendingCount}</div>
            <div className="text-xs text-slate-500 mt-0.5">Awaiting vendor review</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Approved / Dispatched</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">{summary.approvedCount}</div>
            <div className="text-xs text-slate-500 mt-0.5">Dispatched to vendor</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Completed</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Check className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-emerald-600">{summary.completedCount}</div>
            <div className="text-xs text-slate-500 mt-0.5">Debit note settled</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Return Value</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#33077C] flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-[#33077C]">
              ₹{summary.returnAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Total debit note value</div>
          </div>
        </div>
      </div>

      {/* 3. Search Bar & Filter Row */}
      <SearchBar
        value={pendingSearch}
        onChange={(val) => setPendingSearch(val)}
        placeholder="Search by return #, purchase #, supplier..."
        onSubmit={() => {
          const trimmed = pendingSearch.trim();
          const isSame =
            appliedSearch === trimmed &&
            appliedStatus === pendingStatus &&
            appliedRefundStatus === pendingRefundStatus &&
            currentPage === 1;

          setAppliedSearch(trimmed);
          setAppliedStatus(pendingStatus);
          setAppliedRefundStatus(pendingRefundStatus);
          setCurrentPage(1);

          if (isSame) {
            fetchPurchaseReturns(true);
          }
        }}
        onReset={() => {
          isFetchingRef.current = false;
          lastFetchKeyRef.current = null;
          setPendingSearch('');
          setAppliedSearch('');
          setPendingStatus('All');
          setAppliedStatus('All');
          setPendingRefundStatus('All');
          setAppliedRefundStatus('All');
          setCurrentPage(1);
          fetchPurchaseReturns(true, {
            search: '',
            status: 'All',
            refundStatus: 'All',
            page: 1,
          });
        }}
        filterSlot={
          <div className="flex items-center gap-2.5 flex-wrap">
            <FilterDropdown
              placeholder="Status : All"
              value={pendingStatus}
              onChange={(val) => {
                setPendingStatus(val);
              }}
              options={[
                { label: 'Status : All', value: 'All' },
                { label: 'Requested', value: 'Requested', dotColor: '#f59e0b' },
                { label: 'Approved', value: 'Approved', dotColor: '#3b82f6' },
                { label: 'Dispatched', value: 'Dispatched', dotColor: '#8b5cf6' },
                { label: 'Completed', value: 'Completed', dotColor: '#10b981' },
                { label: 'Rejected', value: 'Rejected', dotColor: '#ef4444' },
                { label: 'Cancelled', value: 'Cancelled', dotColor: '#94a3b8' },
              ]}
            />

            <FilterDropdown
              placeholder="Refund : All"
              value={pendingRefundStatus}
              onChange={(val) => {
                setPendingRefundStatus(val);
              }}
              options={[
                { label: 'Refund : All', value: 'All' },
                { label: 'Supplier Credit', value: 'Supplier Credit', dotColor: '#8b5cf6' },
                { label: 'Refunded', value: 'Refunded', dotColor: '#10b981' },
                { label: 'Pending', value: 'Pending', dotColor: '#f59e0b' },
                { label: 'Adjusted', value: 'Adjusted', dotColor: '#3b82f6' },
              ]}
            />
          </div>
        }
        rightSlot={
          <div className="flex items-center gap-3 pr-1">
            {isApiLoading && (
              <span className="flex items-center gap-1.5 text-xs text-purple-700 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Syncing...</span>
              </span>
            )}
            <span className="text-xs font-semibold text-slate-500">
              Total Returns :{' '}
              <span className="text-[#33077C] font-bold">
                {totalApiRecords !== null ? totalApiRecords : effectiveReturns.length}
              </span>
            </span>
          </div>
        }
      />

      {/* 4. Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200 min-w-[950px]">
            <CommonTableHead
                columns={[
                  { label: "RETURN NO & DATE", align: "left", minWidth: "160px" },
                  { label: "ORIGINAL PURCHASE", align: "left", minWidth: "150px" },
                  { label: "SUPPLIER", align: "left", minWidth: "180px" },
                  { label: "ITEMS RETURNED", align: "left", minWidth: "150px" },
                  { label: "RETURN AMOUNT", align: "right", minWidth: "130px" },
                  { label: "STATUS", align: "center", minWidth: "110px" },
                  { label: "ACTIONS", align: "center", minWidth: "130px" },
                ]}
              />
            <tbody className="text-sm">
              {isApiLoading && paginatedReturns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500 border border-slate-200">
                    <Loader2 className="w-8 h-8 mx-auto mb-2 text-[#33077C] animate-spin" />
                    <p className="font-semibold text-slate-700 text-sm">Fetching purchase returns...</p>
                  </td>
                </tr>
              ) : paginatedReturns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    <ArrowDownLeft className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    <p className="font-semibold text-slate-600 text-sm">No purchase returns recorded</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Click "Create Purchase Return" to log a vendor return or debit note.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedReturns.map((pret) => (
                  <tr key={pret.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-200 font-sans">
                    {/* 1. Return No & Date */}
                    <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#33077C] text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-xs shrink-0 select-none">
                          PR
                        </div>
                        <div>
                          <span
                            onClick={() => handleOpenViewModal(pret)}
                            className="font-bold text-[#33077C] hover:underline cursor-pointer block text-sm leading-snug"
                          >
                            {pret.returnNo}
                          </span>
                          <span className="text-xs text-slate-400 font-medium mt-0.5 block">{formatDate(pret.returnDate)}</span>
                        </div>
                      </div>
                    </td>

                    {/* 2. Original Purchase */}
                    <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                      <span className="font-semibold text-slate-800">{pret.purchaseNo || '—'}</span>
                    </td>

                    {/* 3. Supplier */}
                    <td className="py-4 px-5 border border-slate-200">
                      <div className="font-bold text-slate-900 leading-snug">{pret.supplierName || '—'}</div>
                      <div className="text-xs text-slate-500 mt-0.5 font-medium">
                        Refund: <span className="font-semibold text-purple-800">{pret.refundStatus || 'Supplier Credit'}</span>
                      </div>
                    </td>

                    {/* 4. Items */}
                    <td className="py-4 px-5 border border-slate-200">
                      {pret.items && pret.items.length > 0 ? (
                        <>
                          <div className="font-medium text-slate-800 text-xs">
                            {pret.items[0]?.productName} ({pret.items[0]?.returnQuantity} qty)
                          </div>
                          {pret.items.length > 1 && (
                            <span className="text-[#33077C] text-[11px] font-bold mt-0.5 block">
                              +{pret.items.length - 1} more item(s)
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No line items</span>
                      )}
                    </td>

                    {/* 5. Return Amount */}
                    <td className="py-4 px-5 border border-slate-200 text-right whitespace-nowrap">
                      <span className="font-bold text-slate-900 text-sm">
                        ₹{(Number(pret.returnAmount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* 6. Status */}
                    <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap min-w-[130px] w-36 align-middle">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          pret.returnStatus === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                            : pret.returnStatus === 'Approved' || pret.returnStatus === 'Dispatched'
                            ? 'bg-blue-50 text-blue-700 border border-blue-300'
                            : pret.returnStatus === 'Rejected' || pret.returnStatus === 'Cancelled'
                            ? 'bg-rose-50 text-rose-700 border border-rose-300'
                            : 'bg-amber-50 text-amber-700 border border-amber-300'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            pret.returnStatus === 'Completed'
                              ? 'bg-emerald-500'
                              : pret.returnStatus === 'Approved' || pret.returnStatus === 'Dispatched'
                              ? 'bg-blue-500'
                              : pret.returnStatus === 'Rejected' || pret.returnStatus === 'Cancelled'
                              ? 'bg-rose-500'
                              : 'bg-amber-500'
                          }`}
                        />
                        {pret.returnStatus}
                      </span>
                    </td>

                    {/* 7. Actions */}
                    <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap min-w-[130px] w-36 align-middle">
                      <div className="flex items-center justify-center gap-1.5">

                        {/* Share / Forward Popover */}
                        <UniversalShareDropdown
                          id={pret.id}
                          activeShareId={activeShareId}
                          setActiveShareId={setActiveShareId}
                          sharePos={sharePos}
                          setSharePos={setSharePos}
                          getShareData={() => formatPurchaseReturnShare(pret)}
                          title="Share Purchase Return"
                        />

                        {/* 3-dots Actions Dropdown */}
                        <SaleActionDropdown
                          items={[
                            {
                              label: 'View',
                              variant: 'view',
                              onClick: () => handleOpenViewModal(pret),
                            },
                            {
                              label: 'Edit',
                              variant: 'edit',
                              onClick: () => handleOpenEditModal(pret),
                            },
                            {
                              label: 'Print Debit Note',
                              variant: 'print',
                              onClick: () => handlePrintDebitNote(pret),
                            },
                            {
                              label: 'Download Debit Note',
                              variant: 'download',
                              onClick: () => handleDownloadPurchaseReturn(pret),
                            },
                            {
                              label: 'Duplicate',
                              variant: 'duplicate',
                              onClick: () => handleDuplicateReturn(pret),
                            },
                            pret.returnStatus !== 'Completed' && {
                              label: 'Mark as Completed',
                              variant: 'activate',
                              onClick: () => handleQuickStatusChange(pret, 'Completed'),
                            },
                            pret.returnStatus === 'Requested' && {
                              label: 'Mark as Approved',
                              variant: 'approve',
                              onClick: () => handleQuickStatusChange(pret, 'Approved'),
                            },
                            {
                              label: 'View History',
                              variant: 'view',
                              onClick: () => handleOpenHistory(pret),
                            },
                            {
                              label: 'Delete',
                              variant: 'delete',
                              danger: true,
                              dividerBefore: true,
                              onClick: () => handleOpenDeleteModal(pret),
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
      {effectiveReturns.length > 0 && (
        <Pagination
          currentPage={currentPage}
          total={totalApiRecords !== null ? totalApiRecords : effectiveReturns.length}
          pageSize={pageSize}
          pageSizeOptions={[5, 10, 20, 50]}
          onPageChange={(p) => setCurrentPage(p)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      )}

      {/* ==========================================
          MODAL 1: CREATE / EDIT PURCHASE RETURN
         ========================================== */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingReturn(null);
        }}
        title={
          editingReturn
            ? `Edit Purchase Return: ${editingReturn.returnNo}`
            : 'Create Purchase Return'
        }
        subtitle={
          editingReturn
            ? 'Modify return details and returned quantities'
            : 'Select purchase order or vendor, set return date, and add return items'
        }
        maxWidth="5xl"
        headerGradient={true}
        showBackIcon={true}
        hideCloseButton={true}
        onBack={() => {
          setIsCreateModalOpen(false);
          setEditingReturn(null);
        }}
      >
        <form noValidate onSubmit={handleSubmitReturnForm} className="space-y-5 p-2 sm:p-4 animate-in fade-in duration-150">
          {/* Top Fields: 5-column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-1">
            {/* Return / Debit Note # */}
            <div>
              <FormLabel>Debit Note / Return #</FormLabel>
              <input
                type="text"
                value={editingReturn ? editingReturn.returnNo : computedPreviewNo}
                readOnly
                className="w-full h-11 px-4 bg-purple-50/70 border border-purple-200/90 rounded-xl text-xs sm:text-[13px] font-extrabold text-[#33077C] font-mono outline-none cursor-default"
                placeholder="Auto-generated on save"
              />
            </div>

            {/* Purchase Order Selection */}
            <div>
              <FormLabel>Purchase Order</FormLabel>
              <select
                value={selectedPurchaseId}
                onChange={(e) => handleSelectPurchase(e.target.value)}
                className={FORM_SELECT_CLS}
              >
                <option value="">-- Choose Existing PO (Optional) --</option>
                {purchases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.purchaseNo} ({p.supplierName})
                  </option>
                ))}
              </select>
            </div>

            {/* PO Reference (Manual if not selected) */}
            <div>
              <FormLabel>PO Reference #</FormLabel>
              <input
                type="text"
                value={chosenPurchase ? chosenPurchase.purchaseNo : manualPurchaseNo}
                onChange={(e) => setManualPurchaseNo(e.target.value)}
                readOnly={!!chosenPurchase}
                placeholder="e.g. PO-2026-089"
                className={chosenPurchase ? FORM_INPUT_DISABLED_CLS : FORM_INPUT_CLS}
              />
            </div>

            {/* Supplier Name */}
            <div>
              <FormLabel required>Supplier</FormLabel>
              {chosenPurchase ? (
                <input
                  type="text"
                  readOnly
                  value={chosenPurchase.supplierName}
                  className={FORM_INPUT_DISABLED_CLS}
                />
              ) : (
                <div {...fieldAttr('supplierId')}>
                  <SupplierSearchableSelect
                    value={selectedSupplierId}
                    onChange={(val, sup) => {
                      retErr.clearError('supplierId');
                      setSelectedSupplierId(val);
                      setSelectedSupplierName(sup?.name || '');
                    }}
                    allowNone
                    placeholder="Select or search supplier..."
                  />
                </div>
              )}
              <FormError message={retErr.errors.supplierId} />
            </div>

            {/* Return Date */}
            <div>
              <FormLabel required>Return Date</FormLabel>
              <input
                type="date"
                {...fieldAttr('returnDate')}
                value={returnDate}
                onChange={(e) => {
                  retErr.clearError('returnDate');
                  setReturnDate(e.target.value);
                }}
                className={FORM_INPUT_CLS}
              />
              <FormError message={retErr.errors.returnDate} />
            </div>
          </div>

          {/* Refund Status & Return Status Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <FormLabel>Refund Method / Status</FormLabel>
              <select
                value={refundStatus}
                onChange={(e) => setRefundStatus(e.target.value as RefundStatusType)}
                className={FORM_SELECT_CLS}
              >
                <option value="Supplier Credit">Supplier Credit (Debit Note Adjustment)</option>
                <option value="Refunded">Refunded (Bank / Cash Refund Received)</option>
                <option value="Pending">Pending Refund</option>
                <option value="Adjusted">Adjusted in Ledger</option>
              </select>
            </div>

            <div>
              <FormLabel>Return Status</FormLabel>
              <select
                value={returnStatus}
                onChange={(e) => setReturnStatus(e.target.value)}
                className={FORM_SELECT_CLS}
              >
                <option value="Requested">Requested (Review Needed)</option>
                <option value="Approved">Approved (Awaiting Dispatch)</option>
                <option value="Dispatched">Dispatched to Vendor</option>
                <option value="Completed">Completed (Debit Note Settled)</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Product Return Items Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-slate-800 tracking-wider text-xs uppercase flex items-center gap-1.5">
                <PackageCheck className="w-4 h-4 text-[#33077C]" />
                Return Line Items & Quantities
              </span>
              <button
                type="button"
                onClick={handleAddReturnItem}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-[#33077C] border border-slate-200 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="overflow-x-auto max-w-full">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="bg-slate-100/80 text-[11px] font-bold text-slate-700 border-b border-slate-200">
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3 text-center w-28">Batch No</th>
                    <th className="py-2.5 px-3 text-center w-24">Purchased</th>
                    <th className="py-2.5 px-3 text-center w-28">Return Qty *</th>
                    <th className="py-2.5 px-3 text-right w-28">Unit Price (₹)</th>
                    <th className="py-2.5 px-3 w-36">Reason</th>
                    <th className="py-2.5 px-3 w-40">Remarks</th>
                    <th className="py-2.5 px-3 text-right w-28">Total (₹)</th>
                    <th className="py-2.5 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {returnItems.map((it, idx) => (
                    <tr key={it.id || idx} className="hover:bg-slate-50/60">
                      {/* Product Name (Searchable Product Selection) */}
                      <td className="py-2 px-3 min-w-[200px] align-top">
                        <div {...fieldAttr(`items.${idx}.product`)}>
                        <ProductSearchableSelect
                          value={it.productId || ''}
                          onChange={(val) => {
                            handleProductSelect(idx, val);
                          }}
                          selectedProduct={
                            it.productId
                              ? {
                                  id: it.productId,
                                  productName: it.productName,
                                  purchasePrice: it.unitPrice,
                                }
                              : null
                          }
                          priceType="purchase"
                          placeholder="Select Product..."
                          size="sm"
                        />
                        </div>
                        <FormError message={retErr.errors[`items.${idx}.product`]} />
                      </td>

                      {/* Batch No */}
                      <td className="py-2 px-3 text-center">
                        <input
                          type="text"
                          value={it.batch || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setReturnItems((prev) => {
                              const c = [...prev];
                              c[idx] = { ...c[idx], batch: val };
                              return c;
                            });
                          }}
                          placeholder="Batch No"
                          className="w-full h-8 px-2 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-semibold text-purple-900 outline-none focus:border-[#4309A2] focus:bg-white"
                        />
                      </td>

                      {/* Purchased Qty */}
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          value={it.purchasedQuantity}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value));
                            setReturnItems((prev) => {
                              const c = [...prev];
                              c[idx] = { ...c[idx], purchasedQuantity: val };
                              return c;
                            });
                          }}
                          className="w-full h-8 px-2 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 outline-none"
                        />
                      </td>

                      {/* Return Qty */}
                      <td className="py-2 px-3 align-top">
                        <input
                          type="number"
                          min="1"
                          {...fieldAttr(`items.${idx}.quantity`)}
                          value={it.returnQuantity}
                          onKeyDown={handleNonNegativeKeyDown}
                          onChange={(e) => handleReturnQtyChange(idx, Number(e.target.value))}
                          className="w-full h-8 px-2 text-center bg-white border border-purple-300 rounded-lg text-xs font-bold text-[#33077C] outline-none focus:ring-2 focus:ring-purple-200"
                        />
                        <FormError message={retErr.errors[`items.${idx}.quantity`]} />
                      </td>

                      {/* Unit Price */}
                      <td className="py-2 px-3 align-top">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          {...fieldAttr(`items.${idx}.price`)}
                          value={it.unitPrice}
                          onKeyDown={handleNonNegativeKeyDown}
                          onChange={(e) => handleUnitPriceChange(idx, Number(e.target.value))}
                          className="w-full h-8 px-2 text-right bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:border-[#4309A2]"
                        />
                        <FormError message={retErr.errors[`items.${idx}.price`]} />
                      </td>

                      {/* Reason */}
                      <td className="py-2 px-3">
                        <select
                          value={it.reason}
                          onChange={(e) => handleReasonChange(idx, e.target.value)}
                          className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-[#4309A2]"
                        >
                          <option value="Damaged">Damaged</option>
                          <option value="Defective">Defective</option>
                          <option value="Wrong Product">Wrong Product</option>
                          <option value="Excess Quantity">Excess Quantity</option>
                          <option value="Quality Issue">Quality Issue</option>
                          <option value="Other">Other</option>
                        </select>
                      </td>

                      {/* Remarks */}
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={it.remarks || ''}
                          onChange={(e) => handleRemarksChange(idx, e.target.value)}
                          placeholder="Transit note..."
                          className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:border-[#4309A2]"
                        />
                      </td>

                      {/* Total */}
                      <td className="py-2 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                        ₹{(Number(it.returnAmount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        <FormError message={retErr.errors[`items.${idx}.total`]} className="justify-end whitespace-normal" />
                      </td>

                      {/* Delete Row */}
                      <td className="py-2 px-2 text-center">
                        {returnItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveReturnItem(idx)}
                            className="w-7 h-7 text-slate-400 hover:text-rose-600 flex items-center justify-center rounded-md hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div {...fieldAttr('items')} className="!mt-1">
            <FormError message={retErr.errors.items} showIcon />
          </div>

          {/* Total Summary Banner */}
          <div className="flex justify-between items-center p-4 bg-purple-50/70 rounded-2xl border border-purple-100 font-bold">
            <span className="text-slate-700 text-xs sm:text-sm">Total Debit Adjustment Amount:</span>
            <span className="text-[#33077C] text-lg font-black tracking-tight">
              ₹{totalCalculatedReturnAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div {...fieldAttr('total')} className="!mt-1">
            <FormError message={retErr.errors.total} showIcon />
          </div>

          {/* Notes */}
          <div>
            <FormLabel>Notes / Debit Adjustment Remarks</FormLabel>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Adjusted in supplier pending balance ledger..."
              className={FORM_TEXTAREA_CLS}
            />
          </div>

          {/* Standard Footer */}
          <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsCreateModalOpen(false);
                setEditingReturn(null);
              }}
              disabled={isSubmittingForm}
              className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4 text-slate-500" />
              <span>Cancel</span>
            </button>
            <button
              type="submit"
              disabled={isSubmittingForm}
              className="h-10 px-6 rounded-xl bg-[#33077C] hover:bg-[#4309A2] disabled:opacity-50 text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmittingForm ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>{editingReturn ? 'Update Return' : 'Create Return'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ==========================================
          MODAL 2: VIEW DETAIL
         ========================================== */}
      {selectedReturn && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Purchase Return: ${selectedReturn.returnNo}`}
          subtitle="View return line items and debit adjustment calculation"
          maxWidth="4xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setIsDetailModalOpen(false)}
        >
          <div className="space-y-5 pt-2 text-xs font-sans">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                  Originating Purchase & Supplier
                </span>
                <div className="font-bold text-slate-900 text-base mt-0.5">
                  {selectedReturn.purchaseNo || 'Direct / Manual Return'}
                </div>
                <div className="text-slate-700 font-semibold text-xs mt-0.5">
                  {selectedReturn.supplierName}
                </div>
              </div>
              <div className="sm:text-right">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    selectedReturn.returnStatus === 'Completed'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                      : selectedReturn.returnStatus === 'Approved'
                      ? 'bg-blue-50 text-blue-700 border border-blue-300'
                      : 'bg-purple-50 text-[#33077C] border border-purple-200'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                  <span>{selectedReturn.returnStatus}</span>
                </span>
                <div className="text-slate-500 mt-1 font-medium">Return Date: {formatDate(selectedReturn.returnDate)}</div>
                <div className="text-purple-900 font-bold text-xs mt-0.5">
                  Refund: {selectedReturn.refundStatus}
                </div>
              </div>
            </div>

            {/* Line items table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto max-w-full">
                <table className="w-full text-left min-w-[500px]">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200 text-[11px]">
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3 text-center">Batch</th>
                      <th className="py-2.5 px-3 text-center">Returned Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3">Reason</th>
                      <th className="py-2.5 px-3">Remarks</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {selectedReturn.items && selectedReturn.items.length > 0 ? (
                      selectedReturn.items.map((it, idx) => (
                        <tr key={it.id || idx}>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{it.productName}</td>
                          <td className="py-2.5 px-3 text-center text-slate-500">{it.batch || '—'}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-purple-900">{it.returnQuantity}</td>
                          <td className="py-2.5 px-3 text-right text-slate-700">₹{(Number(it.unitPrice) || 0).toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium">{it.reason || 'Damaged'}</td>
                          <td className="py-2.5 px-3 text-slate-500">{it.remarks || '—'}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            ₹{(Number(it.returnAmount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                          No items listed for this return
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes if available */}
            {selectedReturn.notes && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                <span className="font-bold text-slate-800">Notes:</span> {selectedReturn.notes}
              </div>
            )}

            {/* Total value */}
            <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-100 flex justify-between items-center font-bold">
              <span className="text-slate-700">Total Debit Adjustment Value:</span>
              <span className="text-[#33077C] text-lg font-black">
                ₹{(Number(selectedReturn.returnAmount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Footer Buttons */}
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
                onClick={() => handlePrintDebitNote(selectedReturn)}
                className="h-10 px-5 rounded-lg bg-[#33077C] hover:bg-[#26055d] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Printer className="w-4 h-4" />
                <span>Print Debit Note</span>
              </button>
              <button
                type="button"
                disabled={isDownloadingReturn}
                onClick={() => handleDownloadPurchaseReturn(selectedReturn)}
                className="h-10 px-5 rounded-lg bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
              >
                {isDownloadingReturn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>{isDownloadingReturn ? 'Generating...' : 'Download Debit Note'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ==========================================
          MODAL 3: PURCHASE RETURN HISTORY & AUDIT TRAIL
         ========================================== */}
      {historyReturn && (
        <Modal
          isOpen={Boolean(historyReturn)}
          onClose={() => setHistoryReturn(null)}
          title={`Debit Note History & Audit Trail: ${historyReturn.returnNo}`}
          subtitle={
            isLoadingHistory
              ? 'Syncing live history from Commerce API...'
              : 'Complete lifecycle progression and timeline audit log'
          }
          maxWidth="md"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setHistoryReturn(null)}
        >
          <HistoryTimelineView
            isLoading={isLoadingHistory}
            eyebrow="Debit Note No"
            title={historyReturn.returnNo}
            subtitle={
              <>
                Supplier: <span className="font-semibold text-slate-800">{historyReturn.supplierName}</span>
                {historyReturn.purchaseNo ? ` • Against Bill ${historyReturn.purchaseNo}` : ""}
              </>
            }
            amount={{ label: "Return Amount", value: `₹${Number(historyReturn.returnAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` }}
            badges={[
              { label: historyReturn.returnStatus, tone: historyReturn.returnStatus === "Completed" || historyReturn.returnStatus === "Returned" ? "success" : historyReturn.returnStatus === "Rejected" || historyReturn.returnStatus === "Cancelled" ? "danger" : historyReturn.returnStatus === "Approved" || historyReturn.returnStatus === "Dispatched" ? "info" : "warning" },
              { label: historyReturn.refundStatus, tone: historyReturn.refundStatus === "Refunded" ? "success" : historyReturn.refundStatus === "Pending" ? "warning" : "primary" },
            ]}
            facts={[
              { label: "Return Date", value: historyReturn.returnDate ? formatDate(historyReturn.returnDate) : "" },
              { label: "Items Returned", value: String(historyReturn.items?.length || 0) },
              { label: "Stock Deducted", value: historyReturn.stockDeducted ? "Yes" : "No" },
            ]}
            events={[
              {
                title: "Purchase Return Requested",
                at: historyReturn.createdAt || historyReturn.returnDate,
                tone: "primary",
                description: `${historyReturn.items?.length || 0} item(s) returned to ${historyReturn.supplierName}.`,
                details: [
                  { label: "Return Date", value: historyReturn.returnDate ? formatDate(historyReturn.returnDate) : "" },
                  { label: "Against Bill", value: historyReturn.purchaseNo },
                ],
              },
              {
                title: `Return Status: ${historyReturn.returnStatus}`,
                at: historyReturn.returnStatus === "Requested" ? undefined : historyReturn.updatedAt,
                tone: historyReturn.returnStatus === "Completed" || historyReturn.returnStatus === "Returned" ? "success" : historyReturn.returnStatus === "Rejected" || historyReturn.returnStatus === "Cancelled" ? "danger" : historyReturn.returnStatus === "Approved" || historyReturn.returnStatus === "Dispatched" ? "info" : "warning",
                description: "Current stage of the return in the approval and dispatch flow.",
              },
              {
                title: `Settlement: ${historyReturn.refundStatus}`,
                tone: historyReturn.refundStatus === "Refunded" ? "success" : historyReturn.refundStatus === "Pending" ? "warning" : "primary",
                description: "How the returned value is settled with the supplier.",
                details: [{ label: "Debit Amount", value: `₹${Number(historyReturn.returnAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` }],
              },
              ...(historyReturn.stockDeducted
                ? [{ title: "Stock Deducted", tone: "success" as const, description: "Returned quantities were deducted from inventory." }]
                : []),
              ...(historyReturn.notes
                ? [{ title: "Remarks", tone: "info" as const, description: `"${historyReturn.notes}"` }]
                : []),
            ]}
            updatedAt={historyReturn.updatedAt}
            onClose={() => setHistoryReturn(null)}
          />
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeletingReturn) {
            setIsDeleteModalOpen(false);
            setDeleteTargetReturn(null);
            setDeleteReturnError(null);
          }
        }}
        onConfirm={handleConfirmDeleteReturn}
        entityName="Purchase Return"
        recordName={deleteTargetReturn?.returnNo}
        isLoading={isDeletingReturn}
        error={deleteReturnError}
      />
    </div>
  );
};
