import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Building2,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  Ban,
  PauseCircle,
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
  Upload,
  X,
  Check,
  Image as ImageIcon,
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
import { LocationFields, LocationMeta } from '../../../components/common/LocationFields';
import { TextField, ReadOnlyField } from '../../../components/common/FormField';
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
  const [branches, setBranches] = useState<Array<{ id: string; name: string; code?: string; subOrganizationId?: string }>>([]);
  const [subOrgs, setSubOrgs] = useState<Array<{ id: string; name: string; code?: string }>>([]);
  const [defaultOrgName] = useState<string>(() => {
    return (
      localStorage.getItem('active_organization_orgsuperadmin') ||
      localStorage.getItem('active_organization') ||
      currentUser?.name ||
      'Yaa Creations'
    );
  });

  useEffect(() => {
    let alive = true;
    branchApi
      .getBranches({ page_no: 1, page_size: 100, pagination_required: 'false' })
      .then((res) => {
        if (alive && res?.data && Array.isArray(res.data)) {
          setBranches(res.data.map((b: any) => ({ id: b.id, name: b.name, code: b.code, subOrganizationId: b.subOrganizationId })));
        }
      })
      .catch(() => {});

    subOrganizationApi
      .getSubOrganizations({ page_no: 1, page_size: 100, pagination_required: 'false' })
      .then((res) => {
        if (alive && res?.data && Array.isArray(res.data)) {
          setSubOrgs(res.data.map((s: any) => ({ id: s.id, name: s.name, code: s.code })));
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
  const [submitting, setSubmitting] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    subOrganizationId: '',
    branchId: '',
    name: '',
    code: '',
    logo: '',
    mobileNumber: '',
    email: '',
    gstNumber: '',
    panNumber: '',
    country: 'India',
    state: '',
    district: '',
    city: '',
    pincode: '',
    address: '',
    status: 'Active' as 'Active' | 'Inactive',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo file size must be less than 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      updateField('logo', reader.result as string);
    };
    reader.readAsDataURL(file);
  };

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
          (f.phone && f.phone.includes(q)) ||
          (f.email && f.email.toLowerCase().includes(q))
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
    const generatedCode = `FRM-${String(firms.length + 1).padStart(3, '0')}`;
    setFormData({
      subOrganizationId: '',
      branchId: '',
      name: '',
      code: generatedCode,
      logo: '',
      mobileNumber: '',
      email: '',
      gstNumber: '',
      panNumber: '',
      country: 'India',
      state: '',
      district: '',
      city: '',
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
      subOrganizationId: firm.subOrganizationId || '',
      branchId: firm.branchId || '',
      name: firm.name,
      code: firm.code || '',
      logo: firm.logo || '',
      mobileNumber: firm.phone || '',
      email: firm.email || '',
      gstNumber: firm.gstNumber || '',
      panNumber: firm.panNumber || '',
      country: firm.country || 'India',
      state: firm.state || '',
      district: firm.district || '',
      city: firm.city || '',
      pincode: firm.pincode || '',
      address: firm.address || '',
      status: firm.status,
    });
    setIsFormModalOpen(true);
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Firm name is required';
    if (!formData.mobileNumber.trim()) {
      errs.mobileNumber = 'Mobile number is required';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveFirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);

    try {
      const matchedBranch = branches.find((b) => b.id === formData.branchId);
      const matchedSub = formData.subOrganizationId === '__PARENT_ORG__'
      ? { id: '__PARENT_ORG__', name: defaultOrgName ? `${defaultOrgName} (Main Organization)` : 'Main Organization' }
      : subOrgs.find((s) => s.id === formData.subOrganizationId);
      const locationStr = [formData.city, formData.state].filter(Boolean).join(', ');

      if (editingFirm) {
        const updated: FirmItem = {
          ...editingFirm,
          name: formData.name,
          code: formData.code || editingFirm.code,
          logo: formData.logo,
          subOrganizationId: formData.subOrganizationId,
          subOrganizationName: matchedSub?.name || editingFirm.subOrganizationName,
          branchId: formData.branchId,
          branchName: matchedBranch?.name || editingFirm.branchName,
          phone: formData.mobileNumber,
          email: formData.email,
          gstNumber: formData.gstNumber,
          panNumber: formData.panNumber,
          country: formData.country,
          state: formData.state,
          district: formData.district,
          city: formData.city,
          pincode: formData.pincode,
          address: formData.address,
          status: formData.status,
          location: locationStr || editingFirm.location,
          updatedAt: new Date().toISOString(),
        };
        const nextList = firms.map((f) => (f.id === editingFirm.id ? updated : f));
        saveFirms(nextList);
        toast.success(`Firm "${formData.name}" updated successfully.`);
      } else {
        const nextCode = formData.code || `FRM-${String(firms.length + 1).padStart(3, '0')}`;
        const newFirm: FirmItem = {
          id: `frm_${Date.now()}`,
          name: formData.name,
          code: nextCode,
          logo: formData.logo,
          subOrganizationId: formData.subOrganizationId,
          subOrganizationName: matchedSub?.name,
          branchId: formData.branchId,
          branchName: matchedBranch?.name,
          phone: formData.mobileNumber,
          email: formData.email,
          gstNumber: formData.gstNumber,
          panNumber: formData.panNumber,
          country: formData.country,
          state: formData.state,
          district: formData.district,
          city: formData.city,
          pincode: formData.pincode,
          address: formData.address,
          status: formData.status,
          location: locationStr,
          createdAt: new Date().toISOString(),
        };
        saveFirms([newFirm, ...firms]);
        toast.success(`Firm "${formData.name}" created successfully.`);
      }
      setIsFormModalOpen(false);
    } finally {
      setSubmitting(false);
    }
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
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200 min-w-[1100px]">
            <thead>
              <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white tracking-wider uppercase">
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">FIRM NAME & CODE</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">REGISTRATION TYPE</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">CONTACT PERSON</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">GSTIN / PAN</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">LOCATION</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">STATUS</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">CREATED DATE</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center w-24">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {paginatedFirms.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    No firms found matching your search.
                  </td>
                </tr>
              ) : (
                paginatedFirms.map((firm) => (
                  <tr key={firm.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-200 font-sans">
                    <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {firm.logo ? (
                          <div className="w-10 h-10 rounded-full border border-slate-200 overflow-hidden shadow-xs shrink-0 select-none">
                            <img src={firm.logo} alt={firm.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#33077C] text-white flex items-center justify-center font-medium text-xs tracking-wider shadow-xs shrink-0 select-none">
                            {firm.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-xs sm:text-[14px]">{firm.name}</span>
                          <span className="text-[11px] font-bold text-[#33077C] tracking-wide mt-0.5">{firm.code}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-xs sm:text-[13px]">{firm.registrationType || '-'}</span>
                        <span className="text-[11px] text-slate-500 font-medium mt-0.5">Registration Type</span>
                      </div>
                    </td>

                    <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-[#33077C]" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 text-xs sm:text-[13px] block">{firm.contactPerson || '-'}</span>
                          <span className="text-[10px] text-slate-400 font-medium block">
                            {firm.phone || firm.email || 'Contact Person'}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                      <div>
                        <div className="text-slate-800 text-[11px] sm:text-xs font-semibold">
                          {firm.gstNumber ? `GST: ${firm.gstNumber}` : '-'}
                        </div>
                        {firm.panNumber && (
                          <div className="text-slate-500 text-[10px] sm:text-[11px] font-medium mt-0.5">PAN: {firm.panNumber}</div>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-[#33077C] shrink-0" />
                        <span>{firm.city ? `${firm.city}${firm.state ? `, ${firm.state}` : ''}` : '-'}</span>
                      </div>
                    </td>

                    <td className="py-4 px-5 border border-slate-200 whitespace-nowrap text-center">
                      <StatusBadge status={firm.status} />
                    </td>

                    <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                      <div>
                        <span className="font-bold text-slate-900 text-xs sm:text-[13px] block">
                          {formatDate(firm.createdAt)}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                          {firm.status === 'Active' ? 'Active Firm' : 'Inactive Firm'}
                        </span>
                      </div>
                    </td>

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
                                setViewingFirm(firm);
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

                            {/* Inactive / Active Toggle */}
                            <button
                              type="button"
                              onClick={() => {
                                rowMenu.close();
                                setStatusConfirmFirm(firm);
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
                              <span>{firm.status === 'Inactive' ? 'Active' : 'Inactive'}</span>
                            </button>

                            {/* Suspend / Resume */}
                            <button
                              type="button"
                              onClick={() => {
                                rowMenu.close();
                                const nextState = (firm as any).status === 'Suspended' ? 'Active' : 'Suspended';
                                const nextList = firms.map((f) =>
                                  f.id === firm.id ? { ...f, status: nextState as any, updatedAt: new Date().toISOString() } : f
                                );
                                saveFirms(nextList);
                                toast.success(`Firm marked as ${nextState}.`);
                              }}
                              className="w-full px-3 py-2 text-left text-[13px] font-bold text-amber-800 hover:bg-amber-50/60 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                            >
                              <span
                                style={{ width: '26px', height: '26px' }}
                                className="rounded-full bg-amber-500 flex items-center justify-center shrink-0 shadow-2xs"
                              >
                                {(firm as any).status === 'Suspended' ? (
                                  <CheckCircle2 style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />
                                ) : (
                                  <PauseCircle style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />
                                )}
                              </span>
                              <span>{(firm as any).status === 'Suspended' ? 'Resume' : 'Suspend'}</span>
                            </button>

                            <div className="my-1 mx-2 border-t border-slate-100" />

                            {/* Delete */}
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
          {/* Form Fields: 3 fields per row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Field 1: Select Sub-Organization */}
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Select Sub-Organization
              </label>
              <CustomSelect
                value={formData.subOrganizationId}
                onChange={(val) => {
                  updateField('subOrganizationId', val);
                  // Auto-reset or select valid branch under this sub-org
                  const availableBranches = branches.filter((b) => !val || val === '__PARENT_ORG__' || !b.subOrganizationId || b.subOrganizationId === val);
                  if (availableBranches.length > 0 && !availableBranches.some((b) => b.id === formData.branchId)) {
                    updateField('branchId', availableBranches[0].id);
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
            </div>

            {/* Field 2: Select Branch */}
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Select Branch
              </label>
              <CustomSelect
                value={formData.branchId}
                onChange={(val) => updateField('branchId', val)}
                options={branches
                  .filter((b) => !formData.subOrganizationId || formData.subOrganizationId === '__PARENT_ORG__' || !b.subOrganizationId || b.subOrganizationId === formData.subOrganizationId)
                  .map((b) => ({
                    value: b.id,
                    label: `${b.name}${b.code ? ` (${b.code})` : ''}`,
                  }))}
                placeholder="Select Branch"
                optionVariant="strong"
                activeColor="brand"
              />
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
              placeholder="e.g. 9876543210"
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
                onChange={(val) => updateField('status', val as 'Active' | 'Inactive')}
                options={[
                  { label: 'Active', value: 'Active' },
                  { label: 'Inactive', value: 'Inactive' },
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
              {viewingFirm.logo ? (
                <div className="w-12 h-12 rounded-2xl border border-slate-200 overflow-hidden shadow-sm shrink-0">
                  <img src={viewingFirm.logo} alt={viewingFirm.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-[#33077C] text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                  {viewingFirm.name.slice(0, 2).toUpperCase()}
                </div>
              )}
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
