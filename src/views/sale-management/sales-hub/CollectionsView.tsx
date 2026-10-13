import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  IndianRupee,
  Search,
  Filter,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  User,
  UserCheck,
  ChevronDown,
  MoreVertical,
  X,
  Check,
  FileText,
  Eye,
  ShieldAlert,
  RotateCcw,
  CreditCard,
  ExternalLink,
  Download,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Building2,
  CalendarDays,
  Smartphone,
  LayoutDashboard,
  UsersRound,
  CalendarClock,
  History,
  MessageSquare,
  PhoneCall,
  UserPlus,
  Loader2,
} from 'lucide-react';
import {
  useSalesManagementStore,
  SaleTransaction,
  SalesCustomer,
  SalesRepresentative,
  CollectionFollowUp,
  FollowUpOutcome,
  ContactMethod,
  PromiseToPay,
} from '../../../store/useSalesManagementStore';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { Pagination } from '../../../components/common/Pagination';
import { SearchBar } from '../../../components/common/SearchBar';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { exportTableToExcel } from '../../../utils/excelExport';
import { toast } from 'sonner';
import {
  collectionApi,
  ApiCollectionInvoiceItem,
  CollectionTabCounts,
  CollectionDashboardMetrics,
  CustomerAssignmentItem,
  CollectionFollowUpItem,
  CollectionHistoryItem,
  CustomerCollectionTimelineData,
} from '../../../api/commerce/collectionApi';

type CollectionTab = 'all' | 'due-today' | 'overdue' | 'promise-to-pay' | 'collected';
type CollectionsSubView =
  | 'dashboard'
  | 'customer-assignments'
  | 'follow-ups'
  | 'collection-history';

export const CollectionsView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    sales,
    customers,
    paymentIns,
    collectionFollowUps,
    promisesToPay,
    recordCollectionPayment,
    assignCustomerSalesRep,
    addCollectionFollowUp,
    savePromiseToPay,
    getCollectionDashboardMetrics,
  } = useSalesManagementStore();

  // Live sales representatives from API
  const [liveReps, setLiveReps] = React.useState<import('../../../api/commerce/salesRepresentativeApi').ApiSalesRepresentative[]>([]);
  React.useEffect(() => {
    import('../../../api/commerce/salesRepresentativeApi').then(({ salesRepresentativeApi }) => {
      salesRepresentativeApi.getList({ limit: 200 }).then((res) => {
        if (res.success) setLiveReps(res.data ?? []);
      }).catch(() => {});
    });
  }, []);

  // Current system date reference
  const todayStr = new Date().toISOString().split('T')[0];

  // URL search query sync
  const initialSearch = searchParams.get('search') || '';
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [appliedSearch, setAppliedSearch] = useState(initialSearch);

  // Debounce search query to prevent excessive API invocations
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(searchTerm.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Main Sub-views: Dashboard | Customer Assignments | Follow-ups | Collection History
  const rawInitial = (searchParams.get('subView') || searchParams.get('tab') || searchParams.get('view') || 'dashboard') as string;
  const initialView = rawInitial === 'invoice-assignments' ? 'customer-assignments' : rawInitial;
  const [subView, setSubView] = useState<CollectionsSubView>(
    ['dashboard', 'customer-assignments', 'follow-ups', 'collection-history'].includes(initialView as CollectionsSubView)
      ? (initialView as CollectionsSubView)
      : 'dashboard'
  );

  // Sync subView with URL changes
  useEffect(() => {
    const rawUrl = (searchParams.get('subView') || searchParams.get('tab') || searchParams.get('view')) as string;
    const urlView = rawUrl === 'invoice-assignments' ? 'customer-assignments' : rawUrl;
    if (
      urlView &&
      ['dashboard', 'customer-assignments', 'follow-ups', 'collection-history'].includes(urlView as CollectionsSubView)
    ) {
      setSubView(urlView as CollectionsSubView);
      setCurrentPage(1);
    }
  }, [searchParams]);

  // Active Tab for Collection Dashboard
  const [activeTab, setActiveTab] = useState<CollectionTab>('all');

  // Filters
  const [selectedRepFilter, setSelectedRepFilter] = useState<string>('ALL');
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState<string>('ALL');
  const [dueDateFilter, setDueDateFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Action Menu Dropdown State
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null);

  // Modals State
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isPromiseModalOpen, setIsPromiseModalOpen] = useState(false);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [isInvoicePreviewModalOpen, setIsInvoicePreviewModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isAssignCustomerModalOpen, setIsAssignCustomerModalOpen] = useState(false);

  // API States
  const [dashboardMetrics, setDashboardMetrics] = useState<CollectionDashboardMetrics | null>(null);
  const [isMetricsLoading, setIsMetricsLoading] = useState(false);

  const [apiInvoices, setApiInvoices] = useState<ApiCollectionInvoiceItem[]>([]);
  const [isInvoicesLoading, setIsInvoicesLoading] = useState(false);
  const [tabCounts, setTabCounts] = useState<CollectionTabCounts>({
    allDues: 0,
    dueToday: 0,
    overdue: 0,
    promiseToPay: 0,
    collected: 0,
  });
  const [totalInvoices, setTotalInvoices] = useState(0);

  const [apiAssignments, setApiAssignments] = useState<CustomerAssignmentItem[]>([]);
  const [isAssignmentsLoading, setIsAssignmentsLoading] = useState(false);
  const [totalAssignments, setTotalAssignments] = useState(0);

  const [apiFollowUps, setApiFollowUps] = useState<CollectionFollowUpItem[]>([]);
  const [isFollowUpsLoading, setIsFollowUpsLoading] = useState(false);
  const [totalFollowUps, setTotalFollowUps] = useState(0);

  const [apiHistory, setApiHistory] = useState<CollectionHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [totalHistory, setTotalHistory] = useState(0);

  const [customerTimeline, setCustomerTimeline] = useState<CustomerCollectionTimelineData | null>(null);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected Target for Action Modals
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  // Form State for Record Payment
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(todayStr);
  const [paymentMethod, setPaymentMethod] = useState<string>('Bank Transfer');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [paymentRepId, setPaymentRepId] = useState<string>('');

  // Form State for Customer Assignment Modal
  const [assignCustomerId, setAssignCustomerId] = useState<string>('');
  const [assignRepId, setAssignRepId] = useState<string>('');
  const [assignType, setAssignType] = useState<'Primary' | 'Temporary'>('Primary');
  const [assignEffectiveFrom, setAssignEffectiveFrom] = useState<string>(todayStr);
  const [assignNotes, setAssignNotes] = useState<string>('');

  // Form State for Follow-up (Enhanced with Contact Method and Promise toggle)
  const [followUpDate, setFollowUpDate] = useState<string>(todayStr);
  const [followUpTime, setFollowUpTime] = useState<string>('11:00 AM');
  const [followUpContactMethod, setFollowUpContactMethod] = useState<ContactMethod>('Phone');
  const [followUpOutcome, setFollowUpOutcome] = useState<FollowUpOutcome>('Customer Contacted');
  const [followUpNotes, setFollowUpNotes] = useState<string>('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState<string>('');
  const [followUpRepId, setFollowUpRepId] = useState<string>('');
  const [followUpHasPromise, setFollowUpHasPromise] = useState<boolean>(false);
  const [followUpPromiseDate, setFollowUpPromiseDate] = useState<string>('');
  const [followUpPromiseAmount, setFollowUpPromiseAmount] = useState<number>(0);

  // Form State for Promise to Pay
  const [promisedAmount, setPromisedAmount] = useState<number>(0);
  const [promiseDate, setPromiseDate] = useState<string>('');
  const [promiseNotes, setPromiseNotes] = useState<string>('');

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.action-menu-dropdown') && !target.closest('.action-menu-trigger')) {
        setActiveActionId(null);
        setDropdownPosition(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Update search from URL query if changed
  useEffect(() => {
    const urlQuery = searchParams.get('search');
    if (urlQuery !== null && urlQuery !== searchTerm) {
      setSearchTerm(urlQuery);
    }
  }, [searchParams]);

  // -------------------------------------------------------------
  // API Fetch Functions
  // -------------------------------------------------------------
  const loadMetrics = React.useCallback(async () => {
    try {
      setIsMetricsLoading(true);
      const res = await collectionApi.getCollectionMetrics({
        salesRepresentativeId: selectedRepFilter !== 'ALL' ? selectedRepFilter : undefined,
        referenceDate: todayStr,
      });
      if (res?.success && res.data) {
        setDashboardMetrics(res.data);
      }
    } catch (err) {
      console.error('Failed to load collection metrics:', err);
    } finally {
      setIsMetricsLoading(false);
    }
  }, [selectedRepFilter, todayStr]);

  const loadInvoices = React.useCallback(async () => {
    try {
      setIsInvoicesLoading(true);
      const res = await collectionApi.getCollectionInvoices({
        tab: activeTab,
        search: appliedSearch || undefined,
        salesRepresentativeId: selectedRepFilter !== 'ALL' ? selectedRepFilter : undefined,
        customerId: selectedCustomerFilter !== 'ALL' ? selectedCustomerFilter : undefined,
        dueDateFilter: dueDateFilter !== 'ALL' ? dueDateFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        paymentStatus: paymentStatusFilter !== 'ALL' ? paymentStatusFilter : undefined,
        page: currentPage,
        limit: pageSize,
      });
      if (res?.success) {
        setApiInvoices(Array.isArray(res.data) ? res.data : []);
        if (res.tabCounts) {
          setTabCounts(res.tabCounts);
        }
        if (res.pagination?.totalRecords !== undefined) {
          setTotalInvoices(res.pagination.totalRecords);
        } else {
          setTotalInvoices(Array.isArray(res.data) ? res.data.length : 0);
        }
      }
    } catch (err) {
      console.error('Failed to load collection invoices:', err);
      setApiInvoices([]);
    } finally {
      setIsInvoicesLoading(false);
    }
  }, [
    activeTab,
    appliedSearch,
    selectedRepFilter,
    selectedCustomerFilter,
    dueDateFilter,
    statusFilter,
    paymentStatusFilter,
    currentPage,
    pageSize,
  ]);

  const loadAssignments = React.useCallback(async () => {
    try {
      setIsAssignmentsLoading(true);
      const res = await collectionApi.getCustomerAssignments({
        search: appliedSearch || undefined,
        salesRepresentativeId: selectedRepFilter !== 'ALL' ? selectedRepFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        page: currentPage,
        limit: pageSize,
      });
      if (res?.success) {
        setApiAssignments(Array.isArray(res.data) ? res.data : []);
        setTotalAssignments(res.pagination?.totalRecords ?? (Array.isArray(res.data) ? res.data.length : 0));
      }
    } catch (err) {
      console.error('Failed to load customer assignments:', err);
      setApiAssignments([]);
    } finally {
      setIsAssignmentsLoading(false);
    }
  }, [appliedSearch, selectedRepFilter, statusFilter, currentPage, pageSize]);

  const loadFollowUps = React.useCallback(async () => {
    try {
      setIsFollowUpsLoading(true);
      const res = await collectionApi.getFollowUps({
        search: appliedSearch || undefined,
        salesRepresentativeId: selectedRepFilter !== 'ALL' ? selectedRepFilter : undefined,
        outcome: statusFilter !== 'ALL' ? statusFilter : undefined,
        page: currentPage,
        pageSize: pageSize,
      });
      if (res?.success) {
        setApiFollowUps(Array.isArray(res.data) ? res.data : []);
        setTotalFollowUps(res.pagination?.totalRecords ?? (Array.isArray(res.data) ? res.data.length : 0));
      }
    } catch (err) {
      console.error('Failed to load follow-ups:', err);
      setApiFollowUps([]);
    } finally {
      setIsFollowUpsLoading(false);
    }
  }, [appliedSearch, selectedRepFilter, statusFilter, currentPage, pageSize]);

  const loadHistory = React.useCallback(async () => {
    try {
      setIsHistoryLoading(true);
      const res = await collectionApi.getCollectionHistory({
        search: appliedSearch || undefined,
        salesRepresentativeId: selectedRepFilter !== 'ALL' ? selectedRepFilter : undefined,
        paymentMethod: paymentStatusFilter !== 'ALL' ? paymentStatusFilter : undefined,
        page: currentPage,
        limit: pageSize,
      });
      if (res?.success) {
        setApiHistory(Array.isArray(res.data) ? res.data : []);
        setTotalHistory(res.pagination?.totalRecords ?? (Array.isArray(res.data) ? res.data.length : 0));
      }
    } catch (err) {
      console.error('Failed to load collection history:', err);
      setApiHistory([]);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [appliedSearch, selectedRepFilter, paymentStatusFilter, currentPage, pageSize]);

  // Initial and reactive data fetching
  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  useEffect(() => {
    if (subView === 'dashboard') {
      loadInvoices();
    } else if (subView === 'customer-assignments') {
      loadAssignments();
    } else if (subView === 'follow-ups') {
      loadFollowUps();
    } else if (subView === 'collection-history') {
      loadHistory();
    }
  }, [subView, loadInvoices, loadAssignments, loadFollowUps, loadHistory]);

  // Derived Collection Items from API Invoices
  interface CollectionItem {
    id: string;
    invoice: any;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    customer: any | null;
    customerId: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    salesRep: any | null;
    salesRepName: string;
    invoiceTotal: number;
    paidAmount: number;
    outstandingAmount: number;
    status: 'Overdue' | 'Due Today' | 'Upcoming' | 'Promise to Pay' | 'Paid';
    paymentStatus: 'Unpaid' | 'Partial' | 'Paid';
    hasPendingPromise: boolean;
    pendingPromise?: any;
    lastPaymentDate?: string;
  }

  const collectionItems = useMemo<CollectionItem[]>(() => {
    if (apiInvoices.length > 0) {
      return apiInvoices.map((inv) => {
        const invoiceTotal = Number(inv.grandTotal || 0);
        const paidAmount = Number(inv.paidAmount || 0);
        const outstandingAmount =
          inv.balance !== undefined ? Number(inv.balance) : Math.max(0, invoiceTotal - paidAmount);

        let status: 'Overdue' | 'Due Today' | 'Upcoming' | 'Promise to Pay' | 'Paid' = 'Paid';
        if (outstandingAmount > 0) {
          if (inv.promiseToPay && (inv.promiseToPay.status === 'Pending' || inv.promiseToPay.status === 'Active')) {
            status = 'Promise to Pay';
          } else if (inv.dueDate && inv.dueDate < todayStr) {
            status = 'Overdue';
          } else if (inv.dueDate && inv.dueDate === todayStr) {
            status = 'Due Today';
          } else {
            status = 'Upcoming';
          }
        }

        let pStatus: 'Unpaid' | 'Partial' | 'Paid' = 'Unpaid';
        if (outstandingAmount <= 0) {
          pStatus = 'Paid';
        } else if (paidAmount > 0) {
          pStatus = 'Partial';
        }

        const matchedCustomer = customers.find((c) => c.id === inv.customerId) || null;
        const matchedSale = sales.find((s) => s.id === inv.id || s.invoiceNo === inv.invoiceNo);
        const rep = liveReps.find((r) => r.id === inv.salesRepresentativeId) || null;

        return {
          id: inv.id,
          invoice: matchedSale || ({
            id: inv.id,
            invoiceNo: inv.invoiceNo,
            saleDate: inv.invoiceDate,
            dueDate: inv.dueDate,
            customerId: inv.customerId,
            customerName: inv.customerName,
            customerPhone: inv.customerPhone,
            customerEmail: inv.customerEmail,
            grandTotal: invoiceTotal,
            paidAmount: paidAmount,
            balance: outstandingAmount,
            salesRepresentativeId: inv.salesRepresentativeId,
            salesRepresentativeName: inv.salesRepresentativeName,
            status: inv.paymentStatus,
          } as any),
          invoiceNumber: inv.invoiceNo,
          invoiceDate: inv.invoiceDate,
          dueDate: inv.dueDate || inv.invoiceDate,
          customer: matchedCustomer || ({
            id: inv.customerId,
            name: inv.customerName,
            phone: inv.customerPhone,
            email: inv.customerEmail,
            company: inv.customerCompany,
            salesRepresentativeId: inv.salesRepresentativeId,
          } as any),
          customerId: inv.customerId,
          customerName: inv.customerName,
          customerPhone: inv.customerPhone || 'N/A',
          customerEmail: inv.customerEmail || '',
          salesRep: rep,
          salesRepName: inv.salesRepresentativeName || rep?.name || 'Unassigned',
          invoiceTotal,
          paidAmount,
          outstandingAmount,
          status,
          paymentStatus: pStatus,
          hasPendingPromise: !!inv.promiseToPay,
          pendingPromise: inv.promiseToPay as any,
          lastPaymentDate: undefined,
        };
      });
    }

    return [];
  }, [apiInvoices, customers, sales, liveReps, todayStr]);

  // Invoices are filtered and paginated on server
  const filteredItems = collectionItems;
  const totalPages = Math.ceil(totalInvoices / pageSize) || 1;
  const paginatedItems = collectionItems;

  // Sub-view 2: Customer Assignments Memo
  const customerAssignmentsList = useMemo(() => {
    if (apiAssignments.length > 0) {
      return apiAssignments.map((ca) => {
        const rep = liveReps.find((r) => r.id === ca.salesRepresentative?.id);
        const matchedCust = customers.find((c) => c.id === ca.id);
        return {
          customer: matchedCust || ({
            id: ca.id,
            name: ca.customerName,
            customerCode: ca.customerCode,
            company: ca.company,
            phone: ca.phone,
            salesRepresentativeId: ca.salesRepresentative?.id,
            salesRepresentativeType: ca.salesRepresentative?.type,
            assignedDate: ca.assignedDate,
            status: ca.status,
          } as any),
          outstanding: Number(ca.totalOutstanding || 0),
          rep,
          repName: ca.salesRepresentative?.name || rep?.name || 'Unassigned',
          repType: ca.salesRepresentative?.type || 'Primary',
          assignedDate: ca.assignedDate || 'â€”',
          status: ca.status || 'Active',
        };
      });
    }
    return [];
  }, [apiAssignments, customers, liveReps]);

  const filteredCustomerAssignments = customerAssignmentsList;
  const paginatedCustomerAssignments = customerAssignmentsList;

  // Sub-view 3: Follow-ups Memo
  const filteredFollowUps = useMemo(() => {
    if (apiFollowUps.length > 0) {
      return apiFollowUps;
    }
    return [];
  }, [apiFollowUps]);

  const paginatedFollowUps = filteredFollowUps;

  // Sub-view 4: Collection History Memo
  const filteredCollectionHistory = useMemo(() => {
    if (apiHistory.length > 0) {
      return apiHistory;
    }
    return [];
  }, [apiHistory]);

  const paginatedHistory = filteredCollectionHistory;

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setAppliedSearch('');
    setSelectedRepFilter('ALL');
    setSelectedCustomerFilter('ALL');
    setDueDateFilter('ALL');
    setStatusFilter('ALL');
    setPaymentStatusFilter('ALL');
    setActiveTab('all');
    setCurrentPage(1);
    setSearchParams({});
    toast.info('Filters have been reset');
  };

  // Helper: Open Record Payment Modal prefilled with invoice
  const handleOpenRecordPayment = (item: CollectionItem) => {
    setSelectedInvoice(item.invoice);
    setSelectedCustomer(item.customer);
    setPaymentAmount(item.outstandingAmount);
    setPaymentDate(todayStr);
    setPaymentMethod('Bank Transfer');
    setPaymentReference('');
    setPaymentNotes(`Payment collected for Invoice ${item.invoiceNumber}`);
    setPaymentRepId(item.salesRep?.id || item.salesRepName || '');
    setIsRecordPaymentModalOpen(true);
    setActiveActionId(null);
  };

  // Helper: Submit Record Payment
  const handleSubmitRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    if (paymentAmount <= 0) {
      toast.error('Please enter a valid payment amount greater than �0');
      return;
    }

    const currentOutstanding =
      selectedInvoice.balance !== undefined
        ? Number(selectedInvoice.balance)
        : Math.max(0, Number(selectedInvoice.grandTotal || 0) - Number(selectedInvoice.paidAmount || 0));

    if (paymentAmount > currentOutstanding) {
      toast.error(
        `Payment amount (�${paymentAmount.toLocaleString()}) cannot exceed outstanding amount (�${currentOutstanding.toLocaleString()})`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await collectionApi.recordPayment({
        invoiceId: selectedInvoice.id,
        customerId: selectedInvoice.customerId || selectedCustomer?.id,
        amount: Number(paymentAmount),
        paymentDate: paymentDate || todayStr,
        paymentMethod,
        referenceNo: paymentReference || undefined,
        notes: paymentNotes || undefined,
        salesRepresentativeId: paymentRepId || undefined,
      });

      recordCollectionPayment({
        invoiceId: selectedInvoice.id,
        amount: Number(paymentAmount),
        paymentDate: paymentDate || todayStr,
        paymentMethod,
        referenceNo: paymentReference || undefined,
        notes: paymentNotes || undefined,
        salesRepresentativeId: paymentRepId || undefined,
      });

      toast.success(
        `Recorded payment of �${Number(paymentAmount).toLocaleString('en-IN', {
          minimumFractionDigits: 2,
        })} for Invoice ${selectedInvoice.invoiceNo}`
      );

      setIsRecordPaymentModalOpen(false);
      setSelectedInvoice(null);
      setSelectedCustomer(null);
      loadInvoices();
      loadMetrics();
      if (subView === 'collection-history') loadHistory();
    } catch (err: any) {
      console.error('Failed to record payment:', err);
      toast.error(err?.response?.data?.error?.message || err?.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper: Open Follow-up Modal
  const handleOpenFollowUp = (item: CollectionItem) => {
    setSelectedInvoice(item.invoice);
    setSelectedCustomer(item.customer);
    setFollowUpDate(todayStr);
    setFollowUpTime('11:00 AM');
    setFollowUpContactMethod('Phone');
    setFollowUpOutcome('Customer Contacted');
    setFollowUpNotes('');
    setNextFollowUpDate('');
    setFollowUpRepId(item.salesRep?.id || '');
    setFollowUpHasPromise(false);
    setFollowUpPromiseDate('');
    setFollowUpPromiseAmount(item.outstandingAmount);
    setIsFollowUpModalOpen(true);
    setActiveActionId(null);
  };

  // Helper: Submit Follow-up
  const handleSubmitFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !selectedCustomer) return;

    if (!followUpNotes.trim()) {
      toast.error('Please enter follow-up interaction notes');
      return;
    }

    const savedOutcome = followUpHasPromise ? 'Promise to Pay' : followUpOutcome;

    try {
      setIsSubmitting(true);
      await collectionApi.createFollowUp({
        customerId: selectedCustomer.id,
        invoiceId: selectedInvoice.id,
        salesRepresentativeId:
          followUpRepId || selectedInvoice.salesRepresentativeId || selectedCustomer.salesRepresentativeId,
        contactMethod: followUpContactMethod,
        followUpDate,
        followUpTime,
        outcome: savedOutcome,
        notes: followUpNotes.trim(),
        hasPromiseToPay: followUpHasPromise,
        promisedAmount: followUpHasPromise ? Number(followUpPromiseAmount) : undefined,
        promiseDate: followUpHasPromise ? followUpPromiseDate : undefined,
        nextFollowUpDate: nextFollowUpDate || (followUpHasPromise ? followUpPromiseDate : undefined),
      });

      addCollectionFollowUp({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        invoiceId: selectedInvoice.id,
        invoiceNo: selectedInvoice.invoiceNo,
        salesRepresentativeId:
          followUpRepId || selectedInvoice.salesRepresentativeId || selectedCustomer.salesRepresentativeId,
        salesRepresentativeName:
          liveReps.find((r) => r.id === followUpRepId)?.name ||
          selectedInvoice.salesRepresentativeName ||
          'Sales Rep',
        contactMethod: followUpContactMethod,
        followUpDate,
        followUpTime,
        outcome: savedOutcome,
        notes: followUpNotes.trim(),
        hasPromiseToPay: followUpHasPromise,
        promisedAmount: followUpHasPromise ? Number(followUpPromiseAmount) : undefined,
        promiseDate: followUpHasPromise ? followUpPromiseDate : undefined,
        nextFollowUpDate: nextFollowUpDate || (followUpHasPromise ? followUpPromiseDate : undefined),
        createdBy: liveReps.find((r) => r.id === followUpRepId)?.name || 'Rep',
      });

      if (followUpHasPromise && followUpPromiseAmount > 0 && followUpPromiseDate) {
        savePromiseToPay({
          customerId: selectedCustomer.id,
          customerName: selectedCustomer.name,
          invoiceId: selectedInvoice.id,
          invoiceNo: selectedInvoice.invoiceNo,
          salesRepresentativeId: followUpRepId || selectedInvoice.salesRepresentativeId,
          salesRepresentativeName: liveReps.find((r) => r.id === followUpRepId)?.name,
          promisedAmount: Number(followUpPromiseAmount),
          promiseDate: followUpPromiseDate,
          notes: `Promise to Pay recorded during follow-up: ${followUpNotes.trim()}`,
          status: 'Pending',
        });
      }

      toast.success(`Follow-up saved for ${selectedCustomer.name}`);
      setIsFollowUpModalOpen(false);
      setSelectedInvoice(null);
      setSelectedCustomer(null);
      loadInvoices();
      loadMetrics();
      if (subView === 'follow-ups') loadFollowUps();
    } catch (err: any) {
      console.error('Failed to create follow-up:', err);
      toast.error(err?.response?.data?.error?.message || err?.message || 'Failed to save follow-up');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper: Open Customer Sales Rep Assignment Modal
  const handleOpenAssignCustomer = (cust?: any | null) => {
    if (cust) {
      setAssignCustomerId(cust.id);
      setAssignRepId(cust.salesRepresentativeId || liveReps[0]?.id || '');
      setAssignType(cust.salesRepresentativeType || 'Primary');
      setAssignEffectiveFrom(cust.assignedDate || todayStr);
      setAssignNotes(cust.assignmentNotes || '');
    } else {
      setAssignCustomerId(customers[0]?.id || '');
      setAssignRepId(liveReps[0]?.id || '');
      setAssignType('Primary');
      setAssignEffectiveFrom(todayStr);
      setAssignNotes('');
    }
    setIsAssignCustomerModalOpen(true);
  };

  const handleSubmitAssignCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignCustomerId) {
      toast.error('Please select a customer');
      return;
    }
    if (!assignRepId) {
      toast.error('Please select a sales representative');
      return;
    }

    try {
      setIsSubmitting(true);
      await collectionApi.assignCustomer({
        customerId: assignCustomerId,
        salesRepresentativeId: assignRepId,
        assignmentType: assignType,
        effectiveFrom: assignEffectiveFrom,
        notes: assignNotes,
      });

      assignCustomerSalesRep(assignCustomerId, assignRepId, assignType, assignEffectiveFrom, assignNotes);
      const targetCust = customers.find((c) => c.id === assignCustomerId);
      const targetRep = liveReps.find((r) => r.id === assignRepId);
      toast.success(`Assigned ${targetRep?.name || 'Sales Rep'} to ${targetCust?.name || 'Customer'}`);
      setIsAssignCustomerModalOpen(false);
      loadAssignments();
      loadInvoices();
    } catch (err: any) {
      console.error('Failed to assign customer:', err);
      toast.error(err?.response?.data?.error?.message || err?.message || 'Failed to assign sales rep');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper: Open Promise to Pay Modal
  const handleOpenPromiseToPay = (item: CollectionItem) => {
    setSelectedInvoice(item.invoice);
    setSelectedCustomer(item.customer);
    setPromisedAmount(item.outstandingAmount);
    setPromiseDate('');
    setPromiseNotes('');
    setIsPromiseModalOpen(true);
    setActiveActionId(null);
  };

  // Helper: Submit Promise to Pay
  const handleSubmitPromiseToPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !selectedCustomer) return;

    if (promisedAmount <= 0) {
      toast.error('Please enter a valid promised amount');
      return;
    }

    if (!promiseDate) {
      toast.error('Please select the promised payment date');
      return;
    }

    try {
      setIsSubmitting(true);
      await collectionApi.createPromiseToPay({
        customerId: selectedCustomer.id,
        invoiceId: selectedInvoice.id,
        salesRepresentativeId: selectedInvoice.salesRepresentativeId || selectedCustomer.salesRepresentativeId,
        promisedAmount: Number(promisedAmount),
        promiseDate,
        notes: promiseNotes.trim() || 'Customer promised payment',
      });

      savePromiseToPay({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        invoiceId: selectedInvoice.id,
        invoiceNo: selectedInvoice.invoiceNo,
        salesRepresentativeId: selectedInvoice.salesRepresentativeId || selectedCustomer.salesRepresentativeId,
        salesRepresentativeName:
          liveReps.find(
            (r) =>
              r.id ===
              (selectedInvoice.salesRepresentativeId || selectedCustomer.salesRepresentativeId)
          )?.name || 'Admin',
        promisedAmount: Number(promisedAmount),
        promiseDate,
        notes: promiseNotes.trim() || 'Customer promised payment',
        status: 'Pending',
      });

      toast.success(
        `Promise to Pay recorded for �${Number(promisedAmount).toLocaleString()} on ${promiseDate}`
      );

      setIsPromiseModalOpen(false);
      setSelectedInvoice(null);
      setSelectedCustomer(null);
      loadInvoices();
      loadMetrics();
    } catch (err: any) {
      console.error('Failed to save promise to pay:', err);
      toast.error(err?.response?.data?.error?.message || err?.message || 'Failed to save promise');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper: Open Customer Detail & Timeline Modal
  const handleOpenTimeline = async (item: CollectionItem) => {
    setSelectedInvoice(item.invoice);
    setSelectedCustomer(item.customer);
    setIsTimelineModalOpen(true);
    setActiveActionId(null);

    if (item.customerId) {
      try {
        setIsTimelineLoading(true);
        const res = await collectionApi.getCustomerTimeline(item.customerId);
        if (res?.success && res.data) {
          setCustomerTimeline(res.data);
        } else {
          setCustomerTimeline(null);
        }
      } catch (err) {
        console.error('Failed to fetch customer timeline:', err);
        setCustomerTimeline(null);
      } finally {
        setIsTimelineLoading(false);
      }
    }
  };

  // Helper: Open Contact Customer
  const handleOpenContact = (item: CollectionItem) => {
    setSelectedInvoice(item.invoice);
    setSelectedCustomer(item.customer);
    setIsContactModalOpen(true);
    setActiveActionId(null);
  };

  // Helper: Open Invoice Preview
  const handleOpenInvoicePreview = (item: CollectionItem) => {
    setSelectedInvoice(item.invoice);
    setSelectedCustomer(item.customer);
    setIsInvoicePreviewModalOpen(true);
    setActiveActionId(null);
  };

  // Helper: Export table to Excel
  const handleExportExcel = () => {
    exportTableToExcel({
      filename: `Collections_Report_${todayStr}`,
      title: 'Collections Report',
      columns: [
        { header: 'Customer Name', key: 'customerName' },
        { header: 'Contact Phone', key: 'customerPhone' },
        { header: 'Invoice No', key: 'invoiceNumber' },
        { header: 'Invoice Date', key: 'invoiceDate' },
        { header: 'Due Date', key: 'dueDate' },
        { header: 'Invoice Total (INR)', key: 'invoiceTotal', type: 'currency' },
        { header: 'Paid Amount (INR)', key: 'paidAmount', type: 'currency' },
        { header: 'Outstanding Balance (INR)', key: 'outstandingAmount', type: 'currency' },
        { header: 'Sales Representative', key: 'salesRepName' },
        { header: 'Collection Status', key: 'status' },
        { header: 'Payment Status', key: 'paymentStatus' },
      ],
      data: filteredItems,
    });
    toast.success('Collection records exported to Excel');
  };

  // Status Badge Component
  const renderStatusBadge = (status: CollectionItem['status']) => {
    switch (status) {
      case 'Overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            Overdue
          </span>
        );
      case 'Due Today':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Due Today
          </span>
        );
      case 'Upcoming':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Upcoming
          </span>
        );
      case 'Promise to Pay':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-[#33077C] border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4309A2]" />
            Promise to Pay
          </span>
        );
      case 'Paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Paid
          </span>
        );
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#33077C] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <IndianRupee className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Customer Collections & Dues
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage receivable invoices, follow-ups, payment promises, and collection workflows.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportExcel}
            className="h-9 px-3 rounded-xl border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              // Open general record payment modal with first open invoice or blank
              const firstOpen = collectionItems.find((i) => i.outstandingAmount > 0);
              if (firstOpen) {
                handleOpenRecordPayment(firstOpen);
              } else {
                toast.info('No open receivable invoices found to collect');
              }
            }}
            className="h-9 px-3.5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#33077C]/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Record Payment</span>
          </Button>
        </div>
      </div>

      {/* 2. Collection Dashboard Top Summary Cards (5 Key Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Outstanding */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-xs hover:border-purple-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Outstanding
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#33077C] flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {isMetricsLoading ? (
                <span className="inline-block w-24 h-7 bg-slate-100 dark:bg-slate-700 animate-pulse rounded-md" />
              ) : (
                `�${Number(dashboardMetrics?.totalOutstanding ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
              )}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Across all open receivables
            </p>
          </div>
        </div>

        {/* Card 2: Overdue Amount */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-rose-200/80 dark:border-rose-900/40 shadow-xs hover:border-rose-300 transition-all bg-gradient-to-br from-white via-rose-50/20 to-rose-50/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Overdue
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-rose-600">
              {isMetricsLoading ? (
                <span className="inline-block w-24 h-7 bg-rose-100/50 animate-pulse rounded-md" />
              ) : (
                `�${Number(
                  (typeof dashboardMetrics?.overdue === 'object'
                    ? dashboardMetrics?.overdue?.amount
                    : dashboardMetrics?.overdueAmount) ?? 0
                ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
              )}
            </span>
            <p className="text-[11px] text-rose-600/80 mt-0.5 font-medium">
              {Number(
                (typeof dashboardMetrics?.overdue === 'object'
                  ? dashboardMetrics?.overdue?.count
                  : dashboardMetrics?.overdueCount) ?? tabCounts.overdue ?? 0
              )}{' '}
              invoices past due date
            </p>
          </div>
        </div>

        {/* Card 3: Due Today */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-amber-200/80 dark:border-amber-900/40 shadow-xs hover:border-amber-300 transition-all bg-gradient-to-br from-white via-amber-50/20 to-amber-50/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Due Today
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-amber-800">
              {isMetricsLoading ? (
                <span className="inline-block w-24 h-7 bg-amber-100/50 animate-pulse rounded-md" />
              ) : (
                `�${Number(
                  (typeof dashboardMetrics?.dueToday === 'object'
                    ? dashboardMetrics?.dueToday?.amount
                    : dashboardMetrics?.dueTodayAmount) ?? 0
                ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
              )}
            </span>
            <p className="text-[11px] text-amber-700/80 mt-0.5 font-medium">
              {Number(
                (typeof dashboardMetrics?.dueToday === 'object'
                  ? dashboardMetrics?.dueToday?.count
                  : dashboardMetrics?.dueTodayCount) ?? tabCounts.dueToday ?? 0
              )}{' '}
              invoices maturing today
            </p>
          </div>
        </div>

        {/* Card 4: Follow-ups Today */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-indigo-200/80 dark:border-indigo-900/40 shadow-xs hover:border-indigo-300 transition-all bg-gradient-to-br from-white via-indigo-50/20 to-indigo-50/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" />
              Follow-ups Today
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <CalendarClock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-indigo-800">
              {isMetricsLoading ? (
                <span className="inline-block w-12 h-7 bg-indigo-100/50 animate-pulse rounded-md" />
              ) : (
                Number(
                  (typeof dashboardMetrics?.followUpsToday === 'object'
                    ? dashboardMetrics?.followUpsToday?.count
                    : dashboardMetrics?.followUpsTodayCount) ?? 0
                )
              )}
            </span>
            <p className="text-[11px] text-indigo-700/80 mt-0.5 font-medium">
              Scheduled customer interactions
            </p>
          </div>
        </div>

        {/* Card 5: Collected This Month */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-emerald-200/80 dark:border-emerald-900/40 shadow-xs hover:border-emerald-300 transition-all bg-gradient-to-br from-white via-emerald-50/20 to-emerald-50/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Collected This Month
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-emerald-700">
              {isMetricsLoading ? (
                <span className="inline-block w-24 h-7 bg-emerald-100/50 animate-pulse rounded-md" />
              ) : (
                `�${Number(
                  (typeof dashboardMetrics?.collectedThisMonth === 'object'
                    ? dashboardMetrics?.collectedThisMonth?.amount
                    : dashboardMetrics?.collectedThisMonthAmount) ?? 0
                ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
              )}
            </span>
            <p className="text-[11px] text-emerald-600/80 mt-0.5 font-medium">
              {Number(
                (typeof dashboardMetrics?.collectedThisMonth === 'object'
                  ? dashboardMetrics?.collectedThisMonth?.count
                  : dashboardMetrics?.collectedThisMonthCount) ?? tabCounts.collected ?? 0
              )}{' '}
              payments collected
            </p>
          </div>
        </div>
      </div>

      {/* 3. Sub-Module Navigation (4 Main Sections) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-xs gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'dashboard', label: 'Collection Dashboard', icon: LayoutDashboard },
            { id: 'customer-assignments', label: 'Customer Assignments', icon: UsersRound },
            { id: 'follow-ups', label: 'Follow-ups & Timeline', icon: CalendarClock },
            { id: 'collection-history', label: 'Collection History', icon: History },
          ].map((tab) => {
            const isActive = subView === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSubView(tab.id as CollectionsSubView);
                  setSearchParams({ tab: tab.id });
                }}
                className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#33077C] text-white shadow-sm shadow-[#33077C]/25'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {subView === 'customer-assignments' && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenAssignCustomer(null)}
            className="h-8.5 px-3.5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Assign Sales Rep</span>
          </Button>
        )}

        {subView === 'follow-ups' && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              const firstItem = collectionItems[0];
              if (firstItem) handleOpenFollowUp(firstItem);
            }}
            className="h-8.5 px-3.5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shrink-0"
          >
            <CalendarClock className="w-3.5 h-3.5" />
            <span>+ Log Follow-up</span>
          </Button>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SUB-VIEW 1: COLLECTION DASHBOARD (MY COLLECTIONS)             */}
      {/* ------------------------------------------------------------- */}
      {subView === 'dashboard' && (
        <div className="space-y-4">
          {/* 3. Collection Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto gap-2">
        {[
          { id: 'all', label: 'All Dues', count: tabCounts.allDues },
          { id: 'due-today', label: 'Due Today', count: tabCounts.dueToday },
          { id: 'overdue', label: 'Overdue', count: tabCounts.overdue },
          { id: 'promise-to-pay', label: 'Promise to Pay', count: tabCounts.promiseToPay },
          { id: 'collected', label: 'Collected', count: tabCounts.collected },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as CollectionTab);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'border-[#33077C] text-[#33077C] font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isActive
                    ? 'bg-[#33077C] text-white'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. Compact Filters Bar */}
      <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search Bar */}
          <div className="lg:col-span-2">
            <SearchBar
              value={searchTerm}
              onChange={(val) => {
                setSearchTerm(val);
                setCurrentPage(1);
              }}
              placeholder="Search customer, invoice no, phone..."
            />
          </div>

          {/* Sales Representative Filter */}
          <div>
            <select
              value={selectedRepFilter}
              onChange={(e) => {
                setSelectedRepFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-9 px-3 text-xs bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-200 font-medium focus:outline-hidden focus:ring-1 focus:ring-[#33077C]"
            >
              <option value="ALL">All Representatives</option>
              {liveReps.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.name}
                </option>
              ))}
            </select>
          </div>

          {/* Due Date Filter */}
          <div>
            <select
              value={dueDateFilter}
              onChange={(e) => {
                setDueDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-9 px-3 text-xs bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-200 font-medium focus:outline-hidden focus:ring-1 focus:ring-[#33077C]"
            >
              <option value="ALL">All Due Dates</option>
              <option value="OVERDUE">Overdue (Past)</option>
              <option value="TODAY">Due Today</option>
              <option value="THIS_MONTH">Due This Month</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-9 px-3 text-xs bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-200 font-medium focus:outline-hidden focus:ring-1 focus:ring-[#33077C]"
            >
              <option value="ALL">All Statuses</option>
              <option value="Overdue">Overdue</option>
              <option value="Due Today">Due Today</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Promise to Pay">Promise to Pay</option>
              <option value="Paid">Paid</option>
            </select>
          </div>

          {/* Payment Status & Reset */}
          <div className="flex items-center gap-2">
            <select
              value={paymentStatusFilter}
              onChange={(e) => {
                setPaymentStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-9 px-2 text-xs bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-200 font-medium focus:outline-hidden focus:ring-1 focus:ring-[#33077C]"
            >
              <option value="ALL">Payment: All</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Partial">Partially Paid</option>
              <option value="Paid">Fully Paid</option>
            </select>

            <button
              type="button"
              onClick={handleResetFilters}
              title="Reset Filters"
              className="h-9 px-2.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Collection Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#33077C] text-white font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3.5 text-white">Customer</th>
                <th className="py-3 px-3 text-white">Invoice No</th>
                <th className="py-3 px-3 text-white">Invoice Date</th>
                <th className="py-3 px-3 text-white">Due Date</th>
                <th className="py-3 px-3 text-right text-white">Invoice Amount</th>
                <th className="py-3 px-3 text-right text-white">Paid Amount</th>
                <th className="py-3 px-3 text-right text-white">Outstanding</th>
                <th className="py-3 px-3 text-white">Sales Rep</th>
                <th className="py-3 px-3 text-center text-white">Status</th>
                <th className="py-3 px-3.5 text-center text-white">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {isInvoicesLoading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#33077C] mb-2" />
                    <p className="text-sm font-medium">Loading collection invoices...</p>
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <IndianRupee className="w-10 h-10 mx-auto text-slate-300 mb-2 opacity-50" />
                    <p className="text-sm font-medium">No collection records found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try adjusting your search criteria or resetting filters
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    {/* Customer */}
                    <td className="py-3 px-3.5 font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenTimeline(item)}
                          className="text-left font-bold text-slate-900 dark:text-white hover:text-[#33077C] cursor-pointer"
                        >
                          {item.customerName}
                        </button>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono block">
                        {item.customerPhone}
                      </span>
                    </td>

                    {/* Invoice No */}
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => handleOpenInvoicePreview(item)}
                        className="font-mono font-bold text-[#33077C] dark:text-purple-300 hover:underline cursor-pointer"
                      >
                        {item.invoiceNumber}
                      </button>
                    </td>

                    {/* Invoice Date */}
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                      {item.invoiceDate}
                    </td>

                    {/* Due Date */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-semibold ${
                            item.outstandingAmount > 0 && item.dueDate < todayStr
                              ? 'text-rose-600'
                              : item.outstandingAmount > 0 && item.dueDate === todayStr
                              ? 'text-amber-600'
                              : 'text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {item.dueDate}
                        </span>
                        {item.outstandingAmount > 0 && item.dueDate === todayStr && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                            Today
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Invoice Amount */}
                    <td className="py-3 px-3 text-right font-medium text-slate-800 dark:text-slate-200">
                      �{item.invoiceTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Paid Amount */}
                    <td className="py-3 px-3 text-right text-emerald-600 font-medium">
                      �{item.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Outstanding Amount (Calculated: Total - Paid) */}
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`font-bold text-sm ${
                          item.outstandingAmount > 0 ? 'text-rose-600' : 'text-slate-400'
                        }`}
                      >
                        �{item.outstandingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* Sales Representative */}
                    <td className="py-3 px-3">
                      {item.salesRepName && item.salesRepName !== 'Unassigned' ? (
                        <div>
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 bg-purple-50/80 dark:bg-slate-700 px-2.5 py-1 rounded-lg border border-purple-200/50">
                            <UserCheck className="w-3.5 h-3.5 text-[#33077C]" />
                            {item.salesRepName}
                          </span>
                          {item.customer?.salesRepresentativeType && (
                            <div className="mt-0.5">
                              <span className="text-[10px] text-purple-700 dark:text-purple-300 font-medium">
                                {item.customer.salesRepresentativeType} Rep
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenAssignCustomer(item.customer)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#33077C] hover:text-[#4309A2] bg-purple-50 hover:bg-purple-100 dark:bg-slate-700 px-2.5 py-1 rounded-lg border border-purple-200/80 transition-colors cursor-pointer"
                          title="Assign Sales Rep to this Customer"
                        >
                          <UserPlus className="w-3 h-3 text-[#33077C]" />
                          <span>+ Assign Rep</span>
                        </button>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center">{renderStatusBadge(item.status)}</td>

                    {/* Action */}
                    <td className="py-3 px-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {item.outstandingAmount > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleOpenRecordPayment(item)}
                            className="h-7 px-2.5 rounded-lg bg-[#33077C] hover:bg-[#4309A2] text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>Collect</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-600 font-bold px-2 py-0.5 bg-emerald-50 rounded-md border border-emerald-200">
                            Settled
                          </span>
                        )}

                        {/* 3-dots action menu trigger */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeActionId === item.id) {
                                setActiveActionId(null);
                                setDropdownPosition(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setDropdownPosition({
                                  top: rect.bottom + 4,
                                  right: window.innerWidth - rect.right,
                                });
                                setActiveActionId(item.id);
                              }
                            }}
                            className="action-menu-trigger w-7 h-7 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {/* Portal-like dropdown menu */}
                          {activeActionId === item.id && dropdownPosition && (
                            <div
                              style={{
                                position: 'fixed',
                                top: `${dropdownPosition.top}px`,
                                right: `${dropdownPosition.right}px`,
                                zIndex: 9999,
                              }}
                              className="action-menu-dropdown w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100"
                            >
                              <button
                                type="button"
                                onClick={() => handleOpenInvoicePreview(item)}
                                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-50 text-slate-700 dark:text-slate-200 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-400" />
                                <span>View Invoice</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenContact(item)}
                                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-50 text-slate-700 dark:text-slate-200 cursor-pointer"
                              >
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                <span>Contact Customer</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenFollowUp(item)}
                                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-50 text-slate-700 dark:text-slate-200 cursor-pointer"
                              >
                                <Clock className="w-3.5 h-3.5 text-purple-600" />
                                <span>Add Follow-up</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveActionId(null);
                                  handleOpenAssignCustomer(item.customer);
                                }}
                                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-50 text-[#33077C] font-semibold cursor-pointer"
                              >
                                <UserCheck className="w-3.5 h-3.5 text-[#33077C]" />
                                <span>Assign / Change Rep</span>
                              </button>

                              {item.outstandingAmount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPromiseToPay(item)}
                                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-50 text-slate-700 dark:text-slate-200 cursor-pointer"
                                >
                                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>Record Promise to Pay</span>
                                </button>
                              )}

                              {item.outstandingAmount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenRecordPayment(item)}
                                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-50 text-emerald-700 font-semibold cursor-pointer"
                                >
                                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Record Payment</span>
                                </button>
                              )}

                              <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

                              <button
                                type="button"
                                onClick={() => handleOpenTimeline(item)}
                                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-50 text-[#33077C] font-semibold cursor-pointer"
                              >
                                <TrendingUp className="w-3.5 h-3.5 text-[#33077C]" />
                                <span>Collection Timeline</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {(totalInvoices > 0 || filteredItems.length > 0) && (
          <div className="p-3 border-t border-slate-100 dark:border-slate-700">
            <Pagination
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              totalItems={totalInvoices || filteredItems.length}
            />
          </div>
        )}
      </div>
    </div>
  )}

      {/* ------------------------------------------------------------- */}
      {/* SUB-VIEW 2: CUSTOMER ASSIGNMENTS PAGE                         */}
      {/* ------------------------------------------------------------- */}
      {subView === 'customer-assignments' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex-1 max-w-md">
              <SearchBar
                value={searchTerm}
                onChange={(val) => {
                  setSearchTerm(val);
                  setCurrentPage(1);
                }}
                placeholder="Search customer, customer code, phone, rep..."
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedRepFilter}
                onChange={(e) => {
                  setSelectedRepFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 px-3 text-xs bg-slate-50 dark:bg-slate-700 border border-slate-200 rounded-xl text-slate-800 font-medium"
              >
                <option value="ALL">All Representatives</option>
                {liveReps.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.name}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 px-3 text-xs bg-slate-50 dark:bg-slate-700 border border-slate-200 rounded-xl text-slate-800 font-medium"
              >
                <option value="ALL">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <button
                type="button"
                onClick={handleResetFilters}
                title="Reset Filters"
                className="h-9 px-2.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-800 bg-slate-50 flex items-center justify-center cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#33077C] text-white font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-3.5 text-white">Customer</th>
                    <th className="py-3 px-3 text-white">Customer Code</th>
                    <th className="py-3 px-3 text-right text-white">Outstanding</th>
                    <th className="py-3 px-3 text-white">Sales Rep</th>
                    <th className="py-3 px-3 text-white">Assigned Date</th>
                    <th className="py-3 px-3 text-center text-white">Status</th>
                    <th className="py-3 px-3.5 text-center text-white">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {isAssignmentsLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#33077C] mb-2" />
                        <p className="text-sm font-medium">Loading customer assignments...</p>
                      </td>
                    </tr>
                  ) : paginatedCustomerAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <UsersRound className="w-10 h-10 mx-auto text-slate-300 mb-2 opacity-50" />
                        <p className="text-sm font-medium">No customer assignments found</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedCustomerAssignments.map((item) => (
                      <tr key={item.customer.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3.5 font-medium">
                          <div className="font-bold text-slate-900">{item.customer.name}</div>
                          {item.customer.company && (
                            <div className="text-[11px] text-slate-500">{item.customer.company}</div>
                          )}
                          <div className="text-[10px] text-slate-400 font-mono">{item.customer.phone}</div>
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold text-purple-700">
                          {item.customer.customerCode || 'â€”'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className={`font-bold text-sm ${item.outstanding > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                            �{item.outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-[#33077C]" />
                            <span className="font-bold text-slate-900">{item.repName}</span>
                          </div>
                          <span className={`inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            item.repType === 'Temporary'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-purple-100 text-[#33077C]'
                          }`}>
                            {item.repType} Rep
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-medium">
                          {item.assignedDate}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenAssignCustomer(item.customer)}
                              className="px-2.5 py-1 rounded-lg bg-[#33077C] hover:bg-[#4309A2] text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>Reassign</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigate(`/sale-management/sales/customer?search=${item.customer.name}`);
                              }}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3 text-slate-400" />
                              <span>View</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {(totalAssignments > 0 || filteredCustomerAssignments.length > 0) && (
              <div className="p-3 border-t border-slate-100">
                <Pagination
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                  pageSize={pageSize}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                  }}
                  totalItems={totalAssignments || filteredCustomerAssignments.length}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUB-VIEW 4: FOLLOW-UPS & TIMELINE REGISTER                    */}
      {/* ------------------------------------------------------------- */}
      {subView === 'follow-ups' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex-1 max-w-md">
              <SearchBar
                value={searchTerm}
                onChange={(val) => {
                  setSearchTerm(val);
                  setCurrentPage(1);
                }}
                placeholder="Search customer, invoice, follow-up notes..."
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedRepFilter}
                onChange={(e) => {
                  setSelectedRepFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium"
              >
                <option value="ALL">All Representatives</option>
                {liveReps.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.name}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium"
              >
                <option value="ALL">All Outcomes</option>
                <option value="Customer Contacted">Customer Contacted</option>
                <option value="Promise to Pay">Promise to Pay</option>
                <option value="Payment Received">Payment Received</option>
                <option value="No Response">No Response</option>
                <option value="Dispute Raised">Dispute Raised</option>
                <option value="Follow-up Required">Follow-up Required</option>
              </select>
              <button
                type="button"
                onClick={handleResetFilters}
                title="Reset Filters"
                className="h-9 px-2.5 rounded-xl border border-slate-200 text-slate-500 bg-slate-50 flex items-center justify-center cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#33077C] text-white font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-3.5 text-white">Date & Time</th>
                    <th className="py-3 px-3 text-white">Customer & Invoice</th>
                    <th className="py-3 px-3 text-white">Sales Rep</th>
                    <th className="py-3 px-3 text-center text-white">Contact Method</th>
                    <th className="py-3 px-3 text-center text-white">Outcome</th>
                    <th className="py-3 px-3 text-white">Discussion Notes</th>
                    <th className="py-3 px-3 text-white">Promise to Pay</th>
                    <th className="py-3 px-3 text-white">Next Follow-up</th>
                    <th className="py-3 px-3.5 text-center text-white">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {isFollowUpsLoading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#33077C] mb-2" />
                        <p className="text-sm font-medium">Loading follow-up records...</p>
                      </td>
                    </tr>
                  ) : paginatedFollowUps.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <CalendarClock className="w-10 h-10 mx-auto text-slate-300 mb-2 opacity-50" />
                        <p className="text-sm font-medium">No follow-up records found</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedFollowUps.map((fup) => {
                      const cust = customers.find((c) => c.id === fup.customerId);
                      const inv = sales.find((s) => s.id === fup.invoiceId || s.invoiceNo === fup.invoiceNo);
                      return (
                        <tr key={fup.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3.5 font-medium whitespace-nowrap">
                            <div className="font-bold text-slate-900">{fup.followUpDate}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{fup.followUpTime || 'â€”'}</div>
                          </td>
                          <td className="py-3 px-3 font-medium">
                            <div className="font-bold text-slate-900">{fup.customerName || cust?.name || 'Customer'}</div>
                            <div className="text-[11px] text-purple-700 font-mono font-semibold">
                              {fup.invoiceNo || fup.invoiceNumber || 'General Follow-up'}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-800">
                            {fup.salesRepresentativeName || 'Rep'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {fup.contactMethod === 'Phone' && <Phone className="w-3 h-3 text-blue-600" />}
                              {fup.contactMethod === 'WhatsApp' && <MessageSquare className="w-3 h-3 text-emerald-600" />}
                              {fup.contactMethod === 'Email' && <Mail className="w-3 h-3 text-purple-600" />}
                              {fup.contactMethod === 'In-Person Visit' && <UsersRound className="w-3 h-3 text-indigo-600" />}
                              <span>{fup.contactMethod || 'Phone'}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              fup.outcome === 'Promise to Pay'
                                ? 'bg-purple-100 text-[#33077C]'
                                : fup.outcome === 'Payment Received'
                                ? 'bg-emerald-100 text-emerald-800'
                                : fup.outcome === 'Dispute Raised'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {fup.outcome}
                            </span>
                          </td>
                          <td className="py-3 px-3 max-w-xs text-slate-600 truncate italic">
                            "{fup.notes}"
                          </td>
                          <td className="py-3 px-3">
                            {fup.hasPromiseToPay || fup.promisedAmount ? (
                              <div className="text-[11px]">
                                <span className="font-bold text-indigo-700">�{Number(fup.promisedAmount || 0).toLocaleString()}</span>
                                <span className="text-[10px] text-slate-400 block font-mono">Date: {fup.promiseDate || 'â€”'}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400">â€”</span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-semibold text-purple-700 font-mono text-[11px]">
                            {fup.nextFollowUpDate || 'â€”'}
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                if (cust && inv) {
                                  setSelectedInvoice(inv);
                                  setSelectedCustomer(cust);
                                  setFollowUpDate(todayStr);
                                  setFollowUpTime('11:00 AM');
                                  setFollowUpContactMethod('Phone');
                                  setFollowUpOutcome('Customer Contacted');
                                  setFollowUpNotes('');
                                  setNextFollowUpDate('');
                                  setFollowUpRepId(fup.salesRepresentativeId || '');
                                  setFollowUpHasPromise(false);
                                  setFollowUpPromiseDate('');
                                  setFollowUpPromiseAmount(inv.balance || 0);
                                  setIsFollowUpModalOpen(true);
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#33077C] hover:bg-[#4309A2] text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1 mx-auto"
                            >
                              <Clock className="w-3 h-3" />
                              <span>Follow-up</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {(totalFollowUps > 0 || filteredFollowUps.length > 0) && (
              <div className="p-3 border-t border-slate-100">
                <Pagination
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                  pageSize={pageSize}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                  }}
                  totalItems={totalFollowUps || filteredFollowUps.length}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUB-VIEW 5: COLLECTION HISTORY / SETTLEMENTS LEDGER           */}
      {/* ------------------------------------------------------------- */}
      {subView === 'collection-history' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex-1 max-w-md">
              <SearchBar
                value={searchTerm}
                onChange={(val) => {
                  setSearchTerm(val);
                  setCurrentPage(1);
                }}
                placeholder="Search receipt no, customer, invoice no, ref..."
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedRepFilter}
                onChange={(e) => {
                  setSelectedRepFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium"
              >
                <option value="ALL">All Representatives</option>
                {liveReps.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleResetFilters}
                title="Reset Filters"
                className="h-9 px-2.5 rounded-xl border border-slate-200 text-slate-500 bg-slate-50 flex items-center justify-center cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#33077C] text-white font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-3.5 text-white">Receipt No</th>
                    <th className="py-3 px-3 text-white">Payment Date</th>
                    <th className="py-3 px-3 text-white">Customer</th>
                    <th className="py-3 px-3 text-white">Invoice No</th>
                    <th className="py-3 px-3 text-white">Sales Rep</th>
                    <th className="py-3 px-3 text-center text-white">Payment Mode</th>
                    <th className="py-3 px-3 text-white">Reference / UTR</th>
                    <th className="py-3 px-3 text-right text-white">Amount Collected</th>
                    <th className="py-3 px-3 text-center text-white">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {isHistoryLoading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#33077C] mb-2" />
                        <p className="text-sm font-medium">Loading collection settlement records...</p>
                      </td>
                    </tr>
                  ) : paginatedHistory.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <History className="w-10 h-10 mx-auto text-slate-300 mb-2 opacity-50" />
                        <p className="text-sm font-medium">No collection settlement records found</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedHistory.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3.5 font-bold font-mono text-[#33077C]">
                          {p.receiptNo}
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-medium">
                          {p.date || p.paymentDate}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {p.partyName}
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold text-purple-700">
                          {p.invoiceNo || 'On Account'}
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-semibold">
                          {p.salesRepresentativeName || 'Direct'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {p.paymentType || p.paymentMethod || 'Bank'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                          {p.referenceNo || 'â€”'}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-700 text-sm">
                          �{Number(p.receivedAmount || p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {p.status || 'Completed'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {(totalHistory > 0 || filteredCollectionHistory.length > 0) && (
              <div className="p-3 border-t border-slate-100">
                <Pagination
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                  pageSize={pageSize}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                  }}
                  totalItems={totalHistory || filteredCollectionHistory.length}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: RECORD PAYMENT (Integrates with Payment-In)                      */}
      {/* ========================================================================= */}
      {isRecordPaymentModalOpen && selectedInvoice && (
        <Modal
          isOpen={isRecordPaymentModalOpen}
          onClose={() => setIsRecordPaymentModalOpen(false)}
          title={`Record Payment: ${selectedInvoice.invoiceNo}`}
          subtitle={`Collect dues and update invoice outstanding balance`}
          maxWidth="xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setIsRecordPaymentModalOpen(false)}
        >
          <form noValidate onSubmit={handleSubmitRecordPayment} className="space-y-4 p-2 text-xs">
            {/* Invoice & Outstanding Banner */}
            <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-purple-700 dark:text-purple-300 font-semibold">
                  Customer: <span className="font-bold">{selectedCustomer?.name || selectedInvoice.customerName}</span>
                </p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Invoice No: {selectedInvoice.invoiceNo} - Due: {selectedInvoice.dueDate || 'N/A'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  Current Outstanding
                </span>
                <span className="text-lg font-bold text-rose-600">
                  �{(selectedInvoice.balance !== undefined
                    ? selectedInvoice.balance
                    : Math.max(0, (selectedInvoice.grandTotal || 0) - (selectedInvoice.paidAmount || 0))
                  ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Payment Amount */}
              <div className="relative">
                <div className="relative w-full h-11 bg-white border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15 rounded-xl transition-all shadow-2xs flex items-center">
                  <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                    Payment Amount (₹) <span className="text-rose-500">*</span>
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    className="w-full h-full px-4 bg-transparent font-bold text-sm text-slate-900 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Payment Date */}
              <div className="relative">
                <div className="relative w-full h-11 bg-white border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15 rounded-xl transition-all shadow-2xs flex items-center">
                  <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                    Payment Date <span className="text-rose-500">*</span>
                  </span>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full h-full px-4 bg-transparent text-xs font-medium text-slate-900 outline-none cursor-pointer"
                    required
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="relative">
                <div className="relative w-full h-11 bg-white border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15 rounded-xl transition-all shadow-2xs flex items-center">
                  <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                    Payment Method
                  </span>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full h-full px-4 bg-transparent text-xs font-medium text-slate-900 outline-none cursor-pointer"
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Credit Card">Credit Card / POS</option>
                  </select>
                </div>
              </div>

              {/* Sales Representative */}
              <div className="relative">
                <div className="relative w-full h-11 bg-white border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15 rounded-xl transition-all shadow-2xs flex items-center">
                  <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                    Collecting Sales Representative
                  </span>
                  <select
                    value={paymentRepId}
                    onChange={(e) => setPaymentRepId(e.target.value)}
                    className="w-full h-full px-4 bg-transparent text-xs font-medium text-slate-900 outline-none cursor-pointer"
                  >
                    <option value="">Select Representative (Optional)</option>
                    {liveReps.map((rep) => (
                      <option key={rep.id} value={rep.id}>
                        {rep.name} ({rep.mobile})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reference / Transaction No */}
              <div className="sm:col-span-2 relative">
                <div className="relative w-full h-11 bg-white border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15 rounded-xl transition-all shadow-2xs flex items-center">
                  <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                    Transaction / Cheque / UTR Reference
                  </span>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="e.g. UTR12345678 or Cheque #88992"
                    className="w-full h-full px-4 bg-transparent text-xs font-mono text-slate-900 outline-none"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="sm:col-span-2 relative">
                <div className="relative w-full bg-white border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15 rounded-xl transition-all shadow-2xs">
                  <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                    Notes / Remarks
                  </span>
                  <textarea
                    rows={2}
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Additional payment notes..."
                    className="w-full p-3 pt-3.5 bg-transparent text-xs text-slate-900 outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRecordPaymentModalOpen(false)}
                className="h-9 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-9 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#33077C]/20 cursor-pointer"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{isSubmitting ? 'Recording...' : 'Confirm Payment Receipt'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD FOLLOW-UP                                                    */}
      {/* ========================================================================= */}
      {isFollowUpModalOpen && selectedCustomer && selectedInvoice && (
        <Modal
          isOpen={isFollowUpModalOpen}
          onClose={() => setIsFollowUpModalOpen(false)}
          title={`Follow-up: ${selectedCustomer.name}`}
          subtitle={`Invoice ${selectedInvoice.invoiceNo} - Log customer interaction and commitments`}
          maxWidth="lg"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setIsFollowUpModalOpen(false)}
        >
          <div className="space-y-4 p-2 text-xs">
            {/* Header info banner: Customer & Invoice details */}
            <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedCustomer.name}</p>
                <p className="text-[11px] text-purple-700 dark:text-purple-300 font-mono font-semibold">
                  Invoice: {selectedInvoice.invoiceNo}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Outstanding Amount</span>
                <span className="text-base font-bold text-rose-600">
                  �{(selectedInvoice.balance !== undefined
                    ? selectedInvoice.balance
                    : Math.max(0, (selectedInvoice.grandTotal || 0) - (selectedInvoice.paidAmount || 0))
                  ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-slate-500 block">Due Date: {selectedInvoice.dueDate || '08 Oct 2026'}</span>
              </div>
            </div>

            <form noValidate onSubmit={handleSubmitFollowUp} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Contact Method */}
                <div className="relative">
                  <div className="relative w-full h-11 bg-white border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15 rounded-xl transition-all shadow-2xs flex items-center">
                    <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                      Contact Method <span className="text-rose-500">*</span>
                    </span>
                    <select
                      value={followUpContactMethod}
                      onChange={(e) => setFollowUpContactMethod(e.target.value as ContactMethod)}
                      className="w-full h-full px-4 bg-transparent text-xs font-medium text-slate-900 outline-none cursor-pointer"
                      required
                    >
                      <option value="Phone">Phone</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Email">Email</option>
                      <option value="In-Person Visit">In-Person Visit</option>
                    </select>
                  </div>
                </div>

                {/* Contact Status */}
                <div className="relative">
                  <div className="relative w-full h-11 bg-white border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15 rounded-xl transition-all shadow-2xs flex items-center">
                    <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                      Contact Status <span className="text-rose-500">*</span>
                    </span>
                    <select
                      value={followUpOutcome}
                      onChange={(e) => {
                        const val = e.target.value as FollowUpOutcome;
                        setFollowUpOutcome(val);
                        if (val === 'Promise to Pay') {
                          setFollowUpHasPromise(true);
                        }
                      }}
                      className="w-full h-full px-4 bg-transparent text-xs font-medium text-slate-900 outline-none cursor-pointer"
                      required
                    >
                      <option value="Customer Contacted">Customer Contacted</option>
                      <option value="Promise to Pay">Promise to Pay</option>
                      <option value="Payment Received">Payment Received</option>
                      <option value="No Response">No Response</option>
                      <option value="Dispute Raised">Dispute Raised</option>
                      <option value="Follow-up Required">Follow-up Required</option>
                    </select>
                  </div>
                </div>

                {/* Sales Representative */}
                <div className="relative">
                  <div className="relative w-full h-11 bg-white border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15 rounded-xl transition-all shadow-2xs flex items-center">
                    <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                      Sales Representative
                    </span>
                    <select
                      value={followUpRepId}
                      onChange={(e) => setFollowUpRepId(e.target.value)}
                      className="w-full h-full px-4 bg-transparent text-xs font-medium text-slate-900 outline-none cursor-pointer"
                    >
                      <option value="">Select Representative</option>
                      {liveReps.map((rep) => (
                        <option key={rep.id} value={rep.id}>
                          {rep.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Follow-up Date */}
                <div className="relative">
                  <div className="relative w-full h-11 bg-white border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15 rounded-xl transition-all shadow-2xs flex items-center">
                    <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                      Follow-up Date <span className="text-rose-500">*</span>
                    </span>
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-full h-full px-4 bg-transparent text-xs font-medium text-slate-900 outline-none cursor-pointer"
                      required
                    />
                  </div>
                </div>

                {/* Discussion */}
                <div className="sm:col-span-2 relative">
                  <div className="relative w-full bg-white border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15 rounded-xl transition-all shadow-2xs">
                    <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                      Discussion <span className="text-rose-500">*</span>
                    </span>
                    <textarea
                      rows={2}
                      value={followUpNotes}
                      onChange={(e) => setFollowUpNotes(e.target.value)}
                      placeholder="Customer confirmed payment on 10 Oct..."
                      className="w-full p-3 pt-3.5 bg-transparent text-xs text-slate-900 outline-none resize-none"
                      required
                    />
                  </div>
                </div>

                {/* Promise to Pay Toggle */}
                <div className="relative">
                  <div className="relative w-full h-11 bg-white border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15 rounded-xl transition-all shadow-2xs flex items-center">
                    <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                      Promise to Pay
                    </span>
                    <select
                      value={followUpHasPromise ? 'Yes' : 'No'}
                      onChange={(e) => setFollowUpHasPromise(e.target.value === 'Yes')}
                      className="w-full h-full px-4 bg-transparent text-xs font-medium text-slate-900 outline-none cursor-pointer"
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>
                </div>

                {/* Next Follow-up */}
                <div className="relative">
                  <div className="relative w-full h-11 bg-white border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15 rounded-xl transition-all shadow-2xs flex items-center">
                    <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                      Next Follow-up
                    </span>
                    <input
                      type="date"
                      value={nextFollowUpDate}
                      onChange={(e) => setNextFollowUpDate(e.target.value)}
                      className="w-full h-full px-4 bg-transparent text-xs font-medium text-slate-900 outline-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Conditional Promise Fields */}
                {followUpHasPromise && (
                  <>
                    <div className="relative">
                      <div className="relative w-full h-11 bg-white border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15 rounded-xl transition-all shadow-2xs flex items-center">
                        <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                          Promise Date <span className="text-rose-500">*</span>
                        </span>
                        <input
                          type="date"
                          value={followUpPromiseDate}
                          onChange={(e) => setFollowUpPromiseDate(e.target.value)}
                          className="w-full h-full px-4 bg-transparent text-xs font-medium text-slate-900 outline-none cursor-pointer"
                          required={followUpHasPromise}
                        />
                      </div>
                    </div>
                    <div className="relative">
                      <div className="relative w-full h-11 bg-white border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15 rounded-xl transition-all shadow-2xs flex items-center">
                        <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                          Expected Amount (₹) <span className="text-rose-500">*</span>
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          value={followUpPromiseAmount}
                          onChange={(e) => setFollowUpPromiseAmount(parseFloat(e.target.value) || 0)}
                          className="w-full h-full px-4 bg-transparent text-xs font-bold text-slate-900 outline-none"
                          required={followUpHasPromise}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFollowUpModalOpen(false)}
                  className="h-9 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-9 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#33077C]/20 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{isSubmitting ? 'Saving...' : 'Save Follow-up'}</span>
                </button>
              </div>
            </form>

            {/* Embedded Timeline */}
            <div className="pt-2 border-t border-slate-100">
              <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Interaction History & Timeline
              </h5>
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {(() => {
                  const items = apiFollowUps.length > 0
                    ? apiFollowUps.filter((f) => f.customerId === selectedCustomer.id || f.invoiceId === selectedInvoice.id)
                    : collectionFollowUps.filter((f) => f.customerId === selectedCustomer.id || f.invoiceId === selectedInvoice.id);
                  if (items.length === 0) {
                    return (
                      <p className="text-[11px] text-slate-400 italic py-2 text-center">
                        No prior follow-ups recorded
                      </p>
                    );
                  }
                  return items.map((item) => (
                    <div key={item.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{item.followUpDate}</span>
                          <span className="text-purple-700 font-semibold">- {item.outcome}</span>
                        </div>
                        <p className="text-slate-600 mt-0.5 italic">"{item.notes}"</p>
                        <p className="text-[10px] text-slate-400 mt-1">by {item.salesRepresentativeName || 'Sales Rep'}</p>
                      </div>
                      {Boolean(item.hasPromiseToPay || item.promisedAmount) && (
                        <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold text-[10px] shrink-0">
                          Promise: �{Number(item.promisedAmount || 0).toLocaleString()}
                        </span>
                      )}
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: RECORD PROMISE TO PAY                                            */}
      {/* ========================================================================= */}
      {isPromiseModalOpen && selectedCustomer && selectedInvoice && (
        <Modal
          isOpen={isPromiseModalOpen}
          onClose={() => setIsPromiseModalOpen(false)}
          title={`Record Promise to Pay: ${selectedCustomer.name}`}
          subtitle={`Invoice ${selectedInvoice.invoiceNo} - Outstanding: �${(
            selectedInvoice.balance !== undefined
              ? selectedInvoice.balance
              : Math.max(0, (selectedInvoice.grandTotal || 0) - (selectedInvoice.paidAmount || 0))
          ).toLocaleString()}`}
          maxWidth="md"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setIsPromiseModalOpen(false)}
        >
          <form noValidate onSubmit={handleSubmitPromiseToPay} className="space-y-4 p-2 text-xs pt-1">
            <div className="relative">
              <div className="relative w-full h-11 bg-white border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15 rounded-xl transition-all shadow-2xs flex items-center">
                <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                  Promised Amount (₹) <span className="text-rose-500">*</span>
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={promisedAmount}
                  onChange={(e) => setPromisedAmount(parseFloat(e.target.value) || 0)}
                  className="w-full h-full px-4 bg-transparent font-bold text-sm text-slate-900 outline-none"
                  required
                />
              </div>
            </div>

            <div className="relative">
              <div className="relative w-full h-11 bg-white border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15 rounded-xl transition-all shadow-2xs flex items-center">
                <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                  Promised Payment Date <span className="text-rose-500">*</span>
                </span>
                <input
                  type="date"
                  value={promiseDate}
                  onChange={(e) => setPromiseDate(e.target.value)}
                  className="w-full h-full px-4 bg-transparent text-xs font-medium text-slate-900 outline-none cursor-pointer"
                  required
                />
              </div>
            </div>

            <div className="relative">
              <div className="relative w-full bg-white border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15 rounded-xl transition-all shadow-2xs">
                <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                  Notes / Commitment Details
                </span>
                <textarea
                  rows={2}
                  value={promiseNotes}
                  onChange={(e) => setPromiseNotes(e.target.value)}
                  placeholder="e.g. Customer confirmed bank transfer by end of day"
                  className="w-full p-3 pt-3.5 bg-transparent text-xs text-slate-900 outline-none resize-none"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPromiseModalOpen(false)}
                className="h-9 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-9 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#33077C]/20 cursor-pointer"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{isSubmitting ? 'Saving...' : 'Save Promise'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CUSTOMER COLLECTION DETAIL & TIMELINE                            */}
      {/* ========================================================================= */}
      {isTimelineModalOpen && selectedCustomer && (
        <Modal
          isOpen={isTimelineModalOpen}
          onClose={() => setIsTimelineModalOpen(false)}
          title={`Collection Detail: ${selectedCustomer.name}`}
          subtitle={`Phone: ${selectedCustomer.phone} - Ledger & Receivable Status`}
          maxWidth="3xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setIsTimelineModalOpen(false)}
        >
          {(() => {
            const custSales = sales.filter(
              (s) =>
                s.customerId === selectedCustomer.id ||
                s.customerName?.toLowerCase() === selectedCustomer.name?.toLowerCase()
            );
            const totalOutstanding = custSales.reduce(
              (acc, s) =>
                acc + (s.balance !== undefined ? s.balance : Math.max(0, (s.grandTotal || 0) - (s.paidAmount || 0))),
              0
            );
            const overdueSales = custSales.filter((s) => {
              const bal =
                s.balance !== undefined ? s.balance : Math.max(0, (s.grandTotal || 0) - (s.paidAmount || 0));
              return bal > 0 && s.dueDate && s.dueDate < todayStr;
            });
            const overdueAmount = overdueSales.reduce(
              (acc, s) =>
                acc + (s.balance !== undefined ? s.balance : Math.max(0, (s.grandTotal || 0) - (s.paidAmount || 0))),
              0
            );

            const custPayments = paymentIns
              .filter((p) => p.customerId === selectedCustomer.id)
              .sort((a, b) => (b.paymentDate || '').localeCompare(a.paymentDate || ''));
            const lastPayment = custPayments[0] || null;

            const custFollowUps = collectionFollowUps
              .filter((f) => f.customerId === selectedCustomer.id)
              .sort((a, b) => (b.followUpDate || '').localeCompare(a.followUpDate || ''));
            const nextFollowUp =
              custFollowUps.find((f) => f.nextFollowUpDate && f.nextFollowUpDate >= todayStr) ||
              custFollowUps[0] ||
              null;

            const custPromises = promisesToPay
              .filter((p) => p.customerId === selectedCustomer.id)
              .sort((a, b) => (b.promiseDate || '').localeCompare(a.promiseDate || ''));

            const rep = liveReps.find(
              (r) => r.id === selectedCustomer.salesRepresentativeId
            );

            return (
              <div className="space-y-4 p-2 text-xs max-h-[75vh] overflow-y-auto">
                {/* Header Information Card */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{selectedCustomer.name}</h3>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Phone: {selectedCustomer.phone} - Email: {selectedCustomer.email || 'N/A'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-purple-50 text-[#33077C] px-3 py-1.5 rounded-lg border border-purple-200 font-semibold text-xs">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Rep: {rep?.name || 'Unassigned'}</span>
                  </div>
                </div>

                {/* 4 Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-100">
                    <span className="text-[10px] text-purple-700 font-semibold uppercase block">
                      Total Outstanding
                    </span>
                    <span className="text-base font-bold text-purple-900">
                      �{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-100">
                    <span className="text-[10px] text-rose-700 font-semibold uppercase block">
                      Overdue Amount
                    </span>
                    <span className="text-base font-bold text-rose-900">
                      �{overdueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                    <span className="text-[10px] text-emerald-700 font-semibold uppercase block">
                      Last Payment
                    </span>
                    <span className="text-xs font-bold text-emerald-900">
                      {lastPayment
                        ? `�${(lastPayment.amount || 0).toLocaleString()} (${lastPayment.paymentDate})`
                        : 'None'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                    <span className="text-[10px] text-indigo-700 font-semibold uppercase block">
                      Next Follow-up
                    </span>
                    <span className="text-xs font-bold text-indigo-900">
                      {nextFollowUp?.nextFollowUpDate || 'None Scheduled'}
                    </span>
                  </div>
                </div>

                {/* Outstanding Invoices */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Customer Invoices ({custSales.length})
                  </h4>
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#33077C] text-white text-[10px] font-bold uppercase">
                        <tr>
                          <th className="py-2 px-3">Invoice No</th>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Due Date</th>
                          <th className="py-2 px-3 text-right">Amount</th>
                          <th className="py-2 px-3 text-right">Paid</th>
                          <th className="py-2 px-3 text-right">Balance</th>
                          <th className="py-2 px-3 text-center">Status</th>
                          <th className="py-2 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {custSales.map((s) => {
                          const bal =
                            s.balance !== undefined
                              ? s.balance
                              : Math.max(0, (s.grandTotal || 0) - (s.paidAmount || 0));
                          let statusLabel = 'Paid';
                          let statusBg = 'bg-emerald-100 text-emerald-700';
                          if (bal > 0) {
                            if (s.dueDate && s.dueDate < todayStr) {
                              statusLabel = 'Overdue';
                              statusBg = 'bg-rose-100 text-rose-700';
                            } else if (s.dueDate && s.dueDate === todayStr) {
                              statusLabel = 'Due Today';
                              statusBg = 'bg-amber-100 text-amber-700';
                            } else {
                              statusLabel = 'Upcoming';
                              statusBg = 'bg-blue-100 text-blue-700';
                            }
                          }
                          return (
                            <tr key={s.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-mono font-bold text-[#33077C]">{s.invoiceNo}</td>
                              <td className="py-2 px-3 text-slate-600">{s.saleDate}</td>
                              <td className="py-2 px-3 text-slate-600">{s.dueDate || 'N/A'}</td>
                              <td className="py-2 px-3 text-right">
                                �{(s.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2 px-3 text-right text-emerald-600">
                                �{(s.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-rose-600">
                                �{bal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBg}`}>
                                  {statusLabel}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center">
                                {bal > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsTimelineModalOpen(false);
                                      setSelectedInvoice(s);
                                      setPaymentAmount(bal);
                                      setPaymentDate(todayStr);
                                      setPaymentRepId(rep?.id || '');
                                      setIsRecordPaymentModalOpen(true);
                                    }}
                                    className="px-2 py-1 rounded bg-[#33077C] hover:bg-[#4309A2] text-white text-[10px] font-bold cursor-pointer"
                                  >
                                    Collect
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-400">Settled</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Collection Timeline */}
                <div className="pt-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                    Collection Activity Timeline
                  </h4>

                  {isTimelineLoading ? (
                    <div className="py-8 text-center text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#33077C] mb-2" />
                      <p className="text-xs font-medium">Loading collection timeline...</p>
                    </div>
                  ) : customerTimeline?.events && customerTimeline.events.length > 0 ? (
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {customerTimeline.events.map((evt) => (
                        <div key={evt.id} className="relative flex items-start gap-3">
                          <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-[#4309A2] border-2 border-white" />
                          <div className="flex-1 bg-purple-50/50 p-3 rounded-xl border border-purple-100">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-slate-900">{evt.title}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{evt.date}</span>
                            </div>
                            {evt.subtitle && (
                              <p className="text-[11px] font-semibold text-purple-700 mt-0.5">{evt.subtitle}</p>
                            )}
                            {evt.details && <p className="text-slate-600 mt-1 italic text-[11px]">"{evt.details}"</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {/* Events list */}
                      {custFollowUps.map((f) => (
                        <div key={f.id} className="relative flex items-start gap-3">
                          <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-[#4309A2] border-2 border-white" />
                          <div className="flex-1 bg-purple-50/50 p-3 rounded-xl border border-purple-100">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-slate-900">
                                Follow-up Made: {f.outcome}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {f.followUpDate} {f.followUpTime}
                              </span>
                            </div>
                            <p className="text-slate-600 mt-1 italic">"{f.notes}"</p>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 pt-1 border-t border-purple-100">
                              <span>Rep: {f.salesRepresentativeName}</span>
                              {f.nextFollowUpDate && (
                                <span className="font-semibold text-purple-700">
                                  Next: {f.nextFollowUpDate}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {custPromises.map((p) => (
                        <div key={p.id} className="relative flex items-start gap-3">
                          <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-indigo-600 border-2 border-white" />
                          <div className="flex-1 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-indigo-900">
                                Promise to Pay: �{p.promisedAmount.toLocaleString()}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                                Status: {p.status}
                              </span>
                            </div>
                            <p className="text-slate-600 mt-1">
                              Promised settlement on: <span className="font-bold">{p.promiseDate}</span>
                            </p>
                            {p.notes && <p className="text-slate-500 italic mt-0.5 text-[11px]">"{p.notes}"</p>}
                          </div>
                        </div>
                      ))}

                      {custPayments.map((pay) => (
                        <div key={pay.id} className="relative flex items-start gap-3">
                          <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-emerald-600 border-2 border-white" />
                          <div className="flex-1 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-emerald-900">
                                Payment Received: �{pay.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] text-emerald-700 font-mono">
                                {pay.paymentDate}
                              </span>
                            </div>
                            <p className="text-slate-600 mt-1">
                              Settled via {pay.paymentMethod || 'Bank Transfer'}{' '}
                              {pay.referenceNo && `- Ref: ${pay.referenceNo}`}
                            </p>
                          </div>
                        </div>
                      ))}

                      {custFollowUps.length === 0 && custPromises.length === 0 && custPayments.length === 0 && (
                        <p className="text-slate-400 py-3 text-center">
                          No collection interactions or payment records logged yet.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsTimelineModalOpen(false)}
                    className="h-9 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: INVOICE PREVIEW                                                  */}
      {/* ========================================================================= */}
      {isInvoicePreviewModalOpen && selectedInvoice && (
        <Modal
          isOpen={isInvoicePreviewModalOpen}
          onClose={() => setIsInvoicePreviewModalOpen(false)}
          title={`Invoice Preview: ${selectedInvoice.invoiceNo}`}
          subtitle={`Date: ${selectedInvoice.saleDate} - Due: ${selectedInvoice.dueDate || 'N/A'}`}
          maxWidth="lg"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setIsInvoicePreviewModalOpen(false)}
        >
          <div className="space-y-4 p-2 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900 text-sm">{selectedInvoice.customerName}</p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Phone: {selectedInvoice.customerPhone || 'N/A'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Total Amount</span>
                <span className="text-base font-bold text-slate-900">
                  �{(selectedInvoice.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#33077C] text-white text-[10px] font-bold uppercase">
                  <tr>
                    <th className="py-2 px-3">Item</th>
                    <th className="py-2 px-3 text-right">Qty</th>
                    <th className="py-2 px-3 text-right">Unit Price</th>
                    <th className="py-2 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(selectedInvoice.items || []).map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-medium text-slate-800">{item.name || item.productId}</td>
                      <td className="py-2 px-3 text-right text-slate-600">{item.quantity}</td>
                      <td className="py-2 px-3 text-right text-slate-600">
                        �{(item.unitPrice || item.rate || 0).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-800">
                        �{(item.total || (item.quantity * (item.unitPrice || item.rate || 0))).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-600">Settled to Date:</span>
                <span className="font-bold text-emerald-700 ml-1.5">
                  �{(selectedInvoice.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-600">Outstanding:</span>
                <span className="font-bold text-rose-600 ml-1.5">
                  �{(selectedInvoice.balance !== undefined
                    ? selectedInvoice.balance
                    : Math.max(0, (selectedInvoice.grandTotal || 0) - (selectedInvoice.paidAmount || 0))
                  ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsInvoicePreviewModalOpen(false)}
                className="h-9 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              {(selectedInvoice.balance !== undefined
                ? selectedInvoice.balance
                : Math.max(0, (selectedInvoice.grandTotal || 0) - (selectedInvoice.paidAmount || 0))) > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setIsInvoicePreviewModalOpen(false);
                    setPaymentAmount(
                      selectedInvoice.balance !== undefined
                        ? selectedInvoice.balance
                        : Math.max(0, (selectedInvoice.grandTotal || 0) - (selectedInvoice.paidAmount || 0))
                    );
                    setPaymentDate(todayStr);
                    setIsRecordPaymentModalOpen(true);
                  }}
                  className="h-9 px-4 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold cursor-pointer"
                >
                  Collect Now
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: CONTACT CUSTOMER POPUP                                           */}
      {/* ========================================================================= */}
      {isContactModalOpen && selectedCustomer && (
        <Modal
          isOpen={isContactModalOpen}
          onClose={() => setIsContactModalOpen(false)}
          title={`Contact Customer: ${selectedCustomer.name}`}
          subtitle={`Direct communication channels`}
          maxWidth="sm"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setIsContactModalOpen(false)}
        >
          <div className="space-y-3 p-2 text-xs">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#33077C]" />
                <span className="font-bold text-slate-800">{selectedCustomer.phone}</span>
              </div>
              <a
                href={`tel:${selectedCustomer.phone}`}
                className="px-3 py-1 rounded-lg bg-[#33077C] text-white font-bold text-[11px]"
              >
                Call
              </a>
            </div>

            {selectedCustomer.email && (
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#33077C]" />
                  <span className="font-medium text-slate-800">{selectedCustomer.email}</span>
                </div>
                <a
                  href={`mailto:${selectedCustomer.email}`}
                  className="px-3 py-1 rounded-lg bg-purple-100 text-[#33077C] font-bold text-[11px]"
                >
                  Email
                </a>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsContactModalOpen(false)}
                className="h-9 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: ASSIGN CUSTOMER SALES REPRESENTATIVE                             */}
      {/* ========================================================================= */}
      {isAssignCustomerModalOpen && (
        <Modal
          isOpen={isAssignCustomerModalOpen}
          onClose={() => setIsAssignCustomerModalOpen(false)}
          title="Assign Sales Representative to Customer"
          subtitle="Representative is assigned to the customer account and automatically applies to all invoices"
          maxWidth="md"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setIsAssignCustomerModalOpen(false)}
        >
          <form noValidate onSubmit={handleSubmitAssignCustomer} className="space-y-4 p-2 text-xs pt-1">
            <div className="relative">
              <div className="relative w-full h-11 bg-white border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15 rounded-xl transition-all shadow-2xs flex items-center">
                <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                  Customer <span className="text-rose-500">*</span>
                </span>
                <select
                  value={assignCustomerId}
                  onChange={(e) => setAssignCustomerId(e.target.value)}
                  className="w-full h-full px-4 bg-transparent font-medium text-slate-900 outline-none cursor-pointer"
                  required
                >
                  <option value="">Select customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.customerCode || c.id}) {c.company ? `- ${c.company}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="relative">
              <div className="relative w-full h-11 bg-white border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15 rounded-xl transition-all shadow-2xs flex items-center">
                <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                  Sales Representative <span className="text-rose-500">*</span>
                </span>
                <select
                  value={assignRepId}
                  onChange={(e) => setAssignRepId(e.target.value)}
                  className="w-full h-full px-4 bg-transparent font-medium text-slate-900 outline-none cursor-pointer"
                  required
                >
                  <option value="">Select sales representative...</option>
                  {liveReps.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.designation ? `(${r.designation})` : ''} - {r.mobile}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="relative">
              <div className="relative w-full p-2.5 pt-3.5 bg-white rounded-xl border border-slate-300">
                <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                  Assignment Type
                </span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="radio"
                      name="assignType"
                      checked={assignType === 'Primary'}
                      onChange={() => setAssignType('Primary')}
                      className="text-[#33077C] focus:ring-[#33077C]"
                    />
                    <span>Primary Rep</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="radio"
                      name="assignType"
                      checked={assignType === 'Temporary'}
                      onChange={() => setAssignType('Temporary')}
                      className="text-[#33077C] focus:ring-[#33077C]"
                    />
                    <span>Temporary Rep</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="relative w-full h-11 bg-white border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15 rounded-xl transition-all shadow-2xs flex items-center">
                <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                  Effective From
                </span>
                <input
                  type="date"
                  value={assignEffectiveFrom}
                  onChange={(e) => setAssignEffectiveFrom(e.target.value)}
                  className="w-full h-full px-4 bg-transparent text-xs font-medium text-slate-900 outline-none cursor-pointer"
                />
              </div>
            </div>

            <div className="relative">
              <div className="relative w-full bg-white border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15 rounded-xl transition-all shadow-2xs">
                <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                  Notes
                </span>
                <textarea
                  rows={2}
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="Enter assignment notes or transition instructions..."
                  className="w-full p-3 pt-3.5 bg-transparent text-xs text-slate-900 outline-none resize-none"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAssignCustomerModalOpen(false)}
                className="h-9 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-9 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-[#33077C]/20 cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>{isSubmitting ? 'Assigning...' : 'Assign'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
export default CollectionsView;

