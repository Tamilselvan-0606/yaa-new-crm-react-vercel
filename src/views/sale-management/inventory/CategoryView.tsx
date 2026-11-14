import { CommonTableHead } from '../../../components/common/CommonTableHead';
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
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from "../../../utils/toast";
import { fetchAllReportRows, runReport } from '../../../utils/reportData';
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
import { useSubmitGuard, extractApiFieldErrors, getApiErrorMessage, checkRequiredSelection } from '../../../utils/formValidation';

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
  const requestSeqRef = useRef(0); // latest request wins; a superseded response is ignored
  const lastFetchKeyRef = useRef<string | null>(null);

  // Search & Filter State
  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pendingStatus, setPendingStatus] = useState('ALL');
  const [appliedStatus, setAppliedStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

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
    setError,
    formState: { errors, isSubmitted },
  } = useForm<CategoryFormValues>({
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      categoryName: '',
      status: 'Active',
    },
  });

  const watchStatus = watch('status');

  // Clear any errors when the modal closes so the next opening starts clean
  useEffect(() => {
    if (!isModalOpen) reset({ categoryName: '', status: 'Active' });
  }, [isModalOpen, reset]);
  const saveGuard = useSubmitGuard();
  const toggleGuard = useSubmitGuard();
  const deleteGuard = useSubmitGuard();

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

      // Skip redundant re-fetching of identical parameters
      if (!forceRefresh && lastFetchKeyRef.current === fetchKey) return;

      const seq = ++requestSeqRef.current;
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
        if (seq !== requestSeqRef.current) return;

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
        if (seq === requestSeqRef.current) {
          setIsApiConnected(false);
          lastFetchKeyRef.current = null; // allow a retry of the same parameters
        }
      } finally {
        if (seq === requestSeqRef.current) setIsLoading(false);
      }
    },
    [page, pageSize, appliedSearch, appliedStatus]
  );

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

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
      code: cat.code || '',
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
  const handleSaveCategory = (data: CategoryFormValues) => saveGuard.runOnce(async () => {
    const nameTrimmed = (data.categoryName || '').trim();
    if (!nameTrimmed) {
      setError('categoryName', { type: 'manual', message: 'Please enter the category name.' });
      return;
    }
    if (editingCategory) {
      const idErr = checkRequiredSelection(editingCategory.id, 'category');
      if (idErr) {
        setError('root', { type: 'manual', message: 'This category could not be identified. Please close and reopen it.' });
        return;
      }
    }

    const finalStatus = data.status;
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
            toast.success(`Category "${res.data.categoryName || res.data.name || data.categoryName}" updated successfully.`);
            setIsModalOpen(false);
            lastFetchKeyRef.current = '';
            await loadCategories(true);
            return;
          }
        } catch (apiErr: any) {
          console.error('Remote category update failed:', apiErr);
          const fe = extractApiFieldErrors(apiErr);
          if (fe.categoryName || fe.name) {
            setError('categoryName', { type: 'server', message: (fe.categoryName || fe.name) });
          } else {
            toast.error(getApiErrorMessage(apiErr, 'Failed to update category.'));
          }
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
            toast.success(`Category "${res.data.categoryName || res.data.name || data.categoryName}" created successfully.`);
            setIsModalOpen(false);
            setPage(1);
            lastFetchKeyRef.current = '';
            await loadCategories(true, { page: 1 });
            return;
          }
        } catch (apiErr: any) {
          console.error('Remote category create failed:', apiErr);
          const fe = extractApiFieldErrors(apiErr);
          if (fe.categoryName || fe.name) {
            setError('categoryName', { type: 'server', message: (fe.categoryName || fe.name) });
          } else {
            toast.error(getApiErrorMessage(apiErr, 'Failed to create category.'));
          }
          return;
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  });

  // Toggle Category Status (PATCH /commerce/categories/:id)
  const handleToggleStatus = (item: CategoryItem) => toggleGuard.runOnce(async () => {
    const nextStatus = item.status === 'Active' ? 'Inactive' : 'Active';
    setActiveDropdownId(null);
    setDropdownPos(null);

    if (checkRequiredSelection(item?.id, 'category')) {
      toast.error('This category could not be identified. Please refresh and try again.');
      return;
    }

    try {
      const res = await categoryApi.patchCategory(item.id, { status: nextStatus });
      if (res?.success) {
        toast.success(`Category "${item.categoryName}" status set to ${nextStatus}.`);
        lastFetchKeyRef.current = '';
        await loadCategories(true);
        return;
      }
    } catch (apiErr: any) {
      console.warn('Remote status patch failed:', apiErr);
      toast.error(getApiErrorMessage(apiErr, 'Failed to update category status.'));
      return;
    }
  });

  // Open Delete Confirmation Modal
  const handleDeleteCategory = (item: CategoryItem) => {
    setActiveDropdownId(null);
    setDropdownPos(null);
    setDeleteError(null);
    setDeleteConfirmItem(item);
  };

  // Confirm and Execute Delete (DELETE /commerce/categories/:id)
  const handleConfirmDelete = () => deleteGuard.runOnce(async () => {
    if (!deleteConfirmItem) return;
    const { id, categoryName } = deleteConfirmItem;
    if (checkRequiredSelection(id, 'category')) {
      setDeleteError('This category could not be identified. Please refresh and try again.');
      return;
    }
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
      const errorMsg = getApiErrorMessage(apiErr, 'Failed to delete category. Please try again.');
      setDeleteError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsDeleting(false);
    }
  });

  // Export to Excel
  const fetchCategoryReportPage = async (reportPage: number, reportPageSize: number) => {
    const res = await categoryApi.getCategories({
      page_no: reportPage,
      page_size: reportPageSize,
      pagination_required: true,
      search: appliedSearch.trim() || undefined,
      sortOrder: 'desc',
      status: appliedStatus !== 'ALL' ? appliedStatus : undefined,
    });
    const items: CategoryItem[] =
      res?.success && Array.isArray(res.data)
        ? res.data.map((item, idx) =>
            mapApiCategoryToCategoryItem(item, (reportPage - 1) * reportPageSize + idx)
          )
        : [];
    return {
      items,
      totalRecords: res?.pagination?.totalRecords,
      totalPages: res?.pagination?.totalPages,
      hasNextPage: res?.pagination?.hasNextPage,
    };
  };

  const handleExport = () =>
    runReport({
      label: 'categories',
      load: () => fetchAllReportRows(fetchCategoryReportPage),
      onRows: (rows) => exportCategoriesExcel(rows),
    });

  const exportCategoriesExcel = (dataToExport: CategoryItem[]) => {
    const excelRows = dataToExport.map((c, idx) => ({
      sNo: idx + 1,
      code: c.code || '',
      categoryName: c.categoryName,
      status: c.status,
    }));

    exportTableToExcel({
      filename: `Categories_Report_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Categories',
      title: 'YAA CREATIONS CRM - PRODUCT CATEGORIES DIRECTORY',
      subtitle: `Total Categories: ${dataToExport.length} | Generated: ${new Date().toLocaleDateString('en-GB')}`,
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
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-[220px] flex-1">
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
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <Button
            variant="secondary"
            size="md"
            onClick={handleExport}
            className="flex-1 sm:flex-initial justify-center"
            icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
          >
            Excel Report
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenAddModal}
            className="flex-1 sm:flex-initial justify-center"
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
            <CommonTableHead
              columns={[
                { label: "CODE", align: "center", width: "120px" },
                { label: "CATEGORY NAME", align: "left", minWidth: "200px" },
                { label: "STATUS", align: "center", width: "120px" },
                { label: "ACTIONS", align: "center", width: "90px" },
              ]}
            />
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
                  const isDropdownOpen = activeDropdownId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* CODE */}
                      <td className="py-3.5 sm:py-4 px-2 sm:px-3 border border-slate-200 text-center whitespace-nowrap">
                        <span className="font-mono text-[11px] font-semibold text-slate-600">{item.code || "—"}</span>
                      </td>

                      {/* CATEGORY NAME */}
                      <td className="py-3.5 sm:py-4 px-3 sm:px-5 border border-slate-200">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm tracking-tight break-words">
                          {item.categoryName}
                        </span>
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
                    required: 'Please enter the category name.',
                    validate: (val) =>
                      val.trim().length >= 2 || 'The category name must be at least 2 characters.',
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
                  onChange={(val) => setValue('status', val as 'Active' | 'Inactive', { shouldValidate: isSubmitted })}
                  placeholder="Select status"
                  activeColor="brand"
                />
              </div>
            </div>

            {errors.root && (
              <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.root.message}</span>
              </p>
            )}

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
          subtitle={selectedCategoryDetail?.code ? `Category Code: ${selectedCategoryDetail.code}` : 'Category specification & details'}
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
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
                </div>

                {selectedCategoryDetail.description && (
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                    <span className="text-[11px] font-medium text-slate-400 block mb-1">Description</span>
                    <p className="text-xs text-slate-700 leading-relaxed">{selectedCategoryDetail.description}</p>
                  </div>
                )}

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
