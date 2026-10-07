import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  FileText,
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
  IndianRupee,
  TrendingUp,
  Calendar,
  Building2,
  User,
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

const ddmmyyyyToIso = (dmy?: string): string => {
  if (!dmy) return '';
  const parts = dmy.split('/');
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return dmy;
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
  { label: 'Expired', value: 'Expired', dotColor: '#64748b' },
  { label: 'Cancelled', value: 'Cancelled', dotColor: '#ef4444' },
];

export interface ExtendedProformaItem extends SaleProductItem {
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

export interface SaleProformaInvoice {
  id: string;
  proformaNo: string;
  referenceNo?: string;
  date: string;
  validUntil: string;
  customerId: string;
  partyName: string;
  customerCompany?: string;
  customerPhone?: string;
  customerEmail?: string;
  billingAddress: string;
  shippingAddress?: string;
  stateOfSupply?: string;
  items: ExtendedProformaItem[];
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
  status: 'Open' | 'Converted' | 'Expired' | 'Cancelled';
  convertedToInvoiceNo?: string;
  notes?: string;
  terms?: string;
  attachedImageName?: string;
  attachedDocName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProformaTabItem {
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
    proformaNo: string;
    referenceNo: string;
    date: string;
    validUntil: string;
    stateOfSupply: string;
    items: ExtendedProformaItem[];
    notes: string;
    terms: string;
  };
  editingProforma?: SaleProformaInvoice | null;
  enableRoundOff?: boolean;
  manualRoundOff?: number | null;
  columnSettings?: TableColumnSettings;
}

const INITIAL_PROFORMA_LIST: SaleProformaInvoice[] = [
  {
    id: 'pro_1',
    proformaNo: 'PRO-2026-0001',
    referenceNo: '1',
    date: '2026-10-05',
    validUntil: '2026-10-31',
    customerId: 'cust_keerthi',
    partyName: 'Keerthivasan',
    customerCompany: 'Keerthi Tech Enterprises',
    customerPhone: '9840123456',
    customerEmail: 'keerthivasan@gmail.com',
    billingAddress: 'No. 15 Anna Salai, Chennai, Tamil Nadu 600002',
    stateOfSupply: '33-Tamil Nadu',
    items: [
      {
        id: 'pi_1',
        productId: 'PROD_1001',
        productName: 'Commercial Supplies & Service Consultation',
        quantity: 1,
        unit: 'PCS',
        unitPrice: 80,
        discountPercent: 0,
        taxPercent: 0,
        total: 80,
      },
    ],
    subtotal: 80,
    withGst: false,
    discount: 0,
    taxAmount: 0,
    roundOff: 0,
    amount: 80,
    balance: 80,
    status: 'Open',
    terms: '1. Advance payment required.\n2. Goods once confirmed will be processed within 3 days.\n3. Valid for 30 days from issue date.',
    notes: 'Commercial proforma invoice quotation.',
    createdAt: '2026-10-05T10:00:00Z',
    updatedAt: '2026-10-05T10:00:00Z',
  },
  {
    id: 'pro_2',
    proformaNo: 'PRO-2026-0002',
    referenceNo: '2',
    date: '2026-10-03',
    validUntil: '2026-10-25',
    customerId: 'cust_2',
    partyName: 'Royal Spice Caterers',
    customerCompany: 'Royal Spice Caterers',
    customerPhone: '+91 97890 45678',
    customerEmail: 'orders@royalspice.in',
    billingAddress: '45 Mount Road, Teynampet, Chennai, Tamil Nadu 600018',
    stateOfSupply: '33-Tamil Nadu',
    items: [
      {
        id: 'pi_3',
        productId: 'PROD_1002',
        productName: 'Aashirvaad Shudh Chakki Atta (10 Kg Bag)',
        quantity: 25,
        unit: 'BAG',
        unitPrice: 420,
        discountPercent: 2,
        taxPercent: 5,
        total: 10804.5,
      },
    ],
    subtotal: 10500,
    withGst: true,
    gstType: 'intra_state',
    cgst: 257.25,
    sgst: 257.25,
    igst: 0,
    discount: 210,
    taxAmount: 514.5,
    roundOff: 0.5,
    amount: 10805,
    balance: 0,
    status: 'Converted',
    convertedToInvoiceNo: 'INV-2026-0104',
    terms: 'Standard supply terms apply.',
    notes: 'Converted to Tax Invoice on confirmation of purchase.',
    createdAt: '2026-10-03T11:30:00Z',
    updatedAt: '2026-10-03T14:20:00Z',
  },
];

interface ProformaInvoiceViewProps {
  initialMode?: 'list' | 'form';
}

export const ProformaInvoiceView: React.FC<ProformaInvoiceViewProps> = ({
  initialMode = 'list',
}) => {
  const navigate = useNavigate();
  const { customers, stocks, saveCustomer, saveSale } = useSalesManagementStore();

  // Proforma state with localStorage persistence
  const [proformaList, setProformaList] = useState<SaleProformaInvoice[]>(() => {
    try {
      const saved = localStorage.getItem('yaa_crm_proforma_invoices');
      return saved ? JSON.parse(saved) : INITIAL_PROFORMA_LIST;
    } catch {
      return INITIAL_PROFORMA_LIST;
    }
  });

  const persistProformas = (updated: SaleProformaInvoice[]) => {
    setProformaList(updated);
    try {
      localStorage.setItem('yaa_crm_proforma_invoices', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save proforma invoices', e);
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

  // Dropdowns & Action Menu
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [activeConvertDropdownId, setActiveConvertDropdownId] = useState<string | null>(null);
  const [convertDropdownPos, setConvertDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  // Preview / Print Modal
  const [previewProforma, setPreviewProforma] = useState<SaleProformaInvoice | null>(null);

  // Dynamic Table Column Customization State
  const [columnSettings, setColumnSettings] = useState<TableColumnSettings>({
    showItemCategory: false,
    showItemCode: false,
    showHsnSac: false,
    showDescription: false,
    showDiscount: true,
  });
  const [showColumnCustomizePopover, setShowColumnCustomizePopover] = useState(false);

  // Price tax mode: without_tax or with_tax
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
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerCompany, setNewCustomerCompany] = useState('');

  // Form State
  const [editingProforma, setEditingProforma] = useState<SaleProformaInvoice | null>(null);
  const [partySearchOpen, setPartySearchOpen] = useState(false);
  const [partySearchQuery, setPartySearchQuery] = useState('');
  const partySelectRef = useRef<HTMLDivElement>(null);
  const [showShareFooterMenu, setShowShareFooterMenu] = useState(false);

  // Helper to build fresh proforma formData
  const createDefaultFormData = (num: number = 1) => {
    const year = new Date().getFullYear();
    const nextCode = `PRO-${year}-${String(proformaList.length + num).padStart(4, '0')}`;
    const defaultProd1 = stocks && stocks.length > 0 ? stocks[0] : null;
    const defaultProd2 = stocks && stocks.length > 1 ? stocks[1] : null;

    const initialRows: ExtendedProformaItem[] = [
      defaultProd1
        ? {
            id: `row_${Date.now()}_1`,
            productId: defaultProd1.productId,
            productName: defaultProd1.productName,
            sku: defaultProd1.sku,
            itemCode: defaultProd1.sku,
            category: (defaultProd1 as any).category || (defaultProd1 as any).categoryName || '',
            quantity: 1,
            unit: 'PCS',
            unitPrice: defaultProd1.unitPrice || 495,
            discountPercent: 0,
            discountAmount: 0,
            taxPercent: 5,
            taxAmount: Math.round(((defaultProd1.unitPrice || 495) * 0.05) * 100) / 100,
            total: Math.round(((defaultProd1.unitPrice || 495) * 1.05) * 100) / 100,
          }
        : {
            id: `row_${Date.now()}_1`,
            productId: '',
            productName: 'Aashirvaad Superior MP Sharbati Atta (10 Kg)',
            quantity: 1,
            unit: 'PCS',
            unitPrice: 495,
            discountPercent: 0,
            discountAmount: 0,
            taxPercent: 5,
            taxAmount: 24.75,
            total: 519.75,
          },
      defaultProd2
        ? {
            id: `row_${Date.now()}_2`,
            productId: defaultProd2.productId,
            productName: defaultProd2.productName,
            sku: defaultProd2.sku,
            itemCode: defaultProd2.sku,
            category: (defaultProd2 as any).category || (defaultProd2 as any).categoryName || '',
            quantity: 1,
            unit: 'KG',
            unitPrice: defaultProd2.unitPrice || 699,
            discountPercent: 0,
            discountAmount: 0,
            taxPercent: 5,
            taxAmount: Math.round(((defaultProd2.unitPrice || 699) * 0.05) * 100) / 100,
            total: Math.round(((defaultProd2.unitPrice || 699) * 1.05) * 100) / 100,
          }
        : {
            id: `row_${Date.now()}_2`,
            productId: '',
            productName: 'India Gate Super Premium Basmati Rice (5 Kg)',
            quantity: 1,
            unit: 'KG',
            unitPrice: 699,
            discountPercent: 0,
            discountAmount: 0,
            taxPercent: 5,
            taxAmount: 34.95,
            total: 733.95,
          },
    ];

    return {
      customerId: '',
      partyName: '',
      customerPhone: '',
      customerEmail: '',
      customerCompany: '',
      billingAddress: '',
      proformaNo: nextCode,
      referenceNo: String(num),
      date: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      stateOfSupply: '33-Tamil Nadu',
      items: initialRows,
      notes: 'Thank you for your business inquiry. Prices valid for 30 days.',
      terms: '1. Prices are valid for 30 days from issue date.\n2. Goods once confirmed will be dispatched within 48 hours.\n3. 100% payment on delivery / Net 15 days for verified accounts.',
    };
  };

  // Initial Form Data (starts with Ref No. 1)
  const [formData, setFormData] = useState(() => createDefaultFormData(1));

  // Multi-tab support for proforma invoices
  const [activeTabId, setActiveTabId] = useState('tab_1');
  const [tabs, setTabs] = useState<ProformaTabItem[]>([
    {
      id: 'tab_1',
      title: 'Proforma Invoice #1',
      num: 1,
      formData: createDefaultFormData(1),
      editingProforma: null,
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

  // Filtered party list for Party Search Dropdown
  const filteredCustomers = useMemo(() => {
    const q = partySearchQuery.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.company && c.company.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.customerCode && c.customerCode.toLowerCase().includes(q))
    );
  }, [customers, partySearchQuery]);

  // Form Initializer (Opens Proforma Invoice #1)
  const handleOpenCreateForm = () => {
    const initialData = createDefaultFormData(1);
    const firstTab: ProformaTabItem = {
      id: 'tab_1',
      title: 'Proforma Invoice #1',
      num: 1,
      formData: initialData,
      editingProforma: null,
      enableRoundOff: true,
      manualRoundOff: null,
      columnSettings: {
        showItemCategory: false,
        showItemCode: false,
        showHsnSac: false,
        showDescription: false,
        showDiscount: true,
      },
    };
    setTabs([firstTab]);
    setActiveTabId('tab_1');
    setFormData(initialData);
    setEditingProforma(null);
    setEnableRoundOff(true);
    setManualRoundOff(null);
    setViewMode('form');
  };

  // Add New Proforma Tab (clicks + button in tab bar)
  const handleAddNewTab = () => {
    const maxNum = tabs.reduce((max, t) => Math.max(max, t.num || 1), 0);
    const nextNum = Math.max(1, maxNum + 1);
    const newTabId = `tab_${Date.now()}`;
    const newFormData = createDefaultFormData(nextNum);
    const newTab: ProformaTabItem = {
      id: newTabId,
      title: `Proforma Invoice #${nextNum}`,
      num: nextNum,
      formData: newFormData,
      editingProforma: null,
      enableRoundOff: true,
      manualRoundOff: null,
      columnSettings: { ...columnSettings },
    };

    setTabs((prev) => [
      ...prev.map((t) => (t.id === activeTabId ? { ...t, formData, editingProforma, enableRoundOff, manualRoundOff, columnSettings } : t)),
      newTab,
    ]);
    setActiveTabId(newTabId);
    setFormData(newFormData);
    setEditingProforma(null);
    setEnableRoundOff(true);
    setManualRoundOff(null);
  };

  // Switch Active Tab
  const handleSelectTab = (tabId: string) => {
    if (tabId === activeTabId) return;
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, formData, editingProforma, enableRoundOff, manualRoundOff, columnSettings } : t))
    );
    const target = tabs.find((t) => t.id === tabId);
    if (target) {
      setActiveTabId(tabId);
      setFormData(target.formData);
      setEditingProforma(target.editingProforma || null);
      if (target.enableRoundOff !== undefined) setEnableRoundOff(target.enableRoundOff);
      if (target.manualRoundOff !== undefined) setManualRoundOff(target.manualRoundOff);
      if (target.columnSettings !== undefined) setColumnSettings(target.columnSettings);
    }
  };

  // Close Tab
  const handleCloseTab = (e: React.MouseEvent, tabIdToClose: string) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      setViewMode('list');
      return;
    }
    const filtered = tabs.filter((t) => t.id !== tabIdToClose);
    setTabs(filtered);
    if (activeTabId === tabIdToClose) {
      const nextTab = filtered[filtered.length - 1];
      setActiveTabId(nextTab.id);
      setFormData(nextTab.formData);
      setEditingProforma(nextTab.editingProforma || null);
      if (nextTab.enableRoundOff !== undefined) setEnableRoundOff(nextTab.enableRoundOff);
      if (nextTab.manualRoundOff !== undefined) setManualRoundOff(nextTab.manualRoundOff);
      if (nextTab.columnSettings !== undefined) setColumnSettings(nextTab.columnSettings);
    }
  };

  // Switch to Form Mode for Editing Proforma
  const handleOpenEditForm = (proforma: SaleProformaInvoice) => {
    const mappedItems: ExtendedProformaItem[] = proforma.items.map((it) => {
      const stockItem = stocks.find((s) => s.productId === it.productId || s.productName === it.productName);
      return {
        ...it,
        id: it.id || `row_${Date.now()}_${Math.random()}`,
        unit: it.unit || 'PCS',
        discountPercent: it.discountPercent || 0,
        discountAmount: it.discountAmount || (it.discountPercent ? ((it.quantity * it.unitPrice * it.discountPercent) / 100) : 0),
        taxPercent: it.taxPercent || 0,
        taxAmount: it.taxAmount || (it.taxPercent ? (((it.quantity * it.unitPrice - (it.discountAmount || 0)) * it.taxPercent) / 100) : 0),
        category: it.category || (stockItem as any)?.category || '',
        itemCode: it.itemCode || stockItem?.sku || '',
        total: it.total || (it.quantity * it.unitPrice),
      };
    });

    const editData = {
      customerId: proforma.customerId,
      partyName: proforma.partyName,
      customerPhone: proforma.customerPhone || '',
      customerEmail: proforma.customerEmail || '',
      customerCompany: proforma.customerCompany || '',
      billingAddress: proforma.billingAddress || '',
      proformaNo: proforma.proformaNo,
      referenceNo: proforma.referenceNo || '1',
      date: proforma.date,
      validUntil: proforma.validUntil,
      stateOfSupply: proforma.stateOfSupply || '33-Tamil Nadu',
      items: mappedItems.length > 0 ? mappedItems : createDefaultFormData().items,
      notes: proforma.notes || 'Thank you for your business inquiry.',
      terms: proforma.terms || '1. Prices valid for 30 days.',
    };

    setFormData(editData);
    setTabs([
      {
        id: 'tab_1',
        title: `Proforma #${proforma.referenceNo || '1'}`,
        num: Number(proforma.referenceNo) || 1,
        formData: editData,
        editingProforma: proforma,
        enableRoundOff: proforma.roundOff !== undefined && proforma.roundOff !== 0,
        manualRoundOff: proforma.roundOff || null,
        columnSettings: { ...columnSettings },
      },
    ]);
    setActiveTabId('tab_1');
    setEditingProforma(proforma);
    setAttachedImageName(proforma.attachedImageName || null);
    setAttachedDocName(proforma.attachedDocName || null);
    setViewMode('form');
  };

  // Row operations
  const handleAddRow = () => {
    const newRow: ExtendedProformaItem = {
      id: `row_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productId: '',
      productName: '',
      quantity: 1,
      unit: 'NONE',
      unitPrice: 0,
      discountPercent: 0,
      discountAmount: 0,
      taxPercent: 0,
      taxAmount: 0,
      total: 0,
    };
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newRow],
    }));
  };

  const handleRemoveRow = (index: number) => {
    if (formData.items.length <= 1) {
      toast.error('Proforma invoice must have at least one line item row.');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Realtime Row Item change & auto-calculations
  const handleRowChange = (index: number, field: keyof ExtendedProformaItem, value: any) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      const item = { ...newItems[index], [field]: value };

      if (field === 'productId') {
        const prod = stocks.find((s) => s.productId === value || s.id === value);
        if (prod) {
          item.productName = prod.productName;
          item.sku = prod.sku;
          item.itemCode = prod.sku;
          item.category = (prod as any).category || (prod as any).categoryName || item.category || '';
          item.unitPrice = prod.unitPrice || 0;
          item.unit = item.unit === 'NONE' ? 'PCS' : item.unit;
          item.taxPercent = 5;
        }
      } else if (field === 'productName') {
        const matched = stocks.find((s) => s.productName.toLowerCase() === String(value).toLowerCase());
        if (matched) {
          item.sku = matched.sku;
          item.itemCode = matched.sku;
          item.category = (matched as any).category || (matched as any).categoryName || item.category || '';
          if (!item.unitPrice || item.unitPrice === 0) {
            item.unitPrice = matched.unitPrice || 0;
          }
        }
      }

      const qty = Number(item.quantity) || 0;
      const rate = Number(item.unitPrice) || 0;
      const baseSub = qty * rate;

      let discPct = Number(item.discountPercent) || 0;
      let discAmt = Number(item.discountAmount) || 0;

      if (field === 'discountPercent') {
        discAmt = Math.round(((baseSub * discPct) / 100) * 100) / 100;
        item.discountAmount = discAmt;
      } else if (field === 'discountAmount') {
        discPct = baseSub > 0 ? Math.round(((discAmt / baseSub) * 100) * 100) / 100 : 0;
        item.discountPercent = discPct;
      } else {
        discAmt = Math.round(((baseSub * discPct) / 100) * 100) / 100;
        item.discountAmount = discAmt;
      }

      const taxable = Math.max(0, baseSub - discAmt);
      const taxRate = Number(item.taxPercent) || 0;
      const taxAmt = Math.round(((taxable * taxRate) / 100) * 100) / 100;
      item.taxAmount = taxAmt;

      item.total = Math.round((taxable + taxAmt) * 100) / 100;

      newItems[index] = item;
      return { ...prev, items: newItems };
    });
  };

  // Form Totals Calculation
  const formCalculations = useMemo(() => {
    let totalQty = 0;
    let rawSubtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let lineAmountTotal = 0;

    formData.items.forEach((it) => {
      const qty = Number(it.quantity) || 0;
      const rate = Number(it.unitPrice) || 0;
      const discAmt = Number(it.discountAmount) || 0;
      const taxAmt = Number(it.taxAmount) || 0;
      const total = Number(it.total) || 0;

      totalQty += qty;
      rawSubtotal += qty * rate;
      totalDiscount += discAmt;
      totalTax += taxAmt;
      lineAmountTotal += total;
    });

    const unroundedGrand = Math.max(0, lineAmountTotal);
    const roundedInt = Math.round(unroundedGrand);
    const autoRoundDiff = enableRoundOff ? Math.round((roundedInt - unroundedGrand) * 100) / 100 : 0;
    const finalRoundDiff = manualRoundOff !== null ? manualRoundOff : autoRoundDiff;
    const grandTotal = enableRoundOff ? roundedInt : Math.round((unroundedGrand + finalRoundDiff) * 100) / 100;

    return {
      totalQty,
      rawSubtotal: Math.round(rawSubtotal * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      lineAmountTotal: Math.round(lineAmountTotal * 100) / 100,
      roundOffDiff: finalRoundDiff,
      grandTotal: Math.max(0, grandTotal),
    };
  }, [formData.items, enableRoundOff, manualRoundOff]);

  // Quick Customer Creation
  const handleCreateQuickCustomer = () => {
    if (!newCustomerName.trim()) {
      toast.error('Customer name is required');
      return;
    }
    const newCust: SalesCustomer = {
      id: `cust_${Date.now()}`,
      customerCode: `CUST-${String(customers.length + 1).padStart(3, '0')}`,
      name: newCustomerName.trim(),
      company: newCustomerCompany.trim(),
      customerType: 'Business',
      phone: newCustomerPhone.trim(),
      email: '',
      address: 'Chennai, Tamil Nadu',
      city: 'Chennai',
      state: 'Tamil Nadu',
      country: 'India',
      pincode: '600001',
      billingAddress: 'Chennai, Tamil Nadu',
      shippingAddress: 'Chennai, Tamil Nadu',
      creditLimit: 50000,
      paymentTerms: 'Net 30 Days',
      openingBalance: 0,
      outstandingAmount: 0,
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveCustomer(newCust);
    setFormData((prev) => ({
      ...prev,
      customerId: newCust.id,
      partyName: newCust.name,
      customerCompany: newCust.company,
      customerPhone: newCust.phone,
      billingAddress: newCust.address,
    }));
    setIsQuickCustomerModalOpen(false);
    setPartySearchOpen(false);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setNewCustomerCompany('');
    toast.success(`Customer "${newCust.name}" added successfully!`);
  };

  // Save Proforma Invoice Handler
  const handleSaveProforma = (andConvert = false) => {
    if (!formData.partyName.trim()) {
      toast.error('Please select or enter Party / Customer name');
      return;
    }
    const validItems = formData.items.filter((it) => it.productName.trim() || Number(it.unitPrice) > 0);
    if (validItems.length === 0) {
      toast.error('Please add at least one line item with name and rate');
      return;
    }

    const { rawSubtotal, totalTax, totalDiscount, roundOffDiff, grandTotal } = formCalculations;

    const proformaId = editingProforma ? editingProforma.id : `pro_${Date.now()}`;
    const newProforma: SaleProformaInvoice = {
      id: proformaId,
      proformaNo: formData.proformaNo || `PRO-${new Date().getFullYear()}-${String(proformaList.length + 1).padStart(4, '0')}`,
      referenceNo: formData.referenceNo || '1',
      date: formData.date,
      validUntil: formData.validUntil,
      customerId: formData.customerId || `cust_${Date.now()}`,
      partyName: formData.partyName,
      customerPhone: formData.customerPhone,
      customerEmail: formData.customerEmail,
      customerCompany: formData.customerCompany,
      billingAddress: formData.billingAddress,
      stateOfSupply: formData.stateOfSupply,
      items: validItems,
      subtotal: rawSubtotal,
      withGst: totalTax > 0,
      gstType: formData.stateOfSupply?.includes('Tamil Nadu') ? 'intra_state' : 'inter_state',
      cgst: totalTax / 2,
      sgst: totalTax / 2,
      igst: 0,
      discount: totalDiscount,
      taxAmount: totalTax,
      roundOff: roundOffDiff,
      amount: grandTotal,
      balance: grandTotal,
      status: andConvert ? 'Converted' : (editingProforma ? editingProforma.status : 'Open'),
      convertedToInvoiceNo: andConvert ? `INV-${new Date().getFullYear()}-010${proformaList.length + 5}` : undefined,
      notes: formData.notes,
      terms: formData.terms,
      attachedImageName: attachedImageName || undefined,
      attachedDocName: attachedDocName || undefined,
      createdAt: editingProforma ? editingProforma.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let updatedList: SaleProformaInvoice[];
    if (editingProforma) {
      updatedList = proformaList.map((p) => (p.id === proformaId ? newProforma : p));
      toast.success(`Proforma Invoice ${newProforma.proformaNo} updated successfully!`);
    } else {
      updatedList = [newProforma, ...proformaList];
      toast.success(`Proforma Invoice ${newProforma.proformaNo} created successfully!`);
    }

    persistProformas(updatedList);

    if (andConvert) {
      const saleInvoiceNo = `INV-${new Date().getFullYear()}-${String(100 + proformaList.length + 1).padStart(4, '0')}`;
      const newSale: SaleTransaction = {
        id: `sale_${Date.now()}`,
        invoiceNo: saleInvoiceNo,
        referenceNo: newProforma.proformaNo,
        saleDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        customerId: newProforma.customerId,
        customerName: newProforma.partyName,
        customerCompany: newProforma.customerCompany,
        customerPhone: newProforma.customerPhone,
        customerEmail: newProforma.customerEmail,
        billingAddress: newProforma.billingAddress,
        shippingAddress: newProforma.billingAddress,
        items: newProforma.items,
        subtotal: newProforma.subtotal,
        withGst: newProforma.withGst,
        gstType: newProforma.gstType,
        cgst: newProforma.cgst,
        sgst: newProforma.sgst,
        igst: newProforma.igst,
        totalDiscount: newProforma.discount || 0,
        totalTax: newProforma.taxAmount || 0,
        shippingCharges: 0,
        otherCharges: 0,
        grandTotal: newProforma.amount,
        paidAmount: 0,
        balance: newProforma.amount,
        paymentMethod: 'Cash',
        paymentTerms: '15 Days',
        paymentStatus: 'Unpaid',
        saleStatus: 'Confirmed',
        createdBy: 'Current User',
        salesperson: 'Sales Rep',
        notes: `Converted from Proforma Invoice ${newProforma.proformaNo}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveSale(newSale);
      toast.success(`Proforma converted to Sale Invoice ${saleInvoiceNo}!`);
    }

    if (tabs.length > 1) {
      const remainingTabs = tabs.filter((t) => t.id !== activeTabId);
      setTabs(remainingTabs);
      const nextActive = remainingTabs[remainingTabs.length - 1];
      setActiveTabId(nextActive.id);
      setFormData(nextActive.formData);
      setEditingProforma(nextActive.editingProforma || null);
      if (nextActive.enableRoundOff !== undefined) setEnableRoundOff(nextActive.enableRoundOff);
      if (nextActive.manualRoundOff !== undefined) setManualRoundOff(nextActive.manualRoundOff);
      if (nextActive.columnSettings !== undefined) setColumnSettings(nextActive.columnSettings);
    } else {
      setViewMode('list');
    }
  };

  // Convert Existing Proforma from list
  const handleConvertExistingToSale = (proforma: SaleProformaInvoice) => {
    const saleInvoiceNo = `INV-${new Date().getFullYear()}-${String(100 + proformaList.length + 1).padStart(4, '0')}`;
    const newSale: SaleTransaction = {
      id: `sale_${Date.now()}`,
      invoiceNo: saleInvoiceNo,
      referenceNo: proforma.proformaNo,
      saleDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      customerId: proforma.customerId,
      customerName: proforma.partyName,
      customerCompany: proforma.customerCompany,
      customerPhone: proforma.customerPhone,
      customerEmail: proforma.customerEmail,
      billingAddress: proforma.billingAddress,
      shippingAddress: proforma.billingAddress,
      items: proforma.items,
      subtotal: proforma.subtotal,
      withGst: proforma.withGst,
      gstType: proforma.gstType,
      cgst: proforma.cgst,
      sgst: proforma.sgst,
      igst: proforma.igst,
      totalDiscount: proforma.discount || 0,
      totalTax: proforma.taxAmount || 0,
      shippingCharges: 0,
      otherCharges: 0,
      grandTotal: proforma.amount,
      paidAmount: 0,
      balance: proforma.amount,
      paymentMethod: 'Cash',
      paymentTerms: '15 Days',
      paymentStatus: 'Unpaid',
      saleStatus: 'Confirmed',
      createdBy: 'Current User',
      salesperson: 'Sales Rep',
      notes: `Converted from Proforma Invoice ${proforma.proformaNo}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveSale(newSale);
    const updated = proformaList.map((p) =>
      p.id === proforma.id ? { ...p, status: 'Converted' as const, convertedToInvoiceNo: saleInvoiceNo } : p
    );
    persistProformas(updated);
    toast.success(`Proforma ${proforma.proformaNo} converted to Sale Invoice ${saleInvoiceNo}!`);
  };

  // Convert Existing Proforma to Sale Order
  const handleConvertExistingToOrder = (proforma: SaleProformaInvoice) => {
    try {
      const savedOrdersStr = localStorage.getItem('yaa_crm_sale_orders');
      const savedOrders = savedOrdersStr ? JSON.parse(savedOrdersStr) : [];
      const nextNum = savedOrders.length + 1;
      const orderNo = `SO-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;

      const newOrder = {
        id: `so_${Date.now()}`,
        orderNo,
        referenceNo: proforma.proformaNo,
        orderDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        customerId: proforma.customerId,
        partyName: proforma.partyName,
        customerCompany: proforma.customerCompany,
        customerPhone: proforma.customerPhone,
        customerEmail: proforma.customerEmail,
        billingAddress: proforma.billingAddress,
        shippingAddress: proforma.shippingAddress || proforma.billingAddress,
        stateOfSupply: proforma.stateOfSupply || '33-Tamil Nadu',
        paymentType: 'Cash',
        items: proforma.items,
        subtotal: proforma.subtotal,
        withGst: proforma.withGst,
        gstType: proforma.gstType,
        cgst: proforma.cgst,
        sgst: proforma.sgst,
        igst: proforma.igst,
        discount: proforma.discount || 0,
        taxAmount: proforma.taxAmount || 0,
        roundOff: proforma.roundOff || 0,
        amount: proforma.amount,
        advanceAmount: 0,
        balance: proforma.amount,
        status: 'Open',
        notes: `Converted from Proforma Invoice ${proforma.proformaNo}`,
        terms: proforma.terms,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem('yaa_crm_sale_orders', JSON.stringify([newOrder, ...savedOrders]));

      const updated = proformaList.map((p) =>
        p.id === proforma.id ? { ...p, status: 'Converted' as const } : p
      );
      persistProformas(updated);
      toast.success(`Proforma ${proforma.proformaNo} converted to Sale Order ${orderNo}!`);
      setActiveConvertDropdownId(null);
      setConvertDropdownPos(null);
    } catch (e) {
      console.error('Failed to convert proforma to order', e);
      toast.error('Failed to convert proforma to order');
    }
  };

  // Duplicate Proforma
  const handleDuplicateProforma = (proforma: SaleProformaInvoice) => {
    const nextNum = proformaList.length + 1;
    const newProformaNo = `PRO-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;
    const duplicated: SaleProformaInvoice = {
      ...proforma,
      id: `pro_${Date.now()}`,
      proformaNo: newProformaNo,
      referenceNo: String(nextNum),
      date: new Date().toISOString().split('T')[0],
      status: 'Open',
      convertedToInvoiceNo: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [duplicated, ...proformaList];
    persistProformas(updated);
    toast.success(`Duplicated ${proforma.proformaNo} as new Proforma ${newProformaNo}!`);
    setActiveDropdownId(null);
    setDropdownPos(null);
  };

  // Delete Proforma
  const handleDeleteProforma = (id: string) => {
    const updated = proformaList.filter((p) => p.id !== id);
    persistProformas(updated);
    toast.success('Proforma invoice removed.');
    setActiveDropdownId(null);
    setDropdownPos(null);
  };

  // Metrics Calculation
  const metrics = useMemo(() => {
    let totalVal = 0;
    let convertedVal = 0;
    let openVal = 0;

    proformaList.forEach((p) => {
      totalVal += p.amount;
      if (p.status === 'Converted') {
        convertedVal += p.amount;
      } else if (p.status === 'Open') {
        openVal += p.amount;
      }
    });

    return {
      totalVal,
      convertedVal,
      openVal,
      totalCount: proformaList.length,
    };
  }, [proformaList]);

  // Filtered Proforma Invoices for List View
  const filteredProformas = useMemo(() => {
    return proformaList.filter((p) => {
      const q = appliedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.proformaNo.toLowerCase().includes(q) ||
        p.partyName.toLowerCase().includes(q) ||
        (p.referenceNo && p.referenceNo.toLowerCase().includes(q)) ||
        (p.customerPhone && p.customerPhone.toLowerCase().includes(q));

      const matchesStatus = appliedStatus === 'ALL' || p.status === appliedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [proformaList, appliedSearch, appliedStatus]);

  // Paginated list
  const totalPages = Math.max(1, Math.ceil(filteredProformas.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedProformas = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredProformas.slice(start, start + pageSize);
  }, [filteredProformas, safePage, pageSize]);

  // Close dropdowns on outside click and scroll/resize
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.proforma-action-dropdown-menu') && !target.closest('.proforma-action-btn') && !target.closest('.proforma-convert-dropdown-menu') && !target.closest('.proforma-convert-btn')) {
        setActiveDropdownId(null);
        setActiveConvertDropdownId(null);
        setDropdownPos(null);
        setConvertDropdownPos(null);
      }
      if (partySelectRef.current && !partySelectRef.current.contains(target)) {
        setPartySearchOpen(false);
      }
      if (!target.closest('.proforma-share-footer-container')) {
        setShowShareFooterMenu(false);
      }
      if (!target.closest('.table-column-customize-popover') && !target.closest('.table-column-customize-btn')) {
        setShowColumnCustomizePopover(false);
      }
    };
    const handleScrollOrResize = () => {
      setActiveDropdownId(null);
      setActiveConvertDropdownId(null);
      setDropdownPos(null);
      setConvertDropdownPos(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, []);

  // =========================================================================
  // VIEW MODE: FULL SCREEN CREATE / EDIT FORM (MATCHING ESTIMATE/QUOTATION UI)
  // =========================================================================
  if (viewMode === 'form') {
    return (
      <div className="min-h-screen bg-slate-50/70 pb-20 -m-3 sm:-m-6 p-3 sm:p-6 flex flex-col font-sans animate-in fade-in duration-150">
        {/* 1. TOP TAB BAR */}
        <div className="flex items-center justify-between border-b border-slate-200/90 pb-2 mb-4">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = activeTabId === tab.id;
              return (
                <div
                  key={tab.id}
                  onClick={() => handleSelectTab(tab.id)}
                  className={`group relative flex items-center gap-2.5 px-4 py-2 rounded-t-xl text-xs font-semibold cursor-pointer transition-all border ${
                    isActive
                      ? 'bg-white text-[#33077C] border-slate-200 border-b-white shadow-xs font-bold ring-1 ring-[#33077C]/10'
                      : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 border-transparent'
                  }`}
                >
                  <span className="truncate max-w-[150px]">{tab.title}</span>
                  <button
                    type="button"
                    onClick={(e) => handleCloseTab(e, tab.id)}
                    className="text-slate-400 hover:text-rose-600 rounded p-0.5 transition-colors cursor-pointer"
                    title="Close tab"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            {/* Plus Tab Button (CRM Theme - Adds another proforma tab) */}
            <button
              type="button"
              onClick={handleAddNewTab}
              className="w-7 h-7 rounded-full bg-[#33077C] hover:bg-[#4309A2] text-white flex items-center justify-center shadow-xs transition-transform active:scale-95 cursor-pointer ml-1"
              title="Add New Proforma Tab"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* 2. FORM HEADER / TITLE */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
              <FileText className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Proforma Invoice
              </h1>
              <p className="text-xs text-slate-500">
                {editingProforma ? `Edit Proforma ${editingProforma.proformaNo}` : 'Create a new customer proforma invoice'}
              </p>
            </div>
          </div>
        </div>

        {/* 3. MAIN FORM CONTAINER */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-6 flex-1 flex flex-col justify-between mb-6">
          <div>
            {/* Top Meta Details (Party + Ref/Date/State) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-6 border-b border-slate-100">
              {/* Left Column: Party Floating Box (CRM Theme) */}
              <div className="lg:col-span-6 xl:col-span-5" ref={partySelectRef}>
                <div className="relative">
                  {/* Floating Box Input */}
                  <div
                    onClick={() => setPartySearchOpen(!partySearchOpen)}
                    className={`relative w-full min-h-[46px] px-3.5 py-2 bg-white border-2 rounded-xl text-xs sm:text-[13px] font-medium flex items-center justify-between cursor-pointer transition-all ${
                      partySearchOpen
                        ? 'border-[#33077C] ring-4 ring-purple-100'
                        : formData.partyName
                        ? 'border-purple-300 hover:border-[#33077C]'
                        : 'border-slate-300 hover:border-[#33077C]'
                    }`}
                  >
                    {/* Floating Label Badge */}
                    <span className="absolute -top-2.5 left-3 bg-white px-1.5 text-[11px] font-bold text-[#33077C]">
                      Party <span className="text-rose-500">*</span>
                    </span>

                    {/* Display Party Name or Placeholder */}
                    <div className="truncate pr-2">
                      {formData.partyName ? (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{formData.partyName}</span>
                          {formData.customerCompany && (
                            <span className="text-slate-500 text-xs">({formData.customerCompany})</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">Select or search customer party...</span>
                      )}
                    </div>

                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>

                  {/* Dropdown Menu for Party Selection */}
                  {partySearchOpen && (
                    <div className="absolute left-0 top-full mt-1.5 w-full bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                      {/* Search Bar */}
                      <div className="relative mb-2">
                        <div className="flex items-center w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl focus-within:border-[#33077C] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#33077C]/10 transition-all">
                          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
                          <input
                            type="text"
                            placeholder="Search Party by name, phone or code..."
                            value={partySearchQuery}
                            onChange={(e) => setPartySearchQuery(e.target.value)}
                            autoFocus
                            className="w-full bg-transparent text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none"
                          />
                          {partySearchQuery && (
                            <button
                              type="button"
                              onClick={() => setPartySearchQuery('')}
                              className="text-slate-400 hover:text-slate-600 p-0.5"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Add New Customer Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setPartySearchOpen(false);
                          setIsQuickCustomerModalOpen(true);
                        }}
                        className="w-full px-3 py-2 text-left text-xs font-bold text-[#33077C] bg-purple-50/70 hover:bg-purple-100 rounded-xl flex items-center gap-2 transition-colors cursor-pointer mb-2"
                      >
                        <Plus className="w-4 h-4 text-[#33077C] stroke-[2.5]" />
                        <span>+ Add New Party / Customer</span>
                      </button>

                      {/* Customer List */}
                      <div className="max-h-56 overflow-y-auto space-y-1">
                        {filteredCustomers.length === 0 ? (
                          <div className="py-4 text-center text-xs text-slate-400 font-medium">
                            No customers found. Click "+ Add New Party" above.
                          </div>
                        ) : (
                          filteredCustomers.map((c) => {
                            const isSelected = formData.customerId === c.id;
                            return (
                              <div
                                key={c.id}
                                onClick={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    customerId: c.id,
                                    partyName: c.name,
                                    customerCompany: c.company || '',
                                    customerPhone: c.phone || '',
                                    customerEmail: c.email || '',
                                    billingAddress: c.billingAddress || c.address || '',
                                  }));
                                  setPartySearchOpen(false);
                                }}
                                className={`w-full px-3 py-2 rounded-xl text-left text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'bg-[#33077C] text-white font-bold'
                                    : 'text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <div>
                                  <div className="font-bold">{c.name} {c.company ? `(${c.company})` : ''}</div>
                                  <div className={`text-[11px] ${isSelected ? 'text-purple-200' : 'text-slate-400'}`}>
                                    {c.customerCode} • {c.phone || 'No phone'}
                                  </div>
                                </div>
                                {c.outstandingAmount ? (
                                  <span className={`text-[11px] font-semibold ${isSelected ? 'text-purple-200' : 'text-slate-500'}`}>
                                    ₹{Number(c.outstandingAmount).toLocaleString('en-IN')}
                                  </span>
                                ) : null}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Party Details Preview Pill */}
                {formData.partyName && (
                  <div className="mt-2.5 px-3 py-2 bg-purple-50/40 rounded-xl border border-purple-200/60 text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                    {formData.customerPhone && (
                      <div><span className="font-bold text-slate-700">Phone:</span> {formData.customerPhone}</div>
                    )}
                    {formData.billingAddress && (
                      <div><span className="font-bold text-slate-700">Address:</span> {formData.billingAddress}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Ref No, Invoice Date, State of supply */}
              <div className="lg:col-span-6 xl:col-span-7 flex flex-col items-end gap-3 text-xs">
                {/* Ref No. */}
                <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                  <span className="font-medium text-slate-600 w-24 sm:w-auto text-right">Ref No.</span>
                  <input
                    type="text"
                    value={formData.referenceNo}
                    onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
                    className="w-40 sm:w-48 h-9 px-3 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#33077C] rounded-lg text-xs font-semibold text-slate-800 outline-none text-right transition-colors"
                  />
                </div>

                {/* Invoice Date */}
                <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                  <span className="font-medium text-slate-600 w-24 sm:w-auto text-right">Invoice Date</span>
                  <div className="relative w-40 sm:w-48">
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full h-9 px-3 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#33077C] rounded-lg text-xs font-semibold text-slate-800 outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* State of Supply */}
                <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                  <span className="font-medium text-slate-600 w-24 sm:w-auto text-right">State of supply</span>
                  <select
                    value={formData.stateOfSupply}
                    onChange={(e) => setFormData({ ...formData, stateOfSupply: e.target.value })}
                    className="w-40 sm:w-48 h-9 px-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#33077C] rounded-lg text-xs font-semibold text-slate-800 outline-none cursor-pointer transition-colors"
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

            {/* 4. BILLING TABLE (THE GRID - CRM THEME) */}
            <div className="mt-6 overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs border-collapse">
                {/* Table Header */}
                <thead>
                  <tr className="bg-[#33077C] text-white font-bold uppercase text-[10.5px] border-b border-[#4309A2] tracking-wider select-none">
                    <th className="py-2.5 px-2.5 text-center border-r border-[#4309A2]/70 w-10 text-white/80 font-extrabold">+</th>
                    <th className="py-2.5 px-3 text-left border-r border-[#4309A2]/70 min-w-[200px] text-white">ITEM</th>
                    {columnSettings.showItemCategory && (
                      <th className="py-2.5 px-2.5 text-left border-r border-[#4309A2]/70 min-w-[130px] text-white">ITEM CATEGORY</th>
                    )}
                    {columnSettings.showItemCode && (
                      <th className="py-2.5 px-2.5 text-left border-r border-[#4309A2]/70 w-28 text-white">ITEM CODE</th>
                    )}
                    {columnSettings.showHsnSac && (
                      <th className="py-2.5 px-2.5 text-left border-r border-[#4309A2]/70 w-28 text-white">HSN/SAC CODE</th>
                    )}
                    {columnSettings.showDescription && (
                      <th className="py-2.5 px-2.5 text-left border-r border-[#4309A2]/70 min-w-[160px] text-white">DESCRIPTION</th>
                    )}
                    <th className="py-2.5 px-2 text-center border-r border-[#4309A2]/70 w-20 text-white">QTY</th>
                    <th className="py-2.5 px-2 text-center border-r border-[#4309A2]/70 w-24 text-white">UNIT</th>
                    <th className="py-2.5 px-3 text-right border-r border-[#4309A2]/70 w-36 text-white">
                      <div>PRICE/UNIT</div>
                      <div className="text-[9.5px] text-purple-200 font-normal lowercase">({priceTaxMode.toLowerCase()})</div>
                    </th>
                    {columnSettings.showDiscount && (
                      <th colSpan={2} className="py-2 px-2 text-center border-r border-[#4309A2]/70 text-white">
                        <div className="text-[10px]">DISCOUNT</div>
                        <div className="grid grid-cols-2 text-[9.5px] text-purple-200 font-semibold mt-0.5 border-t border-[#4309A2]/70 pt-1">
                          <span>%</span>
                          <span className="text-right pr-1">AMOUNT</span>
                        </div>
                      </th>
                    )}
                    <th colSpan={2} className="py-2 px-2 text-center border-r border-[#4309A2]/70 text-white">
                      <div className="text-[10px]">TAX</div>
                      <div className="grid grid-cols-2 text-[9.5px] text-purple-200 font-semibold mt-0.5 border-t border-[#4309A2]/70 pt-1">
                        <span>%</span>
                        <span className="text-right pr-1">AMOUNT</span>
                      </div>
                    </th>
                    <th className="py-2.5 px-3 text-right border-r border-[#4309A2]/70 w-36 relative text-white">
                      <div className="flex items-center justify-end gap-1.5">
                        <span>AMOUNT</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowColumnCustomizePopover(!showColumnCustomizePopover);
                          }}
                          className="table-column-customize-btn inline-flex items-center justify-center w-5 h-5 rounded-full text-white hover:bg-white/20 transition-colors cursor-pointer"
                          title="Customize table columns"
                        >
                          <PlusCircle className="w-4 h-4 text-white stroke-[2.2]" />
                        </button>
                      </div>

                      {/* Customization Dropdown Popover */}
                      {showColumnCustomizePopover && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="table-column-customize-popover absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-2xl border border-slate-200 p-2.5 z-50 text-left normal-case tracking-normal animate-in fade-in zoom-in-95 duration-100"
                        >
                          <div className="space-y-1">
                            <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-purple-50/60 cursor-pointer text-slate-700 select-none transition-colors">
                              <input
                                type="checkbox"
                                checked={columnSettings.showItemCategory}
                                onChange={(e) =>
                                  setColumnSettings((prev) => ({ ...prev, showItemCategory: e.target.checked }))
                                }
                                className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] accent-[#33077C] cursor-pointer"
                              />
                              <span className="text-xs font-semibold text-slate-700">Item Category</span>
                            </label>

                            <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-purple-50/60 cursor-pointer text-slate-700 select-none transition-colors">
                              <input
                                type="checkbox"
                                checked={columnSettings.showItemCode}
                                onChange={(e) =>
                                  setColumnSettings((prev) => ({ ...prev, showItemCode: e.target.checked }))
                                }
                                className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] accent-[#33077C] cursor-pointer"
                              />
                              <span className="text-xs font-semibold text-slate-700">Item Code</span>
                            </label>

                            <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-purple-50/60 cursor-pointer text-slate-700 select-none transition-colors">
                              <input
                                type="checkbox"
                                checked={columnSettings.showHsnSac}
                                onChange={(e) =>
                                  setColumnSettings((prev) => ({ ...prev, showHsnSac: e.target.checked }))
                                }
                                className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] accent-[#33077C] cursor-pointer"
                              />
                              <span className="text-xs font-semibold text-slate-700">HSN/SAC Code</span>
                            </label>

                            <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-purple-50/60 cursor-pointer text-slate-700 select-none transition-colors">
                              <input
                                type="checkbox"
                                checked={columnSettings.showDescription}
                                onChange={(e) =>
                                  setColumnSettings((prev) => ({ ...prev, showDescription: e.target.checked }))
                                }
                                className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] accent-[#33077C] cursor-pointer"
                              />
                              <span className="text-xs font-semibold text-slate-700">Description</span>
                            </label>

                            <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-purple-50/60 cursor-pointer text-slate-700 select-none transition-colors">
                              <input
                                type="checkbox"
                                checked={columnSettings.showDiscount}
                                onChange={(e) =>
                                  setColumnSettings((prev) => ({ ...prev, showDiscount: e.target.checked }))
                                }
                                className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] accent-[#33077C] cursor-pointer"
                              />
                              <span className="text-xs font-semibold text-slate-700">Discount</span>
                            </label>
                          </div>

                          <div className="my-1.5 border-t border-slate-100" />

                          <button
                            type="button"
                            onClick={() => {
                              setShowColumnCustomizePopover(false);
                              toast.info('Configure template and column styles');
                            }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold text-[#33077C] hover:bg-purple-50 transition-colors cursor-pointer"
                          >
                            <Settings className="w-3.5 h-3.5 text-[#33077C]" />
                            <span>More Settings</span>
                          </button>
                        </div>
                      )}
                    </th>
                    <th className="py-2.5 px-2 text-center w-10 text-slate-400"></th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-slate-200 bg-white">
                  {formData.items.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-purple-50/20 transition-colors group">
                      {/* Row Number */}
                      <td className="py-2 px-2 text-center font-bold text-slate-500 border-r border-slate-200 bg-slate-50/30">
                        {idx + 1}
                      </td>

                      {/* ITEM (Product Selector / Input) */}
                      <td className="p-1.5 border-r border-slate-200">
                        <div className="relative">
                          <input
                            type="text"
                            value={row.productName}
                            onChange={(e) => handleRowChange(idx, 'productName', e.target.value)}
                            placeholder="Type or select product item..."
                            list={`product-list-${idx}`}
                            className="w-full h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-[#33077C] rounded-lg text-xs font-semibold text-slate-800 outline-none transition-colors"
                          />
                          <datalist id={`product-list-${idx}`}>
                            {stocks.map((s) => (
                              <option key={s.productId} value={s.productName}>
                                SKU: {s.sku} • ₹{s.unitPrice}
                              </option>
                            ))}
                          </datalist>
                        </div>
                      </td>

                      {/* ITEM CATEGORY (optional column) */}
                      {columnSettings.showItemCategory && (
                        <td className="p-1.5 border-r border-slate-200">
                          <input
                            type="text"
                            value={row.category || ''}
                            onChange={(e) => handleRowChange(idx, 'category', e.target.value)}
                            placeholder="Category"
                            className="w-full h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-[#33077C] rounded-lg text-xs font-medium text-slate-700 outline-none transition-colors"
                          />
                        </td>
                      )}

                      {/* ITEM CODE (optional column) */}
                      {columnSettings.showItemCode && (
                        <td className="p-1.5 border-r border-slate-200">
                          <input
                            type="text"
                            value={row.itemCode || row.sku || ''}
                            onChange={(e) => handleRowChange(idx, 'itemCode', e.target.value)}
                            placeholder="Code / SKU"
                            className="w-full h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-[#33077C] rounded-lg text-xs font-mono font-medium text-slate-700 outline-none transition-colors"
                          />
                        </td>
                      )}

                      {/* HSN/SAC CODE (optional column) */}
                      {columnSettings.showHsnSac && (
                        <td className="p-1.5 border-r border-slate-200">
                          <input
                            type="text"
                            value={row.hsnCode || ''}
                            onChange={(e) => handleRowChange(idx, 'hsnCode', e.target.value)}
                            placeholder="HSN / SAC"
                            className="w-full h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-[#33077C] rounded-lg text-xs font-mono font-medium text-slate-700 outline-none transition-colors"
                          />
                        </td>
                      )}

                      {/* DESCRIPTION (optional column) */}
                      {columnSettings.showDescription && (
                        <td className="p-1.5 border-r border-slate-200">
                          <input
                            type="text"
                            value={row.description || ''}
                            onChange={(e) => handleRowChange(idx, 'description', e.target.value)}
                            placeholder="Item description"
                            className="w-full h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-[#33077C] rounded-lg text-xs font-medium text-slate-700 outline-none transition-colors"
                          />
                        </td>
                      )}

                      {/* QTY */}
                      <td className="p-1.5 border-r border-slate-200">
                        <input
                          type="number"
                          min="1"
                          value={row.quantity || ''}
                          onChange={(e) => handleRowChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full h-8 px-2 text-center bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-[#33077C] rounded-lg text-xs font-semibold text-slate-800 outline-none transition-colors"
                        />
                      </td>

                      {/* UNIT */}
                      <td className="p-1.5 border-r border-slate-200">
                        <select
                          value={row.unit || 'NONE'}
                          onChange={(e) => handleRowChange(idx, 'unit', e.target.value)}
                          className="w-full h-8 px-1 text-center bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-[#33077C] rounded-lg text-xs font-semibold text-slate-700 outline-none cursor-pointer uppercase transition-colors"
                        >
                          {UNIT_OPTIONS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* PRICE / UNIT */}
                      <td className="p-1.5 border-r border-slate-200">
                        <input
                          type="number"
                          step="0.01"
                          value={row.unitPrice === 0 ? '' : row.unitPrice}
                          placeholder="0.00"
                          onChange={(e) => handleRowChange(idx, 'unitPrice', Number(e.target.value))}
                          className="w-full h-8 px-2 text-right bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-[#33077C] rounded-lg text-xs font-semibold text-slate-800 outline-none transition-colors"
                        />
                      </td>

                      {/* DISCOUNT % and AMOUNT (conditional) */}
                      {columnSettings.showDiscount && (
                        <>
                          <td className="p-1.5 border-r border-slate-200 w-16">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={row.discountPercent === 0 ? '' : row.discountPercent}
                              placeholder="0"
                              onChange={(e) => handleRowChange(idx, 'discountPercent', Number(e.target.value))}
                              className="w-full h-8 px-1.5 text-center bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-[#33077C] rounded-lg text-xs font-medium text-slate-700 outline-none transition-colors"
                            />
                          </td>

                          <td className="p-1.5 border-r border-slate-200 w-24">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={row.discountAmount === 0 ? '' : row.discountAmount}
                              placeholder="0.00"
                              onChange={(e) => handleRowChange(idx, 'discountAmount', Number(e.target.value))}
                              className="w-full h-8 px-2 text-right bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-[#33077C] rounded-lg text-xs font-medium text-slate-700 outline-none transition-colors"
                            />
                          </td>
                        </>
                      )}

                      {/* TAX % (Select) */}
                      <td className="p-1.5 border-r border-slate-200 w-28">
                        <select
                          value={row.taxPercent}
                          onChange={(e) => handleRowChange(idx, 'taxPercent', Number(e.target.value))}
                          className="w-full h-8 px-1.5 text-center bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-[#33077C] rounded-lg text-xs font-medium text-slate-700 outline-none cursor-pointer transition-colors"
                        >
                          {TAX_RATE_OPTIONS.map((t) => (
                            <option key={t.label} value={t.rate}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* TAX AMOUNT */}
                      <td className="p-1.5 border-r border-slate-200 w-24 text-right pr-3 font-medium text-slate-700">
                        {row.taxAmount ? Number(row.taxAmount).toFixed(2) : '0'}
                      </td>

                      {/* AMOUNT (ROW TOTAL) */}
                      <td className="p-1.5 border-r border-slate-200 text-right pr-3 font-bold text-slate-900">
                        {Number(row.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Row Delete Button */}
                      <td className="p-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="p-1 text-slate-300 hover:text-rose-600 rounded transition-colors"
                          title="Delete row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Table Footer (ADD ROW + COLUMN TOTALS - CRM Theme) */}
                <tfoot>
                  <tr className="bg-slate-50/90 border-t border-slate-200 font-bold text-slate-800 text-xs">
                    {/* Add Row Button Column */}
                    <td
                      colSpan={
                        2 +
                        (columnSettings.showItemCategory ? 1 : 0) +
                        (columnSettings.showItemCode ? 1 : 0) +
                        (columnSettings.showHsnSac ? 1 : 0) +
                        (columnSettings.showDescription ? 1 : 0)
                      }
                      className="py-2.5 px-3 border-r border-slate-200"
                    >
                      <button
                        type="button"
                        onClick={handleAddRow}
                        className="px-3 py-1.5 rounded-lg border border-[#33077C] text-[#33077C] hover:bg-purple-50 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>ADD ROW</span>
                      </button>
                    </td>

                    {/* Total QTY */}
                    <td className="py-2.5 px-2 text-center border-r border-slate-200 font-extrabold text-[#33077C]">
                      {formCalculations.totalQty}
                    </td>

                    {/* Total label */}
                    <td className="py-2.5 px-2 text-center border-r border-slate-200 text-slate-500 uppercase text-[11px]">
                      TOTAL
                    </td>

                    {/* Price total placeholder */}
                    <td className="border-r border-slate-200"></td>

                    {/* Discount total placeholder & amount */}
                    {columnSettings.showDiscount && (
                      <>
                        <td className="border-r border-slate-200"></td>
                        <td className="py-2.5 px-2 text-right border-r border-slate-200 pr-3 font-semibold text-slate-700">
                          {formCalculations.totalDiscount > 0 ? formCalculations.totalDiscount.toFixed(2) : '0'}
                        </td>
                      </>
                    )}

                    {/* Tax placeholder */}
                    <td className="border-r border-slate-200"></td>

                    {/* Total Tax Amount */}
                    <td className="py-2.5 px-2 text-right border-r border-slate-200 pr-3 font-semibold text-slate-700">
                      {formCalculations.totalTax > 0 ? formCalculations.totalTax.toFixed(2) : '0'}
                    </td>

                    {/* Total Line Amount */}
                    <td className="py-2.5 px-3 text-right border-r border-slate-200 font-extrabold text-[#33077C]">
                      ₹{formCalculations.lineAmountTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 5. BOTTOM SECTION: ACTION TILES (LEFT) & ROUND OFF / TOTAL (RIGHT) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8 items-start">
              {/* Left Column: 4 Action Buttons & Expandable Cards */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowTermsSection(!showTermsSection)}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      showTermsSection
                        ? 'bg-purple-50 text-[#33077C] border-purple-300 ring-2 ring-purple-100'
                        : 'bg-white text-slate-600 hover:text-[#33077C] hover:bg-purple-50/50 border-slate-200'
                    }`}
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                    <span>ADD TERMS & CONDITIONS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDescriptionSection(!showDescriptionSection)}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      showDescriptionSection
                        ? 'bg-purple-50 text-[#33077C] border-purple-300 ring-2 ring-purple-100'
                        : 'bg-white text-slate-600 hover:text-[#33077C] hover:bg-purple-50/50 border-slate-200'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>ADD DESCRIPTION</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowImageSection(!showImageSection)}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      showImageSection
                        ? 'bg-purple-50 text-[#33077C] border-purple-300 ring-2 ring-purple-100'
                        : 'bg-white text-slate-600 hover:text-[#33077C] hover:bg-purple-50/50 border-slate-200'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>ADD IMAGE</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDocumentSection(!showDocumentSection)}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      showDocumentSection
                        ? 'bg-purple-50 text-[#33077C] border-purple-300 ring-2 ring-purple-100'
                        : 'bg-white text-slate-600 hover:text-[#33077C] hover:bg-purple-50/50 border-slate-200'
                    }`}
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>ADD DOCUMENT</span>
                  </button>
                </div>

                {/* Expandable Sections */}
                {showTermsSection && (
                  <div className="p-3.5 bg-slate-50/70 border border-purple-100 rounded-xl space-y-1.5 animate-in fade-in duration-100">
                    <label className="text-[11px] font-bold text-[#33077C] uppercase tracking-wider">Terms & Conditions</label>
                    <textarea
                      rows={3}
                      value={formData.terms}
                      onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                      placeholder="Enter proforma invoice terms and conditions..."
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-[#33077C]"
                    />
                  </div>
                )}

                {showDescriptionSection && (
                  <div className="p-3.5 bg-slate-50/70 border border-purple-100 rounded-xl space-y-1.5 animate-in fade-in duration-100">
                    <label className="text-[11px] font-bold text-[#33077C] uppercase tracking-wider">Proforma Description / Notes</label>
                    <textarea
                      rows={2}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Add custom notes or delivery remarks for this proforma invoice..."
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-[#33077C]"
                    />
                  </div>
                )}

                {showImageSection && (
                  <div className="p-3.5 bg-slate-50/70 border border-purple-100 rounded-xl space-y-2 animate-in fade-in duration-100 text-xs">
                    <label className="font-bold text-[#33077C] uppercase text-[11px] tracking-wider">Attach Image</label>
                    <div className="flex items-center gap-3">
                      <label className="px-3 py-1.5 bg-white border border-slate-200 hover:border-[#33077C] rounded-lg font-semibold text-slate-700 cursor-pointer flex items-center gap-1.5 transition-colors">
                        <ImageIcon className="w-3.5 h-3.5 text-[#33077C]" />
                        <span>Choose Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              setAttachedImageName(e.target.files[0].name);
                              toast.success(`Image "${e.target.files[0].name}" attached!`);
                            }
                          }}
                        />
                      </label>
                      {attachedImageName && (
                        <span className="text-slate-600 font-medium truncate max-w-xs">{attachedImageName}</span>
                      )}
                    </div>
                  </div>
                )}

                {showDocumentSection && (
                  <div className="p-3.5 bg-slate-50/70 border border-purple-100 rounded-xl space-y-2 animate-in fade-in duration-100 text-xs">
                    <label className="font-bold text-[#33077C] uppercase text-[11px] tracking-wider">Attach Document / PDF</label>
                    <div className="flex items-center gap-3">
                      <label className="px-3 py-1.5 bg-white border border-slate-200 hover:border-[#33077C] rounded-lg font-semibold text-slate-700 cursor-pointer flex items-center gap-1.5 transition-colors">
                        <FileUp className="w-3.5 h-3.5 text-[#33077C]" />
                        <span>Choose Document</span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.xls,.xlsx"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              setAttachedDocName(e.target.files[0].name);
                              toast.success(`Document "${e.target.files[0].name}" attached!`);
                            }
                          }}
                        />
                      </label>
                      {attachedDocName && (
                        <span className="text-slate-600 font-medium truncate max-w-xs">{attachedDocName}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Round Off & Grand Total Box (CRM Theme) */}
              <div className="lg:col-span-5 flex flex-col items-end gap-4">
                {/* Round Off Input */}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={enableRoundOff}
                      onChange={(e) => {
                        setEnableRoundOff(e.target.checked);
                        if (!e.target.checked) setManualRoundOff(0);
                      }}
                      className="w-4 h-4 rounded text-[#33077C] focus:ring-[#33077C] border-slate-300 accent-[#33077C]"
                    />
                    <span>Round Off</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!enableRoundOff}
                    value={formCalculations.roundOffDiff ? formCalculations.roundOffDiff : ''}
                    placeholder="0.00"
                    onChange={(e) => setManualRoundOff(Number(e.target.value))}
                    className="w-24 h-8 px-2.5 text-right bg-white border border-slate-200 disabled:bg-slate-50 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-[#33077C]"
                  />
                </div>

                {/* Grand Total Display */}
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-slate-800">Total</span>
                  <div className="w-48 sm:w-56 h-11 px-3.5 bg-purple-50/30 border-2 border-purple-200 rounded-xl flex items-center justify-end text-base font-extrabold text-[#33077C] shadow-2xs">
                    ₹ {formCalculations.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 6. BOTTOM ACTION FOOTER (CRM THEME) */}
          <div className="flex items-center justify-between gap-3 pt-6 mt-8 border-t border-slate-200">
            {/* Cancel / Back Button */}
            <Button
              variant="secondary"
              size="md"
              type="button"
              onClick={() => setViewMode('list')}
            >
              Cancel
            </Button>

            <div className="flex items-center gap-3">
              {/* Share Dropdown Button */}
              <div className="proforma-share-footer-container relative">
                <Button
                  variant="secondary"
                  size="md"
                  type="button"
                  onClick={() => setShowShareFooterMenu(!showShareFooterMenu)}
                  icon={<ChevronDown className="w-3.5 h-3.5 ml-1" />}
                >
                  Share
                </Button>

                {/* Share Popover */}
                {showShareFooterMenu && (
                  <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs text-left">
                    <button
                      type="button"
                      onClick={() => {
                        setShowShareFooterMenu(false);
                        const text = encodeURIComponent(
                          `Proforma Invoice from YAA Mart\nProforma No: ${formData.proformaNo}\nParty: ${formData.partyName}\nAmount: ₹${formCalculations.grandTotal}`
                        );
                        window.open(`https://wa.me/?text=${text}`, '_blank');
                      }}
                      className="w-full px-3 py-2 text-left font-bold text-slate-700 hover:bg-purple-50 hover:text-[#33077C] rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <span>Share via WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowShareFooterMenu(false);
                        const subject = encodeURIComponent(`Proforma Invoice ${formData.proformaNo}`);
                        const body = encodeURIComponent(`Dear ${formData.partyName},\n\nEstimated amount: ₹${formCalculations.grandTotal}`);
                        window.open(`mailto:${formData.customerEmail}?subject=${subject}&body=${body}`, '_blank');
                      }}
                      className="w-full px-3 py-2 text-left font-bold text-slate-700 hover:bg-purple-50 hover:text-[#33077C] rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <span>Share via Email</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Save & Convert to Sale Button */}
              <Button
                variant="secondary"
                size="md"
                type="button"
                onClick={() => handleSaveProforma(true)}
                icon={<ShoppingCart className="w-4 h-4 text-[#33077C]" />}
              >
                Save &amp; Convert to Sale
              </Button>

              {/* Save Button (CRM Primary Theme #33077C) */}
              <Button
                variant="primary"
                size="md"
                type="button"
                onClick={() => handleSaveProforma(false)}
                icon={<Check className="w-4 h-4 text-white stroke-[3]" />}
              >
                Save
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Add Customer Modal */}
        {isQuickCustomerModalOpen && (
          <Modal
            isOpen={isQuickCustomerModalOpen}
            onClose={() => setIsQuickCustomerModalOpen(false)}
            title="Add New Party / Customer"
            maxWidth="md"
          >
            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Customer / Party Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="e.g. Anand Supermarket"
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#33077C]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Company / Store Name</label>
                <input
                  type="text"
                  value={newCustomerCompany}
                  onChange={(e) => setNewCustomerCompany(e.target.value)}
                  placeholder="e.g. Anand Mart Pvt Ltd"
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#33077C]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="e.g. +91 98400 55667"
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#33077C]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => setIsQuickCustomerModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="button"
                  onClick={handleCreateQuickCustomer}
                >
                  Save Party
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW MODE: LIST (Master Proforma Invoices Table View as in screenshot 1)
  // Export to Excel
  const handleExportExcel = () => {
    if (filteredProformas.length === 0) {
      toast.error('No proforma invoices to export');
      return;
    }

    const excelRows = filteredProformas.map((p) => ({
      date: isoToDdmmyyyy(p.date),
      validUntil: isoToDdmmyyyy(p.validUntil),
      proformaNo: p.proformaNo,
      partyName: p.partyName,
      customerPhone: p.customerPhone || '-',
      amount: Number(p.amount || 0),
      balance: Number(p.balance || 0),
      status: p.status,
    }));

    exportTableToExcel({
      filename: `Proforma_Invoices_Report_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Proforma Invoices',
      title: 'YAA CREATIONS CRM - PROFORMA INVOICE REPORT',
      subtitle: `Filter: ${appliedPeriod} | Total Proformas: ${filteredProformas.length} | Generated: ${new Date().toLocaleDateString()}`,
      columns: [
        { header: 'Proforma Date', key: 'date', align: 'center', width: 15 },
        { header: 'Valid Until', key: 'validUntil', align: 'center', width: 15 },
        { header: 'Proforma No.', key: 'proformaNo', align: 'center', width: 18 },
        { header: 'Party Name', key: 'partyName', align: 'left', width: 28 },
        { header: 'Phone', key: 'customerPhone', align: 'left', width: 18 },
        { header: 'Total (₹)', key: 'amount', align: 'right', type: 'currency', width: 20 },
        { header: 'Balance (₹)', key: 'balance', align: 'right', type: 'currency', width: 20 },
        { header: 'Status', key: 'status', align: 'center', width: 14 },
      ],
      data: excelRows,
      summaryRow: {
        date: 'TOTAL',
        partyName: `${filteredProformas.length} Proformas`,
        amount: metrics.totalVal,
        balance: metrics.openVal,
      },
    });

    toast.success(`Proforma Invoices Excel report downloaded (${filteredProformas.length} records)!`);
  };

  // =========================================================================
  // VIEW MODE: LIST (Master Proforma Invoices Table View matching CRM Theme)
  // =========================================================================
  return (
    <div className="space-y-5 pb-16 font-sans animate-in fade-in duration-150">
      {/* 1. Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Proforma Invoice
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-[#33077C] border border-purple-200">
                {proformaList.length} total
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Create, track, and convert commercial proforma invoices into confirmed sales.
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
            Add Proforma
          </Button>
        </div>
      </div>

      {/* Filter Row: Filter by : [ This Month ⌄ ] [ 📅 01/10/2026 To 31/10/2026 ] [ All Firms ⌄ ] [ Status ⌄ ] */}
      <div className="flex items-center gap-3 flex-wrap text-xs sm:text-[13px] text-slate-600">
        <span className="font-bold text-slate-600">Filter by :</span>

        {/* Period Selector */}
        <div className="relative inline-block">
          <select
            value={appliedPeriod}
            onChange={(e) => {
              setPendingPeriod(e.target.value);
              setAppliedPeriod(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3.5 pr-8 bg-white border border-slate-200 hover:border-slate-300 rounded-xl font-bold text-slate-700 outline-none focus:border-[#4309A2] focus:ring-2 focus:ring-[#33077C]/10 shadow-2xs appearance-none cursor-pointer"
          >
            {PERIOD_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.5]" />
        </div>

        {/* Date Range Badge / Picker */}
        <div className="h-9 px-3.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 flex items-center gap-2 shadow-2xs">
          <Calendar className="w-3.5 h-3.5 text-[#33077C]" />
          <span>01/10/2026 To 31/10/2026</span>
        </div>

        {/* All Firms Filter */}
        <div className="relative inline-block">
          <select
            className="h-9 px-3.5 pr-8 bg-white border border-slate-200 hover:border-slate-300 rounded-xl font-bold text-slate-700 outline-none focus:border-[#4309A2] focus:ring-2 focus:ring-[#33077C]/10 shadow-2xs appearance-none cursor-pointer"
          >
            <option value="All Firms">All Firms</option>
            <option value="Firm 1">YAA Creations Chennai</option>
            <option value="Firm 2">YAA Logistics Salem</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.5]" />
        </div>

        {/* Status Filter */}
        <div className="relative inline-block ml-auto sm:ml-0">
          <select
            value={appliedStatus}
            onChange={(e) => {
              setPendingStatus(e.target.value);
              setAppliedStatus(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3.5 pr-8 bg-white border border-slate-200 hover:border-slate-300 rounded-xl font-bold text-slate-700 outline-none focus:border-[#4309A2] focus:ring-2 focus:ring-[#33077C]/10 shadow-2xs appearance-none cursor-pointer"
          >
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.5]" />
        </div>
      </div>

      {/* 2. SUMMARY KPI CARD (Themed matching CRM design) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs max-w-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Quotations
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-1">
              <span>₹</span>
              <span>{metrics.totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Green Growth Pill */}
          <div className="flex flex-col items-end">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black bg-emerald-50 text-emerald-600 border border-emerald-200/80">
              <span>100%</span>
              <TrendingUp className="w-3 h-3 stroke-[2.5]" />
            </span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5">vs last month</span>
          </div>
        </div>

        {/* Subtext: Converted: ₹ 0.00 | Open: ₹ 80.00 */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-500">
          <span>Converted: <strong className="text-slate-800 font-bold">₹ {metrics.convertedVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
          <span className="text-slate-300">|</span>
          <span>Open: <strong className="text-slate-800 font-bold">₹ {metrics.openVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
        </div>
      </div>

      {/* 3. TRANSACTIONS SECTION HEADER */}
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-base font-bold text-slate-800">Transactions</h2>

        {/* Search Icon / Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search transactions..."
            value={appliedSearch}
            onChange={(e) => {
              setPendingSearch(e.target.value);
              setAppliedSearch(e.target.value);
              setPage(1);
            }}
            className="w-48 sm:w-64 h-9 pl-9 pr-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#4309A2] focus:ring-2 focus:ring-[#33077C]/10 transition-all shadow-2xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.2]" />
        </div>
      </div>

      {/* 4. PROFORMA INVOICES TABLE (Standardized Royal Purple Themed Header) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredProformas.length === 0 ? (
          /* Empty State */
          <div className="py-20 px-4 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#33077C] flex items-center justify-center font-bold shadow-xs">
              <FileSpreadsheet className="w-8 h-8 stroke-[1.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">No Transactions to show</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                You haven't added any proforma invoices yet.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={handleOpenCreateForm}
              icon={<Plus className="w-4 h-4 text-white stroke-[2.5]" />}
            >
              Add Proforma
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              {/* Header: Date, Reference no, Party Name, Amount, Balance, Status, Actions in Royal Purple */}
              <thead>
                <tr className="bg-[#33077C] text-white text-xs font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-3 sm:px-4 border-r border-[#4309A2]/60 whitespace-nowrap text-white">
                    <div className="flex items-center gap-1.5">
                      <span>Date</span>
                      <Filter className="w-3 h-3 text-purple-200 opacity-80" />
                    </div>
                  </th>
                  <th className="py-3.5 px-3 sm:px-4 border-r border-[#4309A2]/60 whitespace-nowrap text-white text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Reference no</span>
                      <Filter className="w-3 h-3 text-purple-200 opacity-80" />
                    </div>
                  </th>
                  <th className="py-3.5 px-3 sm:px-5 border-r border-[#4309A2]/60 min-w-[180px] text-white">
                    <div className="flex items-center justify-between gap-1.5">
                      <span>Party Name</span>
                      <Filter className="w-3 h-3 text-purple-200 opacity-80" />
                    </div>
                  </th>
                  <th className="py-3.5 px-3 sm:px-4 border-r border-[#4309A2]/60 text-right whitespace-nowrap text-white">
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Amount</span>
                      <Filter className="w-3 h-3 text-purple-200 opacity-80" />
                    </div>
                  </th>
                  <th className="py-3.5 px-3 sm:px-4 border-r border-[#4309A2]/60 text-right whitespace-nowrap text-white">
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Balance</span>
                      <Filter className="w-3 h-3 text-purple-200 opacity-80" />
                    </div>
                  </th>
                  <th className="py-3.5 px-3 sm:px-4 border-r border-[#4309A2]/60 text-center whitespace-nowrap text-white">
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Status</span>
                      <Filter className="w-3 h-3 text-purple-200 opacity-80" />
                    </div>
                  </th>
                  <th className="py-3.5 px-3 sm:px-4 text-center whitespace-nowrap w-28 text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs sm:text-[13px] text-slate-700">
                {paginatedProformas.map((item) => {
                  const isConvertOpen = activeConvertDropdownId === item.id;
                  const isActionOpen = activeDropdownId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-purple-50/40 transition-colors border-b border-slate-200"
                    >
                      {/* 1. Date */}
                      <td className="py-3.5 px-3 sm:px-4 font-semibold text-slate-700 border-r border-slate-200 whitespace-nowrap">
                        {isoToDdmmyyyy(item.date)}
                      </td>

                      {/* 2. Reference no */}
                      <td className="py-3.5 px-3 sm:px-4 font-bold text-slate-800 text-center border-r border-slate-200 whitespace-nowrap">
                        {item.referenceNo || '1'}
                      </td>

                      {/* 3. Party Name */}
                      <td className="py-3.5 px-3 sm:px-5 font-semibold text-slate-900 border-r border-slate-200">
                        <div>{item.partyName}</div>
                        {item.customerPhone && (
                          <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                            {item.customerPhone}
                          </div>
                        )}
                      </td>

                      {/* 4. Amount */}
                      <td className="py-3.5 px-3 sm:px-4 text-right font-black text-slate-900 border-r border-slate-200 whitespace-nowrap">
                        ₹ {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* 5. Balance */}
                      <td className="py-3.5 px-3 sm:px-4 text-right font-semibold text-slate-700 border-r border-slate-200 whitespace-nowrap">
                        ₹ {item.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* 6. Status */}
                      <td className="py-3.5 px-3 sm:px-4 text-center border-r border-slate-200 whitespace-nowrap">
                        {item.status === 'Open' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Open
                          </span>
                        ) : item.status === 'Converted' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Converted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            {item.status}
                          </span>
                        )}
                      </td>

                      {/* 7. Actions Column: Convert ⌄ button + 3-dots actions menu */}
                      <td className="py-3.5 px-3 sm:px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          {/* Convert ⌄ Dropdown Button */}
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isConvertOpen) {
                                  setActiveConvertDropdownId(null);
                                  setConvertDropdownPos(null);
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setConvertDropdownPos({
                                    top: rect.bottom + 4,
                                    right: window.innerWidth - rect.right,
                                  });
                                  setActiveConvertDropdownId(item.id);
                                  setActiveDropdownId(null);
                                  setDropdownPos(null);
                                }
                              }}
                              className="proforma-convert-btn text-xs font-bold text-[#33077C] hover:text-[#4309A2] bg-purple-50 hover:bg-purple-100/80 border border-purple-200/70 flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer select-none"
                            >
                              <span>Convert</span>
                              <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>

                            {/* Convert Floating Dropdown Menu */}
                            {isConvertOpen && convertDropdownPos && (
                              <div
                                style={{
                                  position: 'fixed',
                                  top: `${convertDropdownPos.top}px`,
                                  right: `${convertDropdownPos.right}px`,
                                  zIndex: 9999,
                                }}
                                className="proforma-convert-dropdown-menu w-52 bg-white rounded-xl shadow-2xl border border-slate-200/90 py-1.5 animate-in fade-in zoom-in-95 duration-100 text-left font-sans overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveConvertDropdownId(null);
                                    setConvertDropdownPos(null);
                                    handleConvertExistingToSale(item);
                                  }}
                                  className="w-full text-left px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-purple-50 hover:text-[#33077C] transition-colors cursor-pointer flex items-center gap-2.5"
                                >
                                  <ShoppingCart className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Convert to Sale Invoice</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveConvertDropdownId(null);
                                    setConvertDropdownPos(null);
                                    handleConvertExistingToOrder(item);
                                  }}
                                  className="w-full text-left px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-purple-50 hover:text-[#33077C] transition-colors cursor-pointer flex items-center gap-2.5"
                                >
                                  <FileCheck className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Convert to Sale Order</span>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* 3-Dots Action Menu Button (matching screenshot) */}
                          <div className="relative inline-block text-left">
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
                                  setActiveConvertDropdownId(null);
                                  setConvertDropdownPos(null);
                                }
                              }}
                              className="proforma-action-btn w-7 h-7 rounded-lg text-slate-500 hover:text-[#33077C] hover:bg-purple-50 flex items-center justify-center transition-all cursor-pointer"
                              title="More Options"
                            >
                              <MoreVertical className="w-4 h-4 text-slate-600" />
                            </button>

                            {/* 3-Dots Floating Dropdown Menu (Exact 6 Items in order from screenshot) */}
                            {isActionOpen && dropdownPos && (
                              <div
                                style={{
                                  position: 'fixed',
                                  top: dropdownPos.top !== undefined ? `${dropdownPos.top}px` : 'auto',
                                  bottom: dropdownPos.bottom !== undefined ? `${dropdownPos.bottom}px` : 'auto',
                                  right: `${dropdownPos.right}px`,
                                  zIndex: 9999,
                                }}
                                className="proforma-action-dropdown-menu w-44 bg-white rounded-xl shadow-2xl border border-slate-200/90 py-2 animate-in fade-in zoom-in-95 duration-100 text-left font-sans overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* 1. View/Edit */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setDropdownPos(null);
                                    handleOpenEditForm(item);
                                  }}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-purple-50 hover:text-[#33077C] transition-colors cursor-pointer block"
                                >
                                  View/Edit
                                </button>

                                {/* 2. Delete */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setDropdownPos(null);
                                    handleDeleteProforma(item.id);
                                  }}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer block"
                                >
                                  Delete
                                </button>

                                {/* 3. Duplicate */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setDropdownPos(null);
                                    handleDuplicateProforma(item);
                                  }}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-purple-50 hover:text-[#33077C] transition-colors cursor-pointer block"
                                >
                                  Duplicate
                                </button>

                                {/* 4. Open PDF */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setDropdownPos(null);
                                    setPreviewProforma(item);
                                    toast.info(`Opening PDF preview for ${item.proformaNo}`);
                                  }}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-purple-50 hover:text-[#33077C] transition-colors cursor-pointer block"
                                >
                                  Open PDF
                                </button>

                                {/* 5. Preview */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setDropdownPos(null);
                                    setPreviewProforma(item);
                                  }}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-purple-50 hover:text-[#33077C] transition-colors cursor-pointer block"
                                >
                                  Preview
                                </button>

                                {/* 6. Print */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setDropdownPos(null);
                                    setPreviewProforma(item);
                                    setTimeout(() => window.print(), 300);
                                  }}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-purple-50 hover:text-[#33077C] transition-colors cursor-pointer block"
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

      {/* 5. PAGINATION */}
      {filteredProformas.length > 0 && (
        <Pagination
          total={filteredProformas.length}
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

      {/* 6. PREVIEW / PRINT MODAL */}
      {previewProforma && (
        <Modal
          isOpen={!!previewProforma}
          onClose={() => setPreviewProforma(null)}
          title={`Proforma Invoice - ${previewProforma.proformaNo}`}
          subtitle={`Issued to ${previewProforma.partyName} on ${isoToDdmmyyyy(previewProforma.date)}`}
          maxWidth="3xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
        >
          <div className="p-6 sm:p-8 space-y-6 bg-white text-slate-800 font-sans">
            {/* Business & Proforma Meta */}
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
                  PROFORMA INVOICE
                </span>
                <p className="text-sm font-bold text-slate-900">{previewProforma.proformaNo}</p>
                <p className="text-xs text-slate-500">Date: {isoToDdmmyyyy(previewProforma.date)}</p>
                <p className="text-xs text-slate-500">Valid Until: {isoToDdmmyyyy(previewProforma.validUntil)}</p>
              </div>
            </div>

            {/* Bill To Info */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Bill To:</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{previewProforma.partyName}</p>
                {previewProforma.customerCompany && <p>{previewProforma.customerCompany}</p>}
                {previewProforma.customerPhone && <p>Phone: {previewProforma.customerPhone}</p>}
                {previewProforma.billingAddress && <p>{previewProforma.billingAddress}</p>}
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Proforma Details:</p>
                <p className="mt-0.5"><strong className="text-slate-700">Ref No:</strong> {previewProforma.referenceNo || '-'}</p>
                <p><strong className="text-slate-700">State of Supply:</strong> {previewProforma.stateOfSupply || 'Tamil Nadu'}</p>
                <p><strong className="text-slate-700">Status:</strong> {previewProforma.status}</p>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-[#33077C] text-white font-bold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="p-2.5 text-white">#</th>
                  <th className="p-2.5 text-white">Item &amp; Description</th>
                  <th className="p-2.5 text-center text-white">Qty</th>
                  <th className="p-2.5 text-right text-white">Unit Price</th>
                  <th className="p-2.5 text-right text-white">Tax (%)</th>
                  <th className="p-2.5 text-right text-white">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewProforma.items.map((it, i) => (
                  <tr key={i}>
                    <td className="p-2.5 text-slate-400">{i + 1}</td>
                    <td className="p-2.5 font-bold text-slate-800">{it.productName}</td>
                    <td className="p-2.5 text-center">{it.quantity} {it.unit || ''}</td>
                    <td className="p-2.5 text-right">₹{it.unitPrice.toLocaleString('en-IN')}</td>
                    <td className="p-2.5 text-right">{it.taxPercent || 0}%</td>
                    <td className="p-2.5 text-right font-bold">₹{it.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Summary Row */}
            <div className="flex justify-end pt-2">
              <div className="w-64 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-800">₹{previewProforma.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {previewProforma.taxAmount !== undefined && previewProforma.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span>GST Tax:</span>
                    <span className="font-semibold text-slate-800">₹{previewProforma.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {previewProforma.roundOff !== undefined && (
                  <div className="flex justify-between">
                    <span>Round Off:</span>
                    <span className="font-semibold text-slate-800">₹{previewProforma.roundOff.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-[#33077C] pt-2 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span>₹{previewProforma.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Terms */}
            {previewProforma.terms && (
              <div className="p-3 bg-slate-50 rounded-lg text-[11px] text-slate-500 whitespace-pre-line border border-slate-100">
                <span className="font-bold text-slate-700">Terms &amp; Conditions:</span><br />
                {previewProforma.terms}
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewProforma(null)}
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
                <span>Print Invoice</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
