import { useDebounce } from "use-debounce";
import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Search,
  UserCheck,
  Plus,
  Phone,
  Check,
  ChevronDown,
  X,
  Loader2,
} from "lucide-react";
import {
  ApiSalesRepresentative,
  salesRepresentativeApi,
} from "../../../api/commerce/salesRepresentativeApi";
import {
  useSalesManagementStore,
  SalesRepresentative,
} from "../../../store/useSalesManagementStore";
import { Modal } from "../../../components/common/Modal";
import { toast } from "../../../utils/toast";
import { baseApi } from "../../../api/baseApi";
import { store } from "../../../store/store";
import { normalizeIndianPhoneTo10Digits } from "../../../utils/validation";
import { SalesRepresentativeSchema, SalesRepFormData } from "../../../schemas";
import { FormLabel, FORM_INPUT_CLS, getFormInputCls } from "../utils/formUtils";
import { FormError } from "../../../components/common/FormError";
import { usePaginatedDropdown } from "../../../hooks/usePaginatedDropdown";

// Helper to generate secure password for newly created sales reps
const generatePassword = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$!";
  return Array.from(
    { length: 12 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
};

export interface SalesRepSearchableSelectProps {
  value: string;
  onChange: (repId: string, rep?: ApiSalesRepresentative | SalesRepresentative) => void;
  availableReps?: (ApiSalesRepresentative | SalesRepresentative)[];
  isLoading?: boolean;
  onRefreshReps?: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const SalesRepSearchableSelect: React.FC<SalesRepSearchableSelectProps> = ({
  value,
  onChange,
  availableReps = [],
  isLoading = false,
  onRefreshReps,
  disabled = false,
  placeholder = "Select Sales Representative",
  className = "",
}) => {
  const { saveSalesRepresentative } = useSalesManagementStore();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Quick Add Rep Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmittingRep, setIsSubmittingRep] = useState(false);

  // 10-Record server-side pagination fetcher
  const fetchPage = useCallback(
    async ({ page, limit, search }: { page: number; limit: number; search: string }) => {
      try {
        const res = await salesRepresentativeApi.getList({
          page,
          limit,
          search: search || undefined,
        });
        const data = res?.data || [];
        const hasNextPage = (res as any)?.pagination?.hasNextPage ?? (data.length >= limit);
        return {
          data,
          hasNextPage,
          totalRecords: (res as any)?.pagination?.totalRecords,
        };
      } catch (err) {
        console.warn("SalesRep fetch error:", err);
        const q = search.toLowerCase();
        const filtered = availableReps.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            (r.mobile && r.mobile.toLowerCase().includes(q))
        );
        const start = (page - 1) * limit;
        return {
          data: filtered.slice(start, start + limit),
          hasNextPage: start + limit < filtered.length,
          totalRecords: filtered.length,
        };
      }
    },
    [availableReps]
  );

  const {
    items: paginatedReps,
    isLoading: isFetchingReps,
    isLoadingMore,
    hasMore,
    handleSearch,
    loadMore,
    loadInitial,
    refresh,
  } = usePaginatedDropdown<ApiSalesRepresentative | SalesRepresentative>({
    fetchPage,
    limit: 10,
    getId: (r) => r.id,
  });

  // Debounced search query
  const [debouncedSearch] = useDebounce(searchQuery, 400);

  useEffect(() => {
    if (isOpen) {
      handleSearch(debouncedSearch);
    }
  }, [debouncedSearch, isOpen, handleSearch]);

  // Add Sales Rep React Hook Form matching SalesRepresentativeView
  const {
    register,
    handleSubmit,
    setValue: setFormValue,
    watch: watchForm,
    reset: resetForm,
    setError: setFormError,
    clearErrors: clearFormErrors,
    formState: { errors: formErrors },
  } = useForm<SalesRepFormData>({
    resolver: zodResolver(SalesRepresentativeSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      mobile: "",
      email: "",
      designation: "",
      status: "Active",
    },
  });

  const watchStatus = watchForm("status");

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      loadInitial();
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen, loadInitial]);

  // Currently selected rep (preserved even if outside current 10 records)
  const selectedRep = useMemo(() => {
    if (!value) return null;
    const inPaginated = paginatedReps.find((r) => r.id === value);
    if (inPaginated) return inPaginated;
    return availableReps.find((r) => r.id === value) || null;
  }, [value, paginatedReps, availableReps]);

  const handleSelectRep = (rep: ApiSalesRepresentative | SalesRepresentative | null) => {
    if (!rep) {
      onChange("", undefined);
    } else {
      onChange(rep.id, rep);
    }
    setIsOpen(false);
  };

  // Open Add Rep modal and pre-fill name or phone if typed in search
  const handleOpenAddModal = (searchVal = "") => {
    resetForm({
      name: "",
      mobile: "",
      email: "",
      designation: "",
      status: "Active",
    });
    clearFormErrors();

    const trimmed = searchVal.trim();
    if (trimmed) {
      if (/^\d+$/.test(trimmed)) {
        setFormValue("mobile", trimmed.slice(0, 10), { shouldValidate: true });
      } else {
        setFormValue("name", trimmed, { shouldValidate: true });
      }
    }

    setIsOpen(false);
    setIsAddModalOpen(true);
  };

  // Submit quick-created Sales Rep
  const onSubmitRep = async (data: SalesRepFormData) => {
    setIsSubmittingRep(true);
    try {
      const cleanMobile = normalizeIndianPhoneTo10Digits(data.mobile);
      const generatedEmail =
        data.email?.trim() ||
        `rep_${cleanMobile}_${Date.now().toString(36)}@yaacrm.internal`;
      const generatedPassword = generatePassword();

      const payload = {
        name: data.name.trim(),
        mobile: cleanMobile,
        email: generatedEmail,
        password: generatedPassword,
        designation: data.designation?.trim() || "Sales Representative",
        status: data.status,
      };

      const res = await salesRepresentativeApi.create(payload as any);
      const createdRep = res?.data || (res as any)?.salesRepresentative;

      if (res.success || (res as any).statusCode === 200 || createdRep) {
        const repId = createdRep?.id || (res as any)?.id || `rep_${Date.now()}`;
        const repData: SalesRepresentative = {
          id: repId,
          name: createdRep?.name || data.name.trim(),
          mobile: createdRep?.mobile || cleanMobile,
          email: createdRep?.email || data.email?.trim() || "",
          designation: createdRep?.designation || data.designation?.trim() || undefined,
          status: createdRep?.status || data.status,
          createdAt: createdRep?.createdAt || new Date().toISOString(),
          updatedAt: createdRep?.updatedAt || new Date().toISOString(),
        };

        saveSalesRepresentative(repData);
        store.dispatch(
          baseApi.util.invalidateTags([
            { type: "SalesRepresentative", id: "LIST" },
            { type: "Customer", id: "LIST" },
            "Dashboard",
          ]),
        );

        if (onRefreshReps) {
          onRefreshReps();
        }
        refresh();

        onChange(repData.id, repData);

        toast.success(`"${data.name}" created successfully`);
        setIsAddModalOpen(false);
      } else {
        toast.error("Failed to register sales representative.");
      }
    } catch (err: any) {
      console.error("Create sales representative error:", err);
      const code = err?.response?.data?.error?.code;
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        "";
      const lowerMsg = String(msg).toLowerCase();

      if (code === "DUPLICATE_EMAIL" || lowerMsg.includes("email")) {
        setFormError("email", {
          message: "This email is already registered. Please use a different email.",
        });
      } else if (
        code === "DUPLICATE_PHONE" ||
        code === "DUPLICATE_MOBILE" ||
        lowerMsg.includes("phone number is already used") ||
        lowerMsg.includes("already used by another login account") ||
        lowerMsg.includes("phone") ||
        lowerMsg.includes("mobile")
      ) {
        setFormError("mobile", {
          message: "This mobile number is already registered for another account.",
        });
      } else {
        toast.error(msg || "Failed to create sales representative.");
      }
    } finally {
      setIsSubmittingRep(false);
    }
  };

  const handleContainerScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 25 && hasMore && !isFetchingReps && !isLoadingMore) {
      loadMore();
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Box */}
      <div
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        className={`w-full h-10 px-3.5 rounded-xl border flex items-center justify-between text-xs font-medium transition-all select-none ${
          disabled
            ? "bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed"
            : isOpen
            ? "bg-white border-[#33077C] ring-2 ring-[#33077C]/10 text-slate-900 cursor-pointer"
            : "bg-white hover:bg-slate-50/80 border-slate-200 hover:border-slate-300 text-slate-900 cursor-pointer"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
          <UserCheck
            className={`w-4 h-4 shrink-0 ${
              selectedRep ? "text-[#33077C]" : "text-slate-400"
            }`}
          />
          {selectedRep ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-bold text-slate-900 truncate">
                {selectedRep.name}
              </span>
              {selectedRep.designation && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-[#33077C] font-semibold shrink-0">
                  {selectedRep.designation}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 truncate">
              {isLoading || isFetchingReps
                ? "Loading representatives..."
                : placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {selectedRep && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectRep(null);
              }}
              className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-[#33077C]" : ""
            }`}
          />
        </div>
      </div>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl border border-purple-100 shadow-2xl shadow-purple-900/15 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* 1. Search Bar */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or phone..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#4309A2] focus:ring-2 focus:ring-[#4309A2]/15 text-slate-900 placeholder-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 2. Top Action: Add New Sales Rep */}
          <div className="px-2 pt-2 pb-1 border-b border-slate-100">
            <button
              type="button"
              onClick={() => handleOpenAddModal(searchQuery)}
              className="w-full py-1.5 px-2.5 rounded-xl bg-purple-50 hover:bg-purple-100/80 text-[#33077C] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-purple-200/80 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Sales Representative</span>
            </button>
          </div>

          {/* 3. Options List Container with Infinite Scroll */}
          <div
            onScroll={handleContainerScroll}
            className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar"
          >
            {/* None / Unassigned Option */}
            <div
              onClick={() => handleSelectRep(null)}
              className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer ${
                !value
                  ? "bg-purple-50 text-[#33077C] font-bold"
                  : "hover:bg-slate-50 text-slate-600"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-slate-400 italic">None / Unassigned</span>
              </div>
              {!value && <Check className="w-4 h-4 text-[#33077C]" />}
            </div>

            {/* Rep Items */}
            {paginatedReps.length === 0 ? (
              <div className="py-6 px-3 text-center text-slate-400">
                {isFetchingReps ? (
                  <div className="flex items-center justify-center gap-2 text-[#33077C] text-xs">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading representatives...</span>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-slate-600">
                      No sales representative found
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Try searching with a different name or phone
                    </p>
                    {searchQuery.trim() && (
                      <button
                        type="button"
                        onClick={() => handleOpenAddModal(searchQuery)}
                        className="mt-2.5 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#33077C] text-white text-[11px] font-bold hover:bg-[#4309A2] transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add "{searchQuery.trim()}"</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            ) : (
              paginatedReps.map((rep) => {
                const isSelected = rep.id === value;
                return (
                  <div
                    key={rep.id}
                    onClick={() => handleSelectRep(rep)}
                    className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-purple-50 text-[#33077C] font-semibold"
                        : "hover:bg-slate-50/80 text-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-100 to-indigo-50 text-[#33077C] font-bold text-xs flex items-center justify-center shrink-0 border border-purple-200/60">
                        {rep.name ? rep.name.slice(0, 2).toUpperCase() : "SR"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 truncate">
                            {rep.name}
                          </span>
                          {rep.designation && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                              {rep.designation}
                            </span>
                          )}
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              rep.status === "Active"
                                ? "bg-emerald-500"
                                : "bg-slate-300"
                            }`}
                          />
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {rep.mobile}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-[#33077C] shrink-0" />
                    )}
                  </div>
                );
              })
            )}

            {/* Loading More Indicator */}
            {isLoadingMore && (
              <div className="py-2 px-3 text-center flex items-center justify-center gap-2 text-slate-500 font-semibold text-[11px] bg-slate-50/70 rounded-lg">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#33077C]" />
                <span>Loading more...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Add Sales Representative Modal */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Add Sales Representative"
          subtitle="Register a new representative to assign customer accounts and sales"
          maxWidth="md"
        >
          <form onSubmit={handleSubmit(onSubmitRep)} className="space-y-4">
            <div>
              <FormLabel required>Full Name</FormLabel>
              <input
                type="text"
                placeholder="e.g. John Doe"
                className={getFormInputCls(!!formErrors.name)}
                {...register("name")}
              />
              <FormError message={formErrors.name?.message} />
            </div>

            <div>
              <FormLabel required>Mobile Number</FormLabel>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold select-none">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="9876543210"
                  className={`${getFormInputCls(!!formErrors.mobile)} pl-11`}
                  {...register("mobile")}
                />
              </div>
              <FormError message={formErrors.mobile?.message} />
            </div>

            <div>
              <FormLabel>Email Address (Optional)</FormLabel>
              <input
                type="email"
                placeholder="e.g. rep@yaacrm.com"
                className={getFormInputCls(!!formErrors.email)}
                {...register("email")}
              />
              <FormError message={formErrors.email?.message} />
            </div>

            <div>
              <FormLabel>Designation (Optional)</FormLabel>
              <input
                type="text"
                placeholder="e.g. Senior Sales Executive"
                className={getFormInputCls(!!formErrors.designation)}
                {...register("designation")}
              />
              <FormError message={formErrors.designation?.message} />
            </div>

            <div className="flex items-center justify-between pt-1 pb-1">
              <div>
                <span className="text-xs font-bold text-slate-700 block">
                  Status
                </span>
                <span className="text-[11px] text-slate-400">
                  Allow rep to be assigned to sales and leads
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setFormValue(
                    "status",
                    watchStatus === "Active" ? "Inactive" : "Active",
                  )
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  watchStatus === "Active" ? "bg-[#33077C]" : "bg-slate-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    watchStatus === "Active" ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingRep}
                className="px-4 py-2 rounded-xl bg-[#33077C] hover:bg-[#26055d] text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {isSubmittingRep ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Representative</span>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
