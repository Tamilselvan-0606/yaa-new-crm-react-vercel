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
    salesRepresentatives,
    paymentIns,
    collectionFollowUps,
    promisesToPay,
    recordCollectionPayment,
    assignCustomerSalesRep,
    addCollectionFollowUp,
    savePromiseToPay,
    getCollectionDashboardMetrics,
  } = useSalesManagementStore();

  // Current system date reference
  const todayStr = '2026-10-08';

  // URL search query sync
  const initialSearch = searchParams.get('search') || '';
  const [searchTerm, setSearchTerm] = useState(initialSearch);

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

  // Selected Target for Action Modals
  const [selectedInvoice, setSelectedInvoice] = useState<SaleTransaction | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<SalesCustomer | null>(null);

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

  // Derived Collection Items from Sales Invoices
  interface CollectionItem {
    id: string;
    invoice: SaleTransaction;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    customer: SalesCustomer | null;
    customerId: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    salesRep: SalesRepresentative | null;
    salesRepName: string;
    invoiceTotal: number;
    paidAmount: number;
    outstandingAmount: number;
    status: 'Overdue' | 'Due Today' | 'Upcoming' | 'Promise to Pay' | 'Paid';
    paymentStatus: 'Unpaid' | 'Partial' | 'Paid';
    hasPendingPromise: boolean;
    pendingPromise?: PromiseToPay;
    lastPaymentDate?: string;
  }

  const collectionItems = useMemo<CollectionItem[]>(() => {
    return sales.map((inv) => {
      // Find customer
      const cust = customers.find(
        (c) => c.id === inv.customerId || c.name.toLowerCase() === inv.customerName?.toLowerCase()
      ) || null;

      // Find Sales Representative: check invoice first, then customer
      const repId = inv.salesRepresentativeId || cust?.salesRepresentativeId;
      const rep = salesRepresentatives.find((r) => r.id === repId) || null;

      // Calculate Total, Paid, and Outstanding
      const invoiceTotal = inv.grandTotal || 0;
      const paidAmount = inv.paidAmount || 0;
      // Outstanding = Invoice Total - Total Payments Applied
      const outstandingAmount =
        inv.balance !== undefined ? inv.balance : Math.max(0, invoiceTotal - paidAmount);

      // Check Promise to Pay
      const activePromise = promisesToPay.find(
        (p) => (p.invoiceId === inv.id || p.customerId === inv.customerId) && p.status === 'Pending'
      );

      // Determine Status
      let status: 'Overdue' | 'Due Today' | 'Upcoming' | 'Promise to Pay' | 'Paid' = 'Paid';
      if (outstandingAmount > 0) {
        if (activePromise) {
          status = 'Promise to Pay';
        } else if (inv.dueDate && inv.dueDate < todayStr) {
          status = 'Overdue';
        } else if (inv.dueDate && inv.dueDate === todayStr) {
          status = 'Due Today';
        } else {
          status = 'Upcoming';
        }
      }

      // Payment Status
      let pStatus: 'Unpaid' | 'Partial' | 'Paid' = 'Unpaid';
      if (outstandingAmount <= 0) {
        pStatus = 'Paid';
      } else if (paidAmount > 0) {
        pStatus = 'Partial';
      } else {
        pStatus = 'Unpaid';
      }

      // Find last payment date for this invoice or customer
      const invoicePayments = paymentIns
        .filter((p) => p.invoiceId === inv.id || p.customerId === inv.customerId)
        .sort((a, b) => (b.paymentDate || '').localeCompare(a.paymentDate || ''));

      return {
        id: inv.id,
        invoice: inv,
        invoiceNumber: inv.invoiceNo,
        invoiceDate: inv.saleDate,
        dueDate: inv.dueDate || inv.saleDate,
        customer: cust,
        customerId: cust?.id || inv.customerId || '',
        customerName: cust?.name || inv.customerName || 'Unknown Customer',
        customerPhone: cust?.phone || inv.customerPhone || 'N/A',
        customerEmail: cust?.email || '',
        salesRep: rep,
        salesRepName: rep?.name || inv.salesRepresentativeName || 'Unassigned',
        invoiceTotal,
        paidAmount,
        outstandingAmount,
        status,
        paymentStatus: pStatus,
        hasPendingPromise: !!activePromise,
        pendingPromise: activePromise,
        lastPaymentDate: invoicePayments[0]?.paymentDate,
      };
    });
  }, [sales, customers, salesRepresentatives, promisesToPay, paymentIns, todayStr]);

  // Dashboard Metrics
  const dashboardMetrics = useMemo(() => {
    return getCollectionDashboardMetrics(todayStr);
  }, [getCollectionDashboardMetrics, todayStr]);

  // Tab Counts
  const tabCounts = useMemo(() => {
    const allDues = collectionItems.filter((item) => item.outstandingAmount > 0).length;
    const dueToday = collectionItems.filter(
      (item) => item.outstandingAmount > 0 && item.dueDate === todayStr
    ).length;
    const overdue = collectionItems.filter(
      (item) => item.outstandingAmount > 0 && item.dueDate < todayStr
    ).length;
    const promiseToPay = collectionItems.filter(
      (item) => item.outstandingAmount > 0 && item.hasPendingPromise
    ).length;
    const collected = collectionItems.filter((item) => item.outstandingAmount <= 0).length;

    return { allDues, dueToday, overdue, promiseToPay, collected };
  }, [collectionItems, todayStr]);

  // Filtered Collection Items
  const filteredItems = useMemo(() => {
    return collectionItems.filter((item) => {
      // 1. Tab Filtering
      if (activeTab === 'all') {
        // Show all with open dues by default, or all items
        // Most ERPs show all active receivables under All Dues
        if (item.outstandingAmount <= 0 && activeTab === 'all' && !statusFilter.includes('Paid')) {
          // keep them if user specifically searched, or show only outstanding
        }
      } else if (activeTab === 'due-today') {
        if (!(item.outstandingAmount > 0 && item.dueDate === todayStr)) return false;
      } else if (activeTab === 'overdue') {
        if (!(item.outstandingAmount > 0 && item.dueDate < todayStr)) return false;
      } else if (activeTab === 'promise-to-pay') {
        if (!item.hasPendingPromise) return false;
      } else if (activeTab === 'collected') {
        if (item.outstandingAmount > 0) return false;
      }

      // 2. Search Filter (Customer name, Invoice No, Phone)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchCust = item.customerName.toLowerCase().includes(q);
        const matchInv = item.invoiceNumber.toLowerCase().includes(q);
        const matchPhone = item.customerPhone.toLowerCase().includes(q);
        const matchRep = item.salesRepName.toLowerCase().includes(q);
        if (!matchCust && !matchInv && !matchPhone && !matchRep) return false;
      }

      // 3. Sales Rep Filter
      if (selectedRepFilter !== 'ALL') {
        if (item.salesRep?.id !== selectedRepFilter) return false;
      }

      // 4. Customer Filter
      if (selectedCustomerFilter !== 'ALL') {
        if (item.customerId !== selectedCustomerFilter) return false;
      }

      // 5. Due Date Filter
      if (dueDateFilter === 'OVERDUE') {
        if (!(item.outstandingAmount > 0 && item.dueDate < todayStr)) return false;
      } else if (dueDateFilter === 'TODAY') {
        if (item.dueDate !== todayStr) return false;
      } else if (dueDateFilter === 'THIS_MONTH') {
        const curMonth = todayStr.substring(0, 7);
        if (!item.dueDate.startsWith(curMonth)) return false;
      }

      // 6. Status Filter
      if (statusFilter !== 'ALL') {
        if (item.status !== statusFilter) return false;
      }

      // 7. Payment Status Filter
      if (paymentStatusFilter !== 'ALL') {
        if (item.paymentStatus !== paymentStatusFilter) return false;
      }

      return true;
    });
  }, [
    collectionItems,
    activeTab,
    searchTerm,
    selectedRepFilter,
    selectedCustomerFilter,
    dueDateFilter,
    statusFilter,
    paymentStatusFilter,
    todayStr,
  ]);

  // Pagination Slice
  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Sub-view 2: Customer Assignments Memo
  const customerAssignmentsList = useMemo(() => {
    return customers.map((c) => {
      const custSales = sales.filter((s) => s.customerId === c.id && s.saleStatus !== 'Cancelled');
      const outstanding = custSales.reduce((acc, s) => {
        const bal = s.balance !== undefined ? s.balance : Math.max(0, (s.grandTotal || 0) - (s.paidAmount || 0));
        return acc + bal;
      }, 0);
      const rep = salesRepresentatives.find((r) => r.id === c.salesRepresentativeId);
      return {
        customer: c,
        outstanding,
        rep,
        repName: rep?.name || 'Unassigned',
        repType: c.salesRepresentativeType || 'Primary',
        assignedDate: c.assignedDate || '—',
        status: c.status || 'Active',
      };
    });
  }, [customers, sales, salesRepresentatives]);

  const filteredCustomerAssignments = useMemo(() => {
    return customerAssignmentsList.filter((item) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchName = item.customer.name.toLowerCase().includes(q);
        const matchCode = (item.customer.customerCode || '').toLowerCase().includes(q);
        const matchPhone = (item.customer.phone || '').toLowerCase().includes(q);
        const matchRep = item.repName.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchPhone && !matchRep) return false;
      }
      if (selectedRepFilter !== 'ALL' && item.rep?.id !== selectedRepFilter) return false;
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      return true;
    });
  }, [customerAssignmentsList, searchTerm, selectedRepFilter, statusFilter]);

  const paginatedCustomerAssignments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomerAssignments.slice(start, start + pageSize);
  }, [filteredCustomerAssignments, currentPage, pageSize]);

  // Sub-view 4: Follow-ups Memo
  const filteredFollowUps = useMemo(() => {
    return collectionFollowUps.filter((fup) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchCust = (fup.customerName || '').toLowerCase().includes(q);
        const matchInv = (fup.invoiceNo || fup.invoiceNumber || '').toLowerCase().includes(q);
        const matchNotes = (fup.notes || '').toLowerCase().includes(q);
        const matchRep = (fup.salesRepresentativeName || '').toLowerCase().includes(q);
        if (!matchCust && !matchInv && !matchNotes && !matchRep) return false;
      }
      if (selectedRepFilter !== 'ALL' && fup.salesRepresentativeId !== selectedRepFilter) return false;
      if (statusFilter !== 'ALL' && fup.outcome !== statusFilter) return false;
      return true;
    });
  }, [collectionFollowUps, searchTerm, selectedRepFilter, statusFilter]);

  const paginatedFollowUps = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredFollowUps.slice(start, start + pageSize);
  }, [filteredFollowUps, currentPage, pageSize]);

  // Sub-view 5: Collection History Memo
  const filteredCollectionHistory = useMemo(() => {
    return paymentIns.filter((p) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchReceipt = (p.receiptNo || '').toLowerCase().includes(q);
        const matchParty = (p.partyName || '').toLowerCase().includes(q);
        const matchInv = (p.invoiceNo || '').toLowerCase().includes(q);
        const matchRef = (p.referenceNo || '').toLowerCase().includes(q);
        if (!matchReceipt && !matchParty && !matchInv && !matchRef) return false;
      }
      if (selectedRepFilter !== 'ALL' && p.salesRepresentativeId !== selectedRepFilter) return false;
      return true;
    });
  }, [paymentIns, searchTerm, selectedRepFilter]);

  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCollectionHistory.slice(start, start + pageSize);
  }, [filteredCollectionHistory, currentPage, pageSize]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm('');
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
    setPaymentRepId(item.salesRep?.id || '');
    setIsRecordPaymentModalOpen(true);
    setActiveActionId(null);
  };

  // Helper: Submit Record Payment
  const handleSubmitRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    if (paymentAmount <= 0) {
      toast.error('Please enter a valid payment amount greater than ₹0');
      return;
    }

    const currentOutstanding =
      selectedInvoice.balance !== undefined
        ? selectedInvoice.balance
        : Math.max(0, (selectedInvoice.grandTotal || 0) - (selectedInvoice.paidAmount || 0));

    if (paymentAmount > currentOutstanding) {
      toast.error(
        `Payment amount (₹${paymentAmount.toLocaleString()}) cannot exceed outstanding amount (₹${currentOutstanding.toLocaleString()})`
      );
      return;
    }

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
      `Recorded payment of ₹${Number(paymentAmount).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
      })} for Invoice ${selectedInvoice.invoiceNo}`
    );

    setIsRecordPaymentModalOpen(false);
    setSelectedInvoice(null);
    setSelectedCustomer(null);
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
  const handleSubmitFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !selectedCustomer) return;

    if (!followUpNotes.trim()) {
      toast.error('Please enter follow-up interaction notes');
      return;
    }

    const savedOutcome = followUpHasPromise ? 'Promise to Pay' : followUpOutcome;

    addCollectionFollowUp({
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      invoiceId: selectedInvoice.id,
      invoiceNo: selectedInvoice.invoiceNo,
      salesRepresentativeId: followUpRepId || selectedInvoice.salesRepresentativeId || selectedCustomer.salesRepresentativeId,
      salesRepresentativeName:
        salesRepresentatives.find((r) => r.id === followUpRepId)?.name || selectedInvoice.salesRepresentativeName || 'Sales Rep',
      contactMethod: followUpContactMethod,
      followUpDate,
      followUpTime,
      outcome: savedOutcome,
      notes: followUpNotes.trim(),
      hasPromiseToPay: followUpHasPromise,
      promisedAmount: followUpHasPromise ? Number(followUpPromiseAmount) : undefined,
      promiseDate: followUpHasPromise ? followUpPromiseDate : undefined,
      nextFollowUpDate: nextFollowUpDate || (followUpHasPromise ? followUpPromiseDate : undefined),
      createdBy: salesRepresentatives.find((r) => r.id === followUpRepId)?.name || 'Kumar',
    });

    if (followUpHasPromise && followUpPromiseAmount > 0 && followUpPromiseDate) {
      savePromiseToPay({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        invoiceId: selectedInvoice.id,
        invoiceNo: selectedInvoice.invoiceNo,
        salesRepresentativeId: followUpRepId || selectedInvoice.salesRepresentativeId,
        salesRepresentativeName: salesRepresentatives.find((r) => r.id === followUpRepId)?.name,
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
  };

  // Helper: Open Customer Sales Rep Assignment Modal
  const handleOpenAssignCustomer = (cust?: SalesCustomer | null) => {
    if (cust) {
      setAssignCustomerId(cust.id);
      setAssignRepId(cust.salesRepresentativeId || salesRepresentatives[0]?.id || '');
      setAssignType(cust.salesRepresentativeType || 'Primary');
      setAssignEffectiveFrom(cust.assignedDate || todayStr);
      setAssignNotes(cust.assignmentNotes || '');
    } else {
      setAssignCustomerId(customers[0]?.id || '');
      setAssignRepId(salesRepresentatives[0]?.id || '');
      setAssignType('Primary');
      setAssignEffectiveFrom(todayStr);
      setAssignNotes('');
    }
    setIsAssignCustomerModalOpen(true);
  };

  const handleSubmitAssignCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignCustomerId) {
      toast.error('Please select a customer');
      return;
    }
    if (!assignRepId) {
      toast.error('Please select a sales representative');
      return;
    }
    assignCustomerSalesRep(assignCustomerId, assignRepId, assignType, assignEffectiveFrom, assignNotes);
    const targetCust = customers.find((c) => c.id === assignCustomerId);
    const targetRep = salesRepresentatives.find((r) => r.id === assignRepId);
    toast.success(`Assigned ${targetRep?.name || 'Sales Rep'} to ${targetCust?.name || 'Customer'}`);
    setIsAssignCustomerModalOpen(false);
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
  const handleSubmitPromiseToPay = (e: React.FormEvent) => {
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

    savePromiseToPay({
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      invoiceId: selectedInvoice.id,
      invoiceNo: selectedInvoice.invoiceNo,
      salesRepresentativeId: selectedInvoice.salesRepresentativeId || selectedCustomer.salesRepresentativeId,
      salesRepresentativeName:
        salesRepresentatives.find(
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
      `Promise to Pay recorded for ₹${Number(promisedAmount).toLocaleString()} on ${promiseDate}`
    );

    setIsPromiseModalOpen(false);
    setSelectedInvoice(null);
    setSelectedCustomer(null);
  };

  // Helper: Open Customer Detail & Timeline Modal
  const handleOpenTimeline = (item: CollectionItem) => {
    setSelectedInvoice(item.invoice);
    setSelectedCustomer(item.customer);
    setIsTimelineModalOpen(true);
    setActiveActionId(null);
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
              ₹{(dashboardMetrics?.totalOutstanding ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
              ₹{(dashboardMetrics?.overdueAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <p className="text-[11px] text-rose-600/80 mt-0.5 font-medium">
              Due Date &lt; Today
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
              ₹{(dashboardMetrics?.dueTodayAmount ?? dashboardMetrics?.dueToday ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <p className="text-[11px] text-amber-700/80 mt-0.5 font-medium">
              Maturing today ({todayStr})
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
              {dashboardMetrics?.followUpsTodayCount || tabCounts.dueToday || 18}
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
              ₹{(dashboardMetrics?.collectedThisMonth ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <p className="text-[11px] text-emerald-600/80 mt-0.5 font-medium">
              Total payment collections
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
              {salesRepresentatives.map((rep) => (
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
              {paginatedItems.length === 0 ? (
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
                      ₹{item.invoiceTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Paid Amount */}
                    <td className="py-3 px-3 text-right text-emerald-600 font-medium">
                      ₹{item.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Outstanding Amount (Calculated: Total - Paid) */}
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`font-bold text-sm ${
                          item.outstandingAmount > 0 ? 'text-rose-600' : 'text-slate-400'
                        }`}
                      >
                        ₹{item.outstandingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
        {filteredItems.length > 0 && (
          <div className="p-3 border-t border-slate-100 dark:border-slate-700">
            <Pagination
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              totalItems={filteredItems.length}
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
                {salesRepresentatives.map((rep) => (
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
                  {paginatedCustomerAssignments.length === 0 ? (
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
                          {item.customer.customerCode || '—'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className={`font-bold text-sm ${item.outstanding > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                            ₹{item.outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
            {filteredCustomerAssignments.length > 0 && (
              <div className="p-3 border-t border-slate-100">
                <Pagination
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                  pageSize={pageSize}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                  }}
                  totalItems={filteredCustomerAssignments.length}
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
                {salesRepresentatives.map((rep) => (
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
                  {paginatedFollowUps.length === 0 ? (
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
                            <div className="text-[10px] text-slate-400 font-mono">{fup.followUpTime || '—'}</div>
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
                                <span className="font-bold text-indigo-700">₹{Number(fup.promisedAmount || 0).toLocaleString()}</span>
                                <span className="text-[10px] text-slate-400 block font-mono">Date: {fup.promiseDate || '—'}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-semibold text-purple-700 font-mono text-[11px]">
                            {fup.nextFollowUpDate || '—'}
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
            {filteredFollowUps.length > 0 && (
              <div className="p-3 border-t border-slate-100">
                <Pagination
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                  pageSize={pageSize}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                  }}
                  totalItems={filteredFollowUps.length}
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
                {salesRepresentatives.map((rep) => (
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
                  {paginatedHistory.length === 0 ? (
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
                          {p.referenceNo || '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-700 text-sm">
                          ₹{Number(p.receivedAmount || p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
            {filteredCollectionHistory.length > 0 && (
              <div className="p-3 border-t border-slate-100">
                <Pagination
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                  pageSize={pageSize}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                  }}
                  totalItems={filteredCollectionHistory.length}
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
                  Invoice No: {selectedInvoice.invoiceNo} • Due: {selectedInvoice.dueDate || 'N/A'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  Current Outstanding
                </span>
                <span className="text-lg font-bold text-rose-600">
                  ₹{(selectedInvoice.balance !== undefined
                    ? selectedInvoice.balance
                    : Math.max(0, (selectedInvoice.grandTotal || 0) - (selectedInvoice.paidAmount || 0))
                  ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Payment Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#33077C]"
                  required
                />
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#33077C]"
                  required
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#33077C]"
                >
                  <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / QR</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Credit Card">Credit Card / POS</option>
                </select>
              </div>

              {/* Sales Representative */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Collecting Sales Representative
                </label>
                <select
                  value={paymentRepId}
                  onChange={(e) => setPaymentRepId(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#33077C]"
                >
                  <option value="">Select Representative (Optional)</option>
                  {salesRepresentatives.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.name} ({rep.mobile})
                    </option>
                  ))}
                </select>
              </div>

              {/* Reference / Transaction No */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Transaction / Cheque / UTR Reference
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. UTR12345678 or Cheque #88992"
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#33077C]"
                />
              </div>

              {/* Notes */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Remarks
                </label>
                <textarea
                  rows={2}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Additional payment notes..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#33077C]"
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
                className="h-9 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#33077C]/20 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm Payment Receipt</span>
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
          subtitle={`Invoice ${selectedInvoice.invoiceNo} • Log customer interaction and commitments`}
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
                  ₹{(selectedInvoice.balance !== undefined
                    ? selectedInvoice.balance
                    : Math.max(0, (selectedInvoice.grandTotal || 0) - (selectedInvoice.paidAmount || 0))
                  ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-slate-500 block">Due Date: {selectedInvoice.dueDate || '08 Oct 2026'}</span>
              </div>
            </div>

            <form noValidate onSubmit={handleSubmitFollowUp} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Contact Method */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Method <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={followUpContactMethod}
                    onChange={(e) => setFollowUpContactMethod(e.target.value as ContactMethod)}
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#33077C]"
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
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={followUpOutcome}
                    onChange={(e) => {
                      const val = e.target.value as FollowUpOutcome;
                      setFollowUpOutcome(val);
                      if (val === 'Promise to Pay') {
                        setFollowUpHasPromise(true);
                      }
                    }}
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#33077C]"
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
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Sales Representative
                  </label>
                  <select
                    value={followUpRepId}
                    onChange={(e) => setFollowUpRepId(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#33077C]"
                  >
                    <option value="">Select Representative</option>
                    {salesRepresentatives.map((rep) => (
                      <option key={rep.id} value={rep.id}>
                        {rep.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Follow-up Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Follow-up Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#33077C]"
                    required
                  />
                </div>

                {/* Discussion */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Discussion <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={followUpNotes}
                    onChange={(e) => setFollowUpNotes(e.target.value)}
                    placeholder="Customer confirmed payment on 10 Oct..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#33077C]"
                    required
                  />
                </div>

                {/* Promise to Pay Toggle */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Promise to Pay
                  </label>
                  <select
                    value={followUpHasPromise ? 'Yes' : 'No'}
                    onChange={(e) => setFollowUpHasPromise(e.target.value === 'Yes')}
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#33077C]"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>

                {/* Next Follow-up */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Next Follow-up
                  </label>
                  <input
                    type="date"
                    value={nextFollowUpDate}
                    onChange={(e) => setNextFollowUpDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#33077C]"
                  />
                </div>

                {/* Conditional Promise Fields */}
                {followUpHasPromise && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Promise Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={followUpPromiseDate}
                        onChange={(e) => setFollowUpPromiseDate(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-indigo-200 bg-indigo-50/30 text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
                        required={followUpHasPromise}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Expected Amount (₹) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        value={followUpPromiseAmount}
                        onChange={(e) => setFollowUpPromiseAmount(parseFloat(e.target.value) || 0)}
                        className="w-full h-9 px-3 rounded-xl border border-indigo-200 bg-indigo-50/30 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
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
                  className="h-9 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#33077C]/20 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Follow-up</span>
                </button>
              </div>
            </form>

            {/* Embedded Timeline */}
            <div className="pt-2 border-t border-slate-100">
              <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Interaction History & Timeline
              </h5>
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {collectionFollowUps
                  .filter((f) => f.customerId === selectedCustomer.id || f.invoiceId === selectedInvoice.id)
                  .map((item) => (
                    <div key={item.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{item.followUpDate}</span>
                          <span className="text-purple-700 font-semibold">• {item.outcome}</span>
                        </div>
                        <p className="text-slate-600 mt-0.5 italic">"{item.notes}"</p>
                        <p className="text-[10px] text-slate-400 mt-1">by {item.salesRepresentativeName || 'Sales Rep'}</p>
                      </div>
                      {item.hasPromiseToPay && item.promisedAmount && (
                        <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold text-[10px] shrink-0">
                          Promise: ₹{item.promisedAmount.toLocaleString()}
                        </span>
                      )}
                    </div>
                  ))}
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
          subtitle={`Invoice ${selectedInvoice.invoiceNo} • Outstanding: ₹${(
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
          <form noValidate onSubmit={handleSubmitPromiseToPay} className="space-y-4 p-2 text-xs">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Promised Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                value={promisedAmount}
                onChange={(e) => setPromisedAmount(parseFloat(e.target.value) || 0)}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#33077C]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Promised Payment Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={promiseDate}
                onChange={(e) => setPromiseDate(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#33077C]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Notes / Commitment Details
              </label>
              <textarea
                rows={2}
                value={promiseNotes}
                onChange={(e) => setPromiseNotes(e.target.value)}
                placeholder="e.g. Customer confirmed bank transfer by end of day"
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#33077C]"
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
                className="h-9 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#33077C]/20 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Promise</span>
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
          subtitle={`Phone: ${selectedCustomer.phone} • Ledger & Receivable Status`}
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

            const rep = salesRepresentatives.find(
              (r) => r.id === selectedCustomer.salesRepresentativeId
            );

            return (
              <div className="space-y-4 p-2 text-xs max-h-[75vh] overflow-y-auto">
                {/* Header Information Card */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{selectedCustomer.name}</h3>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Phone: {selectedCustomer.phone} • Email: {selectedCustomer.email || 'N/A'}
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
                      ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-100">
                    <span className="text-[10px] text-rose-700 font-semibold uppercase block">
                      Overdue Amount
                    </span>
                    <span className="text-base font-bold text-rose-900">
                      ₹{overdueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                    <span className="text-[10px] text-emerald-700 font-semibold uppercase block">
                      Last Payment
                    </span>
                    <span className="text-xs font-bold text-emerald-900">
                      {lastPayment
                        ? `₹${(lastPayment.amount || 0).toLocaleString()} (${lastPayment.paymentDate})`
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
                                ₹{(s.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2 px-3 text-right text-emerald-600">
                                ₹{(s.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-rose-600">
                                ₹{bal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                              Promise to Pay: ₹{p.promisedAmount.toLocaleString()}
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
                              Payment Received: ₹{pay.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-mono">
                              {pay.paymentDate}
                            </span>
                          </div>
                          <p className="text-slate-600 mt-1">
                            Settled via {pay.paymentMethod || 'Bank Transfer'}{' '}
                            {pay.referenceNo && `• Ref: ${pay.referenceNo}`}
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
          subtitle={`Date: ${selectedInvoice.saleDate} • Due: ${selectedInvoice.dueDate || 'N/A'}`}
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
                  ₹{(selectedInvoice.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                        ₹{(item.unitPrice || item.rate || 0).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-800">
                        ₹{(item.total || (item.quantity * (item.unitPrice || item.rate || 0))).toLocaleString()}
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
                  ₹{(selectedInvoice.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-600">Outstanding:</span>
                <span className="font-bold text-rose-600 ml-1.5">
                  ₹{(selectedInvoice.balance !== undefined
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
          <form noValidate onSubmit={handleSubmitAssignCustomer} className="space-y-4 p-2 text-xs">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Customer <span className="text-rose-500">*</span>
              </label>
              <select
                value={assignCustomerId}
                onChange={(e) => setAssignCustomerId(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#33077C]"
                required
              >
                <option value="">Select customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.customerCode || c.id}) {c.company ? `• ${c.company}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Sales Representative <span className="text-rose-500">*</span>
              </label>
              <select
                value={assignRepId}
                onChange={(e) => setAssignRepId(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#33077C]"
                required
              >
                <option value="">Select sales representative...</option>
                {salesRepresentatives.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.designation ? `(${r.designation})` : ''} • {r.mobile}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Assignment Type
              </label>
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

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Effective From
              </label>
              <input
                type="date"
                value={assignEffectiveFrom}
                onChange={(e) => setAssignEffectiveFrom(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#33077C]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Notes
              </label>
              <textarea
                rows={2}
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                placeholder="Enter assignment notes or transition instructions..."
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#33077C]"
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
                className="h-9 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold shadow-md shadow-[#33077C]/20 cursor-pointer"
              >
                Assign
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
export default CollectionsView;
