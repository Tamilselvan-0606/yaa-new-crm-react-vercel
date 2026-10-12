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
  FileSpreadsheet,
  Loader2,
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
import { Pagination } from '../../../components/common/Pagination';
import { SearchBar } from '../../../components/common/SearchBar';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { exportTableToExcel } from '../../../utils/excelExport';
import { UniversalShareDropdown, formatPurchaseRequestShare } from '../../../utils/shareUtils';
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
  const [availableProducts, setAvailableProducts] = useState<ApiProduct[]>([]);

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

  // Load available products from Commerce Product API
  useEffect(() => {
    let isMounted = true;
    const fetchCatalog = async () => {
      try {
        const res = await productApi.getProducts({ pagination_required: false });
        if (isMounted && res && res.success && Array.isArray(res.data)) {
          setAvailableProducts(res.data);
        }
      } catch (err) {
        console.warn('Failed to prefetch commerce products for PR view:', err);
      }
    };
    fetchCatalog();
    return () => {
      isMounted = false;
    };
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

  // Debounce search input (450ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pendingSearch.trim() !== appliedSearch.trim()) {
        setAppliedSearch(pendingSearch.trim());
        setCurrentPage(1);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [pendingSearch, appliedSearch]);

  const handleManualRefresh = () => {
    lastFetchKeyRef.current = null;
    loadPurchaseRequests(true);
    toast.info('Refreshing purchase requests from Commerce API...');
  };

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<PurchaseRequest | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);

  // Rejection Modal
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [targetActionRequest, setTargetActionRequest] = useState<PurchaseRequest | null>(null);

  // Form Items State
  const [requestItems, setRequestItems] = useState<PurchaseRequestItem[]>([]);
  const [requestDate, setRequestDate] = useState(new Date().toISOString().split('T')[0]);
  const [requiredDate, setRequiredDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PurchaseRequestFormData>({
    resolver: zodResolver(PurchaseRequestSchema),
    defaultValues: {
      requestNo: '',
      requestedBy: getLoggedInUserName(),
      department: '',
      priority: 'Medium',
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

    const initialItem: PurchaseRequestItem = {
      id: `pr_item_${Date.now()}`,
      productId: '',
      productName: '',
      currentStock: 0,
      requestedQuantity: 1,
      estimatedUnitPrice: 0,
      requiredDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      remarks: '',
    };

    setEditingRequest(null);
    reset({
      requestNo: nextReqNo,
      requestedBy: getLoggedInUserName(),
      department: '',
      priority: 'Medium',
      notes: '',
    });
    setRequestDate(new Date().toISOString().split('T')[0]);
    setRequiredDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    setRequestItems([initialItem]);
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

  // Duplicate Request
  const handleDuplicateRequest = async (req: PurchaseRequest) => {
    const dupNo = `PR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const createPayload = mapUiToCreatePayload(
      {
        requestNo: dupNo,
        requestDate: new Date().toISOString().split('T')[0],
        requestedBy: req.requestedBy,
        department: req.department,
        requiredDate: req.requiredDate,
        priority: req.priority,
        status: 'Draft',
        notes: req.notes ? `Duplicated from ${req.requestNo}. ${req.notes}` : `Duplicated from ${req.requestNo}`,
      },
      req.items
    );

    try {
      const res = await commercePurchaseRequestApi.createPurchaseRequest(createPayload);
      if (res && res.success && res.data) {
        const mapped = mapApiPurchaseRequestToUi(res.data);
        savePurchaseRequest(mapped);
      } else {
        savePurchaseRequest({
          ...req,
          id: `pr_${Date.now()}`,
          requestNo: dupNo,
          status: 'Draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          items: req.items.map((it) => ({
            ...it,
            id: `pr_item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          })),
        });
      }
      toast.success(`Purchase request duplicated as ${dupNo}`);
      loadPurchaseRequests(true);
    } catch {
      savePurchaseRequest({
        ...req,
        id: `pr_${Date.now()}`,
        requestNo: dupNo,
        status: 'Draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: req.items.map((it) => ({
          ...it,
          id: `pr_item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        })),
      });
      toast.success(`Purchase request duplicated as ${dupNo}`);
    }
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
    if (requestItems.length <= 1) {
      toast.error('Purchase request must contain at least one item.');
      return;
    }
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

  // Delete Purchase Request via API
  const handleDeleteRequest = async (req: PurchaseRequest) => {
    if (!window.confirm(`Are you sure you want to delete purchase request ${req.requestNo}?`)) {
      return;
    }
    try {
      await commercePurchaseRequestApi.deletePurchaseRequest(req.id);
      deletePurchaseRequest(req.id);
      toast.success(`Purchase request ${req.requestNo} deleted.`);
      loadPurchaseRequests(true);
    } catch (err: any) {
      console.warn('API delete error:', err);
      deletePurchaseRequest(req.id);
      toast.success(`Purchase request ${req.requestNo} deleted.`);
    }
  };

  // Convert Approved Request directly to Purchase Order
  const handleConvertToPurchase = async (req: PurchaseRequest) => {
    const targetSupplier = suppliers[0] || {
      id: 'sup_1',
      name: 'Apex Technologies Pvt Ltd',
      supplierCode: 'SUP-1001',
    };

    const subtotal = req.items.reduce(
      (acc, it) => acc + (it.estimatedUnitPrice || 1000) * it.requestedQuantity,
      0
    );
    const tax = subtotal * 0.18;
    const grandTotal = subtotal + tax;

    const newPO: PurchaseOrder = {
      id: `po_${Date.now()}`,
      purchaseNo: `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      purchaseInvoiceNo: `INV-FROM-${req.requestNo}`,
      supplierId: targetSupplier.id,
      supplierName: targetSupplier.name,
      supplierCode: targetSupplier.supplierCode,
      purchaseDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      items: req.items.map((it) => ({
        id: `po_item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        productId: it.productId,
        productName: it.productName,
        quantity: it.requestedQuantity,
        purchasePrice: it.estimatedUnitPrice || 1000,
        discountPercent: 0,
        taxPercent: 18,
        total: (it.estimatedUnitPrice || 1000) * it.requestedQuantity * 1.18,
      })),
      subtotal,
      discount: 0,
      tax,
      shipping: 0,
      otherCharges: 0,
      grandTotal,
      paidAmount: 0,
      balance: grandTotal,
      paymentMethod: 'Bank Transfer',
      paymentTerms: 'Net 30 Days',
      paymentStatus: 'Unpaid',
      purchaseStatus: 'Draft',
      notes: `Generated from internal requisition ${req.requestNo}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    savePurchase(newPO);

    // Update status on API
    try {
      await commercePurchaseRequestApi.updatePurchaseRequest(req.id, {
        status: 'Purchase Created',
      });
    } catch {
      // Local fallback
    }
    updatePurchaseRequestStatus(req.id, 'Purchase Created');

    toast.success(`Purchase Order ${newPO.purchaseNo} drafted from ${req.requestNo}!`);
    navigate('/sale-management/purchase/purchase');
  };

  // Rejection confirmation handler
  const handleConfirmRejection = async () => {
    if (!targetActionRequest) return;
    if (!rejectionReason.trim()) {
      toast.error('Rejection reason is required.');
      return;
    }

    try {
      await commercePurchaseRequestApi.updatePurchaseRequest(targetActionRequest.id, {
        status: 'Rejected',
        rejectionReason: rejectionReason.trim(),
      });
      updatePurchaseRequestStatus(targetActionRequest.id, 'Rejected', rejectionReason.trim());
      toast.success(`Request ${targetActionRequest.requestNo} rejected.`);
      setRejectionModalOpen(false);
      loadPurchaseRequests(true);
    } catch (err: any) {
      console.warn('API rejection error:', err);
      updatePurchaseRequestStatus(targetActionRequest.id, 'Rejected', rejectionReason.trim());
      toast.success(`Request ${targetActionRequest.requestNo} marked as rejected.`);
      setRejectionModalOpen(false);
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

            {/* API Connection Indicator */}
            {isApiConnected === true && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live API
              </span>
            )}
            {isApiConnected === false && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 cursor-help"
                title={apiErrorMessage || 'Using local database'}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Local Mode
              </span>
            )}
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
          setAppliedSearch(pendingSearch);
          setAppliedPriority(pendingPriority);
          setAppliedStatus(pendingStatus);
          setCurrentPage(1);
        }}
        onReset={() => {
          setPendingSearch('');
          setAppliedSearch('');
          setPendingPriority('All');
          setAppliedPriority('All');
          setPendingStatus('All');
          setAppliedStatus('All');
          setCurrentPage(1);
        }}
        filterSlot={
          <div className="flex items-center gap-2.5 flex-wrap">
            <FilterDropdown
              placeholder="Priority : All"
              value={pendingPriority}
              onChange={(val) => {
                setPendingPriority(val);
                setAppliedPriority(val);
                setCurrentPage(1);
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
                setAppliedStatus(val);
                setCurrentPage(1);
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
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">REQUEST NO & DATE</th>
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
                  <td colSpan={7} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    <Loader2 className="w-8 h-8 mx-auto mb-2 text-[#33077C] animate-spin" />
                    <p className="font-semibold text-slate-600 text-sm">Loading purchase requests...</p>
                    <p className="text-xs text-slate-400 mt-1">Connecting to Commerce API</p>
                  </td>
                </tr>
              ) : paginatedRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    <FilePlus className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    <p className="font-semibold text-slate-600 text-sm">No purchase requests found</p>
                    <p className="text-xs text-slate-400 mt-1">Submit a new requisition to order supplies.</p>
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-200 font-sans">
                    {/* 1. Request No & Date */}
                    <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#33077C] text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-xs shrink-0 select-none">
                          PR
                        </div>
                        <div className="flex flex-col">
                          <span
                            className="font-bold text-[#33077C] text-xs sm:text-[14px] cursor-pointer hover:underline"
                            onClick={() => {
                              setSelectedRequest(req);
                              setIsViewModalOpen(true);
                            }}
                          >
                            {req.requestNo}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium mt-0.5">
                            Req: {req.requestDate} {req.requiredDate ? `• Need: ${req.requiredDate}` : ''}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 2. Requested By */}
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
                        {/* Print Button */}
                        <button
                          type="button"
                          title="Print Purchase Request"
                          onClick={() => {
                            toast.info(`Preparing print for ${req.requestNo}...`);
                            window.print();
                          }}
                          className="w-8 h-8 rounded-lg bg-transparent hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

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
                        <div className="relative inline-block text-left action-dropdown-container">
                          <button
                            type="button"
                            title="More Options"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeDropdownId === req.id) {
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
                                setActiveDropdownId(req.id);
                              }
                            }}
                            className="w-8 h-8 rounded-lg bg-transparent hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeDropdownId === req.id && dropdownPos && (
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
                                  handleOpenEditModal(req);
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
                                  handleDuplicateRequest(req);
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
                                  handleDeleteRequest(req);
                                }}
                                className="w-full px-4 py-2 text-left text-[13px] font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer block"
                              >
                                Delete
                              </button>

                              {/* 4. Open PDF */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  toast.info(`Opening PDF for ${req.requestNo}...`);
                                  window.print();
                                }}
                                className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
                              >
                                Open PDF
                              </button>

                              {/* 5. Preview */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  setSelectedRequest(req);
                                  setIsViewModalOpen(true);
                                }}
                                className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
                              >
                                Preview
                              </button>

                              {/* 6. Print */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  toast.info(`Preparing print for ${req.requestNo}...`);
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
                                  toast.info(
                                    `Requisition ${req.requestNo} created on ${req.requestDate || 'recently'} by ${req.requestedBy || 'N/A'}. Status: ${req.status}.`
                                  );
                                }}
                                className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
                              >
                                View History
                              </button>

                              {/* 8. Convert to Purchase */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  handleConvertToPurchase(req);
                                }}
                                className="w-full px-4 py-2 text-left text-[13px] font-medium text-[#33077C] font-semibold hover:bg-purple-50 transition-colors cursor-pointer block"
                              >
                                Convert to Purchase
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
          {/* Metadata: 3-column Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Request Number <span className="text-slate-500">*</span>
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
                Requested By <span className="text-slate-500">*</span>
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
                Department <span className="text-slate-500">*</span>
              </label>
              <select
                {...register('department')}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer"
              >
                <option value="">Select Department</option>
                <option value="Warehouse / Production">Warehouse / Production</option>
                <option value="Operations">Operations</option>
                <option value="Logistics">Logistics</option>
                <option value="IT & Infrastructure">IT & Infrastructure</option>
                <option value="Procurement">Procurement</option>
                <option value="Marketing">Marketing</option>
                <option value="Sales">Sales</option>
              </select>
              <FormError message={errors.department?.message} />
            </div>

            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Priority <span className="text-slate-500">*</span>
              </label>
              <select
                {...register('priority')}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
              <FormError message={errors.priority?.message} />
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

          {/* Product Items Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-slate-800 tracking-wider text-xs uppercase">
                Requested Items & Stock Levels
              </span>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="h-8 px-3 rounded-lg bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold shadow-xs transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product</span>
              </button>
            </div>

            <div className="overflow-x-auto max-w-full">
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="bg-slate-100/70 text-[11px] font-bold text-slate-600 border-b border-slate-200">
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3 text-center">In Stock</th>
                    <th className="py-2.5 px-3 text-center w-28">Req Qty</th>
                    <th className="py-2.5 px-3 text-right">Est. Cost</th>
                    <th className="py-2.5 px-3">Required By</th>
                    <th className="py-2.5 px-3 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {requestItems.map((it, idx) => (
                    <tr key={it.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3">
                        {availableProducts.length > 0 ? (
                          <select
                            value={it.productId}
                            onChange={(e) => handleProductChange(idx, e.target.value)}
                            className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-[#4309A2] cursor-pointer"
                          >
                            <option value="">-- Select Product --</option>
                            {availableProducts.map((prod) => (
                              <option key={prod.id} value={prod.id}>
                                {prod.productName} {prod.productCode ? `(${prod.productCode})` : ''}
                              </option>
                            ))}
                          </select>
                        ) : stocks.length > 0 ? (
                          <select
                            value={it.productId}
                            onChange={(e) => handleProductChange(idx, e.target.value)}
                            className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-[#4309A2] cursor-pointer"
                          >
                            <option value="">-- Select Product --</option>
                            {stocks.map((stk) => (
                              <option key={stk.productId} value={stk.productId}>
                                {stk.productName} ({stk.sku})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={it.productName}
                            onChange={(e) => handleItemFieldChange(idx, 'productName', e.target.value)}
                            placeholder="Product name"
                            className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-[#4309A2]"
                          />
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-600">{it.currentStock}</td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min="1"
                          value={it.requestedQuantity}
                          onChange={(e) =>
                            handleItemFieldChange(idx, 'requestedQuantity', Number(e.target.value))
                          }
                          className="w-full h-9 px-2 text-center bg-white border border-slate-200 rounded-lg text-xs font-bold text-purple-900 outline-none focus:border-[#4309A2]"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 font-semibold">
                        ₹{(it.estimatedUnitPrice || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="date"
                          value={it.requiredDate}
                          onChange={(e) => handleItemFieldChange(idx, 'requiredDate', e.target.value)}
                          className="w-full h-9 px-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#4309A2]"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-colors mx-auto cursor-pointer"
                          title="Remove product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Standard Footer */}
          <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isSubmittingForm}
              onClick={() => setIsCreateModalOpen(false)}
              className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <X className="w-4 h-4 text-slate-500" />
              <span>Cancel</span>
            </button>
            <button
              type="submit"
              disabled={isSubmittingForm}
              className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isSubmittingForm ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Save</span>
                </>
              )}
            </button>
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
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4 text-slate-500" />
                <span>Close</span>
              </button>

              {selectedRequest.status === 'Pending Approval' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetActionRequest(selectedRequest);
                      setRejectionReason('');
                      setRejectionModalOpen(true);
                    }}
                    className="h-10 px-4 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs sm:text-[13px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Ban className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await commercePurchaseRequestApi.updatePurchaseRequest(selectedRequest.id, {
                          status: 'Approved',
                          approvedBy: 'Admin',
                        });
                        updatePurchaseRequestStatus(selectedRequest.id, 'Approved', undefined, 'Admin');
                        toast.success(`Purchase request ${selectedRequest.requestNo} approved!`);
                        setIsViewModalOpen(false);
                        loadPurchaseRequests(true);
                      } catch (err: any) {
                        updatePurchaseRequestStatus(selectedRequest.id, 'Approved', undefined, 'Admin');
                        toast.success(`Purchase request ${selectedRequest.requestNo} approved locally.`);
                        setIsViewModalOpen(false);
                      }
                    }}
                    className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-[13px] font-bold shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Request</span>
                  </button>
                </>
              )}

              {selectedRequest.status === 'Approved' && (
                <button
                  type="button"
                  onClick={() => handleConvertToPurchase(selectedRequest)}
                  className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Generate Purchase Order</span>
                </button>
              )}
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
          <div className="space-y-4 pt-2 text-xs">
            <div>
              <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5">
                Rejection Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Budget constraints, duplicate request, existing surplus stock..."
                className="w-full p-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all"
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
                onClick={handleConfirmRejection}
                className="h-10 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <Ban className="w-4 h-4" />
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
