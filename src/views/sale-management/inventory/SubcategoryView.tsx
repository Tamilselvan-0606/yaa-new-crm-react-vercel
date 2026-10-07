import React, { useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  MoreVertical,
  X,
  Check,
  Ban,
  Printer,
  Forward,
  FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'sonner';
import { SearchBar } from '../../../components/common/SearchBar';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { Button } from '../../../components/common/Button';
import { Pagination } from '../../../components/common/Pagination';
import { Modal } from '../../../components/common/Modal';
import { CustomSelect } from '../../../components/common/CustomSelect';
import { exportTableToExcel } from '../../../utils/excelExport';

interface SubcategoryItem {
  id: string;
  sNo: number;
  category: string;
  subcategory: string;
  status: 'Active' | 'Inactive';
}

const CATEGORY_OPTIONS = [
  { label: 'Electronics & Hardware', value: 'Electronics & Hardware' },
  { label: 'Apparel & Fashion', value: 'Apparel & Fashion' },
  { label: 'Home & Office Supplies', value: 'Home & Office Supplies' },
  { label: 'Industrial Equipment', value: 'Industrial Equipment' },
];

export const SubcategoryView: React.FC = () => {
  // 1 initial record
  const [subcategories, setSubcategories] = useState<SubcategoryItem[]>([
    {
      id: 'subcat-1',
      sNo: 1,
      category: 'Electronics & Hardware',
      subcategory: 'Mobile Phones & Accessories',
      status: 'Active',
    },
  ]);

  // Search & Filter State
  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pendingStatus, setPendingStatus] = useState('ALL');
  const [appliedStatus, setAppliedStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 3-Dots Action Dropdown State & Share Popover
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [activeShareId, setActiveShareId] = useState<string | null>(null);
  const [sharePos, setSharePos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  // Close dropdown on outside click or scroll
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.subcategory-action-dropdown-container') && !target.closest('.subcategory-action-dropdown-menu')) {
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

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<SubcategoryItem | null>(null);
  const [formData, setFormData] = useState({
    category: '',
    subcategory: '',
    status: '' as '' | 'Active' | 'Inactive',
  });

  // Filter subcategories
  const filteredSubcategories = useMemo(() => {
    return subcategories.filter((item) => {
      const q = appliedSearch.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        item.subcategory.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);

      const matchesStatus =
        appliedStatus === 'ALL' || item.status === appliedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [subcategories, appliedSearch, appliedStatus]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredSubcategories.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedSubcategories = useMemo(() => {
    return filteredSubcategories.slice((safePage - 1) * pageSize, safePage * pageSize);
  }, [filteredSubcategories, safePage, pageSize]);

  const handleOpenAddModal = () => {
    setEditingSubcategory(null);
    setFormData({
      category: '',
      subcategory: '',
      status: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (subcat: SubcategoryItem) => {
    setEditingSubcategory(subcat);
    setFormData({
      category: subcat.category,
      subcategory: subcat.subcategory,
      status: subcat.status,
    });
    setIsModalOpen(true);
  };

  const handleSaveSubcategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subcategory.trim() || !formData.category) return;

    const finalStatus = (formData.status || 'Active') as 'Active' | 'Inactive';

    if (editingSubcategory) {
      setSubcategories((prev) =>
        prev.map((s) =>
          s.id === editingSubcategory.id
            ? {
                ...s,
                category: formData.category,
                subcategory: formData.subcategory,
                status: finalStatus,
              }
            : s
        )
      );
    } else {
      const newSubcat: SubcategoryItem = {
        id: `subcat-${Date.now()}`,
        sNo: subcategories.length + 1,
        category: formData.category,
        subcategory: formData.subcategory,
        status: finalStatus,
      };
      setSubcategories((prev) => [newSubcat, ...prev]);
    }
    setIsModalOpen(false);
  };

  const handleDeleteSubcategory = (id: string) => {
    setSubcategories((prev) => prev.filter((s) => s.id !== id));
    setActiveDropdownId(null);
  };

  const handleExport = () => {
    if (filteredSubcategories.length === 0) {
      toast.error('No subcategories available to export.');
      return;
    }

    const excelRows = filteredSubcategories.map((s, idx) => ({
      sNo: idx + 1,
      category: s.category,
      subcategory: s.subcategory,
      status: s.status,
    }));

    exportTableToExcel({
      filename: `Subcategories_Report_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Subcategories',
      title: 'YAA CREATIONS CRM - PRODUCT SUBCATEGORIES DIRECTORY',
      subtitle: `Total Subcategories: ${filteredSubcategories.length} | Generated: ${new Date().toLocaleDateString('en-IN')}`,
      columns: [
        { header: '#', key: 'sNo', align: 'center', width: 8 },
        { header: 'Category Name', key: 'category', align: 'left', width: 30 },
        { header: 'Subcategory Name', key: 'subcategory', align: 'left', width: 32 },
        { header: 'Status', key: 'status', align: 'center', width: 16 },
      ],
      data: excelRows,
      summaryRow: {
        sNo: 'TOTAL',
        category: `${filteredSubcategories.length} Subcategories`,
      },
    });

    toast.success(`Subcategories Excel report downloaded (${filteredSubcategories.length} records)!`);
  };

  return (
    <div className="space-y-5">
      {/* 1. Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
              <Layers className="w-4.5 h-4.5" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Subcategory List
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Manage product subcategories, link to categories, and configure classification.
          </p>
        </div>

        {/* Top Right Action Buttons: Excel Report & Add Subcategory */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto shrink-0">
          <Button
            variant="secondary"
            size="md"
            onClick={handleExport}
            className="w-full sm:w-auto justify-center"
            icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
          >
            Excel Report
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenAddModal}
            className="w-full sm:w-auto justify-center"
            icon={<Plus className="w-4 h-4 text-white" />}
          >
            Add Subcategory
          </Button>
        </div>
      </div>

      {/* 2. Search Bar & Dropdown Filter Row */}
      <SearchBar
        value={pendingSearch}
        onChange={(val) => setPendingSearch(val)}
        placeholder="Search by subcategory, category..."
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
            <FilterDropdown
              options={[
                { label: 'Status : All', value: 'ALL' },
                { label: 'Active', value: 'Active', dotColor: '#10b981' },
                { label: 'Inactive', value: 'Inactive', dotColor: '#64748b' },
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
              Total Subcategories :{' '}
              <span className="text-[#33077C] font-bold">{filteredSubcategories.length}</span>
            </span>
          </div>
        }
      />

      {/* 3. Subcategory Table / Mobile Card View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Desktop & Tablet Table (sm: and above) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200">
            <thead>
              <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white tracking-wider uppercase">
                <th className="py-3.5 px-2 sm:px-3 border border-[#33077C]/30 bg-[#33077C] text-white w-12 sm:w-16 text-center">
                  S.NO
                </th>
                <th className="py-3.5 px-3 sm:px-4 border border-[#33077C]/30 bg-[#33077C] text-white">
                  CATEGORY
                </th>
                <th className="py-3.5 px-3 sm:px-4 border border-[#33077C]/30 bg-[#33077C] text-white">
                  SUBCATEGORY
                </th>
                <th className="py-3.5 px-2 sm:px-3 border border-[#33077C]/30 bg-[#33077C] text-white text-center w-24 sm:w-32">
                  STATUS
                </th>
                <th className="py-3.5 px-2 sm:px-3 border border-[#33077C]/30 bg-[#33077C] text-white text-center w-16 sm:w-24">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs sm:text-[13px] text-slate-700">
              {pagedSubcategories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                    No subcategories found.
                  </td>
                </tr>
              ) : (
                pagedSubcategories.map((item, index) => {
                  const sNo = (safePage - 1) * pageSize + index + 1;
                  const isDropdownOpen = activeDropdownId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-purple-50/30 transition-colors border-b border-slate-200"
                    >
                      {/* 1. S.NO */}
                      <td className="py-3 sm:py-4 px-2 sm:px-3 font-semibold text-slate-600 text-center border-r border-slate-200">
                        {sNo}
                      </td>

                      {/* 2. CATEGORY */}
                      <td className="py-3 sm:py-4 px-3 sm:px-4 font-semibold text-slate-800 border-r border-slate-200 break-words">
                        {item.category}
                      </td>

                      {/* 3. SUBCATEGORY */}
                      <td className="py-3 sm:py-4 px-3 sm:px-4 font-medium text-slate-700 border-r border-slate-200 break-words">
                        {item.subcategory}
                      </td>

                      {/* 4. STATUS */}
                      <td className="py-3 sm:py-4 px-2 sm:px-3 text-center border-r border-slate-200 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10.5px] sm:text-xs font-semibold ${
                            item.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {item.status}
                        </span>
                      </td>

                      {/* 5. ACTIONS: Print, Share, 3-dots dropdown */}
                      <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Print Action */}
                          <button
                            type="button"
                            title="Print Subcategory"
                            onClick={() => {
                              toast.info(`Preparing print for subcategory ${item.subcategory}...`);
                              window.print();
                            }}
                            className="w-8 h-8 rounded-lg bg-transparent hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Share / Forward Popover */}
                          <div className="relative inline-block text-left share-popover-container">
                            <button
                              type="button"
                              title="Share Subcategory"
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
                                      const subject = encodeURIComponent(`Product Subcategory: ${item.subcategory}`);
                                      const body = encodeURIComponent(
                                        `Category: ${item.category}\nSubcategory: ${item.subcategory}\nStatus: ${item.status}`
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
                                        `*Product Subcategory:* ${item.subcategory}\n*Category:* ${item.category}\n*Status:* ${item.status}`
                                      );
                                      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
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
                                        `Product Subcategory: ${item.subcategory} (Category: ${item.category}), Status: ${item.status}`
                                      );
                                      window.open(`sms:?body=${text}`, '_blank');
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

                          {/* 3-dots Actions Dropdown */}
                          <div className="relative inline-block text-left subcategory-action-dropdown-container">
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
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const spaceBelow = window.innerHeight - rect.bottom;
                                  const dropdownHeight = 160;
                                  const rightPos = window.innerWidth - rect.right;

                                  if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
                                    setDropdownPos({
                                      bottom: window.innerHeight - rect.top + 4,
                                      right: rightPos,
                                    });
                                  } else {
                                    setDropdownPos({
                                      top: rect.bottom + 4,
                                      right: rightPos,
                                    });
                                  }
                                  setActiveDropdownId(item.id);
                                }
                              }}
                              className="w-8 h-8 rounded-lg bg-transparent hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* Dropdown Menu */}
                            {isDropdownOpen && dropdownPos && (
                              <div
                                className="subcategory-action-dropdown-menu fixed z-[9999] w-48 bg-white rounded-xl shadow-xl border border-slate-200/90 py-1.5 animate-in fade-in zoom-in-95 duration-100 font-sans text-left"
                                style={{
                                  top: dropdownPos.top !== undefined ? `${dropdownPos.top}px` : 'auto',
                                  bottom: dropdownPos.bottom !== undefined ? `${dropdownPos.bottom}px` : 'auto',
                                  right: `${dropdownPos.right}px`,
                                }}
                              >
                                {/* 1. Edit */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleOpenEditModal(item);
                                    setActiveDropdownId(null);
                                    setDropdownPos(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
                                >
                                  Edit
                                </button>

                                {/* 2. Inactive / Active */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextStatus = item.status === 'Active' ? 'Inactive' : 'Active';
                                    setSubcategories((prev) =>
                                      prev.map((s) =>
                                        s.id === item.id
                                          ? { ...s, status: nextStatus }
                                          : s
                                      )
                                    );
                                    toast.success(`Subcategory ${item.subcategory} set to ${nextStatus}.`);
                                    setActiveDropdownId(null);
                                    setDropdownPos(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
                                >
                                  {item.status === 'Active' ? 'Inactive' : 'Active'}
                                </button>

                                {/* 3. Delete */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleDeleteSubcategory(item.id);
                                    setActiveDropdownId(null);
                                    setDropdownPos(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
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

        {/* Mobile View: Clean Card List (< sm screens, e.g. Mobile Phones) */}
        <div className="block sm:hidden divide-y divide-slate-100 font-sans">
          {pagedSubcategories.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-medium text-xs">
              No subcategories found.
            </div>
          ) : (
            pagedSubcategories.map((item, index) => {
              const sNo = (safePage - 1) * pageSize + index + 1;

              return (
                <div key={item.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-purple-50 text-[#33077C] font-bold text-xs flex items-center justify-center shrink-0 border border-purple-100">
                        {sNo}
                      </span>
                      <div>
                        <div className="font-bold text-slate-900 text-sm leading-tight">
                          {item.subcategory}
                        </div>
                        <div className="text-xs text-slate-500 font-medium mt-0.5">
                          Category: <span className="text-slate-800 font-semibold">{item.category}</span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                        item.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          item.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                      {item.status}
                    </span>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(item)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Edit Subcategory"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSubcategories((prev) =>
                          prev.map((s) =>
                            s.id === item.id
                              ? { ...s, status: s.status === 'Active' ? 'Inactive' : 'Active' }
                              : s
                          )
                        );
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Toggle Status"
                    >
                      {item.status === 'Active' ? (
                        <>
                          <Ban className="w-3.5 h-3.5 text-slate-500" />
                          <span>Deactivate</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Activate</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteSubcategory(item.id)}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Delete Subcategory"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. Pagination */}
      <Pagination
        total={filteredSubcategories.length}
        currentPage={safePage}
        pageSize={pageSize}
        pageSizeOptions={[5, 10, 20, 50]}
        onPageChange={(newPage) => setPage(newPage)}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
        }}
      />

      {/* 5. Add / Edit Subcategory Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingSubcategory ? 'Edit Subcategory' : 'Add Subcategory'}
          subtitle="Configure subcategory details, category linkage, and status"
          maxWidth="4xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
        >
          <form onSubmit={handleSaveSubcategory} className="space-y-4.5 p-2 sm:p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[140px]">
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Category <span className="text-rose-500">*</span>
                </label>
                <CustomSelect
                  options={CATEGORY_OPTIONS}
                  value={formData.category}
                  onChange={(val) => setFormData({ ...formData, category: val })}
                  placeholder="Select category"
                  activeColor="brand"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Subcategory Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.subcategory}
                  onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Status <span className="text-rose-500">*</span>
                </label>
                <CustomSelect
                  options={[
                    { label: 'Active', value: 'Active' },
                    { label: 'Inactive', value: 'Inactive' },
                  ]}
                  value={formData.status}
                  onChange={(val) => setFormData({ ...formData, status: val as 'Active' | 'Inactive' })}
                  placeholder="Select status"
                  activeColor="brand"
                />
              </div>
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
                className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>{editingSubcategory ? 'Update' : 'Save'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
