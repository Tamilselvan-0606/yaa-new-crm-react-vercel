import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Branch, BranchStatus, Product } from '../../types';
import {
  GitBranch,
  Plus,
  Phone,
  MessageCircle,
  Mail,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  Ban,
  PauseCircle,
  CheckCircle2,
  X,
  Building2,
  MapPin,
  UserRound,
  Boxes,
  Check,
} from 'lucide-react';
import { SearchBar } from '../../components/common/SearchBar';
import { FilterDropdown } from '../../components/common/FilterDropdown';
import { Button } from '../../components/common/Button';
import { Pagination } from '../../components/common/Pagination';
import { Modal } from '../../components/common/Modal';
import { CustomSelect } from '../../components/common/CustomSelect';

export const BranchesView: React.FC = () => {
  const { showToast } = useAuth();

  // Data states
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filter States
  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pendingProductFilter, setPendingProductFilter] = useState('ALL');
  const [appliedProductFilter, setAppliedProductFilter] = useState('ALL');
  const [pendingStatus, setPendingStatus] = useState('ALL');
  const [appliedStatus, setAppliedStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 3-Dots Action Dropdown State
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, text: string, key: string, label: string) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast?.('success', 'Copied to Clipboard', `${label}: ${text}`);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // View Modal State
  const [viewBranch, setViewBranch] = useState<Branch | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    productId: '',
    name: '',
    code: '',
    contactPerson: '',
    mobileNumber: '',
    whatsapp: '',
    email: '',
    location: '',
    status: '' as BranchStatus,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [branchesData, productsData] = await Promise.all([
        api.getBranches(),
        api.getProducts(),
      ]);
      setBranches(branchesData || []);
      setProducts(productsData || []);
    } catch (err) {
      console.error('Failed to load branches data:', err);
      showToast?.('error', 'Error', 'Failed to load branches data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Close dropdown on outside click or scroll
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.branch-action-dropdown-container') && !target.closest('.branch-action-dropdown-menu')) {
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

  // Filtered branches
  const filteredBranches = useMemo(() => {
    return branches.filter((b) => {
      const q = appliedSearch.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        b.name.toLowerCase().includes(q) ||
        (b.code && b.code.toLowerCase().includes(q)) ||
        (b.location && b.location.toLowerCase().includes(q)) ||
        (b.city && b.city.toLowerCase().includes(q)) ||
        (b.whatsapp && b.whatsapp.toLowerCase().includes(q)) ||
        (b.productName && b.productName.toLowerCase().includes(q)) ||
        (b.contactPerson && b.contactPerson.toLowerCase().includes(q));

      const matchesProduct =
        appliedProductFilter === 'ALL' || b.productId === appliedProductFilter;

      const matchesStatus =
        appliedStatus === 'ALL' || (b.status || 'Active') === appliedStatus;

      return matchesSearch && matchesProduct && matchesStatus;
    });
  }, [branches, appliedSearch, appliedProductFilter, appliedStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredBranches.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedBranches = useMemo(() => {
    return filteredBranches.slice((safePage - 1) * pageSize, safePage * pageSize);
  }, [filteredBranches, safePage, pageSize]);

  // Modal Handlers
  const handleOpenAddModal = () => {
    setEditingBranch(null);
    setFormData({
      productId: '',
      name: '',
      code: '',
      contactPerson: '',
      mobileNumber: '',
      whatsapp: '',
      email: '',
      location: '',
      status: '' as BranchStatus,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      productId: branch.productId || '',
      name: branch.name || '',
      code: branch.code || '',
      contactPerson: branch.contactPerson || '',
      mobileNumber: branch.mobileNumber || '',
      whatsapp: branch.whatsapp || '',
      email: branch.email || '',
      location: branch.location || branch.city || branch.address || '',
      status: branch.status || 'Active',
    });
    setIsModalOpen(true);
  };

  const handleViewBranch = (branch: Branch) => {
    setViewBranch(branch);
    setIsViewModalOpen(true);
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast?.('error', 'Validation Error', 'Branch Name is required');
      return;
    }
    if (!formData.status) {
      showToast?.('error', 'Validation Error', 'Please select a status');
      return;
    }

    try {
      setSubmitting(true);
      if (editingBranch) {
        await api.updateBranch(editingBranch.id, {
          productId: formData.productId || undefined,
          name: formData.name.trim(),
          code: formData.code.trim(),
          contactPerson: formData.contactPerson.trim(),
          mobileNumber: formData.mobileNumber.trim(),
          whatsapp: formData.whatsapp.trim(),
          email: formData.email.trim(),
          location: formData.location.trim(),
          city: formData.location.trim(),
          status: formData.status,
        });
        showToast?.('success', 'Branch Updated', `Branch "${formData.name}" updated successfully`);
      } else {
        await api.createBranch({
          productId: formData.productId || undefined,
          name: formData.name.trim(),
          code: formData.code.trim(),
          contactPerson: formData.contactPerson.trim(),
          mobileNumber: formData.mobileNumber.trim(),
          whatsapp: formData.whatsapp.trim(),
          email: formData.email.trim(),
          location: formData.location.trim(),
          city: formData.location.trim(),
          status: formData.status,
        });
        showToast?.('success', 'Branch Added', `Branch "${formData.name}" created successfully`);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      console.error('Failed to save branch:', err);
      showToast?.('error', 'Operation Failed', err.message || 'Could not save branch');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (branch: Branch, newStatus: BranchStatus) => {
    try {
      await api.updateBranch(branch.id, { status: newStatus });
      showToast?.('success', 'Status Updated', `Branch status changed to ${newStatus}`);
      loadData();
    } catch (err: any) {
      showToast?.('error', 'Error', err.message || 'Failed to update status');
    }
  };

  const handleDeleteBranch = async (branch: Branch) => {
    if (!window.confirm(`Are you sure you want to delete branch "${branch.name}"?`)) return;
    try {
      await api.deleteBranch(branch.id);
      showToast?.('success', 'Branch Deleted', `Branch "${branch.name}" removed successfully`);
      loadData();
    } catch (err: any) {
      showToast?.('error', 'Error', err.message || 'Failed to delete branch');
    }
  };

  const formatCreatedDate = (dateStr?: string): string => {
    if (!dateStr) return '15 Jan, 2023';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = d.getDate();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month}, ${year}`;
    } catch {
      return dateStr;
    }
  };

  const getBranchInitials = (name?: string): string => {
    if (!name) return 'BR';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Product select options for Add/Edit form
  const productOptions = products.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  // Filter options for products in search bar
  const productFilterOptions = [
    { label: 'All Products', value: 'ALL' },
    ...products.map((p) => ({ label: p.name, value: p.id })),
  ];

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. Top Action Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
              <GitBranch className="w-4.5 h-4.5" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Branches
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            List and manage regional branches across your products
          </p>
        </div>

        {/* Top Right Action Button: Add Branch */}
        <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenAddModal}
            icon={<Plus className="w-4 h-4 text-white" />}
            className="w-full sm:w-auto justify-center"
          >
            Add Branch
          </Button>
        </div>
      </div>

      {/* 2. Search Bar & Dropdown Filter Row */}
      <SearchBar
        value={pendingSearch}
        onChange={(val) => setPendingSearch(val)}
        placeholder="Search branches by name, code, city, product..."
        onSubmit={() => {
          setAppliedSearch(pendingSearch);
          setAppliedProductFilter(pendingProductFilter);
          setAppliedStatus(pendingStatus);
          setPage(1);
        }}
        onReset={() => {
          setPendingSearch('');
          setAppliedSearch('');
          setPendingProductFilter('ALL');
          setAppliedProductFilter('ALL');
          setPendingStatus('ALL');
          setAppliedStatus('ALL');
          setPage(1);
        }}
        filterSlot={
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Product Dropdown Filter */}
            <FilterDropdown
              options={productFilterOptions}
              value={pendingProductFilter}
              onChange={(val) => setPendingProductFilter(val)}
              placeholder="Product : All"
            />

            {/* Status Dropdown */}
            <FilterDropdown
              options={[
                { label: 'Status : All', value: 'ALL' },
                { label: 'Active', value: 'Active', dotColor: '#10b981' },
                { label: 'Inactive', value: 'Inactive', dotColor: '#64748b' },
                { label: 'Suspended', value: 'Suspended', dotColor: '#f59e0b' },
              ]}
              value={pendingStatus}
              onChange={(val) => setPendingStatus(val)}
              placeholder="Status : All"
            />
          </div>
        }
        rightSlot={
          <div className="flex items-center gap-3 pr-1">
            <span className="text-xs font-semibold text-slate-500">
              Total Branches :{' '}
              <span className="text-[#33077C] font-bold">{filteredBranches.length}</span>
            </span>
          </div>
        }
      />

      {/* 3. Branches Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200 min-w-[950px]">
            <thead>
              <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white tracking-wider uppercase">
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">BRANCH & CODE</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">CONTACT PERSON</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-center">CONTACT INFO</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">LOCATION</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">STATUS</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">CREATED DATE</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-7 h-7 border-2 border-purple-200 border-t-[#33077C] rounded-full animate-spin" />
                      <span className="text-xs text-slate-500">Loading branches...</span>
                    </div>
                  </td>
                </tr>
              ) : pagedBranches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    No branches found matching your criteria.
                  </td>
                </tr>
              ) : (
                pagedBranches.map((branch) => {
                  const initials = getBranchInitials(branch.name);

                  return (
                    <tr
                      key={branch.id}
                      className="hover:bg-slate-50/80 transition-colors border-b border-slate-200 font-sans"
                    >
                      {/* 1. BRANCH & CODE */}
                      <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#33077C] text-white flex items-center justify-center font-medium text-xs tracking-wider shadow-xs shrink-0 select-none">
                            {initials}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-xs sm:text-[14px]">
                              {branch.name}
                            </span>
                            <span className="text-[11px] font-bold text-[#33077C] tracking-wide mt-0.5">
                              {branch.code}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. CONTACT PERSON */}
                      <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                            <UserRound className="w-4 h-4 text-[#33077C]" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 text-xs sm:text-[13px] block">
                              {branch.contactPerson || '-'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium block">
                              Branch In-charge
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 3. CONTACT INFO */}
                      <td className="py-4 px-4 border border-slate-200 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          {/* Mobile / Phone */}
                          {branch.mobileNumber ? (
                            <div className="relative group">
                              <button
                                type="button"
                                onClick={(e) => handleCopy(e, branch.mobileNumber!, `${branch.id}-phone`, 'Phone Number')}
                                className="w-8 h-8 rounded-lg bg-[#EBF3FF] hover:bg-[#dbeafe] flex items-center justify-center text-[#2563EB] hover:scale-110 active:scale-95 transition-all shadow-2xs cursor-pointer"
                                title="Click to copy phone number"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </button>
                              <div
                                className={`transition-all duration-200 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 text-white text-[11px] font-semibold rounded-md shadow-md whitespace-nowrap z-30 ${
                                  copiedKey === `${branch.id}-phone`
                                    ? 'opacity-100 bg-emerald-600 scale-100'
                                    : 'opacity-0 group-hover:opacity-100 bg-slate-900'
                                }`}
                              >
                                {copiedKey === `${branch.id}-phone` ? 'Copied!' : branch.mobileNumber}
                              </div>
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 opacity-40">
                              <Phone className="w-3.5 h-3.5" />
                            </div>
                          )}

                          {/* WhatsApp */}
                          {branch.whatsapp ? (
                            <div className="relative group">
                              <button
                                type="button"
                                onClick={(e) => handleCopy(e, branch.whatsapp!, `${branch.id}-wa`, 'WhatsApp Number')}
                                className="w-8 h-8 rounded-lg bg-[#ECFDF5] hover:bg-[#d1fae5] flex items-center justify-center text-[#059669] hover:scale-110 active:scale-95 transition-all shadow-2xs cursor-pointer"
                                title="Click to copy WhatsApp number"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>
                              <div
                                className={`transition-all duration-200 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 text-white text-[11px] font-semibold rounded-md shadow-md whitespace-nowrap z-30 ${
                                  copiedKey === `${branch.id}-wa`
                                    ? 'opacity-100 bg-emerald-600 scale-100'
                                    : 'opacity-0 group-hover:opacity-100 bg-slate-900'
                                }`}
                              >
                                {copiedKey === `${branch.id}-wa` ? 'Copied!' : branch.whatsapp}
                              </div>
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 opacity-40">
                              <MessageCircle className="w-3.5 h-3.5" />
                            </div>
                          )}

                          {/* Email */}
                          {branch.email ? (
                            <div className="relative group">
                              <button
                                type="button"
                                onClick={(e) => handleCopy(e, branch.email!, `${branch.id}-email`, 'Email Address')}
                                className="w-8 h-8 rounded-lg bg-[#FEEFEE] hover:bg-[#fee2e2] flex items-center justify-center text-[#EF4444] hover:scale-110 active:scale-95 transition-all shadow-2xs cursor-pointer"
                                title="Click to copy email address"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </button>
                              <div
                                className={`transition-all duration-200 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 text-white text-[11px] font-semibold rounded-md shadow-md whitespace-nowrap z-30 ${
                                  copiedKey === `${branch.id}-email`
                                    ? 'opacity-100 bg-emerald-600 scale-100'
                                    : 'opacity-0 group-hover:opacity-100 bg-slate-900'
                                }`}
                              >
                                {copiedKey === `${branch.id}-email` ? 'Copied!' : branch.email}
                              </div>
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 opacity-40">
                              <Mail className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 4. LOCATION */}
                      <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-[#33077C] shrink-0" />
                          <span>{branch.location || branch.city || branch.address || 'N/A'}{branch.state && !branch.location?.includes(branch.state) ? `, ${branch.state}` : ''}</span>
                        </div>
                      </td>

                      {/* 5. STATUS */}
                      <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                        {branch.status === 'Inactive' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                            <span>Inactive</span>
                          </span>
                        ) : branch.status === 'Suspended' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-300 text-xs font-bold shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            <span>Suspended</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50/90 text-emerald-700 border border-emerald-300/80 text-xs font-bold shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>Active</span>
                          </span>
                        )}
                      </td>

                      {/* 6. CREATED DATE */}
                      <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                        <div>
                          <span className="font-bold text-slate-900 text-xs sm:text-[13px] block">
                            {formatCreatedDate(branch.createdAt)}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                            {branch.status === 'Suspended' ? 'Suspended Branch' : branch.status === 'Inactive' ? 'Inactive Branch' : 'Active Branch'}
                          </span>
                        </div>
                      </td>

                      {/* 7. ACTIONS */}
                      <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap">
                        <div className="relative inline-block text-left branch-action-dropdown-container">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeDropdownId === branch.id) {
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
                                setActiveDropdownId(branch.id);
                              }
                            }}
                            className="w-8 h-8 rounded-lg bg-[#33077C] hover:bg-[#432fb3] flex items-center justify-center text-white shadow-xs transition-all hover:scale-105 active:scale-95 mx-auto cursor-pointer"
                            title="More Actions"
                          >
                            <MoreVertical className="w-4 h-4 fill-white text-white" />
                          </button>

                          {activeDropdownId === branch.id && dropdownPos && (
                            <div
                              className="branch-action-dropdown-menu fixed z-[9999] w-48 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-100 font-sans text-left"
                              style={{
                                top: dropdownPos.top !== undefined ? `${dropdownPos.top}px` : 'auto',
                                bottom: dropdownPos.bottom !== undefined ? `${dropdownPos.bottom}px` : 'auto',
                                right: `${dropdownPos.right}px`,
                              }}
                            >
                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  handleOpenEditModal(branch);
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
                                  setActiveDropdownId(null);
                                  handleViewBranch(branch);
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
                                  setActiveDropdownId(null);
                                  handleUpdateStatus(branch, branch.status === 'Inactive' ? 'Active' : 'Inactive');
                                }}
                                className="w-full px-3 py-2 text-left text-[13px] font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                              >
                                <span
                                  style={{ width: '26px', height: '26px' }}
                                  className="rounded-full bg-slate-500 flex items-center justify-center shrink-0 shadow-2xs"
                                >
                                  {branch.status === 'Inactive' ? (
                                    <CheckCircle2 style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />
                                  ) : (
                                    <Ban style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />
                                  )}
                                </span>
                                <span>{branch.status === 'Inactive' ? 'Active' : 'Inactive'}</span>
                              </button>

                              {/* Suspend / Resume */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  handleUpdateStatus(branch, branch.status === 'Suspended' ? 'Active' : 'Suspended');
                                }}
                                className="w-full px-3 py-2 text-left text-[13px] font-bold text-amber-800 hover:bg-amber-50/60 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                              >
                                <span
                                  style={{ width: '26px', height: '26px' }}
                                  className="rounded-full bg-amber-500 flex items-center justify-center shrink-0 shadow-2xs"
                                >
                                  {branch.status === 'Suspended' ? (
                                    <CheckCircle2 style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />
                                  ) : (
                                    <PauseCircle style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />
                                  )}
                                </span>
                                <span>{branch.status === 'Suspended' ? 'Resume' : 'Suspend'}</span>
                              </button>

                              <div className="my-1 mx-2 border-t border-slate-100" />

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  handleDeleteBranch(branch);
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filteredBranches.length > 0 && (
        <Pagination
          total={filteredBranches.length}
          currentPage={safePage}
          pageSize={pageSize}
          pageSizeOptions={[5, 10, 20, 50]}
          onPageChange={(newPage) => setPage(newPage)}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      )}

      {/* 4. Add / Edit Branch Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBranch ? 'Edit Branch' : 'Add New Branch'}
        subtitle={
          <span className="text-white/80 text-xs font-normal">
            {editingBranch ? 'Update branch location and contact specifications' : 'Create a regional branch under an offering product'}
          </span>
        }
        maxWidth="4xl"
        headerGradient={true}
        showBackIcon={true}
        hideCloseButton={true}
        onBack={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleSaveBranch} className="space-y-4 p-2 sm:p-4 animate-in fade-in duration-150">
          {/* Row 1: Branch Name | Branch Code | Contact Person Name */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Branch Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Branch Code
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Contact Person Name
              </label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>
          </div>

          {/* Row 2: Mobile Number | WhatsApp Number | Email */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Mobile Number
              </label>
              <input
                type="text"
                value={formData.mobileNumber}
                onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                WhatsApp Number
              </label>
              <input
                type="text"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>
          </div>

          {/* Row 3: Location | Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Status <span className="text-rose-500">*</span>
              </label>
              <CustomSelect
                value={formData.status}
                onChange={(val) => setFormData({ ...formData, status: val as BranchStatus })}
                options={[
                  { label: 'Active', value: 'Active' },
                  { label: 'Inactive', value: 'Inactive' },
                  { label: 'Suspended', value: 'Suspended' },
                ]}
                placeholder="Select Status"
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
              onClick={() => setIsModalOpen(false)}
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
              {submitting ? 'Saving...' : editingBranch ? 'Save Changes' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5. View Branch Modal */}
      {viewBranch && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setViewBranch(null);
          }}
          title={viewBranch.name}
          subtitle={
            <div className="flex items-center gap-2 text-white/80 text-xs font-normal">
              <span>Branch Details & Regional Overview</span>
              <span>•</span>
              <span className="font-semibold text-white">{viewBranch.code}</span>
            </div>
          }
          maxWidth="4xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => {
            setIsViewModalOpen(false);
            setViewBranch(null);
          }}
        >
          <div className="p-4 sm:p-6 space-y-6 font-sans">
            {/* Top Profile Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#33077C] text-white flex items-center justify-center font-semibold text-lg tracking-wider shrink-0 shadow-md select-none">
                  {getBranchInitials(viewBranch.name)}
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      {viewBranch.name}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EFEBFF] text-[#33077C] border border-[#33077C]/20">
                      {viewBranch.code}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="font-semibold text-slate-700">
                      {viewBranch.productName || 'Associated Product'}
                    </span>
                    {viewBranch.city && (
                      <span className="flex items-center gap-1 text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-[#33077C]" />
                        {viewBranch.city}{viewBranch.state ? `, ${viewBranch.state}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="shrink-0">
                {viewBranch.status === 'Inactive' ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    Inactive
                  </span>
                ) : viewBranch.status === 'Suspended' ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-300 text-xs font-bold shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Suspended
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-bold shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Active Branch
                  </span>
                )}
              </div>
            </div>

            {/* Detail Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Card 1: Branch & Corporate Info */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#33077C]" />
                  Branch & Product Association
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Product Name</span>
                    <span className="font-bold text-slate-900">{viewBranch.productName || 'N/A'}</span>
                  </div>
                  {products.find((p) => p.id === viewBranch.productId)?.code && (
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Product Code</span>
                      <span className="font-bold text-[#4309A2]">{products.find((p) => p.id === viewBranch.productId)?.code}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Branch Code</span>
                    <span className="font-bold text-[#33077C]">{viewBranch.code}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">GST Number</span>
                    <span className="font-bold text-slate-900">{viewBranch.gstNumber || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500 font-medium">Created Date</span>
                    <span className="font-bold text-slate-900">{formatCreatedDate(viewBranch.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Contact & Location */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <UserRound className="w-4 h-4 text-[#33077C]" />
                  Contact & Location
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Contact Person</span>
                    <span className="font-bold text-slate-900">{viewBranch.contactPerson || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Mobile Number</span>
                    <span className="font-bold text-slate-900">{viewBranch.mobileNumber || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">WhatsApp Number</span>
                    <span className="font-bold text-slate-900">{viewBranch.whatsapp || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Email</span>
                    <span className="font-bold text-slate-900">{viewBranch.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500 font-medium">Location</span>
                    <span className="font-bold text-slate-900 text-right max-w-[200px] truncate" title={viewBranch.location || viewBranch.city || viewBranch.address}>
                      {viewBranch.location || viewBranch.city || viewBranch.address || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 border-t border-slate-100">
              <Button
                variant="secondary"
                size="md"
                icon={<X className="w-4 h-4 text-slate-500" />}
                onClick={() => {
                  setIsViewModalOpen(false);
                  setViewBranch(null);
                }}
                className="w-full sm:w-auto justify-center"
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={<Pencil className="w-4 h-4 stroke-[2.2]" />}
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleOpenEditModal(viewBranch);
                }}
                className="w-full sm:w-auto justify-center"
              >
                Edit Branch
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
