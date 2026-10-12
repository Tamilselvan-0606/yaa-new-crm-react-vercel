import React, { useState, useMemo } from 'react';
import {
  Clock,
  Plus,
  Pencil,
  Trash2,
  Eye,
  MoreVertical,
  Ban,
  Download,
  AlertCircle,
  FileText,
  DollarSign,
  IndianRupee,
  AlertTriangle,
  Hourglass,
  Calendar,
  User,
  Building2,
  Phone,
  CreditCard,
  Search,
  FileSpreadsheet,
  Printer,
  Forward,
  History,
  RotateCcw,
  CheckCircle2,
  Mail,
} from 'lucide-react';
import { SearchBar } from '../../components/common/SearchBar';
import { FilterDropdown } from '../../components/common/FilterDropdown';
import { Button } from '../../components/common/Button';
import { Pagination } from '../../components/common/Pagination';
import { Modal } from '../../components/common/Modal';
import { CustomSelect } from '../../components/common/CustomSelect';
import { exportTableToExcel } from '../../utils/excelExport';
import { toast } from 'sonner';

export interface PendingDueItem {
  id: string;
  sNo: number;
  invoiceNo: string;
  customerName: string;
  phone: string;
  productName: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  overdueDays: number;
  status: 'Pending' | 'Overdue' | 'Partially Paid' | 'Paid';
}

export const PendingDuesView: React.FC = () => {
  // Sample Data for Pending Dues
  const [dues, setDues] = useState<PendingDueItem[]>([
    {
      id: 'due-1',
      sNo: 1,
      invoiceNo: 'INV-2026-001',
      customerName: 'Acme Technologies',
      phone: '+91 98765 43210',
      productName: 'YaaConnect',
      dueDate: '2026-10-05',
      totalAmount: 45000,
      paidAmount: 15000,
      dueAmount: 30000,
      overdueDays: 0,
      status: 'Partially Paid',
    },
    {
      id: 'due-2',
      sNo: 2,
      invoiceNo: 'INV-2026-004',
      customerName: 'Nexis LogiTech Solutions',
      phone: '+91 97890 12345',
      productName: 'Doc DentQ',
      dueDate: '2026-09-20',
      totalAmount: 25000,
      paidAmount: 0,
      dueAmount: 25000,
      overdueDays: 8,
      status: 'Overdue',
    },
    {
      id: 'due-3',
      sNo: 3,
      invoiceNo: 'INV-2026-007',
      customerName: 'Apex HealthCare Ltd',
      phone: '+91 99441 55223',
      productName: 'DocMotez',
      dueDate: '2026-10-15',
      totalAmount: 60000,
      paidAmount: 0,
      dueAmount: 60000,
      overdueDays: 0,
      status: 'Pending',
    },
  ]);

  // Search & Filter States
  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pendingStatus, setPendingStatus] = useState('ALL');
  const [appliedStatus, setAppliedStatus] = useState('ALL');
  const [pendingProduct, setPendingProduct] = useState('ALL');
  const [appliedProduct, setAppliedProduct] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 3-Dots Action Dropdown & Share Popover State
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [activeShareId, setActiveShareId] = useState<string | null>(null);
  const [sharePos, setSharePos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  // Modals State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedDue, setSelectedDue] = useState<PendingDueItem | null>(null);
  const [editingDue, setEditingDue] = useState<PendingDueItem | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [paymentModeInput, setPaymentModeInput] = useState('Bank Transfer');
  const [paymentNotesInput, setPaymentNotesInput] = useState('');

  // Form Data
  const [formData, setFormData] = useState({
    invoiceNo: '',
    customerName: '',
    phone: '',
    productName: '',
    dueDate: '',
    totalAmount: '',
    paidAmount: '',
    status: 'Pending' as 'Pending' | 'Overdue' | 'Partially Paid' | 'Paid',
  });

  // Close dropdown & share popover on outside click or scroll
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.due-action-dropdown-container') && !target.closest('.due-action-dropdown-menu')) {
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
    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [activeDropdownId, activeShareId]);

  // Filtered Dues
  const filteredDues = useMemo(() => {
    return dues.filter((item) => {
      const q = appliedSearch.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        item.customerName.toLowerCase().includes(q) ||
        item.invoiceNo.toLowerCase().includes(q) ||
        item.phone.includes(q) ||
        item.productName.toLowerCase().includes(q);

      const matchesStatus =
        appliedStatus === 'ALL' || item.status === appliedStatus;

      const matchesProduct =
        appliedProduct === 'ALL' || item.productName === appliedProduct;

      return matchesSearch && matchesStatus && matchesProduct;
    });
  }, [dues, appliedSearch, appliedStatus, appliedProduct]);

  // Summary Metrics
  const totalPendingAmount = useMemo(() => {
    return dues.reduce((acc, curr) => acc + curr.dueAmount, 0);
  }, [dues]);

  const totalOverdueAmount = useMemo(() => {
    return dues.filter((d) => d.status === 'Overdue').reduce((acc, curr) => acc + curr.dueAmount, 0);
  }, [dues]);

  // Pagination
  const totalPages = Math.ceil(filteredDues.length / pageSize) || 1;
  const paginatedDues = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredDues.slice(start, start + pageSize);
  }, [filteredDues, page, pageSize]);

  // Modal Handlers
  const handleOpenAddModal = () => {
    setEditingDue(null);
    setFormData({
      invoiceNo: `INV-2026-${String(dues.length + 1).padStart(3, '0')}`,
      customerName: '',
      phone: '',
      productName: 'YaaConnect',
      dueDate: new Date().toISOString().split('T')[0],
      totalAmount: '',
      paidAmount: '0',
      status: 'Pending',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: PendingDueItem) => {
    setEditingDue(item);
    setFormData({
      invoiceNo: item.invoiceNo,
      customerName: item.customerName,
      phone: item.phone,
      productName: item.productName,
      dueDate: item.dueDate,
      totalAmount: String(item.totalAmount),
      paidAmount: String(item.paidAmount),
      status: item.status,
    });
    setIsModalOpen(true);
  };

  const handleSaveDue = (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseFloat(formData.totalAmount) || 0;
    const paid = parseFloat(formData.paidAmount) || 0;
    const due = Math.max(0, total - paid);

    if (editingDue) {
      setDues((prev) =>
        prev.map((d) =>
          d.id === editingDue.id
            ? {
              ...d,
              invoiceNo: formData.invoiceNo,
              customerName: formData.customerName,
              phone: formData.phone,
              productName: formData.productName,
              dueDate: formData.dueDate,
              totalAmount: total,
              paidAmount: paid,
              dueAmount: due,
              status: formData.status,
            }
            : d
        )
      );
    } else {
      const newDue: PendingDueItem = {
        id: `due-${Date.now()}`,
        sNo: dues.length + 1,
        invoiceNo: formData.invoiceNo,
        customerName: formData.customerName,
        phone: formData.phone,
        productName: formData.productName,
        dueDate: formData.dueDate,
        totalAmount: total,
        paidAmount: paid,
        dueAmount: due,
        overdueDays: 0,
        status: formData.status,
      };
      setDues((prev) => [...prev, newDue]);
    }
    setIsModalOpen(false);
  };

  const handleDeleteDue = (id: string) => {
    if (window.confirm('Are you sure you want to delete this pending due entry?')) {
      setDues((prev) => prev.filter((d) => d.id !== id));
      setActiveDropdownId(null);
    }
  };

  const getStatusBadge = (status: PendingDueItem['status']) => {
    switch (status) {
      case 'Paid':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Partially Paid':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Overdue':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Pending':
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  // Export Pending Dues to Excel
  const handleExportExcel = () => {
    if (filteredDues.length === 0) {
      toast.error('No pending dues records available to export.');
      return;
    }

    const excelRows = filteredDues.map((d, idx) => ({
      sNo: idx + 1,
      invoiceNo: d.invoiceNo,
      customerName: d.customerName,
      phone: d.phone,
      productName: d.productName,
      dueDate: d.dueDate,
      totalAmount: Number(d.totalAmount || 0),
      paidAmount: Number(d.paidAmount || 0),
      dueAmount: Number(d.dueAmount || 0),
      status: d.status,
    }));

    const sumTotal = excelRows.reduce((acc, row) => acc + row.totalAmount, 0);
    const sumPaid = excelRows.reduce((acc, row) => acc + row.paidAmount, 0);
    const sumDue = excelRows.reduce((acc, row) => acc + row.dueAmount, 0);

    exportTableToExcel({
      filename: `Pending_Dues_Report_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Pending Dues',
      title: 'YAA CREATIONS CRM - CUSTOMER PENDING DUES & RECEIVABLES',
      subtitle: `Total Invoices: ${filteredDues.length} | Generated: ${new Date().toLocaleDateString('en-IN')}`,
      columns: [
        { header: '#', key: 'sNo', align: 'center', width: 8 },
        { header: 'Invoice #', key: 'invoiceNo', align: 'center', width: 16 },
        { header: 'Customer Name', key: 'customerName', align: 'left', width: 26 },
        { header: 'Phone', key: 'phone', align: 'left', width: 18 },
        { header: 'Product / Plan', key: 'productName', align: 'left', width: 18 },
        { header: 'Due Date', key: 'dueDate', align: 'center', width: 14 },
        { header: 'Total (₹)', key: 'totalAmount', align: 'right', type: 'currency', width: 16 },
        { header: 'Paid (₹)', key: 'paidAmount', align: 'right', type: 'currency', width: 16 },
        { header: 'Due Balance (₹)', key: 'dueAmount', align: 'right', type: 'currency', width: 18 },
        { header: 'Status', key: 'status', align: 'center', width: 16 },
      ],
      data: excelRows,
      summaryRow: {
        sNo: 'TOTAL',
        customerName: `${filteredDues.length} Invoices`,
        totalAmount: sumTotal,
        paidAmount: sumPaid,
        dueAmount: sumDue,
      },
    });

    toast.success(`Pending Dues Excel report downloaded (${filteredDues.length} records)!`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Row with Title on Left and Action Buttons on Right */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Pending Dues
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Track customer receivables, overdue balances, payment timelines, and collections.
          </p>
        </div>

        {/* Top Right Action Button */}
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
            onClick={handleOpenAddModal}
            icon={<Plus className="w-4 h-4 text-white" />}
          >
            Record New Due
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#33077C]/10 text-[#33077C] flex items-center justify-center shrink-0">
            <IndianRupee className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Pending Dues</p>
            <h3 className="text-xl font-extrabold text-slate-800 mt-0.5">₹{totalPendingAmount.toLocaleString()}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overdue Balance</p>
            <h3 className="text-xl font-extrabold text-rose-600 mt-0.5">₹{totalOverdueAmount.toLocaleString()}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Hourglass className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Invoices with Dues</p>
            <h3 className="text-xl font-extrabold text-slate-800 mt-0.5">{dues.length} Invoices</h3>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <SearchBar
        value={pendingSearch}
        onChange={(val) => setPendingSearch(val)}
        placeholder="Search by customer, invoice no, phone, product..."
        onSubmit={() => {
          setAppliedSearch(pendingSearch);
          setAppliedStatus(pendingStatus);
          setAppliedProduct(pendingProduct);
          setPage(1);
        }}
        onReset={() => {
          setPendingSearch('');
          setAppliedSearch('');
          setPendingStatus('ALL');
          setAppliedStatus('ALL');
          setPendingProduct('ALL');
          setAppliedProduct('ALL');
          setPage(1);
        }}
        filterSlot={
          <div className="flex items-center gap-2.5">
            <FilterDropdown
              options={[
                { label: 'Status : All', value: 'ALL' },
                { label: 'Pending', value: 'Pending', dotColor: '#3b82f6' },
                { label: 'Partially Paid', value: 'Partially Paid', dotColor: '#f59e0b' },
                { label: 'Overdue', value: 'Overdue', dotColor: '#ef4444' },
                { label: 'Paid', value: 'Paid', dotColor: '#10b981' },
              ]}
              value={pendingStatus}
              onChange={(val) => setPendingStatus(val)}
              placeholder="Status : All"
            />
            <FilterDropdown
              options={[
                { label: 'Product : All', value: 'ALL' },
                { label: 'YaaConnect', value: 'YaaConnect' },
                { label: 'DocMotez', value: 'DocMotez' },
                { label: 'Doc DentQ', value: 'Doc DentQ' },
                { label: 'TurfyLock', value: 'TurfyLock' },
                { label: 'Digital Marketing', value: 'Digital Marketing' },
              ]}
              value={pendingProduct}
              onChange={(val) => setPendingProduct(val)}
              placeholder="Product : All"
            />
          </div>
        }
        rightSlot={
          <div className="flex items-center gap-3 pr-1">
            <span className="text-xs font-semibold text-slate-500">
              Total Dues :{' '}
              <span className="text-[#33077C] font-bold">
                {filteredDues.length}
              </span>
            </span>
          </div>
        }
      />

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200">
            <thead>
              <tr className="bg-[#33077C] text-[12px] font-bold text-white tracking-wider uppercase">
                <th className="py-4 px-4 border border-[#3e0b96] bg-[#33077C] text-white text-center w-16">
                  S.NO
                </th>
                <th className="py-4 px-4 border border-[#3e0b96] bg-[#33077C] text-white">
                  INVOICE &amp; CUSTOMER
                </th>
                <th className="py-4 px-4 border border-[#3e0b96] bg-[#33077C] text-white">
                  PRODUCT
                </th>
                <th className="py-4 px-4 border border-[#3e0b96] bg-[#33077C] text-white">
                  DUE DATE
                </th>
                <th className="py-4 px-4 border border-[#3e0b96] bg-[#33077C] text-white text-right">
                  TOTAL AMOUNT
                </th>
                <th className="py-4 px-4 border border-[#3e0b96] bg-[#33077C] text-white text-right">
                  PAID AMOUNT
                </th>
                <th className="py-4 px-4 border border-[#3e0b96] bg-[#33077C] text-white text-right">
                  DUE AMOUNT
                </th>
                <th className="py-4 px-4 border border-[#3e0b96] bg-[#33077C] text-white text-center">
                  STATUS
                </th>
                <th className="py-4 px-4 border border-[#3e0b96] bg-[#33077C] text-white text-center">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {paginatedDues.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400 border border-slate-200">
                    <Clock className="w-9 h-9 mx-auto mb-2 opacity-30 text-purple-400" />
                    <p className="font-bold text-slate-700 text-sm">No pending dues found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      All customer receivables are cleared or match no filters.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedDues.map((item, index) => {
                  const sNo = (page - 1) * pageSize + index + 1;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* 1. S.No */}
                      <td className="py-4 px-4 border border-slate-200 text-center font-medium text-slate-500 text-xs">
                        {sNo}
                      </td>

                      {/* 2. Invoice & Customer */}
                      <td className="py-4 px-4 border border-slate-200">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <span>{item.customerName}</span>
                          <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                            {item.invoiceNo}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>{item.phone}</span>
                        </div>
                      </td>

                      {/* 3. Product */}
                      <td className="py-4 px-4 border border-slate-200 text-slate-700 font-semibold text-xs">
                        {item.productName}
                      </td>

                      {/* 4. Due Date */}
                      <td className="py-4 px-4 border border-slate-200 text-slate-700 text-xs font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.dueDate}</span>
                        </div>
                        {item.status === 'Overdue' && (
                          <span className="text-[11px] font-bold text-rose-600 block mt-0.5">
                            {item.overdueDays} days overdue
                          </span>
                        )}
                      </td>

                      {/* 5. Total Amount */}
                      <td className="py-4 px-4 border border-slate-200 text-right font-semibold text-slate-800 text-xs">
                        ₹{item.totalAmount.toLocaleString()}
                      </td>

                      {/* 6. Paid Amount */}
                      <td className="py-4 px-4 border border-slate-200 text-right font-semibold text-emerald-600 text-xs">
                        ₹{item.paidAmount.toLocaleString()}
                      </td>

                      {/* 7. Due Amount */}
                      <td className="py-4 px-4 border border-slate-200 text-right font-extrabold text-rose-600 text-xs">
                        ₹{item.dueAmount.toLocaleString()}
                      </td>

                      {/* 8. Status */}
                      <td className="py-4 px-4 border border-slate-200 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadge(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* 9. Actions */}
                      <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Print Button */}
                          <button
                            type="button"
                            title="Print Due Receipt"
                            onClick={() => {
                              toast.info(`Preparing print for invoice ${item.invoiceNo}...`);
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
                              title="Share Due Details"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activeShareId === item.id) {
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
                                  setActiveShareId(item.id);
                                }
                              }}
                              className="w-8 h-8 rounded-lg bg-transparent hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            >
                              <Forward className="w-4 h-4" />
                            </button>

                            {activeShareId === item.id && sharePos && (
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
                                      const subject = encodeURIComponent(`Due Reminder: ${item.invoiceNo} - ${item.customerName}`);
                                      const body = encodeURIComponent(
                                        `Dear ${item.customerName},\n\nThis is a friendly reminder regarding pending invoice ${item.invoiceNo} for ${item.productName}.\nTotal Amount: ₹${item.totalAmount.toLocaleString()}\nPaid: ₹${item.paidAmount.toLocaleString()}\nBalance Due: ₹${item.dueAmount.toLocaleString()}\nDue Date: ${item.dueDate}\n\nPlease clear the pending dues at your earliest convenience.`
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
                                        `*Pending Due Notice:*\n*Invoice:* ${item.invoiceNo}\n*Customer:* ${item.customerName}\n*Product:* ${item.productName}\n*Due Amount:* ₹${item.dueAmount.toLocaleString()}\n*Due Date:* ${item.dueDate}`
                                      );
                                      const phoneClean = item.phone.replace(/[^0-9]/g, '');
                                      window.open(`https://api.whatsapp.com/send?phone=${phoneClean}&text=${text}`, '_blank');
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
                                        `Dear Customer, due balance for ${item.invoiceNo} (${item.productName}) is Rs.${item.dueAmount}. Due date: ${item.dueDate}.`
                                      );
                                      const phoneClean = item.phone.replace(/[^0-9]/g, '');
                                      window.open(`sms:${phoneClean}?body=${text}`, '_blank');
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

                          {/* 3-dots Actions Dropdown Button */}
                          <div className="relative inline-block text-left due-action-dropdown-container">
                            <button
                              type="button"
                              title="More Options"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activeDropdownId === item.id) {
                                  setActiveDropdownId(null);
                                  setDropdownPos(null);
                                } else {
                                  setActiveShareId(null);
                                  const btnRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                  const spaceBelow = window.innerHeight - btnRect.bottom;
                                  const dropdownHeight = 240;
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
                              className="w-8 h-8 rounded-lg bg-transparent hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
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

      {/* 4. Pagination */}
      {filteredDues.length > 0 && (
        <Pagination
          currentPage={page}
          total={filteredDues.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      )}

      {/* 3-Dots Action Portal with requested labels */}
      {activeDropdownId &&
        dropdownPos &&
        (() => {
          const currentItem = dues.find((d) => d.id === activeDropdownId);
          if (!currentItem) return null;

          return (
            <>
              <div
                className="fixed inset-0 z-[9998]"
                onClick={() => {
                  setActiveDropdownId(null);
                  setDropdownPos(null);
                }}
              />
              <div
                style={{
                  position: 'fixed',
                  ...(dropdownPos.bottom !== undefined
                    ? { bottom: `${dropdownPos.bottom}px` }
                    : { top: `${dropdownPos.top}px` }),
                  right: `${dropdownPos.right}px`,
                }}
                className="due-action-dropdown-menu fixed z-[9999] w-48 bg-white rounded-xl shadow-xl border border-slate-200/90 py-1.5 animate-in fade-in zoom-in-95 duration-100 font-sans text-left"
              >
                {/* 1. Edit Due */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveDropdownId(null);
                    handleOpenEditModal(currentItem);
                  }}
                  className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
                >
                  Edit Due
                </button>

                {/* 2. View */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveDropdownId(null);
                    setSelectedDue(currentItem);
                    setIsViewModalOpen(true);
                  }}
                  className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
                >
                  View
                </button>

                {/* 3. Record Payment */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveDropdownId(null);
                    setSelectedDue(currentItem);
                    setPaymentAmountInput(String(currentItem.dueAmount));
                    setPaymentModeInput('Bank Transfer');
                    setPaymentNotesInput('');
                    setIsRecordPaymentOpen(true);
                  }}
                  className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
                >
                  Record Payment
                </button>

                {/* 4. Print */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveDropdownId(null);
                    toast.info(`Preparing print for invoice ${currentItem.invoiceNo}...`);
                    window.print();
                  }}
                  className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
                >
                  Print
                </button>

                {/* 5. Delete */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveDropdownId(null);
                    handleDeleteDue(currentItem.id);
                  }}
                  className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
                >
                  Delete
                </button>

                {/* 6. Payment History */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveDropdownId(null);
                    setSelectedDue(currentItem);
                    setIsHistoryModalOpen(true);
                  }}
                  className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
                >
                  Payment History
                </button>
              </div>
            </>
          );
        })()}

      {/* Add / Edit Due Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDue ? 'Edit Pending Due Record' : 'Record New Pending Due'}
        maxWidth="md"
      >
        <form noValidate onSubmit={handleSaveDue} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Customer / Company Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              placeholder="e.g. Acme Technologies"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#33077C]/20 focus:border-[#33077C]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Invoice Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.invoiceNo}
                onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                placeholder="e.g. INV-2026-001"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#33077C]/20 focus:border-[#33077C]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#33077C]/20 focus:border-[#33077C]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Product / Service <span className="text-rose-500">*</span>
              </label>
              <CustomSelect
                options={[
                  { label: 'YaaConnect', value: 'YaaConnect' },
                  { label: 'DocMotez', value: 'DocMotez' },
                  { label: 'Doc DentQ', value: 'Doc DentQ' },
                  { label: 'TurfyLock', value: 'TurfyLock' },
                  { label: 'Digital Marketing', value: 'Digital Marketing' },
                ]}
                value={formData.productName}
                onChange={(val) => setFormData({ ...formData, productName: val })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Due Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#33077C]/20 focus:border-[#33077C]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Total Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.totalAmount}
                onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                placeholder="45000"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#33077C]/20 focus:border-[#33077C]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Paid Amount (₹)
              </label>
              <input
                type="number"
                min="0"
                value={formData.paidAmount}
                onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
                placeholder="15000"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#33077C]/20 focus:border-[#33077C]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Status <span className="text-rose-500">*</span>
            </label>
            <CustomSelect
              options={[
                { label: 'Pending', value: 'Pending' },
                { label: 'Partially Paid', value: 'Partially Paid' },
                { label: 'Overdue', value: 'Overdue' },
                { label: 'Paid', value: 'Paid' },
              ]}
              value={formData.status}
              onChange={(val) => setFormData({ ...formData, status: val as any })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <Button variant="primary" size="md">
              {editingDue ? 'Save Changes' : 'Record Due'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedDue(null);
        }}
        title="Due &amp; Invoice Breakdown"
        maxWidth="md"
      >
        {selectedDue && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase">Customer</span>
                <span className="font-bold text-slate-900 text-sm">{selectedDue.customerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase">Invoice Number</span>
                <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-xs">
                  {selectedDue.invoiceNo}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase">Product Offering</span>
                <span className="font-medium text-slate-700 text-sm">{selectedDue.productName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase">Due Date</span>
                <span className="font-medium text-slate-700 text-sm">{selectedDue.dueDate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase">Contact Phone</span>
                <span className="font-medium text-slate-700 text-sm">{selectedDue.phone}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 p-4 bg-purple-50/50 rounded-2xl border border-purple-100 text-center">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase">Total</p>
                <p className="text-base font-extrabold text-slate-800 mt-0.5">₹{selectedDue.totalAmount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase">Paid</p>
                <p className="text-base font-extrabold text-emerald-600 mt-0.5">₹{selectedDue.paidAmount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase">Due</p>
                <p className="text-base font-extrabold text-rose-600 mt-0.5">₹{selectedDue.dueAmount.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedDue(null);
                }}
                className="px-5 py-2 bg-[#33077C] text-white font-bold text-sm rounded-xl hover:bg-[#432eb5] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isRecordPaymentOpen}
        onClose={() => {
          setIsRecordPaymentOpen(false);
          setSelectedDue(null);
        }}
        title="Record Customer Payment"
        maxWidth="md"
      >
        {selectedDue && (
          <form noValidate onSubmit={(e) => {
              e.preventDefault();
              const payAmt = parseFloat(paymentAmountInput) || 0;
              if (payAmt <= 0) {
                toast.error('Payment amount must be greater than 0');
                return;
              }
              if (payAmt > selectedDue.dueAmount) {
                toast.error(`Payment amount cannot exceed remaining due balance (₹${selectedDue.dueAmount.toLocaleString()})`);
                return;
              }

              const newPaid = selectedDue.paidAmount + payAmt;
              const newDue = Math.max(0, selectedDue.totalAmount - newPaid);
              const newStatus: PendingDueItem['status'] = newDue === 0 ? 'Paid' : 'Partially Paid';

              setDues((prev) =>
                prev.map((d) =>
                  d.id === selectedDue.id
                    ? {
                        ...d,
                        paidAmount: newPaid,
                        dueAmount: newDue,
                        status: newStatus,
                      }
                    : d
                )
              );

              toast.success(`Payment of ₹${payAmt.toLocaleString()} recorded for ${selectedDue.invoiceNo}`);
              setIsRecordPaymentOpen(false);
              setSelectedDue(null);
            }}
            className="space-y-4"
          >
            <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-100 flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">Pending Balance</p>
                <p className="text-lg font-black text-rose-600">₹{selectedDue.dueAmount.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 font-semibold uppercase">Invoice #</p>
                <p className="text-sm font-bold text-purple-900">{selectedDue.invoiceNo}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Payment Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                max={selectedDue.dueAmount}
                value={paymentAmountInput}
                onChange={(e) => setPaymentAmountInput(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#33077C]/20 focus:border-[#33077C] font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Payment Mode <span className="text-rose-500">*</span>
              </label>
              <CustomSelect
                options={[
                  { label: 'Bank Transfer', value: 'Bank Transfer' },
                  { label: 'UPI / QR', value: 'UPI' },
                  { label: 'Cash', value: 'Cash' },
                  { label: 'Cheque', value: 'Cheque' },
                  { label: 'Credit / Debit Card', value: 'Card' },
                ]}
                value={paymentModeInput}
                onChange={(val) => setPaymentModeInput(val)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Notes / Reference #
              </label>
              <input
                type="text"
                value={paymentNotesInput}
                onChange={(e) => setPaymentNotesInput(e.target.value)}
                placeholder="UTR #, cheque number or transaction remarks"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#33077C]/20 focus:border-[#33077C]"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setIsRecordPaymentOpen(false);
                  setSelectedDue(null);
                }}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <Button variant="primary" size="md">
                Confirm Payment
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Payment History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setSelectedDue(null);
        }}
        title="Payment & Collections History"
        maxWidth="md"
      >
        {selectedDue && (
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-slate-900">{selectedDue.customerName}</p>
                <p className="text-xs text-slate-500">{selectedDue.invoiceNo} • {selectedDue.productName}</p>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(selectedDue.status)}`}>
                  {selectedDue.status}
                </span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2.5 px-3 text-slate-600">{selectedDue.dueDate}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">Invoice Generated</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">₹{selectedDue.totalAmount.toLocaleString()}</td>
                  </tr>
                  {selectedDue.paidAmount > 0 && (
                    <tr className="bg-emerald-50/40">
                      <td className="py-2.5 px-3 text-emerald-700">Settlement</td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-800">Payment Received (Partial/Full)</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-600">-₹{selectedDue.paidAmount.toLocaleString()}</td>
                    </tr>
                  )}
                  <tr className="bg-slate-50 font-bold">
                    <td colSpan={2} className="py-2.5 px-3 text-slate-700">Remaining Balance Due</td>
                    <td className="py-2.5 px-3 text-right text-rose-600">₹{selectedDue.dueAmount.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsHistoryModalOpen(false);
                  setSelectedDue(null);
                }}
                className="px-5 py-2 bg-[#33077C] text-white font-bold text-sm rounded-xl hover:bg-[#432eb5] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
