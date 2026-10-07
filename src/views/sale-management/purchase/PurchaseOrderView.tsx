import React, { useState, useMemo, useEffect } from 'react';
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
} from 'lucide-react';
import {
  useSalesManagementStore,
  PurchaseOrder,
  PurchaseProductItem,
  PurchaseStatus,
  PurchasePaymentStatus,
  PurchaseReturn,
  PurchaseReturnItem,
} from '../../../store/useSalesManagementStore';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { Pagination } from '../../../components/common/Pagination';
import { SearchBar } from '../../../components/common/SearchBar';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { SearchableSelect } from '../../../components/common/SearchableSelect';
import { exportTableToExcel } from '../../../utils/excelExport';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

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
  { label: 'GST @ 5%', rate: 5 },
  { label: 'GST @ 12%', rate: 12 },
  { label: 'GST @ 18%', rate: 18 },
  { label: 'GST @ 28%', rate: 28 },
];

export const PurchaseOrderView: React.FC = () => {
  const navigate = useNavigate();
  const {
    purchases,
    suppliers,
    stocks,
    savePurchase,
    deletePurchase,
    updatePurchasePayment,
    savePurchaseReturn,
  } = useSalesManagementStore();

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

  // 3-Dots Action dropdown & Share Popover State
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [activeShareId, setActiveShareId] = useState<string | null>(null);
  const [sharePos, setSharePos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

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

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseOrder | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<PurchaseOrder | null>(null);

  // Payment Recording State
  const [recordAmount, setRecordAmount] = useState<number>(0);
  const [recordMethod, setRecordMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Credit' | 'Other'>('Bank Transfer');
  const [recordNotes, setRecordNotes] = useState('');

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
    paymentMethod: 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Credit' | 'Other';
    paymentTerms: string;
    paidAmount: number;
    purchaseStatus: PurchaseStatus;
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
    paymentMethod: 'Bank Transfer',
    paymentTerms: 'Net 30 Days',
    paidAmount: 0,
    purchaseStatus: 'Ordered',
    notes: '',
  });

  // Summary Metrics
  const summary = useMemo(() => {
    const totalAmount = purchases.reduce((acc, p) => acc + p.grandTotal, 0);
    const todayStr = new Date().toISOString().split('T')[0];
    const todayPurchases = purchases.filter((p) => p.purchaseDate === todayStr);
    const todayAmount = todayPurchases.reduce((acc, p) => acc + p.grandTotal, 0);
    const pendingPayments = purchases.reduce((acc, p) => acc + p.balance, 0);
    const paidCount = purchases.filter((p) => p.paymentStatus === 'Paid').length;
    const completedCount = purchases.filter((p) => p.purchaseStatus === 'Completed' || p.purchaseStatus === 'Received').length;

    return {
      totalCount: purchases.length,
      totalAmount,
      todayAmount,
      todayCount: todayPurchases.length,
      pendingPayments,
      paidCount,
      completedCount,
    };
  }, [purchases]);

  const stockOptions = useMemo(() => {
    return stocks.map((stk) => ({
      value: stk.productId,
      label: stk.productName,
      subLabel: stk.sku ? `SKU: ${stk.sku} • Stock: ${stk.inStock ?? 0} ${stk.unit || 'units'}` : undefined,
      badge: stk.sku,
    }));
  }, [stocks]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    const nextPoNo = `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const defaultStock = stocks[0] || {
      productId: 'PROD_1',
      productName: 'ERP Business Suite Enterprise',
      unitCost: 15000,
    };

    const defaultBatchNo = `BAT-SUP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const initialItem: PurchaseProductItem = {
      id: `po_it_${Date.now()}`,
      productId: defaultStock.productId,
      productName: defaultStock.productName,
      batch: defaultBatchNo,
      quantity: 1,
      unit: 'NONE',
      purchasePrice: defaultStock.unitCost,
      discountPercent: 0,
      discountAmount: 0,
      taxPercent: 18,
      total: defaultStock.unitCost * 1.18,
    };

    setFormData({
      purchaseNo: nextPoNo,
      purchaseInvoiceNo: '',
      supplierId: '',
      supplierName: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      items: [initialItem],
      withGst: true,
      gstType: 'intra_state',
      shipping: 0,
      otherCharges: 0,
      paymentMethod: 'Bank Transfer',
      paymentTerms: '',
      paidAmount: 0,
      purchaseStatus: 'Ordered',
      notes: '',
    });
    setEditingPurchase(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (po: PurchaseOrder) => {
    setFormData({
      purchaseNo: po.purchaseNo,
      purchaseInvoiceNo: po.purchaseInvoiceNo || '',
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      purchaseDate: po.purchaseDate,
      dueDate: po.dueDate,
      items: JSON.parse(JSON.stringify(po.items)),
      withGst: po.withGst !== undefined ? po.withGst : po.tax > 0,
      gstType: po.gstType || 'intra_state',
      shipping: po.shipping,
      otherCharges: po.otherCharges,
      paymentMethod: po.paymentMethod,
      paymentTerms: po.paymentTerms,
      paidAmount: po.paidAmount,
      purchaseStatus: po.purchaseStatus,
      notes: po.notes || '',
    });
    setEditingPurchase(po);
    setIsFormModalOpen(true);
  };

  // Duplicate Purchase Bill
  const handleDuplicatePurchase = (po: PurchaseOrder) => {
    const nextPoNo = `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const duplicate: PurchaseOrder = {
      ...po,
      id: `po_${Date.now()}`,
      purchaseNo: nextPoNo,
      purchaseInvoiceNo: po.purchaseInvoiceNo ? `${po.purchaseInvoiceNo}-COPY` : '',
      purchaseStatus: 'Draft',
      paymentStatus: 'Unpaid',
      paidAmount: 0,
      balance: po.grandTotal,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: po.items.map((it) => ({
        ...it,
        id: `po_item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      })),
    };
    savePurchase(duplicate);
    toast.success(`Purchase bill duplicated as ${nextPoNo}`);
  };

  // Convert Purchase to Purchase Return
  const handleConvertToReturn = (po: PurchaseOrder) => {
    const returnNo = `PR-RET-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
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

    const newReturn: PurchaseReturn = {
      id: `pret_${Date.now()}`,
      returnNo,
      purchaseNo: po.purchaseNo,
      purchaseId: po.id,
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      returnDate: new Date().toISOString().split('T')[0],
      items: returnItems,
      returnAmount: po.grandTotal,
      refundStatus: 'Pending',
      returnStatus: 'Requested',
      notes: `Generated return from Purchase Bill ${po.purchaseNo}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    savePurchaseReturn(newReturn);
    toast.success(`Purchase return ${returnNo} created from bill ${po.purchaseNo}!`);
    navigate('/sale-management/purchase/return');
  };

  const handleSupplierChange = (supId: string) => {
    const sup = suppliers.find((s) => s.id === supId);
    if (sup) {
      setFormData((prev) => ({
        ...prev,
        supplierId: sup.id,
        supplierName: sup.name,
        paymentTerms: sup.paymentTerms || prev.paymentTerms,
      }));
    }
  };

  const handleToggleWithGst = (enableGst: boolean) => {
    setFormData((prev) => {
      const updatedItems = prev.items.map((it) => {
        const sub = (it.quantity || 1) * (it.purchasePrice || 0);
        const disc = it.discountAmount !== undefined && it.discountAmount > 0
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

  const handleItemProductChange = (index: number, prodId: string) => {
    const stk = stocks.find((s) => s.productId === prodId);
    if (!stk) return;

    setFormData((prev) => {
      const copy = [...prev.items];
      const item = { ...copy[index] };
      item.productId = stk.productId;
      item.productName = stk.productName;
      item.purchasePrice = stk.unitCost;
      item.unit = stk.unit || item.unit || 'NONE';
      if (!item.batch) {
        item.batch = `BAT-${stk.sku.replace('SKU-', '')}-${new Date().getFullYear()}`;
      }
      const sub = item.quantity * stk.unitCost;
      const disc = item.discountAmount !== undefined && item.discountAmount > 0
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
      const disc = current.discountAmount !== undefined && current.discountAmount > 0
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
    const defaultStock = stocks[0] || {
      productId: 'PROD_2',
      productName: 'POS Billing Terminal Kit',
      unitCost: 12500,
    };
    const newItem: PurchaseProductItem = {
      id: `po_it_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      productId: defaultStock.productId,
      productName: defaultStock.productName,
      batch: `BAT-SUP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      quantity: 1,
      unit: 'NONE',
      purchasePrice: defaultStock.unitCost,
      discountPercent: 0,
      discountAmount: 0,
      taxPercent: 18,
      total: formData.withGst ? defaultStock.unitCost * 1.18 : defaultStock.unitCost,
    };
    setFormData((prev) => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const handleRemoveItemRow = (index: number) => {
    if (formData.items.length <= 1) {
      toast.error('Purchase order must have at least one product.');
      return;
    }
    setFormData((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  // Calculations
  const calculatedTotals = useMemo(() => {
    const subtotal = formData.items.reduce((acc, it) => acc + (it.quantity || 0) * (it.purchasePrice || 0), 0);
    const discount = formData.items.reduce((acc, it) => {
      const sub = (it.quantity || 0) * (it.purchasePrice || 0);
      return acc + (it.discountAmount !== undefined && it.discountAmount > 0 ? it.discountAmount : sub * ((it.discountPercent || 0) / 100));
    }, 0);
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
    const grandTotal = Math.round((subtotal - discount + tax + shipping + other) * 100) / 100;
    const paid = Math.min(grandTotal, Number(formData.paidAmount) || 0);
    const balance = Math.max(0, grandTotal - paid);

    return {
      subtotal,
      discount,
      tax,
      cgst,
      sgst,
      igst,
      grandTotal,
      paid,
      balance,
    };
  }, [formData]);

  const handleSavePurchase = (status: PurchaseStatus = 'Ordered') => {
    if (!formData.supplierId) {
      toast.error('Please select a supplier.');
      return;
    }
    if (formData.items.length === 0) {
      toast.error('Please add at least one product.');
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

    const payload: PurchaseOrder = {
      id: editingPurchase ? editingPurchase.id : `po_${Date.now()}`,
      purchaseNo: formData.purchaseNo,
      purchaseInvoiceNo: formData.purchaseInvoiceNo,
      supplierId: formData.supplierId,
      supplierName: formData.supplierName,
      purchaseDate: formData.purchaseDate,
      dueDate: formData.dueDate,
      items: formData.items,
      subtotal: calculatedTotals.subtotal,
      discount: calculatedTotals.discount,
      tax: calculatedTotals.tax,
      withGst: formData.withGst,
      gstType: formData.gstType,
      cgst: calculatedTotals.cgst,
      sgst: calculatedTotals.sgst,
      igst: calculatedTotals.igst,
      shipping: formData.shipping,
      otherCharges: formData.otherCharges,
      grandTotal: calculatedTotals.grandTotal,
      paidAmount: finalPaid,
      balance: finalBalance,
      paymentMethod: formData.paymentMethod,
      paymentTerms: formData.paymentTerms,
      paymentStatus: finalPaymentStatus,
      purchaseStatus: editingPurchase ? editingPurchase.purchaseStatus : status,
      notes: formData.notes,
      createdAt: editingPurchase ? editingPurchase.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    savePurchase(payload);
    toast.success(
      editingPurchase
        ? `Purchase ${payload.purchaseNo} updated.`
        : `Purchase ${payload.purchaseNo} created successfully!`
    );
    setIsFormModalOpen(false);
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
    toast.success(`Payment of $${recordAmount.toLocaleString()} recorded for ${selectedPurchase.purchaseNo}`);
    setIsPaymentModalOpen(false);
  };

  // Filtered Purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const q = appliedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.purchaseNo.toLowerCase().includes(q) ||
        (p.purchaseInvoiceNo || '').toLowerCase().includes(q) ||
        p.supplierName.toLowerCase().includes(q) ||
        p.items.some((it) => it.productName.toLowerCase().includes(q));

      const matchesPurchaseStatus =
        appliedPurchaseStatus === 'All' ||
        p.purchaseStatus.toLowerCase() === appliedPurchaseStatus.toLowerCase();

      const matchesPaymentStatus =
        appliedPaymentStatus === 'All' ||
        p.paymentStatus.toLowerCase() === appliedPaymentStatus.toLowerCase();

      const matchesSupplier =
        appliedSupplier === 'All' || p.supplierId === appliedSupplier;

      return matchesSearch && matchesPurchaseStatus && matchesPaymentStatus && matchesSupplier;
    });
  }, [purchases, appliedSearch, appliedPurchaseStatus, appliedPaymentStatus, appliedSupplier]);

  const totalPages = Math.ceil(filteredPurchases.length / pageSize) || 1;
  const paginatedPurchases = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPurchases.slice(start, start + pageSize);
  }, [filteredPurchases, currentPage, pageSize]);

  // Export Purchases to Excel
  const handleExportExcel = () => {
    if (filteredPurchases.length === 0) {
      toast.error('No purchase records available to export.');
      return;
    }

    const excelRows = filteredPurchases.map((p, idx) => ({
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
      subtitle: `Total Purchase Orders: ${filteredPurchases.length} | Generated: ${new Date().toLocaleDateString('en-IN')}`,
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
        purchaseNo: `${filteredPurchases.length} Bills`,
        grandTotal: totalGrand,
        paidAmount: totalPaid,
        balance: totalBal,
      },
    });

    toast.success(`Purchase Bills Excel report downloaded (${filteredPurchases.length} records)!`);
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
            <div className="space-y-6 text-xs sm:text-sm">
              {/* Supplier & Header Config in 3-column rows */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Select Supplier <span className="text-slate-500">*</span>
                  </label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => handleSupplierChange(e.target.value)}
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer"
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.supplierCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Purchase Order No
                  </label>
                  <input
                    type="text"
                    value={formData.purchaseNo}
                    onChange={(e) => setFormData((prev) => ({ ...prev, purchaseNo: e.target.value }))}
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-bold text-[#33077C] outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Supplier Bill / Invoice #
                  </label>
                  <input
                    type="text"
                    value={formData.purchaseInvoiceNo}
                    onChange={(e) => setFormData((prev) => ({ ...prev, purchaseInvoiceNo: e.target.value }))}
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Purchase Date <span className="text-slate-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, purchaseDate: e.target.value }))}
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Payment Method
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData((prev) => ({ ...prev, paymentMethod: e.target.value as any }))}
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="Credit">Supplier Credit</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData((prev) => ({ ...prev, paymentTerms: e.target.value }))}
                    placeholder="Net 30 Days"
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                </div>
              </div>

              {/* GST & Tax Configuration Bar */}
              <div className="bg-gradient-to-r from-purple-50/70 via-indigo-50/40 to-slate-50 border border-purple-100/80 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#33077C] flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-[#4309A2]" />
                      Taxation &amp; GST Configuration
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Choose whether this purchase invoice includes GST, and configure Intra-State (CGST + SGST) or Inter-State (IGST)
                    </p>
                  </div>

                  {/* With GST vs Without GST Toggle */}
                  <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl self-start sm:self-auto shadow-2xs">
                    <button
                      type="button"
                      onClick={() => handleToggleWithGst(true)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        formData.withGst
                          ? 'bg-[#33077C] text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${formData.withGst ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                      With GST
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleWithGst(false)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        !formData.withGst
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${!formData.withGst ? 'bg-white' : 'bg-slate-300'}`} />
                      Without GST
                    </button>
                  </div>
                </div>

                {/* GST Type Selection (Intra-State vs Inter-State) */}
                {formData.withGst ? (
                  <div className="pt-2.5 border-t border-purple-100/60 flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-700">GST Breakdown Type:</span>
                      <span className="text-xs text-slate-500">
                        {formData.gstType === 'intra_state'
                          ? '(Split 50% CGST + 50% SGST for same-state supplier)'
                          : '(Single 100% IGST for interstate supplier)'}
                      </span>
                    </div>
                    <div className="inline-flex rounded-lg border border-purple-200 bg-white p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handleSetGstType('intra_state')}
                        className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                          formData.gstType === 'intra_state'
                            ? 'bg-purple-100 text-[#33077C]'
                            : 'text-slate-600 hover:text-[#33077C]'
                        }`}
                      >
                        Intra-State (CGST + SGST)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetGstType('inter_state')}
                        className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                          formData.gstType === 'inter_state'
                            ? 'bg-purple-100 text-[#33077C]'
                            : 'text-slate-600 hover:text-[#33077C]'
                        }`}
                      >
                        Inter-State (IGST)
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

              {/* Product Items Table Matching Reference Image 2 */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <div className="overflow-x-auto max-w-full">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/90 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200 tracking-wider select-none">
                        <th className="py-2.5 px-2.5 text-center border-r border-slate-200 w-10 text-slate-400 font-extrabold">#</th>
                        <th className="py-2.5 px-3 text-left border-r border-slate-200 min-w-[220px]">ITEM</th>
                        <th className="py-2.5 px-2 text-center border-r border-slate-200 w-20">QTY</th>
                        <th className="py-2.5 px-2 text-center border-r border-slate-200 w-24">UNIT</th>
                        <th className="py-2.5 px-3 text-right border-r border-slate-200 w-36">
                          <div>PRICE/UNIT</div>
                          <div className="mt-0.5">
                            <select
                              value={priceTaxMode}
                              onChange={(e) => setPriceTaxMode(e.target.value as any)}
                              className="text-[10px] text-slate-500 font-normal bg-transparent border-0 outline-none cursor-pointer p-0"
                            >
                              <option value="Without Tax">Without Tax</option>
                              <option value="With Tax">With Tax</option>
                            </select>
                          </div>
                        </th>
                        <th colSpan={2} className="py-2 px-2 text-center border-r border-slate-200 w-36">
                          <div className="text-[10.5px]">DISCOUNT</div>
                          <div className="grid grid-cols-2 text-[9.5px] text-slate-400 font-semibold mt-0.5 border-t border-slate-200 pt-1">
                            <span>%</span>
                            <span className="text-right pr-1">AMOUNT</span>
                          </div>
                        </th>
                        <th colSpan={2} className="py-2 px-2 text-center border-r border-slate-200 w-40">
                          <div className="text-[10.5px]">TAX</div>
                          <div className="grid grid-cols-2 text-[9.5px] text-slate-400 font-semibold mt-0.5 border-t border-slate-200 pt-1">
                            <span>%</span>
                            <span className="text-right pr-1">AMOUNT</span>
                          </div>
                        </th>
                        <th className="py-2.5 px-3 text-right border-r border-slate-200 w-32">
                          AMOUNT
                        </th>
                        <th className="py-2.5 px-2 text-center w-10 text-slate-400"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {formData.items.map((it, idx) => {
                        const itemSub = (it.quantity || 1) * (it.purchasePrice || 0);
                        const itemDisc = it.discountAmount !== undefined && it.discountAmount > 0
                          ? it.discountAmount
                          : itemSub * ((it.discountPercent || 0) / 100);
                        const itemTaxable = Math.max(0, itemSub - itemDisc);
                        const itemTaxAmt = formData.withGst ? itemTaxable * ((it.taxPercent || 0) / 100) : 0;

                        return (
                          <tr key={it.id || idx} className="hover:bg-purple-50/20 transition-colors group">
                            {/* 1. Row Number */}
                            <td className="py-2 px-2 text-center font-bold text-slate-500 border-r border-slate-200 bg-slate-50/30">
                              {idx + 1}
                            </td>

                            {/* 2. ITEM Selection with SearchableSelect */}
                            <td className="p-1.5 border-r border-slate-200">
                              <SearchableSelect
                                value={it.productId}
                                onChange={(val) => handleItemProductChange(idx, val)}
                                options={stockOptions}
                                placeholder="Select Product item..."
                                searchPlaceholder="Search product by name or SKU..."
                                size="sm"
                              />
                            </td>

                            {/* 3. QTY */}
                            <td className="p-1.5 border-r border-slate-200">
                              <input
                                type="number"
                                min="1"
                                value={it.quantity === 0 ? '' : it.quantity}
                                onChange={(e) => handleItemFieldChange(idx, 'quantity', Number(e.target.value))}
                                className="w-full h-8 px-2 text-center bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-[#33077C] rounded-lg text-xs font-semibold text-slate-800 outline-none transition-colors"
                              />
                            </td>

                            {/* 4. UNIT */}
                            <td className="p-1.5 border-r border-slate-200">
                              <select
                                value={it.unit || 'NONE'}
                                onChange={(e) => handleItemFieldChange(idx, 'unit', e.target.value)}
                                className="w-full h-8 px-1 text-center bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-[#33077C] rounded-lg text-xs font-semibold text-slate-700 outline-none cursor-pointer uppercase transition-colors"
                              >
                                {UNIT_OPTIONS.map((u) => (
                                  <option key={u} value={u}>
                                    {u}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* 5. PRICE/UNIT */}
                            <td className="p-1.5 border-r border-slate-200">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={it.purchasePrice === 0 ? '' : it.purchasePrice}
                                placeholder="0.00"
                                onChange={(e) => handleItemFieldChange(idx, 'purchasePrice', Number(e.target.value))}
                                className="w-full h-8 px-2 text-right bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-[#33077C] rounded-lg text-xs font-semibold text-slate-800 outline-none transition-colors"
                              />
                            </td>

                            {/* 6. DISCOUNT % */}
                            <td className="p-1.5 border-r border-slate-200 w-16">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={it.discountPercent === 0 ? '' : it.discountPercent}
                                placeholder="0"
                                onChange={(e) => handleItemFieldChange(idx, 'discountPercent', Number(e.target.value))}
                                className="w-full h-8 px-1.5 text-center bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-[#33077C] rounded-lg text-xs font-medium text-slate-700 outline-none transition-colors"
                              />
                            </td>

                            {/* 7. DISCOUNT AMOUNT */}
                            <td className="p-1.5 border-r border-slate-200 w-20">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={it.discountAmount === 0 || !it.discountAmount ? '' : it.discountAmount}
                                placeholder="0.00"
                                onChange={(e) => handleItemFieldChange(idx, 'discountAmount', Number(e.target.value))}
                                className="w-full h-8 px-1.5 text-right bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-[#33077C] rounded-lg text-xs font-medium text-slate-700 outline-none transition-colors"
                              />
                            </td>

                            {/* 8. TAX % */}
                            <td className="p-1.5 border-r border-slate-200 w-24">
                              <select
                                disabled={!formData.withGst}
                                value={formData.withGst ? it.taxPercent : 0}
                                onChange={(e) => handleItemFieldChange(idx, 'taxPercent', Number(e.target.value))}
                                className={`w-full h-8 px-1 text-center border border-transparent focus:border-[#33077C] rounded-lg text-xs font-medium outline-none transition-colors ${
                                  formData.withGst
                                    ? 'bg-transparent hover:bg-slate-50 focus:bg-white text-slate-700 cursor-pointer'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                }`}
                              >
                                {TAX_RATE_OPTIONS.map((t) => (
                                  <option key={t.label} value={t.rate}>
                                    {t.rate}%
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* 9. TAX AMOUNT */}
                            <td className="p-1.5 border-r border-slate-200 w-20 text-right pr-2.5 font-medium text-slate-700">
                              {itemTaxAmt > 0 ? itemTaxAmt.toFixed(2) : '0.00'}
                            </td>

                            {/* 10. AMOUNT (ROW TOTAL) */}
                            <td className="p-1.5 border-r border-slate-200 text-right pr-3 font-bold text-slate-900">
                              ₹{(it.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>

                            {/* 11. DELETE ACTION */}
                            <td className="p-1 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItemRow(idx)}
                                className="p-1 text-slate-300 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                title="Delete row"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    {/* Table Footer: ADD ROW + Column totals */}
                    <tfoot>
                      <tr className="bg-slate-50/90 border-t border-slate-200 font-bold text-slate-800 text-xs">
                        <td colSpan={2} className="py-2.5 px-3 border-r border-slate-200">
                          <button
                            type="button"
                            onClick={handleAddItemRow}
                            className="px-3.5 py-1.5 rounded-lg border border-[#33077C] text-[#33077C] hover:bg-purple-50 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                            <span>ADD ROW</span>
                          </button>
                        </td>

                        {/* Total QTY */}
                        <td className="py-2.5 px-2 text-center border-r border-slate-200 font-extrabold text-[#33077C]">
                          {formData.items.reduce((sum, it) => sum + (it.quantity || 0), 0)}
                        </td>

                        {/* Total Label */}
                        <td className="py-2.5 px-2 text-center border-r border-slate-200 text-slate-500 uppercase text-[11px]">
                          TOTAL
                        </td>

                        {/* Price placeholder */}
                        <td className="border-r border-slate-200"></td>

                        {/* Discount total */}
                        <td className="border-r border-slate-200"></td>
                        <td className="py-2.5 px-2 text-right border-r border-slate-200 pr-2.5 font-semibold text-slate-700">
                          {calculatedTotals.discount > 0 ? calculatedTotals.discount.toFixed(2) : '0.00'}
                        </td>

                        {/* Tax total */}
                        <td className="border-r border-slate-200"></td>
                        <td className="py-2.5 px-2 text-right border-r border-slate-200 pr-2.5 font-semibold text-slate-700">
                          {calculatedTotals.tax > 0 ? calculatedTotals.tax.toFixed(2) : '0.00'}
                        </td>

                        {/* Line Amount Total */}
                        <td className="py-2.5 px-3 text-right border-r border-slate-200 font-extrabold text-[#33077C]">
                          ₹{(calculatedTotals.subtotal - calculatedTotals.discount + calculatedTotals.tax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Additional Charges & Financial Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Notes / Instructions
                  </label>
                  <textarea
                    rows={6}
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Carrier instructions, delivery address..."
                    className="w-full p-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all resize-none"
                  />
                </div>

                <div className="bg-purple-50/40 p-5 rounded-xl border border-purple-100 space-y-2.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal (Base Value):</span>
                    <span className="font-semibold text-slate-900">₹{calculatedTotals.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>Total Discount:</span>
                    <span>-₹{calculatedTotals.discount.toLocaleString('en-IN')}</span>
                  </div>

                  {/* Detailed Tax Breakdown based on withGst and gstType */}
                  {!formData.withGst ? (
                    <div className="flex justify-between text-amber-700 font-medium py-1.5 px-3 bg-amber-50/80 rounded-lg border border-amber-200/60">
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5" />
                        Tax (Without GST / Exempt):
                      </span>
                      <span>₹0.00 (0%)</span>
                    </div>
                  ) : formData.gstType === 'intra_state' ? (
                    <div className="space-y-1.5 py-2 px-3 bg-purple-100/40 rounded-lg border border-purple-200/50">
                      <div className="flex justify-between text-xs text-purple-900 font-medium">
                        <span>CGST (Central Tax - 50%):</span>
                        <span className="font-bold">+₹{calculatedTotals.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-xs text-purple-900 font-medium">
                        <span>SGST (State Tax - 50%):</span>
                        <span className="font-bold">+₹{calculatedTotals.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 pt-1.5 border-t border-purple-200/60 font-medium">
                        <span>Total GST Amount:</span>
                        <span className="font-bold text-[#33077C]">+₹{calculatedTotals.tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 py-2 px-3 bg-indigo-50/60 rounded-lg border border-indigo-200/60">
                      <div className="flex justify-between text-xs text-indigo-900 font-medium">
                        <span>IGST (Integrated Inter-State Tax):</span>
                        <span className="font-bold">+₹{calculatedTotals.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 pt-1.5 border-t border-indigo-200/60 font-medium">
                        <span>Total GST Amount:</span>
                        <span className="font-bold text-indigo-950">+₹{calculatedTotals.tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                    <span className="text-slate-600 font-medium">Freight / Shipping:</span>
                    <input
                      type="number"
                      min="0"
                      value={formData.shipping}
                      onChange={(e) => setFormData((prev) => ({ ...prev, shipping: Number(e.target.value) }))}
                      className="w-28 h-9 text-right px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                    />
                  </div>

                  <div className="border-t border-purple-200 pt-2.5 flex justify-between font-bold text-base text-purple-900">
                    <span>Grand Total:</span>
                    <span>₹{calculatedTotals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="font-semibold text-emerald-700">Paid to Supplier:</span>
                    <input
                      type="number"
                      min="0"
                      max={calculatedTotals.grandTotal}
                      value={formData.paidAmount}
                      onChange={(e) => setFormData((prev) => ({ ...prev, paidAmount: Number(e.target.value) }))}
                      className="w-28 h-9 text-right px-2.5 bg-white border border-emerald-300 rounded-lg font-bold text-emerald-700 text-xs"
                    />
                  </div>

                  <div className="flex justify-between font-bold pt-2 border-t border-purple-100 text-sm">
                    <span>Balance Payable:</span>
                    <span className={calculatedTotals.balance > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                      ₹{calculatedTotals.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-6 flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="h-11 px-5 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4 text-slate-500" />
                  <span>Cancel</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSavePurchase('Completed')}
                  className="h-11 px-6 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>{editingPurchase ? 'Save Changes' : 'Save Purchase Bill'}</span>
                </button>
              </div>
            </div>
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
              Purchase Orders & Bills
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Execute supplier purchases, manage stock receipts, and disburse vendor payments
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
          setAppliedSearch(pendingSearch);
          setAppliedPurchaseStatus(pendingPurchaseStatus);
          setAppliedPaymentStatus(pendingPaymentStatus);
          setAppliedSupplier(pendingSupplier);
          setCurrentPage(1);
        }}
        onReset={() => {
          setPendingSearch('');
          setAppliedSearch('');
          setPendingPurchaseStatus('All');
          setAppliedPurchaseStatus('All');
          setPendingPaymentStatus('All');
          setAppliedPaymentStatus('All');
          setPendingSupplier('All');
          setAppliedSupplier('All');
          setCurrentPage(1);
        }}
        filterSlot={
          <div className="flex items-center gap-2.5 flex-wrap">
            <FilterDropdown
              placeholder="Purchase Status : All"
              value={pendingPurchaseStatus}
              onChange={(val) => setPendingPurchaseStatus(val)}
              options={[
                { label: 'Purchase Status : All', value: 'All' },
                { label: 'Draft', value: 'Draft', dotColor: '#64748b' },
                { label: 'Ordered', value: 'Ordered', dotColor: '#3b82f6' },
                { label: 'Received', value: 'Received', dotColor: '#10b981' },
                { label: 'Completed', value: 'Completed', dotColor: '#10b981' },
                { label: 'Cancelled', value: 'Cancelled', dotColor: '#ef4444' },
              ]}
            />

            <FilterDropdown
              placeholder="Payment Status : All"
              value={pendingPaymentStatus}
              onChange={(val) => setPendingPaymentStatus(val)}
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
              onChange={(val) => setPendingSupplier(val)}
              options={[
                { label: 'Supplier : All', value: 'All' },
                ...suppliers.map((s) => ({ label: s.name, value: s.id })),
              ]}
            />
          </div>
        }
        rightSlot={
          <div className="flex items-center gap-3 pr-1">
            <span className="text-xs font-semibold text-slate-500">
              Total Purchases :{' '}
              <span className="text-[#33077C] font-bold">{filteredPurchases.length}</span>
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
              {paginatedPurchases.length === 0 ? (
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
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            po.paymentStatus === 'Paid'
                              ? 'bg-emerald-50/90 text-emerald-700 border border-emerald-300/80'
                              : po.paymentStatus === 'Partial'
                              ? 'bg-amber-50/90 text-amber-700 border border-amber-300/80'
                              : 'bg-rose-50/90 text-rose-700 border border-rose-300/80'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              po.paymentStatus === 'Paid'
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
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            po.purchaseStatus === 'Completed' || po.purchaseStatus === 'Received'
                              ? 'bg-emerald-50/90 text-emerald-700 border border-emerald-300/80'
                              : po.purchaseStatus === 'Ordered'
                              ? 'bg-purple-50/90 text-[#33077C] border border-[#33077C]/30'
                              : po.purchaseStatus === 'Cancelled'
                              ? 'bg-rose-50/90 text-rose-700 border border-rose-300/80'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              po.purchaseStatus === 'Completed' || po.purchaseStatus === 'Received'
                                ? 'bg-emerald-500'
                                : po.purchaseStatus === 'Ordered'
                                ? 'bg-[#33077C]'
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
                          {/* Print Action */}
                          <button
                            type="button"
                            title="Print Purchase Bill"
                            onClick={() => {
                              toast.info(`Preparing print for ${po.purchaseNo}...`);
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
                              title="Share Purchase Bill"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activeShareId === po.id) {
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
                                  setActiveShareId(po.id);
                                }
                              }}
                              className="w-8 h-8 rounded-lg bg-transparent hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            >
                              <Forward className="w-4 h-4" />
                            </button>

                            {activeShareId === po.id && sharePos && (
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
                                      const subject = encodeURIComponent(`Purchase Bill: ${po.purchaseNo}`);
                                      const body = encodeURIComponent(
                                        `Purchase Order / Bill: ${po.purchaseNo}\nSupplier: ${po.supplierName}\nDate: ${po.purchaseDate}\nTotal Amount: ₹${po.grandTotal.toLocaleString('en-IN')}\nPayment Status: ${po.paymentStatus}\nStatus: ${po.purchaseStatus}`
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
                                        `*Purchase Bill: ${po.purchaseNo}*\n*Supplier:* ${po.supplierName}\n*Date:* ${po.purchaseDate}\n*Grand Total:* ₹${po.grandTotal.toLocaleString('en-IN')}\n*Payment Status:* ${po.paymentStatus}\n*Status:* ${po.purchaseStatus}`
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
                                        `Purchase Bill ${po.purchaseNo} from ${po.supplierName}, Amount: ₹${po.grandTotal.toLocaleString('en-IN')}, Status: ${po.purchaseStatus}`
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

                                {/* 2. Duplicate */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    handleDuplicatePurchase(po);
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
                                    if (window.confirm(`Are you sure you want to delete purchase bill ${po.purchaseNo}?`)) {
                                      deletePurchase(po.id);
                                      toast.success(`Purchase bill ${po.purchaseNo} deleted.`);
                                    }
                                  }}
                                  className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
                                >
                                  Delete
                                </button>

                                {/* 4. Open PDF */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    toast.info(`Opening PDF for ${po.purchaseNo}...`);
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
                                    setSelectedPurchase(po);
                                    setIsDetailModalOpen(true);
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
                                    toast.info(`Preparing print for ${po.purchaseNo}...`);
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
                                    toast.info(`Purchase Bill ${po.purchaseNo} created on ${po.purchaseDate} for supplier ${po.supplierName}. Status: ${po.purchaseStatus}, Payment: ${po.paymentStatus}.`);
                                  }}
                                  className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
                                >
                                  View History
                                </button>

                                {/* 8. Convert to Return */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    handleConvertToReturn(po);
                                  }}
                                  className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
                                >
                                  Convert to Return
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

      {/* Pagination */}
      {filteredPurchases.length > 0 && (
        <Pagination
          currentPage={currentPage}
          total={filteredPurchases.length}
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
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  selectedPurchase.withGst !== false
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
                <table className="w-full text-left min-w-[580px]">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3 text-center">Batch No</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Cost</th>
                      <th className="py-2.5 px-3 text-center">Disc</th>
                      <th className="py-2.5 px-3 text-center">Tax</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedPurchase.items.map((it) => (
                      <tr key={it.id}>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          <div>{it.productName}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {it.batch ? (
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 text-[#33077C] font-mono font-bold text-[10px] border border-purple-200">
                              <span>{it.batch}</span>
                              {it.expDate && <span className="text-slate-400 font-normal">| Exp: {it.expDate}</span>}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-normal">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-purple-900">{it.quantity}</td>
                        <td className="py-2.5 px-3 text-right">₹{it.purchasePrice.toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 text-center">{it.discountPercent}%</td>
                        <td className="py-2.5 px-3 text-center">{selectedPurchase.withGst !== false ? `${it.taxPercent}%` : '0%'}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          ₹{it.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
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
                onClick={() => setIsDetailModalOpen(false)}
                className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4 text-slate-500" />
                <span>Close</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  navigate('/sale-management/purchase/return');
                }}
                className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Create Purchase Return</span>
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
          <div className="space-y-4 p-2 sm:p-4 text-xs">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Disbursed Amount (₹) <span className="text-slate-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedPurchase.balance}
                  value={recordAmount}
                  onChange={(e) => setRecordAmount(Number(e.target.value))}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-bold text-emerald-600 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Payment Mode <span className="text-slate-500">*</span>
                </label>
                <select
                  value={recordMethod}
                  onChange={(e) => setRecordMethod(e.target.value as any)}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer"
                >
                  <option value="Bank Transfer">Bank Transfer / NEFT / RTGS</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Corporate Card</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Remarks / Transaction Ref
                </label>
                <input
                  type="text"
                  value={recordNotes}
                  onChange={(e) => setRecordNotes(e.target.value)}
                  placeholder="Bank UTR, Cheque..."
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
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
                type="button"
                onClick={handleConfirmPayment}
                className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Confirm Payment</span>
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
