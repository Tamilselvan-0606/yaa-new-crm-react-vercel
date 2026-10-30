import { useDebounce } from 'use-debounce';
import { CommonTableHead } from '../../../components/common/CommonTableHead';
import { CustomerSearchableSelect } from '../../../components/common/paginated-select';
import { SalesRepSearchableSelect } from './SalesRepSearchableSelect';
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
  FileSpreadsheet,
  Printer,
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
import { printTableReport } from '../../../utils/printUtils';
import { toast } from 'sonner';
import { SaleActionDropdown } from '../utils';
import { store } from '../../../store/store';
import { baseApi } from '../../../api/baseApi';
import { calculateCustomerOutstanding } from '../../../utils/outstandingBalance';
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
import { salesRepresentativeApi, ApiSalesRepresentative } from '../../../api/commerce/salesRepresentativeApi';
import { commerceInvoiceApi, mapApiInvoiceToSaleTransaction } from '../../../api/commerce/invoiceApi';
import { customerApi, mapApiCustomerToSalesCustomer } from '../../../api/commerce/customerApi';
import { FormLabel, FORM_INPUT_CLS, FORM_SELECT_CLS, FORM_TEXTAREA_CLS, handleNonNegativeKeyDown } from '../utils/formUtils';

import { formatDate } from '../utils/dateUtils';
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
    salesReturns,
    paymentIns,
    collectionFollowUps,
    promisesToPay,
    recordCollectionPayment,
    assignCustomerSalesRep,
    addCollectionFollowUp,
    savePromiseToPay,
    getCollectionDashboardMetrics,
    setSalesList,
    setCustomersList,
  } = useSalesManagementStore();

  // Load Customers list from API once if not yet populated
  const hasLoadedCustomersRef = useRef(false);
  useEffect(() => {
    if (hasLoadedCustomersRef.current) return;
    hasLoadedCustomersRef.current = true;
    customerApi
      .getCustomers({ pagination_required: false, page_size: 200 })
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) {
          setCustomersList(res.data.map(mapApiCustomerToSalesCustomer));
        }
      })
      .catch((e) => console.warn('Customer load error in Collections:', e));
  }, [setCustomersList]);

  // Live sales representatives from API
  const [liveReps, setLiveReps] = React.useState<ApiSalesRepresentative[]>([]);
  React.useEffect(() => {
    salesRepresentativeApi.getList({ limit: 200 }).then((res) => {
      if (res.success) setLiveReps(res.data ?? []);
    }).catch(() => {});
  }, []);

  // Current system date reference
  const todayStr = new Date().toISOString().split('T')[0];

  // URL search query sync
  const initialSearch = searchParams.get('search') || '';
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [appliedSearch, setAppliedSearch] = useState(initialSearch);
  const [debouncedSearch] = useDebounce(searchTerm, 400);

  // Auto-apply debounced search (min 2 chars or cleared to reset)
  useEffect(() => {
    const trimmed = debouncedSearch.trim();
    if (trimmed === "" || trimmed.length >= 2) {
      setAppliedSearch(trimmed);
      setCurrentPage(1);
    }
  }, [debouncedSearch]);

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

  // Filters (Pending buffered vs Applied for API calls)
  const [pendingRepFilter, setPendingRepFilter] = useState<string>('ALL');
  const [selectedRepFilter, setSelectedRepFilter] = useState<string>('ALL');
  const [pendingCustomerFilter, setPendingCustomerFilter] = useState<string>('ALL');
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState<string>('ALL');
  const [pendingDueDateFilter, setPendingDueDateFilter] = useState<string>('ALL');
  const [dueDateFilter, setDueDateFilter] = useState<string>('ALL');
  const [pendingStatusFilter, setPendingStatusFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [pendingPaymentStatusFilter, setPendingPaymentStatusFilter] = useState<string>('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

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

  // Timeline UI Interactive Filter States
  const [timelineTab, setTimelineTab] = useState<'all' | 'payments' | 'invoices' | 'follow-ups' | 'promises'>('all');
  const [timelineInvoiceTab, setTimelineInvoiceTab] = useState<'all' | 'open' | 'settled' | 'cancelled'>('all');
  const [timelineSearch, setTimelineSearch] = useState<string>('');

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

  const isFetchingInvoicesRef = useRef(false);

  const loadInvoices = React.useCallback(async () => {
    if (isFetchingInvoicesRef.current) return;
    isFetchingInvoicesRef.current = true;
    try {
      setIsInvoicesLoading(true);

      const [colRes, invRes, assignRes] = await Promise.allSettled([
        collectionApi.getCollectionInvoices({
          search: appliedSearch || undefined,
          salesRepresentativeId: selectedRepFilter !== 'ALL' ? selectedRepFilter : undefined,
          customerId: selectedCustomerFilter !== 'ALL' ? selectedCustomerFilter : undefined,
          dueDateFilter: dueDateFilter !== 'ALL' ? dueDateFilter : undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          paymentStatus: paymentStatusFilter !== 'ALL' ? paymentStatusFilter : undefined,
          limit: 200,
        }),
        commerceInvoiceApi.getInvoices({
          pagination_required: false,
          search: appliedSearch || undefined,
          customerId: selectedCustomerFilter !== 'ALL' ? selectedCustomerFilter : undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          paymentStatus: paymentStatusFilter !== 'ALL' ? paymentStatusFilter : undefined,
          page_size: 200,
        }),
        collectionApi.getCustomerAssignments({ limit: 200 }),
      ]);

      if (assignRes.status === 'fulfilled' && assignRes.value?.success && Array.isArray(assignRes.value.data)) {
        setApiAssignments(assignRes.value.data);
      }

      let colInvoices: ApiCollectionInvoiceItem[] = [];
      if (colRes.status === 'fulfilled' && colRes.value?.success) {
        colInvoices = Array.isArray(colRes.value.data) ? colRes.value.data : [];
        if (colRes.value.tabCounts) {
          setTabCounts(colRes.value.tabCounts);
        }
      }

      if (invRes.status === 'fulfilled' && invRes.value?.success && Array.isArray(invRes.value.data)) {
        const mappedSales = invRes.value.data.map(mapApiInvoiceToSaleTransaction);
        setSalesList(mappedSales);
      }

      setApiInvoices(colInvoices);
      setTotalInvoices(colInvoices.length);
    } catch (err) {
      console.error('Failed to load collection invoices:', err);
      setApiInvoices([]);
    } finally {
      setIsInvoicesLoading(false);
      isFetchingInvoicesRef.current = false;
    }
  }, [
    appliedSearch,
    selectedRepFilter,
    selectedCustomerFilter,
    dueDateFilter,
    statusFilter,
    paymentStatusFilter,
    setSalesList,
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

  // Listen for sidebar click navigation events to immediately re-fetch collection data
  useEffect(() => {
    const handleSidebarNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<{ path: string; id: string }>;
      if (
        customEvent.detail?.path === '/sale-management/sales/collections' ||
        customEvent.detail?.id === 'collections'
      ) {
        loadMetrics();
        loadInvoices();
        if (subView === 'customer-assignments') loadAssignments();
        if (subView === 'follow-ups') loadFollowUps();
        if (subView === 'collection-history') loadHistory();
      }
    };
    window.addEventListener('crm:sidebar-navigate', handleSidebarNavigate);
    return () => {
      window.removeEventListener('crm:sidebar-navigate', handleSidebarNavigate);
    };
  }, [loadMetrics, loadInvoices, loadAssignments, loadFollowUps, loadHistory, subView]);

  // Derived Collection Items from API Invoices and Sales Invoices
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
    isCancelled?: boolean;
  }

  const collectionItems = useMemo<CollectionItem[]>(() => {
    const itemsMap = new Map<string, CollectionItem>();

    // 1. Process apiInvoices (authoritative for collection follow-ups & assignments)
    if (Array.isArray(apiInvoices) && apiInvoices.length > 0) {
      apiInvoices.forEach((inv) => {
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

        const matchedCustomer = customers.find((c) => c.id === inv.customerId || c.name === inv.customerName) || null;
        const matchedAssignment = apiAssignments.find((ca) => ca.id === inv.customerId || ca.customerName === inv.customerName) || null;
        const matchedSale = sales.find((s) => s.id === inv.id || s.invoiceNo === inv.invoiceNo);
        const resolvedInvRepId =
          inv.salesRepresentativeId ||
          matchedAssignment?.salesRepresentative?.id ||
          matchedCustomer?.salesRepresentativeId ||
          '';
        const rep = resolvedInvRepId ? (liveReps.find((r) => r.id === resolvedInvRepId) || null) : null;
        const rawInvRepName =
          inv.salesRepresentativeName ||
          matchedAssignment?.salesRepresentative?.name ||
          matchedCustomer?.salesRepresentativeName ||
          rep?.name ||
          '';
        const resolvedInvRepName =
          rawInvRepName && rawInvRepName.trim() !== '' && rawInvRepName.trim().toLowerCase() !== 'unassigned'
            ? rawInvRepName
            : 'Unassigned';

        const isCancelled =
          (inv as any).status === 'Cancelled' ||
          (inv.paymentStatus as string) === 'Cancelled' ||
          matchedSale?.saleStatus === 'Cancelled' ||
          (matchedSale as any)?.status === 'Cancelled';

        const key = (inv.invoiceNo || inv.id || '').trim().toUpperCase();
        if (!key) return;

        itemsMap.set(key, {
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
            saleStatus: isCancelled ? 'Cancelled' : 'Confirmed',
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
          customerName: inv.customerName || matchedCustomer?.name || 'Direct Customer',
          customerPhone: inv.customerPhone || matchedCustomer?.phone || 'N/A',
          customerEmail: inv.customerEmail || matchedCustomer?.email || '',
          salesRep: rep,
          salesRepName: resolvedInvRepName,
          invoiceTotal,
          paidAmount,
          outstandingAmount,
          status,
          paymentStatus: pStatus,
          hasPendingPromise: !!inv.promiseToPay,
          pendingPromise: inv.promiseToPay as any,
          lastPaymentDate: undefined,
          isCancelled,
        });
      });
    }

    // 2. Augment with confirmed sales invoices from Zustand store across all customers
    if (Array.isArray(sales) && sales.length > 0) {
      sales.forEach((sale) => {
        const key = (sale.invoiceNo || sale.id || '').trim().toUpperCase();
        if (!key) return;

        const isCancelled = sale.saleStatus === 'Cancelled' || (sale as any).status === 'Cancelled';

        if (itemsMap.has(key)) {
          const existing = itemsMap.get(key)!;
          if (!existing.invoice || Object.keys(existing.invoice).length <= 2) {
            existing.invoice = sale;
          }
          if (isCancelled) {
            existing.isCancelled = true;
          }
          return;
        }

        const invoiceTotal = Number(sale.grandTotal || 0);
        const paidAmount = Number(sale.paidAmount || 0);
        const outstandingAmount =
          sale.balance !== undefined ? Number(sale.balance) : Math.max(0, invoiceTotal - paidAmount);

        const ptp = promisesToPay.find(
          (p) =>
            (p.invoiceId && (p.invoiceId === sale.id || p.invoiceNo === sale.invoiceNo)) &&
            ((p.status as string) === 'Pending' || (p.status as string) === 'Active')
        );

        let status: 'Overdue' | 'Due Today' | 'Upcoming' | 'Promise to Pay' | 'Paid' = 'Paid';
        if (outstandingAmount > 0) {
          if (ptp) {
            status = 'Promise to Pay';
          } else if (sale.dueDate && sale.dueDate < todayStr) {
            status = 'Overdue';
          } else if (sale.dueDate && sale.dueDate === todayStr) {
            status = 'Due Today';
          } else {
            status = 'Upcoming';
          }
        }

        let pStatus: 'Unpaid' | 'Partial' | 'Paid' = 'Unpaid';
        if (outstandingAmount <= 0 || sale.paymentStatus === 'Paid') {
          pStatus = 'Paid';
        } else if (paidAmount > 0 || sale.paymentStatus === 'Partial') {
          pStatus = 'Partial';
        }

        const matchedCustomer = customers.find((c) => c.id === sale.customerId || c.name === sale.customerName) || null;
        const matchedAssignment = apiAssignments.find((ca) => ca.id === sale.customerId || ca.customerName === sale.customerName) || null;
        const resolvedSaleRepId =
          sale.salesRepresentativeId ||
          matchedAssignment?.salesRepresentative?.id ||
          matchedCustomer?.salesRepresentativeId ||
          '';
        const rep = resolvedSaleRepId ? (liveReps.find((r) => r.id === resolvedSaleRepId) || null) : null;
        const rawSaleRepName =
          sale.salesRepresentativeName ||
          matchedAssignment?.salesRepresentative?.name ||
          matchedCustomer?.salesRepresentativeName ||
          rep?.name ||
          '';
        const resolvedSaleRepName =
          rawSaleRepName && rawSaleRepName.trim() !== '' && rawSaleRepName.trim().toLowerCase() !== 'unassigned'
            ? rawSaleRepName
            : 'Unassigned';

        itemsMap.set(key, {
          id: sale.id,
          invoice: sale,
          invoiceNumber: sale.invoiceNo,
          invoiceDate: sale.saleDate,
          dueDate: sale.dueDate || sale.saleDate,
          customer: matchedCustomer || ({
            id: sale.customerId,
            name: sale.customerName,
            phone: sale.customerPhone,
            email: sale.customerEmail,
            salesRepresentativeId: sale.salesRepresentativeId,
          } as any),
          customerId: sale.customerId,
          customerName: sale.customerName || matchedCustomer?.name || 'Direct Customer',
          customerPhone: sale.customerPhone || matchedCustomer?.phone || 'N/A',
          customerEmail: sale.customerEmail || matchedCustomer?.email || '',
          salesRep: rep,
          salesRepName: resolvedSaleRepName,
          invoiceTotal,
          paidAmount,
          outstandingAmount,
          status,
          paymentStatus: pStatus,
          hasPendingPromise: !!ptp,
          pendingPromise: ptp as any,
          lastPaymentDate: undefined,
          isCancelled,
        });
      });
    }

    return Array.from(itemsMap.values());
  }, [apiInvoices, apiAssignments, sales, customers, liveReps, promisesToPay, todayStr]);

  // Client-side filtering by Tab, Rep, Customer, Due Date, Status, Payment Status, Search
  const filteredItems = useMemo<CollectionItem[]>(() => {
    return collectionItems.filter((item) => {
      // Exclude cancelled invoices from active collection dues
      if (item.isCancelled) {
        return false;
      }

      // 1. Tab filter
      if (activeTab === 'all') {
        if (item.outstandingAmount <= 0) return false;
      } else if (activeTab === 'due-today') {
        if (item.outstandingAmount <= 0) return false;
        if (item.dueDate !== todayStr) return false;
      } else if (activeTab === 'overdue') {
        if (item.outstandingAmount <= 0) return false;
        if (!item.dueDate || item.dueDate >= todayStr) return false;
      } else if (activeTab === 'promise-to-pay') {
        if (item.outstandingAmount <= 0) return false;
        if (!item.hasPendingPromise && item.status !== 'Promise to Pay') return false;
      } else if (activeTab === 'collected') {
        if (item.outstandingAmount > 0 && item.paymentStatus !== 'Paid') return false;
      }

      // 2. Representative filter
      if (selectedRepFilter !== 'ALL') {
        const repId = item.salesRep?.id || item.invoice?.salesRepresentativeId;
        if (repId !== selectedRepFilter) return false;
      }

      // 3. Customer filter
      if (selectedCustomerFilter !== 'ALL') {
        if (item.customerId !== selectedCustomerFilter) return false;
      }

      // 4. Due date filter
      if (dueDateFilter !== 'ALL') {
        if (dueDateFilter === 'OVERDUE') {
          if (!item.dueDate || item.dueDate >= todayStr || item.outstandingAmount <= 0) return false;
        } else if (dueDateFilter === 'TODAY') {
          if (item.dueDate !== todayStr) return false;
        } else if (dueDateFilter === 'THIS_MONTH') {
          const now = new Date();
          const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
          if (!item.dueDate || item.dueDate < monthStart || item.dueDate > monthEnd) return false;
        }
      }

      // 5. Status filter
      if (statusFilter !== 'ALL') {
        if (item.status !== statusFilter) return false;
      }

      // 6. Payment status filter
      if (paymentStatusFilter !== 'ALL') {
        if (item.paymentStatus !== paymentStatusFilter) return false;
      }

      // 7. Search filter
      if (appliedSearch) {
        const query = appliedSearch.toLowerCase();
        const matchesNo = item.invoiceNumber?.toLowerCase().includes(query);
        const matchesCust = item.customerName?.toLowerCase().includes(query);
        const matchesPhone = item.customerPhone?.toLowerCase().includes(query);
        const matchesEmail = item.customerEmail?.toLowerCase().includes(query);
        if (!matchesNo && !matchesCust && !matchesPhone && !matchesEmail) return false;
      }

      return true;
    });
  }, [
    collectionItems,
    activeTab,
    selectedRepFilter,
    selectedCustomerFilter,
    dueDateFilter,
    statusFilter,
    paymentStatusFilter,
    appliedSearch,
    todayStr,
  ]);

  // Aggregated metrics across all eligible receivables for dashboard consistency
  const {
    computedTotalOutstanding,
    computedOverdueAmount,
    computedOverdueCount,
    computedDueTodayAmount,
    computedDueTodayCount,
  } = useMemo(() => {
    let totOut = 0;
    let overAmt = 0;
    let overCnt = 0;
    let todayAmt = 0;
    let todayCnt = 0;

    collectionItems.forEach((item) => {
      if (item.isCancelled) return;
      if (item.outstandingAmount > 0) {
        totOut += item.outstandingAmount;
        if (item.dueDate && item.dueDate < todayStr) {
          overAmt += item.outstandingAmount;
          overCnt++;
        }
        if (item.dueDate === todayStr) {
          todayAmt += item.outstandingAmount;
          todayCnt++;
        }
      }
    });

    return {
      computedTotalOutstanding: totOut,
      computedOverdueAmount: overAmt,
      computedOverdueCount: overCnt,
      computedDueTodayAmount: todayAmt,
      computedDueTodayCount: todayCnt,
    };
  }, [collectionItems, todayStr]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Sub-view 2: Customer Assignments Memo (Merged with registered Customers)
  const customerAssignmentsList = useMemo(() => {
    const map = new Map<string, any>();

    if (apiAssignments.length > 0) {
      apiAssignments.forEach((ca) => {
        const rep = liveReps.find((r) => r.id === ca.salesRepresentative?.id);
        const matchedCust = customers.find((c) => c.id === ca.id);
        const custForCalc = matchedCust || {
          id: ca.id,
          name: ca.customerName,
          customerCode: ca.customerCode,
          openingBalance: Number((ca as any).openingBalance || 0),
          outstandingAmount: Number(ca.totalOutstanding || 0),
        };
        const metrics = calculateCustomerOutstanding(
          custForCalc as any,
          (sales || []) as any,
          (salesReturns || []) as any,
          (paymentIns || []) as any
        );
        map.set(ca.id, {
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
          outstanding: metrics.outstandingAmount,
          rep,
          repName: ca.salesRepresentative?.name || rep?.name || 'Unassigned',
          repType: ca.salesRepresentative?.type || 'Primary',
          assignedDate: ca.assignedDate || '—',
          status: ca.status || 'Active',
        });
      });
    }

    if (customers.length > 0) {
      customers.forEach((cust) => {
        if (!map.has(cust.id)) {
          const rep = liveReps.find((r) => r.id === cust.salesRepresentativeId);
          const metrics = calculateCustomerOutstanding(
            cust as any,
            (sales || []) as any,
            (salesReturns || []) as any,
            (paymentIns || []) as any
          );
          map.set(cust.id, {
            customer: cust,
            outstanding: metrics.outstandingAmount,
            rep,
            repName: cust.salesRepresentativeName || rep?.name || 'Unassigned',
            repType: cust.salesRepresentativeType || 'Primary',
            assignedDate: (cust as any).assignedDate || '—',
            status: cust.status || 'Active',
          });
        }
      });
    }

    return Array.from(map.values());
  }, [apiAssignments, customers, liveReps, sales, salesReturns, paymentIns]);

  const filteredCustomerAssignments = customerAssignmentsList;
  const paginatedCustomerAssignments = useMemo(() => {
    if (customerAssignmentsList.length > pageSize) {
      const start = (currentPage - 1) * pageSize;
      return customerAssignmentsList.slice(start, start + pageSize);
    }
    return customerAssignmentsList;
  }, [customerAssignmentsList, currentPage, pageSize]);

  // Sub-view 3: Follow-ups Memo
  const filteredFollowUps = useMemo(() => {
    if (apiFollowUps.length > 0) {
      return apiFollowUps;
    }
    return [];
  }, [apiFollowUps]);

  const paginatedFollowUps = useMemo(() => {
    if (filteredFollowUps.length > pageSize) {
      const start = (currentPage - 1) * pageSize;
      return filteredFollowUps.slice(start, start + pageSize);
    }
    return filteredFollowUps;
  }, [filteredFollowUps, currentPage, pageSize]);

  // Sub-view 4: Collection History Memo
  const filteredCollectionHistory = useMemo(() => {
    if (apiHistory.length > 0) {
      return apiHistory;
    }
    return [];
  }, [apiHistory]);

  const paginatedHistory = useMemo(() => {
    if (filteredCollectionHistory.length > pageSize) {
      const start = (currentPage - 1) * pageSize;
      return filteredCollectionHistory.slice(start, start + pageSize);
    }
    return filteredCollectionHistory;
  }, [filteredCollectionHistory, currentPage, pageSize]);

  // Apply buffered search & dropdown filters
  const handleApplyFilters = () => {
    const trimmed = searchTerm.trim();
    const isSame =
      appliedSearch === trimmed &&
      selectedRepFilter === pendingRepFilter &&
      selectedCustomerFilter === pendingCustomerFilter &&
      dueDateFilter === pendingDueDateFilter &&
      statusFilter === pendingStatusFilter &&
      paymentStatusFilter === pendingPaymentStatusFilter &&
      currentPage === 1;

    setAppliedSearch(trimmed);
    setSelectedRepFilter(pendingRepFilter);
    setSelectedCustomerFilter(pendingCustomerFilter);
    setDueDateFilter(pendingDueDateFilter);
    setStatusFilter(pendingStatusFilter);
    setPaymentStatusFilter(pendingPaymentStatusFilter);
    setCurrentPage(1);

    if (isSame) {
      loadMetrics();
      if (subView === 'dashboard') loadInvoices();
      else if (subView === 'customer-assignments') loadAssignments();
      else if (subView === 'follow-ups') loadFollowUps();
      else if (subView === 'collection-history') loadHistory();
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    const isSame =
      searchTerm === '' &&
      appliedSearch === '' &&
      pendingRepFilter === 'ALL' &&
      selectedRepFilter === 'ALL' &&
      pendingCustomerFilter === 'ALL' &&
      selectedCustomerFilter === 'ALL' &&
      pendingDueDateFilter === 'ALL' &&
      dueDateFilter === 'ALL' &&
      pendingStatusFilter === 'ALL' &&
      statusFilter === 'ALL' &&
      pendingPaymentStatusFilter === 'ALL' &&
      paymentStatusFilter === 'ALL' &&
      currentPage === 1;

    setSearchTerm('');
    setAppliedSearch('');
    setPendingRepFilter('ALL');
    setSelectedRepFilter('ALL');
    setPendingCustomerFilter('ALL');
    setSelectedCustomerFilter('ALL');
    setPendingDueDateFilter('ALL');
    setDueDateFilter('ALL');
    setPendingStatusFilter('ALL');
    setStatusFilter('ALL');
    setPendingPaymentStatusFilter('ALL');
    setPaymentStatusFilter('ALL');
    setActiveTab('all');
    setCurrentPage(1);
    setSearchParams({});
    toast.info('Filters have been reset');

    if (isSame) {
      loadMetrics();
      if (subView === 'dashboard') loadInvoices();
      else if (subView === 'customer-assignments') loadAssignments();
      else if (subView === 'follow-ups') loadFollowUps();
      else if (subView === 'collection-history') loadHistory();
    }
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
      store.dispatch(
        baseApi.util.invalidateTags([
          { type: 'Customer', id: 'LIST' },
          'SalesInvoice',
          'PaymentIn',
          'Payment',
          'SalesRepresentative',
          'Dashboard',
        ])
      );
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

    if (followUpHasPromise && (isNaN(Number(followUpPromiseAmount)) || Number(followUpPromiseAmount) <= 0)) {
      toast.error('Promised amount must be greater than zero when Promise to Pay is checked.');
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

      const targetCust = customers.find((c) => c.id === assignCustomerId);
      const targetRep = liveReps.find((r) => r.id === assignRepId);
      const resolvedRepName = targetRep?.name || 'Sales Rep';
      assignCustomerSalesRep(assignCustomerId, assignRepId, assignType, assignEffectiveFrom, assignNotes, resolvedRepName);
      setApiInvoices((prev) =>
        prev.map((inv) =>
          inv.customerId === assignCustomerId
            ? {
                ...inv,
                salesRepresentativeId: assignRepId,
                salesRepresentativeName: resolvedRepName,
              }
            : inv
        )
      );
      setApiAssignments((prev) => {
        const exists = prev.some((ca) => ca.id === assignCustomerId);
        if (exists) {
          return prev.map((ca) =>
            ca.id === assignCustomerId
              ? {
                  ...ca,
                  salesRepresentative: {
                    id: assignRepId,
                    name: resolvedRepName,
                    mobile: targetRep?.mobile,
                    type: assignType,
                  },
                  assignedDate: assignEffectiveFrom,
                }
              : ca
          );
        }
        return [
          ...prev,
          {
            id: assignCustomerId,
            customerName: targetCust?.name || 'Customer',
            customerCode: targetCust?.customerCode,
            company: targetCust?.company,
            phone: targetCust?.phone,
            totalOutstanding: Number(targetCust?.outstandingAmount || 0),
            salesRepresentative: {
              id: assignRepId,
              name: resolvedRepName,
              mobile: targetRep?.mobile,
              type: assignType,
            },
            assignedDate: assignEffectiveFrom,
            status: targetCust?.status || 'Active',
          },
        ];
      });
      toast.success(`Assigned ${resolvedRepName} to ${targetCust?.name || 'Customer'}`);
      setIsAssignCustomerModalOpen(false);
      store.dispatch(
        baseApi.util.invalidateTags([
          { type: 'Customer', id: 'LIST' },
          { type: 'Customer', id: assignCustomerId },
          'SalesRepresentative',
          'Dashboard',
        ])
      );
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
    setTimelineTab('all');
    setTimelineInvoiceTab('all');
    setTimelineSearch('');
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

  // Helper: Print Collections Report via universal printUtils
  const handlePrintTableReport = () => {
    if (filteredItems.length === 0) {
      toast.error('No collection records to print.');
      return;
    }

    const printRows = filteredItems.map((item) => ({
      customerName: item.customerName,
      customerPhone: item.customerPhone || '-',
      invoiceNumber: item.invoiceNumber,
      invoiceDate: item.invoiceDate,
      dueDate: item.dueDate,
      invoiceTotal: Number(item.invoiceTotal || 0),
      paidAmount: Number(item.paidAmount || 0),
      outstandingAmount: Number(item.outstandingAmount || 0),
      salesRepName: item.salesRepName || 'Unassigned',
      status: item.status,
    }));

    printTableReport({
      title: 'COLLECTIONS & RECEIVABLES REPORT',
      subtitle: `Filter: ${activeTab} | Total Records: ${filteredItems.length}`,
      columns: [
        { header: 'Customer Name', key: 'customerName', align: 'left', width: '20%' },
        { header: 'Invoice No.', key: 'invoiceNumber', align: 'center', width: '14%' },
        { header: 'Inv Date', key: 'invoiceDate', align: 'center', width: '10%' },
        { header: 'Due Date', key: 'dueDate', align: 'center', width: '10%' },
        { header: 'Total (₹)', key: 'invoiceTotal', align: 'right', type: 'currency', width: '12%' },
        { header: 'Paid (₹)', key: 'paidAmount', align: 'right', type: 'currency', width: '12%' },
        { header: 'Balance (₹)', key: 'outstandingAmount', align: 'right', type: 'currency', width: '12%' },
        { header: 'Sales Rep', key: 'salesRepName', align: 'left', width: '10%' },
      ],
      data: printRows,
      summaryRow: {
        customerName: 'TOTAL',
        invoiceNumber: `${filteredItems.length} Invoices`,
        invoiceTotal: filteredItems.reduce((acc, i) => acc + (Number(i.invoiceTotal) || 0), 0),
        paidAmount: filteredItems.reduce((acc, i) => acc + (Number(i.paidAmount) || 0), 0),
        outstandingAmount: filteredItems.reduce((acc, i) => acc + (Number(i.outstandingAmount) || 0), 0),
      },
    });
  };

  // Helper: Format raw timestamps into human-readable friendly dates with relative indicators
  const formatTimelineTimestamp = (rawDate?: string): { formatted: string; relative: string } => {
    if (!rawDate) return { formatted: '—', relative: '' };
    try {
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return { formatted: rawDate, relative: '' };

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const eventDate = new Date(d);
      eventDate.setHours(0, 0, 0, 0);

      const diffDays = Math.round((today.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
      let relative = '';
      if (diffDays === 0) relative = 'Today';
      else if (diffDays === 1) relative = 'Yesterday';
      else if (diffDays === -1) relative = 'Tomorrow';
      else if (diffDays > 1 && diffDays < 30) relative = `${diffDays} days ago`;
      else if (diffDays >= 30) relative = `${Math.floor(diffDays / 30)} mo ago`;

      const day = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const hasTime = rawDate.includes('T') && !rawDate.endsWith('T00:00:00.000Z') && !rawDate.endsWith('T00:00:00Z');
      const time = hasTime ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';

      return {
        formatted: time ? `${day}, ${time}` : day,
        relative,
      };
    } catch {
      return { formatted: rawDate, relative: '' };
    }
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

  const displayTotalOutstanding =
    dashboardMetrics?.totalOutstanding !== undefined && Number(dashboardMetrics.totalOutstanding) > 0
      ? Math.max(Number(dashboardMetrics.totalOutstanding), computedTotalOutstanding)
      : computedTotalOutstanding;

  const overdueData = dashboardMetrics?.overdue;
  const overdueAmt =
    typeof overdueData === 'object' && overdueData?.amount !== undefined
      ? Math.max(Number(overdueData.amount), computedOverdueAmount)
      : (dashboardMetrics?.overdueAmount !== undefined ? Math.max(Number(dashboardMetrics.overdueAmount), computedOverdueAmount) : computedOverdueAmount);
  const overdueCnt =
    typeof overdueData === 'object' && overdueData?.count !== undefined
      ? Math.max(Number(overdueData.count), computedOverdueCount)
      : (dashboardMetrics?.overdueCount !== undefined ? Math.max(Number(dashboardMetrics.overdueCount), computedOverdueCount) : computedOverdueCount);

  const dueTodayData = dashboardMetrics?.dueToday;
  const dueTodayAmt =
    typeof dueTodayData === 'object' && dueTodayData?.amount !== undefined
      ? Math.max(Number(dueTodayData.amount), computedDueTodayAmount)
      : (dashboardMetrics?.dueTodayAmount !== undefined ? Math.max(Number(dashboardMetrics.dueTodayAmount), computedDueTodayAmount) : computedDueTodayAmount);
  const dueTodayCnt =
    typeof dueTodayData === 'object' && dueTodayData?.count !== undefined
      ? Math.max(Number(dueTodayData.count), computedDueTodayCount)
      : (dashboardMetrics?.dueTodayCount !== undefined ? Math.max(Number(dashboardMetrics.dueTodayCount), computedDueTodayCount) : computedDueTodayCount);

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* 1. Page Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-[220px] flex-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
              <IndianRupee className="w-4.5 h-4.5" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Customer Collections & Dues
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Manage receivable invoices, follow-ups, payment promises, and collection workflows.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
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
            variant="secondary"
            size="md"
            className="flex-1 sm:flex-initial justify-center hover:border-purple-300"
            onClick={handlePrintTableReport}
            icon={<Printer className="w-4 h-4 text-slate-600" />}
          >
            Print Report
          </Button>

          <Button
            variant="primary"
            size="md"
            className="flex-1 sm:flex-initial justify-center"
            onClick={() => {
              // Open general record payment modal with first open invoice or blank
              const firstOpen = collectionItems.find((i) => i.outstandingAmount > 0);
              if (firstOpen) {
                handleOpenRecordPayment(firstOpen);
              } else {
                toast.info('No open receivable invoices found to collect');
              }
            }}
            icon={<Plus className="w-4 h-4 text-white" />}
          >
            Record Payment
          </Button>
        </div>
      </div>

      {/* 2. Collection Dashboard Top Summary Cards (5 Key Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Card 1: Total Outstanding */}
        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Outstanding
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#33077C] flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">
              {isMetricsLoading ? (
                <span className="inline-block w-24 h-6 bg-slate-100 animate-pulse rounded-md" />
              ) : (
                `₹${Number(displayTotalOutstanding ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
              )}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Across all open receivables
            </div>
          </div>
        </div>

        {/* Card 2: Overdue Amount */}
        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Overdue
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">
              {isMetricsLoading ? (
                <span className="inline-block w-24 h-6 bg-slate-100 animate-pulse rounded-md" />
              ) : (
                `₹${Number(overdueAmt ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
              )}
            </div>
            <div className="text-xs text-rose-600 font-medium mt-0.5">
              {Number(overdueCnt ?? 0)}{' '}
              invoices past due date
            </div>
          </div>
        </div>

        {/* Card 3: Due Today */}
        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Due Today
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">
              {isMetricsLoading ? (
                <span className="inline-block w-24 h-6 bg-slate-100 animate-pulse rounded-md" />
              ) : (
                `₹${Number(dueTodayAmt ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
              )}
            </div>
            <div className="text-xs text-amber-600 font-medium mt-0.5">
              {Number(dueTodayCnt ?? 0)}{' '}
              invoices maturing today
            </div>
          </div>
        </div>

        {/* Card 4: Follow-ups Today */}
        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Follow-ups Today
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CalendarClock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">
              {isMetricsLoading ? (
                <span className="inline-block w-12 h-6 bg-slate-100 animate-pulse rounded-md" />
              ) : (
                Number(
                  (typeof dashboardMetrics?.followUpsToday === 'object'
                    ? dashboardMetrics?.followUpsToday?.count
                    : dashboardMetrics?.followUpsTodayCount) ?? 0
                )
              )}
            </div>
            <div className="text-xs text-indigo-600 font-medium mt-0.5">
              Scheduled customer interactions
            </div>
          </div>
        </div>

        {/* Card 5: Collected This Month */}
        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Collected This Month
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">
              {isMetricsLoading ? (
                <span className="inline-block w-24 h-6 bg-slate-100 animate-pulse rounded-md" />
              ) : (
                `₹${Number(
                  (typeof dashboardMetrics?.collectedThisMonth === 'object'
                    ? dashboardMetrics?.collectedThisMonth?.amount
                    : dashboardMetrics?.collectedThisMonthAmount) ?? 0
                ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
              )}
            </div>
            <div className="text-xs text-emerald-600 font-medium mt-0.5">
              {Number(
                (typeof dashboardMetrics?.collectedThisMonth === 'object'
                  ? dashboardMetrics?.collectedThisMonth?.count
                  : dashboardMetrics?.collectedThisMonthCount) ?? tabCounts.collected ?? 0
              )}{' '}
              payments collected
            </div>
          </div>
        </div>
      </div>

      {/* 3. Sub-Module Navigation (4 Main Sections) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {[
            { id: 'dashboard', label: 'Collection Dashboard' },
            { id: 'customer-assignments', label: 'Customer Assignments' },
            { id: 'follow-ups', label: 'Follow-ups & Timeline' },
            { id: 'collection-history', label: 'Collection History' },
          ].map((tab) => {
            const isActive = subView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSubView(tab.id as CollectionsSubView);
                  setSearchParams({ tab: tab.id });
                }}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  isActive
                    ? 'bg-[#33077C] text-white shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}
              >
                {isActive && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {subView === 'customer-assignments' && (
          <Button
            variant="primary"
            size="md"
            onClick={() => handleOpenAssignCustomer(null)}
            icon={<UserPlus className="w-4 h-4" />}
          >
            Assign Sales Rep
          </Button>
        )}

        {subView === 'follow-ups' && (
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              const firstItem = collectionItems[0];
              if (firstItem) handleOpenFollowUp(firstItem);
            }}
            icon={<CalendarClock className="w-4 h-4" />}
          >
            Log Follow-up
          </Button>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SUB-VIEW 1: COLLECTION DASHBOARD (MY COLLECTIONS)             */}
      {/* ------------------------------------------------------------- */}
      {subView === 'dashboard' && (
        <div className="space-y-4">
          {/* 3. Collection Tabs (Clean without icons and counts) */}
          <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto gap-4">
            {[
              { id: 'all', label: 'All Dues' },
              { id: 'due-today', label: 'Due Today' },
              { id: 'overdue', label: 'Overdue' },
              { id: 'promise-to-pay', label: 'Promise to Pay' },
              { id: 'collected', label: 'Collected' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as CollectionTab);
                    setCurrentPage(1);
                  }}
                  className={`py-2 px-1 text-xs sm:text-[13px] font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? 'border-[#33077C] text-[#33077C] font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

      {/* 4. Search & Filter Bar (Aligned with Reference UI) */}
      <SearchBar
        placeholder="Search by customer, invoice no, phone..."
        value={searchTerm}
        onChange={(val) => {
          setSearchTerm(val);
        }}
        onSubmit={handleApplyFilters}
        onReset={handleResetFilters}
        filterSlot={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Sales Representative Filter */}
            <select
              value={pendingRepFilter}
              onChange={(e) => {
                setPendingRepFilter(e.target.value);
              }}
              className="h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-[#33077C]"
            >
              <option value="ALL">All Representatives</option>
              {liveReps.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.name}
                </option>
              ))}
            </select>

            {/* Due Date Filter */}
            <select
              value={pendingDueDateFilter}
              onChange={(e) => {
                setPendingDueDateFilter(e.target.value);
              }}
              className="h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-[#33077C]"
            >
              <option value="ALL">All Due Dates</option>
              <option value="OVERDUE">Overdue (Past)</option>
              <option value="TODAY">Due Today</option>
              <option value="THIS_MONTH">Due This Month</option>
            </select>

            {/* Status Filter */}
            <select
              value={pendingStatusFilter}
              onChange={(e) => {
                setPendingStatusFilter(e.target.value);
              }}
              className="h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-[#33077C]"
            >
              <option value="ALL">Status : All</option>
              <option value="Overdue">Overdue</option>
              <option value="Due Today">Due Today</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Promise to Pay">Promise to Pay</option>
              <option value="Paid">Paid</option>
            </select>

            {/* Payment Status */}
            <select
              value={pendingPaymentStatusFilter}
              onChange={(e) => {
                setPendingPaymentStatusFilter(e.target.value);
              }}
              className="h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-[#33077C]"
            >
              <option value="ALL">Payment : All</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Partial">Partially Paid</option>
              <option value="Paid">Fully Paid</option>
            </select>
          </div>
        }
        rightSlot={
          <div className="flex items-center gap-3 pr-1">
            {isInvoicesLoading && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#33077C]" />
                <span>Updating...</span>
              </div>
            )}
            <span className="text-xs font-semibold text-slate-500">
              Total Invoices :{' '}
              <span className="text-[#33077C] font-bold">{filteredItems.length}</span>
            </span>
          </div>
        }
      />

      {/* 5. Collection Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200 min-w-[950px]">
            <CommonTableHead
              columns={[
                { label: "CUSTOMER", align: "left", minWidth: "180px" },
                { label: "INVOICE NO", align: "left", minWidth: "140px" },
                { label: "INVOICE DATE", align: "left", minWidth: "140px" },
                { label: "DUE DATE", align: "left", minWidth: "140px" },
                { label: "INVOICE AMOUNT", align: "right", minWidth: "130px" },
                { label: "PAID AMOUNT", align: "right", minWidth: "130px" },
                { label: "OUTSTANDING", align: "right", minWidth: "130px" },
                { label: "SALES REP", align: "left", minWidth: "140px" },
                { label: "STATUS", align: "center", minWidth: "110px" },
                { label: "ACTIONS", align: "center", minWidth: "130px" },
              ]}
            />
            <tbody className="text-sm">
              {isInvoicesLoading ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    <Loader2 className="w-8 h-8 mx-auto mb-2 text-[#33077C] animate-spin stroke-[2]" />
                    <p className="font-semibold text-slate-700 text-sm">Loading collection invoices...</p>
                    <p className="text-xs text-slate-400 mt-1">Fetching live invoice directory from server</p>
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    <IndianRupee className="w-10 h-10 mx-auto text-slate-300 mb-2 opacity-50" />
                    <p className="font-semibold text-slate-700 text-sm">No collection records found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try adjusting your search criteria or resetting filters
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => {
                  const customerInitials = (item.customerName || 'CU')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
                  const resolvedCustomerCode =
                    item.customer?.customerCode ||
                    customers.find(
                      (c) =>
                        (item.customerId && c.id === item.customerId) ||
                        (c.phone && item.customerPhone && c.phone === item.customerPhone) ||
                        (c.name && item.customerName && c.name.trim().toLowerCase() === item.customerName.trim().toLowerCase())
                    )?.customerCode ||
                    (item.customerId && !item.customerId.startsWith('cust_') && item.customerId.length > 5
                      ? item.customerId.slice(0, 8).toUpperCase()
                      : '');

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors border-b border-slate-200 font-sans"
                    >
                      {/* Customer */}
                      <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#33077C] text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-xs shrink-0 select-none">
                            {customerInitials}
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleOpenTimeline(item)}
                                className="font-bold text-slate-900 text-xs sm:text-[14px] text-left hover:text-[#33077C] hover:underline cursor-pointer"
                              >
                                {item.customerName}
                              </button>
                              {resolvedCustomerCode && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-50 text-[#33077C] border border-purple-200/80">
                                  {resolvedCustomerCode}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {item.customerPhone}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Invoice No */}
                      <td className="py-4 px-4 border border-slate-200 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenInvoicePreview(item)}
                          className="font-mono font-bold text-[#33077C] hover:underline cursor-pointer text-xs"
                        >
                          {item.invoiceNumber}
                        </button>
                      </td>

                      {/* Invoice Date */}
                      <td className="py-4 px-4 border border-slate-200 text-slate-600 whitespace-nowrap text-xs">
                        {formatDate(item.invoiceDate)}
                      </td>

                      {/* Due Date */}
                      <td className="py-4 px-4 border border-slate-200 whitespace-nowrap text-xs">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-semibold ${
                              item.outstandingAmount > 0 && item.dueDate < todayStr
                                ? 'text-rose-600'
                                : item.outstandingAmount > 0 && item.dueDate === todayStr
                                ? 'text-amber-600'
                                : 'text-slate-700'
                            }`}
                          >
                            {formatDate(item.dueDate)}
                          </span>
                          {item.outstandingAmount > 0 && item.dueDate === todayStr && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                              Today
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Invoice Amount */}
                      <td className="py-4 px-4 border border-slate-200 text-right whitespace-nowrap font-bold text-slate-900 text-xs sm:text-[13px]">
                        ₹{item.invoiceTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Paid Amount */}
                      <td className="py-4 px-4 border border-slate-200 text-right whitespace-nowrap">
                        <div className="font-bold text-emerald-600 text-xs sm:text-[13px]">
                          ₹{item.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </td>

                      {/* Outstanding Amount */}
                      <td className="py-4 px-4 border border-slate-200 text-right whitespace-nowrap">
                        <span
                          className={`font-bold text-xs sm:text-[13px] ${
                            item.outstandingAmount > 0 ? 'text-rose-600' : 'text-slate-400'
                          }`}
                        >
                          ₹{item.outstandingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Sales Representative */}
                      <td className="py-4 px-4 border border-slate-200 whitespace-nowrap text-xs">
                        {item.salesRepName && item.salesRepName !== 'Unassigned' ? (
                          <div>
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 bg-purple-50/80 px-2.5 py-1 rounded-lg border border-purple-200/50">
                              <UserCheck className="w-3.5 h-3.5 text-[#33077C]" />
                              {item.salesRepName}
                            </span>
                            {item.customer?.salesRepresentativeType && (
                              <div className="mt-0.5">
                                <span className="text-[10px] text-purple-700 font-medium">
                                  {item.customer.salesRepresentativeType} Rep
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenAssignCustomer(item.customer)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#33077C] hover:text-[#4309A2] bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200/80 transition-colors cursor-pointer"
                            title="Assign Sales Rep to this Customer"
                          >
                            <UserPlus className="w-3 h-3 text-[#33077C]" />
                            <span>+ Assign Rep</span>
                          </button>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap">
                        {renderStatusBadge(item.status)}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {item.outstandingAmount > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleOpenRecordPayment(item)}
                              className="h-8 px-3 rounded-lg bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Collect</span>
                            </button>
                          ) : (
                            <span className="text-xs text-emerald-600 font-bold px-2.5 py-1 bg-emerald-50 rounded-md border border-emerald-200">
                              Settled
                            </span>
                          )}

                        {/* Action menu dropdown */}
                        <SaleActionDropdown
                          items={[
                            {
                              label: 'View Invoice',
                              onClick: () => handleOpenInvoicePreview(item),
                              variant: 'view',
                            },
                            {
                              label: 'Contact Customer',
                              onClick: () => handleOpenContact(item),
                              icon: <Phone style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />,
                              badgeBg: 'bg-emerald-600',
                            },
                            {
                              label: 'Add Follow-up',
                              onClick: () => handleOpenFollowUp(item),
                              icon: <Clock style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />,
                              badgeBg: 'bg-amber-500',
                            },
                            {
                              label: 'Assign Sales Rep',
                              hidden: Boolean(
                                item.salesRep?.id ||
                                (item.salesRepName &&
                                  item.salesRepName.trim() !== '' &&
                                  item.salesRepName.trim().toLowerCase() !== 'unassigned') ||
                                (item.customer?.salesRepresentativeId &&
                                  String(item.customer.salesRepresentativeId).trim() !== '' &&
                                  String(item.customer.salesRepresentativeId).trim().toLowerCase() !== 'unassigned') ||
                                (item.customer?.salesRepresentativeName &&
                                  String(item.customer.salesRepresentativeName).trim() !== '' &&
                                  String(item.customer.salesRepresentativeName).trim().toLowerCase() !== 'unassigned')
                              ),
                              onClick: () => handleOpenAssignCustomer(item.customer),
                              variant: 'assign',
                            },
                            item.outstandingAmount > 0 && {
                              label: 'Record Promise to Pay',
                              onClick: () => handleOpenPromiseToPay(item),
                              icon: <Calendar style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />,
                              badgeBg: 'bg-sky-500',
                            },
                            item.outstandingAmount > 0 && {
                              label: 'Record Payment',
                              onClick: () => handleOpenRecordPayment(item),
                              variant: 'payment',
                            },
                            {
                              label: 'Collection Timeline',
                              onClick: () => handleOpenTimeline(item),
                              icon: <TrendingUp style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />,
                              badgeBg: 'bg-purple-600',
                              dividerBefore: true,
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
      {filteredItems.length > 0 && (
        <Pagination
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          pageSizeOptions={[5, 10, 20, 50]}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          totalItems={filteredItems.length}
        />
      )}
    </div>
  )}

      {/* ------------------------------------------------------------- */}
      {/* SUB-VIEW 2: CUSTOMER ASSIGNMENTS PAGE                         */}
      {/* ------------------------------------------------------------- */}
      {subView === 'customer-assignments' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <SearchBar
            value={searchTerm}
            onChange={(val) => {
              setSearchTerm(val);
            }}
            onSubmit={handleApplyFilters}
            onReset={handleResetFilters}
            placeholder="Search customer, customer code, phone, rep..."
            filterSlot={
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={pendingRepFilter}
                  onChange={(e) => {
                    setPendingRepFilter(e.target.value);
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
                  value={pendingStatusFilter}
                  onChange={(e) => {
                    setPendingStatusFilter(e.target.value);
                  }}
                  className="h-9 px-3 text-xs bg-slate-50 dark:bg-slate-700 border border-slate-200 rounded-xl text-slate-800 font-medium"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            }
          />

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
                          {formatDate(item.assignedDate)}
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
          </div>
          {(totalAssignments > 0 || filteredCustomerAssignments.length > 0) && (
            <Pagination
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              pageSizeOptions={[5, 10, 20, 50]}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              totalItems={totalAssignments || filteredCustomerAssignments.length}
            />
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUB-VIEW 4: FOLLOW-UPS & TIMELINE REGISTER                    */}
      {/* ------------------------------------------------------------- */}
      {subView === 'follow-ups' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <SearchBar
            value={searchTerm}
            onChange={(val) => {
              setSearchTerm(val);
            }}
            onSubmit={handleApplyFilters}
            onReset={handleResetFilters}
            placeholder="Search customer, invoice, follow-up notes..."
            filterSlot={
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={pendingRepFilter}
                  onChange={(e) => {
                    setPendingRepFilter(e.target.value);
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
                  value={pendingStatusFilter}
                  onChange={(e) => {
                    setPendingStatusFilter(e.target.value);
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
              </div>
            }
          />

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
          </div>
          {(totalFollowUps > 0 || filteredFollowUps.length > 0) && (
            <Pagination
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              pageSizeOptions={[5, 10, 20, 50]}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              totalItems={totalFollowUps || filteredFollowUps.length}
            />
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUB-VIEW 5: COLLECTION HISTORY / SETTLEMENTS LEDGER           */}
      {/* ------------------------------------------------------------- */}
      {subView === 'collection-history' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <SearchBar
            value={searchTerm}
            onChange={(val) => {
              setSearchTerm(val);
            }}
            onSubmit={handleApplyFilters}
            onReset={handleResetFilters}
            placeholder="Search receipt no, customer, invoice no, ref..."
            filterSlot={
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={pendingRepFilter}
                  onChange={(e) => {
                    setPendingRepFilter(e.target.value);
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
              </div>
            }
          />

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
          </div>
          {(totalHistory > 0 || filteredCollectionHistory.length > 0) && (
            <Pagination
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              pageSizeOptions={[5, 10, 20, 50]}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              totalItems={totalHistory || filteredCollectionHistory.length}
            />
          )}
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
              <div>
                <FormLabel required>Payment Amount (₹)</FormLabel>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={paymentAmount}
                  onKeyDown={handleNonNegativeKeyDown}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className={`${FORM_INPUT_CLS} font-bold text-sm`}
                  required
                />
              </div>

              {/* Payment Date */}
              <div>
                <FormLabel required>Payment Date</FormLabel>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className={FORM_INPUT_CLS}
                  required
                />
              </div>

              {/* Payment Method */}
              <div>
                <FormLabel>Payment Method</FormLabel>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className={FORM_SELECT_CLS}
                >
                  <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / QR</option>
                  <option value="Card">Card (Credit / Debit / POS)</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Online Payment">Online Payment / Gateway</option>
                </select>
              </div>

              {/* Sales Representative */}
              <div>
                <FormLabel>Collecting Sales Representative</FormLabel>
                <select
                  value={paymentRepId}
                  onChange={(e) => setPaymentRepId(e.target.value)}
                  className={FORM_SELECT_CLS}
                >
                  <option value="">Select Representative (Optional)</option>
                  {liveReps.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.name} ({rep.mobile})
                    </option>
                  ))}
                </select>
              </div>

              {/* Reference / Transaction No */}
              <div className="sm:col-span-2">
                <FormLabel>Transaction / Cheque / UTR Reference</FormLabel>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. UTR12345678 or Cheque #88992"
                  className={`${FORM_INPUT_CLS} font-mono`}
                />
              </div>

              {/* Notes */}
              <div className="sm:col-span-2">
                <FormLabel>Notes / Remarks</FormLabel>
                <textarea
                  rows={2}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Additional payment notes..."
                  className={FORM_TEXTAREA_CLS}
                />
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
                <span className="text-[11px] text-slate-500 block">Due Date: {formatDate(selectedInvoice.dueDate, '08 Oct 2026')}</span>
              </div>
            </div>

            <form noValidate onSubmit={handleSubmitFollowUp} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Contact Method */}
                <div>
                  <FormLabel required>Contact Method</FormLabel>
                  <select
                    value={followUpContactMethod}
                    onChange={(e) => setFollowUpContactMethod(e.target.value as ContactMethod)}
                    className={FORM_SELECT_CLS}
                    required
                  >
                    <option value="Phone">Phone</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Email">Email</option>
                    <option value="In-Person Visit">In-Person Visit</option>
                  </select>
                </div>

                {/* Contact Status */}
                <div>
                  <FormLabel required>Contact Status</FormLabel>
                  <select
                    value={followUpOutcome}
                    onChange={(e) => {
                      const val = e.target.value as FollowUpOutcome;
                      setFollowUpOutcome(val);
                      if (val === 'Promise to Pay') {
                        setFollowUpHasPromise(true);
                      }
                    }}
                    className={FORM_SELECT_CLS}
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

                {/* Sales Representative */}
                <div>
                  <FormLabel>Sales Representative</FormLabel>
                  <select
                    value={followUpRepId}
                    onChange={(e) => setFollowUpRepId(e.target.value)}
                    className={FORM_SELECT_CLS}
                  >
                    <option value="">Select Representative</option>
                    {liveReps.map((rep) => (
                      <option key={rep.id} value={rep.id}>
                        {rep.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Follow-up Date */}
                <div>
                  <FormLabel required>Follow-up Date</FormLabel>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className={FORM_INPUT_CLS}
                    required
                  />
                </div>

                {/* Discussion */}
                <div className="sm:col-span-2">
                  <FormLabel required>Discussion</FormLabel>
                  <textarea
                    rows={2}
                    value={followUpNotes}
                    onChange={(e) => setFollowUpNotes(e.target.value)}
                    placeholder="Customer confirmed payment on 10 Oct..."
                    className={FORM_TEXTAREA_CLS}
                    required
                  />
                </div>

                {/* Promise to Pay Toggle */}
                <div>
                  <FormLabel>Promise to Pay</FormLabel>
                  <select
                    value={followUpHasPromise ? 'Yes' : 'No'}
                    onChange={(e) => setFollowUpHasPromise(e.target.value === 'Yes')}
                    className={FORM_SELECT_CLS}
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>

                {/* Next Follow-up */}
                <div>
                  <FormLabel>Next Follow-up</FormLabel>
                  <input
                    type="date"
                    value={nextFollowUpDate}
                    onChange={(e) => setNextFollowUpDate(e.target.value)}
                    className={FORM_INPUT_CLS}
                  />
                </div>

                {/* Conditional Promise Fields */}
                {followUpHasPromise && (
                  <>
                    <div>
                      <FormLabel required>Promise Date</FormLabel>
                      <input
                        type="date"
                        value={followUpPromiseDate}
                        onChange={(e) => setFollowUpPromiseDate(e.target.value)}
                        className={FORM_INPUT_CLS}
                        required={followUpHasPromise}
                      />
                    </div>
                    <div>
                      <FormLabel required>Expected Amount (₹)</FormLabel>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        value={followUpPromiseAmount}
                        onKeyDown={handleNonNegativeKeyDown}
                        onChange={(e) => setFollowUpPromiseAmount(parseFloat(e.target.value) || 0)}
                        className={`${FORM_INPUT_CLS} font-bold`}
                        required={followUpHasPromise}
                      />
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
            <div>
              <FormLabel required>Promised Amount (₹)</FormLabel>
              <input
                type="number"
                step="0.01"
                min="1"
                value={promisedAmount}
                onKeyDown={handleNonNegativeKeyDown}
                onChange={(e) => setPromisedAmount(parseFloat(e.target.value) || 0)}
                className={`${FORM_INPUT_CLS} font-bold text-sm`}
                required
              />
            </div>

            <div>
              <FormLabel required>Promised Payment Date</FormLabel>
              <input
                type="date"
                value={promiseDate}
                onChange={(e) => setPromiseDate(e.target.value)}
                className={FORM_INPUT_CLS}
                required
              />
            </div>

            <div>
              <FormLabel>Notes / Commitment Details</FormLabel>
              <textarea
                rows={2}
                value={promiseNotes}
                onChange={(e) => setPromiseNotes(e.target.value)}
                placeholder="e.g. Customer confirmed bank transfer by end of day"
                className={FORM_TEXTAREA_CLS}
              />
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
      {/* MODAL 4: CUSTOMER COLLECTION DETAIL & TIMELINE (IMPROVISED USER-FRIENDLY)   */}
      {/* ========================================================================= */}
      {isTimelineModalOpen && selectedCustomer && (
        <Modal
          isOpen={isTimelineModalOpen}
          onClose={() => setIsTimelineModalOpen(false)}
          title={`Collection Detail: ${selectedCustomer.name}`}
          subtitle={`${selectedCustomer.phone || 'No phone'} • ${selectedCustomer.company || 'Direct Customer'} • Ledger & Collection Timeline`}
          maxWidth="4xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={false}
          onBack={() => setIsTimelineModalOpen(false)}
        >
          {(() => {
            const custSales = sales.filter(
              (s) =>
                s.customerId === selectedCustomer.id ||
                s.customerName?.toLowerCase() === selectedCustomer.name?.toLowerCase()
            );

            // Separate active open, settled, and cancelled invoices
            const openSales = custSales.filter((s) => {
              const isCanc = (s.saleStatus as string) === 'Cancelled' || (s as any).status === 'Cancelled';
              const bal = s.balance !== undefined ? s.balance : Math.max(0, (s.grandTotal || 0) - (s.paidAmount || 0));
              return !isCanc && bal > 0;
            });

            const settledSales = custSales.filter((s) => {
              const isCanc = (s.saleStatus as string) === 'Cancelled' || (s as any).status === 'Cancelled';
              const bal = s.balance !== undefined ? s.balance : Math.max(0, (s.grandTotal || 0) - (s.paidAmount || 0));
              return !isCanc && bal <= 0;
            });

            const cancelledSales = custSales.filter((s) => {
              return (s.saleStatus as string) === 'Cancelled' || (s as any).status === 'Cancelled';
            });

            const totalOutstanding = openSales.reduce(
              (acc, s) =>
                acc + (s.balance !== undefined ? s.balance : Math.max(0, (s.grandTotal || 0) - (s.paidAmount || 0))),
              0
            );

            const overdueSales = openSales.filter((s) => s.dueDate && s.dueDate < todayStr);
            const overdueAmount = overdueSales.reduce(
              (acc, s) =>
                acc + (s.balance !== undefined ? s.balance : Math.max(0, (s.grandTotal || 0) - (s.paidAmount || 0))),
              0
            );

            const custPayments = paymentIns
              .filter((p) => p.customerId === selectedCustomer.id || (p as any).partyName?.toLowerCase() === selectedCustomer.name?.toLowerCase() || (p as any).customerName?.toLowerCase() === selectedCustomer.name?.toLowerCase())
              .sort((a, b) => (b.paymentDate || '').localeCompare(a.paymentDate || ''));
            const lastPayment = custPayments[0] || null;

            const custFollowUps = collectionFollowUps
              .filter((f) => f.customerId === selectedCustomer.id || f.customerName?.toLowerCase() === selectedCustomer.name?.toLowerCase())
              .sort((a, b) => (b.followUpDate || '').localeCompare(a.followUpDate || ''));
            const nextFollowUp =
              custFollowUps.find((f) => f.nextFollowUpDate && f.nextFollowUpDate >= todayStr) ||
              custFollowUps[0] ||
              null;

            const custPromises = promisesToPay
              .filter((p) => p.customerId === selectedCustomer.id || p.customerName?.toLowerCase() === selectedCustomer.name?.toLowerCase())
              .sort((a, b) => (b.promiseDate || '').localeCompare(a.promiseDate || ''));

            const rep = liveReps.find(
              (r) => r.id === selectedCustomer.salesRepresentativeId
            );

            const initials = (selectedCustomer.name || 'CU')
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            // Filter invoices by invoice tab
            const displayedInvoices = custSales.filter((s) => {
              const isCanc = (s.saleStatus as string) === 'Cancelled' || (s as any).status === 'Cancelled';
              const bal = s.balance !== undefined ? s.balance : Math.max(0, (s.grandTotal || 0) - (s.paidAmount || 0));
              if (timelineInvoiceTab === 'open') return !isCanc && bal > 0;
              if (timelineInvoiceTab === 'settled') return !isCanc && bal <= 0;
              if (timelineInvoiceTab === 'cancelled') return isCanc;
              return true;
            });

            // Build unified timeline events list
            type UnifiedEvent = {
              id: string;
              category: 'payments' | 'invoices' | 'follow-ups' | 'promises' | 'other';
              title: string;
              subtitle?: string;
              rawDate: string;
              formattedDate: string;
              relativeDate: string;
              details?: string;
              amount?: number;
              method?: string;
              refNo?: string;
              repName?: string;
            };

            const unifiedEvents: UnifiedEvent[] = [];

            if (customerTimeline?.events && customerTimeline.events.length > 0) {
              customerTimeline.events.forEach((evt) => {
                const titleLower = evt.title.toLowerCase();
                const typeLower = (evt.type || '').toLowerCase();
                let category: UnifiedEvent['category'] = 'other';
                if (typeLower.includes('payment') || titleLower.includes('payment') || titleLower.includes('receipt')) {
                  category = 'payments';
                } else if (typeLower.includes('invoice') || titleLower.includes('invoice')) {
                  category = 'invoices';
                } else if (typeLower.includes('follow') || titleLower.includes('follow') || titleLower.includes('call') || titleLower.includes('contact')) {
                  category = 'follow-ups';
                } else if (typeLower.includes('promise') || titleLower.includes('promise')) {
                  category = 'promises';
                }

                const { formatted, relative } = formatTimelineTimestamp(evt.date);
                unifiedEvents.push({
                  id: evt.id || `evt_${Math.random()}`,
                  category,
                  title: evt.title,
                  subtitle: evt.subtitle,
                  rawDate: evt.date,
                  formattedDate: formatted,
                  relativeDate: relative,
                  details: evt.details?.replace(/^"|"$/g, ''),
                });
              });
            } else {
              // Construct unified events from store records if API timeline is not loaded
              custPayments.forEach((p) => {
                const { formatted, relative } = formatTimelineTimestamp(p.paymentDate || p.createdAt);
                unifiedEvents.push({
                  id: p.id,
                  category: 'payments',
                  title: `Payment Received: ₹${Number(p.amount || p.receivedAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
                  subtitle: `Receipt #${p.receiptNo || 'REC'} • ${p.paymentMethod || p.paymentType || 'Cash'}${p.referenceNo ? ` • Ref: ${p.referenceNo}` : ''}`,
                  rawDate: p.paymentDate || p.createdAt || '',
                  formattedDate: formatted,
                  relativeDate: relative,
                  details: p.notes,
                  amount: Number(p.amount || p.receivedAmount || 0),
                  method: p.paymentMethod || p.paymentType,
                  refNo: p.referenceNo,
                  repName: p.salesRepresentativeName,
                });
              });

              custSales.forEach((s) => {
                const isCanc = (s.saleStatus as string) === 'Cancelled' || (s as any).status === 'Cancelled';
                const bal = s.balance !== undefined ? s.balance : Math.max(0, (s.grandTotal || 0) - (s.paidAmount || 0));
                const { formatted, relative } = formatTimelineTimestamp(s.saleDate || s.createdAt);
                unifiedEvents.push({
                  id: s.id,
                  category: 'invoices',
                  title: `Invoice ${s.invoiceNo} Raised: ₹${Number(s.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
                  subtitle: `Due Date: ${s.dueDate || s.saleDate || 'N/A'} • Status: ${isCanc ? 'Cancelled' : bal <= 0 ? 'Paid' : 'Partial'}`,
                  rawDate: s.saleDate || s.createdAt || '',
                  formattedDate: formatted,
                  relativeDate: relative,
                  details: `Outstanding Balance: ₹${bal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
                  amount: Number(s.grandTotal || 0),
                  repName: s.salesRepresentativeName,
                });
              });

              custFollowUps.forEach((f) => {
                const { formatted, relative } = formatTimelineTimestamp(`${f.followUpDate}${f.followUpTime ? ` ${f.followUpTime}` : ''}`);
                unifiedEvents.push({
                  id: f.id,
                  category: 'follow-ups',
                  title: `Follow-up: ${f.outcome || 'Customer Contacted'}`,
                  subtitle: `Method: ${f.contactMethod || 'Phone'}${f.nextFollowUpDate ? ` • Next: ${f.nextFollowUpDate}` : ''}`,
                  rawDate: f.followUpDate,
                  formattedDate: formatted,
                  relativeDate: relative,
                  details: f.notes,
                  repName: f.salesRepresentativeName,
                });
              });

              custPromises.forEach((ptp) => {
                const { formatted, relative } = formatTimelineTimestamp(ptp.createdAt || ptp.promiseDate);
                unifiedEvents.push({
                  id: ptp.id,
                  category: 'promises',
                  title: `Promise to Pay: ₹${Number(ptp.promisedAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
                  subtitle: `Promised Date: ${ptp.promiseDate} • Status: ${ptp.status}`,
                  rawDate: ptp.promiseDate || ptp.createdAt || '',
                  formattedDate: formatted,
                  relativeDate: relative,
                  details: ptp.notes,
                  amount: Number(ptp.promisedAmount || 0),
                  repName: ptp.salesRepresentativeName,
                });
              });
            }

            // Sort unified events descending by date
            unifiedEvents.sort((a, b) => (b.rawDate || '').localeCompare(a.rawDate || ''));

            // Filter timeline events by category tab and search query
            const filteredTimelineEvents = unifiedEvents.filter((evt) => {
              if (timelineTab !== 'all' && evt.category !== timelineTab) {
                return false;
              }
              if (timelineSearch.trim()) {
                const q = timelineSearch.toLowerCase().trim();
                const matchTitle = evt.title.toLowerCase().includes(q);
                const matchSub = (evt.subtitle || '').toLowerCase().includes(q);
                const matchDet = (evt.details || '').toLowerCase().includes(q);
                if (!matchTitle && !matchSub && !matchDet) return false;
              }
              return true;
            });

            const paymentCount = unifiedEvents.filter((e) => e.category === 'payments').length;
            const invoiceCount = unifiedEvents.filter((e) => e.category === 'invoices').length;
            const followUpCount = unifiedEvents.filter((e) => e.category === 'follow-ups').length;
            const promiseCount = unifiedEvents.filter((e) => e.category === 'promises').length;

            return (
              <div className="space-y-5 p-1 text-xs max-h-[80vh] overflow-y-auto pr-1 sm:pr-2">
                {/* 1. Customer Profile Banner with Quick Actions */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-purple-50/20 to-slate-50 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#33077C] to-[#581c87] text-white font-bold text-base flex items-center justify-center shadow-sm shrink-0">
                      {initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900 tracking-tight">{selectedCustomer.name}</h3>
                        {selectedCustomer.customerCode && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-200/70 text-slate-700">
                            {selectedCustomer.customerCode}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 bg-purple-100/70 text-[#33077C] px-2.5 py-0.5 rounded-full font-bold text-[10px] border border-purple-200/60">
                          <UserCheck className="w-3 h-3" />
                          <span>Rep: {rep?.name || selectedCustomer.salesRepresentativeName || 'Unassigned'}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap mt-1 text-[11px] text-slate-500 font-medium">
                        {selectedCustomer.phone && (
                          <a
                            href={`tel:${selectedCustomer.phone}`}
                            className="inline-flex items-center gap-1 hover:text-[#33077C] transition-colors"
                          >
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{selectedCustomer.phone}</span>
                          </a>
                        )}
                        {selectedCustomer.email && (
                          <a
                            href={`mailto:${selectedCustomer.email}`}
                            className="inline-flex items-center gap-1 hover:text-[#33077C] transition-colors"
                          >
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{selectedCustomer.email}</span>
                          </a>
                        )}
                        {selectedCustomer.company && (
                          <span className="inline-flex items-center gap-1 text-slate-600">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span>{selectedCustomer.company}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Shortcuts inside Customer Banner */}
                  <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const targetSale = openSales[0] || custSales[0];
                        if (targetSale) {
                          setSelectedInvoice(targetSale);
                          const bal = targetSale.balance !== undefined ? targetSale.balance : Math.max(0, (targetSale.grandTotal || 0) - (targetSale.paidAmount || 0));
                          setPaymentAmount(bal);
                        }
                        setPaymentDate(todayStr);
                        setPaymentRepId(rep?.id || '');
                        setIsTimelineModalOpen(false);
                        setIsRecordPaymentModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Record Payment</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const targetSale = openSales[0] || custSales[0];
                        if (targetSale) setSelectedInvoice(targetSale);
                        setFollowUpDate(todayStr);
                        setFollowUpRepId(rep?.id || '');
                        setIsTimelineModalOpen(false);
                        setIsFollowUpModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Log Follow-up</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const targetSale = openSales[0] || custSales[0];
                        if (targetSale) {
                          setSelectedInvoice(targetSale);
                          const bal = targetSale.balance !== undefined ? targetSale.balance : Math.max(0, (targetSale.grandTotal || 0) - (targetSale.paidAmount || 0));
                          setPromisedAmount(bal);
                        }
                        setPromiseDate('');
                        setIsTimelineModalOpen(false);
                        setIsPromiseModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Promise to Pay</span>
                    </button>
                  </div>
                </div>

                {/* 2. Four Modern Elevated KPI Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Card 1: Total Outstanding */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-50 via-purple-50/60 to-indigo-50/40 border border-purple-200/90 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-purple-700 font-bold uppercase tracking-wider">
                        Total Outstanding
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-purple-100 text-[#33077C] flex items-center justify-center">
                        <IndianRupee className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="text-lg font-extrabold text-purple-950">
                        ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-purple-600 font-semibold mt-0.5">
                        Across {openSales.length} open receivables
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Overdue Amount */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-50 via-rose-50/60 to-red-50/40 border border-rose-200/90 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-rose-700 font-bold uppercase tracking-wider">
                        Overdue Amount
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="text-lg font-extrabold text-rose-950">
                        ₹{overdueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-rose-600 font-semibold mt-0.5">
                        {overdueSales.length} invoices past due date
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Last Payment */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 via-emerald-50/60 to-teal-50/40 border border-emerald-200/90 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                        Last Payment
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="text-lg font-extrabold text-emerald-950 truncate">
                        {lastPayment
                          ? `₹${Number(lastPayment.amount || lastPayment.receivedAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                          : 'None'}
                      </div>
                      <div className="text-[10px] text-emerald-600 font-semibold mt-0.5 truncate">
                        {lastPayment ? `Received on ${lastPayment.paymentDate || 'recently'}` : 'No payments collected yet'}
                      </div>
                    </div>
                  </div>

                  {/* Card 4: Next Follow-up */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-50 via-sky-50/60 to-indigo-50/40 border border-sky-200/90 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-sky-700 font-bold uppercase tracking-wider">
                        Next Follow-up
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
                        <CalendarClock className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="text-lg font-extrabold text-sky-950 truncate">
                        {nextFollowUp?.nextFollowUpDate
                          ? formatTimelineTimestamp(nextFollowUp.nextFollowUpDate).formatted
                          : 'None Scheduled'}
                      </div>
                      <div className="text-[10px] text-sky-600 font-semibold mt-0.5 truncate">
                        {nextFollowUp?.outcome || 'No upcoming interaction'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Customer Invoices Table Section */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  {/* Table Header Controls */}
                  <div className="p-3 sm:px-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#33077C]" />
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Customer Invoices
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-[#33077C]">
                        {custSales.length}
                      </span>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { id: 'all', label: `All (${custSales.length})` },
                        { id: 'open', label: `Open (${openSales.length})` },
                        { id: 'settled', label: `Settled (${settledSales.length})` },
                        { id: 'cancelled', label: `Cancelled (${cancelledSales.length})` },
                      ].map((tab) => {
                        const isActive = timelineInvoiceTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setTimelineInvoiceTab(tab.id as any)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              isActive
                                ? 'bg-[#33077C] text-white shadow-2xs'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Table Body */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#33077C] text-white text-[11px] font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">INVOICE NO</th>
                          <th className="py-2.5 px-3">DATE</th>
                          <th className="py-2.5 px-3">DUE DATE</th>
                          <th className="py-2.5 px-3 text-right">AMOUNT</th>
                          <th className="py-2.5 px-3 text-right">PAID</th>
                          <th className="py-2.5 px-3 text-right">BALANCE</th>
                          <th className="py-2.5 px-3 text-center">STATUS</th>
                          <th className="py-2.5 px-3 text-center">ACTION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                        {displayedInvoices.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                              No invoices found in this category
                            </td>
                          </tr>
                        ) : (
                          displayedInvoices.map((s) => {
                            const isCanc = (s.saleStatus as string) === 'Cancelled' || (s as any).status === 'Cancelled';
                            const bal =
                              s.balance !== undefined
                                ? s.balance
                                : Math.max(0, (s.grandTotal || 0) - (s.paidAmount || 0));

                            let statusBadge = (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Paid
                              </span>
                            );

                            if (isCanc) {
                              statusBadge = (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                  Cancelled
                                </span>
                              );
                            } else if (bal > 0) {
                              if (s.dueDate && s.dueDate < todayStr) {
                                statusBadge = (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 animate-pulse">
                                    Overdue
                                  </span>
                                );
                              } else if (s.dueDate && s.dueDate === todayStr) {
                                statusBadge = (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                    Due Today
                                  </span>
                                );
                              } else {
                                statusBadge = (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                    Upcoming
                                  </span>
                                );
                              }
                            }

                            return (
                              <tr key={s.id} className="hover:bg-purple-50/30 transition-colors">
                                <td className="py-2.5 px-3 font-mono font-bold text-[#33077C] whitespace-nowrap">
                                  {s.invoiceNo}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                                  {formatTimelineTimestamp(s.saleDate).formatted}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                                  {s.dueDate ? formatTimelineTimestamp(s.dueDate).formatted : 'N/A'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-medium text-slate-800 whitespace-nowrap">
                                  ₹{(s.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-2.5 px-3 text-right font-medium text-emerald-600 whitespace-nowrap">
                                  ₹{(s.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-rose-600 whitespace-nowrap">
                                  ₹{bal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                  {statusBadge}
                                </td>
                                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                  {isCanc ? (
                                    <span className="text-[11px] font-medium text-slate-400">Cancelled</span>
                                  ) : bal > 0 ? (
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
                                      className="px-2.5 py-1 rounded-lg bg-[#33077C] hover:bg-[#4309A2] text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1 mx-auto"
                                    >
                                      <CreditCard className="w-3 h-3" />
                                      <span>Collect</span>
                                    </button>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/50">
                                      <Check className="w-3 h-3 text-emerald-600" />
                                      <span>Settled</span>
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 4. Improvised Collection Activity Timeline Section */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
                  {/* Timeline Title & Interactive Category Filter Tabs */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-[#33077C]" />
                        <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                          Collection Activity Timeline
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {unifiedEvents.length} Events
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Chronological record of invoices, receipts, customer calls, and commitments.
                      </p>
                    </div>

                    {/* Timeline Category Tabs */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { id: 'all', label: `All (${unifiedEvents.length})` },
                        { id: 'payments', label: `Payments (${paymentCount})` },
                        { id: 'invoices', label: `Invoices (${invoiceCount})` },
                        { id: 'follow-ups', label: `Follow-ups (${followUpCount})` },
                        { id: 'promises', label: `Promises (${promiseCount})` },
                      ].map((tab) => {
                        const isActive = timelineTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setTimelineTab(tab.id as any)}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isActive
                                ? 'bg-[#33077C] text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                            }`}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Search bar within Timeline */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Filter timeline by invoice, receipt, keyword..."
                      value={timelineSearch}
                      onChange={(e) => setTimelineSearch(e.target.value)}
                      className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-[#33077C] text-slate-700"
                    />
                    {timelineSearch && (
                      <button
                        type="button"
                        onClick={() => setTimelineSearch('')}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Timeline Stream */}
                  {isTimelineLoading ? (
                    <div className="py-12 text-center text-slate-500">
                      <Loader2 className="w-7 h-7 animate-spin mx-auto text-[#33077C] mb-2" />
                      <p className="text-xs font-semibold text-slate-700">Loading collection timeline...</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Fetching verified chronological customer audit trail</p>
                    </div>
                  ) : filteredTimelineEvents.length === 0 ? (
                    <div className="py-10 text-center text-slate-400">
                      <History className="w-8 h-8 mx-auto text-slate-300 mb-2 opacity-50" />
                      <p className="text-xs font-semibold text-slate-700">No collection interactions found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {timelineSearch
                          ? `No activity matches "${timelineSearch}". Try clearing the search.`
                          : 'No recorded interactions or payments under this category yet.'}
                      </p>
                    </div>
                  ) : (
                    <div className="relative pl-6 space-y-4 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {filteredTimelineEvents.map((evt) => {
                        // Event styling and iconography based on category
                        let iconNode = <History className="w-3.5 h-3.5 text-purple-600" />;
                        let dotBg = 'bg-[#33077C]';
                        let cardBorder = 'border-slate-200/90';
                        let accentBg = 'bg-white';

                        if (evt.category === 'payments') {
                          iconNode = <CreditCard className="w-3.5 h-3.5 text-white" />;
                          dotBg = 'bg-emerald-600 text-white';
                          cardBorder = 'border-emerald-200 hover:border-emerald-300';
                          accentBg = 'bg-gradient-to-r from-emerald-50/40 via-white to-white';
                        } else if (evt.category === 'invoices') {
                          iconNode = <FileText className="w-3.5 h-3.5 text-white" />;
                          dotBg = 'bg-blue-600 text-white';
                          cardBorder = 'border-blue-200 hover:border-blue-300';
                          accentBg = 'bg-gradient-to-r from-blue-50/40 via-white to-white';
                        } else if (evt.category === 'follow-ups') {
                          iconNode = <PhoneCall className="w-3.5 h-3.5 text-white" />;
                          dotBg = 'bg-amber-500 text-white';
                          cardBorder = 'border-amber-200 hover:border-amber-300';
                          accentBg = 'bg-gradient-to-r from-amber-50/40 via-white to-white';
                        } else if (evt.category === 'promises') {
                          iconNode = <CalendarClock className="w-3.5 h-3.5 text-white" />;
                          dotBg = 'bg-indigo-600 text-white';
                          cardBorder = 'border-indigo-200 hover:border-indigo-300';
                          accentBg = 'bg-gradient-to-r from-indigo-50/40 via-white to-white';
                        }

                        return (
                          <div key={evt.id} className="relative flex items-start gap-3.5 group">
                            {/* Modern circular badge along spine */}
                            <div
                              className={`absolute -left-6 top-1 w-6 h-6 rounded-full ${dotBg} flex items-center justify-center shadow-xs ring-4 ring-white z-10`}
                            >
                              {iconNode}
                            </div>

                            {/* Elevated Event Card */}
                            <div
                              className={`flex-1 ${accentBg} p-3.5 sm:p-4 rounded-2xl border ${cardBorder} shadow-2xs transition-all`}
                            >
                              <div className="flex items-start justify-between gap-2 flex-wrap">
                                <div className="space-y-0.5">
                                  <h5 className="font-bold text-slate-900 text-xs sm:text-[13px] tracking-tight">
                                    {evt.title}
                                  </h5>
                                  {evt.subtitle && (
                                    <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5 flex-wrap">
                                      <span>{evt.subtitle}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Human-friendly Date Badge */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {evt.relativeDate && (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                                      {evt.relativeDate}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                                    {evt.formattedDate}
                                  </span>
                                </div>
                              </div>

                              {/* Details / Notes Bubble */}
                              {evt.details && (
                                <div className="mt-2.5 p-2.5 bg-slate-50/90 rounded-xl border border-slate-200/70 text-[11px] text-slate-700 font-sans">
                                  <p>{evt.details}</p>
                                </div>
                              )}

                              {/* Footer tag with Sales Representative */}
                              {evt.repName && (
                                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                                  <span className="inline-flex items-center gap-1">
                                    <UserCheck className="w-3 h-3 text-[#33077C]" />
                                    <span>Handled by: <strong className="text-slate-700 font-semibold">{evt.repName}</strong></span>
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer Modal Action */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-200/80">
                  <span className="text-[11px] text-slate-500 font-medium">
                    {displayedInvoices.length} invoices • {unifiedEvents.length} timeline interactions recorded
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsTimelineModalOpen(false)}
                    className="h-9 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
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
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
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

            <div className="rounded-xl border border-slate-200 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-xs">
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

            <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 flex flex-wrap items-center justify-between gap-2">
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
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="w-4 h-4 text-[#33077C] shrink-0" />
                  <span className="font-medium text-slate-800 truncate">{selectedCustomer.email}</span>
                </div>
                <a
                  href={`mailto:${selectedCustomer.email}`}
                  className="px-3 py-1 rounded-lg bg-purple-100 text-[#33077C] font-bold text-[11px] shrink-0"
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
            <div>
              <FormLabel required>Customer</FormLabel>
              <CustomerSearchableSelect
                value={assignCustomerId}
                onChange={(val) => setAssignCustomerId(val)}
                placeholder="Select or search customer..."
              />
            </div>

            <div>
              <FormLabel required>Sales Representative</FormLabel>
              <SalesRepSearchableSelect
                value={assignRepId}
                onChange={(val) => setAssignRepId(val)}
                placeholder="Select sales representative..."
              />
            </div>

            <div>
              <FormLabel>Assignment Type</FormLabel>
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 min-h-11 py-2 px-4 bg-white rounded-xl border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 text-xs sm:text-[13px]">
                  <input
                    type="radio"
                    name="assignType"
                    checked={assignType === 'Primary'}
                    onChange={() => setAssignType('Primary')}
                    className="text-[#33077C] focus:ring-[#33077C]"
                  />
                  <span>Primary Rep</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 text-xs sm:text-[13px]">
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

            <div>
              <FormLabel>Effective From</FormLabel>
              <input
                type="date"
                value={assignEffectiveFrom}
                onChange={(e) => setAssignEffectiveFrom(e.target.value)}
                className={FORM_INPUT_CLS}
              />
            </div>

            <div>
              <FormLabel>Notes</FormLabel>
              <textarea
                rows={2}
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                placeholder="Enter assignment notes or transition instructions..."
                className={FORM_TEXTAREA_CLS}
              />
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

