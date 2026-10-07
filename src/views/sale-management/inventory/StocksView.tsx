import React, { useState, useMemo, useEffect } from 'react';
import {
  Layers,
  Plus,
  Search,
  Filter,
  Eye,
  Edit3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Package,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  MoreVertical,
  SlidersHorizontal,
  Check,
  X,
  Calendar,
  Tag,
  ShieldCheck,
  History,
  Boxes,
  FileText,
  Activity,
  Layers3,
  Printer,
  Forward,
  FileSpreadsheet,
} from 'lucide-react';
import {
  useSalesManagementStore,
  InventoryStockItem,
  StockBatch,
} from '../../../store/useSalesManagementStore';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { Pagination } from '../../../components/common/Pagination';
import { SearchBar } from '../../../components/common/SearchBar';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { exportTableToExcel } from '../../../utils/excelExport';
import { toast } from 'sonner';

export const StocksView: React.FC = () => {
  const {
    stocks,
    adjustStock,
    addStockBatch,
    updateStockItem,
    sales,
    purchases,
    purchaseReturns,
    salesReturns,
  } = useSalesManagementStore();

  // Search & Filter State
  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pendingCategory, setPendingCategory] = useState('All');
  const [appliedCategory, setAppliedCategory] = useState('All');
  const [pendingStatus, setPendingStatus] = useState('All');
  const [appliedStatus, setAppliedStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 3-Dots Action dropdown & Share Popover
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [activeShareId, setActiveShareId] = useState<string | null>(null);
  const [sharePos, setSharePos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  // Close action dropdown and share popover on click outside or scroll
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.stock-action-dropdown-container') && !target.closest('.stock-action-dropdown-menu')) {
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
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<InventoryStockItem | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'batches' | 'movements'>('overview');

  // Adjust Form State with Batch
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');
  const [adjustQty, setAdjustQty] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState('Purchase Restock');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [batchMode, setBatchMode] = useState<'existing' | 'new'>('existing');
  const [selectedBatchNo, setSelectedBatchNo] = useState<string>('');
  const [newBatchNo, setNewBatchNo] = useState<string>('');
  const [batchMfgDate, setBatchMfgDate] = useState<string>('');
  const [batchExpDate, setBatchExpDate] = useState<string>('');

  // Edit Stock Form State
  const [editForm, setEditForm] = useState<{
    productName: string;
    sku: string;
    category: string;
    subcategory: string;
    unit: string;
    reorderLevel: number;
    unitCost: number;
    unitPrice: number;
  }>({
    productName: '',
    sku: '',
    category: '',
    subcategory: '',
    unit: '',
    reorderLevel: 10,
    unitCost: 0,
    unitPrice: 0,
  });

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(stocks.map((s) => s.category).filter(Boolean)));
    return cats;
  }, [stocks]);

  // Summary Metrics
  const summary = useMemo(() => {
    const totalItems = stocks.length;
    const healthyCount = stocks.filter((s) => s.inStock > s.reorderLevel).length;
    const lowStockCount = stocks.filter((s) => s.inStock > 0 && s.inStock <= s.reorderLevel).length;
    const outOfStockCount = stocks.filter((s) => s.inStock === 0).length;
    const totalValuation = stocks.reduce((acc, s) => acc + s.inStock * s.unitCost, 0);

    return {
      totalItems,
      healthyCount,
      lowStockCount,
      outOfStockCount,
      totalValuation,
    };
  }, [stocks]);

  // Open Adjust Modal
  const handleOpenAdjustModal = (stk?: InventoryStockItem) => {
    const target = stk || stocks[0] || null;
    setSelectedStock(target);
    setAdjustType('add');
    setAdjustQty(1);
    setAdjustReason('Purchase Restock');
    setAdjustNotes('');
    const firstBatch = target?.batches?.[0]?.batchNo || '';
    setSelectedBatchNo(firstBatch);
    setNewBatchNo(`BAT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    setBatchMode(firstBatch ? 'existing' : 'new');
    setBatchMfgDate(new Date().toISOString().split('T')[0]);
    setBatchExpDate(new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]);
    setIsAdjustModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (stk: InventoryStockItem) => {
    setSelectedStock(stk);
    setEditForm({
      productName: stk.productName,
      sku: stk.sku,
      category: stk.category,
      subcategory: stk.subcategory || '',
      unit: stk.unit,
      reorderLevel: stk.reorderLevel,
      unitCost: stk.unitCost,
      unitPrice: stk.unitPrice,
    });
    setIsEditModalOpen(true);
  };

  // Save Edit Stock
  const handleSaveEdit = () => {
    if (!selectedStock) return;
    if (!editForm.productName.trim() || !editForm.sku.trim()) {
      toast.error('Product Name and SKU are required.');
      return;
    }
    const updated: InventoryStockItem = {
      ...selectedStock,
      productName: editForm.productName.trim(),
      sku: editForm.sku.trim(),
      category: editForm.category.trim() || 'General',
      subcategory: editForm.subcategory.trim() || 'General',
      unit: editForm.unit.trim() || 'Units',
      reorderLevel: Math.max(0, editForm.reorderLevel),
      unitCost: Math.max(0, editForm.unitCost),
      unitPrice: Math.max(0, editForm.unitPrice),
    };
    updateStockItem(updated);
    toast.success(`Updated stock details for "${updated.productName}".`);
    setIsEditModalOpen(false);
  };

  const handleConfirmAdjust = () => {
    if (!selectedStock) return;
    if (adjustQty <= 0) {
      toast.error('Adjustment quantity must be greater than zero.');
      return;
    }

    const effectiveBatchNo =
      adjustType === 'add' && batchMode === 'new'
        ? newBatchNo.trim()
        : selectedBatchNo.trim();

    if (adjustType === 'deduct') {
      if (adjustQty > selectedStock.inStock) {
        toast.error(`Cannot deduct more than available total stock (${selectedStock.inStock} ${selectedStock.unit}).`);
        return;
      }
      if (effectiveBatchNo) {
        const targetBatch = selectedStock.batches?.find((b) => b.batchNo === effectiveBatchNo);
        if (targetBatch && adjustQty > targetBatch.quantity) {
          toast.error(`Cannot deduct more than available in batch ${effectiveBatchNo} (${targetBatch.quantity} ${selectedStock.unit}).`);
          return;
        }
      }
    }

    const delta = adjustType === 'add' ? adjustQty : -adjustQty;
    adjustStock(selectedStock.productId, delta, effectiveBatchNo, {
      costPrice: selectedStock.unitCost,
      sellingPrice: selectedStock.unitPrice,
      mfgDate: batchMfgDate,
      expDate: batchExpDate,
    });

    toast.success(
      `Stock for "${selectedStock.productName}" updated by ${delta > 0 ? `+${delta}` : delta} ${selectedStock.unit}${effectiveBatchNo ? ` (Batch: ${effectiveBatchNo})` : ''}.`
    );
    setIsAdjustModalOpen(false);
  };

  // Filtered Stocks
  const filteredStocks = useMemo(() => {
    return stocks.filter((s) => {
      const q = appliedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.productName.toLowerCase().includes(q) ||
        s.sku.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        (s.subcategory && s.subcategory.toLowerCase().includes(q)) ||
        s.batches?.some((b) => b.batchNo.toLowerCase().includes(q));

      const matchesCat = appliedCategory === 'All' || s.category === appliedCategory;

      let matchesStatus = true;
      if (appliedStatus === 'Healthy' || appliedStatus === 'In Stock') {
        matchesStatus = s.inStock > s.reorderLevel;
      } else if (appliedStatus === 'Low Stock') {
        matchesStatus = s.inStock > 0 && s.inStock <= s.reorderLevel;
      } else if (appliedStatus === 'Out of Stock') {
        matchesStatus = s.inStock === 0;
      }

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [stocks, appliedSearch, appliedCategory, appliedStatus]);

  const totalPages = Math.ceil(filteredStocks.length / pageSize) || 1;

  const paginatedStocks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStocks.slice(start, start + pageSize);
  }, [filteredStocks, currentPage, pageSize]);

  // Export Stocks to Excel
  const handleExportExcel = () => {
    if (filteredStocks.length === 0) {
      toast.error('No stock records available to export.');
      return;
    }

    const excelRows = filteredStocks.map((s, idx) => {
      const stockValuation = (s.inStock || 0) * (s.unitCost || 0);
      let stockStatus = 'In Stock';
      if (s.inStock === 0) stockStatus = 'Out of Stock';
      else if (s.inStock <= s.reorderLevel) stockStatus = 'Low Stock';

      return {
        sNo: idx + 1,
        sku: s.sku,
        productName: s.productName,
        category: s.category,
        subcategory: s.subcategory || '-',
        unit: s.unit,
        inStock: Number(s.inStock || 0),
        reorderLevel: Number(s.reorderLevel || 0),
        unitCost: Number(s.unitCost || 0),
        unitPrice: Number(s.unitPrice || 0),
        valuation: stockValuation,
        status: stockStatus,
      };
    });

    const totalQty = excelRows.reduce((acc, row) => acc + row.inStock, 0);
    const totalValuation = excelRows.reduce((acc, row) => acc + row.valuation, 0);

    exportTableToExcel({
      filename: `Stocks_Inventory_Report_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Stock Levels',
      title: 'YAA CREATIONS CRM - INVENTORY & WAREHOUSE STOCK DIRECTORY',
      subtitle: `Total SKUs: ${filteredStocks.length} | Generated: ${new Date().toLocaleDateString('en-IN')}`,
      columns: [
        { header: '#', key: 'sNo', align: 'center', width: 8 },
        { header: 'SKU Code', key: 'sku', align: 'center', width: 14 },
        { header: 'Product Name', key: 'productName', align: 'left', width: 28 },
        { header: 'Category', key: 'category', align: 'left', width: 18 },
        { header: 'Subcategory', key: 'subcategory', align: 'left', width: 20 },
        { header: 'Unit', key: 'unit', align: 'center', width: 10 },
        { header: 'In Stock', key: 'inStock', align: 'right', width: 12 },
        { header: 'Reorder Level', key: 'reorderLevel', align: 'right', width: 14 },
        { header: 'Cost Price (₹)', key: 'unitCost', align: 'right', type: 'currency', width: 16 },
        { header: 'Sale Price (₹)', key: 'unitPrice', align: 'right', type: 'currency', width: 16 },
        { header: 'Stock Value (₹)', key: 'valuation', align: 'right', type: 'currency', width: 18 },
        { header: 'Status', key: 'status', align: 'center', width: 14 },
      ],
      data: excelRows,
      summaryRow: {
        sNo: 'TOTAL',
        productName: `${filteredStocks.length} SKUs`,
        inStock: totalQty,
        valuation: totalValuation,
      },
    });

    toast.success(`Stock levels Excel report downloaded (${filteredStocks.length} records)!`);
  };

  // Stock Movements for selected product
  const stockMovements = useMemo(() => {
    if (!selectedStock) return [];
    const movements: Array<{
      id: string;
      date: string;
      type: 'Purchase Received' | 'Sale Delivered' | 'Sales Return Inward' | 'Purchase Return Outward' | 'Manual Adjustment';
      reference: string;
      batchNo?: string;
      quantity: number;
      direction: 'in' | 'out';
      balanceAfter?: number;
      unitPrice: number;
      notes?: string;
    }> = [];

    // Check Purchases
    purchases.forEach((po) => {
      const item = po.items?.find((i) => i.productId === selectedStock.productId);
      if (item && (po.purchaseStatus === 'Completed' || po.purchaseStatus === 'Received')) {
        movements.push({
          id: `mv_po_${po.id}`,
          date: po.purchaseDate || po.createdAt,
          type: 'Purchase Received',
          reference: po.purchaseNo,
          batchNo: item.batch || 'General Lot',
          quantity: item.quantity,
          direction: 'in',
          unitPrice: item.purchasePrice,
          notes: `Received from ${po.supplierName}`,
        });
      }
    });

    // Check Sales
    sales.forEach((so) => {
      const item = so.items?.find((i) => i.productId === selectedStock.productId);
      if (item && so.saleStatus === 'Completed') {
        movements.push({
          id: `mv_so_${so.id}`,
          date: so.saleDate || so.createdAt,
          type: 'Sale Delivered',
          reference: so.invoiceNo,
          batchNo: item.batch || 'Auto FIFO',
          quantity: item.quantity,
          direction: 'out',
          unitPrice: item.unitPrice,
          notes: `Billed to ${so.customerName}`,
        });
      }
    });

    // Check Sales Returns
    salesReturns.forEach((sr) => {
      const item = sr.items?.find((i) => i.productId === selectedStock.productId);
      if (item && (sr.returnStatus === 'Received' || sr.returnStatus === 'Refunded' || sr.returnStatus === 'Approved')) {
        movements.push({
          id: `mv_sr_${sr.id}`,
          date: sr.returnDate || sr.createdAt,
          type: 'Sales Return Inward',
          reference: sr.returnNo,
          batchNo: item.batch || 'Restocked Lot',
          quantity: item.returnQuantity,
          direction: 'in',
          unitPrice: item.unitPrice,
          notes: `Return from ${sr.customerName} (${item.reason})`,
        });
      }
    });

    // Sort newest first
    return movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedStock, purchases, sales, salesReturns]);

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
              <Layers className="w-4.5 h-4.5" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Inventory &amp; Stock Levels
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Monitor real-time warehouse inventory quantities, subcategories, reorder thresholds, valuation, and stock adjustments
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
            onClick={() => handleOpenAdjustModal()}
            icon={<Plus className="w-4 h-4 text-white" />}
          >
            Adjust Stock
          </Button>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total SKUs</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#33077C] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">{summary.totalItems}</div>
            <div className="text-xs text-slate-500 mt-0.5">Tracked catalogue items</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Healthy Stock</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">{summary.healthyCount}</div>
            <div className="text-xs text-emerald-600 font-medium mt-0.5">Above reorder level</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Low Stock Alert</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-amber-600">{summary.lowStockCount}</div>
            <div className="text-xs text-slate-500 mt-0.5">Below safety threshold</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Out of Stock</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-rose-600">{summary.outOfStockCount}</div>
            <div className="text-xs text-slate-500 mt-0.5">Replenishment required</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Valuation</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#33077C] flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-[#33077C]">
              ₹{summary.totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Cost value on hand</div>
          </div>
        </div>
      </div>

      {/* 3. Search Bar & Filter Row */}
      <SearchBar
        value={pendingSearch}
        onChange={(val) => setPendingSearch(val)}
        placeholder="Search by product, SKU, category, subcategory, batch..."
        onSubmit={() => {
          setAppliedSearch(pendingSearch);
          setAppliedCategory(pendingCategory);
          setAppliedStatus(pendingStatus);
          setCurrentPage(1);
        }}
        onReset={() => {
          setPendingSearch('');
          setAppliedSearch('');
          setPendingCategory('All');
          setAppliedCategory('All');
          setPendingStatus('All');
          setAppliedStatus('All');
          setCurrentPage(1);
        }}
        filterSlot={
          <div className="flex items-center gap-2.5 flex-wrap">
            <FilterDropdown
              placeholder="Category : All"
              value={pendingCategory}
              onChange={(val) => setPendingCategory(val)}
              options={[
                { label: 'Category : All', value: 'All' },
                ...categories.map((c) => ({ label: c, value: c })),
              ]}
            />

            <FilterDropdown
              placeholder="Status : All"
              value={pendingStatus}
              onChange={(val) => setPendingStatus(val)}
              options={[
                { label: 'Status : All', value: 'All' },
                { label: 'In Stock', value: 'In Stock', dotColor: '#10b981' },
                { label: 'Low Stock', value: 'Low Stock', dotColor: '#f59e0b' },
                { label: 'Out of Stock', value: 'Out of Stock', dotColor: '#ef4444' },
              ]}
            />
          </div>
        }
        rightSlot={
          <div className="flex items-center gap-3 pr-1">
            <span className="text-xs font-semibold text-slate-500">
              Total SKUs :{' '}
              <span className="text-[#33077C] font-bold">{filteredStocks.length}</span>
            </span>
          </div>
        }
      />

      {/* 4. Stocks Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200 min-w-[1320px]">
            <thead>
              <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white tracking-wider uppercase">
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">PRODUCT &amp; SKU</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white">CATEGORY</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white">SUBCATEGORY</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white">BATCH / LOT</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white">AVAILABLE QTY</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white">REORDER LEVEL</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-right">UNIT COST</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-right">UNIT PRICE</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-right">TOTAL VALUATION</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-center">STOCK STATUS</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {paginatedStocks.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    <Layers className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    <p className="font-semibold text-slate-600 text-sm">No inventory items matched</p>
                    <p className="text-xs text-slate-400 mt-1">Try refining your search terms or filters.</p>
                  </td>
                </tr>
              ) : (
                paginatedStocks.map((stk) => {
                  const isLow = stk.inStock > 0 && stk.inStock <= stk.reorderLevel;
                  const isOut = stk.inStock === 0;
                  const valuation = stk.inStock * stk.unitCost;
                  const activeBatches = stk.batches?.filter((b) => b.quantity > 0) || [];

                  return (
                    <tr key={stk.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-200 font-sans">
                      {/* 1. PRODUCT & SKU */}
                      <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#33077C] text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-xs shrink-0 select-none">
                            {stk.sku.replace('SKU-', '').slice(0, 3)}
                          </div>
                          <div>
                            <span
                              onClick={() => {
                                setSelectedStock(stk);
                                setDetailTab('overview');
                                setIsDetailModalOpen(true);
                              }}
                              className="font-bold text-[#33077C] hover:underline cursor-pointer block text-sm leading-snug"
                            >
                              {stk.productName}
                            </span>
                            <span className="text-xs text-slate-400 font-medium mt-0.5 block">{stk.sku}</span>
                          </div>
                        </div>
                      </td>

                      {/* 2. CATEGORY */}
                      <td className="py-4 px-4 border border-slate-200 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200/80">
                          {stk.category}
                        </span>
                      </td>

                      {/* 3. SUBCATEGORY */}
                      <td className="py-4 px-4 border border-slate-200 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md bg-purple-50/60 text-[#33077C] font-semibold text-xs border border-purple-200/60">
                          {stk.subcategory || 'General'}
                        </span>
                      </td>

                      {/* 4. BATCH / LOT */}
                      <td className="py-4 px-4 border border-slate-200">
                        {activeBatches.length === 0 ? (
                          <span className="text-xs text-slate-400 font-medium italic">No active batch</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-w-[220px]">
                            {activeBatches.slice(0, 2).map((b) => (
                              <span
                                key={b.id || b.batchNo}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 text-[#33077C] font-mono text-[11px] font-bold border border-purple-200 shadow-2xs"
                                title={`Batch: ${b.batchNo} | Qty: ${b.quantity} ${stk.unit}${b.expDate ? ` | Exp: ${b.expDate}` : ''}`}
                              >
                                <Tag className="w-3 h-3 text-[#33077C]" />
                                <span>{b.batchNo}</span>
                                <span className="text-purple-600/80">({b.quantity})</span>
                              </span>
                            ))}
                            {activeBatches.length > 2 && (
                              <span
                                onClick={() => {
                                  setSelectedStock(stk);
                                  setDetailTab('batches');
                                  setIsDetailModalOpen(true);
                                }}
                                className="inline-flex items-center px-1.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-bold text-[10px] cursor-pointer hover:bg-slate-200 transition-colors"
                              >
                                +{activeBatches.length - 2} more
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 5. AVAILABLE QTY */}
                      <td className="py-4 px-4 border border-slate-200 whitespace-nowrap">
                        <span className={`font-bold text-sm ${isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-slate-900'}`}>
                          {stk.inStock}
                        </span>
                        <span className="text-xs text-slate-500 font-medium ml-1.5">{stk.unit}</span>
                      </td>

                      {/* 6. REORDER LEVEL */}
                      <td className="py-4 px-4 border border-slate-200 whitespace-nowrap">
                        <span className="font-semibold text-slate-700 text-xs">
                          {stk.reorderLevel} <span className="text-slate-500 font-normal">{stk.unit}</span>
                        </span>
                      </td>

                      {/* 7. UNIT COST */}
                      <td className="py-4 px-4 border border-slate-200 text-right whitespace-nowrap font-mono">
                        <span className="font-semibold text-slate-700 text-xs">
                          ₹{stk.unitCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* 8. UNIT PRICE */}
                      <td className="py-4 px-4 border border-slate-200 text-right whitespace-nowrap font-mono">
                        <span className="font-bold text-slate-900 text-xs">
                          ₹{stk.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* 9. TOTAL VALUATION */}
                      <td className="py-4 px-4 border border-slate-200 text-right whitespace-nowrap font-mono">
                        <span className="font-bold text-[#33077C] text-xs sm:text-sm">
                          ₹{valuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* 10. STOCK STATUS */}
                      <td className="py-4 px-4 border border-slate-200 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            isOut
                              ? 'bg-rose-50/90 text-rose-700 border border-rose-300/80'
                              : isLow
                              ? 'bg-amber-50/90 text-amber-700 border border-amber-300/80'
                              : 'bg-emerald-50/90 text-emerald-700 border border-emerald-300/80'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOut ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                          {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>

                      {/* 11. ACTIONS */}
                      <td className="py-4 px-4 border border-slate-200 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {/* Print Icon Button */}
                          <button
                            type="button"
                            title="Print"
                            onClick={() => {
                              toast.info(`Preparing print for ${stk.productName}...`);
                              window.print();
                            }}
                            className="w-8 h-8 rounded-lg bg-transparent hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Share Popover Button */}
                          <div className="relative inline-block text-left share-popover-container">
                            <button
                              type="button"
                              title="Share"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activeShareId === stk.id) {
                                  setActiveShareId(null);
                                  setSharePos(null);
                                } else {
                                  setActiveDropdownId(null);
                                  const btnRect = e.currentTarget.getBoundingClientRect();
                                  const spaceBelow = window.innerHeight - btnRect.bottom;
                                  const popoverHeight = 130;

                                  if (spaceBelow < popoverHeight && btnRect.top > popoverHeight) {
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
                                  setActiveShareId(stk.id);
                                }
                              }}
                              className="w-8 h-8 rounded-lg bg-transparent hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            >
                              <Forward className="w-4 h-4" />
                            </button>

                            {activeShareId === stk.id && sharePos && (
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
                                      const subject = encodeURIComponent(`Stock Item: ${stk.productName}`);
                                      const body = encodeURIComponent(
                                        `Product Name: ${stk.productName}\nSKU: ${stk.sku}\nCategory: ${stk.category}\nAvailable Qty: ${stk.inStock} ${stk.unit}\nUnit Cost: ₹${stk.unitCost}\nTotal Valuation: ₹${valuation}`
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
                                        `*Stock Item:* ${stk.productName}\n*SKU:* ${stk.sku}\n*Category:* ${stk.category}\n*Available Qty:* ${stk.inStock} ${stk.unit}\n*Unit Cost:* ₹${stk.unitCost}\n*Total Valuation:* ₹${valuation}`
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
                                        `Stock Item: ${stk.productName}, SKU: ${stk.sku}, Category: ${stk.category}, Available: ${stk.inStock} ${stk.unit}, Valuation: ₹${valuation}`
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
                          <div className="relative inline-block text-left stock-action-dropdown-container">
                            <button
                              type="button"
                              title="More Options"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activeDropdownId === stk.id) {
                                  setActiveDropdownId(null);
                                  setDropdownPos(null);
                                } else {
                                  setActiveShareId(null);
                                  const btnRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                  const spaceBelow = window.innerHeight - btnRect.bottom;
                                  const dropdownHeight = 220;
                                  const rightPos = window.innerWidth - btnRect.right;
                                  if (spaceBelow < dropdownHeight && btnRect.top > dropdownHeight) {
                                    setDropdownPos({
                                      bottom: window.innerHeight - btnRect.top + 4,
                                      right: rightPos,
                                    });
                                  } else {
                                    setDropdownPos({
                                      top: btnRect.bottom + 4,
                                      right: rightPos,
                                    });
                                  }
                                  setActiveDropdownId(stk.id);
                                }
                              }}
                              className="w-8 h-8 rounded-lg bg-transparent hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeDropdownId === stk.id && dropdownPos && (
                              <div
                                className="stock-action-dropdown-menu fixed z-[9999] w-48 bg-white rounded-xl shadow-xl border border-slate-200/90 py-1.5 animate-in fade-in zoom-in-95 duration-100 font-sans text-left"
                                style={{
                                  top: dropdownPos.top !== undefined ? `${dropdownPos.top}px` : 'auto',
                                  bottom: dropdownPos.bottom !== undefined ? `${dropdownPos.bottom}px` : 'auto',
                                  right: `${dropdownPos.right}px`,
                                }}
                              >
                                {/* 1. View */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setDropdownPos(null);
                                    setSelectedStock(stk);
                                    setDetailTab('overview');
                                    setIsDetailModalOpen(true);
                                  }}
                                  className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
                                >
                                  View
                                </button>

                                {/* 2. Edit */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setDropdownPos(null);
                                    handleOpenEditModal(stk);
                                  }}
                                  className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
                                >
                                  Edit
                                </button>

                                {/* 3. View Batches */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setDropdownPos(null);
                                    setSelectedStock(stk);
                                    setDetailTab('batches');
                                    setIsDetailModalOpen(true);
                                  }}
                                  className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
                                >
                                  View Batches
                                </button>

                                {/* 4. Stock Movement */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setDropdownPos(null);
                                    setSelectedStock(stk);
                                    setIsMovementModalOpen(true);
                                  }}
                                  className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
                                >
                                  Stock Movement
                                </button>

                                {/* 5. Stock Adjustment */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setDropdownPos(null);
                                    handleOpenAdjustModal(stk);
                                  }}
                                  className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
                                >
                                  Stock Adjustment
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
      {filteredStocks.length > 0 && (
        <Pagination
          currentPage={currentPage}
          total={filteredStocks.length}
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
          MODAL 1: ADJUST STOCK WITH BATCH SUPPORT
         ========================================== */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Adjust Inventory Stock &amp; Batches"
        subtitle="Update warehouse inventory counts, lot movements, and batch assignments"
        maxWidth="4xl"
        headerGradient={true}
        showBackIcon={true}
        hideCloseButton={true}
        onBack={() => setIsAdjustModalOpen(false)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleConfirmAdjust();
          }}
          className="space-y-4 p-2 sm:p-4 max-h-[75vh] overflow-y-auto animate-in fade-in duration-150 text-xs"
        >
          {/* Current Stock Banner */}
          {selectedStock && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-500">Current Warehouse Stock:</span>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {selectedStock.inStock} {selectedStock.unit}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-medium text-slate-500">Active Batches:</span>
                <div className="text-base font-bold text-[#33077C] mt-0.5">
                  {selectedStock.batches?.filter((b) => b.quantity > 0).length || 0} Batches
                </div>
              </div>
            </div>
          )}

          {/* Row 1: Select Product | Adjustment Action | Adjustment Quantity */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Select Product <span className="text-slate-500">*</span>
              </label>
              <select
                value={selectedStock?.productId || ''}
                onChange={(e) => {
                  const target = stocks.find((s) => s.productId === e.target.value);
                  setSelectedStock(target || null);
                  const firstBatch = target?.batches?.[0]?.batchNo || '';
                  setSelectedBatchNo(firstBatch);
                  setBatchMode(firstBatch ? 'existing' : 'new');
                }}
                required
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer"
              >
                <option value="">-- Select Product --</option>
                {stocks.map((s) => (
                  <option key={s.productId} value={s.productId}>
                    {s.productName} ({s.sku})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Adjustment Action <span className="text-slate-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2 h-11">
                <button
                  type="button"
                  onClick={() => setAdjustType('add')}
                  className={`h-full px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    adjustType === 'add'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>+ Inflow</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAdjustType('deduct')}
                  className={`h-full px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    adjustType === 'deduct'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <ArrowDownRight className="w-4 h-4" />
                  <span>- Outflow</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Adjustment Quantity <span className="text-slate-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={adjustQty}
                onChange={(e) => setAdjustQty(Math.max(1, Number(e.target.value) || 0))}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>
          </div>

          {/* Row 2: BATCH SELECTION & MANAGEMENT */}
          <div className="p-4 bg-purple-50/40 border border-purple-200/80 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#33077C] flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-[#33077C]" />
                <span>Batch Assignment</span>
              </span>
              {adjustType === 'add' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBatchMode('existing')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      batchMode === 'existing'
                        ? 'bg-[#33077C] text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Select Existing
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchMode('new')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      batchMode === 'new'
                        ? 'bg-[#33077C] text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    + New Batch
                  </button>
                </div>
              )}
            </div>

            {adjustType === 'deduct' || batchMode === 'existing' ? (
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1.5">
                  Select Batch / Lot {adjustType === 'deduct' ? '(Deduct From)' : '(Add To)'}
                </label>
                <select
                  value={selectedBatchNo}
                  onChange={(e) => setSelectedBatchNo(e.target.value)}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer"
                >
                  <option value="">-- Auto FIFO / General Lot --</option>
                  {selectedStock?.batches?.map((b) => (
                    <option key={b.id || b.batchNo} value={b.batchNo}>
                      {b.batchNo} (Available: {b.quantity} {selectedStock.unit}
                      {b.expDate ? ` | Exp: ${b.expDate}` : ''})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1.5">
                    New Batch Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newBatchNo}
                    onChange={(e) => setNewBatchNo(e.target.value)}
                    placeholder="e.g. BAT-2026-09"
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1.5">Mfg Date</label>
                  <input
                    type="date"
                    value={batchMfgDate}
                    onChange={(e) => setBatchMfgDate(e.target.value)}
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1.5">Expiry Date</label>
                  <input
                    type="date"
                    value={batchExpDate}
                    onChange={(e) => setBatchExpDate(e.target.value)}
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Row 3: Reason | Remarks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Reason / Reference <span className="text-slate-500">*</span>
              </label>
              <select
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer"
              >
                <option value="Purchase Restock">Purchase Restock</option>
                <option value="Batch Lot Inward">Batch Lot Inward</option>
                <option value="Physical Audit Count">Physical Audit Count</option>
                <option value="Damaged / Spoiled">Damaged / Spoiled</option>
                <option value="Internal Usage">Internal Usage</option>
                <option value="Warehouse Transfer">Warehouse Transfer</option>
                <option value="Customer Return Correction">Customer Return Correction</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Remarks &amp; Lot Reference
              </label>
              <input
                type="text"
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                placeholder="e.g. Batch received from supplier with quality certification"
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAdjustModalOpen(false)}
              className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4 text-slate-500" />
              <span>Cancel</span>
            </button>
            <button
              type="submit"
              className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Save Adjustment</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ==========================================
          MODAL 2: STOCK DETAIL & BATCH VIEW
         ========================================== */}
      {selectedStock && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Inventory Item: ${selectedStock.productName}`}
          subtitle="Complete SKU details, subcategories, lot breakdown, pricing, and gross margin"
          maxWidth="4xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setIsDetailModalOpen(false)}
        >
          <div className="space-y-5 text-xs font-sans max-h-[75vh] overflow-y-auto p-2">
            {/* Modal Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setDetailTab('overview')}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                  detailTab === 'overview'
                    ? 'bg-[#33077C] text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Overview &amp; Valuation</span>
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('batches')}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                  detailTab === 'batches'
                    ? 'bg-[#33077C] text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Batches / Lots ({selectedStock.batches?.filter((b) => b.quantity > 0).length || 0})</span>
              </button>
            </div>

            {/* Top Stat Ribbon */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-purple-50/60 border border-[#33077C]/20 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-[#33077C]">Available Stock</span>
                <div className="text-xl font-bold text-[#33077C] mt-0.5">
                  {selectedStock.inStock} <span className="text-xs font-semibold">{selectedStock.unit}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-500">Unit Cost</span>
                <div className="text-xl font-bold text-slate-900 mt-0.5">
                  ₹{selectedStock.unitCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-emerald-700">Unit Selling Price</span>
                <div className="text-xl font-bold text-emerald-700 mt-0.5">
                  ₹{selectedStock.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-blue-700">Total Valuation</span>
                <div className="text-xl font-bold text-blue-700 mt-0.5">
                  ₹{(selectedStock.inStock * selectedStock.unitCost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {detailTab === 'overview' ? (
              /* Spec Matrix */
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">SKU Code:</span>
                  <span className="font-bold text-slate-900">{selectedStock.sku}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Product Category:</span>
                  <span className="font-bold text-slate-900">{selectedStock.category}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Product Subcategory:</span>
                  <span className="font-bold text-[#33077C]">{selectedStock.subcategory || 'General'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Reorder Safety Level:</span>
                  <span className="font-bold text-amber-600">{selectedStock.reorderLevel} {selectedStock.unit}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Total Asset Valuation:</span>
                  <span className="font-bold text-[#33077C]">
                    ₹{(selectedStock.inStock * selectedStock.unitCost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-medium">Gross Margin %:</span>
                  <span className="font-bold text-emerald-600">
                    {selectedStock.unitPrice > 0
                      ? `${Math.round(((selectedStock.unitPrice - selectedStock.unitCost) / selectedStock.unitPrice) * 100)}% Margin`
                      : '0%'}
                  </span>
                </div>
              </div>
            ) : (
              /* BATCH BREAKDOWN MATRIX */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[#33077C]" />
                    <span>Batch &amp; Lot Inventory Breakdown</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      handleOpenAdjustModal(selectedStock);
                    }}
                    className="px-3 py-1.5 bg-[#33077C]/10 hover:bg-[#33077C]/20 text-[#33077C] font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add / Adjust Batch</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                        <th className="py-2.5 px-3">Batch Number</th>
                        <th className="py-2.5 px-3 text-center">Available Qty</th>
                        <th className="py-2.5 px-3">Mfg Date</th>
                        <th className="py-2.5 px-3">Expiry Date</th>
                        <th className="py-2.5 px-3 text-right">Cost (₹)</th>
                        <th className="py-2.5 px-3 text-right">Selling (₹)</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {!selectedStock.batches || selectedStock.batches.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-400">
                            No active batches registered for this SKU. Use Stock Adjustment to create lots.
                          </td>
                        </tr>
                      ) : (
                        selectedStock.batches.map((batch) => (
                          <tr key={batch.id || batch.batchNo} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-[#33077C]">
                              {batch.batchNo}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                              {batch.quantity} {selectedStock.unit}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {batch.mfgDate || 'N/A'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {batch.expDate || 'N/A'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-slate-700 font-mono">
                              ₹{batch.costPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-700 font-mono">
                              ₹{batch.sellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  batch.quantity <= 0
                                    ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                    : batch.status === 'Near Expiry'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                {batch.quantity <= 0 ? 'Depleted' : batch.status || 'Active'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleOpenEditModal(selectedStock);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                <span>Edit Product Info</span>
              </button>
              <div className="flex items-center gap-2.5">
                <Button variant="secondary" size="md" onClick={() => setIsDetailModalOpen(false)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleOpenAdjustModal(selectedStock);
                  }}
                >
                  Adjust Stock / Batch
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ==========================================
          MODAL 3: STOCK MOVEMENT LEDGER
         ========================================== */}
      {selectedStock && (
        <Modal
          isOpen={isMovementModalOpen}
          onClose={() => setIsMovementModalOpen(false)}
          title={`Stock Movement Ledger: ${selectedStock.productName}`}
          subtitle={`Audit trail of warehouse inward/outward transactions, sales deliveries, and adjustments for SKU ${selectedStock.sku}`}
          maxWidth="4xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setIsMovementModalOpen(false)}
        >
          <div className="space-y-4 text-xs font-sans max-h-[75vh] overflow-y-auto p-2">
            {/* Header info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Current Available Qty</span>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {selectedStock.inStock} {selectedStock.unit}
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Subcategory</span>
                <div className="text-base font-bold text-[#33077C] mt-0.5">
                  {selectedStock.subcategory || 'General'}
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Total Valuation</span>
                <div className="text-base font-bold text-emerald-700 mt-0.5">
                  ₹{(selectedStock.inStock * selectedStock.unitCost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Movement table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-3.5">Date &amp; Time</th>
                    <th className="py-3 px-3">Transaction Type</th>
                    <th className="py-3 px-3">Reference / Order #</th>
                    <th className="py-3 px-3">Batch / Lot</th>
                    <th className="py-3 px-3 text-center">Inflow / Outflow</th>
                    <th className="py-3 px-3 text-right">Unit Rate</th>
                    <th className="py-3 px-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {stockMovements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        <History className="w-8 h-8 mx-auto mb-1.5 text-slate-300 stroke-[1.5]" />
                        <p className="font-semibold text-slate-600">No recorded movements yet for this item</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Perform sales, purchases, or adjustments to build the audit ledger.</p>
                      </td>
                    </tr>
                  ) : (
                    stockMovements.map((mv) => (
                      <tr key={mv.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3.5 text-slate-600 font-medium whitespace-nowrap">
                          {new Date(mv.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              mv.direction === 'in'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {mv.direction === 'in' ? (
                              <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3 text-rose-600" />
                            )}
                            {mv.type}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                          {mv.reference}
                        </td>
                        <td className="py-3 px-3 font-mono text-purple-700 font-semibold whitespace-nowrap">
                          {mv.batchNo}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap font-bold">
                          <span className={mv.direction === 'in' ? 'text-emerald-700' : 'text-rose-700'}>
                            {mv.direction === 'in' ? `+${mv.quantity}` : `-${mv.quantity}`} {selectedStock.unit}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-slate-700 whitespace-nowrap">
                          ₹{mv.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-slate-500 max-w-[180px] truncate" title={mv.notes}>
                          {mv.notes || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button variant="secondary" size="md" onClick={() => setIsMovementModalOpen(false)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setIsMovementModalOpen(false);
                  handleOpenAdjustModal(selectedStock);
                }}
              >
                New Adjustment
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ==========================================
          MODAL 4: EDIT STOCK PARAMETERS
         ========================================== */}
      {selectedStock && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Edit Stock Item: ${selectedStock.productName}`}
          subtitle="Update product catalogue parameters, subcategory, safety threshold, and pricing"
          maxWidth="4xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setIsEditModalOpen(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveEdit();
            }}
            className="space-y-4 p-2 sm:p-4 max-h-[75vh] overflow-y-auto animate-in fade-in duration-150 text-xs"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.productName}
                  onChange={(e) => setEditForm({ ...editForm, productName: e.target.value })}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-semibold text-slate-800 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">
                  SKU Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.sku}
                  onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-semibold text-slate-800 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">
                  Category <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  placeholder="e.g. Software Solutions"
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-semibold text-slate-800 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">
                  Subcategory <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.subcategory}
                  onChange={(e) => setEditForm({ ...editForm, subcategory: e.target.value })}
                  placeholder="e.g. Enterprise Software"
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-semibold text-slate-800 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">
                  Unit of Measure <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.unit}
                  onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                  placeholder="e.g. Licenses, Units, Boxes, Instances"
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-semibold text-slate-800 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">
                  Reorder Safety Level <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={editForm.reorderLevel}
                  onChange={(e) => setEditForm({ ...editForm, reorderLevel: Number(e.target.value) || 0 })}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-semibold text-slate-800 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">
                  Unit Cost Price (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={editForm.unitCost}
                  onChange={(e) => setEditForm({ ...editForm, unitCost: Number(e.target.value) || 0 })}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-semibold text-slate-800 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">
                  Unit Selling Price (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={editForm.unitPrice}
                  onChange={(e) => setEditForm({ ...editForm, unitPrice: Number(e.target.value) || 0 })}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-semibold text-slate-800 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all font-mono"
                />
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4 text-slate-500" />
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
