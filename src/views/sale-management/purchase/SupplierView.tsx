import React, { useState, useMemo, useEffect } from 'react';
import {
  UsersRound,
  Plus,
  Search,
  Filter,
  Eye,
  Pencil,
  Trash2,
  Phone,
  Mail,
  Building2,
  Building,
  Users,
  Layers,
  IndianRupee,
  Landmark,
  FileText,
  CreditCard,
  RotateCcw,
  ShoppingBag,
  MapPin,
  CheckCircle2,
  XCircle,
  User,
  MoreVertical,
  Ban,
  Check,
  X,
  Printer,
  Forward,
  FileSpreadsheet,
} from 'lucide-react';
import {
  useSalesManagementStore,
  Supplier,
  SupplierStatus,
} from '../../../store/useSalesManagementStore';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { Pagination } from '../../../components/common/Pagination';
import { SearchBar } from '../../../components/common/SearchBar';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { exportTableToExcel } from '../../../utils/excelExport';
import { toast } from 'sonner';

export const SupplierView: React.FC = () => {
  const { suppliers, purchases, purchaseReturns, saveSupplier, deleteSupplier } = useSalesManagementStore();

  // Search & Filter State
  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pendingStatus, setPendingStatus] = useState('All');
  const [appliedStatus, setAppliedStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 3-Dots Action dropdown
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  // Share Popover State
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
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'purchases' | 'returns' | 'payments' | 'outstanding' | 'documents'>('overview');

  // Form State
  const [formData, setFormData] = useState<Omit<Supplier, 'id' | 'createdAt' | 'updatedAt' | 'totalPurchase' | 'paid' | 'payable'>>({
    supplierCode: '',
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    gstNumber: '',
    panNumber: '',
    paymentTerms: 'Net 30 Days',
    creditLimit: 500000,
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branchName: '',
    status: 'Active',
    notes: '',
  });

  // Summary Metrics
  const summary = useMemo(() => {
    const totalCount = suppliers.length;
    const activeCount = suppliers.filter((s) => s.status === 'Active').length;
    const inactiveCount = suppliers.filter((s) => s.status === 'Inactive' || s.status === 'Blocked').length;
    const totalPayables = suppliers.reduce((acc, s) => acc + (s.payable || 0), 0);
    const newSuppliersCount = suppliers.filter((s) => {
      const monthAgo = new Date(Date.now() - 30 * 86400000);
      return new Date(s.createdAt) >= monthAgo;
    }).length;

    return {
      totalCount,
      activeCount,
      inactiveCount,
      totalPayables,
      newSuppliersCount,
    };
  }, [suppliers]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    const nextCode = `SUP-${Math.floor(1000 + Math.random() * 9000)}`;
    setFormData({
      supplierCode: nextCode,
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      country: '',
      pincode: '',
      gstNumber: '',
      panNumber: '',
      paymentTerms: '',
      creditLimit: 0,
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      branchName: '',
      status: 'Active',
      notes: '',
    });
    setEditingSupplier(null);
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (sup: Supplier) => {
    setFormData({
      supplierCode: sup.supplierCode,
      name: sup.name,
      contactPerson: sup.contactPerson,
      phone: sup.phone,
      email: sup.email,
      address: sup.address,
      city: sup.city,
      state: sup.state,
      country: sup.country,
      pincode: sup.pincode,
      gstNumber: sup.gstNumber || '',
      panNumber: sup.panNumber || '',
      paymentTerms: sup.paymentTerms,
      creditLimit: sup.creditLimit,
      bankName: sup.bankName || '',
      accountNumber: sup.accountNumber || '',
      ifscCode: sup.ifscCode || '',
      branchName: sup.branchName || '',
      status: sup.status,
      notes: sup.notes || '',
    });
    setEditingSupplier(sup);
    setIsFormModalOpen(true);
  };

  // Duplicate Supplier Handler
  const handleDuplicateSupplier = (sup: Supplier) => {
    setEditingSupplier(null);
    const nextCode = `SUP-${String(suppliers.length + 101).padStart(3, '0')}`;
    setFormData({
      supplierCode: nextCode,
      name: `${sup.name} (Copy)`,
      contactPerson: sup.contactPerson,
      phone: sup.phone,
      email: sup.email ? `copy_${sup.email}` : '',
      address: sup.address,
      city: sup.city,
      state: sup.state,
      country: sup.country || 'India',
      pincode: sup.pincode,
      gstNumber: sup.gstNumber || '',
      panNumber: sup.panNumber || '',
      paymentTerms: sup.paymentTerms,
      creditLimit: sup.creditLimit,
      bankName: sup.bankName || '',
      accountNumber: sup.accountNumber || '',
      ifscCode: sup.ifscCode || '',
      branchName: sup.branchName || '',
      status: 'Active',
      notes: sup.notes ? `[Duplicate of ${sup.supplierCode}] ${sup.notes}` : `Duplicate of ${sup.supplierCode}`,
    });
    setIsFormModalOpen(true);
    toast.info(`Cloned details from ${sup.name} into form.`);
  };

  // Save Supplier
  const handleSaveSupplier = () => {
    if (!formData.name.trim()) {
      toast.error('Supplier name is required.');
      return;
    }
    if (!formData.contactPerson.trim()) {
      toast.error('Contact person name is required.');
      return;
    }

    const payload: Supplier = {
      id: editingSupplier ? editingSupplier.id : `sup_${Date.now()}`,
      ...formData,
      totalPurchase: editingSupplier ? editingSupplier.totalPurchase : 0,
      paid: editingSupplier ? editingSupplier.paid : 0,
      payable: editingSupplier ? editingSupplier.payable : 0,
      createdAt: editingSupplier ? editingSupplier.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveSupplier(payload);
    toast.success(editingSupplier ? `Supplier ${payload.name} updated.` : `Supplier ${payload.name} added.`);
    setIsFormModalOpen(false);
  };

  // Filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const q = appliedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.supplierCode.toLowerCase().includes(q) ||
        s.contactPerson.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q);

      const matchesStatus =
        appliedStatus === 'All' || s.status.toLowerCase() === appliedStatus.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [suppliers, appliedSearch, appliedStatus]);

  const totalPages = Math.ceil(filteredSuppliers.length / pageSize) || 1;
  const paginatedSuppliers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSuppliers.slice(start, start + pageSize);
  }, [filteredSuppliers, currentPage, pageSize]);

  // Supplier Details Data Links
  const supplierPurchases = useMemo(() => {
    if (!selectedSupplier) return [];
    return purchases.filter((p) => p.supplierId === selectedSupplier.id);
  }, [purchases, selectedSupplier]);

  const supplierReturns = useMemo(() => {
    if (!selectedSupplier) return [];
    return purchaseReturns.filter((r) => r.supplierId === selectedSupplier.id);
  }, [purchaseReturns, selectedSupplier]);

  const getSupplierInitials = (name?: string): string => {
    if (!name) return 'SU';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Export Suppliers to Excel
  const handleExportExcel = () => {
    if (filteredSuppliers.length === 0) {
      toast.error('No supplier records available to export.');
      return;
    }

    const excelRows = filteredSuppliers.map((s, idx) => ({
      sNo: idx + 1,
      supplierCode: s.supplierCode,
      name: s.name,
      contactPerson: s.contactPerson || '-',
      phone: s.phone,
      email: s.email || '-',
      gstNumber: s.gstNumber || '-',
      creditLimit: Number(s.creditLimit || 0),
      totalPurchase: Number(s.totalPurchase || 0),
      paid: Number(s.paid || 0),
      payable: Number(s.payable || 0),
      status: s.status,
    }));

    exportTableToExcel({
      filename: `Suppliers_Report_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Suppliers Master',
      title: 'YAA CREATIONS CRM - SUPPLIERS & VENDORS DIRECTORY',
      subtitle: `Total Suppliers: ${filteredSuppliers.length} | Generated: ${new Date().toLocaleDateString('en-IN')}`,
      columns: [
        { header: '#', key: 'sNo', align: 'center', width: 8 },
        { header: 'Supplier Code', key: 'supplierCode', align: 'center', width: 14 },
        { header: 'Supplier Name', key: 'name', align: 'left', width: 26 },
        { header: 'Contact Person', key: 'contactPerson', align: 'left', width: 20 },
        { header: 'Phone', key: 'phone', align: 'left', width: 18 },
        { header: 'Email', key: 'email', align: 'left', width: 24 },
        { header: 'GSTIN', key: 'gstNumber', align: 'left', width: 18 },
        { header: 'Credit Limit (₹)', key: 'creditLimit', align: 'right', type: 'currency', width: 16 },
        { header: 'Total Purchase (₹)', key: 'totalPurchase', align: 'right', type: 'currency', width: 18 },
        { header: 'Paid (₹)', key: 'paid', align: 'right', type: 'currency', width: 16 },
        { header: 'Payable (₹)', key: 'payable', align: 'right', type: 'currency', width: 16 },
        { header: 'Status', key: 'status', align: 'center', width: 14 },
      ],
      data: excelRows,
      summaryRow: {
        sNo: 'TOTAL',
        name: `${filteredSuppliers.length} Suppliers`,
        payable: summary.totalPayables,
      },
    });

    toast.success(`Suppliers Excel report downloaded (${filteredSuppliers.length} records)!`);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
              <UsersRound className="w-4.5 h-4.5" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Suppliers & Vendors
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Manage vendor directories, credit limits, bank profiles, and accounts payable
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
            Add Supplier
          </Button>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Suppliers</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#33077C] flex items-center justify-center">
              <UsersRound className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">{summary.totalCount}</div>
            <div className="text-xs text-slate-500 mt-0.5">Active vendors catalog</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">{summary.activeCount}</div>
            <div className="text-xs text-emerald-600 font-medium mt-0.5">Eligible for POs</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Inactive / Blocked</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">{summary.inactiveCount}</div>
            <div className="text-xs text-slate-500 mt-0.5">Dormant vendors</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Payables</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-amber-600">
              ₹{summary.totalPayables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Accounts payable</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">New Suppliers</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">{summary.newSuppliersCount}</div>
            <div className="text-xs text-slate-500 mt-0.5">Added in last 30 days</div>
          </div>
        </div>
      </div>

      {/* 3. Search Bar & Filter Row */}
      <SearchBar
        value={pendingSearch}
        onChange={(val) => setPendingSearch(val)}
        placeholder="Search by supplier name, code, contact, email..."
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
                { label: 'Active', value: 'Active', dotColor: '#10b981' },
                { label: 'Inactive', value: 'Inactive', dotColor: '#64748b' },
                { label: 'Blocked', value: 'Blocked', dotColor: '#ef4444' },
              ]}
            />
          </div>
        }
        rightSlot={
          <div className="flex items-center gap-3 pr-1">
            <span className="text-xs font-semibold text-slate-500">
              Total Suppliers :{' '}
              <span className="text-[#33077C] font-bold">{filteredSuppliers.length}</span>
            </span>
          </div>
        }
      />

      {/* 4. Supplier Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200 min-w-[950px]">
            <thead>
              <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white tracking-wider uppercase">
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">SUPPLIER & CODE</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">CONTACT PERSON</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-center">CONTACT INFO</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">LOCATION</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-right">TOTAL PURCHASE</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-right">PAID / PAYABLE</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">STATUS</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {paginatedSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    <UsersRound className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    <p className="font-semibold text-slate-600 text-sm">No suppliers found</p>
                    <p className="text-xs text-slate-400 mt-1">Add a new supplier to begin purchasing goods.</p>
                  </td>
                </tr>
              ) : (
                paginatedSuppliers.map((sup) => {
                  const initials = getSupplierInitials(sup.name);

                  return (
                    <tr key={sup.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-200 font-sans">
                      {/* 1. Supplier & Code */}
                      <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#33077C] text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-xs shrink-0 select-none">
                            {initials}
                          </div>
                          <div className="flex flex-col">
                            <span
                              className="font-bold text-slate-900 text-xs sm:text-[14px] cursor-pointer hover:text-[#33077C] hover:underline"
                              onClick={() => {
                                setSelectedSupplier(sup);
                                setActiveTab('overview');
                                setIsDetailModalOpen(true);
                              }}
                            >
                              {sup.name}
                            </span>
                            <span className="text-[11px] font-bold text-[#33077C] tracking-wide mt-0.5">
                              {sup.supplierCode}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Contact Person */}
                      <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-[#33077C]" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 text-xs sm:text-[13px] block">
                              {sup.contactPerson}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium block">
                              Authorized Contact
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Contact Info */}
                      <td className="py-4 px-4 border border-slate-200 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          {sup.phone ? (
                            <a
                              href={`tel:${sup.phone}`}
                              className="w-8 h-8 rounded-lg bg-[#EBF3FF] hover:bg-[#dbeafe] flex items-center justify-center text-[#2563EB] hover:scale-110 transition-all shadow-2xs"
                              title={`Call ${sup.phone}`}
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          ) : null}
                          {sup.email ? (
                            <a
                              href={`mailto:${sup.email}`}
                              className="w-8 h-8 rounded-lg bg-[#FEEFEE] hover:bg-[#fee2e2] flex items-center justify-center text-[#EF4444] hover:scale-110 transition-all shadow-2xs"
                              title={`Email ${sup.email}`}
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </a>
                          ) : null}
                        </div>
                      </td>

                      {/* 4. Location */}
                      <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-[#33077C] shrink-0" />
                          <span>{sup.city || sup.address || 'N/A'}{sup.state ? `, ${sup.state}` : ''}</span>
                        </div>
                      </td>

                      {/* 5. Total Purchase */}
                      <td className="py-4 px-4 border border-slate-200 text-right whitespace-nowrap font-bold text-slate-900 text-xs sm:text-[13px]">
                        ₹{sup.totalPurchase.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* 6. Paid / Payable */}
                      <td className="py-4 px-4 border border-slate-200 text-right whitespace-nowrap">
                        <div className="font-bold text-emerald-600 text-xs">
                          ₹{sup.paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        {sup.payable > 0 ? (
                          <div className="text-[10px] text-amber-600 font-semibold mt-0.5">
                            Due: ₹{sup.payable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400">Clear</div>
                        )}
                      </td>

                      {/* 7. Status */}
                      <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap">
                        {sup.status === 'Active' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50/90 text-emerald-700 border border-emerald-300/80 text-xs font-bold shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>Active</span>
                          </span>
                        ) : sup.status === 'Blocked' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-300 text-xs font-bold shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                            <span>Blocked</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                            <span>Inactive</span>
                          </span>
                        )}
                      </td>

                      {/* 8. Actions */}
                      <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Print Button */}
                          <button
                            type="button"
                            title="Print Supplier Profile"
                            onClick={() => {
                              toast.info(`Preparing print for ${sup.name}...`);
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
                              title="Share Supplier Details"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activeShareId === sup.id) {
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
                                  setActiveShareId(sup.id);
                                }
                              }}
                              className="w-8 h-8 rounded-lg bg-transparent hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            >
                              <Forward className="w-4 h-4" />
                            </button>

                            {activeShareId === sup.id && sharePos && (
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
                                      const subject = encodeURIComponent(`Supplier Details: ${sup.name}`);
                                      const body = encodeURIComponent(
                                        `Supplier: ${sup.name}\nCode: ${sup.supplierCode}\nContact Person: ${sup.contactPerson}\nPhone: ${sup.phone}\nEmail: ${sup.email}\nAddress: ${sup.address || sup.city || ''}`
                                      );
                                      window.open(`mailto:${sup.email || ''}?subject=${subject}&body=${body}`, '_blank');
                                    }}
                                    className="flex flex-col items-center gap-1.5 p-1.5 rounded-xl hover:bg-slate-50 transition-all cursor-pointer group flex-1"
                                  >
                                    <div className="w-10 h-10 rounded-full bg-white border border-slate-100 shadow-xs flex items-center justify-center group-hover:scale-110 transition-transform">
                                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                                        <path d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6Z" fill="#EA4335" fillOpacity="0.1" />
                                        <path d="M20 4H4C2.9 4 2 4.9 2 6V6.5L12 13L22 6.5V6C22 4.9 21.1 4 20 4Z" fill="#EA4335" />
                                        <path d="M2 6.5V18C2 19.1 2.9 20 4 20H5V8.5L2 6.5Z" fill="#4285F4" />
                                        <path d="M22 6.5V18C22 19.1 21.1 20 20 20H19V8.5L22 6.5Z" fill="#34A853" />
                                        <path d="M19 20H5V8.5L12 13L19 8.5V20Z" fill="#FBBC04" fillOpacity="0.2" />
                                        <path d="M20 6L12 11.5L4 6H20Z" fill="#C5221F" />
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
                                        `*Supplier Details:*\n*Name:* ${sup.name}\n*Code:* ${sup.supplierCode}\n*Contact Person:* ${sup.contactPerson}\n*Phone:* ${sup.phone}\n*Email:* ${sup.email}`
                                      );
                                      const phoneClean = sup.phone.replace(/[^0-9]/g, '');
                                      window.open(`https://api.whatsapp.com/send?phone=${phoneClean}&text=${text}`, '_blank');
                                    }}
                                    className="flex flex-col items-center gap-1.5 p-1.5 rounded-xl hover:bg-slate-50 transition-all cursor-pointer group flex-1"
                                  >
                                    <div className="w-10 h-10 rounded-full bg-[#25D366] shadow-xs flex items-center justify-center group-hover:scale-110 transition-transform">
                                      <svg className="w-5 h-5 fill-white text-white" viewBox="0 0 24 24">
                                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
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
                                        `Supplier Details: ${sup.name} (${sup.supplierCode}) - Contact: ${sup.contactPerson}, Phone: ${sup.phone}`
                                      );
                                      const phoneClean = sup.phone.replace(/[^0-9]/g, '');
                                      window.open(`sms:${phoneClean}?body=${text}`, '_blank');
                                    }}
                                    className="flex flex-col items-center gap-1.5 p-1.5 rounded-xl hover:bg-slate-50 transition-all cursor-pointer group flex-1"
                                  >
                                    <div className="w-10 h-10 rounded-full bg-[#FF9800] shadow-xs flex items-center justify-center group-hover:scale-110 transition-transform">
                                      <svg className="w-5 h-5 fill-white text-white" viewBox="0 0 24 24">
                                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 10H6v-2h12v2zm0-3H6V7h12v2z" />
                                        <circle cx="8" cy="11" r="1.2" fill="white" />
                                        <circle cx="12" cy="11" r="1.2" fill="white" />
                                        <circle cx="16" cy="11" r="1.2" fill="white" />
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
                                if (activeDropdownId === sup.id) {
                                  setActiveDropdownId(null);
                                  setDropdownPos(null);
                                } else {
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
                                  setActiveDropdownId(sup.id);
                                }
                              }}
                              className="w-8 h-8 rounded-lg bg-transparent hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>

                          {activeDropdownId === sup.id && dropdownPos && (
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
                                  handleOpenEditModal(sup);
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
                                  handleDuplicateSupplier(sup);
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
                                  if (confirm(`Delete supplier ${sup.name}?`)) {
                                    deleteSupplier(sup.id);
                                    toast.success(`Supplier ${sup.name} deleted.`);
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
                                  toast.info(`Opening PDF for ${sup.name}...`);
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
                                  setSelectedSupplier(sup);
                                  setActiveTab('overview');
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
                                  toast.info(`Preparing print for ${sup.name}...`);
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
                                  setSelectedSupplier(sup);
                                  setActiveTab('purchases');
                                  setIsDetailModalOpen(true);
                                }}
                                className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
                              >
                                View History
                              </button>
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
      {filteredSuppliers.length > 0 && (
        <Pagination
          total={filteredSuppliers.length}
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
          MODAL 1: ADD / EDIT SUPPLIER MODAL
         ========================================== */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
        subtitle={editingSupplier ? 'Update supplier details, contact info, and tax profile' : 'Set supplier details, contact info, and registration numbers'}
        maxWidth="4xl"
        headerGradient={true}
        showBackIcon={true}
        hideCloseButton={true}
        onBack={() => setIsFormModalOpen(false)}
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSaveSupplier(); }} className="space-y-4 p-2 sm:p-4 max-h-[75vh] overflow-y-auto animate-in fade-in duration-150 text-xs">
          {/* Row 1: Supplier Code | Supplier Name | Contact Person */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Supplier Code <span className="text-slate-500">*</span>
              </label>
              <input
                type="text"
                readOnly
                disabled
                value={formData.supplierCode}
                className="w-full h-11 px-4 bg-slate-100/80 border border-slate-200 rounded-xl text-xs sm:text-[13px] font-semibold text-slate-700 outline-none cursor-not-allowed select-none"
              />
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Supplier / Company Name <span className="text-slate-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Contact Person Name <span className="text-slate-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.contactPerson}
                onChange={(e) => setFormData((prev) => ({ ...prev, contactPerson: e.target.value }))}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>
          </div>

          {/* Row 2: Phone Number | Email Address | Street Address */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Phone Number
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Street Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>
          </div>

          {/* Row 3: City | State | Pincode */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                State
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Pincode
              </label>
              <input
                type="text"
                value={formData.pincode}
                onChange={(e) => setFormData((prev) => ({ ...prev, pincode: e.target.value }))}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>
          </div>

          {/* Row 4: Country | GST/VAT Number | PAN Number */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Country
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData((prev) => ({ ...prev, country: e.target.value }))}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                GST Number
              </label>
              <input
                type="text"
                value={formData.gstNumber}
                onChange={(e) => setFormData((prev) => ({ ...prev, gstNumber: e.target.value }))}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                PAN Number
              </label>
              <input
                type="text"
                value={formData.panNumber}
                onChange={(e) => setFormData((prev) => ({ ...prev, panNumber: e.target.value }))}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>
          </div>

          {/* Row 5: Payment Terms | Credit Limit | Bank Name */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Payment Terms
              </label>
              <input
                type="text"
                value={formData.paymentTerms}
                onChange={(e) => setFormData((prev) => ({ ...prev, paymentTerms: e.target.value }))}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Credit Limit (₹)
              </label>
              <input
                type="number"
                min="0"
                value={formData.creditLimit}
                onChange={(e) => setFormData((prev) => ({ ...prev, creditLimit: Number(e.target.value) }))}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Bank Name
              </label>
              <input
                type="text"
                value={formData.bankName}
                onChange={(e) => setFormData((prev) => ({ ...prev, bankName: e.target.value }))}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>
          </div>

          {/* Row 6: Account Number | IFSC Code | Branch Name */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Account Number
              </label>
              <input
                type="text"
                value={formData.accountNumber}
                onChange={(e) => setFormData((prev) => ({ ...prev, accountNumber: e.target.value }))}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                IFSC Code
              </label>
              <input
                type="text"
                value={formData.ifscCode}
                onChange={(e) => setFormData((prev) => ({ ...prev, ifscCode: e.target.value }))}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Branch Name
              </label>
              <input
                type="text"
                value={formData.branchName}
                onChange={(e) => setFormData((prev) => ({ ...prev, branchName: e.target.value }))}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>
          </div>

          <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
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
              <span>Save</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ==========================================
          MODAL 2: TABBED SUPPLIER DETAIL MODAL
         ========================================== */}
      {selectedSupplier && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title="Supplier Details"
          subtitle="View profile, contact information, procurement history, and ledger balances"
          maxWidth="4xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setIsDetailModalOpen(false)}
        >
          <div className="space-y-5">
            {/* Top Profile / Header Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 flex items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#33077C] text-white flex items-center justify-center font-bold text-base sm:text-lg shrink-0 select-none">
                  {getSupplierInitials(selectedSupplier.name)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
                      {selectedSupplier.name}
                    </h3>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                      {selectedSupplier.supplierCode}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1.5">
                    <span className="text-slate-400 font-normal">Contact Person:</span>
                    <span className="text-slate-700">{selectedSupplier.contactPerson || '-'}</span>
                  </p>
                </div>
              </div>

              {/* Status Pill */}
              <div className="flex items-center shrink-0">
                {selectedSupplier.status === 'Active' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200/90 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Active
                  </span>
                )}
                {selectedSupplier.status === 'Blocked' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Blocked
                  </span>
                )}
                {selectedSupplier.status === 'Inactive' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 font-bold text-xs border border-slate-300 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    Inactive
                  </span>
                )}
              </div>
            </div>

            {/* Nav Tabs - Standalone Button Style */}
            <div className="flex flex-wrap items-center gap-2.5">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'purchases', label: 'Purchases' },
                { id: 'returns', label: 'Returns' },
                { id: 'outstanding', label: 'Outstanding Balance' },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer flex items-center gap-2 ${isActive
                      ? 'bg-[#33077C] text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs'
                      }`}
                  >
                    {isActive && (
                      <Check className="w-3.5 h-3.5 stroke-[3] text-white shrink-0" />
                    )}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-5">
                {/* 4 Top Metric Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div className="p-4 bg-purple-50/40 rounded-2xl border border-purple-100 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Purchase</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      ₹{selectedSupplier.totalPurchase.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-100 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Paid</span>
                    <div className="text-xl font-bold text-emerald-600 mt-1">
                      ₹{selectedSupplier.paid.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-100 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Payable</span>
                    <div className="text-xl font-bold text-amber-500 mt-1">
                      ₹{selectedSupplier.payable.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Credit Limit</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      ₹{selectedSupplier.creditLimit.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Two Column Layout Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                  {/* Left Column: Company & Registration Details */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3.5">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
                      <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[#33077C] flex items-center justify-center font-bold">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <span>Bank & Tax Details</span>
                    </div>

                    <div className="space-y-3 text-xs sm:text-[13px]">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-400 font-medium shrink-0">GSTIN</span>
                        <span className="font-bold text-slate-800 text-right">{selectedSupplier.gstNumber || '-'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                        <span className="text-slate-400 font-medium shrink-0">PAN Number</span>
                        <span className="font-bold text-slate-800 text-right">{selectedSupplier.panNumber || '-'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                        <span className="text-slate-400 font-medium shrink-0">Bank Name</span>
                        <span className="font-bold text-slate-800 text-right">{selectedSupplier.bankName || '-'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                        <span className="text-slate-400 font-medium shrink-0">Account Number</span>
                        <span className="font-bold text-slate-800 text-right">{selectedSupplier.accountNumber || '-'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                        <span className="text-slate-400 font-medium shrink-0">IFSC Code</span>
                        <span className="font-bold text-slate-800 text-right">{selectedSupplier.ifscCode || '-'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                        <span className="text-slate-400 font-medium shrink-0">Branch Name</span>
                        <span className="font-bold text-slate-800 text-right">{selectedSupplier.branchName || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Contact & Address Details */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3.5">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
                      <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[#33077C] flex items-center justify-center font-bold">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <span>Company Contact & Address</span>
                    </div>

                    <div className="space-y-3 text-xs sm:text-[13px]">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-400 font-medium shrink-0">Contact Person</span>
                        <span className="font-bold text-slate-800 text-right">{selectedSupplier.contactPerson || '-'}</span>
                      </div>

                      <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                        <span className="text-slate-400 font-medium shrink-0">Phone Number</span>
                        <span className="font-bold text-slate-800 text-right">{selectedSupplier.phone || '-'}</span>
                      </div>

                      <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                        <span className="text-slate-400 font-medium shrink-0">Email Address</span>
                        <span className="font-bold text-slate-800 text-right break-all">{selectedSupplier.email || '-'}</span>
                      </div>

                      <div className="flex items-start justify-between gap-4 pt-2.5 border-t border-slate-100">
                        <span className="text-slate-400 font-medium shrink-0">Street Address</span>
                        <span className="font-bold text-slate-800 text-right leading-snug">
                          {[selectedSupplier.address, selectedSupplier.city, selectedSupplier.state, selectedSupplier.pincode].filter(Boolean).join(', ') || '-'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                        <span className="text-slate-400 font-medium shrink-0">Payment Terms</span>
                        <span className="font-bold text-slate-800 text-right">{selectedSupplier.paymentTerms || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PURCHASES */}
            {activeTab === 'purchases' && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-slate-200 min-w-[720px]">
                    <thead>
                      <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white uppercase tracking-wider">
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white">PURCHASE NO</th>
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white">DATE</th>
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-right">GRAND TOTAL</th>
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-right">PAID AMOUNT</th>
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-right">BALANCE</th>
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-center">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs sm:text-[13px] font-sans">
                      {supplierPurchases.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400 font-medium border border-slate-200">
                            No purchase orders recorded with this supplier.
                          </td>
                        </tr>
                      ) : (
                        supplierPurchases.map((p) => {
                          const paidAmount = p.paidAmount ?? (p.grandTotal - (p.balance || 0));
                          return (
                            <tr key={p.id} className="hover:bg-slate-50/70 transition-colors border-b border-slate-200">
                              <td className="py-3.5 px-4 font-bold text-[#33077C] border border-slate-200 whitespace-nowrap">{p.purchaseNo}</td>
                              <td className="py-3.5 px-4 text-slate-600 font-medium border border-slate-200 whitespace-nowrap">{p.purchaseDate}</td>
                              <td className="py-3.5 px-4 text-right font-bold text-slate-900 border border-slate-200 whitespace-nowrap">₹{p.grandTotal.toLocaleString('en-IN')}</td>
                              <td className="py-3.5 px-4 text-right font-bold text-emerald-600 border border-slate-200 whitespace-nowrap">₹{paidAmount.toLocaleString('en-IN')}</td>
                              <td className="py-3.5 px-4 text-right font-bold text-amber-600 border border-slate-200 whitespace-nowrap">₹{p.balance.toLocaleString('en-IN')}</td>
                              <td className="py-3.5 px-4 text-center border border-slate-200 whitespace-nowrap">
                                <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${p.purchaseStatus === 'Completed' || p.purchaseStatus === 'Received'
                                  ? 'bg-purple-50/80 text-[#33077C] border-purple-200'
                                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  }`}>
                                  {p.purchaseStatus}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: RETURNS */}
            {activeTab === 'returns' && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-slate-200 min-w-[650px]">
                    <thead>
                      <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white uppercase tracking-wider">
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white">RETURN NO</th>
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white">PURCHASE NO</th>
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white">DATE</th>
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-right">RETURN AMOUNT</th>
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-center">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs sm:text-[13px] font-sans">
                      {supplierReturns.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400 font-medium border border-slate-200">
                            No purchase returns on record.
                          </td>
                        </tr>
                      ) : (
                        supplierReturns.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50/70 transition-colors border-b border-slate-200">
                            <td className="py-3.5 px-4 font-bold text-[#33077C] border border-slate-200 whitespace-nowrap">{r.returnNo}</td>
                            <td className="py-3.5 px-4 text-slate-700 font-medium border border-slate-200 whitespace-nowrap">{r.purchaseNo}</td>
                            <td className="py-3.5 px-4 text-slate-600 font-medium border border-slate-200 whitespace-nowrap">{r.returnDate}</td>
                            <td className="py-3.5 px-4 text-right font-bold text-slate-900 border border-slate-200 whitespace-nowrap">₹{r.returnAmount.toLocaleString('en-IN')}</td>
                            <td className="py-3.5 px-4 text-center border border-slate-200 whitespace-nowrap">
                              <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold bg-purple-50/80 text-[#33077C] border border-purple-200 shadow-2xs">
                                {r.returnStatus}
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

            {/* TAB: OUTSTANDING */}
            {activeTab === 'outstanding' && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-slate-200 min-w-[650px]">
                    <thead>
                      <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white uppercase tracking-wider">
                        <th className="py-3.5 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">METRIC / FIELD</th>
                        <th className="py-3.5 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-right">VALUE / DETAILS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs sm:text-[13px] font-sans">
                      <tr className="hover:bg-slate-50/70 transition-colors border-b border-slate-200">
                        <td className="py-3.5 px-5 font-bold text-slate-800 border border-slate-200">
                          Current Outstanding Payable
                        </td>
                        <td className="py-3.5 px-5 text-right font-bold text-amber-600 border border-slate-200">
                          ₹{selectedSupplier.payable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/70 transition-colors border-b border-slate-200">
                        <td className="py-3.5 px-5 font-bold text-slate-800 border border-slate-200">
                          Agreed Credit Limit
                        </td>
                        <td className="py-3.5 px-5 text-right font-bold text-slate-900 border border-slate-200">
                          ₹{selectedSupplier.creditLimit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/70 transition-colors border-b border-slate-200">
                        <td className="py-3.5 px-5 font-bold text-slate-800 border border-slate-200">
                          Standard Payment Terms
                        </td>
                        <td className="py-3.5 px-5 text-right font-bold text-[#33077C] border border-slate-200">
                          {selectedSupplier.paymentTerms || 'Net 30 Days'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="pt-4 flex justify-end items-center gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center gap-2"
              >
                <X className="w-4 h-4 text-slate-500" />
                <span>Close</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const supToEdit = selectedSupplier;
                  setIsDetailModalOpen(false);
                  handleOpenEditModal(supToEdit);
                }}
                className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2"
              >
                <Pencil className="w-4 h-4" />
                <span>Edit Supplier</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
