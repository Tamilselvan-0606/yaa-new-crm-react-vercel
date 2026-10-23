import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Tag,
  Plus,
  Pencil,
  Trash2,
  Eye,
  CheckCircle2,
  MoreVertical,
  X,
  Check,
  Ban,
  FileSpreadsheet,
  Loader2,
  Layers,
  Sparkles,
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
import { SaleActionDropdown } from '../utils/SaleActionDropdown';
import { DeleteConfirmationModal } from '../../../components/common/DeleteConfirmationModal';
import {
  categoryApi,
  mapApiCategoryToCategoryItem,
  CategoryItemModel,
  ApiCategory,
} from '../../../api/commerce/categoryApi';
import { FormLabel, FORM_INPUT_CLS, FORM_INPUT_ERROR_CLS } from '../utils/formUtils';

export type CategoryItem = CategoryItemModel;

export interface CategoryFormValues {
  categoryName: string;
  status: 'Active' | 'Inactive';
}

export const CategoryView: React.FC = () => {
  // Categories State (loaded dynamically from Commerce API)
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  // Loading & API State
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState<boolean | null>(null);
  const [totalApiRecords, setTotalApiRecords] = useState<number | null>(null);
  const [totalApiPages, setTotalApiPages] = useState<number | null>(null);

  // Request Deduplication Refs
  const isFetchingRef = useRef(false);
  const lastFetchKeyRef = useRef<string | null>(null);

  // Search & Filter State
  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pendingStatus, setPendingStatus] = useState('ALL');
  const [appliedStatus, setAppliedStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 3-Dots Action Dropdown State
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);

  // Delete Confirmation Modal State
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<CategoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // React Hook Form instance for Category Add/Edit Modal
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    mode: 'onChange',
    defaultValues: {
      categoryName: '',
      status: 'Active',
    },
  });

  const watchStatus = watch('status');

  // Keystroke sanitizer: disallow typing numeric characters in text-only fields
  const handleTextOnlyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
    }
  };

  // Detail Modal State (GET /commerce/categories/:id)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCategoryDetail, setSelectedCategoryDetail] = useState<ApiCategory | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Close dropdown on outside click or scroll
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.category-action-dropdown-container') && !target.closest('.category-action-dropdown-menu')) {
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
    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [activeDropdownId]);

  /**
   * Master API Loader with strict deduplication guards to ensure zero redundant calls
   * Query parameters are only requested when applied
   */
  const loadCategories = useCallback(
    async (
      forceRefresh = false,
      overrides?: { search?: string; status?: string; page?: number }
    ) => {
      const targetPage = overrides?.page ?? page;
      const targetSearch = overrides?.search !== undefined ? overrides.search : appliedSearch;
      const targetStatus = overrides?.status !== undefined ? overrides.status : appliedStatus;
      const fetchKey = `${targetPage}_${pageSize}_${targetSearch.trim()}_${targetStatus}`;

      // Prevent concurrent calls or redundant re-fetching of identical parameters
      if (isFetchingRef.current) return;
      if (!forceRefresh && lastFetchKeyRef.current === fetchKey) return;

      isFetchingRef.current = true;
      lastFetchKeyRef.current = fetchKey;
      setIsLoading(true);

      try {
        const res = await categoryApi.getCategories({
          page_no: targetPage,
          page_size: pageSize,
          pagination_required: true,
          search: targetSearch.trim() || undefined,
          sortOrder: 'desc',
          status: targetStatus !== 'ALL' ? targetStatus : undefined,
        });

        if (res && res.success && Array.isArray(res.data)) {
          const mapped = res.data.map((item, idx) =>
            mapApiCategoryToCategoryItem(item, (targetPage - 1) * pageSize + idx)
          );
          setCategories(mapped);
          setIsApiConnected(true);
          if (res.pagination) {
            setTotalApiRecords(res.pagination.totalRecords);
            setTotalApiPages(res.pagination.totalPages);
          }
        } else {
          setIsApiConnected(false);
        }
      } catch (err: any) {
        console.warn('Commerce Category API call failed, falling back to local state:', err?.message || err);
        setIsApiConnected(false);
      } finally {
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    },
    [page, pageSize, appliedSearch, appliedStatus]
  );

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Debounced Search (600ms) - waits until typing completes before triggering API
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = pendingSearch.trim();
      if (trimmed !== appliedSearch) {
        setAppliedSearch(trimmed);
        setPage(1);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [pendingSearch, appliedSearch]);

  // Filter categories in local fallback mode
  const filteredCategories = useMemo(() => {
    return categories.filter((item) => {
      const q = appliedSearch.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        item.categoryName.toLowerCase().includes(q) ||
        (item.code && item.code.toLowerCase().includes(q));

      const matchesStatus =
        appliedStatus === 'ALL' || item.status === appliedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [categories, appliedSearch, appliedStatus]);

  // Total count calculation
  const totalCount =
    isApiConnected && totalApiRecords !== null
      ? totalApiRecords
      : filteredCategories.length;

  const totalPages =
    isApiConnected && totalApiPages !== null
      ? totalApiPages
      : Math.max(1, Math.ceil(totalCount / pageSize));

  const safePage = Math.min(page, totalPages);

  // When API is connected, server handles pagination; otherwise slice in memory
  const pagedCategories = useMemo(() => {
    if (isApiConnected) {
      return categories;
    }
    return filteredCategories.slice((safePage - 1) * pageSize, safePage * pageSize);
  }, [isApiConnected, categories, filteredCategories, safePage, pageSize]);

  // Open Create Modal
  const handleOpenAddModal = () => {
    setEditingCategory(null);
    reset({
      categoryName: '',
      status: 'Active',
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (cat: CategoryItem) => {
    setEditingCategory(cat);
    reset({
      categoryName: cat.categoryName,
      status: cat.status,
    });
    setIsModalOpen(true);
  };

  // Open Details Modal (Calls GET /commerce/categories/:id)
  const handleOpenDetailModal = async (cat: CategoryItem) => {
    setActiveDropdownId(null);
    setDropdownPos(null);
    setIsDetailModalOpen(true);
    setIsLoadingDetail(true);
    setSelectedCategoryDetail(null);

    try {
      const res = await categoryApi.getCategoryById(cat.id);
      if (res?.success && res.data) {
        setSelectedCategoryDetail(res.data);
        return;
      }
    } catch (apiErr: any) {
      console.warn('Category detail API failed, falling back to basic view:', apiErr);
    } finally {
      setIsLoadingDetail(false);
    }

    // Local fallback for details
    setSelectedCategoryDetail({
      id: cat.id,
      organizationId: '',
      code: cat.code || `CAT-${cat.sNo.toString().padStart(4, '0')}`,
      categoryName: cat.categoryName,
      name: cat.categoryName,
      description: cat.description || null,
      status: cat.status,
      createdAt: cat.createdAt || new Date().toISOString(),
      updatedAt: cat.updatedAt || new Date().toISOString(),
      subcategories: [],
      productCount: 0,
    });
  };

  // Save / Update Category (Calls POST or PUT only once button is clicked)
  const handleSaveCategory = async (data: CategoryFormValues) => {
    if (!data.categoryName.trim()) {
      toast.error('Category name is required.');
      return;
    }

    const finalStatus = (data.status || 'Active') as 'Active' | 'Inactive';
    setIsSubmitting(true);

    try {
      if (editingCategory) {
        // PUT /commerce/categories/:id
        try {
          const res = await categoryApi.updateCategory(editingCategory.id, {
            categoryName: data.categoryName.trim(),
            status: finalStatus,
          });

          if (res?.success && res.data) {
            const updated = mapApiCategoryToCategoryItem(res.data);
            setCategories((prev) =>
              prev.map((c) => (c.id === editingCategory.id ? { ...c, ...updated } : c))
            );
            toast.success(`Category "${updated.categoryName}" updated successfully.`);
            setIsModalOpen(false);
            return;
          }
        } catch (apiErr: any) {
          console.error('Remote category update failed:', apiErr);
          const errMsg = apiErr?.response?.data?.error?.message || apiErr?.response?.data?.message || apiErr?.message || 'Failed to update category.';
          toast.error(errMsg);
          return;
        }
      } else {
        // POST /commerce/categories
        try {
          const res = await categoryApi.createCategory({
            categoryName: data.categoryName.trim(),
            status: finalStatus,
          });

          if (res?.success && res.data) {
            const created = mapApiCategoryToCategoryItem(res.data);
            setCategories((prev) => [created, ...prev]);
            setTotalApiRecords((prev) => (prev !== null ? prev + 1 : prev));
            toast.success(`Category "${created.categoryName}" created successfully.`);
            setIsModalOpen(false);
            return;
          }
        } catch (apiErr: any) {
          console.error('Remote category create failed:', apiErr);
          const errMsg = apiErr?.response?.data?.error?.message || apiErr?.response?.data?.message || apiErr?.message || 'Failed to create category.';
          toast.error(errMsg);
          return;
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Category Status (PATCH /commerce/categories/:id)
  const handleToggleStatus = async (item: CategoryItem) => {
    const nextStatus = item.status === 'Active' ? 'Inactive' : 'Active';
    setActiveDropdownId(null);
    setDropdownPos(null);

    try {
      const res = await categoryApi.patchCategory(item.id, { status: nextStatus });
      if (res?.success) {
        setCategories((prev) =>
          prev.map((c) => (c.id === item.id ? { ...c, status: nextStatus } : c))
        );
        toast.success(`Category "${item.categoryName}" status set to ${nextStatus}.`);
        return;
      }
    } catch (apiErr: any) {
      console.warn('Remote status patch failed, updating locally:', apiErr);
    }

    setCategories((prev) =>
      prev.map((c) => (c.id === item.id ? { ...c, status: nextStatus } : c))
    );
    toast.success(`Category "${item.categoryName}" status set to ${nextStatus}.`);
  };

  // Open Delete Confirmation Modal
  const handleDeleteCategory = (item: CategoryItem) => {
    setActiveDropdownId(null);
    setDropdownPos(null);
    setDeleteError(null);
    setDeleteConfirmItem(item);
  };

  // Confirm and Execute Delete (DELETE /commerce/categories/:id)
  const handleConfirmDelete = async () => {
    if (!deleteConfirmItem) return;
    const { id, categoryName } = deleteConfirmItem;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await categoryApi.deleteCategory(id);
      if (res?.success) {
        toast.success(categoryName ? `Category "${categoryName}" deleted.` : 'Category deleted successfully.');
        // Reset fetch key so loadCategories always re-fetches fresh data
        lastFetchKeyRef.current = '';
        loadCategories(true);
        setDeleteConfirmItem(null);
        setDeleteError(null);
        return;
      } else {
        const errorMsg = (res as any)?.message || 'Failed to delete category.';
        setDeleteError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (apiErr: any) {
      console.warn('Remote category delete failed:', apiErr);
      const errorMsg = apiErr?.response?.data?.message || apiErr?.message || 'Failed to delete category. Please try again.';
      setDeleteError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Export to Excel
  const handleExport = () => {
    const dataToExport = isApiConnected ? categories : filteredCategories;
    if (dataToExport.length === 0) {
      toast.error('No categories available to export.');
      return;
    }

    const excelRows = dataToExport.map((c, idx) => ({
      sNo: idx + 1,
      code: c.code || `CAT-${(idx + 1).toString().padStart(4, '0')}`,
      categoryName: c.categoryName,
      status: c.status,
    }));

    exportTableToExcel({
      filename: `Categories_Report_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Categories',
      title: 'YAA CREATIONS CRM - PRODUCT CATEGORIES DIRECTORY',
      subtitle: `Total Categories: ${dataToExport.length} | Generated: ${new Date().toLocaleDateString('en-IN')}`,
      columns: [
        { header: '#', key: 'sNo', align: 'center', width: 8 },
        { header: 'Code', key: 'code', align: 'center', width: 16 },
        { header: 'Category Name', key: 'categoryName', align: 'left', width: 35 },
        { header: 'Status', key: 'status', align: 'center', width: 16 },
      ],
      data: excelRows,
      summaryRow: {
        sNo: 'TOTAL',
        categoryName: `${dataToExport.length} Categories`,
      },
    });

    toast.success(`Categories Excel report downloaded (${dataToExport.length} records)!`);
  };

  return (
    <div className="space-y-5">
      {/* 1. Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
              <Tag className="w-4.5 h-4.5" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Category List
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-[#33077C] border border-purple-200">
                {totalCount} total
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Manage product categories, classify inventory, and configure catalog groups.
          </p>
        </div>

        {/* Top Right Action Buttons: Excel Report & Add Category */}
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
            Add Category
          </Button>
        </div>
      </div>

      {/* 2. Search Bar & Dropdown Filter Row */}
      {/* Keystrokes are buffered in pendingSearch; API is invoked only once search/apply button is clicked */}
      <SearchBar
        value={pendingSearch}
        onChange={(val) => setPendingSearch(val)}
        placeholder="Search by category name, code..."
        onSubmit={() => {
          const newSearch = pendingSearch.trim();
          const newStatus = pendingStatus;
          lastFetchKeyRef.current = null;
          setAppliedSearch(newSearch);
          setAppliedStatus(newStatus);
          setPage(1);
          loadCategories(true, { search: newSearch, status: newStatus, page: 1 });
        }}
        onReset={() => {
          lastFetchKeyRef.current = null;
          setPendingSearch('');
          setAppliedSearch('');
          setPendingStatus('ALL');
          setAppliedStatus('ALL');
          setPage(1);
          loadCategories(true, { search: '', status: 'ALL', page: 1 });
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
            {isLoading && (
              <span className="flex items-center gap-1.5 text-xs text-[#33077C] font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Loading...</span>
              </span>
            )}
            <span className="text-xs font-semibold text-slate-500">
              Total Categories :{' '}
              <span className="text-[#33077C] font-bold">{totalCount}</span>
            </span>
          </div>
        }
      />

      {/* 3. Category Table / Mobile Card View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Desktop Table (sm: and above) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200">
            <thead>
              <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white tracking-wider uppercase">
                <th className="py-3.5 px-2 sm:px-3 border border-[#33077C]/30 bg-[#33077C] text-white w-12 sm:w-16 text-center">
                  S.NO
                </th>
                <th className="py-3.5 px-3 sm:px-5 border border-[#33077C]/30 bg-[#33077C] text-white">
                  CATEGORY NAME
                </th>
                <th className="py-3.5 px-2 sm:px-3 border border-[#33077C]/30 bg-[#33077C] text-white text-center w-24 sm:w-32">
                  STATUS
                </th>
                <th className="py-3.5 px-2 sm:px-3 border border-[#33077C]/30 bg-[#33077C] text-white text-center w-16 sm:w-20">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-slate-500 border border-slate-200">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[#33077C]" />
                      <span className="text-xs font-medium">Fetching categories from Commerce API...</span>
                    </div>
                  </td>
                </tr>
              ) : pagedCategories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    No categories found matching your criteria.
                  </td>
                </tr>
              ) : (
                pagedCategories.map((item, index) => {
                  const sNo = (safePage - 1) * pageSize + index + 1;
                  const isDropdownOpen = activeDropdownId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* S.NO */}
                      <td className="py-3.5 sm:py-4 px-2 sm:px-3 text-center font-bold text-slate-800 text-xs sm:text-sm border border-slate-200">
                        {sNo}
                      </td>

                      {/* CATEGORY NAME */}
                      <td className="py-3.5 sm:py-4 px-3 sm:px-5 border border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm tracking-tight break-words">
                            {item.categoryName}
                          </span>
                          {item.code && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                              {item.code}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* STATUS */}
                      <td className="py-3.5 sm:py-4 px-2 sm:px-3 border border-slate-200 text-center whitespace-nowrap">
                        {item.status === 'Active' ? (
                          <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-emerald-50/90 text-emerald-700 border border-emerald-300/80 text-[10.5px] sm:text-xs font-bold shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-[10.5px] sm:text-xs font-bold shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                            <span>Inactive</span>
                          </span>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="py-4 px-3 border border-slate-200 text-center whitespace-nowrap">
                        <SaleActionDropdown
                          items={[
                            {
                              label: 'View Details',
                              variant: 'view',
                              onClick: () => handleOpenDetailModal(item),
                            },
                            {
                              label: 'Edit',
                              variant: 'edit',
                              onClick: () => handleOpenEditModal(item),
                            },
                            {
                              label: item.status === 'Active' ? 'Deactivate' : 'Activate',
                              variant: item.status === 'Active' ? 'deactivate' : 'activate',
                              onClick: () => handleToggleStatus(item),
                            },
                            {
                              label: 'Delete',
                              variant: 'delete',
                              onClick: () => handleDeleteCategory(item),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Clean Card List (< sm screens) */}
        <div className="block sm:hidden divide-y divide-slate-100 font-sans">
          {isLoading ? (
            <div className="py-12 text-center text-slate-500 font-medium text-xs flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#33077C]" />
              <span>Loading categories...</span>
            </div>
          ) : pagedCategories.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-medium text-xs">
              No categories found.
            </div>
          ) : (
            pagedCategories.map((item, index) => {
              const sNo = (safePage - 1) * pageSize + index + 1;

              return (
                <div key={item.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-purple-50 text-[#33077C] font-bold text-xs flex items-center justify-center shrink-0 border border-purple-100">
                        {sNo}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-sm truncate">
                          {item.categoryName}
                        </div>
                        {item.code && (
                          <span className="font-mono text-[10px] text-slate-500">
                            {item.code}
                          </span>
                        )}
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
                      onClick={() => handleOpenDetailModal(item)}
                      className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-[#33077C] text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(item)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Edit Category"
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
                      onClick={() => handleDeleteCategory(item)}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Delete Category"
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
        onPageChange={(newPage) => setPage(newPage)}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
        }}
      />

      {/* 5. Add / Edit Category Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => !isSubmitting && setIsModalOpen(false)}
          title={editingCategory ? 'Edit Category' : 'Add Category'}
          subtitle="Configure category details, status, and classification"
          maxWidth="lg"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => !isSubmitting && setIsModalOpen(false)}
        >
          <form noValidate onSubmit={handleSubmit(handleSaveCategory)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="flex flex-col">
                <FormLabel required>Category Name</FormLabel>
                <input
                  type="text"
                  disabled={isSubmitting}
                  {...register('categoryName', {
                    required: 'Category name is required',
                    minLength: { value: 2, message: 'Category name must be at least 2 characters' },
                    validate: (val) =>
                      /^[A-Za-z\s&'-]+$/.test(val.trim()) || 'Only text characters (letters and spaces) are allowed',
                  })}
                  onKeyDown={handleTextOnlyKeyDown}
                  onInput={(e) => {
                    e.currentTarget.value = e.currentTarget.value.replace(/[^A-Za-z\s&'-]/g, '');
                  }}
                  placeholder="Enter category name"
                  className={errors.categoryName ? FORM_INPUT_ERROR_CLS : FORM_INPUT_CLS}
                />
                {errors.categoryName && (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.categoryName.message}</span>
                  </p>
                )}
              </div>

              <div className="flex flex-col">
                <FormLabel required>Status</FormLabel>
                <CustomSelect
                  options={[
                    { label: 'Active', value: 'Active' },
                    { label: 'Inactive', value: 'Inactive' },
                  ]}
                  value={watchStatus || 'Active'}
                  onChange={(val) => setValue('status', val as 'Active' | 'Inactive', { shouldValidate: true })}
                  placeholder="Select status"
                  activeColor="brand"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end items-center gap-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsModalOpen(false)}
                className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center gap-2 disabled:opacity-60"
              >
                <X className="w-4 h-4 text-slate-500" />
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Check className="w-4 h-4 stroke-[2.5]" />
                )}
                <span>{isSubmitting ? 'Saving...' : editingCategory ? 'Update' : 'Save'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 6. Category Detail Modal (GET /commerce/categories/:id) */}
      {isDetailModalOpen && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={selectedCategoryDetail ? selectedCategoryDetail.categoryName : 'Category Details'}
          subtitle={selectedCategoryDetail?.code ? `Category Code: ${selectedCategoryDetail.code}` : 'Category specification & linked subcategories'}
          maxWidth="2xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setIsDetailModalOpen(false)}
        >
          <div className="p-4 sm:p-5 space-y-5 text-xs animate-in fade-in duration-150">
            {isLoadingDetail ? (
              <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#4309A2]" />
                <span className="text-xs font-medium">Fetching details from Commerce service...</span>
              </div>
            ) : selectedCategoryDetail ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Code</span>
                    <span className="font-mono font-bold text-[#33077C] text-xs">
                      {selectedCategoryDetail.code || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Status</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                        selectedCategoryDetail.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          selectedCategoryDetail.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                      {selectedCategoryDetail.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Products</span>
                    <span className="font-bold text-slate-800 text-xs">
                      {selectedCategoryDetail.productCount ?? 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Subcategories</span>
                    <span className="font-bold text-slate-800 text-xs">
                      {selectedCategoryDetail.subcategories?.length ?? 0}
                    </span>
                  </div>
                </div>

                {/* Subcategories List */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#4309A2]" />
                      <span>Linked Subcategories</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      {selectedCategoryDetail.subcategories?.length || 0} items
                    </span>
                  </h4>
                  {(!selectedCategoryDetail.subcategories || selectedCategoryDetail.subcategories.length === 0) ? (
                    <div className="py-8 text-center text-slate-400 bg-slate-50/60 rounded-xl border border-dashed border-slate-200 font-medium">
                      No linked subcategories configured for this category.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {selectedCategoryDetail.subcategories.map((sub, idx) => (
                        <div
                          key={sub.id || idx}
                          className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs"
                        >
                          <span className="font-semibold text-slate-800">{sub.subcategory || sub.name}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              sub.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {sub.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span>
                    Created: {selectedCategoryDetail.createdAt ? new Date(selectedCategoryDetail.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                  <span>
                    Updated: {selectedCategoryDetail.updatedAt ? new Date(selectedCategoryDetail.updatedAt).toLocaleDateString() : 'N/A'}
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

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={Boolean(deleteConfirmItem)}
        onClose={() => {
          if (!isDeleting) {
            setDeleteConfirmItem(null);
            setDeleteError(null);
          }
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Category"
        entityName="Category"
        recordName={deleteConfirmItem?.categoryName}
        isLoading={isDeleting}
        error={deleteError}
      />
    </div>
  );
};
