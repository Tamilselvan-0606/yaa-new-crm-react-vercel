import React, { useState, useMemo, useEffect } from 'react';
import {
  FilePlus,
  Plus,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  User,
  Building2,
  Calendar,
  Layers,
  ShoppingBag,
  ArrowRight,
  Trash2,
  AlertTriangle,
  MoreVertical,
  Check,
  Ban,
  X,
  Printer,
  Forward,
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
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { Pagination } from '../../../components/common/Pagination';
import { SearchBar } from '../../../components/common/SearchBar';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { exportTableToExcel } from '../../../utils/excelExport';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export const PurchaseRequestView: React.FC = () => {
  const navigate = useNavigate();
  const {
    purchaseRequests,
    stocks,
    suppliers,
    savePurchaseRequest,
    deletePurchaseRequest,
    updatePurchaseRequestStatus,
    savePurchase,
  } = useSalesManagementStore();

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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<PurchaseRequest | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);

  // Rejection Modal
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [targetActionRequest, setTargetActionRequest] = useState<PurchaseRequest | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    requestNo: string;
    requestDate: string;
    requestedBy: string;
    department: string;
    requiredDate: string;
    priority: PurchaseRequestPriority;
    notes: string;
    items: PurchaseRequestItem[];
  }>({
    requestNo: '',
    requestDate: new Date().toISOString().split('T')[0],
    requestedBy: 'Sarah Jenkins',
    department: 'Operations',
    requiredDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    priority: 'Medium',
    notes: '',
    items: [],
  });

  // Summary Metrics
  const summary = useMemo(() => {
    const totalCount = purchaseRequests.length;
    const draftCount = purchaseRequests.filter((r) => r.status === 'Draft').length;
    const pendingCount = purchaseRequests.filter((r) => r.status === 'Pending Approval' || r.status === 'Submitted').length;
    const approvedCount = purchaseRequests.filter((r) => r.status === 'Approved').length;
    const rejectedCount = purchaseRequests.filter((r) => r.status === 'Rejected').length;
    const completedCount = purchaseRequests.filter((r) => r.status === 'Completed' || r.status === 'Purchase Created').length;

    return {
      totalCount,
      draftCount,
      pendingCount,
      approvedCount,
      rejectedCount,
      completedCount,
    };
  }, [purchaseRequests]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    const nextReqNo = `PR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const defaultStock = stocks[0] || {
      productId: 'PROD_2',
      productName: 'POS Billing Terminal Kit',
      inStock: 14,
      unitCost: 12500,
    };

    const initialItem: PurchaseRequestItem = {
      id: `pr_item_${Date.now()}`,
      productId: defaultStock.productId,
      productName: defaultStock.productName,
      currentStock: defaultStock.inStock,
      requestedQuantity: 1,
      estimatedUnitPrice: defaultStock.unitCost,
      requiredDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      remarks: '',
    };

    setEditingRequest(null);
    setFormData({
      requestNo: nextReqNo,
      requestDate: new Date().toISOString().split('T')[0],
      requestedBy: '',
      department: 'Operations',
      requiredDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      priority: 'Medium',
      notes: '',
      items: [initialItem],
    });
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (req: PurchaseRequest) => {
    setEditingRequest(req);
    setFormData({
      requestNo: req.requestNo,
      requestDate: req.requestDate || new Date().toISOString().split('T')[0],
      requestedBy: req.requestedBy || '',
      department: req.department || 'Operations',
      requiredDate: req.requiredDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      priority: req.priority || 'Medium',
      notes: req.notes || '',
      items: req.items && req.items.length > 0 ? req.items : [
        {
          id: `pr_item_${Date.now()}`,
          productId: stocks[0]?.productId || 'PROD_1',
          productName: stocks[0]?.productName || 'Default Item',
          currentStock: stocks[0]?.inStock || 0,
          requestedQuantity: 1,
          estimatedUnitPrice: stocks[0]?.unitCost || 0,
          requiredDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          remarks: '',
        }
      ],
    });
    setIsCreateModalOpen(true);
  };

  // Duplicate Request
  const handleDuplicateRequest = (req: PurchaseRequest) => {
    const dupNo = `PR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const duplicate: PurchaseRequest = {
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
    };
    savePurchaseRequest(duplicate);
    toast.success(`Purchase request duplicated as ${dupNo}`);
  };

  const handleProductChange = (index: number, prodId: string) => {
    const targetStock = stocks.find((s) => s.productId === prodId);
    if (!targetStock) return;

    setFormData((prev) => {
      const copy = [...prev.items];
      copy[index].productId = targetStock.productId;
      copy[index].productName = targetStock.productName;
      copy[index].currentStock = targetStock.inStock;
      copy[index].estimatedUnitPrice = targetStock.unitCost;
      return { ...prev, items: copy };
    });
  };

  const handleItemFieldChange = (index: number, field: keyof PurchaseRequestItem, val: any) => {
    setFormData((prev) => {
      const copy = [...prev.items];
      copy[index] = { ...copy[index], [field]: val };
      return { ...prev, items: copy };
    });
  };

  const handleAddItemRow = () => {
    const defaultStock = stocks[0] || {
      productId: 'PROD_2',
      productName: 'POS Billing Terminal Kit',
      inStock: 14,
      unitCost: 12500,
    };
    const newItem: PurchaseRequestItem = {
      id: `pr_item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      productId: defaultStock.productId,
      productName: defaultStock.productName,
      currentStock: defaultStock.inStock,
      requestedQuantity: 5,
      estimatedUnitPrice: defaultStock.unitCost,
      requiredDate: formData.requiredDate,
      remarks: '',
    };
    setFormData((prev) => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const handleRemoveItemRow = (index: number) => {
    if (formData.items.length <= 1) {
      toast.error('Purchase request must contain at least one item.');
      return;
    }
    setFormData((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const handleSaveRequest = (status: PurchaseRequestStatus = 'Pending Approval') => {
    if (formData.items.length === 0) {
      toast.error('Please add at least one item to request.');
      return;
    }
    const hasInvalidQty = formData.items.some((it) => !it.requestedQuantity || it.requestedQuantity <= 0);
    if (hasInvalidQty) {
      toast.error('Requested quantities must be greater than zero.');
      return;
    }

    const payload: PurchaseRequest = {
      id: editingRequest ? editingRequest.id : `pr_${Date.now()}`,
      requestNo: formData.requestNo,
      requestDate: formData.requestDate,
      requestedBy: formData.requestedBy,
      department: formData.department,
      requiredDate: formData.requiredDate,
      priority: formData.priority,
      status: editingRequest ? editingRequest.status : status,
      items: formData.items,
      notes: formData.notes,
      createdAt: editingRequest ? editingRequest.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    savePurchaseRequest(payload);
    toast.success(
      editingRequest
        ? `Purchase request ${payload.requestNo} updated successfully.`
        : `Purchase request ${payload.requestNo} created (${status}).`
    );
    setIsCreateModalOpen(false);
    setEditingRequest(null);
  };

  // Convert Approved Request directly to Purchase Order
  const handleConvertToPurchase = (req: PurchaseRequest) => {
    const targetSupplier = suppliers[0] || {
      id: 'sup_1',
      name: 'Apex Technologies Pvt Ltd',
      supplierCode: 'SUP-1001',
    };

    const subtotal = req.items.reduce((acc, it) => acc + (it.estimatedUnitPrice || 1000) * it.requestedQuantity, 0);
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
    updatePurchaseRequestStatus(req.id, 'Purchase Created');
    toast.success(`Purchase Order ${newPO.purchaseNo} drafted from ${req.requestNo}!`);
    navigate('/sale-management/purchase/purchase');
  };

  // Filtered Requests
  const filteredRequests = useMemo(() => {
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

  const totalPages = Math.ceil(filteredRequests.length / pageSize) || 1;
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  // Export Purchase Requests to Excel
  const handleExportExcel = () => {
    if (filteredRequests.length === 0) {
      toast.error('No purchase request records available to export.');
      return;
    }

    const excelRows = filteredRequests.map((r, idx) => {
      const itemsSummary = r.items.map((it) => `${it.productName} (Qty: ${it.requestedQuantity})`).join('; ');
      const totalEstimated = r.items.reduce((acc, it) => acc + (it.estimatedUnitPrice || 0) * (it.requestedQuantity || 0), 0);

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
      subtitle: `Total Requests: ${filteredRequests.length} | Generated: ${new Date().toLocaleDateString('en-IN')}`,
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
        requestNo: `${filteredRequests.length} Requests`,
        estimatedTotal: grandEstimated,
      },
    });

    toast.success(`Purchase Requests Excel report downloaded (${filteredRequests.length} records)!`);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
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
              onChange={(val) => setPendingPriority(val)}
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
              onChange={(val) => setPendingStatus(val)}
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
              <span className="text-[#33077C] font-bold">{filteredRequests.length}</span>
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
              {paginatedRequests.length === 0 ? (
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
                        {req.items[0]?.productName} ({req.items[0]?.requestedQuantity} units)
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
                        <div className="relative inline-block text-left share-popover-container">
                          <button
                            type="button"
                            title="Share Purchase Request"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeShareId === req.id) {
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
                                setActiveShareId(req.id);
                              }
                            }}
                            className="w-8 h-8 rounded-lg bg-transparent hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                          >
                            <Forward className="w-4 h-4" />
                          </button>

                          {activeShareId === req.id && sharePos && (
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
                                    const subject = encodeURIComponent(`Purchase Request: ${req.requestNo}`);
                                    const body = encodeURIComponent(
                                      `Purchase Request: ${req.requestNo}\nRequested By: ${req.requestedBy}\nDepartment: ${req.department}\nPriority: ${req.priority}\nStatus: ${req.status}\nItems: ${req.items.map(i => `${i.productName} (${i.requestedQuantity} qty)`).join(', ')}`
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
                                      `*Purchase Request: ${req.requestNo}*\n*Requested By:* ${req.requestedBy}\n*Department:* ${req.department}\n*Priority:* ${req.priority}\n*Status:* ${req.status}\n*Items:* ${req.items.map(i => `${i.productName} (${i.requestedQuantity})`).join(', ')}`
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
                                      `Purchase Request ${req.requestNo} by ${req.requestedBy}, Priority: ${req.priority}, Status: ${req.status}`
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
                                  if (window.confirm(`Are you sure you want to delete purchase request ${req.requestNo}?`)) {
                                    deletePurchaseRequest(req.id);
                                    toast.success(`Purchase request ${req.requestNo} deleted.`);
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
                                  toast.info(`Requisition ${req.requestNo} created on ${req.requestDate || 'recently'} by ${req.requestedBy || 'N/A'}. Status: ${req.status}.`);
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
                                className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
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
      {filteredRequests.length > 0 && (
        <Pagination
          total={filteredRequests.length}
          currentPage={currentPage}
          pageSize={pageSize}
          pageSizeOptions={[5, 10, 20, 50]}
          onPageChange={(newPage) => setCurrentPage(newPage)}
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
        subtitle={editingRequest ? 'Modify requisition details, items, or quantities' : 'Set requisition details, requested items, and priorities'}
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
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveRequest('Pending Approval');
          }}
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
                value={formData.requestNo}
                onChange={(e) => setFormData((prev) => ({ ...prev, requestNo: e.target.value }))}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                placeholder="REQ-2024-..."
              />
            </div>

            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Requested By <span className="text-slate-500">*</span>
              </label>
              <input
                type="text"
                value={formData.requestedBy}
                onChange={(e) => setFormData((prev) => ({ ...prev, requestedBy: e.target.value }))}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                placeholder="Requester name"
              />
            </div>

            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Department <span className="text-slate-500">*</span>
              </label>
              <select
                value={formData.department}
                onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer"
              >
                <option value="Operations">Operations</option>
                <option value="Logistics">Logistics</option>
                <option value="IT & Infrastructure">IT & Infrastructure</option>
                <option value="Marketing">Marketing</option>
                <option value="Sales">Sales</option>
              </select>
            </div>

            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Priority <span className="text-slate-500">*</span>
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value as PurchaseRequestPriority }))}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Business Justification / Notes
              </label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Why is this purchase required? Any preferred vendors?"
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
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
                {formData.items.map((it, idx) => (
                  <tr key={it.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3">
                      <select
                        value={it.productId}
                        onChange={(e) => handleProductChange(idx, e.target.value)}
                        className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-[#4309A2]"
                      >
                        {stocks.map((stk) => (
                          <option key={stk.productId} value={stk.productId}>
                            {stk.productName} ({stk.sku})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-600">{it.currentStock}</td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="1"
                        value={it.requestedQuantity}
                        onChange={(e) => handleItemFieldChange(idx, 'requestedQuantity', Number(e.target.value))}
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
              onClick={() => setIsCreateModalOpen(false)}
              className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4 text-slate-500" />
              <span>Cancel</span>
            </button>
            <button
              type="submit"
              className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Save</span>
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
                <div className="text-slate-500 mt-0.5 font-medium">Required By: {selectedRequest.requiredDate || 'N/A'}</div>
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
                      </tr>
                    ))}
                  </tbody>
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
                onClick={() => {
                  if (!rejectionReason.trim()) {
                    toast.error('Rejection reason is required.');
                    return;
                  }
                  updatePurchaseRequestStatus(targetActionRequest.id, 'Rejected', rejectionReason);
                  toast.success(`Request ${targetActionRequest.requestNo} rejected.`);
                  setRejectionModalOpen(false);
                }}
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
