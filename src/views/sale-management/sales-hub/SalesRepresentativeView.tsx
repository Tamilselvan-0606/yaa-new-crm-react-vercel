import React, { useState, useMemo, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SalesRepresentativeSchema, SalesRepresentativeFormData } from '../../../validations';
import { FormError } from '../../../components/common/FormError';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Plus,
  Search,
  Phone,
  Mail,
  IndianRupee,
  AlertCircle,
  Calendar,
  Eye,
  Pencil,
  Trash2,
  Filter,
  CheckCircle2,
  Clock,
  CreditCard,
  Building2,
  X,
  Check,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  ShoppingCart,
  Receipt,
  FileText,
  MessageSquare,
} from 'lucide-react';
import {
  useSalesManagementStore,
  SalesRepresentative,
  SalesRepresentativeStatus,
  SalesCustomer,
} from '../../../store/useSalesManagementStore';
import { Modal } from '../../../components/common/Modal';
import { Pagination } from '../../../components/common/Pagination';
import { SearchBar } from '../../../components/common/SearchBar';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { toast } from 'sonner';

export const SalesRepresentativeView: React.FC = () => {
  const navigate = useNavigate();
  const {
    salesRepresentatives,
    customers,
    sales,
    paymentIns,
    collectionFollowUps,
    saveSalesRepresentative,
    setSalesRepresentativesList,
    deleteSalesRepresentative,
    getRepresentativeMetrics,
  } = useSalesManagementStore();

  // Purge legacy mock sales representatives (rep_1 to rep_4) on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('yaa_crm_sales_representatives');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          Array.isArray(parsed) &&
          parsed.some(
            (r) =>
              r.id &&
              (r.id === 'rep_1' ||
                r.id === 'rep_2' ||
                r.id === 'rep_3' ||
                r.id === 'rep_4')
          )
        ) {
          const cleaned = parsed.filter(
            (r) =>
              r.id !== 'rep_1' &&
              r.id !== 'rep_2' &&
              r.id !== 'rep_3' &&
              r.id !== 'rep_4'
          );
          setSalesRepresentativesList(cleaned);
        }
      }
    } catch {
      // ignore
    }
  }, [setSalesRepresentativesList]);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeRepTab, setActiveRepTab] = useState<'customers' | 'invoices' | 'follow-ups' | 'history'>('customers');
  const [editingRep, setEditingRep] = useState<SalesRepresentative | null>(null);
  const [selectedRep, setSelectedRep] = useState<SalesRepresentative | null>(null);

  // React Hook Form for Representative Add/Edit
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SalesRepresentativeFormData>({
    resolver: zodResolver(SalesRepresentativeSchema),
    defaultValues: {
      name: '',
      mobile: '',
      email: '',
      status: 'Active',
    },
  });

  const watchStatus = watch('status') || 'Active';

  const openCreateModal = () => {
    setEditingRep(null);
    reset({
      name: '',
      mobile: '',
      email: '',
      status: 'Active',
    });
    setIsFormModalOpen(true);
  };

  const openEditModal = (rep: SalesRepresentative) => {
    setEditingRep(rep);
    reset({
      name: rep.name,
      mobile: rep.mobile,
      email: rep.email || '',
      status: rep.status,
    });
    setIsFormModalOpen(true);
  };

  const openDetailModal = (rep: SalesRepresentative) => {
    setSelectedRep(rep);
    setActiveRepTab('customers');
    setIsDetailModalOpen(true);
  };

  const onSaveRep = (data: SalesRepresentativeFormData) => {
    try {
      saveSalesRepresentative({
        id: editingRep?.id,
        name: data.name.trim(),
        mobile: data.mobile.trim(),
        email: data.email?.trim() || '',
        status: (data.status as SalesRepresentativeStatus) || 'Active',
      });

      toast.success(
        editingRep
          ? `Sales representative "${data.name.trim()}" updated successfully`
          : `Sales representative "${data.name.trim()}" created successfully`
      );
      setIsFormModalOpen(false);
    } catch {
      toast.error('Failed to save sales representative. Please try again.');
    }
  };

  const handleDeleteRep = (rep: SalesRepresentative) => {
    deleteSalesRepresentative(rep.id);
    toast.success(`Sales representative "${rep.name}" deleted.`);
    if (selectedRep?.id === rep.id) {
      setIsDetailModalOpen(false);
      setSelectedRep(null);
    }
  };

  // Filtered dataset
  const filteredReps = useMemo(() => {
    return salesRepresentatives.filter((rep) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        rep.name.toLowerCase().includes(q) ||
        rep.mobile.includes(q) ||
        (rep.email && rep.email.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === 'All' || rep.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [salesRepresentatives, searchTerm, statusFilter]);

  const paginatedReps = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReps.slice(start, start + pageSize);
  }, [filteredReps, currentPage, pageSize]);

  // Selected Rep Metrics
  const selectedRepMetrics = useMemo(() => {
    if (!selectedRep) return null;
    return getRepresentativeMetrics(selectedRep.id);
  }, [selectedRep, getRepresentativeMetrics]);

  // Selected Rep Sales / Invoices
  const selectedRepSales = useMemo(() => {
    if (!selectedRep) return [];
    return sales.filter((s) => s.salesRepresentativeId === selectedRep.id);
  }, [selectedRep, sales]);

  // Selected Rep Collection Follow-ups
  const selectedRepFollowUps = useMemo(() => {
    if (!selectedRep) return [];
    return collectionFollowUps.filter(
      (f) =>
        f.salesRepresentativeId === selectedRep.id ||
        f.salesRepresentativeName?.toLowerCase() === selectedRep.name.toLowerCase()
    );
  }, [selectedRep, collectionFollowUps]);

  // Selected Rep Payments / History
  const selectedRepPayments = useMemo(() => {
    if (!selectedRep) return [];
    const repCustomerIds = (selectedRepMetrics?.assignedCustomers || []).map((c) => c.id);
    const repInvoiceIds = selectedRepSales.map((s) => s.id);
    return paymentIns.filter(
      (p) =>
        p.salesRepresentativeId === selectedRep.id ||
        repCustomerIds.includes(p.customerId) ||
        (p.invoiceId && repInvoiceIds.includes(p.invoiceId))
    );
  }, [selectedRep, selectedRepMetrics, selectedRepSales, paymentIns]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200/80 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-[#33077C]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Sales Representative
              </h1>
              <p className="text-xs sm:text-[13px] text-slate-500 mt-0.5">
                Manage sales representatives and their assigned customers.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={openCreateModal}
            className="h-10 px-4 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Add Sales Representative</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <SearchBar
            value={searchTerm}
            onChange={(val) => {
              setSearchTerm(val);
              setCurrentPage(1);
            }}
            placeholder="Search representative by name, mobile, email..."
          />
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {(['All', 'Active', 'Inactive'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setStatusFilter(tab);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-white text-[#33077C] shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {(searchTerm || statusFilter !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('All');
                setCurrentPage(1);
              }}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Sales Representative Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-[13px]">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/90 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4">Representative</th>
                <th className="py-3 px-4 text-center">Customers</th>
                <th className="py-3 px-4 text-center">Invoices</th>
                <th className="py-3 px-4 text-right">Outstanding</th>
                <th className="py-3 px-4 text-right">Collected</th>
                <th className="py-3 px-4 text-center">Collection Rate</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {paginatedReps.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <UserCheck className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                    <p className="font-semibold text-slate-600 text-sm">No Sales Representatives Found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {searchTerm ? 'Try adjusting your search criteria' : 'Click "+ Add Sales Representative" to create one'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedReps.map((rep) => {
                  const metrics = getRepresentativeMetrics(rep.id);
                  const repSales = sales.filter((s) => s.salesRepresentativeId === rep.id && s.saleStatus !== 'Cancelled');
                  const invoicesCount = repSales.length;
                  const totalBilled = repSales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
                  const outstanding = metrics?.totalOutstanding ?? 0;
                  const collected = metrics?.collectedThisMonth ?? repSales.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
                  const collectionRate = totalBilled > 0 ? (collected / totalBilled) * 100 : (metrics?.collectionRate ?? 0);

                  return (
                    <tr
                      key={rep.id}
                      onClick={() => openDetailModal(rep)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      {/* Name & Contacts */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900 group-hover:text-[#33077C] transition-colors">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-purple-100 text-[#33077C] flex items-center justify-center font-bold text-xs shrink-0">
                            {rep.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="block font-bold text-slate-900 text-xs sm:text-[13px]">{rep.name}</span>
                            <span className="text-[11px] text-slate-500 font-normal block mt-0.5">
                              {rep.mobile} {rep.email ? `• ${rep.email}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Customers count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                          {metrics.assignedCustomersCount}
                        </span>
                      </td>

                      {/* Invoices count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-xs font-bold bg-purple-50 text-[#33077C] border border-purple-200">
                          {invoicesCount}
                        </span>
                      </td>

                      {/* Outstanding */}
                      <td className="py-3.5 px-4 text-right">
                        {outstanding > 0 ? (
                          <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            ₹{outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            ₹0.00
                          </span>
                        )}
                      </td>

                      {/* Collected */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          ₹{collected.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Collection Rate */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-[#33077C] border border-purple-200">
                          {collectionRate.toFixed(0)}%
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {rep.status === 'Active' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td
                        className="py-3.5 px-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openDetailModal(rep)}
                            className="h-8 px-2.5 rounded-lg text-slate-600 hover:text-[#33077C] hover:bg-purple-50 flex items-center gap-1 font-semibold text-xs transition-colors cursor-pointer"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                          <span className="text-slate-300">/</span>
                          <button
                            type="button"
                            onClick={() => openEditModal(rep)}
                            className="h-8 px-2.5 rounded-lg text-slate-600 hover:text-[#33077C] hover:bg-purple-50 flex items-center gap-1 font-semibold text-xs transition-colors cursor-pointer"
                            title="Edit Representative"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit</span>
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

        {/* Pagination */}
        {filteredReps.length > 0 && (
          <div className="p-3 border-t border-slate-100 bg-white">
            <Pagination
              totalItems={filteredReps.length}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* ADD / EDIT SALES REPRESENTATIVE MODAL                        */}
      {/* ============================================================ */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingRep ? `Edit Sales Representative: ${editingRep.name}` : 'Add Sales Representative'}
        subtitle={
          editingRep
            ? 'Update representative contact information and active status'
            : 'Register a new sales representative to assign customer collections'
        }
        maxWidth="lg"
        headerGradient={true}
        showBackIcon={true}
        hideCloseButton={true}
        onBack={() => setIsFormModalOpen(false)}
      >
        <form onSubmit={handleSubmit(onSaveRep)} noValidate>
          <div className="space-y-4 p-2 sm:p-4 text-xs">
            {/* Representative Name */}
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-600 block mb-1.5">
                Representative Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                {...register('name')}
                placeholder="e.g. Arun Kumar"
                className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                  errors.name
                    ? 'border border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 bg-rose-50/20'
                    : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                }`}
              />
              <FormError error={errors.name} />
            </div>

            {/* Mobile Number */}
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-600 block mb-1.5">
                Mobile Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                maxLength={10}
                {...register('mobile')}
                placeholder="e.g. 9876543210 (10 digits)"
                className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                  errors.mobile
                    ? 'border border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 bg-rose-50/20'
                    : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                }`}
              />
              <FormError error={errors.mobile} />
            </div>

            {/* Email Address */}
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-600 block mb-1.5">
                Email Address (Optional)
              </label>
              <input
                type="email"
                {...register('email')}
                placeholder="e.g. arun@example.com"
                className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                  errors.email
                    ? 'border border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 bg-rose-50/20'
                    : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                }`}
              />
              <FormError error={errors.email} />
            </div>

            {/* Status */}
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-600 block mb-1.5">
                Status <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setValue('status', 'Active', { shouldValidate: true })}
                  className={`h-11 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs sm:text-[13px] cursor-pointer transition-all ${
                    watchStatus === 'Active'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-2xs ring-2 ring-emerald-500/20'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  <span>Active</span>
                </button>

                <button
                  type="button"
                  onClick={() => setValue('status', 'Inactive', { shouldValidate: true })}
                  className={`h-11 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs sm:text-[13px] cursor-pointer transition-all ${
                    watchStatus === 'Inactive'
                      ? 'bg-slate-100 border-slate-400 text-slate-800 shadow-2xs ring-2 ring-slate-400/20'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>Inactive</span>
                </button>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 mt-4 flex justify-end items-center gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
              className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2 disabled:opacity-60"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{editingRep ? 'Save Changes' : 'Create Representative'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* SALES REPRESENTATIVE DETAIL DRAWER / MODAL                   */}
      {/* ============================================================ */}
      {selectedRep && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Sales Representative: ${selectedRep.name}`}
          subtitle={`Mobile: ${selectedRep.mobile} ${selectedRep.email ? `• ${selectedRep.email}` : ''}`}
          maxWidth="4xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setIsDetailModalOpen(false)}
        >
          <div className="space-y-6 p-2 sm:p-4 text-xs">
            {/* Top Bar: Rep Info & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#33077C] text-white font-bold text-base flex items-center justify-center">
                  {selectedRep.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{selectedRep.name}</h3>
                    {selectedRep.status === 'Active' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {selectedRep.mobile}
                    </span>
                    {selectedRep.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {selectedRep.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    openEditModal(selectedRep);
                  }}
                  className="h-9 px-3 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteRep(selectedRep)}
                  className="h-9 px-3 rounded-lg border border-rose-200 hover:border-rose-300 text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>

            {/* Performance Summary Cards (4) */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                Collection Performance Summary
              </h4>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Card 1: Assigned Customers */}
                <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#33077C] uppercase tracking-wider">
                      Assigned Customers
                    </span>
                    <Users className="w-4 h-4 text-[#33077C]" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900 mt-2">
                    {selectedRepMetrics?.assignedCustomersCount || 0}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Active accounts</p>
                </div>

                {/* Card 2: Total Outstanding */}
                <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                      Total Outstanding
                    </span>
                    <IndianRupee className="w-4 h-4 text-amber-700" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900 mt-2">
                    ₹{(selectedRepMetrics?.totalOutstanding || 0).toLocaleString('en-IN', {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Assigned dues</p>
                </div>

                {/* Card 3: Overdue Amount */}
                <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
                      Overdue Amount
                    </span>
                    <Clock className="w-4 h-4 text-rose-600" />
                  </div>
                  <p className="text-2xl font-bold text-rose-600 mt-2">
                    ₹{(selectedRepMetrics?.overdueAmount || 0).toLocaleString('en-IN', {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                  <p className="text-[11px] text-rose-700/80 mt-0.5">Requires follow-up</p>
                </div>

                {/* Card 4: Collected This Month */}
                <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                      Collected This Month
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-bold text-emerald-700 mt-2">
                    ₹{(selectedRepMetrics?.collectedThisMonth || 0).toLocaleString('en-IN', {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                  <p className="text-[11px] text-emerald-700/80 mt-0.5">
                    Rate: {(selectedRepMetrics?.collectionRate || 0).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            {/* 4 Tabs Navigation: Customers, Invoices, Follow-ups, Collection History */}
            <div className="space-y-4">
              <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveRepTab('customers')}
                  className={`pb-3 px-3 font-bold text-xs border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeRepTab === 'customers'
                      ? 'border-[#33077C] text-[#33077C]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Customers ({selectedRepMetrics?.assignedCustomers.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveRepTab('invoices')}
                  className={`pb-3 px-3 font-bold text-xs border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeRepTab === 'invoices'
                      ? 'border-[#33077C] text-[#33077C]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Invoices ({selectedRepSales.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveRepTab('follow-ups')}
                  className={`pb-3 px-3 font-bold text-xs border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeRepTab === 'follow-ups'
                      ? 'border-[#33077C] text-[#33077C]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Follow-ups ({selectedRepFollowUps.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveRepTab('history')}
                  className={`pb-3 px-3 font-bold text-xs border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeRepTab === 'history'
                      ? 'border-[#33077C] text-[#33077C]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  <span>Collection History ({selectedRepPayments.length})</span>
                </button>
              </div>

              {/* TAB 1: CUSTOMERS */}
              {activeRepTab === 'customers' && (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Assigned Customers ({selectedRepMetrics?.assignedCustomers.length || 0})
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        navigate('/sale-management/sales/customer');
                      }}
                      className="text-xs font-semibold text-[#33077C] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Manage Customers</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                          <th className="py-2.5 px-3">Customer</th>
                          <th className="py-2.5 px-3">Phone</th>
                          <th className="py-2.5 px-3 text-right">Outstanding</th>
                          <th className="py-2.5 px-3 text-right">Overdue</th>
                          <th className="py-2.5 px-3">Last Payment</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {!selectedRepMetrics?.assignedCustomers || selectedRepMetrics.assignedCustomers.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-8 text-slate-400">
                              <Users className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                              <p className="font-semibold text-slate-500">No Customers Assigned Yet</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Edit customer records in Customer Master to assign them to {selectedRep.name}.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          selectedRepMetrics.assignedCustomers.map((cust) => {
                            const custSales = sales.filter((s) => s.customerId === cust.id && s.saleStatus !== 'Cancelled');
                            const todayStr = '2026-10-08';
                            const custOutstanding = custSales.reduce(
                              (sum, s) => sum + (s.balance !== undefined ? s.balance : Math.max(0, (s.grandTotal || 0) - (s.paidAmount || 0))),
                              0
                            );
                            const custOverdue = custSales.reduce((sum, s) => {
                              const bal = s.balance !== undefined ? s.balance : Math.max(0, (s.grandTotal || 0) - (s.paidAmount || 0));
                              return bal > 0 && s.dueDate < todayStr ? sum + bal : sum;
                            }, 0);

                            const lastPayment = paymentIns.find((p) => p.customerId === cust.id && p.status !== 'Cancelled');

                            return (
                              <tr key={cust.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-2.5 px-3 font-semibold text-slate-900">
                                  <div>{cust.name}</div>
                                  {cust.company && (
                                    <div className="text-[11px] text-slate-500 font-normal">{cust.company}</div>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 font-medium">{cust.phone}</td>
                                <td className="py-2.5 px-3 text-right">
                                  {custOutstanding > 0 ? (
                                    <span className="font-bold text-slate-900">
                                      ₹{custOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">₹0.00</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  {custOverdue > 0 ? (
                                    <span className="font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                      ₹{custOverdue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600">
                                  {lastPayment ? (
                                    <div>
                                      <span className="font-semibold text-emerald-600">
                                        ₹{Number(lastPayment.receivedAmount ?? lastPayment.amount ?? 0).toLocaleString()}
                                      </span>{' '}
                                      <span className="text-[10px] text-slate-400">({lastPayment.date || lastPayment.paymentDate})</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic">None recorded</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {cust.status === 'Active' ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      Active
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                      {cust.status}
                                    </span>
                                  )}
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

              {/* TAB 2: INVOICES */}
              {activeRepTab === 'invoices' && (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Assigned Invoices ({selectedRepSales.length})
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        navigate('/sale-management/sales/sale');
                      }}
                      className="text-xs font-semibold text-[#33077C] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Manage Invoices</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                          <th className="py-2.5 px-3">Invoice</th>
                          <th className="py-2.5 px-3">Customer</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Due Date</th>
                          <th className="py-2.5 px-3 text-right">Total Amount</th>
                          <th className="py-2.5 px-3 text-right">Balance Due</th>
                          <th className="py-2.5 px-3 text-center">Payment Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedRepSales.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-8 text-slate-400">
                              <ShoppingCart className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                              <p className="font-semibold text-slate-500">No Invoices Assigned</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Invoices assigned to {selectedRep.name} will appear here.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          selectedRepSales.map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-2.5 px-3 font-bold text-[#33077C] font-mono">{s.invoiceNo}</td>
                              <td className="py-2.5 px-3 font-medium text-slate-800">{s.customerName}</td>
                              <td className="py-2.5 px-3 text-slate-600">{s.saleDate}</td>
                              <td className="py-2.5 px-3 text-slate-600">{s.dueDate || '—'}</td>
                              <td className="py-2.5 px-3 text-right font-medium text-slate-900">
                                ₹{s.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                                ₹{s.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    s.paymentStatus === 'Paid'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : s.paymentStatus === 'Partial'
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}
                                >
                                  {s.paymentStatus}
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

              {/* TAB 3: FOLLOW-UPS */}
              {activeRepTab === 'follow-ups' && (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Collection Follow-ups ({selectedRepFollowUps.length})
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        navigate('/sale-management/sales/collections?subView=follow-ups');
                      }}
                      className="text-xs font-semibold text-[#33077C] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Open Follow-ups Hub</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Customer</th>
                          <th className="py-2.5 px-3">Invoice</th>
                          <th className="py-2.5 px-3">Method</th>
                          <th className="py-2.5 px-3">Outcome</th>
                          <th className="py-2.5 px-3">Discussion Notes</th>
                          <th className="py-2.5 px-3">Next Follow-up</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedRepFollowUps.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-8 text-slate-400">
                              <Clock className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                              <p className="font-semibold text-slate-500">No Follow-ups Logged Yet</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Follow-ups logged by or for {selectedRep.name} will appear here.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          selectedRepFollowUps.map((f) => (
                            <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-2.5 px-3 text-slate-600 font-mono">{f.followUpDate}</td>
                              <td className="py-2.5 px-3 font-bold text-slate-900">{f.customerName}</td>
                              <td className="py-2.5 px-3 font-mono text-[#33077C]">{f.invoiceNo || '—'}</td>
                              <td className="py-2.5 px-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                                  {f.contactMethod}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    f.outcome === 'Promise to Pay' || f.outcome === 'Payment Received'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : f.outcome === 'Dispute Raised'
                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                        : 'bg-purple-50 text-[#33077C] border border-purple-200'
                                  }`}
                                >
                                  {f.outcome}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={f.notes}>
                                {f.notes}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-purple-700">
                                {f.nextFollowUpDate || '—'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: COLLECTION HISTORY */}
              {activeRepTab === 'history' && (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Collection History ({selectedRepPayments.length})
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        navigate('/sale-management/sales/collections?subView=collection-history');
                      }}
                      className="text-xs font-semibold text-[#33077C] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>View Full History</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                          <th className="py-2.5 px-3">Receipt / Payment ID</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Customer</th>
                          <th className="py-2.5 px-3">Mode</th>
                          <th className="py-2.5 px-3">Ref / Txn No</th>
                          <th className="py-2.5 px-3 text-right">Amount Collected</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedRepPayments.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-8 text-slate-400">
                              <Receipt className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                              <p className="font-semibold text-slate-500">No Payments Recorded Yet</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Payment receipts recorded for {selectedRep.name}'s accounts will appear here.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          selectedRepPayments.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-bold text-[#33077C]">
                                {p.receiptNo || p.id}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">{p.paymentDate || p.date}</td>
                              <td className="py-2.5 px-3 font-medium text-slate-900">{p.partyName}</td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-700">
                                  {p.paymentMethod}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-500">{p.referenceNo || '—'}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                                ₹{Number(p.receivedAmount ?? p.amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Completed
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
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
