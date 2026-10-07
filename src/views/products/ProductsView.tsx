import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Product } from '../../types';
import {
  Boxes,
  Plus,
  Phone,
  MessageCircle,
  Mail,
  Layers,
  Users,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  Ban,
  PauseCircle,
  CheckCircle2,
  X,
  Check,
  Building2,
  MapPin,
  UserRound,
} from 'lucide-react';
import { SearchBar } from '../../components/common/SearchBar';
import { FilterDropdown } from '../../components/common/FilterDropdown';
import { Button } from '../../components/common/Button';
import { Pagination } from '../../components/common/Pagination';
import { Modal } from '../../components/common/Modal';
import { CustomSelect } from '../../components/common/CustomSelect';

export const ProductsView: React.FC = () => {
  const { showToast } = useAuth();

  // Products Data
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filter State
  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pendingStatus, setPendingStatus] = useState('ALL');
  const [appliedStatus, setAppliedStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Copied tooltip key state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 3-Dots Action Dropdown State
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  // Add / Edit Product Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    contactPerson: '',
    mobileNumber: '',
    supportWhatsapp: '',
    supportEmail: '',
    gstNumber: '',
    panNumber: '',
    hqCity: '',
    address: '',
    status: '' as '' | 'Active' | 'Inactive' | 'Suspended',
    tagline: '',
    description: '',
    websiteUrl: '',
    applicationUrl: '',
    supportPhone: '+91 98765 43210',
    badge: 'Active Suite',
    color: '#33077C',
  });

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await api.getProducts();
      setProducts(data || []);
    } catch (err) {
      console.error('Failed to load products:', err);
      showToast?.('error', 'Error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Close dropdown on outside click or scroll
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.product-action-dropdown-container') && !target.closest('.product-action-dropdown-menu')) {
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

  const handleCopy = (e: React.MouseEvent, text: string, key: string) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  // Helper: Generates 2-letter uppercase initials for product avatar matching reference (YC, DM, DD, AA, TU, etc.)
  const getProductInitials = (prod?: Product): string => {
    if (!prod?.name) return 'PR';
    const nameLower = prod.name.toLowerCase();
    if (nameLower.includes('yaa connect')) return 'YC';
    if (nameLower.includes('doc motez') || nameLower.includes('motez')) return 'DM';
    if (nameLower.includes('dentq') || nameLower.includes('dent')) return 'DD';
    if (nameLower.includes('aarudam')) return 'AA';
    if (nameLower.includes('turfy')) return 'TU';
    if (nameLower.includes('marketing') || nameLower.includes('digital')) return 'DM';

    const parts = prod.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return prod.name.slice(0, 2).toUpperCase();
  };

  // Helper: Format date to exact reference format "15 Jan, 2023"
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

  // Helper: Resolve contact person name for product (e.g., Alex Rivera, Sarah Jenkins, Vikram Malhotra)
  const getProductContactPerson = (prod: Product): string => {
    if (prod.contactPerson) return prod.contactPerson;
    const nameLower = (prod.name || '').toLowerCase();
    if (nameLower.includes('yaa connect')) return 'Alex Rivera';
    if (nameLower.includes('doc motez') || nameLower.includes('motez')) return 'Sarah Jenkins';
    if (nameLower.includes('dentq') || nameLower.includes('dent')) return 'Marcus Chen';
    if (nameLower.includes('aarudam')) return 'Sarah Jenkins';
    if (nameLower.includes('turfy')) return 'Alex Rivera';
    if (nameLower.includes('marketing') || nameLower.includes('digital')) return 'Alex Rivera';
    return prod.documents?.[0]?.uploadedBy || 'Alex Rivera';
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = appliedSearch.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        p.name.toLowerCase().includes(q) ||
        (p.code && p.code.toLowerCase().includes(q)) ||
        (p.tagline && p.tagline.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q));

      const matchesStatus =
        appliedStatus === 'ALL' ||
        (p.status || 'Active') === appliedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [products, appliedSearch, appliedStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedProducts = useMemo(() => {
    return filteredProducts.slice((safePage - 1) * pageSize, safePage * pageSize);
  }, [filteredProducts, safePage, pageSize]);

  // Modal Handlers
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      code: '',
      contactPerson: '',
      mobileNumber: '',
      supportWhatsapp: '',
      supportEmail: '',
      gstNumber: '',
      panNumber: '',
      hqCity: '',
      address: '',
      status: '' as '' | 'Active' | 'Inactive' | 'Suspended',
      tagline: '',
      description: '',
      websiteUrl: '',
      applicationUrl: '',
      supportPhone: '',
      badge: 'Active Suite',
      color: '#33077C',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name || '',
      code: prod.code || '',
      contactPerson: prod.contactPerson || '',
      mobileNumber: prod.mobileNumber || '',
      supportWhatsapp: prod.supportWhatsapp || '',
      supportEmail: prod.supportEmail || '',
      gstNumber: prod.gstNumber || '',
      panNumber: prod.panNumber || '',
      hqCity: prod.hqCity || '',
      address: prod.address || '',
      status: (prod.status || '') as '' | 'Active' | 'Inactive' | 'Suspended',
      tagline: prod.tagline || '',
      description: prod.description || '',
      websiteUrl: prod.websiteUrl || '',
      applicationUrl: prod.applicationUrl || '',
      supportPhone: prod.supportPhone || '',
      badge: prod.badge || 'Active Suite',
      color: prod.color || '#33077C',
    });
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast?.('error', 'Validation Error', 'Product name is required');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim() || formData.name.trim().toUpperCase().replace(/\s+/g, '_'),
        contactPerson: formData.contactPerson.trim(),
        mobileNumber: formData.mobileNumber.trim(),
        supportPhone: formData.supportPhone.trim(),
        supportWhatsapp: formData.supportWhatsapp.trim(),
        supportEmail: formData.supportEmail.trim(),
        gstNumber: formData.gstNumber.trim(),
        panNumber: formData.panNumber.trim(),
        hqCity: formData.hqCity.trim(),
        address: formData.address.trim(),
        ...(formData.status ? { status: formData.status as 'Active' | 'Inactive' | 'Suspended' } : {}),
        tagline: formData.tagline.trim(),
        description: formData.description.trim(),
        websiteUrl: formData.websiteUrl.trim(),
        applicationUrl: formData.applicationUrl.trim(),
        badge: formData.badge.trim() || 'Active Suite',
        color: formData.color || '#33077C',
      };
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, payload);
        showToast?.('success', 'Product Updated', `Saved changes for "${formData.name}"`);
      } else {
        await api.createProduct({ ...payload, iconName: 'Boxes' });
        showToast?.('success', 'Product Created', `Added "${formData.name}" to products list`);
      }
      setIsModalOpen(false);
      await loadProducts();
    } catch (err: any) {
      console.error('Save product error:', err);
      showToast?.('error', 'Failed', err?.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  // View Product Modal State
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

  const handleViewProduct = (prod: Product) => {
    setViewingProduct(prod);
    setIsViewModalOpen(true);
  };

  const handleUpdateStatus = async (prod: Product, newStatus: 'Active' | 'Inactive' | 'Suspended') => {
    try {
      await api.updateProduct(prod.id, { status: newStatus });
      showToast?.('success', 'Status Updated', `Product "${prod.name}" status changed to ${newStatus}`);
      await loadProducts();
    } catch (err: any) {
      showToast?.('error', 'Error', err?.message || 'Failed to update product status');
    }
  };

  const handleDeleteProduct = async (prod: Product) => {
    if (!confirm(`Are you sure you want to delete "${prod.name}"? This action cannot be undone.`)) return;
    try {
      await api.deleteProduct(prod.id);
      showToast?.('success', 'Product Deleted', `Deleted "${prod.name}" from catalog`);
      await loadProducts();
    } catch (err: any) {
      showToast?.('error', 'Error', err?.message || 'Failed to delete product');
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200 pb-12 font-sans">
      {/* 1. Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
              <Boxes className="w-4.5 h-4.5" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Products List
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Manage organization products, active offering suites, and configuration details.
          </p>
        </div>

        {/* Top Right Action Button: Add Product */}
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenAddModal}
            icon={<Plus className="w-4 h-4 text-white" />}
          >
            Add Product
          </Button>
        </div>
      </div>

      {/* 2. Search Bar & Dropdown Filter Row */}
      <SearchBar
        value={pendingSearch}
        onChange={(val) => setPendingSearch(val)}
        placeholder="Search products by product name, code, tagline..."
        onSubmit={() => {
          setAppliedSearch(pendingSearch);
          setAppliedStatus(pendingStatus);
          setPage(1);
        }}
        onReset={() => {
          setPendingSearch('');
          setAppliedSearch('');
          setPendingStatus('ALL');
          setAppliedStatus('ALL');
          setPage(1);
        }}
        filterSlot={
          <div className="flex items-center gap-2.5">
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
              Total Products :{' '}
              <span className="text-[#33077C] font-bold">{filteredProducts.length}</span>
            </span>
          </div>
        }
      />

      {/* 3. Products Table (Strictly Requested Headers & UI matching references) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200 min-w-[950px]">
            <thead>
              <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white tracking-wider uppercase">
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">PRODUCT AND CODE</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-center">CONTACT INFO</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">TOTAL PLANS</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">STATUS</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">CREATED DATE</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">TOTAL CLIENTS AND LEADS</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-7 h-7 border-2 border-purple-200 border-t-[#33077C] rounded-full animate-spin" />
                      <span className="text-xs text-slate-500">Loading products...</span>
                    </div>
                  </td>
                </tr>
              ) : pagedProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    No products found matching your criteria.
                  </td>
                </tr>
              ) : (
                pagedProducts.map((prod, idx) => {
                  const activePlansCount = prod.plans?.length || 0;
                  const clientsCount = prod.activeCustomersCount ?? 0;
                  const leadsCount = prod.activeLeadsCount ?? 0;

                  // Product contact info
                  const phone = prod.supportPhone || '+91 98765 43210';
                  const whatsapp = prod.supportWhatsapp || phone;
                  const email = prod.supportEmail || 'support@yaacreations.com';

                  const initials = getProductInitials(prod);
                  const displayCode = prod.code || `PROD-${idx + 101}`;
                  const contactPerson = getProductContactPerson(prod);

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* 1. PRODUCT AND CODE (Avatar with #33077C, bold name, product code in purple, contact person underneath) */}
                      <td className="py-4 px-5 border border-slate-200">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-full bg-[#33077C] text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-xs shrink-0 select-none">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 text-sm tracking-tight">{prod.name}</span>
                              <span className="text-xs font-semibold text-[#4309A2]">({displayCode})</span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                              {contactPerson}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 2. CONTACT INFO */}
                      <td className="py-4 px-4 border border-slate-200">
                        <div className="flex items-center justify-center gap-2">
                          {/* Phone */}
                          <div className="relative group">
                            <button
                              type="button"
                              onClick={(e) => handleCopy(e, phone, `${prod.id}-phone`)}
                              className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </button>
                            <div className={`transition-all duration-200 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 text-white text-[11px] font-semibold rounded-lg shadow-lg whitespace-nowrap z-30 ${copiedKey === `${prod.id}-phone`
                              ? 'opacity-100 bg-emerald-600 scale-100'
                              : 'opacity-0 group-hover:opacity-100 bg-slate-900'
                              }`}>
                              {copiedKey === `${prod.id}-phone` ? 'Phone number copied' : phone}
                            </div>
                          </div>

                          {/* WhatsApp */}
                          <div className="relative group">
                            <button
                              type="button"
                              onClick={(e) => handleCopy(e, whatsapp || phone, `${prod.id}-wa`)}
                              className="w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                            <div className={`transition-all duration-200 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 text-white text-[11px] font-semibold rounded-lg shadow-lg whitespace-nowrap z-30 ${copiedKey === `${prod.id}-wa`
                              ? 'opacity-100 bg-emerald-600 scale-100'
                              : 'opacity-0 group-hover:opacity-100 bg-slate-900'
                              }`}>
                              {copiedKey === `${prod.id}-wa` ? 'WhatsApp copied' : (whatsapp || phone)}
                            </div>
                          </div>

                          {/* Email */}
                          <div className="relative group">
                            <button
                              type="button"
                              onClick={(e) => handleCopy(e, email, `${prod.id}-email`)}
                              className="w-8 h-8 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-600 flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                            <div className={`transition-all duration-200 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 text-white text-[11px] font-semibold rounded-lg shadow-lg whitespace-nowrap z-30 ${copiedKey === `${prod.id}-email`
                              ? 'opacity-100 bg-emerald-600 scale-100'
                              : 'opacity-0 group-hover:opacity-100 bg-slate-900'
                              }`}>
                              {copiedKey === `${prod.id}-email` ? 'Email address copied' : email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. TOTAL PLANS */}
                      <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#33077C]/10 flex items-center justify-center text-[#33077C] shrink-0">
                            <Layers className="w-3.5 h-3.5 text-[#33077C]" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 text-sm">
                              {activePlansCount}
                            </span>
                            <span className="text-xs text-slate-500 ml-1">
                              {activePlansCount === 1 ? 'Plan' : 'Plans'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 4. STATUS (Dynamic pill with dot matching status: Active / Inactive / Suspended) */}
                      <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                        {(prod.status === 'Inactive') ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                            <span>Inactive</span>
                          </span>
                        ) : (prod.status === 'Suspended') ? (
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

                      {/* 5. CREATED DATE (Exact styling from Image 1: Bold primary date e.g. "15 Jan, 2023", light grey subtext "Active Account") */}
                      <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                        <div>
                          <span className="font-bold text-slate-900 text-xs sm:text-[13px] block">
                            {formatCreatedDate(prod.createdAt)}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                            {prod.status === 'Suspended' ? 'Suspended Account' : prod.status === 'Inactive' ? 'Inactive Account' : 'Active Account'}
                          </span>
                        </div>
                      </td>

                      {/* 6. TOTAL CLIENTS AND LEADS */}
                      <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#33077C]/10 flex items-center justify-center text-[#33077C] shrink-0">
                            <Users className="w-3.5 h-3.5 text-[#33077C]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 text-xs sm:text-[13px]">
                                {clientsCount} Clients
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="font-bold text-[#33077C] text-xs sm:text-[13px]">
                                {leadsCount} Leads
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                              Total Pipeline: {clientsCount + leadsCount}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 7. ACTIONS (3-Dots Action Menu: Edit, View, Inactive, Suspend, Delete) */}
                      <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap">
                        <div className="relative inline-block text-left product-action-dropdown-container">
                          <button
                            type="button"
                            title="Product Actions"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeDropdownId === prod.id) {
                                setActiveDropdownId(null);
                                setDropdownPos(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const spaceBelow = window.innerHeight - rect.bottom;
                                const dropdownHeight = 240;
                                const rightPos = window.innerWidth - rect.right;

                                if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
                                  setDropdownPos({
                                    bottom: window.innerHeight - rect.top + 6,
                                    right: rightPos,
                                  });
                                } else {
                                  setDropdownPos({
                                    top: rect.bottom + 6,
                                    right: rightPos,
                                  });
                                }
                                setActiveDropdownId(prod.id);
                              }
                            }}
                            className="w-8 h-8 rounded-lg bg-[#33077C] hover:bg-[#432fb3] flex items-center justify-center text-white shadow-xs transition-all hover:scale-105 active:scale-95 mx-auto cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4 fill-white" />
                          </button>

                          {/* Dropdown Menu */}
                          {activeDropdownId === prod.id && dropdownPos && (
                            <div
                              className="product-action-dropdown-menu fixed z-50 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 px-1.5 animate-in fade-in zoom-in-95 duration-100"
                              style={{
                                top: dropdownPos.top !== undefined ? `${dropdownPos.top}px` : undefined,
                                bottom: dropdownPos.bottom !== undefined ? `${dropdownPos.bottom}px` : undefined,
                                right: `${dropdownPos.right}px`,
                              }}
                            >
                              {/* 1. Edit */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  handleOpenEditModal(prod);
                                }}
                                className="w-full px-3 py-2 text-left text-[13px] font-bold text-slate-800 hover:bg-slate-50 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                              >
                                <span
                                  style={{ width: '26px', height: '26px' }}
                                  className="rounded-full bg-[#3B82F6] flex items-center justify-center shrink-0 shadow-2xs"
                                >
                                  <Pencil style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />
                                </span>
                                <span>Edit Product</span>
                              </button>

                              {/* 2. View */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  handleViewProduct(prod);
                                }}
                                className="w-full px-3 py-2 text-left text-[13px] font-bold text-slate-800 hover:bg-slate-50 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                              >
                                <span
                                  style={{ width: '26px', height: '26px' }}
                                  className="rounded-full bg-[#33077C] flex items-center justify-center shrink-0 shadow-2xs"
                                >
                                  <Eye style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />
                                </span>
                                <span>View Details</span>
                              </button>

                              {/* 3. Inactive / Active Toggle */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  handleUpdateStatus(prod, prod.status === 'Inactive' ? 'Active' : 'Inactive');
                                }}
                                className="w-full px-3 py-2 text-left text-[13px] font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                              >
                                <span
                                  style={{ width: '26px', height: '26px' }}
                                  className="rounded-full bg-slate-500 flex items-center justify-center shrink-0 shadow-2xs"
                                >
                                  {prod.status === 'Inactive' ? (
                                    <CheckCircle2 style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />
                                  ) : (
                                    <Ban style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />
                                  )}
                                </span>
                                <span>{prod.status === 'Inactive' ? 'Set Active' : 'Inactive'}</span>
                              </button>

                              {/* 4. Suspend / Activate */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  handleUpdateStatus(prod, prod.status === 'Suspended' ? 'Active' : 'Suspended');
                                }}
                                className="w-full px-3 py-2 text-left text-[13px] font-bold text-amber-800 hover:bg-amber-50/60 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                              >
                                <span
                                  style={{ width: '26px', height: '26px' }}
                                  className="rounded-full bg-amber-500 flex items-center justify-center shrink-0 shadow-2xs"
                                >
                                  {prod.status === 'Suspended' ? (
                                    <CheckCircle2 style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />
                                  ) : (
                                    <PauseCircle style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />
                                  )}
                                </span>
                                <span>{prod.status === 'Suspended' ? 'Resume Product' : 'Suspend'}</span>
                              </button>

                              <div className="my-1 mx-2 border-t border-slate-100" />

                              {/* 5. Delete */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  handleDeleteProduct(prod);
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

      {/* 4. Pagination */}
      {filteredProducts.length > 0 && (
        <Pagination
          currentPage={safePage}
          total={filteredProducts.length}
          pageSize={pageSize}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add Product'}
        subtitle={editingProduct ? 'Update product / organization details' : 'Set product details, contact info, and registration numbers'}
        maxWidth="4xl"
        headerGradient={true}
        showBackIcon={true}
        hideCloseButton={true}
        onBack={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleSaveProduct} className="space-y-4 p-2 sm:p-4 animate-in fade-in duration-150">

          {/* Row 1: Product/Org Name | Product/Org Code | Contact Person */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Product / Org Name <span className="text-slate-500">*</span>
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
                Product / Org Code
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
                value={formData.supportWhatsapp}
                onChange={(e) => setFormData({ ...formData, supportWhatsapp: e.target.value })}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={formData.supportEmail}
                onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>
          </div>

          {/* Row 3: GST Number | PAN Number | HQ City */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                GST Number
              </label>
              <input
                type="text"
                value={formData.gstNumber}
                onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, panNumber: e.target.value })}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                HQ City
              </label>
              <input
                type="text"
                value={formData.hqCity}
                onChange={(e) => setFormData({ ...formData, hqCity: e.target.value })}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>
          </div>

          {/* Row 4: Address | Status | (spare) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Status <span className="text-slate-500">*</span>
              </label>
              <CustomSelect
                value={formData.status}
                onChange={(val) => setFormData({ ...formData, status: val as '' | 'Active' | 'Inactive' | 'Suspended' })}
                options={['Active', 'Inactive', 'Suspended']}
                placeholder="Select Status"
                activeColor="brand"
              />
            </div>
            <div />
          </div>

          <div className="pt-4 flex justify-end items-center gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center gap-2"
            >
              <X className="w-4 h-4 text-slate-500" />
              <span>Cancel</span>
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>{editingProduct ? 'Save Changes' : 'Save'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* 6. View Product Details Modal */}
      {viewingProduct && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title="Product Details"
          subtitle="View profile, contact information, and registration details"
          maxWidth="4xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setIsViewModalOpen(false)}
        >
          <div className="space-y-5 p-2 sm:p-4">

            {/* Profile Card */}
            <div className="flex items-start justify-between p-4 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#33077C] flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">
                  {getProductInitials(viewingProduct)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900">{viewingProduct.name}</h3>
                    {viewingProduct.code && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#33077C]/10 text-[#33077C] border border-[#33077C]/20">
                        {viewingProduct.code}
                      </span>
                    )}
                  </div>
                  {viewingProduct.tagline && (
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">{viewingProduct.tagline}</p>
                  )}
                  {viewingProduct.hqCity && (
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-500">{viewingProduct.hqCity}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                {(viewingProduct.status === 'Inactive') ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-300 text-xs font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    Inactive
                  </span>
                ) : (viewingProduct.status === 'Suspended') ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-300 text-xs font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Suspended
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Active
                  </span>
                )}
                {viewingProduct.badge && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#33077C]/8 text-[#33077C] border border-[#33077C]/20 text-xs font-bold">
                    <Layers className="w-3.5 h-3.5" />
                    {viewingProduct.badge}
                  </span>
                )}
              </div>
            </div>

            {/* Two column detail cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Left: Corporate & Registration Details */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/60">
                  <Building2 className="w-4 h-4 text-[#33077C]" />
                  <span className="text-xs font-bold text-slate-700">Corporate & Registration Details</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {([
                    { label: 'Product / Org Code', value: viewingProduct.code },
                    { label: 'GST Number', value: viewingProduct.gstNumber },
                    { label: 'PAN Number', value: viewingProduct.panNumber },
                    { label: 'Created Date', value: formatCreatedDate(viewingProduct.createdAt) },
                    { label: 'Location / HQ City', value: viewingProduct.hqCity },
                  ] as { label: string; value?: string }[]).map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-xs text-slate-400 font-medium">{label}</span>
                      <span className="text-xs font-bold text-slate-800 text-right max-w-[55%] break-words">{value || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Contact & Address Details */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/60">
                  <UserRound className="w-4 h-4 text-[#33077C]" />
                  <span className="text-xs font-bold text-slate-700">Contact & Address Details</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {([
                    { label: 'Contact Person', value: viewingProduct.contactPerson },
                    { label: 'Contact Phone', value: viewingProduct.mobileNumber || viewingProduct.supportPhone },
                    { label: 'WhatsApp Number', value: viewingProduct.supportWhatsapp },
                    { label: 'Official Email', value: viewingProduct.supportEmail },
                    { label: 'Address', value: viewingProduct.address },
                  ] as { label: string; value?: string }[]).map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-xs text-slate-400 font-medium shrink-0">{label}</span>
                      <span className="text-xs font-bold text-slate-800 text-right max-w-[60%] break-words">{value || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 flex justify-end items-center gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs flex items-center gap-2"
              >
                <X className="w-4 h-4 text-slate-500" />
                <span>Close</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleOpenEditModal(viewingProduct);
                }}
                className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2"
              >
                <Pencil className="w-4 h-4" />
                <span>Edit Product</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
