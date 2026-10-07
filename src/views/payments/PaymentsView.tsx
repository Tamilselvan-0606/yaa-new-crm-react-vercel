import React, { useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { useAuth } from '../../context/AuthContext';
import { usePayments } from '../../hooks/useQueries';
import { api } from '../../services/api';
import { PaymentItem } from '../../types';
import {
  CreditCard,
  Plus,
  DollarSign,
  Calendar,
  FileText,
  Trash2,
  Edit,
  Download,
  Filter,
} from 'lucide-react';
import { getStatusBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { DataTable } from '../../components/common/DataTable';
import { PaymentFormModal } from '../../components/forms/PaymentFormModal';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';

export const PaymentsView: React.FC = () => {
  const { isAdmin, showToast } = useAuth();
  const { data: payments = [], isLoading: loading, refetch: loadPayments } = usePayments();

  // Filters
  const [filterProduct, setFilterProduct] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modals
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<PaymentItem | null>(null);

  const handleDeletePayment = async (id: string) => {
    if (!isAdmin) {
      showToast('error', 'Forbidden', 'Admin access required to delete ledger entries.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this payment record?')) return;

    try {
      await api.deletePayment(id);
      showToast('info', 'Record Deleted', 'Payment ledger record removed.');
      loadPayments();
    } catch (e: any) {
      showToast('error', 'Failed', e.message);
    }
  };

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchesProduct = filterProduct === 'ALL' || p.productName === filterProduct;
      const matchesStatus = filterStatus === 'ALL' || p.status === filterStatus;
      return matchesProduct && matchesStatus;
    });
  }, [payments, filterProduct, filterStatus]);

  const totalCollected = useMemo(() => {
    return payments
      .filter((p) => p.status === 'Paid')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [payments]);

  const totalPending = useMemo(() => {
    return payments
      .filter((p) => p.status === 'Pending' || p.status === 'Overdue')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [payments]);

  const tableColumns = useMemo<ColumnDef<PaymentItem>[]>(
    () => [
      {
        accessorKey: 'customerName',
        header: 'Customer / Client',
        cell: ({ row }) => (
          <div>
            <div className="font-bold text-slate-900">{row.original.customerName}</div>
            <div className="text-[11px] text-slate-500 font-medium">Invoice #{row.original.id}</div>
          </div>
        ),
      },
      {
        accessorKey: 'productName',
        header: 'Product / Offering',
        cell: ({ row }) => (
          <div>
            <span className="font-semibold text-[#33077C]">{row.original.productName}</span>
            {row.original.paymentMethod && (
              <span className="block text-[10px] text-slate-400">Via {row.original.paymentMethod}</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'amount',
        header: 'Amount ($ USD)',
        cell: ({ row }) => (
          <span className="font-bold text-slate-900">
            ${row.original.amount.toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => getStatusBadge(row.original.status),
      },
      {
        accessorKey: 'paymentDate',
        header: 'Paid / Due Date',
        cell: ({ row }) => (
          <div className="text-slate-600 font-medium text-[11px]">
            {row.original.paymentDate ? (
              <span className="text-emerald-700 font-semibold">Paid: {row.original.paymentDate}</span>
            ) : (
              <span className="text-amber-700">Due: {row.original.dueDate}</span>
            )}
          </div>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="text-right block">Actions</span>,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
              <Tooltip title="View Invoice Summary">
                <button
                  onClick={() => setSelectedInvoice(item)}
                  className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100"
                >
                  <FileText className="w-4 h-4" />
                </button>
              </Tooltip>
              {isAdmin && (
                <Tooltip title="Delete Ledger Entry">
                  <button
                    onClick={() => handleDeletePayment(item.id)}
                    className="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Tooltip>
              )}
            </div>
          );
        },
      },
    ],
    [isAdmin]
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-[#33077C]" />
            Payments
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Centralized billing history across all products and services
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsRecordModalOpen(true)}
            className="flex items-center justify-center gap-2 h-11 px-6 bg-[#4309A2] hover:bg-[#e67e00] text-white text-sm font-bold rounded-xl shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-[#E2E8F0] rounded-lg shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Revenue Collected
          </span>
          <p className="text-xl font-black text-[#33077C] mt-1 font-mono">
            ${totalCollected.toLocaleString()}
          </p>
        </div>

        <div className="p-4 bg-white border border-[#E2E8F0] rounded-lg shadow-xs">
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">
            Pending & Overdue Receivables
          </span>
          <p className="text-xl font-black text-amber-600 mt-1 font-mono">
            ${totalPending.toLocaleString()}
          </p>
        </div>

        <div className="p-4 bg-white border border-[#E2E8F0] rounded-lg shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Invoices Issued
          </span>
          <p className="text-xl font-black text-slate-900 mt-1">{payments.length}</p>
        </div>

        <div className="p-4 bg-white border border-[#E2E8F0] rounded-lg shadow-xs">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
            Collection Success Rate
          </span>
          <p className="text-xl font-black text-emerald-600 mt-1">
            {payments.length > 0
              ? Math.round(
                  (payments.filter((p) => p.status === 'Paid').length / payments.length) * 100
                )
              : 100}
            %
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-[#E2E8F0] p-4 rounded-lg shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <Filter className="w-3.5 h-3.5 text-[#4309A2]" />
          <span>Filters:</span>
        </div>

        <select
          value={filterProduct}
          onChange={(e) => setFilterProduct(e.target.value)}
          className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs font-medium text-slate-700 focus:outline-none focus:border-[#33077C]"
        >
          <option value="ALL">All Products & Services</option>
          <option value="OmniFlow ERP">OmniFlow ERP</option>
          <option value="NexusCRM Pro">NexusCRM Pro</option>
          <option value="PulseAnalytics">PulseAnalytics</option>
          <option value="ChatSphere AI">ChatSphere AI</option>
          <option value="Digital Marketing">Digital Marketing</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs font-medium text-slate-700 focus:outline-none focus:border-[#33077C]"
        >
          <option value="ALL">All Statuses</option>
          <option value="Paid">Paid</option>
          <option value="Pending">Pending</option>
          <option value="Overdue">Overdue</option>
        </select>

        {(filterProduct !== 'ALL' || filterStatus !== 'ALL') && (
          <button
            onClick={() => {
              setFilterProduct('ALL');
              setFilterStatus('ALL');
            }}
            className="text-xs text-[#4309A2] font-semibold hover:underline cursor-pointer ml-auto"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* TanStack DataTable */}
      <DataTable
        columns={tableColumns}
        data={filteredPayments}
        searchPlaceholder="Search invoices by customer, product, invoice ID..."
        pageSize={10}
        onRowClick={(item) => setSelectedInvoice(item)}
      />

      {/* REACT HOOK FORM + ZOD PAYMENT MODAL */}
      <PaymentFormModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
      />

      {/* INVOICE DETAIL VIEW */}
      {selectedInvoice && (
        <Modal
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          title={`Invoice #${selectedInvoice.id}`}
          subtitle={`Customer: ${selectedInvoice.customerName}`}
        >
          <div className="space-y-4 text-xs text-slate-700">
            <div className="p-4 bg-slate-50 border border-[#E2E8F0] rounded-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">{selectedInvoice.productName}</span>
                <span className="font-black text-base text-[#33077C] font-mono">
                  ${selectedInvoice.amount.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Status:</span>
                {getStatusBadge(selectedInvoice.status)}
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Payment Method:</span>
                <span className="font-semibold text-slate-800">{selectedInvoice.paymentMethod || 'Direct'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Date:</span>
                <span className="font-mono">{selectedInvoice.paymentDate || selectedInvoice.dueDate}</span>
              </div>
            </div>

            {selectedInvoice.notes && (
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Notes</span>
                <p className="p-2 bg-white border border-[#E2E8F0] rounded mt-1 text-slate-700">
                  {selectedInvoice.notes}
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-[#E2E8F0] flex justify-end">
              <button
                onClick={() => {
                  showToast('success', 'Invoice Downloaded', `Invoice #${selectedInvoice.id} exported as PDF.`);
                  setSelectedInvoice(null);
                }}
                className="flex items-center justify-center gap-2 h-11 px-6 bg-[#33077C] text-white rounded-xl text-sm font-bold hover:bg-[#432eb5] transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF Receipt</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
