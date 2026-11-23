import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  MoreVertical,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building,
  FileText,
  User,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { Button } from '../../../components/common/Button';
import { SearchBar } from '../../../components/common/SearchBar';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { Pagination } from '../../../components/common/Pagination';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { Modal } from '../../../components/common/Modal';
import { DeleteConfirmationModal } from '../../../components/common/DeleteConfirmationModal';
import { StatusChangeModal } from '../../../components/common/StatusChangeModal';
import { useAuth } from '../../../context/AuthContext';
import { toast } from '../../../utils/toast';
import { useRowActionMenu, ROW_MENU_TRIGGER_ATTR, ROW_MENU_ATTR } from '../../../hooks/useRowActionMenu';
import { branchApi } from '../../../api/platform/branchApi';
import { subOrganizationApi } from '../../../api/platform/subOrganizationApi';
import { FirmItem } from './firmTypes';

const STORAGE_KEY = 'nexus_crm_firms_catalog';

const REGISTRATION_TYPES = [
  'Proprietorship',
  'Partnership',
  'Private Limited (Pvt Ltd)',
  'Limited Liability Partnership (LLP)',
  'Public Limited',
  'One Person Company (OPC)',
  'Trust / Society / NGO',
];

const INITIAL_FIRMS: FirmItem[] = [
  {
    id: 'frm_1',
    name: 'Apex Global Trading Co.',
    code: 'FRM-001',
    registrationType: 'Private Limited (Pvt Ltd)',
    gstNumber: '33AABCA1234F1Z5',
    panNumber: 'AABCA1234F',
    contactPerson: 'Suresh Kumar',
    email: 'suresh@apexglob.com',
    phone: '9840123456',
    whatsapp: '9840123456',
    branchName: 'Main Branch - Chennai',
    city: 'Chennai',
    state: 'Tamil Nadu',
    location: 'Chennai, Tamil Nadu',
    pincode: '600001',
    address: 'No 45, GST Road, Guindy Industrial Estate',
    status: 'Active',
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'frm_2',
    name: 'Prime Retail & Distribution',
    code: 'FRM-002',
    registrationType: 'Partnership',
    gstNumber: '29ABCDE5678G2Z1',
    panNumber: 'ABCDE5678G',
    contactPerson: 'Ramesh Patel',
    email: 'ramesh@primeretail.in',
    phone: '9880198765',
    whatsapp: '9880198765',
    branchName: 'Bengaluru Hub',
    city: 'Bengaluru',
    state: 'Karnataka',
    location: 'Bengaluru, Karnataka',
    pincode: '560001',
    address: '12th Cross, MG Road, Central Business District',
    status: 'Active',
    createdAt: '2026-02-10T11:30:00Z',
  },
  {
    id: 'frm_3',
    name: 'Zenith Logistics & Supply Firm',
    code: 'FRM-003',
    registrationType: 'Limited Liability Partnership (LLP)',
    gstNumber: '36XYZAB9876H3Z8',
    panNumber: 'XYZAB9876H',
    contactPerson: 'Kavitha Reddy',
    email: 'kavitha@zenithlog.com',
    phone: '9700145678',
    whatsapp: '9700145678',
    branchName: 'Hyderabad Regional',
    city: 'Hyderabad',
    state: 'Telangana',
    location: 'Hyderabad, Telangana',
    pincode: '500081',
    address: 'Cyber Towers Lane, Hitec City',
    status: 'Active',
    createdAt: '2026-03-05T09:15:00Z',
  },
];

export const FirmsView: React.FC = () => {
  const { currentUser } = useAuth();

  // Storage-backed state
  const [firms, setFirms] = useState<FirmItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_FIRMS;
  });

  const saveFirms = (next: FirmItem[]) => {
    setFirms(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  // Branch & Sub-Org options for modal dropdowns
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [subOrgs, setSubOrgs] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    let alive = true;
    branchApi
      .getBranches(1, 100)
      .then((res) => {
        if (alive && res?.data && Array.isArray(res.data)) {
          setBranches(res.data.map((b: any) => ({ id: b.id, name: b.name })));
        }
      })
      .catch(() => {});

    subOrganizationApi
      .getSubOrganizations({ page_no: 1, page_size: 100, pagination_required: 'false' })
      .then((res) => {
        if (alive && res?.data && Array.isArray(res.data)) {
          setSubOrgs(res.data.map((s: any) => ({ id: s.id, name: s.name })));
        }
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, []);

  // Filter & Search states
  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pendingStatus, setPendingStatus] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [appliedStatus, setAppliedStatus] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Row action menu hook
  const rowMenu = useRowActionMenu(220);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingFirm, setEditingFirm] = useState<FirmItem | null>(null);
  const [viewingFirm, setViewingFirm] = useState<FirmItem | null>(null);
  const [deletingFirm, setDeletingFirm] = useState<FirmItem | null>(null);
  const [statusConfirmFirm, setStatusConfirmFirm] = useState<FirmItem | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    registrationType: 'Proprietorship',
    gstNumber: '',
    panNumber: '',
    contactPerson: '',
    email: '',
    phone: '',
    whatsapp: '',
    branchId: '',
    subOrganizationId: '',
    city: '',
    state: '',
    pincode: '',
    address: '',
    status: 'Active' as 'Active' | 'Inactive',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Filtered & Paginated records
  const filteredFirms = useMemo(() => {
    let result = [...firms];
    if (appliedStatus !== 'All') {
      result = result.filter((f) => f.status === appliedStatus);
    }
    const q = appliedSearch.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.code.toLowerCase().includes(q) ||
          (f.contactPerson && f.contactPerson.toLowerCase().includes(q)) ||
          (f.gstNumber && f.gstNumber.toLowerCase().includes(q)) ||
          (f.city && f.city.toLowerCase().includes(q)) ||
          (f.phone && f.phone.includes(q))
      );
    }
    return result;
  }, [firms, appliedStatus, appliedSearch]);

  const totalRecords = filteredFirms.length;
  const paginatedFirms = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredFirms.slice(start, start + pageSize);
  }, [filteredFirms, page, pageSize]);

  // Handlers for Add / Edit
  const handleOpenAdd = () => {
    setEditingFirm(null);
    setFormErrors({});
    const nextCode = `FRM-${String(firms.length + 1).padStart(3, '0')}`;
    setFormData({
      name: '',
      code: nextCode,
      registrationType: 'Proprietorship',
      gstNumber: '',
      panNumber: '',
      contactPerson: '',
      email: '',
      phone: '',
      whatsapp: '',
      branchId: branches[0]?.id || '',
      subOrganizationId: '',
      city: '',
      state: '',
      pincode: '',
      address: '',
      status: 'Active',
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (firm: FirmItem) => {
    setEditingFirm(firm);
    setFormErrors({});
    setFormData({
      name: firm.name,
      code: firm.code,
      registrationType: firm.registrationType || 'Proprietorship',
      gstNumber: firm.gstNumber || '',
      panNumber: firm.panNumber || '',
      contactPerson: firm.contactPerson || '',
      email: firm.email || '',
      phone: firm.phone || '',
      whatsapp: firm.whatsapp || '',
      branchId: firm.branchId || '',
      subOrganizationId: firm.subOrganizationId || '',
      city: firm.city || '',
      state: firm.state || '',
      pincode: firm.pincode || '',
      address: firm.address || '',
      status: firm.status,
    });
    setIsFormModalOpen(true);
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Firm name is required';
    if (!formData.code.trim()) errs.code = 'Firm code is required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email address';
    }
    if (formData.phone && !/^[0-9+-\s]{7,15}$/.test(formData.phone.trim())) {
      errs.phone = 'Please enter a valid contact phone number';
    }
    if (formData.gstNumber && formData.gstNumber.trim().length !== 15) {
      errs.gstNumber = 'GSTIN must be 15 characters';
    }
    if (formData.panNumber && formData.panNumber.trim().length !== 10) {
      errs.panNumber = 'PAN must be 10 characters';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveFirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const matchedBranch = branches.find((b) => b.id === formData.branchId);
    const matchedSub = subOrgs.find((s) => s.id === formData.subOrganizationId);
    const locationStr = [formData.city, formData.state].filter(Boolean).join(', ');

    if (editingFirm) {
      const updated: FirmItem = {
        ...editingFirm,
        ...formData,
        branchName: matchedBranch?.name || editingFirm.branchName,
        subOrganizationName: matchedSub?.name || editingFirm.subOrganizationName,
        location: locationStr || editingFirm.location,
        updatedAt: new Date().toISOString(),
      };
      const nextList = firms.map((f) => (f.id === editingFirm.id ? updated : f));
      saveFirms(nextList);
      toast.success(`Firm "${formData.name}" updated successfully.`);
    } else {
      const newFirm: FirmItem = {
        id: `frm_${Date.now()}`,
        ...formData,
        branchName: matchedBranch?.name,
        subOrganizationName: matchedSub?.name,
        location: locationStr,
        createdAt: new Date().toISOString(),
      };
      saveFirms([newFirm, ...firms]);
      toast.success(`Firm "${formData.name}" created successfully.`);
    }
    setIsFormModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!deletingFirm) return;
    const nextList = firms.filter((f) => f.id !== deletingFirm.id);
    saveFirms(nextList);
    toast.success(`Firm "${deletingFirm.name}" removed successfully.`);
    setDeletingFirm(null);
  };

  const handleConfirmStatusChange = () => {
    if (!statusConfirmFirm) return;
    const nextStatus = statusConfirmFirm.status === 'Active' ? 'Inactive' : 'Active';
    const nextList = firms.map((f) =>
      f.id === statusConfirmFirm.id ? { ...f, status: nextStatus, updatedAt: new Date().toISOString() } : f
    );
    saveFirms(nextList);
    toast.success(`Firm marked as ${nextStatus}.`);
    setStatusConfirmFirm(null);
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
        placeholder="Search firms by name, code, contact person, GSTIN, city..."
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
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-[#33077C] text-white text-[11px] font-bold uppercase tracking-wider">
                <th className="py-4 px-5 border border-[#33077C]/30">FIRM NAME & CODE</th>
                <th className="py-4 px-5 border border-[#33077C]/30">REGISTRATION TYPE</th>
                <th className="py-4 px-5 border border-[#33077C]/30">CONTACT PERSON</th>
                <th className="py-4 px-5 border border-[#33077C]/30">GSTIN / PAN</th>
                <th className="py-4 px-5 border border-[#33077C]/30">LOCATION</th>
                <th className="py-4 px-5 border border-[#33077C]/30">STATUS</th>
                <th className="py-4 px-5 border border-[#33077C]/30">CREATED DATE</th>
                <th className="py-4 px-5 border border-[#33077C]/30 text-center w-24">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {paginatedFirms.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 font-medium">
                    <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    No firms found matching your search.
                  </td>
                </tr>
              ) : (
                paginatedFirms.map((firm) => (
                  <tr key={firm.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-5 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-purple-100 text-[#33077C] flex items-center justify-center font-bold text-xs shrink-0">
                          {firm.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{firm.name}</div>
                          <div className="text-[11px] font-semibold text-[#33077C]">{firm.code}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-5 border-b border-slate-100">
                      <span className="font-medium text-slate-700">{firm.registrationType || '-'}</span>
                    </td>

                    <td className="py-3.5 px-5 border-b border-slate-100">
                      <div>
                        <div className="font-semibold text-slate-900">{firm.contactPerson || '-'}</div>
                        <div className="text-[11px] text-slate-500">{firm.phone || firm.email || '-'}</div>
                      </div>
                    </td>

                    <td className="py-3.5 px-5 border-b border-slate-100">
                      <div>
                        <div className="font-mono text-slate-800 text-[11px] font-semibold">
                          {firm.gstNumber ? `GST: ${firm.gstNumber}` : '-'}
                        </div>
                        {firm.panNumber && (
                          <div className="font-mono text-slate-500 text-[10px]">PAN: {firm.panNumber}</div>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-5 border-b border-slate-100">
                      <span className="font-medium text-slate-600">
                        {firm.city ? `${firm.city}${firm.state ? `, ${firm.state}` : ''}` : '-'}
                      </span>
                    </td>

                    <td className="py-3.5 px-5 border-b border-slate-100">
                      <StatusBadge status={firm.status} />
                    </td>

                    <td className="py-3.5 px-5 border-b border-slate-100">
                      <span className="text-slate-600 font-medium">{formatDate(firm.createdAt)}</span>
                    </td>

                    <td className="py-3.5 px-5 border-b border-slate-100 text-center relative">
                      <div {...{ [ROW_MENU_TRIGGER_ATTR]: '' }} className="inline-block">
                        <button
                          type="button"
                          onClick={(e) => rowMenu.toggle(e, firm.id)}
                          className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                          title="Actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>

                      {rowMenu.activeId === firm.id && rowMenu.pos && (
                        <div
                          {...{ [ROW_MENU_ATTR]: '' }}
                          style={{
                            position: 'fixed',
                            top: rowMenu.pos.top !== undefined ? `${rowMenu.pos.top}px` : 'auto',
                            bottom: rowMenu.pos.bottom !== undefined ? `${rowMenu.pos.bottom}px` : 'auto',
                            right: `${rowMenu.pos.right}px`,
                          }}
                          className="w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-left text-xs font-semibold animate-in fade-in zoom-in-95 duration-100"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              rowMenu.close();
                              setViewingFirm(firm);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-purple-50 hover:text-[#33077C] transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-purple-600" />
                            <span>View Details</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              rowMenu.close();
                              handleOpenEdit(firm);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-purple-50 hover:text-[#33077C] transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                            <span>Edit Firm</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              rowMenu.close();
                              setStatusConfirmFirm(firm);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-purple-50 hover:text-[#33077C] transition-colors cursor-pointer"
                          >
                            {firm.status === 'Active' ? (
                              <>
                                <XCircle className="w-3.5 h-3.5 text-amber-500" />
                                <span>Mark Inactive</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Mark Active</span>
                              </>
                            )}
                          </button>

                          <div className="my-1 border-t border-slate-100" />

                          <button
                            type="button"
                            onClick={() => {
                              rowMenu.close();
                              setDeletingFirm(firm);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            <span>Delete Firm</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="border-t border-slate-200 px-5 py-3">
          <Pagination
            currentPage={page}
            totalRecords={totalRecords}
            pageSize={pageSize}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(ps) => {
              setPageSize(ps);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* 4. Add / Edit Firm Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingFirm ? 'Edit Firm' : 'Add New Firm'}
        subtitle={editingFirm ? 'Update firm profile and legal details' : 'Register a new business firm profile'}
        maxWidth="max-w-3xl"
      >
        <form noValidate onSubmit={handleSaveFirm} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Firm Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Apex Trading Co."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#33077C] focus:bg-white"
              />
              {formErrors.name && <span className="text-[11px] text-rose-500 font-semibold">{formErrors.name}</span>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Firm Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g. FRM-001"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#33077C] focus:bg-white"
              />
              {formErrors.code && <span className="text-[11px] text-rose-500 font-semibold">{formErrors.code}</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Registration Type</label>
              <select
                value={formData.registrationType}
                onChange={(e) => setFormData({ ...formData, registrationType: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#33077C] focus:bg-white cursor-pointer"
              >
                {REGISTRATION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">GSTIN</label>
              <input
                type="text"
                maxLength={15}
                value={formData.gstNumber}
                onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                placeholder="15-digit GSTIN"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#33077C] focus:bg-white font-mono"
              />
              {formErrors.gstNumber && (
                <span className="text-[11px] text-rose-500 font-semibold">{formErrors.gstNumber}</span>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">PAN Number</label>
              <input
                type="text"
                maxLength={10}
                value={formData.panNumber}
                onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                placeholder="10-digit PAN"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#33077C] focus:bg-white font-mono"
              />
              {formErrors.panNumber && (
                <span className="text-[11px] text-rose-500 font-semibold">{formErrors.panNumber}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Contact Person</label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                placeholder="e.g. Suresh Kumar"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#33077C] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="10-digit phone"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#33077C] focus:bg-white"
              />
              {formErrors.phone && <span className="text-[11px] text-rose-500 font-semibold">{formErrors.phone}</span>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Official Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="firm@example.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#33077C] focus:bg-white"
              />
              {formErrors.email && <span className="text-[11px] text-rose-500 font-semibold">{formErrors.email}</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g. Chennai"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#33077C] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="e.g. Tamil Nadu"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#33077C] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Pincode</label>
              <input
                type="text"
                maxLength={6}
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                placeholder="6-digit pincode"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#33077C] focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Address</label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Registered street address"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#33077C] focus:bg-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#33077C] hover:bg-[#270560] text-white text-xs font-bold shadow-md cursor-pointer transition-all"
            >
              {editingFirm ? 'Save Changes' : 'Create Firm'}
            </button>
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
              <div className="w-12 h-12 rounded-2xl bg-[#33077C] text-white flex items-center justify-center font-bold text-base shadow-sm">
                {viewingFirm.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">{viewingFirm.name}</h3>
                <div className="text-xs font-semibold text-[#33077C] flex items-center gap-2">
                  <span>Code: {viewingFirm.code}</span>
                  <span>&bull;</span>
                  <StatusBadge status={viewingFirm.status} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Registration</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">{viewingFirm.registrationType || '-'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">GSTIN</span>
                <span className="font-mono font-semibold text-slate-900 mt-0.5 block">{viewingFirm.gstNumber || '-'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">PAN</span>
                <span className="font-mono font-semibold text-slate-900 mt-0.5 block">{viewingFirm.panNumber || '-'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Contact Person</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">{viewingFirm.contactPerson || '-'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Phone</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">{viewingFirm.phone || '-'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Email</span>
                <span className="font-semibold text-slate-900 mt-0.5 block truncate">{viewingFirm.email || '-'}</span>
              </div>
            </div>

            {viewingFirm.address && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Address</span>
                <span className="font-medium text-slate-800 mt-0.5 block">
                  {viewingFirm.address}
                  {viewingFirm.pincode ? ` - ${viewingFirm.pincode}` : ''}
                </span>
              </div>
            )}

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
        nextStatus={statusConfirmFirm?.status === 'Active' ? 'Inactive' : 'Active'}
        entityName="Firm"
        itemName={statusConfirmFirm?.name}
      />
    </div>
  );
};

export default FirmsView;
