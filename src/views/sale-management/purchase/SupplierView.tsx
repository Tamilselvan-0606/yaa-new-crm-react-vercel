import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
  Loader2,
} from 'lucide-react';
import {
  useSalesManagementStore,
  Supplier,
  SupplierStatus,
} from '../../../store/useSalesManagementStore';
import {
  supplierApi,
  mapApiSupplierToSupplier,
  mapSupplierToPayload,
  ApiSupplier,
  CreateSupplierPayload,
  UpdateSupplierPayload,
} from '../../../api';
import { SupplierSchema, SupplierFormData } from '../../../validations';
import { FormError } from '../../../components/common/FormError';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { Pagination } from '../../../components/common/Pagination';
import { SearchBar } from '../../../components/common/SearchBar';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { exportTableToExcel } from '../../../utils/excelExport';
import { UniversalShareDropdown, formatSupplierShare } from '../../../utils/shareUtils';
import { toast } from 'sonner';

export const SupplierView: React.FC = () => {
  const {
    suppliers: storeSuppliers,
    purchases,
    purchaseReturns,
    saveSupplier,
    deleteSupplier,
    setSuppliersList,
  } = useSalesManagementStore();

  // API State
  const [apiSuppliers, setApiSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState<boolean>(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Search & Filter State
  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pendingStatus, setPendingStatus] = useState('All');
  const [appliedStatus, setAppliedStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch tracking refs to prevent duplicate concurrent calls
  const lastFetchKeyRef = useRef<string>('');
  const isFetchingRef = useRef<boolean>(false);

  // 3-Dots Action dropdown
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  // Share Popover State
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

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'purchases' | 'returns' | 'outstanding'>('overview');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(SupplierSchema),
    defaultValues: {
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
    },
  });

  // Load Suppliers from Live API with strict deduplication
  const loadSuppliers = useCallback(
    async (forceRefresh = false) => {
      const fetchKey = `${currentPage}_${pageSize}_${appliedSearch.trim()}_${appliedStatus}`;

      // Prevent concurrent calls or redundant re-fetching of identical parameters
      if (isFetchingRef.current) return;
      if (!forceRefresh && lastFetchKeyRef.current === fetchKey) return;

      isFetchingRef.current = true;
      lastFetchKeyRef.current = fetchKey;

      if (forceRefresh || !lastFetchKeyRef.current) {
        setIsLoading(true);
      } else {
        setIsFetching(true);
      }

      try {
        const res = await supplierApi.getSuppliers({
          page: currentPage,
          limit: pageSize,
          search: appliedSearch.trim() || undefined,
          status: appliedStatus !== 'All' ? appliedStatus : undefined,
          pagination_required: true,
        });

        if (res && res.data && Array.isArray(res.data)) {
          const mapped = res.data.map(mapApiSupplierToSupplier);
          setApiSuppliers(mapped);

          if (res.pagination) {
            setTotalRecords(res.pagination.totalRecords ?? mapped.length);
            setTotalPages(res.pagination.totalPages ?? (Math.ceil(mapped.length / pageSize) || 1));
          } else {
            setTotalRecords(mapped.length);
            setTotalPages(Math.ceil(mapped.length / pageSize) || 1);
          }
        } else {
          setApiSuppliers([]);
          setTotalRecords(0);
          setTotalPages(1);
        }
      } catch (err: any) {
        console.error('Failed to load suppliers from API:', err);
        setApiSuppliers([]);
        setTotalRecords(0);
        setTotalPages(1);

        if (forceRefresh) {
          const errMsg =
            err?.response?.data?.error?.message ||
            err?.response?.data?.message ||
            err?.message ||
            'Failed to fetch suppliers from server';
          toast.error(errMsg);
        }
      } finally {
        setIsLoading(false);
        setIsFetching(false);
        isFetchingRef.current = false;
      }
    },
    [currentPage, pageSize, appliedSearch, appliedStatus]
  );

  // Single effect to load suppliers on query/page changes
  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  // Active display list
  const displaySuppliers = apiSuppliers;

  // Summary Metrics
  const summary = useMemo(() => {
    const totalCount = totalRecords || displaySuppliers.length;
    const activeCount = displaySuppliers.filter((s) => s.status === 'Active').length;
    const inactiveCount = displaySuppliers.filter((s) => s.status === 'Inactive' || s.status === 'Blocked').length;
    const totalPayables = displaySuppliers.reduce((acc, s) => acc + (s.payable || 0), 0);
    const newSuppliersCount = displaySuppliers.filter((s) => {
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
  }, [displaySuppliers, totalRecords]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    const nextCode = `SUP-${Math.floor(1000 + Math.random() * 9000)}`;
    reset({
      supplierCode: nextCode,
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
    reset({
      supplierCode: sup.supplierCode,
      name: sup.name,
      contactPerson: sup.contactPerson || sup.name,
      phone: sup.phone,
      email: sup.email || '',
      address: sup.address || '',
      city: sup.city || '',
      state: sup.state || '',
      country: sup.country || 'India',
      pincode: sup.pincode || '',
      gstNumber: sup.gstNumber || '',
      panNumber: sup.panNumber || '',
      paymentTerms: sup.paymentTerms || 'Net 30 Days',
      creditLimit: sup.creditLimit || 0,
      bankName: sup.bankName || '',
      accountNumber: sup.accountNumber || '',
      ifscCode: sup.ifscCode || '',
      branchName: sup.branchName || '',
      status: (sup.status as 'Active' | 'Inactive' | 'Blocked') || 'Active',
      notes: sup.notes || '',
    });
    setEditingSupplier(sup);
    setIsFormModalOpen(true);
  };

  // Open Details Modal with API refresh
  const handleOpenDetailModal = async (sup: Supplier) => {
    setSelectedSupplier(sup);
    setActiveTab('overview');
    setIsDetailModalOpen(true);

    try {
      setIsDetailLoading(true);
      const res = await supplierApi.getSupplierById(sup.id);
      if (res && res.data) {
        setSelectedSupplier(mapApiSupplierToSupplier(res.data));
      }
    } catch {
      // Use cached sup
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Duplicate Supplier Handler
  const handleDuplicateSupplier = (sup: Supplier) => {
    setEditingSupplier(null);
    const nextCode = `SUP-${Math.floor(1000 + Math.random() * 9000)}`;
    reset({
      supplierCode: nextCode,
      name: `${sup.name} (Copy)`,
      contactPerson: sup.contactPerson || sup.name,
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
    toast.info(`Cloned details from "${sup.name}" into form.`);
  };

  // Save / Update Supplier
  const onSaveSupplier = async (data: SupplierFormData) => {
    try {
      setIsSubmittingForm(true);

      if (editingSupplier) {
        const payload: UpdateSupplierPayload = {
          name: data.name.trim(),
          phone: data.phone.trim(),
          address: data.address.trim(),
          city: data.city.trim(),
          state: data.state.trim(),
          country: data.country?.trim() || 'India',
          pincode: data.pincode.trim(),
          status: data.status || 'Active',
        };
        if (data.name?.trim()) payload.company = data.name.trim();
        if (data.email?.trim()) payload.email = data.email.trim();
        if (data.gstNumber?.trim()) payload.gstNumber = data.gstNumber.trim();
        if (data.panNumber?.trim()) payload.panNumber = data.panNumber.trim();
        if (data.paymentTerms?.trim()) payload.paymentTerms = data.paymentTerms.trim();

        const res = await supplierApi.updateSupplier(editingSupplier.id, payload);
        if (res && res.data) {
          const updated = mapApiSupplierToSupplier(res.data);
          saveSupplier(updated);
        } else {
          saveSupplier({
            ...editingSupplier,
            ...data,
            creditLimit: Number(data.creditLimit) || 0,
            updatedAt: new Date().toISOString(),
          });
        }
        toast.success(`Supplier "${data.name}" updated successfully.`);
      } else {
        const payload: CreateSupplierPayload = {
          name: data.name.trim(),
          phone: data.phone.trim(),
          address: data.address.trim(),
          city: data.city.trim(),
          state: data.state.trim(),
          country: data.country?.trim() || 'India',
          pincode: data.pincode.trim(),
          status: data.status || 'Active',
        };
        if (data.name?.trim()) payload.company = data.name.trim();
        if (data.email?.trim()) payload.email = data.email.trim();
        if (data.gstNumber?.trim()) payload.gstNumber = data.gstNumber.trim();
        if (data.panNumber?.trim()) payload.panNumber = data.panNumber.trim();
        if (data.paymentTerms?.trim()) payload.paymentTerms = data.paymentTerms.trim();

        const res = await supplierApi.createSupplier(payload);
        if (res && res.data) {
          const created = mapApiSupplierToSupplier(res.data);
          saveSupplier(created);
        } else {
          const newSup: Supplier = {
            id: `sup_${Date.now()}`,
            supplierCode: data.supplierCode || `SUP-${Date.now()}`,
            name: data.name,
            contactPerson: data.contactPerson || data.name,
            phone: data.phone || '',
            email: data.email || '',
            address: data.address || '',
            city: data.city || '',
            state: data.state || '',
            country: data.country || 'India',
            pincode: data.pincode || '',
            gstNumber: data.gstNumber || '',
            panNumber: data.panNumber || '',
            paymentTerms: data.paymentTerms || 'Net 30 Days',
            creditLimit: Number(data.creditLimit) || 0,
            bankName: data.bankName || '',
            accountNumber: data.accountNumber || '',
            ifscCode: data.ifscCode || '',
            branchName: data.branchName || '',
            status: data.status || 'Active',
            notes: data.notes || '',
            totalPurchase: 0,
            paid: 0,
            payable: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          saveSupplier(newSup);
        }
        toast.success(`Supplier "${data.name}" added successfully.`);
      }

      setIsFormModalOpen(false);
      loadSuppliers(true);
    } catch (error: any) {
      console.error('Error saving supplier:', error);
      const fieldErrors = error?.response?.data?.error?.fields;
      let msg =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        'Failed to save supplier. Please check required fields.';
      if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
        msg = fieldErrors.map((f: any) => `${f.path?.join('.') || 'field'}: ${f.message}`).join(' | ');
      }
      toast.error(msg);
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Delete Supplier
  const handleDeleteSupplier = async (sup: Supplier) => {
    if (!window.confirm(`Are you sure you want to delete supplier "${sup.name}" (${sup.supplierCode})?`)) {
      return;
    }

    try {
      setIsDeletingId(sup.id);
      await supplierApi.deleteSupplier(sup.id);
      toast.success(`Supplier "${sup.name}" deleted successfully.`);
      loadSuppliers(true);
    } catch (error: any) {
      console.error('Error deleting supplier:', error);
      const msg =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        'Failed to delete supplier.';
      toast.error(msg);
    } finally {
      setIsDeletingId(null);
    }
  };

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
    if (displaySuppliers.length === 0) {
      toast.error('No supplier records available to export.');
      return;
    }

    const excelRows = displaySuppliers.map((s, idx) => ({
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
      subtitle: `Total Suppliers: ${displaySuppliers.length} | Generated: ${new Date().toLocaleDateString('en-IN')}`,
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
        name: `${displaySuppliers.length} Suppliers`,
        payable: summary.totalPayables,
      },
    });

    toast.success(`Suppliers Excel report downloaded (${displaySuppliers.length} records)!`);
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
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">{summary.inactiveCount}</div>
            <div className="text-xs text-slate-500 mt-0.5">Procurement paused</div>
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
            <div className="text-xl font-bold text-slate-900">
              ₹{summary.totalPayables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-amber-600 font-medium mt-0.5">Pending vendor payments</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">New (30 Days)</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">{summary.newSuppliersCount}</div>
            <div className="text-xs text-indigo-600 font-medium mt-0.5">Recently onboarded</div>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <SearchBar
        placeholder="Search by supplier name, code, contact person, phone, email..."
        value={pendingSearch}
        onChange={(val) => setPendingSearch(val)}
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
            {isFetching && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#33077C]" />
                <span>Updating...</span>
              </div>
            )}
            <span className="text-xs font-semibold text-slate-500">
              Total Suppliers :{' '}
              <span className="text-[#33077C] font-bold">{totalRecords || displaySuppliers.length}</span>
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
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    <Loader2 className="w-8 h-8 mx-auto mb-2 text-[#33077C] animate-spin stroke-[2]" />
                    <p className="font-semibold text-slate-700 text-sm">Loading suppliers...</p>
                    <p className="text-xs text-slate-400 mt-1">Fetching live vendor directory from server</p>
                  </td>
                </tr>
              ) : displaySuppliers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    <UsersRound className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    <p className="font-semibold text-slate-600 text-sm">No suppliers found</p>
                    <p className="text-xs text-slate-400 mt-1">Add a new supplier to begin purchasing goods.</p>
                  </td>
                </tr>
              ) : (
                displaySuppliers.map((sup) => {
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
                              onClick={() => handleOpenDetailModal(sup)}
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
                              {sup.contactPerson || sup.name}
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
                        ₹{(sup.totalPurchase || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* 6. Paid / Payable */}
                      <td className="py-4 px-4 border border-slate-200 text-right whitespace-nowrap">
                        <div className="font-bold text-emerald-600 text-xs">
                          ₹{(sup.paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        {(sup.payable || 0) > 0 ? (
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
                          <UniversalShareDropdown
                            id={sup.id}
                            activeShareId={activeShareId}
                            setActiveShareId={setActiveShareId}
                            sharePos={sharePos}
                            setSharePos={setSharePos}
                            getShareData={() => formatSupplierShare(sup)}
                            title="Share Supplier Details"
                          />

                          {/* 3-dots Actions Dropdown */}
                          <div className="relative inline-block text-left action-dropdown-container">
                            <button
                              type="button"
                              title="More Options"
                              disabled={isDeletingId === sup.id}
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
                              className="w-8 h-8 rounded-lg bg-transparent hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                            >
                              {isDeletingId === sup.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                              ) : (
                                <MoreVertical className="w-4 h-4" />
                              )}
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
                                  handleDeleteSupplier(sup);
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
                                  handleOpenDetailModal(sup);
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
      {(totalRecords > 0 || displaySuppliers.length > 0) && (
        <Pagination
          total={totalRecords || displaySuppliers.length}
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
        <form noValidate onSubmit={handleSubmit(onSaveSupplier)} className="space-y-4 p-2 sm:p-4 max-h-[75vh] overflow-y-auto animate-in fade-in duration-150 text-xs">
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
                {...register('supplierCode')}
                className="w-full h-11 px-4 bg-slate-100/80 border border-slate-200 rounded-xl text-xs sm:text-[13px] font-semibold text-slate-700 outline-none cursor-not-allowed select-none"
              />
              <FormError message={errors.supplierCode?.message} />
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Supplier / Company Name <span className="text-slate-500">*</span>
              </label>
              <input
                type="text"
                {...register('name')}
                placeholder="e.g. Agarwal Components Pvt Ltd"
                className={`w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                  errors.name ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20' : 'border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                }`}
              />
              <FormError message={errors.name?.message} />
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Contact Person Name <span className="text-slate-500">*</span>
              </label>
              <input
                type="text"
                {...register('contactPerson')}
                placeholder="e.g. Ramesh Agarwal"
                className={`w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                  errors.contactPerson ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20' : 'border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                }`}
              />
              <FormError message={errors.contactPerson?.message} />
            </div>
          </div>

          {/* Row 2: Phone Number | Email Address | Street Address */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Phone Number <span className="text-slate-500">*</span>
              </label>
              <input
                type="text"
                {...register('phone')}
                placeholder="e.g. 9988776655"
                className={`w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                  errors.phone ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20' : 'border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                }`}
              />
              <FormError message={errors.phone?.message} />
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                {...register('email')}
                placeholder="e.g. procurement@agarwal.in"
                className={`w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                  errors.email ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20' : 'border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                }`}
              />
              <FormError message={errors.email?.message} />
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Street Address <span className="text-slate-500">*</span>
              </label>
              <input
                type="text"
                {...register('address')}
                placeholder="e.g. 45 Industrial Area, Phase 2"
                className={`w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                  errors.address ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20' : 'border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                }`}
              />
              <FormError message={errors.address?.message} />
            </div>
          </div>

          {/* Row 3: City | State | Pincode */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                City <span className="text-slate-500">*</span>
              </label>
              <input
                type="text"
                {...register('city')}
                placeholder="e.g. Delhi"
                className={`w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                  errors.city ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20' : 'border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                }`}
              />
              <FormError message={errors.city?.message} />
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                State <span className="text-slate-500">*</span>
              </label>
              <input
                type="text"
                {...register('state')}
                placeholder="e.g. Delhi"
                className={`w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                  errors.state ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20' : 'border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                }`}
              />
              <FormError message={errors.state?.message} />
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Pincode <span className="text-slate-500">*</span>
              </label>
              <input
                type="text"
                {...register('pincode')}
                placeholder="e.g. 110041"
                className={`w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                  errors.pincode ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20' : 'border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                }`}
              />
              <FormError message={errors.pincode?.message} />
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
                {...register('country')}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
              <FormError message={errors.country?.message} />
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                GST Number
              </label>
              <input
                type="text"
                {...register('gstNumber')}
                placeholder="e.g. 07AAACA1234A1ZV"
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
              <FormError message={errors.gstNumber?.message} />
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                PAN Number
              </label>
              <input
                type="text"
                {...register('panNumber')}
                placeholder="e.g. AAACA1234A"
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
              <FormError message={errors.panNumber?.message} />
            </div>
          </div>

          {/* Row 5: Payment Terms | Credit Limit | Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Payment Terms
              </label>
              <input
                type="text"
                {...register('paymentTerms')}
                placeholder="e.g. Net 30"
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
              <FormError message={errors.paymentTerms?.message} />
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Credit Limit (₹)
              </label>
              <input
                type="number"
                min="0"
                {...register('creditLimit', { valueAsNumber: true })}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
              <FormError message={errors.creditLimit?.message} />
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Status
              </label>
              <select
                {...register('status')}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Blocked">Blocked</option>
              </select>
              <FormError message={errors.status?.message} />
            </div>
          </div>

          {/* Row 6: Bank Name | Account Number | IFSC Code */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Bank Name
              </label>
              <input
                type="text"
                {...register('bankName')}
                placeholder="e.g. HDFC Bank"
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
              <FormError message={errors.bankName?.message} />
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Account Number
              </label>
              <input
                type="text"
                {...register('accountNumber')}
                placeholder="e.g. 50200012345678"
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
              <FormError message={errors.accountNumber?.message} />
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                IFSC Code
              </label>
              <input
                type="text"
                {...register('ifscCode')}
                placeholder="e.g. HDFC0000123"
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
              <FormError message={errors.ifscCode?.message} />
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
              disabled={isSubmittingForm}
              className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmittingForm ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save</span>
                </>
              )}
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

              {/* Status Pill & Spinner */}
              <div className="flex items-center gap-2.5 shrink-0">
                {isDetailLoading && (
                  <Loader2 className="w-4 h-4 animate-spin text-[#33077C]" />
                )}
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
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      isActive
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
                      ₹{(selectedSupplier.totalPurchase || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-100 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Paid</span>
                    <div className="text-xl font-bold text-emerald-600 mt-1">
                      ₹{(selectedSupplier.paid || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-100 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Payable</span>
                    <div className="text-xl font-bold text-amber-500 mt-1">
                      ₹{(selectedSupplier.payable || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Credit Limit</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      ₹{(selectedSupplier.creditLimit || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Two Column Layout Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                  {/* Left Column: Bank & Tax Details */}
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
                                <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${
                                  p.purchaseStatus === 'Completed' || p.purchaseStatus === 'Received'
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
                          ₹{(selectedSupplier.payable || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/70 transition-colors border-b border-slate-200">
                        <td className="py-3.5 px-5 font-bold text-slate-800 border border-slate-200">
                          Agreed Credit Limit
                        </td>
                        <td className="py-3.5 px-5 text-right font-bold text-slate-900 border border-slate-200">
                          ₹{(selectedSupplier.creditLimit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
