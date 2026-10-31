import React, { useState, useEffect } from "react";
import {
  UserPlus,
  Building2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  TrendingUp,
  Target,
  Eye,
  Search,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Edit3,
  UserCheck,
  Tag,
  Plus,
  History,
  Pencil,
  Flame,
  CheckCircle2,
  Clock,
  FileText,
  MessageCircle,
  Download,
  FolderUp,
  FolderDown,
  Paperclip,
  MoreVertical,
  Ban,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  Users,
  CreditCard,
  Briefcase,
} from "lucide-react";
import { CustomerFormModal } from "../../components/forms/CustomerFormModal";
import { LeadFormModal } from "../../components/forms/LeadFormModal";
import { Modal } from "../../components/common/Modal";
import { SearchBar } from "../../components/common/SearchBar";
import { FilterDropdown } from "../../components/common/FilterDropdown";
import { Pagination } from "../../components/common/Pagination";
import { ConfirmationModal } from "../../utils/confirmationModal";
import { customerApi } from "../../api/commerce/customerApi";
import {
  useGetPlatformLeadsQuery,
  useUpdatePlatformLeadStatusMutation,
  useDeletePlatformLeadMutation,
  useConvertPlatformLeadMutation,
  PlatformLeadItem,
} from "../../api/platform/leadApi";
import {
  useGetPlatformClientsQuery,
  useUpdatePlatformClientStatusMutation,
  useDeletePlatformClientMutation,
  PlatformClientItem,
} from "../../api/platform/clientApi";
import { Customer, Lead } from "../../types";
import { getStoredOrganizationId } from "../../api/config";

// Format ISO/Date string to DD/MM/YYYY
const formatDateDMY = (dateStr?: string | null): string => {
  if (!dateStr) return "-";
  try {
    const raw = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    const parts = raw.split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  } catch {
    return dateStr || "-";
  }
};

interface LeadsViewProps {
  initialCreateOpen?: boolean;
  onCloseInitialCreate?: () => void;
}

export const LeadsView: React.FC<LeadsViewProps> = ({
  initialCreateOpen = false,
  onCloseInitialCreate,
}) => {
  // Page Navigation State: 'leads' | 'clients'
  const [viewMode, setViewMode] = useState<"leads" | "clients">("leads");

  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(initialCreateOpen);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Quick Details View Modals
  const [selectedClientDetail, setSelectedClientDetail] =
    useState<Customer | null>(null);
  const [selectedLeadDetail, setSelectedLeadDetail] = useState<Lead | null>(
    null,
  );

  // 3-Dots Action Dropdown State
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);

  // Leads Search, Filter & Pagination State (Pending & Applied)
  const [pendingLeadSearch, setPendingLeadSearch] = useState("");
  const [appliedLeadSearch, setAppliedLeadSearch] = useState("");
  const [pendingLeadStatus, setPendingLeadStatus] = useState("All");
  const [appliedLeadStatus, setAppliedLeadStatus] = useState("All");
  const [leadPage, setLeadPage] = useState(1);
  const [leadLimit, setLeadLimit] = useState(10);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Close dropdown on outside click or scroll
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest(".lead-action-dropdown-btn") &&
        !target.closest(".lead-action-dropdown-menu")
      ) {
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
    window.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("scroll", handleScroll, true);
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

  const [commerceCustomers, setCommerceCustomers] = useState<Customer[]>([]);

  // Confirmation Modal State (Inactive / Suspend / Delete)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'Inactive' | 'Suspend' | 'Delete';
    category: 'client' | 'lead';
    id: string;
    name: string;
  } | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const customers = commerceCustomers;

  // Client Filters State (Pending & Applied)
  const [pendingClientSearch, setPendingClientSearch] = useState("");
  const [appliedClientSearch, setAppliedClientSearch] = useState("");
  const [pendingClientStatus, setPendingClientStatus] = useState("All");
  const [appliedClientStatus, setAppliedClientStatus] = useState("All");
  const [clientProductFilter, setClientProductFilter] = useState("All");
  const [clientStaffFilter, setClientStaffFilter] = useState("All");
  const [clientPaymentFilter, setClientPaymentFilter] = useState("All");
  const [clientPage, setClientPage] = useState(1);
  const [clientLimit, setClientLimit] = useState(10);

  // Header Sub-Organization and Branch Filter State
  const [activeSubOrgId, setActiveSubOrgId] = useState<string | undefined>(() => {
    return (
      localStorage.getItem("active_sub_organization_id") ||
      localStorage.getItem("active_sub_organization_id_sales") ||
      undefined
    );
  });
  const [activeSubOrgName, setActiveSubOrgName] = useState<string>(() => {
    return (
      localStorage.getItem("active_sub_organization") ||
      localStorage.getItem("active_sub_organization_client") ||
      "All"
    );
  });
  const [activeBranchId, setActiveBranchId] = useState<string | undefined>(() => {
    return (
      localStorage.getItem("active_branch_id") ||
      localStorage.getItem("active_branch_id_sales") ||
      undefined
    );
  });
  const [activeBranchName, setActiveBranchName] = useState<string>(() => {
    return (
      localStorage.getItem("active_branch") ||
      localStorage.getItem("active_branch_client") ||
      "All"
    );
  });

  // Listen to Header Sub-Org & Branch filter changes
  useEffect(() => {
    const handleSubOrgChanged = (e: any) => {
      const name = e?.detail?.name || localStorage.getItem("active_sub_organization") || "All";
      const id = e?.detail?.subOrganizationId || e?.detail?.id || localStorage.getItem("active_sub_organization_id");
      setActiveSubOrgName(name);
      setActiveSubOrgId(id && id !== "all" ? id : undefined);
      setLeadPage(1);
      setClientPage(1);
    };

    const handleBranchChanged = (e: any) => {
      const name = e?.detail?.branch || e?.detail?.name || localStorage.getItem("active_branch") || "All";
      const id = e?.detail?.branchId || e?.detail?.id || localStorage.getItem("active_branch_id");
      setActiveBranchName(name);
      setActiveBranchId(id && id !== "all" ? id : undefined);
      setLeadPage(1);
      setClientPage(1);
    };

    window.addEventListener("subOrgChanged", handleSubOrgChanged);
    window.addEventListener("branchChanged", handleBranchChanged);
    return () => {
      window.removeEventListener("subOrgChanged", handleSubOrgChanged);
      window.removeEventListener("branchChanged", handleBranchChanged);
    };
  }, []);

  const effectiveSubOrgId = activeSubOrgName !== "All" ? activeSubOrgId : undefined;
  const effectiveBranchId = activeBranchName !== "All" ? activeBranchId : undefined;

  // Active Organization ID
  const activeOrgId = getStoredOrganizationId();

  // Platform Clients API Query & Mutations
  const {
    data: platformClientsResponse,
    isLoading: isClientsLoading,
    refetch: refetchClients,
  } = useGetPlatformClientsQuery({
    page: clientPage,
    limit: clientLimit,
    search: appliedClientSearch || undefined,
    status: appliedClientStatus !== "All" ? (appliedClientStatus as any) : undefined,
    organizationType: "All",
    organization_id: activeOrgId || undefined,
    sub_organization_id: effectiveSubOrgId,
    branch_id: effectiveBranchId,
  });

  const [updatePlatformClientStatus] = useUpdatePlatformClientStatusMutation();
  const [deletePlatformClient] = useDeletePlatformClientMutation();

  const clientsPagination = platformClientsResponse?.pagination;
  const totalClientsCount =
    clientsPagination?.totalRecords ?? (platformClientsResponse?.data?.length || 0);

  // Platform Leads API Query & Mutations
  const {
    data: platformLeadsResponse,
    isLoading: isLeadsLoading,
    refetch: refetchLeads,
  } = useGetPlatformLeadsQuery({
    page: leadPage,
    limit: leadLimit,
    search: appliedLeadSearch || undefined,
    status: appliedLeadStatus !== "All" ? appliedLeadStatus : undefined,
    organization_id: activeOrgId || undefined,
    sub_organization_id: effectiveSubOrgId,
    branch_id: effectiveBranchId,
  });

  const [updatePlatformLeadStatus] = useUpdatePlatformLeadStatusMutation();
  const [deletePlatformLead] = useDeletePlatformLeadMutation();
  const [convertPlatformLead] = useConvertPlatformLeadMutation();

  const leadsPagination = platformLeadsResponse?.pagination;
  const leadsSummary = platformLeadsResponse?.summary;
  const totalLeadsCount = leadsPagination?.totalRecords ?? (platformLeadsResponse?.data?.length || 0);

  const handleUpdateClientStatus = async (id: string, newStatus: string) => {
    try {
      await updatePlatformClientStatus({ id, status: newStatus }).unwrap();
    } catch {
      try {
        await customerApi.patchCustomer(id, { status: newStatus as any });
      } catch {
        // Fallback
      }
    }
  };

  const handleDeleteClient = async (id: string) => {
    try {
      await deletePlatformClient(id).unwrap();
    } catch {
      try {
        await customerApi.deleteCustomer(id);
      } catch {
        // Fallback
      }
    }
  };

  const handleUpdateLeadStatus = async (id: string, newStatus: string) => {
    try {
      await updatePlatformLeadStatus({
        id,
        payload: { status: newStatus, notes: `Status changed to ${newStatus}` },
      }).unwrap();
    } catch (err: any) {
      console.error('Failed to update lead status:', err);
    }
  };

  const handleDeleteLead = async (id: string) => {
    try {
      await deletePlatformLead(id).unwrap();
    } catch (err: any) {
      console.error('Failed to delete lead:', err);
    }
  };

  // Handle direct create modal trigger if initialCreateOpen is passed
  useEffect(() => {
    if (initialCreateOpen) {
      setIsAddLeadOpen(true);
    }
  }, [initialCreateOpen]);

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setIsAddLeadOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsAddClientOpen(true);
  };

  const handleConvertLeadToCustomer = (lead: Lead) => {
    const prefill: Customer & { sourceLeadId?: string } = {
      id: "",
      sourceLeadId: lead.id,
      clientId: `CL-${Math.floor(1000 + Math.random() * 9000)}`,
      name: lead.name,
      company: lead.company || lead.name,
      contactPerson: lead.name,
      email: lead.email || "",
      phone: lead.phone || "",
      whatsapp: lead.whatsapp || lead.phone || "",
      alternatePhone: lead.alternatePhone || "",
      address: lead.address || "",
      city: lead.city || "",
      state: lead.state || "",
      pincode: lead.pincode || "",
      industry: "Technology & Logistics",
      status: "Active",
      linkedProducts: (
        lead.interestedProducts || [lead.interestedProductOrService]
      )
        .filter(Boolean)
        .map((p) => {
          const pName = normalizeProductName(p);
          return {
            productId: pName.toLowerCase().replace(/\s+/g, "_"),
            productName: pName,
            planName: "Enterprise Growth Tier",
            amount: 2499,
            since: new Date().getFullYear().toString(),
            status: "Active" as const,
          };
        }),
      documents: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingCustomer(prefill);
    setIsAddClientOpen(true);
  };

  // Map Platform Client items into unified table format
  const rawPlatformClients: PlatformClientItem[] = platformClientsResponse?.data || [];
  const clientsFromApi: any[] = rawPlatformClients.map((pc, idx) => {
    const rawProds: any[] = [];
    if (pc.subscription?.planName || pc.subscriptionPlan) {
      rawProds.push({
        productId: pc.subscription?.planId || "prod_sub",
        productName: pc.subscription?.planName || pc.subscriptionPlan || "Enterprise Plan",
        planName: pc.subscription?.planName || pc.subscriptionPlan || "Enterprise Plan",
        amount: pc.subscription?.amount || 0,
        since: pc.subscription?.startDate || (pc.createdAt ? pc.createdAt.split("T")[0] : ""),
        status: pc.subscription?.status || "Active",
      });
    }

    // Format renewal date
    let renewalDisplay = "None";
    if (pc.subscription?.endDate) {
      const d = new Date(pc.subscription.endDate);
      renewalDisplay = !isNaN(d.getTime())
        ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
        : pc.subscription.endDate;
    }

    // Payment / Invoice status
    let paymentStatus = "Paid";
    if (pc.billing) {
      if (pc.billing.overdueInvoices > 0) {
        paymentStatus = "Overdue";
      } else if (pc.billing.outstanding > 0) {
        paymentStatus = "Pending";
      } else {
        paymentStatus = "Paid";
      }
    }

    return {
      id: pc.id,
      clientId: pc.code || pc.id,
      code: pc.code,
      name: pc.name,
      company: pc.legalName || pc.name,
      legalName: pc.legalName,
      contactPerson: pc.contactPerson || pc.name,
      phone: pc.phone || "",
      whatsapp: pc.whatsapp || pc.phone || "",
      email: pc.email || "",
      alternatePhone: "",
      address: pc.address || pc.location || "",
      location: pc.location || "",
      city: pc.location || "",
      state: "",
      pincode: "",
      industry: pc.industry || "Technology & Logistics",
      status: pc.status || (pc.active ? "Active" : "Inactive"),
      active: pc.active,
      organizationType: pc.organizationType,
      registrationType: pc.registrationType,
      gstNumber: pc.gstNumber,
      gstin: pc.gstNumber,
      panNumber: pc.panNumber,
      pan: pc.panNumber,
      renewalDate: renewalDisplay,
      paymentStatus,
      billing: pc.billing,
      subscription: pc.subscription,
      branchesCount: pc.branchesCount,
      subOrganizationsCount: pc.subOrganizationsCount,
      membersCount: pc.membersCount,
      linkedProducts: rawProds,
      documents: [],
      organizationId: (pc as any).organizationId || "",
      subOrganizationId: (pc as any).subOrganizationId || "",
      subOrganizationName: (pc as any).subOrganizationName || (pc as any).subOrganization?.name || "",
      branchId: (pc as any).branchId || "",
      branchName: (pc as any).branchName || (pc as any).branch?.name || "",
      createdAt: pc.createdAt,
      updatedAt: pc.updatedAt,
    };
  });

  // Filtered Clients (incorporating live API clients + fallback + client safeguard for subOrg and branch)
  const allCustomerSource = clientsFromApi.length > 0 ? clientsFromApi : customers;
  const filteredCustomers = allCustomerSource.filter((c: any) => {
    // Sub-org safeguard filter if selected
    if (effectiveSubOrgId) {
      const clientSubId = c.subOrganizationId || c.sub_organization_id;
      if (clientSubId && clientSubId !== effectiveSubOrgId) {
        return false;
      }
    }

    // Branch safeguard filter if selected
    if (effectiveBranchId) {
      const clientBranchId = c.branchId || c.branch_id;
      if (clientBranchId && clientBranchId !== effectiveBranchId) {
        return false;
      }
    }

    // If backend already filtered search and status, respect it, but apply client dropdown filters if any
    const prods = (c.linkedProducts || []).map((p: any) =>
      p.productName.toLowerCase(),
    );
    const matchesProduct =
      clientProductFilter === "All" ||
      prods.some((pName: string) =>
        pName.includes(clientProductFilter.toLowerCase()),
      ) ||
      (clientProductFilter === "Digital Marketing" && c.usesDigitalMarketing);

    const staff = c.assignedStaffName || "Alex Rivera";
    const matchesStaff =
      clientStaffFilter === "All" || staff.includes(clientStaffFilter);

    const payment = c.paymentStatus || "Paid";
    const matchesPayment =
      clientPaymentFilter === "All" || payment === clientPaymentFilter;

    return matchesProduct && matchesStaff && matchesPayment;
  });

  // Map Platform Lead items into table format
  const rawPlatformLeads: PlatformLeadItem[] = platformLeadsResponse?.data || [];
  const leads: any[] = rawPlatformLeads.map((pl) => {
    return {
      id: pl.id,
      leadId: pl.leadCode || pl.id,
      leadDate: pl.createdAt ? pl.createdAt.split("T")[0] : "",
      name: pl.name,
      company: pl.company,
      designation: pl.designation || (pl as any).designation || "",
      phone: pl.phone,
      whatsapp: pl.whatsapp || pl.phone,
      email: pl.email,
      alternatePhone: "",
      address: pl.location || "",
      city: pl.location || "",
      state: "",
      pincode: "",
      location: pl.location || "",
      leadSource: pl.source || "Website",
      source: pl.source || "Website",
      interestedProducts: pl.planInterest ? [pl.planInterest] : ["YaaConnect"],
      interestedProductOrService: pl.planInterest || "YaaConnect",
      assignedStaffId: pl.assignedTo || "",
      assignedStaffName: pl.assignedTo ? "Assigned Agent" : undefined,
      // A lead that produced a client is Converted to Client, whatever stored status the API keeps for it.
      status: pl.convertedOrganizationId ? "Converted to Client" : pl.status || "Open",
      priority: pl.priority || "Medium",
      interest: "High",
      tags: [],
      requirements: pl.notes || "",
      expectedBudget: pl.value || 0,
      value: pl.value || 0,
      planInterest: pl.planInterest,
      leadCode: pl.leadCode,
      convertedOrganizationId: pl.convertedOrganizationId,
      convertedOrganization: pl.convertedOrganization,
      convertedAt: pl.convertedAt,
      nextAction: pl.planInterest ? `Interest: ${pl.planInterest}` : "",
      nextFollowUpDate: pl.followUpDate || "",
      notes: pl.notes || "",
      feedback: pl.notes || "",
      organizationId: (pl as any).organizationId || (pl as any).organization_id || "",
      subOrganizationId: (pl as any).subOrganizationId || (pl as any).sub_organization_id || "",
      branchId: (pl as any).branchId || (pl as any).branch_id || "",
      subOrganizationName: (pl as any).subOrganizationName || (pl as any).subOrganization?.name || "",
      branchName: (pl as any).branchName || (pl as any).branch?.name || "",
      createdAt: pl.createdAt,
      updatedAt: pl.updatedAt,
    };
  });

  // Filtered Leads (server-side params already applied, with client safeguard for subOrg and branch)
  const filteredLeads = leads.filter((l) => {
    if (effectiveSubOrgId) {
      const leadSubId = l.subOrganizationId || (l as any).sub_organization_id;
      if (leadSubId && leadSubId !== effectiveSubOrgId) {
        return false;
      }
    }
    if (effectiveBranchId) {
      const leadBranchId = l.branchId || (l as any).branch_id;
      if (leadBranchId && leadBranchId !== effectiveBranchId) {
        return false;
      }
    }
    return true;
  });

  // Clean ID Formatter (e.g. PLD-2026-0001 or LD-101)
  const formatDisplayId = (
    prefix: "CL" | "LD",
    rawId?: string,
    fallbackIdx = 101,
  ): string => {
    if (!rawId) return `${prefix}-${fallbackIdx}`;
    if (rawId.startsWith("PLD-")) return rawId;
    if (rawId.startsWith("CL-") || rawId.startsWith("LD-")) {
      const parts = rawId.split("-");
      if (
        parts.length === 2 &&
        !parts[1].includes("cust") &&
        !parts[1].includes("lead")
      ) {
        return rawId;
      }
    }
    const cleanNum = rawId.replace(/[^0-9]/g, "");
    if (cleanNum) {
      return `${prefix}-${cleanNum.length > 5 ? cleanNum.slice(-4) : cleanNum}`;
    }
    return `${prefix}-${fallbackIdx}`;
  };

  // Product Name Normalizer & Dot Color
  const normalizeProductName = (name?: string): string => {
    if (!name) return "YaaConnect";
    const clean = name.trim();
    const lower = clean.toLowerCase();
    if (
      lower.includes("enterprise service") ||
      lower.includes("omniflow") ||
      lower.includes("yaa")
    )
      return "YaaConnect";
    if (lower.includes("chatsphere") || lower.includes("aarudam"))
      return "Aarudam AI";
    if (
      lower.includes("nexus") ||
      lower.includes("dentq") ||
      lower.includes("doc dent")
    )
      return "Doc DentQ";
    if (
      lower.includes("pulse") ||
      lower.includes("motez") ||
      lower.includes("doc motez")
    )
      return "DocMotez";
    if (lower.includes("turfy") || lower.includes("turf")) return "TurfyLock";
    if (lower.includes("marketing") || lower.includes("digital"))
      return "Digital Marketing";
    return clean;
  };

  const getProductDotColor = (name: string): string => {
    switch (name) {
      case "YaaConnect":
        return "bg-blue-600";
      case "DocMotez":
        return "bg-emerald-600";
      case "Doc DentQ":
        return "bg-cyan-600";
      case "TurfyLock":
        return "bg-amber-600";
      case "Aarudam AI":
        return "bg-purple-600";
      case "Digital Marketing":
        return "bg-rose-600";
      default:
        return "bg-indigo-600";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Open":
      case "New":
        return "bg-blue-50 text-blue-600 font-bold";
      case "Contacted":
        return "bg-amber-50 text-amber-600 font-bold";
      case "Qualified":
        return "bg-indigo-50 text-indigo-600 font-bold";
      case "Proposal":
        return "bg-sky-50 text-sky-600 font-bold";
      case "Negotiation":
        return "bg-orange-50 text-orange-600 font-bold";
      case "Won":
        return "bg-emerald-50 text-emerald-700 font-bold";
      case "Interested":
        return "bg-purple-50 text-purple-600 font-bold";
      case "Follow-up":
        return "bg-orange-50 text-orange-600 font-bold";
      case "Onboarding":
        return "bg-cyan-50 text-cyan-600 font-bold";
      case "Converted":
      case "Converted to Client":
      case "Active":
        return "bg-emerald-50 text-emerald-600 font-bold";
      case "Not Interested":
      case "Inactive":
      case "Lost":
        return "bg-rose-50 text-rose-600 font-bold";
      default:
        return "bg-slate-50 text-slate-600 font-bold";
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200 pb-12">
      {/* Top Header Row with Title on Left and Action Buttons on Right */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Clients & Leads Center
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Streamline client intake, convert prospective leads, and manage
            directory details.
          </p>
        </div>

        {/* Top Right Action Buttons (Lead First, Client Second) */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setEditingLead(null);
              setIsAddLeadOpen(true);
            }}
            className="h-10 sm:h-11 px-5 sm:px-6 bg-[#33077C] hover:bg-[#432eb5] text-white font-bold text-xs sm:text-sm rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 text-white stroke-[2.5]" />
            <span>Add Lead</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingCustomer(null);
              setIsAddClientOpen(true);
            }}
            className="h-10 sm:h-11 px-5 sm:px-6 bg-[#33077C] hover:bg-[#432eb5] text-white font-bold text-xs sm:text-sm rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 text-white stroke-[2.5]" />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* Standalone Centered View Switcher */}
      <div className="flex justify-center items-center w-full">
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => setViewMode("leads")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer flex items-center gap-2 ${
              viewMode === "leads"
                ? "bg-[#33077C] text-white shadow-sm"
                : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300 shadow-2xs"
            }`}
          >
            {viewMode === "leads" && (
              <Check className="w-3.5 h-3.5 stroke-[3] text-white" />
            )}
            <span>Leads & Prospects</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("clients")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer flex items-center gap-2 ${
              viewMode === "clients"
                ? "bg-[#33077C] text-white shadow-sm"
                : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300 shadow-2xs"
            }`}
          >
            {viewMode === "clients" && (
              <Check className="w-3.5 h-3.5 stroke-[3] text-white" />
            )}
            <span>Client Accounts</span>
          </button>
        </div>
      </div>

      {/* TAB 1: CLIENTS DIRECTORY */}
      {viewMode === "clients" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Search Bar & Dropdown Filter Row */}
          <SearchBar
            value={pendingClientSearch}
            onChange={(val) => setPendingClientSearch(val)}
            placeholder="Search clients by name, business, email, phone, location, client ID..."
            onSubmit={() => {
              setAppliedClientSearch(pendingClientSearch);
              setAppliedClientStatus(pendingClientStatus);
            }}
            onReset={() => {
              setPendingClientSearch("");
              setAppliedClientSearch("");
              setPendingClientStatus("All");
              setAppliedClientStatus("All");
            }}
            filterSlot={
              <div className="flex items-center gap-2.5">
                <FilterDropdown
                  options={[
                    { label: "Status : All", value: "All" },
                    { label: "Active", value: "Active", dotColor: "#10b981" },
                    { label: "Onboard", value: "Onboard", dotColor: "#3b82f6" },
                    {
                      label: "Inactive",
                      value: "Inactive",
                      dotColor: "#64748b",
                    },
                    {
                      label: "Suspended",
                      value: "Suspended",
                      dotColor: "#f59e0b",
                    },
                  ]}
                  value={pendingClientStatus}
                  onChange={(val) => setPendingClientStatus(val)}
                  placeholder="Status : All"
                />
              </div>
            }
            rightSlot={
              <div className="flex items-center gap-3 pr-1">
                <span className="text-xs font-semibold text-slate-500">
                  Total Clients :{" "}
                  <span className="text-[#33077C] font-bold">
                    {totalClientsCount}
                  </span>
                </span>
              </div>
            }
          />

          {/* Clients Table (Client | Contact | Products | Channels | Status | Renewal | Payment | Actions) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-[#33077C] text-[12px] font-bold text-white tracking-wider uppercase">
                    <th className="py-4 px-4 border border-[#3e0b96] bg-[#33077C] text-white">
                      CLIENT
                    </th>
                    <th className="py-4 px-4 border border-[#3e0b96] bg-[#33077C] text-white">
                      CONTACT
                    </th>
                    <th className="py-4 px-4 border border-[#3e0b96] bg-[#33077C] text-white">
                      PRODUCTS
                    </th>
                    <th className="py-4 px-4 border border-[#3e0b96] bg-[#33077C] text-white text-center">
                      CHANNELS
                    </th>
                    <th className="py-4 px-4 border border-[#3e0b96] bg-[#33077C] text-white">
                      STATUS
                    </th>
                    <th className="py-4 px-4 border border-[#3e0b96] bg-[#33077C] text-white">
                      PAYMENT
                    </th>
                    <th className="py-4 px-4 border border-[#3e0b96] bg-[#33077C] text-white text-center">
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {isClientsLoading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-16 text-center text-slate-400 border border-slate-200"
                      >
                        <div className="w-7 h-7 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="font-bold text-slate-700 text-sm">Loading client accounts...</p>
                      </td>
                    </tr>
                  ) : filteredCustomers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-16 text-center text-slate-400 border border-slate-200"
                      >
                        <Building2 className="w-9 h-9 mx-auto mb-2 opacity-30 text-purple-400" />
                        <p className="font-bold text-slate-700 text-sm">
                          No client accounts found
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Try searching with different filters or add a new
                          client.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((client: any, index: number) => {
                      const clientStatus = client.status || (client.active ? "Active" : "Inactive");
                      const renewalDate = client.renewalDate && client.renewalDate !== "None" ? client.renewalDate : "-";
                      const paymentStatus = client.paymentStatus || "-";
                      const phoneNum = client.phone || "";
                      const whatsappNum = client.whatsapp || client.phone || "";
                      const emailAddr = client.email || "";

                      return (
                        <tr
                          key={client.id}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          {/* 1. Client */}
                          <td className="py-4 px-4 border border-slate-200">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 text-xs sm:text-[13px] tracking-tight">
                                  {client.company || client.name}
                                </span>
                                <span className="text-xs font-semibold text-purple-700">
                                  (
                                  {formatDisplayId(
                                    "CL",
                                    client.clientId || client.id,
                                    101 + index,
                                  )}
                                  )
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                                {client.contactPerson || client.name}
                              </div>
                            </div>
                          </td>

                          {/* 2. Contact */}
                          <td className="py-4 px-4 border border-slate-200">
                            <div className="font-semibold text-slate-800 text-xs sm:text-[13px]">
                              {client.contactPerson || client.name}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Primary Contact
                            </div>
                          </td>

                          {/* 3. Products (1 displayed + "+ X more") */}
                          <td className="py-4 px-4 border border-slate-200">
                            <div className="flex flex-col gap-1.5">
                              {(() => {
                                const rawProds = (
                                  client.linkedProducts || []
                                ).map((p: any) =>
                                  normalizeProductName(p.productName),
                                );
                                if (
                                  client.usesDigitalMarketing &&
                                  !rawProds.includes("Digital Marketing")
                                ) {
                                  rawProds.push("Digital Marketing");
                                }
                                const uniqueProds = Array.from(
                                  new Set(rawProds),
                                );
                                const finalProds = uniqueProds;

                                if (finalProds.length === 0) {
                                  return (
                                    <span className="text-xs text-slate-400 font-normal">
                                      -
                                    </span>
                                  );
                                }

                                const visibleProds = finalProds.slice(0, 1);
                                const remainingCount = finalProds.length - 1;
                                const remainingProds = finalProds.slice(1);

                                return (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {visibleProds.map(
                                      (pName: string, idx: number) => (
                                        <div
                                          key={idx}
                                          className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 whitespace-nowrap"
                                        >
                                          <span
                                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${getProductDotColor(pName as string)}`}
                                          ></span>
                                          <span>{pName}</span>
                                        </div>
                                      ),
                                    )}
                                    {remainingCount > 0 && (
                                      <span
                                        className="text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                                        title={remainingProds.join(", ")}
                                      >
                                        +{remainingCount} more
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </td>

                          {/* 4. Channels (Phone, WhatsApp, Mail with On-Hover Tooltips) */}
                          <td className="py-4 px-4 border border-slate-200">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Phone Icon & Tooltip */}
                              <div className="relative group">
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleCopy(
                                      e,
                                      phoneNum,
                                      `client-${client.id}-phone`,
                                    )
                                  }
                                  className="w-8.5 h-8.5 rounded-full bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white flex items-center justify-center transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </button>
                                <div
                                  className={`transition-all duration-200 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 text-white text-[11px] font-semibold rounded-lg shadow-lg whitespace-nowrap z-30 ${
                                    copiedKey === `client-${client.id}-phone`
                                      ? "opacity-100 bg-emerald-600 scale-100"
                                      : "opacity-0 group-hover:opacity-100 bg-slate-900"
                                  }`}
                                >
                                  {copiedKey === `client-${client.id}-phone`
                                    ? "Phone number copied"
                                    : phoneNum}
                                </div>
                              </div>

                              {/* WhatsApp Icon & Tooltip */}
                              <div className="relative group">
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleCopy(
                                      e,
                                      whatsappNum || phoneNum,
                                      `client-${client.id}-wa`,
                                    )
                                  }
                                  className="w-8.5 h-8.5 rounded-full bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white flex items-center justify-center transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </button>
                                <div
                                  className={`transition-all duration-200 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 text-white text-[11px] font-semibold rounded-lg shadow-lg whitespace-nowrap z-30 ${
                                    copiedKey === `client-${client.id}-wa`
                                      ? "opacity-100 bg-emerald-600 scale-100"
                                      : "opacity-0 group-hover:opacity-100 bg-slate-900"
                                  }`}
                                >
                                  {copiedKey === `client-${client.id}-wa`
                                    ? "WhatsApp number copied"
                                    : whatsappNum || phoneNum}
                                </div>
                              </div>

                              {/* Mail Icon & Tooltip */}
                              <div className="relative group">
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleCopy(
                                      e,
                                      emailAddr,
                                      `client-${client.id}-email`,
                                    )
                                  }
                                  className="w-8.5 h-8.5 rounded-full bg-purple-50 hover:bg-[#33077C] text-[#33077C] hover:text-white flex items-center justify-center transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                </button>
                                <div
                                  className={`transition-all duration-200 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 text-white text-[11px] font-semibold rounded-lg shadow-lg whitespace-nowrap z-30 ${
                                    copiedKey === `client-${client.id}-email`
                                      ? "opacity-100 bg-emerald-600 scale-100"
                                      : "opacity-0 group-hover:opacity-100 bg-slate-900"
                                  }`}
                                >
                                  {copiedKey === `client-${client.id}-email`
                                    ? "Email address copied"
                                    : emailAddr}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 5. Status */}
                          <td className="py-4 px-4 border border-slate-200">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                clientStatus === "Active"
                                  ? "bg-emerald-50 text-emerald-600"
                                  : clientStatus === "Onboard" ||
                                      clientStatus === "Onboarding"
                                    ? "bg-cyan-50 text-cyan-600"
                                    : clientStatus === "Paused"
                                      ? "bg-amber-50 text-amber-600"
                                      : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {clientStatus}
                            </span>
                          </td>

                          {/* 6. Payment */}
                          <td className="py-4 px-4 border border-slate-200">
                            {paymentStatus && paymentStatus !== "-" ? (
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                  paymentStatus === "Paid"
                                    ? "bg-emerald-50 text-emerald-600"
                                    : paymentStatus === "Pending"
                                      ? "bg-amber-50 text-amber-600"
                                      : "bg-rose-50 text-rose-600"
                                }`}
                              >
                                {paymentStatus}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 font-normal">-</span>
                            )}
                          </td>

                          {/* 8. Actions */}
                          <td className="py-4 px-4 border border-slate-200 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activeDropdownId === client.id) {
                                  setActiveDropdownId(null);
                                  setDropdownPos(null);
                                } else {
                                  const rect = (
                                    e.currentTarget as HTMLElement
                                  ).getBoundingClientRect();
                                  const spaceBelow =
                                    window.innerHeight - rect.bottom;
                                  const dropdownHeight = 200;
                                  if (spaceBelow < dropdownHeight) {
                                    setDropdownPos({
                                      bottom: window.innerHeight - rect.top + 6,
                                      right: window.innerWidth - rect.right,
                                    });
                                  } else {
                                    setDropdownPos({
                                      top: rect.bottom + 6,
                                      right: window.innerWidth - rect.right,
                                    });
                                  }
                                  setActiveDropdownId(client.id);
                                }
                              }}
                              className={`lead-action-dropdown-btn w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 mx-auto ${
                                activeDropdownId === client.id
                                  ? "bg-[#4309A2] text-white ring-2 ring-[#4309A2]/20"
                                  : "bg-[#33077C] hover:bg-[#4309A2] text-white"
                              }`}
                              title="Actions"
                            >
                              <MoreVertical className="w-4 h-4 fill-white text-white" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Client Pagination */}
          <div className="pt-2">
            <Pagination
              currentPage={clientPage}
              pageSize={clientLimit}
              total={totalClientsCount}
              pageSizeOptions={[5, 10, 20, 50]}
              onPageChange={(p) => setClientPage(p)}
              onPageSizeChange={(size) => {
                setClientLimit(size);
                setClientPage(1);
              }}
            />
          </div>
        </div>
      )}

      {/* TAB 2: LEADS PIPELINE */}
      {viewMode === "leads" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Search & Status Filter Bar */}
          <SearchBar
            value={pendingLeadSearch}
            onChange={(val) => setPendingLeadSearch(val)}
            placeholder="Search leads by name, company, email, phone, source, lead ID..."
            onSubmit={() => {
              setAppliedLeadSearch(pendingLeadSearch);
              setAppliedLeadStatus(pendingLeadStatus);
            }}
            onReset={() => {
              setPendingLeadSearch("");
              setAppliedLeadSearch("");
              setPendingLeadStatus("All");
              setAppliedLeadStatus("All");
            }}
            filterSlot={
              <div className="flex items-center gap-2.5">
                <FilterDropdown
                  options={[
                    { label: "Status : All", value: "All" },
                    { label: "Open", value: "Open", dotColor: "#3b82f6" },
                    { label: "Contacted", value: "Contacted", dotColor: "#f59e0b" },
                    { label: "Qualified", value: "Qualified", dotColor: "#6366f1" },
                    { label: "Converted to Client", value: "Converted to Client", dotColor: "#10b981" },
                    { label: "Inactive", value: "Inactive", dotColor: "#94a3b8" },
                    { label: "Lost", value: "Lost", dotColor: "#64748b" },
                  ]}
                  value={pendingLeadStatus}
                  onChange={(val) => setPendingLeadStatus(val)}
                  placeholder="Status : All"
                />
              </div>
            }
            rightSlot={
              <div className="flex items-center gap-3 pr-1">
                <span className="text-xs font-semibold text-slate-500">
                  Total Leads :{" "}
                  <span className="text-[#33077C] font-bold">
                    {totalLeadsCount}
                  </span>
                </span>
              </div>
            }
          />

          {/* Leads Table (Grid Borders for Rows & Columns + Header Background) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-[#33077C] text-[12px] font-bold text-white tracking-wider uppercase">
                    <th className="py-4 px-5 border border-[#3e0b96] bg-[#33077C] text-white">
                      LEAD CODE & PROSPECT
                    </th>
                    <th className="py-4 px-5 border border-[#3e0b96] bg-[#33077C] text-white">
                      CONTACT INFO
                    </th>
                    <th className="py-4 px-5 border border-[#3e0b96] bg-[#33077C] text-white">
                      SOURCE & OFFERINGS
                    </th>
                    <th className="py-4 px-5 border border-[#3e0b96] bg-[#33077C] text-white">
                      STATUS & PRIORITY
                    </th>
                    <th className="py-4 px-5 border border-[#3e0b96] bg-[#33077C] text-white">
                      NEXT FOLLOW-UP
                    </th>
                    <th className="py-4 px-5 border border-[#3e0b96] bg-[#33077C] text-white text-center">
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-16 text-center text-slate-400 border border-slate-200"
                      >
                        <Sparkles className="w-9 h-9 mx-auto mb-2 opacity-30 text-orange-400" />
                        <p className="font-bold text-slate-700 text-sm">
                          No leads found in pipeline
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Capture a new lead or adjust your search and filters.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead, index) => {
                      const prods =
                        lead.interestedProducts ||
                        [lead.interestedProductOrService].filter(Boolean);

                      return (
                        <tr
                          key={lead.id}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          {/* Lead Code & Business */}
                          <td className="py-4 px-5 border border-slate-200">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 text-xs sm:text-[13px] tracking-tight">
                                  {lead.company || lead.name}
                                </span>
                                <span className="text-xs font-semibold text-orange-600">
                                  (
                                  {formatDisplayId(
                                    "LD",
                                    lead.leadId || lead.id,
                                    101 + index,
                                  )}
                                  )
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                                {lead.name}{" "}
                                {lead.designation
                                  ? `- ${lead.designation}`
                                  : ""}
                              </div>
                            </div>
                          </td>

                          {/* Contact Channels (Phone, WhatsApp, Mail with On-Hover Tooltips) */}
                          <td className="py-4 px-5 border border-slate-200">
                            <div className="flex items-center gap-1.5">
                              {/* Phone Icon & Tooltip */}
                              <div className="relative group">
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleCopy(
                                      e,
                                      lead.phone || "",
                                      `lead-${lead.id}-phone`,
                                    )
                                  }
                                  className="w-8.5 h-8.5 rounded-full bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white flex items-center justify-center transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </button>
                                <div
                                  className={`transition-all duration-200 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 text-white text-[11px] font-semibold rounded-lg shadow-lg whitespace-nowrap z-30 ${
                                    copiedKey === `lead-${lead.id}-phone`
                                      ? "opacity-100 bg-emerald-600 scale-100"
                                      : "opacity-0 group-hover:opacity-100 bg-slate-900"
                                  }`}
                                >
                                  {copiedKey === `lead-${lead.id}-phone`
                                    ? "Phone number copied"
                                    : lead.phone || "No phone"}
                                </div>
                              </div>

                              {/* WhatsApp Icon & Tooltip */}
                              <div className="relative group">
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleCopy(
                                      e,
                                      lead.whatsapp || lead.phone || "",
                                      `lead-${lead.id}-wa`,
                                    )
                                  }
                                  className="w-8.5 h-8.5 rounded-full bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white flex items-center justify-center transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </button>
                                <div
                                  className={`transition-all duration-200 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 text-white text-[11px] font-semibold rounded-lg shadow-lg whitespace-nowrap z-30 ${
                                    copiedKey === `lead-${lead.id}-wa`
                                      ? "opacity-100 bg-emerald-600 scale-100"
                                      : "opacity-0 group-hover:opacity-100 bg-slate-900"
                                  }`}
                                >
                                  {copiedKey === `lead-${lead.id}-wa`
                                    ? "WhatsApp number copied"
                                    : lead.whatsapp ||
                                      lead.phone ||
                                      "No WhatsApp"}
                                </div>
                              </div>

                              {/* Mail Icon & Tooltip */}
                              <div className="relative group">
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleCopy(
                                      e,
                                      lead.email || "",
                                      `lead-${lead.id}-email`,
                                    )
                                  }
                                  className="w-8.5 h-8.5 rounded-full bg-purple-50 hover:bg-[#33077C] text-[#33077C] hover:text-white flex items-center justify-center transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                </button>
                                <div
                                  className={`transition-all duration-200 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 text-white text-[11px] font-semibold rounded-lg shadow-lg whitespace-nowrap z-30 ${
                                    copiedKey === `lead-${lead.id}-email`
                                      ? "opacity-100 bg-emerald-600 scale-100"
                                      : "opacity-0 group-hover:opacity-100 bg-slate-900"
                                  }`}
                                >
                                  {copiedKey === `lead-${lead.id}-email`
                                    ? "Email address copied"
                                    : lead.email || "No email"}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Source & Offerings */}
                          <td className="py-4 px-5 border border-slate-200">
                            <div className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                              <Tag className="w-3.5 h-3.5 text-slate-400" />
                              <span>
                                {lead.leadSource || lead.source || "Website"}
                              </span>
                            </div>
                            <div className="flex flex-col gap-1">
                              {(() => {
                                const raw = (
                                  lead.interestedProducts || [
                                    lead.interestedProductOrService,
                                  ]
                                )
                                  .filter(Boolean)
                                  .map((p) => normalizeProductName(p));
                                const unique = Array.from(new Set(raw));
                                const final =
                                  unique.length > 0 ? unique : ["YaaConnect"];

                                const visibleProds = final.slice(0, 1);
                                const remainingCount = final.length - 1;
                                const remainingProds = final.slice(1);

                                return (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {visibleProds.map(
                                      (pName: string, idx: number) => (
                                        <div
                                          key={idx}
                                          className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 whitespace-nowrap"
                                        >
                                          <span
                                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${getProductDotColor(pName)}`}
                                          ></span>
                                          <span>{pName}</span>
                                        </div>
                                      ),
                                    )}
                                    {remainingCount > 0 && (
                                      <span
                                        className="text-[10px] font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                                        title={remainingProds.join(", ")}
                                      >
                                        +{remainingCount} more
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </td>

                          {/* Status & Priority */}
                          <td className="py-4 px-5 border border-slate-200">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(lead.status)}`}
                              >
                                {lead.status}
                              </span>
                            </div>
                            {lead.assignedStaffName && (
                              <div className="text-[11px] text-slate-400 mt-1">
                                Assigned: {lead.assignedStaffName}
                              </div>
                            )}
                          </td>

                          {/* Next Follow-Up */}
                          <td className="py-4 px-5 border border-slate-200">
                            <div className="flex items-center gap-1.5 text-slate-700 font-medium text-xs sm:text-[13px]">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>
                                {lead.nextFollowUpDate
                                  ? formatDateDMY(lead.nextFollowUpDate)
                                  : "Not Scheduled"}
                              </span>
                            </div>
                            {lead.nextAction && (
                              <div className="text-[11px] text-slate-500 truncate max-w-[150px] mt-0.5">
                                {lead.nextAction}
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activeDropdownId === lead.id) {
                                  setActiveDropdownId(null);
                                  setDropdownPos(null);
                                } else {
                                  const rect = (
                                    e.currentTarget as HTMLElement
                                  ).getBoundingClientRect();
                                  const spaceBelow =
                                    window.innerHeight - rect.bottom;
                                  const dropdownHeight = 200;
                                  if (spaceBelow < dropdownHeight) {
                                    setDropdownPos({
                                      bottom: window.innerHeight - rect.top + 6,
                                      right: window.innerWidth - rect.right,
                                    });
                                  } else {
                                    setDropdownPos({
                                      top: rect.bottom + 6,
                                      right: window.innerWidth - rect.right,
                                    });
                                  }
                                  setActiveDropdownId(lead.id);
                                }
                              }}
                              className={`lead-action-dropdown-btn w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 mx-auto ${
                                activeDropdownId === lead.id
                                  ? "bg-[#4309A2] text-white ring-2 ring-[#4309A2]/20"
                                  : "bg-[#33077C] hover:bg-[#4309A2] text-white"
                              }`}
                              title="Actions"
                            >
                              <MoreVertical className="w-4 h-4 fill-white text-white" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Leads Pagination */}
          <div className="pt-2">
            <Pagination
              currentPage={leadPage}
              pageSize={leadLimit}
              total={totalLeadsCount}
              pageSizeOptions={[5, 10, 20, 50]}
              onPageChange={(p) => setLeadPage(p)}
              onPageSizeChange={(size) => {
                setLeadLimit(size);
                setLeadPage(1);
              }}
            />
          </div>
        </div>
      )}

      {/* Client Details Quick View Modal */}
      {selectedClientDetail && (
        <Modal
          isOpen={!!selectedClientDetail}
          onClose={() => setSelectedClientDetail(null)}
          title="Corporate Client Profile"
          subtitle="View client contact specifications, address details, and linked products"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          maxWidth="4xl"
        >
          <div className="space-y-6">
            {/* Top Overview / Profile Header Card matching reference standard */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#33077C] text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
                  {((selectedClientDetail.company || selectedClientDetail.name) || "CL").substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                      {selectedClientDetail.company || selectedClientDetail.name}
                    </h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                      {formatDisplayId(
                        "CL",
                        selectedClientDetail.clientId || selectedClientDetail.id,
                      )}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-md border bg-indigo-50 text-indigo-700 border-indigo-200">
                      Corporate Client
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {selectedClientDetail.city ||
                        selectedClientDetail.address ||
                        selectedClientDetail.location ||
                        "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex sm:flex-col items-start sm:items-end gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {selectedClientDetail.status || "Active"}
                </span>
              </div>
            </div>

            {/* Exactly 2 Columns: Client Information & Location Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              {/* COLUMN 1: Client Information */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3.5">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[#33077C] flex items-center justify-center font-bold">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <span>Client Information</span>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs sm:text-[13px]">
                  <span className="text-slate-400 font-medium shrink-0">Client Name</span>
                  <span className="font-bold text-slate-800 text-right">
                    {selectedClientDetail.name || "-"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs sm:text-[13px] pt-2.5 border-t border-slate-100">
                  <span className="text-slate-400 font-medium shrink-0">Client Business</span>
                  <span className="font-bold text-slate-800 text-right">
                    {selectedClientDetail.company || selectedClientDetail.name || "-"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs sm:text-[13px] pt-2.5 border-t border-slate-100">
                  <span className="text-slate-400 font-medium shrink-0">Contact Person</span>
                  <span className="font-bold text-slate-800 text-right">
                    {selectedClientDetail.contactPerson || selectedClientDetail.name || "-"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs sm:text-[13px] pt-2.5 border-t border-slate-100">
                  <span className="text-slate-400 font-medium shrink-0">Phone Number</span>
                  <span className="font-bold text-slate-800 text-right">
                    {selectedClientDetail.phone || "-"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs sm:text-[13px] pt-2.5 border-t border-slate-100">
                  <span className="text-slate-400 font-medium shrink-0">WhatsApp Number</span>
                  <span className="font-bold text-slate-800 text-right">
                    {selectedClientDetail.whatsapp || selectedClientDetail.phone || "-"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs sm:text-[13px] pt-2.5 border-t border-slate-100">
                  <span className="text-slate-400 font-medium shrink-0">Email</span>
                  <span className="font-bold text-slate-800 text-right truncate max-w-[200px]">
                    {selectedClientDetail.email || "-"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs sm:text-[13px] pt-2.5 border-t border-slate-100">
                  <span className="text-slate-400 font-medium shrink-0">GST Number</span>
                  <span className="font-bold text-slate-800 text-right uppercase">
                    {selectedClientDetail.gstin || (selectedClientDetail as any).gstNumber || "-"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs sm:text-[13px] pt-2.5 border-t border-slate-100">
                  <span className="text-slate-400 font-medium shrink-0">PAN Number</span>
                  <span className="font-bold text-slate-800 text-right uppercase">
                    {selectedClientDetail.pan || (selectedClientDetail as any).panNumber || "-"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs sm:text-[13px] pt-2.5 border-t border-slate-100">
                  <span className="text-slate-400 font-medium shrink-0">Product</span>
                  <span className="font-bold text-slate-800 text-right">
                    {selectedClientDetail.linkedProducts?.[0]?.productName || (selectedClientDetail as any).productName || "-"}
                  </span>
                </div>
              </div>

              {/* COLUMN 2: Location Details */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3.5">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[#33077C] flex items-center justify-center font-bold">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <span>Location Details</span>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs sm:text-[13px]">
                  <span className="text-slate-400 font-medium shrink-0">Organization</span>
                  <span className="font-bold text-slate-800 text-right">
                    {(selectedClientDetail as any).organizationName || "Yaa Creations"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs sm:text-[13px] pt-2.5 border-t border-slate-100">
                  <span className="text-slate-400 font-medium shrink-0">Sub-Organization</span>
                  <span className="font-bold text-slate-800 text-right">
                    {(selectedClientDetail as any).subOrganizationName || "-"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs sm:text-[13px] pt-2.5 border-t border-slate-100">
                  <span className="text-slate-400 font-medium shrink-0">Branch</span>
                  <span className="font-bold text-slate-800 text-right">
                    {(selectedClientDetail as any).branchName || "-"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs sm:text-[13px] pt-2.5 border-t border-slate-100">
                  <span className="text-slate-400 font-medium shrink-0">Address</span>
                  <span className="font-bold text-slate-800 text-right">
                    {selectedClientDetail.address || selectedClientDetail.location || "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Action Buttons */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedClientDetail(null)}
                className="h-10 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-center"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const c = selectedClientDetail;
                  setSelectedClientDetail(null);
                  handleEditCustomer(c);
                }}
                className="h-10 px-6 bg-[#33077C] hover:bg-[#4309A2] text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Client Profile
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Lead Details Quick View Modal */}
      {selectedLeadDetail && (
        <Modal
          isOpen={!!selectedLeadDetail}
          onClose={() => setSelectedLeadDetail(null)}
          title="Prospect Lead Information"
          subtitle="View prospective lead details, contact specifications, and requirements"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          maxWidth="4xl"
        >
          <div className="space-y-6">
            {/* Top Overview / Profile Header Card matching reference standard */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#33077C] text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
                  {((selectedLeadDetail.company || selectedLeadDetail.name) || "LD").substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                      {selectedLeadDetail.company || selectedLeadDetail.name}
                    </h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                      {formatDisplayId(
                        "LD",
                        selectedLeadDetail.leadId || selectedLeadDetail.id,
                      )}
                    </span>
                    {selectedLeadDetail.designation && (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-md border bg-indigo-50 text-indigo-700 border-indigo-200">
                        {selectedLeadDetail.designation}
                      </span>
                    )}
                  </div>
                  {selectedLeadDetail.company && selectedLeadDetail.name && (
                    <p className="text-xs font-medium text-slate-500 mt-0.5">{selectedLeadDetail.name}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {selectedLeadDetail.city ||
                        selectedLeadDetail.address ||
                        selectedLeadDetail.location ||
                        "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex sm:flex-col items-start sm:items-end gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {selectedLeadDetail.status || "Open"}
                </span>
              </div>
            </div>

            {/* Exactly 2 Columns: Lead Information & Location Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              {/* COLUMN 1: Lead Information */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3.5">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[#33077C] flex items-center justify-center font-bold">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <span>Lead Information</span>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs sm:text-[13px]">
                  <span className="text-slate-400 font-medium shrink-0">Lead Name</span>
                  <span className="font-bold text-slate-800 text-right">
                    {selectedLeadDetail.company || selectedLeadDetail.name || "-"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs sm:text-[13px] pt-2.5 border-t border-slate-100">
                  <span className="text-slate-400 font-medium shrink-0">Contact Person Name</span>
                  <span className="font-bold text-slate-800 text-right">
                    {selectedLeadDetail.name || "-"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs sm:text-[13px] pt-2.5 border-t border-slate-100">
                  <span className="text-slate-400 font-medium shrink-0">Designation</span>
                  <span className="font-bold text-slate-800 text-right">
                    {selectedLeadDetail.designation || "-"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs sm:text-[13px] pt-2.5 border-t border-slate-100">
                  <span className="text-slate-400 font-medium shrink-0">WhatsApp Number</span>
                  <span className="font-bold text-slate-800 text-right">
                    {selectedLeadDetail.whatsapp || selectedLeadDetail.phone || "-"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs sm:text-[13px] pt-2.5 border-t border-slate-100">
                  <span className="text-slate-400 font-medium shrink-0">Email</span>
                  <span className="font-bold text-slate-800 text-right truncate max-w-[200px]">
                    {selectedLeadDetail.email || "-"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs sm:text-[13px] pt-2.5 border-t border-slate-100">
                  <span className="text-slate-400 font-medium shrink-0">Lead Source</span>
                  <span className="font-bold text-slate-800 text-right">
                    {selectedLeadDetail.leadSource || selectedLeadDetail.source || "Website"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs sm:text-[13px] pt-2.5 border-t border-slate-100">
                  <span className="text-slate-400 font-medium shrink-0">Product Interest</span>
                  <span className="font-bold text-slate-800 text-right">
                    {selectedLeadDetail.interestedProductOrService ||
                      (selectedLeadDetail.interestedProducts && selectedLeadDetail.interestedProducts[0]) ||
                      "-"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs sm:text-[13px] pt-2.5 border-t border-slate-100">
                  <span className="text-slate-400 font-medium shrink-0">Current Status</span>
                  <span className="font-bold text-slate-800 text-right">
                    {selectedLeadDetail.status || "Open"}
                  </span>
                </div>

                {selectedLeadDetail.feedback && (
                  <div className="flex items-center justify-between gap-4 text-xs sm:text-[13px] pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">Feedback</span>
                    <span className="font-bold text-slate-800 text-right max-w-[220px] truncate">
                      {selectedLeadDetail.feedback}
                    </span>
                  </div>
                )}
              </div>

              {/* COLUMN 2: Location Details */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3.5">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[#33077C] flex items-center justify-center font-bold">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <span>Location Details</span>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs sm:text-[13px]">
                  <span className="text-slate-400 font-medium shrink-0">Organization</span>
                  <span className="font-bold text-slate-800 text-right">
                    {(selectedLeadDetail as any).organizationName || "Yaa Creations"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs sm:text-[13px] pt-2.5 border-t border-slate-100">
                  <span className="text-slate-400 font-medium shrink-0">Sub-Organization</span>
                  <span className="font-bold text-slate-800 text-right">
                    {selectedLeadDetail.subOrganizationName || (selectedLeadDetail as any).subOrgName || "-"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs sm:text-[13px] pt-2.5 border-t border-slate-100">
                  <span className="text-slate-400 font-medium shrink-0">Branch</span>
                  <span className="font-bold text-slate-800 text-right">
                    {selectedLeadDetail.branchName || "-"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs sm:text-[13px] pt-2.5 border-t border-slate-100">
                  <span className="text-slate-400 font-medium shrink-0">Date</span>
                  <span className="font-bold text-slate-800 text-right">
                    {selectedLeadDetail.leadDate
                      ? formatDateDMY(selectedLeadDetail.leadDate)
                      : selectedLeadDetail.createdAt
                        ? formatDateDMY(selectedLeadDetail.createdAt)
                        : "-"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs sm:text-[13px] pt-2.5 border-t border-slate-100">
                  <span className="text-slate-400 font-medium shrink-0">Address</span>
                  <span className="font-bold text-slate-800 text-right">
                    {selectedLeadDetail.address || selectedLeadDetail.location || "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Action Buttons */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedLeadDetail(null)}
                className="h-10 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-center"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const l = selectedLeadDetail;
                  setSelectedLeadDetail(null);
                  handleConvertLeadToCustomer(l);
                }}
                className="h-10 px-6 bg-[#33077C] hover:bg-[#4309A2] text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Convert to Active Client
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Forms */}
      <CustomerFormModal
        isOpen={isAddClientOpen}
        initialCustomer={editingCustomer}
        onClose={() => {
          setIsAddClientOpen(false);
          setEditingCustomer(null);
        }}
      />

      <LeadFormModal
        isOpen={isAddLeadOpen}
        initialLead={editingLead}
        onClose={() => {
          setIsAddLeadOpen(false);
          setEditingLead(null);
          if (onCloseInitialCreate) onCloseInitialCreate();
        }}
      />
      {/* 3-Dots Action Dropdown Menu Portal */}
      {activeDropdownId &&
        dropdownPos &&
        (() => {
          const currentLead = leads.find((l) => l.id === activeDropdownId);
          const currentClient = allCustomerSource.find(
            (c) => c.id === activeDropdownId,
          );

          if (!currentLead && !currentClient) return null;

          return (
            <>
              <div
                className="fixed inset-0 z-[9998]"
                onClick={() => {
                  setActiveDropdownId(null);
                  setDropdownPos(null);
                }}
              />
              <div
                style={{
                  position: "fixed",
                  ...(dropdownPos.bottom !== undefined
                    ? { bottom: `${dropdownPos.bottom}px` }
                    : { top: `${dropdownPos.top}px` }),
                  right: `${Math.min(Math.max(8, dropdownPos.right), Math.max(8, window.innerWidth - 181))}px`,
                }}
                className="lead-action-dropdown-menu w-[165px] max-w-[calc(100vw-1rem)] bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] border border-slate-100 p-2 z-[9999] animate-in fade-in zoom-in-95 duration-100 text-left flex flex-col gap-1 font-sans"
              >
                {currentLead && (
                  <>
                    {currentLead.status !== "Converted to Client" && (
                      <>
                    {/* 1. Edit Lead (Blue circle) */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDropdownId(null);
                        setDropdownPos(null);
                        handleEditLead(currentLead);
                      }}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="w-[26px] h-[26px] rounded-full bg-[#3B82F6] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Pencil className="w-3.5 h-3.5 stroke-[2.2]" />
                      </div>
                      <span className="text-[13px] font-bold text-[#1E293B] tracking-tight">
                        Edit Lead
                      </span>
                    </button>
                      </>
                    )}

                    {/* 2. View Details (Deep purple circle) */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDropdownId(null);
                        setDropdownPos(null);
                        setSelectedLeadDetail(currentLead);
                      }}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="w-[26px] h-[26px] rounded-full bg-[#2A085C] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Eye className="w-3.5 h-3.5 stroke-[2.2]" />
                      </div>
                      <span className="text-[13px] font-bold text-[#1E293B] tracking-tight">
                        View Details
                      </span>
                    </button>

                    {currentLead.status !== "Converted to Client" && (
                      <>
                    {/* 3. Lost / 4. Converted - Lost is a valid lead status; Converted goes through the client conversion flow, so it is hidden once the lead is Won/converted */}
                    {currentLead.status !== 'Inactive' && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDropdownId(null);
                        setDropdownPos(null);
                        handleUpdateLeadStatus(currentLead.id, 'Inactive');
                      }}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="w-[26px] h-[26px] rounded-full bg-[#94A3B8] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Ban className="w-3.5 h-3.5 stroke-[2.2]" />
                      </div>
                      <span className="text-[13px] font-bold text-[#1E293B] tracking-tight">
                        Inactive
                      </span>
                    </button>
                    )}
                    {currentLead.status !== 'Lost' && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDropdownId(null);
                        setDropdownPos(null);
                        handleUpdateLeadStatus(currentLead.id, 'Lost');
                      }}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="w-[26px] h-[26px] rounded-full bg-[#5A6E85] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Ban className="w-3.5 h-3.5 stroke-[2.2]" />
                      </div>
                      <span className="text-[13px] font-bold text-[#1E293B] tracking-tight">
                        Lost
                      </span>
                    </button>
                    )}
                    {!(currentLead as any).convertedOrganizationId && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDropdownId(null);
                        setDropdownPos(null);
                        handleConvertLeadToCustomer(currentLead);
                      }}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="w-[26px] h-[26px] rounded-full bg-[#16A34A] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.2]" />
                      </div>
                      <span className="text-[13px] font-bold text-[#1E293B] tracking-tight">
                        Converted to Client
                      </span>
                    </button>
                    )}

                    {/* Subtle divider before Delete */}
                    <div className="h-px bg-slate-100 my-0.5" />

                    {/* 4. Delete (Rose red circle) */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDropdownId(null);
                        setDropdownPos(null);
                        setConfirmAction({
                          type: 'Delete',
                          category: 'lead',
                          id: currentLead.id,
                          name: currentLead.name,
                        });
                      }}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left hover:bg-rose-50/50 transition-colors cursor-pointer"
                    >
                      <div className="w-[26px] h-[26px] rounded-full bg-[#E11D48] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Trash2 className="w-3.5 h-3.5 stroke-[2.2]" />
                      </div>
                      <span className="text-[13px] font-bold text-[#E11D48] tracking-tight">
                        Delete
                      </span>
                    </button>
                      </>
                    )}
                  </>
                )}

                {currentClient && (
                  <>
                    {/* 1. Edit Client (Blue circle) */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDropdownId(null);
                        setDropdownPos(null);
                        handleEditCustomer(currentClient);
                      }}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="w-[26px] h-[26px] rounded-full bg-[#3B82F6] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Pencil className="w-3.5 h-3.5 stroke-[2.2]" />
                      </div>
                      <span className="text-[13px] font-bold text-[#1E293B] tracking-tight">
                        Edit Client
                      </span>
                    </button>

                    {/* 2. View Details (Deep purple circle) */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDropdownId(null);
                        setDropdownPos(null);
                        setSelectedClientDetail(currentClient);
                      }}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="w-[26px] h-[26px] rounded-full bg-[#2A085C] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Eye className="w-3.5 h-3.5 stroke-[2.2]" />
                      </div>
                      <span className="text-[13px] font-bold text-[#1E293B] tracking-tight">
                        View Details
                      </span>
                    </button>

                    {/* 3. Inactive (Slate circle) */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDropdownId(null);
                        setDropdownPos(null);
                        setConfirmAction({
                          type: 'Inactive',
                          category: 'client',
                          id: currentClient.id,
                          name: currentClient.name,
                        });
                      }}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="w-[26px] h-[26px] rounded-full bg-[#5A6E85] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Ban className="w-3.5 h-3.5 stroke-[2.2]" />
                      </div>
                      <span className="text-[13px] font-bold text-[#1E293B] tracking-tight">
                        Inactive
                      </span>
                    </button>

                    {/* Subtle divider before Delete */}
                    <div className="h-px bg-slate-100 my-0.5" />

                    {/* 4. Delete (Rose red circle) */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDropdownId(null);
                        setDropdownPos(null);
                        setConfirmAction({
                          type: 'Delete',
                          category: 'client',
                          id: currentClient.id,
                          name: currentClient.name,
                        });
                      }}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left hover:bg-rose-50/50 transition-colors cursor-pointer"
                    >
                      <div className="w-[26px] h-[26px] rounded-full bg-[#E11D48] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Trash2 className="w-3.5 h-3.5 stroke-[2.2]" />
                      </div>
                      <span className="text-[13px] font-bold text-[#E11D48] tracking-tight">
                        Delete
                      </span>
                    </button>
                  </>
                )}
              </div>
            </>
          );
        })()}

      {/* Reusable Confirmation Modal: Inactive / Suspend / Delete */}
      <ConfirmationModal
        isOpen={!!confirmAction}
        onClose={() => {
          if (!isProcessingAction) setConfirmAction(null);
        }}
        type={confirmAction?.type}
        itemTypeLabel={confirmAction?.category === 'client' ? 'Client' : 'Lead'}
        itemName={confirmAction?.name}
        isLoading={isProcessingAction}
        onConfirm={async () => {
          if (!confirmAction) return;
          setIsProcessingAction(true);
          try {
            if (confirmAction.category === 'client') {
              if (confirmAction.type === 'Delete') {
                await handleDeleteClient(confirmAction.id);
              } else {
                await handleUpdateClientStatus(confirmAction.id, confirmAction.type);
              }
            } else {
              if (confirmAction.type === 'Delete') {
                await handleDeleteLead(confirmAction.id);
              } else {
                await handleUpdateLeadStatus(confirmAction.id, confirmAction.type === 'Inactive' ? 'Lost' : 'Suspended');
              }
            }
            setConfirmAction(null);
          } catch (err: any) {
            console.error('Action failed:', err);
          } finally {
            setIsProcessingAction(false);
          }
        }}
      />
    </div>
  );
};
