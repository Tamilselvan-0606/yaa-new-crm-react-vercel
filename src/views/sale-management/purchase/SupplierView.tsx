import { HistoryTimelineView } from "../../../components/common/HistoryTimelineView";
import { PhoneField } from "../../../components/common/PhoneField";
import {
  LocationFields,
  LocationMeta,
} from "../../../components/common/LocationFields";
import { CommonTableHead } from "../../../components/common/CommonTableHead";
import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  UsersRound,
  Plus,
  Search,
  Filter,
  Eye,
  Pencil,
  Trash2,
  Phone,
  Mail,
  Building2,
  Building,
  Users,
  Layers,
  IndianRupee,
  Landmark,
  FileText,
  CreditCard,
  RotateCcw,
  ShoppingBag,
  MapPin,
  CheckCircle2,
  XCircle,
  User,
  MoreVertical,
  Ban,
  Check,
  X,
  Forward,
  FileSpreadsheet,
  Loader2,
  History,
  Printer,
} from "lucide-react";
import {
  useSalesManagementStore,
  Supplier,
  SupplierStatus,
  PurchaseOrder,
} from "../../../store/useSalesManagementStore";
import {
  supplierApi,
  mapApiPurchaseOrderToUi,
  mapApiSupplierToSupplier,
  mapSupplierToPayload,
  ApiSupplier,
  CreateSupplierPayload,
  UpdateSupplierPayload,
  workPurchaseOrderApi,
  workPaymentOutApi,
  mapApiPaymentOutToUi,
} from "../../../api";
import { SupplierSchema, SupplierFormData } from "../../../validations";
import { FormError } from "../../../components/common/FormError";
import {
  checkRequiredText,
  checkEmail,
  checkPhone,
  checkPincode,
  checkGstin,
  checkPan,
  checkNumber,
  collectErrors,
  extractApiFieldErrors,
  getApiErrorMessage,
  useSubmitGuard,
} from "../../../utils/formValidation";
import {
  isValidIndianPhone,
  normalizePhoneForSave,
  isValidIntlPhone,
  checkIntlPhone,
  normalizeIndianPhoneTo10Digits,
} from "../../../utils/validation";
import { Badge } from "../../../components/common/Badge";
import { Button } from "../../../components/common/Button";
import { Modal } from "../../../components/common/Modal";
import { DeleteConfirmationModal } from "../../../components/common/DeleteConfirmationModal";
import { Pagination } from "../../../components/common/Pagination";
import { SearchBar } from "../../../components/common/SearchBar";
import { FilterDropdown } from "../../../components/common/FilterDropdown";
import { exportTableToExcel } from "../../../utils/excelExport";
import {
  printBusinessDocument,
  printTableReport,
} from "../../../utils/printUtils";
import {
  FormLabel,
  FORM_INPUT_CLS,
  FORM_INPUT_DISABLED_CLS,
  FORM_SELECT_CLS,
  getFormInputCls,
  handleNonNegativeKeyDown,
} from "../utils/formUtils";
import { SaleActionDropdown } from "../utils/SaleActionDropdown";
import { toast } from "../../../utils/toast";

import { formatDate } from "../utils/dateUtils";

export const SupplierView: React.FC = () => {
  const [locationDistrict, setLocationDistrict] = useState("");
  const [locationIds, setLocationIds] = useState<{ countryId?: string; stateId?: string; districtId?: string; cityId?: string }>({});
  const [districtError, setDistrictError] = useState<string | undefined>();
  const [locationMeta, setLocationMeta] = useState<LocationMeta>({
    stateRequired: true,
    districtRequired: true,
    cityRequired: true,
  });
  // country/state/city are driven by LocationFields (setValue); keep them registered with the form
  const {
    suppliers: storeSuppliers,
    purchases,
    purchaseReturns,
    saveSupplier,
    deleteSupplier,
    setSuppliersList,
  } = useSalesManagementStore();

  // The selected supplier's purchase bills as the API reports them (with paid amount and balance)
  const [apiSupplierBills, setApiSupplierBills] = useState<
    PurchaseOrder[] | null
  >(null);

  // API State
  const [apiSuppliers, setApiSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState<boolean>(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [apiSummary, setApiSummary] = useState<NonNullable<
    import("../../../api/commerce/supplierTypes").SupplierListResponse["summary"]
  > | null>(null);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Search & Filter State
  const [pendingSearch, setPendingSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [pendingStatus, setPendingStatus] = useState("All");
  const [appliedStatus, setAppliedStatus] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Fetch tracking refs to prevent duplicate concurrent calls
  const lastFetchKeyRef = useRef<string>("");
  const isFetchingRef = useRef<boolean>(false);

  // 3-Dots Action dropdown
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);

  // Close action dropdown & share popover on click outside or scroll
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest(".action-dropdown-container") &&
        !target.closest(".action-dropdown-menu")
      ) {
        setActiveDropdownId(null);
        setDropdownPos(null);
      }
      if (
        !target.closest(".share-popover-container") &&
        !target.closest(".share-popover-menu")
      ) {
      }
    };
    const handleScroll = () => {
      if (activeDropdownId) {
        setActiveDropdownId(null);
        setDropdownPos(null);
      }
    };
    window.addEventListener("click", handleOutside);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("click", handleOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [activeDropdownId]);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "purchases" | "returns" | "outstanding"
  >("overview");
  const [historySupplier, setHistorySupplier] = useState<Supplier | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetSupplier, setDeleteTargetSupplier] =
    useState<Supplier | null>(null);
  const [isDeletingSupplier, setIsDeletingSupplier] = useState(false);
  const [deleteSupplierError, setDeleteSupplierError] = useState<string | null>(
    null,
  );

  // Open History Modal with live API sync
  const handleOpenHistory = async (sup: Supplier) => {
    setActiveDropdownId(null);
    setHistorySupplier(sup);
    setIsLoadingHistory(true);

    if (sup.id) {
      try {
        const res = await supplierApi.getSupplierById(sup.id);
        if (res && res.data) {
          const live = mapApiSupplierToSupplier(res.data);
          setHistorySupplier(live);
        }
      } catch (err) {
        console.warn(
          "Could not fetch latest supplier audit data from API:",
          err,
        );
      } finally {
        setIsLoadingHistory(false);
      }
    }
  };

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
    setError,
    clearErrors,
    setValue,
  } = useForm<SupplierFormData>({
    // Shared zod schema + friendly local rules layered on top.
    resolver: (async (values: any, ctx: any, opts: any) => {
      const base: any = await (zodResolver(SupplierSchema) as any)(
        values,
        ctx,
        opts,
      );
      const extra = collectErrors([
        ["name", checkRequiredText(values.name, "supplier name", 2)],
        ["phone", checkIntlPhone(values.phone, true, "phone number")],
        [
          "whatsappNumber",
          checkIntlPhone(values.whatsappNumber, true, "WhatsApp number"),
        ],
        [
          "gstNumber",
          String(values.gstNumber ?? "").trim()
            ? checkGstin(values.gstNumber)
            : "Please enter the GST number.",
        ],
        [
          "panNumber",
          String(values.panNumber ?? "").trim()
            ? checkPan(values.panNumber)
            : "Please enter the PAN number.",
        ],
        ["email", checkEmail(values.email, true)],
        ["address", checkRequiredText(values.address, "address")],
        ["country", values.country?.trim() ? null : "Please select a country"],
        [
          "city",
          locationMeta.cityRequired
            ? checkRequiredText(values.city, "city")
            : null,
        ],
        [
          "state",
          locationMeta.stateRequired
            ? checkRequiredText(values.state, "state")
            : null,
        ],
        ["pincode", checkPincode(values.pincode, true)],
        [
          "creditLimit",
          checkNumber(values.creditLimit, "credit limit", {
            allowZero: true,
            optional: true,
          }),
        ],
      ]);
      const errs: any = { ...(base.errors || {}) };
      for (const k of [
        "name",
        "phone",
        "whatsappNumber",
        "email",
        "address",
        "country",
        "city",
        "state",
        "pincode",
        "gstNumber",
        "panNumber",
        "creditLimit",
      ]) {
        if (extra[k]) errs[k] = { type: "validate", message: extra[k] };
        else delete errs[k];
      }
      if (Object.keys(errs).length === 0)
        return { values: base.values ?? values, errors: {} };
      return { values: {}, errors: errs };
    }) as any,
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      supplierCode: "",
      name: "",
      contactPerson: "",
      phone: "",
      whatsappNumber: "",
      email: "",
      address: "",
      city: "",
      state: "",
      country: "",
      pincode: "",
      gstNumber: "",
      panNumber: "",
      paymentTerms: "30 Days",
      creditLimit: 500000,
      bankName: "",
      accountNumber: "",
      ifscCode: "",
      branchName: "",
      status: "Active",
      notes: "",
    },
  });

  // Start every open/close of the form modal with no errors.
  useEffect(() => {
    clearErrors();
  }, [isFormModalOpen, clearErrors]);

  useEffect(() => {
    register("country");
    register("phone");
    register("whatsappNumber");
    register("state");
    register("city");
  }, [register]);

  useEffect(() => {
    if (!isFormModalOpen) {
      setLocationDistrict("");
      setDistrictError(undefined);
    }
  }, [isFormModalOpen]);

  // Load Suppliers from Live API with strict deduplication
  const loadSuppliers = useCallback(
    async (
      forceRefresh = false,
      overrides?: {
        search?: string;
        status?: string;
        page?: number;
      },
    ) => {
      const targetPage = overrides?.page ?? currentPage;
      const targetSearch =
        overrides?.search !== undefined ? overrides.search : appliedSearch;
      const targetStatus =
        overrides?.status !== undefined ? overrides.status : appliedStatus;
      const fetchKey = `${targetPage}_${pageSize}_${targetSearch.trim()}_${targetStatus}`;

      // Prevent concurrent calls or redundant re-fetching of identical parameters
      if (isFetchingRef.current) return;
      if (!forceRefresh && lastFetchKeyRef.current === fetchKey) return;

      isFetchingRef.current = true;
      lastFetchKeyRef.current = fetchKey;

      if (forceRefresh || !lastFetchKeyRef.current) {
        setIsLoading(true);
      } else {
        setIsFetching(true);
      }

      try {
        const res = await supplierApi.getSuppliers({
          page: targetPage,
          limit: pageSize,
          search: targetSearch.trim() || undefined,
          status: targetStatus !== "All" ? targetStatus : undefined,
          pagination_required: true,
        });

        if (res && res.data && Array.isArray(res.data)) {
          const mapped = res.data.map(mapApiSupplierToSupplier);
          setApiSuppliers(mapped);
          if (
            currentPage === 1 &&
            !appliedSearch.trim() &&
            appliedStatus === "All"
          ) {
            setSuppliersList(mapped);
          }

          setApiSummary(res.summary ?? null);
          if (res.pagination) {
            setTotalRecords(res.pagination.totalRecords ?? mapped.length);
            setTotalPages(
              res.pagination.totalPages ??
                (Math.ceil(mapped.length / pageSize) || 1),
            );
          } else {
            setTotalRecords(mapped.length);
            setTotalPages(Math.ceil(mapped.length / pageSize) || 1);
          }
        } else {
          setApiSuppliers(storeSuppliers.length > 0 ? storeSuppliers : []);
          setTotalRecords(storeSuppliers.length);
          setTotalPages(1);
        }
      } catch (err: any) {
        console.error("Failed to load suppliers from API:", err);
        setApiSuppliers(storeSuppliers.length > 0 ? storeSuppliers : []);
        setTotalRecords(storeSuppliers.length);
        setTotalPages(1);

        if (forceRefresh) {
          const errMsg =
            err?.response?.data?.error?.message ||
            err?.response?.data?.message ||
            err?.message ||
            "Failed to fetch suppliers from server";
          toast.error(errMsg);
        }
      } finally {
        setIsLoading(false);
        setIsFetching(false);
        isFetchingRef.current = false;
      }
    },
    [
      currentPage,
      pageSize,
      appliedSearch,
      appliedStatus,
      storeSuppliers,
      setSuppliersList,
    ],
  );

  // Single effect to load suppliers on query/page changes
  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  // Active display list
  const displaySuppliers = apiSuppliers;

  const pagedSuppliers = useMemo(() => {
    if (displaySuppliers.length > pageSize) {
      const start = (currentPage - 1) * pageSize;
      return displaySuppliers.slice(start, start + pageSize);
    }
    return displaySuppliers;
  }, [displaySuppliers, currentPage, pageSize]);

  // Summary Metrics
  const localSummary = useMemo(() => {
    const totalCount = totalRecords || displaySuppliers.length;
    const activeCount = displaySuppliers.filter(
      (s) => s.status === "Active",
    ).length;
    const inactiveCount = displaySuppliers.filter(
      (s) => s.status === "Inactive" || s.status === "Blocked",
    ).length;
    const totalPayables = displaySuppliers.reduce(
      (acc, s) => acc + (s.payable || 0),
      0,
    );
    const newSuppliersCount = displaySuppliers.filter((s) => {
      const monthAgo = new Date(Date.now() - 30 * 86400000);
      return new Date(s.createdAt) >= monthAgo;
    }).length;

    return {
      totalCount,
      activeCount,
      inactiveCount,
      totalPayables,
      newSuppliersCount,
    };
  }, [displaySuppliers, totalRecords]);
  const summary = apiSummary ?? localSummary;

  // Open Create Modal
  const handleOpenCreateModal = () => {
    reset({
      supplierCode: "",
      name: "",
      contactPerson: "",
      phone: "",
      whatsappNumber: "",
      email: "",
      address: "",
      city: "",
      state: "",
      country: "",
      pincode: "",
      gstNumber: "",
      panNumber: "",
      paymentTerms: "Net 30 Days",
      creditLimit: 0,
      bankName: "",
      accountNumber: "",
      ifscCode: "",
      branchName: "",
      status: "Active",
      notes: "",
    });
    setEditingSupplier(null);
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (sup: Supplier) => {
    reset({
      supplierCode: sup.supplierCode,
      name: sup.name,
      contactPerson: sup.contactPerson || sup.name,
      phone: sup.phone,
      whatsappNumber: sup.whatsappNumber || "",
      email: sup.email || "",
      address: sup.address || "",
      city: sup.city || "",
      state: sup.state || "",
      country: sup.country || "India",
      pincode: sup.pincode || "",
      gstNumber: sup.gstNumber || "",
      panNumber: sup.panNumber || "",
      paymentTerms: sup.paymentTerms || "Net 30 Days",
      creditLimit: sup.creditLimit || 0,
      bankName: sup.bankName || "",
      accountNumber: sup.accountNumber || "",
      ifscCode: sup.ifscCode || "",
      branchName: sup.branchName || "",
      status: (sup.status as "Active" | "Inactive" | "Blocked") || "Active",
      notes: sup.notes || "",
    });
    setEditingSupplier(sup);
    setIsFormModalOpen(true);
  };

  // Open Details Modal with API refresh
  const handleOpenDetailModal = async (
    sup: Supplier,
    tab: "overview" | "purchases" | "returns" | "outstanding" = "overview",
  ) => {
    setSelectedSupplier(sup);
    setActiveTab(tab);
    setApiSupplierBills(null);
    setIsDetailModalOpen(true);

    try {
      setIsDetailLoading(true);
      const [res, bills] = await Promise.all([
        supplierApi.getSupplierById(sup.id),
        supplierApi
          .getSupplierPurchaseBills(sup.id, { limit: 100 })
          .catch(() => null),
      ]);
      if (res && res.data) {
        setSelectedSupplier(mapApiSupplierToSupplier(res.data));
      }
      if (bills && Array.isArray(bills.data)) {
        setApiSupplierBills(bills.data.map(mapApiPurchaseOrderToUi));
      }
    } catch {
      // Use cached sup
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Duplicate Supplier Handler
  const handleDuplicateSupplier = (sup: Supplier) => {
    setEditingSupplier(null);
    reset({
      supplierCode: "",
      name: `${sup.name} (Copy)`,
      contactPerson: sup.contactPerson || sup.name,
      phone: sup.phone,
      whatsappNumber: sup.whatsappNumber || "",
      email: sup.email ? `copy_${sup.email}` : "",
      address: sup.address,
      city: sup.city,
      state: sup.state,
      country: sup.country || "India",
      pincode: sup.pincode,
      gstNumber: sup.gstNumber || "",
      panNumber: sup.panNumber || "",
      paymentTerms: sup.paymentTerms,
      creditLimit: sup.creditLimit,
      bankName: sup.bankName || "",
      accountNumber: sup.accountNumber || "",
      ifscCode: sup.ifscCode || "",
      branchName: sup.branchName || "",
      status: "Active",
      notes: sup.notes
        ? `[Duplicate of ${sup.supplierCode}] ${sup.notes}`
        : `Duplicate of ${sup.supplierCode}`,
    });
    setIsFormModalOpen(true);
    toast.info(`Cloned details from "${sup.name}" into form.`);
  };

  // Keystroke sanitizer: disallow typing non-numeric characters in number-only fields
  const handleNumberOnlyKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (
      e.key === "Backspace" ||
      e.key === "Delete" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "Tab" ||
      e.key === "Enter" ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  // Save / Update Supplier
  const { runOnce: runSupplierSaveOnce } = useSubmitGuard();
  const isDistrictMissing = () =>
    locationMeta.districtRequired && !locationDistrict.trim();
  const onSaveSupplier = (data: SupplierFormData) => {
    if (isDistrictMissing()) {
      setDistrictError("Please select a district");
      return;
    }
    return runSupplierSaveOnce(() => saveSupplierInner(data));
  };
  const saveSupplierInner = async (data: SupplierFormData) => {
    try {
      setIsSubmittingForm(true);

      if (editingSupplier) {
        const payload: UpdateSupplierPayload = {
          name: data.name.trim(),
          phone:
            normalizePhoneForSave(data.phone) || data.phone.trim(),
          whatsapp:
            normalizePhoneForSave(data.whatsappNumber) ||
            data.whatsappNumber.trim(),
          address: data.address.trim(),
          city: data.city.trim(),
          state: data.state.trim(),
          country: data.country?.trim() || "India",
          countryId: locationIds.countryId || undefined,
          stateId: locationIds.stateId || undefined,
          districtId: locationIds.districtId || undefined,
          cityId: locationIds.cityId || undefined,
          pincode: data.pincode.trim(),
          status: data.status || "Active",
        };
        if (data.name?.trim()) payload.company = data.name.trim();
        if (data.email?.trim()) payload.email = data.email.trim();
        if (data.gstNumber?.trim())
          payload.gstNumber = data.gstNumber.trim().toUpperCase();
        if (data.panNumber?.trim())
          payload.panNumber = data.panNumber.trim().toUpperCase();
        if (data.paymentTerms?.trim())
          payload.paymentTerms = data.paymentTerms.trim();

        const res = await supplierApi.updateSupplier(
          editingSupplier.id,
          payload,
        );
        if (!res || !res.data) {
          throw new Error(
            (res as any)?.error?.message || "Failed to update supplier.",
          );
        }
        const updated = mapApiSupplierToSupplier(res.data);
        saveSupplier(updated);
        toast.success(`Supplier "${data.name}" updated successfully.`);
      } else {
        const payload: CreateSupplierPayload = {
          name: data.name.trim(),
          phone:
            normalizePhoneForSave(data.phone) || data.phone.trim(),
          whatsapp:
            normalizePhoneForSave(data.whatsappNumber) ||
            data.whatsappNumber.trim(),
          address: data.address.trim(),
          city: data.city.trim(),
          state: data.state.trim(),
          country: data.country?.trim() || "India",
          countryId: locationIds.countryId || undefined,
          stateId: locationIds.stateId || undefined,
          districtId: locationIds.districtId || undefined,
          cityId: locationIds.cityId || undefined,
          pincode: data.pincode.trim(),
          status: data.status || "Active",
        };
        if (data.name?.trim()) payload.company = data.name.trim();
        if (data.email?.trim()) payload.email = data.email.trim();
        if (data.gstNumber?.trim())
          payload.gstNumber = data.gstNumber.trim().toUpperCase();
        if (data.panNumber?.trim())
          payload.panNumber = data.panNumber.trim().toUpperCase();
        if (data.paymentTerms?.trim())
          payload.paymentTerms = data.paymentTerms.trim();

        const res = await supplierApi.createSupplier(payload);
        if (!res || !res.data) {
          throw new Error(
            (res as any)?.error?.message || "Failed to create supplier.",
          );
        }
        const created = mapApiSupplierToSupplier(res.data);
        saveSupplier(created);
        toast.success(`Supplier "${data.name}" added successfully.`);
      }

      setIsFormModalOpen(false);
      loadSuppliers(true);
    } catch (error: any) {
      console.error("Error saving supplier:", error);
      const apiFields = extractApiFieldErrors(error);
      const formKeys = [
        "name",
        "phone",
        "whatsappNumber",
        "email",
        "address",
        "city",
        "state",
        "pincode",
        "gstNumber",
        "panNumber",
        "paymentTerms",
        "country",
        "status",
      ];
      let mapped = false;
      for (const [k, m] of Object.entries(apiFields)) {
        if (formKeys.includes(k)) {
          setError(k as any, { type: "server", message: m });
          mapped = true;
        }
      }
      if (mapped) return;
      const msg = getApiErrorMessage(
        error,
        "Failed to save supplier. Please try again.",
      );
      toast.error(msg);
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Delete Supplier with confirmation modal
  const handleOpenDeleteModal = (sup: Supplier) => {
    setActiveDropdownId(null);
    setDropdownPos(null);
    setDeleteTargetSupplier(sup);
    setDeleteSupplierError(null);
    setIsDeleteModalOpen(true);
  };

  const { runOnce: runSupplierDeleteOnce } = useSubmitGuard();
  const handleConfirmDeleteSupplier = () =>
    runSupplierDeleteOnce(confirmDeleteSupplierInner);
  const confirmDeleteSupplierInner = async () => {
    if (!deleteTargetSupplier) return;
    setIsDeletingSupplier(true);
    setDeleteSupplierError(null);
    try {
      setIsDeletingId(deleteTargetSupplier.id);
      await supplierApi.deleteSupplier(deleteTargetSupplier.id);
      toast.success(
        `Supplier "${deleteTargetSupplier.name}" deleted successfully.`,
      );
      setIsDeleteModalOpen(false);
      setDeleteTargetSupplier(null);
      loadSuppliers(true);
    } catch (error: any) {
      console.error("Error deleting supplier:", error);
      const msg = getApiErrorMessage(error, "Failed to delete supplier.");
      setDeleteSupplierError(msg);
      toast.error(msg);
    } finally {
      setIsDeletingId(null);
      setIsDeletingSupplier(false);
    }
  };

  // Supplier Details Data Links
  const supplierPurchases = useMemo(() => {
    if (!selectedSupplier) return [];
    return (
      apiSupplierBills ??
      purchases.filter((p) => p.supplierId === selectedSupplier.id)
    );
  }, [apiSupplierBills, purchases, selectedSupplier]);

  const supplierReturns = useMemo(() => {
    if (!selectedSupplier) return [];
    return purchaseReturns.filter((r) => r.supplierId === selectedSupplier.id);
  }, [purchaseReturns, selectedSupplier]);

  const getSupplierInitials = (name?: string): string => {
    if (!name) return "SU";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Export Suppliers to Excel
  const handleExportExcel = () => {
    if (displaySuppliers.length === 0) {
      toast.error("No supplier records available to export.");
      return;
    }

    const excelRows = displaySuppliers.map((s, idx) => ({
      sNo: idx + 1,
      supplierCode: s.supplierCode,
      name: s.name,
      contactPerson: s.contactPerson || "-",
      phone: s.phone,
      email: s.email || "-",
      gstNumber: s.gstNumber || "-",
      creditLimit: Number(s.creditLimit || 0),
      totalPurchase: Number(s.totalPurchase || 0),
      paid: Number(s.paid || 0),
      payable: Number(s.payable || 0),
      status: s.status,
    }));

    exportTableToExcel({
      filename: `Suppliers_Report_${new Date().toISOString().split("T")[0]}`,
      sheetName: "Suppliers Master",
      title: "YAA CREATIONS CRM - SUPPLIERS & VENDORS DIRECTORY",
      subtitle: `Total Suppliers: ${displaySuppliers.length} | Generated: ${new Date().toLocaleDateString("en-IN")}`,
      columns: [
        { header: "#", key: "sNo", align: "center", width: 8 },
        {
          header: "Supplier Code",
          key: "supplierCode",
          align: "center",
          width: 14,
        },
        { header: "Supplier Name", key: "name", align: "left", width: 26 },
        {
          header: "Contact Person",
          key: "contactPerson",
          align: "left",
          width: 20,
        },
        { header: "Phone", key: "phone", align: "left", width: 18 },
        { header: "Email", key: "email", align: "left", width: 24 },
        { header: "GSTIN", key: "gstNumber", align: "left", width: 18 },
        {
          header: "Credit Limit (₹)",
          key: "creditLimit",
          align: "right",
          type: "currency",
          width: 16,
        },
        {
          header: "Total Purchase (₹)",
          key: "totalPurchase",
          align: "right",
          type: "currency",
          width: 18,
        },
        {
          header: "Paid (₹)",
          key: "paid",
          align: "right",
          type: "currency",
          width: 16,
        },
        {
          header: "Payable (₹)",
          key: "payable",
          align: "right",
          type: "currency",
          width: 16,
        },
        { header: "Status", key: "status", align: "center", width: 14 },
      ],
      data: excelRows,
      summaryRow: {
        sNo: "TOTAL",
        name: `${displaySuppliers.length} Suppliers`,
        payable: summary.totalPayables,
      },
    });

    toast.success(
      `Suppliers Excel report downloaded (${displaySuppliers.length} records)!`,
    );
  };

  // Print Supplier Statement / Profile via universal printUtils
  const handlePrintSupplierStatement = (sup: Supplier) => {
    printBusinessDocument({
      docTypeTitle: "SUPPLIER STATEMENT / VENDOR PROFILE",
      docNo: sup.supplierCode || sup.id.slice(0, 8).toUpperCase(),
      docDate: new Date().toISOString().split("T")[0],
      status: sup.status,
      statusColor:
        sup.status === "Active"
          ? "emerald"
          : sup.status === "Blocked"
            ? "rose"
            : "slate",
      partyTitle: "Supplier / Vendor Details",
      partyName: sup.name,
      partyCompany: (sup as any).company || sup.name,
      partyPhone: sup.phone || (sup as any).mobile,
      partyEmail: sup.email,
      partyAddress: (sup as any).billingAddress || sup.address,
      partyGstin: sup.gstNumber,
      extraMeta: [
        { label: "Contact Person", value: sup.contactPerson || "N/A" },
        { label: "Payment Terms", value: sup.paymentTerms || "Net 30 Days" },
        {
          label: "Credit Limit",
          value: `₹${(sup.creditLimit || 0).toLocaleString("en-IN")}`,
        },
        ...(sup.bankName ? [{ label: "Bank Name", value: sup.bankName }] : []),
        ...(sup.accountNumber
          ? [{ label: "Account Number", value: sup.accountNumber }]
          : []),
        ...(sup.ifscCode ? [{ label: "IFSC Code", value: sup.ifscCode }] : []),
      ],
      columns: [
        { header: "Metric", width: "50%" },
        { header: "Financial Value (₹)", align: "right", width: "50%" },
      ],
      items: [
        {
          name: "Total Cumulative Purchases",
          remarks: "Sum of all historical purchase bills from this supplier",
          quantity: 1,
          unitPrice: Number(sup.totalPurchase || 0),
          total: Number(sup.totalPurchase || 0),
        },
        {
          name: "Total Disbursed / Paid Amount",
          remarks: "Total payments made to vendor",
          quantity: 1,
          unitPrice: Number(sup.paid || 0),
          total: Number(sup.paid || 0),
        },
        {
          name: "Outstanding Balance Payable",
          remarks: "Current pending payment liability",
          quantity: 1,
          unitPrice: Number(sup.payable || 0),
          total: Number(sup.payable || 0),
        },
      ],
      subtotal: Number(sup.totalPurchase || 0),
      grandTotal: Number(sup.totalPurchase || 0),
      paidAmount: Number(sup.paid || 0),
      balance: Number(sup.payable || 0),
      paidAmountLabel: "Total Disbursed",
      balanceLabel: "Net Payable Outstanding",
      notes: sup.notes || "Vendor account maintained under active compliance.",
    });
  };

  // Print Table Report for Suppliers
  const handlePrintTableReport = () => {
    if (displaySuppliers.length === 0) {
      toast.info("No supplier records available to print.");
      return;
    }

    const printRows = displaySuppliers.map((sup) => ({
      supplierCode: sup.supplierCode,
      name: sup.name,
      contactPerson: sup.contactPerson || "—",
      phone: sup.phone || (sup as any).mobile || "—",
      city: sup.city || "—",
      totalPurchase: Number(sup.totalPurchase || 0),
      payable: Number(sup.payable || 0),
      status: sup.status,
    }));

    printTableReport({
      title: "Suppliers & Vendor Directory Report",
      subtitle: `Total Vendors: ${totalRecords || displaySuppliers.length} | Status Filter: ${pendingStatus}`,
      columns: [
        { header: "Code", key: "supplierCode", width: "12%" },
        { header: "Supplier Name", key: "name", width: "25%" },
        { header: "Contact Person", key: "contactPerson", width: "16%" },
        { header: "Phone", key: "phone", width: "14%" },
        { header: "Status", key: "status", align: "center", width: "11%" },
        {
          header: "Purchases (₹)",
          key: "totalPurchase",
          align: "right",
          type: "currency",
          width: "11%",
        },
        {
          header: "Payable (₹)",
          key: "payable",
          align: "right",
          type: "currency",
          width: "11%",
        },
      ],
      data: printRows,
      metrics: [
        { label: "Total Suppliers", value: summary.totalCount },
        { label: "Total Accounts Payable", value: summary.totalPayables },
        { label: "Active Suppliers", value: summary.activeCount },
      ],
      summaryRow: {
        supplierCode: "Total",
        payable: summary.totalPayables,
      },
    });
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-[220px] flex-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
              <UsersRound className="w-4.5 h-4.5" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Suppliers & Vendors
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Manage vendor directories, credit limits, bank profiles, and
            accounts payable
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <Button
            variant="secondary"
            size="md"
            className="flex-1 sm:flex-initial justify-center"
            onClick={handlePrintTableReport}
            icon={<Printer className="w-4 h-4 text-[#33077C]" />}
          >
            Print Report
          </Button>

          <Button
            variant="secondary"
            size="md"
            className="flex-1 sm:flex-initial justify-center"
            onClick={handleExportExcel}
            icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
          >
            Excel Report
          </Button>

          <Button
            variant="primary"
            size="md"
            className="flex-1 sm:flex-initial justify-center"
            onClick={handleOpenCreateModal}
            icon={<Plus className="w-4 h-4 text-white" />}
          >
            Add Supplier
          </Button>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Suppliers
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#33077C] flex items-center justify-center">
              <UsersRound className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">
              {summary.totalCount}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Active vendors catalog
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">
              {summary.activeCount}
            </div>
            <div className="text-xs text-emerald-600 font-medium mt-0.5">
              Eligible for POs
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Inactive / Blocked
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">
              {summary.inactiveCount}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Procurement paused
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Payables
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">
              ₹
              {summary.totalPayables.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </div>
            <div className="text-xs text-amber-600 font-medium mt-0.5">
              Pending vendor payments
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              New (30 Days)
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">
              {summary.newSuppliersCount}
            </div>
            <div className="text-xs text-indigo-600 font-medium mt-0.5">
              Recently onboarded
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <SearchBar
        placeholder="Search by supplier name, code, contact person, phone, email..."
        value={pendingSearch}
        onChange={(val) => setPendingSearch(val)}
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
            loadSuppliers(true);
          }
        }}
        onReset={() => {
          isFetchingRef.current = false;
          lastFetchKeyRef.current = null;
          setPendingSearch("");
          setAppliedSearch("");
          setPendingStatus("All");
          setAppliedStatus("All");
          setCurrentPage(1);
          loadSuppliers(true, {
            search: "",
            status: "All",
            page: 1,
          });
        }}
        filterSlot={
          <div className="flex items-center gap-2.5 flex-wrap">
            <FilterDropdown
              placeholder="Status : All"
              value={pendingStatus}
              onChange={(val) => {
                setPendingStatus(val);
              }}
              options={[
                { label: "Status : All", value: "All" },
                { label: "Active", value: "Active", dotColor: "#10b981" },
                { label: "Inactive", value: "Inactive", dotColor: "#64748b" },
                { label: "Blocked", value: "Blocked", dotColor: "#ef4444" },
              ]}
            />
          </div>
        }
        rightSlot={
          <div className="flex items-center gap-3 pr-1">
            {isFetching && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#33077C]" />
                <span>Updating...</span>
              </div>
            )}
            <span className="text-xs font-semibold text-slate-500">
              Total Suppliers :{" "}
              <span className="text-[#33077C] font-bold">
                {totalRecords || displaySuppliers.length}
              </span>
            </span>
          </div>
        }
      />

      {/* 4. Supplier Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200 min-w-[950px]">
            <CommonTableHead
              columns={[
                { label: "SUPPLIER & CODE", align: "left", minWidth: "180px" },
                { label: "CONTACT PERSON", align: "left", minWidth: "160px" },
                { label: "CONTACT INFO", align: "left", minWidth: "160px" },
                { label: "LOCATION", align: "left", minWidth: "150px" },
                { label: "TOTAL PURCHASE", align: "right", minWidth: "130px" },
                { label: "PAID / PAYABLE", align: "right", minWidth: "140px" },
                { label: "STATUS", align: "center", minWidth: "110px" },
                { label: "ACTIONS", align: "center", minWidth: "120px" },
              ]}
            />
            <tbody className="text-sm">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-16 text-center text-slate-400 border border-slate-200 font-medium"
                  >
                    <Loader2 className="w-8 h-8 mx-auto mb-2 text-[#33077C] animate-spin stroke-[2]" />
                    <p className="font-semibold text-slate-700 text-sm">
                      Loading suppliers...
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Fetching live vendor directory from server
                    </p>
                  </td>
                </tr>
              ) : displaySuppliers.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-16 text-center text-slate-400 border border-slate-200 font-medium"
                  >
                    <UsersRound className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    <p className="font-semibold text-slate-600 text-sm">
                      No suppliers found
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Add a new supplier to begin purchasing goods.
                    </p>
                  </td>
                </tr>
              ) : (
                pagedSuppliers.map((sup) => {
                  const initials = getSupplierInitials(sup.name);

                  return (
                    <tr
                      key={sup.id}
                      className="hover:bg-slate-50/80 transition-colors border-b border-slate-200 font-sans"
                    >
                      {/* 1. Supplier & Code */}
                      <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#33077C] text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-xs shrink-0 select-none">
                            {initials}
                          </div>
                          <div className="flex flex-col">
                            <span
                              className="font-bold text-slate-900 text-xs sm:text-[14px] cursor-pointer hover:text-[#33077C] hover:underline"
                              onClick={() => handleOpenDetailModal(sup)}
                            >
                              {sup.name}
                            </span>
                            <span className="text-[11px] font-bold text-[#33077C] tracking-wide mt-0.5">
                              {sup.supplierCode}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Contact Person */}
                      <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-[#33077C]" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 text-xs sm:text-[13px] block">
                              {sup.contactPerson || sup.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium block">
                              Authorized Contact
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Contact Info */}
                      <td className="py-4 px-4 border border-slate-200 whitespace-nowrap align-middle">
                        <div className="space-y-1 text-xs text-left">
                          {sup.phone ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (sup.phone) {
                                  navigator.clipboard.writeText(sup.phone);
                                  toast.success(`Copied phone: ${sup.phone}`);
                                }
                              }}
                              className="flex items-center gap-1.5 text-slate-700 hover:text-[#33077C] transition-colors cursor-pointer group text-left"
                              title={`Click to copy phone: ${sup.phone}`}
                            >
                              <Phone className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#33077C] shrink-0" />
                              <span className="font-medium">{sup.phone}</span>
                            </button>
                          ) : null}
                          {sup.email ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (sup.email) {
                                  navigator.clipboard.writeText(sup.email);
                                  toast.success(`Copied email: ${sup.email}`);
                                }
                              }}
                              className="flex items-center gap-1.5 text-slate-500 hover:text-[#33077C] transition-colors truncate max-w-[170px] cursor-pointer group text-left"
                              title={`Click to copy email: ${sup.email}`}
                            >
                              <Mail className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#33077C] shrink-0" />
                              <span className="truncate">{sup.email}</span>
                            </button>
                          ) : null}
                          {!sup.phone && !sup.email && (
                            <span className="text-slate-400 text-xs">N/A</span>
                          )}
                        </div>
                      </td>

                      {/* 4. Location */}
                      <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-[#33077C] shrink-0" />
                          <span>
                            {sup.city || sup.address || "N/A"}
                            {sup.state ? `, ${sup.state}` : ""}
                          </span>
                        </div>
                      </td>

                      {/* 5. Total Purchase */}
                      <td className="py-4 px-4 border border-slate-200 text-right whitespace-nowrap font-bold text-slate-900 text-xs sm:text-[13px]">
                        ₹
                        {(sup.totalPurchase || 0).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </td>

                      {/* 6. Paid / Payable */}
                      <td className="py-4 px-4 border border-slate-200 text-right whitespace-nowrap">
                        <div className="font-bold text-emerald-600 text-xs">
                          ₹
                          {(sup.paid || 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                        {(sup.payable || 0) > 0 ? (
                          <div className="text-[10px] text-amber-600 font-semibold mt-0.5">
                            Due: ₹
                            {sup.payable.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400">
                            Clear
                          </div>
                        )}
                      </td>

                      {/* 7. Status */}
                      <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap">
                        {sup.status === "Active" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50/90 text-emerald-700 border border-emerald-300/80 text-xs font-bold shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>Active</span>
                          </span>
                        ) : sup.status === "Blocked" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-300 text-xs font-bold shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                            <span>Blocked</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                            <span>Inactive</span>
                          </span>
                        )}
                      </td>

                      {/* 8. Actions */}
                      <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* 3-dots Actions Dropdown */}
                          <SaleActionDropdown
                            items={[
                              {
                                label: "View",
                                variant: "view",
                                onClick: () => handleOpenDetailModal(sup),
                              },
                              {
                                label: "Edit",
                                variant: "edit",
                                onClick: () => handleOpenEditModal(sup),
                              },
                              {
                                label: "Print Statement",
                                variant: "print",
                                onClick: () =>
                                  handlePrintSupplierStatement(sup),
                              },
                              {
                                label: "Duplicate",
                                variant: "duplicate",
                                onClick: () => handleDuplicateSupplier(sup),
                              },
                              {
                                label: "View History",
                                variant: "view",
                                onClick: () => handleOpenHistory(sup),
                              },
                              {
                                label: "Delete",
                                variant: "delete",
                                danger: true,
                                dividerBefore: true,
                                onClick: () => handleOpenDeleteModal(sup),
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
      {(totalRecords > 0 || displaySuppliers.length > 0) && (
        <Pagination
          total={totalRecords || displaySuppliers.length}
          currentPage={currentPage}
          pageSize={pageSize}
          pageSizeOptions={[5, 10, 20, 50]}
          onPageChange={(newPage) => setCurrentPage(newPage)}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      )}

      {/* ==========================================
          MODAL 1: ADD / EDIT SUPPLIER MODAL
         ========================================== */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingSupplier ? "Edit Supplier" : "Add Supplier"}
        subtitle={
          editingSupplier
            ? "Update supplier details, contact info, and tax profile"
            : "Set supplier details, contact info, and registration numbers"
        }
        maxWidth="4xl"
        headerGradient={true}
        showBackIcon={true}
        hideCloseButton={true}
        onBack={() => setIsFormModalOpen(false)}
      >
        <form
          noValidate
          onSubmit={(e) => {
            setDistrictError(
              isDistrictMissing() ? "Please select a district" : undefined,
            );
            return handleSubmit(onSaveSupplier)(e);
          }}
          className="space-y-4 p-2 sm:p-4 max-h-[75vh] overflow-y-auto animate-in fade-in duration-150 text-xs"
        >
          {/* Row 1: Supplier Code | Supplier Name | Contact Person */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div>
              <FormLabel>Supplier Code</FormLabel>
              <input
                type="text"
                readOnly
                disabled
                {...register("supplierCode")}
                placeholder="Auto-generated on save"
                className={FORM_INPUT_DISABLED_CLS}
              />
              <FormError message={errors.supplierCode?.message} />
            </div>
            <div>
              <FormLabel required>Supplier / Company Name</FormLabel>
              <input
                type="text"
                {...register("name")}
                placeholder="e.g. Agarwal Components Pvt Ltd"
                className={getFormInputCls(!!errors.name)}
              />
              <FormError message={errors.name?.message} />
            </div>
            <div>
              <FormLabel required>Contact Person Name</FormLabel>
              <input
                type="text"
                {...register("contactPerson")}
                placeholder="e.g. Ramesh Agarwal"
                className={getFormInputCls(!!errors.contactPerson)}
              />
              <FormError message={errors.contactPerson?.message} />
            </div>
          </div>

          {/* Row 2: Phone Number | Email Address | Street Address */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <PhoneField
              label="Phone Number"
              required
              value={watch("phone") || ""}
              error={errors.phone?.message as string | undefined}
              placeholder="e.g. 9988776655"
              onChange={(v) => setValue("phone" as any, v as any, { shouldDirty: true, shouldValidate: true })}
            />
            <PhoneField
              label="WhatsApp Number"
              required
              value={watch("whatsappNumber") || ""}
              error={errors.whatsappNumber?.message as string | undefined}
              placeholder="e.g. 9988776655"
              onChange={(v) => setValue("whatsappNumber" as any, v as any, { shouldDirty: true, shouldValidate: true })}
            />
            <div>
              <FormLabel required>Email Address</FormLabel>
              <input
                type="email"
                {...register("email")}
                placeholder="e.g. procurement@agarwal.in"
                className={getFormInputCls(!!errors.email)}
              />
              <FormError message={errors.email?.message} />
            </div>
            <div className="md:col-span-3">
              <FormLabel required>Address</FormLabel>
              <textarea
                rows={3}
                {...register("address")}
                placeholder="e.g. 45 Industrial Area, Phase 2"
                className={getFormInputCls(!!errors.address)}
              />
              <FormError message={errors.address?.message} />
            </div>
          </div>

          {/* Row 3: Country | State | District | City (master data) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            <LocationFields
              country={watch("country") || ""}
              state={watch("state") || ""}
              district={locationDistrict}
              city={watch("city") || ""}
              onMeta={setLocationMeta}
              errors={{
                country: errors.country?.message as string | undefined,
                state: errors.state?.message as string | undefined,
                district: districtError,
                city: errors.city?.message as string | undefined,
              }}
              onChange={(patch) => {
                setLocationIds((prev) => ({
                  countryId: patch.countryId !== undefined ? patch.countryId : prev.countryId,
                  stateId: patch.stateId !== undefined ? patch.stateId : prev.stateId,
                  districtId: patch.districtId !== undefined ? patch.districtId : prev.districtId,
                  cityId: patch.cityId !== undefined ? patch.cityId : prev.cityId,
                }));
                if (patch.country !== undefined)
                  setValue("country", patch.country, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                if (patch.state !== undefined)
                  setValue("state", patch.state, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                if (patch.district !== undefined) {
                  setLocationDistrict(patch.district);
                  setDistrictError(undefined);
                }
                if (patch.city !== undefined)
                  setValue("city", patch.city, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
              }}
            />
          </div>

          {/* Row 4: Pincode | GST/VAT Number | PAN Number */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div>
              <FormLabel required>Pincode</FormLabel>
              <input
                type="text"
                maxLength={6}
                {...register("pincode")}
                onKeyDown={handleNumberOnlyKeyDown}
                onInput={(e) => {
                  e.currentTarget.value = e.currentTarget.value
                    .replace(/\D/g, "")
                    .slice(0, 6);
                }}
                placeholder="e.g. 110041"
                className={getFormInputCls(!!errors.pincode)}
              />
              <FormError message={errors.pincode?.message} />
            </div>
            <div>
              <FormLabel required>GST Number</FormLabel>
              <input
                type="text"
                maxLength={15}
                {...register("gstNumber", {
                  onChange: (e) => {
                    setValue("gstNumber", e.target.value.toUpperCase(), {
                      shouldValidate: true,
                    });
                  },
                })}
                onInput={(e) => {
                  e.currentTarget.value = e.currentTarget.value.toUpperCase();
                }}
                placeholder="e.g. 07AAACA1234A1ZV"
                className={`${getFormInputCls(!!errors.gstNumber)} font-mono uppercase`}
              />
              <FormError message={errors.gstNumber?.message} />
            </div>
            <div>
              <FormLabel required>PAN Number</FormLabel>
              <input
                type="text"
                maxLength={10}
                {...register("panNumber", {
                  onChange: (e) => {
                    setValue("panNumber", e.target.value.toUpperCase(), {
                      shouldValidate: true,
                    });
                  },
                })}
                onInput={(e) => {
                  e.currentTarget.value = e.currentTarget.value.toUpperCase();
                }}
                placeholder="e.g. AAACA1234A"
                className={`${getFormInputCls(!!errors.panNumber)} font-mono uppercase`}
              />
              <FormError message={errors.panNumber?.message} />
            </div>
          </div>

          {/* Row 5: Payment Terms | Credit Limit | Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div>
              <FormLabel>Payment Terms</FormLabel>
              <select {...register("paymentTerms")} className={FORM_SELECT_CLS}>
                <option value="Immediate">Immediate / Advance</option>
                <option value="15 Days">15 Days</option>
                <option value="30 Days">30 Days</option>
                <option value="45 Days">45 Days</option>
                <option value="60 Days">60 Days</option>
                <option value="90 Days">90 Days</option>
                <option value="120 Days">120 Days</option>
              </select>
              <FormError message={errors.paymentTerms?.message} />
            </div>
            <div>
              <FormLabel>Credit Limit (₹)</FormLabel>
              <input
                type="number"
                min="0"
                {...register("creditLimit", { valueAsNumber: true })}
                onKeyDown={handleNonNegativeKeyDown}
                className={getFormInputCls(!!errors.creditLimit)}
              />
              <FormError message={errors.creditLimit?.message} />
            </div>
            <div>
              <FormLabel>Status</FormLabel>
              <select {...register("status")} className={FORM_SELECT_CLS}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Blocked">Blocked</option>
              </select>
              <FormError message={errors.status?.message} />
            </div>
          </div>

          {/* Row 6: Bank Name | Account Number | IFSC Code */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div>
              <FormLabel>Bank Name</FormLabel>
              <input
                type="text"
                {...register("bankName")}
                placeholder="e.g. HDFC Bank"
                className={getFormInputCls(!!errors.bankName)}
              />
              <FormError message={errors.bankName?.message} />
            </div>
            <div>
              <FormLabel>Account Number</FormLabel>
              <input
                type="text"
                {...register("accountNumber")}
                placeholder="e.g. 50200012345678"
                className={getFormInputCls(!!errors.accountNumber)}
              />
              <FormError message={errors.accountNumber?.message} />
            </div>
            <div>
              <FormLabel>IFSC Code</FormLabel>
              <input
                type="text"
                maxLength={11}
                {...register("ifscCode", {
                  onChange: (e) => {
                    setValue("ifscCode", e.target.value.toUpperCase(), {
                      shouldValidate: true,
                    });
                  },
                })}
                onInput={(e) => {
                  e.currentTarget.value = e.currentTarget.value.toUpperCase();
                }}
                placeholder="e.g. HDFC0000123"
                className={`${getFormInputCls(!!errors.ifscCode)} font-mono uppercase`}
              />
              <FormError message={errors.ifscCode?.message} />
            </div>
          </div>

          <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
              className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4 text-slate-500" />
              <span>Cancel</span>
            </button>
            <button
              type="submit"
              disabled={isSubmittingForm}
              className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmittingForm ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ==========================================
          MODAL 2: TABBED SUPPLIER DETAIL MODAL
         ========================================== */}
      {selectedSupplier && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title="Supplier Details"
          subtitle="View profile, contact information, procurement history, and ledger balances"
          maxWidth="4xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setIsDetailModalOpen(false)}
        >
          <div className="space-y-5">
            {/* Top Profile / Header Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 flex items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#33077C] text-white flex items-center justify-center font-bold text-base sm:text-lg shrink-0 select-none">
                  {getSupplierInitials(selectedSupplier.name)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
                      {selectedSupplier.name}
                    </h3>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                      {selectedSupplier.supplierCode}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1.5">
                    <span className="text-slate-400 font-normal">
                      Contact Person:
                    </span>
                    <span className="text-slate-700">
                      {selectedSupplier.contactPerson || "-"}
                    </span>
                  </p>
                </div>
              </div>

              {/* Status Pill & Spinner */}
              <div className="flex items-center gap-2.5 shrink-0">
                {isDetailLoading && (
                  <Loader2 className="w-4 h-4 animate-spin text-[#33077C]" />
                )}
                {selectedSupplier.status === "Active" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200/90 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Active
                  </span>
                )}
                {selectedSupplier.status === "Blocked" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Blocked
                  </span>
                )}
                {selectedSupplier.status === "Inactive" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 font-bold text-xs border border-slate-300 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    Inactive
                  </span>
                )}
              </div>
            </div>

            {/* Nav Tabs - Standalone Button Style */}
            <div className="flex flex-wrap items-center gap-2.5">
              {[
                { id: "overview", label: "Overview" },
                { id: "purchases", label: "Purchases" },
                { id: "returns", label: "Returns" },
                { id: "outstanding", label: "Outstanding Balance" },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      isActive
                        ? "bg-[#33077C] text-white shadow-sm"
                        : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs"
                    }`}
                  >
                    {isActive && (
                      <Check className="w-3.5 h-3.5 stroke-[3] text-white shrink-0" />
                    )}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB: OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-5">
                {/* 4 Top Metric Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div className="p-4 bg-purple-50/40 rounded-2xl border border-purple-100 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Total Purchase
                    </span>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      ₹
                      {(selectedSupplier.totalPurchase || 0).toLocaleString(
                        "en-IN",
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-100 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Total Paid
                    </span>
                    <div className="text-xl font-bold text-emerald-600 mt-1">
                      ₹{(selectedSupplier.paid || 0).toLocaleString("en-IN")}
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-100 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Current Payable
                    </span>
                    <div className="text-xl font-bold text-amber-500 mt-1">
                      ₹{(selectedSupplier.payable || 0).toLocaleString("en-IN")}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Credit Limit
                    </span>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      ₹
                      {(selectedSupplier.creditLimit || 0).toLocaleString(
                        "en-IN",
                      )}
                    </div>
                  </div>
                </div>

                {/* Two Column Layout Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                  {/* Left Column: Bank & Tax Details */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3.5">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
                      <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[#33077C] flex items-center justify-center font-bold">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <span>Bank & Tax Details</span>
                    </div>

                    <div className="space-y-3 text-xs sm:text-[13px]">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-400 font-medium shrink-0">
                          GSTIN
                        </span>
                        <span className="font-bold text-slate-800 text-right">
                          {selectedSupplier.gstNumber || "-"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                        <span className="text-slate-400 font-medium shrink-0">
                          PAN Number
                        </span>
                        <span className="font-bold text-slate-800 text-right">
                          {selectedSupplier.panNumber || "-"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                        <span className="text-slate-400 font-medium shrink-0">
                          Bank Name
                        </span>
                        <span className="font-bold text-slate-800 text-right">
                          {selectedSupplier.bankName || "-"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                        <span className="text-slate-400 font-medium shrink-0">
                          Account Number
                        </span>
                        <span className="font-bold text-slate-800 text-right">
                          {selectedSupplier.accountNumber || "-"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                        <span className="text-slate-400 font-medium shrink-0">
                          IFSC Code
                        </span>
                        <span className="font-bold text-slate-800 text-right">
                          {selectedSupplier.ifscCode || "-"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                        <span className="text-slate-400 font-medium shrink-0">
                          Branch Name
                        </span>
                        <span className="font-bold text-slate-800 text-right">
                          {selectedSupplier.branchName || "-"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Contact & Address Details */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3.5">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
                      <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[#33077C] flex items-center justify-center font-bold">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <span>Company Contact & Address</span>
                    </div>

                    <div className="space-y-3 text-xs sm:text-[13px]">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-400 font-medium shrink-0">
                          Contact Person
                        </span>
                        <span className="font-bold text-slate-800 text-right">
                          {selectedSupplier.contactPerson || "-"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                        <span className="text-slate-400 font-medium shrink-0">
                          Phone Number
                        </span>
                        <span className="font-bold text-slate-800 text-right">
                          {selectedSupplier.phone || "-"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                        <span className="text-slate-400 font-medium shrink-0">
                          Email Address
                        </span>
                        <span className="font-bold text-slate-800 text-right break-all">
                          {selectedSupplier.email || "-"}
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-4 pt-2.5 border-t border-slate-100">
                        <span className="text-slate-400 font-medium shrink-0">
                          Address
                        </span>
                        <span className="font-bold text-slate-800 text-right leading-snug">
                          {[
                            selectedSupplier.address,
                            selectedSupplier.city,
                            selectedSupplier.state,
                            selectedSupplier.pincode,
                          ]
                            .filter(Boolean)
                            .join(", ") || "-"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                        <span className="text-slate-400 font-medium shrink-0">
                          Payment Terms
                        </span>
                        <span className="font-bold text-slate-800 text-right">
                          {selectedSupplier.paymentTerms || "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PURCHASES */}
            {activeTab === "purchases" && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-slate-200 min-w-[720px]">
                    <thead>
                      <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white uppercase tracking-wider">
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white">
                          PURCHASE NO
                        </th>
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white">
                          DATE
                        </th>
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-right">
                          GRAND TOTAL
                        </th>
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-right">
                          PAID AMOUNT
                        </th>
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-right">
                          BALANCE
                        </th>
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-center">
                          STATUS
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs sm:text-[13px] font-sans">
                      {supplierPurchases.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-12 text-center text-slate-400 font-medium border border-slate-200"
                          >
                            No purchase orders recorded with this supplier.
                          </td>
                        </tr>
                      ) : (
                        supplierPurchases.map((p) => {
                          const paidAmount =
                            p.paidAmount ?? p.grandTotal - (p.balance || 0);
                          return (
                            <tr
                              key={p.id}
                              className="hover:bg-slate-50/70 transition-colors border-b border-slate-200"
                            >
                              <td className="py-3.5 px-4 font-bold text-[#33077C] border border-slate-200 whitespace-nowrap">
                                {p.purchaseNo}
                              </td>
                              <td className="py-3.5 px-4 text-slate-600 font-medium border border-slate-200 whitespace-nowrap">
                                {p.purchaseDate}
                              </td>
                              <td className="py-3.5 px-4 text-right font-bold text-slate-900 border border-slate-200 whitespace-nowrap">
                                ₹{p.grandTotal.toLocaleString("en-IN")}
                              </td>
                              <td className="py-3.5 px-4 text-right font-bold text-emerald-600 border border-slate-200 whitespace-nowrap">
                                ₹{paidAmount.toLocaleString("en-IN")}
                              </td>
                              <td className="py-3.5 px-4 text-right font-bold text-amber-600 border border-slate-200 whitespace-nowrap">
                                ₹{p.balance.toLocaleString("en-IN")}
                              </td>
                              <td className="py-3.5 px-4 text-center border border-slate-200 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${
                                    p.purchaseStatus === "Completed" ||
                                    p.purchaseStatus === "Received"
                                      ? "bg-purple-50/80 text-[#33077C] border-purple-200"
                                      : "bg-indigo-50 text-indigo-700 border-indigo-200"
                                  }`}
                                >
                                  {p.purchaseStatus}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: RETURNS */}
            {activeTab === "returns" && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-slate-200 min-w-[650px]">
                    <thead>
                      <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white uppercase tracking-wider">
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white">
                          RETURN NO
                        </th>
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white">
                          PURCHASE NO
                        </th>
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white">
                          DATE
                        </th>
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-right">
                          RETURN AMOUNT
                        </th>
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-center">
                          STATUS
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs sm:text-[13px] font-sans">
                      {supplierReturns.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-12 text-center text-slate-400 font-medium border border-slate-200"
                          >
                            No purchase returns on record.
                          </td>
                        </tr>
                      ) : (
                        supplierReturns.map((r) => (
                          <tr
                            key={r.id}
                            className="hover:bg-slate-50/70 transition-colors border-b border-slate-200"
                          >
                            <td className="py-3.5 px-4 font-bold text-[#33077C] border border-slate-200 whitespace-nowrap">
                              {r.returnNo}
                            </td>
                            <td className="py-3.5 px-4 text-slate-700 font-medium border border-slate-200 whitespace-nowrap">
                              {r.purchaseNo}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 font-medium border border-slate-200 whitespace-nowrap">
                              {formatDate(r.returnDate)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-slate-900 border border-slate-200 whitespace-nowrap">
                              ₹{r.returnAmount.toLocaleString("en-IN")}
                            </td>
                            <td className="py-3.5 px-4 text-center border border-slate-200 whitespace-nowrap">
                              <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold bg-purple-50/80 text-[#33077C] border border-purple-200 shadow-2xs">
                                {r.returnStatus}
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

            {/* TAB: OUTSTANDING */}
            {activeTab === "outstanding" && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-slate-200 min-w-[650px]">
                    <thead>
                      <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white uppercase tracking-wider">
                        <th className="py-3.5 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">
                          METRIC / FIELD
                        </th>
                        <th className="py-3.5 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-right">
                          VALUE / DETAILS
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs sm:text-[13px] font-sans">
                      <tr className="hover:bg-slate-50/70 transition-colors border-b border-slate-200">
                        <td className="py-3.5 px-5 font-bold text-slate-800 border border-slate-200">
                          Current Outstanding Payable
                        </td>
                        <td className="py-3.5 px-5 text-right font-bold text-amber-600 border border-slate-200">
                          ₹
                          {(selectedSupplier.payable || 0).toLocaleString(
                            "en-IN",
                            { minimumFractionDigits: 2 },
                          )}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/70 transition-colors border-b border-slate-200">
                        <td className="py-3.5 px-5 font-bold text-slate-800 border border-slate-200">
                          Agreed Credit Limit
                        </td>
                        <td className="py-3.5 px-5 text-right font-bold text-slate-900 border border-slate-200">
                          ₹
                          {(selectedSupplier.creditLimit || 0).toLocaleString(
                            "en-IN",
                            { minimumFractionDigits: 2 },
                          )}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/70 transition-colors border-b border-slate-200">
                        <td className="py-3.5 px-5 font-bold text-slate-800 border border-slate-200">
                          Standard Payment Terms
                        </td>
                        <td className="py-3.5 px-5 text-right font-bold text-[#33077C] border border-slate-200">
                          {selectedSupplier.paymentTerms || "Net 30 Days"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="pt-4 flex justify-end items-center gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const supToEdit = selectedSupplier;
                  setIsDetailModalOpen(false);
                  handleOpenEditModal(supToEdit);
                }}
                className="h-10 px-4 rounded-lg border border-purple-200 hover:border-purple-300 text-xs sm:text-[13px] font-bold text-[#33077C] hover:bg-purple-50 transition-all cursor-pointer flex items-center gap-2"
              >
                <Pencil className="w-4 h-4 text-[#33077C]" />
                <span>Edit Supplier</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="h-10 px-5 rounded-lg bg-[#33077C] hover:bg-[#26055d] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ==========================================
          MODAL 3: SUPPLIER HISTORY & AUDIT TRAIL
         ========================================== */}
      {historySupplier && (
        <Modal
          isOpen={Boolean(historySupplier)}
          onClose={() => setHistorySupplier(null)}
          title={`Supplier History & Audit Trail: ${historySupplier.name}`}
          subtitle={
            isLoadingHistory
              ? "Syncing live history from Work API..."
              : "Complete lifecycle progression and vendor audit log"
          }
          maxWidth="md"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setHistorySupplier(null)}
        >
          <HistoryTimelineView
            isLoading={isLoadingHistory}
            eyebrow="Supplier"
            title={historySupplier.name}
            subtitle={
              <>
                {historySupplier.supplierCode}
                {historySupplier.contactPerson ? ` • ${historySupplier.contactPerson}` : ""}
              </>
            }
            amount={{ label: "Payable Balance", value: `₹${Number(historySupplier.payable || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` }}
            badges={[{ label: historySupplier.status, tone: historySupplier.status === "Active" ? "success" : historySupplier.status === "Blocked" ? "danger" : "warning" }]}
            facts={[
              { label: "Total Purchases", value: `₹${Number(historySupplier.totalPurchase || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
              { label: "Total Paid", value: `₹${Number(historySupplier.paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
              { label: "Payment Terms", value: historySupplier.paymentTerms },
              { label: "Credit Limit", value: `₹${Number(historySupplier.creditLimit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
              { label: "Location", value: [historySupplier.city, historySupplier.state].filter(Boolean).join(", ") },
              { label: "GSTIN", value: historySupplier.gstNumber },
            ]}
            events={[
              {
                title: "Supplier Registered",
                at: historySupplier.createdAt,
                tone: "primary",
                description: `${historySupplier.name} was added as a vendor.`,
                details: [
                  { label: "Code", value: historySupplier.supplierCode },
                  { label: "Phone", value: historySupplier.phone },
                  { label: "Email", value: historySupplier.email },
                ],
              },
              ...(historySupplier.updatedAt && historySupplier.updatedAt !== historySupplier.createdAt
                ? [{ title: "Profile Updated", at: historySupplier.updatedAt, tone: "info" as const, description: "Supplier details were last modified." }]
                : []),
              {
                title: "Procurement Summary",
                tone: historySupplier.payable > 0 ? "warning" : "success",
                description: historySupplier.payable > 0 ? "Outstanding amount is payable to this supplier." : "No outstanding payable to this supplier.",
                details: [
                  { label: "Purchased", value: `₹${Number(historySupplier.totalPurchase || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
                  { label: "Paid", value: `₹${Number(historySupplier.paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
                  { label: "Payable", value: `₹${Number(historySupplier.payable || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
                ],
              },
              {
                title: `Account Status: ${historySupplier.status}`,
                tone: historySupplier.status === "Active" ? "success" : historySupplier.status === "Blocked" ? "danger" : "warning",
                description: historySupplier.notes || "Current standing of the supplier account.",
              },
            ]}
            updatedAt={historySupplier.updatedAt}
            onClose={() => setHistorySupplier(null)}
          />
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeletingSupplier) {
            setIsDeleteModalOpen(false);
            setDeleteTargetSupplier(null);
            setDeleteSupplierError(null);
          }
        }}
        onConfirm={handleConfirmDeleteSupplier}
        entityName="Supplier"
        recordName={deleteTargetSupplier?.name}
        isLoading={isDeletingSupplier}
        error={deleteSupplierError}
      />
    </div>
  );
};
