import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  Eye,
  Pencil,
  Printer,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  IndianRupee,
  Truck,
  Building2,
  Calendar,
  Layers,
  CreditCard,
  RotateCcw,
  MoreVertical,
  PackageCheck,
  Check,
  X,
  Percent,
  Tag,
  ArrowLeft,
  Forward,
  FileSpreadsheet,
  Loader2,
  ChevronDown,
  FileText,
  History,
} from 'lucide-react';
import {
  useSalesManagementStore,
  PurchaseOrder,
  PurchaseProductItem,
  PurchaseStatus,
  PurchasePaymentStatus,
  PurchaseReturn,
  PurchaseReturnItem,
  PurchaseRequest,
} from '../../../store/useSalesManagementStore';
import {
  workPurchaseOrderApi,
  mapApiPurchaseOrderToUi,
  mapUiToCreatePurchaseOrderPayload,
  mapUiToUpdatePurchaseOrderPayload,
  productApi,
  ApiProduct,
  CreateProductPayload,
  supplierApi,
  ApiSupplier,
  stockApi,
  ApiStockBatch,
  UUID_REGEX,
  ensureValidUuid,
  commercePurchaseRequestApi,
  mapApiPurchaseRequestToUi,
} from '../../../api';
import {
  commercePurchaseReturnApi,
  mapApiPurchaseReturnToUi,
} from '../../../api/commerce/purchaseReturnApi';
import { Badge } from '../../../components/common/Badge';
import { FormLabel, FORM_INPUT_CLS, FORM_SELECT_CLS } from '../utils/formUtils';
import { SaleActionDropdown } from '../utils';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { Pagination } from '../../../components/common/Pagination';
import { SearchBar } from '../../../components/common/SearchBar';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { SearchableSelect } from '../../../components/common/SearchableSelect';
import { CustomSelect } from '../../../components/common/CustomSelect';
import { exportTableToExcel } from '../../../utils/excelExport';
import { UniversalShareDropdown, formatPurchaseOrderShare } from '../../../utils/shareUtils';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';

const UNIT_OPTIONS = [
  'NONE',
  'PCS',
  'KG',
  'BOX',
  'LTR',
  'BAG',
  'PACK',
  'DOZEN',
  'CARTON',
  'CAN',
  'SET',
  'QUINTAL',
  'MTR',
];

const TAX_RATE_OPTIONS = [
  { label: 'Select Tax', rate: 0 },
  { label: 'Exempted (0%)', rate: 0 },
  { label: 'GST @ 0%', rate: 0 },
  { label: 'GST @ 0.1%', rate: 0.1 },
  { label: 'GST @ 0.25%', rate: 0.25 },
  { label: 'GST @ 1.5%', rate: 1.5 },
  { label: 'GST @ 3%', rate: 3 },
  { label: 'GST @ 5%', rate: 5 },
  { label: 'GST @ 12%', rate: 12 },
  { label: 'GST @ 18%', rate: 18 },
  { label: 'GST @ 28%', rate: 28 },
  { label: 'GST @ 40%', rate: 40 },
];

export const PurchaseOrderView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    purchases,
    suppliers,
    stocks,
    savePurchase,
    setPurchasesList,
    deletePurchase,
    updatePurchasePayment,
    savePurchaseReturn,
    updatePurchaseRequestStatus,
    purchaseRequests,
  } = useSalesManagementStore();

  // Purchase Type State (With Purchase Request vs Without Purchase Request)
  const [purchaseType, setPurchaseType] = useState<'with_request' | 'without_request'>('without_request');
  const [selectedRequestId, setSelectedRequestId] = useState<string>('');
  const [availableRequests, setAvailableRequests] = useState<PurchaseRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  // Tracking for converted Purchase Request (so Commerce PATCH /status is only called upon Save Purchase Bill)
  const [originatingRequestId, setOriginatingRequestId] = useState<string | null>(null);
  const hasConvertedRef = useRef(false);

  // Live API Integration State
  const [livePurchases, setLivePurchases] = useState<PurchaseOrder[]>([]);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const [totalApiRecords, setTotalApiRecords] = useState<number | null>(null);
  const [totalApiPages, setTotalApiPages] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<ApiProduct[]>([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  const [availableSuppliers, setAvailableSuppliers] = useState<ApiSupplier[]>([]);
  const [availableBatches, setAvailableBatches] = useState<ApiStockBatch[]>([]);
  const [customBatchRows, setCustomBatchRows] = useState<Record<number, boolean>>({});

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [historyPurchase, setHistoryPurchase] = useState<PurchaseOrder | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseOrder | null>(null);

  const handleOpenHistory = async (po: PurchaseOrder) => {
    setActiveDropdownId(null);
    setHistoryPurchase(po);
    setIsLoadingHistory(true);
    try {
      if (po.id) {
        const res = await workPurchaseOrderApi.getPurchaseOrderById(po.id);
        if (res?.data) {
          const fresh = mapApiPurchaseOrderToUi(res.data);
          setHistoryPurchase(fresh);
        }
      }
    } catch (err) {
      console.warn('Failed to load purchase order history from API:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };
  const [editingPurchase, setEditingPurchase] = useState<PurchaseOrder | null>(null);

  // Payment Recording State
  const [recordAmount, setRecordAmount] = useState<number>(0);
  const [recordMethod, setRecordMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Credit' | 'Other'>('Bank Transfer');
  const [recordNotes, setRecordNotes] = useState('');

  // Form Payment Modal State (for recording payment directly inside Create / Edit Purchase form)
  const [isFormPaymentModalOpen, setIsFormPaymentModalOpen] = useState(false);
  const [formPaymentDetails, setFormPaymentDetails] = useState<{
    amountPaid: number;
    date: string;
    paymentType: string;
    transactionId: string;
    remarks: string;
  }>({
    amountPaid: 0,
    date: new Date().toISOString().split('T')[0],
    paymentType: '',
    transactionId: '',
    remarks: '',
  });

  // Quick Add Product Modal state
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [addProductTargetRowIdx, setAddProductTargetRowIdx] = useState<number | null>(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [quickProductForm, setQuickProductForm] = useState({
    productName: '',
    productCode: '',
    category: 'General',
    unit: 'PCS',
    purchasePrice: '',
    salePrice: '',
    taxRate: 'GST @ 18%',
    hsnCode: '',
  });

  const handleOpenAddProductModal = (targetRowIndex: number | null = null) => {
    setAddProductTargetRowIdx(targetRowIndex);
    setQuickProductForm({
      productName: '',
      productCode: `PRD-${Date.now().toString().slice(-6)}`,
      category: 'General',
      unit: 'PCS',
      purchasePrice: '',
      salePrice: '',
      taxRate: 'GST @ 18%',
      hsnCode: '',
    });
    setIsAddProductModalOpen(true);
  };

  const handleSaveQuickProduct = async () => {
    if (!quickProductForm.productName.trim()) {
      toast.error('Product Name is required.');
      return;
    }

    const purchasePriceNum = Number(quickProductForm.purchasePrice) || 0;
    const salePriceNum = Number(quickProductForm.salePrice) || 0;

    if (purchasePriceNum < 0 || salePriceNum < 0) {
      toast.error('Prices cannot be negative.');
      return;
    }

    setIsCreatingProduct(true);
    try {
      const payload: CreateProductPayload = {
        itemType: 'Product',
        productName: quickProductForm.productName.trim(),
        productCode: quickProductForm.productCode.trim() || `PRD-${Date.now().toString().slice(-6)}`,
        category: quickProductForm.category.trim() || 'General',
        unit: quickProductForm.unit || 'PCS',
        purchasePrice: purchasePriceNum,
        salePrice: salePriceNum,
        taxRate: quickProductForm.taxRate,
        hsnCode: quickProductForm.hsnCode.trim() || undefined,
        openingStock: 0,
        status: 'Active',
      };

      const res = await productApi.createProduct(payload);
      if (res && res.data) {
        const newProd = res.data;
        setAvailableProducts((prev) => [newProd, ...prev]);

        setFormData((prev) => {
          const items = [...prev.items];
          let targetIdx = addProductTargetRowIdx;
          if (targetIdx === null || targetIdx < 0 || targetIdx >= items.length) {
            const emptyIdx = items.findIndex((it) => !it.productId);
            if (emptyIdx >= 0) {
              targetIdx = emptyIdx;
            } else {
              targetIdx = items.length;
              items.push({
                id: `po_it_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                productId: '',
                productName: '',
                batch: '',
                quantity: 1,
                freeQuantity: 0,
                unit: 'NONE',
                packingUnit: '',
                expDate: '',
                purchasePrice: 0,
                salePrice: 0,
                discountPercent: 0,
                discountAmount: 0,
                taxPercent: 18,
                total: 0,
              });
            }
          }

          const currentItem = { ...items[targetIdx] };
          currentItem.productId = newProd.id;
          currentItem.productName = newProd.productName;
          currentItem.purchasePrice = purchasePriceNum;
          currentItem.salePrice = salePriceNum;
          currentItem.unit = newProd.unit || 'PCS';
          currentItem.quantity = currentItem.quantity || 1;

          const taxMatch = String(newProd.taxRate || quickProductForm.taxRate).match(/(\d+(\.\d+)?)/);
          if (taxMatch) {
            currentItem.taxPercent = parseFloat(taxMatch[1]);
          }

          const sub = (currentItem.quantity || 1) * purchasePriceNum;
          const disc =
            currentItem.discountAmount !== undefined && currentItem.discountAmount > 0
              ? currentItem.discountAmount
              : sub * ((currentItem.discountPercent || 0) / 100);
          const tax = prev.withGst ? (sub - disc) * ((currentItem.taxPercent || 18) / 100) : 0;
          currentItem.total = Math.round((sub - disc + tax) * 100) / 100;

          items[targetIdx] = currentItem;
          return { ...prev, items };
        });

        toast.success(`Product "${newProd.productName}" created and added to bill!`);
        setIsAddProductModalOpen(false);
      }
    } catch (err: any) {
      console.error('Failed to create product from purchase bill:', err);
      toast.error(
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to create product'
      );
    } finally {
      setIsCreatingProduct(false);
    }
  };

  // Form State
  const [formData, setFormData] = useState<{
    purchaseNo: string;
    purchaseInvoiceNo: string;
    supplierId: string;
    supplierName: string;
    purchaseDate: string;
    dueDate: string;
    items: PurchaseProductItem[];
    withGst: boolean;
    gstType: 'intra_state' | 'inter_state';
    shipping: number;
    otherCharges: number;
    paymentMethod: string;
    paymentTerms: string;
    paidAmount: number;
    purchaseStatus: PurchaseStatus;
    roundMode: 'none' | 'up' | 'down';
    notes: string;
  }>({
    purchaseNo: '',
    purchaseInvoiceNo: '',
    supplierId: '',
    supplierName: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    items: [],
    withGst: true,
    gstType: 'intra_state',
    shipping: 0,
    otherCharges: 0,
    paymentMethod: 'Cash',
    paymentTerms: 'Net 30 Days',
    paidAmount: 0,
    purchaseStatus: 'Pending',
    roundMode: 'none',
    notes: '',
  });

  // On-demand master data loader for form modal (products, suppliers, batches, purchase requests)
  // ONLY loaded when the user actually opens the Create / Edit purchase bill form modal.
  const hasLoadedFormMasterDataRef = useRef(false);
  const loadFormMasterData = useCallback(async () => {
    if (hasLoadedFormMasterDataRef.current) return;
    hasLoadedFormMasterDataRef.current = true;

    try {
      setIsLoadingRequests(true);
      const [suppRes, stockBatchRes, prRes, prodRes] = await Promise.allSettled([
        supplierApi.getSuppliers({ page_size: 100, pagination_required: false }),
        stockApi.getStockBatches({ page_size: 100, pagination_required: false }),
        commercePurchaseRequestApi.getPurchaseRequests({ page_size: 100, pagination_required: false }),
        productApi.getProducts({ page_size: 100, pagination_required: false }),
      ]);

      if (suppRes.status === 'fulfilled' && suppRes.value?.data && Array.isArray(suppRes.value.data)) {
        setAvailableSuppliers(suppRes.value.data);
      }
      if (stockBatchRes.status === 'fulfilled' && stockBatchRes.value?.data && Array.isArray(stockBatchRes.value.data)) {
        setAvailableBatches(stockBatchRes.value.data);
      }
      if (prRes.status === 'fulfilled' && prRes.value?.data && Array.isArray(prRes.value.data)) {
        setAvailableRequests(prRes.value.data.map(mapApiPurchaseRequestToUi));
      }
      if (prodRes.status === 'fulfilled' && prodRes.value?.data && Array.isArray(prodRes.value.data)) {
        setAvailableProducts(prodRes.value.data);
      }
    } catch (err) {
      console.warn('Error loading form master data in Purchase Bills:', err);
    } finally {
      setIsLoadingRequests(false);
    }
  }, []);

  // Trigger form master data ONLY when the form modal is active
  useEffect(() => {
    if (isFormModalOpen) {
      loadFormMasterData();
    }
  }, [isFormModalOpen, loadFormMasterData]);

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
      console.warn('Failed to search products in Purchase Bills:', err);
    } finally {
      setIsSearchingProducts(false);
    }
  }, []);

  // Merged Suppliers list (API + Store fallback)
  const mergedSuppliers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; supplierCode?: string; paymentTerms?: string }>();
    availableSuppliers.forEach((s) => {
      map.set(s.id, { id: s.id, name: s.name, supplierCode: s.supplierCode, paymentTerms: s.paymentTerms });
    });
    suppliers.forEach((s) => {
      if (!map.has(s.id)) {
        map.set(s.id, { id: s.id, name: s.name, supplierCode: s.supplierCode, paymentTerms: s.paymentTerms });
      }
    });
    return Array.from(map.values());
  }, [availableSuppliers, suppliers]);

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
        salePrice?: number;
        unit?: string;
      }
    >();

    availableProducts.forEach((p) => {
      const prodName = p.productName || (p as any).name || 'Product';
      const prodCost = Number(p.purchasePrice ?? (p as any).costPrice ?? 0);
      const prodSale = Number(p.salePrice ?? (p as any).sellingPrice ?? 0);
      const sku = p.productCode || p.sku || '';
      map.set(p.id, {
        value: p.id,
        label: prodName,
        subLabel: sku ? `SKU: ${sku} • Cost: ₹${prodCost} • Sale: ₹${prodSale}` : `Cost: ₹${prodCost} • Sale: ₹${prodSale}`,
        badge: sku || undefined,
        unitCost: prodCost,
        salePrice: prodSale,
        unit: p.unit || 'PCS',
      });
    });

    // Also include line items currently on the purchase order
    formData.items.forEach((it) => {
      if (it.productId && !map.has(it.productId)) {
        map.set(it.productId, {
          value: it.productId,
          label: it.productName || 'Product',
          unitCost: it.purchasePrice || 0,
          salePrice: it.salePrice || 0,
          unit: it.unit || 'PCS',
        });
      }
    });

    stocks.forEach((stk) => {
      if (!map.has(stk.productId)) {
        map.set(stk.productId, {
          value: stk.productId,
          label: stk.productName,
          unitCost: Number(stk.unitCost || 0),
          salePrice: Number((stk as any).unitPrice || (stk as any).sellingPrice || 0),
          unit: stk.unit || 'PCS',
        });
      }
    });

    return Array.from(map.values());
  }, [availableProducts, formData.items, stocks]);

  // Combined Eligible Purchase Requests (API + Store fallback)
  // Only shows pending/approved purchase requests that have not yet been converted into purchase bills
  const eligiblePurchaseRequests = useMemo(() => {
    const map = new Map<string, PurchaseRequest>();
    availableRequests.forEach((r) => {
      map.set(r.id, r);
    });
    purchaseRequests.forEach((r) => {
      if (!map.has(r.id)) {
        map.set(r.id, r);
      }
    });

    const editingMatch =
      editingPurchase?.notes?.match(/PR-\d+-\d+/i) ||
      editingPurchase?.purchaseInvoiceNo?.match(/PR-\d+-\d+/i);
    const editingRequestNo = editingMatch ? editingMatch[0].toLowerCase() : '';

    return Array.from(map.values()).filter((r) => {
      // Retain currently selected request or the one linked to the purchase bill being edited
      if (selectedRequestId && r.id === selectedRequestId) return true;
      if (editingRequestNo && r.requestNo.toLowerCase() === editingRequestNo) return true;

      const rawStatus = (r.status || '').toLowerCase().trim();

      // Exclude requests that already had a purchase created, or are completed/cancelled/rejected
      if (
        rawStatus === 'purchase created' ||
        rawStatus === 'completed' ||
        rawStatus === 'rejected' ||
        rawStatus === 'cancelled' ||
        Boolean(r.createdPurchaseId)
      ) {
        return false;
      }

      // Include pending/approved requests waiting for purchase bill creation
      return (
        rawStatus === 'approved' ||
        rawStatus === 'pending approval' ||
        rawStatus === 'submitted' ||
        rawStatus === 'pending' ||
        rawStatus === 'draft' ||
        rawStatus === ''
      );
    });
  }, [availableRequests, purchaseRequests, selectedRequestId, editingPurchase]);

  // Current selected purchase request details
  const selectedPurchaseRequest = useMemo(() => {
    if (!selectedRequestId) return null;
    return eligiblePurchaseRequests.find((r) => r.id === selectedRequestId) || null;
  }, [selectedRequestId, eligiblePurchaseRequests]);

  // If navigated from Purchase Request (Convert to Purchase)
  useEffect(() => {
    const locState = location.state as
      | {
          newPo?: PurchaseOrder;
          newPoId?: string;
          convertFromPr?: {
            requestId?: string;
            requestNo: string;
            supplierId?: string;
            supplierName?: string;
            dueDate?: string;
            notes?: string;
            items: {
              productId: string;
              productName: string;
              quantity: number;
              purchasePrice: number;
              unit?: string;
            }[];
          };
        }
      | undefined;

    if (!locState?.convertFromPr) {
      hasConvertedRef.current = false;
    }

    if (locState?.convertFromPr && !hasConvertedRef.current) {
      hasConvertedRef.current = true;
      const prData = locState.convertFromPr;
      const nextPoNo = `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      setPurchaseType('with_request');
      if (prData.requestId) {
        setSelectedRequestId(prData.requestId);
        setOriginatingRequestId(prData.requestId);

        // Ensure converted request is available in dropdown and requisition banner
        setAvailableRequests((prev) => {
          if (prev.some((r) => r.id === prData.requestId || r.requestNo === prData.requestNo)) return prev;
          const synthetic: PurchaseRequest = {
            id: prData.requestId!,
            requestNo: prData.requestNo,
            requestDate: new Date().toISOString().split('T')[0],
            requestedBy: 'Requisition Owner',
            department: 'Operations',
            requiredDate: prData.dueDate || '',
            priority: 'Medium',
            status: 'Approved',
            items: (prData.items || []).map((it, idx) => ({
              id: `req_it_${idx}`,
              productId: it.productId,
              productName: it.productName,
              currentStock: 0,
              requestedQuantity: it.quantity,
              estimatedUnitPrice: it.purchasePrice,
              requiredDate: prData.dueDate || '',
            })),
            supplierId: prData.supplierId,
            supplierName: prData.supplierName,
            notes: prData.notes,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          return [synthetic, ...prev];
        });
      }

      const prefilledItems: PurchaseProductItem[] = prData.items.map((it) => {
        const matchingProd = productOptions.find((p) => p.value === it.productId);
        const pPrice = it.purchasePrice || matchingProd?.unitCost || 0;
        const sPrice = matchingProd?.salePrice || 0;
        const u = it.unit || matchingProd?.unit || 'PCS';
        const qty = Math.max(1, it.quantity || 1);
        const itemTax = pPrice * qty * 0.18;
        return {
          id: `po_item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          productId: it.productId,
          productName: it.productName || matchingProd?.label || 'Product',
          batch: '',
          quantity: qty,
          freeQuantity: 0,
          unit: u,
          packingUnit: '',
          expDate: '',
          purchasePrice: pPrice,
          salePrice: sPrice,
          discountPercent: 0,
          discountAmount: 0,
          taxPercent: 18,
          total: Math.round((pPrice * qty + itemTax) * 100) / 100,
        };
      });

      const matchedSupplier =
        mergedSuppliers.find((s) => s.id === prData.supplierId) ||
        (mergedSuppliers.length > 0 ? mergedSuppliers[0] : null);

      setFormData({
        purchaseNo: nextPoNo,
        purchaseInvoiceNo: `INV-REQ-${prData.requestNo}`,
        supplierId: matchedSupplier ? matchedSupplier.id : (prData.supplierId || ''),
        supplierName: matchedSupplier ? matchedSupplier.name : (prData.supplierName || ''),
        purchaseDate: new Date().toISOString().split('T')[0],
        dueDate: prData.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        items: prefilledItems,
        withGst: true,
        gstType: 'intra_state',
        shipping: 0,
        otherCharges: 0,
        paymentMethod: 'Bank Transfer',
        paymentTerms: matchedSupplier?.paymentTerms || 'Net 30 Days',
        paidAmount: 0,
        purchaseStatus: 'Pending',
        roundMode: 'none',
        notes: prData.notes ? `Converted from ${prData.requestNo}. ${prData.notes}` : `Converted from Purchase Requisition ${prData.requestNo}`,
      });

      setEditingPurchase(null);
      setIsFormModalOpen(true);
      // Clean up React Router location state immediately so closing/saving won't re-trigger this block
      navigate(location.pathname, { replace: true, state: {} });
      return;
    }

    if (locState?.newPo) {
      const incomingPo = locState.newPo;
      setLivePurchases((prev) => {
        if (!prev.some((p) => p.id === incomingPo.id || p.purchaseNo === incomingPo.purchaseNo)) {
          return [incomingPo, ...prev];
        }
        return prev;
      });
      // Clear React Router state so refresh or re-render doesn't duplicate
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, productOptions, mergedSuppliers, navigate, location.pathname]);

  // Search & Filter State
  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pendingPurchaseStatus, setPendingPurchaseStatus] = useState('All');
  const [appliedPurchaseStatus, setAppliedPurchaseStatus] = useState('All');
  const [pendingPaymentStatus, setPendingPaymentStatus] = useState('All');
  const [appliedPaymentStatus, setAppliedPaymentStatus] = useState('All');
  const [pendingSupplier, setPendingSupplier] = useState('All');
  const [appliedSupplier, setAppliedSupplier] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [priceTaxMode, setPriceTaxMode] = useState<'Without Tax' | 'With Tax'>('Without Tax');

  // Deduplication & Sync Refs (prevents multiple redundant API calls)
  const isFetchingRef = useRef(false);
  const lastFetchKeyRef = useRef('');
  const purchasesRef = useRef(purchases);
  purchasesRef.current = purchases;
  useEffect(() => {
    purchasesRef.current = purchases;
  }, [purchases]);



  // Fetch Purchase Orders from Work API with deduplication
  const fetchPurchaseOrders = useCallback(
    async (forceRefresh = false) => {
      const fetchKey = `${currentPage}_${pageSize}_${appliedSearch.trim()}_${appliedPurchaseStatus}`;
      if (isFetchingRef.current) return;
      if (!forceRefresh && lastFetchKeyRef.current === fetchKey) return;

      isFetchingRef.current = true;
      lastFetchKeyRef.current = fetchKey;
      setIsApiLoading(true);

      try {
        const statusParam =
          appliedPurchaseStatus !== 'All' ? appliedPurchaseStatus : undefined;

        const response = await workPurchaseOrderApi.getPurchaseOrders({
          page: currentPage,
          limit: pageSize,
          search: appliedSearch.trim() || undefined,
          status: statusParam,
          pagination_required: true,
        });

        if (response && response.success && Array.isArray(response.data)) {
          const mapped = response.data.map(mapApiPurchaseOrderToUi);
          setIsApiConnected(true);
          setApiErrorMessage(null);
          setLivePurchases(mapped);

          if (response.pagination) {
            setTotalApiRecords(response.pagination.totalRecords ?? mapped.length);
            setTotalApiPages(Math.max(1, response.pagination.totalPages || 1));
          } else {
            setTotalApiRecords(mapped.length);
            setTotalApiPages(Math.ceil(mapped.length / pageSize) || 1);
          }

          if (
            currentPage === 1 &&
            !appliedSearch.trim() &&
            appliedPurchaseStatus === 'All'
          ) {
            setPurchasesList(mapped);
          }
        } else {
          setIsApiConnected(true);
          setLivePurchases([]);
          setTotalApiRecords(0);
          setTotalApiPages(1);
          if (
            currentPage === 1 &&
            !appliedSearch.trim() &&
            appliedPurchaseStatus === 'All'
          ) {
            setPurchasesList([]);
          }
        }
      } catch (err: any) {
        const errMsg =
          err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          err?.message ||
          'Work API unavailable, falling back to local store';
        console.warn('Work Purchase Orders API unavailable:', errMsg);
        setIsApiConnected(false);
        setApiErrorMessage(errMsg);
        setLivePurchases(purchasesRef.current);
        setTotalApiRecords(null);
        setTotalApiPages(null);
      } finally {
        isFetchingRef.current = false;
        setIsApiLoading(false);
      }
    },
    [currentPage, pageSize, appliedSearch, appliedPurchaseStatus, setPurchasesList]
  );

  // Initial and reactive fetch on filter change
  useEffect(() => {
    fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);


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


  // Summary Metrics
  const summary = useMemo(() => {
    const pool = isApiConnected ? livePurchases : purchases;
    const totalAmount = pool.reduce((acc, p) => acc + (p.grandTotal || 0), 0);
    const todayStr = new Date().toISOString().split('T')[0];
    const todayPurchases = pool.filter((p) => p.purchaseDate === todayStr);
    const todayAmount = todayPurchases.reduce((acc, p) => acc + (p.grandTotal || 0), 0);
    const pendingPayments = pool.reduce((acc, p) => acc + (p.balance || 0), 0);
    const paidCount = pool.filter((p) => p.paymentStatus === 'Paid').length;
    const completedCount = pool.filter(
      (p) =>
        p.purchaseStatus === 'Completed' ||
        p.purchaseStatus === 'Received' ||
        p.purchaseStatus === 'Approved'
    ).length;

    return {
      totalCount: totalApiRecords !== null ? totalApiRecords : pool.length,
      totalAmount,
      todayAmount,
      todayCount: todayPurchases.length,
      pendingPayments,
      paidCount,
      completedCount,
    };
  }, [isApiConnected, livePurchases, purchases, totalApiRecords]);

  // Open Create Modal (No mock data: uses live products/suppliers if available or clean empty inputs)
  const handleOpenCreateModal = () => {
    loadFormMasterData();
    const nextPoNo = `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const initialItem: PurchaseProductItem = {
      id: `po_it_${Date.now()}`,
      productId: '',
      productName: '',
      batch: '',
      quantity: 1,
      freeQuantity: 0,
      unit: 'NONE',
      expDate: '',
      purchasePrice: 0,
      salePrice: 0,
      discountPercent: 0,
      discountAmount: 0,
      taxPercent: 18,
      total: 0,
    };

    const validProduct = productOptions.find((p) => UUID_REGEX.test(p.value)) || productOptions[0];
    if (validProduct) {
      initialItem.productId = validProduct.value;
      initialItem.productName = validProduct.label;
      initialItem.purchasePrice = validProduct.unitCost;
      initialItem.salePrice = validProduct.salePrice || 0;
      initialItem.unit = validProduct.unit || 'NONE';
      initialItem.total = Math.round(validProduct.unitCost * 1.18 * 100) / 100;
    }

    const defaultSupplier =
      mergedSuppliers.find((s) => UUID_REGEX.test(s.id)) ||
      (mergedSuppliers.length > 0 ? mergedSuppliers[0] : null);

    setPurchaseType('without_request');
    setSelectedRequestId('');
    setOriginatingRequestId(null);

    setFormData({
      purchaseNo: nextPoNo,
      purchaseInvoiceNo: '',
      supplierId: '',
      supplierName: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      items: [],
      withGst: true,
      gstType: 'intra_state',
      shipping: 0,
      otherCharges: 0,
      paymentMethod: 'Cash',
      paymentTerms: 'Net 30 Days',
      paidAmount: 0,
      purchaseStatus: 'Pending',
      roundMode: 'none',
      notes: '',
    });
    setCustomBatchRows({});
    setEditingPurchase(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (po: PurchaseOrder) => {
    if (po.purchaseStatus === 'Received' || po.purchaseStatus === 'Cancelled') {
      toast.warning(`Purchase order ${po.purchaseNo} is ${po.purchaseStatus.toLowerCase()} and locked from modifications.`);
      setSelectedPurchase(po);
      setIsDetailModalOpen(true);
      return;
    }

    const hasLinkedPr = Boolean(
      po.purchaseInvoiceNo?.startsWith('INV-REQ-') ||
      po.notes?.includes('Converted from')
    );
    loadFormMasterData();
    setPurchaseType(hasLinkedPr ? 'with_request' : 'without_request');
    let matchedPrId = '';
    if (hasLinkedPr) {
      const allRequests = [...availableRequests, ...purchaseRequests];
      const match = po.notes?.match(/PR-\d+-\d+/i) || po.purchaseInvoiceNo?.match(/PR-\d+-\d+/i);
      if (match) {
        const found = allRequests.find((r) => r.requestNo.toLowerCase() === match[0].toLowerCase());
        if (found) matchedPrId = found.id;
      }
    }
    setSelectedRequestId(matchedPrId);
    setOriginatingRequestId(matchedPrId || null);
    setFormData({
      purchaseNo: po.purchaseNo,
      purchaseInvoiceNo: po.purchaseInvoiceNo || '',
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      purchaseDate: po.purchaseDate,
      dueDate: po.dueDate || po.expectedDeliveryDate || '',
      items: JSON.parse(JSON.stringify(po.items)),
      withGst: po.withGst !== undefined ? po.withGst : po.tax > 0,
      gstType: po.gstType || 'intra_state',
      shipping: po.shipping || 0,
      otherCharges: po.otherCharges || 0,
      paymentMethod: po.paymentMethod || 'Bank Transfer',
      paymentTerms: po.paymentTerms || '',
      paidAmount: po.paidAmount || 0,
      purchaseStatus: po.purchaseStatus,
      roundMode: (po as any).roundMode || 'none',
      notes: po.notes || '',
    });
    setCustomBatchRows({});
    setEditingPurchase(po);
    setIsFormModalOpen(true);
  };

  // Duplicate Purchase Bill: Pre-fills form fields so user can review/edit before saving
  const handleDuplicatePurchase = (po: PurchaseOrder) => {
    const nextPoNo = `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    setFormData({
      purchaseNo: nextPoNo,
      purchaseInvoiceNo: po.purchaseInvoiceNo ? `${po.purchaseInvoiceNo}-COPY` : '',
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      purchaseDate: new Date().toISOString().split('T')[0],
      dueDate: po.dueDate || po.expectedDeliveryDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      items: po.items.map((it) => ({
        ...it,
        id: `po_item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      })),
      withGst: po.withGst !== undefined ? po.withGst : po.tax > 0,
      gstType: po.gstType || 'intra_state',
      shipping: po.shipping || 0,
      otherCharges: po.otherCharges || 0,
      paymentMethod: po.paymentMethod || 'Bank Transfer',
      paymentTerms: po.paymentTerms || '',
      paidAmount: 0,
      purchaseStatus: 'Pending',
      roundMode: (po as any).roundMode || 'none',
      notes: po.notes ? `Duplicated from ${po.purchaseNo}. ${po.notes}` : `Duplicated from ${po.purchaseNo}`,
    });

    setCustomBatchRows({});
    setEditingPurchase(null);
    setIsFormModalOpen(true);
    toast.info(`Duplicated ${po.purchaseNo} into editor (${nextPoNo}). Review and save when ready.`);
  };

  // Convert Purchase to Purchase Return: opens Purchase Return creation form with fields prefilled
  const handleConvertToReturn = (po: PurchaseOrder) => {
    const returnItems: PurchaseReturnItem[] = po.items.map((it) => ({
      id: `pret_it_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      productId: it.productId,
      productName: it.productName,
      batch: it.batch,
      purchasedQuantity: it.quantity,
      returnQuantity: it.quantity,
      unitPrice: it.purchasePrice,
      returnAmount: it.total,
      reason: 'Defective',
      remarks: 'Returned from Purchase Bill ' + po.purchaseNo,
    }));

    toast.info(`Opening Purchase Return for ${po.purchaseNo}...`);

    navigate('/sale-management/purchase/return', {
      state: {
        convertFromPo: {
          purchaseId: po.id,
          purchaseNo: po.purchaseNo,
          supplierId: po.supplierId,
          supplierName: po.supplierName,
          items: returnItems,
          totalAmount: po.grandTotal,
          notes: `Return generated from Purchase Bill ${po.purchaseNo}`,
        },
      },
    });
  };

  const handleSupplierChange = (supId: string) => {
    const sup = mergedSuppliers.find((s) => s.id === supId);
    if (sup) {
      setFormData((prev) => ({
        ...prev,
        supplierId: sup.id,
        supplierName: sup.name,
        paymentTerms: sup.paymentTerms || prev.paymentTerms,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        supplierId: '',
        supplierName: '',
      }));
    }
  };

  // Handle switching Purchase Type (With Purchase Request vs Without Purchase Request)
  const handlePurchaseTypeChange = (type: 'with_request' | 'without_request') => {
    setPurchaseType(type);
    if (type === 'without_request') {
      setSelectedRequestId('');
      setOriginatingRequestId(null);
      setFormData((prev) => ({
        ...prev,
        purchaseInvoiceNo: prev.purchaseInvoiceNo.startsWith('INV-REQ-') ? '' : prev.purchaseInvoiceNo,
        notes: prev.notes.startsWith('Converted from Purchase Requisition') ? '' : prev.notes,
      }));
    }
  };

  // Handle Selecting a Purchase Request
  const handleSelectPurchaseRequest = (prId: string) => {
    if (!prId) {
      setSelectedRequestId('');
      setOriginatingRequestId(null);
      return;
    }

    const pr = eligiblePurchaseRequests.find((r) => r.id === prId);
    if (!pr) {
      setSelectedRequestId('');
      setOriginatingRequestId(null);
      return;
    }

    setSelectedRequestId(pr.id);
    setOriginatingRequestId(pr.id);

    // 1. Match supplier from request
    let matchedSupplier =
      mergedSuppliers.find((s) => s.id === pr.supplierId) ||
      mergedSuppliers.find((s) => s.name.trim().toLowerCase() === (pr.supplierName || '').trim().toLowerCase());

    if (!matchedSupplier && mergedSuppliers.length > 0) {
      matchedSupplier = mergedSuppliers[0];
    }

    // 2. Map line items from request
    const prItems: PurchaseProductItem[] = (pr.items || []).map((it, idx) => {
      const matchingProd = productOptions.find(
        (p) => p.value === it.productId || p.label.toLowerCase() === it.productName.toLowerCase()
      );
      const pPrice = Number(it.estimatedUnitPrice || matchingProd?.unitCost || 0);
      const sPrice = Number(matchingProd?.salePrice || 0);
      const u = (it as any).unit || matchingProd?.unit || 'PCS';
      const qty = Math.max(1, it.requestedQuantity || 1);
      const taxPct = 18;
      const sub = qty * pPrice;
      const tax = formData.withGst ? sub * (taxPct / 100) : 0;
      return {
        id: `po_item_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
        productId: it.productId || matchingProd?.value || '',
        productName: it.productName || matchingProd?.label || 'Product',
        batch: '',
        quantity: qty,
        freeQuantity: 0,
        unit: u,
        packingUnit: '',
        expDate: '',
        purchasePrice: pPrice,
        salePrice: sPrice,
        discountPercent: 0,
        discountAmount: 0,
        taxPercent: taxPct,
        total: Math.round((sub + tax) * 100) / 100,
      };
    });

    setFormData((prev) => ({
      ...prev,
      supplierId: matchedSupplier ? matchedSupplier.id : (pr.supplierId || prev.supplierId),
      supplierName: matchedSupplier ? matchedSupplier.name : (pr.supplierName || prev.supplierName),
      purchaseInvoiceNo: prev.purchaseInvoiceNo || `INV-REQ-${pr.requestNo}`,
      dueDate: pr.requiredDate || prev.dueDate,
      notes: pr.notes
        ? `Converted from Purchase Requisition ${pr.requestNo}. ${pr.notes}`
        : `Converted from Purchase Requisition ${pr.requestNo}`,
      items: prItems.length > 0 ? prItems : prev.items,
    }));

    toast.success(`Populated details from Purchase Request ${pr.requestNo} (${prItems.length} items).`);
  };

  const handleToggleWithGst = (enableGst: boolean) => {
    setFormData((prev) => {
      const updatedItems = prev.items.map((it) => {
        const sub = (it.quantity || 1) * (it.purchasePrice || 0);
        const disc =
          it.discountAmount !== undefined && it.discountAmount > 0
            ? it.discountAmount
            : sub * ((it.discountPercent || 0) / 100);
        const tax = enableGst ? (sub - disc) * ((it.taxPercent || 18) / 100) : 0;
        return { ...it, total: Math.round((sub - disc + tax) * 100) / 100 };
      });
      return { ...prev, withGst: enableGst, items: updatedItems };
    });
  };

  const handleSetGstType = (type: 'intra_state' | 'inter_state') => {
    setFormData((prev) => ({ ...prev, gstType: type }));
  };

  // Helper to fetch/derive batch options for a given product
  const getProductBatchOptions = useCallback(
    (productId: string, productName?: string, currentBatch?: string) => {
      if (!productId) return [];

      const batchMap = new Map<string, { batchNo: string; expDate?: string; costPrice?: number; sellingPrice?: number }>();

      // 1. Live stock batches from Commerce API
      availableBatches.forEach((b) => {
        if (
          b.batchNo &&
          (b.productId === productId ||
            (b.productName && productName && b.productName.trim().toLowerCase() === productName.trim().toLowerCase()))
        ) {
          batchMap.set(b.batchNo, {
            batchNo: b.batchNo,
            expDate: b.expDate || undefined,
            costPrice: b.costPrice,
            sellingPrice: b.sellingPrice,
          });
        }
      });

      // 2. Store inventory stocks
      const matchingStock = stocks.find((s) => s.productId === productId);
      if (matchingStock?.batches && Array.isArray(matchingStock.batches)) {
        matchingStock.batches.forEach((b) => {
          if (b.batchNo && !batchMap.has(b.batchNo)) {
            batchMap.set(b.batchNo, {
              batchNo: b.batchNo,
              expDate: b.expDate,
              costPrice: b.costPrice,
              sellingPrice: b.sellingPrice,
            });
          }
        });
      }

      // 3. Catalog products (availableProducts)
      const matchingProd = availableProducts.find((p) => p.id === productId);
      if (matchingProd) {
        const prodBatches = (matchingProd as any).batches || (matchingProd as any).stockBatches;
        if (Array.isArray(prodBatches)) {
          prodBatches.forEach((b: any) => {
            const bNo = b.batchNo || b.batch;
            if (bNo && !batchMap.has(bNo)) {
              batchMap.set(bNo, {
                batchNo: bNo,
                expDate: b.expDate,
                costPrice: b.costPrice ?? b.purchasePrice,
                sellingPrice: b.sellingPrice ?? b.salePrice,
              });
            }
          });
        }
        if ((matchingProd as any).batchNo && !batchMap.has((matchingProd as any).batchNo)) {
          batchMap.set((matchingProd as any).batchNo, {
            batchNo: (matchingProd as any).batchNo,
            expDate: (matchingProd as any).expDate,
            costPrice: matchingProd.purchasePrice,
            sellingPrice: matchingProd.salePrice,
          });
        }
      }

      // 4. Historical batches from purchase bills
      const allPurchases = [...livePurchases, ...purchases];
      allPurchases.forEach((po) => {
        po.items?.forEach((it) => {
          if (
            it.batch &&
            (it.productId === productId ||
              (it.productName && productName && it.productName.trim().toLowerCase() === productName.trim().toLowerCase()))
          ) {
            if (!batchMap.has(it.batch)) {
              batchMap.set(it.batch, {
                batchNo: it.batch,
                expDate: it.expDate,
                costPrice: it.purchasePrice,
                sellingPrice: it.salePrice,
              });
            }
          }
        });
      });

      // 5. If no batches exist for this product, generate fallback lots
      if (batchMap.size === 0) {
        const currentYear = new Date().getFullYear();
        const fallback1 = `BAT-${currentYear}-001`;
        const fallback2 = `BAT-${currentYear}-002`;
        batchMap.set(fallback1, { batchNo: fallback1 });
        batchMap.set(fallback2, { batchNo: fallback2 });
      }

      // 6. Ensure currentBatch is present if non-empty
      if (currentBatch && currentBatch.trim() && !batchMap.has(currentBatch.trim())) {
        batchMap.set(currentBatch.trim(), { batchNo: currentBatch.trim() });
      }

      const options = Array.from(batchMap.values()).map((b) => ({
        value: b.batchNo,
        label: b.batchNo + (b.expDate ? ` (Exp: ${b.expDate})` : ''),
      }));

      // Option to type custom batch
      options.push({
        value: '__enter_custom_batch__',
        label: '+ Enter Custom Batch...',
      });

      return options;
    },
    [availableBatches, stocks, availableProducts, livePurchases, purchases]
  );

  const findBatchDetails = useCallback(
    (productId: string, batchNo: string) => {
      if (!productId || !batchNo) return null;
      const fromApi = availableBatches.find(
        (b) => b.productId === productId && b.batchNo.toLowerCase() === batchNo.toLowerCase()
      );
      if (fromApi) return fromApi;

      const matchingStock = stocks.find((s) => s.productId === productId);
      const fromStock = matchingStock?.batches?.find(
        (b) => b.batchNo.toLowerCase() === batchNo.toLowerCase()
      );
      if (fromStock) return fromStock;

      const matchingProd = availableProducts.find((p) => p.id === productId);
      const prodBatches = (matchingProd as any)?.batches || (matchingProd as any)?.stockBatches;
      if (Array.isArray(prodBatches)) {
        const fromProd = prodBatches.find(
          (b: any) => (b.batchNo || b.batch || '').toLowerCase() === batchNo.toLowerCase()
        );
        if (fromProd) return fromProd;
      }

      return null;
    },
    [availableBatches, stocks, availableProducts]
  );

  const handleItemBatchChange = (index: number, batchVal: string) => {
    if (batchVal === '__enter_custom_batch__') {
      setCustomBatchRows((prev) => ({ ...prev, [index]: true }));
      return;
    }
    setFormData((prev) => {
      const copy = [...prev.items];
      const item = { ...copy[index] };
      item.batch = batchVal;
      const batchDetails = findBatchDetails(item.productId, batchVal);
      if (batchDetails?.expDate) {
        item.expDate = batchDetails.expDate;
      }
      if (batchDetails?.costPrice && (!item.purchasePrice || item.purchasePrice === 0)) {
        item.purchasePrice = batchDetails.costPrice;
        const sub = (item.quantity || 1) * item.purchasePrice;
        const disc =
          item.discountAmount !== undefined && item.discountAmount > 0
            ? item.discountAmount
            : sub * ((item.discountPercent || 0) / 100);
        const tax = prev.withGst ? (sub - disc) * ((item.taxPercent || 18) / 100) : 0;
        item.total = Math.round((sub - disc + tax) * 100) / 100;
      }
      copy[index] = item;
      return { ...prev, items: copy };
    });
  };

  const handleItemProductChange = (index: number, prodId: string) => {
    const option = productOptions.find((p) => p.value === prodId);
    if (!option) return;

    // Reset custom batch toggle for this row when switching product
    setCustomBatchRows((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });

    const batchOpts = getProductBatchOptions(option.value, option.label);
    const firstRealBatch = batchOpts.find((b) => b.value !== '__enter_custom_batch__');
    const autoBatch = firstRealBatch ? firstRealBatch.value : '';

    setFormData((prev) => {
      const copy = [...prev.items];
      const item = { ...copy[index] };
      item.productId = option.value;
      item.productName = option.label;
      item.batch = autoBatch;
      item.purchasePrice = option.unitCost;
      item.salePrice = option.salePrice !== undefined ? option.salePrice : item.salePrice;
      item.unit = option.unit || item.unit || 'NONE';

      // Auto-populate expiry date if found on the selected batch
      const batchDetails = findBatchDetails(option.value, autoBatch);
      if (batchDetails?.expDate) {
        item.expDate = batchDetails.expDate;
      }

      const sub = (item.quantity || 1) * option.unitCost;
      const disc =
        item.discountAmount !== undefined && item.discountAmount > 0
          ? item.discountAmount
          : sub * ((item.discountPercent || 0) / 100);
      const tax = prev.withGst ? (sub - disc) * ((item.taxPercent || 18) / 100) : 0;
      item.total = Math.round((sub - disc + tax) * 100) / 100;
      copy[index] = item;
      return { ...prev, items: copy };
    });
  };

  const handleItemFieldChange = (index: number, field: keyof PurchaseProductItem, val: any) => {
    setFormData((prev) => {
      const copy = [...prev.items];
      const current = { ...copy[index] };

      if (field === 'discountPercent') {
        const pct = Math.max(0, Math.min(100, Number(val) || 0));
        current.discountPercent = pct;
        const sub = (current.quantity || 1) * (current.purchasePrice || 0);
        current.discountAmount = Math.round(sub * (pct / 100) * 100) / 100;
      } else if (field === 'discountAmount') {
        const amt = Math.max(0, Number(val) || 0);
        current.discountAmount = amt;
        const sub = (current.quantity || 1) * (current.purchasePrice || 0);
        current.discountPercent = sub > 0 ? Math.round((amt / sub) * 100 * 100) / 100 : 0;
      } else {
        (current as any)[field] = val;
      }

      const qty = typeof current.quantity === 'number' ? current.quantity : 1;
      const price = typeof current.purchasePrice === 'number' ? current.purchasePrice : 0;
      const sub = qty * price;
      const disc =
        current.discountAmount !== undefined && current.discountAmount > 0
          ? current.discountAmount
          : sub * ((current.discountPercent || 0) / 100);
      const taxPercent = typeof current.taxPercent === 'number' ? current.taxPercent : 18;
      const tax = prev.withGst ? (sub - disc) * (taxPercent / 100) : 0;
      current.total = Math.round((sub - disc + tax) * 100) / 100;

      copy[index] = current;
      return { ...prev, items: copy };
    });
  };

  const handleAddItemRow = () => {
    const newItem: PurchaseProductItem = {
      id: `po_it_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      productId: '',
      productName: '',
      batch: '',
      quantity: 1,
      freeQuantity: 0,
      unit: 'NONE',
      packingUnit: '',
      expDate: '',
      purchasePrice: 0,
      salePrice: 0,
      discountPercent: 0,
      discountAmount: 0,
      taxPercent: 18,
      total: 0,
    };

    setFormData((prev) => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const handleRemoveItemRow = (index: number) => {
    setFormData((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  // Calculations
  const calculatedTotals = useMemo(() => {
    const subtotal = formData.items.reduce((acc, it) => acc + (it.quantity || 0) * (it.purchasePrice || 0), 0);
    const discount = formData.items.reduce((acc, it) => {
      const sub = (it.quantity || 0) * (it.purchasePrice || 0);
      return acc + (it.discountAmount !== undefined && it.discountAmount > 0 ? it.discountAmount : sub * ((it.discountPercent || 0) / 100));
    }, 0);
    const taxableAmount = Math.max(0, subtotal - discount);
    const rawTax = formData.items.reduce((acc, it) => {
      const sub = (it.quantity || 0) * (it.purchasePrice || 0);
      const disc = it.discountAmount !== undefined && it.discountAmount > 0 ? it.discountAmount : sub * ((it.discountPercent || 0) / 100);
      const taxable = Math.max(0, sub - disc);
      return acc + taxable * ((it.taxPercent || 0) / 100);
    }, 0);
    const tax = formData.withGst ? rawTax : 0;
    const cgst = formData.withGst && formData.gstType === 'intra_state' ? tax / 2 : 0;
    const sgst = formData.withGst && formData.gstType === 'intra_state' ? tax / 2 : 0;
    const igst = formData.withGst && formData.gstType === 'inter_state' ? tax : 0;
    const shipping = Number(formData.shipping) || 0;
    const other = Number(formData.otherCharges) || 0;

    const rawGrandTotal = taxableAmount + tax + shipping + other;
    const roundUpDiff = rawGrandTotal % 1 === 0 ? 0 : Math.ceil(rawGrandTotal) - rawGrandTotal;
    const roundDownDiff = rawGrandTotal % 1 === 0 ? 0 : Math.floor(rawGrandTotal) - rawGrandTotal;
    const roundOffAmount =
      formData.roundMode === 'up' ? roundUpDiff : formData.roundMode === 'down' ? roundDownDiff : 0;
    const grandTotal = Math.max(0, Math.round((rawGrandTotal + roundOffAmount) * 100) / 100);

    const paid = Math.min(grandTotal, Number(formData.paidAmount) || 0);
    const balance = Math.max(0, grandTotal - paid);

    return {
      subtotal,
      discount,
      taxableAmount,
      tax,
      cgst,
      sgst,
      igst,
      rawGrandTotal,
      roundUpDiff,
      roundDownDiff,
      roundOffAmount,
      grandTotal,
      paid,
      balance,
    };
  }, [formData]);

  // Save Purchase Order (Create or Update with Work API)
  const handleSavePurchase = async (status: PurchaseStatus = 'Ordered') => {
    let targetSupplierId = formData.supplierId;
    if (!targetSupplierId) {
      // If no supplier selected yet, pick the first available supplier
      if (mergedSuppliers.length > 0) {
        targetSupplierId = mergedSuppliers[0].id;
        setFormData((prev) => ({
          ...prev,
          supplierId: mergedSuppliers[0].id,
          supplierName: mergedSuppliers[0].name,
        }));
      } else {
        targetSupplierId = ensureValidUuid();
      }
    }

    // Check if the selected supplierId exists among actual database suppliers fetched from GET /work/suppliers
    if (availableSuppliers.length > 0) {
      const isKnownApiSupplier = availableSuppliers.some((s) => s.id === targetSupplierId);
      if (!isKnownApiSupplier) {
        // Match by name or fallback to first valid API supplier
        const matchedByName = availableSuppliers.find(
          (s) => s.name.trim().toLowerCase() === formData.supplierName.trim().toLowerCase()
        );
        if (matchedByName) {
          targetSupplierId = matchedByName.id;
        } else {
          targetSupplierId = availableSuppliers[0].id;
        }
      }
    } else if (!targetSupplierId) {
      targetSupplierId = ensureValidUuid();
    }

    if (purchaseType === 'with_request' && !selectedRequestId && eligiblePurchaseRequests.length > 0) {
      toast.warning('Please select a Purchase Request or switch to "Without Purchase Request".');
      return;
    }

    if (formData.items.length === 0 || !formData.items.some((it) => it.productId)) {
      toast.error('Please select at least one valid product.');
      return;
    }
    const hasInvalidQty = formData.items.some((it) => !it.quantity || it.quantity <= 0);
    if (hasInvalidQty) {
      toast.error('Product quantities must be greater than zero.');
      return;
    }

    const finalPaid = Math.min(calculatedTotals.grandTotal, Number(formData.paidAmount) || 0);
    const finalBalance = Math.max(0, calculatedTotals.grandTotal - finalPaid);
    const finalPaymentStatus: PurchasePaymentStatus =
      finalBalance <= 0 ? 'Paid' : finalPaid > 0 ? 'Partial' : 'Unpaid';

    setIsSubmitting(true);

    try {
      if (editingPurchase) {
        // UPDATE existing purchase order via Work API
        const payload = mapUiToUpdatePurchaseOrderPayload(
          {
            dueDate: formData.dueDate,
            expectedDeliveryDate: formData.dueDate,
            discount: calculatedTotals.discount,
            notes: formData.notes,
          },
          formData.items
        );

        let updatedPo: PurchaseOrder;
        const apiRes = await workPurchaseOrderApi.updatePurchaseOrder(editingPurchase.id, payload);
        if (apiRes && apiRes.data) {
          const mapped = mapApiPurchaseOrderToUi(apiRes.data);
          // Work API PUT /work/purchase-orders/{id} only stores line items/due date/notes.
          // Retain the payment disbursement recorded by the user in this edit session:
          updatedPo = {
            ...mapped,
            purchaseInvoiceNo: formData.purchaseInvoiceNo || mapped.purchaseInvoiceNo,
            paidAmount: finalPaid,
            balance: finalBalance,
            paymentStatus: finalPaymentStatus,
            paymentMethod: (formData.paymentMethod as any) || (finalPaid > 0 ? 'Cash' : 'Bank Transfer'),
            paymentTerms: formData.paymentTerms || mapped.paymentTerms,
            withGst: formData.withGst,
            gstType: formData.gstType,
            shipping: formData.shipping,
            otherCharges: formData.otherCharges,
          };
        } else {
          throw new Error('No data returned from Work API');
        }

        savePurchase(updatedPo);
        setLivePurchases((prev) => prev.map((p) => (p.id === updatedPo.id ? updatedPo : p)));
        toast.success(`Purchase order ${updatedPo.purchaseNo} updated successfully!`);
        setIsFormModalOpen(false);
        fetchPurchaseOrders(true);
      } else {
        // CREATE new purchase order via Work API
        const payload = mapUiToCreatePurchaseOrderPayload(
          {
            supplierId: targetSupplierId,
            dueDate: formData.dueDate,
            expectedDeliveryDate: formData.dueDate,
            discount: calculatedTotals.discount,
            notes: formData.notes,
          },
          formData.items
        );

        let createdPo: PurchaseOrder;
        const apiRes = await workPurchaseOrderApi.createPurchaseOrder(payload);
        if (apiRes && apiRes.data) {
          createdPo = mapApiPurchaseOrderToUi(apiRes.data);
          if (status && status !== 'Pending' && UUID_REGEX.test(createdPo.id)) {
            try {
              const statusRes = await workPurchaseOrderApi.patchPurchaseOrderStatus(createdPo.id, status as any);
              if (statusRes && statusRes.data) {
                createdPo = mapApiPurchaseOrderToUi(statusRes.data);
              }
            } catch (stErr) {
              console.warn('Status patch after create skipped:', stErr);
            }
          }
        } else {
          throw new Error('No data returned from Work API');
        }

        createdPo = {
          ...createdPo,
          purchaseInvoiceNo: formData.purchaseInvoiceNo || createdPo.purchaseInvoiceNo,
          paidAmount: finalPaid,
          balance: finalBalance,
          paymentStatus: finalPaymentStatus,
          paymentMethod: (formData.paymentMethod as any) || (finalPaid > 0 ? 'Cash' : 'Bank Transfer'),
          paymentTerms: formData.paymentTerms || createdPo.paymentTerms,
          withGst: formData.withGst,
          gstType: formData.gstType,
          shipping: formData.shipping,
          otherCharges: formData.otherCharges,
        };

        savePurchase(createdPo);
        setLivePurchases((prev) => [createdPo, ...prev]);

        // If this purchase was converted from a Purchase Request, update its status to "Purchase Created" NOW
        if (originatingRequestId) {
          try {
            await commercePurchaseRequestApi.patchPurchaseRequestStatus(originatingRequestId, {
              status: 'Purchase Created',
            });
          } catch (statusErr) {
            console.warn('API purchase request status update (Purchase Created) warning:', statusErr);
          }
          updatePurchaseRequestStatus(originatingRequestId, 'Purchase Created');
          setOriginatingRequestId(null);
        }

        toast.success(`Purchase order ${createdPo.purchaseNo} created successfully!`);
        setIsFormModalOpen(false);
        fetchPurchaseOrders(true);
      }
    } catch (err: any) {
      console.error('Error saving purchase order:', err);
      toast.error(
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Error saving purchase order'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Change Purchase Order Status via Work API
  const handleUpdateStatus = async (
    po: PurchaseOrder,
    newStatus: 'Pending' | 'Approved' | 'Ordered' | 'Received' | 'Cancelled'
  ) => {
    // If it's a local draft / offline record (e.g. "po_1792142284518"), update locally without 404ing the API
    if (!UUID_REGEX.test(po.id)) {
      const updated: PurchaseOrder = { ...po, purchaseStatus: newStatus as any };
      savePurchase(updated);
      setLivePurchases((prev) => prev.map((p) => (p.id === po.id ? updated : p)));
      toast.success(`Purchase order ${po.purchaseNo} status changed to ${newStatus}`);
      return;
    }

    try {
      const res = await workPurchaseOrderApi.patchPurchaseOrderStatus(po.id, newStatus);
      if (res && res.data) {
        const mapped = mapApiPurchaseOrderToUi(res.data);
        savePurchase(mapped);
        setLivePurchases((prev) => prev.map((p) => (p.id === po.id ? mapped : p)));
        toast.success(`Purchase order ${po.purchaseNo} status changed to ${newStatus}`);
      } else {
        const updated: PurchaseOrder = { ...po, purchaseStatus: newStatus as any };
        savePurchase(updated);
        setLivePurchases((prev) => prev.map((p) => (p.id === po.id ? updated : p)));
        toast.success(`Purchase order ${po.purchaseNo} status changed to ${newStatus}`);
      }
      fetchPurchaseOrders(true);
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        `Failed to update status to ${newStatus}`;
      toast.error(errMsg);
    }
  };

  // Delete Purchase Order via Work API
  const handleDeletePurchase = async (po: PurchaseOrder) => {
    if (po.purchaseStatus === 'Received') {
      toast.error('Received purchase orders are final and cannot be deleted.');
      return;
    }

    if (!UUID_REGEX.test(po.id)) {
      deletePurchase(po.id);
      setLivePurchases((prev) => prev.filter((p) => p.id !== po.id));
      toast.success(`Purchase order ${po.purchaseNo} deleted.`);
      return;
    }

    try {
      await workPurchaseOrderApi.deletePurchaseOrder(po.id);
      deletePurchase(po.id);
      setLivePurchases((prev) => prev.filter((p) => p.id !== po.id));
      toast.success(`Purchase order ${po.purchaseNo} deleted.`);
      fetchPurchaseOrders(true);
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to delete purchase order';
      toast.error(errMsg);
      deletePurchase(po.id);
      setLivePurchases((prev) => prev.filter((p) => p.id !== po.id));
    }
  };

  // Payment Recording
  const handleOpenPaymentModal = (po: PurchaseOrder) => {
    setSelectedPurchase(po);
    setRecordAmount(po.balance);
    setRecordMethod('Bank Transfer');
    setRecordNotes('');
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = () => {
    if (!selectedPurchase) return;
    if (recordAmount <= 0) {
      toast.error('Payment amount must be greater than zero.');
      return;
    }
    updatePurchasePayment(selectedPurchase.id, recordAmount, recordMethod, recordNotes);
    toast.success(`Payment of ₹${recordAmount.toLocaleString('en-IN')} recorded for ${selectedPurchase.purchaseNo}`);
    setIsPaymentModalOpen(false);
  };

  // Filtered Purchases (Reflects API data)
  const displayedPurchases = useMemo(() => {
    let base: PurchaseOrder[];
    if (isApiConnected) {
      base = livePurchases;
    } else {
      base = purchases;
    }

    return base.filter((p) => {
      const q = appliedSearch.toLowerCase().trim();
      if (q) {
        const matchesSearch =
          p.purchaseNo.toLowerCase().includes(q) ||
          (p.purchaseInvoiceNo || '').toLowerCase().includes(q) ||
          p.supplierName.toLowerCase().includes(q) ||
          p.items.some((it) => it.productName.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      if (appliedPurchaseStatus !== 'All') {
        const matchesPurchaseStatus =
          p.purchaseStatus.toLowerCase() === appliedPurchaseStatus.toLowerCase();
        if (!matchesPurchaseStatus) return false;
      }

      const matchesPaymentStatus =
        appliedPaymentStatus === 'All' ||
        p.paymentStatus.toLowerCase() === appliedPaymentStatus.toLowerCase();

      const matchesSupplier =
        appliedSupplier === 'All' || p.supplierId === appliedSupplier;

      return matchesPaymentStatus && matchesSupplier;
    });
  }, [
    isApiConnected,
    livePurchases,
    purchases,
    appliedSearch,
    appliedPurchaseStatus,
    appliedPaymentStatus,
    appliedSupplier,
  ]);

  const totalPages =
    isApiConnected && totalApiPages !== null && appliedPaymentStatus === 'All' && appliedSupplier === 'All' && displayedPurchases.length <= (totalApiRecords || 0)
      ? Math.max(1, totalApiPages)
      : Math.ceil(displayedPurchases.length / pageSize) || 1;

  const totalRecordsCount =
    isApiConnected && totalApiRecords !== null && appliedPaymentStatus === 'All' && appliedSupplier === 'All' && displayedPurchases.length <= (totalApiRecords || 0)
      ? totalApiRecords
      : displayedPurchases.length;

  const paginatedPurchases = useMemo(() => {
    // If backend pagination is in place and displayedPurchases exactly equals livePurchases without client filters:
    if (
      isApiConnected &&
      appliedPaymentStatus === 'All' &&
      appliedSupplier === 'All' &&
      displayedPurchases.length === livePurchases.length
    ) {
      return displayedPurchases;
    }
    const start = (currentPage - 1) * pageSize;
    return displayedPurchases.slice(start, start + pageSize);
  }, [
    isApiConnected,
    displayedPurchases,
    livePurchases.length,
    currentPage,
    pageSize,
    appliedPaymentStatus,
    appliedSupplier,
  ]);

  // Export Purchases to Excel
  const handleExportExcel = () => {
    if (displayedPurchases.length === 0) {
      toast.error('No purchase records available to export.');
      return;
    }

    const excelRows = displayedPurchases.map((p, idx) => ({
      sNo: idx + 1,
      purchaseNo: p.purchaseNo,
      purchaseInvoiceNo: p.purchaseInvoiceNo || '-',
      purchaseDate: p.purchaseDate,
      supplierName: p.supplierName,
      supplierCode: p.supplierCode || '-',
      subtotal: Number(p.subtotal || 0),
      tax: Number(p.tax || 0),
      grandTotal: Number(p.grandTotal || 0),
      paidAmount: Number(p.paidAmount || 0),
      balance: Number(p.balance || 0),
      paymentStatus: p.paymentStatus,
      purchaseStatus: p.purchaseStatus,
    }));

    const totalGrand = excelRows.reduce((acc, row) => acc + row.grandTotal, 0);
    const totalPaid = excelRows.reduce((acc, row) => acc + row.paidAmount, 0);
    const totalBal = excelRows.reduce((acc, row) => acc + row.balance, 0);

    exportTableToExcel({
      filename: `Purchase_Bills_Report_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Purchase Bills',
      title: 'YAA CREATIONS CRM - PURCHASE ORDERS & BILLS DIRECTORY',
      subtitle: `Total Purchase Orders: ${displayedPurchases.length} | Generated: ${new Date().toLocaleDateString('en-IN')}`,
      columns: [
        { header: '#', key: 'sNo', align: 'center', width: 8 },
        { header: 'PO #', key: 'purchaseNo', align: 'center', width: 16 },
        { header: 'Supplier Bill #', key: 'purchaseInvoiceNo', align: 'center', width: 16 },
        { header: 'Date', key: 'purchaseDate', align: 'center', width: 14 },
        { header: 'Supplier Name', key: 'supplierName', align: 'left', width: 24 },
        { header: 'Subtotal (₹)', key: 'subtotal', align: 'right', type: 'currency', width: 16 },
        { header: 'Tax (₹)', key: 'tax', align: 'right', type: 'currency', width: 14 },
        { header: 'Grand Total (₹)', key: 'grandTotal', align: 'right', type: 'currency', width: 18 },
        { header: 'Paid (₹)', key: 'paidAmount', align: 'right', type: 'currency', width: 16 },
        { header: 'Balance (₹)', key: 'balance', align: 'right', type: 'currency', width: 16 },
        { header: 'Payment Status', key: 'paymentStatus', align: 'center', width: 16 },
        { header: 'Status', key: 'purchaseStatus', align: 'center', width: 14 },
      ],
      data: excelRows,
      summaryRow: {
        sNo: 'TOTAL',
        purchaseNo: `${displayedPurchases.length} Bills`,
        grandTotal: totalGrand,
        paidAmount: totalPaid,
        balance: totalBal,
      },
    });

    toast.success(`Purchase Bills Excel report downloaded (${displayedPurchases.length} records)!`);
  };

  return (
    <>
      {isFormModalOpen ? (
        <div className="space-y-6 animate-in fade-in duration-150 font-sans pb-12">
          {/* Top Full-Page Navigation Header with Back button on the RIGHT */}
          <div className="bg-[#33077C] rounded-2xl shadow-md p-5 sm:p-6 flex items-center justify-between gap-4 text-white">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {editingPurchase ? `Edit Purchase Order: ${editingPurchase.purchaseNo}` : 'New Purchase Bill'}
              </h1>
              <p className="text-xs sm:text-sm text-white/80 font-medium mt-0.5">
                {editingPurchase
                  ? `Update purchase order ${editingPurchase.purchaseNo} details and line items`
                  : 'Configure supplier procurement, product items, and payment breakdown'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
              className="inline-flex items-center justify-center gap-2 h-10 px-4.5 bg-white text-[#33077C] hover:bg-slate-100 rounded-xl text-sm font-bold transition-all cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-[#33077C] stroke-[2.5]" />
              <span>Back</span>
            </button>
          </div>

          {/* Full-Page Form Canvas */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden p-6 sm:p-8">
            <form id="purchase-order-form" noValidate onSubmit={(e) => {
              e.preventDefault();
              if (!isSubmitting) {
                handleSavePurchase(editingPurchase ? editingPurchase.purchaseStatus : 'Pending');
              }
            }}
              className="space-y-6 text-xs sm:text-sm"
            >
              {/* Purchase Type Configuration Bar */}
              <div className="bg-gradient-to-r from-purple-50/70 via-indigo-50/30 to-slate-50 border border-purple-100/90 rounded-xl p-4.5 space-y-3.5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                  <div>
                    <FormLabel required>Purchase Type</FormLabel>
                    <CustomSelect
                      value={purchaseType}
                      onChange={(val) => handlePurchaseTypeChange(val as 'with_request' | 'without_request')}
                      options={[
                        { value: 'without_request', label: 'Without Purchase Request (Direct Bill)' },
                        { value: 'with_request', label: 'With Purchase Request' },
                      ]}
                      placeholder="Select Purchase Type"
                    />
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">
                      {purchaseType === 'with_request'
                        ? 'Select an approved requisition to load vendor and items'
                        : 'Create direct supplier purchase bill without a request'}
                    </p>
                  </div>

                  {purchaseType === 'with_request' && (
                    <div className="md:col-span-1 lg:col-span-2 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between mb-1">
                        <FormLabel required>Select Purchase Request</FormLabel>
                        {selectedRequestId && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRequestId('');
                              setOriginatingRequestId(null);
                            }}
                            className="text-[11px] text-rose-600 hover:underline font-semibold cursor-pointer"
                          >
                            Clear Selection
                          </button>
                        )}
                      </div>
                      <CustomSelect
                        value={selectedRequestId}
                        onChange={(val) => handleSelectPurchaseRequest(val)}
                        options={eligiblePurchaseRequests.map((r) => ({
                          value: r.id,
                          label: `${r.requestNo} — ${r.supplierName || r.requestedBy || 'Requisition'} (${r.items?.length || 0} items) • [${r.status}]`,
                        }))}
                        placeholder={isLoadingRequests ? 'Loading requests...' : 'Select Approved Purchase Request...'}
                      />
                      <p className="text-[11px] text-slate-500 mt-1 font-medium">
                        {eligiblePurchaseRequests.length === 0
                          ? 'No pending purchase requests found. You can switch to "Without Purchase Request".'
                          : `${eligiblePurchaseRequests.length} pending request(s) found in system`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Linked Request Summary Banner */}
                {purchaseType === 'with_request' && selectedPurchaseRequest && (
                  <div className="p-3.5 bg-white border border-purple-200 rounded-lg shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#33077C] text-white flex items-center justify-center font-bold text-xs shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-[#33077C] flex items-center gap-2">
                          <span>Requisition: {selectedPurchaseRequest.requestNo}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-100 text-[#33077C] border border-purple-200 font-bold">
                            {selectedPurchaseRequest.status}
                          </span>
                        </div>
                        <div className="text-slate-600 mt-0.5 flex flex-wrap items-center gap-2 font-medium text-[11px]">
                          <span>Requested by: <strong>{selectedPurchaseRequest.requestedBy}</strong></span>
                          <span>&bull;</span>
                          <span>Dept: {selectedPurchaseRequest.department}</span>
                          {selectedPurchaseRequest.requiredDate && (
                            <>
                              <span>&bull;</span>
                              <span>Required by: {selectedPurchaseRequest.requiredDate}</span>
                            </>
                          )}
                          <span>&bull;</span>
                          <span>Items: {selectedPurchaseRequest.items?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Estimated Requisition Total
                      </span>
                      <span className="font-bold text-[#33077C] text-sm">
                        ₹{(selectedPurchaseRequest.totalEstimatedAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Supplier & Header Config in 3-column rows */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <FormLabel required>Select Supplier</FormLabel>
                  <CustomSelect
                    value={formData.supplierId}
                    onChange={(val) => handleSupplierChange(val)}
                    options={mergedSuppliers.map((s) => ({
                      value: s.id,
                      label: `${s.name}${s.supplierCode ? ` (${s.supplierCode})` : ''}`,
                    }))}
                    placeholder="Select Supplier"
                  />
                </div>

                <div>
                  <FormLabel>Purchase Order No</FormLabel>
                  <input
                    type="text"
                    value={formData.purchaseNo}
                    onChange={(e) => setFormData((prev) => ({ ...prev, purchaseNo: e.target.value }))}
                    className={`${FORM_INPUT_CLS} font-bold text-[#33077C]`}
                  />
                </div>

                <div>
                  <FormLabel>Supplier Bill / Invoice #</FormLabel>
                  <input
                    type="text"
                    value={formData.purchaseInvoiceNo}
                    onChange={(e) => setFormData((prev) => ({ ...prev, purchaseInvoiceNo: e.target.value }))}
                    className={FORM_INPUT_CLS}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <FormLabel required>Purchase Date</FormLabel>
                  <input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, purchaseDate: e.target.value }))}
                    className={FORM_INPUT_CLS}
                  />
                </div>

                <div>
                  <FormLabel>Due Date</FormLabel>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                    className={FORM_INPUT_CLS}
                  />
                </div>

                <div>
                  <FormLabel>Payment Terms</FormLabel>
                  <input
                    type="text"
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData((prev) => ({ ...prev, paymentTerms: e.target.value }))}
                    placeholder="Net 30 Days"
                    className={FORM_INPUT_CLS}
                  />
                </div>
              </div>

              {/* GST & Tax Configuration Bar */}
              <div className="bg-gradient-to-r from-purple-50/70 via-indigo-50/40 to-slate-50 border border-purple-100/80 rounded-xl p-4 space-y-3 font-sans">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#33077C] flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-[#4309A2] stroke-[2.5]" />
                      Tax &amp; GST Settings
                    </span>
                    <p className="text-xs text-slate-500 font-normal leading-relaxed mt-1 max-w-3xl">
                      Choose whether GST applies to the invoice. If the supplier is in the same state, GST is split equally between CGST and SGST. If the supplier is in another state, the full GST is applied as IGST.
                    </p>
                  </div>

                  {/* With GST vs Without GST Toggle (Styled as independent buttons per 2nd reference image) */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleToggleWithGst(true)}
                      className={`h-9 px-4 rounded-[4px] text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs ${formData.withGst
                          ? 'bg-[#33077C] text-white shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                    >
                      {formData.withGst && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                      <span>With GST</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleWithGst(false)}
                      className={`h-9 px-4 rounded-[4px] text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs ${!formData.withGst
                          ? 'bg-[#33077C] text-white shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                    >
                      {!formData.withGst && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                      <span>Without GST</span>
                    </button>
                  </div>
                </div>

                {/* GST Type Selection (Same State vs Other State) */}
                {formData.withGst ? (
                  <div className="pt-3 border-t border-purple-100/70 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-[13px] font-bold text-slate-800 tracking-tight">GST Type:</span>
                      <span className="text-xs text-slate-500 font-medium">
                        {formData.gstType === 'intra_state'
                          ? '(Same State: CGST + SGST applied equally)'
                          : '(Other State: Full IGST applied)'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSetGstType('intra_state')}
                        className={`h-9 px-4 rounded-[4px] text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs ${formData.gstType === 'intra_state'
                            ? 'bg-[#33077C] text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                      >
                        {formData.gstType === 'intra_state' && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                        <span>Same State: CGST + SGST</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetGstType('inter_state')}
                        className={`h-9 px-4 rounded-[4px] text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs ${formData.gstType === 'inter_state'
                            ? 'bg-[#33077C] text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                      >
                        {formData.gstType === 'inter_state' && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                        <span>Other State: IGST</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2.5 border-t border-amber-100/60 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-700 text-xs">
                      <Tag className="w-3.5 h-3.5" />
                      <span>Invoice is marked <strong>Tax Exempt / Non-GST</strong>. All product tax amounts are set to ₹0.00.</span>
                    </div>
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg font-semibold text-xs">
                      0% GST Rate
                    </span>
                  </div>
                )}
              </div>

              {/* Product Items Table Matching Requested Column Spec */}
              <div className="border border-slate-200 rounded-[4px] overflow-hidden bg-white shadow-2xs">
                <div className="overflow-x-auto max-w-full">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#33077C] text-white font-bold uppercase text-[11px] border-b border-[#33077C] tracking-wider select-none">
                        <th className="py-2.5 px-2.5 text-center border-r border-white/20 w-10 text-white/80 font-extrabold">#</th>
                        <th className="py-2.5 px-3 text-left border-r border-white/20 min-w-[210px] text-white">
                          <div className="flex items-center justify-between">
                            <span>Product Name</span>
                            <button
                              type="button"
                              onClick={() => handleOpenAddProductModal()}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/20 hover:bg-white/30 text-[10px] font-semibold tracking-normal normal-case text-white cursor-pointer transition-colors"
                              title="Create new product master record"
                            >
                              <Plus className="w-3 h-3 stroke-[2.5]" />
                              <span>+ Add Product</span>
                            </button>
                          </div>
                        </th>
                        <th className="py-2.5 px-2 text-center border-r border-white/20 min-w-[150px] text-[11px] text-white">Batch No</th>
                        <th className="py-2.5 px-2 text-center border-r border-white/20 w-20 text-white">Quantity</th>
                        <th className="py-2.5 px-2 text-center border-r border-white/20 w-20 text-white">Free Quantity</th>
                        <th className="py-2.5 px-2 text-center border-r border-white/20 w-24 text-white">Unit</th>
                        <th className="py-2.5 px-2 text-center border-r border-white/20 w-24 text-white">Packing Unit</th>
                        <th className="py-2.5 px-2 text-center border-r border-white/20 min-w-[110px] text-white">Expiry Date</th>
                        <th className="py-2.5 px-3 text-right border-r border-white/20 min-w-[130px] text-white">
                          <div>Purchase Price</div>
                          <div className="mt-0.5">
                            <button
                              type="button"
                              onClick={() => setPriceTaxMode(priceTaxMode === 'Without Tax' ? 'With Tax' : 'Without Tax')}
                              title="Click to toggle With/Without Tax"
                              className="inline-flex items-center gap-1 text-[10px] text-white font-medium bg-transparent border-0 p-0 cursor-pointer opacity-90 hover:opacity-100 transition-opacity"
                            >
                              <span>({priceTaxMode.toLowerCase()})</span>
                              <ChevronDown className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        </th>
                        <th className="py-2.5 px-3 text-right border-r border-white/20 min-w-[105px] text-white">Sale Price</th>
                        <th colSpan={2} className="py-2 px-2 text-center border-r border-white/20 w-40 text-white">
                          <div className="text-[10.5px]">Discount (%)</div>
                          <div className="grid grid-cols-[1.1fr_1fr] text-[9.5px] text-white/80 font-semibold mt-0.5 border-t border-white/20 pt-1">
                            <span>%</span>
                            <span className="text-right pr-1">Amount</span>
                          </div>
                        </th>
                        {formData.withGst && (
                          <th colSpan={2} className="py-2 px-2 text-center border-r border-white/20 w-36 text-white">
                            <div className="text-[10.5px]">GST (%)</div>
                            <div className="grid grid-cols-2 text-[9.5px] text-white/80 font-semibold mt-0.5 border-t border-white/20 pt-1">
                              <span>%</span>
                              <span className="text-right pr-1">Amount</span>
                            </div>
                          </th>
                        )}
                        <th className="py-2.5 px-3 text-right border-r border-white/20 w-32 text-white">
                          Amount
                        </th>
                        <th className="py-2.5 px-2 text-center w-10 text-white/80"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {formData.items.length === 0 ? (
                        <tr>
                          <td colSpan={formData.withGst ? 15 : 13} className="py-12 text-center bg-slate-50/40">
                            <p className="text-xs sm:text-[13px] text-slate-400 font-medium">
                              No items added yet. Click &quot;+ Add Item&quot; below to add line items.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        formData.items.map((it, idx) => {
                          const itemSub = (it.quantity || 1) * (it.purchasePrice || 0);
                          const itemDisc =
                            it.discountAmount !== undefined && it.discountAmount > 0
                              ? it.discountAmount
                              : itemSub * ((it.discountPercent || 0) / 100);
                          const itemTaxable = Math.max(0, itemSub - itemDisc);
                          const itemTaxAmt = formData.withGst ? itemTaxable * ((it.taxPercent || 0) / 100) : 0;
                          const taxRate = formData.withGst ? (it.taxPercent || 0) : 0;
                          const unitPriceWithTax = it.purchasePrice ? it.purchasePrice * (1 + taxRate / 100) : 0;

                          return (
                            <tr key={it.id || idx} className="hover:bg-purple-50/20 transition-colors group">
                              {/* 1. Row Number */}
                              <td className="py-3 px-2 text-center font-bold text-slate-500 border-r border-slate-200 bg-slate-50/30 align-top">
                                <div className="h-10 flex items-center justify-center">
                                  {idx + 1}
                                </div>
                              </td>

                              {/* 2. Product Name Selection */}
                              <td className="py-3 px-2 border-r border-slate-200 align-top">
                                <SearchableSelect
                                  value={it.productId}
                                  onChange={(val) => handleItemProductChange(idx, val)}
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

                              {/* 3. Batch No */}
                              <td className="py-3 px-2 border-r border-slate-200 align-top min-w-[150px]">
                                {customBatchRows[idx] ? (
                                  <div className="relative flex items-center">
                                    <input
                                      type="text"
                                      value={it.batch || ''}
                                      onChange={(e) => handleItemFieldChange(idx, 'batch', e.target.value)}
                                      placeholder="Enter Batch..."
                                      className="w-full h-10 pl-2.5 pr-7 bg-white hover:border-slate-400 focus:bg-white border border-slate-300 focus:border-[#33077C] focus:ring-2 focus:ring-[#33077C]/10 rounded-[4px] text-xs font-semibold font-mono text-purple-900 outline-none shadow-2xs transition-all text-center"
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setCustomBatchRows((prev) => ({ ...prev, [idx]: false }))}
                                      title="Switch back to batch dropdown"
                                      className="absolute right-1 p-1 text-slate-400 hover:text-[#33077C] rounded hover:bg-slate-100 transition-colors"
                                    >
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <div className="flex-1 min-w-0">
                                      <CustomSelect
                                        value={it.batch || ''}
                                        onChange={(val) => handleItemBatchChange(idx, val)}
                                        options={getProductBatchOptions(it.productId, it.productName, it.batch)}
                                        placeholder={it.productId ? 'Select Batch' : 'Select Product'}
                                        disabled={!it.productId}
                                        triggerClassName="!h-10 !rounded-[4px] !border !border-slate-300 hover:!border-slate-400 focus:!border-[#33077C] !bg-white shadow-2xs text-xs font-semibold font-mono uppercase text-purple-900 justify-between"
                                        size="sm"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setCustomBatchRows((prev) => ({ ...prev, [idx]: true }))}
                                      title="Enter custom batch"
                                      disabled={!it.productId}
                                      className={`h-10 w-8 flex-shrink-0 flex items-center justify-center border rounded-[4px] transition-colors ${
                                        !it.productId
                                          ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
                                          : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-400 hover:text-[#33077C]'
                                      }`}
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </td>

                              {/* 4. Quantity */}
                              <td className="py-3 px-2 border-r border-slate-200 align-top">
                                <input
                                  type="number"
                                  min="1"
                                  value={it.quantity === 0 ? '' : it.quantity}
                                  onChange={(e) => handleItemFieldChange(idx, 'quantity', Number(e.target.value))}
                                  className="w-full h-10 px-2 text-center bg-white hover:border-slate-400 focus:bg-white border border-slate-300 focus:border-[#33077C] focus:ring-2 focus:ring-[#33077C]/10 rounded-[4px] text-xs font-bold text-slate-800 outline-none shadow-2xs transition-all"
                                />
                              </td>

                              {/* 5. Free Quantity */}
                              <td className="py-3 px-2 border-r border-slate-200 align-top">
                                <input
                                  type="number"
                                  min="0"
                                  value={it.freeQuantity === 0 || it.freeQuantity === undefined ? '' : it.freeQuantity}
                                  onChange={(e) => handleItemFieldChange(idx, 'freeQuantity' as any, Number(e.target.value))}
                                  className="w-full h-10 px-2 text-center bg-white hover:border-slate-400 focus:bg-white border border-slate-300 focus:border-[#33077C] focus:ring-2 focus:ring-[#33077C]/10 rounded-[4px] text-xs font-semibold text-emerald-700 outline-none shadow-2xs transition-all"
                                />
                              </td>

                              {/* 6. Unit */}
                              <td className="py-3 px-2 border-r border-slate-200 align-top">
                                <CustomSelect
                                  value={it.unit || 'NONE'}
                                  onChange={(val) => handleItemFieldChange(idx, 'unit', val)}
                                  options={UNIT_OPTIONS.map((u) => ({ value: u, label: u }))}
                                  placeholder="NONE"
                                  triggerClassName="!h-10 !rounded-[4px] !border !border-slate-300 hover:!border-slate-400 focus:!border-[#33077C] !bg-white shadow-2xs text-xs font-semibold uppercase justify-center"
                                  size="sm"
                                />
                              </td>

                              {/* 7. Packing Unit (Number input) */}
                              <td className="py-3 px-2 border-r border-slate-200 align-top">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={it.packingUnit === undefined || it.packingUnit === '' ? '' : it.packingUnit}
                                  onChange={(e) => handleItemFieldChange(idx, 'packingUnit' as any, e.target.value === '' ? '' : Number(e.target.value))}
                                  className="w-full h-10 px-2 text-center bg-white hover:border-slate-400 focus:bg-white border border-slate-300 focus:border-[#33077C] focus:ring-2 focus:ring-[#33077C]/10 rounded-[4px] text-xs font-bold text-slate-800 outline-none shadow-2xs transition-all"
                                />
                              </td>

                              {/* 8. Expiry Date */}
                              <td className="py-3 px-2 border-r border-slate-200 align-top">
                                <input
                                  type="date"
                                  value={it.expDate || ''}
                                  onChange={(e) => handleItemFieldChange(idx, 'expDate' as any, e.target.value)}
                                  className="w-full h-10 px-2 text-center bg-white hover:border-slate-400 focus:bg-white border border-slate-300 focus:border-[#33077C] focus:ring-2 focus:ring-[#33077C]/10 rounded-[4px] text-xs font-medium text-slate-700 outline-none shadow-2xs transition-all"
                                />
                              </td>

                              {/* 9. Purchase Price (with and without tax separation) */}
                              <td className="py-3 px-2 border-r border-slate-200 align-top">
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={
                                      priceTaxMode === 'With Tax'
                                        ? unitPriceWithTax ? Number(unitPriceWithTax.toFixed(2)) : ''
                                        : it.purchasePrice === 0 ? '' : it.purchasePrice
                                    }
                                    onChange={(e) => {
                                      const entered = Number(e.target.value);
                                      if (priceTaxMode === 'With Tax') {
                                        const base = taxRate > 0 ? entered / (1 + taxRate / 100) : entered;
                                        handleItemFieldChange(idx, 'purchasePrice', Number(base.toFixed(2)));
                                      } else {
                                        handleItemFieldChange(idx, 'purchasePrice', entered);
                                      }
                                    }}
                                    className="w-full h-10 px-2.5 text-right bg-white hover:border-slate-400 focus:bg-white border border-slate-300 focus:border-[#33077C] focus:ring-2 focus:ring-[#33077C]/10 rounded-[4px] text-xs font-bold text-slate-800 outline-none shadow-2xs transition-all"
                                  />
                                  <div className="text-[9.5px] text-slate-400 text-right pr-1 mt-1 leading-none font-medium">
                                    {priceTaxMode === 'With Tax'
                                      ? `Excl: ₹${(it.purchasePrice || 0).toFixed(2)}`
                                      : `Incl: ₹${unitPriceWithTax.toFixed(2)}`}
                                  </div>
                                </div>
                              </td>

                              {/* 10. Sale Price */}
                              <td className="py-3 px-2 border-r border-slate-200 align-top">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={it.salePrice === 0 || it.salePrice === undefined ? '' : it.salePrice}
                                  onChange={(e) => handleItemFieldChange(idx, 'salePrice' as any, Number(e.target.value))}
                                  className="w-full h-10 px-2.5 text-right bg-white hover:border-slate-400 focus:bg-white border border-slate-300 focus:border-[#33077C] focus:ring-2 focus:ring-[#33077C]/10 rounded-[4px] text-xs font-bold text-slate-800 outline-none shadow-2xs transition-all"
                                />
                              </td>

                              {/* 11. Discount (%) - Separation of % and Amount */}
                              <td className="py-3 px-2 border-r border-slate-200 w-20 align-top">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={it.discountPercent === 0 ? '' : it.discountPercent}
                                  onChange={(e) => handleItemFieldChange(idx, 'discountPercent', Number(e.target.value))}
                                  className="w-full h-10 px-2 text-center bg-white hover:border-slate-400 focus:bg-white border border-slate-300 focus:border-[#33077C] focus:ring-2 focus:ring-[#33077C]/10 rounded-[4px] text-xs font-medium text-slate-700 outline-none shadow-2xs transition-all"
                                />
                              </td>
                              <td className="py-3 px-2 border-r border-slate-200 w-20 align-top">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={it.discountAmount === 0 || !it.discountAmount ? '' : it.discountAmount}
                                  onChange={(e) => handleItemFieldChange(idx, 'discountAmount', Number(e.target.value))}
                                  className="w-full h-10 px-2 text-right bg-white hover:border-slate-400 focus:bg-white border border-slate-300 focus:border-[#33077C] focus:ring-2 focus:ring-[#33077C]/10 rounded-[4px] text-xs font-medium text-slate-700 outline-none shadow-2xs transition-all"
                                />
                              </td>

                              {/* 12. GST (%) - Separation of % and Amount */}
                              {formData.withGst && (
                                <>
                                  <td className="py-3 px-2 border-r border-slate-200 w-24 align-top">
                                    <CustomSelect
                                      disabled={!formData.withGst}
                                      value={String(it.taxPercent)}
                                      onChange={(val) => handleItemFieldChange(idx, 'taxPercent', Number(val))}
                                      options={TAX_RATE_OPTIONS.map((t) => ({ value: String(t.rate), label: `${t.rate}%` }))}
                                      placeholder="0%"
                                      triggerClassName="!h-10 !rounded-[4px] !border !border-slate-300 hover:!border-slate-400 focus:!border-[#33077C] !bg-white shadow-2xs text-xs font-semibold justify-center"
                                      size="sm"
                                    />
                                  </td>
                                  <td className="py-3 px-2 border-r border-slate-200 w-20 align-top">
                                    <div className="h-10 flex items-center justify-end px-2.5 bg-slate-50/70 border border-slate-200 rounded-[4px] text-xs font-semibold text-slate-700">
                                      {itemTaxAmt > 0 ? itemTaxAmt.toFixed(2) : '0.00'}
                                    </div>
                                  </td>
                                </>
                              )}

                              {/* 13. Amount (Row Total) */}
                              <td className="py-3 px-2 border-r border-slate-200 text-right align-top">
                                <div className="h-10 flex items-center justify-end px-3 rounded-[4px] bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-bold text-xs font-sans">
                                  ₹{(it.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </div>
                              </td>

                              {/* 14. Delete Action */}
                              <td className="py-3 px-2 text-center align-top">
                                <div className="h-10 flex items-center justify-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItemRow(idx)}
                                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-[4px] transition-all cursor-pointer"
                                    title="Delete row"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
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

              {/* Bottom Table Bar: Add Item Button on left, Financial Breakdown below */}
              <div className="flex flex-col md:flex-row items-start justify-between gap-5 !mt-2.5">
                <div className="w-full md:w-1/2 flex flex-col">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      onClick={handleAddItemRow}
                      icon={<Plus className="w-4 h-4 stroke-[2.5]" />}
                    >
                      Add Item
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      onClick={() => handleOpenAddProductModal()}
                      icon={<Plus className="w-4 h-4 stroke-[2.5]" />}
                      className="!text-[#33077C] !border-[#33077C]/30 hover:!bg-[#33077C]/5 font-semibold"
                    >
                      + Add Product
                    </Button>
                  </div>

                  <div className="pt-6 mt-2">
                    <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                      Notes / Instructions
                    </label>
                    <textarea
                      rows={5}
                      value={formData.notes}
                      onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Carrier instructions, delivery address..."
                      className="w-full p-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-[4px] text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-2 focus:ring-[#4309A2]/10 transition-all resize-none"
                    />
                  </div>
                </div>

                {/* RIGHT CARD: Billing Summary */}
                <div className="w-full md:w-1/2 flex justify-end">
                  <div className="w-full max-w-[495px] bg-white rounded-[4px] border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
                      <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                        Billing Summary
                      </h2>
                    </div>

                    {/* Body */}
                    <div className="p-5 space-y-3.5 flex-1">
                      {/* 1. Sub Total & Discount & Amount with Discount */}
                      <div className="space-y-2.5 text-sm">
                        <div className="flex items-center justify-between text-slate-600 font-medium">
                          <span>Sub Total:</span>
                          <span className="font-bold text-slate-900 text-sm">
                            ₹{calculatedTotals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600 font-medium">
                          <span>Discount:</span>
                          <span className={`font-bold text-sm ${calculatedTotals.discount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                            {calculatedTotals.discount > 0
                              ? `-₹${calculatedTotals.discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : '₹0.00'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-700 font-semibold pt-2 border-t border-slate-100">
                          <span>Amount (After Discount):</span>
                          <span className="font-bold text-slate-900 text-sm">
                            ₹{calculatedTotals.taxableAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* 2. CGST & SGST (or IGST) & Total GST */}
                      {formData.withGst && (
                        <div className="pt-3 pb-1 border-t border-slate-100 space-y-2.5 text-sm">
                          {formData.gstType === 'intra_state' ? (
                            <>
                              <div className="flex items-center justify-between text-slate-600 font-medium">
                                <span>CGST:</span>
                                <span className="font-bold text-slate-900">
                                  ₹{calculatedTotals.cgst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-slate-600 font-medium">
                                <span>SGST:</span>
                                <span className="font-bold text-slate-900">
                                  ₹{calculatedTotals.sgst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center justify-between text-slate-600 font-medium">
                              <span>IGST:</span>
                              <span className="font-bold text-slate-900">
                                ₹{calculatedTotals.igst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-slate-800 font-bold pt-2 border-t border-dashed border-slate-200/80">
                            <span>Total GST:</span>
                            <span className="font-bold text-slate-900">
                              ₹{calculatedTotals.tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      )}

                        {/* Freight / Shipping optional row */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-sm">
                          <span className="text-slate-600 font-medium">Freight / Shipping:</span>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#33077C] font-bold text-xs sm:text-sm">₹</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={formData.shipping === 0 ? '' : formData.shipping}
                              placeholder="0"
                              onChange={(e) => setFormData((prev) => ({ ...prev, shipping: Number(e.target.value) || 0 }))}
                              className="w-28 h-9 text-right pl-6 pr-2.5 bg-white border-2 border-[#33077C] rounded-[6px] text-xs sm:text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#33077C]/20 shadow-2xs transition-all"
                            />
                          </div>
                        </div>

                      {/* 3. Rounding Adjustment */}
                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Rounding Adjustment
                          </label>
                          <span className="text-[11px] text-slate-400">click to apply</span>
                        </div>

                        <div className="space-y-2">
                          {/* Round Down */}
                          <button
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                roundMode: prev.roundMode === 'down' ? 'none' : 'down',
                              }))
                            }
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer ${formData.roundMode === 'down'
                                ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold shadow-2xs'
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-medium'
                              }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${formData.roundMode === 'down'
                                    ? 'border-amber-600 bg-amber-600'
                                    : 'border-slate-300 bg-white'
                                  }`}
                              >
                                {formData.roundMode === 'down' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                              </div>
                              <span className="text-xs">Round Down</span>
                            </div>
                            <span className="font-bold text-xs">
                              {calculatedTotals.roundDownDiff === 0
                                ? '₹0.00'
                                : `-₹${Math.abs(calculatedTotals.roundDownDiff).toFixed(2)}`}
                            </span>
                          </button>

                          {/* Round Up */}
                          <button
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                roundMode: prev.roundMode === 'up' ? 'none' : 'up',
                              }))
                            }
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer ${formData.roundMode === 'up'
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold shadow-2xs'
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-medium'
                              }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${formData.roundMode === 'up'
                                    ? 'border-emerald-600 bg-emerald-600'
                                    : 'border-slate-300 bg-white'
                                  }`}
                              >
                                {formData.roundMode === 'up' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                              </div>
                              <span className="text-xs">Round Up</span>
                            </div>
                            <span className="font-bold text-xs">
                              {calculatedTotals.roundUpDiff === 0
                                ? '₹0.00'
                                : `+₹${calculatedTotals.roundUpDiff.toFixed(2)}`}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* 4. Grand Total Banner */}
                      <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="font-bold text-[11px] text-blue-600 block uppercase tracking-wider">
                            Grand Total
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">Net payable amount</span>
                        </div>
                        <span className="font-bold text-base sm:text-lg text-blue-600">
                          ₹{calculatedTotals.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* 5. Paid to Supplier & Balance Payable */}
                      <div className="pt-2 border-t border-slate-100 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-emerald-700">Paid to Supplier:</span>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-xs">₹</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              max={calculatedTotals.grandTotal}
                              value={formData.paidAmount === 0 ? '' : formData.paidAmount}
                              placeholder="0"
                              onChange={(e) => {
                                const newAmount = Number(e.target.value) || 0;
                                setFormData((prev) => ({
                                  ...prev,
                                  paidAmount: newAmount,
                                  paymentMethod: newAmount > 0 ? (prev.paymentMethod || 'Cash') : prev.paymentMethod,
                                }));
                              }}
                              className="w-32 h-8.5 text-right pl-6 pr-2.5 bg-white border-2 border-emerald-600 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-500/20 rounded-[6px] font-bold text-emerald-700 text-xs outline-none shadow-2xs transition-all"
                            />
                          </div>
                        </div>



                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-sm">
                          <span className="font-bold text-slate-800">Total Balance:</span>
                          <span
                            className={`font-bold text-sm ${calculatedTotals.balance > 0 ? 'text-amber-600' : 'text-emerald-600'
                              }`}
                          >
                            ₹{calculatedTotals.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-6 flex flex-col sm:flex-row justify-between items-stretch sm:items-end gap-4 border-t border-slate-100">
                {/* Left side: Payment section */}
                <div className="flex flex-col items-start gap-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Payment
                  </span>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={() => {
                      setFormPaymentDetails({
                        amountPaid: formData.paidAmount > 0 ? formData.paidAmount : calculatedTotals.grandTotal,
                        date: new Date().toISOString().split('T')[0],
                        paymentType: formData.paymentMethod || 'Cash',
                        transactionId: '',
                        remarks: '',
                      });
                      setIsFormPaymentModalOpen(true);
                    }}
                    icon={<Plus className="w-4 h-4 stroke-[2.5]" />}
                  >
                    <span>Record Payment</span>
                    {formData.paidAmount > 0 && (
                      <span className="ml-1.5 px-2 py-0.5 rounded-md bg-white/20 text-white text-xs font-bold">
                        ₹{formData.paidAmount.toLocaleString('en-IN')}
                      </span>
                    )}
                  </Button>
                </div>

                {/* Right side: Cancel & Save Purchase Bill */}
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsFormModalOpen(false)}
                    className="h-11 px-5 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4 text-slate-500" />
                    <span>Cancel</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    onClick={(e) => {
                      e.preventDefault();
                      handleSavePurchase(editingPurchase ? editingPurchase.purchaseStatus : 'Pending');
                    }}
                    className="h-11 px-6 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    )}
                    <span>{isSubmitting ? 'Saving...' : editingPurchase ? 'Save Changes' : 'Save Purchase Bill'}</span>
                  </button>
                </div>
              </div>

              {/* Record Payment Modal for Purchase Form */}
              <Modal
                isOpen={isFormPaymentModalOpen}
                onClose={() => setIsFormPaymentModalOpen(false)}
                title="Record Payment"
                subtitle={
                  <span className="text-white/80 text-xs font-normal">
                    Specify payment transaction details for this purchase bill
                  </span>
                }
                maxWidth="4xl"
                headerGradient={true}
                showBackIcon={true}
                hideCloseButton={true}
                onBack={() => setIsFormPaymentModalOpen(false)}
              >
                <div className="space-y-4 p-2 sm:p-4 animate-in fade-in duration-150">
                  {/* Bill Summary Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {/* Card 1: Supplier Info */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-[4px]">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Supplier
                      </span>
                      <div className="font-bold text-slate-900 text-xs sm:text-[13px] truncate mt-1" title={formData.supplierName || 'Not Selected'}>
                        {formData.supplierName || 'Not Selected'}
                      </div>
                    </div>

                    {/* Card 2: Grand Total */}
                    <div className="p-3.5 bg-purple-50/70 border border-purple-100 rounded-[4px]">
                      <span className="text-[11px] font-bold text-[#33077C] uppercase tracking-wider block">
                        Grand Total
                      </span>
                      <div className="text-base sm:text-lg font-semibold text-[#33077C] mt-0.5">
                        ₹{calculatedTotals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    {/* Card 3: Balance Pending */}
                    <div className="p-3.5 bg-amber-50/70 border border-amber-100 rounded-[4px]">
                      <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                        Balance Due
                      </span>
                      <div className="text-base sm:text-lg font-semibold text-amber-700 mt-0.5">
                        ₹{Math.max(0, calculatedTotals.grandTotal - (formPaymentDetails.amountPaid || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Row 1: Amount Paid (₹) | Date | Payment Type */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Amount Paid */}
                    <div>
                      <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                        Amount Paid (₹) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        max={calculatedTotals.grandTotal}
                        value={formPaymentDetails.amountPaid === 0 ? '' : formPaymentDetails.amountPaid}
                        onChange={(e) =>
                          setFormPaymentDetails((prev) => ({
                            ...prev,
                            amountPaid: Number(e.target.value) || 0,
                          }))
                        }
                        className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-semibold text-emerald-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                      />
                    </div>

                    {/* Date */}
                    <div>
                      <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                        Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formPaymentDetails.date}
                        onChange={(e) =>
                          setFormPaymentDetails((prev) => ({
                            ...prev,
                            date: e.target.value,
                          }))
                        }
                        className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                      />
                    </div>

                    {/* Payment Type */}
                    <div>
                      <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                        Payment Type <span className="text-rose-500">*</span>
                      </label>
                      <CustomSelect
                        value={formPaymentDetails.paymentType || 'Cash'}
                        onChange={(val) =>
                          setFormPaymentDetails((prev) => ({
                            ...prev,
                            paymentType: val as any,
                          }))
                        }
                        options={[
                          { value: 'Cash', label: 'Cash' },
                          { value: 'Bank Transfer', label: 'Bank Transfer / NEFT / RTGS' },
                          { value: 'UPI', label: 'UPI / GPay / PhonePe' },
                          { value: 'Card', label: 'Debit / Corporate Card' },
                          { value: 'Credit', label: 'Supplier Credit' },
                          { value: 'Other', label: 'Other' },
                        ]}
                        placeholder="Select Payment Mode"
                      />
                    </div>
                  </div>

                  {/* Row 2: Transaction ID | Remarks */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Transaction ID */}
                    <div>
                      <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                        Transaction ID
                      </label>
                      <input
                        type="text"
                        value={formPaymentDetails.transactionId}
                        onChange={(e) =>
                          setFormPaymentDetails((prev) => ({
                            ...prev,
                            transactionId: e.target.value,
                          }))
                        }
                        className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                      />
                    </div>

                    {/* Remarks (single column like other fields in 3-col grid) */}
                    <div>
                      <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                        Remarks
                      </label>
                      <input
                        type="text"
                        value={formPaymentDetails.remarks}
                        onChange={(e) =>
                          setFormPaymentDetails((prev) => ({
                            ...prev,
                            remarks: e.target.value,
                          }))
                        }
                        className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                      />
                    </div>
                  </div>

                  {/* Modal Action Buttons */}
                  <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      icon={<X className="w-4 h-4 text-slate-500" />}
                      onClick={() => setIsFormPaymentModalOpen(false)}
                      className="w-full sm:w-auto justify-center"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      icon={<Check className="w-4 h-4 stroke-[2.5]" />}
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          paidAmount: formPaymentDetails.amountPaid,
                          paymentMethod: formPaymentDetails.paymentType || 'Cash',
                        }));
                        setIsFormPaymentModalOpen(false);
                        toast.success(`Payment amount of ₹${formPaymentDetails.amountPaid.toLocaleString('en-IN')} (${formPaymentDetails.paymentType || 'Cash'}) updated!`);
                      }}
                      className="w-full sm:w-auto justify-center"
                    >
                      Apply Payment
                    </Button>
                  </div>
                </div>
              </Modal>

              {/* Quick Add Product Modal */}
              <Modal
                isOpen={isAddProductModalOpen}
                onClose={() => setIsAddProductModalOpen(false)}
                title="Add New Product"
                subtitle={
                  <span className="text-white/80 text-xs font-normal">
                    Create product master record and add directly to this purchase bill
                  </span>
                }
                maxWidth="2xl"
                headerGradient={true}
                showBackIcon={true}
                hideCloseButton={true}
                onBack={() => setIsAddProductModalOpen(false)}
              >
                <div className="space-y-4 p-2 sm:p-4 animate-in fade-in duration-150">
                  {/* Row 1: Product Name */}
                  <div>
                    <FormLabel required>Product Name</FormLabel>
                    <input
                      type="text"
                      placeholder="e.g. Wireless Mouse"
                      value={quickProductForm.productName}
                      onChange={(e) => setQuickProductForm((prev) => ({ ...prev, productName: e.target.value }))}
                      className={FORM_INPUT_CLS}
                      autoFocus
                    />
                  </div>

                  {/* Row 2: Product Code / SKU & Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <FormLabel>Product Code / SKU</FormLabel>
                      <input
                        type="text"
                        placeholder="e.g. PRD-001"
                        value={quickProductForm.productCode}
                        onChange={(e) => setQuickProductForm((prev) => ({ ...prev, productCode: e.target.value }))}
                        className={FORM_INPUT_CLS}
                      />
                    </div>
                    <div>
                      <FormLabel>Category</FormLabel>
                      <input
                        type="text"
                        placeholder="General"
                        value={quickProductForm.category}
                        onChange={(e) => setQuickProductForm((prev) => ({ ...prev, category: e.target.value }))}
                        className={FORM_INPUT_CLS}
                      />
                    </div>
                  </div>

                  {/* Row 3: Unit & HSN Code */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <FormLabel>Unit of Measurement</FormLabel>
                      <select
                        value={quickProductForm.unit}
                        onChange={(e) => setQuickProductForm((prev) => ({ ...prev, unit: e.target.value }))}
                        className={FORM_SELECT_CLS}
                      >
                        <option value="PCS">PCS (Pieces)</option>
                        <option value="BOX">BOX</option>
                        <option value="KG">KG (Kilograms)</option>
                        <option value="GM">GM (Grams)</option>
                        <option value="LTR">LTR (Liters)</option>
                        <option value="MTR">MTR (Meters)</option>
                        <option value="PACK">PACK</option>
                        <option value="SET">SET</option>
                        <option value="NOS">NOS</option>
                      </select>
                    </div>
                    <div>
                      <FormLabel>HSN / SAC Code</FormLabel>
                      <input
                        type="text"
                        placeholder="e.g. 8471"
                        value={quickProductForm.hsnCode}
                        onChange={(e) => setQuickProductForm((prev) => ({ ...prev, hsnCode: e.target.value }))}
                        className={FORM_INPUT_CLS}
                      />
                    </div>
                  </div>

                  {/* Row 4: Pricing Section (Purchase Price, Sale Price, Tax Rate) */}
                  <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 space-y-3">
                    <div className="text-xs font-bold text-[#33077C] flex items-center gap-1.5">
                      <span>Pricing & Tax Configuration</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <FormLabel required>Purchase Price (₹)</FormLabel>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={quickProductForm.purchasePrice}
                          onChange={(e) => setQuickProductForm((prev) => ({ ...prev, purchasePrice: e.target.value }))}
                          className={FORM_INPUT_CLS}
                        />
                        <span className="text-[10px] text-slate-500 mt-0.5 block">Supplier cost price</span>
                      </div>
                      <div>
                        <FormLabel required>Sale Price (₹)</FormLabel>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={quickProductForm.salePrice}
                          onChange={(e) => setQuickProductForm((prev) => ({ ...prev, salePrice: e.target.value }))}
                          className={FORM_INPUT_CLS}
                        />
                        <span className="text-[10px] text-slate-500 mt-0.5 block">Default customer price</span>
                      </div>
                      <div>
                        <FormLabel>GST Tax Rate</FormLabel>
                        <select
                          value={quickProductForm.taxRate}
                          onChange={(e) => setQuickProductForm((prev) => ({ ...prev, taxRate: e.target.value }))}
                          className={FORM_SELECT_CLS}
                        >
                          <option value="None">None (0%)</option>
                          <option value="GST @ 0%">GST @ 0%</option>
                          <option value="GST @ 5%">GST @ 5%</option>
                          <option value="GST @ 12%">GST @ 12%</option>
                          <option value="GST @ 18%">GST @ 18%</option>
                          <option value="GST @ 28%">GST @ 28%</option>
                        </select>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">Applicable tax rate</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      onClick={() => setIsAddProductModalOpen(false)}
                      disabled={isCreatingProduct}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      onClick={handleSaveQuickProduct}
                      disabled={isCreatingProduct}
                      icon={isCreatingProduct ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Check className="w-4 h-4 stroke-[2.5]" />}
                    >
                      {isCreatingProduct ? 'Creating...' : 'Save & Select Product'}
                    </Button>
                  </div>
                </div>
              </Modal>
            </form>
          </div>
        </div>
      ) : (
        <div className="space-y-6 pb-12 font-sans">
          {/* 1. Header Banner */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
                  <ShoppingBag className="w-4.5 h-4.5" />
                </div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  Purchase Orders &amp; Bills
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                Execute supplier purchases, manage stock receipts, and disburse vendor payments
              </p>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 w-full sm:w-auto">
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
                Create Purchase Bill
              </Button>
            </div>
          </div>

          {/* 2. KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Purchases</span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#33077C] flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold text-slate-900">
                  ₹{summary.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{summary.totalCount} orders total</div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Today's Purchases</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold text-slate-900">
                  ₹{summary.todayAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-emerald-600 font-medium mt-0.5">{summary.todayCount} generated today</div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Payments</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold text-amber-600">
                  ₹{summary.pendingPayments.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Payable to suppliers</div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fully Paid</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold text-slate-900">{summary.paidCount}</div>
                <div className="text-xs text-slate-500 mt-0.5">Zero balance remaining</div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Received / Stocked</span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#33077C] flex items-center justify-center">
                  <PackageCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold text-slate-900">{summary.completedCount}</div>
                <div className="text-xs text-slate-500 mt-0.5">Added to warehouse stock</div>
              </div>
            </div>
          </div>

          {/* 3. Search Bar & Filter Row */}
          <SearchBar
            value={pendingSearch}
            onChange={(val) => setPendingSearch(val)}
            placeholder="Search by PO #, invoice #, supplier, product..."
            onSubmit={() => {
              const trimmed = pendingSearch.trim();
              const isSame =
                appliedSearch === trimmed &&
                appliedPurchaseStatus === pendingPurchaseStatus &&
                appliedPaymentStatus === pendingPaymentStatus &&
                appliedSupplier === pendingSupplier &&
                currentPage === 1;

              setAppliedSearch(trimmed);
              setAppliedPurchaseStatus(pendingPurchaseStatus);
              setAppliedPaymentStatus(pendingPaymentStatus);
              setAppliedSupplier(pendingSupplier);
              setCurrentPage(1);

              if (isSame) {
                fetchPurchaseOrders(true);
              }
            }}
            onReset={() => {
              const isSame =
                appliedSearch === '' &&
                pendingSearch === '' &&
                appliedPurchaseStatus === 'All' &&
                pendingPurchaseStatus === 'All' &&
                appliedPaymentStatus === 'All' &&
                pendingPaymentStatus === 'All' &&
                appliedSupplier === 'All' &&
                pendingSupplier === 'All' &&
                currentPage === 1;

              setPendingSearch('');
              setAppliedSearch('');
              setPendingPurchaseStatus('All');
              setAppliedPurchaseStatus('All');
              setPendingPaymentStatus('All');
              setAppliedPaymentStatus('All');
              setPendingSupplier('All');
              setAppliedSupplier('All');
              setCurrentPage(1);

              if (isSame) {
                fetchPurchaseOrders(true);
              }
            }}
            filterSlot={
              <div className="flex items-center gap-2.5 flex-wrap">
                <FilterDropdown
                  placeholder="Purchase Status : All"
                  value={pendingPurchaseStatus}
                  onChange={(val) => {
                    setPendingPurchaseStatus(val);
                  }}
                  options={[
                    { label: 'Purchase Status : All', value: 'All' },
                    { label: 'Pending', value: 'Pending', dotColor: '#f59e0b' },
                    { label: 'Approved', value: 'Approved', dotColor: '#3b82f6' },
                    { label: 'Ordered', value: 'Ordered', dotColor: '#8b5cf6' },
                    { label: 'Received', value: 'Received', dotColor: '#10b981' },
                    { label: 'Cancelled', value: 'Cancelled', dotColor: '#ef4444' },
                  ]}
                />

                <FilterDropdown
                  placeholder="Payment Status : All"
                  value={pendingPaymentStatus}
                  onChange={(val) => {
                    setPendingPaymentStatus(val);
                  }}
                  options={[
                    { label: 'Payment Status : All', value: 'All' },
                    { label: 'Paid', value: 'Paid', dotColor: '#10b981' },
                    { label: 'Partial', value: 'Partial', dotColor: '#f59e0b' },
                    { label: 'Unpaid', value: 'Unpaid', dotColor: '#ef4444' },
                    { label: 'Pending', value: 'Pending', dotColor: '#64748b' },
                  ]}
                />

                <FilterDropdown
                  placeholder="Supplier : All"
                  value={pendingSupplier}
                  onChange={(val) => {
                    setPendingSupplier(val);
                  }}
                  options={[
                    { label: 'Supplier : All', value: 'All' },
                    ...mergedSuppliers.map((s) => ({ label: s.name, value: s.id })),
                  ]}
                />
              </div>
            }
            rightSlot={
              <div className="flex items-center gap-3 pr-1">
                <span className="text-xs font-semibold text-slate-500">
                  Total Purchases :{' '}
                  <span className="text-[#33077C] font-bold">{totalRecordsCount}</span>
                </span>
              </div>
            }
          />

          {/* 4. Purchase Orders Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-200 min-w-[1050px]">
                <thead>
                  <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white tracking-wider uppercase">
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">PURCHASE NO & DATE</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">SUPPLIER</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">ITEMS</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-right">TOTAL AMOUNT</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-right">PAID</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-right">BALANCE</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">PAYMENT</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">STATUS</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {isApiLoading && paginatedPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                        <Loader2 className="w-8 h-8 mx-auto mb-2 text-[#33077C] animate-spin" />
                        <p className="font-semibold text-slate-600 text-sm">Loading purchase orders...</p>
                        <p className="text-xs text-slate-400 mt-1">Connecting to Work API...</p>
                      </td>
                    </tr>
                  ) : paginatedPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                        <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                        <p className="font-semibold text-slate-600 text-sm">No purchase orders found</p>
                        <p className="text-xs text-slate-400 mt-1">Create a purchase order to stock inventory items.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedPurchases.map((po) => {
                      const isPaid = po.paymentStatus === 'Paid';
                      const isCompleted = po.purchaseStatus === 'Completed' || po.purchaseStatus === 'Received';

                      return (
                        <tr key={po.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-200 font-sans">
                          {/* 1. Purchase No & Date */}
                          <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-[#33077C] text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-xs shrink-0 select-none">
                                PO
                              </div>
                              <div>
                                <span
                                  onClick={() => {
                                    setSelectedPurchase(po);
                                    setIsDetailModalOpen(true);
                                  }}
                                  className="font-bold text-[#33077C] hover:underline cursor-pointer block text-sm leading-snug"
                                >
                                  {po.purchaseNo}
                                </span>
                                <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 font-medium">
                                  <span>{po.purchaseDate}</span>
                                  {po.purchaseInvoiceNo && (
                                    <>
                                      <span className="text-slate-300">&bull;</span>
                                      <span>Inv: {po.purchaseInvoiceNo}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 2. Supplier */}
                          <td className="py-4 px-5 border border-slate-200">
                            <div className="font-bold text-slate-900 leading-snug">{po.supplierName}</div>
                            <div className="text-xs text-slate-400 mt-0.5 font-medium">
                              Due: <span className="text-slate-600 font-semibold">{po.dueDate}</span>
                            </div>
                          </td>

                          {/* 3. Items */}
                          <td className="py-4 px-5 border border-slate-200">
                            <div className="font-semibold text-slate-900 leading-snug text-xs">
                              {po.items[0]?.productName} ({po.items[0]?.quantity} qty)
                            </div>
                            {po.items.length > 1 && (
                              <span className="text-[#33077C] text-[11px] font-bold mt-0.5 block">
                                +{po.items.length - 1} more item(s)
                              </span>
                            )}
                          </td>

                          {/* 4. Total Amount */}
                          <td className="py-4 px-5 border border-slate-200 text-right whitespace-nowrap">
                            <span className="font-bold text-slate-900 text-sm">
                              ₹{po.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </td>

                          {/* 5. Paid */}
                          <td className="py-4 px-5 border border-slate-200 text-right whitespace-nowrap">
                            <span className="font-bold text-emerald-600 text-sm">
                              ₹{po.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </td>

                          {/* 6. Balance */}
                          <td className="py-4 px-5 border border-slate-200 text-right whitespace-nowrap">
                            {po.balance > 0 ? (
                              <span className="font-bold text-amber-600 text-sm">
                                ₹{po.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="font-semibold text-slate-400 text-xs">₹0.00</span>
                            )}
                          </td>

                          {/* 7. Payment Status */}
                          <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${po.paymentStatus === 'Paid'
                                  ? 'bg-emerald-50/90 text-emerald-700 border border-emerald-300/80'
                                  : po.paymentStatus === 'Partial'
                                    ? 'bg-amber-50/90 text-amber-700 border border-amber-300/80'
                                    : 'bg-rose-50/90 text-rose-700 border border-rose-300/80'
                                }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${po.paymentStatus === 'Paid'
                                    ? 'bg-emerald-500'
                                    : po.paymentStatus === 'Partial'
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                                  }`}
                              />
                              {po.paymentStatus}
                            </span>
                          </td>

                          {/* 8. Purchase Status */}
                          <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${po.purchaseStatus === 'Completed' || po.purchaseStatus === 'Received'
                                  ? 'bg-emerald-50/90 text-emerald-700 border border-emerald-300/80'
                                  : po.purchaseStatus === 'Approved'
                                    ? 'bg-blue-50/90 text-blue-700 border border-blue-300/80'
                                    : po.purchaseStatus === 'Ordered'
                                      ? 'bg-purple-50/90 text-[#33077C] border border-[#33077C]/30'
                                      : po.purchaseStatus === 'Pending'
                                        ? 'bg-amber-50/90 text-amber-700 border border-amber-300/80'
                                        : po.purchaseStatus === 'Cancelled'
                                          ? 'bg-rose-50/90 text-rose-700 border border-rose-300/80'
                                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${po.purchaseStatus === 'Completed' || po.purchaseStatus === 'Received'
                                    ? 'bg-emerald-500'
                                    : po.purchaseStatus === 'Approved'
                                      ? 'bg-blue-500'
                                      : po.purchaseStatus === 'Ordered'
                                        ? 'bg-[#33077C]'
                                        : po.purchaseStatus === 'Pending'
                                          ? 'bg-amber-500'
                                          : po.purchaseStatus === 'Cancelled'
                                            ? 'bg-rose-500'
                                            : 'bg-slate-400'
                                  }`}
                              />
                              {po.purchaseStatus}
                            </span>
                          </td>

                          {/* 9. Actions */}
                          <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">

                              {/* Share / Forward Popover */}
                              <UniversalShareDropdown
                                id={po.id}
                                activeShareId={activeShareId}
                                setActiveShareId={setActiveShareId}
                                sharePos={sharePos}
                                setSharePos={setSharePos}
                                getShareData={() => formatPurchaseOrderShare(po)}
                                title="Share Purchase Bill"
                              />

                              {/* 3-dots Actions Dropdown */}
                              <SaleActionDropdown
                                items={[
                                  {
                                    label: 'View/Edit',
                                    variant: 'edit',
                                    onClick: () => handleOpenEditModal(po),
                                  },
                                  {
                                    label: 'Duplicate',
                                    variant: 'duplicate',
                                    onClick: () => handleDuplicatePurchase(po),
                                  },
                                  po.purchaseStatus === 'Pending' && {
                                    label: 'Mark as Approved',
                                    variant: 'approve',
                                    onClick: () => handleUpdateStatus(po, 'Approved'),
                                  },
                                  (po.purchaseStatus === 'Approved' || po.purchaseStatus === 'Pending') && {
                                    label: 'Mark as Ordered',
                                    variant: 'order',
                                    onClick: () => handleUpdateStatus(po, 'Ordered'),
                                  },
                                  po.purchaseStatus === 'Ordered' && {
                                    label: 'Mark as Received',
                                    variant: 'activate',
                                    onClick: () => handleUpdateStatus(po, 'Received'),
                                  },
                                  po.purchaseStatus !== 'Received' && po.purchaseStatus !== 'Cancelled' && {
                                    label: 'Cancel Order',
                                    variant: 'cancel',
                                    onClick: () => handleUpdateStatus(po, 'Cancelled'),
                                  },
                                  {
                                    label: 'Preview',
                                    variant: 'preview',
                                    onClick: () => {
                                      setSelectedPurchase(po);
                                      setIsDetailModalOpen(true);
                                    },
                                  },
                                  {
                                    label: 'View History',
                                    variant: 'view',
                                    onClick: () => handleOpenHistory(po),
                                  },
                                  (po.purchaseStatus as string) !== 'Returned' && (po.purchaseStatus as string)?.toLowerCase() !== 'returned' && {
                                    label: 'Convert to Return',
                                    variant: 'return',
                                    onClick: () => handleConvertToReturn(po),
                                  },
                                  {
                                    label: 'Delete',
                                    variant: 'delete',
                                    danger: true,
                                    dividerBefore: true,
                                    onClick: () => handleDeletePurchase(po),
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

          {/* Pagination */}
          {totalRecordsCount > 0 && (
            <Pagination
              currentPage={currentPage}
              total={totalRecordsCount}
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
          MODAL 2: VIEW PURCHASE DETAIL
         ========================================== */}
          {selectedPurchase && (
            <Modal
              isOpen={isDetailModalOpen}
              onClose={() => setIsDetailModalOpen(false)}
              title={`Purchase Order: ${selectedPurchase.purchaseNo}`}
              subtitle="Purchase order items, supplier billing, and payment summary"
              maxWidth="4xl"
              headerGradient={true}
              showBackIcon={true}
              hideCloseButton={true}
              onBack={() => setIsDetailModalOpen(false)}
            >
              <div className="space-y-4 p-2 sm:p-4 max-h-[75vh] overflow-y-auto text-xs">
                <div className="flex flex-wrap justify-between items-center p-3 bg-purple-50 rounded-xl border border-purple-100 gap-2">
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Supplier / Vendor</span>
                    <div className="font-bold text-slate-900 text-sm">{selectedPurchase.supplierName}</div>
                    {selectedPurchase.purchaseInvoiceNo && (
                      <div className="text-slate-500">Bill #: {selectedPurchase.purchaseInvoiceNo}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${selectedPurchase.withGst !== false
                        ? 'bg-purple-100 text-[#33077C] border border-purple-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                      {selectedPurchase.withGst !== false
                        ? selectedPurchase.gstType === 'inter_state'
                          ? 'With GST • Inter-State (IGST)'
                          : 'With GST • Intra-State (CGST+SGST)'
                        : 'Without GST (Exempt)'}
                    </span>
                    <Badge variant="primary" size="md" dot>
                      {selectedPurchase.purchaseStatus}
                    </Badge>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto max-w-full">
                    <table className="w-full text-left min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200 text-[11px] uppercase tracking-wider">
                          <th className="py-2.5 px-3">Product Name</th>
                          <th className="py-2.5 px-3 text-center">Batch No</th>
                          <th className="py-2.5 px-3 text-center">Quantity</th>
                          <th className="py-2.5 px-3 text-center">Free Quantity</th>
                          <th className="py-2.5 px-3 text-center">Unit</th>
                          <th className="py-2.5 px-3 text-center">Packing Unit</th>
                          <th className="py-2.5 px-3 text-center">Expiry Date</th>
                          <th className="py-2.5 px-3 text-right">Purchase Price</th>
                          <th className="py-2.5 px-3 text-right">Sale Price</th>
                          <th className="py-2.5 px-3 text-center">Discount (%)</th>
                          <th className="py-2.5 px-3 text-center">GST (%)</th>
                          <th className="py-2.5 px-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedPurchase.items.map((it) => {
                          const itemSub = (it.quantity || 1) * (it.purchasePrice || 0);
                          const discAmt = it.discountAmount !== undefined && it.discountAmount > 0
                            ? it.discountAmount
                            : itemSub * ((it.discountPercent || 0) / 100);
                          const taxRate = selectedPurchase.withGst !== false ? (it.taxPercent || 0) : 0;
                          const taxAmt = selectedPurchase.withGst !== false ? Math.max(0, itemSub - discAmt) * (taxRate / 100) : 0;

                          return (
                            <tr key={it.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-2.5 px-3 font-semibold text-slate-900">
                                <div>{it.productName}</div>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {it.batch ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 text-[#33077C] font-mono font-bold text-[10px] border border-purple-200">
                                    {it.batch}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-normal">—</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold text-purple-900">{it.quantity}</td>
                              <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                                {it.freeQuantity || 0}
                              </td>
                              <td className="py-2.5 px-3 text-center text-slate-600 font-medium uppercase text-[11px]">
                                {it.unit || 'NONE'}
                              </td>
                              <td className="py-2.5 px-3 text-center text-slate-600 font-medium uppercase text-[11px]">
                                {it.packingUnit || 'NONE'}
                              </td>
                              <td className="py-2.5 px-3 text-center text-slate-600 font-mono text-[11px]">
                                {it.expDate || '—'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-medium">
                                <div>₹{it.purchasePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                {taxRate > 0 && (
                                  <div className="text-[10px] text-slate-400">
                                    Incl: ₹{(it.purchasePrice * (1 + taxRate / 100)).toFixed(2)}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                                {it.salePrice ? `₹${Number(it.salePrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="font-semibold text-slate-800">{it.discountPercent}%</span>
                                <span className="block text-[10px] text-slate-400">₹{discAmt.toFixed(2)}</span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="font-semibold text-slate-800">{taxRate}%</span>
                                <span className="block text-[10px] text-slate-400">₹{taxAmt.toFixed(2)}</span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                                ₹{it.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="w-80 space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200 font-medium">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal (Base):</span>
                      <span>₹{selectedPurchase.subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount:</span>
                      <span>-₹{selectedPurchase.discount.toLocaleString('en-IN')}</span>
                    </div>

                    {/* GST Itemized in View Detail */}
                    {selectedPurchase.withGst === false || selectedPurchase.tax === 0 ? (
                      <div className="flex justify-between text-amber-700 py-0.5 font-semibold">
                        <span>Tax (Without GST):</span>
                        <span>₹0.00 (Exempt)</span>
                      </div>
                    ) : selectedPurchase.gstType === 'inter_state' ? (
                      <div className="flex justify-between text-purple-900 py-0.5">
                        <span>IGST (Integrated Tax):</span>
                        <span className="font-bold">+₹{selectedPurchase.tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-purple-900 py-0.5">
                          <span>CGST (Central Tax - 50%):</span>
                          <span className="font-bold">+₹{(selectedPurchase.cgst ?? selectedPurchase.tax / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-purple-900 py-0.5">
                          <span>SGST (State Tax - 50%):</span>
                          <span className="font-bold">+₹{(selectedPurchase.sgst ?? selectedPurchase.tax / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </>
                    )}

                    {selectedPurchase.shipping > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Shipping:</span>
                        <span>+₹{selectedPurchase.shipping.toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    <div className="border-t border-slate-200 pt-1 flex justify-between font-bold text-sm text-purple-900">
                      <span>Grand Total:</span>
                      <span>₹{selectedPurchase.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Amount Paid:</span>
                      <span>₹{selectedPurchase.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-amber-600 font-bold border-t border-slate-200 pt-1">
                      <span>Balance Payable:</span>
                      <span>₹{selectedPurchase.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      navigate('/sale-management/purchase/return');
                    }}
                    className="h-10 px-4 rounded-lg border border-purple-200 hover:border-purple-300 text-xs sm:text-[13px] font-bold text-[#33077C] hover:bg-purple-50 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Create Purchase Return</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDetailModalOpen(false)}
                    className="h-10 px-5 rounded-lg border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center shadow-2xs"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toast.info(`Preparing print for ${selectedPurchase.purchaseNo}...`);
                      window.print();
                    }}
                    className="h-10 px-5 rounded-lg bg-[#33077C] hover:bg-[#26055d] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Order</span>
                  </button>
                </div>
              </div>
            </Modal>
          )}

          {/* ==========================================
          MODAL 3: RECORD SUPPLIER PAYMENT
         ========================================== */}
          {selectedPurchase && (
            <Modal
              isOpen={isPaymentModalOpen}
              onClose={() => setIsPaymentModalOpen(false)}
              title={`Disburse Payment: ${selectedPurchase.purchaseNo}`}
              subtitle="Record vendor settlement, payment method, and update payable ledger"
              maxWidth="2xl"
              headerGradient={true}
              showBackIcon={true}
              hideCloseButton={true}
              onBack={() => setIsPaymentModalOpen(false)}
            >
              <form noValidate onSubmit={(e) => {
                e.preventDefault();
                handleConfirmPayment();
              }} className="space-y-4 p-2 sm:p-4 text-xs">
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 flex justify-between items-center">
                  <div>
                    <span className="text-slate-500 font-medium">Supplier:</span>
                    <div className="font-bold text-slate-900">{selectedPurchase.supplierName}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 font-medium">Balance Due:</span>
                    <div className="font-bold text-amber-600 text-sm">
                      ₹{selectedPurchase.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                  <div>
                    <FormLabel required>Disbursed Amount (₹)</FormLabel>
                    <input
                      type="number"
                      min="1"
                      max={selectedPurchase.balance}
                      value={recordAmount}
                      onChange={(e) => setRecordAmount(Number(e.target.value))}
                      className={`${FORM_INPUT_CLS} !text-emerald-600 font-bold`}
                    />
                  </div>

                  <div>
                    <FormLabel required>Payment Mode</FormLabel>
                    <select
                      value={recordMethod}
                      onChange={(e) => setRecordMethod(e.target.value as any)}
                      className={FORM_SELECT_CLS}
                    >
                      <option value="Bank Transfer">Bank Transfer / NEFT / RTGS</option>
                      <option value="UPI">UPI</option>
                      <option value="Card">Corporate Card</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>

                  <div>
                    <FormLabel>Remarks / Transaction Ref</FormLabel>
                    <input
                      type="text"
                      value={recordNotes}
                      onChange={(e) => setRecordNotes(e.target.value)}
                      placeholder="Bank UTR, Cheque..."
                      className={FORM_INPUT_CLS}
                    />
                  </div>
                </div>

                <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4 text-slate-500" />
                    <span>Cancel</span>
                  </button>
                  <button
                    type="submit"
                    className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirm Payment</span>
                  </button>
                </div>
              </form>
            </Modal>
          )}

          {/* ==========================================
              MODAL 4: PURCHASE ORDER HISTORY & AUDIT TRAIL
             ========================================== */}
          {historyPurchase && (
            <Modal
              isOpen={Boolean(historyPurchase)}
              onClose={() => setHistoryPurchase(null)}
              title={`Order History & Audit Trail: ${historyPurchase.purchaseNo}`}
              subtitle={
                isLoadingHistory
                  ? 'Syncing live history from Work API...'
                  : 'Complete lifecycle progression and timeline audit log'
              }
              maxWidth="md"
              headerGradient={true}
              showBackIcon={true}
              hideCloseButton={true}
              onBack={() => setHistoryPurchase(null)}
            >
              <div className="space-y-4 text-xs font-sans">
                {/* Header Card */}
                <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-100 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-[#33077C] uppercase tracking-wider">
                      Purchase Order No
                    </div>
                    <div className="text-base font-extrabold text-slate-900 mt-0.5">
                      {historyPurchase.purchaseNo}
                    </div>
                    <div className="text-xs text-slate-600 font-medium mt-0.5">
                      Supplier: <span className="font-semibold text-slate-800">{historyPurchase.supplierName}</span>
                    </div>
                    {historyPurchase.purchaseInvoiceNo && (
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Inv Ref: {historyPurchase.purchaseInvoiceNo}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Total Amount
                    </div>
                    <div className="text-base font-extrabold text-[#33077C] mt-0.5">
                      ₹{historyPurchase.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="flex items-center gap-1.5 justify-end mt-1.5 flex-wrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          historyPurchase.paymentStatus === 'Paid'
                            ? 'bg-emerald-100 text-emerald-700'
                            : historyPurchase.paymentStatus === 'Partial'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {historyPurchase.paymentStatus}
                      </span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          historyPurchase.purchaseStatus === 'Completed' || historyPurchase.purchaseStatus === 'Received'
                            ? 'bg-emerald-100 text-emerald-700'
                            : historyPurchase.purchaseStatus === 'Approved'
                            ? 'bg-blue-100 text-blue-700'
                            : historyPurchase.purchaseStatus === 'Ordered'
                            ? 'bg-purple-100 text-purple-700'
                            : historyPurchase.purchaseStatus === 'Cancelled'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {historyPurchase.purchaseStatus}
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
                          Purchase Order Created
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          Order Date: <span className="font-medium text-slate-700">{historyPurchase.purchaseDate}</span> • Due Date: <span className="font-medium text-slate-700">{historyPurchase.dueDate}</span>
                        </div>
                        <div className="text-slate-400 text-[10px] mt-0.5">
                          Items: {historyPurchase.items.length} product(s) registered
                        </div>
                      </div>
                    </div>

                    {/* Event 2: Order Fulfillment State */}
                    <div className="relative">
                      <div
                        className={`absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full ${
                          historyPurchase.purchaseStatus === 'Completed' || historyPurchase.purchaseStatus === 'Received'
                            ? 'bg-emerald-500 ring-4 ring-emerald-100'
                            : historyPurchase.purchaseStatus === 'Approved'
                            ? 'bg-blue-500 ring-4 ring-blue-100'
                            : historyPurchase.purchaseStatus === 'Ordered'
                            ? 'bg-purple-500 ring-4 ring-purple-100'
                            : historyPurchase.purchaseStatus === 'Cancelled'
                            ? 'bg-rose-500 ring-4 ring-rose-100'
                            : 'bg-amber-500 ring-4 ring-amber-100'
                        }`}
                      />
                      <div>
                        <div className="font-bold text-slate-800 text-xs">
                          Status: {historyPurchase.purchaseStatus}
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          {historyPurchase.purchaseStatus === 'Received' || historyPurchase.purchaseStatus === 'Completed'
                            ? 'Goods delivered and stocked into warehouse inventory.'
                            : historyPurchase.purchaseStatus === 'Ordered'
                            ? 'Dispatched to supplier; awaiting shipment arrival.'
                            : historyPurchase.purchaseStatus === 'Approved'
                            ? 'Order authorized and cleared for supplier dispatch.'
                            : historyPurchase.purchaseStatus === 'Cancelled'
                            ? 'Purchase order voided/cancelled.'
                            : 'Order drafted, pending authorization.'}
                        </div>
                      </div>
                    </div>

                    {/* Event 3: Payment & Settlement */}
                    <div className="relative">
                      <div
                        className={`absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full ${
                          historyPurchase.balance <= 0
                            ? 'bg-emerald-500 ring-4 ring-emerald-100'
                            : historyPurchase.paidAmount > 0
                            ? 'bg-amber-500 ring-4 ring-amber-100'
                            : 'bg-rose-500 ring-4 ring-rose-100'
                        }`}
                      />
                      <div>
                        <div className="font-bold text-slate-800 text-xs">
                          Payment Settlement: {historyPurchase.paymentStatus}
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          Paid: <strong className="text-emerald-700">₹{historyPurchase.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                          {historyPurchase.balance > 0 && (
                            <span> • Balance: <strong className="text-amber-700">₹{historyPurchase.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                          )}
                        </div>
                        <div className="text-slate-400 text-[10px] mt-0.5">
                          Terms: {historyPurchase.paymentTerms || 'Net 30 Days'} • Mode: {historyPurchase.paymentMethod || 'Bank Transfer'}
                        </div>
                      </div>
                    </div>

                    {/* Event 4: System Audit Log */}
                    <div className="relative">
                      <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-slate-400 ring-4 ring-slate-100" />
                      <div>
                        <div className="font-bold text-slate-700 text-xs">
                          System Audit Log Entry
                        </div>
                        <div className="text-slate-400 text-[10px] mt-0.5">
                          Record ID: <span className="font-mono text-slate-600">{historyPurchase.id}</span>
                        </div>
                        <div className="text-slate-400 text-[10px] mt-0.5">
                          Last Verified: {new Date(historyPurchase.updatedAt || Date.now()).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setHistoryPurchase(null)}
                    className="h-10 px-5 rounded-lg border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center shadow-2xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      )}
    </>
  );
};
