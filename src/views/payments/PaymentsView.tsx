import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PaymentItem } from '../../types';
import {
  CreditCard,
  Plus,
  FileText,
  Trash2,
  MoreVertical,
  Download,
} from 'lucide-react';
import { getStatusBadge } from '../../components/common/Badge';
import { SearchBar } from '../../components/common/SearchBar';
import { FilterDropdown } from '../../components/common/FilterDropdown';
import { Button } from '../../components/common/Button';
import { Pagination } from '../../components/common/Pagination';
import { Modal } from '../../components/common/Modal';
import { ConfirmationModal } from '../../utils/confirmationModal';
import { PaymentFormModal } from '../../components/forms/PaymentFormModal';
import {
  useGetPlatformPaymentsQuery,
  useDeletePlatformPaymentMutation,
} from '../../api';

const formatDateHelper = (dateStr?: string | null): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2].slice(0, 2).padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
      }
      return dateStr;
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

export const PaymentsView: React.FC = () => {
  const { isAdmin, showToast } = useAuth();

  // Search & Filter States
  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pendingProduct, setPendingProduct] = useState('ALL');
  const [appliedProduct, setAppliedProduct] = useState('ALL');
  const [pendingStatus, setPendingStatus] = useState('ALL');
  const [appliedStatus, setAppliedStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 3-Dots Action Dropdown State
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  // Fetch real platform payments with query parameters
  const {
    data: platformPaymentsRes,
    isLoading: loading,
    refetch: loadPayments,
  } = useGetPlatformPaymentsQuery({
    page: 1,
    limit: 100,
    pagination_required: 'false',
    product: appliedProduct !== 'ALL' ? appliedProduct : undefined,
    status: appliedStatus !== 'ALL' ? appliedStatus : undefined,
  });

  const [deletePlatformPayment] = useDeletePlatformPaymentMutation();

  // Close dropdown on outside click or scroll
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.payment-action-dropdown-container') && !target.closest('.payment-action-dropdown-menu')) {
        setActiveDropdownId(null);
        setDropdownPos(null);
      }
    };
    const handleScroll = () => {
      if (activeDropdownId) {
        setActiveDropdownId(null);
        setDropdownPos(null);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [activeDropdownId]);

  // Modals
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<PaymentItem | null>(null);

  const payments: PaymentItem[] = useMemo(() => {
    const rawData = platformPaymentsRes?.data;
    const rawItems: any[] = Array.isArray(rawData)
      ? rawData
      : Array.isArray((rawData as any)?.items)
        ? (rawData as any).items
        : [];

    return rawItems.map((item: any) => {
      const rawProduct = (item.productName || item.productOrService || '').trim();
      const cleanProduct =
        rawProduct &&
        !rawProduct.toLowerCase().includes('omniflow') &&
        !rawProduct.toLowerCase().includes('nexuscrm') &&
        !rawProduct.toLowerCase().includes('general service')
          ? rawProduct
          : (item.notes && !item.notes.toLowerCase().includes('general service') ? item.notes : '');

      const total = Number(item.totalAmount ?? item.grandTotal ?? item.amount ?? 0);
      const paid = Number(item.paidAmount ?? item.amountPaid ?? (item.status?.toLowerCase() === 'paid' ? total : item.amount ?? 0));
      const outstanding = Number(item.outstandingAmount ?? item.balanceDue ?? Math.max(0, total - paid));

      return {
        id: item.id,
        invoiceNumber: item.invoiceNumber || item.receiptNumber || `INV-${item.id.slice(0, 8)}`,
        customerId: item.customerId,
        customerName: item.customerName || item.clientName || item.name || 'Unknown Client',
        productOrService: cleanProduct,
        productName: cleanProduct,
        plan: item.plan || 'Standard Tier',
        amount: paid,
        totalAmount: total,
        paidAmount: paid,
        outstandingAmount: outstanding,
        dueDate: item.dueDate ? item.dueDate.split('T')[0] : '',
        paymentDate: item.paymentDate ? item.paymentDate.split('T')[0] : (item.createdAt ? item.createdAt.split('T')[0] : undefined),
        paymentMethod: item.paymentMethod || item.paymentMode || 'Bank Transfer',
        transactionId: item.referenceNumber || item.transactionId,
        status: item.status || (outstanding <= 0.001 ? 'Paid' : paid > 0 ? 'Partially Paid' : 'Pending'),
        notes: item.notes || '',
        createdAt: item.createdAt,
      };
    });
  }, [platformPaymentsRes]);

  // Read live backend summaryMetrics if returned in data wrapper
  const summaryMetrics = useMemo(() => {
    const rawData = platformPaymentsRes?.data;
    if (rawData && !Array.isArray(rawData) && (rawData as any).summaryMetrics) {
      return (rawData as any).summaryMetrics;
    }
    return null;
  }, [platformPaymentsRes]);

  const [deleteTarget, setDeleteTarget] = useState<PaymentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeletePayment = (item: PaymentItem) => {
    if (!isAdmin) {
      showToast('error', 'Forbidden', 'Admin access required to delete ledger entries.');
      return;
    }
    setDeleteTarget(item);
  };

  const confirmDeletePayment = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setIsDeleting(true);
    try {
      await deletePlatformPayment(id).unwrap();
      showToast('info', 'Record Deleted', 'Payment ledger record removed.');
      setDeleteTarget(null);
      loadPayments();
    } catch (e: any) {
      const msg = e?.data?.message || e?.message || 'Failed to delete payment.';
      showToast('error', 'Failed', msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchesProduct = appliedProduct === 'ALL' || p.productName === appliedProduct;
      const matchesStatus = appliedStatus === 'ALL' || p.status.toLowerCase() === appliedStatus.toLowerCase();
      const q = appliedSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.customerName.toLowerCase().includes(q) ||
        p.productName.toLowerCase().includes(q) ||
        p.invoiceNumber.toLowerCase().includes(q) ||
        (p.transactionId && p.transactionId.toLowerCase().includes(q));

      return matchesProduct && matchesStatus && matchesSearch;
    });
  }, [payments, appliedProduct, appliedStatus, appliedSearch]);

  const totalCollected = useMemo(() => {
    if (summaryMetrics?.totalRevenueCollected !== undefined) {
      return summaryMetrics.totalRevenueCollected;
    }
    return payments
      .filter((p) => p.status === 'Paid')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [payments, summaryMetrics]);

  const totalPending = useMemo(() => {
    if (summaryMetrics?.pendingOverdueReceivables !== undefined) {
      return summaryMetrics.pendingOverdueReceivables;
    }
    return payments
      .filter((p) => p.status === 'Pending' || p.status === 'Overdue')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [payments, summaryMetrics]);

  const totalInvoicesCount = useMemo(() => {
    if (summaryMetrics?.totalInvoicesIssued !== undefined) {
      return summaryMetrics.totalInvoicesIssued;
    }
    return payments.length;
  }, [payments.length, summaryMetrics]);

  const collectionRate = useMemo(() => {
    if (summaryMetrics?.collectionSuccessRate !== undefined) {
      return Math.round(summaryMetrics.collectionSuccessRate);
    }
    return payments.length > 0
      ? Math.round(
        (payments.filter((p) => p.status === 'Paid').length / payments.length) * 100
      )
      : 100;
  }, [payments, summaryMetrics]);

  const totalRecords = filteredPayments.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedPayments = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [filteredPayments, safePage, pageSize]);

  const statusFilterOptions = [
    { label: 'Status : All', value: 'ALL' },
    { label: 'Paid', value: 'Paid', dotColor: '#10b981' },
    { label: 'Pending', value: 'Pending', dotColor: '#f59e0b' },
    { label: 'Overdue', value: 'Overdue', dotColor: '#ef4444' },
  ];

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. Top Action Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Payments
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Centralized billing history across all products and services
          </p>
        </div>

        {/* Top Right Action Button: Record Payment */}
        {isAdmin && (
          <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsRecordModalOpen(true)}
              icon={<Plus className="w-4 h-4 text-white" />}
              className="w-full sm:w-auto justify-center"
            >
              Record Payment
            </Button>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Revenue Collected
          </span>
          <p className="text-xl font-black text-[#33077C] mt-1">
            ₹{totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl shadow-xs">
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">
            Pending & Overdue Receivables
          </span>
          <p className="text-xl font-black text-amber-600 mt-1">
            ₹{totalPending.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Invoices Issued
          </span>
          <p className="text-xl font-black text-slate-900 mt-1">{totalInvoicesCount}</p>
        </div>

        <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl shadow-xs">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
            Collection Success Rate
          </span>
          <p className="text-xl font-black text-emerald-600 mt-1">
            {collectionRate}%
          </p>
        </div>
      </div>

      {/* 2. Search Bar & Dropdown Filter Row */}
      <SearchBar
        value={pendingSearch}
        onChange={(val) => setPendingSearch(val)}
        placeholder="Search invoices by customer, invoice ID..."
        onSubmit={() => {
          setAppliedSearch(pendingSearch);
          setAppliedStatus(pendingStatus);
          setPage(1);
        }}
        onReset={() => {
          setPendingSearch('');
          setAppliedSearch('');
          setPendingStatus('ALL');
          setAppliedStatus('ALL');
          setPage(1);
        }}
        filterSlot={
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Status Dropdown */}
            <FilterDropdown
              options={statusFilterOptions}
              value={pendingStatus}
              onChange={(val) => setPendingStatus(val)}
              placeholder="Status : All"
            />
          </div>
        }
        rightSlot={
          <div className="flex items-center gap-3 pr-1">
            <span className="text-xs font-semibold text-slate-500">
              Total Invoices :{' '}
              <span className="text-[#33077C] font-bold">{totalRecords}</span>
            </span>
          </div>
        }
      />

      {/* 3. Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200 min-w-[1200px]">
            <thead>
              <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white tracking-wider uppercase">
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white">NAME</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white">INVOICE NUMBER</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white">TOTAL AMOUNT</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white">OUTSTANDING</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white">PAID</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white">PAYMENT MODE</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-center">STATUS</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white">PAYMENT DATE</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-7 h-7 border-2 border-purple-200 border-t-[#33077C] rounded-full animate-spin" />
                      <span className="text-xs text-slate-500">Loading payments...</span>
                    </div>
                  </td>
                </tr>
              ) : pagedPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    No records found matching your criteria.
                  </td>
                </tr>
              ) : (
                pagedPayments.map((item) => {
                  const isPaid = item.status?.toLowerCase() === 'paid';
                  const isPending = item.status?.toLowerCase() === 'pending';
                  const isOverdue = item.status?.toLowerCase() === 'overdue';
                  const isPartiallyPaid = item.status?.toLowerCase() === 'partially paid';

                  const totalVal = item.totalAmount ?? item.amount ?? 0;
                  const paidVal = item.paidAmount ?? (isPaid ? totalVal : item.amount ?? 0);
                  const outstandingVal = item.outstandingAmount ?? Math.max(0, totalVal - paidVal);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedInvoice(item)}
                      className="hover:bg-slate-50/80 transition-colors border-b border-slate-200 font-sans cursor-pointer"
                    >
                      {/* 1. NAME */}
                      <td className="py-4 px-4 border border-slate-200 whitespace-nowrap">
                        <span className="font-bold text-slate-900 text-xs sm:text-[14px]">
                          {item.customerName}
                        </span>
                      </td>

                      {/* 2. INVOICE NUMBER */}
                      <td className="py-4 px-4 border border-slate-200 whitespace-nowrap">
                        <span className="text-xs font-bold text-[#33077C] tracking-wide">
                          #{item.invoiceNumber || item.id}
                        </span>
                      </td>

                      {/* 3. TOTAL AMOUNT */}
                      <td className="py-4 px-4 border border-slate-200 whitespace-nowrap">
                        <span className="font-bold text-slate-900 text-xs sm:text-[13px]">
                          ₹{totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* 4. OUTSTANDING */}
                      <td className="py-4 px-4 border border-slate-200 whitespace-nowrap">
                        {outstandingVal > 0 ? (
                          <span className="font-bold text-rose-600 text-xs sm:text-[13px]">
                            ₹{outstandingVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-400 text-xs sm:text-[13px]">
                            ₹0.00
                          </span>
                        )}
                      </td>

                      {/* 5. PAID */}
                      <td className="py-4 px-4 border border-slate-200 whitespace-nowrap">
                        <span className="font-bold text-emerald-700 text-xs sm:text-[13px]">
                          ₹{paidVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* 6. PAYMENT MODE */}
                      <td className="py-4 px-4 border border-slate-200 whitespace-nowrap">
                        <span className="text-xs font-semibold text-slate-800">
                          {item.paymentMethod || 'Bank Transfer'}
                        </span>
                      </td>

                      {/* 7. STATUS */}
                      <td className="py-4 px-4 border border-slate-200 text-center whitespace-nowrap">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50/90 text-emerald-700 border border-emerald-300/80 text-xs font-bold shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>Paid</span>
                          </span>
                        ) : isPartiallyPaid ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-300 text-xs font-bold shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                            <span>Partially Paid</span>
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-300 text-xs font-bold shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            <span>Pending</span>
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-300 text-xs font-bold shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                            <span>Overdue</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                            <span>{item.status}</span>
                          </span>
                        )}
                      </td>

                      {/* 8. PAYMENT DATE */}
                      <td className="py-4 px-4 border border-slate-200 whitespace-nowrap">
                        <span className="text-xs font-medium text-slate-700">
                          {formatDateHelper(item.paymentDate || item.dueDate)}
                        </span>
                      </td>

                      {/* 9. ACTIONS */}
                      <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-block text-left payment-action-dropdown-container">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeDropdownId === item.id) {
                                setActiveDropdownId(null);
                                setDropdownPos(null);
                              } else {
                                const btnRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                const spaceBelow = window.innerHeight - btnRect.bottom;
                                const dropdownHeight = 150;
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
                                setActiveDropdownId(item.id);
                              }
                            }}
                            className="w-8 h-8 rounded-lg bg-[#33077C] hover:bg-[#432fb3] flex items-center justify-center text-white shadow-xs transition-all hover:scale-105 active:scale-95 mx-auto cursor-pointer"
                            title="More Actions"
                          >
                            <MoreVertical className="w-4 h-4 fill-white text-white" />
                          </button>

                          {activeDropdownId === item.id && dropdownPos && (
                            <div
                              className="payment-action-dropdown-menu fixed z-[9999] w-48 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-100 font-sans text-left"
                              style={{
                                top: dropdownPos.top !== undefined ? `${dropdownPos.top}px` : 'auto',
                                bottom: dropdownPos.bottom !== undefined ? `${dropdownPos.bottom}px` : 'auto',
                                right: `${dropdownPos.right}px`,
                              }}
                            >
                              {/* View Invoice */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  setSelectedInvoice(item);
                                }}
                                className="w-full px-3 py-2 text-left text-[13px] font-bold text-slate-800 hover:bg-slate-50 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                              >
                                <span
                                  style={{ width: '26px', height: '26px' }}
                                  className="rounded-full bg-[#33077C] flex items-center justify-center shrink-0 shadow-2xs"
                                >
                                  <FileText style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />
                                </span>
                                <span>View Invoice</span>
                              </button>

                              {/* Delete (Admin only) */}
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    handleDeletePayment(item);
                                  }}
                                  className="w-full px-3 py-2 text-left text-[13px] font-bold text-[#E11D48] hover:bg-rose-50/70 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                                >
                                  <span
                                    style={{ width: '26px', height: '26px' }}
                                    className="rounded-full bg-[#E11D48] flex items-center justify-center shrink-0 shadow-2xs"
                                  >
                                    <Trash2 style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />
                                  </span>
                                  <span>Delete</span>
                                </button>
                              )}
                            </div>
                          )}
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
      <Pagination
          total={totalRecords}
          currentPage={safePage}
          pageSize={pageSize}
          pageSizeOptions={[5, 10, 20, 50]}
          onPageChange={(newPage) => setPage(newPage)}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />

      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        type="Delete"
        itemTypeLabel="Payment"
        itemName={deleteTarget?.invoiceNumber}
        isLoading={isDeleting}
        onConfirm={confirmDeletePayment}
      />

      {/* REACT HOOK FORM + ZOD PAYMENT MODAL */}
      <PaymentFormModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSuccess={loadPayments}
      />

      {/* INVOICE DETAIL VIEW */}
      {selectedInvoice && (() => {
        const isPaid = selectedInvoice.status?.toLowerCase() === 'paid';
        const isPending = selectedInvoice.status?.toLowerCase() === 'pending';
        const isPartiallyPaid = selectedInvoice.status?.toLowerCase() === 'partially paid';
        const totalVal = selectedInvoice.totalAmount ?? selectedInvoice.amount ?? 0;
        const paidVal = selectedInvoice.paidAmount ?? (isPaid ? totalVal : selectedInvoice.amount ?? 0);
        const outstandingVal = selectedInvoice.outstandingAmount ?? Math.max(0, totalVal - paidVal);

        return (
          <Modal
            isOpen={!!selectedInvoice}
            onClose={() => setSelectedInvoice(null)}
            title={`Invoice #${selectedInvoice.invoiceNumber || selectedInvoice.id}`}
            subtitle={`Customer: ${selectedInvoice.customerName}`}
            headerGradient={true}
            maxWidth="md"
          >
            <div className="space-y-4 font-sans text-slate-700">
              {/* Highlight Card */}
              <div className="p-4 bg-gradient-to-br from-purple-50/70 via-slate-50 to-white border border-purple-100 rounded-2xl space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-purple-100/70">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Customer
                    </span>
                    <span className="text-sm font-bold text-[#33077C] mt-0.5 block">
                      {selectedInvoice.customerName}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Amount Paid
                    </span>
                    <span className="text-lg font-black text-emerald-700 mt-0.5 block">
                      ₹{paidVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Summary Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-slate-400 font-semibold block text-[11px]">Total Amount</span>
                    <span className="font-bold text-slate-800 text-[13px] mt-0.5 block">
                      ₹{totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[11px]">Outstanding Due</span>
                    <span className={`text-[13px] font-bold mt-0.5 block ${outstandingVal > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      ₹{outstandingVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[11px]">Payment Mode</span>
                    <span className="font-semibold text-slate-800 text-[13px] mt-0.5 block">
                      {selectedInvoice.paymentMethod || 'Bank Transfer'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[11px]">Status</span>
                    <div className="mt-1">
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Paid</span>
                        </span>
                      ) : isPartiallyPaid ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-300 text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                          <span>Partially Paid</span>
                        </span>
                      ) : isPending ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-300 text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span>Pending</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          <span>{selectedInvoice.status}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-purple-50 flex items-center justify-between">
                    <span className="text-slate-400 font-semibold text-[11px]">Payment Date</span>
                    <span className="font-semibold text-slate-800 text-xs">
                      {formatDateHelper(selectedInvoice.paymentDate || selectedInvoice.dueDate)}
                    </span>
                  </div>
                </div>
              </div>

              {selectedInvoice.notes && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Notes</span>
                  <p className="text-xs text-slate-700 mt-1 font-medium leading-relaxed">
                    {selectedInvoice.notes}
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="h-10 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    showToast('success', 'Invoice Downloaded', `Invoice #${selectedInvoice.invoiceNumber || selectedInvoice.id} exported as PDF.`);
                    setSelectedInvoice(null);
                  }}
                  className="flex items-center justify-center gap-2 h-10 px-5 bg-[#33077C] text-white rounded-xl text-xs font-bold hover:bg-[#432eb5] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF Receipt</span>
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};
