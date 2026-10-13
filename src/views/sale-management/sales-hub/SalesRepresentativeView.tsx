import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Users,
  UserCheck,
  Plus,
  Search,
  Phone,
  Mail,
  IndianRupee,
  AlertCircle,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  Receipt,
  ShoppingCart,
  ArrowRight,
  Check,
  Loader2,
} from 'lucide-react';
import {
  salesRepresentativeApi,
  ApiSalesRepresentative,
  ApiRepPortfolio,
} from '../../../api/commerce/salesRepresentativeApi';
import {
  collectionApi,
  CollectionFollowUpItem,
  CollectionHistoryItem,
} from '../../../api/commerce/collectionApi';
import { SalesRepresentativeSchema, SalesRepFormData } from '../../../schemas';
import { Modal } from '../../../components/common/Modal';
import { Pagination } from '../../../components/common/Pagination';
import { SearchBar } from '../../../components/common/SearchBar';
import { FormError } from '../../../components/common/FormError';
import { toast } from 'sonner';

// Auto-generate a secure random password (user doesn't need to set this)
const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$!';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// ─── helper ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const SalesRepresentativeView: React.FC = () => {
  const navigate = useNavigate();

  // ── list state ──────────────────────────────────────────────────────────
  const [reps, setReps] = useState<ApiSalesRepresentative[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isListLoading, setIsListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // ── filters / pagination ─────────────────────────────────────────────────
  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Inactive'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // ── portfolio (detail) state ─────────────────────────────────────────────
  const [selectedRep, setSelectedRep] = useState<ApiSalesRepresentative | null>(null);
  const [portfolio, setPortfolio] = useState<ApiRepPortfolio | null>(null);
  const [isPortfolioLoading, setIsPortfolioLoading] = useState(false);
  const [activeRepTab, setActiveRepTab] = useState<'customers' | 'invoices' | 'follow-ups' | 'history'>('customers');

  // portfolio follow-ups / history (from collection API for richer data)
  const [repFollowUps, setRepFollowUps] = useState<CollectionFollowUpItem[]>([]);
  const [repHistory, setRepHistory] = useState<CollectionHistoryItem[]>([]);

  // ── form / modal state ───────────────────────────────────────────────────
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingRep, setEditingRep] = useState<ApiSalesRepresentative | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── react-hook-form ──────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    formState: { errors },
  } = useForm<SalesRepFormData>({
    resolver: zodResolver(SalesRepresentativeSchema),
    defaultValues: { name: '', mobile: '', email: '', designation: '', status: 'Active' },
  });

  const watchStatus = watch('status');

  // ── load list ────────────────────────────────────────────────────────────
  const loadReps = useCallback(async () => {
    setIsListLoading(true);
    setListError(null);
    try {
      const res = await salesRepresentativeApi.getList({
        page: currentPage,
        limit: pageSize,
        search: appliedSearch || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });
      if (res.success) {
        setReps(res.data ?? []);
        setTotalRecords(res.pagination?.totalRecords ?? res.data?.length ?? 0);
        setTotalPages(res.pagination?.totalPages ?? 1);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Failed to load sales representatives.';
      setListError(msg);
    } finally {
      setIsListLoading(false);
    }
  }, [currentPage, pageSize, appliedSearch, statusFilter]);

  useEffect(() => {
    loadReps();
  }, [loadReps]);

  // ── load portfolio when detail modal opens ────────────────────────────────
  const loadPortfolio = useCallback(async (rep: ApiSalesRepresentative) => {
    setIsPortfolioLoading(true);
    setPortfolio(null);
    setRepFollowUps([]);
    setRepHistory([]);
    try {
      // Primary: portfolio endpoint
      const res = await salesRepresentativeApi.getPortfolio(rep.id);
      if (res.success) setPortfolio(res.data);

      // Secondary: richer follow-ups from collection API
      const fuRes = await collectionApi.getFollowUps({ salesRepresentativeId: rep.id, limit: 50 });
      if (fuRes.success) setRepFollowUps(fuRes.data ?? []);

      // Secondary: collection history
      const histRes = await collectionApi.getCollectionHistory({ salesRepresentativeId: rep.id, limit: 50 });
      if (histRes.success) setRepHistory(histRes.data ?? []);
    } catch {
      // If portfolio endpoint 404, show empty state gracefully
    } finally {
      setIsPortfolioLoading(false);
    }
  }, []);

  const openDetailModal = (rep: ApiSalesRepresentative) => {
    setSelectedRep(rep);
    setActiveRepTab('customers');
    setIsDetailModalOpen(true);
    loadPortfolio(rep);
  };

  // ── form helpers ─────────────────────────────────────────────────────────
  const openCreateModal = () => {
    setEditingRep(null);
    reset({ name: '', mobile: '', email: '', designation: '', status: 'Active' });
    setIsFormModalOpen(true);
  };

  const openEditModal = (rep: ApiSalesRepresentative) => {
    setEditingRep(rep);
    reset({
      name: rep.name,
      mobile: rep.mobile,
      email: rep.email || '',
      designation: rep.designation || '',
      status: rep.status,
    });
    setIsFormModalOpen(true);
  };

  const onSubmit = async (data: SalesRepFormData) => {
    setIsSubmitting(true);
    try {
      if (editingRep) {
        const res = await salesRepresentativeApi.update(editingRep.id, {
          name: data.name.trim(),
          mobile: data.mobile.trim(),
          email: data.email?.trim() || undefined,
          designation: data.designation?.trim() || undefined,
          status: data.status,
        });
        if (res.success) {
          toast.success(`"${data.name}" updated successfully`);
          setIsFormModalOpen(false);
          loadReps();
          if (selectedRep?.id === editingRep.id && res.data) setSelectedRep(res.data);
        }
      } else {
        const autoPassword = generatePassword();
        const res = await salesRepresentativeApi.create({
          name: data.name.trim(),
          mobile: data.mobile.trim(),
          email: data.email?.trim() || '',
          designation: data.designation?.trim() || undefined,
          password: autoPassword,
          confirmPassword: autoPassword,
          status: data.status,
        });
        if (res.success) {
          toast.success(`"${data.name}" created successfully`);
          setIsFormModalOpen(false);
          loadReps();
        }
      }
    } catch (err: any) {
      const code = err?.response?.data?.error?.code;
      const msg = err?.response?.data?.error?.message;
      if (code === 'DUPLICATE_EMAIL') {
        setError('email', { message: 'This email is already registered. Use a different email.' });
      } else {
        toast.error(msg || 'Failed to save representative. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (rep: ApiSalesRepresentative) => {
    try {
      await salesRepresentativeApi.remove(rep.id);
      toast.success(`"${rep.name}" deleted.`);
      if (selectedRep?.id === rep.id) {
        setIsDetailModalOpen(false);
        setSelectedRep(null);
      }
      loadReps();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to delete representative.');
    }
  };

  // ── derived portfolio values ──────────────────────────────────────────────
  const summary = portfolio?.summary ?? null;
  const portfolioCustomers = portfolio?.customers ?? [];
  const portfolioInvoices = portfolio?.invoices ?? [];
  const followUps = repFollowUps.length > 0 ? repFollowUps : (portfolio?.followUps ?? []);
  const history = repHistory.length > 0 ? repHistory : (portfolio?.collectionHistory ?? []);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200/80 flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-[#33077C]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Sales Representatives
            </h1>
            <p className="text-xs sm:text-[13px] text-slate-500 mt-0.5">
              Manage sales reps, portfolio metrics, and collection performance.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCreateModal}
            className="h-10 px-4 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Add Sales Representative</span>
          </button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-md flex gap-2">
          <SearchBar
            value={pendingSearch}
            onChange={setPendingSearch}
            placeholder="Search by name, mobile, email..."
          />
          <button
            type="button"
            onClick={() => { setAppliedSearch(pendingSearch); setCurrentPage(1); }}
            className="h-10 px-3 rounded-xl bg-[#33077C] text-white text-xs font-bold hover:bg-[#4309A2] transition-all"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {(['ALL', 'Active', 'Inactive'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => { setStatusFilter(tab); setCurrentPage(1); }}
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
          {(appliedSearch || statusFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => { setPendingSearch(''); setAppliedSearch(''); setStatusFilter('ALL'); setCurrentPage(1); }}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
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
              {isListLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <Loader2 className="w-8 h-8 mx-auto text-[#33077C] animate-spin mb-2" />
                    <p className="text-slate-500 text-sm font-medium">Loading representatives…</p>
                  </td>
                </tr>
              ) : listError ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <AlertCircle className="w-8 h-8 mx-auto text-rose-400 mb-2" />
                    <p className="text-slate-700 font-semibold text-sm">{listError}</p>
                    <button
                      onClick={loadReps}
                      className="mt-3 text-xs text-[#33077C] underline font-semibold"
                    >
                      Retry
                    </button>
                  </td>
                </tr>
              ) : reps.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <UserCheck className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                    <p className="font-semibold text-slate-600 text-sm">No Sales Representatives Found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {appliedSearch ? 'Try adjusting your search.' : 'Click "+ Add Sales Representative" to create one.'}
                    </p>
                  </td>
                </tr>
              ) : (
                reps.map((rep) => (
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
                            {rep.mobile}
                            {rep.designation ? ` - ${rep.designation}` : ''}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Customers count */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                        {rep.assignedCustomersCount ?? 0}
                      </span>
                    </td>

                    {/* Invoices count */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-xs font-bold bg-purple-50 text-[#33077C] border border-purple-200">
                        {rep.assignedInvoicesCount ?? 0}
                      </span>
                    </td>

                    {/* Outstanding */}
                    <td className="py-3.5 px-4 text-right">
                      {(rep.totalOutstandingAmount ?? 0) > 0 ? (
                        <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          ₹{fmt(rep.totalOutstandingAmount)}
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
                        ₹{fmt(rep.totalCollectedAmount ?? 0)}
                      </span>
                    </td>

                    {/* Collection Rate */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-[#33077C] border border-purple-200">
                        {(rep.collectionRatePercent ?? 0).toFixed(1)}%
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      {rep.status === 'Active' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Inactive
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => openDetailModal(rep)}
                          className="h-8 px-2.5 rounded-lg text-slate-600 hover:text-[#33077C] hover:bg-purple-50 flex items-center gap-1 font-semibold text-xs transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /><span>View</span>
                        </button>
                        <span className="text-slate-300">/</span>
                        <button
                          type="button"
                          onClick={() => openEditModal(rep)}
                          className="h-8 px-2.5 rounded-lg text-slate-600 hover:text-[#33077C] hover:bg-purple-50 flex items-center gap-1 font-semibold text-xs transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" /><span>Edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isListLoading && reps.length > 0 && (
          <div className="p-3 border-t border-slate-100 bg-white">
            <Pagination
              totalItems={totalRecords}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={() => {}}
            />
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* ADD / EDIT MODAL                                                  */}
      {/* ================================================================ */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingRep ? `Edit: ${editingRep.name}` : 'Add Sales Representative'}
        subtitle={
          editingRep
            ? 'Update representative information and status'
            : 'Fill in the details to register a new sales representative'
        }
        maxWidth="lg"
        headerGradient={true}
        showBackIcon={true}
        hideCloseButton={true}
        onBack={() => setIsFormModalOpen(false)}
      >
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-4 p-2 sm:p-4 text-xs">

            {/* Name */}
            <div className="relative pt-1">
              <div className={`relative w-full h-11 bg-white rounded-xl text-xs sm:text-[13px] font-medium transition-all shadow-2xs flex items-center ${
                errors.name
                  ? 'border border-rose-400 focus-within:ring-4 focus-within:ring-rose-500/10 bg-rose-50/20'
                  : 'border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15'
              }`}>
                <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                  Full Name <span className="text-rose-500">*</span>
                </span>
                <input
                  type="text"
                  {...register('name')}
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full h-full px-4 bg-transparent text-xs sm:text-[13px] font-medium text-slate-700 outline-none"
                />
              </div>
              <FormError error={errors.name} />
            </div>

            {/* Mobile */}
            <div className="relative pt-1">
              <div className={`relative w-full h-11 bg-white rounded-xl text-xs sm:text-[13px] font-medium transition-all shadow-2xs flex items-center ${
                errors.mobile
                  ? 'border border-rose-400 focus-within:ring-4 focus-within:ring-rose-500/10 bg-rose-50/20'
                  : 'border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15'
              }`}>
                <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                  Mobile Number <span className="text-rose-500">*</span>
                </span>
                <input
                  type="tel"
                  {...register('mobile')}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full h-full px-4 bg-transparent text-xs sm:text-[13px] font-medium text-slate-700 outline-none"
                />
              </div>
              <FormError error={errors.mobile} />
            </div>

            {/* Email */}
            <div className="relative pt-1">
              <div className={`relative w-full h-11 bg-white rounded-xl text-xs sm:text-[13px] font-medium transition-all shadow-2xs flex items-center ${
                errors.email
                  ? 'border border-rose-400 focus-within:ring-4 focus-within:ring-rose-500/10 bg-rose-50/20'
                  : 'border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15'
              }`}>
                <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                  Email Address <span className="text-rose-500">*</span>
                </span>
                <input
                  type="email"
                  {...register('email')}
                  placeholder="e.g. rajesh.kumar@example.com"
                  className="w-full h-full px-4 bg-transparent text-xs sm:text-[13px] font-medium text-slate-700 outline-none"
                />
              </div>
              <FormError error={errors.email} />
            </div>

            {/* Designation */}
            <div className="relative pt-1">
              <div className="relative w-full h-11 bg-white rounded-xl text-xs sm:text-[13px] font-medium transition-all shadow-2xs flex items-center border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15">
                <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                  Designation <span className="text-slate-400 font-normal">(Optional)</span>
                </span>
                <input
                  type="text"
                  {...register('designation')}
                  placeholder="e.g. Senior Sales Executive"
                  className="w-full h-full px-4 bg-transparent text-xs sm:text-[13px] font-medium text-slate-700 outline-none"
                />
              </div>
            </div>

            {/* Status */}
            <div className="relative pt-1">
              <div className="relative w-full p-2.5 pt-3.5 bg-white rounded-xl border border-slate-300">
                <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                  Status <span className="text-rose-500">*</span>
                </span>
                <div className="grid grid-cols-2 gap-3">
                  {(['Active', 'Inactive'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setValue('status', s, { shouldValidate: true })}
                      className={`h-11 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs sm:text-[13px] cursor-pointer transition-all ${
                        watchStatus === s
                          ? s === 'Active'
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-2xs ring-2 ring-emerald-500/20'
                            : 'bg-slate-100 border-slate-400 text-slate-800 shadow-2xs ring-2 ring-slate-400/20'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${s === 'Active' ? 'bg-emerald-600' : 'bg-slate-400'}`} />
                      <span>{s}</span>
                    </button>
                  ))}
                </div>
              </div>
              <FormError error={errors.status} />
            </div>
          </div>

          <div className="pt-4 mt-2 flex justify-end items-center gap-3 border-t border-slate-100 px-2 sm:px-4 pb-2">
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
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[2.5]" />}
              <span>{editingRep ? 'Save Changes' : 'Create Representative'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ================================================================ */}
      {/* DETAIL / PORTFOLIO MODAL                                          */}
      {/* ================================================================ */}
      {selectedRep && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Sales Representative: ${selectedRep.name}`}
          subtitle={`${selectedRep.mobile}${selectedRep.email ? ` - ${selectedRep.email}` : ''}${selectedRep.designation ? ` - ${selectedRep.designation}` : ''}`}
          maxWidth="4xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setIsDetailModalOpen(false)}
        >
          <div className="space-y-6 p-2 sm:p-4 text-xs">

            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#33077C] text-white font-bold text-base flex items-center justify-center">
                  {selectedRep.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{selectedRep.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedRep.status === 'Active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {selectedRep.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" />{selectedRep.mobile}</span>
                    {selectedRep.email && (
                      <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-slate-400" />{selectedRep.email}</span>
                    )}
                    {selectedRep.designation && (
                      <span className="text-slate-400 italic">{selectedRep.designation}</span>
                    )}
                    {selectedRep.hasLogin && (
                      <span className="px-2 py-0.5 rounded bg-purple-50 text-[#33077C] text-[10px] font-bold border border-purple-200">
                        Has Login
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEditModal(selectedRep)}
                  className="h-9 px-3 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Pencil className="w-3.5 h-3.5" /><span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(selectedRep)}
                  className="h-9 px-3 rounded-lg border border-rose-200 hover:border-rose-300 text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5" /><span>Delete</span>
                </button>
              </div>
            </div>

            {/* ── Portfolio loading ── */}
            {isPortfolioLoading ? (
              <div className="py-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#33077C] mb-2" />
                <p className="text-slate-500 text-sm">Loading portfolio…</p>
              </div>
            ) : (
              <>
                {/* ── 4 KPI Cards ── */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                    Collection Performance Summary
                  </h4>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200/80">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#33077C] uppercase tracking-wider">Assigned Customers</span>
                        <Users className="w-4 h-4 text-[#33077C]" />
                      </div>
                      <p className="text-2xl font-bold text-slate-900 mt-2">
                        {summary?.totalAssignedCustomers ?? selectedRep.assignedCustomersCount ?? 0}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Active accounts</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Total Outstanding</span>
                        <IndianRupee className="w-4 h-4 text-amber-700" />
                      </div>
                      <p className="text-2xl font-bold text-slate-900 mt-2">
                        ₹{(summary?.totalOutstandingAmount ?? selectedRep.totalOutstandingAmount ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Assigned dues</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200/80">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Pending Follow-ups</span>
                        <Clock className="w-4 h-4 text-rose-600" />
                      </div>
                      <p className="text-2xl font-bold text-rose-600 mt-2">
                        {summary?.pendingFollowUpsCount ?? followUps.length}
                      </p>
                      <p className="text-[11px] text-rose-700/80 mt-0.5">Requires follow-up</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Total Collected</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <p className="text-2xl font-bold text-emerald-700 mt-2">
                        ₹{(summary?.totalCollectedAmount ?? selectedRep.totalCollectedAmount ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-[11px] text-emerald-700/80 mt-0.5">
                        Rate: {(summary?.collectionRatePercent ?? selectedRep.collectionRatePercent ?? 0).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* ── Tab Navigation ── */}
                <div className="space-y-4">
                  <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
                    {([
                      { key: 'customers', icon: Users, label: `Customers (${portfolioCustomers.length})` },
                      { key: 'invoices', icon: ShoppingCart, label: `Invoices (${portfolioInvoices.length})` },
                      { key: 'follow-ups', icon: Clock, label: `Follow-ups (${followUps.length})` },
                      { key: 'history', icon: Receipt, label: `Collection History (${history.length})` },
                    ] as const).map(({ key, icon: Icon, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setActiveRepTab(key)}
                        className={`pb-3 px-3 font-bold text-xs border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                          activeRepTab === key
                            ? 'border-[#33077C] text-[#33077C]'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>

                  {/* TAB 1: CUSTOMERS */}
                  {activeRepTab === 'customers' && (
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Assigned Customers ({portfolioCustomers.length})
                        </h4>
                        <button
                          type="button"
                          onClick={() => { setIsDetailModalOpen(false); navigate('/sale-management/sales/customer'); }}
                          className="text-xs font-semibold text-[#33077C] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Manage Customers</span><ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                              <th className="py-2.5 px-3">Customer</th>
                              <th className="py-2.5 px-3">Phone</th>
                              <th className="py-2.5 px-3 text-center">Invoices</th>
                              <th className="py-2.5 px-3 text-right">Outstanding</th>
                              <th className="py-2.5 px-3">Type</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {portfolioCustomers.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="text-center py-8 text-slate-400">
                                  <Users className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                                  <p className="font-semibold text-slate-500">No Customers Assigned Yet</p>
                                </td>
                              </tr>
                            ) : portfolioCustomers.map((cust) => (
                              <tr key={cust.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-2.5 px-3 font-semibold text-slate-900">
                                  <div>{cust.name}</div>
                                  {cust.company && <div className="text-[11px] text-slate-500 font-normal">{cust.company}</div>}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 font-medium">{cust.phone || '—'}</td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-[#33077C] border border-purple-200">
                                    {cust.totalInvoicesCount ?? 0}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  {(cust.outstandingBalance ?? 0) > 0 ? (
                                    <span className="font-bold text-slate-900">₹{fmt(cust.outstandingBalance!)}</span>
                                  ) : (
                                    <span className="text-slate-400">₹0.00</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    cust.salesRepresentativeType === 'Primary'
                                      ? 'bg-purple-50 text-[#33077C]'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {cust.salesRepresentativeType || 'Primary'}
                                  </span>
                                </td>
                              </tr>
                            ))}
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
                          Assigned Invoices ({portfolioInvoices.length})
                        </h4>
                        <button
                          type="button"
                          onClick={() => { setIsDetailModalOpen(false); navigate('/sale-management/sales/sale'); }}
                          className="text-xs font-semibold text-[#33077C] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Manage Invoices</span><ArrowRight className="w-3.5 h-3.5" />
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
                              <th className="py-2.5 px-3 text-right">Total</th>
                              <th className="py-2.5 px-3 text-right">Balance</th>
                              <th className="py-2.5 px-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {portfolioInvoices.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="text-center py-8 text-slate-400">
                                  <ShoppingCart className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                                  <p className="font-semibold text-slate-500">No Invoices Assigned</p>
                                </td>
                              </tr>
                            ) : portfolioInvoices.map((inv) => (
                              <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-2.5 px-3 font-bold text-[#33077C] font-mono">{inv.invoiceNo}</td>
                                <td className="py-2.5 px-3 font-medium text-slate-800">{inv.customerName}</td>
                                <td className="py-2.5 px-3 text-slate-600">{inv.invoiceDate}</td>
                                <td className="py-2.5 px-3 text-slate-600">{inv.dueDate || '—'}</td>
                                <td className="py-2.5 px-3 text-right font-medium text-slate-900">₹{fmt(inv.grandTotal)}</td>
                                <td className="py-2.5 px-3 text-right font-bold text-rose-600">₹{fmt(inv.balance)}</td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    inv.paymentStatus === 'Paid'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : inv.paymentStatus === 'Partial'
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}>
                                    {inv.paymentStatus}
                                  </span>
                                </td>
                              </tr>
                            ))}
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
                          Collection Follow-ups ({followUps.length})
                        </h4>
                        <button
                          type="button"
                          onClick={() => { setIsDetailModalOpen(false); navigate('/sale-management/sales/collections?subView=follow-ups'); }}
                          className="text-xs font-semibold text-[#33077C] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Open Follow-ups Hub</span><ArrowRight className="w-3.5 h-3.5" />
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
                              <th className="py-2.5 px-3">Notes</th>
                              <th className="py-2.5 px-3">Next Follow-up</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {followUps.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="text-center py-8 text-slate-400">
                                  <Clock className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                                  <p className="font-semibold text-slate-500">No Follow-ups Logged Yet</p>
                                </td>
                              </tr>
                            ) : followUps.map((f) => (
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
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    f.outcome === 'Promise to Pay' || f.outcome === 'Payment Received'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : f.outcome === 'Dispute Raised'
                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                        : 'bg-purple-50 text-[#33077C] border border-purple-200'
                                  }`}>
                                    {f.outcome}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={f.notes}>
                                  {f.notes || '—'}
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-purple-700">
                                  {f.nextFollowUpDate || '—'}
                                </td>
                              </tr>
                            ))}
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
                          Collection History ({history.length})
                        </h4>
                        <button
                          type="button"
                          onClick={() => { setIsDetailModalOpen(false); navigate('/sale-management/sales/collections?subView=collection-history'); }}
                          className="text-xs font-semibold text-[#33077C] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>View Full History</span><ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                              <th className="py-2.5 px-3">Receipt ID</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Customer</th>
                              <th className="py-2.5 px-3">Invoice</th>
                              <th className="py-2.5 px-3">Mode</th>
                              <th className="py-2.5 px-3">Ref / Txn No</th>
                              <th className="py-2.5 px-3 text-right">Amount Collected</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {history.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="text-center py-8 text-slate-400">
                                  <Receipt className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                                  <p className="font-semibold text-slate-500">No Payments Recorded Yet</p>
                                </td>
                              </tr>
                            ) : history.map((p) => (
                              <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-2.5 px-3 font-mono font-bold text-[#33077C]">{p.receiptNo || p.id}</td>
                                <td className="py-2.5 px-3 text-slate-600">{p.paymentDate}</td>
                                <td className="py-2.5 px-3 font-medium text-slate-900">{p.customerName}</td>
                                <td className="py-2.5 px-3 font-mono text-slate-600">{p.invoiceNo || '—'}</td>
                                <td className="py-2.5 px-3">
                                  <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-700">
                                    {p.paymentMethod}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-mono text-slate-500">{p.referenceNo || '—'}</td>
                                <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                                  ₹{fmt(p.receivedAmount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
