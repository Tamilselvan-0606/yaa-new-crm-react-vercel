import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Plus,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  Ban,
  PauseCircle,
  MoreVertical,
  Phone,
  User,
  X,
  Check,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../../../components/common/Button';
import { SearchBar } from '../../../components/common/SearchBar';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { Pagination } from '../../../components/common/Pagination';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { Modal } from '../../../components/common/Modal';
import { CustomSelect } from '../../../components/common/CustomSelect';
import { DeleteConfirmationModal } from '../../../components/common/DeleteConfirmationModal';
import { StatusChangeModal } from '../../../components/common/StatusChangeModal';
import { PhoneField } from '../../../components/common/PhoneField';
import { TextField, ReadOnlyField } from '../../../components/common/FormField';
import { useAuth } from '../../../context/AuthContext';
import { toast } from '../../../utils/toast';
import { useRowActionMenu, ROW_MENU_TRIGGER_ATTR, ROW_MENU_ATTR } from '../../../hooks/useRowActionMenu';
import { branchApi } from '../../../api/platform/branchApi';
import { subOrganizationApi } from '../../../api/platform/subOrganizationApi';
import { firmApi, mapApiFirmToFirmItem, FirmItem, ApiFirm } from '../../../api/commerce/firmApi';

export const FirmsView: React.FC = () => {
  const { currentUser } = useAuth();

  // API Data State
  const [firms, setFirms] = useState<FirmItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);

  // Branch & Sub-Org options for modal dropdowns
  const [branches, setBranches] = useState<Array<{ id: string; name: string; code?: string; subOrganizationId?: string; branchType?: number | string; organizationType?: string }>>([]);
  const [subOrgs, setSubOrgs] = useState<Array<{ id: string; name: string; code?: string }>>([]);
  const [defaultOrgName] = useState<string>(() => {
    return (
      localStorage.getItem('active_organization_orgsuperadmin') ||
      localStorage.getItem('active_organization') ||
      currentUser?.name ||
      'Main Organization'
    );
  });

  // Filter & Search states
  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pendingStatus, setPendingStatus] = useState<'All' | 'Active' | 'Inactive' | 'Suspended'>('All');
  const [appliedStatus, setAppliedStatus] = useState<'All' | 'Active' | 'Inactive' | 'Suspended'>('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Row action menu hook
  const rowMenu = useRowActionMenu(220);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingFirm, setEditingFirm] = useState<FirmItem | null>(null);
  const [viewingFirm, setViewingFirm] = useState<FirmItem | null>(null);
  const [deletingFirm, setDeletingFirm] = useState<FirmItem | null>(null);
  const [statusConfirmFirm, setStatusConfirmFirm] = useState<{ firm: FirmItem; targetStatus: 'Active' | 'Inactive' | 'Suspended' } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    subOrganizationId: '',
    branchId: '',
    name: '',
    code: '',
    mobileNumber: '',
    status: 'Active' as 'Active' | 'Inactive' | 'Suspended',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch branches and sub-organizations for selection
  useEffect(() => {
    let alive = true;
    branchApi
      .getBranches({ page_no: 1, page_size: 100, pagination_required: 'false' })
      .then((res) => {
        if (alive && res?.data && Array.isArray(res.data)) {
          // Normalize and extract subOrgId across snake_case / camelCase
          const mapped = res.data
            .filter((b: any) => {
              // Exclude pure Client Management branches if branchType / organizationType is present
              const bt = Number(b.branchType);
              if (bt === 1) return false;
              const orgType = (b.organizationType || '').toLowerCase();
              if (orgType.includes('client') && !orgType.includes('sale')) return false;
              return true;
            })
            .map((b: any) => {
              const subId = b.subOrganizationId || b.sub_organization_id || b.subOrganization?.id || null;
              return {
                id: b.id,
                name: b.name,
                code: b.code,
                subOrganizationId: subId,
                branchType: b.branchType,
                organizationType: b.organizationType,
              };
            });
          setBranches(mapped);
        }
      })
      .catch(() => {});

    // Fetch only Sales Management sub-organizations (type 2 = sales, type 3 = both)
    subOrganizationApi
      .getSubOrganizations({ page_no: 1, page_size: 100, pagination_required: 'false', subOrganizationType: 2 })
      .then((res) => {
        if (alive && res?.data && Array.isArray(res.data)) {
          // Filter to ensure only Sales Management (2) or Both (3) are included, excluding pure Client Management (1)
          const salesSubOrgs = res.data.filter((s: any) => {
            const t = Number(s.subOrganizationType);
            return isNaN(t) || t === 2 || t === 3;
          });
          setSubOrgs(salesSubOrgs.map((s: any) => ({ id: s.id, name: s.name, code: s.code })));
        }
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, []);

  // Fetch live firms list from backend
  const fetchFirmsList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await firmApi.getFirms({
        page_no: page,
        page_size: pageSize,
        pagination_required: 'true',
        search: appliedSearch.trim() || undefined,
        status: appliedStatus !== 'All' ? appliedStatus : undefined,
        sort_by: 'created_at',
        sort_order: 'desc',
      });

      if (res && Array.isArray(res.data)) {
        setFirms(res.data.map(mapApiFirmToFirmItem));
        setTotalRecords(res.pagination?.totalRecords ?? res.data.length);
      } else {
        setFirms([]);
        setTotalRecords(0);
      }
    } catch (err: any) {
      console.error('Failed to fetch firms:', err);
      const errMsg = err.response?.data?.error?.message || err.message || 'Failed to load firms';
      toast.error(errMsg);
      setFirms([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, appliedSearch, appliedStatus]);

  useEffect(() => {
    fetchFirmsList();
  }, [fetchFirmsList]);

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  // Handlers for Add / Edit
  const handleOpenAdd = () => {
    setEditingFirm(null);
    setFormErrors({});
    setFormData({
      subOrganizationId: '',
      branchId: '',
      name: '',
      code: 'Auto-generated',
      mobileNumber: '',
      status: 'Active',
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = async (firm: FirmItem) => {
    setFormErrors({});
    setIsFormModalOpen(true);
    setEditingFirm(firm);
    setFormData({
      subOrganizationId: firm.subOrganizationId || '',
      branchId: firm.branchId || '',
      name: firm.name,
      code: firm.code || '',
      mobileNumber: firm.mobileNumber || firm.phone || '',
      status: firm.status,
    });

    // Fetch full firm details by ID to ensure latest data
    try {
      setFetchingDetails(true);
      const res = await firmApi.getFirmById(firm.id);
      if (res?.data) {
        const full = mapApiFirmToFirmItem(res.data);
        setEditingFirm(full);
        setFormData({
          subOrganizationId: full.subOrganizationId || '',
          branchId: full.branchId || '',
          name: full.name,
          code: full.code || '',
          mobileNumber: full.mobileNumber || '',
          status: full.status,
        });
      }
    } catch (err) {
      console.warn('Could not load detailed firm item, using list item:', err);
    } finally {
      setFetchingDetails(false);
    }
  };

  // View details modal handler
  const handleOpenView = async (firm: FirmItem) => {
    setViewingFirm(firm);
    try {
      const res = await firmApi.getFirmById(firm.id);
      if (res?.data) {
        setViewingFirm(mapApiFirmToFirmItem(res.data));
      }
    } catch (err) {
      console.warn('Could not load detailed firm item for view modal:', err);
    }
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Firm name is required';
    if (!formData.mobileNumber.trim()) {
      errs.mobileNumber = 'Mobile number is required';
    } else if (formData.mobileNumber.trim().length < 7) {
      errs.mobileNumber = 'Please enter a valid mobile number';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Save (Create or Update)
  const handleSaveFirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);

    try {
      const subOrgVal = formData.subOrganizationId && formData.subOrganizationId !== '__PARENT_ORG__'
        ? formData.subOrganizationId
        : null;

      if (editingFirm) {
        // PUT /firms/{id} Update firm
        await firmApi.updateFirm(editingFirm.id, {
          firm_name: formData.name.trim(),
          mobile_number: formData.mobileNumber.trim(),
          sub_organization_id: subOrgVal,
          branch_id: formData.branchId || null,
          status: formData.status,
        });
        toast.success(`Firm "${formData.name}" updated successfully.`);
      } else {
        // POST /firms Create firm
        await firmApi.createFirm({
          firm_name: formData.name.trim(),
          mobile_number: formData.mobileNumber.trim(),
          sub_organization_id: subOrgVal,
          branch_id: formData.branchId || null,
          status: formData.status,
        });
        toast.success(`Firm "${formData.name}" created successfully.`);
      }

      setIsFormModalOpen(false);
      fetchFirmsList();
    } catch (err: any) {
      console.error('Failed to save firm:', err);
      const errMsg = err.response?.data?.error?.message || err.message || 'Failed to save firm';
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // DELETE /firms/{id}
  const handleConfirmDelete = async () => {
    if (!deletingFirm) return;
    try {
      await firmApi.deleteFirm(deletingFirm.id);
      toast.success(`Firm "${deletingFirm.name}" deleted successfully.`);
      setDeletingFirm(null);
      fetchFirmsList();
    } catch (err: any) {
      console.error('Failed to delete firm:', err);
      const errMsg = err.response?.data?.error?.message || err.message || 'Failed to delete firm';
      toast.error(errMsg);
    }
  };

  // PATCH /firms/{id}/status - Update status
  const handleConfirmStatusChange = async () => {
    if (!statusConfirmFirm) return;
    try {
      await firmApi.updateFirmStatus(statusConfirmFirm.firm.id, {
        status: statusConfirmFirm.targetStatus,
      });
      toast.success(`Firm status updated to ${statusConfirmFirm.targetStatus}.`);
      setStatusConfirmFirm(null);
      fetchFirmsList();
    } catch (err: any) {
      console.error('Failed to update firm status:', err);
      const errMsg = err.response?.data?.error?.message || err.message || 'Failed to update status';
      toast.error(errMsg);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. Top Title & Action Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#33077C]" />
            <span>Firms</span>
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Manage legal business entities, sister concerns, and trading firms
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
          <Button
            variant="secondary"
            size="md"
            onClick={fetchFirmsList}
            disabled={loading}
            icon={<RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />}
            className="w-full sm:w-auto justify-center"
            title="Refresh firms list"
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleOpenAdd}
            icon={<Plus className="w-4 h-4 text-white" />}
            className="w-full sm:w-auto justify-center"
          >
            Add Firm
          </Button>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <SearchBar
        value={pendingSearch}
        onChange={(val) => setPendingSearch(val)}
        placeholder="Search firms by name, code, mobile number..."
        onSubmit={() => {
          setAppliedSearch(pendingSearch);
          setAppliedStatus(pendingStatus);
          setPage(1);
        }}
        onReset={() => {
          setPendingSearch('');
          setAppliedSearch('');
          setPendingStatus('All');
          setAppliedStatus('All');
          setPage(1);
        }}
        filterSlot={
          <FilterDropdown
            options={[
              { label: 'Status : All', value: 'All' },
              { label: 'Active', value: 'Active', dotColor: '#10b981' },
              { label: 'Inactive', value: 'Inactive', dotColor: '#f43f5e' },
              { label: 'Suspended', value: 'Suspended', dotColor: '#f59e0b' },
            ]}
            value={pendingStatus}
            onChange={(val) => setPendingStatus(val as any)}
          />
        }
        rightSlot={
          <span className="text-xs font-semibold text-slate-500 pr-2">
            Total Firms : <strong className="text-slate-900">{totalRecords}</strong>
          </span>
        }
      />

      {/* 3. Firms Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200 min-w-[900px]">
            <thead>
              <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white tracking-wider uppercase">
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">FIRM NAME & CODE</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">SUB-ORGANIZATION</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">BRANCH</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">MOBILE NUMBER</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">STATUS</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">CREATED DATE</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center w-24">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500 border border-slate-200 font-medium">
                    <RefreshCw className="w-8 h-8 mx-auto text-[#33077C] animate-spin mb-3" />
                    Loading firms from server...
                  </td>
                </tr>
              ) : firms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    No firms found. Click "+ Add Firm" to create your first firm.
                  </td>
                </tr>
              ) : (
                firms.map((firm) => (
                  <tr key={firm.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-200 font-sans">
                    {/* Firm Name & Code */}
                    <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#33077C] text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-xs shrink-0 select-none">
                          {firm.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-xs sm:text-[14px]">{firm.name}</span>
                          <span className="text-[11px] font-bold text-[#33077C] tracking-wide mt-0.5">{firm.code}</span>
                        </div>
                      </div>
                    </td>

                    {/* Sub-Organization */}
                    <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-xs sm:text-[13px]">
                          {firm.subOrganizationName || (firm.subOrganizationId ? 'Sub-Organization' : defaultOrgName || 'Main Organization')}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium mt-0.5">Sub-Organization</span>
                      </div>
                    </td>

                    {/* Branch */}
                    <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-xs sm:text-[13px]">
                          {firm.branchName || (firm.branchId ? 'Branch Assigned' : 'All Branches')}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium mt-0.5">Branch</span>
                      </div>
                    </td>

                    {/* Mobile Number */}
                    <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                        <Phone className="w-3.5 h-3.5 text-[#33077C] shrink-0" />
                        <span>{firm.mobileNumber || firm.phone || '-'}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-5 border border-slate-200 whitespace-nowrap text-center">
                      <StatusBadge status={firm.status as any} />
                    </td>

                    {/* Created Date */}
                    <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                      <div>
                        <span className="font-bold text-slate-900 text-xs sm:text-[13px] block">
                          {formatDate(firm.createdAt)}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                          {firm.status === 'Active' ? 'Active Firm' : firm.status === 'Suspended' ? 'Suspended' : 'Inactive Firm'}
                        </span>
                      </div>
                    </td>

                    {/* Actions Menu */}
                    <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap">
                      <div className="relative inline-block text-left" {...{ [ROW_MENU_TRIGGER_ATTR]: '' }}>
                        <button
                          type="button"
                          onClick={(e) => rowMenu.toggle(e, firm.id)}
                          className="w-8 h-8 rounded-lg bg-[#33077C] hover:bg-[#432fb3] flex items-center justify-center text-white shadow-xs transition-all hover:scale-105 active:scale-95 mx-auto cursor-pointer"
                          title="Actions"
                        >
                          <MoreVertical className="w-4 h-4 fill-white text-white" />
                        </button>

                        {rowMenu.activeId === firm.id && rowMenu.pos && (
                          <div
                            {...{ [ROW_MENU_ATTR]: '' }}
                            className="fixed z-[9999] w-48 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-100 font-sans text-left"
                            style={{
                              top: rowMenu.pos.top !== undefined ? `${rowMenu.pos.top}px` : 'auto',
                              bottom: rowMenu.pos.bottom !== undefined ? `${rowMenu.pos.bottom}px` : 'auto',
                              right: `${rowMenu.pos.right}px`,
                            }}
                          >
                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => {
                                rowMenu.close();
                                handleOpenEdit(firm);
                              }}
                              className="w-full px-3 py-2 text-left text-[13px] font-bold text-slate-800 hover:bg-slate-50 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                            >
                              <span
                                style={{ width: '26px', height: '26px' }}
                                className="rounded-full bg-[#3B82F6] flex items-center justify-center shrink-0 shadow-2xs"
                              >
                                <Pencil style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />
                              </span>
                              <span>Edit</span>
                            </button>

                            {/* View */}
                            <button
                              type="button"
                              onClick={() => {
                                rowMenu.close();
                                handleOpenView(firm);
                              }}
                              className="w-full px-3 py-2 text-left text-[13px] font-bold text-slate-800 hover:bg-slate-50 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                            >
                              <span
                                style={{ width: '26px', height: '26px' }}
                                className="rounded-full bg-[#33077C] flex items-center justify-center shrink-0 shadow-2xs"
                              >
                                <Eye style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />
                              </span>
                              <span>View</span>
                            </button>

                            {/* Active / Inactive Toggle (PATCH /firms/{id}/status) */}
                            <button
                              type="button"
                              onClick={() => {
                                rowMenu.close();
                                const nextTarget = firm.status === 'Active' ? 'Inactive' : 'Active';
                                setStatusConfirmFirm({ firm, targetStatus: nextTarget });
                              }}
                              className="w-full px-3 py-2 text-left text-[13px] font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                            >
                              <span
                                style={{ width: '26px', height: '26px' }}
                                className="rounded-full bg-slate-500 flex items-center justify-center shrink-0 shadow-2xs"
                              >
                                {firm.status === 'Inactive' ? (
                                  <CheckCircle2 style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />
                                ) : (
                                  <Ban style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />
                                )}
                              </span>
                              <span>{firm.status === 'Active' ? 'Inactive' : 'Active'}</span>
                            </button>

                            {/* Suspend / Resume (PATCH /firms/{id}/status) */}
                            <button
                              type="button"
                              onClick={() => {
                                rowMenu.close();
                                const nextTarget = firm.status === 'Suspended' ? 'Active' : 'Suspended';
                                setStatusConfirmFirm({ firm, targetStatus: nextTarget });
                              }}
                              className="w-full px-3 py-2 text-left text-[13px] font-bold text-amber-800 hover:bg-amber-50/60 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                            >
                              <span
                                style={{ width: '26px', height: '26px' }}
                                className="rounded-full bg-amber-500 flex items-center justify-center shrink-0 shadow-2xs"
                              >
                                {firm.status === 'Suspended' ? (
                                  <CheckCircle2 style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />
                                ) : (
                                  <PauseCircle style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />
                                )}
                              </span>
                              <span>{firm.status === 'Suspended' ? 'Resume' : 'Suspend'}</span>
                            </button>

                            <div className="my-1 mx-2 border-t border-slate-100" />

                            {/* Delete (DELETE /firms/{id}) */}
                            <button
                              type="button"
                              onClick={() => {
                                rowMenu.close();
                                setDeletingFirm(firm);
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
                          </div>
                        )}
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
      <Pagination
        total={totalRecords}
        currentPage={page}
        pageSize={pageSize}
        pageSizeOptions={[5, 10, 20, 50]}
        onPageChange={(p) => setPage(p)}
        onPageSizeChange={(ps) => {
          setPageSize(ps);
          setPage(1);
        }}
      />

      {/* 4. Add / Edit Firm Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingFirm ? 'Edit Firm' : 'Add New Firm'}
        subtitle={
          editingFirm
            ? 'Update firm profile and assignment details'
            : 'Register a new business firm under your organization'
        }
        maxWidth="4xl"
        headerGradient={true}
        showBackIcon={true}
        hideCloseButton={true}
        onBack={() => setIsFormModalOpen(false)}
      >
        <form noValidate onSubmit={handleSaveFirm} className="space-y-4 p-2 sm:p-4 animate-in fade-in duration-150">
          {fetchingDetails && (
            <div className="flex items-center gap-2 p-3 bg-purple-50 text-[#33077C] text-xs font-medium rounded-xl">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Loading latest firm details from server...
            </div>
          )}

          {/* Form Fields: 3 fields per row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Field 1: Select Sub-Organization */}
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Sub-Organization
              </label>
              {editingFirm ? (
                <ReadOnlyField
                  label=""
                  value={(() => {
                    if (!formData.subOrganizationId || formData.subOrganizationId === '__PARENT_ORG__') {
                      return defaultOrgName ? `${defaultOrgName} (Main Organization)` : 'Main Organization';
                    }
                    const found = subOrgs.find((s) => s.id === formData.subOrganizationId);
                    return found ? `${found.name}${found.code ? ` (${found.code})` : ''}` : editingFirm.subOrganizationName || 'Main Organization';
                  })()}
                  placeholder="Sub-Organization"
                />
              ) : (
                <CustomSelect
                  value={formData.subOrganizationId}
                  onChange={(val) => {
                    updateField('subOrganizationId', val);
                    // When sub-org changes, clear or pick the first branch belonging to this sub-org
                    const matchedBranches = branches.filter((b) => {
                      if (val === '__PARENT_ORG__') {
                        return !b.subOrganizationId;
                      }
                      return b.subOrganizationId === val;
                    });
                    if (matchedBranches.length > 0) {
                      updateField('branchId', matchedBranches[0].id);
                    } else {
                      updateField('branchId', '');
                    }
                  }}
                  options={(() => {
                    const parentOrgLabel = defaultOrgName ? `${defaultOrgName} (Main Organization)` : 'Main Organization';
                    const list: { value: string; label: string }[] = [];
                    if (defaultOrgName) {
                      list.push({ value: '__PARENT_ORG__', label: parentOrgLabel });
                    }
                    if (subOrgs.length > 0) {
                      subOrgs.forEach((sub) => {
                        list.push({
                          value: sub.id,
                          label: `${sub.name}${sub.code ? ` (${sub.code})` : ''}`,
                        });
                      });
                    }
                    return list;
                  })()}
                  placeholder="Select Sub-Organization"
                  optionVariant="strong"
                  activeColor="brand"
                />
              )}
            </div>

            {/* Field 2: Select Branch */}
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Branch
              </label>
              {editingFirm ? (
                <ReadOnlyField
                  label=""
                  value={(() => {
                    const found = branches.find((b) => b.id === formData.branchId);
                    return found ? `${found.name}${found.code ? ` (${found.code})` : ''}` : editingFirm.branchName || 'All Branches';
                  })()}
                  placeholder="Branch"
                />
              ) : (
                <CustomSelect
                  value={formData.branchId}
                  onChange={(val) => updateField('branchId', val)}
                  options={(() => {
                    if (!formData.subOrganizationId) {
                      return [];
                    }
                    const filtered = branches.filter((b) => {
                      if (formData.subOrganizationId === '__PARENT_ORG__') {
                        return !b.subOrganizationId;
                      }
                      return b.subOrganizationId === formData.subOrganizationId;
                    });
                    return filtered.map((b) => ({
                      value: b.id,
                      label: `${b.name}${b.code ? ` (${b.code})` : ''}`,
                    }));
                  })()}
                  placeholder={
                    !formData.subOrganizationId
                      ? 'Select Sub-Organization first'
                      : branches.filter((b) =>
                          formData.subOrganizationId === '__PARENT_ORG__'
                            ? !b.subOrganizationId
                            : b.subOrganizationId === formData.subOrganizationId
                        ).length === 0
                      ? 'No branches in this sub-organization'
                      : 'Select Branch'
                  }
                  optionVariant="strong"
                  activeColor="brand"
                />
              )}
            </div>

            {/* Field 3: Firm Name */}
            <TextField
              label="Firm Name"
              required
              value={formData.name}
              error={formErrors.name}
              placeholder="Enter firm name"
              onValueChange={(v) => updateField('name', v)}
            />

            {/* Field 4: Firm Code (Next to Firm Name) */}
            <ReadOnlyField
              label="Firm Code"
              value={formData.code}
              placeholder="Auto-generated"
            />

            {/* Field 5: Mobile Number */}
            <PhoneField
              label="Mobile Number"
              required
              placeholder="Enter mobile number"
              value={formData.mobileNumber}
              error={formErrors.mobileNumber}
              onChange={(v) => updateField('mobileNumber', v)}
            />

            {/* Field 6: Status (Next to Mobile Number) */}
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Status <span className="text-rose-500 font-bold">*</span>
              </label>
              <CustomSelect
                value={formData.status}
                onChange={(val) => updateField('status', val as any)}
                options={[
                  { label: 'Active', value: 'Active' },
                  { label: 'Inactive', value: 'Inactive' },
                  { label: 'Suspended', value: 'Suspended' },
                ]}
                placeholder="Select Status"
                optionVariant="strong"
                activeColor="brand"
              />
            </div>
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              size="md"
              icon={<X className="w-4 h-4 text-slate-500" />}
              onClick={() => setIsFormModalOpen(false)}
              className="w-full sm:w-auto justify-center"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={submitting}
              icon={<Check className="w-4 h-4 stroke-[2.5]" />}
              className="w-full sm:w-auto justify-center"
            >
              {submitting ? 'Saving...' : editingFirm ? 'Save Changes' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5. View Details Modal */}
      <Modal
        isOpen={!!viewingFirm}
        onClose={() => setViewingFirm(null)}
        title="Firm Details"
        subtitle={viewingFirm?.name || 'Firm Profile'}
        maxWidth="max-w-2xl"
      >
        {viewingFirm && (
          <div className="space-y-5 text-xs text-slate-700">
            <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100 flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#33077C] text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                {viewingFirm.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">{viewingFirm.name}</h3>
                <div className="text-xs font-semibold text-[#33077C] flex items-center gap-2">
                  <span>Code: {viewingFirm.code}</span>
                  <span>&bull;</span>
                  <StatusBadge status={viewingFirm.status as any} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Sub-Organization</span>
                <span className="font-semibold text-slate-900 mt-1 block">
                  {viewingFirm.subOrganizationName || (viewingFirm.subOrganizationId ? 'Sub-Organization' : defaultOrgName || 'Main Organization')}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Branch</span>
                <span className="font-semibold text-slate-900 mt-1 block">
                  {viewingFirm.branchName || (viewingFirm.branchId ? 'Branch Assigned' : 'All Branches')}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Mobile Number</span>
                <span className="font-semibold text-slate-900 mt-1 block">
                  {viewingFirm.mobileNumber || viewingFirm.phone || '-'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Created Date</span>
                <span className="font-semibold text-slate-900 mt-1 block">
                  {formatDate(viewingFirm.createdAt)}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewingFirm(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* 6. Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!deletingFirm}
        onClose={() => setDeletingFirm(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Firm"
        entityName={deletingFirm?.name || 'Firm'}
      />

      {/* 7. Status Change Modal */}
      <StatusChangeModal
        isOpen={!!statusConfirmFirm}
        onClose={() => setStatusConfirmFirm(null)}
        onConfirm={handleConfirmStatusChange}
        nextStatus={statusConfirmFirm?.targetStatus === 'Active' ? 'Active' : statusConfirmFirm?.targetStatus === 'Suspended' ? 'Suspended' : 'Inactive'}
        entityName="Firm"
        itemName={statusConfirmFirm?.firm?.name}
      />
    </div>
  );
};

export default FirmsView;
