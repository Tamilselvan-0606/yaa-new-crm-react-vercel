import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus,
  Search,
  ChevronDown,
  Eye,
  CheckCircle2,
  FileText,
  Send,
  X,
  Phone,
  MessageCircle,
  Mail,
  History,
  Pencil,
  Tag,
  Calendar,
  MoreVertical,
  Trash2,
  Printer,
  Loader2,
  Upload,
  Paperclip,
  AlertCircle,
  FileCheck,
  ArrowLeft,
  Check,
  Users,
  UsersRound,
} from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { useAuth } from '../../context/AuthContext';
import { useCustomers, useLeads, useProducts } from '../../hooks/useQueries';
import { EstimatePDFDocument } from '../../components/quotes/EstimatePDFDocument';
import { Button } from '../../components/common/Button';
import { SearchBar } from '../../components/common/SearchBar';
import { Pagination } from '../../components/common/Pagination';
import { FilterDropdown } from '../../components/common/FilterDropdown';

export interface Quotation {
  id: string;
  estimateNumber: string;
  referenceNumber: string;
  date: string;
  expiryDate: string;
  customerId?: string;
  customerName: string;
  customerCompany: string;
  customerEmail: string;
  customerPhone: string;
  customerLocation?: string;
  productName: string;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'EXPIRED' | 'DECLINED';
  amount: number;
  hasAttachment: boolean;
  notes?: string;
  items: {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    total: number;
  }[];
}

interface QuotesViewProps {
  initialCreateOpen?: boolean;
}

export const QuotesView: React.FC<QuotesViewProps> = ({ initialCreateOpen = false }) => {
  const { showToast, isSuperAdmin } = useAuth();
  const singularTerm = 'Quotation';
  const pluralTerm = 'Quotations';
  const lowerSingularTerm = 'quotation';
  const lowerPluralTerm = 'quotations';
  const { data: appCustomers = [] } = useCustomers();
  const { data: appLeads = [] } = useLeads();
  const { data: appProducts = [] } = useProducts();

  // Combine real app customers and leads for unified client selector
  const SUPER_ADMIN_ORGS = ['YaaCreations', 'Polihills', 'Enmin Labs'];
  const SUPER_ADMIN_ORGS_DATA: Record<string, { name: string; email: string; phone: string; location: string }> = {
    'yaacreations': {
      name: 'Alex Rivera',
      email: 'yaaadmin@gmail.com',
      phone: '+91 98765 43210',
      location: 'Hyderabad, TG',
    },
    'polihills': {
      name: 'Sarah Jenkins',
      email: 'info@polihills.com',
      phone: '+91 98765 43211',
      location: 'Hyderabad, TG',
    },
    'enmin labs': {
      name: 'Vikram Malhotra',
      email: 'hello@enminlabs.io',
      phone: '+91 98765 43212',
      location: 'Hyderabad, TG',
    },
  };

  const getOrgInfo = (companyName: string) => {
    const name = (companyName || '').trim().toLowerCase();
    if (name.includes('yaacreation') || name.includes('yaaconnect') || name.includes('yaa')) {
      return { code: 'YC-HQ', initials: 'YA', name: 'YaaCreations' };
    }
    if (name.includes('polihill')) {
      return { code: 'POLI-01', initials: 'PO', name: 'Polihills' };
    }
    if (name.includes('enmin')) {
      return { code: 'EML-02', initials: 'EN', name: 'Enmin Labs' };
    }
    const words = companyName.trim().split(/\s+/);
    const initials = words.map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'OG';
    return { code: 'ORG-01', initials, name: companyName };
  };

  const allClients = [
    ...appCustomers.map((c) => ({
      id: c.id,
      name: c.name,
      company: c.company,
      email: c.email,
      phone: c.phone,
      location: c.location,
      type: 'Customer' as const,
    })),
    ...appLeads.map((l) => ({
      id: l.id,
      name: l.name,
      company: l.company,
      email: l.email,
      phone: l.phone,
      location: l.location,
      type: 'Lead' as const,
    })),
  ];

  // Super Admin: restrict client dropdown to only the allowed orgs, one item per organization
  const superAdminClients = SUPER_ADMIN_ORGS.map((orgName, index) => {
    const existing = allClients.find(
      (c) => (c.company || '').trim().toLowerCase() === orgName.toLowerCase()
    );
    const fallback = SUPER_ADMIN_ORGS_DATA[orgName.toLowerCase()];
    return {
      id: existing ? existing.id : `super_org_${index + 1}`,
      name: existing?.name || fallback?.name || '',
      company: orgName,
      email: existing?.email || fallback?.email || '',
      phone: existing?.phone || fallback?.phone || '',
      location: existing?.location || fallback?.location || '',
      type: 'Customer' as const,
    };
  });

  const availableClients = isSuperAdmin ? superAdminClients : allClients;

  const SUPER_ADMIN_SAMPLE_QUOTES: Quotation[] = [
    {
      id: 'est_sa_1',
      estimateNumber: 'EST-10245',
      referenceNumber: 'REF-HF-089',
      date: '2 Sep 2026',
      expiryDate: '2 Oct 2026',
      customerId: 'cust_101',
      customerName: 'Alex Rivera',
      customerCompany: 'YaaCreations',
      customerEmail: 'yaaadmin@gmail.com',
      customerPhone: '+91 98765 43210',
      customerLocation: 'Hyderabad, TG',
      productName: 'YaaCreations',
      status: 'DRAFT',
      amount: 45000.00,
      hasAttachment: true,
      notes: 'Omnichannel routing setup with high-speed automated call routing SLA.',
      items: [
        { id: '1', description: 'Yaa Connect - Enterprise Scale License (Annual)', quantity: 1, unitPrice: 35000.00, total: 35000.00 },
        { id: '2', description: 'Dedicated Telecom Carrier Provisioning & Webhooks', quantity: 1, unitPrice: 10000.00, total: 10000.00 },
      ],
    },
    {
      id: 'est_sa_2',
      estimateNumber: 'EST-10246',
      referenceNumber: 'REF-NG-314',
      date: '28 Aug 2026',
      expiryDate: '28 Sep 2026',
      customerId: 'cust_102',
      customerName: 'Sarah Jenkins',
      customerCompany: 'Polihills',
      customerEmail: 'info@polihills.com',
      customerPhone: '+91 98765 43211',
      customerLocation: 'Hyderabad, TG',
      productName: 'Polihills',
      status: 'DRAFT',
      amount: 28500.00,
      hasAttachment: false,
      notes: 'Enterprise Authority & Omnichannel social campaign with 16 studio-grade reels.',
      items: [
        { id: '1', description: 'Enterprise Authority & Omnichannel Marketing (Q3)', quantity: 1, unitPrice: 24000.00, total: 24000.00 },
        { id: '2', description: '4K Studio Production & Influencer Gifting Kit', quantity: 1, unitPrice: 4500.00, total: 4500.00 },
      ],
    },
    {
      id: 'est_sa_3',
      estimateNumber: 'EST-10247',
      referenceNumber: 'REF-VL-921',
      date: '24 Aug 2026',
      expiryDate: '24 Sep 2026',
      customerId: 'lead_101',
      customerName: 'Vikram Malhotra',
      customerCompany: 'Enmin Labs',
      customerEmail: 'hello@enminlabs.io',
      customerPhone: '+91 98765 43212',
      customerLocation: 'Hyderabad, TG',
      productName: 'Enmin Labs',
      status: 'DRAFT',
      amount: 62000.00,
      hasAttachment: true,
      notes: 'Multi-warehouse customs document automation & telecom integration proposal.',
      items: [
        { id: '1', description: 'Multi-Warehouse Enterprise Hub Integration', quantity: 1, unitPrice: 50000.00, total: 50000.00 },
        { id: '2', description: 'Priority 24/7 SLA & Data Migration Onboarding', quantity: 1, unitPrice: 12000.00, total: 12000.00 },
      ],
    },
  ];

  const ADMIN_SAMPLE_QUOTES: Quotation[] = [
    {
      id: 'est_admin_1',
      estimateNumber: 'EST-10241',
      referenceNumber: 'REF-YC-001',
      date: '2 Sep 2026',
      expiryDate: '2 Oct 2026',
      customerId: 'prod_1',
      customerName: 'Marcus Vance',
      customerCompany: 'Yaa connect',
      customerEmail: 'sales@yaaconnect.com',
      customerPhone: '+91 98765 43210',
      customerLocation: 'Hyderabad, TG',
      productName: 'Yaa connect',
      status: 'ACCEPTED',
      amount: 45000.00,
      hasAttachment: true,
      notes: 'Enterprise Omnichannel Communication & Team Collaboration setup.',
      items: [
        { id: '1', description: 'Yaa Connect - Enterprise Scale Omnichannel Suite (Annual)', quantity: 1, unitPrice: 35000.00, total: 35000.00 },
        { id: '2', description: 'Telecom Gateway & Custom Webhook Routing SLA', quantity: 1, unitPrice: 10000.00, total: 10000.00 },
      ],
    },
    {
      id: 'est_admin_2',
      estimateNumber: 'EST-10242',
      referenceNumber: 'REF-DM-002',
      date: '28 Aug 2026',
      expiryDate: '28 Sep 2026',
      customerId: 'prod_2',
      customerName: 'Dr. Anita Sharma',
      customerCompany: 'Doc motez',
      customerEmail: 'contact@docmotez.com',
      customerPhone: '+91 98765 43211',
      customerLocation: 'Bangalore, KA',
      productName: 'Doc motez',
      status: 'SENT',
      amount: 28500.00,
      hasAttachment: false,
      notes: 'Automated Clinical Practice Management & Doctor Telehealth license.',
      items: [
        { id: '1', description: 'Doc Motez - Practice Professional (5 Practitioners)', quantity: 1, unitPrice: 24000.00, total: 24000.00 },
        { id: '2', description: 'EHR Record Storage & Telehealth Video Provisioning', quantity: 1, unitPrice: 4500.00, total: 4500.00 },
      ],
    },
    {
      id: 'est_admin_3',
      estimateNumber: 'EST-10243',
      referenceNumber: 'REF-DQ-003',
      date: '24 Aug 2026',
      expiryDate: '24 Sep 2026',
      customerId: 'prod_3',
      customerName: 'Dr. Ramesh Kumar',
      customerCompany: 'Doc DentQ',
      customerEmail: 'info@docdentq.com',
      customerPhone: '+91 98765 43212',
      customerLocation: 'Chennai, TN',
      productName: 'Doc DentQ',
      status: 'DRAFT',
      amount: 32000.00,
      hasAttachment: true,
      notes: 'Specialized Dental Clinic & Orthodontic Care System implementation.',
      items: [
        { id: '1', description: 'Doc DentQ - Orthodontic Pro (Multi-Chair & DICOM)', quantity: 1, unitPrice: 25000.00, total: 25000.00 },
        { id: '2', description: 'Digital Charting & WhatsApp Patient Recall Automation', quantity: 1, unitPrice: 7000.00, total: 7000.00 },
      ],
    },
    {
      id: 'est_admin_4',
      estimateNumber: 'EST-10244',
      referenceNumber: 'REF-AA-004',
      date: '15 Aug 2026',
      expiryDate: '15 Sep 2026',
      customerId: 'prod_4',
      customerName: 'Karthik Raja',
      customerCompany: 'Aarudam AI',
      customerEmail: 'enterprise@aarudamai.com',
      customerPhone: '+91 98765 43213',
      customerLocation: 'Hyderabad, TG',
      productName: 'Aarudam AI',
      status: 'SENT',
      amount: 62000.00,
      hasAttachment: true,
      notes: 'Autonomous Agent Intelligence & Enterprise NLP Solutions package.',
      items: [
        { id: '1', description: 'Aarudam AI - Autonomous Enterprise Model (1M Token)', quantity: 1, unitPrice: 50000.00, total: 50000.00 },
        { id: '2', description: 'Multi-Agent Swarm Setup & Custom Fine-Tuning SLA', quantity: 1, unitPrice: 12000.00, total: 12000.00 },
      ],
    },
    {
      id: 'est_admin_5',
      estimateNumber: 'EST-10245',
      referenceNumber: 'REF-TL-005',
      date: '10 Aug 2026',
      expiryDate: '10 Sep 2026',
      customerId: 'prod_5',
      customerName: 'Rajesh Nair',
      customerCompany: 'Turfylock',
      customerEmail: 'booking@turfylock.com',
      customerPhone: '+91 98765 43214',
      customerLocation: 'Kochi, KL',
      productName: 'Turfylock',
      status: 'ACCEPTED',
      amount: 18000.00,
      hasAttachment: false,
      notes: 'Sports Turf, Arena Booking & Slot Management Platform deployment.',
      items: [
        { id: '1', description: 'Turfylock - Multi-Sport Complex Automation (5 Turfs)', quantity: 1, unitPrice: 15000.00, total: 15000.00 },
        { id: '2', description: 'Floodlight IoT Relay Integration & WhatsApp Gateway', quantity: 1, unitPrice: 3000.00, total: 3000.00 },
      ],
    },
    {
      id: 'est_admin_6',
      estimateNumber: 'EST-10246',
      referenceNumber: 'REF-MK-006',
      date: '5 Aug 2026',
      expiryDate: '5 Sep 2026',
      customerId: 'prod_6',
      customerName: 'Priya Sundaram',
      customerCompany: 'Digital Marketing',
      customerEmail: 'growth@digitalgrowth.agency',
      customerPhone: '+91 98765 43215',
      customerLocation: 'Mumbai, MH',
      productName: 'Digital Marketing',
      status: 'EXPIRED',
      amount: 24000.00,
      hasAttachment: false,
      notes: 'Performance Growth, SEO & Omnichannel Campaign Agency package.',
      items: [
        { id: '1', description: 'Digital Marketing - Growth Velocity Engine (Monthly)', quantity: 1, unitPrice: 18000.00, total: 18000.00 },
        { id: '2', description: 'Studio Content Production & Meta/Google Ads Funnel', quantity: 1, unitPrice: 6000.00, total: 6000.00 },
      ],
    },
  ];

  const [quotes, setQuotes] = useState<Quotation[]>(() =>
    isSuperAdmin ? SUPER_ADMIN_SAMPLE_QUOTES : ADMIN_SAMPLE_QUOTES
  );

  const [activeStatusDropdownId, setActiveStatusDropdownId] = useState<string | null>(null);
  const [statusDropdownPos, setStatusDropdownPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null);

  const handleStatusChange = (quoteId: string, newStatus: Quotation['status']) => {
    setQuotes((prev) =>
      prev.map((q) => (q.id === quoteId ? { ...q, status: newStatus } : q))
    );
    setActiveStatusDropdownId(null);
    setStatusDropdownPos(null);
    showToast('success', 'Status Updated', `Quotation status set to ${newStatus}.`);
  };

  // Pending state - tracks what's typed/selected (not yet applied)
  const [pendingSearch, setPendingSearch] = useState('');
  const [pendingStatus, setPendingStatus] = useState<'ALL' | 'DRAFT' | 'SENT' | 'ACCEPTED' | 'EXPIRED' | 'DECLINED'>('ALL');
  // Applied state - what actually drives the filter (set only on Apply)
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedStatus, setAppliedStatus] = useState<'ALL' | 'DRAFT' | 'SENT' | 'ACCEPTED' | 'EXPIRED' | 'DECLINED'>('ALL');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const navigate = useNavigate();
  const location = useLocation();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(
    initialCreateOpen || location.pathname === '/quotes/new'
  );
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [actionDropdownPos, setActionDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, text: string, key: string) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.action-dropdown-btn') && !target.closest('.action-dropdown-popup')) {
        setOpenActionMenuId(null);
        setActionDropdownPos(null);
      }
      if (!target.closest('.status-dropdown-btn') && !target.closest('.status-dropdown-popup')) {
        setActiveStatusDropdownId(null);
        setStatusDropdownPos(null);
      }
    };
    const handleScrollOrResize = () => {
      if (openActionMenuId) {
        setOpenActionMenuId(null);
        setActionDropdownPos(null);
      }
      if (activeStatusDropdownId) {
        setActiveStatusDropdownId(null);
        setStatusDropdownPos(null);
      }
    };

    document.addEventListener('click', handleOutsideClick);
    window.addEventListener('scroll', handleScrollOrResize, { passive: true, capture: true });
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [openActionMenuId, activeStatusDropdownId]);

  useEffect(() => {
    if (location.pathname === '/quotes/new') {
      setIsCreateModalOpen(true);
    } else if (location.pathname === '/quotes' && !initialCreateOpen) {
      setIsCreateModalOpen(false);
    }
  }, [location.pathname, initialCreateOpen]);

  const handleOpenCreate = () => {
    setIsCreateModalOpen(true);
    navigate('/quotes/new');
  };

  const handleCloseCreate = () => {
    setIsCreateModalOpen(false);
    navigate('/quotes');
  };

  const handleSearchChange = (val: string) => {
    setPendingSearch(val);
  };

  const handleStatusFilter = (status: 'ALL' | 'DRAFT' | 'SENT' | 'ACCEPTED' | 'EXPIRED' | 'DECLINED') => {
    setPendingStatus(status);
  };

  const handleApply = () => {
    setAppliedSearch(pendingSearch);
    setAppliedStatus(pendingStatus);
    setCurrentPage(1);
  };

  const handleReset = () => {
    setPendingSearch('');
    setPendingStatus('ALL');
    setAppliedSearch('');
    setAppliedStatus('ALL');
    setCurrentPage(1);
  };

  const handlePrintEstimatePdf = async (quoteToPrint: Quotation) => {
    try {
      setIsGeneratingPdf(true);
      showToast('info', 'Generating PDF', `Preparing PDF for ${singularTerm} #${quoteToPrint.estimateNumber}...`);

      const docTitle = singularTerm;
      const blob = await pdf(<EstimatePDFDocument quotation={quoteToPrint} documentTitle={docTitle} />).toBlob();
      const url = URL.createObjectURL(blob);

      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.focus();
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = `${singularTerm}-${quoteToPrint.estimateNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      showToast('success', 'PDF Ready', `${singularTerm} #${quoteToPrint.estimateNumber} PDF generated successfully.`);
    } catch (err) {
      console.error('Failed to generate estimate PDF:', err);
      showToast('error', 'PDF Error', `Failed to generate PDF ${lowerSingularTerm}.`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // New estimate modal form states linked to actual application entities
  const [newEstimateNumber, setNewEstimateNumber] = useState(`EST-${Math.floor(10000 + Math.random() * 90000)}`);
  const [newReferenceNumber, setNewReferenceNumber] = useState(`REF-${Math.floor(1000 + Math.random() * 9000)}`);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [isCompanyProductDropdownOpen, setIsCompanyProductDropdownOpen] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const companyProductDropdownRef = useRef<HTMLDivElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (companyProductDropdownRef.current && !companyProductDropdownRef.current.contains(e.target as Node)) {
        setIsCompanyProductDropdownOpen(false);
      }
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setIsCompanyProductDropdownOpen(false);
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
      if (productSuiteDropdownRef.current && !productSuiteDropdownRef.current.contains(e.target as Node)) {
        setIsProductSuiteDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [customerName, setCustomerName] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [customerLocation, setCustomerLocation] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerGstId, setCustomerGstId] = useState('');

  // Quotation From (seller) details
  const [quotationFromCompany, setQuotationFromCompany] = useState('Yaa Creations');
  const [quotationFromLogo, setQuotationFromLogo] = useState('/yaa-creations-logo.png');
  const companyLogoInputRef = useRef<HTMLInputElement>(null);
  const [quotationFromGst, setQuotationFromGst] = useState('27AABCA1234F1Z8');
  const [quotationFromPhone, setQuotationFromPhone] = useState('+91 98765 43210');
  const [quotationFromEmail, setQuotationFromEmail] = useState('billing@yaacreations.com');
  const [quotationFromAddress, setQuotationFromAddress] = useState('Plot No 42, Silicon Valley High-Tech Zone, Madhapur, Hyderabad, TG 500081');
  const [isEditingFrom, setIsEditingFrom] = useState(false);
  const [quotationFromPan, setQuotationFromPan] = useState('ABCDE1234F');
  const [selectedProductSuiteName, setSelectedProductSuiteName] = useState('Yaa connect');
  const [isProductSuiteDropdownOpen, setIsProductSuiteDropdownOpen] = useState(false);
  const productSuiteDropdownRef = useRef<HTMLDivElement>(null);
  const [customerPan, setCustomerPan] = useState('');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setQuotationFromLogo(event.target.result as string);
          showToast('success', 'Logo Updated', 'Company logo updated successfully.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Dynamic Custom Quotation Fields
  const [customQuoteFields, setCustomQuoteFields] = useState<Array<{
    id: string;
    label: string;
    value: string;
    type: 'text' | 'date' | 'textarea';
  }>>([]);
  const [isAddFieldModalOpen, setIsAddFieldModalOpen] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

  // Date helpers for DD/MM/YYYY format with HTML date pickers
  const formatDateToDDMMYYYY = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const ddmmyyyyToIso = (val: string): string => {
    if (!val) return '';
    const parts = val.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return val;
  };

  const isoToDdmmyyyy = (val: string): string => {
    if (!val) return '';
    const parts = val.split('-');
    if (parts.length === 3) {
      return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
    }
    return val;
  };

  // Date, expiry, project name in DD/MM/YYYY format
  const [estimateDate, setEstimateDate] = useState(() => (isSuperAdmin ? '' : formatDateToDDMMYYYY(new Date())));
  const [expiryDate, setExpiryDate] = useState(() => {
    if (isSuperAdmin) return '';
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return formatDateToDDMMYYYY(d);
  });
  const [projectName, setProjectName] = useState(() => (isSuperAdmin ? '' : (appProducts[0]?.name || 'Yaa connect')));

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Dynamic Itemized Table state matching reference image
  interface FormItem {
    id: string;
    description: string;
    subDescription?: string;
    hsnCode?: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    taxPercent?: number;
    total: number;
  }

  const [itemsList, setItemsList] = useState<FormItem[]>([]);

  const [newNotes, setNewNotes] = useState('');

  // Handle client selection with automatic address and details population
  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = availableClients.find((c) => c.id === clientId);
    if (client) {
      const fallback = SUPER_ADMIN_ORGS_DATA[(client.company || '').trim().toLowerCase()];
      setCustomerName(client.name || fallback?.name || '');
      setCustomerCompany(client.company || '');
      setCustomerLocation(client.location || fallback?.location || '');
      setCustomerEmail(client.email || fallback?.email || '');
      setCustomerPhone(client.phone || fallback?.phone || '');
    } else {
      setCustomerName('');
      setCustomerCompany('');
      setCustomerLocation('');
      setCustomerEmail('');
      setCustomerPhone('');
    }
  };

  // 6 specific products for Admin dropdown
  const ADMIN_PRODUCTS = useMemo(
    () => [
      {
        id: 'prod_1',
        name: 'Yaa connect',
        company: 'Yaa connect',
        defaultContact: 'Alex Rivera',
        email: 'connect@yaaconnect.com',
        phone: '+91 98765 43210',
        location: 'Hyderabad, TG',
      },
      {
        id: 'prod_2',
        name: 'Doc motez',
        company: 'Doc motez',
        defaultContact: 'Dr. Anita Sharma',
        email: 'info@docmotez.com',
        phone: '+91 98765 43211',
        location: 'Bangalore, KA',
      },
      {
        id: 'prod_3',
        name: 'Doc DentQ',
        company: 'Doc DentQ',
        defaultContact: 'Dr. Ramesh Kumar',
        email: 'contact@docdentq.com',
        phone: '+91 98765 43213',
        location: 'Chennai, TN',
      },
      {
        id: 'prod_4',
        name: 'Aarudam AI',
        company: 'Aarudam AI',
        defaultContact: 'Karthik Raja',
        email: 'info@aarudamai.com',
        phone: '+91 98765 43214',
        location: 'Hyderabad, TG',
      },
      {
        id: 'prod_5',
        name: 'Turfylock',
        company: 'Turfylock',
        defaultContact: 'Rajesh Nair',
        email: 'booking@turfylock.com',
        phone: '+91 98765 43215',
        location: 'Kochi, KL',
      },
      {
        id: 'prod_6',
        name: 'Digital Marketing',
        company: 'Digital Marketing',
        defaultContact: 'Priya Sundaram',
        email: 'growth@digitalgrowth.agency',
        phone: '+91 98765 43216',
        location: 'Mumbai, MH',
      },
    ],
    []
  );

  const handleProductSelect = (prodId: string) => {
    setSelectedClientId(prodId);
    const prod = ADMIN_PRODUCTS.find((p) => p.id === prodId || p.name === prodId);
    if (prod) {
      setProjectName(prod.name);
      setCustomerCompany(prod.company);
      setCustomerName(prod.defaultContact);
      setCustomerEmail(prod.email);
      setCustomerPhone(prod.phone);
      setCustomerLocation(prod.location);
    }
  };

  // Item table manipulation helpers
  const handleAddItem = () => {
    const newItem: FormItem = {
      id: `item_${Date.now()}`,
      description: '',
      subDescription: '',
      hsnCode: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      taxPercent: 0,
      total: 0,
    };
    setItemsList([...itemsList, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    setItemsList(itemsList.filter((it) => it.id !== id));
  };

  const handleItemChange = (
    id: string,
    field: keyof FormItem,
    value: string | number
  ) => {
    setItemsList((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        const qty = Number(updated.quantity) || 0;
        const rate = Number(updated.unitPrice) || 0;
        const disc = Number(updated.discount) || 0;
        const taxRate = Number(updated.taxPercent) || 0;
        const taxable = Math.max(0, qty * rate - disc);
        const taxAmount = (taxable * taxRate) / 100;
        const lineTotal = taxable + taxAmount;
        return {
          ...updated,
          total: lineTotal,
        };
      })
    );
  };

  // Calculations matching reference image
  const subTotal = itemsList.reduce((sum, it) => sum + (it.total || 0), 0);
  const sampleTax1 = subTotal * 0.047; // 4.70%
  const sampleTax2 = subTotal * 0.07; // 7.00%
  const grandTotal = subTotal + sampleTax1 + sampleTax2;

  // Filtered quotes based on applied state
  const filteredQuotes = quotes.filter((q) => {
    // Super Admin: restrict to only 3 orgs
    if (isSuperAdmin) {
      const orgAllowed = SUPER_ADMIN_ORGS.some(
        (name) => q.customerCompany.trim().toLowerCase() === name.trim().toLowerCase()
      );
      if (!orgAllowed) return false;
    }

    const matchesSearch =
      q.estimateNumber.toLowerCase().includes(appliedSearch.toLowerCase()) ||
      q.customerName.toLowerCase().includes(appliedSearch.toLowerCase()) ||
      q.customerCompany.toLowerCase().includes(appliedSearch.toLowerCase()) ||
      q.referenceNumber.toLowerCase().includes(appliedSearch.toLowerCase()) ||
      q.productName.toLowerCase().includes(appliedSearch.toLowerCase());

    const matchesStatus = appliedStatus === 'ALL' || q.status === appliedStatus;
    return matchesSearch && matchesStatus;
  });

  const pagedQuotes = filteredQuotes.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredQuotes.map((q) => q.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCreateQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() && !customerCompany.trim()) {
      showToast(
        'error',
        isSuperAdmin ? 'Select Organization' : 'Select Company / Product Name',
        isSuperAdmin
          ? 'Please select or specify an organization name and company details.'
          : 'Please select a company/product name or enter details.'
      );
      return;
    }
    if (itemsList.length === 0 || subTotal <= 0) {
      showToast('error', 'Add Items', 'Please add at least one item with a valid rate.');
      return;
    }

    const created: Quotation = {
      id: `est_${Date.now()}`,
      estimateNumber: newEstimateNumber,
      referenceNumber: newReferenceNumber,
      date: estimateDate || formatDateToDDMMYYYY(new Date()),
      expiryDate: expiryDate || formatDateToDDMMYYYY(new Date(Date.now() + 30 * 86400000)),
      customerId: selectedClientId || undefined,
      customerName: customerName,
      customerCompany: customerCompany,
      customerEmail: customerEmail,
      customerPhone: customerPhone,
      customerLocation: customerLocation,
      productName: projectName || (isSuperAdmin ? 'Standard Provision' : 'General Service'),
      status: 'DRAFT',
      amount: grandTotal,
      hasAttachment: !!uploadedFile,
      notes: newNotes,
      items: itemsList.map((it) => ({
        id: it.id,
        description: it.description || 'Custom Service Provision',
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        discount: Number(it.discount) || 0,
        total: Number(it.total) || 0,
      })),
    };

    setQuotes([created, ...quotes]);
    handleCloseCreate();

    // Reset Form
    setNewEstimateNumber(`EST-${Math.floor(10000 + Math.random() * 90000)}`);
    setNewReferenceNumber(`REF-${Math.floor(1000 + Math.random() * 9000)}`);
    setSelectedClientId('');
    setCustomerName('');
    setCustomerCompany('');
    setCustomerLocation('');
    setCustomerEmail('');
    setCustomerPhone('');
    setUploadedFile(null);
    setEstimateDate(isSuperAdmin ? '' : formatDateToDDMMYYYY(new Date()));
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    setExpiryDate(isSuperAdmin ? '' : formatDateToDDMMYYYY(nextMonth));
    setNewNotes('');
    setItemsList([]);

    showToast('success', `${singularTerm} Created`, `${singularTerm} #${created.estimateNumber} successfully generated.`);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setQuotes((prev) => prev.filter((q) => !selectedIds.includes(q.id)));
    setSelectedIds([]);
    showToast('info', `Deleted ${pluralTerm}`, `Selected ${lowerPluralTerm} have been removed.`);
  };

  const getStatusBadge = (status: Quotation['status']) => {
    switch (status) {
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            ACCEPTED
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            DRAFT
          </span>
        );
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-[#33077C]/10 text-[#33077C] border border-[#33077C]/25">
            <span className="w-1.5 h-1.5 rounded-full bg-[#33077C]"></span>
            SENT
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            EXPIRED
          </span>
        );
      case 'DECLINED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            DECLINED
          </span>
        );
      default:
        return null;
    }
  };

  // =========================================================================
  // FULL PAGE QUOTATION DETAIL VIEW (Matching Invoice Detail View Layout)
  // =========================================================================
  if (selectedQuote) {
    const activeQuote = selectedQuote;

    // Calculate totals matching invoice breakdown
    const rawSubtotal = activeQuote.items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
    const rawDiscount = activeQuote.items.reduce((acc, item) => acc + (item.discount || 0), 0);
    const taxableSubtotal = Math.max(0, rawSubtotal - rawDiscount);
    const taxTotal = taxableSubtotal * 0.18; // Standard 18% GST matching invoice
    const halfTax = taxTotal / 2;
    const computedGrandTotal = taxableSubtotal + taxTotal;

    const handlePrintQuotePdf = async () => {
      try {
        setIsGeneratingPdf(true);
        const blob = await pdf(
          <EstimatePDFDocument
            quotation={activeQuote}
            documentTitle={singularTerm}
          />
        ).toBlob();
        const url = URL.createObjectURL(blob);

        const printWindow = window.open(url, '_blank');
        if (printWindow) {
          printWindow.focus();
        } else {
          const link = document.createElement('a');
          link.href = url;
          link.download = `${singularTerm}-${activeQuote.estimateNumber}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        showToast('success', 'PDF Generated', `Real PDF for #${activeQuote.estimateNumber} generated successfully.`);
      } catch (err) {
        console.error('Failed to generate PDF with @react-pdf/renderer:', err);
        showToast('error', 'PDF Generation Error', 'Could not generate PDF. Please check console.');
      } finally {
        setIsGeneratingPdf(false);
      }
    };

    return (
      <div className="space-y-6 print:space-y-4">
        {/* Top Full-Page Navigation & Actions Bar (Hidden on Print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#33077C] px-6 py-4 rounded-2xl shadow-md text-white print:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedQuote(null)}
              className="inline-flex items-center justify-center gap-2 h-10 px-4.5 bg-white text-[#33077C] hover:bg-slate-100 rounded-xl text-sm font-bold transition-all cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
            >
              <ArrowLeft className="w-4 h-4 text-[#33077C] stroke-[2.5]" />
              <span>Back</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={handlePrintQuotePdf}
              className="inline-flex items-center justify-center gap-2 h-10 px-5 bg-white text-[#33077C] hover:bg-slate-100 rounded-xl text-sm font-bold transition-all cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#33077C]" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4 text-[#33077C]" />
                  <span>Print {singularTerm}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Full-Width Document Canvas (Printable Target) */}
        <div className="invoice-printable-document max-w-5xl mx-auto w-full bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-12 space-y-8 print:p-0 print:border-none print:shadow-none print:space-y-6">
          {/* 1. Top Title */}
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {singularTerm}
            </h2>
          </div>

          {/* 2. Top Header Ribbon (Quotation Details on Left, Company Branding on Right) */}
          <div className="invoice-ribbon-header bg-white text-slate-900 flex flex-col-reverse sm:flex-row sm:items-start justify-between gap-6 break-inside-avoid print:flex-row pb-2">
            {/* Left: Quotation Number, Date & Reference Details */}
            <div className="text-left space-y-1.5 text-xs sm:text-sm shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium w-36">{singularTerm} Number:</span>
                <span className="font-bold text-slate-900">{activeQuote.estimateNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium w-36">{singularTerm} Date:</span>
                <span className="font-semibold text-slate-800">{activeQuote.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium w-36">Valid Until:</span>
                <span className="font-semibold text-slate-800">{activeQuote.expiryDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium w-36">Reference:</span>
                <span className="font-bold text-slate-800">{activeQuote.referenceNumber}</span>
              </div>
            </div>

            {/* Right: Company Logo */}
            <div className="flex items-center sm:justify-end print:justify-end gap-4 min-w-0 flex-1">
              <img
                src="/yaa-creations-logo.png"
                alt="Yaa Creations"
                className="h-16 sm:h-20 object-contain max-w-[280px]"
              />
            </div>
          </div>

          {/* 3. Dotted Divider */}
          <div className="border-b border-dashed border-slate-300 pt-1" />

          {/* 4. Two-Column Billing From & Bill To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 pt-1 break-inside-avoid">
            {/* Left: Billing From (Seller) */}
            <div className="space-y-2.5 text-xs sm:text-sm">
              <h3 className="text-base font-bold text-[#33077C] pb-1.5 border-b border-slate-100">
                Billing From:
              </h3>
              <div className="space-y-1.5">
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>Company Name</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">Yaa Creations</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>GSTIN / Tax ID</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">GSTIN: 27AABCA1234F1Z8</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>PAN Number</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">ABCDE1234F</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>Phone Number</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">+91 98200 12345</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>Email</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">billing@yaacreations.com</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>Company Address</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">402 Tech Hub, Business Bay, Mumbai, MH 400051</span>
                </div>
              </div>
            </div>

            {/* Right: Bill To (Client) */}
            <div className="space-y-2.5 text-xs sm:text-sm">
              <h3 className="text-base font-bold text-[#33077C] pb-1.5 border-b border-slate-100">
                Billing To:
              </h3>
              <div className="space-y-1.5">
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>Company Name</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{activeQuote.customerCompany || activeQuote.customerName}</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>GSTIN / Tax ID</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">27AABCT8892K1Z5</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>PAN Number</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">ABCDE9876G</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>Phone Number</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{activeQuote.customerPhone || 'N/A'}</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>Email</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{activeQuote.customerEmail}</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>Company Address</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">
                    {activeQuote.customerLocation && (activeQuote.customerLocation.includes('Suite') || activeQuote.customerLocation.includes('Hub') || activeQuote.customerLocation.includes('Building') || activeQuote.customerLocation.includes('Floor'))
                      ? activeQuote.customerLocation
                      : activeQuote.customerLocation
                        ? `Suite 750, Innovation Park, ${activeQuote.customerLocation} 75201`
                        : 'Suite 750, Innovation Park, Dallas, TX 75201'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Service Details / Line Items Table */}
          <div className="space-y-3 pt-2 break-inside-avoid">
            <h3 className="text-base font-bold text-[#33077C]">
              Service Details:
            </h3>

            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="bg-[#2B3991] text-white text-xs font-bold uppercase tracking-wider">
                    <th className="border border-white/30 px-2.5 sm:px-3 py-3 text-center w-10">#</th>
                    <th className="border border-white/30 px-3 py-3">Item</th>
                    <th className="border border-white/30 px-2 sm:px-2.5 py-3 text-center">GST</th>
                    <th className="border border-white/30 px-2 sm:px-2.5 py-3 text-center">Qty</th>
                    <th className="border border-white/30 px-2.5 sm:px-3 py-3 text-center">Rate</th>
                    <th className="border border-white/30 px-3 sm:px-4 py-3 text-right">Subtotal</th>
                    <th className="border border-white/30 px-2.5 sm:px-3 py-3 text-right">Discount</th>
                    <th className="border border-white/30 px-2.5 sm:px-3 py-3 text-right">CGST</th>
                    <th className="border border-white/30 px-2.5 sm:px-3 py-3 text-right">SGST</th>
                    <th className="border border-white/30 px-3 sm:px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {activeQuote.items.map((it, idx) => {
                    const itemSub = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
                    const itemDisc = Number(it.discount) || 0;
                    const itemTaxable = Math.max(0, itemSub - itemDisc);
                    const itemTax = (itemTaxable * 18) / 100;
                    const itemHalfTax = itemTax / 2;
                    const itemTotal = itemTaxable + itemTax;

                    return (
                      <tr
                        key={it.id || idx}
                        className={idx % 2 === 1 ? 'bg-slate-50/80' : 'bg-white'}
                      >
                        <td className="border border-slate-200 px-2.5 sm:px-3 py-3 text-center font-bold text-slate-700">
                          {idx + 1}
                        </td>
                        <td className="border border-slate-200 px-3 py-3">
                          <span className="font-bold text-slate-900 block font-sans">{it.description}</span>
                        </td>
                        <td className="border border-slate-200 px-2 sm:px-2.5 py-3 text-center text-slate-600 font-sans">
                          18%
                        </td>
                        <td className="border border-slate-200 px-2 sm:px-2.5 py-3 text-center font-bold text-slate-800 font-sans">
                          {it.quantity}
                        </td>
                        <td className="border border-slate-200 px-2.5 sm:px-3 py-3 text-center font-medium text-slate-800 font-sans">
                          ₹{it.unitPrice.toFixed(2)}
                        </td>
                        <td className="border border-slate-200 px-3 sm:px-4 py-3 text-right font-medium text-slate-800 font-sans">
                          ₹{itemSub.toFixed(2)}
                        </td>
                        <td className="border border-slate-200 px-2.5 sm:px-3 py-3 text-right font-medium text-slate-800 font-sans">
                          ₹{itemDisc.toFixed(2)}
                        </td>
                        <td className="border border-slate-200 px-2.5 sm:px-3 py-3 text-right text-slate-600 font-sans">
                          ₹{itemHalfTax.toFixed(2)}
                        </td>
                        <td className="border border-slate-200 px-2.5 sm:px-3 py-3 text-right text-slate-600 font-sans">
                          ₹{itemHalfTax.toFixed(2)}
                        </td>
                        <td className="border border-slate-200 px-3 sm:px-4 py-3 text-right font-bold text-slate-900 font-sans">
                          ₹{itemTotal.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5} className="border-0 p-0 bg-transparent"></td>
                    <td colSpan={5} className="border-0 p-0">
                      <div
                        className="invoice-summary-ribbon w-full bg-white border border-slate-200 text-slate-800 p-4 sm:p-5 font-sans !rounded-none"
                        style={{ borderRadius: 0 }}
                      >
                        <table className="w-full border-collapse">
                          <tbody>
                            <tr>
                              <td className="py-1.5 text-left font-medium text-xs sm:text-sm text-slate-600">Subtotal</td>
                              <td className="py-1.5 text-right font-semibold text-xs sm:text-sm text-slate-800 font-sans whitespace-nowrap">
                                ₹{rawSubtotal.toFixed(2)}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1.5 text-left font-medium text-xs sm:text-sm text-slate-600">Discount</td>
                              <td className="py-1.5 text-right font-semibold text-xs sm:text-sm text-slate-800 font-sans whitespace-nowrap">
                                {rawDiscount > 0 ? `-₹${rawDiscount.toFixed(2)}` : '₹0.00'}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1.5 text-left font-medium text-xs sm:text-sm text-slate-600">GST Total (18%)</td>
                              <td className="py-1.5 text-right font-semibold text-xs sm:text-sm text-slate-800 font-sans whitespace-nowrap">
                                ₹{taxTotal.toFixed(2)}
                              </td>
                            </tr>
                            <tr className="border-t border-slate-200">
                              <td className="pt-2.5 pb-1.5 text-left font-bold text-sm sm:text-base text-slate-800">Grand Total</td>
                              <td className="pt-2.5 pb-1.5 text-right font-bold text-base sm:text-lg text-slate-800 font-sans whitespace-nowrap">
                                ₹{computedGrandTotal.toFixed(2)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 6. Bottom Section: Authorized Signatory */}
          <div className="flex justify-end pt-6 break-inside-avoid">
            {/* Right Column: Signature Block */}
            <div className="space-y-2.5 text-xs sm:text-sm flex flex-col justify-end items-end pb-2">
              <div className="invoice-signature-section w-full max-w-sm flex flex-col items-end pt-2">
                <div className="text-right space-y-2 shrink-0 w-full">
                  <div className="flex items-center justify-end gap-2 text-xs text-slate-600 font-semibold">
                    <span className="text-slate-400">Date of Signing:</span>
                    <span className="font-bold text-slate-900">{activeQuote.date}</span>
                  </div>

                  {/* Hand-drawn Cursive Signature SVG graphic */}
                  <div className="flex justify-end py-1">
                    <div className="relative inline-block px-4 py-1">
                      <svg
                        className="w-44 h-12 text-[#33077C]"
                        viewBox="0 0 200 60"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10 40 C 30 10, 45 55, 60 25 C 75 -5, 85 45, 105 30 C 120 15, 130 50, 150 20 C 160 5, 175 35, 195 25"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M30 48 C 65 42, 110 50, 180 45"
                          stroke="#4309A2"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Stamp & Authorized Label */}
                  <div className="border-t border-slate-200 pt-2 flex flex-col items-end">
                    <span className="font-extrabold text-slate-900 text-sm tracking-tight block">
                      Yaa Creations
                    </span>
                    <div className="flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-[11px] text-slate-600 font-extrabold uppercase tracking-wider">
                        Authorized Signatory
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isCreateModalOpen) {
    return (
      <div className="space-y-6 animate-in fade-in duration-150">
        {/* Top Full-Page Navigation Header */}
        <div className="bg-[#33077C] rounded-2xl shadow-md p-5 sm:p-6 flex items-center justify-between gap-4 text-white">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleCloseCreate}
              className="inline-flex items-center justify-center gap-2 h-10 px-4.5 bg-white text-[#33077C] hover:bg-slate-100 rounded-xl text-sm font-bold transition-all cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
            >
              <ArrowLeft className="w-4 h-4 text-[#33077C] stroke-[2.5]" />
              <span>Back</span>
            </button>
            <span className="text-white/30 text-lg">|</span>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                New {singularTerm}
              </h1>
              <p className="text-xs sm:text-sm text-white/80 font-medium mt-0.5">
                Create, configure, and issue a formal project {lowerSingularTerm} and proposal.
              </p>
            </div>
          </div>
        </div>

        {/* Full-Page Form Canvas */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden p-6 sm:p-8">
          <form id="create-quote-fullpage-form" onSubmit={handleCreateQuote} className="space-y-6">
            {/* ===================================================================
                SUPER ADMIN FORM: Flat 3-column Grid (Restored)
                =================================================================== */}
            {isSuperAdmin && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Row 1, Col 1: Select Organization */}
                <div className="relative" ref={companyProductDropdownRef}>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Select Organization <span className="text-slate-500">*</span>
                  </label>
                  <div
                    onClick={() => {
                      setIsCompanyProductDropdownOpen(!isCompanyProductDropdownOpen);
                      setIsProjectDropdownOpen(false);
                    }}
                    className={`w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-[13px] font-medium flex items-center justify-between cursor-pointer transition-all ${isCompanyProductDropdownOpen
                        ? 'border-[#4309A2] ring-4 ring-[#4309A2]/10 text-slate-900'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                  >
                    <span className={selectedClientId ? 'text-slate-800 font-semibold truncate' : 'text-slate-400 font-medium truncate'}>
                      {selectedClientId
                        ? (() => {
                          const c = availableClients.find((cl) => cl.id === selectedClientId);
                          return c ? (c.company || c.name) : 'Select Organization';
                        })()
                        : 'Select Organization'}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isCompanyProductDropdownOpen ? 'rotate-180 text-[#33077C]' : ''
                        }`}
                    />
                  </div>

                  {isCompanyProductDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200/90 z-40 overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-60 overflow-y-auto p-1 space-y-0.5">
                      {availableClients.map((client) => {
                        const isSelected = selectedClientId === client.id;
                        return (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => {
                              handleClientSelect(client.id);
                              setIsCompanyProductDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs sm:text-[13px] transition-colors cursor-pointer flex items-center justify-between ${isSelected
                                ? 'bg-[#33077C]/10 text-[#33077C] font-bold'
                                : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                              }`}
                          >
                            <span>{client.company || client.name}</span>
                            {isSelected && <Check className="w-4 h-4 text-[#33077C] stroke-[2.5]" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Row 1, Col 2: Customer Name */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Customer Name <span className="text-slate-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                </div>


                {/* Row 2, Col 1: Quotation Number */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    {singularTerm} Number <span className="text-slate-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newEstimateNumber}
                    onChange={(e) => setNewEstimateNumber(e.target.value)}
                    required
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                </div>

                {/* Row 2, Col 2: Reference Number */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Reference Number <span className="text-slate-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newReferenceNumber}
                    onChange={(e) => setNewReferenceNumber(e.target.value)}
                    required
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                </div>

                {/* Row 3, Col 1: Date */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Date <span className="text-slate-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      placeholder="dd/mm/yyyy"
                      value={estimateDate}
                      onChange={(e) => setEstimateDate(e.target.value)}
                      required
                      className="w-full h-11 pl-4 pr-11 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                    />
                    <label className="absolute right-3 text-slate-400 hover:text-[#33077C] cursor-pointer transition-colors p-1">
                      <Calendar className="w-4 h-4" />
                      <input
                        type="date"
                        value={ddmmyyyyToIso(estimateDate)}
                        onChange={(e) => {
                          if (e.target.value) {
                            setEstimateDate(isoToDdmmyyyy(e.target.value));
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </label>
                  </div>
                </div>

                {/* Row 3, Col 2: Expiry Date */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Expiry Date <span className="text-slate-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      placeholder="dd/mm/yyyy"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      required
                      className="w-full h-11 pl-4 pr-11 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                    />
                    <label className="absolute right-3 text-slate-400 hover:text-[#33077C] cursor-pointer transition-colors p-1">
                      <Calendar className="w-4 h-4" />
                      <input
                        type="date"
                        value={ddmmyyyyToIso(expiryDate)}
                        onChange={(e) => {
                          if (e.target.value) {
                            setExpiryDate(isoToDdmmyyyy(e.target.value));
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </label>
                  </div>
                </div>

                {/* Row 3, Col 3: Email Communications */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Email Communications <span className="text-slate-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                </div>

                {/* Row 4, Col 1: Contact Number */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Contact Number
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                </div>

                {/* Row 4, Col 2: Address */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Address <span className="text-slate-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerLocation}
                    onChange={(e) => setCustomerLocation(e.target.value)}
                    placeholder=""
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                </div>

                {/* Super Admin: Note */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Looking forward for your business."
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                </div>
              </div>
            )}

            {/* ===================================================================
                ADMIN PANEL: TWO-CARD LAYOUT: Sale Configuration (LEFT) + Client & Billing (RIGHT)
                =================================================================== */}
            {!isSuperAdmin && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* ===================================================================== */}
                {/* CARD 1 (LEFT): Sale Configuration & Seller Details */}
                {/* ===================================================================== */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col">
                  {/* Card Header */}
                  <div className="px-7 py-4.5 bg-[#33077C] text-white flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
                    <div className="flex items-center gap-6">
                      <h2 className="text-base font-bold text-white tracking-tight whitespace-nowrap">
                        Sale Configuration
                      </h2>

                      {/* Product Suite / Brand Dropdown next to Sale Configuration (Admin only) */}
                      <div className="relative" ref={productSuiteDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setIsProductSuiteDropdownOpen(!isProductSuiteDropdownOpen)}
                          className="inline-flex items-center gap-2 h-8 px-3 bg-white/15 hover:bg-white/25 active:scale-[0.98] rounded-xl text-xs font-semibold text-white transition-all duration-150 cursor-pointer select-none shadow-xs"
                          title="Select Product / Brand"
                        >
                          <span className="max-w-[140px] sm:max-w-[170px] truncate font-bold">
                            {selectedProductSuiteName || 'Select Product / Suite'}
                          </span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-white/80 shrink-0 transition-transform duration-150 ${
                              isProductSuiteDropdownOpen ? 'rotate-180 text-white' : ''
                            }`}
                          />
                        </button>

                        {isProductSuiteDropdownOpen && (
                          <div className="absolute top-full left-0 mt-2 w-60 bg-white rounded-xl shadow-2xl border border-slate-200 p-1.5 z-50 overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
                            <div className="max-h-60 overflow-y-auto space-y-0.5">
                              {[
                                { id: 'yaa_connect', label: 'Yaa connect' },
                                { id: 'doc_motez', label: 'Doc motez' },
                                { id: 'doc_dentq', label: 'Doc DentQ' },
                                { id: 'aarudam_ai', label: 'Aarudam AI' },
                                { id: 'turfylock', label: 'Turfylock' },
                                { id: 'omniflow_erp', label: 'OmniFlow ERP' },
                              ].map((suite) => {
                                const isSelected = selectedProductSuiteName.toLowerCase() === suite.label.toLowerCase();
                                return (
                                  <button
                                    key={suite.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedProductSuiteName(suite.label);
                                      setIsProductSuiteDropdownOpen(false);
                                      showToast('success', 'Product Selected', `Selected product: ${suite.label}`);
                                    }}
                                    className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors text-left cursor-pointer ${
                                      isSelected
                                        ? 'bg-[#33077C]/10 text-[#33077C] font-bold'
                                        : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                                    }`}
                                  >
                                    <span className="truncate">{suite.label}</span>
                                    {isSelected && (
                                      <Check className="w-3.5 h-3.5 text-[#33077C] shrink-0 stroke-[2.5]" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingFrom(!isEditingFrom)}
                      className="h-8 px-3.5 bg-white hover:bg-slate-100 text-slate-800 border border-transparent rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all duration-200 cursor-pointer select-none active:scale-[0.98]"
                    >
                      {isEditingFrom ? 'Done' : 'Edit'}
                    </button>
                  </div>

                  {/* Card Body */}
                  <div className="p-8 space-y-8 flex-1">
                    {/* 1. Current Company & its details */}
                    <div className="space-y-4">
                      {!isEditingFrom ? (
                        <div className="flex items-start justify-between mb-2">
                          <div className="space-y-3.5 text-[13px] flex-1">
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                              <span className="font-bold text-slate-800">Company Logo</span>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-700 mr-1">:</span>
                                <img
                                  src={quotationFromLogo}
                                  alt="Company Logo"
                                  className="h-9 sm:h-10 object-contain rounded"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                              <span className="font-bold text-slate-800">Company Name</span>
                              <span className="text-slate-700">: {quotationFromCompany}</span>
                            </div>
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                              <span className="font-bold text-slate-800">GSTIN / Tax ID</span>
                              <span className="text-slate-700">: {quotationFromGst}</span>
                            </div>
                            {quotationFromPan && (
                              <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                                <span className="font-bold text-slate-800">PAN Number</span>
                                <span className="text-slate-700">: {quotationFromPan}</span>
                              </div>
                            )}
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                              <span className="font-bold text-slate-800">Phone Number</span>
                              <span className="text-slate-700">: {quotationFromPhone}</span>
                            </div>
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                              <span className="font-bold text-slate-800">Email</span>
                              <span className="text-slate-700">: {quotationFromEmail}</span>
                            </div>
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-start">
                              <span className="font-bold text-slate-800">Company Address</span>
                              <span className="text-slate-700 leading-relaxed">: {quotationFromAddress}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3.5 pt-1 text-sm">
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Company Logo</label>
                            <div className="mt-1.5 flex items-center gap-3">
                              <img
                                src={quotationFromLogo}
                                alt="Company Logo"
                                className="h-10 w-24 object-contain border border-slate-200 rounded-lg p-1 bg-white"
                              />
                              <input
                                type="file"
                                ref={companyLogoInputRef}
                                onChange={handleLogoUpload}
                                accept="image/*"
                                className="hidden"
                              />
                              <button
                                type="button"
                                onClick={() => companyLogoInputRef.current?.click()}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-semibold rounded-lg shadow-xs hover:shadow transition-all cursor-pointer select-none active:scale-[0.98]"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                <span>Change Logo</span>
                              </button>
                              {quotationFromLogo !== '/yaa-creations-logo.png' && (
                                <button
                                  type="button"
                                  onClick={() => setQuotationFromLogo('/yaa-creations-logo.png')}
                                  className="px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  Reset
                                </button>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Company Name</label>
                            <input
                              type="text"
                              value={quotationFromCompany}
                              onChange={(e) => setQuotationFromCompany(e.target.value)}
                              className="w-full mt-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tax ID / GSTIN</label>
                            <input
                              type="text"
                              value={quotationFromGst}
                              onChange={(e) => setQuotationFromGst(e.target.value)}
                              className="w-full mt-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">PAN Number</label>
                            <input
                              type="text"
                              value={quotationFromPan}
                              onChange={(e) => setQuotationFromPan(e.target.value)}
                              className="w-full mt-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Registered Address</label>
                            <input
                              type="text"
                              value={quotationFromAddress}
                              onChange={(e) => setQuotationFromAddress(e.target.value)}
                              className="w-full mt-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                            <input
                              type="text"
                              value={quotationFromPhone}
                              onChange={(e) => setQuotationFromPhone(e.target.value)}
                              className="w-full mt-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                            <input
                              type="email"
                              value={quotationFromEmail}
                              onChange={(e) => setQuotationFromEmail(e.target.value)}
                              className="w-full mt-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quotation Number</label>
                            <input
                              type="text"
                              value={newEstimateNumber}
                              onChange={(e) => setNewEstimateNumber(e.target.value)}
                              className="w-full mt-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quotation Date</label>
                            <input
                              type="text"
                              placeholder="dd/mm/yyyy"
                              value={estimateDate}
                              onChange={(e) => setEstimateDate(e.target.value)}
                              className="w-full mt-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expiry Date</label>
                            <input
                              type="text"
                              placeholder="dd/mm/yyyy"
                              value={expiryDate}
                              onChange={(e) => setExpiryDate(e.target.value)}
                              className="w-full mt-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reference Number</label>
                            <input
                              type="text"
                              value={newReferenceNumber}
                              onChange={(e) => setNewReferenceNumber(e.target.value)}
                              className="w-full mt-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 2. Quotation Metadata Dynamic Fields */}
                    <div className="space-y-4 pt-1">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Quotation Metadata &amp; Fields
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (isAddFieldModalOpen) {
                              if (newFieldLabel.trim()) {
                                setCustomQuoteFields([
                                  ...customQuoteFields,
                                  { id: `custom_${Date.now()}`, label: newFieldLabel.trim(), value: newFieldValue, type: 'text' }
                                ]);
                                setNewFieldLabel('');
                                setNewFieldValue('');
                                setIsAddFieldModalOpen(false);
                              }
                            } else {
                              setIsAddFieldModalOpen(true);
                            }
                          }}
                          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-[#33077C] hover:bg-[#432eb5] text-white text-sm font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer select-none"
                        >
                          <Plus className="w-4 h-4" strokeWidth={2.5} />
                          <span>{isAddFieldModalOpen ? 'Add Item' : 'Add Field'}</span>
                        </button>
                      </div>

                      <div className="space-y-3.5 text-[13px]">
                        <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                          <span className="font-bold text-slate-800">Quotation Number</span>
                          <span className="text-slate-700">: {newEstimateNumber}</span>
                        </div>
                        <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                          <span className="font-bold text-slate-800">Quotation Date</span>
                          <span className="text-slate-700">: {estimateDate}</span>
                        </div>
                        <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                          <span className="font-bold text-slate-800">Expiry Date</span>
                          <span className="text-slate-700">: {expiryDate}</span>
                        </div>
                        <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                          <span className="font-bold text-slate-800">Reference Number</span>
                          <span className="text-slate-700">: {newReferenceNumber || 'REF-QUOTATION-1'}</span>
                        </div>
                        {newNotes && (
                          <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                            <span className="font-bold text-slate-800">Note</span>
                            <span className="text-slate-700">: {newNotes}</span>
                          </div>
                        )}

                        {/* Additional Custom Fields */}
                        {customQuoteFields.map((field) => (
                          <div key={field.id} className="grid grid-cols-[140px_1fr] gap-2 items-center group">
                            <span className="font-bold text-slate-800">{field.label}</span>
                            <div className="text-slate-700 flex items-center justify-between">
                              <span>: {field.value}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomQuoteFields(customQuoteFields.filter((f) => f.id !== field.id));
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-all cursor-pointer shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {isAddFieldModalOpen && (
                        <div className="flex items-start gap-3 mt-2">
                          <div className="flex-1 grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={newFieldLabel}
                              onChange={(e) => setNewFieldLabel(e.target.value)}
                              placeholder="Field Label"
                              autoFocus
                              className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 outline-none transition-all shadow-2xs"
                            />
                            <input
                              type="text"
                              value={newFieldValue}
                              onChange={(e) => setNewFieldValue(e.target.value)}
                              placeholder="Value"
                              className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 outline-none transition-all shadow-2xs"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setNewFieldLabel('');
                              setNewFieldValue('');
                              setIsAddFieldModalOpen(false);
                            }}
                            className="p-2.5 mt-1 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ===================================================================== */}
                {/* CARD 2 (RIGHT): Client / Customer Assignment & Billing Info */}
                {/* ===================================================================== */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col">
                  {/* Card Header */}
                  <div className="px-7 py-4.5 bg-[#33077C] text-white flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <h2 className="text-base font-bold text-white tracking-tight">
                        Client &amp; Billing Party
                      </h2>
                    </div>
                    {selectedClientId && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClientId('');
                          setClientSearchQuery('');
                          setCustomerName('');
                          setCustomerCompany('');
                          setCustomerEmail('');
                          setCustomerPhone('');
                          setCustomerLocation('');
                          setCustomerGstId('');
                          setCustomerPan('');
                        }}
                        className="h-8 px-3.5 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-transparent rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all duration-200 cursor-pointer select-none active:scale-[0.98]"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-8 space-y-8 flex-1 flex flex-col">
                    {/* Client Searchable Dropdown */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Client / Customer <span className="text-rose-500">*</span>
                        </label>
                      </div>

                      <div className="relative" ref={clientDropdownRef}>
                        {/* Single Combined Search & Dropdown Input Box */}
                        <div className="relative flex items-center">
                          <Search className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                          <input
                            type="text"
                            value={
                              isCompanyProductDropdownOpen
                                ? clientSearchQuery
                                : (customerCompany || clientSearchQuery)
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              setClientSearchQuery(val);
                              if (!isCompanyProductDropdownOpen) setIsCompanyProductDropdownOpen(true);
                              if (customerCompany && val !== customerCompany) {
                                setSelectedClientId('');
                                setCustomerCompany('');
                              }
                            }}
                            onFocus={() => {
                              setIsCompanyProductDropdownOpen(true);
                              if (customerCompany && !clientSearchQuery) {
                                setClientSearchQuery(customerCompany);
                              }
                            }}
                            placeholder="Search or select client / customer..."
                            className={`w-full h-11 pl-11 pr-16 bg-white border rounded-xl text-sm font-semibold transition-all shadow-2xs outline-none ${
                              isCompanyProductDropdownOpen
                                ? 'border-[#4309A2] ring-4 ring-[#4309A2]/10 text-slate-900'
                                : 'border-slate-200 hover:border-slate-300 text-slate-800'
                            }`}
                          />
                          <div className="absolute right-3 flex items-center gap-1.5">
                            {(selectedClientId || clientSearchQuery) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedClientId('');
                                  setClientSearchQuery('');
                                  setCustomerName('');
                                  setCustomerCompany('');
                                  setCustomerEmail('');
                                  setCustomerPhone('');
                                  setCustomerLocation('');
                                  setCustomerGstId('');
                                  setCustomerPan('');
                                }}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                                title="Clear selection"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setIsCompanyProductDropdownOpen(!isCompanyProductDropdownOpen)}
                              className="p-1 text-slate-400 hover:text-[#4309A2] transition-colors cursor-pointer"
                            >
                              <ChevronDown
                                className={`w-4 h-4 transition-transform duration-200 ${
                                  isCompanyProductDropdownOpen ? 'rotate-180 text-[#4309A2]' : ''
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        {/* Dropdown Menu Popup: Direct List of Clients with filtered search */}
                        {isCompanyProductDropdownOpen && (
                          <div className="dropdown-menu absolute left-0 top-full mt-2 z-50 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 w-full min-w-[320px] space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
                            <div className="max-h-60 overflow-y-auto space-y-1 pt-0.5">
                              {(() => {
                                const q = clientSearchQuery.trim().toLowerCase();
                                const list = ADMIN_PRODUCTS.filter(
                                  (p) =>
                                    !q ||
                                    p.name.toLowerCase().includes(q) ||
                                    p.company.toLowerCase().includes(q) ||
                                    p.email.toLowerCase().includes(q)
                                );
                                if (list.length === 0) {
                                  return (
                                    <div className="py-4 text-center text-xs text-slate-400">
                                      No matching clients found for "{clientSearchQuery}".
                                    </div>
                                  );
                                }
                                return list.map((prod) => {
                                  const isSelected = selectedClientId === prod.id || selectedClientId === prod.name;
                                  return (
                                    <button
                                      key={prod.id}
                                      type="button"
                                      onClick={() => {
                                        handleProductSelect(prod.id);
                                        setClientSearchQuery(prod.name);
                                        setIsCompanyProductDropdownOpen(false);
                                        showToast('success', 'Client Selected', `Selected "${prod.name}".`);
                                      }}
                                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                        isSelected
                                          ? 'bg-[#33077C]/10 text-[#33077C] font-bold'
                                          : 'hover:bg-slate-50 text-slate-800 font-medium'
                                      }`}
                                    >
                                      <span className="truncate">{prod.name}</span>
                                      {isSelected && <Check className="w-4 h-4 text-[#33077C] stroke-[2.5] shrink-0" />}
                                    </button>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Selected Client Card Details or Empty State (Matching Invoices Layout) */}
                    {selectedClientId ? (
                      <div className="pt-2 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="space-y-3.5 text-[13px]">
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                              <span className="font-bold text-slate-800">Company Name</span>
                              <span className="text-slate-700">: {customerCompany || 'YaaCreations'}</span>
                            </div>
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                              <span className="font-bold text-slate-800">GSTIN / Tax ID</span>
                              <span className="text-slate-700">: {customerGstId || '27AABCT8892K1Z5'}</span>
                            </div>
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                              <span className="font-bold text-slate-800">PAN Number</span>
                              <span className="text-slate-700">: {customerPan || 'ABCDE1234F'}</span>
                            </div>
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                              <span className="font-bold text-slate-800">Phone Number</span>
                              <span className="text-slate-700">: {customerPhone || '+91 98765 43210'}</span>
                            </div>
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                              <span className="font-bold text-slate-800">Email</span>
                              <span className="text-slate-700">: {customerEmail || 'yaaadmin@gmail.com'}</span>
                            </div>
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                              <span className="font-bold text-slate-800">Industry</span>
                              <span className="text-slate-700">: Media, Branding &amp; Digital Creative Tech</span>
                            </div>
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                              <span className="font-bold text-slate-800">Location / Region</span>
                              <span className="text-slate-700">: {customerLocation || 'Hyderabad, TG'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/40 text-center space-y-3 flex-1 flex flex-col items-center justify-center">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#33077C] flex items-center justify-center mx-auto border border-purple-100 shadow-2xs">
                          <UsersRound className="w-6 h-6 text-[#4309A2]" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">No Client Selected Yet</h4>
                          <p className="text-xs text-slate-400 mt-0.5">Select a client above to preview billing info</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Row 7: Dynamic Itemized Table */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-[13px] font-bold text-slate-700 block">
                  Add Items & Pricing Details
                </label>
              </div>

              {/* Table matching reference image */}
              <div style={{ borderRadius: '4px' }} className="bg-white !rounded-[4px] border border-slate-200 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs table-fixed min-w-[950px] border-collapse border border-slate-200">
                    <colgroup>
                      <col className="w-auto min-w-[280px]" />
                      <col className="w-[85px]" />
                      <col className="w-[95px]" />
                      <col className="w-[120px]" />
                      <col className="w-[120px]" />
                      <col className="w-[130px]" />
                      <col className="w-[75px]" />
                    </colgroup>
                    <thead>
                      <tr className="bg-[#33077C] text-[11px] font-bold text-white tracking-wider uppercase">
                        <th className="py-4 px-5 text-left border border-[#33077C]/40 bg-[#33077C] text-white">PROJECTS</th>
                        <th className="py-4 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white">QTY</th>
                        <th className="py-4 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white">GST (%)</th>
                        <th className="py-4 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white">PRICE</th>
                        <th className="py-4 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white">DISCOUNT (₹)</th>
                        <th className="py-4 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white">TOTAL</th>
                        <th className="py-4 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                      {itemsList.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center bg-slate-50/40 border border-slate-200">
                            <p className="text-xs sm:text-[13px] text-slate-400 font-medium">
                              No items added yet. Click &quot;+ Add Item&quot; below to add line items.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        itemsList.map((item, idx) => (
                          <tr
                            key={item.id}
                            className={`hover:bg-slate-50/70 transition-colors ${idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}`}
                          >
                            {/* 1. Projects / Item Name & Description */}
                            <td className="px-5 py-4 align-top border border-slate-200">
                              <div className="space-y-1.5">
                                <input
                                  type="text"
                                  placeholder="Item name / title..."
                                  value={item.description}
                                  onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                  required
                                  style={{ borderRadius: '4px' }}
                                  className="w-full h-10 px-3.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] rounded-xl text-xs font-bold text-slate-900 focus:ring-3 focus:ring-[#4309A2]/10 outline-none shadow-2xs transition-all"
                                />
                                <input
                                  type="text"
                                  placeholder="+ Add Description (optional)..."
                                  value={item.subDescription || ''}
                                  onChange={(e) => handleItemChange(item.id, 'subDescription', e.target.value)}
                                  className="w-full px-2 py-0.5 text-[11px] text-slate-500 placeholder:text-slate-400 bg-transparent border-0 focus:ring-0 outline-none"
                                />
                              </div>
                            </td>

                            {/* 2. QTY */}
                            <td className="px-2 py-4 align-top border border-slate-200">
                              <input
                                type="number"
                                min="0.01"
                                step="any"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                                className="w-full h-10 px-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-bold text-center text-slate-900 focus:border-[#4309A2] focus:ring-3 focus:ring-[#4309A2]/10 outline-none shadow-2xs transition-all"
                              />
                            </td>

                            {/* 3. GST (%) */}
                            <td className="px-2 py-4 align-top border border-slate-200">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="any"
                                placeholder="0"
                                value={item.taxPercent || 0}
                                onChange={(e) => handleItemChange(item.id, 'taxPercent', Number(e.target.value))}
                                className="w-full h-10 px-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-center text-slate-800 focus:border-[#4309A2] focus:ring-3 focus:ring-[#4309A2]/10 outline-none shadow-2xs transition-all"
                              />
                            </td>

                            {/* 4. PRICE */}
                            <td className="px-2 py-4 align-top border border-slate-200">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.unitPrice}
                                onChange={(e) => handleItemChange(item.id, 'unitPrice', Number(e.target.value))}
                                className="w-full h-10 px-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-bold text-center text-slate-900 focus:border-[#4309A2] focus:ring-3 focus:ring-[#4309A2]/10 outline-none shadow-2xs transition-all"
                              />
                            </td>

                            {/* 5. DISCOUNT (₹) */}
                            <td className="px-2 py-4 align-top border border-slate-200">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.discount}
                                onChange={(e) => handleItemChange(item.id, 'discount', Number(e.target.value))}
                                className="w-full h-10 px-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-center text-slate-800 focus:border-[#4309A2] focus:ring-3 focus:ring-[#4309A2]/10 outline-none shadow-2xs transition-all"
                              />
                            </td>

                            {/* 6. TOTAL */}
                            <td className="px-2 py-4 align-top border border-slate-200">
                              <div className="h-10 flex items-center justify-center">
                                <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100/90 font-bold text-xs shadow-2xs font-sans min-w-[90px] text-center">
                                  ₹{item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </td>

                            {/* 7. ACTION */}
                            <td className="px-2 py-4 align-top border border-slate-200">
                              <div className="h-10 flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all cursor-pointer"
                                  title="Delete Line Item"
                                >
                                  <Trash2 className="w-4 h-4" />
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

              {/* Add Item Button placed below the item fields + Totals calculation */}
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4 pt-2">
                <button
                  type="button"
                  onClick={handleAddItem}
                  style={{ borderRadius: '4px' }}
                  className="h-11 px-6 bg-[#33077C] hover:bg-[#4309A2] text-white !rounded-[4px] text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Add Item</span>
                </button>
                <div style={{ borderRadius: '4px' }} className="w-full max-w-sm border border-slate-200 !rounded-[4px] overflow-hidden shadow-sm bg-white text-xs sm:text-[13px]">
                  <div className="flex justify-between items-center px-5 py-3 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">Sub Total</span>
                    <span className="font-bold text-slate-900">{subTotal.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center px-5 py-3 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">Sample Tax1 (4.70%)</span>
                    <span className="font-semibold text-slate-900">{sampleTax1.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center px-5 py-3 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">Sample Tax2 (7.00%)</span>
                    <span className="font-semibold text-slate-900">{sampleTax2.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center px-5 py-3.5 bg-[#33077C] text-white font-bold">
                    <span className="text-xs sm:text-sm uppercase tracking-wider">Total</span>
                    <span className="text-sm sm:text-base tracking-wide">{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Fields: Upload File & Scope Notes in 3-column alignment (non-superadmin) */}
            {!isSuperAdmin && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">

                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Scope / Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Looking forward for your business."
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Form Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCloseCreate}
                className="h-10 px-4.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-xl text-sm font-bold shadow-2xs transition-all duration-200 cursor-pointer select-none active:scale-[0.98] flex items-center gap-2"
              >
                <X className="w-4 h-4 text-slate-500 stroke-[2.2]" />
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                className="h-10 px-5.5 bg-[#33077C] hover:bg-[#4309A2] text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2 active:scale-[0.98]"
              >
                <Check className="w-4 h-4 text-white stroke-[2.5]" />
                <span>Save {singularTerm}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Action Toolbar */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Static Title matching Clients & Leads Center */}
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            All {pluralTerm}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Create, manage, and dispatch formal project {lowerPluralTerm} and proposals.
          </p>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenCreate}
            icon={<Plus className="w-4 h-4" strokeWidth={2.5} />}
          >
            New {singularTerm}
          </Button>
        </div>
      </div>

      {/* Reusable Filter / Search row */}
      <SearchBar
        value={pendingSearch}
        onChange={handleSearchChange}
        placeholder={isSuperAdmin ? 'Search quotation #, organization, ref...' : `Search ${lowerSingularTerm} #, client, company, ref...`}
        onSubmit={handleApply}
        onReset={handleReset}
        filterSlot={
          <FilterDropdown
            options={[
              { label: 'Status : All', value: 'ALL' },
              { label: 'Draft', value: 'DRAFT', dotColor: '#94a3b8' },
              { label: 'Sent', value: 'SENT', dotColor: '#33077C' },
              { label: 'Accepted', value: 'ACCEPTED', dotColor: '#10b981' },
              { label: 'Expired', value: 'EXPIRED', dotColor: '#f59e0b' },
              { label: 'Declined', value: 'DECLINED', dotColor: '#f43f5e' },
            ]}
            value={pendingStatus}
            onChange={handleStatusFilter}
          />
        }
        rightSlot={
          <span className="text-xs font-semibold text-slate-500 pr-2">
            Total {pluralTerm} :{' '}
            <span className="text-[#33077C] font-bold">{filteredQuotes.length}</span>
          </span>
        }
      />

      {/* Quotes Table matching 2nd Reference Image (Clients & Leads Grid Architecture) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200">
            <thead>
              <tr className="bg-[#33077C] text-[12px] font-bold text-white tracking-wider uppercase">
                {isSuperAdmin ? (
                  <>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">ORGANIZATION & CODE</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">QUOTATION NUM</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">CONTACT INFO</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">STATUS</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">AMOUNT</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">ACTION</th>
                  </>
                ) : (
                  <>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">{singularTerm.toUpperCase()}</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">CLIENT & REFERENCE</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">SOURCE & OFFERINGS</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">STATUS & VALIDITY</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-right">AMOUNT</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">ACTION</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 border border-slate-200">
                    <FileText className="w-9 h-9 mx-auto mb-2 opacity-30 text-orange-400" />
                    <p className="font-bold text-slate-700 text-sm">No {lowerPluralTerm} found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Generate a new {lowerSingularTerm} or adjust your search parameters.</p>
                  </td>
                </tr>
              ) : (
                pagedQuotes.map((quote) => (
                  <tr
                    key={quote.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    {isSuperAdmin ? (
                      <>
                        {/* 1. Organization & Code (as per reference design) */}
                        <td className="py-4 px-5 border border-slate-200">
                          {(() => {
                            const org = getOrgInfo(quote.customerCompany || 'YaaCreations');
                            return (
                              <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-full bg-[#33077C] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                                  {org.initials}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-900 text-sm">{org.name}</span>
                                    <span className="text-xs font-bold text-[#4309A2]">
                                      ({org.code})
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                                    {quote.customerName}
                                  </p>
                                </div>
                              </div>
                            );
                          })()}
                        </td>

                        {/* 2. Quotation Num */}
                        <td className="py-4 px-5 border border-slate-200">
                          <div>
                            <button
                              onClick={() => setSelectedQuote(quote)}
                              className="font-bold text-slate-900 hover:text-[#4309A2] text-sm transition-colors cursor-pointer text-left block"
                            >
                              {quote.estimateNumber}
                            </button>
                            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                              Ref: {quote.referenceNumber}
                            </div>
                          </div>
                        </td>

                        {/* 3. Contact Info Actions */}
                        <td className="py-4 px-5 border border-slate-200">
                          <div className="flex items-center gap-2">
                            {/* Phone */}
                            <div className="relative group">
                              <button
                                type="button"
                                onClick={(e) => handleCopy(e, quote.customerPhone, `${quote.id}-phone`)}
                                className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </button>
                              <div
                                className={`transition-all duration-200 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 text-white text-[11px] font-semibold rounded-lg shadow-lg whitespace-nowrap z-30 ${copiedKey === `${quote.id}-phone`
                                  ? 'opacity-100 bg-emerald-600 scale-100'
                                  : 'opacity-0 group-hover:opacity-100 bg-slate-900'
                                  }`}
                              >
                                {copiedKey === `${quote.id}-phone` ? 'Phone number copied' : (quote.customerPhone || 'No phone')}
                              </div>
                            </div>

                            {/* WhatsApp */}
                            <div className="relative group">
                              <button
                                type="button"
                                onClick={(e) => handleCopy(e, quote.customerPhone, `${quote.id}-wa`)}
                                className="w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>
                              <div
                                className={`transition-all duration-200 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 text-white text-[11px] font-semibold rounded-lg shadow-lg whitespace-nowrap z-30 ${copiedKey === `${quote.id}-wa`
                                  ? 'opacity-100 bg-emerald-600 scale-100'
                                  : 'opacity-0 group-hover:opacity-100 bg-slate-900'
                                  }`}
                              >
                                {copiedKey === `${quote.id}-wa` ? 'WhatsApp number copied' : (quote.customerPhone || 'No whatsapp')}
                              </div>
                            </div>

                            {/* Email */}
                            <div className="relative group">
                              <button
                                type="button"
                                onClick={(e) => handleCopy(e, quote.customerEmail, `${quote.id}-email`)}
                                className="w-8 h-8 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-600 flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </button>
                              <div
                                className={`transition-all duration-200 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 text-white text-[11px] font-semibold rounded-lg shadow-lg whitespace-nowrap z-30 ${copiedKey === `${quote.id}-email`
                                  ? 'opacity-100 bg-emerald-600 scale-100'
                                  : 'opacity-0 group-hover:opacity-100 bg-slate-900'
                                  }`}
                              >
                                {copiedKey === `${quote.id}-email` ? 'Email address copied' : (quote.customerEmail || 'No email')}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 4. Status Dropdown (matching reference 2nd image design & typography) */}
                        <td className="py-4 px-5 border border-slate-200">
                          <div className="inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activeStatusDropdownId === quote.id) {
                                  setActiveStatusDropdownId(null);
                                  setStatusDropdownPos(null);
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const spaceBelow = window.innerHeight - rect.bottom;
                                  const dropdownHeight = 220;

                                  if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
                                    setStatusDropdownPos({
                                      bottom: window.innerHeight - rect.top + 6,
                                      left: rect.left,
                                    });
                                  } else {
                                    setStatusDropdownPos({
                                      top: rect.bottom + 6,
                                      left: rect.left,
                                    });
                                  }
                                  setActiveStatusDropdownId(quote.id);
                                }
                              }}
                              className="status-dropdown-btn inline-flex items-center gap-2 px-1.5 py-1 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer select-none"
                            >
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${quote.status === 'ACCEPTED'
                                  ? 'bg-[#10b981]'
                                  : quote.status === 'SENT'
                                    ? 'bg-[#33077C]'
                                    : quote.status === 'DECLINED'
                                      ? 'bg-[#f43f5e]'
                                      : quote.status === 'EXPIRED'
                                        ? 'bg-[#f59e0b]'
                                        : 'bg-[#94a3b8]'
                                  }`}
                              />
                              <span className="text-xs font-semibold text-slate-800 tracking-tight">
                                {quote.status === 'SENT'
                                  ? 'Sent'
                                  : quote.status === 'DECLINED'
                                    ? 'Declined'
                                    : quote.status === 'ACCEPTED'
                                      ? 'Accepted'
                                      : quote.status === 'EXPIRED'
                                        ? 'Expired'
                                        : 'Draft'}
                              </span>
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 stroke-[2.2]" />
                            </button>
                          </div>
                        </td>

                        {/* 5. Amount */}
                        <td className="py-4 px-5 border border-slate-200">
                          <div className="font-bold text-slate-900 text-sm font-sans">
                            &#8377;{quote.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                            Dated: {quote.date}
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        {/* Estimate */}
                        <td className="py-4 px-5 border border-slate-200">
                          <div>
                            <button
                              onClick={() => setSelectedQuote(quote)}
                              className="font-bold text-slate-900 hover:text-orange-600 text-sm transition-colors cursor-pointer text-left block"
                            >
                              {quote.estimateNumber}
                            </button>
                            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                              {quote.productName || quote.customerCompany || 'Direct Client'}
                            </div>
                          </div>
                        </td>

                        {/* Client & Reference */}
                        <td className="py-4 px-5 border border-slate-200">
                          <div>
                            <div className="font-bold text-slate-900 text-xs sm:text-[13px] tracking-tight">
                              {quote.customerName}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                              {quote.customerName} &bull; Ref: {quote.referenceNumber}
                            </div>
                          </div>
                        </td>

                        {/* Source & Offerings */}
                        <td className="py-4 px-5 border border-slate-200">
                          <div className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                            <Tag className="w-3.5 h-3.5 text-slate-400" />
                            <span>Direct Quotation</span>
                          </div>
                          {quote.productName && (
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#33077C]"></span>
                              <span>{quote.productName}</span>
                            </div>
                          )}
                        </td>

                        {/* Status & Validity */}
                        <td className="py-4 px-5 border border-slate-200">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(quote.status)}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium mt-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>Expires: {quote.expiryDate}</span>
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="py-4 px-5 border border-slate-200 text-right">
                          <div className="font-bold text-slate-900 text-sm font-sans">
                            &#8377;{quote.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                            Dated: {quote.date}
                          </div>
                        </td>
                      </>
                    )}

                    {/* Action: Three Dots Dropdown (View, Send as mail, Print, Delete) */}
                    <td className="py-4 px-5 border border-slate-200 text-center relative action-dropdown-container">
                      <div className="inline-block text-left">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (openActionMenuId === quote.id) {
                              setOpenActionMenuId(null);
                              setActionDropdownPos(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const spaceBelow = window.innerHeight - rect.bottom;
                              const dropdownHeight = 230;

                              if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
                                // Open upwards if not enough space below
                                setActionDropdownPos({
                                  bottom: window.innerHeight - rect.top + 6,
                                  right: window.innerWidth - rect.right,
                                });
                              } else {
                                // Open downwards
                                setActionDropdownPos({
                                  top: rect.bottom + 6,
                                  right: window.innerWidth - rect.right,
                                });
                              }
                              setOpenActionMenuId(quote.id);
                            }
                          }}
                          className="action-dropdown-btn w-8 h-8 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-xs"
                          title="Actions"
                        >
                          <MoreVertical className="w-4 h-4 text-white" />
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

      {/* Pagination */}
      {filteredQuotes.length > 0 && (
        <Pagination
          total={filteredQuotes.length}
          currentPage={currentPage}
          pageSize={pageSize}
          pageSizeOptions={[5, 10, 20, 50]}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      )}
      {/* Action Dropdown Menu Portal / Fixed Overlay */}
      {openActionMenuId && actionDropdownPos && (() => {
        const targetQuote = quotes.find((q) => q.id === openActionMenuId);
        if (!targetQuote) return null;

        return (
          <div
            style={{
              position: 'fixed',
              ...(actionDropdownPos.bottom !== undefined
                ? { bottom: `${actionDropdownPos.bottom}px` }
                : { top: `${actionDropdownPos.top}px` }),
              right: `${actionDropdownPos.right}px`,
            }}
            className="w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[9999] action-dropdown-popup animate-in fade-in zoom-in-95 duration-100 text-left"
          >
            {/* 1. View */}
            <button
              type="button"
              onClick={() => {
                setOpenActionMenuId(null);
                setActionDropdownPos(null);
                setSelectedQuote(targetQuote);
              }}
              className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer group"
            >
              <span className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Eye className="w-3.5 h-3.5 stroke-[2.2]" />
              </span>
              <span className="group-hover:text-slate-900 transition-colors text-[13px]">View</span>
            </button>

            {/* 2. Send as an mail */}
            <button
              type="button"
              onClick={() => {
                showToast('success', 'Email Sent', `Quotation dispatched to ${targetQuote.customerEmail}`);
                setOpenActionMenuId(null);
                setActionDropdownPos(null);
              }}
              className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer group"
            >
              <span className="w-7 h-7 rounded-full bg-[#8B5CF6] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Mail className="w-3.5 h-3.5 stroke-[2.2]" />
              </span>
              <span className="group-hover:text-slate-900 transition-colors text-[13px]">Send</span>
            </button>

            {/* 3. Print */}
            <button
              type="button"
              onClick={() => {
                setOpenActionMenuId(null);
                setActionDropdownPos(null);
                handlePrintEstimatePdf(targetQuote);
              }}
              className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer group"
            >
              <span className="w-7 h-7 rounded-full bg-[#10B981] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Printer className="w-3.5 h-3.5 stroke-[2.2]" />
              </span>
              <span className="group-hover:text-slate-900 transition-colors text-[13px]">Print</span>
            </button>

            <div className="h-px bg-slate-100 my-1" />

            {/* 4. Delete */}
            <button
              type="button"
              onClick={() => {
                setQuotes((prev) => prev.filter((q) => q.id !== targetQuote.id));
                showToast('info', 'Quotation Deleted', `Quotation #${targetQuote.estimateNumber} removed.`);
                setOpenActionMenuId(null);
                setActionDropdownPos(null);
              }}
              className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer group"
            >
              <span className="w-7 h-7 rounded-full bg-[#EF4444] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Trash2 className="w-3.5 h-3.5 stroke-[2.2]" />
              </span>
              <span className="text-rose-600 font-bold text-[13px]">Delete</span>
            </button>
          </div>
        );
      })()}

      {/* Table Status Dropdown Menu Portal / Fixed Overlay */}
      {activeStatusDropdownId && statusDropdownPos && (() => {
        const targetQuote = quotes.find((q) => q.id === activeStatusDropdownId);
        if (!targetQuote) return null;

        return (
          <div
            style={{
              position: 'fixed',
              ...(statusDropdownPos.bottom !== undefined
                ? { bottom: `${statusDropdownPos.bottom}px` }
                : { top: `${statusDropdownPos.top}px` }),
              left: `${statusDropdownPos.left}px`,
            }}
            className="min-w-[155px] bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-[9999] status-dropdown-popup animate-in fade-in zoom-in-95 duration-100 text-left"
          >
            {(
              [
                { value: 'DRAFT', label: 'Draft', color: '#94a3b8' },
                { value: 'SENT', label: 'Sent', color: '#33077C' },
                { value: 'ACCEPTED', label: 'Accepted', color: '#10b981' },
                { value: 'EXPIRED', label: 'Expired', color: '#f59e0b' },
                { value: 'DECLINED', label: 'Declined', color: '#f43f5e' },
              ] as const
            ).map((opt) => {
              const isActive = targetQuote.status === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleStatusChange(targetQuote.id, opt.value)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold transition-colors text-left cursor-pointer ${isActive
                    ? 'bg-indigo-50 text-[#33077C]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: opt.color }}
                  />
                  <span className="flex-1">{opt.label}</span>
                  {isActive && (
                    <Check className="w-3.5 h-3.5 shrink-0 text-[#33077C] stroke-[2.5]" />
                  )}
                </button>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
};
