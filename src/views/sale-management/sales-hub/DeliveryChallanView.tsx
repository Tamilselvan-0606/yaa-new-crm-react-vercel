import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Truck,
  Plus,
  Search,
  Filter,
  Eye,
  Pencil,
  Printer,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileText,
  User,
  IndianRupee,
  TrendingUp,
  Calendar,
  Building2,
  ArrowRight,
  MoreVertical,
  X,
  Check,
  Download,
  Share2,
  Forward,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ShoppingBag,
  ShoppingCart,
  FileCheck,
  RefreshCw,
  Ban,
  Calculator,
  Settings,
  Image as ImageIcon,
  FileUp,
  FileEdit,
  AlignLeft,
  Paperclip,
  PlusCircle,
  ArrowLeft,
  Receipt,
  Package,
} from 'lucide-react';
import {
  useSalesManagementStore,
  SaleProductItem,
  SalesCustomer,
  SaleTransaction,
} from '../../../store/useSalesManagementStore';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { Pagination } from '../../../components/common/Pagination';
import { SearchBar } from '../../../components/common/SearchBar';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { exportTableToExcel } from '../../../utils/excelExport';
import { FileSpreadsheet } from 'lucide-react';

// Helper for dd/mm/yyyy <-> YYYY-MM-DD
const isoToDdmmyyyy = (iso?: string): string => {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return iso;
};

const STATE_OPTIONS = [
  'Select State',
  '33-Tamil Nadu',
  '29-Karnataka',
  '27-Maharashtra',
  '32-Kerala',
  '36-Telangana',
  '37-Andhra Pradesh',
  '07-Delhi',
  '24-Gujarat',
  '19-West Bengal',
  '09-Uttar Pradesh',
  '08-Rajasthan',
  '03-Punjab',
  '23-Madhya Pradesh',
  'Other',
];

const UNIT_OPTIONS = [
  'NONE',
  'PCS',
  'KG',
  'BOX',
  'LTR',
  'BAG',
  'PACK',
  'DOZEN',
  'CARTON',
  'CAN',
  'SET',
  'QUINTAL',
  'MTR',
];

const TAX_RATE_OPTIONS = [
  { label: 'Select Tax', rate: 0 },
  { label: 'Exempted (0%)', rate: 0 },
  { label: 'GST @ 0%', rate: 0 },
  { label: 'GST @ 5%', rate: 5 },
  { label: 'GST @ 12%', rate: 12 },
  { label: 'GST @ 18%', rate: 18 },
  { label: 'GST @ 28%', rate: 28 },
];

const PERIOD_FILTER_OPTIONS = [
  { label: 'This Month', value: 'This Month' },
  { label: 'Last 30 Days', value: 'Last 30 Days' },
  { label: 'This Quarter', value: 'This Quarter' },
  { label: 'This Financial Year', value: 'This Financial Year' },
  { label: 'All Time', value: 'All Time' },
];

const STATUS_FILTER_OPTIONS = [
  { label: 'All Statuses', value: 'ALL' },
  { label: 'Open', value: 'Open', dotColor: '#f59e0b' },
  { label: 'Converted', value: 'Converted', dotColor: '#10b981' },
  { label: 'Delivered', value: 'Delivered', dotColor: '#3b82f6' },
  { label: 'Cancelled', value: 'Cancelled', dotColor: '#ef4444' },
];

export interface ExtendedChallanItem extends SaleProductItem {
  unit?: string;
  discountAmount?: number;
  taxAmount?: number;
  category?: string;
  itemCode?: string;
  hsnCode?: string;
  description?: string;
}

export interface TableColumnSettings {
  showItemCategory: boolean;
  showItemCode: boolean;
  showHsnSac: boolean;
  showDescription: boolean;
  showDiscount: boolean;
}

export interface DeliveryChallanRecord {
  id: string;
  challanNo: string;
  referenceNo?: string;
  invoiceDate: string;
  dueDate: string;
  customerId: string;
  partyName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerCompany?: string;
  billingAddress: string;
  shippingAddress?: string;
  stateOfSupply?: string;
  items: ExtendedChallanItem[];
  subtotal: number;
  withGst?: boolean;
  gstType?: 'intra_state' | 'inter_state';
  cgst?: number;
  sgst?: number;
  igst?: number;
  discount?: number;
  taxAmount?: number;
  roundOff?: number;
  amount: number;
  balance: number;
  status: 'Open' | 'Converted' | 'Delivered' | 'Cancelled';
  convertedToInvoiceNo?: string;
  notes?: string;
  terms?: string;
  attachedImageName?: string;
  attachedDocName?: string;
  vehicleNo?: string;
  driverName?: string;
  driverPhone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChallanTabItem {
  id: string;
  title: string;
  num: number;
  formData: {
    customerId: string;
    partyName: string;
    customerPhone: string;
    customerEmail: string;
    customerCompany: string;
    billingAddress: string;
    challanNo: string;
    referenceNo: string;
    invoiceDate: string;
    dueDate: string;
    stateOfSupply: string;
    items: ExtendedChallanItem[];
    notes: string;
    terms: string;
    vehicleNo?: string;
  };
  editingChallan?: DeliveryChallanRecord | null;
  enableRoundOff?: boolean;
  manualRoundOff?: number | null;
  columnSettings?: TableColumnSettings;
}

const INITIAL_DELIVERY_CHALLANS: DeliveryChallanRecord[] = [
  {
    id: 'dc_1',
    challanNo: 'DC-2026-0001',
    referenceNo: '1',
    invoiceDate: '2026-10-05',
    dueDate: '2026-10-05',
    customerId: 'cust_1',
    partyName: 'Keerthivasan',
    customerPhone: '7839396753',
    customerCompany: 'Keerthi Retailers',
    billingAddress: 'No. 24 Bazaar Street, Salem, Tamil Nadu 636001',
    stateOfSupply: '33-Tamil Nadu',
    items: [
      {
        id: 'dci_1',
        productId: 'PROD_1001',
        productName: 'India Gate Super Basmati Rice (25 Kg Bag)',
        quantity: 10,
        unit: 'BAG',
        unitPrice: 2850,
        discountPercent: 0,
        taxPercent: 5,
        total: 29925,
      },
    ],
    subtotal: 28500,
    withGst: true,
    gstType: 'intra_state',
    cgst: 712.5,
    sgst: 712.5,
    igst: 0,
    discount: 0,
    taxAmount: 1425,
    roundOff: 0,
    amount: 29925,
    balance: 29925,
    status: 'Open',
    vehicleNo: 'TN-30-AZ-1122',
    terms: '1. Received the goods in good condition.\n2. Subject to Salem jurisdiction.\n3. Goods sent for delivery / inspection against invoice.',
    notes: 'Direct warehouse dispatch.',
    createdAt: '2026-10-05T09:30:00Z',
    updatedAt: '2026-10-05T09:30:00Z',
  },
];

interface DeliveryChallanViewProps {
  initialMode?: 'list' | 'form';
}

export const DeliveryChallanView: React.FC<DeliveryChallanViewProps> = ({
  initialMode = 'list',
}) => {
  const navigate = useNavigate();
  const { customers, stocks, saveCustomer, saveSale } = useSalesManagementStore();

  // Delivery Challan State with LocalStorage
  const [challans, setChallans] = useState<DeliveryChallanRecord[]>(() => {
    try {
      const saved = localStorage.getItem('yaa_crm_delivery_challans');
      return saved ? JSON.parse(saved) : INITIAL_DELIVERY_CHALLANS;
    } catch {
      return INITIAL_DELIVERY_CHALLANS;
    }
  });

  const persistChallans = (updated: DeliveryChallanRecord[]) => {
    setChallans(updated);
    try {
      localStorage.setItem('yaa_crm_delivery_challans', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save delivery challans', e);
    }
  };

  // View Mode: 'list' vs 'form'
  const [viewMode, setViewMode] = useState<'list' | 'form'>(initialMode);

  useEffect(() => {
    setViewMode(initialMode);
  }, [initialMode]);

  // Search & Filters
  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pendingPeriod, setPendingPeriod] = useState('This Month');
  const [appliedPeriod, setAppliedPeriod] = useState('This Month');
  const [pendingStatus, setPendingStatus] = useState('ALL');
  const [appliedStatus, setAppliedStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Party Dropdown
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
  const [partySearchQuery, setPartySearchQuery] = useState('');
  const partyDropdownRef = useRef<HTMLDivElement>(null);

  // Preview Modal
  const [previewChallan, setPreviewChallan] = useState<DeliveryChallanRecord | null>(null);

  // 3-Dots Action Dropdown State
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  // Bulk Convert Modal State
  const [isBulkConvertModalOpen, setIsBulkConvertModalOpen] = useState(false);
  const [selectedBulkChallanIds, setSelectedBulkChallanIds] = useState<string[]>([]);

  // Close dropdown on outside click or scroll
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.delivery-challan-action-dropdown-container') && !target.closest('.delivery-challan-action-dropdown-menu')) {
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
    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [activeDropdownId]);

  // Table Column Settings
  const [columnSettings, setColumnSettings] = useState<TableColumnSettings>({
    showItemCategory: false,
    showItemCode: false,
    showHsnSac: false,
    showDescription: false,
    showDiscount: true,
  });
  const [showColumnCustomizePopover, setShowColumnCustomizePopover] = useState(false);

  // Tax Mode
  const [priceTaxMode, setPriceTaxMode] = useState<'Without Tax' | 'With Tax'>('Without Tax');

  // Bottom action toggles
  const [showTermsSection, setShowTermsSection] = useState(true);
  const [showDescriptionSection, setShowDescriptionSection] = useState(false);
  const [showImageSection, setShowImageSection] = useState(false);
  const [showDocumentSection, setShowDocumentSection] = useState(false);
  const [attachedImageName, setAttachedImageName] = useState<string | null>(null);
  const [attachedDocName, setAttachedDocName] = useState<string | null>(null);

  // Round off
  const [enableRoundOff, setEnableRoundOff] = useState(true);
  const [manualRoundOff, setManualRoundOff] = useState<number | null>(null);

  // Quick Customer Creation Modal
  const [isQuickCustomerModalOpen, setIsQuickCustomerModalOpen] = useState(false);
  const [quickCustName, setQuickCustName] = useState('');
  const [quickCustPhone, setQuickCustPhone] = useState('');
  const [quickCustEmail, setQuickCustEmail] = useState('');
  const [quickCustCompany, setQuickCustCompany] = useState('');
  const [quickCustAddress, setQuickCustAddress] = useState('');

  // Auto-generate Challan Number
  const generateNextChallanNo = () => {
    const year = new Date().getFullYear();
    const count = challans.length + 1;
    return `DC-${year}-${String(count).padStart(4, '0')}`;
  };

  const generateNextRefNo = () => {
    return String(challans.length + 1);
  };

  // Initial Form Data State
  const createEmptyFormData = (customNum = 1) => ({
    customerId: '',
    partyName: '',
    customerPhone: '',
    customerEmail: '',
    customerCompany: '',
    billingAddress: '',
    challanNo: generateNextChallanNo(),
    referenceNo: String(customNum),
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    stateOfSupply: 'Select State',
    items: [
      {
        id: `dci_${Date.now()}_1`,
        productId: '',
        productName: '',
        quantity: 1,
        unit: 'NONE',
        unitPrice: 0,
        discountPercent: 0,
        taxPercent: 0,
        total: 0,
      },
      {
        id: `dci_${Date.now()}_2`,
        productId: '',
        productName: '',
        quantity: 1,
        unit: 'NONE',
        unitPrice: 0,
        discountPercent: 0,
        taxPercent: 0,
        total: 0,
      },
    ] as ExtendedChallanItem[],
    notes: '',
    terms: '1. Received the goods listed above in good order and condition.\n2. Delivery Challan does not transfer ownership until full payment is settled.\n3. Goods sent for inspection / delivery.',
    vehicleNo: '',
  });

  // Multiple Tabs System
  const [tabs, setTabs] = useState<ChallanTabItem[]>([
    {
      id: 'tab-1',
      title: 'Delivery Challan #1',
      num: 1,
      formData: createEmptyFormData(1),
      editingChallan: null,
      enableRoundOff: true,
      manualRoundOff: null,
      columnSettings: {
        showItemCategory: false,
        showItemCode: false,
        showHsnSac: false,
        showDescription: false,
        showDiscount: true,
      },
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');

  const activeTab = useMemo(() => {
    return tabs.find((t) => t.id === activeTabId) || tabs[0];
  }, [tabs, activeTabId]);

  const updateActiveTabFormData = (
    updater: (prev: typeof activeTab.formData) => typeof activeTab.formData
  ) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, formData: updater(t.formData) } : t))
    );
  };

  // Add Tab
  const handleAddNewTab = () => {
    const nextNum = tabs.length + 1;
    const newTabId = `tab-${Date.now()}`;
    const newTab: ChallanTabItem = {
      id: newTabId,
      title: `Delivery Challan #${nextNum}`,
      num: nextNum,
      formData: createEmptyFormData(nextNum),
      editingChallan: null,
      enableRoundOff: true,
      manualRoundOff: null,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTabId);
  };

  // Close Tab
  const handleCloseTab = (tabIdToClose: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      setViewMode('list');
      return;
    }
    const filtered = tabs.filter((t) => t.id !== tabIdToClose);
    setTabs(filtered);
    if (activeTabId === tabIdToClose) {
      setActiveTabId(filtered[filtered.length - 1].id);
    }
  };

  // Open Create Form
  const handleOpenCreateForm = () => {
    const nextNum = tabs.length;
    const newForm = createEmptyFormData(nextNum);
    setTabs([
      {
        id: `tab-${Date.now()}`,
        title: `Delivery Challan #${nextNum}`,
        num: nextNum,
        formData: newForm,
        editingChallan: null,
        enableRoundOff: true,
      },
    ]);
    setActiveTabId(`tab-${Date.now()}`);
    setViewMode('form');
  };

  // Open Edit Form
  const handleOpenEditForm = (challan: DeliveryChallanRecord) => {
    const editTabId = `tab-edit-${challan.id}`;
    const newTab: ChallanTabItem = {
      id: editTabId,
      title: `Edit ${challan.challanNo}`,
      num: 1,
      formData: {
        customerId: challan.customerId,
        partyName: challan.partyName,
        customerPhone: challan.customerPhone || '',
        customerEmail: challan.customerEmail || '',
        customerCompany: challan.customerCompany || '',
        billingAddress: challan.billingAddress || '',
        challanNo: challan.challanNo,
        referenceNo: challan.referenceNo || '1',
        invoiceDate: challan.invoiceDate,
        dueDate: challan.dueDate,
        stateOfSupply: challan.stateOfSupply || 'Select State',
        items: challan.items.length > 0 ? challan.items : createEmptyFormData().items,
        notes: challan.notes || '',
        terms: challan.terms || '',
        vehicleNo: challan.vehicleNo || '',
      },
      editingChallan: challan,
      enableRoundOff: challan.roundOff !== undefined,
      manualRoundOff: challan.roundOff || null,
    };
    setTabs([newTab]);
    setActiveTabId(editTabId);
    setAttachedImageName(challan.attachedImageName || null);
    setAttachedDocName(challan.attachedDocName || null);
    setViewMode('form');
  };

  // Select Customer
  const handleSelectCustomer = (customer: SalesCustomer) => {
    updateActiveTabFormData((prev) => ({
      ...prev,
      customerId: customer.id,
      partyName: customer.name,
      customerPhone: customer.phone || '',
      customerEmail: customer.email || '',
      customerCompany: customer.company || '',
      billingAddress: customer.billingAddress || customer.address || '',
      stateOfSupply: customer.state ? `${customer.state}` : prev.stateOfSupply,
    }));
    setPartySearchQuery(customer.name);
    setIsPartyDropdownOpen(false);
  };

  // Quick Customer Creation
  const handleSaveQuickCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustName.trim()) {
      toast.error('Please enter customer name');
      return;
    }
    const newCust: SalesCustomer = {
      id: `cust_${Date.now()}`,
      customerCode: `CUS-${Math.floor(1000 + Math.random() * 9000)}`,
      name: quickCustName.trim(),
      phone: quickCustPhone.trim(),
      email: quickCustEmail.trim(),
      company: quickCustCompany.trim(),
      customerType: 'Business',
      address: quickCustAddress.trim(),
      billingAddress: quickCustAddress.trim(),
      shippingAddress: quickCustAddress.trim(),
      sameAsBilling: true,
      city: 'Chennai',
      state: 'Tamil Nadu',
      country: 'India',
      pincode: '600001',
      creditLimit: 50000,
      paymentTerms: 'Net 15 Days',
      openingBalance: 0,
      preferredPaymentMethod: 'Cash',
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveCustomer(newCust);
    handleSelectCustomer(newCust);
    setIsQuickCustomerModalOpen(false);
    setQuickCustName('');
    setQuickCustPhone('');
    setQuickCustEmail('');
    setQuickCustCompany('');
    setQuickCustAddress('');
    toast.success(`Party "${newCust.name}" added & selected!`);
  };

  // Handle Items Table Changes
  const handleItemChange = (index: number, field: keyof ExtendedChallanItem, value: any) => {
    updateActiveTabFormData((prev) => {
      const updatedItems = [...prev.items];
      const target = { ...updatedItems[index], [field]: value };

      if (field === 'productId') {
        const foundStock = stocks.find((s) => s.productId === value || s.id === value);
        if (foundStock) {
          target.productName = foundStock.productName;
          target.unitPrice = foundStock.unitPrice || 0;
          target.unit = foundStock.unit || 'PCS';
          target.category = foundStock.category;
          target.sku = foundStock.sku;
        }
      }

      const qty = Number(target.quantity) || 0;
      const price = Number(target.unitPrice) || 0;
      const discPct = Number(target.discountPercent) || 0;
      const taxPct = Number(target.taxPercent) || 0;

      const gross = qty * price;
      const discAmt = (gross * discPct) / 100;
      const taxable = Math.max(0, gross - discAmt);
      const taxAmt = (taxable * taxPct) / 100;
      const lineTotal = taxable + taxAmt;

      target.discountAmount = discAmt;
      target.taxAmount = taxAmt;
      target.total = lineTotal;

      updatedItems[index] = target;
      return { ...prev, items: updatedItems };
    });
  };

  const handleAddRow = () => {
    updateActiveTabFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `dci_${Date.now()}_${prev.items.length + 1}`,
          productId: '',
          productName: '',
          quantity: 1,
          unit: 'NONE',
          unitPrice: 0,
          discountPercent: 0,
          taxPercent: 0,
          total: 0,
        },
      ],
    }));
  };

  const handleRemoveRow = (index: number) => {
    if (activeTab.formData.items.length <= 1) {
      toast.info('At least one item row is required.');
      return;
    }
    updateActiveTabFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  };

  // Computed Totals for Current Form
  const currentCalculations = useMemo(() => {
    const items = activeTab.formData.items || [];
    let totalQty = 0;
    let subtotalGross = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    items.forEach((item) => {
      const q = Number(item.quantity) || 0;
      const p = Number(item.unitPrice) || 0;
      const d = Number(item.discountPercent) || 0;
      const t = Number(item.taxPercent) || 0;

      const gross = q * p;
      const disc = (gross * d) / 100;
      const taxable = gross - disc;
      const tax = (taxable * t) / 100;

      totalQty += q;
      subtotalGross += gross;
      totalDiscount += disc;
      totalTax += tax;
    });

    const netTaxable = subtotalGross - totalDiscount;
    const exactGrandTotal = netTaxable + totalTax;

    let roundOff = 0;
    let finalAmount = exactGrandTotal;

    if (enableRoundOff) {
      if (manualRoundOff !== null && !isNaN(manualRoundOff)) {
        roundOff = manualRoundOff;
        finalAmount = exactGrandTotal + roundOff;
      } else {
        const rounded = Math.round(exactGrandTotal);
        roundOff = Number((rounded - exactGrandTotal).toFixed(2));
        finalAmount = rounded;
      }
    }

    return {
      totalQty,
      subtotalGross,
      totalDiscount,
      netTaxable,
      totalTax,
      roundOff,
      finalAmount,
    };
  }, [activeTab.formData.items, enableRoundOff, manualRoundOff]);

  // Save Delivery Challan Handler
  const handleSaveChallan = (andConvert = false) => {
    const form = activeTab.formData;
    if (!form.partyName.trim()) {
      toast.error('Please select or enter a party name');
      return;
    }
    if (!form.items.some((i) => i.productName && Number(i.quantity) > 0)) {
      toast.error('Please enter at least one item with valid name and quantity');
      return;
    }

    const challanId = activeTab.editingChallan ? activeTab.editingChallan.id : `dc_${Date.now()}`;
    const newChallan: DeliveryChallanRecord = {
      id: challanId,
      challanNo: form.challanNo || generateNextChallanNo(),
      referenceNo: form.referenceNo || '1',
      invoiceDate: form.invoiceDate,
      dueDate: form.dueDate,
      customerId: form.customerId || `temp_cust_${Date.now()}`,
      partyName: form.partyName,
      customerPhone: form.customerPhone,
      customerEmail: form.customerEmail,
      customerCompany: form.customerCompany,
      billingAddress: form.billingAddress,
      stateOfSupply: form.stateOfSupply,
      items: form.items.filter((i) => i.productName),
      subtotal: currentCalculations.netTaxable,
      withGst: currentCalculations.totalTax > 0,
      gstType: form.stateOfSupply?.includes('Tamil Nadu') ? 'intra_state' : 'inter_state',
      cgst: currentCalculations.totalTax / 2,
      sgst: currentCalculations.totalTax / 2,
      igst: 0,
      discount: currentCalculations.totalDiscount,
      taxAmount: currentCalculations.totalTax,
      roundOff: currentCalculations.roundOff,
      amount: currentCalculations.finalAmount,
      balance: currentCalculations.finalAmount,
      status: andConvert ? 'Converted' : activeTab.editingChallan?.status || 'Open',
      convertedToInvoiceNo: andConvert ? `INV-${new Date().getFullYear()}-030${challans.length + 1}` : undefined,
      notes: form.notes,
      terms: form.terms,
      vehicleNo: form.vehicleNo,
      attachedImageName: attachedImageName || undefined,
      attachedDocName: attachedDocName || undefined,
      createdAt: activeTab.editingChallan?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let updatedList: DeliveryChallanRecord[];
    if (activeTab.editingChallan) {
      updatedList = challans.map((c) => (c.id === challanId ? newChallan : c));
      toast.success(`Delivery Challan ${newChallan.challanNo} updated successfully!`);
    } else {
      updatedList = [newChallan, ...challans];
      toast.success(`Delivery Challan ${newChallan.challanNo} created successfully!`);
    }

    persistChallans(updatedList);

    if (andConvert) {
      const saleInvoiceNo = `INV-${new Date().getFullYear()}-${String(300 + challans.length + 1).padStart(4, '0')}`;
      const newSale: SaleTransaction = {
        id: `sale_${Date.now()}`,
        invoiceNo: saleInvoiceNo,
        referenceNo: newChallan.challanNo,
        saleDate: new Date().toISOString().split('T')[0],
        dueDate: newChallan.dueDate,
        customerId: newChallan.customerId,
        customerName: newChallan.partyName,
        customerCompany: newChallan.customerCompany,
        customerPhone: newChallan.customerPhone,
        customerEmail: newChallan.customerEmail,
        billingAddress: newChallan.billingAddress,
        shippingAddress: newChallan.billingAddress,
        items: newChallan.items,
        subtotal: newChallan.subtotal,
        withGst: newChallan.withGst,
        gstType: newChallan.gstType,
        cgst: newChallan.cgst,
        sgst: newChallan.sgst,
        igst: newChallan.igst,
        totalDiscount: newChallan.discount || 0,
        totalTax: newChallan.taxAmount || 0,
        shippingCharges: 0,
        otherCharges: 0,
        grandTotal: newChallan.amount,
        paidAmount: 0,
        balance: newChallan.amount,
        paymentMethod: 'Cash',
        paymentTerms: '15 Days',
        paymentStatus: 'Unpaid',
        saleStatus: 'Confirmed',
        createdBy: 'Current User',
        salesperson: 'Sales Rep',
        notes: `Converted from Delivery Challan ${newChallan.challanNo}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveSale(newSale);
      toast.success(`Delivery Challan converted to Sale Invoice ${saleInvoiceNo}!`);
    }

    setViewMode('list');
  };

  // Convert to Sale Invoice from list
  const handleConvertExistingToSale = (challan: DeliveryChallanRecord) => {
    const saleInvoiceNo = `INV-${new Date().getFullYear()}-${String(300 + challans.length + 1).padStart(4, '0')}`;
    const newSale: SaleTransaction = {
      id: `sale_${Date.now()}`,
      invoiceNo: saleInvoiceNo,
      referenceNo: challan.challanNo,
      saleDate: new Date().toISOString().split('T')[0],
      dueDate: challan.dueDate,
      customerId: challan.customerId,
      customerName: challan.partyName,
      customerCompany: challan.customerCompany,
      customerPhone: challan.customerPhone,
      customerEmail: challan.customerEmail,
      billingAddress: challan.billingAddress,
      shippingAddress: challan.billingAddress,
      items: challan.items,
      subtotal: challan.subtotal,
      withGst: challan.withGst,
      gstType: challan.gstType,
      cgst: challan.cgst,
      sgst: challan.sgst,
      igst: challan.igst,
      totalDiscount: challan.discount || 0,
      totalTax: challan.taxAmount || 0,
      shippingCharges: 0,
      otherCharges: 0,
      grandTotal: challan.amount,
      paidAmount: 0,
      balance: challan.amount,
      paymentMethod: 'Cash',
      paymentTerms: '15 Days',
      paymentStatus: 'Unpaid',
      saleStatus: 'Confirmed',
      createdBy: 'Current User',
      salesperson: 'Sales Rep',
      notes: `Converted from Delivery Challan ${challan.challanNo}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveSale(newSale);
    const updated = challans.map((c) =>
      c.id === challan.id ? { ...c, status: 'Converted' as const, convertedToInvoiceNo: saleInvoiceNo } : c
    );
    persistChallans(updated);
    toast.success(`Delivery Challan ${challan.challanNo} converted to Sale Invoice ${saleInvoiceNo}!`);
  };

  // Delete Challan
  const handleDeleteChallan = (id: string) => {
    const updated = challans.filter((c) => c.id !== id);
    persistChallans(updated);
    toast.success('Delivery challan removed.');
  };

  // Duplicate Delivery Challan
  const handleDuplicateChallan = (item: DeliveryChallanRecord) => {
    const nextNum = challans.length + 1;
    const newChallanNo = `DC-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;
    const duplicated: DeliveryChallanRecord = {
      ...item,
      id: `dc_${Date.now()}`,
      challanNo: newChallanNo,
      referenceNo: String(nextNum),
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'Open',
      convertedToInvoiceNo: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [duplicated, ...challans];
    persistChallans(updated);
    toast.success(`Duplicated ${item.challanNo} as new Delivery Challan ${newChallanNo}!`);
  };

  // Print Delivery Challan directly
  const handlePrintChallan = (item: DeliveryChallanRecord) => {
    setPreviewChallan(item);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  // Bulk Convert Handler
  const handleBulkConvertToSale = () => {
    const openChallansToConvert = challans.filter(
      (c) => selectedBulkChallanIds.includes(c.id) && c.status === 'Open'
    );
    if (openChallansToConvert.length === 0) {
      toast.error('Please select at least one open delivery challan to convert');
      return;
    }

    openChallansToConvert.forEach((challan) => {
      const saleInvoiceNo = `INV-${new Date().getFullYear()}-${String(300 + challans.length + 1).padStart(4, '0')}`;
      const newSale: SaleTransaction = {
        id: `sale_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        invoiceNo: saleInvoiceNo,
        referenceNo: challan.challanNo,
        saleDate: new Date().toISOString().split('T')[0],
        dueDate: challan.dueDate,
        customerId: challan.customerId,
        customerName: challan.partyName,
        customerCompany: challan.customerCompany,
        customerPhone: challan.customerPhone,
        customerEmail: challan.customerEmail,
        billingAddress: challan.billingAddress,
        shippingAddress: challan.billingAddress,
        items: challan.items,
        subtotal: challan.subtotal,
        withGst: challan.withGst,
        gstType: challan.gstType,
        cgst: challan.cgst,
        sgst: challan.sgst,
        igst: challan.igst,
        totalDiscount: challan.discount || 0,
        totalTax: challan.taxAmount || 0,
        shippingCharges: 0,
        otherCharges: 0,
        grandTotal: challan.amount,
        paidAmount: 0,
        balance: challan.amount,
        paymentMethod: 'Cash',
        paymentTerms: '15 Days',
        paymentStatus: 'Unpaid',
        saleStatus: 'Confirmed',
        createdBy: 'Current User',
        salesperson: 'Sales Rep',
        notes: `Bulk converted from Delivery Challan ${challan.challanNo}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveSale(newSale);
    });

    const updated = challans.map((c) =>
      selectedBulkChallanIds.includes(c.id) && c.status === 'Open'
        ? {
            ...c,
            status: 'Converted' as const,
            convertedToInvoiceNo: `INV-${new Date().getFullYear()}-BULK`,
          }
        : c
    );
    persistChallans(updated);
    toast.success(`Successfully converted ${openChallansToConvert.length} delivery challans to Sale Invoices!`);
    setIsBulkConvertModalOpen(false);
    setSelectedBulkChallanIds([]);
  };

  // Metrics
  const metrics = useMemo(() => {
    let totalVal = 0;
    let convertedVal = 0;
    let openVal = 0;

    challans.forEach((c) => {
      totalVal += c.amount;
      if (c.status === 'Converted' || c.status === 'Delivered') {
        convertedVal += c.amount;
      } else if (c.status === 'Open') {
        openVal += c.amount;
      }
    });

    return {
      totalVal,
      convertedVal,
      openVal,
      totalCount: challans.length,
    };
  }, [challans]);

  // Filtered List
  const filteredChallans = useMemo(() => {
    return challans.filter((c) => {
      const q = appliedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.challanNo.toLowerCase().includes(q) ||
        c.partyName.toLowerCase().includes(q) ||
        (c.referenceNo && c.referenceNo.toLowerCase().includes(q)) ||
        (c.customerPhone && c.customerPhone.toLowerCase().includes(q));

      const matchesStatus = appliedStatus === 'ALL' || c.status === appliedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [challans, appliedSearch, appliedStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredChallans.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedChallans = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredChallans.slice(start, start + pageSize);
  }, [filteredChallans, safePage, pageSize]);

  // Filtered Customers for Party Picker Popup
  const filteredCustomerOptions = useMemo(() => {
    const q = partySearchQuery.toLowerCase().trim();
    if (!q) return customers.slice(0, 10);
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.company && c.company.toLowerCase().includes(q))
    );
  }, [customers, partySearchQuery]);

  // Close party dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(e.target as Node)) {
        setIsPartyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // =========================================================================
  // VIEW MODE: FORM (Exact match to reference screenshot 2)
  // =========================================================================
  if (viewMode === 'form') {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col font-sans -m-4 sm:-m-6 lg:-m-8">
        {/* 1. Top Tabs Bar */}
        <div className="bg-slate-200/80 px-4 pt-2.5 pb-0 flex items-center justify-between border-b border-slate-300">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-xs sm:text-[13px] font-bold cursor-pointer transition-all border-t border-x ${
                    isActive
                      ? 'bg-white text-slate-800 border-slate-300 shadow-xs'
                      : 'bg-slate-200 text-slate-600 border-transparent hover:bg-slate-300/70'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5 text-[#33077C]" />
                  <span>{tab.title}</span>
                  <button
                    type="button"
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    className="p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              onClick={handleAddNewTab}
              className="p-1.5 rounded-lg bg-white/70 hover:bg-white text-slate-700 transition-colors shadow-2xs cursor-pointer ml-1"
              title="Add another Delivery Challan tab"
            >
              <Plus className="w-4 h-4 text-[#33077C]" />
            </button>
          </div>

          {/* Top Right Tool Icons */}
          <div className="flex items-center gap-2 pb-2">
            <button
              type="button"
              onClick={() => toast.info('Configure Delivery Challan columns and print layouts')}
              className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-slate-600 hover:text-[#33077C] transition-colors shadow-2xs cursor-pointer"
              title="Template Settings"
            >
              <Receipt className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowColumnCustomizePopover(!showColumnCustomizePopover)}
              className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-slate-600 hover:text-[#33077C] transition-colors shadow-2xs cursor-pointer"
              title="Column Customization"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-slate-600 hover:text-rose-600 transition-colors shadow-2xs cursor-pointer"
              title="Close and Return to List"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Main Form Container */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
            {/* Header Title */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Delivery Challan
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">
                    Issue delivery challans for goods transport, sample dispatches, and convert to invoice on fulfillment
                  </p>
                </div>
              </div>
            </div>

            {/* Row 1: Party Selection & Right Side Meta (Exact match to screenshot 2) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Party Dropdown */}
              <div className="lg:col-span-6 space-y-3">
                <div className="relative" ref={partyDropdownRef}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Party <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsQuickCustomerModalOpen(true)}
                      className="text-xs font-bold text-[#33077C] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Party</span>
                    </button>
                  </div>
                  <div
                    onClick={() => setIsPartyDropdownOpen(!isPartyDropdownOpen)}
                    className="w-full h-11 px-3.5 bg-white border border-blue-500 ring-2 ring-blue-500/15 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 flex items-center justify-between cursor-pointer shadow-2xs"
                  >
                    <span className={activeTab.formData.partyName ? 'text-slate-900' : 'text-slate-400'}>
                      {activeTab.formData.partyName || 'Select Party'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </div>

                  {/* Customer Dropdown Popup */}
                  {isPartyDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1.5 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-50 animate-in fade-in duration-100">
                      <div className="relative mb-2">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          autoFocus
                          placeholder="Search party by name or phone..."
                          value={partySearchQuery}
                          onChange={(e) => setPartySearchQuery(e.target.value)}
                          className="w-full h-8 pl-8 pr-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#4309A2] focus:bg-white"
                        />
                      </div>

                      <div className="max-h-60 overflow-y-auto divide-y divide-slate-50 space-y-1">
                        {filteredCustomerOptions.map((cust) => (
                          <div
                            key={cust.id}
                            onClick={() => handleSelectCustomer(cust)}
                            className="p-2 rounded-xl hover:bg-purple-50/60 cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <div>
                              <div className="text-xs font-bold text-slate-800">{cust.name}</div>
                              <div className="text-[11px] text-slate-400">{cust.phone}</div>
                            </div>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-teal-50 text-teal-700 text-xs font-bold border border-teal-200">
                              ₹{(cust.openingBalance || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {activeTab.formData.partyName && (
                  <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 text-xs text-slate-600 space-y-1">
                    <div className="font-bold text-slate-900">{activeTab.formData.partyName}</div>
                    {activeTab.formData.customerPhone && (
                      <div>Phone: {activeTab.formData.customerPhone}</div>
                    )}
                    {activeTab.formData.billingAddress && (
                      <div className="text-[11px] text-slate-500">{activeTab.formData.billingAddress}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Challan No, Invoice Date, Due Date, State of supply */}
              <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Challan No */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Challan No.
                  </label>
                  <input
                    type="text"
                    value={activeTab.formData.referenceNo}
                    onChange={(e) =>
                      updateActiveTabFormData((prev) => ({ ...prev, referenceNo: e.target.value }))
                    }
                    className="w-full h-11 px-3 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-[#4309A2] focus:ring-2 focus:ring-[#33077C]/15 transition-all shadow-2xs"
                  />
                </div>

                {/* Invoice Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    value={activeTab.formData.invoiceDate}
                    onChange={(e) =>
                      updateActiveTabFormData((prev) => ({ ...prev, invoiceDate: e.target.value }))
                    }
                    className="w-full h-11 px-2.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#4309A2] focus:ring-2 focus:ring-[#33077C]/15 transition-all shadow-2xs"
                  />
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={activeTab.formData.dueDate}
                    onChange={(e) =>
                      updateActiveTabFormData((prev) => ({ ...prev, dueDate: e.target.value }))
                    }
                    className="w-full h-11 px-2.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#4309A2] focus:ring-2 focus:ring-[#33077C]/15 transition-all shadow-2xs"
                  />
                </div>

                {/* State of supply */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    State of supply
                  </label>
                  <select
                    value={activeTab.formData.stateOfSupply}
                    onChange={(e) =>
                      updateActiveTabFormData((prev) => ({ ...prev, stateOfSupply: e.target.value }))
                    }
                    className="w-full h-11 px-2 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#4309A2] focus:ring-2 focus:ring-[#33077C]/15 transition-all shadow-2xs"
                  >
                    {STATE_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 3. Items Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-[#33077C] text-white font-bold uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center text-white/80">#</th>
                      <th className="py-3 px-4 min-w-[220px] text-white">Item</th>
                      <th className="py-3 px-3 w-20 text-center text-white">Qty</th>
                      <th className="py-3 px-3 w-28 text-white">Unit</th>
                      <th className="py-3 px-3 min-w-[130px] text-white">
                        <div className="flex items-center justify-between">
                          <span>Price/Unit</span>
                          <span className="text-[10px] text-purple-200 font-medium normal-case">
                            ({priceTaxMode})
                          </span>
                        </div>
                      </th>
                      {columnSettings.showDiscount && (
                        <th className="py-3 px-3 min-w-[130px] text-white">Discount</th>
                      )}
                      <th className="py-3 px-3 min-w-[130px] text-white">Tax</th>
                      <th className="py-3 px-4 w-32 text-right text-white">Amount</th>
                      <th className="py-3 px-2 w-10 text-center text-white/80">
                        <Plus className="w-4 h-4 text-white mx-auto" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {activeTab.formData.items.map((rowItem, idx) => (
                      <tr key={rowItem.id || idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 text-center text-slate-400 font-semibold">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            list={`dc-items-list-${idx}`}
                            placeholder="Enter item name or select..."
                            value={rowItem.productName}
                            onChange={(e) => {
                              const val = e.target.value;
                              const matched = stocks.find((s) => s.productName === val);
                              if (matched) {
                                handleItemChange(idx, 'productId', matched.productId || matched.id);
                              } else {
                                handleItemChange(idx, 'productName', val);
                              }
                            }}
                            className="w-full h-9 px-3 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-[#4309A2] focus:ring-1 focus:ring-[#33077C]/20"
                          />
                          <datalist id={`dc-items-list-${idx}`}>
                            {stocks.map((stk) => (
                              <option key={stk.id} value={stk.productName} />
                            ))}
                          </datalist>
                        </td>
                        <td className="py-2.5 px-2">
                          <input
                            type="number"
                            min="1"
                            value={rowItem.quantity || ''}
                            onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                            className="w-full h-9 px-2 text-center bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-[#4309A2]"
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          <select
                            value={rowItem.unit || 'NONE'}
                            onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                            className="w-full h-9 px-2 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:border-[#4309A2]"
                          >
                            {UNIT_OPTIONS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 px-2">
                          <input
                            type="number"
                            min="0"
                            placeholder="0.00"
                            value={rowItem.unitPrice || ''}
                            onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                            className="w-full h-9 px-2.5 text-right bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-[#4309A2]"
                          />
                        </td>
                        {columnSettings.showDiscount && (
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="%"
                                value={rowItem.discountPercent || ''}
                                onChange={(e) =>
                                  handleItemChange(idx, 'discountPercent', Number(e.target.value))
                                }
                                className="w-16 h-9 px-1.5 text-center bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-[#4309A2]"
                              />
                              <span className="text-[11px] text-slate-400">
                                ₹{rowItem.discountAmount?.toFixed(0) || 0}
                              </span>
                            </div>
                          </td>
                        )}
                        <td className="py-2.5 px-2">
                          <select
                            value={rowItem.taxPercent || 0}
                            onChange={(e) => handleItemChange(idx, 'taxPercent', Number(e.target.value))}
                            className="w-full h-9 px-2 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:border-[#4309A2]"
                          >
                            {TAX_RATE_OPTIONS.map((tx) => (
                              <option key={tx.label} value={tx.rate}>
                                {tx.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                          ₹{rowItem.total?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals Summary Footer Row */}
                  <tfoot className="bg-slate-50 font-bold text-xs text-slate-800 border-t border-slate-200">
                    <tr>
                      <td colSpan={2} className="py-3 px-4">
                        <button
                          type="button"
                          onClick={handleAddRow}
                          className="h-8 px-3 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-[#33077C] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>ADD ROW</span>
                        </button>
                      </td>
                      <td className="py-3 px-2 text-center font-black">
                        {currentCalculations.totalQty}
                      </td>
                      <td></td>
                      <td></td>
                      {columnSettings.showDiscount && (
                        <td className="py-3 px-2 text-slate-600">
                          ₹{currentCalculations.totalDiscount.toFixed(2)}
                        </td>
                      )}
                      <td className="py-3 px-2 text-slate-600">
                        ₹{currentCalculations.totalTax.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900 text-sm">
                        ₹{currentCalculations.finalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* 4. Bottom Options */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
              <div className="lg:col-span-7 space-y-3">
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowTermsSection(!showTermsSection)}
                    className={`h-9 px-3.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      showTermsSection
                        ? 'bg-purple-50 text-[#33077C] border-purple-300 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <FileEdit className="w-3.5 h-3.5" />
                    <span>ADD TERMS &amp; CONDITIONS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDescriptionSection(!showDescriptionSection)}
                    className={`h-9 px-3.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      showDescriptionSection
                        ? 'bg-purple-50 text-[#33077C] border-purple-300 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                    <span>ADD DESCRIPTION</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowImageSection(!showImageSection);
                      if (!attachedImageName) setAttachedImageName('delivery_vehicle_slip.jpg');
                    }}
                    className={`h-9 px-3.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      showImageSection
                        ? 'bg-purple-50 text-[#33077C] border-purple-300 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>ADD IMAGE</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowDocumentSection(!showDocumentSection);
                      if (!attachedDocName) setAttachedDocName('signed_gate_pass.pdf');
                    }}
                    className={`h-9 px-3.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      showDocumentSection
                        ? 'bg-purple-50 text-[#33077C] border-purple-300 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>ADD DOCUMENT</span>
                  </button>
                </div>

                {showTermsSection && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 animate-in fade-in">
                    <label className="text-xs font-bold text-slate-700">Terms &amp; Conditions</label>
                    <textarea
                      rows={3}
                      value={activeTab.formData.terms}
                      onChange={(e) =>
                        updateActiveTabFormData((prev) => ({ ...prev, terms: e.target.value }))
                      }
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-[#4309A2]"
                    />
                  </div>
                )}

                {showDescriptionSection && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 animate-in fade-in">
                    <label className="text-xs font-bold text-slate-700">Dispatch Notes / Gate Pass Info</label>
                    <textarea
                      rows={2}
                      placeholder="Add vehicle info, transport service, or driver name..."
                      value={activeTab.formData.notes}
                      onChange={(e) =>
                        updateActiveTabFormData((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-[#4309A2]"
                    />
                  </div>
                )}
              </div>

              {/* Right Side: Round Off & Total */}
              <div className="lg:col-span-5 bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Sub Total (Taxable)</span>
                  <span className="font-semibold text-slate-800">
                    ₹{currentCalculations.netTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {currentCalculations.totalTax > 0 && (
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Total Tax</span>
                    <span className="font-semibold text-slate-800">
                      ₹{currentCalculations.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableRoundOff}
                      onChange={(e) => setEnableRoundOff(e.target.checked)}
                      className="w-4 h-4 rounded text-[#33077C] focus:ring-[#33077C]"
                    />
                    <span className="text-xs font-bold text-slate-700">Round Off</span>
                  </label>
                  <span className="text-xs font-bold text-slate-600">
                    ₹{currentCalculations.roundOff.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t-2 border-slate-300">
                  <span className="text-sm font-black text-slate-900 uppercase">Total Amount</span>
                  <span className="text-xl font-black text-[#33077C]">
                    ₹{currentCalculations.finalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Sticky Bottom Bar */}
        <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between sticky bottom-0 z-30 shadow-lg">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className="h-10 px-5 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500 stroke-[2.5]" />
            <span>Back to List</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => toast.success('Delivery Challan link copied & ready to share!')}
              className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-xs sm:text-[13px] font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <Share2 className="w-4 h-4 text-slate-600" />
              <span>Share</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveChallan(true)}
              className="h-10 px-5 rounded-xl border border-[#33077C]/30 bg-purple-50 hover:bg-purple-100 text-[#33077C] text-xs sm:text-[13px] font-bold transition-all flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Save &amp; Convert to Sale</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveChallan(false)}
              className="h-10 px-6 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{activeTab.editingChallan ? 'Update Challan' : 'Save'}</span>
            </button>
          </div>
        </div>

        {/* Quick Customer Modal */}
        {isQuickCustomerModalOpen && (
          <Modal
            isOpen={isQuickCustomerModalOpen}
            onClose={() => setIsQuickCustomerModalOpen(false)}
            title="Add New Party / Customer"
            subtitle="Register customer details to link with this Delivery Challan"
            maxWidth="md"
            headerGradient={true}
            showBackIcon={true}
            hideCloseButton={true}
          >
            <form onSubmit={handleSaveQuickCustomer} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Customer / Business Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Hospitality Corp"
                  value={quickCustName}
                  onChange={(e) => setQuickCustName(e.target.value)}
                  className="w-full h-11 px-4 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-[#4309A2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={quickCustPhone}
                    onChange={(e) => setQuickCustPhone(e.target.value)}
                    className="w-full h-11 px-4 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-[#4309A2]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="dispatch@company.com"
                    value={quickCustEmail}
                    onChange={(e) => setQuickCustEmail(e.target.value)}
                    className="w-full h-11 px-4 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-[#4309A2]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Delivery Address</label>
                <input
                  type="text"
                  placeholder="Destination warehouse or site address"
                  value={quickCustAddress}
                  onChange={(e) => setQuickCustAddress(e.target.value)}
                  className="w-full h-11 px-4 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-[#4309A2]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickCustomerModalOpen(false)}
                  className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold shadow-md"
                >
                  Save Party
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    );
  }

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredChallans.length === 0) {
      toast.error('No delivery challans to export');
      return;
    }

    const excelRows = filteredChallans.map((c) => ({
      date: isoToDdmmyyyy(c.invoiceDate),
      dueDate: isoToDdmmyyyy(c.dueDate),
      challanNo: c.challanNo,
      partyName: c.partyName,
      customerPhone: c.customerPhone || '-',
      amount: Number(c.amount || 0),
      balance: Number(c.balance || 0),
      status: c.status,
    }));

    exportTableToExcel({
      filename: `Delivery_Challans_Report_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Delivery Challans',
      title: 'YAA CREATIONS CRM - DELIVERY CHALLAN REPORT',
      subtitle: `Filter: ${appliedPeriod} | Total Challans: ${filteredChallans.length} | Generated: ${new Date().toLocaleDateString()}`,
      columns: [
        { header: 'Challan Date', key: 'date', align: 'center', width: 15 },
        { header: 'Due Date', key: 'dueDate', align: 'center', width: 15 },
        { header: 'Challan No.', key: 'challanNo', align: 'center', width: 18 },
        { header: 'Party Name', key: 'partyName', align: 'left', width: 28 },
        { header: 'Phone', key: 'customerPhone', align: 'left', width: 18 },
        { header: 'Total (₹)', key: 'amount', align: 'right', type: 'currency', width: 20 },
        { header: 'Balance (₹)', key: 'balance', align: 'right', type: 'currency', width: 20 },
        { header: 'Status', key: 'status', align: 'center', width: 14 },
      ],
      data: excelRows,
      summaryRow: {
        date: 'TOTAL',
        partyName: `${filteredChallans.length} Challans`,
        amount: filteredChallans.reduce((sum, c) => sum + (c.amount || 0), 0),
        balance: filteredChallans.reduce((sum, c) => sum + (c.balance || 0), 0),
      },
    });

    toast.success(`Delivery Challans Excel report downloaded (${filteredChallans.length} records)!`);
  };

  const totalChallanAmt = filteredChallans.reduce((sum, c) => sum + (c.amount || 0), 0);
  const openChallans = filteredChallans.filter((c) => c.status === 'Open');
  const deliveredChallans = filteredChallans.filter((c) => c.status === 'Delivered' || c.status === 'Converted');

  // =========================================================================
  // VIEW MODE: LIST
  // =========================================================================
  return (
    <div className="space-y-5 pb-16 font-sans">
      {/* 1. Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Delivery Challan
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-[#33077C] border border-purple-200">
                {challans.length} total
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Manage delivery challans, goods dispatched, tracking info, and convert to sale invoices.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <Button
            variant="secondary"
            size="md"
            icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
            onClick={handleExportExcel}
            className="hover:border-emerald-500 hover:text-emerald-700 transition-colors"
          >
            Excel Report
          </Button>

          <Button
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4 text-white stroke-[2.5]" />}
            onClick={handleOpenCreateForm}
            className="bg-[#33077C] hover:bg-[#280563] text-white shadow-sm hover:shadow transition-all"
          >
            Add Delivery Challan
          </Button>
        </div>
      </div>

      {/* 2. FILTER & ACTION BAR */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Side: Period Filter & Date Range & Firms Filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <FilterDropdown
            placeholder="Period"
            value={appliedPeriod}
            options={PERIOD_FILTER_OPTIONS}
            onChange={(val) => {
              setAppliedPeriod(val);
              setPage(1);
            }}
          />

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs text-slate-700">
            <span className="text-slate-400 font-medium">Between</span>
            <span className="font-semibold text-slate-800">01/10/2026</span>
            <span className="text-slate-400 font-medium">To</span>
            <span className="font-semibold text-slate-800">31/10/2026</span>
          </div>

          <div className="relative">
            <select
              className="h-9 px-3.5 pr-8 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 hover:border-slate-300 focus:outline-none focus:border-[#33077C] cursor-pointer appearance-none uppercase tracking-wider"
              defaultValue="ALL FIRMS"
            >
              <option value="ALL FIRMS">ALL FIRMS</option>
              <option value="FIRM 1">Main Branch</option>
              <option value="FIRM 2">Salem Depot</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Right Side: Print Action */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            type="button"
            onClick={() => window.print()}
            className="h-9 px-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Print Summary"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* 2. SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Challans */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Challans
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              ₹{totalChallanAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              {filteredChallans.length} challans generated
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#33077C] flex items-center justify-center font-bold shrink-0">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Open / Ready for Delivery */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-amber-600 uppercase tracking-wider">
              Ready for Delivery
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-600 mt-1">
              {openChallans.length}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              ₹{openChallans.reduce((sum, c) => sum + (c.amount || 0), 0).toLocaleString('en-IN')} in transit
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Delivered / Converted */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-emerald-600 uppercase tracking-wider">
              Delivered / Converted
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
              {deliveredChallans.length}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              Successfully fulfilled
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Cancelled */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Cancelled Challans
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {challans.filter((c) => c.status === 'Cancelled').length}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              Voided dispatches
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. TRANSACTIONS SEARCH & ACTION BAR */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Section Header & Search Input */}
        <div className="flex items-center gap-3 flex-1 max-w-lg">
          <span className="text-xs sm:text-sm font-bold text-slate-700 tracking-wider uppercase whitespace-nowrap">
            TRANSACTIONS
          </span>
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={pendingSearch}
              onChange={(e) => {
                setPendingSearch(e.target.value);
                setAppliedSearch(e.target.value);
              }}
              placeholder="Search by party, challan no, vehicle..."
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#33077C] focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Right: Bulk Convert Button & Add Delivery Challan CTA */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setSelectedBulkChallanIds(challans.filter((c) => c.status === 'Open').map((c) => c.id));
              setIsBulkConvertModalOpen(true);
            }}
            className="h-9 px-4 rounded-full border border-red-300 text-red-500 hover:bg-red-50 text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
          >
            <span>Bulk Convert To Sale</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateForm}
            className="h-9 px-4 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#33077C]/20 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Delivery Challan</span>
          </button>
        </div>
      </div>

      {/* 4. TRANSACTIONS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredChallans.length === 0 ? (
          <div className="py-20 px-4 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-purple-50/80 border border-purple-100 flex items-center justify-center text-[#33077C] shadow-xs">
              <Truck className="w-10 h-10 stroke-[1.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">No Delivery Challans found</h3>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
                You haven't recorded any customer delivery challans yet.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreateForm}
              className="h-10 px-6 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#33077C]/20 hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Delivery Challan</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-[13px] border-collapse min-w-[850px]">
              {/* Royal Purple Header */}
              <thead>
                <tr className="bg-[#33077C] text-white font-bold uppercase text-[10.5px] border-b border-[#4309A2] tracking-wider select-none">
                  <th className="py-3.5 px-3 border-r border-[#4309A2]/70 whitespace-nowrap text-white">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="flex items-center gap-1">DATE <span className="text-purple-200">↓</span></span>
                      <Filter className="w-3 h-3 text-purple-200 opacity-80" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 border-r border-[#4309A2]/70 whitespace-nowrap text-white">
                    <div className="flex items-center justify-between gap-1.5">
                      <span>PARTY</span>
                      <Filter className="w-3 h-3 text-purple-200 opacity-80" />
                    </div>
                  </th>
                  <th className="py-3.5 px-3 border-r border-[#4309A2]/70 text-center whitespace-nowrap w-28 text-white">
                    <div className="flex items-center justify-center gap-1">
                      <span>CHALLAN NO.</span>
                      <Filter className="w-3 h-3 text-purple-200 opacity-80" />
                    </div>
                  </th>
                  <th className="py-3.5 px-3 border-r border-[#4309A2]/70 whitespace-nowrap text-white">
                    <div className="flex items-center justify-between gap-1.5">
                      <span>DUE DATE</span>
                      <Filter className="w-3 h-3 text-purple-200 opacity-80" />
                    </div>
                  </th>
                  <th className="py-3.5 px-3 border-r border-[#4309A2]/70 text-right whitespace-nowrap text-white">
                    <div className="flex items-center justify-end gap-1.5">
                      <span>TOTAL AMOUNT</span>
                      <Filter className="w-3 h-3 text-purple-200 opacity-80" />
                    </div>
                  </th>
                  <th className="py-3.5 px-3 border-r border-[#4309A2]/70 whitespace-nowrap text-white">
                    <div className="flex items-center justify-between gap-1.5">
                      <span>STATUS</span>
                      <Filter className="w-3 h-3 text-purple-200 opacity-80" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap w-44 text-white">
                    ACTION
                  </th>
                </tr>
              </thead>

              {/* Table Rows */}
              <tbody className="divide-y divide-slate-200 text-slate-800 font-sans">
                {paginatedChallans.map((item) => {
                  const isActionOpen = activeDropdownId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-purple-50/30 transition-colors border-b border-slate-200 group"
                    >
                      {/* 1. DATE */}
                      <td className="py-3.5 px-3 text-slate-700 font-semibold border-r border-slate-200 whitespace-nowrap">
                        {isoToDdmmyyyy(item.invoiceDate)}
                      </td>

                      {/* 2. PARTY */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                        <div>{item.partyName}</div>
                        {item.customerPhone && (
                          <div className="text-[11px] text-slate-400 font-normal">{item.customerPhone}</div>
                        )}
                      </td>

                      {/* 3. CHALLAN NO. */}
                      <td className="py-3.5 px-3 font-bold text-slate-800 text-center border-r border-slate-200 whitespace-nowrap">
                        {item.referenceNo || item.challanNo}
                      </td>

                      {/* 4. DUE DATE */}
                      <td className="py-3.5 px-3 text-slate-600 font-medium border-r border-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{isoToDdmmyyyy(item.dueDate)}</span>
                          <span className="text-[10.5px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            Due: Today
                          </span>
                        </div>
                      </td>

                      {/* 5. TOTAL AMOUNT */}
                      <td className="py-3.5 px-3 text-right font-black text-slate-900 border-r border-slate-200 whitespace-nowrap">
                        ₹ {Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* 6. STATUS */}
                      <td className="py-3.5 px-3 border-r border-slate-200 whitespace-nowrap">
                        {item.status === 'Converted' || item.status === 'Delivered' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Converted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                            Open
                          </span>
                        )}
                      </td>

                      {/* 7. ACTION */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          {/* CONVERT TO SALE Button */}
                          <button
                            type="button"
                            onClick={() => handleConvertExistingToSale(item)}
                            className="px-2.5 py-1 text-[11px] font-bold text-[#33077C] hover:text-white bg-purple-50 hover:bg-[#33077C] border border-purple-200 rounded transition-colors cursor-pointer uppercase tracking-wider select-none shadow-2xs"
                          >
                            CONVERT TO SALE
                          </button>

                          {/* 3-Dots Actions Menu */}
                          <div className="delivery-challan-action-dropdown-container relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isActionOpen) {
                                  setActiveDropdownId(null);
                                  setDropdownPos(null);
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const spaceBelow = window.innerHeight - rect.bottom;
                                  const dropdownHeight = 240;
                                  if (spaceBelow < dropdownHeight) {
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
                                  setActiveDropdownId(item.id);
                                }
                              }}
                              className="w-7 h-7 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                              title="More options"
                            >
                              <MoreVertical className="w-4 h-4 text-slate-600" />
                            </button>

                            {/* 3-Dots Floating Dropdown Menu (6 options matching exact order) */}
                            {isActionOpen && dropdownPos && (
                              <div
                                style={{
                                  position: 'fixed',
                                  top: dropdownPos.top !== undefined ? `${dropdownPos.top}px` : 'auto',
                                  bottom: dropdownPos.bottom !== undefined ? `${dropdownPos.bottom}px` : 'auto',
                                  right: `${dropdownPos.right}px`,
                                  zIndex: 9999,
                                }}
                                className="delivery-challan-action-dropdown-menu w-44 bg-white rounded-xl shadow-2xl border border-slate-200/90 py-2 animate-in fade-in zoom-in-95 duration-100 text-left font-sans overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* 1. View/Edit */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    handleOpenEditForm(item);
                                  }}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                                >
                                  View/Edit
                                </button>

                                {/* 2. Delete */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    handleDeleteChallan(item.id);
                                  }}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                                >
                                  Delete
                                </button>

                                {/* 3. Duplicate */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    handleDuplicateChallan(item);
                                  }}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                                >
                                  Duplicate
                                </button>

                                {/* 4. Open PDF */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setPreviewChallan(item);
                                  }}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                                >
                                  Open PDF
                                </button>

                                {/* 5. Preview */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setPreviewChallan(item);
                                  }}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                                >
                                  Preview
                                </button>

                                {/* 6. Print */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    handlePrintChallan(item);
                                  }}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                                >
                                  Print
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Pagination */}
      {filteredChallans.length > 0 && (
        <Pagination
          total={filteredChallans.length}
          currentPage={safePage}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50]}
          onPageChange={(newPage) => setPage(newPage)}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      )}

      {/* 6. Bulk Convert To Sale Modal */}
      {isBulkConvertModalOpen && (
        <Modal
          isOpen={isBulkConvertModalOpen}
          onClose={() => setIsBulkConvertModalOpen(false)}
          title="Bulk Convert Delivery Challans to Sale Invoices"
          subtitle="Select open delivery challans to convert into confirmed sales"
          maxWidth="2xl"
          headerGradient={true}
        >
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-600 uppercase">
                Open Delivery Challans ({challans.filter((c) => c.status === 'Open').length})
              </span>
              <button
                type="button"
                onClick={() => {
                  const openIds = challans.filter((c) => c.status === 'Open').map((c) => c.id);
                  if (selectedBulkChallanIds.length === openIds.length) {
                    setSelectedBulkChallanIds([]);
                  } else {
                    setSelectedBulkChallanIds(openIds);
                  }
                }}
                className="text-xs font-bold text-[#33077C] hover:underline"
              >
                {selectedBulkChallanIds.length === challans.filter((c) => c.status === 'Open').length
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {challans.filter((c) => c.status === 'Open').length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 font-medium">
                  No open delivery challans available for conversion.
                </div>
              ) : (
                challans
                  .filter((c) => c.status === 'Open')
                  .map((challan) => {
                    const isChecked = selectedBulkChallanIds.includes(challan.id);
                    return (
                      <label
                        key={challan.id}
                        className="flex items-center justify-between p-3 hover:bg-purple-50/40 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBulkChallanIds((prev) => [...prev, challan.id]);
                              } else {
                                setSelectedBulkChallanIds((prev) => prev.filter((id) => id !== challan.id));
                              }
                            }}
                            className="w-4 h-4 rounded text-[#33077C] focus:ring-[#33077C]"
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-900">{challan.partyName}</p>
                            <p className="text-[11px] text-slate-500 font-mono">
                              {challan.challanNo} • {isoToDdmmyyyy(challan.invoiceDate)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-900">
                            ₹{challan.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </label>
                    );
                  })
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                {selectedBulkChallanIds.length} delivery challan(s) selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkConvertModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedBulkChallanIds.length === 0}
                  onClick={handleBulkConvertToSale}
                  className="px-5 py-2 rounded-xl bg-[#33077C] hover:bg-[#4309A2] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#33077C]/20"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Convert Selected ({selectedBulkChallanIds.length})</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. Preview / Print Modal */}
      {previewChallan && (
        <Modal
          isOpen={!!previewChallan}
          onClose={() => setPreviewChallan(null)}
          title={`Delivery Challan - ${previewChallan.challanNo}`}
          subtitle={`Goods dispatch for ${previewChallan.partyName} on ${isoToDdmmyyyy(previewChallan.invoiceDate)}`}
          maxWidth="3xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
        >
          <div className="p-6 sm:p-8 space-y-6 bg-white text-slate-800 font-sans">
            <div className="flex justify-between items-start border-b border-slate-200 pb-6">
              <div>
                <h2 className="text-2xl font-black text-[#33077C]">YAA CREATIONS CRM</h2>
                <p className="text-xs text-slate-500 mt-1">
                  128 Commercial Boulevard, Tech Park, Chennai - 600001
                </p>
                <p className="text-xs text-slate-500">GSTIN: 33AAAAA0000A1Z5 | Phone: +91 98765 43210</p>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 rounded-lg bg-purple-100 text-[#33077C] font-black text-xs uppercase tracking-wider mb-2">
                  DELIVERY CHALLAN
                </span>
                <p className="text-sm font-bold text-slate-900">{previewChallan.challanNo}</p>
                <p className="text-xs text-slate-500">Date: {isoToDdmmyyyy(previewChallan.invoiceDate)}</p>
                {previewChallan.vehicleNo && (
                  <p className="text-xs font-semibold text-slate-700">Vehicle No: {previewChallan.vehicleNo}</p>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Consignee / Party:</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{previewChallan.partyName}</p>
                {previewChallan.customerCompany && <p>{previewChallan.customerCompany}</p>}
                {previewChallan.customerPhone && <p>Phone: {previewChallan.customerPhone}</p>}
                {previewChallan.billingAddress && <p>{previewChallan.billingAddress}</p>}
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Dispatch Details:</p>
                <p className="mt-0.5"><strong className="text-slate-700">Ref No:</strong> {previewChallan.referenceNo || '-'}</p>
                <p><strong className="text-slate-700">State of Supply:</strong> {previewChallan.stateOfSupply || 'Tamil Nadu'}</p>
                <p><strong className="text-slate-700">Status:</strong> {previewChallan.status}</p>
              </div>
            </div>

            <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-[#33077C] text-white font-bold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="p-2.5 text-white">#</th>
                  <th className="p-2.5 text-white">Item &amp; Description</th>
                  <th className="p-2.5 text-center text-white">Dispatched Qty</th>
                  <th className="p-2.5 text-right text-white">Unit Price</th>
                  <th className="p-2.5 text-right text-white">Tax (%)</th>
                  <th className="p-2.5 text-right text-white">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewChallan.items.map((it, i) => (
                  <tr key={i}>
                    <td className="p-2.5 text-slate-400">{i + 1}</td>
                    <td className="p-2.5 font-bold text-slate-800">{it.productName}</td>
                    <td className="p-2.5 text-center font-bold text-[#33077C]">{it.quantity} {it.unit || ''}</td>
                    <td className="p-2.5 text-right">₹{Number(it.unitPrice || 0).toLocaleString('en-IN')}</td>
                    <td className="p-2.5 text-right">{it.taxPercent || 0}%</td>
                    <td className="p-2.5 text-right font-bold">₹{Number(it.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end pt-2">
              <div className="w-64 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-800">₹{Number(previewChallan.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {previewChallan.taxAmount !== undefined && previewChallan.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span>GST Tax:</span>
                    <span className="font-semibold text-slate-800">₹{Number(previewChallan.taxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-[#33077C] pt-2 border-t border-slate-200">
                  <span>Total Value:</span>
                  <span>₹{Number(previewChallan.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Receiver's Acknowledgement Signature box */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-200 text-xs">
              <div className="space-y-8">
                <p className="text-slate-500">Receiver's Signature &amp; Stamp:</p>
                <div className="border-b border-slate-300 w-48"></div>
              </div>
              <div className="text-right space-y-8">
                <p className="text-slate-500">For Yaa Creations (Authorized Signatory):</p>
                <div className="border-b border-slate-300 w-48 ml-auto"></div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewChallan(null)}
                className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold flex items-center gap-2 shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Print Challan</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
