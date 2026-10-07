import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowDownLeft,
  Plus,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ShoppingBag,
  RotateCcw,
  Layers,
  IndianRupee,
  Building2,
  Printer,
  MoreVertical,
  Check,
  X,
  Forward,
  FileSpreadsheet,
} from 'lucide-react';
import {
  useSalesManagementStore,
  PurchaseReturn,
  PurchaseReturnItem,
  PurchaseReturnStatus,
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

export const PurchaseReturnView: React.FC = () => {
  const { purchases, purchaseReturns, savePurchaseReturn, deletePurchaseReturn } = useSalesManagementStore();

  // Search & Filter State
  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
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
  const [editingReturn, setEditingReturn] = useState<PurchaseReturn | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<PurchaseReturn | null>(null);

  // Form State
  const [selectedPurchaseId, setSelectedPurchaseId] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnItems, setReturnItems] = useState<PurchaseReturnItem[]>([]);
  const [refundStatus, setRefundStatus] = useState<'Pending' | 'Refunded' | 'Supplier Credit' | 'Adjusted'>('Supplier Credit');
  const [notes, setNotes] = useState('');

  // Chosen Purchase Order
  const chosenPurchase = useMemo(() => {
    return purchases.find((p) => p.id === selectedPurchaseId);
  }, [purchases, selectedPurchaseId]);

  // Handle Purchase Selection
  const handleSelectPurchase = (poId: string) => {
    setSelectedPurchaseId(poId);
    const po = purchases.find((p) => p.id === poId);
    if (po) {
      const items: PurchaseReturnItem[] = po.items.map((it) => ({
        id: `pr_ret_it_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        productId: it.productId,
        productName: it.productName,
        purchasedQuantity: it.quantity,
        returnQuantity: 0,
        unitPrice: it.purchasePrice,
        returnAmount: 0,
        reason: 'Defective',
        remarks: '',
      }));
      setReturnItems(items);
    } else {
      setReturnItems([]);
    }
  };

  const handleReturnQtyChange = (index: number, qty: number) => {
    setReturnItems((prev) => {
      const copy = [...prev];
      const it = copy[index];
      const cleanQty = Math.max(0, Math.min(it.purchasedQuantity, qty));
      it.returnQuantity = cleanQty;
      it.returnAmount = Math.round(cleanQty * it.unitPrice * 1.18 * 100) / 100;
      copy[index] = it;
      return copy;
    });
  };

  const handleReasonChange = (index: number, reason: any) => {
    setReturnItems((prev) => {
      const copy = [...prev];
      copy[index].reason = reason;
      return copy;
    });
  };

  const totalCalculatedReturnAmount = useMemo(() => {
    return returnItems.reduce((acc, it) => acc + (it.returnAmount || 0), 0);
  }, [returnItems]);

  const handleOpenCreateModal = () => {
    setEditingReturn(null);
    setSelectedPurchaseId('');
    setReturnItems([]);
    setReturnDate(new Date().toISOString().split('T')[0]);
    setRefundStatus('Supplier Credit');
    setNotes('');
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (pret: PurchaseReturn) => {
    setEditingReturn(pret);
    setSelectedPurchaseId(pret.purchaseId || '');
    setReturnDate(pret.returnDate || new Date().toISOString().split('T')[0]);
    setReturnItems(JSON.parse(JSON.stringify(pret.items)));
    setRefundStatus(pret.refundStatus || 'Supplier Credit');
    setNotes(pret.notes || '');
    setIsCreateModalOpen(true);
  };

  // Duplicate Purchase Return
  const handleDuplicateReturn = (pret: PurchaseReturn) => {
    const nextRetNo = `PR-RET-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const duplicate: PurchaseReturn = {
      ...pret,
      id: `pret_${Date.now()}`,
      returnNo: nextRetNo,
      returnStatus: 'Requested',
      refundStatus: 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: pret.items.map((it) => ({
        ...it,
        id: `pr_ret_it_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      })),
    };
    savePurchaseReturn(duplicate);
    toast.success(`Purchase return duplicated as ${nextRetNo}`);
  };

  const handleSaveReturn = (status: PurchaseReturnStatus = 'Completed') => {
    if (!chosenPurchase && !editingReturn) {
      toast.error('Please select a purchase order.');
      return;
    }
    const validItems = returnItems.filter((it) => it.returnQuantity > 0);
    if (validItems.length === 0) {
      toast.error('Please specify at least one return quantity (> 0).');
      return;
    }

    const payload: PurchaseReturn = {
      id: editingReturn ? editingReturn.id : `pret_${Date.now()}`,
      returnNo: editingReturn ? editingReturn.returnNo : `PR-RET-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      purchaseNo: chosenPurchase ? chosenPurchase.purchaseNo : editingReturn?.purchaseNo || '',
      purchaseId: chosenPurchase ? chosenPurchase.id : editingReturn?.purchaseId || '',
      supplierId: chosenPurchase ? chosenPurchase.supplierId : editingReturn?.supplierId || '',
      supplierName: chosenPurchase ? chosenPurchase.supplierName : editingReturn?.supplierName || '',
      returnDate: returnDate,
      items: validItems,
      returnAmount: totalCalculatedReturnAmount,
      refundStatus: refundStatus,
      returnStatus: editingReturn ? editingReturn.returnStatus : status,
      notes: notes,
      createdAt: editingReturn ? editingReturn.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    savePurchaseReturn(payload);
    toast.success(editingReturn ? `Purchase return ${payload.returnNo} updated successfully.` : `Purchase return ${payload.returnNo} logged successfully.`);
    setIsCreateModalOpen(false);
    setEditingReturn(null);
  };

  // Summary Metrics
  const summary = useMemo(() => {
    const totalCount = purchaseReturns.length;
    const pendingCount = purchaseReturns.filter((r) => r.returnStatus === 'Requested').length;
    const approvedCount = purchaseReturns.filter((r) => r.returnStatus === 'Approved' || r.returnStatus === 'Returned').length;
    const completedCount = purchaseReturns.filter((r) => r.returnStatus === 'Completed').length;
    const returnAmount = purchaseReturns.reduce((acc, r) => acc + r.returnAmount, 0);

    return {
      totalCount,
      pendingCount,
      approvedCount,
      completedCount,
      returnAmount,
    };
  }, [purchaseReturns]);

  // Filtered Returns
  const filteredReturns = useMemo(() => {
    return purchaseReturns.filter((r) => {
      const q = appliedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.returnNo.toLowerCase().includes(q) ||
        r.purchaseNo.toLowerCase().includes(q) ||
        r.supplierName.toLowerCase().includes(q);

      const matchesStatus =
        appliedStatus === 'All' || r.returnStatus.toLowerCase() === appliedStatus.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [purchaseReturns, appliedSearch, appliedStatus]);

  const totalPages = Math.ceil(filteredReturns.length / pageSize) || 1;
  const paginatedReturns = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReturns.slice(start, start + pageSize);
  }, [filteredReturns, currentPage, pageSize]);

  // Export Purchase Returns to Excel
  const handleExportExcel = () => {
    if (filteredReturns.length === 0) {
      toast.error('No purchase return records available to export.');
      return;
    }

    const excelRows = filteredReturns.map((r, idx) => ({
      sNo: idx + 1,
      returnNo: r.returnNo,
      purchaseNo: r.purchaseNo,
      returnDate: r.returnDate,
      supplierName: r.supplierName,
      itemCount: r.items.length,
      returnAmount: Number(r.returnAmount || 0),
      refundStatus: r.refundStatus,
      returnStatus: r.returnStatus,
    }));

    const totalReturnAmt = excelRows.reduce((acc, row) => acc + row.returnAmount, 0);

    exportTableToExcel({
      filename: `Purchase_Returns_Report_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Purchase Returns',
      title: 'YAA CREATIONS CRM - PURCHASE RETURNS & DEBIT DIRECTORY',
      subtitle: `Total Returns: ${filteredReturns.length} | Generated: ${new Date().toLocaleDateString('en-IN')}`,
      columns: [
        { header: '#', key: 'sNo', align: 'center', width: 8 },
        { header: 'Return #', key: 'returnNo', align: 'center', width: 18 },
        { header: 'Purchase PO #', key: 'purchaseNo', align: 'center', width: 16 },
        { header: 'Return Date', key: 'returnDate', align: 'center', width: 14 },
        { header: 'Supplier Name', key: 'supplierName', align: 'left', width: 24 },
        { header: 'Items Count', key: 'itemCount', align: 'center', width: 12 },
        { header: 'Return Amount (₹)', key: 'returnAmount', align: 'right', type: 'currency', width: 18 },
        { header: 'Refund Status', key: 'refundStatus', align: 'center', width: 16 },
        { header: 'Status', key: 'returnStatus', align: 'center', width: 14 },
      ],
      data: excelRows,
      summaryRow: {
        sNo: 'TOTAL',
        returnNo: `${filteredReturns.length} Returns`,
        returnAmount: totalReturnAmt,
      },
    });

    toast.success(`Purchase Returns Excel report downloaded (${filteredReturns.length} records)!`);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
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
            <div className="text-xs text-slate-500 mt-0.5">Awaiting approval</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Approved</span>
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
            <div className="text-xs text-slate-500 mt-0.5">Credit note settled</div>
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
            <div className="text-xs text-slate-500 mt-0.5">Total credit value</div>
          </div>
        </div>
      </div>

      {/* 3. Search Bar & Filter Row */}
      <SearchBar
        value={pendingSearch}
        onChange={(val) => setPendingSearch(val)}
        placeholder="Search by return #, purchase #, supplier..."
        onSubmit={() => {
          setAppliedSearch(pendingSearch);
          setAppliedStatus(pendingStatus);
          setCurrentPage(1);
        }}
        onReset={() => {
          setPendingSearch('');
          setAppliedSearch('');
          setPendingStatus('All');
          setAppliedStatus('All');
          setCurrentPage(1);
        }}
        filterSlot={
          <div className="flex items-center gap-2.5 flex-wrap">
            <FilterDropdown
              placeholder="Status : All"
              value={pendingStatus}
              onChange={(val) => setPendingStatus(val)}
              options={[
                { label: 'Status : All', value: 'All' },
                { label: 'Requested', value: 'Requested', dotColor: '#f59e0b' },
                { label: 'Approved', value: 'Approved', dotColor: '#3b82f6' },
                { label: 'Returned', value: 'Returned', dotColor: '#8b5cf6' },
                { label: 'Completed', value: 'Completed', dotColor: '#10b981' },
              ]}
            />
          </div>
        }
        rightSlot={
          <div className="flex items-center gap-3 pr-1">
            <span className="text-xs font-semibold text-slate-500">
              Total Returns :{' '}
              <span className="text-[#33077C] font-bold">{filteredReturns.length}</span>
            </span>
          </div>
        }
      />

      {/* 4. Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200 min-w-[950px]">
            <thead>
              <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white tracking-wider uppercase">
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">RETURN NO & DATE</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">ORIGINAL PURCHASE</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">SUPPLIER</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">ITEMS RETURNED</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-right">RETURN AMOUNT</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">STATUS</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {paginatedReturns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    <ArrowDownLeft className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    <p className="font-semibold text-slate-600 text-sm">No purchase returns recorded</p>
                    <p className="text-xs text-slate-400 mt-1">Select a purchase order to initiate a vendor return.</p>
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
                            onClick={() => {
                              setSelectedReturn(pret);
                              setIsDetailModalOpen(true);
                            }}
                            className="font-bold text-[#33077C] hover:underline cursor-pointer block text-sm leading-snug"
                          >
                            {pret.returnNo}
                          </span>
                          <span className="text-xs text-slate-400 font-medium mt-0.5 block">{pret.returnDate}</span>
                        </div>
                      </div>
                    </td>

                    {/* 2. Original Purchase */}
                    <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                      <span className="font-semibold text-slate-800">{pret.purchaseNo}</span>
                    </td>

                    {/* 3. Supplier */}
                    <td className="py-4 px-5 border border-slate-200">
                      <div className="font-bold text-slate-900 leading-snug">{pret.supplierName}</div>
                      <div className="text-xs text-slate-400 mt-0.5 font-medium">Refund: {pret.refundStatus}</div>
                    </td>

                    {/* 4. Items */}
                    <td className="py-4 px-5 border border-slate-200">
                      <div className="font-medium text-slate-800 text-xs">
                        {pret.items[0]?.productName} ({pret.items[0]?.returnQuantity} qty)
                      </div>
                      {pret.items.length > 1 && (
                        <span className="text-[#33077C] text-[11px] font-bold mt-0.5 block">
                          +{pret.items.length - 1} more item(s)
                        </span>
                      )}
                    </td>

                    {/* 5. Return Amount */}
                    <td className="py-4 px-5 border border-slate-200 text-right whitespace-nowrap">
                      <span className="font-bold text-slate-900 text-sm">
                        ₹{pret.returnAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* 6. Status */}
                    <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          pret.returnStatus === 'Completed'
                            ? 'bg-emerald-50/90 text-emerald-700 border border-emerald-300/80'
                            : pret.returnStatus === 'Approved'
                            ? 'bg-blue-50/90 text-blue-700 border border-blue-300/80'
                            : 'bg-amber-50/90 text-amber-700 border border-amber-300/80'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            pret.returnStatus === 'Completed'
                              ? 'bg-emerald-500'
                              : pret.returnStatus === 'Approved'
                              ? 'bg-blue-500'
                              : 'bg-amber-500'
                          }`}
                        />
                        {pret.returnStatus}
                      </span>
                    </td>

                    {/* 7. Actions */}
                    <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Print Action */}
                        <button
                          type="button"
                          title="Print Purchase Return"
                          onClick={() => {
                            toast.info(`Preparing print for ${pret.returnNo}...`);
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
                            title="Share Purchase Return"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeShareId === pret.id) {
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
                                setActiveShareId(pret.id);
                              }
                            }}
                            className="w-8 h-8 rounded-lg bg-transparent hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                          >
                            <Forward className="w-4 h-4" />
                          </button>

                          {activeShareId === pret.id && sharePos && (
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
                                    const subject = encodeURIComponent(`Purchase Return: ${pret.returnNo}`);
                                    const body = encodeURIComponent(
                                      `Purchase Return: ${pret.returnNo}\nOriginal Purchase: ${pret.purchaseNo}\nSupplier: ${pret.supplierName}\nReturn Date: ${pret.returnDate}\nAmount: ₹${pret.returnAmount.toLocaleString('en-IN')}\nStatus: ${pret.returnStatus}`
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
                                      `*Purchase Return: ${pret.returnNo}*\n*PO:* ${pret.purchaseNo}\n*Supplier:* ${pret.supplierName}\n*Return Amount:* ₹${pret.returnAmount.toLocaleString('en-IN')}\n*Status:* ${pret.returnStatus}`
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
                                      `Purchase Return ${pret.returnNo} for ${pret.supplierName}, Return Amount: ₹${pret.returnAmount.toLocaleString('en-IN')}, Status: ${pret.returnStatus}`
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
                              if (activeDropdownId === pret.id) {
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
                                setActiveDropdownId(pret.id);
                              }
                            }}
                            className="w-8 h-8 rounded-lg bg-transparent hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeDropdownId === pret.id && dropdownPos && (
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
                                  handleOpenEditModal(pret);
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
                                  handleDuplicateReturn(pret);
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
                                  if (window.confirm(`Are you sure you want to delete purchase return ${pret.returnNo}?`)) {
                                    deletePurchaseReturn(pret.id);
                                    toast.success(`Purchase return ${pret.returnNo} deleted.`);
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
                                  toast.info(`Opening PDF for ${pret.returnNo}...`);
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
                                  setActiveDropdownId(null);
                                  toast.info(`Preparing print for ${pret.returnNo}...`);
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
                                  setActiveDropdownId(null);
                                  toast.info(`Purchase Return ${pret.returnNo} logged on ${pret.returnDate} for ${pret.supplierName}. Status: ${pret.returnStatus}, Refund: ${pret.refundStatus}.`);
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filteredReturns.length > 0 && (
        <Pagination
          currentPage={currentPage}
          total={filteredReturns.length}
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
        title={editingReturn ? `Edit Purchase Return: ${editingReturn.returnNo}` : 'Create Purchase Return'}
        subtitle={editingReturn ? 'Modify return details and returned quantities' : 'Set originating purchase order, return date, and returned quantities'}
        maxWidth="4xl"
        headerGradient={true}
        showBackIcon={true}
        hideCloseButton={true}
        onBack={() => {
          setIsCreateModalOpen(false);
          setEditingReturn(null);
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveReturn('Completed');
          }}
          className="space-y-4 p-2 sm:p-4 animate-in fade-in duration-150"
        >
          {/* Top Fields: 3-column Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Select Purchase Order <span className="text-slate-500">*</span>
              </label>
              <select
                value={selectedPurchaseId}
                onChange={(e) => handleSelectPurchase(e.target.value)}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer"
              >
                <option value="">-- Choose Purchase --</option>
                {purchases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.purchaseNo} ({p.supplierName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Supplier Name
              </label>
              <input
                type="text"
                readOnly
                value={chosenPurchase ? chosenPurchase.supplierName : ''}
                placeholder="Auto-filled from PO"
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-[13px] font-medium text-slate-600 outline-none cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Return Date <span className="text-slate-500">*</span>
              </label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer"
              />
            </div>
          </div>

          {chosenPurchase && (
            <>
              {/* Product Return Items Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200">
                  <span className="font-bold text-slate-800 tracking-wider text-xs uppercase">
                    Return Line Items & Quantities
                  </span>
                </div>
                <div className="overflow-x-auto max-w-full">
                  <table className="w-full text-left min-w-[600px]">
                    <thead>
                      <tr className="bg-slate-100/70 text-[11px] font-bold text-slate-600 border-b border-slate-200">
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3 text-center">Purchased Qty</th>
                      <th className="py-2.5 px-3 text-center w-28">Return Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3">Reason</th>
                      <th className="py-2.5 px-3 text-right">Return Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {returnItems.map((it, idx) => (
                      <tr key={it.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{it.productName}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-600">{it.purchasedQuantity}</td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="0"
                            max={it.purchasedQuantity}
                            value={it.returnQuantity}
                            onChange={(e) => handleReturnQtyChange(idx, Number(e.target.value))}
                            className="w-full h-9 px-2 text-center bg-white border border-slate-200 rounded-lg text-xs font-bold text-purple-900 outline-none focus:border-[#4309A2]"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-700 font-semibold">₹{it.unitPrice.toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3">
                          <select
                            value={it.reason}
                            onChange={(e) => handleReasonChange(idx, e.target.value)}
                            className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-[#4309A2]"
                          >
                            <option value="Damaged">Damaged</option>
                            <option value="Defective">Defective</option>
                            <option value="Wrong Product">Wrong Product</option>
                            <option value="Excess Quantity">Excess Quantity</option>
                            <option value="Quality Issue">Quality Issue</option>
                            <option value="Other">Other</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          ₹{it.returnAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>

              {/* Total Summary */}
              <div className="flex justify-between items-center p-4 bg-purple-50/60 rounded-2xl border border-purple-100 font-bold">
                <span className="text-slate-700 text-xs sm:text-sm">Total Debit Adjustment Amount:</span>
                <span className="text-[#33077C] text-base font-black">
                  ₹{totalCalculatedReturnAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </>
          )}

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
          <div className="space-y-5 pt-2 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center">
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold">Originating Purchase</span>
                <div className="font-bold text-slate-900 text-sm mt-0.5">{selectedReturn.purchaseNo}</div>
                <div className="text-slate-600 font-medium">{selectedReturn.supplierName}</div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-[#33077C] border border-purple-200 text-xs font-bold shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#33077C] shrink-0" />
                  <span>{selectedReturn.returnStatus}</span>
                </span>
                <div className="text-slate-500 mt-1 font-medium">Date: {selectedReturn.returnDate}</div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto max-w-full">
                <table className="w-full text-left min-w-[500px]">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200 text-[11px]">
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3 text-center">Returned Qty</th>
                      <th className="py-2.5 px-3">Reason</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {selectedReturn.items.map((it) => (
                      <tr key={it.id}>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{it.productName}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-purple-900">{it.returnQuantity}</td>
                        <td className="py-2.5 px-3 text-slate-600 font-medium">{it.reason}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          ₹{it.returnAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-100 flex justify-between items-center font-bold">
              <span className="text-slate-700">Total Debit Adjustment Value:</span>
              <span className="text-[#33077C] text-base font-black">
                ₹{selectedReturn.returnAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
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
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
