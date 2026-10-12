import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
  Loader2,
  Eye,
  Database,
  AlertTriangle,
  FolderTree,
  AlertCircle,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { SearchBar } from '../../../components/common/SearchBar';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { Button } from '../../../components/common/Button';
import { Pagination } from '../../../components/common/Pagination';
import { Modal } from '../../../components/common/Modal';
import { CustomSelect } from '../../../components/common/CustomSelect';
import { exportTableToExcel } from '../../../utils/excelExport';
import { UniversalShareDropdown, formatSubcategoryShare } from '../../../utils/shareUtils';
import {
  subcategoryApi,
  mapApiSubcategoryToSubcategoryItem,
  ApiSubcategory,
  categoryApi,
} from '../../../api';

export interface SubcategoryFormValues {
  category: string;
  subcategory: string;
  status: 'Active' | 'Inactive';
}

interface SubcategoryItem {
  id: string;
  sNo: number;
  category: string;
  subcategory: string;
  status: 'Active' | 'Inactive';
  categoryId?: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
  productCount?: number;
}

const DEFAULT_CATEGORY_OPTIONS = [
  { label: 'Electronics & Hardware', value: 'Electronics & Hardware' },
  { label: 'Apparel & Fashion', value: 'Apparel & Fashion' },
  { label: 'Home & Office Supplies', value: 'Home & Office Supplies' },
  { label: 'Industrial Equipment', value: 'Industrial Equipment' },
];

export const SubcategoryView: React.FC = () => {
  // Subcategories collection - initialized empty (zero mock data)
  const [subcategories, setSubcategories] = useState<SubcategoryItem[]>([]);

  // Loading & API State
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState<boolean | null>(null);
  const [totalApiRecords, setTotalApiRecords] = useState<number | null>(null);
  const [totalApiPages, setTotalApiPages] = useState<number | null>(null);

  // Dynamic Category Options from live category master
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: string }[]>(DEFAULT_CATEGORY_OPTIONS);

  // Request Deduplication Refs
  const isFetchingRef = useRef(false);
  const lastFetchKeyRef = useRef<string | null>(null);

  // Search & Filter State
  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pendingStatus, setPendingStatus] = useState('ALL');
  const [appliedStatus, setAppliedStatus] = useState('ALL');
  const [pendingCategory, setPendingCategory] = useState('ALL');
  const [appliedCategory, setAppliedCategory] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 3-Dots Action Dropdown State & Share Popover
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [activeShareId, setActiveShareId] = useState<string | null>(null);
  const [sharePos, setSharePos] = useState<{ top?: number; bottom?: number; right?: number } | null>(null);

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<SubcategoryItem | null>(null);

  // React Hook Form instance for Subcategory Add/Edit Modal
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SubcategoryFormValues>({
    mode: 'onChange',
    defaultValues: {
      category: '',
      subcategory: '',
      status: 'Active',
    },
  });

  const watchCategory = watch('category');
  const watchStatus = watch('status');

  // Keystroke sanitizer: disallow typing numeric characters in text-only fields
  const handleTextOnlyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
    }
  };

  // Detail Modal State (GET /commerce/subcategories/:id)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedSubcategoryDetail, setSelectedSubcategoryDetail] = useState<ApiSubcategory | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Delete Confirmation Modal State
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<SubcategoryItem | null>(null);

  // Close dropdown on outside click or scroll
  useEffect(() => {
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

  /**
   * Fetch live categories to populate dropdowns in Add/Edit modal and filter
   */
  useEffect(() => {
    let isMounted = true;
    const fetchCategories = async () => {
      try {
        const res = await categoryApi.getCategories({
          pagination_required: false,
          sortOrder: 'asc',
        });
        if (isMounted && res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          const opts = res.data
            .map((c) => ({
              label: c.categoryName || c.name || '',
              value: c.categoryName || c.name || '',
            }))
            .filter((o) => o.label.trim() !== '');

          if (opts.length > 0) {
            setCategoryOptions(opts);
          }
        }
      } catch (err) {
        // Fallback to defaults already set
      }
    };
    fetchCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Master API Loader with strict deduplication guards to ensure zero redundant calls
   * Query parameters are only requested when applied
   */
  const loadSubcategories = useCallback(
    async (forceRefresh = false) => {
      const fetchKey = `${page}_${pageSize}_${appliedSearch.trim()}_${appliedStatus}_${appliedCategory}`;

      // Prevent concurrent calls or redundant re-fetching of identical parameters
      if (isFetchingRef.current) return;
      if (!forceRefresh && lastFetchKeyRef.current === fetchKey) return;

      isFetchingRef.current = true;
      lastFetchKeyRef.current = fetchKey;
      setIsLoading(true);

      try {
        const res = await subcategoryApi.getSubcategories({
          page_no: page,
          page_size: pageSize,
          pagination_required: true,
          search: appliedSearch.trim() || undefined,
          sortOrder: 'desc',
          status: appliedStatus !== 'ALL' ? appliedStatus : undefined,
          category: appliedCategory !== 'ALL' ? appliedCategory : undefined,
        });

        if (res && res.success && Array.isArray(res.data)) {
          const mapped = res.data.map((item, idx) =>
            mapApiSubcategoryToSubcategoryItem(item, (page - 1) * pageSize + idx)
          );
          setSubcategories(mapped);
          setIsApiConnected(true);
          if (res.pagination) {
            setTotalApiRecords(res.pagination.totalRecords);
            setTotalApiPages(res.pagination.totalPages);
          }
        } else {
          setIsApiConnected(false);
        }
      } catch (err: any) {
        console.warn('Commerce Subcategory API call failed, falling back to local state:', err?.message || err);
        setIsApiConnected(false);
      } finally {
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    },
    [page, pageSize, appliedSearch, appliedStatus, appliedCategory]
  );

  useEffect(() => {
    loadSubcategories();
  }, [loadSubcategories]);

  // Filter subcategories in local fallback mode
  const filteredSubcategories = useMemo(() => {
    return subcategories.filter((item) => {
      const q = appliedSearch.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        item.subcategory.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);

      const matchesStatus =
        appliedStatus === 'ALL' || item.status === appliedStatus;

      const matchesCategory =
        appliedCategory === 'ALL' || item.category === appliedCategory;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [subcategories, appliedSearch, appliedStatus, appliedCategory]);

  // Total count calculation
  const totalCount =
    isApiConnected && totalApiRecords !== null
      ? totalApiRecords
      : filteredSubcategories.length;

  const totalPages =
    isApiConnected && totalApiPages !== null
      ? totalApiPages
      : Math.max(1, Math.ceil(totalCount / pageSize));

  const safePage = Math.min(page, totalPages);

  // When API is connected, server handles pagination; otherwise slice in memory
  const pagedSubcategories = useMemo(() => {
    if (isApiConnected) {
      return subcategories;
    }
    return filteredSubcategories.slice((safePage - 1) * pageSize, safePage * pageSize);
  }, [isApiConnected, subcategories, filteredSubcategories, safePage, pageSize]);

  // Category filter options for SearchBar dropdown
  const categoryFilterOptions = useMemo(() => {
    return [
      { label: 'Category : All', value: 'ALL' },
      ...categoryOptions.map((opt) => ({
        label: opt.label,
        value: opt.value,
      })),
    ];
  }, [categoryOptions]);

  // Open Create Modal
  const handleOpenAddModal = () => {
    setEditingSubcategory(null);
    reset({
      category: categoryOptions[0]?.value || '',
      subcategory: '',
      status: 'Active',
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (subcat: SubcategoryItem) => {
    setEditingSubcategory(subcat);
    reset({
      category: subcat.category,
      subcategory: subcat.subcategory,
      status: subcat.status,
    });
    setIsModalOpen(true);
  };

  // Open Details Modal (GET /commerce/subcategories/:id)
  const handleOpenDetailModal = async (subcat: SubcategoryItem) => {
    setActiveDropdownId(null);
    setDropdownPos(null);
    setIsDetailModalOpen(true);
    setIsLoadingDetail(true);
    setSelectedSubcategoryDetail(null);

    try {
      const res = await subcategoryApi.getSubcategoryById(subcat.id);
      if (res?.success && res.data) {
        setSelectedSubcategoryDetail(res.data);
        return;
      }
    } catch (apiErr: any) {
      console.warn('Subcategory detail API failed, falling back to basic view:', apiErr);
    } finally {
      setIsLoadingDetail(false);
    }

    // Local fallback for details
    setSelectedSubcategoryDetail({
      id: subcat.id,
      organizationId: '',
      sNo: subcat.sNo,
      categoryId: subcat.categoryId,
      category: subcat.category,
      categoryName: subcat.category,
      subcategory: subcat.subcategory,
      name: subcat.subcategory,
      description: subcat.description || null,
      status: subcat.status,
      createdAt: subcat.createdAt || new Date().toISOString(),
      updatedAt: subcat.updatedAt || new Date().toISOString(),
      productCount: subcat.productCount ?? 0,
    });
  };

  // Save / Update Subcategory (Calls POST or PUT only once user submits)
  const handleSaveSubcategory = async (data: SubcategoryFormValues) => {
    if (!data.subcategory.trim() || !data.category.trim()) {
      toast.error('Both Category and Subcategory Name are required.');
      return;
    }

    const finalStatus = (data.status || 'Active') as 'Active' | 'Inactive';
    setIsSubmitting(true);

    try {
      if (editingSubcategory) {
        // PUT /commerce/subcategories/:id
        try {
          const res = await subcategoryApi.updateSubcategory(editingSubcategory.id, {
            category: data.category.trim(),
            subcategory: data.subcategory.trim(),
            status: finalStatus,
          });

          if (res?.success && res.data) {
            const updated = mapApiSubcategoryToSubcategoryItem(res.data);
            setSubcategories((prev) =>
              prev.map((s) => (s.id === editingSubcategory.id ? { ...s, ...updated } : s))
            );
            toast.success(`Subcategory "${updated.subcategory}" updated successfully.`);
            setIsModalOpen(false);
            return;
          }
        } catch (apiErr: any) {
          console.warn('Remote subcategory update failed, falling back to local store:', apiErr);
        }

        // Local fallback
        setSubcategories((prev) =>
          prev.map((s) =>
            s.id === editingSubcategory.id
              ? {
                  ...s,
                  category: data.category.trim(),
                  subcategory: data.subcategory.trim(),
                  status: finalStatus,
                }
              : s
          )
        );
        toast.success(`Subcategory "${data.subcategory}" updated.`);
      } else {
        // POST /commerce/subcategories
        try {
          const res = await subcategoryApi.createSubcategory({
            category: data.category.trim(),
            subcategory: data.subcategory.trim(),
            status: finalStatus,
          });

          if (res?.success && res.data) {
            const created = mapApiSubcategoryToSubcategoryItem(res.data);
            setSubcategories((prev) => [created, ...prev]);
            setTotalApiRecords((prev) => (prev !== null ? prev + 1 : prev));
            toast.success(`Subcategory "${created.subcategory}" created successfully.`);
            setIsModalOpen(false);
            return;
          }
        } catch (apiErr: any) {
          console.warn('Remote subcategory create failed, falling back to local store:', apiErr);
        }

        // Local fallback
        const newSubcat: SubcategoryItem = {
          id: `subcat-${Date.now()}`,
          sNo: (totalApiRecords || subcategories.length) + 1,
          category: data.category.trim(),
          subcategory: data.subcategory.trim(),
          status: finalStatus,
        };
        setSubcategories((prev) => [newSubcat, ...prev]);
        toast.success(`Subcategory "${data.subcategory}" added.`);
      }
    } finally {
      setIsSubmitting(false);
      setIsModalOpen(false);
    }
  };

  // Toggle Subcategory Status (PATCH /commerce/subcategories/:id)
  const handleToggleStatus = async (item: SubcategoryItem) => {
    const nextStatus = item.status === 'Active' ? 'Inactive' : 'Active';
    setActiveDropdownId(null);
    setDropdownPos(null);

    try {
      const res = await subcategoryApi.patchSubcategory(item.id, { status: nextStatus });
      if (res?.success) {
        setSubcategories((prev) =>
          prev.map((s) => (s.id === item.id ? { ...s, status: nextStatus } : s))
        );
        toast.success(`Subcategory "${item.subcategory}" set to ${nextStatus}.`);
        return;
      }
    } catch (apiErr: any) {
      console.warn('Remote subcategory status patch failed, updating locally:', apiErr);
    }

    setSubcategories((prev) =>
      prev.map((s) => (s.id === item.id ? { ...s, status: nextStatus } : s))
    );
    toast.success(`Subcategory "${item.subcategory}" set to ${nextStatus}.`);
  };

  // Confirm and Execute Delete (DELETE /commerce/subcategories/:id)
  const handleConfirmDelete = async () => {
    if (!deleteConfirmItem) return;
    const { id, subcategory } = deleteConfirmItem;
    setIsDeleting(true);

    try {
      const res = await subcategoryApi.deleteSubcategory(id);
      if (res?.success) {
        setSubcategories((prev) => prev.filter((s) => s.id !== id));
        setTotalApiRecords((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
        toast.success(`Subcategory "${subcategory}" deleted successfully.`);
        setDeleteConfirmItem(null);
        return;
      }
    } catch (apiErr: any) {
      console.warn('Remote subcategory delete failed, falling back to local:', apiErr);
    } finally {
      setIsDeleting(false);
    }

    setSubcategories((prev) => prev.filter((s) => s.id !== id));
    toast.success(`Subcategory "${subcategory}" deleted.`);
    setDeleteConfirmItem(null);
  };

  // Export to Excel
  const handleExport = () => {
    const dataToExport = isApiConnected ? subcategories : filteredSubcategories;
    if (dataToExport.length === 0) {
      toast.error('No subcategories available to export.');
      return;
    }

    const excelRows = dataToExport.map((s, idx) => ({
      sNo: idx + 1,
      category: s.category,
      subcategory: s.subcategory,
      status: s.status,
    }));

    exportTableToExcel({
      filename: `Subcategories_Report_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Subcategories',
      title: 'YAA CREATIONS CRM - PRODUCT SUBCATEGORIES DIRECTORY',
      subtitle: `Total Subcategories: ${dataToExport.length} | Generated: ${new Date().toLocaleDateString('en-IN')}`,
      columns: [
        { header: '#', key: 'sNo', align: 'center', width: 8 },
        { header: 'Category Name', key: 'category', align: 'left', width: 30 },
        { header: 'Subcategory Name', key: 'subcategory', align: 'left', width: 32 },
        { header: 'Status', key: 'status', align: 'center', width: 16 },
      ],
      data: excelRows,
      summaryRow: {
        sNo: 'TOTAL',
        category: `${dataToExport.length} Subcategories`,
      },
    });

    toast.success(`Subcategories Excel report downloaded (${dataToExport.length} records)!`);
  };

  return (
    <div className="space-y-5">
      {/* 1. Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
              <Layers className="w-4.5 h-4.5" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Subcategory List
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-[#33077C] border border-purple-200">
                {totalCount} total
              </span>
              {isApiConnected === true && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live API
                </span>
              )}
              {isApiConnected === false && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200"
                  title="Local storage mode"
                >
                  <Database className="w-3 h-3 text-amber-500" />
                  Local Mode
                </span>
              )}
            </div>
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
          setAppliedCategory(pendingCategory);
          setPage(1);
        }}
        onReset={() => {
          setPendingSearch('');
          setAppliedSearch('');
          setPendingStatus('ALL');
          setAppliedStatus('ALL');
          setPendingCategory('ALL');
          setAppliedCategory('ALL');
          setPage(1);
        }}
        filterSlot={
          <div className="flex items-center gap-2.5 flex-wrap">
            <FilterDropdown
              options={categoryFilterOptions}
              value={pendingCategory}
              onChange={(val) => setPendingCategory(val)}
              placeholder="Category : All"
            />
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
              <span className="text-[#33077C] font-bold">{totalCount}</span>
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
                <th className="py-3.5 px-2 sm:px-3 border border-[#33077C]/30 bg-[#33077C] text-white text-center w-20 sm:w-28">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs sm:text-[13px] text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-7 h-7 text-[#33077C] animate-spin" />
                      <span className="text-xs text-slate-500 font-semibold">Loading subcategories...</span>
                    </div>
                  </td>
                </tr>
              ) : pagedSubcategories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Layers className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                      <span className="text-sm font-semibold text-slate-600">No subcategories found</span>
                      <p className="text-xs text-slate-400">
                        {appliedSearch || appliedStatus !== 'ALL' || appliedCategory !== 'ALL'
                          ? 'Try resetting the search or filter query.'
                          : 'Get started by clicking "+ Add Subcategory" above.'}
                      </p>
                    </div>
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
                        <div className="flex items-center gap-2">
                          <FolderTree className="w-3.5 h-3.5 text-[#33077C]/60 shrink-0" />
                          <span>{item.category}</span>
                        </div>
                      </td>

                      {/* 3. SUBCATEGORY */}
                      <td className="py-3 sm:py-4 px-3 sm:px-4 font-medium text-slate-700 border-r border-slate-200 break-words">
                        <span className="font-semibold text-slate-800">{item.subcategory}</span>
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
                      <td className="py-4 px-3 sm:px-4 border border-slate-200 text-center whitespace-nowrap">
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
                          <UniversalShareDropdown
                            id={item.id}
                            activeShareId={activeShareId}
                            setActiveShareId={setActiveShareId}
                            sharePos={sharePos}
                            setSharePos={setSharePos}
                            getShareData={() => formatSubcategoryShare(item)}
                            title="Share Subcategory"
                          />

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
                                  const dropdownHeight = 180;
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
                                {/* 1. View Details */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenDetailModal(item)}
                                  className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-purple-50/50 hover:text-[#33077C] transition-colors cursor-pointer flex items-center gap-2"
                                >
                                  <Eye className="w-4 h-4 text-slate-400" />
                                  <span>View Details</span>
                                </button>

                                {/* 2. Edit */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleOpenEditModal(item);
                                    setActiveDropdownId(null);
                                    setDropdownPos(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-purple-50/50 hover:text-[#33077C] transition-colors cursor-pointer flex items-center gap-2"
                                >
                                  <Pencil className="w-4 h-4 text-slate-400" />
                                  <span>Edit</span>
                                </button>

                                {/* 3. Inactive / Active */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(item)}
                                  className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-purple-50/50 hover:text-[#33077C] transition-colors cursor-pointer flex items-center gap-2"
                                >
                                  {item.status === 'Active' ? (
                                    <>
                                      <Ban className="w-4 h-4 text-slate-400" />
                                      <span>Deactivate</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                      <span>Activate</span>
                                    </>
                                  )}
                                </button>

                                <div className="my-1 border-t border-slate-100" />

                                {/* 4. Delete */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setDropdownPos(null);
                                    setDeleteConfirmItem(item);
                                  }}
                                  className="w-full px-4 py-2 text-left text-[13px] font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4 text-rose-500" />
                                  <span>Delete</span>
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
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 font-medium">
              <div className="flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-7 h-7 text-[#33077C] animate-spin" />
                <span className="text-xs text-slate-500 font-semibold">Loading subcategories...</span>
              </div>
            </div>
          ) : pagedSubcategories.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-medium text-xs">
              <div className="flex flex-col items-center justify-center gap-1.5 p-4">
                <Layers className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                <span className="text-sm font-semibold text-slate-600">No subcategories found</span>
                <p className="text-xs text-slate-400">
                  {appliedSearch || appliedStatus !== 'ALL' || appliedCategory !== 'ALL'
                    ? 'Try resetting the search or filter query.'
                    : 'Get started by clicking "+ Add Subcategory" above.'}
                </p>
              </div>
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

                  {/* Mobile Actions Row */}
                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleOpenDetailModal(item)}
                      className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-[#33077C] text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>

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
                      onClick={() => handleToggleStatus(item)}
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
                      onClick={() => setDeleteConfirmItem(item)}
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
        total={totalCount}
        currentPage={safePage}
        pageSize={pageSize}
        pageSizeOptions={[5, 10, 20, 50]}
        onPageChange={(newPage) => {
          setPage(newPage);
        }}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
        }}
      />

      {/* 5. Add / Edit Subcategory Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => !isSubmitting && setIsModalOpen(false)}
          title={editingSubcategory ? 'Edit Subcategory' : 'Add Subcategory'}
          subtitle="Configure subcategory details, category linkage, and status"
          maxWidth="4xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
        >
          <form noValidate onSubmit={handleSubmit(handleSaveSubcategory)} className="space-y-4.5 p-2 sm:p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[140px]">
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Category <span className="text-rose-500">*</span>
                </label>
                <CustomSelect
                  options={categoryOptions}
                  value={watchCategory}
                  onChange={(val) => setValue('category', val, { shouldValidate: true })}
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
                  disabled={isSubmitting}
                  placeholder="e.g. Mobile Phones, Flours, Cables"
                  {...register('subcategory', {
                    required: 'Subcategory name is required',
                    minLength: { value: 2, message: 'Subcategory name must be at least 2 characters' },
                    validate: (val) =>
                      /^[A-Za-z\s&'-]+$/.test(val.trim()) || 'Only text characters (letters and spaces) are allowed',
                  })}
                  onKeyDown={handleTextOnlyKeyDown}
                  onInput={(e) => {
                    e.currentTarget.value = e.currentTarget.value.replace(/[^A-Za-z\s&'-]/g, '');
                  }}
                  className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                    errors.subcategory
                      ? 'border border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 bg-rose-50/20'
                      : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                  }`}
                />
                {errors.subcategory && (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.subcategory.message}</span>
                  </p>
                )}
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
                  value={watchStatus}
                  onChange={(val) => setValue('status', val as 'Active' | 'Inactive', { shouldValidate: true })}
                  placeholder="Select status"
                  activeColor="brand"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end items-center gap-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsModalOpen(false)}
                className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center gap-2 disabled:opacity-50"
              >
                <X className="w-4 h-4 text-slate-500" />
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>{editingSubcategory ? 'Update' : 'Save'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 6. Subcategory Details Modal (GET /commerce/subcategories/:id) */}
      {isDetailModalOpen && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title="Subcategory Details"
          subtitle="Detailed information from Commerce Subcategory Registry"
          maxWidth="lg"
          headerGradient={true}
          showBackIcon={false}
          hideCloseButton={false}
        >
          <div className="p-4 sm:p-5 space-y-4 font-sans">
            {isLoadingDetail ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-8 h-8 text-[#4309A2] animate-spin" />
                <span className="text-xs font-semibold text-slate-500">
                  Fetching subcategory details...
                </span>
              </div>
            ) : selectedSubcategoryDetail ? (
              <>
                {/* Header Information Card */}
                <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100 flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#4309A2] block mb-0.5">
                      {selectedSubcategoryDetail.category || selectedSubcategoryDetail.categoryName || 'Subcategory'}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                      {selectedSubcategoryDetail.subcategory || selectedSubcategoryDetail.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {selectedSubcategoryDetail.description || 'No description provided.'}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                      selectedSubcategoryDetail.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        selectedSubcategoryDetail.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                    {selectedSubcategoryDetail.status}
                  </span>
                </div>

                {/* Key Statistics / Attributes Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 text-xs">
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Category</span>
                    <span className="font-bold text-slate-800 text-xs">
                      {selectedSubcategoryDetail.category || selectedSubcategoryDetail.categoryName || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Linked Products</span>
                    <span className="font-bold text-slate-800 text-xs">
                      {selectedSubcategoryDetail.productCount ?? 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Record ID</span>
                    <span className="font-mono text-[11px] text-slate-700 font-semibold truncate block" title={selectedSubcategoryDetail.id}>
                      {selectedSubcategoryDetail.id.slice(0, 8)}...
                    </span>
                  </div>
                </div>

                {/* Timestamps */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span>
                    Created: {selectedSubcategoryDetail.createdAt ? new Date(selectedSubcategoryDetail.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                  <span>
                    Updated: {selectedSubcategoryDetail.updatedAt ? new Date(selectedSubcategoryDetail.updatedAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </>
            ) : null}

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="h-9 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 7. Delete Confirmation Modal */}
      {deleteConfirmItem && (
        <Modal
          isOpen={!!deleteConfirmItem}
          onClose={() => !isDeleting && setDeleteConfirmItem(null)}
          title="Delete Subcategory"
          subtitle="Confirm subcategory removal or deactivation"
          maxWidth="md"
          headerGradient={false}
          showBackIcon={false}
          hideCloseButton={true}
        >
          <div className="p-4 sm:p-5 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
                <p className="font-semibold text-slate-800 text-sm mb-1">
                  Are you sure you want to delete this subcategory?
                </p>
                <p>
                  Subcategory: <strong className="text-slate-900">{deleteConfirmItem.subcategory}</strong>
                </p>
                <p className="text-[11px] text-slate-400 mt-2">
                  Unused subcategories are permanently removed. If this subcategory is linked to active inventory products, it will be safely deactivated instead.
                </p>
              </div>
            </div>

            <div className="pt-3 flex justify-end items-center gap-2.5 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmItem(null)}
                className="h-9 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
