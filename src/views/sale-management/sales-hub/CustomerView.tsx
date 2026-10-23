import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  UsersRound,
  Plus,
  Search,
  Filter,
  Pencil,
  Trash2,
  Phone,
  Mail,
  Building2,
  IndianRupee,
  MapPin,
  CheckCircle2,
  XCircle,
  User,
  MoreVertical,
  Ban,
  Check,
  X,
  Clock,
  Sparkles,
  AlertCircle,
  ShoppingCart,
  RotateCcw,
  CreditCard,
  FileText,
  History,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  UserCheck,
  FileSpreadsheet,
  ShoppingBag,
  Truck,
  RefreshCw,
  Loader2,
} from "lucide-react";
import {
  useSalesManagementStore,
  SalesCustomer,
  CustomerStatus,
  CustomerType,
  SaleQuotation,
  SalesRepresentative,
} from "../../../store/useSalesManagementStore";
import { Badge } from "../../../components/common/Badge";
import { Button } from "../../../components/common/Button";
import { Modal } from "../../../components/common/Modal";
import { Pagination } from "../../../components/common/Pagination";
import { SearchBar } from "../../../components/common/SearchBar";
import { FilterDropdown } from "../../../components/common/FilterDropdown";
import { exportTableToExcel } from "../../../utils/excelExport";
import {
  UniversalShareDropdown,
  formatCustomerShare,
} from "../../../utils/shareUtils";
import { toast } from "sonner";
import { SaleActionDropdown } from "../utils/SaleActionDropdown";
import {
  customerApi,
  CustomerLedgerData,
  mapApiCustomerToSalesCustomer,
  mapSalesCustomerToPayload,
} from "../../../api/commerce/customerApi";
import {
  salesRepresentativeApi,
  ApiSalesRepresentative,
} from "../../../api/commerce/salesRepresentativeApi";
import { collectionApi } from "../../../api/commerce/collectionApi";
import { normalizeIndianPhoneTo10Digits } from "../../../utils/validation";
import { store } from "../../../store/store";
import { baseApi } from "../../../api/baseApi";
import { calculateCustomerOutstanding } from "../../../utils/outstandingBalance";
import { FormLabel, FORM_INPUT_CLS, FORM_INPUT_ERROR_CLS, FORM_SELECT_CLS, FORM_TEXTAREA_CLS } from "../utils/formUtils";

export const CustomerView: React.FC = () => {
  const navigate = useNavigate();
  const {
    customers,
    sales,
    quotations,
    salesReturns,
    paymentIns,
    salesRepresentatives,
    setSalesRepresentativesList,
    collectionFollowUps,
    promisesToPay,
    assignCustomerSalesRep,
    saveCustomer,
    setCustomersList,
    deleteCustomer,
    updateCustomerStatus,
    getCustomerMetrics,
  } = useSalesManagementStore();

  // Live Commerce API State
  const [liveCustomers, setLiveCustomers] = useState<SalesCustomer[]>([]);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState<boolean | null>(null);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const [totalApiRecords, setTotalApiRecords] = useState<number | null>(null);
  const [totalApiPages, setTotalApiPages] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Sales Representatives API State
  const [liveSalesReps, setLiveSalesReps] = useState<ApiSalesRepresentative[]>(
    [],
  );
  const [isSalesRepsLoading, setIsSalesRepsLoading] = useState(false);

  // Available sales representatives (active API list prioritized, fallback to store)
  const availableSalesReps = useMemo(() => {
    if (liveSalesReps && liveSalesReps.length > 0) {
      return liveSalesReps;
    }
    return salesRepresentatives;
  }, [liveSalesReps, salesRepresentatives]);

  // Customer Ledger & Financials Cache by customerId (prevents repeated calls on tab switching)
  const ledgerCacheRef = useRef<Record<string, CustomerLedgerData>>({});
  const [customerLedgerMap, setCustomerLedgerMap] = useState<
    Record<string, CustomerLedgerData>
  >({});
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);

  // Fetch lock refs to guarantee single execution (no double-fetches)
  const isFetchingRef = useRef(false);
  const lastFetchKeyRef = useRef<string | null>(null);
  const isFetchingRepsRef = useRef(false);
  const hasLoadedRepsRef = useRef(false);
  const customerAssignmentsCacheRef = useRef<Map<string, any> | null>(null);
  const setSalesRepresentativesListRef = useRef(setSalesRepresentativesList);
  setSalesRepresentativesListRef.current = setSalesRepresentativesList;

  // Search & Filter State
  const [pendingSearch, setPendingSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [pendingStatus, setPendingStatus] = useState("All");
  const [appliedStatus, setAppliedStatus] = useState("All");
  const [pendingType, setPendingType] = useState("All");
  const [appliedType, setAppliedType] = useState("All");
  const [pendingOutstanding, setPendingOutstanding] = useState("All");
  const [appliedOutstanding, setAppliedOutstanding] = useState("All");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);


  // 3-Dots Action dropdown
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);

  // Share Popover state
  const [activeShareId, setActiveShareId] = useState<string | null>(null);
  const [sharePos, setSharePos] = useState<{
    top?: number;
    bottom?: number;
    right?: number;
  } | null>(null);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<SalesCustomer[]>([]);
  const [pendingSavePayload, setPendingSavePayload] =
    useState<SalesCustomer | null>(null);
  const [deleteTargetCustomer, setDeleteTargetCustomer] =
    useState<SalesCustomer | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);

  const [selectedCustomer, setSelectedCustomer] =
    useState<SalesCustomer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<SalesCustomer | null>(
    null,
  );
  const [activeDetailTab, setActiveDetailTab] = useState<
    | "overview"
    | "quotations"
    | "proformas"
    | "orders"
    | "challans"
    | "sales"
    | "payments"
    | "returns"
    | "outstanding"
    | "collections"
    | "activity"
  >("overview");

  // Customer Sales Rep Assignment Modal State
  const [isChangeRepModalOpen, setIsChangeRepModalOpen] = useState(false);
  const [changeRepTargetCustomer, setChangeRepTargetCustomer] =
    useState<SalesCustomer | null>(null);
  const [selectedRepIdForCustomer, setSelectedRepIdForCustomer] = useState("");
  const [repAssignmentType, setRepAssignmentType] = useState<
    "Primary" | "Temporary"
  >("Primary");
  const [repEffectiveFrom, setRepEffectiveFrom] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [repAssignmentNotes, setRepAssignmentNotes] = useState("");

  const handleOpenChangeRepModal = (customer: SalesCustomer) => {
    if (!hasLoadedRepsRef.current) {
      loadSalesReps();
    }
    setChangeRepTargetCustomer(customer);
    setSelectedRepIdForCustomer(customer.salesRepresentativeId || "");
    setRepAssignmentType(customer.salesRepresentativeType || "Primary");
    setRepEffectiveFrom(
      customer.assignedDate || new Date().toISOString().split("T")[0],
    );
    setRepAssignmentNotes(customer.assignmentNotes || "");
    setIsChangeRepModalOpen(true);
  };

  const handleSaveCustomerRepAssignment = async () => {
    if (!changeRepTargetCustomer) return;
    if (!selectedRepIdForCustomer) {
      toast.error("Please select a sales representative");
      return;
    }
    const rep = availableSalesReps.find(
      (r) => r.id === selectedRepIdForCustomer,
    );
    const repName = rep?.name || "Unassigned";

    // 1. Send remote assignment to Commerce collections API
    try {
      await collectionApi.assignCustomer({
        customerId: changeRepTargetCustomer.id,
        salesRepresentativeId: selectedRepIdForCustomer,
        assignmentType: repAssignmentType,
        effectiveFrom: repEffectiveFrom,
        notes: repAssignmentNotes,
      });
      customerAssignmentsCacheRef.current = null;
    } catch (apiErr: any) {
      const errMsg = apiErr?.response?.data?.error?.message || apiErr?.response?.data?.message || apiErr?.message || "Failed to assign sales representative.";
      toast.error(`Assignment failed: ${errMsg}`);
      return;
    }

    // 2. Update central store
    assignCustomerSalesRep(
      changeRepTargetCustomer.id,
      selectedRepIdForCustomer,
      repAssignmentType,
      repEffectiveFrom,
      repAssignmentNotes,
      repName,
    );

    // 3. Update liveCustomers state in CustomerView
    setLiveCustomers((prev) =>
      prev.map((c) =>
        c.id === changeRepTargetCustomer.id
          ? {
              ...c,
              salesRepresentativeId: selectedRepIdForCustomer,
              salesRepresentativeName: repName,
              salesRepresentativeType: repAssignmentType,
              assignedDate: repEffectiveFrom,
              assignmentNotes: repAssignmentNotes,
            }
          : c,
      ),
    );

    // 4. Update selectedCustomer if open
    if (
      selectedCustomer &&
      selectedCustomer.id === changeRepTargetCustomer.id
    ) {
      setSelectedCustomer({
        ...selectedCustomer,
        salesRepresentativeId: selectedRepIdForCustomer,
        salesRepresentativeName: repName,
        salesRepresentativeType: repAssignmentType,
        assignedDate: repEffectiveFrom,
        assignmentNotes: repAssignmentNotes,
      });
    }

    toast.success(
      `Assigned ${repName} to ${changeRepTargetCustomer.name}!`,
      {
        description: `${repAssignmentType} Rep assignment active from ${repEffectiveFrom}.`,
      },
    );
    store.dispatch(
      baseApi.util.invalidateTags([
        { type: "Customer", id: "LIST" },
        { type: "Customer", id: changeRepTargetCustomer.id },
        "SalesRepresentative",
        "Dashboard",
      ]),
    );
    setIsChangeRepModalOpen(false);
    setChangeRepTargetCustomer(null);
  };

  // React Hook Form Types & Defaults
  interface CustomerFormValues {
    customerCode: string;
    name: string;
    company: string;
    customerType: CustomerType;
    salesRepresentativeId: string;
    phone: string;
    alternatePhone: string;
    email: string;
    gender: string;
    dateOfBirth: string;
    address: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
    gstNumber: string;
    panNumber: string;
    billingAddress: string;
    shippingAddress: string;
    sameAsBilling: boolean;
    creditLimit: number | string;
    paymentTerms: string;
    openingBalance: number | string;
    preferredPaymentMethod: string;
    status: CustomerStatus;
    tags: string;
    notes: string;
  }

  const defaultCustomerFormValues: CustomerFormValues = {
    customerCode: "",
    name: "",
    company: "",
    customerType: "Business",
    salesRepresentativeId: "",
    phone: "",
    alternatePhone: "",
    email: "",
    gender: "",
    dateOfBirth: "",
    address: "",
    city: "",
    state: "",
    country: "",
    pincode: "",
    gstNumber: "",
    panNumber: "",
    billingAddress: "",
    shippingAddress: "",
    sameAsBilling: true,
    creditLimit: "",
    paymentTerms: "",
    openingBalance: "",
    preferredPaymentMethod: "",
    status: "Active",
    tags: "",
    notes: "",
  };

  // React Hook Form instance for Customer Form Modal
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    mode: "onChange",
    defaultValues: defaultCustomerFormValues,
  });

  const watchSameAsBilling = watch("sameAsBilling");

  // Keystroke sanitizer: disallow typing numeric characters in text-only fields
  const handleTextOnlyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
    }
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

  // Close action & share dropdown on click outside or scroll
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
    window.addEventListener("click", handleOutside);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("click", handleOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [activeDropdownId, activeShareId]);

  // Master API Loader with strict deduplication guards to ensure zero redundant calls
  const loadCustomers = useCallback(
    async (forceRefresh = false) => {
      const fetchKey = `${currentPage}_${pageSize}_${appliedSearch.trim()}_${appliedStatus}_${appliedType}`;

      // Prevent concurrent calls or redundant re-fetching of identical parameters
      if (isFetchingRef.current) return;
      if (!forceRefresh && lastFetchKeyRef.current === fetchKey) return;

      isFetchingRef.current = true;
      lastFetchKeyRef.current = fetchKey;
      setIsApiLoading(true);

      try {
        const needAssignments = forceRefresh || !customerAssignmentsCacheRef.current;
        const [res, assignmentsRes] = await Promise.allSettled([
          customerApi.getCustomers({
            page_no: currentPage,
            page_size: pageSize,
            pagination_required: true,
            search: appliedSearch.trim() || undefined,
            sortOrder: "desc",
            status: appliedStatus.toUpperCase() !== "ALL" ? appliedStatus : undefined,
            customerType: appliedType.toUpperCase() !== "ALL" ? appliedType : undefined,
          }),
          needAssignments ? collectionApi.getCustomerAssignments({ limit: 1000 }) : Promise.resolve(null),
        ]);

        if (res.status === "fulfilled" && res.value && res.value.success && Array.isArray(res.value.data)) {
          const apiData = res.value.data;

          let assignmentMap = customerAssignmentsCacheRef.current || new Map<string, any>();
          if (
            assignmentsRes.status === "fulfilled" &&
            assignmentsRes.value &&
            assignmentsRes.value.success &&
            Array.isArray(assignmentsRes.value.data)
          ) {
            assignmentMap = new Map<string, any>();
            assignmentsRes.value.data.forEach((item: any) => {
              const custId = item.id || item.customerId;
              if (custId) assignmentMap.set(custId, item);
            });
            customerAssignmentsCacheRef.current = assignmentMap;
          }

          const storeCustMap = new Map<string, SalesCustomer>();
          customers.forEach((c) => storeCustMap.set(c.id, c));

          const mapped = apiData.map((c) => {
            const base = mapApiCustomerToSalesCustomer(c);
            const assignment = assignmentMap.get(base.id);
            const existing = storeCustMap.get(base.id);

            const salesRepresentativeId =
              base.salesRepresentativeId ||
              assignment?.salesRepresentative?.id ||
              assignment?.salesRepresentativeId ||
              existing?.salesRepresentativeId;

            const salesRepresentativeName =
              base.salesRepresentativeName ||
              assignment?.salesRepresentative?.name ||
              assignment?.salesRepresentativeName ||
              existing?.salesRepresentativeName;

            const salesRepresentativeType =
              base.salesRepresentativeType ||
              assignment?.salesRepresentative?.type ||
              existing?.salesRepresentativeType ||
              "Primary";

            const assignedDate =
              base.assignedDate ||
              assignment?.assignedDate ||
              existing?.assignedDate;

            const assignmentNotes =
              base.assignmentNotes ||
              existing?.assignmentNotes;

            return {
              ...base,
              salesRepresentativeId,
              salesRepresentativeName,
              salesRepresentativeType,
              assignedDate,
              assignmentNotes,
            };
          });

          setLiveCustomers(mapped);
          setIsApiConnected(true);
          setApiErrorMessage(null);

          if (res.value.pagination) {
            setTotalApiRecords(res.value.pagination.totalRecords);
            setTotalApiPages(res.value.pagination.totalPages);
          }

          // Keep local store in sync
          setCustomersList(mapped);
        }
      } catch (err: any) {
        console.warn(
          "Commerce Customer API call failed, falling back to local storage cache:",
          err?.message || err,
        );
        setIsApiConnected(false);
        setApiErrorMessage(err?.message || "Using local database");
      } finally {
        isFetchingRef.current = false;
        setIsApiLoading(false);
      }
    },
    [
      currentPage,
      pageSize,
      appliedSearch,
      appliedStatus,
      appliedType,
      setCustomersList,
    ],
  );

  // Single effect to load customers on query/page changes
  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Load sales representatives from Commerce API with deduplication guards
  const loadSalesReps = useCallback(async (forceRefresh = false) => {
    if (isFetchingRepsRef.current) return;
    if (!forceRefresh && hasLoadedRepsRef.current) return;

    isFetchingRepsRef.current = true;
    setIsSalesRepsLoading(true);
    try {
      const res = await salesRepresentativeApi.getList({
        limit: 200,
      });
      if (res && res.success && Array.isArray(res.data)) {
        hasLoadedRepsRef.current = true;
        setLiveSalesReps(res.data);
        const mappedReps: SalesRepresentative[] = res.data.map((r) => ({
          id: r.id,
          name: r.name,
          mobile: r.mobile,
          email: r.email,
          designation: r.designation,
          status: r.status,
          createdAt: r.createdAt || new Date().toISOString(),
          updatedAt: r.updatedAt || new Date().toISOString(),
        }));
        setSalesRepresentativesListRef.current(mappedReps);
      }
    } catch (err: any) {
      console.warn(
        "Failed to fetch sales representatives for customer view:",
        err?.message || err,
      );
    } finally {
      isFetchingRepsRef.current = false;
      setIsSalesRepsLoading(false);
    }
  }, []);

  // Single mount effect to load sales representatives once
  useEffect(() => {
    loadSalesReps();
  }, [loadSalesReps]);

  // Debounced Search (600ms) - waits until typing completes before triggering API
  useEffect(() => {
    const handler = setTimeout(() => {
      if (pendingSearch.trim() !== appliedSearch.trim()) {
        setAppliedSearch(pendingSearch.trim());
        setCurrentPage(1);
      }
    }, 600);
    return () => clearTimeout(handler);
  }, [pendingSearch, appliedSearch]);

  const handleManualRefresh = () => {
    lastFetchKeyRef.current = null;
    loadCustomers(true);
    loadSalesReps(true);
    toast.info("Refreshing customers from Commerce API...");
  };

  // Real-time calculation of customer summaries
  const customerFinancialMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calculateCustomerOutstanding>>();
    const allKnown =
      isApiConnected && liveCustomers.length > 0 ? liveCustomers : customers;
    allKnown.forEach((c) => {
      map.set(
        c.id,
        calculateCustomerOutstanding(
          c,
          sales as any,
          salesReturns as any,
          paymentIns as any,
        ),
      );
    });
    return map;
  }, [
    customers,
    liveCustomers,
    isApiConnected,
    sales,
    salesReturns,
    paymentIns,
  ]);

  // Overall Summary Metrics (5 Cards)
  const summary = useMemo(() => {
    const listToAnalyze =
      isApiConnected && liveCustomers.length > 0 ? liveCustomers : customers;
    const totalCount =
      isApiConnected && totalApiRecords !== null
        ? totalApiRecords
        : listToAnalyze.length;
    const activeCount = listToAnalyze.filter(
      (c) => c.status === "Active",
    ).length;
    const newCount = listToAnalyze.filter((c) => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
      return new Date(c.createdAt) >= thirtyDaysAgo;
    }).length;

    let withOutstandingCount = 0;
    let totalReceivable = 0;

    listToAnalyze.forEach((c) => {
      const m = customerFinancialMap.get(c.id);
      const out = m ? m.outstandingAmount : c.outstandingAmount || 0;
      if (out > 0) {
        withOutstandingCount++;
        totalReceivable += out;
      }
    });

    return {
      totalCount,
      activeCount,
      newCount,
      withOutstandingCount,
      totalReceivable,
    };
  }, [
    customers,
    liveCustomers,
    isApiConnected,
    totalApiRecords,
    customerFinancialMap,
  ]);

  // Open Create Customer Modal
  const handleOpenCreateModal = () => {
    if (!hasLoadedRepsRef.current) {
      loadSalesReps();
    }
    reset({
      ...defaultCustomerFormValues,
      customerCode: "",
    });
    setEditingCustomer(null);
    setIsFormModalOpen(true);
  };

  // Open Edit Customer Modal
  const handleOpenEditModal = (customer: SalesCustomer) => {
    if (!hasLoadedRepsRef.current) {
      loadSalesReps();
    }
    reset({
      customerCode: customer.customerCode,
      name: customer.name,
      company: customer.company || "",
      customerType: customer.customerType || "Business",
      phone: customer.phone,
      alternatePhone: customer.alternatePhone || "",
      email: customer.email,
      gender: customer.gender || "",
      dateOfBirth: customer.dateOfBirth || "",
      address: customer.address || "",
      city: customer.city || "",
      state: customer.state || "",
      country: customer.country || "",
      pincode: customer.pincode || "",
      gstNumber: customer.gstNumber || "",
      panNumber: customer.panNumber || "",
      billingAddress: customer.billingAddress || customer.address || "",
      shippingAddress: customer.shippingAddress || customer.address || "",
      sameAsBilling: customer.sameAsBilling !== false,
      creditLimit:
        customer.creditLimit !== undefined && customer.creditLimit !== null
          ? customer.creditLimit
          : "",
      paymentTerms: customer.paymentTerms || "",
      openingBalance:
        customer.openingBalance !== undefined &&
        customer.openingBalance !== null
          ? customer.openingBalance
          : "",
      preferredPaymentMethod: customer.preferredPaymentMethod || "",
      status: customer.status || "Active",
      salesRepresentativeId: customer.salesRepresentativeId || "",
      tags: customer.tags ? customer.tags.join(", ") : "",
      notes: customer.notes || "",
    });
    setEditingCustomer(customer);
    setIsFormModalOpen(true);
  };

  // Duplicate check before saving
  const checkDuplicates = (
    phone: string,
    email: string,
    customerCode: string,
    excludeId?: string,
  ): SalesCustomer[] => {
    const cleanPhone = normalizeIndianPhoneTo10Digits(phone);
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = customerCode.trim().toLowerCase();

    return customers.filter((c) => {
      if (excludeId && c.id === excludeId) return false;
      const cPhone = normalizeIndianPhoneTo10Digits(c.phone || "");
      const cEmail = (c.email || "").trim().toLowerCase();
      const cCode = (c.customerCode || "").trim().toLowerCase();

      const phoneMatch = Boolean(
        cleanPhone &&
        cPhone &&
        cleanPhone.length === 10 &&
        cPhone.length === 10 &&
        cleanPhone === cPhone,
      );
      const emailMatch = Boolean(cleanEmail && cEmail && cleanEmail === cEmail);
      const codeMatch = Boolean(cleanCode && cCode && cleanCode === cCode);

      return phoneMatch || emailMatch || codeMatch;
    });
  };

  // Handle form validation errors with informative toast and field focus
  const onFormInvalid = (formErrors: any) => {
    console.warn("Customer form validation failed:", formErrors);
    const errorKeys = Object.keys(formErrors);
    if (errorKeys.length > 0) {
      const firstKey = errorKeys[0];
      const message =
        formErrors[firstKey]?.message ||
        `Please check the ${firstKey.replace(/([A-Z])/g, " $1").toLowerCase()} field`;
      toast.error(message);

      const el = document.querySelector(`[name="${firstKey}"]`) as HTMLElement;
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  // Handle form submission via react-hook-form
  const onFormSubmit = (data: CustomerFormValues) => {
    const selectedRep = availableSalesReps.find(
      (r) => r.id === data.salesRepresentativeId,
    );
    const payload: SalesCustomer = {
      id: editingCustomer ? editingCustomer.id : `cust_${Date.now()}`,
      customerCode: (editingCustomer
        ? editingCustomer.customerCode
        : data.customerCode || ""
      ).trim(),
      name: data.name.trim(),
      company: data.company.trim() || undefined,
      customerType: data.customerType,
      salesRepresentativeId: data.salesRepresentativeId || undefined,
      salesRepresentativeName: selectedRep ? selectedRep.name : undefined,
      phone: normalizeIndianPhoneTo10Digits(data.phone),
      alternatePhone: data.alternatePhone.trim()
        ? normalizeIndianPhoneTo10Digits(data.alternatePhone)
        : undefined,
      email: data.email.trim(),
      gender: data.gender || undefined,
      dateOfBirth: data.dateOfBirth || undefined,
      address: data.address.trim(),
      city: data.city.trim(),
      state: data.state.trim(),
      country: data.country.trim(),
      pincode: data.pincode.trim(),
      gstNumber: data.gstNumber.trim().toUpperCase() || undefined,
      panNumber: data.panNumber.trim().toUpperCase() || undefined,
      billingAddress: data.billingAddress.trim() || data.address.trim(),
      shippingAddress: data.sameAsBilling
        ? data.billingAddress.trim() || data.address.trim()
        : data.shippingAddress.trim() || data.address.trim(),
      sameAsBilling: data.sameAsBilling,
      creditLimit:
        data.creditLimit !== "" && !isNaN(Number(data.creditLimit))
          ? Number(data.creditLimit)
          : 0,
      paymentTerms: data.paymentTerms.trim(),
      openingBalance:
        data.openingBalance !== "" && !isNaN(Number(data.openingBalance))
          ? Number(data.openingBalance)
          : 0,
      preferredPaymentMethod: data.preferredPaymentMethod || undefined,
      status: data.status,
      notes: data.notes.trim() || undefined,
      tags: data.tags
        ? data.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      activities: editingCustomer?.activities || [],
      createdAt: editingCustomer?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Duplicate prevention check
    const matches = checkDuplicates(
      payload.phone,
      payload.email,
      payload.customerCode,
      editingCustomer?.id,
    );

    if (matches.length > 0) {
      setDuplicateMatches(matches);
      setPendingSavePayload(payload);
      setIsDuplicateModalOpen(true);
      return;
    }

    commitSaveCustomer(payload);
  };

  // Open Customer Detail Modal with on-demand cached ledger fetch
  const handleOpenDetailModal = (customer: SalesCustomer) => {
    setSelectedCustomer(customer);
    setActiveDetailTab("overview");
    setIsDetailModalOpen(true);

    // If ledger is not cached yet, fetch it once
    if (!ledgerCacheRef.current[customer.id]) {
      setIsLoadingLedger(true);
      Promise.allSettled([
        customerApi.getCustomerLedger(customer.id),
        customerApi.getCustomerById(customer.id),
      ])
        .then(([ledgerRes, detailRes]) => {
          if (ledgerRes.status === "fulfilled" && ledgerRes.value?.success) {
            const ledgerData = ledgerRes.value.data;
            ledgerCacheRef.current[customer.id] = ledgerData;
            setCustomerLedgerMap((prev) => ({
              ...prev,
              [customer.id]: ledgerData,
            }));
          }
          if (
            detailRes.status === "fulfilled" &&
            detailRes.value?.success &&
            detailRes.value.data
          ) {
            const enriched = mapApiCustomerToSalesCustomer(
              detailRes.value.data,
            );
            setSelectedCustomer((prev) =>
              prev?.id === customer.id ? { ...prev, ...enriched } : prev,
            );
          }
        })
        .catch((err) => {
          console.warn("Customer detail or ledger API failed:", err);
        })
        .finally(() => {
          setIsLoadingLedger(false);
        });
    }
  };

  const commitSaveCustomer = async (payload: SalesCustomer) => {
    setIsSubmitting(true);
    try {
      const apiPayload = mapSalesCustomerToPayload(payload);

      if (editingCustomer) {
        try {
          const res = await customerApi.updateCustomer(
            editingCustomer.id,
            apiPayload,
          );
          const rawData = res?.data || (res as any)?.customer || res;
          if (rawData && (rawData.id || res?.success)) {
            const updated = mapApiCustomerToSalesCustomer(
              rawData.id ? rawData : res.data || rawData,
            );
            if (payload.salesRepresentativeId) {
              updated.salesRepresentativeId = payload.salesRepresentativeId;
              updated.salesRepresentativeName = payload.salesRepresentativeName;
              updated.salesRepresentativeType = payload.salesRepresentativeType;
              try {
                await collectionApi.assignCustomer({
                  customerId: updated.id,
                  salesRepresentativeId: payload.salesRepresentativeId,
                  assignmentType: payload.salesRepresentativeType || "Primary",
                });
              } catch (assignErr) {
                console.warn("Assign sales rep on update failed:", assignErr);
              }
              assignCustomerSalesRep(
                updated.id,
                payload.salesRepresentativeId,
                payload.salesRepresentativeType || "Primary",
                undefined,
                undefined,
                payload.salesRepresentativeName,
              );
            }
            saveCustomer(updated);
            setLiveCustomers((prev) =>
              prev.map((c) => (c.id === updated.id ? updated : c)),
            );
            toast.success(`Customer ${updated.name} updated successfully.`);
            store.dispatch(
              baseApi.util.invalidateTags([
                { type: "Customer", id: "LIST" },
                { type: "Customer", id: updated.id },
                "SalesRepresentative",
                "Dashboard",
              ]),
            );
            setIsFormModalOpen(false);
            setIsDuplicateModalOpen(false);
            setPendingSavePayload(null);
            if (selectedCustomer && selectedCustomer.id === updated.id) {
              setSelectedCustomer(updated);
            }
            return;
          }
        } catch (apiErr: any) {
          const errorCode =
            apiErr?.response?.data?.error?.code || apiErr?.response?.data?.code;
          const errorMsg =
            apiErr?.response?.data?.error?.message ||
            apiErr?.response?.data?.message ||
            apiErr?.message ||
            "";

          const isDuplicateCode =
            errorCode === "DUPLICATE_CUSTOMER_CODE" ||
            errorMsg.toLowerCase().includes("customer code already exists");

          if (isDuplicateCode) {
            setError("customerCode", {
              type: "manual",
              message:
                "This Customer Code already exists. Please enter a different code or leave blank to auto-generate.",
            });
            toast.error(
              "Customer Code already exists. Please enter a different code or leave blank to auto-generate.",
            );
            return;
          }

          const errMsg =
            apiErr?.response?.data?.error?.fields?.[0]?.message ||
            errorMsg ||
            "Failed to update customer.";
          toast.error(`Customer update failed: ${errMsg}`);
          return;
        }
      } else {
        try {
          const res = await customerApi.createCustomer(apiPayload);
          const rawData = res?.data || (res as any)?.customer || res;
          if (rawData && (rawData.id || res?.success)) {
            const created = mapApiCustomerToSalesCustomer(
              rawData.id ? rawData : res.data || rawData,
            );
            if (payload.salesRepresentativeId) {
              created.salesRepresentativeId = payload.salesRepresentativeId;
              created.salesRepresentativeName = payload.salesRepresentativeName;
              created.salesRepresentativeType = payload.salesRepresentativeType;
              try {
                await collectionApi.assignCustomer({
                  customerId: created.id,
                  salesRepresentativeId: payload.salesRepresentativeId,
                  assignmentType: payload.salesRepresentativeType || "Primary",
                });
              } catch (assignErr) {
                console.warn("Assign sales rep on create failed:", assignErr);
              }
              assignCustomerSalesRep(
                created.id,
                payload.salesRepresentativeId,
                payload.salesRepresentativeType || "Primary",
                undefined,
                undefined,
                payload.salesRepresentativeName,
              );
            }
            saveCustomer(created);
            setLiveCustomers((prev) => [created, ...prev]);
            customerAssignmentsCacheRef.current = null;
            toast.success(
              `Customer ${created.name} registered successfully via Commerce API.`,
            );
            store.dispatch(
              baseApi.util.invalidateTags([
                { type: "Customer", id: "LIST" },
                { type: "Customer", id: created.id },
                "SalesRepresentative",
                "Dashboard",
              ]),
            );
            setIsFormModalOpen(false);
            setIsDuplicateModalOpen(false);
            setPendingSavePayload(null);
            return;
          }
        } catch (apiErr: any) {
          const errorCode =
            apiErr?.response?.data?.error?.code || apiErr?.response?.data?.code;
          const errorMsg =
            apiErr?.response?.data?.error?.message ||
            apiErr?.response?.data?.message ||
            apiErr?.message ||
            "";

          const isDuplicateCode =
            errorCode === "DUPLICATE_CUSTOMER_CODE" ||
            errorMsg.toLowerCase().includes("customer code already exists");

          if (isDuplicateCode) {
            setError("customerCode", {
              type: "manual",
              message:
                "This Customer Code already exists. Please enter a different code or leave blank to auto-generate.",
            });
            toast.error(
              "Customer Code already exists. Please enter a different code or leave blank to auto-generate.",
            );
            return;
          }

          const errMsg =
            apiErr?.response?.data?.error?.fields?.[0]?.message ||
            errorMsg ||
            "Failed to register customer.";
          toast.error(`Customer creation failed: ${errMsg}`);
          return;
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCustomerStatus = async (
    target: SalesCustomer,
    newStatus: CustomerStatus,
  ) => {
    try {
      await customerApi.patchCustomer(target.id, { status: newStatus });
      toast.success(`Customer ${target.name} set to ${newStatus}.`);
      updateCustomerStatus(target.id, newStatus);
      setLiveCustomers((prev) =>
        prev.map((c) => (c.id === target.id ? { ...c, status: newStatus } : c)),
      );
      store.dispatch(
        baseApi.util.invalidateTags([
          { type: "Customer", id: "LIST" },
          { type: "Customer", id: target.id },
          "SalesRepresentative",
          "Dashboard",
        ]),
      );
      if (selectedCustomer && selectedCustomer.id === target.id) {
        setSelectedCustomer((prev) =>
          prev ? { ...prev, status: newStatus } : null,
        );
      }
    } catch (apiErr: any) {
      const errMsg =
        apiErr?.response?.data?.error?.message ||
        apiErr?.response?.data?.message ||
        apiErr?.message ||
        "Failed to update customer status.";
      toast.error(`Status update failed: ${errMsg}`);
    }
  };

  const handleOpenDeleteModal = (target: SalesCustomer) => {
    setDeleteTargetCustomer(target);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteCustomer = async () => {
    if (!deleteTargetCustomer) return;
    setIsDeletingCustomer(true);
    try {
      await customerApi.deleteCustomer(deleteTargetCustomer.id);
      toast.success(
        `Customer "${deleteTargetCustomer.name}" deleted successfully.`,
      );
      customerAssignmentsCacheRef.current = null;
      deleteCustomer(deleteTargetCustomer.id);
      setLiveCustomers((prev) =>
        prev.filter((c) => c.id !== deleteTargetCustomer.id),
      );
      store.dispatch(
        baseApi.util.invalidateTags([
          { type: "Customer", id: "LIST" },
          { type: "Customer", id: deleteTargetCustomer.id },
          "SalesRepresentative",
          "Dashboard",
        ]),
      );
      if (selectedCustomer && selectedCustomer.id === deleteTargetCustomer.id) {
        setIsDetailModalOpen(false);
        setSelectedCustomer(null);
      }
      setIsDeleteModalOpen(false);
      setDeleteTargetCustomer(null);
    } catch (apiErr: any) {
      const errMsg =
        apiErr?.response?.data?.error?.message ||
        apiErr?.response?.data?.message ||
        apiErr?.message ||
        "Failed to delete customer.";
      toast.error(`Delete failed: ${errMsg}`);
    } finally {
      setIsDeletingCustomer(false);
    }
  };

  // Filtered and Paginated Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = appliedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.customerCode.toLowerCase().includes(q) ||
        (c.company && c.company.toLowerCase().includes(q)) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q);

      const matchesStatus =
        appliedStatus === "All" ||
        c.status.toLowerCase() === appliedStatus.toLowerCase();

      const matchesType =
        appliedType === "All" ||
        c.customerType.toLowerCase() === appliedType.toLowerCase();

      const financials = customerFinancialMap.get(c.id);
      const out = financials?.outstandingAmount || c.outstandingAmount || 0;
      const matchesOutstanding =
        appliedOutstanding === "All"
          ? true
          : appliedOutstanding === "With Outstanding"
            ? out > 0
            : out === 0;

      return (
        matchesSearch && matchesStatus && matchesType && matchesOutstanding
      );
    });
  }, [
    customers,
    appliedSearch,
    appliedStatus,
    appliedType,
    appliedOutstanding,
    customerFinancialMap,
  ]);

  const totalPages = Math.ceil(filteredCustomers.length / pageSize) || 1;
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  // Display Customers: Use live Commerce dataset when connected, fallback to local paginated
  const displayCustomers = useMemo(() => {
    if (isApiConnected && liveCustomers.length > 0) {
      if (appliedOutstanding === "With Outstanding") {
        return liveCustomers.filter((c) => (c.outstandingAmount || 0) > 0);
      }
      if (appliedOutstanding === "Zero Balance") {
        return liveCustomers.filter((c) => (c.outstandingAmount || 0) === 0);
      }
      return liveCustomers;
    }
    return paginatedCustomers;
  }, [isApiConnected, liveCustomers, appliedOutstanding, paginatedCustomers]);

  const displayedTotalRecords = useMemo(() => {
    if (isApiConnected && totalApiRecords !== null) {
      return totalApiRecords;
    }
    return filteredCustomers.length;
  }, [isApiConnected, totalApiRecords, filteredCustomers.length]);

  // Selected Customer Linked Entities
  // Related Customer Documents
  const selectedCustomerQuotations = useMemo(() => {
    if (!selectedCustomer) return [];
    return quotations.filter(
      (q) =>
        q.customerId === selectedCustomer.id ||
        q.partyName?.toLowerCase() === selectedCustomer.name?.toLowerCase(),
    );
  }, [quotations, selectedCustomer]);

  const selectedCustomerProformas = useMemo(() => {
    if (!selectedCustomer) return [];
    try {
      const raw = localStorage.getItem("yaa_crm_proforma_invoices");
      const all = raw ? JSON.parse(raw) : [];
      return all.filter(
        (p: any) =>
          p.customerId === selectedCustomer.id ||
          p.partyName?.toLowerCase() === selectedCustomer.name?.toLowerCase(),
      );
    } catch {
      return [];
    }
  }, [selectedCustomer]);

  const selectedCustomerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    try {
      const raw = localStorage.getItem("yaa_crm_sale_orders");
      const all = raw ? JSON.parse(raw) : [];
      return all.filter(
        (o: any) =>
          o.customerId === selectedCustomer.id ||
          o.partyName?.toLowerCase() === selectedCustomer.name?.toLowerCase(),
      );
    } catch {
      return [];
    }
  }, [selectedCustomer]);

  const selectedCustomerChallans = useMemo(() => {
    if (!selectedCustomer) return [];
    try {
      const raw = localStorage.getItem("yaa_crm_delivery_challans");
      const all = raw ? JSON.parse(raw) : [];
      return all.filter(
        (c: any) =>
          c.customerId === selectedCustomer.id ||
          c.partyName?.toLowerCase() === selectedCustomer.name?.toLowerCase(),
      );
    } catch {
      return [];
    }
  }, [selectedCustomer]);

  const selectedCustomerSales = useMemo(() => {
    if (!selectedCustomer) return [];
    return sales.filter(
      (s) =>
        s.customerId === selectedCustomer.id ||
        s.customerName?.toLowerCase() === selectedCustomer.name?.toLowerCase(),
    );
  }, [sales, selectedCustomer]);

  const selectedCustomerReturns = useMemo(() => {
    if (!selectedCustomer) return [];
    return salesReturns.filter(
      (r) =>
        r.customerId === selectedCustomer.id ||
        r.customerName?.toLowerCase() === selectedCustomer.name?.toLowerCase(),
    );
  }, [salesReturns, selectedCustomer]);

  const selectedCustomerMetrics = useMemo(() => {
    if (!selectedCustomer) return null;
    return calculateCustomerOutstanding(
      selectedCustomer,
      sales as any,
      salesReturns as any,
      paymentIns as any,
    );
  }, [selectedCustomer, sales, salesReturns, paymentIns]);

  const selectedCustomerCollectionData = useMemo(() => {
    if (!selectedCustomer) return null;
    const todayStr = "2026-10-08";
    const rep =
      availableSalesReps.find(
        (r) => r.id === selectedCustomer.salesRepresentativeId,
      ) ||
      (selectedCustomer.salesRepresentativeName
        ? {
            id: selectedCustomer.salesRepresentativeId || "",
            name: selectedCustomer.salesRepresentativeName,
            mobile: "",
            status: "Active" as const,
          }
        : null);

    const custSales = sales.filter(
      (s) =>
        s.customerId === selectedCustomer.id ||
        s.customerName?.toLowerCase() === selectedCustomer.name?.toLowerCase(),
    );

    const totalOutstanding = custSales.reduce(
      (acc, s) =>
        acc +
        (s.balance ?? Math.max(0, (s.grandTotal || 0) - (s.paidAmount || 0))),
      0,
    );

    const overdueSales = custSales.filter((s) => {
      const bal =
        s.balance ?? Math.max(0, (s.grandTotal || 0) - (s.paidAmount || 0));
      return bal > 0 && s.dueDate && s.dueDate < todayStr;
    });

    const overdueAmount = overdueSales.reduce(
      (acc, s) =>
        acc +
        (s.balance ?? Math.max(0, (s.grandTotal || 0) - (s.paidAmount || 0))),
      0,
    );

    const custPayments = paymentIns
      .filter((p) => p.customerId === selectedCustomer.id)
      .sort((a, b) => (b.paymentDate || "").localeCompare(a.paymentDate || ""));
    const lastPayment = custPayments[0] || null;

    const custFollowUps = collectionFollowUps
      .filter((f) => f.customerId === selectedCustomer.id)
      .sort((a, b) =>
        (b.followUpDate || "").localeCompare(a.followUpDate || ""),
      );
    const nextFollowUp =
      custFollowUps.find(
        (f) => f.nextFollowUpDate && f.nextFollowUpDate >= todayStr,
      ) ||
      custFollowUps[0] ||
      null;

    const custPromises = promisesToPay
      .filter((p) => p.customerId === selectedCustomer.id)
      .sort((a, b) => (b.promiseDate || "").localeCompare(a.promiseDate || ""));

    return {
      rep,
      totalOutstanding,
      overdueAmount,
      overdueCount: overdueSales.length,
      lastPayment,
      nextFollowUpDate: nextFollowUp?.nextFollowUpDate || null,
      followUps: custFollowUps,
      promises: custPromises,
      invoicesWithBalance: custSales.filter(
        (s) =>
          (s.balance ??
            Math.max(0, (s.grandTotal || 0) - (s.paidAmount || 0))) > 0,
      ),
    };
  }, [
    selectedCustomer,
    availableSalesReps,
    sales,
    paymentIns,
    collectionFollowUps,
    promisesToPay,
  ]);

  const getCustomerInitials = (name?: string): string => {
    if (!name) return "CU";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getStatusBadge = (status: CustomerStatus) => {
    switch (status) {
      case "Active":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Active
          </span>
        );
      case "Inactive":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Inactive
          </span>
        );
      case "Blocked":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Blocked
          </span>
        );
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredCustomers.length === 0) {
      toast.error("No customers to export");
      return;
    }

    const excelRows = filteredCustomers.map((c, idx) => ({
      sNo: idx + 1,
      customerCode: c.customerCode,
      name: c.name,
      company: c.company || "-",
      phone: c.phone,
      email: c.email || "-",
      customerType: c.customerType,
      creditLimit: Number(c.creditLimit || 0),
      outstanding: Number(c.outstandingAmount || 0),
      status: c.status,
    }));

    exportTableToExcel({
      filename: `Customers_Report_${new Date().toISOString().split("T")[0]}`,
      sheetName: "Customers ",
      title: "YAA CREATIONS CRM - CUSTOMER  DIRECTORY",
      subtitle: `Total Customers: ${filteredCustomers.length} | Generated: ${new Date().toLocaleDateString()}`,
      columns: [
        { header: "#", key: "sNo", align: "center", width: 8 },
        {
          header: "Customer ID",
          key: "customerCode",
          align: "center",
          width: 14,
        },
        { header: "Customer Name", key: "name", align: "left", width: 26 },
        { header: "Company", key: "company", align: "left", width: 22 },
        { header: "Phone", key: "phone", align: "left", width: 18 },
        { header: "Email", key: "email", align: "left", width: 24 },
        { header: "Type", key: "customerType", align: "center", width: 14 },
        {
          header: "Credit Limit (₹)",
          key: "creditLimit",
          align: "right",
          type: "currency",
          width: 18,
        },
        {
          header: "Outstanding (₹)",
          key: "outstanding",
          align: "right",
          type: "currency",
          width: 18,
        },
        { header: "Status", key: "status", align: "center", width: 14 },
      ],
      data: excelRows,
      summaryRow: {
        sNo: "TOTAL",
        name: `${filteredCustomers.length} Customers`,
        outstanding: summary.totalReceivable,
      },
    });

    toast.success(
      `Customers Excel report downloaded (${filteredCustomers.length} records)!`,
    );
  };

  return (
    <div className="space-y-5 pb-16 font-sans">
      {/* 1. TOP HEADER CARD */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
              <UsersRound className="w-4.5 h-4.5" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Customer
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-[#33077C] border border-purple-200">
                {displayedTotalRecords} total
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Manage customer accounts, sales relationships, credit terms, and
            360-degree document histories.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto shrink-0">
          <Button
            variant="secondary"
            size="md"
            onClick={handleExportExcel}
            className="w-full sm:w-auto justify-center"
            icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
          >
            Excel Report
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleOpenCreateModal}
            className="w-full sm:w-auto justify-center"
            icon={<Plus className="w-4 h-4 text-white stroke-[2.5]" />}
          >
            Add Customer
          </Button>
        </div>
      </div>

      {/* 2. SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Customers */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Customers
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {summary.totalCount}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              All registered client accounts
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#33077C] flex items-center justify-center font-bold shrink-0">
            <UsersRound className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Active Accounts */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-emerald-600 uppercase tracking-wider">
              Active Accounts
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
              {summary.activeCount}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              Ready for invoicing & orders
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: With Outstanding */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-amber-600 uppercase tracking-wider">
              With Outstanding
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-600 mt-1">
              {summary.withOutstandingCount}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              Unsettled accounts
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Total Receivable */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-rose-600 uppercase tracking-wider">
              Total Outstanding
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-600 mt-1">
              ₹
              {summary.totalReceivable.toLocaleString("en-IN", {
                maximumFractionDigits: 0,
              })}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              Receivable ledger balance
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. SEARCH BAR & FILTER ROW */}
      <SearchBar
        value={pendingSearch}
        onChange={(val) => {
          setPendingSearch(val);
        }}
        placeholder="Search by customer name, code, phone, email, company..."
        onSubmit={() => {
          setAppliedSearch(pendingSearch.trim());
          setCurrentPage(1);
        }}
        onReset={() => {
          setPendingSearch("");
          setAppliedSearch("");
          setPendingStatus("All");
          setAppliedStatus("All");
          setPendingType("All");
          setAppliedType("All");
          setPendingOutstanding("All");
          setAppliedOutstanding("All");
          setCurrentPage(1);
        }}
        filterSlot={
          <div className="flex items-center gap-2.5 flex-wrap">
            <FilterDropdown
              placeholder="Status : All"
              value={pendingStatus}
              options={[
                { label: "Status : All", value: "All" },
                { label: "Active", value: "Active", dotColor: "#10b981" },
                { label: "Inactive", value: "Inactive", dotColor: "#64748b" },
                { label: "Blocked", value: "Blocked", dotColor: "#ef4444" },
              ]}
              onChange={(val) => {
                setPendingStatus(val);
                setAppliedStatus(val);
                setCurrentPage(1);
              }}
            />
            <FilterDropdown
              placeholder="Type : All"
              value={pendingType}
              options={[
                { label: "Type : All", value: "All" },
                { label: "Business", value: "Business" },
                { label: "Individual", value: "Individual" },
              ]}
              onChange={(val) => {
                setPendingType(val);
                setAppliedType(val);
                setCurrentPage(1);
              }}
            />
            <FilterDropdown
              placeholder="Outstanding : All"
              value={pendingOutstanding}
              options={[
                { label: "Outstanding : All", value: "All" },
                { label: "With Outstanding", value: "With Outstanding" },
                { label: "Zero Balance", value: "Zero Balance" },
              ]}
              onChange={(val) => {
                setPendingOutstanding(val);
                setAppliedOutstanding(val);
                setCurrentPage(1);
              }}
            />
          </div>
        }
        rightSlot={
          <div className="flex items-center gap-3 pr-1">
            <span className="text-xs font-semibold text-slate-500">
              Total Customers :{" "}
              <span className="text-[#33077C] font-bold">
                {displayedTotalRecords}
              </span>
            </span>
          </div>
        }
      />

      {/* 4. MAIN DATA TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto min-h-[360px]">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-[#33077C] text-white font-bold text-xs uppercase tracking-wider select-none">
              <tr>
                <th className="py-3.5 px-4 text-white min-w-[200px]">Customer Details</th>
                <th className="py-3.5 px-3 text-center text-white min-w-[110px]">Customer ID</th>
                <th className="py-3.5 px-3 text-white min-w-[160px]">Contact Info</th>
                <th className="py-3.5 px-3 text-right text-white min-w-[120px]">
                  Total Sales
                </th>
                <th className="py-3.5 px-3 text-right text-white min-w-[120px]">
                  Paid Amount
                </th>
                <th className="py-3.5 px-3 text-right text-white min-w-[120px]">
                  Outstanding
                </th>
                <th className="py-3.5 px-3 text-white min-w-[120px]">Credit Limit</th>
                <th className="py-3.5 px-3 text-center text-white min-w-[110px]">Status</th>
                <th className="py-3.5 px-4 text-center text-white min-w-[120px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-700 dark:text-slate-200">
              {isApiLoading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 text-[#4309A2] animate-spin" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Loading customers from Commerce API...
                      </p>
                      <p className="text-xs text-slate-400">
                        Fetching customer & financial ledger records
                      </p>
                    </div>
                  </td>
                </tr>
              ) : displayCustomers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <UsersRound className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                      <p className="text-sm font-medium">No customers found</p>
                      <p className="text-xs text-slate-400">
                        Try adjusting your search terms or filters
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayCustomers.map((cust) => {
                  const localFin = customerFinancialMap.get(cust.id);
                  const fin = {
                    totalSalesAmount:
                      localFin && localFin.totalSalesAmount > 0
                        ? localFin.totalSalesAmount
                        : cust.totalSales || 0,
                    totalPaidAmount:
                      localFin && localFin.totalPaidAmount > 0
                        ? localFin.totalPaidAmount
                        : cust.paidAmount || 0,
                    outstandingAmount:
                      localFin && localFin.outstandingAmount > 0
                        ? localFin.outstandingAmount
                        : cust.outstandingAmount || 0,
                    creditLimit: cust.creditLimit || 0,
                    availableCredit: Math.max(
                      0,
                      (cust.creditLimit || 0) -
                        (localFin?.outstandingAmount ||
                          cust.outstandingAmount ||
                          0),
                    ),
                    creditUtilizationPercent:
                      (cust.creditLimit || 0) > 0
                        ? Math.min(
                            100,
                            Math.round(
                              ((localFin?.outstandingAmount ||
                                cust.outstandingAmount ||
                                0) /
                                cust.creditLimit) *
                                100,
                            ),
                          )
                        : 0,
                  };

                  return (
                    <tr
                      key={cust.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition-colors group cursor-pointer"
                      onClick={() => handleOpenDetailModal(cust)}
                    >
                      {/* Customer Details */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#4309A2]/10 text-[#4309A2] dark:text-purple-300 font-bold flex items-center justify-center text-xs border border-[#4309A2]/20 flex-shrink-0">
                            {getCustomerInitials(cust.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900 dark:text-white truncate">
                                {cust.name}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                  cust.customerType === "Business"
                                    ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                                    : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                                }`}
                              >
                                {cust.customerType}
                              </span>
                            </div>
                            {cust.company && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate mt-0.5">
                                <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                {cust.company}
                              </p>
                            )}
                            {cust.salesRepresentativeName && cust.salesRepresentativeName !== "Unassigned" ? (
                              <div className="mt-1 flex items-center gap-1">
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#33077C] bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                  <UserCheck className="w-3 h-3 text-[#33077C]" />
                                  <span>{cust.salesRepresentativeName}</span>
                                </span>
                                {cust.salesRepresentativeType === "Temporary" && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                                    Temp
                                  </span>
                                )}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* Code */}
                      <td className="py-3.5 px-3 text-center align-middle">
                        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200/60 dark:border-slate-700">
                          {cust.customerCode}
                        </span>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3.5 px-3 align-middle">
                        <div className="space-y-0.5 text-xs">
                          <p className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            {cust.phone}
                          </p>
                          <p className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 truncate max-w-[170px]">
                            <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            {cust.email}
                          </p>
                        </div>
                      </td>

                      {/* Total Sales */}
                      <td className="py-3.5 px-3 text-right align-middle">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          ₹
                          {fin.totalSalesAmount.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </td>

                      {/* Paid Amount */}
                      <td className="py-3.5 px-3 text-right align-middle">
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          ₹
                          {fin.totalPaidAmount.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </td>

                      {/* Outstanding */}
                      <td className="py-3.5 px-3 text-right align-middle">
                        {fin.outstandingAmount > 0 ? (
                          <span className="font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200/60 dark:border-rose-800">
                            ₹
                            {fin.outstandingAmount.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">
                            ₹0.00
                          </span>
                        )}
                      </td>

                      {/* Credit Limit & Progress */}
                      <td className="py-3.5 px-3 align-middle">
                        <div className="w-28 space-y-1">
                          <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                            <span>Limit:</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                              ₹{(cust.creditLimit || 0).toLocaleString()}
                            </span>
                          </div>
                          {cust.creditLimit > 0 && (
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  fin.creditUtilizationPercent > 80
                                    ? "bg-rose-500"
                                    : fin.creditUtilizationPercent > 50
                                      ? "bg-amber-500"
                                      : "bg-purple-600"
                                }`}
                                style={{
                                  width: `${fin.creditUtilizationPercent}%`,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center align-middle">
                        {getStatusBadge(cust.status)}
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3.5 px-4 text-center whitespace-nowrap align-middle"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center justify-center gap-1">
                          {/* Share Customer Profile */}
                          <UniversalShareDropdown
                            id={cust.id}
                            activeShareId={activeShareId}
                            setActiveShareId={setActiveShareId}
                            sharePos={sharePos}
                            setSharePos={setSharePos}
                            getShareData={() => formatCustomerShare(cust)}
                            buttonClassName="w-7 h-7 rounded-lg text-slate-500 hover:text-[#33077C] hover:bg-purple-50 flex items-center justify-center transition-colors cursor-pointer"
                            title="Share Customer"
                          />

                          {/* 3. 3-Dots Floating Menu Button */}
                          <SaleActionDropdown
                            items={[
                              {
                                label: "View",
                                variant: "view",
                                onClick: () => handleOpenDetailModal(cust),
                              },
                              {
                                label: "Edit",
                                variant: "edit",
                                onClick: () => handleOpenEditModal(cust),
                              },
                              {
                                label: "Assign Sales Rep",
                                variant: "assign",
                                onClick: () => handleOpenChangeRepModal(cust),
                              },
                              {
                                label: "Create Sale",
                                variant: "sale",
                                onClick: () =>
                                  navigate(
                                    `/sale-management/sales/sale?customerId=${cust.id}&createSale=true`
                                  ),
                              },
                              {
                                label:
                                  cust.status === "Active"
                                    ? "Set as Inactive"
                                    : "Set as Active",
                                variant:
                                  cust.status === "Active"
                                    ? "deactivate"
                                    : "activate",
                                onClick: () =>
                                  handleUpdateCustomerStatus(
                                    cust,
                                    cust.status === "Active"
                                      ? "Inactive"
                                      : "Active"
                                  ),
                              },
                              {
                                label:
                                  cust.status === "Blocked"
                                    ? "Unblock Customer"
                                    : "Block Customer",
                                variant:
                                  cust.status === "Blocked"
                                    ? "activate"
                                    : "suspend",
                                onClick: () =>
                                  handleUpdateCustomerStatus(
                                    cust,
                                    cust.status === "Blocked"
                                      ? "Active"
                                      : "Blocked"
                                  ),
                              },
                              {
                                label: "Delete Customer",
                                variant: "delete",
                                onClick: () => handleOpenDeleteModal(cust),
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

        {/* Pagination Footer */}
        {displayedTotalRecords > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, displayedTotalRecords)} of{" "}
              {displayedTotalRecords} customers
            </p>
            <Pagination
              currentPage={currentPage}
              total={displayedTotalRecords}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* 1. ADD / EDIT CUSTOMER MODAL               */}
      {/* ========================================== */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={
          editingCustomer
            ? `Edit Customer: ${editingCustomer.name}`
            : "Add New Customer"
        }
        subtitle={
          editingCustomer
            ? `Update ${editingCustomer.name} (${editingCustomer.customerCode}) profile & terms`
            : "Register client profile, address, tax identification, and credit terms"
        }
        maxWidth="4xl"
        headerGradient={true}
        showBackIcon={true}
        hideCloseButton={true}
        onBack={() => setIsFormModalOpen(false)}
      >
        <form onSubmit={handleSubmit(onFormSubmit, onFormInvalid)} noValidate>
          <div className="space-y-6 max-h-[75vh] overflow-y-auto p-2 sm:p-4 text-xs animate-in fade-in duration-150">
            {/* Section 1: Basic Details */}
            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-100">
                <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-[#33077C] font-bold text-xs flex items-center gap-1.5 border border-purple-200">
                  <User className="w-3.5 h-3.5 text-[#4309A2]" />
                  1. Basic Information
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div>
                  <FormLabel required>Full Name / Contact Person</FormLabel>
                  <input
                    type="text"
                    {...register("name", {
                      required: "Customer name is required",
                      minLength: {
                        value: 2,
                        message: "Name must be at least 2 characters",
                      },
                    })}
                    placeholder="e.g. Marcus Vance or Acme Corp"
                    className={errors.name ? FORM_INPUT_ERROR_CLS : FORM_INPUT_CLS}
                  />
                  {errors.name && (
                    <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.name.message}</span>
                    </p>
                  )}
                </div>

                <div>
                  <FormLabel>Company Name (Optional)</FormLabel>
                  <input
                    type="text"
                    {...register("company")}
                    placeholder="e.g. Apex Global Logistics"
                    className={FORM_INPUT_CLS}
                  />
                </div>

                <div>
                  <FormLabel>Customer Type</FormLabel>
                  <select
                    {...register("customerType")}
                    className={FORM_SELECT_CLS}
                  >
                    <option value="Business">Business (B2B)</option>
                    <option value="Individual">Individual (B2C)</option>
                  </select>
                </div>

                <div>
                  <FormLabel>Sales Representative</FormLabel>
                  <select
                    {...register("salesRepresentativeId")}
                    className={FORM_SELECT_CLS}
                  >
                    <option value="">
                      {isSalesRepsLoading && availableSalesReps.length === 0
                        ? "Loading Sales Representatives..."
                        : "Select Sales Representative"}
                    </option>
                    {availableSalesReps
                      .filter(
                        (r) =>
                          r.status === "Active" ||
                          r.id === watch("salesRepresentativeId"),
                      )
                      .map((rep) => (
                        <option key={rep.id} value={rep.id}>
                          {rep.name}
                          {rep.designation ? ` (${rep.designation})` : ""}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <FormLabel required>Primary Phone</FormLabel>
                  <input
                    type="tel"
                    maxLength={10}
                    {...register("phone", {
                      required: "Primary phone is required",
                      validate: (val) =>
                        /^[6-9]\d{9}$/.test((val || "").trim()) ||
                        "Phone number must be a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9)",
                    })}
                    onKeyDown={handleNumberOnlyKeyDown}
                    onInput={(e) => {
                      e.currentTarget.value = normalizeIndianPhoneTo10Digits(
                        e.currentTarget.value,
                      );
                    }}
                    placeholder="e.g. 9876543210"
                    className={errors.phone ? FORM_INPUT_ERROR_CLS : FORM_INPUT_CLS}
                  />
                  {errors.phone && (
                    <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.phone.message}</span>
                    </p>
                  )}
                </div>

                <div>
                  <FormLabel>Alternate Phone</FormLabel>
                  <input
                    type="tel"
                    maxLength={10}
                    {...register("alternatePhone", {
                      validate: (val) =>
                        !val ||
                        !val.trim() ||
                        /^[6-9]\d{9}$/.test(val.trim()) ||
                        "Alternate phone must be a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9)",
                    })}
                    onKeyDown={handleNumberOnlyKeyDown}
                    onInput={(e) => {
                      e.currentTarget.value = normalizeIndianPhoneTo10Digits(
                        e.currentTarget.value,
                      );
                    }}
                    placeholder="e.g. 9876543211"
                    className={errors.alternatePhone ? FORM_INPUT_ERROR_CLS : FORM_INPUT_CLS}
                  />
                  {errors.alternatePhone && (
                    <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.alternatePhone.message}</span>
                    </p>
                  )}
                </div>

                <div>
                  <FormLabel>Email Address (Optional)</FormLabel>
                  <input
                    type="email"
                    {...register("email", {
                      validate: (val) =>
                        !val ||
                        !val.trim() ||
                        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()) ||
                        "Please enter a valid email address (e.g. client@company.com)",
                    })}
                    placeholder="e.g. client@company.com"
                    className={errors.email ? FORM_INPUT_ERROR_CLS : FORM_INPUT_CLS}
                  />
                  {errors.email && (
                    <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.email.message}</span>
                    </p>
                  )}
                </div>

                <div>
                  <FormLabel>Gender</FormLabel>
                  <select
                    {...register("gender")}
                    className={FORM_SELECT_CLS}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <FormLabel>Account Status</FormLabel>
                  <select
                    {...register("status")}
                    className={FORM_SELECT_CLS}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Address & Location */}
            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-100">
                <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-[#33077C] font-bold text-xs flex items-center gap-1.5 border border-purple-200">
                  <MapPin className="w-3.5 h-3.5 text-[#4309A2]" />
                  2. Address & Location
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-1">
                <div className="sm:col-span-4">
                  <FormLabel>Street Address</FormLabel>
                  <input
                    type="text"
                    {...register("address")}
                    onChange={(e) => {
                      const val = e.target.value;
                      setValue("address", val);
                      if (watchSameAsBilling) {
                        setValue("billingAddress", val);
                        setValue("shippingAddress", val);
                      }
                    }}
                    placeholder="e.g. 452 Ocean Avenue, Suite 400"
                    className={FORM_INPUT_CLS}
                  />
                </div>

                <div>
                  <FormLabel>City</FormLabel>
                  <input
                    type="text"
                    {...register("city")}
                    placeholder="e.g. Chennai"
                    className={errors.city ? FORM_INPUT_ERROR_CLS : FORM_INPUT_CLS}
                  />
                  {errors.city && (
                    <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.city.message}</span>
                    </p>
                  )}
                </div>

                <div>
                  <FormLabel>State</FormLabel>
                  <input
                    type="text"
                    {...register("state")}
                    placeholder="e.g. Tamil Nadu"
                    className={errors.state ? FORM_INPUT_ERROR_CLS : FORM_INPUT_CLS}
                  />
                  {errors.state && (
                    <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.state.message}</span>
                    </p>
                  )}
                </div>

                <div>
                  <FormLabel>Country</FormLabel>
                  <input
                    type="text"
                    {...register("country")}
                    placeholder="e.g. India"
                    className={errors.country ? FORM_INPUT_ERROR_CLS : FORM_INPUT_CLS}
                  />
                  {errors.country && (
                    <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.country.message}</span>
                    </p>
                  )}
                </div>

                <div>
                  <FormLabel>Pincode / ZIP</FormLabel>
                  <input
                    type="text"
                    maxLength={6}
                    {...register("pincode", {
                      validate: (val) =>
                        !val ||
                        !val.trim() ||
                        /^[1-9][0-9]{5}$/.test(val.trim()) ||
                        "Pincode must be a valid 6-digit Indian postal code",
                    })}
                    onKeyDown={handleNumberOnlyKeyDown}
                    onInput={(e) => {
                      e.currentTarget.value = e.currentTarget.value
                        .replace(/[^0-9]/g, "")
                        .slice(0, 6);
                    }}
                    placeholder="e.g. 600001"
                    className={errors.pincode ? FORM_INPUT_ERROR_CLS : FORM_INPUT_CLS}
                  />
                  {errors.pincode && (
                    <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.pincode.message}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Billing & Tax Info */}
            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-100">
                <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-[#33077C] font-bold text-xs flex items-center gap-1.5 border border-purple-200">
                  <FileText className="w-3.5 h-3.5 text-[#4309A2]" />
                  3. Tax & Invoicing Addresses
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <FormLabel>GSTIN (GST Number)</FormLabel>
                  <input
                    type="text"
                    maxLength={15}
                    {...register("gstNumber", {
                      validate: (val) =>
                        !val ||
                        !val.trim() ||
                        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
                          val.trim().toUpperCase(),
                        ) ||
                        "Invalid GSTIN format (e.g. 33AABCZ9876K1Z2)",
                    })}
                    onInput={(e) => {
                      e.currentTarget.value =
                        e.currentTarget.value.toUpperCase();
                    }}
                    placeholder="e.g. 33AABCZ9876K1Z2"
                    className={`${errors.gstNumber ? FORM_INPUT_ERROR_CLS : FORM_INPUT_CLS} font-mono uppercase`}
                  />
                  {errors.gstNumber && (
                    <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.gstNumber.message}</span>
                    </p>
                  )}
                </div>

                <div>
                  <FormLabel>PAN Number</FormLabel>
                  <input
                    type="text"
                    maxLength={10}
                    {...register("panNumber", {
                      validate: (val) =>
                        !val ||
                        !val.trim() ||
                        /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(
                          val.trim().toUpperCase(),
                        ) ||
                        "Invalid PAN format (e.g. ABCDE1234F)",
                    })}
                    onInput={(e) => {
                      e.currentTarget.value =
                        e.currentTarget.value.toUpperCase();
                    }}
                    placeholder="e.g. ABCDE1234F"
                    className={`${errors.panNumber ? FORM_INPUT_ERROR_CLS : FORM_INPUT_CLS} font-mono uppercase`}
                  />
                  {errors.panNumber && (
                    <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.panNumber.message}</span>
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <FormLabel>Billing Address</FormLabel>
                  <textarea
                    rows={2}
                    {...register("billingAddress")}
                    onChange={(e) => {
                      const val = e.target.value;
                      setValue("billingAddress", val);
                      if (watchSameAsBilling) {
                        setValue("shippingAddress", val);
                      }
                    }}
                    placeholder="Complete billing address for GST invoices..."
                    className={FORM_TEXTAREA_CLS}
                  />
                </div>

                <div className="sm:col-span-2 flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    id="sameAsBilling"
                    {...register("sameAsBilling")}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      setValue("sameAsBilling", isChecked);
                      if (isChecked) {
                        setValue(
                          "shippingAddress",
                          watch("billingAddress") || watch("address") || "",
                        );
                      }
                    }}
                    className="w-4 h-4 rounded text-[#33077C] focus:ring-[#4309A2] border-slate-300 cursor-pointer"
                  />
                  <label
                    htmlFor="sameAsBilling"
                    className="text-xs sm:text-[13px] font-semibold text-slate-700 cursor-pointer"
                  >
                    Shipping address is identical to Billing address
                  </label>
                </div>

                {!watchSameAsBilling && (
                  <div className="sm:col-span-2">
                    <FormLabel>Shipping / Delivery Address</FormLabel>
                    <textarea
                      rows={2}
                      {...register("shippingAddress")}
                      placeholder="Delivery warehouse or location address..."
                      className={FORM_TEXTAREA_CLS}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Section 4: Credit & Payment Due Period */}
            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-100">
                <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-[#33077C] font-bold text-xs flex items-center gap-1.5 border border-purple-200">
                  <CreditCard className="w-3.5 h-3.5 text-[#4309A2]" />
                  4. Credit Limit & Payment Due Period
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-1">
                <div>
                  <FormLabel>Credit Limit (₹)</FormLabel>
                  <input
                    type="text"
                    {...register("creditLimit", {
                      validate: (val) =>
                        val === "" ||
                        Number(val) >= 0 ||
                        "Credit limit cannot be negative",
                    })}
                    onKeyDown={handleNumberOnlyKeyDown}
                    onInput={(e) => {
                      e.currentTarget.value = e.currentTarget.value.replace(
                        /[^0-9]/g,
                        "",
                      );
                    }}
                    placeholder="e.g. 50000"
                    className={errors.creditLimit ? FORM_INPUT_ERROR_CLS : FORM_INPUT_CLS}
                  />
                  {errors.creditLimit && (
                    <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.creditLimit.message}</span>
                    </p>
                  )}
                </div>

                <div>
                  <FormLabel>Payment Due Period</FormLabel>
                  <input
                    type="text"
                    {...register("paymentTerms")}
                    placeholder="e.g. Net 30 Days"
                    className={FORM_INPUT_CLS}
                  />
                </div>

                <div>
                  <FormLabel>Existing Outstanding (₹)</FormLabel>
                  <input
                    type="text"
                    {...register("openingBalance", {
                      validate: (val) =>
                        val === "" ||
                        Number(val) >= 0 ||
                        "Opening balance cannot be negative",
                    })}
                    onKeyDown={handleNumberOnlyKeyDown}
                    onInput={(e) => {
                      e.currentTarget.value = e.currentTarget.value.replace(
                        /[^0-9]/g,
                        "",
                      );
                    }}
                    placeholder="e.g. 0"
                    className={errors.openingBalance ? FORM_INPUT_ERROR_CLS : FORM_INPUT_CLS}
                  />
                  {errors.openingBalance && (
                    <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.openingBalance.message}</span>
                    </p>
                  )}
                </div>

                <div>
                  <FormLabel>Preferred Payment</FormLabel>
                  <select
                    {...register("preferredPaymentMethod")}
                    className={FORM_SELECT_CLS}
                  >
                    <option value="">Select Preferred Payment</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Credit">Store Credit</option>
                  </select>
                </div>

                <div>
                  <FormLabel>Assigned Sales Rep</FormLabel>
                  <select
                    {...register("salesRepresentativeId")}
                    className={FORM_SELECT_CLS}
                  >
                    <option value="">Select Sales Representative</option>
                    {availableSalesReps.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} {r.mobile ? `(${r.mobile})` : ""} - {r.status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <FormLabel>Notes / Internal Comments</FormLabel>
                  <input
                    type="text"
                    {...register("notes")}
                    placeholder="Special instructions or account manager notes..."
                    className={FORM_INPUT_CLS}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
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
              disabled={isSubmitting}
              className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] disabled:opacity-60 text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Check className="w-4 h-4 stroke-[2.5]" />
              )}
              <span>
                {isSubmitting
                  ? "Saving..."
                  : editingCustomer
                    ? "Save Changes"
                    : "Save Customer"}
              </span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================== */}
      {/* 2. DUPLICATE CUSTOMER PREVENTION MODAL     */}
      {/* ========================================== */}
      <Modal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        title="Duplicate Customer Warning"
        subtitle="Review existing customer profiles before registering a new account"
        maxWidth="lg"
        headerGradient={true}
        showBackIcon={true}
        hideCloseButton={true}
        onBack={() => setIsDuplicateModalOpen(false)}
      >
        <div className="space-y-4 p-2 sm:p-4 text-xs animate-in fade-in duration-150">
          <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl">
            <ShieldAlert className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Possible Duplicate Customer Found
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                A customer with a matching phone number, email address, or
                customer ID already exists in your database:
              </p>
            </div>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {duplicateMatches.map((dup) => (
              <div
                key={dup.id}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {dup.name}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {dup.customerCode} â€¢ {dup.phone} â€¢ {dup.email}
                  </p>
                  {dup.company && (
                    <p className="text-[11px] text-slate-400">{dup.company}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsDuplicateModalOpen(false);
                    setIsFormModalOpen(false);
                    setSelectedCustomer(dup);
                    setActiveDetailTab("overview");
                    setIsDetailModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-purple-50 text-[#33077C] font-semibold text-xs border border-purple-200 hover:bg-purple-100 transition-colors"
                >
                  View Existing
                </button>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-500">
            Would you like to proceed anyway and register this as a new profile,
            or return to edit the form?
          </p>

          <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsDuplicateModalOpen(false)}
              className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4 text-slate-500" />
              <span>Back to Form</span>
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                if (pendingSavePayload) {
                  commitSaveCustomer(pendingSavePayload);
                }
              }}
              className="h-10 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Check className="w-4 h-4 stroke-[2.5]" />
              )}
              <span>{isSubmitting ? "Saving..." : "Save Anyway"}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================== */}
      {/* 2b. DELETE CUSTOMER CONFIRMATION MODAL     */}
      {/* ========================================== */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeletingCustomer) {
            setIsDeleteModalOpen(false);
            setDeleteTargetCustomer(null);
          }
        }}
        title="Delete Customer"
        subtitle="Confirm customer profile removal"
        maxWidth="md"
        headerGradient={true}
        showBackIcon={true}
        hideCloseButton={true}
        onBack={() => {
          if (!isDeletingCustomer) {
            setIsDeleteModalOpen(false);
            setDeleteTargetCustomer(null);
          }
        }}
      >
        <div className="space-y-4 p-2 sm:p-4 text-xs animate-in fade-in duration-150">
          <div className="flex items-start gap-3 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl">
            <Trash2 className="w-6 h-6 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                Are you sure you want to delete this customer?
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">
                You are about to delete{" "}
                <span className="font-bold text-rose-950 dark:text-white">
                  "{deleteTargetCustomer?.name}"
                </span>{" "}
                {deleteTargetCustomer?.customerCode && (
                  <span className="font-mono text-[11px] font-semibold text-rose-800 dark:text-rose-200">
                    ({deleteTargetCustomer.customerCode})
                  </span>
                )}
                . This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isDeletingCustomer}
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeleteTargetCustomer(null);
              }}
              className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4 text-slate-500" />
              <span>Cancel</span>
            </button>
            <button
              type="button"
              disabled={isDeletingCustomer}
              onClick={handleConfirmDeleteCustomer}
              className="h-10 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              {isDeletingCustomer ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Trash2 className="w-4 h-4 stroke-[2.2]" />
              )}
              <span>{isDeletingCustomer ? "Deleting..." : "Delete Customer"}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================== */}
      {/* 3. COMPREHENSIVE 6-TAB DETAIL MODAL       */}
      {/* ========================================== */}
      {selectedCustomer && selectedCustomerMetrics && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Customer: ${selectedCustomer.name}`}
          subtitle={`ID: ${selectedCustomer.customerCode} â€¢ ${selectedCustomer.customerType} Profile â€¢ Credit & Ledger`}
          maxWidth="4xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setIsDetailModalOpen(false)}
        >
          <div className="space-y-5 p-2 sm:p-4 max-h-[75vh] overflow-y-auto text-xs animate-in fade-in duration-150">
            {/* Modal Header Profile Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4309A2] to-[#7B2CBF] text-white font-bold flex items-center justify-center text-base shadow-md shadow-[#4309A2]/20">
                  {getCustomerInitials(selectedCustomer.name)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      {selectedCustomer.name}
                    </h2>
                    {getStatusBadge(selectedCustomer.status)}
                    <span className="text-xs px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-semibold border border-purple-200">
                      {selectedCustomer.customerType}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                    <span>ID: {selectedCustomer.customerCode}</span>
                    {selectedCustomer.company && (
                      <span className="font-sans font-medium text-slate-700 dark:text-slate-300">
                        â€¢ {selectedCustomer.company}
                      </span>
                    )}
                    <span>â€¢ {selectedCustomer.phone}</span>
                    <span>â€¢ {selectedCustomer.email}</span>
                    {selectedCustomerCollectionData?.rep && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/40 text-[#4309A2] dark:text-purple-300 font-semibold border border-purple-200 dark:border-purple-800">
                        <UserCheck className="w-3 h-3 text-[#4309A2]" />
                        Rep: {selectedCustomerCollectionData.rep.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons in Header */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenEditModal(selectedCustomer);
                  }}
                  className="h-9 px-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-white dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-500" />
                  <span>Edit Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    navigate(
                      `/sale-management/sales/sale?customerId=${selectedCustomer.id}&createSale=true`,
                    );
                  }}
                  className="h-9 px-3.5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-[#33077C]/20 cursor-pointer"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>+ Create Sale</span>
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto gap-2">
              {[
                { id: "overview", label: "Overview", icon: User },
                {
                  id: "collections",
                  label: `Collections (${selectedCustomerCollectionData?.invoicesWithBalance.length || 0})`,
                  icon: IndianRupee,
                },
                {
                  id: "quotations",
                  label: `Quotations (${selectedCustomerQuotations.length})`,
                  icon: FileText,
                },
                {
                  id: "proformas",
                  label: `Proformas (${selectedCustomerProformas.length})`,
                  icon: FileSpreadsheet,
                },
                {
                  id: "orders",
                  label: `Sale Orders (${selectedCustomerOrders.length})`,
                  icon: ShoppingBag,
                },
                {
                  id: "challans",
                  label: `Challans (${selectedCustomerChallans.length})`,
                  icon: Truck,
                },
                {
                  id: "sales",
                  label: `Invoices (${selectedCustomerSales.length})`,
                  icon: ShoppingCart,
                },
                { id: "payments", label: "Payments", icon: CreditCard },
                {
                  id: "returns",
                  label: `Returns (${selectedCustomerReturns.length})`,
                  icon: RotateCcw,
                },
                {
                  id: "outstanding",
                  label: "Outstanding & Ledger",
                  icon: IndianRupee,
                },
                {
                  id: "activity",
                  label: `Activity (${selectedCustomer.activities?.length || 0})`,
                  icon: History,
                },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeDetailTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveDetailTab(tab.id as any)}
                    className={`flex items-center gap-2 py-2.5 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                      isActive
                        ? "border-[#33077C] text-[#33077C] font-bold"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab 1: Overview */}
            {activeDetailTab === "overview" && (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {/* 3 Overview Metric Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-800/50">
                    <p className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                      Total Invoiced
                    </p>
                    <p className="text-xl font-bold text-purple-900 dark:text-purple-100 mt-1">
                      ₹
                      {selectedCustomerMetrics.totalSalesAmount.toLocaleString(
                        "en-IN",
                        { minimumFractionDigits: 2 },
                      )}
                    </p>
                    <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-0.5">
                      {selectedCustomerMetrics.totalSalesCount} invoices created
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/50">
                    <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                      Total Paid
                    </p>
                    <p className="text-xl font-bold text-emerald-900 dark:text-emerald-100 mt-1">
                      ₹
                      {selectedCustomerMetrics.totalPaidAmount.toLocaleString(
                        "en-IN",
                        { minimumFractionDigits: 2 },
                      )}
                    </p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                      Settled via{" "}
                      {selectedCustomer.preferredPaymentMethod || "Bank"}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-800/50">
                    <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
                      Current Outstanding
                    </p>
                    <p className="text-xl font-bold text-rose-900 dark:text-rose-100 mt-1">
                      ₹
                      {selectedCustomerMetrics.outstandingAmount.toLocaleString(
                        "en-IN",
                        { minimumFractionDigits: 2 },
                      )}
                    </p>
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
                      Credit Limit: ₹
                      {(selectedCustomer.creditLimit || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Sales & Collection Section as explicitly requested */}
                <div className="p-4 sm:p-5 rounded-2xl border border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50/70 via-indigo-50/40 to-white dark:from-purple-950/20 dark:to-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-purple-100 dark:border-purple-800/60">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#33077C] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          Sales &amp; Collection
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Primary sales rep assignment, credit limits &amp;
                          Payment Due Period
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenChangeRepModal(selectedCustomer)
                        }
                        className="px-3.5 py-1.5 rounded-xl border border-purple-300 dark:border-purple-700 bg-white dark:bg-purple-950/40 text-[#33077C] dark:text-purple-300 hover:bg-purple-50 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Change Sales Rep</span>
                      </button>
                      {selectedCustomerCollectionData?.invoicesWithBalance &&
                        selectedCustomerCollectionData.invoicesWithBalance
                          .length > 0 && (
                          <button
                            type="button"
                            onClick={() => setActiveDetailTab("collections")}
                            className="px-3.5 py-1.5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                          >
                            <IndianRupee className="w-3.5 h-3.5" />
                            <span>
                              Collections (
                              {
                                selectedCustomerCollectionData
                                  .invoicesWithBalance.length
                              }
                              )
                            </span>
                          </button>
                        )}
                    </div>
                  </div>

                  {/* 4 Cards: Sales Rep, Outstanding, Credit Limit, Payment Due Period */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    {/* 1. Sales Representative */}
                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Sales Representative
                      </span>
                      <div className="flex items-center gap-2.5 mt-2">
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-[#33077C] flex items-center justify-center font-bold text-xs shrink-0">
                          {selectedCustomerCollectionData?.rep?.name?.charAt(
                            0,
                          ) || "U"}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-[13px]">
                            {selectedCustomerCollectionData?.rep?.name ||
                              "Unassigned"}
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {selectedCustomerCollectionData?.rep?.status ===
                            "Active"
                              ? "Sales Executive"
                              : "Inactive Rep"}
                            {selectedCustomer.salesRepresentativeType
                              ? ` â€¢ ${selectedCustomer.salesRepresentativeType}`
                              : ""}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 2. Outstanding */}
                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Outstanding
                      </span>
                      <p className="text-lg font-bold text-rose-600 mt-1.5">
                        ₹
                        {(
                          selectedCustomerCollectionData?.totalOutstanding || 0
                        ).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                        Overdue: ₹
                        {(
                          selectedCustomerCollectionData?.overdueAmount || 0
                        ).toLocaleString("en-IN")}
                      </p>
                    </div>

                    {/* 3. Credit Limit */}
                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Credit Limit
                      </span>
                      <p className="text-lg font-bold text-slate-900 dark:text-white mt-1.5">
                        ₹{(selectedCustomer.creditLimit || 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                        Available: ₹
                        {selectedCustomerMetrics.availableCredit.toLocaleString()}
                      </p>
                    </div>

                    {/* 4. Payment Due Period */}
                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Payment Due Period
                      </span>
                      <p className="text-lg font-bold text-slate-900 dark:text-white mt-1.5">
                        {selectedCustomer.paymentTerms || "30 Days"}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                        Mode:{" "}
                        {selectedCustomer.preferredPaymentMethod ||
                          "Bank Transfer"}
                      </p>
                    </div>
                  </div>

                  {/* Customer's Invoices Table */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Customer Invoices &amp; Assignments (
                        {selectedCustomerSales.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveDetailTab("sales")}
                        className="text-[11px] font-bold text-[#33077C] dark:text-purple-300 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>View All Invoices</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-700/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider">
                            <th className="py-2.5 px-3">Invoice</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3 text-right">Amount</th>
                            <th className="py-2.5 px-3 text-right">Paid</th>
                            <th className="py-2.5 px-3 text-right">Due</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                            <th className="py-2.5 px-3">Sales Rep</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {selectedCustomerSales.length === 0 ? (
                            <tr>
                              <td
                                colSpan={7}
                                className="py-8 text-center text-slate-400"
                              >
                                No sales invoices recorded for this customer
                                yet.
                              </td>
                            </tr>
                          ) : (
                            selectedCustomerSales.slice(0, 5).map((inv) => (
                              <tr
                                key={inv.id}
                                className="hover:bg-slate-50 dark:hover:bg-slate-700/40"
                              >
                                <td className="py-2 px-3 font-bold text-[#33077C] dark:text-purple-300 font-mono">
                                  {inv.invoiceNo}
                                </td>
                                <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                                  {inv.saleDate}
                                </td>
                                <td className="py-2 px-3 text-right font-medium text-slate-800 dark:text-slate-200">
                                  ₹
                                  {inv.grandTotal.toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                  })}
                                </td>
                                <td className="py-2 px-3 text-right font-semibold text-emerald-600">
                                  ₹
                                  {inv.paidAmount.toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                  })}
                                </td>
                                <td className="py-2 px-3 text-right font-bold text-rose-600">
                                  ₹
                                  {inv.balance.toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                  })}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      inv.paymentStatus === "Paid"
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : inv.dueDate &&
                                            inv.dueDate < "2026-10-08"
                                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                                          : "bg-amber-50 text-amber-700 border border-amber-200"
                                    }`}
                                  >
                                    {inv.dueDate &&
                                    inv.dueDate < "2026-10-08" &&
                                    inv.paymentStatus !== "Paid"
                                      ? "Overdue"
                                      : inv.paymentStatus === "Paid"
                                        ? "Paid"
                                        : "Due"}
                                  </span>
                                </td>
                                <td className="py-2 px-3">
                                  <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                                    <span>
                                      {inv.salesRepresentativeName ||
                                        selectedCustomerCollectionData?.rep
                                          ?.name ||
                                        "Unassigned"}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card: Profile & Contact */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#33077C]" />
                      Company & Contact Information
                    </h4>
                    <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-slate-700">
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">Full Name:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {selectedCustomer.name}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">Company Name:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {selectedCustomer.company || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">Phone:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {selectedCustomer.phone}
                        </span>
                      </div>
                      {selectedCustomer.alternatePhone && (
                        <div className="flex justify-between py-1.5">
                          <span className="text-slate-500">
                            Alternate Phone:
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {selectedCustomer.alternatePhone}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">Email:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {selectedCustomer.email}
                        </span>
                      </div>
                      {selectedCustomer.gstNumber && (
                        <div className="flex justify-between py-1.5 font-mono">
                          <span className="text-slate-500">GSTIN:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {selectedCustomer.gstNumber}
                          </span>
                        </div>
                      )}
                      {selectedCustomer.panNumber && (
                        <div className="flex justify-between py-1.5 font-mono">
                          <span className="text-slate-500">PAN:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {selectedCustomer.panNumber}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card: Credit & Addresses */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[#33077C]" />
                      Credit Policy & Addresses
                    </h4>
                    <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-slate-700">
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">
                          Payment Due Period:
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {selectedCustomer.paymentTerms}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">Credit Limit:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          ₹
                          {(selectedCustomer.creditLimit || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">
                          Available Credit:
                        </span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          ₹
                          {selectedCustomerMetrics.availableCredit.toLocaleString()}
                        </span>
                      </div>
                      <div className="py-2">
                        <span className="text-slate-500 block mb-1">
                          Billing Address:
                        </span>
                        <p className="font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-800">
                          {selectedCustomer.billingAddress ||
                            selectedCustomer.address}
                        </p>
                      </div>
                      {selectedCustomer.notes && (
                        <div className="py-2">
                          <span className="text-slate-500 block mb-1">
                            Internal Notes:
                          </span>
                          <p className="text-slate-600 dark:text-slate-400 italic">
                            "{selectedCustomer.notes}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Collections & Dues */}
            {activeDetailTab === "collections" && (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {/* 4 Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-800/50">
                    <p className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                      Total Outstanding
                    </p>
                    <p className="text-xl font-bold text-purple-900 dark:text-purple-100 mt-1">
                      ₹
                      {(
                        selectedCustomerCollectionData?.totalOutstanding || 0
                      ).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-0.5">
                      {selectedCustomerCollectionData?.invoicesWithBalance
                        .length || 0}{" "}
                      open balance invoices
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-800/50">
                    <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
                      Overdue Amount
                    </p>
                    <p className="text-xl font-bold text-rose-900 dark:text-rose-100 mt-1">
                      ₹
                      {(
                        selectedCustomerCollectionData?.overdueAmount || 0
                      ).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
                      {selectedCustomerCollectionData?.overdueCount || 0}{" "}
                      overdue invoices
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/50">
                    <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                      Last Payment
                    </p>
                    <p className="text-base font-bold text-emerald-900 dark:text-emerald-100 mt-1">
                      {selectedCustomerCollectionData?.lastPayment
                        ? `₹${(selectedCustomerCollectionData.lastPayment.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                        : "No payments yet"}
                    </p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {selectedCustomerCollectionData?.lastPayment
                        ? selectedCustomerCollectionData.lastPayment.paymentDate
                        : "None"}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/50">
                    <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                      Next Follow-up
                    </p>
                    <p className="text-base font-bold text-indigo-900 dark:text-indigo-100 mt-1">
                      {selectedCustomerCollectionData?.nextFollowUpDate ||
                        "None Scheduled"}
                    </p>
                    <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5">
                      Rep:{" "}
                      {selectedCustomerCollectionData?.rep?.name ||
                        "Unassigned"}
                    </p>
                  </div>
                </div>

                {/* Outstanding Invoices List */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Receivable Invoices ({selectedCustomerSales.length})
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Invoices with due dates and calculated balance
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        navigate(
                          `/sale-management/sales/collections?search=${encodeURIComponent(selectedCustomer.name)}`,
                        );
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <IndianRupee className="w-3.5 h-3.5" />
                      <span>Open Collections Hub</span>
                    </button>
                  </div>

                  {selectedCustomerSales.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No invoices found for this customer.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#33077C] text-white font-bold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Invoice No</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Due Date</th>
                          <th className="py-2.5 px-3 text-right">
                            Invoice Total
                          </th>
                          <th className="py-2.5 px-3 text-right">
                            Paid Amount
                          </th>
                          <th className="py-2.5 px-3 text-right">
                            Outstanding
                          </th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {selectedCustomerSales.map((s) => {
                          const todayStr = "2026-10-08";
                          const paidAmt = s.paidAmount || 0;
                          const outstanding =
                            s.balance ??
                            Math.max(0, (s.grandTotal || 0) - paidAmt);
                          let statusLabel = "Paid";
                          let statusClass =
                            "bg-emerald-100 text-emerald-700 border-emerald-200";

                          if (outstanding > 0) {
                            if (s.dueDate && s.dueDate < todayStr) {
                              statusLabel = "Overdue";
                              statusClass =
                                "bg-rose-100 text-rose-700 border-rose-200";
                            } else if (s.dueDate && s.dueDate === todayStr) {
                              statusLabel = "Due Today";
                              statusClass =
                                "bg-amber-100 text-amber-700 border-amber-200";
                            } else {
                              statusLabel = "Upcoming";
                              statusClass =
                                "bg-blue-100 text-blue-700 border-blue-200";
                            }
                          }

                          return (
                            <tr
                              key={s.id}
                              className="hover:bg-slate-50 dark:hover:bg-slate-800/60"
                            >
                              <td className="py-2.5 px-3 font-mono font-bold text-[#33077C] dark:text-purple-300">
                                {s.invoiceNo}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                                {s.saleDate}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                                {s.dueDate || "N/A"}
                              </td>
                              <td className="py-2.5 px-3 text-right font-medium text-slate-800 dark:text-slate-200">
                                ₹
                                {(s.grandTotal || 0).toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                              <td className="py-2.5 px-3 text-right text-emerald-600 font-medium">
                                ₹
                                {paidAmt.toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                                ₹
                                {outstanding.toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusClass}`}
                                >
                                  {statusLabel}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsDetailModalOpen(false);
                                    navigate(
                                      `/sale-management/sales/collections?search=${encodeURIComponent(s.invoiceNo)}`,
                                    );
                                  }}
                                  className="px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 text-[#33077C] font-semibold text-[11px] border border-purple-200 transition-colors cursor-pointer"
                                >
                                  {outstanding > 0 ? "Collect" : "View"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Follow-up & Promises History */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Follow-up History */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#33077C]" />
                      Collection Follow-ups (
                      {selectedCustomerCollectionData?.followUps.length || 0})
                    </h4>
                    {selectedCustomerCollectionData?.followUps.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 text-center">
                        No follow-ups recorded yet
                      </p>
                    ) : (
                      <div className="space-y-2.5 max-h-48 overflow-y-auto">
                        {selectedCustomerCollectionData?.followUps.map((f) => (
                          <div
                            key={f.id}
                            className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 text-xs"
                          >
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {f.followUpDate}{" "}
                                {f.followUpTime && `â€¢ ${f.followUpTime}`}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-[#33077C]">
                                {f.outcome}
                              </span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 mt-1 italic">
                              "{f.notes}"
                            </p>
                            {f.nextFollowUpDate && (
                              <p className="text-[10px] text-purple-700 dark:text-purple-300 mt-1 font-semibold">
                                Next Follow-up: {f.nextFollowUpDate}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Promises to Pay */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <IndianRupee className="w-4 h-4 text-[#33077C]" />
                      Promises to Pay (
                      {selectedCustomerCollectionData?.promises.length || 0})
                    </h4>
                    {selectedCustomerCollectionData?.promises.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 text-center">
                        No promises recorded yet
                      </p>
                    ) : (
                      <div className="space-y-2.5 max-h-48 overflow-y-auto">
                        {selectedCustomerCollectionData?.promises.map((p) => (
                          <div
                            key={p.id}
                            className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 text-xs"
                          >
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                ₹
                                {p.promisedAmount.toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  p.status === "Honoured"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : p.status === "Broken"
                                      ? "bg-rose-100 text-rose-700"
                                      : "bg-purple-100 text-[#33077C]"
                                }`}
                              >
                                {p.status}
                              </span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 mt-1">
                              Promised Date:{" "}
                              <span className="font-semibold">
                                {p.promiseDate}
                              </span>
                            </p>
                            {p.notes && (
                              <p className="text-slate-500 italic mt-0.5">
                                "{p.notes}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Quotations */}
            {activeDetailTab === "quotations" && (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {selectedCustomerQuotations.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium">
                      No quotations recorded for this customer yet
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        navigate("/sale-management/sales/quotation");
                      }}
                      className="mt-3 px-4 py-2 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold shadow-sm"
                    >
                      + Create Quotation
                    </button>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#33077C] text-white font-bold uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 text-white">Quotation No</th>
                        <th className="py-2.5 px-3 text-white">Date</th>
                        <th className="py-2.5 px-3 text-white">Valid Until</th>
                        <th className="py-2.5 px-3 text-right text-white">
                          Amount
                        </th>
                        <th className="py-2.5 px-3 text-center text-white">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedCustomerQuotations.map((q) => (
                        <tr key={q.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-[#33077C]">
                            {q.quotationNo}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {q.date}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {q.validUntil}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            ₹
                            {Number(q.amount || 0).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-[#33077C] border border-purple-200">
                              {q.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Tab: Proformas */}
            {activeDetailTab === "proformas" && (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {selectedCustomerProformas.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium">
                      No proforma invoices found for this customer
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        navigate("/sale-management/sales/proforma");
                      }}
                      className="mt-3 px-4 py-2 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold shadow-sm"
                    >
                      + Create Proforma Invoice
                    </button>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#33077C] text-white font-bold uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 text-white">Proforma No</th>
                        <th className="py-2.5 px-3 text-white">Date</th>
                        <th className="py-2.5 px-3 text-white">Valid Until</th>
                        <th className="py-2.5 px-3 text-right text-white">
                          Amount
                        </th>
                        <th className="py-2.5 px-3 text-center text-white">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedCustomerProformas.map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-[#33077C]">
                            {p.proformaNo}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {p.date}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {p.validUntil}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            ₹
                            {Number(p.amount || 0).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Tab: Sale Orders */}
            {activeDetailTab === "orders" && (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {selectedCustomerOrders.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <ShoppingBag className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium">
                      No sales orders found for this customer
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        navigate("/sale-management/sales/sale-order");
                      }}
                      className="mt-3 px-4 py-2 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold shadow-sm"
                    >
                      + Create Sales Order
                    </button>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#33077C] text-white font-bold uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 text-white">Order No</th>
                        <th className="py-2.5 px-3 text-white">Order Date</th>
                        <th className="py-2.5 px-3 text-white">Due Date</th>
                        <th className="py-2.5 px-3 text-right text-white">
                          Total Amount
                        </th>
                        <th className="py-2.5 px-3 text-right text-white">
                          Balance
                        </th>
                        <th className="py-2.5 px-3 text-center text-white">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedCustomerOrders.map((o: any) => (
                        <tr key={o.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-[#33077C]">
                            {o.orderNo}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {o.orderDate}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {o.dueDate}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            ₹
                            {Number(o.amount || 0).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-2.5 px-3 text-right text-rose-600 font-semibold">
                            ₹
                            {Number(o.balance || 0).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              {o.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Tab: Delivery Challans */}
            {activeDetailTab === "challans" && (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {selectedCustomerChallans.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <Truck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium">
                      No delivery challans recorded for this customer
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        navigate("/sale-management/sales/delivery-challan");
                      }}
                      className="mt-3 px-4 py-2 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold shadow-sm"
                    >
                      + Create Delivery Challan
                    </button>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#33077C] text-white font-bold uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 text-white">Challan No</th>
                        <th className="py-2.5 px-3 text-white">Date</th>
                        <th className="py-2.5 px-3 text-white">Vehicle</th>
                        <th className="py-2.5 px-3 text-right text-white">
                          Amount
                        </th>
                        <th className="py-2.5 px-3 text-center text-white">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedCustomerChallans.map((c: any) => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-[#33077C]">
                            {c.challanNo}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {c.invoiceDate}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {c.vehicleNo || "-"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            ₹
                            {Number(c.amount || 0).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Tab 2: Sales Invoices */}
            {activeDetailTab === "sales" && (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {selectedCustomerSales.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <ShoppingCart className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium">
                      No sales recorded for this customer yet
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        navigate(
                          `/sale-management/sales/sale?customerId=${selectedCustomer.id}&createSale=true`,
                        );
                      }}
                      className="mt-3 px-4 py-2 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold shadow-sm"
                    >
                      + Create First Sale
                    </button>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#33077C] text-white font-bold uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 text-white">Invoice No</th>
                        <th className="py-2.5 px-3 text-white">Date</th>
                        <th className="py-2.5 px-3 text-white">Items</th>
                        <th className="py-2.5 px-3 text-right text-white">
                          Grand Total
                        </th>
                        <th className="py-2.5 px-3 text-right text-white">
                          Paid
                        </th>
                        <th className="py-2.5 px-3 text-right text-white">
                          Balance
                        </th>
                        <th className="py-2.5 px-3 text-center text-white">
                          Payment Status
                        </th>
                        <th className="py-2.5 px-3 text-center text-white">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {selectedCustomerSales.map((sale) => (
                        <tr
                          key={sale.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        >
                          <td className="py-2.5 px-3 font-mono font-bold text-[#4309A2] dark:text-purple-300">
                            {sale.invoiceNo}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {sale.saleDate}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {sale.items.length} items
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-900 dark:text-white">
                            ₹
                            {sale.grandTotal.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-600 font-medium">
                            ₹
                            {(sale.paidAmount || 0).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-2.5 px-3 text-right text-rose-600 font-bold">
                            ₹
                            {(sale.balance || 0).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                sale.paymentStatus === "Paid"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : sale.paymentStatus === "Partial"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-rose-100 text-rose-700"
                              }`}
                            >
                              {sale.paymentStatus}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="text-[11px] text-slate-500">
                              {sale.saleStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Tab 3: Payments */}
            {activeDetailTab === "payments" && (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {selectedCustomerSales.filter((s) => (s.paidAmount || 0) > 0)
                  .length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <CreditCard className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium">
                      No payments received yet
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#33077C] text-white font-bold uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 text-white">Invoice No</th>
                        <th className="py-2.5 px-3 text-white">Payment Date</th>
                        <th className="py-2.5 px-3 text-white">
                          Payment Method
                        </th>
                        <th className="py-2.5 px-3 text-right text-white">
                          Total Invoice
                        </th>
                        <th className="py-2.5 px-3 text-right text-white">
                          Amount Settled
                        </th>
                        <th className="py-2.5 px-3 text-center text-white">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {selectedCustomerSales
                        .filter((s) => (s.paidAmount || 0) > 0)
                        .map((sale) => (
                          <tr
                            key={sale.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          >
                            <td className="py-2.5 px-3 font-mono font-bold text-[#4309A2] dark:text-purple-300">
                              {sale.invoiceNo}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {sale.saleDate}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-200">
                              {sale.paymentMethod || "Bank Transfer"}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-500">
                              ₹
                              {sale.grandTotal.toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                              ₹
                              {(sale.paidAmount || 0).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                {sale.paymentStatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Tab 4: Sales Returns */}
            {activeDetailTab === "returns" && (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {selectedCustomerReturns.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <RotateCcw className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium">
                      No sales return requests for this customer
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#33077C] text-white font-bold uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 text-white">Return No</th>
                        <th className="py-2.5 px-3 text-white">Invoice No</th>
                        <th className="py-2.5 px-3 text-white">Date</th>
                        <th className="py-2.5 px-3 text-white">Items</th>
                        <th className="py-2.5 px-3 text-right text-white">
                          Return Amount
                        </th>
                        <th className="py-2.5 px-3 text-center text-white">
                          Refund Status
                        </th>
                        <th className="py-2.5 px-3 text-center text-white">
                          Return Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {selectedCustomerReturns.map((ret) => (
                        <tr
                          key={ret.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        >
                          <td className="py-2.5 px-3 font-mono font-bold text-rose-600">
                            {ret.returnNo}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                            {ret.invoiceNo}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {ret.returnDate}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {ret.items.length} items
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                            ₹
                            {ret.returnAmount.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              {ret.refundStatus}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {ret.returnStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Tab 5: Outstanding & Ledger */}
            {activeDetailTab === "outstanding" &&
              (() => {
                const liveLedger = customerLedgerMap[selectedCustomer.id];
                const openingBal = liveLedger
                  ? liveLedger.openingBalance
                  : selectedCustomer.openingBalance || 0;
                const totalSalesVal = liveLedger
                  ? liveLedger.totalSales
                  : selectedCustomerMetrics.totalSalesAmount;
                const totalPaidVal = liveLedger
                  ? liveLedger.paidAmount
                  : selectedCustomerMetrics.totalPaidAmount;
                const creditNotesVal = liveLedger
                  ? liveLedger.creditNotes
                  : selectedCustomerMetrics.totalReturnAmount;
                const netDueVal = liveLedger
                  ? liveLedger.outstandingAmount
                  : selectedCustomerMetrics.outstandingAmount;
                const creditLimitVal = liveLedger
                  ? liveLedger.creditLimit
                  : selectedCustomer.creditLimit || 0;
                const availableCreditVal = Math.max(
                  0,
                  creditLimitVal - netDueVal,
                );
                const utilPercentVal =
                  creditLimitVal > 0
                    ? Math.min(100, (netDueVal / creditLimitVal) * 100)
                    : 0;

                return (
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                    {isLoadingLedger && !liveLedger && (
                      <div className="p-3 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-2 text-xs font-medium">
                        <Loader2 className="w-4 h-4 animate-spin text-[#4309A2]" />
                        <span>
                          Loading live ledger from Commerce service...
                        </span>
                      </div>
                    )}

                    {/* Outstanding Breakdown Card */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>Outstanding Account Ledger</span>
                          {liveLedger && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Synced Live
                            </span>
                          )}
                        </div>
                        <span className="text-rose-600 font-bold text-sm">
                          Net Due: ₹
                          {netDueVal.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </h4>

                      <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-slate-700">
                        <div className="flex justify-between py-1.5">
                          <span className="text-slate-500">
                            Opening Balance:
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            ₹
                            {openingBal.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-slate-500">
                            (+) Total Invoiced Sales:
                          </span>
                          <span className="font-semibold text-purple-700 dark:text-purple-300">
                            ₹
                            {totalSalesVal.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-slate-500">
                            (-) Total Payments Received:
                          </span>
                          <span className="font-semibold text-emerald-600">
                            ₹
                            {totalPaidVal.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        {creditNotesVal > 0 && (
                          <div className="flex justify-between py-1.5">
                            <span className="text-slate-500">
                              (-) Sales Returns / Credit Notes:
                            </span>
                            <span className="font-semibold text-blue-600">
                              ₹
                              {creditNotesVal.toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between py-2 font-bold text-sm bg-slate-50 dark:bg-slate-900/40 px-2 rounded">
                          <span className="text-slate-900 dark:text-white">
                            Current Balance Receivable:
                          </span>
                          <span className="text-rose-600">
                            ₹
                            {netDueVal.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Credit Risk Meter */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
                      <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <span>Credit Limit Utilization</span>
                        <span>
                          {utilPercentVal.toFixed(1)}% of ₹
                          {creditLimitVal.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            utilPercentVal > 90
                              ? "bg-rose-500"
                              : utilPercentVal > 60
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                          }`}
                          style={{ width: `${utilPercentVal}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>
                          Available Credit: ₹
                          {availableCreditVal.toLocaleString()}
                        </span>
                        <span>
                          Risk Level:{" "}
                          <strong
                            className={
                              utilPercentVal > 90
                                ? "text-rose-600"
                                : utilPercentVal > 60
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                            }
                          >
                            {utilPercentVal > 90
                              ? "High"
                              : utilPercentVal > 60
                                ? "Moderate"
                                : "Low / Healthy"}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

            {/* Tab 6: Activity Timeline */}
            {activeDetailTab === "activity" &&
              (() => {
                const liveActivities =
                  customerLedgerMap[selectedCustomer.id]?.activities;
                const activitiesToDisplay =
                  liveActivities && liveActivities.length > 0
                    ? liveActivities.map((a) => ({
                        id: a.id,
                        action: a.action,
                        details: a.details,
                        date: a.date,
                        user: a.user,
                        referenceNo: a.referenceNo,
                        type: a.type,
                        debit: a.debit,
                        credit: a.credit,
                      }))
                    : selectedCustomer.activities || [];

                return (
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                    {isLoadingLedger && !liveActivities && (
                      <div className="p-3 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-2 text-xs font-medium">
                        <Loader2 className="w-4 h-4 animate-spin text-[#4309A2]" />
                        <span>
                          Loading activity timeline from Commerce service...
                        </span>
                      </div>
                    )}

                    {activitiesToDisplay.length === 0 ? (
                      <div className="py-12 text-center text-slate-400">
                        <History className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        <p className="text-sm font-medium">
                          No activity logged yet
                        </p>
                      </div>
                    ) : (
                      <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                        {activitiesToDisplay.map((act: any) => (
                          <div
                            key={act.id}
                            className="relative flex items-start gap-3 text-xs"
                          >
                            <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-[#4309A2] border-2 border-white dark:border-slate-800" />
                            <div className="flex-1 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200/70 dark:border-slate-700">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    {act.action}
                                  </span>
                                  {act.referenceNo && (
                                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                      {act.referenceNo}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(act.date).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-slate-600 dark:text-slate-300 mt-1">
                                {act.details}
                              </p>
                              <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-700/60 flex-wrap">
                                {act.user ? (
                                  <p className="text-[10px] text-slate-400 font-medium">
                                    By: {act.user}
                                  </p>
                                ) : (
                                  <span />
                                )}
                                <div className="flex items-center gap-1.5">
                                  {Number(act.debit) > 0 && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                                      Debit: ₹
                                      {Number(act.debit).toLocaleString(
                                        "en-IN",
                                        { minimumFractionDigits: 2 },
                                      )}
                                    </span>
                                  )}
                                  {Number(act.credit) > 0 && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      Credit: ₹
                                      {Number(act.credit).toLocaleString(
                                        "en-IN",
                                        { minimumFractionDigits: 2 },
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

            {/* Modal Footer */}
            <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="h-10 px-5 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4 text-slate-500" />
                <span>Close</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ============================================================ */}
      {/* CHANGE SALES REPRESENTATIVE MODAL                            */}
      {/* ============================================================ */}
      {changeRepTargetCustomer && (
        <Modal
          isOpen={isChangeRepModalOpen}
          onClose={() => {
            setIsChangeRepModalOpen(false);
            setChangeRepTargetCustomer(null);
          }}
          title="Assign Sales Representative"
          subtitle={`Set sales representative for ${changeRepTargetCustomer.name} (${changeRepTargetCustomer.customerCode})`}
          maxWidth="md"
        >
          <div className="space-y-4 p-1 text-xs">
            {/* Customer Summary */}
            <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200/80 flex items-center justify-between">
              <div>
                <span className="font-bold text-[#33077C] text-sm block">
                  {changeRepTargetCustomer.name}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Code: {changeRepTargetCustomer.customerCode} â€¢{" "}
                  {changeRepTargetCustomer.company || "Direct"}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white text-[#33077C] border border-purple-200">
                {changeRepTargetCustomer.customerType}
              </span>
            </div>

            {/* Sales Rep Selector */}
            <div>
              <FormLabel required>Sales Representative</FormLabel>
              <select
                value={selectedRepIdForCustomer}
                onChange={(e) => setSelectedRepIdForCustomer(e.target.value)}
                className={FORM_SELECT_CLS}
              >
                <option value="">
                  {isSalesRepsLoading && availableSalesReps.length === 0
                    ? "-- Loading Sales Representatives... --"
                    : "-- Select Sales Representative --"}
                </option>
                {availableSalesReps.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.mobile ? `(${r.mobile})` : ""}{" "}
                    {r.designation ? `• ${r.designation}` : ""} - {r.status}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignment Type (Primary / Temporary) */}
            <div>
              <FormLabel required>Assignment Type</FormLabel>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRepAssignmentType("Primary")}
                  className={`h-11 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs sm:text-[13px] cursor-pointer transition-all ${
                    repAssignmentType === "Primary"
                      ? "bg-purple-50 border-[#33077C] text-[#33077C] shadow-2xs ring-2 ring-[#33077C]/15"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#33077C]" />
                  <span>Primary Rep</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRepAssignmentType("Temporary")}
                  className={`h-11 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs sm:text-[13px] cursor-pointer transition-all ${
                    repAssignmentType === "Temporary"
                      ? "bg-amber-50 border-amber-500 text-amber-900 shadow-2xs ring-2 ring-amber-500/15"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Temporary Rep</span>
                </button>
              </div>
            </div>

            {/* Effective From */}
            <div>
              <FormLabel>Effective From</FormLabel>
              <input
                type="date"
                value={repEffectiveFrom}
                onChange={(e) => setRepEffectiveFrom(e.target.value)}
                className={FORM_INPUT_CLS}
              />
            </div>

            {/* Notes */}
            <div>
              <FormLabel>Notes / Handover Instructions</FormLabel>
              <textarea
                rows={2}
                value={repAssignmentNotes}
                onChange={(e) => setRepAssignmentNotes(e.target.value)}
                placeholder="Reason for assignment, customer preferences, or territory handover notes..."
                className={FORM_TEXTAREA_CLS}
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-3 flex justify-end items-center gap-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsChangeRepModalOpen(false);
                  setChangeRepTargetCustomer(null);
                }}
                className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomerRepAssignment}
                className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Assign Sales Rep</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
