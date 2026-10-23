import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PurchaseRequestSchema, PurchaseRequestFormData } from '../../../validations';
import { FormError } from '../../../components/common/FormError';
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
} from 'lucide-react';
import {
  useSalesManagementStore,
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
import { UniversalShareDropdown, formatPurchaseRequestShare } from '../../../utils/shareUtils';
import { printBusinessDocument, printTableReport } from '../../../utils/printUtils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  commercePurchaseRequestApi,
  mapApiPurchaseRequestToUi,
  mapUiToCreatePayload,
  mapUiToUpdatePayload,
  ensureValidUuid,
} from '../../../api/commerce/purchaseRequestApi';
import { productApi, ApiProduct } from '../../../api/commerce/productApi';
import {
  workPurchaseOrderApi,
  mapApiPurchaseOrderToUi,
  mapUiToCreatePurchaseOrderPayload,
  UUID_REGEX,
  getStoredOrganizationId,
} from '../../../api';
import { FormLabel, FORM_TEXTAREA_CLS } from '../utils/formUtils';
import { SaleActionDropdown } from '../utils';

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
  const {
    purchaseRequests,
    stocks,
    suppliers,
    savePurchaseRequest,
    setPurchaseRequestsList,
    deletePurchaseRequest,
    updatePurchaseRequestStatus,
    savePurchase,
  } = useSalesManagementStore();

  // Live Commerce API State
  const [liveRequests, setLiveRequests] = useState<PurchaseRequest[]>([]);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState<boolean | null>(null);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const [totalApiRecords, setTotalApiRecords] = useState<number | null>(null);
  const [totalApiPages, setTotalApiPages] = useState<number | null>(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<ApiProduct[]>([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);

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
  const [pageSize, setPageSize] = useState(10);

  // 3-Dots Action dropdown & Share Popover State
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [activeShareId, setActiveShareId] = useState<string | null>(null);
  const [sharePos, setSharePos] = useState<{ top?: number; bottom?: number; right?: number } | null>(null);

  // Close action dropdown & share popover on click outside or scroll
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
    async (forceRefresh = false) => {
      const fetchKey = `${currentPage}_${pageSize}_${appliedSearch.trim()}_${appliedStatus}_${appliedPriority}`;

      if (isFetchingRef.current) return;
      if (!forceRefresh && lastFetchKeyRef.current === fetchKey) return;

      isFetchingRef.current = true;
      lastFetchKeyRef.current = fetchKey;
      setIsApiLoading(true);

      try {
        const res = await commercePurchaseRequestApi.getPurchaseRequests({
          page_no: currentPage,
          page_size: pageSize,
          pagination_required: true,
          search: appliedSearch.trim() || undefined,
          sortOrder: 'desc',
          status: appliedStatus !== 'All' ? appliedStatus : undefined,
          priority: appliedPriority !== 'All' ? appliedPriority : undefined,
        });

        if (res && res.success && Array.isArray(res.data)) {
          const mapped = res.data.map(mapApiPurchaseRequestToUi);
          setLiveRequests(mapped);
          setIsApiConnected(true);
          setApiErrorMessage(null);

          if (res.pagination) {
            setTotalApiRecords(res.pagination.totalRecords);
            setTotalApiPages(res.pagination.totalPages);
          } else {
            setTotalApiRecords(mapped.length);
            setTotalApiPages(Math.ceil(mapped.length / pageSize) || 1);
          }

          // Sync with local store
          setPurchaseRequestsList(mapped);
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
        console.warn('Commerce Purchase Request API call failed, falling back to local store:', errMsg);
        setIsApiConnected(false);
        setApiErrorMessage(errMsg);
      } finally {
        isFetchingRef.current = false;
        setIsApiLoading(false);
      }
    },
    [currentPage, pageSize, appliedSearch, appliedStatus, appliedPriority, setPurchaseRequestsList]
  );

  // Trigger API fetch on query changes
  useEffect(() => {
    loadPurchaseRequests();
  }, [loadPurchaseRequests]);


  const handleManualRefresh = () => {
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

  // Automatically load initial products list when requisition form modal opens
  useEffect(() => {
    if (isCreateModalOpen) {
      handleProductSearch('');
    }
  }, [isCreateModalOpen, handleProductSearch]);

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
  const [requestDate, setRequestDate] = useState(new Date().toISOString().split('T')[0]);
  const [requiredDate, setRequiredDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);

  // Suppliers list from local store
  const mergedSuppliers = useMemo(() => {
    return (suppliers || []).map((s) => ({
      id: s.id,
      name: s.name,
      supplierCode: s.supplierCode,
    }));
  }, [suppliers]);
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

    stocks.forEach((stk) => {
      if (!map.has(stk.productId)) {
        map.set(stk.productId, {
          value: stk.productId,
          label: stk.productName,
          subLabel: stk.sku ? `SKU: ${stk.sku} • In Stock: ${stk.inStock || 0}` : `In Stock: ${stk.inStock || 0}`,
          badge: stk.sku || undefined,
          unitCost: Number(stk.unitCost || 0),
          openingStock: Number(stk.inStock || 0),
        });
      }
    });

    return Array.from(map.values());
  }, [availableProducts, requestItems, stocks]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PurchaseRequestFormData>({
    resolver: zodResolver(PurchaseRequestSchema),
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

  // Local fallback filter if API is offline
  const filteredLocalRequests = useMemo(() => {
    return purchaseRequests.filter((r) => {
      const q = appliedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.requestNo.toLowerCase().includes(q) ||
        r.requestedBy.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.items.some((it) => it.productName.toLowerCase().includes(q));

      const matchesStatus =
        appliedStatus === 'All' || r.status.toLowerCase() === appliedStatus.toLowerCase();

      const matchesPriority =
        appliedPriority === 'All' || r.priority.toLowerCase() === appliedPriority.toLowerCase();

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [purchaseRequests, appliedSearch, appliedStatus, appliedPriority]);

  // Deciding which list to show: live API data if connected, otherwise local store
  const displayRequests = useMemo(() => {
    if (isApiConnected) {
      return liveRequests;
    }
    return filteredLocalRequests;
  }, [isApiConnected, liveRequests, filteredLocalRequests]);

  // Summary Metrics
  const summary = useMemo(() => {
    const listToAnalyze = isApiConnected ? liveRequests : purchaseRequests;
    const totalCount =
      isApiConnected && totalApiRecords !== null ? totalApiRecords : listToAnalyze.length;
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
  }, [isApiConnected, liveRequests, purchaseRequests, totalApiRecords]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    const nextReqNo = `PR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    setEditingRequest(null);
    reset({
      requestNo: nextReqNo,
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
    setEditingRequest(req);
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
              productId: availableProducts[0]?.id || stocks[0]?.productId || ensureValidUuid(),
              productName: availableProducts[0]?.productName || stocks[0]?.productName || 'General Item',
              currentStock: availableProducts[0]?.openingStock ?? stocks[0]?.inStock ?? 0,
              requestedQuantity: 1,
              estimatedUnitPrice: availableProducts[0]?.purchasePrice ?? stocks[0]?.unitCost ?? 0,
              requiredDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
              remarks: '',
            },
          ]
    );
    setIsCreateModalOpen(true);
  };

  // Duplicate Request: Populates the form with existing fields & items so the user can review/edit before saving
  const handleDuplicateRequest = (req: PurchaseRequest) => {
    const dupNo = `PR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    setEditingRequest(null);
    reset({
      requestNo: dupNo,
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
              productId: availableProducts[0]?.id || stocks[0]?.productId || ensureValidUuid(),
              productName: availableProducts[0]?.productName || stocks[0]?.productName || 'General Item',
              currentStock: availableProducts[0]?.openingStock ?? stocks[0]?.inStock ?? 0,
              requestedQuantity: 1,
              estimatedUnitPrice: availableProducts[0]?.purchasePrice ?? stocks[0]?.unitCost ?? 0,
              requiredDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
              remarks: '',
            },
          ]
    );
    setIsCreateModalOpen(true);
    toast.info(`Duplicated ${req.requestNo} into edit form. Review and save when ready.`);
  };

  const handleProductChange = (index: number, prodId: string) => {
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

    const targetStock = stocks.find((s) => s.productId === prodId || s.id === prodId);
    if (targetStock) {
      setRequestItems((prev) => {
        const copy = [...prev];
        copy[index].productId = targetStock.productId;
        copy[index].productName = targetStock.productName;
        copy[index].currentStock = targetStock.inStock ?? 0;
        copy[index].estimatedUnitPrice = targetStock.unitCost ?? 0;
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
    setRequestItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItemRow = (index: number) => {
    setRequestItems((prev) => prev.filter((_, i) => i !== index));
  };

  const onSaveRequest = async (
    data: PurchaseRequestFormData,
    status: PurchaseRequestStatus = 'Pending Approval'
  ) => {
    if (requestItems.length === 0) {
      toast.error('Please add at least one item to request.');
      return;
    }
    const hasUnselectedProduct = requestItems.some((it) => !it.productId && !it.productName.trim());
    if (hasUnselectedProduct) {
      toast.error('Please select or specify a product for all item rows.');
      return;
    }
    const hasInvalidQty = requestItems.some((it) => !it.requestedQuantity || it.requestedQuantity <= 0);
    if (hasInvalidQty) {
      toast.error('Requested quantities must be greater than zero.');
      return;
    }

    setIsSubmittingForm(true);

    try {
      if (editingRequest) {
        // UPDATE API: PUT /commerce/purchase-requests/{id}
        const updatePayload = mapUiToUpdatePayload({
          ...editingRequest,
          requestNo: data.requestNo,
          requestedBy: data.requestedBy,
          department: data.department,
          requiredDate: requiredDate,
          priority: data.priority,
          status: editingRequest.status || status,
          notes: data.notes || '',
          items: requestItems,
        });

        const res = await commercePurchaseRequestApi.updatePurchaseRequest(
          editingRequest.id,
          updatePayload
        );

        if (res && res.success && res.data) {
          const mapped = mapApiPurchaseRequestToUi(res.data);
          savePurchaseRequest(mapped);
          toast.success(`Purchase request ${mapped.requestNo} updated successfully.`);
        } else {
          savePurchaseRequest({
            ...editingRequest,
            requestNo: data.requestNo,
            requestDate,
            requestedBy: data.requestedBy,
            department: data.department,
            requiredDate,
            priority: data.priority,
            supplierId: data.supplierId || undefined,
            supplierName: data.supplierName || undefined,
            notes: data.notes || '',
            items: requestItems,
            updatedAt: new Date().toISOString(),
          });
          toast.success(`Purchase request ${data.requestNo} updated.`);
        }
      } else {
        // CREATE API: POST /commerce/purchase-requests
        const createPayload = mapUiToCreatePayload(
          {
            requestNo: data.requestNo,
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

        const res = await commercePurchaseRequestApi.createPurchaseRequest(createPayload);

        if (res && res.success && res.data) {
          const mapped = mapApiPurchaseRequestToUi(res.data);
          mapped.supplierId = data.supplierId || undefined;
          mapped.supplierName = data.supplierName || undefined;
          savePurchaseRequest(mapped);
          toast.success(`Purchase request ${mapped.requestNo} created successfully!`);
        } else {
          const fallbackReq: PurchaseRequest = {
            id: `pr_${Date.now()}`,
            requestNo: data.requestNo,
            requestDate,
            requestedBy: data.requestedBy,
            department: data.department,
            requiredDate,
            priority: data.priority,
            status,
            supplierId: data.supplierId || undefined,
            supplierName: data.supplierName || undefined,
            items: requestItems,
            notes: data.notes || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          savePurchaseRequest(fallbackReq);
          toast.success(`Purchase request ${data.requestNo} created.`);
        }
      }

      setIsCreateModalOpen(false);
      setEditingRequest(null);
      loadPurchaseRequests(true);
    } catch (err: any) {
      console.warn('Purchase request API save error:', err);
      const apiMsg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Server request denied';

      // Ensure work is preserved in local state
      const localReq: PurchaseRequest = {
        id: editingRequest ? editingRequest.id : `pr_${Date.now()}`,
        requestNo: data.requestNo,
        requestDate,
        requestedBy: data.requestedBy,
        department: data.department,
        requiredDate,
        priority: data.priority,
        status: editingRequest ? editingRequest.status : status,
        items: requestItems,
        notes: data.notes || '',
        createdAt: editingRequest ? editingRequest.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      savePurchaseRequest(localReq);

      toast.warning(`Saved locally (${apiMsg})`);
      setIsCreateModalOpen(false);
      setEditingRequest(null);
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

  const handleConfirmDeleteRequest = async () => {
    if (!deleteTargetRequest) return;
    setIsDeletingRequest(true);
    setDeleteRequestError(null);
    try {
      await commercePurchaseRequestApi.deletePurchaseRequest(deleteTargetRequest.id);
      deletePurchaseRequest(deleteTargetRequest.id);
      toast.success(`Purchase request "${deleteTargetRequest.requestNo}" deleted successfully.`);
      setIsDeleteModalOpen(false);
      setDeleteTargetRequest(null);
      loadPurchaseRequests(true);
    } catch (err: any) {
      console.warn('API delete error:', err);
      const errMsg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to delete purchase request';
      setDeleteRequestError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsDeletingRequest(false);
    }
  };

  // Convert Request to Purchase Order: opens Purchase Order creation form with all fields prefilled
  const handleConvertToPurchase = (req: PurchaseRequest) => {
    // 1. Identify target supplier (prefer supplier saved on request, then live UUID supplier, fallback to store supplier)
    const targetSupplier =
      req.supplierId
        ? mergedSuppliers.find((s) => s.id === req.supplierId) || (req.supplierName ? { id: req.supplierId, name: req.supplierName } : undefined)
        : suppliers.find((s) => UUID_REGEX.test(s.id)) || suppliers[0];

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
  const handleConfirmRejection = async () => {
    if (!targetActionRequest) return;
    if (!rejectionReason.trim()) {
      toast.error('Rejection reason is required.');
      return;
    }

    setIsRejecting(true);
    try {
      await commercePurchaseRequestApi.patchPurchaseRequestStatus(targetActionRequest.id, {
        status: 'Rejected',
        rejectionReason: rejectionReason.trim(),
      });
      updatePurchaseRequestStatus(targetActionRequest.id, 'Rejected', rejectionReason.trim());
      toast.success(`Request ${targetActionRequest.requestNo} rejected.`);
      setRejectionModalOpen(false);
      loadPurchaseRequests(true);
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to reject purchase request on server';
      console.warn('API rejection error:', err);
      updatePurchaseRequestStatus(targetActionRequest.id, 'Rejected', rejectionReason.trim());
      toast.info(`Request ${targetActionRequest.requestNo} marked as rejected locally (${errMsg}).`);
      setRejectionModalOpen(false);
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
  const handleApproveRequest = async (reqToApprove?: PurchaseRequest | null) => {
    const target = reqToApprove || selectedRequest;
    if (!target) {
      console.warn('Approve called without target request');
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

      updatePurchaseRequestStatus(target.id, 'Approved', undefined, approverName);
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
      const errMsg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to approve request on server';
      console.warn('API purchase request approval error:', err);
      updatePurchaseRequestStatus(target.id, 'Approved', undefined, approverName);
      toast.info(`Purchase request ${target.requestNo} approved locally (${errMsg}).`);
      setIsViewModalOpen(false);
    } finally {
      setIsApproving(false);
    }
  };

  // Total records & paginated items
  const totalCount =
    isApiConnected && totalApiRecords !== null ? totalApiRecords : filteredLocalRequests.length;

  const paginatedRequests = useMemo(() => {
    if (isApiConnected) {
      return liveRequests;
    }
    const start = (currentPage - 1) * pageSize;
    return filteredLocalRequests.slice(start, start + pageSize);
  }, [isApiConnected, liveRequests, filteredLocalRequests, currentPage, pageSize]);

  // Export Purchase Requests to Excel
  const handleExportExcel = () => {
    const listToExport = isApiConnected && liveRequests.length > 0 ? liveRequests : filteredLocalRequests;
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
      subtitle: `Total Requests: ${listToExport.length} | Generated: ${new Date().toLocaleDateString('en-IN')}`,
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

  // Print Purchase Request via universal printUtils
  const handlePrintPurchaseRequest = (req: PurchaseRequest) => {
    const totalEst = req.items.reduce(
      (acc, it) => acc + (it.estimatedUnitPrice || 0) * (it.requestedQuantity || (it as any).quantity || 0),
      0
    );

    printBusinessDocument({
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
    });
  };

  // Print Table Report for Purchase Requests
  const handlePrintTableReport = () => {
    const listToPrint = isApiConnected && liveRequests.length > 0 ? liveRequests : filteredLocalRequests;
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
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
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

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 sm:gap-3 shrink-0 w-full sm:w-auto">
          <Button
            variant="secondary"
            size="md"
            className="w-full sm:w-auto justify-center"
            onClick={handlePrintTableReport}
            icon={<Printer className="w-4 h-4 text-[#33077C]" />}
          >
            Print Report
          </Button>

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
            icon={<Plus className="w-4 h-4 text-white" />}
            className="w-full sm:w-auto justify-center"
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
          const isSame =
            appliedSearch === '' &&
            pendingSearch === '' &&
            appliedPriority === 'All' &&
            pendingPriority === 'All' &&
            appliedStatus === 'All' &&
            pendingStatus === 'All' &&
            currentPage === 1;

          setPendingSearch('');
          setAppliedSearch('');
          setPendingPriority('All');
          setAppliedPriority('All');
          setPendingStatus('All');
          setAppliedStatus('All');
          setCurrentPage(1);

          if (isSame) {
            loadPurchaseRequests(true);
          }
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
            <thead>
              <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white tracking-wider uppercase">
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">REQUEST NO.</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">DATE</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">REQUESTED BY</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">DEPARTMENT</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">ITEMS REQUESTED</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">PRIORITY</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">STATUS</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">ACTIONS</th>
              </tr>
            </thead>
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
                    <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#33077C] text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-xs shrink-0 select-none">
                          PR
                        </div>
                        <span
                          className="font-bold text-[#33077C] text-xs sm:text-[14px] cursor-pointer hover:underline"
                          onClick={() => {
                            setSelectedRequest(req);
                            setIsViewModalOpen(true);
                          }}
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
                      {req.status === 'Approved' || req.status === 'Purchase Created' ? (
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

                        {/* Share / Forward Button with Popover */}
                        <UniversalShareDropdown
                          id={req.id}
                          activeShareId={activeShareId}
                          setActiveShareId={setActiveShareId}
                          sharePos={sharePos}
                          setSharePos={setSharePos}
                          getShareData={() => formatPurchaseRequestShare(req)}
                          title="Share Purchase Request"
                        />

                        {/* 3-dots Actions Dropdown */}
                        <SaleActionDropdown
                          items={[
                            {
                              label: 'View/Edit',
                              variant: 'edit',
                              onClick: () => handleOpenEditModal(req),
                            },
                            {
                              label: 'Print Request',
                              variant: 'print',
                              onClick: () => handlePrintPurchaseRequest(req),
                            },
                            {
                              label: 'Duplicate',
                              variant: 'duplicate',
                              onClick: () => handleDuplicateRequest(req),
                            },
                            {
                              label: 'Preview',
                              variant: 'preview',
                              onClick: () => {
                                setSelectedRequest(req);
                                setIsViewModalOpen(true);
                              },
                            },
                            {
                              label: 'View History',
                              variant: 'view',
                              onClick: () => handleOpenHistory(req),
                            },
                            req.status !== 'Purchase Created' && req.status?.toLowerCase() !== 'purchase created' && {
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
          onSubmit={handleSubmit((data) => onSaveRequest(data, 'Pending Approval'))}
          className="space-y-4 p-2 sm:p-4 animate-in fade-in duration-150"
        >
          {/* Metadata: 3-column Grid Layout matching standard reference */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Request Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                {...register('requestNo')}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                placeholder="REQ-2026-..."
              />
              <FormError message={errors.requestNo?.message} />
            </div>

            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Request Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={requestDate}
                onChange={(e) => setRequestDate(e.target.value)}
                disabled={!!editingRequest}
                title={editingRequest ? "Request date cannot be changed after creation" : undefined}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Required Date
              </label>
              <input
                type="date"
                value={requiredDate}
                onChange={(e) => setRequiredDate(e.target.value)}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
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
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Select Supplier
              </label>
              <CustomSelect
                value={watch('supplierId') || ''}
                onChange={(selId) => {
                  const found = mergedSuppliers.find((s) => s.id === selId);
                  setValue('supplierId', selId);
                  setValue('supplierName', found ? found.name : '');
                }}
                options={mergedSuppliers.map((s) => ({
                  value: s.id,
                  label: `${s.name}${s.supplierCode ? ` (${s.supplierCode})` : ''}`,
                }))}
                placeholder="Select Supplier"
                allowClear={true}
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
                          <td className="py-2.5 px-2 border-r border-slate-200 align-middle min-w-[200px]">
                            <SearchableSelect
                              value={it.productId}
                              onChange={(val) => handleProductChange(idx, val)}
                              onOpen={() => {
                                if (availableProducts.length === 0) {
                                  handleProductSearch('');
                                }
                              }}
                              onSearch={handleProductSearch}
                              isLoading={isSearchingProducts}
                              options={productOptions}
                              placeholder="Select Product..."
                              searchPlaceholder="Search product..."
                              emptyText={isSearchingProducts ? "Searching products..." : "No products found"}
                              allowClear
                              triggerClassName="!h-10 !rounded-[4px] !border !border-slate-300 hover:!border-slate-400 focus:!border-[#33077C] !bg-white shadow-2xs text-xs font-semibold"
                              size="sm"
                            />
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
                              value={it.requestedQuantity}
                              onChange={(e) =>
                                handleItemFieldChange(idx, 'requestedQuantity', Number(e.target.value))
                              }
                              className="w-full h-10 px-2 text-center bg-white hover:border-slate-400 focus:bg-white border border-slate-300 focus:border-[#33077C] focus:ring-2 focus:ring-[#33077C]/10 rounded-[4px] text-xs font-bold text-slate-800 outline-none shadow-2xs transition-all"
                            />
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
                              value={it.requiredDate}
                              onChange={(e) => handleItemFieldChange(idx, 'requiredDate', e.target.value)}
                              className="w-full h-10 px-2 text-center bg-white hover:border-slate-400 focus:bg-white border border-slate-300 focus:border-[#33077C] focus:ring-2 focus:ring-[#33077C]/10 rounded-[4px] text-xs font-medium text-slate-700 outline-none shadow-2xs transition-all cursor-pointer"
                            />
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
                  Required By: {selectedRequest.requiredDate || 'N/A'} • Req Date: {selectedRequest.requestDate}
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-[#33077C] border border-purple-200 text-xs font-bold shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#33077C] shrink-0" />
                  <span>{selectedRequest.status}</span>
                </span>
              </div>
            </div>

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

            <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
              {isPendingApproval(selectedRequest.status) && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetActionRequest(selectedRequest);
                      setRejectionReason('');
                      setRejectionModalOpen(true);
                    }}
                    className="h-10 px-4 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs sm:text-[13px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Ban className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                  <button
                    type="button"
                    disabled={isApproving}
                    onClick={() => handleApproveRequest(selectedRequest)}
                    className="h-10 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-[13px] font-bold shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
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

              {(selectedRequest.status === 'Approved' || selectedRequest.status?.toLowerCase() === 'approved') && (
                <button
                  type="button"
                  onClick={() => handleConvertToPurchase(selectedRequest)}
                  className="h-10 px-4 rounded-lg border border-purple-200 hover:border-purple-300 text-xs sm:text-[13px] font-bold text-[#33077C] hover:bg-purple-50 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Generate Purchase Order</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="h-10 px-5 rounded-lg border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center shadow-2xs"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => handlePrintPurchaseRequest(selectedRequest)}
                className="h-10 px-5 rounded-lg bg-[#33077C] hover:bg-[#26055d] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print Request</span>
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
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Budget constraints, duplicate request, existing surplus stock..."
                className={FORM_TEXTAREA_CLS}
              />
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
          <div className="space-y-4 text-xs font-sans">
            {/* Header Card */}
            <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-100 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-[#33077C] uppercase tracking-wider">
                  Requisition No
                </div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">
                  {historyRequest.requestNo}
                </div>
                <div className="text-xs text-slate-600 font-medium mt-0.5">
                  Requested By: <span className="font-semibold text-slate-800">{historyRequest.requestedBy}</span> ({historyRequest.department})
                </div>
                {historyRequest.supplierName && (
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Preferred Vendor: {historyRequest.supplierName}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Est. Total Amount
                </div>
                <div className="text-base font-extrabold text-[#33077C] mt-0.5">
                  ₹{(Number(historyRequest.totalEstimatedAmount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-1.5 justify-end mt-1.5 flex-wrap">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      historyRequest.priority === 'Urgent'
                        ? 'bg-rose-100 text-rose-700'
                        : historyRequest.priority === 'High'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {historyRequest.priority} Priority
                  </span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      historyRequest.status === 'Approved'
                        ? 'bg-emerald-100 text-emerald-700'
                        : historyRequest.status === 'Purchase Created'
                        ? 'bg-purple-100 text-purple-700'
                        : historyRequest.status === 'Rejected'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {historyRequest.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Audit Timeline */}
            <div className="space-y-3 pt-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Lifecycle & Activity Timeline
              </div>

              <div className="relative pl-6 space-y-4 border-l-2 border-purple-200 ml-2">
                {/* Event 1: Creation */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-[#33077C] ring-4 ring-purple-100" />
                  <div>
                    <div className="font-bold text-slate-800 text-xs">
                      Purchase Requisition Raised
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      Request Date: <span className="font-medium text-slate-700">{historyRequest.requestDate}</span> • Required By: <span className="font-medium text-slate-700">{historyRequest.requiredDate || 'N/A'}</span>
                    </div>
                    <div className="text-slate-400 text-[10px] mt-0.5">
                      Items: {historyRequest.items.length} material(s) requested for {historyRequest.department}
                    </div>
                  </div>
                </div>

                {/* Event 2: Approval State */}
                <div className="relative">
                  <div
                    className={`absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full ${
                      historyRequest.status === 'Approved' || historyRequest.status === 'Purchase Created'
                        ? 'bg-emerald-500 ring-4 ring-emerald-100'
                        : historyRequest.status === 'Rejected'
                        ? 'bg-rose-500 ring-4 ring-rose-100'
                        : 'bg-amber-500 ring-4 ring-amber-100'
                    }`}
                  />
                  <div>
                    <div className="font-bold text-slate-800 text-xs">
                      Status: {historyRequest.status}
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      {historyRequest.status === 'Purchase Created'
                        ? 'Requisition converted into a formal Purchase Order.'
                        : historyRequest.status === 'Approved'
                        ? 'Authorized and approved by management; ready to convert to PO.'
                        : historyRequest.status === 'Rejected'
                        ? `Rejected: ${historyRequest.rejectionReason || 'Declined during review'}`
                        : 'Pending managerial approval and review.'}
                    </div>
                  </div>
                </div>

                {/* Event 3: Notes & Purpose */}
                {historyRequest.notes && (
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-blue-500 ring-4 ring-blue-100" />
                    <div>
                      <div className="font-bold text-slate-800 text-xs">
                        Department Purpose / Remarks
                      </div>
                      <div className="text-slate-600 text-[11px] mt-0.5 italic">
                        "{historyRequest.notes}"
                      </div>
                    </div>
                  </div>
                )}

                {/* Event 4: System Audit Log */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-slate-400 ring-4 ring-slate-100" />
                  <div>
                    <div className="font-bold text-slate-700 text-xs">
                      System Audit Log Entry
                    </div>
                    <div className="text-slate-400 text-[10px] mt-0.5">
                      Record ID: <span className="font-mono text-slate-600">{historyRequest.id}</span>
                    </div>
                    <div className="text-slate-400 text-[10px] mt-0.5">
                      Last Verified: {new Date(historyRequest.updatedAt || Date.now()).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setHistoryRequest(null)}
                className="h-10 px-5 rounded-lg border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
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
