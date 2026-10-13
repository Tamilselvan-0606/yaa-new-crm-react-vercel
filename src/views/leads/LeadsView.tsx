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
} from "lucide-react";
import { CustomerFormModal } from "../../components/forms/CustomerFormModal";
import { LeadFormModal } from "../../components/forms/LeadFormModal";
import { Modal } from "../../components/common/Modal";
import { SearchBar } from "../../components/common/SearchBar";
import { FilterDropdown } from "../../components/common/FilterDropdown";
import { Pagination } from "../../components/common/Pagination";
import { customerApi } from "../../api/commerce/customerApi";
import {
  useGetPlatformLeadsQuery,
  useUpdatePlatformLeadStatusMutation,
  useDeletePlatformLeadMutation,
  useConvertPlatformLeadMutation,
  PlatformLeadItem,
} from "../../api/platform/leadApi";
import { Customer, Lead } from "../../types";

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

  const customers = commerceCustomers;

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
  });

  const [updatePlatformLeadStatus] = useUpdatePlatformLeadStatusMutation();
  const [deletePlatformLead] = useDeletePlatformLeadMutation();
  const [convertPlatformLead] = useConvertPlatformLeadMutation();

  const leadsPagination = platformLeadsResponse?.pagination;
  const leadsSummary = platformLeadsResponse?.summary;
  const totalLeadsCount = leadsPagination?.totalRecords ?? (platformLeadsResponse?.data?.length || 0);

  const handleToggleCustomerStatus = async (customer: Customer) => {
    const nextStatus = customer.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await customerApi.patchCustomer(customer.id, { status: nextStatus as any });
      setCommerceCustomers((prev) =>
        prev.map((c) => (c.id === customer.id ? { ...c, status: nextStatus } : c))
      );
    } catch {
      // Fallback local update
      setCommerceCustomers((prev) =>
        prev.map((c) => (c.id === customer.id ? { ...c, status: nextStatus } : c))
      );
    }
    setActiveDropdownId(null);
    setDropdownPos(null);
  };

  const handleDeleteCustomerItem = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        await customerApi.deleteCustomer(id);
        setCommerceCustomers((prev) => prev.filter((c) => c.id !== id));
      } catch {
        setCommerceCustomers((prev) => prev.filter((c) => c.id !== id));
      }
    }
    setActiveDropdownId(null);
    setDropdownPos(null);
  };

  const handleToggleLeadStatus = async (lead: any) => {
    const nextStatus = (lead.status === 'Lost' || lead.status === 'Inactive') ? 'New' : 'Lost';
    try {
      await updatePlatformLeadStatus({
        id: lead.id,
        payload: { status: nextStatus, notes: `Status toggled to ${nextStatus}` },
      }).unwrap();
    } catch (err: any) {
      console.error('Failed to update lead status:', err);
    }
    setActiveDropdownId(null);
    setDropdownPos(null);
  };

  const handleDeleteLeadItem = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      try {
        await deletePlatformLead(id).unwrap();
      } catch (err: any) {
        console.error('Failed to delete lead:', err);
      }
    }
    setActiveDropdownId(null);
    setDropdownPos(null);
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
    const prefill: Customer = {
      id: "",
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

  // Client Filters State (Pending & Applied)
  const [pendingClientSearch, setPendingClientSearch] = useState("");
  const [appliedClientSearch, setAppliedClientSearch] = useState("");
  const [pendingClientStatus, setPendingClientStatus] = useState("All");
  const [appliedClientStatus, setAppliedClientStatus] = useState("All");
  const [clientProductFilter, setClientProductFilter] = useState("All");
  const [clientStaffFilter, setClientStaffFilter] = useState("All");
  const [clientPaymentFilter, setClientPaymentFilter] = useState("All");

  // Filtered Clients
  const filteredCustomers = customers.filter((c: any) => {
    const q = appliedClientSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (c.name || "").toLowerCase().includes(q) ||
      (c.company || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q) ||
      (c.clientId || "").toLowerCase().includes(q);

    const prods = (c.linkedProducts || []).map((p: any) =>
      p.productName.toLowerCase(),
    );
    const matchesProduct =
      clientProductFilter === "All" ||
      prods.some((pName: string) =>
        pName.includes(clientProductFilter.toLowerCase()),
      ) ||
      (clientProductFilter === "Digital Marketing" && c.usesDigitalMarketing);

    const status = c.status || "Active";
    const matchesStatus =
      appliedClientStatus === "All" ||
      status.toLowerCase() === appliedClientStatus.toLowerCase();

    const staff = c.assignedStaffName || "Alex Rivera";
    const matchesStaff =
      clientStaffFilter === "All" || staff.includes(clientStaffFilter);

    const payment = c.paymentStatus || "Paid";
    const matchesPayment =
      clientPaymentFilter === "All" || payment === clientPaymentFilter;

    return (
      matchesSearch &&
      matchesProduct &&
      matchesStatus &&
      matchesStaff &&
      matchesPayment
    );
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
      designation: "",
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
      status: pl.status || "New",
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
      createdAt: pl.createdAt,
      updatedAt: pl.updatedAt,
    };
  });

  // Filtered Leads (server-side params already applied, with client safeguard)
  const filteredLeads = leads;

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
      case "Active":
        return "bg-emerald-50 text-emerald-600 font-bold";
      case "Not Interested":
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
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
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
            className="h-11 px-6 bg-[#33077C] hover:bg-[#432eb5] text-white font-bold text-sm rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
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
            className="h-11 px-6 bg-[#33077C] hover:bg-[#432eb5] text-white font-bold text-sm rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
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
                    {filteredCustomers.length}
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
                      RENEWAL
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
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
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
                      const clientStatus =
                        client.status || (index === 1 ? "Onboard" : "Active");
                      const renewalDate =
                        client.renewalDate ||
                        (index === 0
                          ? "12 Oct 2026"
                          : index === 1
                            ? "28 Sep 2026"
                            : "15 Nov 2026");
                      const paymentStatus =
                        client.paymentStatus ||
                        (index === 1 ? "Pending" : "Paid");
                      const phoneNum = client.phone || "+91 96325 87410";
                      const whatsappNum =
                        client.whatsapp || client.phone || "+91 96325 87410";
                      const emailAddr = client.email || "client@example.com";

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
                                const finalProds =
                                  uniqueProds.length > 0
                                    ? uniqueProds
                                    : ["YaaConnect"];

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
                                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${getProductDotColor(pName)}`}
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

                          {/* 6. Renewal */}
                          <td className="py-4 px-4 border border-slate-200 text-xs sm:text-[13px] text-slate-700 font-medium">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{renewalDate}</span>
                            </div>
                          </td>

                          {/* 7. Payment */}
                          <td className="py-4 px-4 border border-slate-200">
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
                    { label: "New", value: "New", dotColor: "#3b82f6" },
                    {
                      label: "Contacted",
                      value: "Contacted",
                      dotColor: "#f59e0b",
                    },
                    {
                      label: "Qualified",
                      value: "Qualified",
                      dotColor: "#6366f1",
                    },
                    {
                      label: "Proposal",
                      value: "Proposal",
                      dotColor: "#0284c7",
                    },
                    {
                      label: "Negotiation",
                      value: "Negotiation",
                      dotColor: "#ea580c",
                    },
                    {
                      label: "Won",
                      value: "Won",
                      dotColor: "#10b981",
                    },
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
                      LEAD ID & PROSPECT
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
                          {/* Lead ID & Business */}
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
                                  ? lead.nextFollowUpDate.split("T")[0]
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
          {totalLeadsCount > 0 && (
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
          )}
        </div>
      )}

      {/* Client Details Quick View Modal */}
      {selectedClientDetail && (
        <Modal
          isOpen={!!selectedClientDetail}
          onClose={() => setSelectedClientDetail(null)}
          title="Corporate Client Profile"
          maxWidth="2xl"
        >
          <div className="space-y-6">
            {/* Top Overview Header Card */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/80">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  {selectedClientDetail.company || selectedClientDetail.name}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Client ID:{" "}
                  <span className="font-bold text-[#33077C]">
                    {formatDisplayId(
                      "CL",
                      selectedClientDetail.clientId || selectedClientDetail.id,
                    )}
                  </span>
                </p>
              </div>
              <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-2xs">
                {selectedClientDetail.status || "Active Client"}
              </span>
            </div>

            {/* 2-Column Grid Layout matching Lead View */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* LEFT COLUMN */}
              <div className="space-y-6">
                {/* 1. CLIENT INFORMATION */}
                <div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs uppercase tracking-wider mb-3 border border-emerald-200/60">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <span>CLIENT INFORMATION</span>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400 font-semibold">
                        Contact Person
                      </span>
                      <span className="font-bold text-slate-900 text-right">
                        {selectedClientDetail.contactPerson ||
                          selectedClientDetail.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2.5 border-t border-slate-100">
                      <span className="text-slate-400 font-semibold">
                        Phone Number
                      </span>
                      <span className="font-bold text-slate-900 text-right">
                        {selectedClientDetail.phone || "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2.5 border-t border-slate-100">
                      <span className="text-slate-400 font-semibold">
                        WhatsApp Number
                      </span>
                      <span className="font-bold text-slate-900 text-right">
                        {selectedClientDetail.whatsapp ||
                          selectedClientDetail.phone ||
                          "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2.5 border-t border-slate-100">
                      <span className="text-slate-400 font-semibold">
                        Email Address
                      </span>
                      <span className="font-bold text-slate-900 text-right truncate max-w-[200px]">
                        {selectedClientDetail.email || "-"}
                      </span>
                    </div>
                    {selectedClientDetail.alternatePhone && (
                      <div className="flex items-center justify-between text-sm pt-2.5 border-t border-slate-100">
                        <span className="text-slate-400 font-semibold">
                          Alternate Phone
                        </span>
                        <span className="font-bold text-slate-900 text-right">
                          {selectedClientDetail.alternatePhone}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. SUBSCRIBED PRODUCTS & PLANS */}
                <div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs uppercase tracking-wider mb-3 border border-emerald-200/60">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <span>SUBSCRIBED PRODUCTS & PLANS</span>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-2.5">
                    {selectedClientDetail.linkedProducts &&
                    selectedClientDetail.linkedProducts.length > 0 ? (
                      selectedClientDetail.linkedProducts.map((p, idx) => {
                        const normName = normalizeProductName(p.productName);
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 bg-slate-50/80 rounded-xl border border-slate-200/70"
                          >
                            <div>
                              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                                <span
                                  className={`w-2 h-2 rounded-full ${getProductDotColor(normName)}`}
                                ></span>
                                <span>{normName}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                Plan: {p.planName} - Active since{" "}
                                {p.since || "2026"}
                              </div>
                            </div>
                            <div className="font-bold text-emerald-600 text-sm">
                              &#8377;{p.amount || "0"}/mo
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-xs text-slate-400 py-3 text-center">
                        No active product subscriptions
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. DOCUMENTS SHARED TO CLIENT */}
                <div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 text-[#33077C] font-bold text-xs uppercase tracking-wider mb-3 border border-purple-200/60">
                    <FolderUp className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>DOCUMENTS SHARED TO CLIENT</span>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-2.5">
                    {(() => {
                      const sharedDocs = (
                        selectedClientDetail.documents || []
                      ).filter(
                        (d) =>
                          (d.type || "shared_by_company") ===
                          "shared_by_company",
                      );
                      if (sharedDocs.length === 0) {
                        return (
                          <div className="text-xs text-slate-400 py-3 text-center flex items-center justify-center gap-1.5">
                            <Paperclip className="w-3.5 h-3.5" />
                            <span>No company documents shared yet</span>
                          </div>
                        );
                      }
                      return sharedDocs.map((doc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 bg-slate-50/80 hover:bg-slate-100/70 rounded-xl border border-slate-200/70 transition-all"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-purple-100/80 text-[#33077C] flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 truncate max-w-[190px]">
                                {doc.title}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {doc.category} - {doc.fileSize || "PDF"} -{" "}
                                {doc.uploadedAt}
                              </div>
                            </div>
                          </div>
                          <a
                            href={doc.url || "#"}
                            download
                            title="Download / View"
                            className="w-7 h-7 rounded-lg bg-white hover:bg-purple-600 text-slate-600 hover:text-white border border-slate-200 hover:border-purple-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-6">
                {/* 4. LOCATION DETAILS */}
                <div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs uppercase tracking-wider mb-3 border border-emerald-200/60">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <span>LOCATION DETAILS</span>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400 font-semibold">City</span>
                      <span className="font-bold text-slate-900 text-right">
                        {selectedClientDetail.city || "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2.5 border-t border-slate-100">
                      <span className="text-slate-400 font-semibold">
                        Full Address
                      </span>
                      <span className="font-bold text-slate-900 text-right">
                        {selectedClientDetail.address ||
                          selectedClientDetail.location ||
                          "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2.5 border-t border-slate-100">
                      <span className="text-slate-400 font-semibold">
                        State
                      </span>
                      <span className="font-bold text-slate-900 text-right">
                        {selectedClientDetail.state || "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2.5 border-t border-slate-100">
                      <span className="text-slate-400 font-semibold">
                        Pincode
                      </span>
                      <span className="font-bold text-slate-900 text-right">
                        {selectedClientDetail.pincode || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. ACCOUNT & BILLING SUMMARY */}
                <div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs uppercase tracking-wider mb-3 border border-emerald-200/60">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <span>ACCOUNT & BILLING</span>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400 font-semibold">
                        Client Status
                      </span>
                      <span className="font-bold text-emerald-600 text-right">
                        {selectedClientDetail.status || "Active"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2.5 border-t border-slate-100">
                      <span className="text-slate-400 font-semibold">
                        Industry / Domain
                      </span>
                      <span className="font-bold text-slate-900 text-right">
                        {selectedClientDetail.industry ||
                          "Technology & Logistics"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2.5 border-t border-slate-100">
                      <span className="text-slate-400 font-semibold">
                        Billing Frequency
                      </span>
                      <span className="font-bold text-slate-900 text-right">
                        Monthly Retainer
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2.5 border-t border-slate-100">
                      <span className="text-slate-400 font-semibold">
                        Customer Since
                      </span>
                      <span className="font-bold text-slate-900 text-right">
                        {selectedClientDetail.createdAt
                          ? selectedClientDetail.createdAt.split("T")[0]
                          : "2026-01-15"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 6. DOCUMENTS RECEIVED FROM CLIENT */}
                <div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs uppercase tracking-wider mb-3 border border-emerald-200/60">
                    <FolderDown className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>DOCUMENTS RECEIVED FROM CLIENT</span>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-2.5">
                    {(() => {
                      const clientDocs = (
                        selectedClientDetail.documents || []
                      ).filter((d) => d.type === "shared_by_client");
                      if (clientDocs.length === 0) {
                        return (
                          <div className="text-xs text-slate-400 py-3 text-center flex items-center justify-center gap-1.5">
                            <Paperclip className="w-3.5 h-3.5" />
                            <span>No client-submitted documents on file</span>
                          </div>
                        );
                      }
                      return clientDocs.map((doc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 bg-slate-50/80 hover:bg-slate-100/70 rounded-xl border border-slate-200/70 transition-all"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 truncate max-w-[190px]">
                                {doc.title}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {doc.category} - {doc.fileSize || "PDF"} -{" "}
                                {doc.uploadedAt}
                              </div>
                            </div>
                          </div>
                          <a
                            href={doc.url || "#"}
                            download
                            title="Download / View"
                            className="w-7 h-7 rounded-lg bg-white hover:bg-emerald-600 text-slate-600 hover:text-white border border-slate-200 hover:border-emerald-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Action Buttons */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedClientDetail(null)}
                className="h-11 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center"
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
                className="h-11 px-6 bg-[#33077C] hover:bg-[#432eb5] text-white font-bold rounded-xl text-sm shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
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
          maxWidth="2xl"
        >
          <div className="space-y-6">
            {/* Top Overview Header Card */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/80">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  {selectedLeadDetail.company || selectedLeadDetail.name}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Lead ID:{" "}
                  <span className="font-bold text-orange-600">
                    {formatDisplayId(
                      "LD",
                      selectedLeadDetail.leadId || selectedLeadDetail.id,
                    )}
                  </span>
                </p>
              </div>
              <span
                className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-2xs ${getStatusBadge(selectedLeadDetail.status)}`}
              >
                {selectedLeadDetail.status}
              </span>
            </div>

            {/* 2-Column Grid Layout matching Reference Design */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* LEFT COLUMN */}
              <div className="space-y-6">
                {/* 1. LEAD INFORMATION */}
                <div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs uppercase tracking-wider mb-3 border border-emerald-200/60">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <span>LEAD INFORMATION</span>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400 font-semibold">
                        Contact Person
                      </span>
                      <span className="font-bold text-slate-900 text-right">
                        {selectedLeadDetail.name}{" "}
                        {selectedLeadDetail.designation
                          ? `(${selectedLeadDetail.designation})`
                          : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2.5 border-t border-slate-100">
                      <span className="text-slate-400 font-semibold">
                        Phone Number
                      </span>
                      <span className="font-bold text-slate-900 text-right">
                        {selectedLeadDetail.phone || "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2.5 border-t border-slate-100">
                      <span className="text-slate-400 font-semibold">
                        WhatsApp Number
                      </span>
                      <span className="font-bold text-slate-900 text-right">
                        {selectedLeadDetail.whatsapp ||
                          selectedLeadDetail.phone ||
                          "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2.5 border-t border-slate-100">
                      <span className="text-slate-400 font-semibold">
                        Email Address
                      </span>
                      <span className="font-bold text-slate-900 text-right truncate max-w-[200px]">
                        {selectedLeadDetail.email || "-"}
                      </span>
                    </div>
                    {selectedLeadDetail.alternatePhone && (
                      <div className="flex items-center justify-between text-sm pt-2.5 border-t border-slate-100">
                        <span className="text-slate-400 font-semibold">
                          Alternate Phone
                        </span>
                        <span className="font-bold text-slate-900 text-right">
                          {selectedLeadDetail.alternatePhone}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm pt-2.5 border-t border-slate-100">
                      <span className="text-slate-400 font-semibold">
                        Lead Source
                      </span>
                      <span className="font-bold text-slate-900 text-right">
                        {selectedLeadDetail.leadSource ||
                          selectedLeadDetail.source ||
                          "Website"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. REQUIREMENTS & ENQUIRY */}
                <div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs uppercase tracking-wider mb-3 border border-emerald-200/60">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <span>REQUIREMENT & OFFERINGS</span>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400 font-semibold">
                        Interested Products
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {(() => {
                          const prods = (
                            selectedLeadDetail.interestedProducts || [
                              selectedLeadDetail.interestedProductOrService,
                            ]
                          )
                            .filter(Boolean)
                            .map((p) => normalizeProductName(p));
                          const unique = Array.from(new Set(prods));
                          return unique.map((pName, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-1.5 text-xs font-bold text-slate-900"
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${getProductDotColor(pName)}`}
                              ></span>
                              <span>{pName}</span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                    {selectedLeadDetail.requirements && (
                      <div className="pt-2.5 border-t border-slate-100">
                        <span className="text-slate-400 font-semibold text-xs block mb-2">
                          Requirement / Enquiry
                        </span>
                        <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/70 text-slate-800 font-medium text-xs leading-relaxed">
                          {selectedLeadDetail.requirements}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-6">
                {/* 3. LOCATION DETAILS */}
                <div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs uppercase tracking-wider mb-3 border border-emerald-200/60">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <span>LOCATION DETAILS</span>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400 font-semibold">City</span>
                      <span className="font-bold text-slate-900 text-right">
                        {selectedLeadDetail.city || "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2.5 border-t border-slate-100">
                      <span className="text-slate-400 font-semibold">
                        Full Address
                      </span>
                      <span className="font-bold text-slate-900 text-right">
                        {selectedLeadDetail.address ||
                          selectedLeadDetail.location ||
                          "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2.5 border-t border-slate-100">
                      <span className="text-slate-400 font-semibold">
                        State
                      </span>
                      <span className="font-bold text-slate-900 text-right">
                        {selectedLeadDetail.state || "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2.5 border-t border-slate-100">
                      <span className="text-slate-400 font-semibold">
                        Pincode
                      </span>
                      <span className="font-bold text-slate-900 text-right">
                        {selectedLeadDetail.pincode || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. MANAGEMENT & FOLLOW-UP */}
                <div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs uppercase tracking-wider mb-3 border border-emerald-200/60">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <span>MANAGEMENT & TIMELINE</span>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400 font-semibold">
                        Assigned Staff
                      </span>
                      <span className="font-bold text-slate-900 text-right">
                        {selectedLeadDetail.assignedStaffName || "Unassigned"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2.5 border-t border-slate-100">
                      <span className="text-slate-400 font-semibold">
                        Priority
                      </span>
                      <span
                        className={`font-bold text-right ${
                          selectedLeadDetail.priority === "High"
                            ? "text-rose-600"
                            : selectedLeadDetail.priority === "Low"
                              ? "text-slate-600"
                              : "text-amber-600"
                        }`}
                      >
                        {selectedLeadDetail.priority || "Medium"}
                      </span>
                    </div>
                    {selectedLeadDetail.expectedBudget && (
                      <div className="flex items-center justify-between text-sm pt-2.5 border-t border-slate-100">
                        <span className="text-slate-400 font-semibold">
                          Expected Budget
                        </span>
                        <span className="font-bold text-slate-900 text-right">
                          &#8377;{selectedLeadDetail.expectedBudget}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm pt-2.5 border-t border-slate-100">
                      <span className="text-slate-400 font-semibold">
                        Next Follow-Up
                      </span>
                      <span className="font-bold text-slate-900 text-right">
                        {selectedLeadDetail.nextFollowUpDate
                          ? selectedLeadDetail.nextFollowUpDate.split("T")[0]
                          : "Not Scheduled"}
                      </span>
                    </div>
                    {selectedLeadDetail.feedback && (
                      <div className="pt-2.5 border-t border-slate-100">
                        <span className="text-slate-400 font-semibold text-xs block mb-2">
                          Feedback / Follow-up Notes
                        </span>
                        <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-slate-800 font-medium text-xs leading-relaxed">
                          {selectedLeadDetail.feedback}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Action Buttons */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedLeadDetail(null)}
                className="h-11 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center"
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
                className="h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
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
          const currentClient = customers.find(
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
                  right: `${dropdownPos.right}px`,
                }}
                className="lead-action-dropdown-menu w-[165px] bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] border border-slate-100 p-2 z-[9999] animate-in fade-in zoom-in-95 duration-100 text-left flex flex-col gap-1 font-sans"
              >
                {currentLead && (
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

                    {/* 3. Inactive (Slate circle) */}
                    <button
                      type="button"
                      onClick={() => handleToggleLeadStatus(currentLead)}
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
                      onClick={() => handleDeleteLeadItem(currentLead.id)}
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
                      onClick={() => handleToggleCustomerStatus(currentClient)}
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
                      onClick={() => handleDeleteCustomerItem(currentClient.id)}
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
    </div>
  );
};
