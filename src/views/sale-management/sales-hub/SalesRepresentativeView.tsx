import { CommonTableHead } from '../../../components/common/CommonTableHead';
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Users,
  UserCheck,
  Plus,
  Search,
  Phone,
  Mail,
  IndianRupee,
  AlertCircle,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  Receipt,
  ShoppingCart,
  ArrowRight,
  Check,
  Loader2,
  FileSpreadsheet,
  MoreVertical,
  X,
  Printer,
} from "lucide-react";
import { Button } from "../../../components/common/Button";
import { FilterDropdown } from "../../../components/common/FilterDropdown";
import { exportTableToExcel } from "../../../utils/excelExport";
import { printTableReport } from "../../../utils/printUtils";
import { SaleActionDropdown } from "../utils/SaleActionDropdown";
import {
  salesRepresentativeApi,
  ApiSalesRepresentative,
  ApiRepPortfolio,
  SalesRepListSummary,
  UpdateSalesRepPayload,
} from "../../../api/commerce/salesRepresentativeApi";
import {
  collectionApi,
  CollectionFollowUpItem,
  CollectionHistoryItem,
} from "../../../api/commerce/collectionApi";
import { SalesRepresentativeSchema, SalesRepFormData } from "../../../schemas";
import { Modal } from "../../../components/common/Modal";
import { DeleteConfirmationModal } from "../../../components/common/DeleteConfirmationModal";
import { Pagination } from "../../../components/common/Pagination";
import { SearchBar } from "../../../components/common/SearchBar";
import { FormError } from "../../../components/common/FormError";
import { toast } from "../../../utils/toast";

import {
  normalizeIndianPhoneTo10Digits,
  isValidIndianPhone,
} from "../../../utils/validation";
import {
  checkRequiredText,
  checkPhone,
  checkEmail,
  useSubmitGuard,
  extractApiFieldErrors,
  getApiErrorMessage,
} from "../../../utils/formValidation";
import { store } from "../../../store/store";
import { baseApi } from "../../../api/baseApi";
import { FormLabel, FORM_INPUT_CLS, FORM_INPUT_ERROR_CLS, getFormInputCls } from "../utils/formUtils";

import { formatDate } from '../utils/dateUtils';
// Auto-generate a secure random password (user doesn't need to set this)
const generatePassword = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$!";
  return Array.from(
    { length: 12 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
};

// ─── helper ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const SalesRepresentativeView: React.FC = () => {
  const navigate = useNavigate();
  // ── list state ──────────────────────────────────────────────────────────
  const [reps, setReps] = useState<ApiSalesRepresentative[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [apiSummary, setApiSummary] = useState<SalesRepListSummary | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [isListLoading, setIsListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // ── filters / pagination ─────────────────────────────────────────────────
  const [pendingSearch, setPendingSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [pendingStatus, setPendingStatus] = useState<
    "ALL" | "Active" | "Inactive"
  >("ALL");
  const [appliedStatus, setAppliedStatus] = useState<
    "ALL" | "Active" | "Inactive"
  >("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // ── portfolio (detail) state ─────────────────────────────────────────────
  const [selectedRep, setSelectedRep] = useState<ApiSalesRepresentative | null>(
    null,
  );
  const [portfolio, setPortfolio] = useState<ApiRepPortfolio | null>(null);
  const [isPortfolioLoading, setIsPortfolioLoading] = useState(false);
  const [activeRepTab, setActiveRepTab] = useState<
    "customers" | "invoices" | "follow-ups" | "history"
  >("customers");

  // portfolio follow-ups / history (from collection API for richer data)
  const [repFollowUps, setRepFollowUps] = useState<CollectionFollowUpItem[]>(
    [],
  );
  const [repHistory, setRepHistory] = useState<CollectionHistoryItem[]>([]);

  // ── form / modal state ───────────────────────────────────────────────────
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingRep, setEditingRep] = useState<ApiSalesRepresentative | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── action dropdown & share states ───────────────────────────────────────
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{
    top?: number;
    bottom?: number;
    right?: number;
  } | null>(null);

  // ── delete modal state ───────────────────────────────────────────────────
  const [deleteTargetRep, setDeleteTargetRep] =
    useState<ApiSalesRepresentative | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingRep, setIsDeletingRep] = useState(false);
  const [deleteRepError, setDeleteRepError] = useState<string | null>(null);

  // ── react-hook-form ──────────────────────────────────────────────────────
  // Duplicate lookups are assigned below (they depend on later state); the resolver reads them at
  // validation time so duplicate errors are re-evaluated (and cleared) with every revalidation.
  const dupCheckRef = useRef<{
    mobile: (m: string) => string | null;
    email: (e: string) => string | null;
  }>({ mobile: () => null, email: () => null });
  const repFormResolver: Resolver<SalesRepFormData> = async (values, context, options) => {
    const base = await zodResolver(SalesRepresentativeSchema)(values, context, options);
    const errs: Record<string, { type: string; message: string }> = {
      ...((base.errors as any) || {}),
    };
    const add = (f: string, m: string | null) => {
      if (m && !errs[f]) errs[f] = { type: "validate", message: m };
    };
    add("name", checkRequiredText(values.name, "representative's full name", 2));
    const mobileErr = checkPhone(values.mobile, isValidIndianPhone, true);
    add("mobile", mobileErr);
    if (!mobileErr) add("mobile", dupCheckRef.current.mobile(values.mobile || ""));
    const emailErr = checkEmail(values.email, true);
    add("email", emailErr);
    if (!emailErr && values.email) add("email", dupCheckRef.current.email(values.email));
    if (Object.keys(errs).length > 0) return { values: {}, errors: errs as any };
    return base;
  };
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitted },
  } = useForm<SalesRepFormData>({
    resolver: repFormResolver,
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      mobile: "",
      email: "",
      designation: "",
      status: "Active",
    },
  });

  const watchStatus = watch("status");

  // ── track inactive representatives across session so they never vanish when status=ALL ──
  const inactiveRepsRef = useRef<Map<string, ApiSalesRepresentative>>(new Map());
  const requestIdRef = useRef(0);

  // ── cache of all known representatives for duplicate validation without hitting API ──
  const allRepsCacheRef = useRef<ApiSalesRepresentative[]>([]);

  // The cache is populated by loadReps (status=ALL, no search), which runs on mount
  // with exactly this data - no separate preload request is needed.

  const findDuplicateRepByMobile = useCallback(
    (mobileInput: string, excludeRepId?: string) => {
      const clean = normalizeIndianPhoneTo10Digits(mobileInput);
      if (!clean || clean.length < 10) return null;

      const fromCache = allRepsCacheRef.current.find(
        (r) =>
          r.id !== excludeRepId &&
          normalizeIndianPhoneTo10Digits(r.mobile) === clean,
      );
      if (fromCache) return fromCache;

      const fromCurrent = reps.find(
        (r) =>
          r.id !== excludeRepId &&
          normalizeIndianPhoneTo10Digits(r.mobile) === clean,
      );
      if (fromCurrent) return fromCurrent;

      return null;
    },
    [reps],
  );

  const findDuplicateRepByEmail = useCallback(
    (emailInput: string, excludeRepId?: string) => {
      const clean = emailInput.trim().toLowerCase();
      if (!clean) return null;

      const fromCache = allRepsCacheRef.current.find(
        (r) => r.id !== excludeRepId && r.email?.trim().toLowerCase() === clean,
      );
      if (fromCache) return fromCache;

      const fromCurrent = reps.find(
        (r) => r.id !== excludeRepId && r.email?.trim().toLowerCase() === clean,
      );
      if (fromCurrent) return fromCurrent;

      return null;
    },
    [reps],
  );


  const normalizeApiRep = useCallback((r: any): ApiSalesRepresentative => {
    const rawStatus = String(r?.status ?? "").trim().toLowerCase();
    const normalizedStatus: "Active" | "Inactive" =
      rawStatus === "inactive" ||
      r?.active === false ||
      r?.isActive === false ||
      r?.user?.active === false
        ? "Inactive"
        : "Active";

    return {
      ...r,
      status: normalizedStatus,
      assignedCustomersCount:
        r.metrics?.assignedCustomersCount ?? r.assignedCustomersCount ?? 0,
      assignedInvoicesCount:
        r.metrics?.assignedInvoicesCount ??
        r.metrics?.invoicesCount ??
        r.assignedInvoicesCount ??
        0,
      totalOutstandingAmount:
        r.metrics?.totalOutstandingAmount ??
        r.metrics?.totalOutstanding ??
        r.totalOutstandingAmount ??
        0,
      totalCollectedAmount:
        r.metrics?.totalCollectedAmount ??
        r.metrics?.collectedThisMonth ??
        r.totalCollectedAmount ??
        0,
      collectionRatePercent:
        r.metrics?.collectionRatePercent ??
        r.metrics?.collectionRate ??
        r.collectionRatePercent ??
        0,
    };
  }, []);

  // ── load list (fetches Active + Inactive when ALL so inactive reps always appear) ──
  const loadReps = useCallback(async (overrides?: { search?: string; status?: string }) => {
    const currentReqId = ++requestIdRef.current;
    setIsListLoading(true);
    setListError(null);
    try {
      const targetSearch = overrides?.search !== undefined ? overrides.search : appliedSearch;
      const targetStatus = overrides?.status !== undefined ? overrides.status : appliedStatus;
      let repList: ApiSalesRepresentative[] = [];
      let fetchedSummary: SalesRepListSummary | undefined;

      if (targetStatus === "ALL") {
        const [defaultRes, inactiveRes] = await Promise.allSettled([
          salesRepresentativeApi.getList({
            limit: 200,
            search: targetSearch || undefined,
          }),
          salesRepresentativeApi.getList({
            limit: 200,
            search: targetSearch || undefined,
            status: "Inactive",
          }),
        ]);

        if (currentReqId !== requestIdRef.current) return;

        if (
          defaultRes.status === "rejected" &&
          inactiveRes.status === "rejected"
        ) {
          throw defaultRes.reason;
        }

        const repMap = new Map<string, ApiSalesRepresentative>();

        if (defaultRes.status === "fulfilled") {
          fetchedSummary = defaultRes.value?.summary;
        }

        if (
          defaultRes.status === "fulfilled" &&
          defaultRes.value?.success &&
          Array.isArray(defaultRes.value.data)
        ) {
          defaultRes.value.data.forEach((raw: any) => {
            const norm = normalizeApiRep(raw);
            repMap.set(norm.id, norm);
          });
        }

        if (
          inactiveRes.status === "fulfilled" &&
          inactiveRes.value?.success &&
          Array.isArray(inactiveRes.value.data)
        ) {
          inactiveRes.value.data.forEach((raw: any) => {
            const norm = normalizeApiRep(raw);
            if (norm.status === "Inactive") {
              repMap.set(norm.id, norm);
            } else if (!repMap.has(norm.id)) {
              repMap.set(norm.id, norm);
            }
          });
        }

        // Update session inactive cache from authoritative API results
        repMap.forEach((r) => {
          if (r.status === "Inactive") {
            inactiveRepsRef.current.set(r.id, r);
          } else {
            inactiveRepsRef.current.delete(r.id);
          }
        });

        // Merge any session-cached (API-sourced) inactive reps omitted by backend soft-filtering
        inactiveRepsRef.current.forEach((inactiveRep, id) => {
          if (!repMap.has(id)) {
            repMap.set(id, inactiveRep);
          } else {
            const current = repMap.get(id)!;
            repMap.set(id, { ...current, status: "Inactive" });
          }
        });

        repList = Array.from(repMap.values());
      } else {
        const res = await salesRepresentativeApi.getList({
          limit: 200,
          search: targetSearch || undefined,
          status: targetStatus,
        });

        if (currentReqId !== requestIdRef.current) return;

        fetchedSummary = res.summary;

        if (res.success && Array.isArray(res.data)) {
          repList = res.data.map(normalizeApiRep);
        }

        if (appliedStatus === "Inactive") {
          const repMap = new Map<string, ApiSalesRepresentative>();
          repList
            .filter((r) => r.status === "Inactive")
            .forEach((r) => {
              inactiveRepsRef.current.set(r.id, r);
              repMap.set(r.id, r);
            });

          inactiveRepsRef.current.forEach((inactiveRep, id) => {
            if (!repMap.has(id)) {
              repMap.set(id, { ...inactiveRep, status: "Inactive" });
            }
          });

          repList = Array.from(repMap.values());
        } else if (appliedStatus === "Active") {
          repList = repList.filter(
            (r) => r.status === "Active" && !inactiveRepsRef.current.has(r.id),
          );
        }
      }

      if (appliedSearch) {
        const q = appliedSearch.toLowerCase().trim();
        repList = repList.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            (r.mobile && r.mobile.includes(q)) ||
            (r.email && r.email.toLowerCase().includes(q)) ||
            (r.designation && r.designation.toLowerCase().includes(q)),
        );
      }

      repList.sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", undefined, {
          sensitivity: "base",
        }),
      );

      const totalRecs = repList.length;
      const totalPgs = Math.ceil(totalRecs / pageSize) || 1;

      setReps(repList);
      setTotalRecords(totalRecs);
      setTotalPages(totalPgs);
      if (fetchedSummary) setApiSummary(fetchedSummary);

      if (appliedStatus === "ALL" && !appliedSearch) {
        allRepsCacheRef.current = repList;
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        "Failed to load sales representatives.";
      setListError(msg);
    } finally {
      if (currentReqId === requestIdRef.current) {
        setIsListLoading(false);
      }
    }
  }, [appliedSearch, appliedStatus, normalizeApiRep]);

  useEffect(() => {
    loadReps();
  }, [loadReps]);

  // Listen for sidebar click event to trigger immediate fresh API fetch
  useEffect(() => {
    const handleSidebarNav = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (
        detail?.path === '/sale-management/sales/sales-representatives' ||
        detail?.path === '/sale-management/sales/sales-representative' ||
        detail?.id === 'sales-hub-sales-representative' ||
        detail?.id === 'billing-sales-representatives'
      ) {
        loadReps();
      }
    };
    window.addEventListener('crm:sidebar-navigate', handleSidebarNav);
    return () => window.removeEventListener('crm:sidebar-navigate', handleSidebarNav);
  }, [loadReps]);

  // ── load portfolio when detail modal opens ────────────────────────────────
  const loadPortfolio = useCallback(async (rep: ApiSalesRepresentative) => {
    setIsPortfolioLoading(true);
    setPortfolio(null);
    setRepFollowUps([]);
    setRepHistory([]);
    try {
      // Primary: portfolio endpoint
      const res = await salesRepresentativeApi.getPortfolio(rep.id);
      if (res.success) setPortfolio(res.data);

      // Secondary: richer follow-ups from collection API
      const fuRes = await collectionApi.getFollowUps({
        salesRepresentativeId: rep.id,
        limit: 50,
      });
      if (fuRes.success) setRepFollowUps(fuRes.data ?? []);

      // Secondary: collection history
      const histRes = await collectionApi.getCollectionHistory({
        salesRepresentativeId: rep.id,
        limit: 50,
      });
      if (histRes.success) setRepHistory(histRes.data ?? []);
    } catch {
      // If portfolio endpoint 404, show empty state gracefully
    } finally {
      setIsPortfolioLoading(false);
    }
  }, []);

  const openDetailModal = (rep: ApiSalesRepresentative) => {
    setSelectedRep(rep);
    setActiveRepTab("customers");
    setIsDetailModalOpen(true);
    loadPortfolio(rep);
    salesRepresentativeApi
      .getById(rep.id)
      .then((res) => {
        if (res?.success && res.data) {
          setSelectedRep((prev) => (prev && prev.id === rep.id ? { ...prev, ...res.data } : prev));
        }
      })
      .catch((err) => console.warn("Could not fetch sales representative details:", err));
  };

  dupCheckRef.current = {
    mobile: (m) => {
      const clean = normalizeIndianPhoneTo10Digits(m) || m.trim();
      const dup = findDuplicateRepByMobile(clean, editingRep?.id);
      return dup
        ? `Phone number is already used by ${dup.name || "another sales representative"}. Each representative must have a unique mobile number.`
        : null;
    },
    email: (e) => {
      const dup = findDuplicateRepByEmail(e, editingRep?.id);
      return dup
        ? `This email is already registered to ${dup.name || "another representative"}. Please use a different email.`
        : null;
    },
  };

  useEffect(() => {
    if (!isFormModalOpen) clearErrors();
  }, [isFormModalOpen, clearErrors]);

  // ── form helpers ─────────────────────────────────────────────────────────
  const openCreateModal = () => {
    setEditingRep(null);
    clearErrors();
    reset({
      name: "",
      mobile: "",
      email: "",
      designation: "",
      status: "Active",
    });
    setIsFormModalOpen(true);
  };

  const openEditModal = async (listRep: ApiSalesRepresentative) => {
    let rep = listRep;
    try {
      const res = await salesRepresentativeApi.getById(listRep.id);
      if (res?.success && res.data) rep = { ...listRep, ...res.data };
    } catch (err) {
      console.warn("Could not fetch sales representative details:", err);
    }
    setEditingRep(rep);
    clearErrors();
    reset({
      name: rep.name,
      mobile: normalizeIndianPhoneTo10Digits(rep.mobile) || rep.mobile,
      email: rep.email || "",
      designation: rep.designation || "",
      status: rep.status,
    });
    setIsFormModalOpen(true);
  };

  const submitGuard = useSubmitGuard();
  const statusGuard = useSubmitGuard();
  const deleteGuard = useSubmitGuard();

  const onSubmit = (data: SalesRepFormData) => submitGuard.runOnce(async () => {
    const cleanMobile = normalizeIndianPhoneTo10Digits(data.mobile) || data.mobile.trim();

    // Field rules, duplicate-mobile and duplicate-email checks all live in repFormResolver, so by
    // the time we get here every one of them has already passed.

    setIsSubmitting(true);
    try {
      if (editingRep) {
        const newDesignation = data.designation?.trim() || "";
        const updatePayload: UpdateSalesRepPayload = {
          name: data.name.trim(),
          email: data.email?.trim() || editingRep.email,
          mobile: cleanMobile,
          designation: newDesignation,
          status: data.status,
        };

        const res = await salesRepresentativeApi.update(
          editingRep.id,
          updatePayload,
          editingRep.organizationId || undefined,
        );
        if (res.success || (res as any).statusCode === 200 || res.data) {
          toast.success(`"${data.name}" updated successfully`);
          setIsFormModalOpen(false);

          const updatedRepData: ApiSalesRepresentative = {
            ...editingRep,
            ...(res.data || {}),
            name: data.name.trim(),
            mobile: cleanMobile,
            email: data.email?.trim() || editingRep.email,
            designation: newDesignation,
            status: data.status,
          };

          // Optimistically update list in table
          setReps((prev) =>
            prev.map((r) => (r.id === editingRep.id ? updatedRepData : r)),
          );
          if (selectedRep?.id === editingRep.id) {
            setSelectedRep(updatedRepData);
          }

          // Sync with known inactive reps ref
          if (data.status === "Inactive") {
            inactiveRepsRef.current.set(editingRep.id, updatedRepData);
          } else {
            inactiveRepsRef.current.delete(editingRep.id);
          }

          // Reload fresh list & metrics from API
          loadReps();
        }
      } else {
        const autoPassword = generatePassword();
        const res = await salesRepresentativeApi.create({
          name: data.name.trim(),
          mobile: cleanMobile,
          email: data.email?.trim() || "",
          designation: data.designation?.trim() || undefined,
          password: autoPassword,
          confirmPassword: autoPassword,
          status: data.status,
        });
        if (res.success || (res as any).statusCode === 200 || res.data) {
          toast.success(`"${data.name}" created successfully`);
          setIsFormModalOpen(false);
          store.dispatch(
            baseApi.util.invalidateTags([
              { type: 'Customer', id: 'LIST' },
              'SalesRepresentative',
              'Dashboard',
            ])
          );
          loadReps();
        }
      }
    } catch (err: any) {
      const code = err?.response?.data?.error?.code;
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        "";
      const lowerMsg = String(msg).toLowerCase();
      const apiFields = extractApiFieldErrors(err);
      const mappedKeys = (["name", "mobile", "email", "designation"] as const).filter((k) => apiFields[k]);
      if (mappedKeys.length > 0) {
        mappedKeys.forEach((k) => setError(k as any, { type: "server", message: apiFields[k] }));
        return;
      }

      if (code === "DUPLICATE_EMAIL" || lowerMsg.includes("email")) {
        setError("email", {
          message: "This email is already registered. Use a different email.",
        });
      } else if (
        code === "DUPLICATE_PHONE" ||
        code === "DUPLICATE_MOBILE" ||
        lowerMsg.includes("phone number is already used") ||
        lowerMsg.includes("already used by another login account") ||
        lowerMsg.includes("phone") ||
        lowerMsg.includes("mobile")
      ) {
        setError("mobile", {
          message:
            "Phone number is already used by another login account. Each representative must have a unique mobile number.",
        });
      } else {
        toast.error(getApiErrorMessage(err, "We could not save the representative. Please try again."));
      }
    } finally {
      setIsSubmitting(false);
    }
  });

  // Close action dropdown and share popover on outside click or scroll
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest(".rep-action-dropdown-container") &&
        !target.closest(".rep-action-dropdown-menu")
      ) {
        setActiveDropdownId(null);
      }
      if (
        !target.closest(".share-popover-container") &&
        !target.closest(".share-popover-menu")
      ) {
      }
    };

    const handleScroll = () => {
      setActiveDropdownId(null);
    };

    document.addEventListener("click", handleGlobalClick);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("click", handleGlobalClick);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, []);

  const handleToggleStatus = (
    rep: ApiSalesRepresentative,
    newStatus: "Active" | "Inactive",
  ) => statusGuard.runOnce(async () => {
    if (!rep?.id || (newStatus !== "Active" && newStatus !== "Inactive")) {
      toast.error("Please select a valid sales representative.");
      return;
    }
    try {
      const cleanMobile =
        normalizeIndianPhoneTo10Digits(rep.mobile) || rep.mobile?.trim() || "";
      const updatePayload: UpdateSalesRepPayload = {
        name: rep.name.trim(),
        email: rep.email?.trim() || "",
        mobile: cleanMobile,
        designation: rep.designation?.trim() || "",
        status: newStatus,
      };
      const res = await salesRepresentativeApi.update(
        rep.id,
        updatePayload,
        rep.organizationId || undefined,
      );
      if (res.success || (res as any).statusCode === 200 || res.data) {
        toast.success(`"${rep.name}" set as ${newStatus}`);
        const updatedRep: ApiSalesRepresentative = {
          ...rep,
          ...(res.data || {}),
          status: newStatus,
        };
        setReps((prev) =>
          prev.map((r) => (r.id === rep.id ? updatedRep : r)),
        );
        if (selectedRep?.id === rep.id) {
          setSelectedRep((prev) =>
            prev ? { ...prev, status: newStatus } : null,
          );
        }
        if (newStatus === "Inactive") {
          inactiveRepsRef.current.set(rep.id, updatedRep);
        } else {
          inactiveRepsRef.current.delete(rep.id);
        }
        store.dispatch(
          baseApi.util.invalidateTags([
            { type: 'Customer', id: 'LIST' },
            'SalesRepresentative',
            'Dashboard',
          ])
        );
        loadReps();
      }
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, "We could not update the status. Please try again."));
    }
  });

  const handleConfirmDelete = () => deleteGuard.runOnce(async () => {
    if (!deleteTargetRep?.id) return;
    setIsDeletingRep(true);
    setDeleteRepError(null);
    try {
      await salesRepresentativeApi.remove(deleteTargetRep.id);
      toast.success(`"${deleteTargetRep.name}" deleted.`);
      inactiveRepsRef.current.delete(deleteTargetRep.id);
      if (selectedRep?.id === deleteTargetRep.id) {
        setIsDetailModalOpen(false);
        setSelectedRep(null);
      }
      setIsDeleteModalOpen(false);
      setDeleteTargetRep(null);
      store.dispatch(
        baseApi.util.invalidateTags([
          { type: 'Customer', id: 'LIST' },
          'SalesRepresentative',
          'Dashboard',
        ])
      );
      loadReps();
    } catch (err: any) {
      const errMsg = getApiErrorMessage(err, "We could not delete the representative. Please try again.");
      setDeleteRepError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsDeletingRep(false);
    }
  });

  // ── computed map of assigned customers and metrics per rep ─────────────────
  // Per-rep metrics come straight from the API representative record (no local calculation)
  const repMetricsMap = useMemo(() => {
    const map = new Map<
      string,
      {
        assignedCustomers: any[];
        assignedInvoices: any[];
        customersCount: number;
        invoicesCount: number;
        totalOutstanding: number;
        totalCollected: number;
        collectionRatePercent: number;
      }
    >();

    reps.forEach((rep) => {
      map.set(rep.id, {
        assignedCustomers: [],
        assignedInvoices: [],
        customersCount: Number(rep.assignedCustomersCount || 0),
        invoicesCount: Number(rep.assignedInvoicesCount || 0),
        totalOutstanding: Number(rep.totalOutstandingAmount || 0),
        totalCollected: Number(rep.totalCollectedAmount || 0),
        collectionRatePercent: Number(rep.collectionRatePercent || 0),
      });
    });

    return map;
  }, [reps]);

  const pagedReps = useMemo(() => {
    if (reps.length > pageSize) {
      const start = (currentPage - 1) * pageSize;
      return reps.slice(start, start + pageSize);
    }
    return reps;
  }, [reps, currentPage, pageSize]);

  // ── derived portfolio values ──────────────────────────────────────────────
  const selectedRepMetrics = selectedRep ? repMetricsMap.get(selectedRep.id) : null;
  const summary = portfolio?.summary ?? null;
  const portfolioCustomers = portfolio?.customers ?? [];
  const portfolioInvoices = portfolio?.invoices ?? [];
  const followUps =
    repFollowUps.length > 0 ? repFollowUps : (portfolio?.followUps ?? []);
  const history =
    repHistory.length > 0 ? repHistory : (portfolio?.collectionHistory ?? []);

  // ── Overall KPI Summary Metrics ──
  const kpis = useMemo(() => {
    const totalCount = totalRecords || reps.length;
    const activeCount = reps.filter((r) => r.status === "Active").length;
    let totalOutstanding = 0;
    let totalCollected = 0;

    reps.forEach((r) => {
      const metrics = repMetricsMap.get(r.id);
      totalOutstanding += metrics ? metrics.totalOutstanding : (Number(r.totalOutstandingAmount) || 0);
      totalCollected += metrics ? metrics.totalCollected : (Number(r.totalCollectedAmount) || 0);
    });

    if (apiSummary) {
      return {
        totalCount: apiSummary.totalCount ?? totalCount,
        activeCount: apiSummary.activeCount ?? activeCount,
        totalOutstanding: apiSummary.totalOutstanding ?? totalOutstanding,
        totalCollected: apiSummary.totalCollected ?? totalCollected,
      };
    }

    return {
      totalCount,
      activeCount,
      totalOutstanding,
      totalCollected,
    };
  }, [reps, totalRecords, repMetricsMap, apiSummary]);

  // ── Export to Excel ──
  const handleExportExcel = () => {
    if (reps.length === 0) {
      toast.error("No sales representatives to export");
      return;
    }

    const excelRows = reps.map((r, idx) => {
      const m = repMetricsMap.get(r.id);
      return {
        sNo: idx + 1,
        name: r.name,
        mobile: r.mobile || "-",
        email: r.email || "-",
        designation: r.designation || "-",
        customersCount: m ? m.customersCount : Number(r.assignedCustomersCount || 0),
        invoicesCount: m ? m.invoicesCount : Number(r.assignedInvoicesCount || 0),
        outstanding: m ? m.totalOutstanding : Number(r.totalOutstandingAmount || 0),
        collected: m ? m.totalCollected : Number(r.totalCollectedAmount || 0),
        collectionRate: `${(m ? m.collectionRatePercent : (r.collectionRatePercent || 0)).toFixed(1)}%`,
        status: r.status,
      };
    });

    exportTableToExcel({
      filename: `Sales_Reps_Report_${new Date().toISOString().split("T")[0]}`,
      sheetName: "Sales Representatives",
      title: "YAA CREATIONS CRM - SALES REPRESENTATIVES DIRECTORY",
      subtitle: `Total Reps: ${reps.length} | Generated: ${new Date().toLocaleDateString()}`,
      columns: [
        { header: "#", key: "sNo", align: "center", width: 8 },
        {
          header: "Representative Name",
          key: "name",
          align: "left",
          width: 26,
        },
        { header: "Mobile", key: "mobile", align: "left", width: 18 },
        { header: "Email", key: "email", align: "left", width: 24 },
        { header: "Designation", key: "designation", align: "left", width: 20 },
        {
          header: "Customers",
          key: "customersCount",
          align: "center",
          width: 12,
        },
        {
          header: "Invoices",
          key: "invoicesCount",
          align: "center",
          width: 12,
        },
        {
          header: "Outstanding (₹)",
          key: "outstanding",
          align: "right",
          type: "currency",
          width: 18,
        },
        {
          header: "Collected (₹)",
          key: "collected",
          align: "right",
          type: "currency",
          width: 18,
        },
        {
          header: "Collection Rate",
          key: "collectionRate",
          align: "center",
          width: 16,
        },
        { header: "Status", key: "status", align: "center", width: 14 },
      ],
      data: excelRows,
      summaryRow: {
        sNo: "TOTAL",
        name: `${reps.length} Representatives`,
        outstanding: kpis.totalOutstanding,
        collected: kpis.totalCollected,
      },
    });

    toast.success(
      `Sales Representatives Excel report downloaded (${reps.length} records)!`,
    );
  };

  // Print Sales Representatives Table Report via universal printUtils
  const handlePrintTableReport = () => {
    if (reps.length === 0) {
      toast.error("No sales representatives to print.");
      return;
    }

    const printRows = reps.map((r, idx) => {
      const m = repMetricsMap.get(r.id);
      const outstanding = m ? m.totalOutstanding : Number(r.totalOutstandingAmount || 0);
      const collected = m ? m.totalCollected : Number(r.totalCollectedAmount || 0);
      const collectionRate = `${(m ? m.collectionRatePercent : (r.collectionRatePercent || 0)).toFixed(1)}%`;

      return {
        sNo: idx + 1,
        name: r.name,
        phone: r.mobile || "-",
        email: r.email || "-",
        assignedCustomers: m ? m.customersCount : Number(r.assignedCustomersCount || 0),
        outstanding: outstanding,
        collected: collected,
        collectionRate: collectionRate,
        status: r.status,
      };
    });

    printTableReport({
      title: "SALES REPRESENTATIVES PERFORMANCE REPORT",
      subtitle: `Total Sales Representatives: ${reps.length}`,
      columns: [
        { header: "#", key: "sNo", align: "center", width: "5%" },
        { header: "Representative", key: "name", align: "left", width: "20%" },
        { header: "Phone", key: "phone", align: "left", width: "14%" },
        { header: "Email", key: "email", align: "left", width: "18%" },
        { header: "Customers", key: "assignedCustomers", align: "center", width: "10%" },
        { header: "Outstanding (₹)", key: "outstanding", align: "right", type: "currency", width: "12%" },
        { header: "Collected (₹)", key: "collected", align: "right", type: "currency", width: "12%" },
        { header: "Status", key: "status", align: "center", width: "9%" },
      ],
      data: printRows,
      summaryRow: {
        sNo: "TOTAL",
        name: `${reps.length} Reps`,
        outstanding: kpis.totalOutstanding,
        collected: kpis.totalCollected,
      },
      metrics: [
        { label: "Total Outstanding", value: kpis.totalOutstanding },
        { label: "Total Collected", value: kpis.totalCollected },
        { label: "Active Representatives", value: kpis.activeCount },
      ],
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-16 font-sans">
      {/* ── 1. Top Header Card ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-[220px] flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
              <UserCheck className="w-4.5 h-4.5" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Sales Representatives
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-[#33077C] border border-purple-200">
                {totalRecords} total
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Manage sales reps, portfolio metrics, and collection performance.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <Button
            variant="secondary"
            size="md"
            onClick={handleExportExcel}
            className="flex-1 sm:flex-initial justify-center"
            icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
          >
            Excel Report
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={handlePrintTableReport}
            className="flex-1 sm:flex-initial justify-center hover:border-purple-300"
            icon={<Printer className="w-4 h-4 text-slate-600" />}
          >
            Print Report
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={openCreateModal}
            className="flex-1 sm:flex-initial justify-center"
            icon={<Plus className="w-4 h-4 text-white stroke-[2.5]" />}
          >
            Add Sales Representative
          </Button>
        </div>
      </div>

      {/* ── 2. Summary KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Reps */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Representatives
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {kpis.totalCount}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              Field &amp; portfolio managers
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#33077C] flex items-center justify-center font-bold shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Active Reps */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-emerald-600 uppercase tracking-wider">
              Active Representatives
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
              {kpis.activeCount}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              Assigned to active portfolios
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Total Outstanding */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-rose-600 uppercase tracking-wider">
              Total Outstanding
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-600 mt-1">
              ₹
              {kpis.totalOutstanding.toLocaleString("en-IN", {
                maximumFractionDigits: 0,
              })}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              Unsettled representative receivables
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Total Collected */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-emerald-600 uppercase tracking-wider">
              Total Collected
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
              ₹
              {kpis.totalCollected.toLocaleString("en-IN", {
                maximumFractionDigits: 0,
              })}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              Realized portfolio collections
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── 3. Search & Filter Bar ── */}
      <SearchBar
        value={pendingSearch}
        onChange={setPendingSearch}
        placeholder="Search by name, mobile, email, designation..."
        onSubmit={() => {
          const trimmed = pendingSearch.trim();
          const isSame =
            appliedSearch === trimmed &&
            appliedStatus === pendingStatus &&
            currentPage === 1;

          setAppliedSearch(trimmed);
          setAppliedStatus(pendingStatus);
          setCurrentPage(1);

          if (isSame) {
            loadReps();
          }
        }}
        onReset={() => {
          setPendingSearch("");
          setAppliedSearch("");
          setPendingStatus("ALL");
          setAppliedStatus("ALL");
          setCurrentPage(1);
          loadReps({ search: "", status: "ALL" });
        }}
        filterSlot={
          <div className="flex items-center gap-2.5 flex-wrap">
            <FilterDropdown
              placeholder="Status : All"
              value={pendingStatus}
              options={[
                { label: "Status : All", value: "ALL" },
                { label: "Active", value: "Active", dotColor: "#10b981" },
                { label: "Inactive", value: "Inactive", dotColor: "#64748b" },
              ]}
              onChange={(val) => {
                setPendingStatus(val as any);
              }}
            />
          </div>
        }
        rightSlot={
          <div className="flex items-center gap-3 pr-1">
            <span className="text-xs font-semibold text-slate-500">
              Total Reps :{" "}
              <span className="text-[#33077C] font-bold">
                {totalRecords || reps.length}
              </span>
            </span>
          </div>
        }
      />

      {/* ── 4. Main Data Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto min-h-[360px]">
          <table className="w-full text-left border-collapse text-sm">
            <CommonTableHead
              columns={[
                { label: "REPRESENTATIVE", align: "left", minWidth: "200px" },
                { label: "CUSTOMERS", align: "center", minWidth: "100px" },
                { label: "INVOICES", align: "center", minWidth: "100px" },
                { label: "OUTSTANDING", align: "right", minWidth: "120px" },
                { label: "COLLECTED", align: "right", minWidth: "120px" },
                { label: "COLLECTION RATE", align: "center", minWidth: "120px" },
                { label: "STATUS", align: "center", minWidth: "110px" },
                { label: "ACTION", align: "center", minWidth: "120px" },
              ]}
            />
            <tbody className="divide-y divide-slate-100 font-sans">
              {isListLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <Loader2 className="w-8 h-8 mx-auto text-[#33077C] animate-spin mb-2" />
                    <p className="text-slate-500 text-sm font-medium">
                      Loading representatives…
                    </p>
                  </td>
                </tr>
              ) : listError ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <AlertCircle className="w-8 h-8 mx-auto text-rose-400 mb-2" />
                    <p className="text-slate-700 font-semibold text-sm">
                      {listError}
                    </p>
                    <button
                      onClick={loadReps}
                      className="mt-3 text-xs text-[#33077C] underline font-semibold cursor-pointer"
                    >
                      Retry
                    </button>
                  </td>
                </tr>
              ) : reps.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <UserCheck className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                    <p className="font-semibold text-slate-600 text-sm">
                      No Sales Representatives Found
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {appliedSearch
                        ? "Try adjusting your search."
                        : 'Click "Add Sales Representative" to register one.'}
                    </p>
                  </td>
                </tr>
              ) : (
                pagedReps.map((rep) => {
                  const metrics = repMetricsMap.get(rep.id);
                  const custCount = metrics ? metrics.customersCount : (rep.assignedCustomersCount ?? 0);
                  const invCount = metrics ? metrics.invoicesCount : (rep.assignedInvoicesCount ?? 0);
                  const outstanding = metrics ? metrics.totalOutstanding : (rep.totalOutstandingAmount ?? 0);
                  const collected = metrics ? metrics.totalCollected : (rep.totalCollectedAmount ?? 0);
                  const rate = metrics ? metrics.collectionRatePercent : (rep.collectionRatePercent ?? 0);

                  return (
                    <tr
                      key={rep.id}
                      onClick={() => openDetailModal(rep)}
                      className="hover:bg-purple-50/30 transition-colors cursor-pointer group border-b border-slate-100"
                    >
                      {/* Name & Contacts */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900 group-hover:text-[#33077C] transition-colors align-middle">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold text-xs shrink-0 border border-[#33077C]/20">
                            {rep.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="block font-bold text-slate-900 text-xs sm:text-[13px]">
                              {rep.name}
                            </span>
                            <span className="text-[11px] text-slate-500 font-normal block mt-0.5">
                              {rep.mobile}
                              {rep.designation ? ` - ${rep.designation}` : ""}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Customers count */}
                      <td className="py-3.5 px-4 text-center align-middle">
                        <span className={`inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-xs font-bold ${
                          custCount > 0 ? "bg-purple-100 text-[#33077C] border border-purple-200" : "bg-slate-100 text-slate-700"
                        }`}>
                          {custCount}
                        </span>
                      </td>

                      {/* Invoices count */}
                      <td className="py-3.5 px-4 text-center align-middle">
                        <span className={`inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-xs font-bold ${
                          invCount > 0 ? "bg-purple-50 text-[#33077C] border border-purple-200" : "bg-slate-100 text-slate-700"
                        }`}>
                          {invCount}
                        </span>
                      </td>

                      {/* Outstanding */}
                      <td className="py-3.5 px-4 text-right font-mono align-middle">
                        {outstanding > 0 ? (
                          <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-xs">
                            ₹{fmt(outstanding)}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            ₹0.00
                          </span>
                        )}
                      </td>

                      {/* Collected */}
                      <td className="py-3.5 px-4 text-right font-mono align-middle">
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                          ₹{fmt(collected)}
                        </span>
                      </td>

                      {/* Collection Rate */}
                      <td className="py-3.5 px-4 text-center align-middle">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-[#33077C] border border-purple-200">
                          {rate.toFixed(1)}%
                        </span>
                      </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center align-middle">
                      {rep.status === "Active" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />{" "}
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />{" "}
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td
                      className="py-3.5 px-4 text-center whitespace-nowrap align-middle"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center justify-center gap-1">
                        

                        {/* 3-Dots Floating Menu Button */}
                        <SaleActionDropdown
                          items={[
                            {
                              label: 'View',
                              variant: 'view',
                              onClick: () => openDetailModal(rep),
                            },
                            {
                              label: 'Edit',
                              variant: 'edit',
                              onClick: () => openEditModal(rep),
                            },
                            {
                              label: rep.status === 'Active' ? 'Set as Inactive' : 'Set as Active',
                              variant: rep.status === 'Active' ? 'deactivate' : 'activate',
                              onClick: () => handleToggleStatus(rep, rep.status === 'Active' ? 'Inactive' : 'Active'),
                            },
                            {
                              label: 'Delete Representative',
                              variant: 'delete',
                              onClick: () => {
                                setDeleteTargetRep(rep);
                                setDeleteRepError(null);
                                setIsDeleteModalOpen(true);
                              },
                            },
                          ]}
                        />
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
      {!isListLoading && reps.length > 0 && (
        <Pagination
          totalItems={totalRecords}
          currentPage={currentPage}
          pageSize={pageSize}
          pageSizeOptions={[5, 10, 20, 50]}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeletingRep) {
            setIsDeleteModalOpen(false);
            setDeleteTargetRep(null);
            setDeleteRepError(null);
          }
        }}
        onConfirm={handleConfirmDelete}
        entityName="Sales Representative"
        recordName={
          deleteTargetRep
            ? `${deleteTargetRep.name}${deleteTargetRep.designation ? ` (${deleteTargetRep.designation})` : ""}`
            : undefined
        }
        isLoading={isDeletingRep}
        error={deleteRepError}
      />

      {/* ================================================================ */}
      {/* ADD / EDIT MODAL                                                  */}
      {/* ================================================================ */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={
          editingRep ? `Edit: ${editingRep.name}` : "Add Sales Representative"
        }
        subtitle={
          editingRep
            ? "Update representative information and status"
            : "Fill in the details to register a new sales representative"
        }
        maxWidth="lg"
        headerGradient={true}
        showBackIcon={true}
        hideCloseButton={true}
        onBack={() => setIsFormModalOpen(false)}
      >
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-4 p-2 sm:p-4 text-xs">
            {/* Name */}
            <div>
              <FormLabel required>Full Name</FormLabel>
              <input
                type="text"
                {...register("name")}
                placeholder="e.g. Rajesh Kumar"
                className={getFormInputCls(Boolean(errors.name))}
              />
              <FormError error={errors.name} />
            </div>

            {/* Mobile */}
            <div>
              <FormLabel required>Mobile Number</FormLabel>
              <input
                type="tel"
                {...register("mobile")}
                placeholder="e.g. 9876543210"
                maxLength={10}
                data-field="mobile"
                onKeyDown={(e) => {
                  if (
                    !/[0-9]/.test(e.key) &&
                    e.key !== "Backspace" &&
                    e.key !== "Delete" &&
                    e.key !== "ArrowLeft" &&
                    e.key !== "ArrowRight" &&
                    e.key !== "Tab"
                  ) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => {
                  const clean = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setValue("mobile", clean, { shouldValidate: isSubmitted });
                }}
                className={getFormInputCls(Boolean(errors.mobile))}
              />
              <FormError error={errors.mobile} />
            </div>

            {/* Email */}
            <div>
              <FormLabel required>Email Address</FormLabel>
              <input
                type="email"
                {...register("email")}
                placeholder="e.g. rajesh.kumar@example.com"
                className={getFormInputCls(Boolean(errors.email))}
              />
              <FormError error={errors.email} />
            </div>

            {/* Designation */}
            <div>
              <FormLabel>Designation (Optional)</FormLabel>
              <input
                type="text"
                {...register("designation")}
                placeholder="e.g. Senior Sales Executive"
                className={FORM_INPUT_CLS}
              />
            </div>

            {/* Status */}
            <div>
              <FormLabel required>Status</FormLabel>
              <div className="grid grid-cols-2 gap-3">
                {(["Active", "Inactive"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      setValue("status", s, { shouldValidate: isSubmitted })
                    }
                    className={`h-11 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs sm:text-[13px] cursor-pointer transition-all ${
                      watchStatus === s
                        ? s === "Active"
                          ? "bg-emerald-50 border-emerald-400 text-emerald-800 shadow-2xs ring-2 ring-emerald-500/20"
                          : "bg-slate-100 border-slate-400 text-slate-800 shadow-2xs ring-2 ring-slate-400/20"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${s === "Active" ? "bg-emerald-600" : "bg-slate-400"}`}
                    />
                    <span>{s}</span>
                  </button>
                ))}
              </div>
              <FormError error={errors.status} />
            </div>
          </div>

          <div className="pt-4 mt-2 flex justify-end items-center gap-3 border-t border-slate-100 px-2 sm:px-4 pb-2">
            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
              className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2 disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4 stroke-[2.5]" />
              )}
              <span>
                {editingRep ? "Save Changes" : "Create Representative"}
              </span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ================================================================ */}
      {/* DETAIL / PORTFOLIO MODAL                                          */}
      {/* ================================================================ */}
      {selectedRep && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Sales Representative: ${selectedRep.name}`}
          subtitle={`${selectedRep.mobile}${selectedRep.email ? ` - ${selectedRep.email}` : ""}${selectedRep.designation ? ` - ${selectedRep.designation}` : ""}`}
          maxWidth="4xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setIsDetailModalOpen(false)}
        >
          <div className="space-y-6 p-0.5 sm:p-2 text-xs">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#33077C] text-white font-bold text-base flex items-center justify-center">
                  {selectedRep.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      {selectedRep.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedRep.status === "Active"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {selectedRep.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {selectedRep.mobile}
                    </span>
                    {selectedRep.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {selectedRep.email}
                      </span>
                    )}
                    {selectedRep.designation && (
                      <span className="text-slate-400 italic">
                        {selectedRep.designation}
                      </span>
                    )}
                    {selectedRep.hasLogin && (
                      <span className="px-2 py-0.5 rounded bg-purple-50 text-[#33077C] text-[10px] font-bold border border-purple-200">
                        Has Login
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Portfolio loading ── */}
            {isPortfolioLoading ? (
              <div className="py-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#33077C] mb-2" />
                <p className="text-slate-500 text-sm">Loading portfolio…</p>
              </div>
            ) : (
              <>
                {/* ── 4 KPI Cards ── */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                    Collection Performance Summary
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200/80">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#33077C] uppercase tracking-wider">
                          Assigned Customers
                        </span>
                        <Users className="w-4 h-4 text-[#33077C]" />
                      </div>
                      <p className="text-2xl font-bold text-slate-900 mt-2">
                        {portfolioCustomers.length > 0
                          ? portfolioCustomers.length
                          : (summary?.totalAssignedCustomers ??
                            selectedRepMetrics?.customersCount ??
                            selectedRep.assignedCustomersCount ??
                            0)}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Active accounts
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                          Total Outstanding
                        </span>
                        <IndianRupee className="w-4 h-4 text-amber-700" />
                      </div>
                      <p className="text-2xl font-bold text-slate-900 mt-2">
                        ₹
                        {(
                          selectedRepMetrics?.totalOutstanding ??
                          summary?.totalOutstandingAmount ??
                          selectedRep.totalOutstandingAmount ??
                          0
                        ).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Assigned dues
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200/80">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
                          Pending Follow-ups
                        </span>
                        <Clock className="w-4 h-4 text-rose-600" />
                      </div>
                      <p className="text-2xl font-bold text-rose-600 mt-2">
                        {summary?.pendingFollowUpsCount ?? followUps.length}
                      </p>
                      <p className="text-[11px] text-rose-700/80 mt-0.5">
                        Requires follow-up
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                          Total Collected
                        </span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <p className="text-2xl font-bold text-emerald-700 mt-2">
                        ₹
                        {(
                          selectedRepMetrics?.totalCollected ??
                          summary?.totalCollectedAmount ??
                          selectedRep.totalCollectedAmount ??
                          0
                        ).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-[11px] text-emerald-700/80 mt-0.5">
                        Rate:{" "}
                        {(
                          selectedRepMetrics?.collectionRatePercent ??
                          summary?.collectionRatePercent ??
                          selectedRep.collectionRatePercent ??
                          0
                        ).toFixed(1)}
                        %
                      </p>
                    </div>
                  </div>
                </div>

                {/* ── Tab Navigation ── */}
                <div className="space-y-4">
                  <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
                    {(
                      [
                        {
                          key: "customers",
                          icon: Users,
                          label: `Customers (${portfolioCustomers.length})`,
                        },
                        {
                          key: "invoices",
                          icon: ShoppingCart,
                          label: `Invoices (${portfolioInvoices.length})`,
                        },
                        {
                          key: "follow-ups",
                          icon: Clock,
                          label: `Follow-ups (${followUps.length})`,
                        },
                        {
                          key: "history",
                          icon: Receipt,
                          label: `Collection History (${history.length})`,
                        },
                      ] as const
                    ).map(({ key, icon: Icon, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setActiveRepTab(key)}
                        className={`pb-3 px-3 font-bold text-xs border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                          activeRepTab === key
                            ? "border-[#33077C] text-[#33077C]"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>

                  {/* TAB 1: CUSTOMERS */}
                  {activeRepTab === "customers" && (
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Assigned Customers ({portfolioCustomers.length})
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            setIsDetailModalOpen(false);
                            navigate("/sale-management/sales/customer");
                          }}
                          className="text-xs font-semibold text-[#33077C] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Manage Customers</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="rounded-xl border border-slate-200 overflow-x-auto">
                        <table className="w-full min-w-[520px] text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                              <th className="py-2.5 px-3">Customer</th>
                              <th className="py-2.5 px-3">Phone</th>
                              <th className="py-2.5 px-3 text-center">
                                Invoices
                              </th>
                              <th className="py-2.5 px-3 text-right">
                                Outstanding
                              </th>
                              <th className="py-2.5 px-3">Type</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {portfolioCustomers.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={5}
                                  className="text-center py-8 text-slate-400"
                                >
                                  <Users className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                                  <p className="font-semibold text-slate-500">
                                    No Customers Assigned Yet
                                  </p>
                                </td>
                              </tr>
                            ) : (
                              portfolioCustomers.map((cust) => (
                                <tr
                                  key={cust.id}
                                  className="hover:bg-slate-50/70 transition-colors"
                                >
                                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                                    <div>{cust.name}</div>
                                    {cust.company && (
                                      <div className="text-[11px] text-slate-500 font-normal">
                                        {cust.company}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-600 font-medium">
                                    {cust.phone || "—"}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-[#33077C] border border-purple-200">
                                      {cust.totalInvoicesCount ?? 0}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    {(cust.outstandingBalance ?? 0) > 0 ? (
                                      <span className="font-bold text-slate-900">
                                        ₹{fmt(cust.outstandingBalance!)}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">
                                        ₹0.00
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        cust.salesRepresentativeType ===
                                        "Primary"
                                          ? "bg-purple-50 text-[#33077C]"
                                          : "bg-slate-100 text-slate-600"
                                      }`}
                                    >
                                      {cust.salesRepresentativeType ||
                                        "Primary"}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: INVOICES */}
                  {activeRepTab === "invoices" && (
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Assigned Invoices ({portfolioInvoices.length})
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            setIsDetailModalOpen(false);
                            navigate("/sale-management/sales/sale");
                          }}
                          className="text-xs font-semibold text-[#33077C] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Manage Invoices</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="rounded-xl border border-slate-200 overflow-x-auto">
                        <table className="w-full min-w-[520px] text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                              <th className="py-2.5 px-3">Invoice</th>
                              <th className="py-2.5 px-3">Customer</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Due Date</th>
                              <th className="py-2.5 px-3 text-right">Total</th>
                              <th className="py-2.5 px-3 text-right">
                                Balance
                              </th>
                              <th className="py-2.5 px-3 text-center">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {portfolioInvoices.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={7}
                                  className="text-center py-8 text-slate-400"
                                >
                                  <ShoppingCart className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                                  <p className="font-semibold text-slate-500">
                                    No Invoices Assigned
                                  </p>
                                </td>
                              </tr>
                            ) : (
                              portfolioInvoices.map((inv) => (
                                <tr
                                  key={inv.id}
                                  className="hover:bg-slate-50/70 transition-colors"
                                >
                                  <td className="py-2.5 px-3 font-bold text-[#33077C] font-mono">
                                    {inv.invoiceNo}
                                  </td>
                                  <td className="py-2.5 px-3 font-medium text-slate-800">
                                    {inv.customerName}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-600">
                                    {formatDate(inv.invoiceDate)}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-600">
                                    {inv.dueDate || "—"}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-medium text-slate-900">
                                    ₹{fmt(inv.grandTotal)}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                                    ₹{fmt(inv.balance)}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        inv.paymentStatus === "Paid"
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                          : inv.paymentStatus === "Partial"
                                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                                            : "bg-rose-50 text-rose-700 border border-rose-200"
                                      }`}
                                    >
                                      {inv.paymentStatus}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: FOLLOW-UPS */}
                  {activeRepTab === "follow-ups" && (
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Collection Follow-ups ({followUps.length})
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            setIsDetailModalOpen(false);
                            navigate(
                              "/sale-management/sales/collections?subView=follow-ups",
                            );
                          }}
                          className="text-xs font-semibold text-[#33077C] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Open Follow-ups Hub</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="rounded-xl border border-slate-200 overflow-x-auto">
                        <table className="w-full min-w-[520px] text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Customer</th>
                              <th className="py-2.5 px-3">Invoice</th>
                              <th className="py-2.5 px-3">Method</th>
                              <th className="py-2.5 px-3">Outcome</th>
                              <th className="py-2.5 px-3">Notes</th>
                              <th className="py-2.5 px-3">Next Follow-up</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {followUps.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={7}
                                  className="text-center py-8 text-slate-400"
                                >
                                  <Clock className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                                  <p className="font-semibold text-slate-500">
                                    No Follow-ups Logged Yet
                                  </p>
                                </td>
                              </tr>
                            ) : (
                              followUps.map((f) => (
                                <tr
                                  key={f.id}
                                  className="hover:bg-slate-50/70 transition-colors"
                                >
                                  <td className="py-2.5 px-3 text-slate-600 font-mono">
                                    {f.followUpDate}
                                  </td>
                                  <td className="py-2.5 px-3 font-bold text-slate-900">
                                    {f.customerName}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-[#33077C]">
                                    {f.invoiceNo || "—"}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                                      {f.contactMethod}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        f.outcome === "Promise to Pay" ||
                                        f.outcome === "Payment Received"
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                          : f.outcome === "Dispute Raised"
                                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                                            : "bg-purple-50 text-[#33077C] border border-purple-200"
                                      }`}
                                    >
                                      {f.outcome}
                                    </span>
                                  </td>
                                  <td
                                    className="py-2.5 px-3 text-slate-600 max-w-xs truncate"
                                    title={f.notes}
                                  >
                                    {f.notes || "—"}
                                  </td>
                                  <td className="py-2.5 px-3 font-semibold text-purple-700">
                                    {f.nextFollowUpDate || "—"}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: COLLECTION HISTORY */}
                  {activeRepTab === "history" && (
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Collection History ({history.length})
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            setIsDetailModalOpen(false);
                            navigate(
                              "/sale-management/sales/collections?subView=collection-history",
                            );
                          }}
                          className="text-xs font-semibold text-[#33077C] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>View Full History</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="rounded-xl border border-slate-200 overflow-x-auto">
                        <table className="w-full min-w-[520px] text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                              <th className="py-2.5 px-3">Receipt ID</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Customer</th>
                              <th className="py-2.5 px-3">Invoice</th>
                              <th className="py-2.5 px-3">Mode</th>
                              <th className="py-2.5 px-3">Ref / Txn No</th>
                              <th className="py-2.5 px-3 text-right">
                                Amount Collected
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {history.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={7}
                                  className="text-center py-8 text-slate-400"
                                >
                                  <Receipt className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                                  <p className="font-semibold text-slate-500">
                                    No Payments Recorded Yet
                                  </p>
                                </td>
                              </tr>
                            ) : (
                              history.map((p) => (
                                <tr
                                  key={p.id}
                                  className="hover:bg-slate-50/70 transition-colors"
                                >
                                  <td className="py-2.5 px-3 font-mono font-bold text-[#33077C]">
                                    {p.receiptNo || p.id}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-600">
                                    {formatDate(p.paymentDate)}
                                  </td>
                                  <td className="py-2.5 px-3 font-medium text-slate-900">
                                    {p.customerName}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-slate-600">
                                    {p.invoiceNo || "—"}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-700">
                                      {p.paymentMethod}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-slate-500">
                                    {p.referenceNo || "—"}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                                    ₹{fmt(p.receivedAmount)}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
