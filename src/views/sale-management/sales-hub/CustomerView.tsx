import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import {
  useSalesManagementStore,
  SalesCustomer,
  CustomerStatus,
  CustomerType,
  SaleQuotation,
} from '../../../store/useSalesManagementStore';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { Pagination } from '../../../components/common/Pagination';
import { SearchBar } from '../../../components/common/SearchBar';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { exportTableToExcel } from '../../../utils/excelExport';
import { toast } from 'sonner';

export const CustomerView: React.FC = () => {
  const navigate = useNavigate();
  const {
    customers,
    sales,
    quotations,
    salesReturns,
    saveCustomer,
    deleteCustomer,
    updateCustomerStatus,
    getCustomerMetrics,
  } = useSalesManagementStore();

  // Search & Filter State
  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pendingStatus, setPendingStatus] = useState('All');
  const [appliedStatus, setAppliedStatus] = useState('All');
  const [pendingType, setPendingType] = useState('All');
  const [appliedType, setAppliedType] = useState('All');
  const [pendingOutstanding, setPendingOutstanding] = useState('All');
  const [appliedOutstanding, setAppliedOutstanding] = useState('All');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 3-Dots Action dropdown
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<SalesCustomer[]>([]);
  const [pendingSavePayload, setPendingSavePayload] = useState<SalesCustomer | null>(null);

  const [selectedCustomer, setSelectedCustomer] = useState<SalesCustomer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<SalesCustomer | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<
    | 'overview'
    | 'quotations'
    | 'proformas'
    | 'orders'
    | 'challans'
    | 'sales'
    | 'payments'
    | 'returns'
    | 'outstanding'
    | 'activity'
  >('overview');

  // Form State
  const [formData, setFormData] = useState<{
    customerCode: string;
    name: string;
    company: string;
    customerType: CustomerType;
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
    creditLimit: number;
    paymentTerms: string;
    openingBalance: number;
    preferredPaymentMethod: string;
    status: CustomerStatus;
    tags: string;
    notes: string;
  }>({
    customerCode: '',
    name: '',
    company: '',
    customerType: 'Business',
    phone: '',
    alternatePhone: '',
    email: '',
    gender: '',
    dateOfBirth: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    gstNumber: '',
    panNumber: '',
    billingAddress: '',
    shippingAddress: '',
    sameAsBilling: true,
    creditLimit: 50000,
    paymentTerms: 'Net 30 Days',
    openingBalance: 0,
    preferredPaymentMethod: 'Bank Transfer',
    status: 'Active',
    tags: '',
    notes: '',
  });

  // Close action dropdown on click outside or scroll
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.action-dropdown-container') && !target.closest('.action-dropdown-menu')) {
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
    window.addEventListener('click', handleOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('click', handleOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [activeDropdownId]);

  // Real-time calculation of customer summaries
  const customerFinancialMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getCustomerMetrics>>();
    customers.forEach((c) => {
      map.set(c.id, getCustomerMetrics(c.id));
    });
    return map;
  }, [customers, sales, salesReturns]);

  // Overall Summary Metrics (5 Cards)
  const summary = useMemo(() => {
    const totalCount = customers.length;
    const activeCount = customers.filter((c) => c.status === 'Active').length;
    const newCount = customers.filter((c) => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
      return new Date(c.createdAt) >= thirtyDaysAgo;
    }).length;

    let withOutstandingCount = 0;
    let totalReceivable = 0;

    customers.forEach((c) => {
      const m = customerFinancialMap.get(c.id);
      const out = m ? m.outstandingAmount : 0;
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
  }, [customers, customerFinancialMap]);

  // Open Create Customer Modal
  const handleOpenCreateModal = () => {
    const nextNum = 1000 + customers.length + 1;
    const nextCode = `CUS-${nextNum}`;
    setFormData({
      customerCode: nextCode,
      name: '',
      company: '',
      customerType: 'Business',
      phone: '',
      alternatePhone: '',
      email: '',
      gender: '',
      dateOfBirth: '',
      address: '',
      city: '',
      state: '',
      country: 'India',
      pincode: '',
      gstNumber: '',
      panNumber: '',
      billingAddress: '',
      shippingAddress: '',
      sameAsBilling: true,
      creditLimit: 50000,
      paymentTerms: 'Net 30 Days',
      openingBalance: 0,
      preferredPaymentMethod: 'Bank Transfer',
      status: 'Active',
      tags: '',
      notes: '',
    });
    setEditingCustomer(null);
    setIsFormModalOpen(true);
  };

  // Open Edit Customer Modal
  const handleOpenEditModal = (customer: SalesCustomer) => {
    setFormData({
      customerCode: customer.customerCode,
      name: customer.name,
      company: customer.company || '',
      customerType: customer.customerType || 'Business',
      phone: customer.phone,
      alternatePhone: customer.alternatePhone || '',
      email: customer.email,
      gender: customer.gender || '',
      dateOfBirth: customer.dateOfBirth || '',
      address: customer.address,
      city: customer.city,
      state: customer.state,
      country: customer.country,
      pincode: customer.pincode,
      gstNumber: customer.gstNumber || '',
      panNumber: customer.panNumber || '',
      billingAddress: customer.billingAddress,
      shippingAddress: customer.shippingAddress,
      sameAsBilling: customer.sameAsBilling !== false,
      creditLimit: customer.creditLimit || 0,
      paymentTerms: customer.paymentTerms || 'Net 30 Days',
      openingBalance: customer.openingBalance || 0,
      preferredPaymentMethod: customer.preferredPaymentMethod || 'Bank Transfer',
      status: customer.status,
      tags: customer.tags ? customer.tags.join(', ') : '',
      notes: customer.notes || '',
    });
    setEditingCustomer(customer);
    setIsFormModalOpen(true);
  };

  // Duplicate check before saving
  const checkDuplicates = (
    phone: string,
    email: string,
    customerCode: string,
    excludeId?: string
  ): SalesCustomer[] => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = customerCode.trim().toLowerCase();

    return customers.filter((c) => {
      if (excludeId && c.id === excludeId) return false;
      const cPhone = c.phone.replace(/[^0-9]/g, '');
      const cEmail = c.email.trim().toLowerCase();
      const cCode = c.customerCode.trim().toLowerCase();

      const phoneMatch = cleanPhone && cPhone && (cleanPhone === cPhone || cPhone.endsWith(cleanPhone) || cleanPhone.endsWith(cPhone));
      const emailMatch = cleanEmail && cEmail && cleanEmail === cEmail;
      const codeMatch = cleanCode && cCode && cleanCode === cCode;

      return phoneMatch || emailMatch || codeMatch;
    });
  };

  // Handle Save Button
  const handleSaveCustomerClick = () => {
    if (!formData.name.trim()) {
      toast.error('Customer name is required.');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('Customer phone number is required.');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('Customer email is required.');
      return;
    }

    const payload: SalesCustomer = {
      id: editingCustomer ? editingCustomer.id : `cust_${Date.now()}`,
      customerCode: formData.customerCode.trim() || `CUS-${Date.now().toString().slice(-4)}`,
      name: formData.name.trim(),
      company: formData.company.trim() || undefined,
      customerType: formData.customerType,
      phone: formData.phone.trim(),
      alternatePhone: formData.alternatePhone.trim() || undefined,
      email: formData.email.trim(),
      gender: formData.gender || undefined,
      dateOfBirth: formData.dateOfBirth || undefined,
      address: formData.address.trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      country: formData.country.trim(),
      pincode: formData.pincode.trim(),
      gstNumber: formData.gstNumber.trim() || undefined,
      panNumber: formData.panNumber.trim() || undefined,
      billingAddress: formData.billingAddress.trim() || formData.address.trim(),
      shippingAddress: formData.sameAsBilling
        ? formData.billingAddress.trim() || formData.address.trim()
        : formData.shippingAddress.trim() || formData.address.trim(),
      sameAsBilling: formData.sameAsBilling,
      creditLimit: Number(formData.creditLimit) || 0,
      paymentTerms: formData.paymentTerms.trim() || 'Net 30 Days',
      openingBalance: Number(formData.openingBalance) || 0,
      preferredPaymentMethod: formData.preferredPaymentMethod,
      status: formData.status,
      notes: formData.notes.trim() || undefined,
      tags: formData.tags
        ? formData.tags
            .split(',')
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
      editingCustomer?.id
    );

    if (matches.length > 0) {
      setDuplicateMatches(matches);
      setPendingSavePayload(payload);
      setIsDuplicateModalOpen(true);
      return;
    }

    commitSaveCustomer(payload);
  };

  const commitSaveCustomer = (payload: SalesCustomer) => {
    saveCustomer(payload);
    toast.success(editingCustomer ? `Customer ${payload.name} updated successfully.` : `Customer ${payload.name} registered.`);
    setIsFormModalOpen(false);
    setIsDuplicateModalOpen(false);
    setPendingSavePayload(null);
    if (selectedCustomer && selectedCustomer.id === payload.id) {
      setSelectedCustomer(payload);
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
        appliedStatus === 'All' || c.status.toLowerCase() === appliedStatus.toLowerCase();

      const matchesType =
        appliedType === 'All' || c.customerType.toLowerCase() === appliedType.toLowerCase();

      const financials = customerFinancialMap.get(c.id);
      const out = financials?.outstandingAmount || 0;
      const matchesOutstanding =
        appliedOutstanding === 'All'
          ? true
          : appliedOutstanding === 'With Outstanding'
          ? out > 0
          : out === 0;

      return matchesSearch && matchesStatus && matchesType && matchesOutstanding;
    });
  }, [customers, appliedSearch, appliedStatus, appliedType, appliedOutstanding, customerFinancialMap]);

  const totalPages = Math.ceil(filteredCustomers.length / pageSize) || 1;
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  // Selected Customer Linked Entities
  // Related Customer Documents
  const selectedCustomerQuotations = useMemo(() => {
    if (!selectedCustomer) return [];
    return quotations.filter((q) => q.customerId === selectedCustomer.id || q.partyName?.toLowerCase() === selectedCustomer.name?.toLowerCase());
  }, [quotations, selectedCustomer]);

  const selectedCustomerProformas = useMemo(() => {
    if (!selectedCustomer) return [];
    try {
      const raw = localStorage.getItem('yaa_crm_proforma_invoices');
      const all = raw ? JSON.parse(raw) : [];
      return all.filter((p: any) => p.customerId === selectedCustomer.id || p.partyName?.toLowerCase() === selectedCustomer.name?.toLowerCase());
    } catch {
      return [];
    }
  }, [selectedCustomer]);

  const selectedCustomerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    try {
      const raw = localStorage.getItem('yaa_crm_sale_orders');
      const all = raw ? JSON.parse(raw) : [];
      return all.filter((o: any) => o.customerId === selectedCustomer.id || o.partyName?.toLowerCase() === selectedCustomer.name?.toLowerCase());
    } catch {
      return [];
    }
  }, [selectedCustomer]);

  const selectedCustomerChallans = useMemo(() => {
    if (!selectedCustomer) return [];
    try {
      const raw = localStorage.getItem('yaa_crm_delivery_challans');
      const all = raw ? JSON.parse(raw) : [];
      return all.filter((c: any) => c.customerId === selectedCustomer.id || c.partyName?.toLowerCase() === selectedCustomer.name?.toLowerCase());
    } catch {
      return [];
    }
  }, [selectedCustomer]);

  const selectedCustomerSales = useMemo(() => {
    if (!selectedCustomer) return [];
    return sales.filter((s) => s.customerId === selectedCustomer.id || s.customerName?.toLowerCase() === selectedCustomer.name?.toLowerCase());
  }, [sales, selectedCustomer]);

  const selectedCustomerReturns = useMemo(() => {
    if (!selectedCustomer) return [];
    return salesReturns.filter((r) => r.customerId === selectedCustomer.id || r.customerName?.toLowerCase() === selectedCustomer.name?.toLowerCase());
  }, [salesReturns, selectedCustomer]);

  const selectedCustomerMetrics = useMemo(() => {
    if (!selectedCustomer) return null;
    return getCustomerMetrics(selectedCustomer.id);
  }, [selectedCustomer, getCustomerMetrics, sales, salesReturns]);

  const getCustomerInitials = (name?: string): string => {
    if (!name) return 'CU';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getStatusBadge = (status: CustomerStatus) => {
    switch (status) {
      case 'Active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Active
          </span>
        );
      case 'Inactive':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Inactive
          </span>
        );
      case 'Blocked':
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
      toast.error('No customers to export');
      return;
    }

    const excelRows = filteredCustomers.map((c, idx) => ({
      sNo: idx + 1,
      customerCode: c.customerCode,
      name: c.name,
      company: c.company || '-',
      phone: c.phone,
      email: c.email || '-',
      customerType: c.customerType,
      creditLimit: Number(c.creditLimit || 0),
      outstanding: Number(c.outstandingAmount || 0),
      status: c.status,
    }));

    exportTableToExcel({
      filename: `Customers_Report_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Customers Master',
      title: 'YAA CREATIONS CRM - CUSTOMER MASTER DIRECTORY',
      subtitle: `Total Customers: ${filteredCustomers.length} | Generated: ${new Date().toLocaleDateString()}`,
      columns: [
        { header: '#', key: 'sNo', align: 'center', width: 8 },
        { header: 'Customer ID', key: 'customerCode', align: 'center', width: 14 },
        { header: 'Customer Name', key: 'name', align: 'left', width: 26 },
        { header: 'Company', key: 'company', align: 'left', width: 22 },
        { header: 'Phone', key: 'phone', align: 'left', width: 18 },
        { header: 'Email', key: 'email', align: 'left', width: 24 },
        { header: 'Type', key: 'customerType', align: 'center', width: 14 },
        { header: 'Credit Limit (₹)', key: 'creditLimit', align: 'right', type: 'currency', width: 18 },
        { header: 'Outstanding (₹)', key: 'outstanding', align: 'right', type: 'currency', width: 18 },
        { header: 'Status', key: 'status', align: 'center', width: 14 },
      ],
      data: excelRows,
      summaryRow: {
        sNo: 'TOTAL',
        name: `${filteredCustomers.length} Customers`,
        outstanding: summary.totalReceivable,
      },
    });

    toast.success(`Customers Excel report downloaded (${filteredCustomers.length} records)!`);
  };

  return (
    <div className="space-y-5 pb-16 font-sans">
      {/* 1. TOP HEADER CARD */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
              <UsersRound className="w-4.5 h-4.5" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Customer Master
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-[#33077C] border border-purple-200">
                {customers.length} total
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Manage customer accounts, sales relationships, credit terms, and 360-degree document histories.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto shrink-0">
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
              ₹{summary.totalReceivable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
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
          setAppliedSearch(val);
        }}
        placeholder="Search by customer name, code, phone, email, company..."
        onSubmit={() => {
          setAppliedSearch(pendingSearch);
          setCurrentPage(1);
        }}
        onReset={() => {
          setPendingSearch('');
          setAppliedSearch('');
          setPendingStatus('All');
          setAppliedStatus('All');
          setPendingType('All');
          setAppliedType('All');
          setPendingOutstanding('All');
          setAppliedOutstanding('All');
          setCurrentPage(1);
        }}
        filterSlot={
          <div className="flex items-center gap-2.5 flex-wrap">
            <FilterDropdown
              placeholder="Status : All"
              value={pendingStatus}
              options={[
                { label: 'Status : All', value: 'All' },
                { label: 'Active', value: 'Active', dotColor: '#10b981' },
                { label: 'Inactive', value: 'Inactive', dotColor: '#64748b' },
                { label: 'Blocked', value: 'Blocked', dotColor: '#ef4444' },
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
                { label: 'Type : All', value: 'All' },
                { label: 'Business', value: 'Business' },
                { label: 'Individual', value: 'Individual' },
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
                { label: 'Outstanding : All', value: 'All' },
                { label: 'With Outstanding', value: 'With Outstanding' },
                { label: 'Zero Balance', value: 'Zero Balance' },
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
              Total Customers : <span className="text-[#33077C] font-bold">{filteredCustomers.length}</span>
            </span>
          </div>
        }
      />

      {/* 4. MAIN DATA TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto min-h-[360px]">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-[#33077C] text-white font-bold text-xs uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 text-white">Customer Details</th>
                <th className="py-3.5 px-3 text-white">Customer ID</th>
                <th className="py-3.5 px-3 text-white">Contact Info</th>
                <th className="py-3.5 px-3 text-right text-white">Total Sales</th>
                <th className="py-3.5 px-3 text-right text-white">Paid Amount</th>
                <th className="py-3.5 px-3 text-right text-white">Outstanding</th>
                <th className="py-3.5 px-3 text-white">Credit Limit</th>
                <th className="py-3.5 px-3 text-center text-white">Status</th>
                <th className="py-3.5 px-4 text-center text-white">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-700 dark:text-slate-200">
              {paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <UsersRound className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                      <p className="text-sm font-medium">No customers found</p>
                      <p className="text-xs text-slate-400">Try adjusting your search terms or filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((cust) => {
                  const fin = customerFinancialMap.get(cust.id) || {
                    totalSalesAmount: 0,
                    totalPaidAmount: 0,
                    outstandingAmount: 0,
                    creditLimit: cust.creditLimit || 0,
                    availableCredit: cust.creditLimit || 0,
                    creditUtilizationPercent: 0,
                  };

                  return (
                    <tr
                      key={cust.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition-colors group cursor-pointer"
                      onClick={() => {
                        setSelectedCustomer(cust);
                        setActiveDetailTab('overview');
                        setIsDetailModalOpen(true);
                      }}
                    >
                      {/* Customer Details */}
                      <td className="py-3.5 px-4">
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
                                  cust.customerType === 'Business'
                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
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
                          </div>
                        </div>
                      </td>

                      {/* Code */}
                      <td className="py-3.5 px-3">
                        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200/60 dark:border-slate-700">
                          {cust.customerCode}
                        </span>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3.5 px-3">
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
                      <td className="py-3.5 px-3 text-right">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          ₹{fin.totalSalesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Paid Amount */}
                      <td className="py-3.5 px-3 text-right">
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          ₹{fin.totalPaidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Outstanding */}
                      <td className="py-3.5 px-3 text-right">
                        {fin.outstandingAmount > 0 ? (
                          <span className="font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200/60 dark:border-rose-800">
                            ₹{fin.outstandingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">₹0.00</span>
                        )}
                      </td>

                      {/* Credit Limit & Progress */}
                      <td className="py-3.5 px-3">
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
                                    ? 'bg-rose-500'
                                    : fin.creditUtilizationPercent > 50
                                    ? 'bg-amber-500'
                                    : 'bg-purple-600'
                                }`}
                                style={{ width: `${fin.creditUtilizationPercent}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">{getStatusBadge(cust.status)}</td>

                      {/* Actions */}
                      <td
                        className="py-3.5 px-4 text-center whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center justify-center gap-1">
                          {/* 1. Direct View Details Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCustomer(cust);
                              setActiveDetailTab('overview');
                              setIsDetailModalOpen(true);
                            }}
                            className="w-7 h-7 rounded-lg text-slate-500 hover:text-[#33077C] hover:bg-purple-50 flex items-center justify-center transition-colors cursor-pointer"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4 text-slate-600" />
                          </button>

                          {/* 2. Direct Edit Button */}
                          <button
                            type="button"
                            onClick={() => {
                              handleOpenEditModal(cust);
                            }}
                            className="w-7 h-7 rounded-lg text-slate-500 hover:text-[#33077C] hover:bg-purple-50 flex items-center justify-center transition-colors cursor-pointer"
                            title="Edit Profile"
                          >
                            <Pencil className="w-4 h-4 text-slate-600" />
                          </button>

                          {/* 3. 3-Dots Floating Menu Button */}
                          <div className="action-dropdown-container relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activeDropdownId === cust.id) {
                                  setActiveDropdownId(null);
                                  setDropdownPos(null);
                                } else {
                                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                  const spaceBelow = window.innerHeight - rect.bottom;
                                  const menuHeight = 240;
                                  if (spaceBelow < menuHeight) {
                                    setDropdownPos({
                                      bottom: window.innerHeight - rect.top + 4,
                                      right: window.innerWidth - rect.right,
                                    });
                                  } else {
                                    setDropdownPos({
                                      top: rect.bottom + 4,
                                      right: window.innerWidth - rect.right,
                                    });
                                  }
                                  setActiveDropdownId(cust.id);
                                }
                              }}
                              className="w-7 h-7 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                              title="More options"
                            >
                              <MoreVertical className="w-4 h-4 text-slate-600" />
                            </button>
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

        {/* Pagination Footer */}
        {filteredCustomers.length > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filteredCustomers.length)} of {filteredCustomers.length} customers
            </p>
            <Pagination
              currentPage={currentPage}
              total={filteredCustomers.length}
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

      {/* Fixed Action Dropdown Menu */}
      {activeDropdownId && dropdownPos && (
        <div
          style={{
            position: 'fixed',
            top: dropdownPos.top !== undefined ? `${dropdownPos.top}px` : 'auto',
            bottom: dropdownPos.bottom !== undefined ? `${dropdownPos.bottom}px` : 'auto',
            right: `${dropdownPos.right}px`,
            zIndex: 9999,
          }}
          className="action-dropdown-menu w-44 bg-white rounded-xl shadow-2xl border border-slate-200/90 py-2 animate-in fade-in zoom-in-95 duration-100 text-left font-sans overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {(() => {
            const target = customers.find((c) => c.id === activeDropdownId);
            if (!target) return null;

            return (
              <>
                {/* 1. View Details */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(target);
                    setActiveDetailTab('overview');
                    setIsDetailModalOpen(true);
                    setActiveDropdownId(null);
                  }}
                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                >
                  View Details
                </button>

                {/* 2. Edit Profile */}
                <button
                  type="button"
                  onClick={() => {
                    handleOpenEditModal(target);
                    setActiveDropdownId(null);
                  }}
                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                >
                  Edit Profile
                </button>

                {/* 3. Create Sale */}
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/sale-management/sales/sale?customerId=${target.id}&createSale=true`);
                    setActiveDropdownId(null);
                  }}
                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                >
                  Create Sale
                </button>

                {/* 4. Set as Active / Inactive */}
                {target.status === 'Active' ? (
                  <button
                    type="button"
                    onClick={() => {
                      updateCustomerStatus(target.id, 'Inactive');
                      toast.success(`Customer ${target.name} set to Inactive.`);
                      setActiveDropdownId(null);
                    }}
                    className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                  >
                    Set as Inactive
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      updateCustomerStatus(target.id, 'Active');
                      toast.success(`Customer ${target.name} set to Active.`);
                      setActiveDropdownId(null);
                    }}
                    className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                  >
                    Set as Active
                  </button>
                )}

                {/* 5. Block / Unblock Customer */}
                {target.status === 'Blocked' ? (
                  <button
                    type="button"
                    onClick={() => {
                      updateCustomerStatus(target.id, 'Active');
                      toast.success(`Customer ${target.name} unblocked.`);
                      setActiveDropdownId(null);
                    }}
                    className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                  >
                    Unblock Customer
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      updateCustomerStatus(target.id, 'Blocked');
                      toast.warning(`Customer ${target.name} blocked.`);
                      setActiveDropdownId(null);
                    }}
                    className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                  >
                    Block Customer
                  </button>
                )}

                {/* 6. Delete Customer */}
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete customer "${target.name}"?`)) {
                      deleteCustomer(target.id);
                      toast.success(`Customer ${target.name} removed.`);
                    }
                    setActiveDropdownId(null);
                  }}
                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                >
                  Delete Customer
                </button>
              </>
            );
          })()}
        </div>
      )}

      {/* ========================================== */}
      {/* 1. ADD / EDIT CUSTOMER MODAL               */}
      {/* ========================================== */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingCustomer ? `Edit Customer: ${editingCustomer.name}` : 'Add New Customer'}
        subtitle={editingCustomer ? `Update ${editingCustomer.name} (${editingCustomer.customerCode}) profile & terms` : 'Register client profile, address, tax identification, and credit terms'}
        maxWidth="4xl"
        headerGradient={true}
        showBackIcon={true}
        hideCloseButton={true}
        onBack={() => setIsFormModalOpen(false)}
      >
        <div className="space-y-6 max-h-[75vh] overflow-y-auto p-2 sm:p-4 text-xs animate-in fade-in duration-150">
          {/* Section 1: Basic Details */}
          <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-100">
              <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-[#33077C] font-bold text-xs flex items-center gap-1.5 border border-purple-200">
                <User className="w-3.5 h-3.5 text-[#4309A2]" />
                1. Basic Information
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Customer Code <span className="text-slate-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.customerCode}
                  onChange={(e) => setFormData({ ...formData, customerCode: e.target.value })}
                  placeholder="e.g. CUS-1001"
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-mono font-bold text-[#33077C] outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Full Name / Contact Person <span className="text-slate-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Marcus Vance"
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Company Name (Optional)
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="e.g. Apex Global Logistics"
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Customer Type
                </label>
                <select
                  value={formData.customerType}
                  onChange={(e) => setFormData({ ...formData, customerType: e.target.value as CustomerType })}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer"
                >
                  <option value="Business">Business (B2B)</option>
                  <option value="Individual">Individual (B2C)</option>
                </select>
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Primary Phone <span className="text-slate-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Alternate Phone
                </label>
                <input
                  type="text"
                  value={formData.alternatePhone}
                  onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                  placeholder="e.g. +91 98765 43211"
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Email Address <span className="text-slate-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. client@company.com"
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Gender
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Account Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as CustomerStatus })}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer"
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
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-4">
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Street Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      address: val,
                      billingAddress: prev.sameAsBilling ? val : prev.billingAddress,
                      shippingAddress: prev.sameAsBilling ? val : prev.shippingAddress,
                    }));
                  }}
                  placeholder="e.g. 452 Ocean Avenue, Suite 400"
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g. Chennai"
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  State
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="e.g. Tamil Nadu"
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Country
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="e.g. India"
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Pincode / ZIP
                </label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  placeholder="e.g. 600001"
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  GSTIN (GST Number)
                </label>
                <input
                  type="text"
                  value={formData.gstNumber}
                  onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                  placeholder="e.g. 33AABCZ9876K1Z2"
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-mono uppercase font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  PAN Number
                </label>
                <input
                  type="text"
                  value={formData.panNumber}
                  onChange={(e) => setFormData({ ...formData, panNumber: e.target.value })}
                  placeholder="e.g. ABCDE1234F"
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-mono uppercase font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Billing Address
                </label>
                <textarea
                  rows={2}
                  value={formData.billingAddress}
                  onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                  placeholder="Complete billing address for GST invoices..."
                  className="w-full p-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all resize-none"
                />
              </div>

              <div className="sm:col-span-2 flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="sameAsBilling"
                  checked={formData.sameAsBilling}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sameAsBilling: e.target.checked,
                      shippingAddress: e.target.checked ? formData.billingAddress : formData.shippingAddress,
                    })
                  }
                  className="w-4 h-4 rounded text-[#33077C] focus:ring-[#4309A2] border-slate-300 cursor-pointer"
                />
                <label htmlFor="sameAsBilling" className="text-xs sm:text-[13px] font-semibold text-slate-700 cursor-pointer">
                  Shipping address is identical to Billing address
                </label>
              </div>

              {!formData.sameAsBilling && (
                <div className="sm:col-span-2">
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Shipping / Delivery Address
                  </label>
                  <textarea
                    rows={2}
                    value={formData.shippingAddress}
                    onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                    placeholder="Delivery warehouse or location address..."
                    className="w-full p-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all resize-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Credit & Payment Terms */}
          <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-100">
              <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-[#33077C] font-bold text-xs flex items-center gap-1.5 border border-purple-200">
                <CreditCard className="w-3.5 h-3.5 text-[#4309A2]" />
                4. Credit Limit & Payment Terms
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Credit Limit (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.creditLimit}
                  onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                  placeholder="e.g. 50000"
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Payment Terms
                </label>
                <input
                  type="text"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  placeholder="e.g. Net 30 Days"
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Opening Balance (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.openingBalance}
                  onChange={(e) => setFormData({ ...formData, openingBalance: Number(e.target.value) })}
                  placeholder="e.g. 0"
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Preferred Payment
                </label>
                <select
                  value={formData.preferredPaymentMethod}
                  onChange={(e) => setFormData({ ...formData, preferredPaymentMethod: e.target.value })}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Credit">Store Credit</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Tags (Comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="e.g. VIP, Wholesale, Priority"
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Notes / Internal Comments
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Special instructions or account manager notes..."
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
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
            type="button"
            onClick={handleSaveCustomerClick}
            className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>{editingCustomer ? 'Save Changes' : 'Save Customer'}</span>
          </button>
        </div>
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
                A customer with a matching phone number, email address, or customer ID already exists in your database:
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
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{dup.name}</p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {dup.customerCode} • {dup.phone} • {dup.email}
                  </p>
                  {dup.company && <p className="text-[11px] text-slate-400">{dup.company}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsDuplicateModalOpen(false);
                    setIsFormModalOpen(false);
                    setSelectedCustomer(dup);
                    setActiveDetailTab('overview');
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
            Would you like to proceed anyway and register this as a new profile, or return to edit the form?
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
              onClick={() => {
                if (pendingSavePayload) {
                  commitSaveCustomer(pendingSavePayload);
                }
              }}
              className="h-10 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Save Anyway</span>
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
          subtitle={`ID: ${selectedCustomer.customerCode} • ${selectedCustomer.customerType} Profile • Credit & Ledger`}
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
                        • {selectedCustomer.company}
                      </span>
                    )}
                    <span>• {selectedCustomer.phone}</span>
                    <span>• {selectedCustomer.email}</span>
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
                      `/sale-management/sales/sale?customerId=${selectedCustomer.id}&createSale=true`
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
                { id: 'overview', label: 'Overview', icon: User },
                {
                  id: 'quotations',
                  label: `Quotations (${selectedCustomerQuotations.length})`,
                  icon: FileText,
                },
                {
                  id: 'proformas',
                  label: `Proformas (${selectedCustomerProformas.length})`,
                  icon: FileSpreadsheet,
                },
                {
                  id: 'orders',
                  label: `Sale Orders (${selectedCustomerOrders.length})`,
                  icon: ShoppingBag,
                },
                {
                  id: 'challans',
                  label: `Challans (${selectedCustomerChallans.length})`,
                  icon: Truck,
                },
                {
                  id: 'sales',
                  label: `Invoices (${selectedCustomerSales.length})`,
                  icon: ShoppingCart,
                },
                { id: 'payments', label: 'Payments', icon: CreditCard },
                {
                  id: 'returns',
                  label: `Returns (${selectedCustomerReturns.length})`,
                  icon: RotateCcw,
                },
                { id: 'outstanding', label: 'Outstanding & Ledger', icon: IndianRupee },
                {
                  id: 'activity',
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
                        ? 'border-[#33077C] text-[#33077C] font-bold'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab 1: Overview */}
            {activeDetailTab === 'overview' && (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {/* 3 Overview Metric Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-800/50">
                    <p className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                      Total Invoiced
                    </p>
                    <p className="text-xl font-bold text-purple-900 dark:text-purple-100 mt-1">
                      ₹{selectedCustomerMetrics.totalSalesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                      ₹{selectedCustomerMetrics.totalPaidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                      Settled via {selectedCustomer.preferredPaymentMethod || 'Bank'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-800/50">
                    <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
                      Current Outstanding
                    </p>
                    <p className="text-xl font-bold text-rose-900 dark:text-rose-100 mt-1">
                      ₹{selectedCustomerMetrics.outstandingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
                      Credit Limit: ₹{(selectedCustomer.creditLimit || 0).toLocaleString()}
                    </p>
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
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedCustomer.name}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">Company Name:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedCustomer.company || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">Phone:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedCustomer.phone}</span>
                      </div>
                      {selectedCustomer.alternatePhone && (
                        <div className="flex justify-between py-1.5">
                          <span className="text-slate-500">Alternate Phone:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedCustomer.alternatePhone}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">Email:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedCustomer.email}</span>
                      </div>
                      {selectedCustomer.gstNumber && (
                        <div className="flex justify-between py-1.5 font-mono">
                          <span className="text-slate-500">GSTIN:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedCustomer.gstNumber}</span>
                        </div>
                      )}
                      {selectedCustomer.panNumber && (
                        <div className="flex justify-between py-1.5 font-mono">
                          <span className="text-slate-500">PAN:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedCustomer.panNumber}</span>
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
                        <span className="text-slate-500">Payment Terms:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedCustomer.paymentTerms}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">Credit Limit:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">₹{(selectedCustomer.creditLimit || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">Available Credit:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹{selectedCustomerMetrics.availableCredit.toLocaleString()}</span>
                      </div>
                      <div className="py-2">
                        <span className="text-slate-500 block mb-1">Billing Address:</span>
                        <p className="font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-800">
                          {selectedCustomer.billingAddress || selectedCustomer.address}
                        </p>
                      </div>
                      {selectedCustomer.notes && (
                        <div className="py-2">
                          <span className="text-slate-500 block mb-1">Internal Notes:</span>
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

            {/* Tab: Quotations */}
            {activeDetailTab === 'quotations' && (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {selectedCustomerQuotations.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium">No quotations recorded for this customer yet</p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        navigate('/sale-management/sales/quotation');
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
                        <th className="py-2.5 px-3 text-right text-white">Amount</th>
                        <th className="py-2.5 px-3 text-center text-white">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedCustomerQuotations.map((q) => (
                        <tr key={q.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-[#33077C]">{q.quotationNo}</td>
                          <td className="py-2.5 px-3 text-slate-600">{q.date}</td>
                          <td className="py-2.5 px-3 text-slate-600">{q.validUntil}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">₹{Number(q.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
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
            {activeDetailTab === 'proformas' && (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {selectedCustomerProformas.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium">No proforma invoices found for this customer</p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        navigate('/sale-management/sales/proforma');
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
                        <th className="py-2.5 px-3 text-right text-white">Amount</th>
                        <th className="py-2.5 px-3 text-center text-white">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedCustomerProformas.map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-[#33077C]">{p.proformaNo}</td>
                          <td className="py-2.5 px-3 text-slate-600">{p.date}</td>
                          <td className="py-2.5 px-3 text-slate-600">{p.validUntil}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">₹{Number(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
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
            {activeDetailTab === 'orders' && (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {selectedCustomerOrders.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <ShoppingBag className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium">No sales orders found for this customer</p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        navigate('/sale-management/sales/sale-order');
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
                        <th className="py-2.5 px-3 text-right text-white">Total Amount</th>
                        <th className="py-2.5 px-3 text-right text-white">Balance</th>
                        <th className="py-2.5 px-3 text-center text-white">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedCustomerOrders.map((o: any) => (
                        <tr key={o.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-[#33077C]">{o.orderNo}</td>
                          <td className="py-2.5 px-3 text-slate-600">{o.orderDate}</td>
                          <td className="py-2.5 px-3 text-slate-600">{o.dueDate}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">₹{Number(o.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="py-2.5 px-3 text-right text-rose-600 font-semibold">₹{Number(o.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
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
            {activeDetailTab === 'challans' && (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {selectedCustomerChallans.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <Truck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium">No delivery challans recorded for this customer</p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        navigate('/sale-management/sales/delivery-challan');
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
                        <th className="py-2.5 px-3 text-right text-white">Amount</th>
                        <th className="py-2.5 px-3 text-center text-white">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedCustomerChallans.map((c: any) => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-[#33077C]">{c.challanNo}</td>
                          <td className="py-2.5 px-3 text-slate-600">{c.invoiceDate}</td>
                          <td className="py-2.5 px-3 text-slate-600">{c.vehicleNo || '-'}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">₹{Number(c.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
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
            {activeDetailTab === 'sales' && (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {selectedCustomerSales.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <ShoppingCart className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium">No sales recorded for this customer yet</p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        navigate(`/sale-management/sales/sale?customerId=${selectedCustomer.id}&createSale=true`);
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
                        <th className="py-2.5 px-3 text-right text-white">Grand Total</th>
                        <th className="py-2.5 px-3 text-right text-white">Paid</th>
                        <th className="py-2.5 px-3 text-right text-white">Balance</th>
                        <th className="py-2.5 px-3 text-center text-white">Payment Status</th>
                        <th className="py-2.5 px-3 text-center text-white">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {selectedCustomerSales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                          <td className="py-2.5 px-3 font-mono font-bold text-[#4309A2] dark:text-purple-300">
                            {sale.invoiceNo}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{sale.saleDate}</td>
                          <td className="py-2.5 px-3 text-slate-600">{sale.items.length} items</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-900 dark:text-white">
                            ₹{sale.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-600 font-medium">
                            ₹{(sale.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right text-rose-600 font-bold">
                            ₹{(sale.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                sale.paymentStatus === 'Paid'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : sale.paymentStatus === 'Partial'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              {sale.paymentStatus}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="text-[11px] text-slate-500">{sale.saleStatus}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Tab 3: Payments */}
            {activeDetailTab === 'payments' && (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {selectedCustomerSales.filter((s) => (s.paidAmount || 0) > 0).length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <CreditCard className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium">No payments received yet</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#33077C] text-white font-bold uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 text-white">Invoice No</th>
                        <th className="py-2.5 px-3 text-white">Payment Date</th>
                        <th className="py-2.5 px-3 text-white">Payment Method</th>
                        <th className="py-2.5 px-3 text-right text-white">Total Invoice</th>
                        <th className="py-2.5 px-3 text-right text-white">Amount Settled</th>
                        <th className="py-2.5 px-3 text-center text-white">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {selectedCustomerSales
                        .filter((s) => (s.paidAmount || 0) > 0)
                        .map((sale) => (
                          <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                            <td className="py-2.5 px-3 font-mono font-bold text-[#4309A2] dark:text-purple-300">
                              {sale.invoiceNo}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">{sale.saleDate}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-200">
                              {sale.paymentMethod || 'Bank Transfer'}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-500">
                              ₹{sale.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                              ₹{(sale.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
            {activeDetailTab === 'returns' && (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {selectedCustomerReturns.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <RotateCcw className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium">No sales return requests for this customer</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#33077C] text-white font-bold uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 text-white">Return No</th>
                        <th className="py-2.5 px-3 text-white">Invoice No</th>
                        <th className="py-2.5 px-3 text-white">Date</th>
                        <th className="py-2.5 px-3 text-white">Items</th>
                        <th className="py-2.5 px-3 text-right text-white">Return Amount</th>
                        <th className="py-2.5 px-3 text-center text-white">Refund Status</th>
                        <th className="py-2.5 px-3 text-center text-white">Return Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {selectedCustomerReturns.map((ret) => (
                        <tr key={ret.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                          <td className="py-2.5 px-3 font-mono font-bold text-rose-600">
                            {ret.returnNo}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                            {ret.invoiceNo}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{ret.returnDate}</td>
                          <td className="py-2.5 px-3 text-slate-600">{ret.items.length} items</td>
                          <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                            ₹{ret.returnAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
            {activeDetailTab === 'outstanding' && (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {/* Outstanding Breakdown Card */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-between">
                    <span>Outstanding Account Ledger</span>
                    <span className="text-rose-600 font-bold text-sm">
                      Net Due: ₹{selectedCustomerMetrics.outstandingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </h4>

                  <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-slate-700">
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500">Opening Balance:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        ₹{(selectedCustomer.openingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500">(+) Total Invoiced Sales:</span>
                      <span className="font-semibold text-purple-700 dark:text-purple-300">
                        ₹{selectedCustomerMetrics.totalSalesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500">(-) Total Payments Received:</span>
                      <span className="font-semibold text-emerald-600">
                        ₹{selectedCustomerMetrics.totalPaidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {selectedCustomerMetrics.totalReturnAmount > 0 && (
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">(-) Sales Returns / Credit Notes:</span>
                        <span className="font-semibold text-blue-600">
                          ₹{selectedCustomerMetrics.totalReturnAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between py-2 font-bold text-sm bg-slate-50 dark:bg-slate-900/40 px-2 rounded">
                      <span className="text-slate-900 dark:text-white">Current Balance Receivable:</span>
                      <span className="text-rose-600">
                        ₹{selectedCustomerMetrics.outstandingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Credit Risk Meter */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>Credit Limit Utilization</span>
                    <span>
                      {selectedCustomerMetrics.creditUtilizationPercent.toFixed(1)}% of ₹
                      {(selectedCustomer.creditLimit || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        selectedCustomerMetrics.creditUtilizationPercent > 90
                          ? 'bg-rose-500'
                          : selectedCustomerMetrics.creditUtilizationPercent > 60
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${selectedCustomerMetrics.creditUtilizationPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Available Credit: ₹{selectedCustomerMetrics.availableCredit.toLocaleString()}</span>
                    <span>
                      Risk Level:{' '}
                      <strong
                        className={
                          selectedCustomerMetrics.creditUtilizationPercent > 90
                            ? 'text-rose-600'
                            : selectedCustomerMetrics.creditUtilizationPercent > 60
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }
                      >
                        {selectedCustomerMetrics.creditUtilizationPercent > 90
                          ? 'High'
                          : selectedCustomerMetrics.creditUtilizationPercent > 60
                          ? 'Moderate'
                          : 'Low / Healthy'}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 6: Activity Timeline */}
            {activeDetailTab === 'activity' && (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {!selectedCustomer.activities || selectedCustomer.activities.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <History className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium">No activity logged yet</p>
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                    {selectedCustomer.activities.map((act) => (
                      <div key={act.id} className="relative flex items-start gap-3 text-xs">
                        <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-[#4309A2] border-2 border-white dark:border-slate-800" />
                        <div className="flex-1 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200/70 dark:border-slate-700">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {act.action}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(act.date).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 mt-1">{act.details}</p>
                          {act.user && (
                            <p className="text-[10px] text-slate-400 mt-1 font-medium">
                              By: {act.user}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

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
    </div>
  );
};
