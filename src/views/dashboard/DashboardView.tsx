import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Product, DocumentItem, Branch } from '../../types';
import {
  UsersRound,
  Building2,
  Megaphone,
  CreditCard,
  Repeat,
  Clock,
  CheckSquare,
  Film,
  TrendingUp,
  Boxes,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Calendar,
  DollarSign,
  Activity,
  Plus,
  Edit,
  CheckCircle2,
  Layers,
  UploadCloud,
  FileCode,
  ChevronDown,
  Check,
  PieChart as PieIcon,
  BarChart3,
  ArrowRight,
  Search,
  Filter,
  Receipt,
  AlertCircle,
  MoreHorizontal,
  Download,
  Eye,
  UserPlus,
  RefreshCw,
  Ban,
  Tag,
  FileText,
  GitBranch,
  X,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Badge, getStatusBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

import { useDashboardStats } from '../../hooks/useQueries';
import { useNavigate } from 'react-router-dom';

const AdminDashboardView: React.FC = () => {
  const { isAdmin, showToast } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedProductDetails, setSelectedProductDetails] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'branches' | 'clients' | 'leads' | 'payments' | 'subscriptions' | 'activities'>('overview');

  // Branch States for selected product
  const [productBranches, setProductBranches] = useState<Branch[]>([]);
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false);
  const [branchForm, setBranchForm] = useState({
    name: '',
    code: '',
    contactPerson: '',
    mobileNumber: '',
    whatsapp: '',
    email: '',
    location: '',
    status: 'Active' as 'Active' | 'Inactive' | 'Suspended',
  });
  const [branchSubmitting, setBranchSubmitting] = useState(false);

  // Modal States
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<'Contract' | 'Invoice' | 'Brief' | 'Asset' | 'Report'>('Brief');
  const [docFileType, setDocFileType] = useState('PDF');
  const [editTagline, setEditTagline] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Add Client Form States
  const [newClientCompany, setNewClientCompany] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPlan, setNewClientPlan] = useState('Yaa Silver');

  // Filter & Search States
  const [clientSearch, setClientSearch] = useState('');
  const [leadSearch, setLeadSearch] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState('ALL');
  const [leadSourceFilter, setLeadSourceFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');

  // Custom Dropdown Menu States
  const [selectedDropdownValue, setSelectedDropdownValue] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isActivityDropdownOpen, setIsActivityDropdownOpen] = useState(false);
  const activityDropdownRef = useRef<HTMLDivElement>(null);

  const [docSearch, setDocSearch] = useState('');
  const [docCategoryFilter, setDocCategoryFilter] = useState('ALL');
  const [isDocCategoryDropdownOpen, setIsDocCategoryDropdownOpen] = useState(false);
  const docDropdownRef = useRef<HTMLDivElement>(null);

  const [isLeadStatusDropdownOpen, setIsLeadStatusDropdownOpen] = useState(false);
  const leadStatusDropdownRef = useRef<HTMLDivElement>(null);

  const [isLeadSourceDropdownOpen, setIsLeadSourceDropdownOpen] = useState(false);
  const leadSourceDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (activityDropdownRef.current && !activityDropdownRef.current.contains(e.target as Node)) {
        setIsActivityDropdownOpen(false);
      }
      if (docDropdownRef.current && !docDropdownRef.current.contains(e.target as Node)) {
        setIsDocCategoryDropdownOpen(false);
      }
      if (leadStatusDropdownRef.current && !leadStatusDropdownRef.current.contains(e.target as Node)) {
        setIsLeadStatusDropdownOpen(false);
      }
      if (leadSourceDropdownRef.current && !leadSourceDropdownRef.current.contains(e.target as Node)) {
        setIsLeadSourceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      loadProductDetails(selectedProductId);
    } else {
      setSelectedProductDetails(null);
    }
  }, [selectedProductId]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await api.getProducts();
      setProducts(data);
      if (data && data.length > 0 && !selectedDropdownValue) {
        setSelectedDropdownValue(data[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadProductDetails = async (id: string) => {
    setDetailsLoading(true);
    try {
      const [data, branchesData] = await Promise.all([
        api.getProduct(id),
        api.getBranches(id),
      ]);
      setSelectedProductDetails(data);
      setProductBranches(branchesData || []);
      if (data?.product) {
        setEditTagline(data.product.tagline || '');
        setEditDescription(data.product.description || '');
        setEditNotes(data.product.notes || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchForm.name.trim() || !selectedProductId) return;
    try {
      setBranchSubmitting(true);
      await api.createBranch({
        productId: selectedProductId,
        name: branchForm.name.trim(),
        code: branchForm.code.trim() || `BR-${Date.now().toString().slice(-4)}`,
        contactPerson: branchForm.contactPerson.trim(),
        mobileNumber: branchForm.mobileNumber.trim(),
        whatsapp: branchForm.whatsapp.trim(),
        email: branchForm.email.trim(),
        location: branchForm.location.trim(),
        city: branchForm.location.trim(),
        status: branchForm.status,
      });
      showToast('success', 'Branch Created', `Branch "${branchForm.name}" added to ${currentProduct?.name}.`);
      setIsAddBranchModalOpen(false);
      setBranchForm({
        name: '',
        code: '',
        contactPerson: '',
        mobileNumber: '',
        whatsapp: '',
        email: '',
        location: '',
        status: 'Active',
      });
      // reload branches
      const updated = await api.getBranches(selectedProductId);
      setProductBranches(updated || []);
    } catch (err: any) {
      showToast('error', 'Creation Failed', err.message || 'Could not add branch');
    } finally {
      setBranchSubmitting(false);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle) return;
    try {
      await api.uploadProductDocument(selectedProductId, {
        title: docTitle,
        fileType: docFileType,
        category: docCategory,
      });
      showToast('success', 'Document Attached', `Added "${docTitle}" to product documents.`);
      setIsDocModalOpen(false);
      setDocTitle('');
      loadProductDetails(selectedProductId);
      loadProducts();
    } catch (e: any) {
      showToast('error', 'Upload Failed', e.message);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateProduct(selectedProductId, {
        tagline: editTagline,
        description: editDescription,
        notes: editNotes,
      });
      showToast('success', 'Product Updated', 'Product details saved successfully.');
      setIsEditModalOpen(false);
      loadProductDetails(selectedProductId);
      loadProducts();
    } catch (e: any) {
      showToast('error', 'Update Failed', e.message);
    }
  };

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientCompany || !newClientName) return;
    showToast('success', 'Client Added', `${newClientCompany} successfully onboarded to ${currentProduct?.name}.`);
    setIsAddClientModalOpen(false);
    setNewClientCompany('');
    setNewClientName('');
    setNewClientEmail('');
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDropdownValue) {
      setSelectedProductId(selectedDropdownValue);
    }
  };

  const handleClear = () => {
    setSelectedDropdownValue('');
    setSelectedProductId(null);
    setSelectedProductDetails(null);
    setIsDropdownOpen(false);
  };

  const currentProduct = selectedProductDetails?.product || products.find((p) => p.id === selectedProductId);
  const selectedDropdownProduct = products.find((p) => p.id === selectedDropdownValue);

  // Computed CRM Lifecycle & Pipeline Analytics for Overview
  const pipelineDistribution = [
    { name: 'Interested', value: 16, color: '#3B82F6' },
    { name: 'Follow-ups', value: 12, color: '#4309A2' },
    { name: 'Onboarding', value: 7, color: '#8B5CF6' },
    { name: 'Converted', value: 21, color: '#00A859' },
  ];

  const totalPipelineCount = pipelineDistribution.reduce((sum, item) => sum + item.value, 0);

  const productPipelineData = products.map((p, idx) => ({
    name: p.name.length > 10 ? p.name.substring(0, 9) + '...' : p.name,
    fullName: p.name,
    Interested: [3, 2, 4, 3, 2, 2][idx % 6],
    'Follow-ups': [2, 3, 1, 2, 2, 2][idx % 6],
    Onboarding: [1, 2, 1, 1, 1, 1][idx % 6],
    Converted: [4, 3, 3, 4, 3, 4][idx % 6],
  }));

  // Subscription Plan Analytics & Expiration Forecast Data
  const planDistribution = [
    { name: 'Yaa Gold', count: 8, value: 8, mrr: '\u20B94,18,000', percentage: '44%', color: '#33077C' },
    { name: 'Yaa Silver', count: 10, value: 10, mrr: '\u20B93,42,000', percentage: '36%', color: '#4309A2' },
    { name: 'Yaa Bronze', count: 4, value: 4, mrr: '\u20B990,000', percentage: '15%', color: '#00A859' },
    { name: 'Pilot / Trial', count: 2, value: 2, mrr: '\u20B90', percentage: '5%', color: '#3B82F6' },
  ];

  const renewalTimelineData = [
    { month: 'Sep 2026', renewing: 5, expiringRisk: 2, retainedValue: 210, atRiskValue: 84 },
    { month: 'Oct 2026', renewing: 7, expiringRisk: 1, retainedValue: 285, atRiskValue: 42 },
    { month: 'Nov 2026', renewing: 4, expiringRisk: 0, retainedValue: 195, atRiskValue: 0 },
    { month: 'Dec 2026', renewing: 6, expiringRisk: 1, retainedValue: 260, atRiskValue: 35 },
    { month: 'Jan 2027', renewing: 8, expiringRisk: 0, retainedValue: 380, atRiskValue: 0 },
    { month: 'Feb 2027', renewing: 5, expiringRisk: 1, retainedValue: 220, atRiskValue: 40 },
  ];

  const upcomingExpirationsList = [
    {
      id: 'exp-1',
      client: 'NovaTech Ventures',
      plan: 'Starter Tier',
      expiryDate: '08 Sep 2026',
      daysLeft: 6,
      amount: '\u20B916,700',
      cycle: 'Monthly',
      risk: 'Critical',
      autoRenew: false,
    },
    {
      id: 'exp-2',
      client: 'XYZ Solutions',
      plan: 'Enterprise Scale',
      expiryDate: '15 Sep 2026',
      daysLeft: 13,
      amount: '\u20B91,09,000',
      cycle: 'Quarterly',
      risk: 'High',
      autoRenew: false,
    },
    {
      id: 'exp-3',
      client: 'ABC Technologies',
      plan: 'Growth Business',
      expiryDate: '20 Sep 2026',
      daysLeft: 18,
      amount: '\u20B941,900',
      cycle: 'Monthly',
      risk: 'Moderate',
      autoRenew: true,
    },
    {
      id: 'exp-4',
      client: 'OmniBite Cloud Kitchens',
      plan: 'Growth Business',
      expiryDate: '28 Sep 2026',
      daysLeft: 26,
      amount: '\u20B967,000',
      cycle: 'Monthly',
      risk: 'Low',
      autoRenew: true,
    },
  ];

  // Dynamic Product Tab Data
  const defaultClients = [
    { id: 'c1', company: 'ABC Technologies', name: 'Arun Sharma', email: 'arun@abctech.in', plan: 'Growth Business', status: 'Active', joined: 'Jan 2026', amount: 499 },
    { id: 'c2', company: 'XYZ Solutions', name: 'Priya Patel', email: 'priya@xyzsol.com', plan: 'Enterprise Scale', status: 'Active', joined: 'Feb 2026', amount: 1299 },
    { id: 'c3', company: 'Horizon Fleet Logistics', name: 'Marcus Vance', email: 'm.vance@horizonfleet.com', plan: 'Enterprise Scale', status: 'Active', joined: 'Mar 2026', amount: 1899 },
    { id: 'c4', company: 'OmniBite Cloud Kitchens', name: 'Gregory Paul', email: 'gregory@omnibite.food', plan: 'Growth Business', status: 'Active', joined: 'Apr 2026', amount: 799 },
    { id: 'c5', company: 'Apex Global Retail', name: 'Vikram Joshi', email: 'v.joshi@apexretail.io', plan: 'Starter Tier', status: 'Active', joined: 'May 2026', amount: 199 },
  ];

  const clientsList = (selectedProductDetails?.customers && selectedProductDetails.customers.length > 0)
    ? selectedProductDetails.customers.map((c: any, i: number) => ({
      id: c.id,
      company: c.company,
      name: c.name,
      email: c.email,
      plan: c.linkedProducts?.find((lp: any) => lp.productId === currentProduct?.id)?.planName || defaultClients[i % defaultClients.length].plan,
      status: 'Active',
      joined: 'Jan 2026',
      amount: c.linkedProducts?.find((lp: any) => lp.productId === currentProduct?.id)?.amount || defaultClients[i % defaultClients.length].amount,
    }))
    : defaultClients;

  const filteredClients = clientsList.filter((c: any) =>
    c.company.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.plan.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const defaultLeads = [
    { id: 'l1', name: 'John Smith', company: 'ABC Corp', status: 'Interested', source: 'Website', assignedTo: 'Arun', requirements: 'Omnichannel WhatsApp & Call Routing' },
    { id: 'l2', name: 'David Kumar', company: 'XYZ Ltd', status: 'Follow-up', source: 'LinkedIn', assignedTo: 'Priya', requirements: 'Telehealth integration & calendar sync' },
    { id: 'l3', name: 'Sarah Jenkins', company: 'MedCare Clinics', status: 'Qualified', source: 'Direct Referral', assignedTo: 'Suresh', requirements: 'Multi-branch dental appointment CRM' },
    { id: 'l4', name: 'Rajesh Verma', company: 'SportsHub Arena', status: 'New', source: 'Google Ads', assignedTo: 'Kavita', requirements: 'Slot booking mobile engine' },
    { id: 'l5', name: 'Elena Rostova', company: 'FinEdge Global', status: 'Contacted', source: 'Website', assignedTo: 'Arun', requirements: 'Enterprise SLA & SOC2 Compliance' },
    { id: 'l6', name: 'Michael Chang', company: 'LogiFast Courier', status: 'Converted', source: 'LinkedIn', assignedTo: 'Priya', requirements: 'SMS broadcast gateway for 50k deliveries' },
  ];

  const leadsList = (selectedProductDetails?.leads && selectedProductDetails.leads.length > 0)
    ? selectedProductDetails.leads.map((l: any, i: number) => ({
      id: l.id,
      name: l.name,
      company: l.company,
      status: l.status || defaultLeads[i % defaultLeads.length].status,
      source: l.source || defaultLeads[i % defaultLeads.length].source,
      assignedTo: l.assignedStaffName || defaultLeads[i % defaultLeads.length].assignedTo,
      requirements: l.requirements || defaultLeads[i % defaultLeads.length].requirements,
    }))
    : defaultLeads;

  const filteredLeads = leadsList.filter((lead: any) => {
    const matchesSearch = lead.name.toLowerCase().includes(leadSearch.toLowerCase()) ||
      lead.company.toLowerCase().includes(leadSearch.toLowerCase()) ||
      lead.requirements.toLowerCase().includes(leadSearch.toLowerCase());
    const matchesStatus = leadStatusFilter === 'ALL' || lead.status.toUpperCase() === leadStatusFilter.toUpperCase();
    const matchesSource = leadSourceFilter === 'ALL' || lead.source.toUpperCase() === leadSourceFilter.toUpperCase();
    return matchesSearch && matchesStatus && matchesSource;
  });

  const paymentsList = [
    { id: 'p1', invoice: 'INV-1024', client: 'ABC Technologies', plan: 'Growth Business', amount: '\u20B941,900', rawAmount: 499, date: '28 Aug 2026', status: 'Paid' },
    { id: 'p2', invoice: 'INV-1025', client: 'XYZ Solutions', plan: 'Enterprise Scale', amount: '\u20B91,09,000', rawAmount: 1299, date: '26 Aug 2026', status: 'Pending' },
    { id: 'p3', invoice: 'INV-1026', client: 'Horizon Fleet Logistics', plan: 'Enterprise Scale', amount: '\u20B91,59,000', rawAmount: 1899, date: '22 Aug 2026', status: 'Paid' },
    { id: 'p4', invoice: 'INV-1027', client: 'OmniBite Cloud Kitchens', plan: 'Growth Business', amount: '\u20B967,000', rawAmount: 799, date: '18 Aug 2026', status: 'Paid' },
    { id: 'p5', invoice: 'INV-1028', client: 'Apex Global Retail', plan: 'Starter Tier', amount: '\u20B916,700', rawAmount: 199, date: '10 Aug 2026', status: 'Refunded' },
  ];

  const filteredPayments = paymentsList.filter((p) =>
    paymentFilter === 'ALL' || p.status.toUpperCase() === paymentFilter.toUpperCase()
  );

  const subscriptionsList = [
    { id: 's1', client: 'ABC Technologies', plan: 'Growth Business', cycle: 'Monthly', startDate: '01/08/2026', renewalDate: '01/09/2026', status: 'Active', mrr: '\u20B941,900' },
    { id: 's2', client: 'XYZ Solutions', plan: 'Enterprise Scale', cycle: 'Monthly', startDate: '15/07/2026', renewalDate: '15/08/2026', status: 'Expiring Soon', mrr: '\u20B91,09,000' },
    { id: 's3', client: 'Horizon Fleet Logistics', plan: 'Enterprise Scale', cycle: 'Annually', startDate: '01/01/2026', renewalDate: '01/01/2027', status: 'Active', mrr: '\u20B91,59,000' },
    { id: 's4', client: 'OmniBite Cloud Kitchens', plan: 'Growth Business', cycle: 'Monthly', startDate: '10/06/2026', renewalDate: '10/09/2026', status: 'Active', mrr: '\u20B967,000' },
    { id: 's5', client: 'NovaTech Ventures', plan: 'Starter Tier', cycle: 'Monthly', startDate: '18/08/2026', renewalDate: '01/09/2026', status: 'Trial', mrr: '\u20B90' },
    { id: 's6', client: 'Apex Global Retail', plan: 'Starter Tier', cycle: 'Monthly', startDate: '01/05/2026', renewalDate: '01/08/2026', status: 'Cancelled', mrr: '\u20B90' },
  ];

  const [activityFilter, setActivityFilter] = useState<'ALL' | 'PAYMENTS' | 'LEADS' | 'SUBSCRIPTIONS' | 'DOCUMENTS'>('ALL');

  const activitiesList = [
    {
      id: 'a1',
      group: 'Today',
      category: 'PAYMENTS',
      categoryLabel: 'Payment Received',
      title: 'Payment received from ABC Technologies',
      time: '10:30 AM',
      detail: 'Processed via Razorpay Payment Gateway',
      amountTag: '+\u20B941,900 (₹499)',
      clientTag: 'ABC Technologies',
      icon: CreditCard,
      color: '#00A859',
      bgColor: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    },
    {
      id: 'a2',
      group: 'Today',
      category: 'LEADS',
      categoryLabel: 'Lead Converted',
      title: 'Lead converted to client - Marcus Vance',
      time: '09:45 AM',
      detail: 'Upgraded to Enterprise Scale SLA custom contract with 24/7 dedicated support',
      amountTag: '\u20B91,59,000/mo',
      clientTag: 'Horizon Fleet Logistics',
      icon: CheckCircle2,
      color: '#3B82F6',
      bgColor: 'bg-blue-50 text-blue-600 border-blue-200',
    },
    {
      id: 'a3',
      group: 'Today',
      category: 'SUBSCRIPTIONS',
      categoryLabel: 'Auto-Renewed',
      title: 'Subscription renewed - Horizon Fleet Logistics',
      time: '09:10 AM',
      detail: 'Annual commitment license renewed for 12 additional months',
      amountTag: 'Annual Tier',
      clientTag: 'Horizon Fleet Logistics',
      icon: RefreshCw,
      color: '#8B5CF6',
      bgColor: 'bg-purple-50 text-purple-600 border-purple-200',
    },
    {
      id: 'a4',
      group: 'Yesterday',
      category: 'DOCUMENTS',
      categoryLabel: 'Document Attached',
      title: 'Document uploaded - Master Agreement 2026',
      time: '04:15 PM',
      detail: 'Uploaded by Vivek (PDF - 2.4 MB) under Contract & MSA Category',
      amountTag: 'PDF - 2.4 MB',
      clientTag: 'Internal Repo',
      icon: FileText,
      color: '#4309A2',
      bgColor: 'bg-orange-50 text-[#4309A2] border-orange-200',
    },
    {
      id: 'a5',
      group: 'Yesterday',
      category: 'LEADS',
      categoryLabel: 'New Inquiry',
      title: 'New lead inquiry from Website Gateway',
      time: '01:20 PM',
      detail: 'Sarah Jenkins (MedCare Clinics) submitted interest for Multi-branch CRM routing',
      amountTag: 'Website Form',
      clientTag: 'MedCare Clinics',
      icon: UsersRound,
      color: '#33077C',
      bgColor: 'bg-purple-50 text-[#33077C] border-purple-200',
    },
    {
      id: 'a6',
      group: 'Earlier this week',
      category: 'SUBSCRIPTIONS',
      categoryLabel: 'Plan Modified',
      title: 'Pricing Plan Updated by Administrator',
      time: '28 Aug, 02:40 PM',
      detail: 'Growth Business tier specifications updated with priority routing & automated triggers',
      amountTag: 'Admin Action',
      clientTag: 'System Config',
      icon: Edit,
      color: '#64748B',
      bgColor: 'bg-slate-100 text-slate-700 border-slate-200',
    },
  ];

  const filteredActivities = activitiesList.filter(
    (act) => activityFilter === 'ALL' || act.category === activityFilter
  );

  const getLeadBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'contacted': return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'interested': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'qualified': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'follow-up': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'converted': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'lost': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Product Selection Bar */}
      <div className="bg-white px-5 py-4 rounded-xl border border-slate-200/90 shadow-xs">
        <form onSubmit={handleProductSubmit} className="flex flex-wrap items-center gap-3 sm:gap-4">
          {/* Label before the field */}
          <span className="text-[14px] font-bold text-[#33077C] shrink-0">
            {selectedProductId ? 'Switch Product' : 'Choose Product'}
          </span>

          {/* Custom Styled Dropdown */}
          <div className="relative w-72 sm:w-80" ref={dropdownRef}>
            <button
              type="button"
              id="product-dropdown-trigger"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`w-full h-10 px-3.5 bg-white border rounded-lg text-[14px] font-bold flex items-center justify-between shadow-xs transition-all cursor-pointer text-left ${isDropdownOpen
                ? 'border-[#4309A2] ring-2 ring-[#4309A2]/20 text-[#33077C]'
                : 'border-slate-300 hover:border-slate-400 text-[#33077C]'
                }`}
            >
              <span className="truncate">
                {selectedDropdownProduct ? selectedDropdownProduct.name : (products[0]?.name || 'Yaa connect')}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ml-2 ${isDropdownOpen ? 'rotate-180 text-[#4309A2]' : ''
                  }`}
              />
            </button>

            {/* Custom Dropdown Popup matching Reference Image */}
            {isDropdownOpen && (
              <div className="dropdown-menu absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl border border-slate-200/90 shadow-xl p-1.5 space-y-0.5">
                {products.map((prod) => {
                  const isItemActive = prod.id === (selectedDropdownValue || products[0]?.id);
                  return (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => {
                        setSelectedDropdownValue(prod.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`dropdown-item w-full text-left px-3.5 py-2.5 rounded-lg text-[14px] transition-all cursor-pointer block ${isItemActive
                        ? 'bg-[#E8F8F0] text-[#00A859] font-bold'
                        : 'text-[#1E293B] hover:bg-slate-50 font-medium'
                        }`}
                    >
                      {prod.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Submit Button next to field */}
          <button
            type="submit"
            disabled={!selectedDropdownValue}
            className="h-11 px-6 bg-[#4309A2] hover:bg-[#e67e00] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0 flex items-center justify-center hover:scale-[1.02] active:scale-[0.98]"
          >
            Submit
          </button>

          {/* Clear Button */}
          <button
            type="button"
            onClick={handleClear}
            disabled={!selectedDropdownValue && !selectedProductId}
            className="h-11 px-5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-sm font-bold rounded-xl transition-all cursor-pointer shrink-0 flex items-center justify-center"
          >
            Clear
          </button>
        </form>
      </div>

      {/* Portfolio Overview & Lifecycle Analytics Dashboard when no single product is selected */}
      {!selectedProductId ? (
        <div className="space-y-6">
          {/* Top 4 Pipeline Summary Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Interested Leads</span>
                <h3 className="text-2xl font-black text-blue-600 mt-1">16</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Discovery & Inquiries</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <UsersRound className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending Follow-ups</span>
                <h3 className="text-2xl font-black text-[#4309A2] mt-1">12</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Calls & Demos Scheduled</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-[#4309A2]">
                <Calendar className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">In Onboarding</span>
                <h3 className="text-2xl font-black text-purple-600 mt-1">7</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Setup & Account Prep</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                <Layers className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Converted Clients</span>
                <h3 className="text-2xl font-black text-emerald-700 mt-1">21</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Active Paid Deployments</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Analytics Charts Grid (Lifecycle Donut Chart + Product Stage Breakdown Bar Chart) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Pipeline Lifecycle Pie / Donut Chart (5 Cols) */}
            <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <PieIcon className="w-4 h-4 text-[#4309A2]" />
                      Pipeline & Customer Lifecycle
                    </h3>
                    <p className="text-xs text-slate-500">Breakdown of leads, onboarding & converted clients</p>
                  </div>
                </div>

                <div className="h-56 w-full relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pipelineDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pipelineDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(val: any, name: any) => [`${val} Accounts (${Math.round((Number(val) / totalPipelineCount) * 100)}%)`, name]}
                        contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #e2e8f0' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Lifecycle Stage Legend */}
              <div className="grid grid-cols-2 gap-2.5 pt-4 border-t border-slate-100 mt-2">
                {pipelineDistribution.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 font-medium">{item.name}:</span>
                    <span className="font-bold text-slate-900 ml-auto">{item.value} ({Math.round((item.value / totalPipelineCount) * 100)}%)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Product Pipeline Stages Bar Chart (7 Cols) */}
            <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-[#4309A2]" />
                      Stage Breakdown per Product
                    </h3>
                    <p className="text-xs text-slate-500">Interested, follow-ups, onboarding & converted across products</p>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productPipelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <RechartsTooltip
                        contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #e2e8f0' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Bar dataKey="Interested" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Follow-ups" fill="#4309A2" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Onboarding" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Converted" fill="#00A859" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : currentProduct ? (
        <div className="space-y-5">
          {/* Product Details Card with Tabs */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
            {/* Product Tabs Filter Bar (7 Recommended Tabs) */}
            <div className="flex flex-wrap items-center gap-2.5 px-6 py-4 border-b border-slate-200 bg-white">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'branches', label: `Branches (${productBranches.length})` },
                { id: 'clients', label: `Clients (${clientsList.length})` },
                { id: 'leads', label: `Leads (${leadsList.length})` },
                { id: 'payments', label: 'Payments' },
                { id: 'subscriptions', label: 'Subscriptions' },
                { id: 'activities', label: 'Activities' },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-5 py-2 text-[14px] font-bold transition-all whitespace-nowrap cursor-pointer rounded-full ${isActive
                      ? 'bg-[#33077C] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                      }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Product Detail Content Area */}
            <div className="p-6">
              {detailsLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Loading product data...
                </div>
              ) : (
                <>
                  {/* ========================================================================= */}
                  {/* 1. OVERVIEW TAB */}
                  {/* ========================================================================= */}
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      {/* Overview Header Section */}
                      <div className="bg-slate-50/70 p-6 rounded-xl border border-slate-200/80 space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2.5">
                              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                                {currentProduct.name}
                              </h3>
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Active
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 font-medium">
                              {currentProduct.tagline}
                            </p>
                          </div>
                        </div>

                        {/* 4 Summary Stat Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-2">
                          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Clients</span>
                            <span className="text-2xl font-black text-slate-900 mt-1 block">24</span>
                          </div>

                          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Leads</span>
                            <span className="text-2xl font-black text-[#4309A2] mt-1 block">12</span>
                          </div>

                          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Revenue</span>
                            <span className="text-2xl font-black text-emerald-700 mt-1 block">&#8377;8.5L</span>
                          </div>

                          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Subscriptions</span>
                            <span className="text-2xl font-black text-[#33077C] mt-1 block">18</span>
                          </div>
                        </div>
                      </div>

                      {/* Charts Grid: Subscription Plan Distribution & Plan Expiration Forecast */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        {/* Chart 1: Plan Expiration & Renewal Schedule (7 cols) */}
                        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <h4 className="text-sm font-bold text-[#33077C] flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-[#4309A2]" />
                                Plan Expiration & Renewal Forecast
                              </h4>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Monthly projection of renewing contracts vs accounts at expiration risk
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1 text-[11px] text-slate-600">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#00A859]" /> Renewing
                              </span>
                              <span className="flex items-center gap-1 text-[11px] text-slate-600">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" /> Expiring
                              </span>
                            </div>
                          </div>

                          <div className="h-64 w-full pt-2">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={renewalTimelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} allowDecimals={false} />
                                <RechartsTooltip
                                  formatter={(val: any, name: any) => [
                                    `${val} Accounts`,
                                    name === 'renewing' ? 'Active Renewals' : 'Expiration Risk',
                                  ]}
                                  contentStyle={{ borderRadius: '12px', fontSize: '11px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="renewing" fill="#00A859" radius={[4, 4, 0, 0]} maxBarSize={32} name="renewing" />
                                <Bar dataKey="expiringRisk" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={32} name="expiringRisk" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                            <span>Predicted Renewal Revenue: <strong className="text-slate-900 font-bold">&#8377;15.5L</strong></span>
                            <span className="text-amber-600 font-semibold flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" /> 3 Accounts Require Outreach
                            </span>
                          </div>
                        </div>

                        {/* Chart 2: Client Subscriptions by Plan (5 cols) */}
                        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-bold text-[#33077C] flex items-center gap-2">
                                <PieIcon className="w-4 h-4 text-[#4309A2]" />
                                Subscriptions by Plan Tier
                              </h4>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Active clients breakdown across contract tiers
                              </p>
                            </div>
                            <span className="text-xs font-bold text-[#33077C] bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
                              18 Total
                            </span>
                          </div>

                          <div className="h-48 w-full relative flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={planDistribution}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={48}
                                  outerRadius={72}
                                  paddingAngle={4}
                                  dataKey="value"
                                >
                                  {planDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <RechartsTooltip
                                  formatter={(val: any, name: any, item: any) => [
                                    `${val} Clients (${item.payload.mrr})`,
                                    name,
                                  ]}
                                  contentStyle={{ borderRadius: '12px', fontSize: '11px', border: '1px solid #e2e8f0' }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                              <span className="text-xl font-black text-slate-900">24</span>
                              <span className="text-[10px] text-slate-400 font-medium">Clients</span>
                            </div>
                          </div>

                          <div className="space-y-2 pt-1 border-t border-slate-100">
                            {planDistribution.map((plan) => (
                              <div key={plan.name} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: plan.color }} />
                                  <span className="text-slate-700 text-[11px] font-semibold">{plan.name}</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                  <span className="text-slate-400 text-[11px]">{plan.count} ({plan.percentage})</span>
                                  <span className="font-bold text-slate-900 text-[11px] min-w-[55px] text-right">{plan.mrr}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Upcoming Plan Expirations & Action Section */}
                      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                        <div className="p-4.5 sm:px-5 sm:py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50/50">
                          <div>
                            <h4 className="text-sm font-bold text-[#33077C] flex items-center gap-2">
                              <Clock className="w-4 h-4 text-[#4309A2]" />
                              Upcoming Plan Expirations & Renewals (Next 30 Days)
                            </h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Clients requiring follow-up or license renewal before service disruption
                            </p>
                          </div>
                          <button
                            onClick={() => showToast('success', 'Batch Reminder Sent', 'Notified all clients with plans expiring within 15 days.')}
                            className="px-3.5 py-1.5 bg-[#4309A2] hover:bg-[#e67e00] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-auto"
                          >
                            <Repeat className="w-3.5 h-3.5" />
                            Send Expiry Reminders
                          </button>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              <tr>
                                <th className="px-5 py-3">Client</th>
                                <th className="px-4 py-3">Plan</th>
                                <th className="px-4 py-3">Expiration Date</th>
                                <th className="px-4 py-3">Time Remaining</th>
                                <th className="px-4 py-3">Rate</th>
                                <th className="px-4 py-3">Auto-Renew</th>
                                <th className="px-5 py-3 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {upcomingExpirationsList.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="px-5 py-3.5 font-bold text-slate-900">
                                    {item.client}
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-[#33077C] font-bold text-[11px] border border-purple-200">
                                      {item.plan}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3.5 text-slate-700 font-medium text-xs">
                                    {item.expiryDate}
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <span
                                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${item.daysLeft <= 7
                                        ? 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                                        : item.daysLeft <= 15
                                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        }`}
                                    >
                                      <Clock className="w-3 h-3" />
                                      {item.daysLeft} days left
                                    </span>
                                  </td>
                                  <td className="px-4 py-3.5 font-bold text-slate-900">
                                    {item.amount}
                                  </td>
                                  <td className="px-4 py-3.5">
                                    {item.autoRenew ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Enabled
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Manual
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-5 py-3.5 text-right">
                                    <button
                                      onClick={() => showToast('success', 'Plan Renewed', `Extended plan license for ${item.client}.`)}
                                      className="px-3 py-1 bg-[#33077C] hover:bg-[#432eb5] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
                                    >
                                      Extend Plan
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ========================================================================= */}
                  {/* BRANCHES TAB (LIST AGAINST SELECTED PRODUCT) */}
                  {/* ========================================================================= */}
                  {activeTab === 'branches' && (
                    <div className="space-y-4">
                      {/* Top Action Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div>
                          <h4 className="text-sm font-bold text-[#33077C] flex items-center gap-2">
                            <GitBranch className="w-4 h-4 text-[#4309A2]" />
                            {currentProduct?.name} Branches ({productBranches.length})
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Regional offices and service hubs operating under {currentProduct?.name}
                          </p>
                        </div>

                        <button
                          onClick={() => setIsAddBranchModalOpen(true)}
                          className="h-9 px-4 bg-[#4309A2] hover:bg-[#e67e00] text-white text-xs font-bold rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          + Add Branch
                        </button>
                      </div>

                      {/* Branches Table */}
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-[#33077C] text-white text-[11px] font-bold uppercase tracking-wider">
                            <tr>
                              <th className="py-3 px-4">Branch & Code</th>
                              <th className="py-3 px-4">Contact Person</th>
                              <th className="py-3 px-4">Phone / Email</th>
                              <th className="py-3 px-4">City / State</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-4">Created Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {productBranches.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                                  No branches added for {currentProduct?.name} yet. Click "+ Add Branch" above to add one.
                                </td>
                              </tr>
                            ) : (
                              productBranches.map((br) => {
                                const initials = br.name ? (br.name.trim().split(/\s+/).length >= 2 ? (br.name.trim().split(/\s+/)[0][0] + br.name.trim().split(/\s+/)[1][0]).toUpperCase() : br.name.slice(0, 2).toUpperCase()) : 'BR';
                                return (
                                <tr key={br.id} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="py-3.5 px-4 font-bold text-slate-900">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-8 h-8 rounded-full bg-[#33077C] text-white flex items-center justify-center font-medium text-xs tracking-wider shrink-0 select-none shadow-xs">
                                        {initials}
                                      </div>
                                      <div>
                                        <span className="block text-slate-900 font-bold">{br.name}</span>
                                        <span className="text-[11px] font-bold text-[#33077C]">{br.code}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4 text-slate-700 font-medium">
                                    {br.contactPerson || '—'}
                                  </td>
                                  <td className="py-3.5 px-4 text-slate-600">
                                    <div>
                                      <span>{br.mobileNumber || '—'}</span>
                                      {br.email && <span className="block text-[11px] text-slate-400">{br.email}</span>}
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4 text-slate-700">
                                    {br.city || '—'}{br.state ? `, ${br.state}` : ''}
                                  </td>
                                  <td className="py-3.5 px-4">
                                    {br.status === 'Inactive' ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Inactive
                                      </span>
                                    ) : br.status === 'Suspended' ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-300">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Suspended
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-4 text-slate-500">
                                    {br.createdAt || '—'}
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

                  {/* ========================================================================= */}
                  {/* 2. CLIENTS TAB */}
                  {/* ========================================================================= */}
                  {activeTab === 'clients' && (
                    <div className="space-y-4">
                      {/* Search & Actions Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="relative flex-1 max-w-sm">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search Client..."
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#4309A2]/30 focus:border-[#4309A2]"
                          />
                        </div>

                        <button
                          onClick={() => setIsAddClientModalOpen(true)}
                          className="h-9 px-4 bg-[#4309A2] hover:bg-[#e67e00] text-white text-xs font-bold rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          + Add Client
                        </button>
                      </div>

                      {/* Clients Table */}
                      <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white shadow-2xs">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            <tr>
                              <th className="px-5 py-3.5">Client</th>
                              <th className="px-4 py-3.5">Plan</th>
                              <th className="px-4 py-3.5">Monthly Rate</th>
                              <th className="px-4 py-3.5">Status</th>
                              <th className="px-4 py-3.5">Joined</th>
                              <th className="px-5 py-3.5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredClients.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-12 text-center text-slate-400">
                                  No matching clients found.
                                </td>
                              </tr>
                            ) : (
                              filteredClients.map((client: any) => (
                                <tr key={client.id} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="px-5 py-3.5 font-semibold text-slate-900">
                                    <div>{client.company}</div>
                                    <div className="text-[11px] font-normal text-slate-400 mt-0.5">{client.name} - {client.email}</div>
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <span className="px-3 py-0.5 rounded-full bg-purple-50 text-[#33077C] font-bold text-[11px] border border-purple-200">
                                      {client.plan}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3.5 font-bold text-emerald-700">
                                    ${client.amount}/mo
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                      {client.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3.5 text-slate-600 font-medium">
                                    {client.joined}
                                  </td>
                                  <td className="px-5 py-3.5 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={() => showToast('info', 'Client Profile', `Opening ${client.company} details.`)}
                                        className="w-7 h-7 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 shadow-xs cursor-pointer"
                                        title="View Client"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => showToast('info', 'Change Plan', `Modify subscription for ${client.company}.`)}
                                        className="w-7 h-7 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 shadow-xs cursor-pointer"
                                        title="Change Plan"
                                      >
                                        <Layers className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => showToast('success', 'Renewed', `Renewed ${client.company} subscription.`)}
                                        className="w-7 h-7 bg-amber-500 hover:bg-amber-600 text-white rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 shadow-xs cursor-pointer"
                                        title="Renew"
                                      >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => showToast('warning', 'Suspended', `Suspended access for ${client.company}.`)}
                                        className="w-7 h-7 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 shadow-xs cursor-pointer"
                                        title="Suspend"
                                      >
                                        <Ban className="w-3.5 h-3.5" />
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
                  )}

                  {/* ========================================================================= */}
                  {/* 3. LEADS TAB */}
                  {/* ========================================================================= */}
                  {activeTab === 'leads' && (
                    <div className="space-y-4">
                      {/* Filters Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex flex-wrap items-center gap-2.5 flex-1 max-w-xl">
                          <div className="relative w-56">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Search leads..."
                              value={leadSearch}
                              onChange={(e) => setLeadSearch(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#4309A2]/30 focus:border-[#4309A2]"
                            />
                          </div>

                          {/* Custom Lead Status Dropdown */}
                          <div className="relative min-w-[155px]" ref={leadStatusDropdownRef}>
                            <button
                              type="button"
                              onClick={() => {
                                setIsLeadStatusDropdownOpen(!isLeadStatusDropdownOpen);
                                setIsLeadSourceDropdownOpen(false);
                              }}
                              className={`w-full h-9 px-3 bg-white border rounded-lg text-xs font-bold flex items-center justify-between shadow-2xs transition-all cursor-pointer text-left ${isLeadStatusDropdownOpen
                                ? 'border-[#4309A2] ring-2 ring-[#4309A2]/20 text-[#33077C]'
                                : 'border-slate-300 hover:border-slate-400 text-[#33077C]'
                                }`}
                            >
                              <span className="truncate">
                                {
                                  {
                                    ALL: 'Lead Status: All',
                                    NEW: 'New',
                                    CONTACTED: 'Contacted',
                                    INTERESTED: 'Interested',
                                    'FOLLOW-UP': 'Follow-up',
                                    QUALIFIED: 'Qualified',
                                    CONVERTED: 'Converted',
                                    LOST: 'Lost',
                                  }[leadStatusFilter] || 'Lead Status: All'
                                }
                              </span>
                              <ChevronDown
                                className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 shrink-0 ml-1.5 ${isLeadStatusDropdownOpen ? 'rotate-180 text-[#4309A2]' : ''
                                  }`}
                              />
                            </button>

                            {/* Dropdown Popup */}
                            {isLeadStatusDropdownOpen && (
                              <div className="dropdown-menu absolute left-0 top-full mt-1.5 z-50 bg-white rounded-xl border border-slate-200/90 shadow-xl p-1.5 space-y-0.5 w-full min-w-[160px]">
                                {[
                                  { id: 'ALL', label: 'Lead Status: All' },
                                  { id: 'NEW', label: 'New' },
                                  { id: 'CONTACTED', label: 'Contacted' },
                                  { id: 'INTERESTED', label: 'Interested' },
                                  { id: 'FOLLOW-UP', label: 'Follow-up' },
                                  { id: 'QUALIFIED', label: 'Qualified' },
                                  { id: 'CONVERTED', label: 'Converted' },
                                  { id: 'LOST', label: 'Lost' },
                                ].map((opt) => {
                                  const isItemActive = leadStatusFilter === opt.id;
                                  return (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      onClick={() => {
                                        setLeadStatusFilter(opt.id);
                                        setIsLeadStatusDropdownOpen(false);
                                      }}
                                      className={`dropdown-item w-full text-left px-3 py-2 rounded-lg text-xs transition-all cursor-pointer block ${isItemActive
                                        ? 'bg-[#E8F8F0] text-[#00A859] font-bold'
                                        : 'text-[#1E293B] hover:bg-slate-50 font-medium'
                                        }`}
                                    >
                                      {opt.label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Custom Lead Source Dropdown */}
                          <div className="relative min-w-[135px]" ref={leadSourceDropdownRef}>
                            <button
                              type="button"
                              onClick={() => {
                                setIsLeadSourceDropdownOpen(!isLeadSourceDropdownOpen);
                                setIsLeadStatusDropdownOpen(false);
                              }}
                              className={`w-full h-9 px-3 bg-white border rounded-lg text-xs font-bold flex items-center justify-between shadow-2xs transition-all cursor-pointer text-left ${isLeadSourceDropdownOpen
                                ? 'border-[#4309A2] ring-2 ring-[#4309A2]/20 text-[#33077C]'
                                : 'border-slate-300 hover:border-slate-400 text-[#33077C]'
                                }`}
                            >
                              <span className="truncate">
                                {
                                  {
                                    ALL: 'Source: All',
                                    WEBSITE: 'Website',
                                    LINKEDIN: 'LinkedIn',
                                    'DIRECT REFERRAL': 'Direct Referral',
                                    'GOOGLE ADS': 'Google Ads',
                                  }[leadSourceFilter] || 'Source: All'
                                }
                              </span>
                              <ChevronDown
                                className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 shrink-0 ml-1.5 ${isLeadSourceDropdownOpen ? 'rotate-180 text-[#4309A2]' : ''
                                  }`}
                              />
                            </button>

                            {/* Dropdown Popup */}
                            {isLeadSourceDropdownOpen && (
                              <div className="dropdown-menu absolute left-0 top-full mt-1.5 z-50 bg-white rounded-xl border border-slate-200/90 shadow-xl p-1.5 space-y-0.5 w-full min-w-[155px]">
                                {[
                                  { id: 'ALL', label: 'Source: All' },
                                  { id: 'WEBSITE', label: 'Website' },
                                  { id: 'LINKEDIN', label: 'LinkedIn' },
                                  { id: 'DIRECT REFERRAL', label: 'Direct Referral' },
                                  { id: 'GOOGLE ADS', label: 'Google Ads' },
                                ].map((opt) => {
                                  const isItemActive = leadSourceFilter === opt.id;
                                  return (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      onClick={() => {
                                        setLeadSourceFilter(opt.id);
                                        setIsLeadSourceDropdownOpen(false);
                                      }}
                                      className={`dropdown-item w-full text-left px-3 py-2 rounded-lg text-xs transition-all cursor-pointer block ${isItemActive
                                        ? 'bg-[#E8F8F0] text-[#00A859] font-bold'
                                        : 'text-[#1E293B] hover:bg-slate-50 font-medium'
                                        }`}
                                    >
                                      {opt.label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>

                        <span className="text-xs font-bold text-slate-500">
                          {filteredLeads.length} Leads
                        </span>
                      </div>

                      {/* Leads Table */}
                      <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white shadow-2xs">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            <tr>
                              <th className="px-5 py-3.5">Lead</th>
                              <th className="px-4 py-3.5">Company</th>
                              <th className="px-4 py-3.5">Requirements</th>
                              <th className="px-4 py-3.5">Status</th>
                              <th className="px-4 py-3.5">Source</th>
                              <th className="px-5 py-3.5">Assigned To</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredLeads.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-12 text-center text-slate-400">
                                  No leads match your filter.
                                </td>
                              </tr>
                            ) : (
                              filteredLeads.map((lead: any) => (
                                <tr key={lead.id} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="px-5 py-3.5 font-bold text-slate-900">
                                    {lead.name}
                                  </td>
                                  <td className="px-4 py-3.5 font-medium text-slate-700">
                                    {lead.company}
                                  </td>
                                  <td className="px-4 py-3.5 text-slate-500 max-w-xs truncate">
                                    {lead.requirements}
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${getLeadBadgeColor(lead.status)}`}>
                                      {lead.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3.5 text-slate-500">
                                    {lead.source}
                                  </td>
                                  <td className="px-5 py-3.5 font-semibold text-[#33077C]">
                                    {lead.assignedTo}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* ========================================================================= */}
                  {/* 4. PAYMENTS TAB */}
                  {/* ========================================================================= */}
                  {activeTab === 'payments' && (
                    <div className="space-y-5">
                      {/* Top Payments Metric Tiles */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                        <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Revenue</span>
                          <span className="text-xl font-black text-slate-900 mt-1 block">&#8377;8.5L</span>
                          <span className="text-[10px] text-slate-400 mt-0.5 block">Lifetime billed</span>
                        </div>
                        <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200">
                          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">Paid</span>
                          <span className="text-xl font-black text-emerald-700 mt-1 block">&#8377;7.2L</span>
                          <span className="text-[10px] text-emerald-600 mt-0.5 block">Completed transfers</span>
                        </div>
                        <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200">
                          <span className="text-[11px] font-bold text-[#4309A2] uppercase tracking-wider block">Pending</span>
                          <span className="text-xl font-black text-[#4309A2] mt-1 block">&#8377;1.1L</span>
                          <span className="text-[10px] text-amber-600 mt-0.5 block">Due in 7 days</span>
                        </div>
                        <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-200">
                          <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">Refunded</span>
                          <span className="text-xl font-black text-rose-700 mt-1 block">&#8377;20K</span>
                          <span className="text-[10px] text-rose-500 mt-0.5 block">Disputed / reversed</span>
                        </div>
                      </div>

                      {/* Invoices Table */}
                      <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white shadow-2xs">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            <tr>
                              <th className="px-5 py-3.5">Invoice ID</th>
                              <th className="px-4 py-3.5">Client</th>
                              <th className="px-4 py-3.5">Plan</th>
                              <th className="px-4 py-3.5">Amount</th>
                              <th className="px-4 py-3.5">Date</th>
                              <th className="px-4 py-3.5">Status</th>
                              <th className="px-5 py-3.5 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredPayments.map((pay) => (
                              <tr key={pay.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="px-5 py-3.5 font-bold text-slate-900">
                                  {pay.invoice}
                                </td>
                                <td className="px-4 py-3.5 font-semibold text-slate-800">
                                  {pay.client}
                                </td>
                                <td className="px-4 py-3.5 text-slate-600">
                                  {pay.plan}
                                </td>
                                <td className="px-4 py-3.5 font-black text-slate-900">
                                  {pay.amount}
                                </td>
                                <td className="px-4 py-3.5 text-slate-500">
                                  {pay.date}
                                </td>
                                <td className="px-4 py-3.5">
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${pay.status === 'Paid'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : pay.status === 'Pending'
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                                      }`}
                                  >
                                    {pay.status}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                  <button
                                    onClick={() => showToast('info', 'Invoice Download', `Downloading ${pay.invoice} receipt.`)}
                                    className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-md border border-slate-200 transition-colors cursor-pointer"
                                    title="Download Invoice"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* ========================================================================= */}
                  {/* 5. SUBSCRIPTIONS TAB */}
                  {/* ========================================================================= */}
                  {activeTab === 'subscriptions' && (
                    <div className="space-y-5">
                      {/* Top Subscriptions Metric Tiles */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                        <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200">
                          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Active</span>
                          <span className="text-xl font-black text-emerald-800 mt-1 block">18</span>
                          <span className="text-[10px] text-emerald-600 mt-0.5 block">Live accounts</span>
                        </div>
                        <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200">
                          <span className="text-[11px] font-bold text-[#4309A2] uppercase tracking-wider block">Expiring Soon</span>
                          <span className="text-xl font-black text-[#4309A2] mt-1 block">3</span>
                          <span className="text-[10px] text-amber-600 mt-0.5 block">Within 15 days</span>
                        </div>
                        <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-200">
                          <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">Cancelled</span>
                          <span className="text-xl font-black text-rose-700 mt-1 block">2</span>
                          <span className="text-[10px] text-rose-500 mt-0.5 block">Churned this quarter</span>
                        </div>
                        <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-200">
                          <span className="text-[11px] font-bold text-[#33077C] uppercase tracking-wider block">Trial</span>
                          <span className="text-xl font-black text-[#33077C] mt-1 block">5</span>
                          <span className="text-[10px] text-purple-600 mt-0.5 block">14-day pilots</span>
                        </div>
                      </div>

                      {/* Subscriptions Table */}
                      <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white shadow-2xs">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            <tr>
                              <th className="px-5 py-3.5">Client</th>
                              <th className="px-4 py-3.5">Plan</th>
                              <th className="px-4 py-3.5">MRR</th>
                              <th className="px-4 py-3.5">Start Date</th>
                              <th className="px-4 py-3.5">Renewal Date</th>
                              <th className="px-4 py-3.5">Status</th>
                              <th className="px-5 py-3.5 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {subscriptionsList.map((sub) => (
                              <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="px-5 py-3.5 font-bold text-slate-900">
                                  {sub.client}
                                </td>
                                <td className="px-4 py-3.5">
                                  <span className="px-3 py-0.5 rounded-full bg-purple-50 text-[#33077C] font-bold text-[11px] border border-purple-200">
                                    {sub.plan}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 font-bold text-emerald-700">
                                  {sub.mrr}
                                </td>
                                <td className="px-4 py-3.5 text-slate-600 font-medium">
                                  {sub.startDate}
                                </td>
                                <td className="px-4 py-3.5 text-slate-600 font-medium">
                                  {sub.renewalDate}
                                </td>
                                <td className="px-4 py-3.5">
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${sub.status === 'Active'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : sub.status === 'Expiring Soon'
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                        : sub.status === 'Trial'
                                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                                      }`}
                                  >
                                    {sub.status}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                  <button
                                    onClick={() => showToast('success', 'Manage Subscription', `Opening license renewal for ${sub.client}.`)}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                                  >
                                    Manage
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}



                  {/* ========================================================================= */}
                  {/* 7. ACTIVITIES TAB */}
                  {/* ========================================================================= */}
                  {activeTab === 'activities' && (
                    <div className="space-y-6">
                      {/* Activities Header & Category Filter Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900">
                              Product Activity Stream
                            </h4>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Live Feed
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Real-time CRM audit trail of payments, renewals, client updates, and conversions
                          </p>
                        </div>

                        {/* Custom Category Filter Dropdown */}
                        <div className="relative w-40" ref={activityDropdownRef}>
                          <button
                            type="button"
                            onClick={() => setIsActivityDropdownOpen(!isActivityDropdownOpen)}
                            className={`w-full h-9 px-3 bg-white border rounded-lg text-xs font-bold flex items-center justify-between shadow-2xs transition-all cursor-pointer text-left ${isActivityDropdownOpen
                              ? 'border-[#4309A2] ring-2 ring-[#4309A2]/20 text-[#33077C]'
                              : 'border-slate-300 hover:border-slate-400 text-[#33077C]'
                              }`}
                          >
                            <span className="truncate">
                              {
                                {
                                  ALL: 'All Activities',
                                  PAYMENTS: 'Payments',
                                  LEADS: 'Leads',
                                  SUBSCRIPTIONS: 'Subscriptions',
                                  DOCUMENTS: 'Documents',
                                }[activityFilter]
                              }
                            </span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 shrink-0 ml-1.5 ${isActivityDropdownOpen ? 'rotate-180 text-[#4309A2]' : ''
                                }`}
                            />
                          </button>

                          {/* Custom Dropdown Popup */}
                          {isActivityDropdownOpen && (
                            <div className="dropdown-menu absolute right-0 top-full mt-1.5 z-50 bg-white rounded-xl border border-slate-200/90 shadow-xl p-1.5 space-y-0.5 w-full min-w-[160px]">
                              {[
                                { id: 'ALL', label: 'All Activities' },
                                { id: 'PAYMENTS', label: 'Payments' },
                                { id: 'LEADS', label: 'Leads' },
                                { id: 'SUBSCRIPTIONS', label: 'Subscriptions' },
                                { id: 'DOCUMENTS', label: 'Documents' },
                              ].map((opt) => {
                                const isItemActive = activityFilter === opt.id;
                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => {
                                      setActivityFilter(opt.id as any);
                                      setIsActivityDropdownOpen(false);
                                    }}
                                    className={`dropdown-item w-full text-left px-3 py-2 rounded-lg text-xs transition-all cursor-pointer block ${isItemActive
                                      ? 'bg-[#E8F8F0] text-[#00A859] font-bold'
                                      : 'text-[#1E293B] hover:bg-slate-50 font-medium'
                                      }`}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Chronological Timeline Stream */}
                      <div className="space-y-8">
                        {['Today', 'Yesterday', 'Earlier this week'].map((group) => {
                          const items = filteredActivities.filter((a) => a.group === group);
                          if (items.length === 0) return null;
                          return (
                            <div key={group} className="space-y-4">
                              {/* Date Group Badge */}
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-100/80 text-slate-700 text-[11px] font-bold uppercase tracking-wider border border-slate-200/60">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {group}
                              </div>

                              {/* Timeline Cards Container */}
                              <div className="relative pl-6 space-y-4 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                                {items.map((act) => {
                                  const Icon = act.icon;
                                  return (
                                    <div
                                      key={act.id}
                                      className="relative group"
                                    >
                                      {/* Timeline Node Icon */}
                                      <div
                                        className={`absolute -left-6 top-3 w-6 h-6 rounded-full border-2 border-white shadow-xs flex items-center justify-center shrink-0 z-10 ${act.bgColor}`}
                                      >
                                        <Icon className="w-3 h-3" />
                                      </div>

                                      {/* Activity Card */}
                                      <div className="p-4 bg-white hover:bg-slate-50/50 rounded-xl border border-slate-200 hover:border-[#4309A2]/50 hover:shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="space-y-1 flex-1">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <h5 className="text-xs font-bold text-slate-900 tracking-tight">
                                              {act.title}
                                            </h5>
                                            <span
                                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${act.category === 'PAYMENTS'
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                : act.category === 'LEADS'
                                                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                                  : act.category === 'DOCUMENTS'
                                                    ? 'bg-orange-50 text-[#4309A2] border border-orange-100'
                                                    : 'bg-purple-50 text-purple-700 border border-purple-100'
                                                }`}
                                            >
                                              {act.categoryLabel}
                                            </span>
                                          </div>
                                          <p className="text-xs text-slate-500">
                                            {act.detail}
                                          </p>
                                        </div>

                                        {/* Meta Tags & Time */}
                                        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
                                          {act.amountTag && (
                                            <span className="px-3 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] font-mono border border-slate-200/60">
                                              {act.amountTag}
                                            </span>
                                          )}
                                          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 shrink-0">
                                            <Clock className="w-3 h-3 text-slate-400" />
                                            {act.time}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Attach Document Modal */}
      <Modal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        title={`Attach Document to ${currentProduct?.name}`}
      >
        <form onSubmit={handleUploadDocument} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Document Title / Spec Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Master SLA Agreement 2026"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#4309A2]/30 focus:border-[#4309A2] outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={docCategory}
                onChange={(e) => setDocCategory(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#4309A2]/30 focus:border-[#4309A2] outline-none"
              >
                <option value="Brief">Brief / Spec</option>
                <option value="Contract">Contract / MSA</option>
                <option value="Asset">Brand Asset</option>
                <option value="Report">Report / Audit</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                File Type
              </label>
              <select
                value={docFileType}
                onChange={(e) => setDocFileType(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#4309A2]/30 focus:border-[#4309A2] outline-none"
              >
                <option value="PDF">PDF</option>
                <option value="DOCX">DOCX</option>
                <option value="ZIP">ZIP Asset Pack</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsDocModalOpen(false)}
              className="h-11 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl cursor-pointer flex items-center justify-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-11 px-6 bg-[#4309A2] hover:bg-[#e67e00] text-white text-sm font-bold rounded-xl cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              Upload & Attach
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Client Modal */}
      <Modal
        isOpen={isAddClientModalOpen}
        onClose={() => setIsAddClientModalOpen(false)}
        title={`Onboard Client to ${currentProduct?.name}`}
      >
        <form onSubmit={handleAddClient} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Company Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Acme Corporation"
              value={newClientCompany}
              onChange={(e) => setNewClientCompany(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#4309A2]/30 focus:border-[#4309A2] outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Primary Contact *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Jane Doe"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#4309A2]/30 focus:border-[#4309A2] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Contact Email
              </label>
              <input
                type="email"
                placeholder="e.g. contact@acme.com"
                value={newClientEmail}
                onChange={(e) => setNewClientEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#4309A2]/30 focus:border-[#4309A2] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Subscription Plan
            </label>
            <select
              value={newClientPlan}
              onChange={(e) => setNewClientPlan(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#4309A2]/30 focus:border-[#4309A2] outline-none"
            >
              <option value="Yaa Bronze">Yaa Bronze ({'\u20B9'}999/mo)</option>
              <option value="Yaa Silver">Yaa Silver ({'\u20B9'}1,749/mo)</option>
              <option value="Yaa Gold">Yaa Gold ({'\u20B9'}2,499/mo)</option>
            </select>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAddClientModalOpen(false)}
              className="h-11 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl cursor-pointer flex items-center justify-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-11 px-6 bg-[#4309A2] hover:bg-[#e67e00] text-white text-sm font-bold rounded-xl cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              Complete Onboarding
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Product Info Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit ${currentProduct?.name} Configuration`}
      >
        <form onSubmit={handleUpdateProduct} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tagline
            </label>
            <input
              type="text"
              value={editTagline}
              onChange={(e) => setEditTagline(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#4309A2]/30 focus:border-[#4309A2] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#4309A2]/30 focus:border-[#4309A2] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Internal Architecture Notes
            </label>
            <textarea
              rows={4}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#4309A2]/30 focus:border-[#4309A2] outline-none font-mono"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="h-11 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl cursor-pointer flex items-center justify-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-11 px-6 bg-[#33077C] hover:bg-[#432eb5] text-white text-sm font-bold rounded-xl cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Branch Modal for Selected Product */}
      <Modal
        isOpen={isAddBranchModalOpen}
        onClose={() => setIsAddBranchModalOpen(false)}
        title={`Add Branch to ${currentProduct?.name}`}
        subtitle={<span className="text-white/80 text-xs">Create a regional branch under this product</span>}
        maxWidth="2xl"
        headerGradient={true}
        showBackIcon={true}
        hideCloseButton={true}
        onBack={() => setIsAddBranchModalOpen(false)}
      >
        <form onSubmit={handleCreateBranch} className="space-y-4 p-2 sm:p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Branch Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={branchForm.name}
                onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-2 focus:ring-[#4309A2]/10"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Branch Code
              </label>
              <input
                type="text"
                value={branchForm.code}
                onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })}
                className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-2 focus:ring-[#4309A2]/10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Contact Person
              </label>
              <input
                type="text"
                value={branchForm.contactPerson}
                onChange={(e) => setBranchForm({ ...branchForm, contactPerson: e.target.value })}
                className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-2 focus:ring-[#4309A2]/10"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Mobile Number
              </label>
              <input
                type="text"
                value={branchForm.mobileNumber}
                onChange={(e) => setBranchForm({ ...branchForm, mobileNumber: e.target.value })}
                className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-2 focus:ring-[#4309A2]/10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                WhatsApp Number
              </label>
              <input
                type="text"
                value={branchForm.whatsapp}
                onChange={(e) => setBranchForm({ ...branchForm, whatsapp: e.target.value })}
                className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-2 focus:ring-[#4309A2]/10"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Email
              </label>
              <input
                type="email"
                value={branchForm.email}
                onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })}
                className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-2 focus:ring-[#4309A2]/10"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Location
            </label>
            <input
              type="text"
              value={branchForm.location}
              onChange={(e) => setBranchForm({ ...branchForm, location: e.target.value })}
              className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-2 focus:ring-[#4309A2]/10"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAddBranchModalOpen(false)}
              className="h-10 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5 text-slate-500" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={branchSubmitting}
              className="h-10 px-5 bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold rounded-lg cursor-pointer transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm active:scale-[0.98]"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              {branchSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

interface DashboardViewProps {
  onNavigateTab?: (tab: string) => void;
  onOpenQuickModal?: (modalType: 'lead' | 'task' | 'content' | 'onboarding') => void;
  onOpenAddLead?: () => void;
  onOpenCreateTask?: () => void;
  onOpenCreateContent?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateTab,
  onOpenQuickModal,
  onOpenAddLead,
  onOpenCreateTask,
  onOpenCreateContent,
}) => {
  const navigate = useNavigate();
  const { currentUser, role, isAdmin, isSuperAdmin, markReminderCompleted } = useAuth();
  const { data: stats, isLoading: loading, refetch: loadStats } = useDashboardStats();

  const handleNavigate = (tab: string) => {
    if (onNavigateTab) {
      onNavigateTab(tab);
    } else {
      navigate(`/${tab}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-purple-200 border-t-[#4309A2] rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading workspace metrics...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // ADMIN DASHBOARD (STANDALONE FULL CODE)
  // ==========================================
  if (isAdmin && !isSuperAdmin) {
    return <AdminDashboardView />;
  }


  // ==========================================
  // STAFF DASHBOARD
  // ==========================================
  return (
    <div className="space-y-6">
      {/* Staff Welcome Banner */}
      <div className="p-6 rounded-lg bg-[#33077C] text-white shadow-sm border border-purple-950/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#4309A2] text-white">
              Staff Workspace
            </span>
            <span className="text-xs text-purple-200 font-medium">
              {currentUser?.department}
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
            Hello, {currentUser?.name}
          </h2>
          <p className="text-xs text-purple-200/90 mt-1">
            Here are your assigned leads, tasks due today, and scheduled follow-ups.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenQuickModal('lead')}
            className="px-4 py-2 bg-[#4309A2] hover:bg-[#e67e00] text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add New Lead
          </button>
          <button
            onClick={() => onNavigateTab('tasks')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-md border border-white/20 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            Today's Work
          </button>
        </div>
      </div>

      {/* Staff Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigateTab('leads')}
          className="card p-4 hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              My Assigned Leads
            </span>
            <div className="stat-icon group-hover:bg-[#4309A2]/20 transition-colors">
              <UsersRound className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#1A1A1A]">
              {stats?.myLeadsCount || 0}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">In Pipeline</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {stats?.myFollowUpsCount || 0} scheduled for today
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('tasks')}
          className="card p-4 hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              My Active Tasks
            </span>
            <div className="stat-icon group-hover:bg-[#4309A2]/20 transition-colors">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#1A1A1A]">
              {stats?.myTasksCount || 0}
            </span>
            <span className="text-[11px] font-semibold text-amber-600">
              {(stats?.myTodayTasks || []).length} Due Today
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Direct action items assigned to you
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('content')}
          className="card p-4 hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Pending Content
            </span>
            <div className="stat-icon group-hover:bg-[#4309A2]/20 transition-colors">
              <Film className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#1A1A1A]">
              {stats?.myPendingContentCount || 0}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Reels/Posts</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Designing, editing & approval
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('reminders')}
          className="card p-4 hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Upcoming Reminders
            </span>
            <div className="stat-icon group-hover:bg-[#4309A2]/20 transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#1A1A1A]">
              {stats?.myRemindersCount || 0}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600">Active</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Follow-ups & task deadlines
          </p>
        </div>
      </div>

      {/* Staff Operational Split: Today's Tasks & Today's Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Follow-ups */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#4309A2]" />
                Today's Lead Follow-ups
              </h3>
              <p className="text-xs text-slate-500">Calls and messages scheduled for today</p>
            </div>
            <button
              onClick={() => onNavigateTab('leads')}
              className="text-xs font-semibold text-[#4309A2] hover:underline cursor-pointer"
            >
              Open CRM -&gt;
            </button>
          </div>

          {(stats?.myFollowUps || []).length === 0 ? (
            <div className="p-8 text-center bg-[#F5F7FA] rounded-md border border-dashed border-[#E2E8F0]">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">No follow-ups scheduled for today</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Check upcoming leads in the CRM board.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {(stats?.myFollowUps || []).map((lead: any) => (
                <div
                  key={lead.id}
                  className="p-3 bg-[#F5F7FA] rounded-md border border-[#E2E8F0] hover:border-purple-300 transition-colors flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#1A1A1A]">{lead.name}</span>
                      <span className="text-xs text-slate-500">({lead.company})</span>
                      <Badge variant="purple" size="sm">{lead.interestedProductOrService}</Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                      {lead.feedback || lead.requirements || 'Pending discovery'}
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigateTab('leads')}
                    className="px-3 py-1 bg-[#33077C] text-white text-xs font-semibold rounded-md hover:bg-[#432eb5] transition-colors cursor-pointer"
                  >
                    View Lead
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's Tasks */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                Tasks Due Today
              </h3>
              <p className="text-xs text-slate-500">Work assignments requiring your attention</p>
            </div>
            <button
              onClick={() => onNavigateTab('tasks')}
              className="text-xs font-semibold text-[#4309A2] hover:underline cursor-pointer"
            >
              Task Board -&gt;
            </button>
          </div>

          {(stats?.myTodayTasks || []).length === 0 ? (
            <div className="p-8 text-center bg-[#F5F7FA] rounded-md border border-dashed border-[#E2E8F0]">
              <CheckSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">No urgent tasks due today</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Explore your broader task list.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {(stats?.myTodayTasks || []).map((task: any) => (
                <div
                  key={task.id}
                  className="p-3 bg-[#F5F7FA] rounded-md border border-[#E2E8F0] hover:border-amber-300 transition-colors flex items-center justify-between"
                >
                  <div className="flex-1 pr-3">
                    <p className="text-xs font-bold text-[#1A1A1A]">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono text-slate-500">{task.targetName}</span>
                      <Badge variant={task.priority === 'High' ? 'danger' : 'accent'} size="sm">
                        {task.priority}
                      </Badge>
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigateTab('tasks')}
                    className="px-3 py-1 bg-[#4309A2] hover:bg-[#e67e00] text-white text-xs font-semibold rounded-md transition-colors shrink-0 cursor-pointer"
                  >
                    Action
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
