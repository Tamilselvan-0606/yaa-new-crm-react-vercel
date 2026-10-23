import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Building2,
  UsersRound,
  Plus,
  Search,
  FileText,
  Receipt,
  Calendar,
  ChevronDown,
  Check,
  X,
  Tag,
  RefreshCw,
  Trash2,
  CheckCircle2,
  FileSpreadsheet,
  Clock,
  Sparkles,
  Info,
  Mail,
  MapPin,
  Pencil,
  CreditCard,
  Landmark,
  FolderPlus,
  Boxes,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Customer } from '../../types';
import { CustomerFormModal } from '../../components/forms/CustomerFormModal';
import { useInvoiceStore, SavedInvoice } from '../../store/useInvoiceStore';
import { useProformaInvoiceStore } from '../../store/useProformaInvoiceStore';
import {
  proformaInvoiceApi,
  CreateProformaRequest,
  UpdateProformaRequest,
  invoiceApi,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  InvoiceApiItem,
  organizationApi,
  OrganizationApiItem,
  subscriptionPlanApi,
  platformClientApi,
  PlatformClientItem,
  getStoredOrganizationId,
} from '../../api';

interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  upiId?: string;
  isDefault?: boolean;
}

interface SaleItem {
  id: string;
  name: string;
  description: string;
  hsnCode: string;
  qty: number;
  taxPercent: number; // GST
  unitPrice: number; // Price
  discount: number; // Discount
}

interface NewInvoiceViewProps {
  isProforma?: boolean;
}

export const NewInvoiceView: React.FC<NewInvoiceViewProps> = ({ isProforma = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const invoiceToEdit = (location.state as any)?.invoiceToEdit as SavedInvoice | undefined;
  const { showToast, isSuperAdmin, isOrgSuperAdmin, currentUser } = useAuth();
  const { addInvoice: addStandardInvoice } = useInvoiceStore();
  const { addProformaInvoice } = useProformaInvoiceStore();
  const addInvoice = isProforma ? addProformaInvoice : addStandardInvoice;

  const [commerceCustomers] = useState<Customer[]>([]);

  // Top Action: Active Mode ('new' | 'existing')
  const [saleMode, setSaleMode] = useState<'new' | 'existing'>('new');
  const [isExistingInvoiceModalOpen, setIsExistingInvoiceModalOpen] = useState(false);

  // Column 1: Company Details & Selected Product Suite
  const [companyDetails, setCompanyDetails] = useState({
    name: 'Yaa Creations',
    taxId: '27AABCA1234F1Z8',
    pan: 'ABCDE1234F',
    address: 'Plot No 42, Silicon Valley High-Tech Zone, Madhapur, Hyderabad, TG 500081',
    email: 'billing@yaacreations.com',
    phone: '+91 98765 43210',
  });
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedProductSuite, setSelectedProductSuite] = useState<string>('Yaa connect');
  const [isCompanyProductDropdownOpen, setIsCompanyProductDropdownOpen] = useState(false);
  const [productSuiteSearchQuery, setProductSuiteSearchQuery] = useState('');
  const companyProductDropdownRef = useRef<HTMLDivElement>(null);

  // Column 1: Invoice Number & Description
  const [invoiceNumber, setInvoiceNumber] = useState(invoiceToEdit?.invoiceNumber || '');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceDescription, setInvoiceDescription] = useState('');

  // Column 1: Reference Number(s)
  const [referenceNumbers, setReferenceNumbers] = useState<string[]>([]);

  // Field Labels (Customizable)
  const [invoiceNumberLabel, setInvoiceNumberLabel] = useState(isProforma ? 'Proforma Invoice Number' : 'Invoice Number');
  const [invoiceDateLabel, setInvoiceDateLabel] = useState(isProforma ? 'Proforma Date' : 'Invoice Date');
  const [referenceLabel, setReferenceLabel] = useState('Reference Number');
  const [descriptionLabel, setDescriptionLabel] = useState(isProforma ? 'Proforma Description' : 'Invoice Description');

  const [showInvoiceNumber, setShowInvoiceNumber] = useState(true);
  const [showInvoiceDate, setShowInvoiceDate] = useState(true);
  const [showReferenceNumbers, setShowReferenceNumbers] = useState(true);
  const [showInvoiceDescription, setShowInvoiceDescription] = useState(true);

  // Dynamic Custom Invoice Fields
  const [customInvoiceFields, setCustomInvoiceFields] = useState<Array<{
    id: string;
    label: string;
    value: string;
    type: 'text' | 'date' | 'textarea';
  }>>([]);
  const [isAddFieldModalOpen, setIsAddFieldModalOpen] = useState(false);
  const [fieldManagerMode, setFieldManagerMode] = useState<'add' | 'edit'>('add');
  const [selectedFieldToEditId, setSelectedFieldToEditId] = useState<string>('');

  // New Field Form
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'date' | 'textarea'>('text');
  const [newFieldValue, setNewFieldValue] = useState('');

  // Edit Field Form
  const [editFieldLabel, setEditFieldLabel] = useState('');
  const [editFieldType, setEditFieldType] = useState<'text' | 'date' | 'textarea'>('text');
  const [editFieldValue, setEditFieldValue] = useState('');

  // Bank Accounts Management State (starts empty, user configures via Add Bank)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [isAddBankModalOpen, setIsAddBankModalOpen] = useState(false);
  const [newBank, setNewBank] = useState<Partial<BankAccount>>({
    bankName: '',
    accountName: '',
    accountNumber: '',
    ifscCode: '',
    branchName: '',
    upiId: '',
  });

  const selectedBank = bankAccounts.find((b) => b.id === selectedBankId) || (bankAccounts.length > 0 ? bankAccounts[0] : null);

  const handleSaveNewBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBank.bankName?.trim() || !newBank.accountNumber?.trim()) {
      showToast('error', 'Incomplete Details', 'Please enter Bank Name and Account Number.');
      return;
    }
    const created: BankAccount = {
      id: `bank_${Date.now()}`,
      bankName: newBank.bankName.trim(),
      accountName: newBank.accountName?.trim() || '',
      accountNumber: newBank.accountNumber.trim(),
      ifscCode: (newBank.ifscCode || '').toUpperCase().trim(),
      branchName: newBank.branchName?.trim() || '',
      upiId: newBank.upiId?.trim() || '',
    };
    setBankAccounts([...bankAccounts, created]);
    setSelectedBankId(created.id);
    setIsAddBankModalOpen(false);
    setNewBank({
      bankName: '',
      accountName: '',
      accountNumber: '',
      ifscCode: '',
      branchName: '',
      upiId: '',
    });
    showToast('success', 'Bank Account Added', `Added and selected ${created.bankName}.`);
  };

  // Live platform organizations (for Platform Administrator)
  const [platformOrgs, setPlatformOrgs] = useState<OrganizationApiItem[]>([]);
  // Live platform clients (for Org Admin)
  const [platformClients, setPlatformClients] = useState<PlatformClientItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const orgId = currentUser?.organizationId || getStoredOrganizationId();

    if (isSuperAdmin && !isOrgSuperAdmin) {
      // Platform Administrator: load registered organizations
      const fetchOrgs = async () => {
        try {
          const res = await organizationApi.getOrganizations(1, 100);
          if (isMounted && res.data) {
            setPlatformOrgs(res.data);
          }
        } catch (err) {
          console.error('Failed to load organizations in NewInvoiceView:', err);
        }
      };
      fetchOrgs();
    } else {
      // Org Admin: load clients from client API
      const fetchClients = async () => {
        try {
          const res = await platformClientApi.getClients({ page: 1, limit: 100, organization_id: orgId || undefined });
          if (isMounted && res.data) {
            setPlatformClients(res.data);
          }
        } catch (err) {
          console.error('Failed to load clients in NewInvoiceView:', err);
        }
      };
      fetchClients();
    }

    return () => {
      isMounted = false;
    };
  }, [isSuperAdmin, isOrgSuperAdmin, currentUser]);

  const mappedPlatformClients: Customer[] = (isSuperAdmin && !isOrgSuperAdmin)
    ? platformOrgs.map((org: any) => ({
        id: org.id,
        name: org.name,
        company: org.name,
        email: org.email || '',
        phone: org.phone || '',
        location: org.location || '',
        address: org.address || org.location || org.user?.address || '',
        status: 'Active' as const,
        linkedProducts: [],
        gstin: org.gstNumber || '',
        taxId: org.gstNumber || '',
      }))
    : platformClients.map((client) => ({
        id: client.id,
        name: client.contactPerson || client.name,
        company: client.name || client.legalName || 'Client',
        email: client.email || '',
        phone: client.phone || client.whatsapp || '',
        location: client.address || client.location || '',
        address: client.address || client.location || '',
        status: 'Active' as const,
        linkedProducts: [],
        gstin: client.gstNumber || '',
        taxId: client.gstNumber || '',
        pan: client.panNumber || '',
      }));

  const availableCustomers = mappedPlatformClients.length > 0 ? mappedPlatformClients : commerceCustomers;

  // Live Subscription Plans from Platform API
  const [platformPlans, setPlatformPlans] = useState<
    Array<{ id: string; name: string; price: number; hsn: string; taxPercent: number; description?: string }>
  >([]);

  useEffect(() => {
    let isMounted = true;
    const fetchPlans = async () => {
      try {
        const res = await subscriptionPlanApi.getSubscriptionPlans({ limit: 100 });
        if (isMounted && res.data) {
          setPlatformPlans(
            res.data.map((plan) => ({
              id: plan.id,
              name: plan.name,
              hsn: '998314',
              price: Number(plan.monthlyPrice || plan.annualPrice || 0),
              taxPercent: Number(plan.gstRate) || 18,
              description: plan.description || '',
            }))
          );
        }
      } catch (err) {
        console.error('Failed to load subscription plans in NewInvoiceView:', err);
      }
    };
    fetchPlans();
    return () => {
      isMounted = false;
    };
  }, []);

  // Column 2: Client Selection & Dropdown
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const hasInitializedCustomerRef = useRef(false);

  useEffect(() => {
    if (!hasInitializedCustomerRef.current && availableCustomers.length > 0) {
      hasInitializedCustomerRef.current = true;
    }
  }, [availableCustomers]);

  // Bank Selector Dropdown State
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
  const bankDropdownRef = useRef<HTMLDivElement>(null);

  // Table Line Items Product Dropdown State
  const [openProductDropdownId, setOpenProductDropdownId] = useState<string | null>(null);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Client Projects Association & State
  const [clientProjectsMap, setClientProjectsMap] = useState<
    Record<string, Array<{ id: string; name: string; hsn: string; price: number; taxPercent: number; description?: string }>>
  >({});

  const [isAddClientProjectModalOpen, setIsAddClientProjectModalOpen] = useState(false);
  const [targetItemIdForProject, setTargetItemIdForProject] = useState<string | null>(null);
  const [newClientProject, setNewClientProject] = useState({
    name: '',
    hsn: '998314',
    price: 0,
    taxPercent: 18,
    description: '',
  });

  // Get projects associated with the selected client (or live platform plans)
  const getActiveClientProjects = () => {
    if (selectedCustomer && clientProjectsMap[selectedCustomer.id]?.length) {
      return clientProjectsMap[selectedCustomer.id];
    }
    return platformPlans;
  };

  const handleSaveClientProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientProject.name?.trim()) {
      showToast('error', 'Project Name Required', 'Please enter a name for the project.');
      return;
    }
    if (!selectedCustomer) {
      showToast('error', 'No Client Selected', 'Please select a client before adding a project.');
      return;
    }

    const createdProj = {
      id: `proj_${Date.now()}`,
      name: newClientProject.name.trim(),
      hsn: newClientProject.hsn?.trim() || '998313',
      price: Number(newClientProject.price) || 0,
      taxPercent: Number(newClientProject.taxPercent) || 18,
      description: newClientProject.description?.trim() || '',
    };

    const currentList = clientProjectsMap[selectedCustomer.id] || getActiveClientProjects();
    setClientProjectsMap({
      ...clientProjectsMap,
      [selectedCustomer.id]: [...currentList, createdProj],
    });

    if (targetItemIdForProject) {
      setItems((prev) =>
        prev.map((it) => {
          if (it.id === targetItemIdForProject) {
            return {
              ...it,
              name: createdProj.name,
              hsnCode: createdProj.hsn,
              unitPrice: createdProj.price,
              taxPercent: createdProj.taxPercent,
              description: createdProj.description || '',
            };
          }
          return it;
        })
      );
      setOpenProductDropdownId(null);
    }

    setIsAddClientProjectModalOpen(false);
    setNewClientProject({
      name: '',
      hsn: '998313',
      price: 999,
      taxPercent: 18,
      description: '',
    });
    showToast('success', 'Project Added', `Project "${createdProj.name}" associated with ${selectedCustomer.company}.`);
  };

  // Close dropdowns on outside click and handle scroll/resize for dropdown positioning
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setIsClientDropdownOpen(false);
      }
      if (bankDropdownRef.current && !bankDropdownRef.current.contains(e.target as Node)) {
        setIsBankDropdownOpen(false);
      }
      if (companyProductDropdownRef.current && !companyProductDropdownRef.current.contains(e.target as Node)) {
        setIsCompanyProductDropdownOpen(false);
      }
      if (!(e.target as HTMLElement).closest('.product-dropdown-container')) {
        setOpenProductDropdownId(null);
        setDropdownRect(null);
      }
      if (discountTypeRef.current && !discountTypeRef.current.contains(e.target as Node)) {
        setIsDiscountTypeOpen(false);
      }
    };

    const handleScrollOrResize = (e: Event) => {
      // If the scroll happened inside an active dropdown container (user scrolling options), do NOT close it!
      const target = e.target as HTMLElement | null;
      if (target && (target.closest?.('.dropdown-menu') || target.closest?.('.max-h-60'))) {
        return;
      }

      if (openProductDropdownId) {
        setOpenProductDropdownId(null);
        setDropdownRect(null);
      }
      setIsClientDropdownOpen(false);
      setIsBankDropdownOpen(false);
      setIsCompanyProductDropdownOpen(false);
      setIsDiscountTypeOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [openProductDropdownId]);

  // Filter clients for dropdown
  const filteredCustomers = availableCustomers.filter((c) => {
    const q = clientSearchQuery.toLowerCase();
    return (
      c.company?.toLowerCase().includes(q) ||
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  });

  // Section 2: Line Items / Products Breakdown (starts empty, user adds items on demand)
  const [items, setItems] = useState<SaleItem[]>([]);

  // Discount type state: global for all rows
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [isDiscountTypeOpen, setIsDiscountTypeOpen] = useState(false);
  const discountTypeRef = useRef<HTMLTableCellElement>(null);

  // Description prompt state when a product is added or selected
  const [descriptionModalItem, setDescriptionModalItem] = useState<{
    id: string;
    name: string;
    description: string;
  } | null>(null);
  const [tempDescription, setTempDescription] = useState('');

  // Populate data when editing an invoice
  useEffect(() => {
    if (invoiceToEdit) {
      if (invoiceToEdit.invoiceNumber) setInvoiceNumber(invoiceToEdit.invoiceNumber);
      if (invoiceToEdit.invoiceDate) setInvoiceDate(invoiceToEdit.invoiceDate);
      if (invoiceToEdit.description) setInvoiceDescription(invoiceToEdit.description);
      if (invoiceToEdit.referenceNumbers?.length) setReferenceNumbers(invoiceToEdit.referenceNumbers);
      if (invoiceToEdit.roundMode) setRoundMode(invoiceToEdit.roundMode);
      if (invoiceToEdit.items?.length) {
        setItems(
          invoiceToEdit.items.map((it, idx) => ({
            id: it.id || `item-${idx + 1}`,
            name: it.name,
            description: it.description || '',
            hsnCode: it.hsnCode || '998313',
            qty: Number(it.qty) || 1,
            taxPercent: Number(it.taxPercent) || 18,
            unitPrice: Number(it.unitPrice) || 0,
            discount: Number(it.discount) || 0,
          }))
        );
      }
      if (invoiceToEdit.client) {
        setSelectedCustomer(invoiceToEdit.client as any);
      }
      if (invoiceToEdit.company) {
        setCompanyDetails((prev) => ({ ...prev, ...invoiceToEdit.company }));
      }
      if (invoiceToEdit.bank) {
        const foundBank = bankAccounts.find(
          (b) => b.accountNumber === invoiceToEdit.bank.accountNumber
        );
        if (foundBank) {
          setSelectedBankId(foundBank.id);
        }
      }
      if (invoiceToEdit.customFields?.length) {
        setCustomInvoiceFields(
          invoiceToEdit.customFields.map((cf) => ({
            id: cf.id || `cf_${Date.now()}_${Math.random()}`,
            label: cf.label,
            value: cf.value,
            type: (cf.type as any) || 'text',
          }))
        );
      }
    }
  }, [invoiceToEdit]);

  const handleProductChange = (itemId: string, productName: string) => {
    const activeProjects = getActiveClientProjects();
    const foundClientProj = activeProjects.find((p) => p.name === productName);

    const defaultHsn = foundClientProj?.hsn || '998313';
    const defaultPrice = foundClientProj?.price || 499;
    const defaultTax = foundClientProj?.taxPercent || 18;

    setItems((prev) =>
      prev.map((it) => {
        if (it.id === itemId) {
          return {
            ...it,
            name: productName,
            hsnCode: it.hsnCode || defaultHsn,
            unitPrice: defaultPrice,
            taxPercent: defaultTax,
            description: it.description || '',
          };
        }
        return it;
      })
    );
  };

  const handleSaveDescription = () => {
    if (descriptionModalItem) {
      updateItem(descriptionModalItem.id, 'description', tempDescription);
      setDescriptionModalItem(null);
      showToast('success', 'Description Saved', 'Product description updated.');
    }
  };

  const handleAddItem = () => {
    const newItem: SaleItem = {
      id: `item-${Date.now()}`,
      name: '',
      description: '',
      hsnCode: '998314',
      qty: 1,
      taxPercent: 18,
      unitPrice: 0,
      discount: 0,
    };
    setItems((prev) => [...prev, newItem]);
    showToast('info', 'Line Item Added', 'New line item added. Select or enter item details.');
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    showToast('info', 'Item Removed', 'Line item removed.');
  };

  const updateItem = (id: string, field: keyof SaleItem, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  // Section 2 Calculation (Subtotal, Discount, GST, Rounding, Grand Total)
  const [roundMode, setRoundMode] = useState<'none' | 'up' | 'down'>('none');
  const subtotal = items.reduce((acc, item) => acc + (Number(item.qty) || 0) * (Number(item.unitPrice) || 0), 0);
  const totalDiscount = items.reduce((acc, item) => acc + (Number(item.discount) || 0), 0);
  const taxableAmount = Math.max(0, subtotal - totalDiscount);
  const taxTotal = items.reduce((acc, item) => {
    const itemSub = (Number(item.qty) || 0) * (Number(item.unitPrice) || 0);
    const itemDisc = Number(item.discount) || 0;
    const itemTaxable = Math.max(0, itemSub - itemDisc);
    return acc + (itemTaxable * (Number(item.taxPercent) || 0)) / 100;
  }, 0);
  const cgstAmount = taxTotal / 2;
  const sgstAmount = taxTotal / 2;
  const igstAmount = taxTotal;

  const rawGrandTotal = taxableAmount + taxTotal;
  const roundUpDiff = rawGrandTotal % 1 === 0 ? 0 : Math.ceil(rawGrandTotal) - rawGrandTotal;
  const roundDownDiff = rawGrandTotal % 1 === 0 ? 0 : Math.floor(rawGrandTotal) - rawGrandTotal;
  const roundOffAmount =
    roundMode === 'up' ? roundUpDiff : roundMode === 'down' ? roundDownDiff : 0;
  const grandTotal = rawGrandTotal + roundOffAmount;

  // Live Existing Invoices
  const [existingInvoices, setExistingInvoices] = useState<InvoiceApiItem[]>([]);
  const [isLoadingExistingInvoices, setIsLoadingExistingInvoices] = useState(false);

  const handleOpenExistingInvoicesModal = async () => {
    setIsExistingInvoiceModalOpen(true);
    setIsLoadingExistingInvoices(true);
    try {
      const res = await invoiceApi.getInvoices({ limit: 50, sortBy: 'createdAt', sortOrder: 'desc' });
      if (res.data) {
        setExistingInvoices(res.data);
      }
    } catch (err) {
      console.error('Failed to load existing invoices:', err);
    } finally {
      setIsLoadingExistingInvoices(false);
    }
  };

  const handleSelectExistingInvoice = (inv: InvoiceApiItem) => {
    setInvoiceNumber(inv.invoiceNumber);
    setInvoiceDate(inv.invoiceDate ? inv.invoiceDate.split('T')[0] : new Date().toISOString().split('T')[0]);
    const foundClient = availableCustomers.find(
      (c) => c.id === inv.customerId || (c.company || '').toLowerCase() === (inv.customerName || '').toLowerCase()
    ) || null;
    if (foundClient) {
      setSelectedCustomer(foundClient);
    }
    setInvoiceDescription(inv.notes || `Recurring sales invoice for ${inv.customerName} - Order ref #${inv.invoiceNumber}`);
    setReferenceNumbers([inv.sourceId ? `REF-${inv.sourceId.slice(0, 8)}` : `REF-${inv.invoiceNumber}`]);
    if (inv.items && inv.items.length > 0) {
      setItems(
        inv.items.map((it, idx) => ({
          id: it.id || `item_${idx + 1}`,
          name: it.itemDescription || it.itemId || `Line Item ${idx + 1}`,
          description: it.itemDescription || '',
          hsnCode: it.hsnCode || '998314',
          qty: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          taxPercent: Number(it.gstPercent) || 18,
          discount: 0,
        }))
      );
    }
    setSaleMode('existing');
    setIsExistingInvoiceModalOpen(false);
    showToast('success', 'Invoice Loaded', `Loaded existing invoice "${inv.invoiceNumber}".`);
  };

  const handleAddNewSaleReset = () => {
    setSaleMode('new');
    setInvoiceNumber('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setInvoiceDescription('');
    setReferenceNumbers(['']);
    setSelectedCustomer(null);
    setClientSearchQuery('');
    setItems([]);
    showToast('info', 'New Sale Initialized', 'Ready to configure a new sale invoice.');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner when in Edit Mode */}
      {invoiceToEdit && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white px-6 py-4 rounded-2xl border border-[#8B5CF6]/30 bg-gradient-to-r from-purple-50/50 via-white to-white shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#8B5CF6] text-white flex items-center justify-center shadow-xs">
              <Pencil className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Edit Invoice
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-extrabold bg-[#33077C] text-white">
                  #{invoiceToEdit.invoiceNumber}
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${invoiceToEdit.status === 'Paid'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : invoiceToEdit.status === 'Partially Paid'
                      ? 'bg-sky-50 text-sky-700 border border-sky-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                >
                  {invoiceToEdit.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Update billing details, items, or settlement info and click &quot;Update &amp; Save Invoice&quot; to save.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(isProforma ? '/proforma/invoices' : '/sales/invoices')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs self-start sm:self-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isProforma ? 'Back to Proforma Invoices' : 'Back to Invoices'}</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1ST SECTION: 2 SEPARATE ATTRACTIVE CARDS (Left: Sale Configuration, Right: Client Info) */}
      {/* ========================================================================= */}
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
            </div>
            <button
              type="button"
              onClick={() => setIsEditingCompany(!isEditingCompany)}
              className="h-8 px-3.5 bg-white hover:bg-slate-100 text-slate-800 border border-transparent rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all duration-200 cursor-pointer select-none active:scale-[0.98]"
            >
              {isEditingCompany ? 'Done' : 'Edit'}
            </button>
          </div>

          {/* Card Body */}
          <div className="p-8 space-y-8 flex-1">
            {/* 1. Current Company & its details */}
            <div className="space-y-4">
              {!isEditingCompany ? (
                <div className="flex items-start justify-between mb-2">
                  <div className="space-y-3.5 text-[13px] flex-1">
                    <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                      <span className="font-bold text-slate-800">Company Logo</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-700 mr-1">:</span>
                        <img
                          src="/yaa-creations-logo.png"
                          alt="Yaa Creations Logo"
                          className="h-9 sm:h-10 object-contain"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                      <span className="font-bold text-slate-800">Company Name</span>
                      <span className="text-slate-700">: {companyDetails.name}</span>
                    </div>
                    <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                      <span className="font-bold text-slate-800">GSTIN / Tax ID</span>
                      <span className="text-slate-700">: {companyDetails.taxId}</span>
                    </div>
                    {(companyDetails as any).pan && (
                      <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                        <span className="font-bold text-slate-800">PAN Number</span>
                        <span className="text-slate-700">: {(companyDetails as any).pan}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                      <span className="font-bold text-slate-800">Phone Number</span>
                      <span className="text-slate-700">: {companyDetails.phone}</span>
                    </div>
                    <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                      <span className="font-bold text-slate-800">Email</span>
                      <span className="text-slate-700">: {companyDetails.email}</span>
                    </div>
                    <div className="grid grid-cols-[140px_1fr] gap-2 items-start">
                      <span className="font-bold text-slate-800">Company Address</span>
                      <span className="text-slate-700 leading-relaxed">: {companyDetails.address}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5 pt-1 text-sm">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Company Logo</label>
                    <div className="mt-1.5 flex items-center gap-3">
                      <img
                        src="/yaa-creations-logo.png"
                        alt="Yaa Creations Logo"
                        className="h-10 object-contain border border-slate-200 rounded-lg p-1 bg-white"
                      />
                      <span className="text-xs text-slate-500 font-medium">Yaa Creations Logo</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Company Name</label>
                    <input
                      type="text"
                      value={companyDetails.name}
                      onChange={(e) => setCompanyDetails({ ...companyDetails, name: e.target.value })}
                      className="w-full mt-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tax ID / GSTIN</label>
                    <input
                      type="text"
                      value={companyDetails.taxId}
                      onChange={(e) => setCompanyDetails({ ...companyDetails, taxId: e.target.value })}
                      className="w-full mt-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">PAN Number</label>
                    <input
                      type="text"
                      value={(companyDetails as any).pan || ''}
                      onChange={(e) => setCompanyDetails({ ...companyDetails, pan: e.target.value } as any)}
                      className="w-full mt-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Registered Address</label>
                    <input
                      type="text"
                      value={companyDetails.address}
                      onChange={(e) => setCompanyDetails({ ...companyDetails, address: e.target.value })}
                      className="w-full mt-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                    <input
                      type="text"
                      value={companyDetails.phone}
                      onChange={(e) => setCompanyDetails({ ...companyDetails, phone: e.target.value })}
                      className="w-full mt-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                    <input
                      type="email"
                      value={companyDetails.email}
                      onChange={(e) => setCompanyDetails({ ...companyDetails, email: e.target.value })}
                      className="w-full mt-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice Number</label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="w-full mt-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice Date</label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full mt-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reference Number</label>
                    <input
                      type="text"
                      value={referenceNumbers[0] || ''}
                      onChange={(e) => setReferenceNumbers([e.target.value])}
                      className="w-full mt-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 2. Invoice Metadata Dynamic Fields */}
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Invoice Metadata & Fields
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (isAddFieldModalOpen) {
                      if (newFieldLabel.trim()) {
                        setCustomInvoiceFields([
                          ...customInvoiceFields,
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

              {customInvoiceFields.length > 0 && (
                <div className="space-y-3.5 text-[13px]">
                  {customInvoiceFields.map((field) => (
                    <div key={field.id} className="grid grid-cols-[140px_1fr] gap-2 items-center group">
                      <span className="font-bold text-slate-800">{field.label}</span>
                      <div className="text-slate-700 flex items-center justify-between">
                        <span>: {field.value}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomInvoiceFields(customInvoiceFields.filter(f => f.id !== field.id));
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-all cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

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
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col">
          {/* Card Header */}
          <div className="px-7 py-4.5 bg-[#33077C] text-white flex items-center justify-between rounded-t-2xl">
            <div className="flex items-center gap-3.5">
              <h2 className="text-base font-bold text-white tracking-tight">
                {isSuperAdmin && !isOrgSuperAdmin ? 'Organization / Bill To' : 'Client & Billing Party'}
              </h2>
            </div>
            {selectedCustomer && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer(null);
                  setClientSearchQuery('');
                  setIsClientDropdownOpen(false);
                }}
                className="h-8 px-3.5 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-transparent rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all duration-200 cursor-pointer select-none active:scale-[0.98]"
              >
                Clear
              </button>
            )}
          </div>

          {/* Card Body */}
          <div className="p-8 space-y-8 flex-1 flex flex-col">
            {/* Organizations/Clients Searchable Dropdown */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {isSuperAdmin && !isOrgSuperAdmin ? 'Organization' : 'Client / Customer'} <span className="text-rose-500">*</span>
                </label>
              </div>

              <div className="relative" ref={clientDropdownRef}>
                {/* Single Combined Search & Dropdown Input Box */}
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                  <input
                    type="text"
                    value={isClientDropdownOpen ? clientSearchQuery : (selectedCustomer?.company || selectedCustomer?.name || clientSearchQuery)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setClientSearchQuery(val);
                      if (!isClientDropdownOpen) setIsClientDropdownOpen(true);
                      if (selectedCustomer && val !== selectedCustomer.company) {
                        setSelectedCustomer(null);
                      }
                    }}
                    onFocus={() => {
                      setIsClientDropdownOpen(true);
                      if (selectedCustomer && !clientSearchQuery) {
                        setClientSearchQuery(selectedCustomer.company);
                      }
                    }}
                    placeholder={isSuperAdmin && !isOrgSuperAdmin ? "Search or select organization..." : "Search or select client / customer..."}
                    className={`w-full h-11 pl-11 pr-16 bg-white border rounded-xl text-sm font-semibold transition-all shadow-2xs outline-none ${isClientDropdownOpen
                      ? 'border-[#4309A2] ring-4 ring-[#4309A2]/10 text-slate-900'
                      : 'border-slate-200 hover:border-slate-300 text-slate-800'
                      }`}
                  />
                  <div className="absolute right-3 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                      className="p-1 text-slate-400 hover:text-[#4309A2] transition-colors cursor-pointer"
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${isClientDropdownOpen ? 'rotate-180 text-[#4309A2]' : ''
                          }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Dropdown Menu Popup: Direct List of Organizations / Clients */}
                {isClientDropdownOpen && (
                  <div className="dropdown-menu absolute left-0 right-0 top-full mt-2 z-50 bg-white rounded-xl border border-slate-200 shadow-xl p-1.5 animate-in fade-in zoom-in-95 duration-100">
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {filteredCustomers.length === 0 ? (
                        <div className="py-4 text-center text-xs text-slate-400">
                          {isSuperAdmin && !isOrgSuperAdmin
                            ? `No matching organizations found for "${clientSearchQuery}".`
                            : `No matching clients found for "${clientSearchQuery}".`}
                        </div>
                      ) : (
                        filteredCustomers.map((cust) => {
                          const isSelected = selectedCustomer?.id === cust.id;
                          const displayName = cust.company || cust.name;
                          return (
                            <button
                              key={cust.id}
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(cust);
                                setClientSearchQuery(displayName);
                                setIsClientDropdownOpen(false);
                                showToast(
                                  'success',
                                  isSuperAdmin && !isOrgSuperAdmin ? 'Organization Selected' : 'Client Selected',
                                  `Selected "${displayName}".`
                                );
                              }}
                              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-between gap-3 ${isSelected
                                ? 'bg-[#33077C]/10 text-[#33077C] font-bold'
                                : 'hover:bg-slate-50 text-slate-800 font-medium'
                                }`}
                            >
                              <span className="truncate block font-semibold text-slate-800">{displayName}</span>
                              {isSelected && (
                                <Check className="w-4 h-4 text-[#33077C] stroke-[2.5] shrink-0" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Selected Organization / Client Card Details or Empty State */}
            {selectedCustomer ? (
              <div className="pt-2 flex-1 flex flex-col justify-between">
                <div>
                  <div className="space-y-3.5 text-[13px]">
                    <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                      <span className="font-bold text-slate-800">{isSuperAdmin && !isOrgSuperAdmin ? 'Organization' : 'Client Name'}</span>
                      <span className="text-slate-700 font-semibold">: {selectedCustomer.company || selectedCustomer.name}</span>
                    </div>
                    <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                      <span className="font-bold text-slate-800">GSTIN / Tax ID</span>
                      <span className="text-slate-700">: {(selectedCustomer as any).gstin || (selectedCustomer as any).taxId || 'N/A'}</span>
                    </div>
                    <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                      <span className="font-bold text-slate-800">PAN Number</span>
                      <span className="text-slate-700">: {(selectedCustomer as any).pan || 'N/A'}</span>
                    </div>
                    <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                      <span className="font-bold text-slate-800">Phone Number</span>
                      <span className="text-slate-700">: {selectedCustomer.phone || 'N/A'}</span>
                    </div>
                    <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                      <span className="font-bold text-slate-800">Email</span>
                      <span className="text-slate-700">: {selectedCustomer.email || 'N/A'}</span>
                    </div>
                    <div className="grid grid-cols-[140px_1fr] gap-2 items-start">
                      <span className="font-bold text-slate-800">Address</span>
                      <span className="text-slate-700 leading-relaxed">: {selectedCustomer.address || (selectedCustomer as any).location || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-slate-400 font-medium">
                {isSuperAdmin && !isOrgSuperAdmin ? 'No organization selected' : 'No client selected'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2ND SECTION: SALE PRODUCTS / INVOICE ITEMS BREAKDOWN */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#33077C]/10 text-[#33077C] flex items-center justify-center border border-[#33077C]/20 shadow-2xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Products, Services & Line Items
              </h2>
              <p className="text-xs text-slate-400">Configure deliverables, tax rates, unit pricing, and project scope</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            className="inline-flex items-center justify-center font-bold rounded-xl transition-all duration-200 cursor-pointer select-none bg-[#33077C] hover:bg-[#432eb5] text-white shadow-md hover:shadow-lg active:scale-[0.98] h-11 px-5 text-sm gap-2"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            <span>Add Line Item</span>
          </button>
        </div>

        {/* Line Items Table with Roomy Rows & Requested Column Headers */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mt-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm table-fixed min-w-[1040px] border-collapse border border-slate-200">
              <colgroup>
                <col className="w-auto min-w-[250px]" />
                <col className="w-[110px]" />
                <col className="w-[75px]" />
                <col className="w-[90px]" />
                <col className="w-[115px]" />
                <col className="w-[125px]" />
                <col className="w-[115px]" />
                <col className="w-[75px]" />
              </colgroup>
              <thead>
                <tr className="bg-[#33077C] border-b border-[#33077C]/30 text-[11px] font-bold uppercase tracking-wider text-white">
                  <th className="px-5 py-4 text-left border border-[#33077C]/30 bg-[#33077C] text-white">Item / Service Name</th>
                  <th className="px-2 py-4 text-center border border-[#33077C]/30 bg-[#33077C] text-white">HSN Code</th>
                  <th className="px-2 py-4 text-center border border-[#33077C]/30 bg-[#33077C] text-white">Qty</th>
                  <th className="px-2 py-4 text-center border border-[#33077C]/30 bg-[#33077C] text-white">GST (%)</th>
                  <th className="px-2 py-4 text-center border border-[#33077C]/30 bg-[#33077C] text-white">Price</th>
                  <th ref={discountTypeRef} className="px-2 py-4 text-center border border-[#33077C]/30 bg-[#33077C] text-white relative">
                    <button
                      type="button"
                      onClick={() => setIsDiscountTypeOpen(!isDiscountTypeOpen)}
                      className="inline-flex items-center gap-1 cursor-pointer hover:text-white/80 transition-colors"
                    >
                      <span>Discount {discountType === 'percent' ? '(%)' : '(₹)'}</span>
                      <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${isDiscountTypeOpen ? 'rotate-180 text-white' : 'text-white'}`} />
                    </button>
                    {isDiscountTypeOpen && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 bg-white rounded-xl border border-slate-200 shadow-xl p-1 w-40 animate-in fade-in zoom-in-95 duration-100 normal-case font-medium tracking-normal text-slate-800">
                        <button
                          type="button"
                          onClick={() => { setDiscountType('amount'); setIsDiscountTypeOpen(false); }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${discountType === 'amount' ? 'bg-orange-50 text-[#33077C]' : 'hover:bg-slate-50 text-slate-700'}`}
                        >
                          $ Amount
                        </button>
                        <button
                          type="button"
                          onClick={() => { setDiscountType('percent'); setIsDiscountTypeOpen(false); }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${discountType === 'percent' ? 'bg-orange-50 text-[#33077C]' : 'hover:bg-slate-50 text-slate-700'}`}
                        >
                          % Percentage
                        </button>
                      </div>
                    )}
                  </th>
                  <th className="px-2 py-4 text-center border border-[#33077C]/30 bg-[#33077C] text-white">Total</th>
                  <th className="px-2 py-4 text-center border border-[#33077C]/30 bg-[#33077C] text-white">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-sm text-slate-400 font-medium bg-slate-50/20">
                      No line items added
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const lineSubtotal = (Number(item.qty) || 0) * (Number(item.unitPrice) || 0);
                    const lineDiscount = discountType === 'percent'
                      ? (lineSubtotal * (Number(item.discount) || 0)) / 100
                      : Number(item.discount) || 0;
                    const lineTaxable = Math.max(0, lineSubtotal - lineDiscount);
                    const lineTax = (lineTaxable * (Number(item.taxPercent) || 0)) / 100;
                    const lineTotal = lineTaxable + lineTax;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* 1. Item / Service Name (Organization Custom Dropdown) */}
                        <td className="px-4 py-4 align-top border border-slate-200">
                          <div className="space-y-2">
                            <div className="relative product-dropdown-container">
                              <button
                                type="button"
                                ref={(el) => { triggerRefs.current[item.id] = el; }}
                                onClick={() => {
                                  if (openProductDropdownId === item.id) {
                                    setOpenProductDropdownId(null);
                                  } else {
                                    const rect = triggerRefs.current[item.id]?.getBoundingClientRect();
                                    if (rect) {
                                      setDropdownRect({
                                        top: rect.bottom + window.scrollY,
                                        left: rect.left + window.scrollX,
                                        width: rect.width,
                                      });
                                    }
                                    setOpenProductDropdownId(item.id);
                                  }
                                }}
                                className={`w-full h-10 px-3.5 bg-slate-50/70 hover:bg-white focus:bg-white border rounded-xl text-xs font-semibold text-left flex items-center justify-between transition-all cursor-pointer shadow-2xs ${
                                  openProductDropdownId === item.id
                                    ? 'border-[#4309A2] ring-3 ring-[#4309A2]/10 bg-white text-slate-900'
                                    : 'border-slate-200 hover:border-slate-300 text-slate-800'
                                }`}
                              >
                                <span className="truncate block font-semibold text-slate-800">
                                  {item.name || <span className="text-slate-400 font-normal">Select organization...</span>}
                                </span>
                                <ChevronDown
                                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ml-1.5 ${
                                    openProductDropdownId === item.id ? 'rotate-180 text-[#4309A2]' : ''
                                  }`}
                                />
                              </button>

                              {/* Custom Dropdown Popup Menu (Floating overlay outside table clipping) */}
                              {openProductDropdownId === item.id && dropdownRect && (
                                <div
                                  style={{
                                    top: `${dropdownRect.top + 6}px`,
                                    left: `${dropdownRect.left}px`,
                                    width: `${Math.max(260, dropdownRect.width)}px`,
                                  }}
                                  className="fixed z-[999] bg-white rounded-2xl border border-slate-200 shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100"
                                >
                                  <div className="max-h-60 overflow-y-auto space-y-0.5">
                                    {availableCustomers.length === 0 ? (
                                      <div className="py-3 text-center text-xs text-slate-400">
                                        No organizations found
                                      </div>
                                    ) : (
                                      availableCustomers.map((org) => {
                                        const orgName = org.company || org.name;
                                        const isSelected = item.name === orgName;
                                        return (
                                          <button
                                            key={org.id}
                                            type="button"
                                            onClick={() => {
                                              updateItem(item.id, 'name', orgName);
                                              setOpenProductDropdownId(null);
                                            }}
                                            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                              isSelected
                                                ? 'bg-[#33077C]/10 text-[#33077C] font-bold'
                                                : 'hover:bg-slate-50 text-slate-700 font-medium'
                                            }`}
                                          >
                                            <span className="truncate">{orgName}</span>
                                            {isSelected && <Check className="w-3.5 h-3.5 text-[#33077C] stroke-[2.5] shrink-0" />}
                                          </button>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Description Preview & Edit trigger */}
                            <div className="min-h-[22px] flex items-center">
                              {item.description ? (
                                <div
                                  onClick={() => {
                                    setDescriptionModalItem({
                                      id: item.id,
                                      name: item.name,
                                      description: item.description,
                                    });
                                    setTempDescription(item.description);
                                  }}
                                  className="group inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50/80 hover:bg-amber-100/90 border border-amber-200/80 rounded-lg text-xs text-amber-900 font-medium cursor-pointer transition-all max-w-[260px] truncate shadow-2xs"
                                  title="Click to edit description"
                                >
                                  <FileText className="w-3.5 h-3.5 text-[#4309A2] shrink-0" />
                                  <span className="truncate max-w-[210px] italic text-[11px] text-amber-900">
                                    {item.description}
                                  </span>
                                  <Pencil className="w-3 h-3 text-amber-600 opacity-60 group-hover:opacity-100 shrink-0 ml-0.5" />
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDescriptionModalItem({
                                      id: item.id,
                                      name: item.name,
                                      description: '',
                                    });
                                    setTempDescription('');
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-slate-400 hover:text-[#4309A2] hover:bg-orange-50/60 rounded-lg transition-all cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Add Description</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 2. HSN Code */}
                        <td className="px-2 py-4 align-top border border-slate-200">
                          <input
                            type="text"
                            value={item.hsnCode || ''}
                            onChange={(e) => updateItem(item.id, 'hsnCode', e.target.value)}
                            placeholder="998314"
                            className="w-full h-10 px-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-center text-slate-800 focus:border-[#4309A2] focus:ring-3 focus:ring-[#4309A2]/10 outline-none shadow-2xs transition-all"
                          />
                        </td>

                        {/* 3. Quantity */}
                        <td className="px-2 py-4 align-top border border-slate-200">
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => updateItem(item.id, 'qty', Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full h-10 px-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-bold text-center text-slate-900 focus:border-[#4309A2] focus:ring-3 focus:ring-[#4309A2]/10 outline-none shadow-2xs transition-all"
                          />
                        </td>

                        {/* 4. GST (%) */}
                        <td className="px-2 py-4 align-top border border-slate-200">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.taxPercent}
                            onChange={(e) => updateItem(item.id, 'taxPercent', Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-full h-10 px-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-center text-slate-800 focus:border-[#4309A2] focus:ring-3 focus:ring-[#4309A2]/10 outline-none shadow-2xs transition-all"
                          />
                        </td>

                        {/* 5. Price (₹) */}
                        <td className="px-2 py-4 align-top border border-slate-200">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(item.id, 'unitPrice', Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-full h-10 px-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-bold text-center text-slate-900 focus:border-[#4309A2] focus:ring-3 focus:ring-[#4309A2]/10 outline-none shadow-2xs transition-all"
                          />
                        </td>

                        {/* 6. Discount */}
                        <td className="px-2 py-4 align-top border border-slate-200">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.discount || 0}
                            onChange={(e) => updateItem(item.id, 'discount', Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-full h-10 px-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-center text-slate-800 focus:border-[#4309A2] focus:ring-3 focus:ring-[#4309A2]/10 outline-none shadow-2xs transition-all"
                          />
                        </td>

                        {/* 7. Total (₹) */}
                        <td className="px-2 py-4 align-top border border-slate-200">
                          <div className="h-10 flex items-center justify-center">
                            <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100/90 font-bold text-xs shadow-2xs font-sans min-w-[90px] text-center">
                              ₹{lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </td>

                        {/* 8. Action */}
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BILLING FOOTER: BANK PAYMENT DETAILS (LEFT) & INVOICE SUMMARY (RIGHT) */}
        {/* ========================================================================= */}
        <div className="p-6 lg:p-8 bg-[#F8FAFC] border-t border-slate-100">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* ===================================================================== */}
            {/* LEFT CARD: Bank Payment Details (7 cols) */}
            {/* ===================================================================== */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col">
              {/* Header */}
              <div className="px-7 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#33077C]/10 text-[#33077C] flex items-center justify-center border border-[#33077C]/20 shadow-2xs">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">
                      Bank Payment Details
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Select receiving account for invoice settlements</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddBankModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 h-11 px-5 bg-[#33077C] hover:bg-[#432eb5] active:scale-[0.98] border border-transparent rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" strokeWidth={2.5} />
                  <span>Add Bank</span>
                </button>
              </div>

              {/* Body */}
              <div className="p-7 space-y-6 flex-1">
                {bankAccounts.length === 0 ? (
                  <div className="py-6 text-center text-sm text-slate-400 font-medium">
                    No bank accounts found
                  </div>
                ) : (
                  <>
                    {/* Select Receiving Bank (Custom Roomy Dropdown) */}
                    <div className="relative" ref={bankDropdownRef}>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                        Select Receiving Bank Account
                      </label>

                      {/* Trigger Button */}
                      <button
                        type="button"
                        onClick={() => setIsBankDropdownOpen(!isBankDropdownOpen)}
                        className="w-full h-12 px-4 bg-white hover:bg-slate-50/70 border border-slate-200 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer shadow-2xs focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-orange-50 text-[#4309A2] flex items-center justify-center shrink-0 border border-orange-100">
                            <Landmark className="w-3.5 h-3.5" />
                          </div>
                          <div className="truncate">
                            <span className="text-sm font-bold text-slate-900">
                              {selectedBank?.bankName || 'Select Bank Account'}
                            </span>
                            {selectedBank && (
                              <span className="text-xs text-slate-500 font-medium ml-2">
                                &bull;&bull;&bull;&bull;{selectedBank.accountNumber.slice(-4)} {selectedBank.branchName ? `(${selectedBank.branchName})` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${isBankDropdownOpen ? 'rotate-180 text-[#4309A2]' : ''
                            }`}
                        />
                      </button>

                      {/* Custom Dropdown Popup Menu */}
                      {isBankDropdownOpen && (
                        <div className="absolute left-0 top-full mt-2 z-50 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 w-full space-y-1 animate-in fade-in zoom-in-95 duration-100">
                          <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                            <span>Configured Accounts</span>
                            <span>{bankAccounts.length} Available</span>
                          </div>

                          <div className="max-h-64 overflow-y-auto space-y-1 pt-1">
                            {bankAccounts.map((b) => {
                              const isSelected = b.id === selectedBankId;
                              return (
                                <button
                                  key={b.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedBankId(b.id);
                                    setIsBankDropdownOpen(false);
                                    showToast('success', 'Bank Selected', `Receiving bank set to ${b.bankName}.`);
                                  }}
                                  className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 ${isSelected
                                    ? 'bg-[#E8F8F0] border border-emerald-200/80 text-[#00A859]'
                                    : 'hover:bg-slate-50 border border-transparent text-slate-800'
                                    }`}
                                >
                                  <div className="flex items-center gap-3.5 min-w-0">
                                    <div
                                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ${isSelected
                                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                        : 'bg-orange-50 text-[#4309A2] border-orange-100'
                                        }`}
                                    >
                                      <Landmark className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-sm font-bold truncate">
                                        {b.bankName}
                                      </div>
                                      <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
                                        A/C: <span className="font-semibold text-slate-700">&bull;&bull;&bull;&bull;{b.accountNumber.slice(-4)}</span> {b.branchName ? `• ${b.branchName}` : ''}
                                      </div>
                                    </div>
                                  </div>

                                  {isSelected && (
                                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Quick Add Bank Footer Button */}
                          <div className="pt-1.5 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => {
                                setIsBankDropdownOpen(false);
                                setIsAddBankModalOpen(true);
                              }}
                              className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#4309A2] hover:bg-orange-50/70 border border-dashed border-orange-200 transition-all cursor-pointer flex items-center gap-2"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add New Bank Account</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Active Bank Details */}
                    {selectedBank && (
                      <div className="pt-2">
                        <div className="space-y-3.5 text-[13px]">
                          <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                            <span className="font-bold text-slate-800">Bank Name</span>
                            <span className="text-slate-700">: {selectedBank.bankName}</span>
                          </div>
                          <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                            <span className="font-bold text-slate-800">Account Number</span>
                            <span className="text-slate-700">: {selectedBank.accountNumber}</span>
                          </div>
                          {selectedBank.ifscCode && (
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                              <span className="font-bold text-slate-800">IFSC Code</span>
                              <span className="text-slate-700">: {selectedBank.ifscCode}</span>
                            </div>
                          )}
                          {selectedBank.branchName && (
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                              <span className="font-bold text-slate-800">Branch Name</span>
                              <span className="text-slate-700">: {selectedBank.branchName}</span>
                            </div>
                          )}
                          {selectedBank.accountName && (
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                              <span className="font-bold text-slate-800">Beneficiary Name</span>
                              <span className="text-slate-700">: {selectedBank.accountName}</span>
                            </div>
                          )}
                          {selectedBank.upiId && (
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                              <span className="font-bold text-slate-800">UPI ID</span>
                              <span className="text-slate-700">: {selectedBank.upiId}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ===================================================================== */}
            {/* RIGHT CARD: Invoice Summary (5 cols) */}
            {/* ===================================================================== */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col">
              {/* Header */}
              <div className="px-7 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
                <div className="flex items-center gap-3.5">
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    Invoice Summary
                  </h2>
                </div>
              </div>

              {/* Body */}
              <div className="p-7 space-y-5 flex-1">
                {/* Subtotal & Discount */}
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between text-slate-600 font-medium">
                    <span>Sub Total:</span>
                    <span className="font-bold text-slate-900 text-sm">
                      ₹{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 font-medium">
                    <span>Discount:</span>
                    <span className={`font-bold text-sm ${totalDiscount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                      {totalDiscount > 0 ? `-₹${totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '₹0.00'}
                    </span>
                  </div>
                </div>

                {/* GST Tax Breakdown */}
                <div className="pt-3 pb-2 border-t border-slate-100 space-y-2.5 text-sm">
                  <div className="flex items-center justify-between text-slate-600 font-medium">
                    <span>CGST:</span>
                    <span className="font-bold text-slate-900">₹{cgstAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 font-medium">
                    <span>SGST:</span>
                    <span className="font-bold text-slate-900">₹{sgstAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700 font-bold pt-2 border-t border-dashed border-slate-200/80">
                    <span>Total GST:</span>
                    <span className="font-bold text-slate-900">₹{taxTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Round Down and Round Up Toggle Buttons */}
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Rounding Adjustment
                    </label>
                    <span className="text-xs text-slate-400">click to apply</span>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setRoundMode(roundMode === 'down' ? 'none' : 'down')}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all cursor-pointer ${roundMode === 'down'
                        ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold shadow-2xs'
                        : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200/80 text-slate-700 font-medium'
                        }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${roundMode === 'down' ? 'border-amber-600 bg-amber-600' : 'border-slate-300 bg-white'
                          }`}>
                          {roundMode === 'down' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                        <span className="text-sm">Round Down</span>
                      </div>
                      <span className="font-bold text-sm">{roundDownDiff === 0 ? '₹0.00' : `-₹${Math.abs(roundDownDiff).toFixed(2)}`}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRoundMode(roundMode === 'up' ? 'none' : 'up')}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all cursor-pointer ${roundMode === 'up'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold shadow-2xs'
                        : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200/80 text-slate-700 font-medium'
                        }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${roundMode === 'up' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'
                          }`}>
                          {roundMode === 'up' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                        <span className="text-sm">Round Up</span>
                      </div>
                      <span className="font-bold text-sm">{roundUpDiff === 0 ? '₹0.00' : `+₹${roundUpDiff.toFixed(2)}`}</span>
                    </button>
                  </div>
                </div>

                {/* Grand Total Banner */}
                <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-blue-600 block uppercase tracking-wider">Grand Total</span>
                    <span className="text-xs text-slate-500 font-medium">Net payable amount</span>
                  </div>
                  <span className="font-bold text-lg text-blue-600">
                    ₹{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Action Button */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={async () => {
                    if (!selectedCustomer) {
                      showToast('error', 'Select Client', 'Please select or add a client in the Client card first.');
                      return;
                    }
                    if (items.length === 0) {
                      showToast('error', 'No Line Items', 'Please add at least one product or service line item.');
                      return;
                    }

                    if (isProforma) {
                      try {
                        setIsSubmitting(true);
                        if (invoiceToEdit) {
                          const updatePayload: UpdateProformaRequest = {
                            invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
                            dueDate: invoiceToEdit.dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                            discountTotal: totalDiscount,
                            billingAddress: selectedCustomer.address || selectedCustomer.location || 'Plot No 42, High-Tech Zone, Madhapur, Hyderabad, TG 500081',
                            gstin: (selectedCustomer as any).gstin || '33AAAAA0000A1Z5',
                            pan: (selectedCustomer as any).pan || 'AAAAA0000A',
                            notes: invoiceDescription || undefined,
                            items: items.map((it, idx) => ({
                              itemId: it.id || `SKU-${idx + 1}`,
                              itemDescription: it.description?.trim() ? `${it.name} - ${it.description.trim()}` : it.name,
                              hsnCode: it.hsnCode || '998314',
                              quantity: Number(it.qty) || 1,
                              unitPrice: Number(it.unitPrice) || 0,
                              gstPercent: Number(it.taxPercent) || 18,
                            })),
                          };
                          const res = await proformaInvoiceApi.updateProformaInvoice(invoiceToEdit.id, updatePayload);
                          showToast('success', 'Proforma Invoice Updated', `Proforma invoice #${res.data?.proformaNumber || ''} updated successfully!`);
                          navigate('/proforma/invoices');
                        } else {
                          const activeUserOrgId = currentUser?.organizationId || getStoredOrganizationId();
                          const createPayload: CreateProformaRequest = {
                            invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
                            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                            customerId: selectedCustomer.id,
                            organizationId: (isSuperAdmin && !isOrgSuperAdmin) ? selectedCustomer.id : (activeUserOrgId || selectedCustomer.id),
                            discountTotal: totalDiscount,
                            billingAddress: selectedCustomer.address || selectedCustomer.location || 'Plot No 42, High-Tech Zone, Madhapur, Hyderabad, TG 500081',
                            gstin: (selectedCustomer as any).gstin || '33AAAAA0000A1Z5',
                            pan: (selectedCustomer as any).pan || 'AAAAA0000A',
                            notes: invoiceDescription || undefined,
                            items: items.map((it, idx) => ({
                              itemId: it.id || `SKU-${idx + 1}`,
                              itemDescription: it.description?.trim() ? `${it.name} - ${it.description.trim()}` : it.name,
                              hsnCode: it.hsnCode || '998314',
                              quantity: Number(it.qty) || 1,
                              unitPrice: Number(it.unitPrice) || 0,
                              gstPercent: Number(it.taxPercent) || 18,
                            })),
                          };
                          const res = await proformaInvoiceApi.createProformaInvoice(createPayload);
                          showToast('success', 'Proforma Invoice Created', `Proforma invoice #${res.data?.proformaNumber || ''} created successfully on server!`);
                          navigate('/proforma/invoices');
                        }
                      } catch (err: any) {
                        console.error('Failed to save proforma invoice:', err);
                        const errMsg = err?.response?.data?.error?.message || err?.message || 'Failed to save proforma invoice';
                        showToast('error', 'Operation Failed', errMsg);
                      } finally {
                        setIsSubmitting(false);
                      }
                      return;
                    }

                    // Standard sale invoice flow
                    try {
                      setIsSubmitting(true);
                      const activeUserOrgId = currentUser?.organizationId || getStoredOrganizationId();
                      let validOrgId = (isSuperAdmin && !isOrgSuperAdmin)
                        ? selectedCustomer.id
                        : (activeUserOrgId || selectedCustomer.id);
                      if (isSuperAdmin && !isOrgSuperAdmin) {
                        const matchedOrg = platformOrgs.find(
                          (o) => o.id === selectedCustomer.id || o.name.toLowerCase() === selectedCustomer.company.toLowerCase()
                        );
                        if (matchedOrg) {
                          validOrgId = matchedOrg.id;
                        }
                      }

                      if (invoiceToEdit) {
                        const updatePayload: UpdateInvoiceRequest = {
                          dueDate: invoiceDate ? new Date(new Date(invoiceDate).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined,
                          notes: invoiceDescription || undefined,
                          discountTotal: totalDiscount,
                          billingAddress: selectedCustomer.address || selectedCustomer.location || 'Plot No 42, High-Tech Zone, Madhapur, Hyderabad, TG 500081',
                          items: items.map((it, idx) => ({
                            itemId: it.id || `SKU-${idx + 1}`,
                            itemDescription: it.description?.trim() ? `${it.name} - ${it.description.trim()}` : it.name,
                            hsnCode: it.hsnCode || '998314',
                            quantity: Number(it.qty) || 1,
                            unitPrice: Number(it.unitPrice) || 0,
                            gstPercent: Number(it.taxPercent) || 18,
                          })),
                        };
                        const res = await invoiceApi.updateInvoice(invoiceToEdit.id, updatePayload);
                        showToast('success', 'Invoice Updated', `Invoice #${res.data?.invoiceNumber || ''} updated successfully!`);
                        navigate('/sales/invoices');
                      } else {
                        const createPayload: CreateInvoiceRequest = {
                          invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
                          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                          customerId: selectedCustomer.id,
                          organizationId: validOrgId,
                          status: 'Sent',
                          discountTotal: totalDiscount,
                          billingAddress: selectedCustomer.address || selectedCustomer.location || 'Plot No 42, High-Tech Zone, Madhapur, Hyderabad, TG 500081',
                          gstin: (selectedCustomer as any).gstin || '33AAAAA0000A1Z5',
                          pan: (selectedCustomer as any).pan || 'AAAAA0000A',
                          notes: invoiceDescription || undefined,
                          items: items.map((it, idx) => ({
                            itemId: it.id || `SKU-${idx + 1}`,
                            itemDescription: it.description?.trim() ? `${it.name} - ${it.description.trim()}` : it.name,
                            hsnCode: it.hsnCode || '998314',
                            quantity: Number(it.qty) || 1,
                            unitPrice: Number(it.unitPrice) || 0,
                            gstPercent: Number(it.taxPercent) || 18,
                          })),
                        };
                        const res = await invoiceApi.createInvoice(createPayload);
                        showToast('success', 'Invoice Created', `Invoice #${res.data?.invoiceNumber || ''} created successfully on server!`);
                        navigate('/sales/invoices');
                      }
                    } catch (err: any) {
                      console.error('Failed to save invoice:', err);
                      const errMsg = err?.response?.data?.error?.message || err?.message || 'Failed to save invoice';
                      showToast('error', 'Operation Failed', errMsg);
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className="w-full h-12 bg-[#33077C] hover:bg-[#432eb5] text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>
                    {isSubmitting
                      ? isProforma ? 'Saving Proforma Invoice...' : 'Saving Invoice...'
                      : invoiceToEdit
                        ? (isProforma ? 'Update & Save Proforma Invoice' : 'Update & Save Invoice')
                        : (isProforma ? 'Generate & Save Proforma Invoice' : 'Generate & Save Invoice')}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ASK TO ADD / EDIT PRODUCT DESCRIPTION */}
      {/* ========================================================================= */}
      {descriptionModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#4309A2] flex items-center justify-center border border-orange-100">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Add Product Description</h3>
              </div>
              <button
                type="button"
                onClick={() => setDescriptionModalItem(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Add custom specifications, license scope, or service terms for{' '}
              <span className="font-bold text-slate-800">{descriptionModalItem.name}</span>:
            </p>

            <textarea
              rows={4}
              value={tempDescription}
              onChange={(e) => setTempDescription(e.target.value)}
              placeholder="Enter line item description or scope of service..."
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 outline-none resize-none transition-all"
              autoFocus
            />

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDescriptionModalItem(null)}
                className="h-11 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl cursor-pointer transition-colors flex items-center justify-center"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={handleSaveDescription}
                className="h-11 px-6 bg-[#33077C] hover:bg-[#432eb5] text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                Save Description
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EXISTING SALE INVOICES LIST */}
      {/* ========================================================================= */}
      {isExistingInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-7 py-5 bg-white border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Receipt className="w-5 h-5 text-[#4309A2]" />
                <h3 className="text-base font-bold text-slate-900">Select Existing Sale Invoice</h3>
              </div>
              <button
                onClick={() => setIsExistingInvoiceModalOpen(false)}
                className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-7 space-y-4">
              <p className="text-sm text-slate-400">
                Choose an existing invoice to view or load its billing parties, customer details, and invoice metadata.
              </p>

              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden max-h-80 overflow-y-auto">
                {isLoadingExistingInvoices ? (
                  <div className="py-12 text-center text-slate-400">
                    <Loader2 className="w-7 h-7 mx-auto mb-2 animate-spin text-[#33077C]" />
                    <p className="text-xs font-semibold text-slate-600">Loading existing invoices...</p>
                  </div>
                ) : existingInvoices.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <p className="text-xs font-semibold text-slate-600">No saved invoices found</p>
                  </div>
                ) : (
                  existingInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3.5"
                    >
                      <div>
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-sm text-[#33077C]">{inv.invoiceNumber}</span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              inv.status === 'Paid'
                                ? 'bg-emerald-50 text-emerald-700'
                                : inv.status === 'Partially Paid'
                                  ? 'bg-sky-50 text-sky-700'
                                  : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 font-semibold mt-1">{inv.customerName}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {inv.invoiceDate ? inv.invoiceDate.split('T')[0] : ''} - {inv.items?.length || 0} line items
                        </p>
                      </div>

                      <div className="text-right flex items-center gap-3.5">
                        <span className="font-black text-base text-slate-900">₹{inv.grandTotal?.toLocaleString()}</span>
                        <button
                          type="button"
                          onClick={() => handleSelectExistingInvoice(inv)}
                          className="h-9 px-4 bg-[#33077C] hover:bg-[#432eb5] text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
                        >
                          Load Sale
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="px-7 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsExistingInvoiceModalOpen(false)}
                className="h-11 px-6 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl cursor-pointer flex items-center justify-center"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD NEW BANK ACCOUNT */}
      {/* ========================================================================= */}
      {isAddBankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full overflow-hidden">
            {/* Modal Header */}
            <div
              className="px-6 py-4.5 flex items-center justify-between text-white sticky top-0 z-10 shadow-md"
              style={{ background: '#33077C' }}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddBankModalOpen(false)}
                  className="p-1.5 -ml-1 rounded-xl transition-all cursor-pointer flex items-center justify-center text-white hover:bg-white/20 active:scale-95"
                  title="Go back"
                >
                  <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
                </button>
                <div>
                  <h3 className="text-base font-bold text-white">Add New Bank Account</h3>
                  <p className="text-xs text-white/90 font-medium">Add payment settlement bank details for invoices</p>
                </div>
              </div>
            </div>

            <form noValidate onSubmit={handleSaveNewBank} className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                    Bank Name <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Axis Bank Ltd"
                    value={newBank.bankName || ''}
                    onChange={(e) => setNewBank({ ...newBank, bankName: e.target.value })}
                    className="w-full h-11 px-3.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                    Account Holder Name <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Yaa Creations"
                    value={newBank.accountName || ''}
                    onChange={(e) => setNewBank({ ...newBank, accountName: e.target.value })}
                    className="w-full h-11 px-3.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                    Account Number <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="918020012345678"
                    value={newBank.accountNumber || ''}
                    onChange={(e) => setNewBank({ ...newBank, accountNumber: e.target.value })}
                    className="w-full h-11 px-3.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                    IFSC / SWIFT <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="UTIB0000123"
                    value={newBank.ifscCode || ''}
                    onChange={(e) => setNewBank({ ...newBank, ifscCode: e.target.value })}
                    className="w-full h-11 px-3.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-2xs uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                    Branch Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Indiranagar, Bangalore"
                    value={newBank.branchName || ''}
                    onChange={(e) => setNewBank({ ...newBank, branchName: e.target.value })}
                    className="w-full h-11 px-3.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                    UPI ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. company@axis"
                    value={newBank.upiId || ''}
                    onChange={(e) => setNewBank({ ...newBank, upiId: e.target.value })}
                    className="w-full h-11 px-3.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-2xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddBankModalOpen(false)}
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
                  <span>Save Bank Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD NEW CUSTOMER RECORD */}
      {/* ========================================================================= */}
      <CustomerFormModal
        isOpen={isAddClientModalOpen}
        onClose={() => setIsAddClientModalOpen(false)}
      />

      {/* ========================================================================= */}
      {/* MODAL: ADD NEW PROJECT TO CLIENT */}
      {/* ========================================================================= */}
      {isAddClientProjectModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#4309A2] flex items-center justify-center border border-orange-100">
                  <FolderPlus className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Add Project to {selectedCustomer.company}
                  </h3>
                  <p className="text-xs text-slate-400">Associate a new project or service with this client</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddClientProjectModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form noValidate onSubmit={handleSaveClientProject} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1.5">Project / Service Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Custom Mobile App Development, Retainer, etc."
                  value={newClientProject.name || ''}
                  onChange={(e) => setNewClientProject({ ...newClientProject, name: e.target.value })}
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#4309A2] text-xs font-semibold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1.5">HSN / SAC Code</label>
                  <input
                    type="text"
                    placeholder="998313"
                    value={newClientProject.hsn || ''}
                    onChange={(e) => setNewClientProject({ ...newClientProject, hsn: e.target.value })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#4309A2] text-xs font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1.5">Unit Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    placeholder="999"
                    value={newClientProject.price || ''}
                    onChange={(e) => setNewClientProject({ ...newClientProject, price: parseFloat(e.target.value) || 0 })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#4309A2] text-xs font-bold text-slate-900 text-right"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1.5">GST (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newClientProject.taxPercent ?? 18}
                    onChange={(e) => setNewClientProject({ ...newClientProject, taxPercent: parseFloat(e.target.value) || 0 })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#4309A2] text-xs font-semibold text-slate-900 text-center"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1.5">Default Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Scope of deliverables, milestone details, or deliverables specification..."
                  value={newClientProject.description || ''}
                  onChange={(e) => setNewClientProject({ ...newClientProject, description: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#4309A2] text-xs text-slate-800 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddClientProjectModalOpen(false)}
                  className="h-11 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer text-sm flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-11 px-6 bg-[#33077C] hover:bg-[#432eb5] text-white font-bold rounded-xl cursor-pointer shadow-md hover:shadow-lg text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save & Select Project</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
