import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { SearchBar } from '../../components/common/SearchBar';
import { CustomSelect } from '../../components/common/CustomSelect';
import { authApi } from '../../api/auth/authApi';
import {
  Building2,
  Bell,
  Database,
  Palette,
  Save,
  Download,
  RotateCcw,
  Check,
  Type,
  Sun,
  Moon,
  Sparkles,
  Sliders,
  User,
  ShieldCheck,
  Users,
  Lock,
  Mail,
  Key,
  Shield,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Globe,
  Clock,
  Laptop,
  Layers,
  FileText,
  CreditCard,
  Package,
  FileSpreadsheet,
  BarChart3,
  Settings as SettingsIcon,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff,
  Loader2,
  Trash,
  UserCheck,
  Briefcase,
  Store,
  Compass,
  FileCheck2,
  FolderTree,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  MoreVertical,
  ArrowLeft,
  FileCode,
  Hash,
  MessageSquare,
  Share2,
  Activity,
  History,
  CheckCircle,
  Copy,
  ExternalLink,
  Receipt,
  FileCheck,
  Printer,
  Info,
  Percent,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';

interface RolePermissionActions {
  add: boolean;
  view: boolean;
  edit: boolean;
  delete: boolean;
  approval: boolean;
}

interface ModulePermissionItem {
  moduleId: string;
  moduleName: string;
  isSubModule?: boolean;
  parentModuleId?: string;
  actions: RolePermissionActions;
}

interface RoleRecord {
  id: string;
  serialNo: string;
  roleName: string;
  type: 'Custom' | 'System';
  createdOn: string;
  status: 'Active' | 'Inactive';
  adminAccess: boolean;
  modulePermissions: ModulePermissionItem[];
}

export const SettingsView: React.FC = () => {
  const { isAdmin, isSuperAdmin, currentUser, showToast } = useAuth();
  const {
    theme,
    setTheme,
    resetTheme,
    applyPreset,
    presets,
    primaryContrast,
    accentContrast,
    bgContrast,
    surfaceContrast,
    isBgDark,
    isPrimaryDark,
  } = useTheme();

  // Settings sidebar tab
  type SettingsTabId =
    | 'general'
    | 'account'
    | 'permission'
    | 'staff'
    | 'taxes_gst'
    | 'numbering_prefix'
    | 'whatsapp_integration'
    | 'activity_logs';

  const [superAdminTab, setSuperAdminTab] = useState<SettingsTabId>(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const validTabs: SettingsTabId[] = [
      'general',
      'account',
      'permission',
      'staff',
      'taxes_gst',
      'numbering_prefix',
      'whatsapp_integration',
      'activity_logs',
    ];
    if (tabParam && validTabs.includes(tabParam as SettingsTabId)) {
      return tabParam as SettingsTabId;
    }
    return 'general';
  });

  // Standard Admin tab
  const [activeTab, setActiveTab] = useState<'account' | 'company' | 'reminders' | 'backup'>(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'account' || tabParam === 'company' || tabParam === 'reminders' || tabParam === 'backup') {
      return tabParam as any;
    }
    return 'account';
  });

  // ==========================================
  // GENERAL SETTINGS STATE
  // ==========================================
  // A. Company Information
  const [genCompanyName, setGenCompanyName] = useState('Yaa Creations Pvt Ltd');
  const [genCompanyLogo, setGenCompanyLogo] = useState<string | null>(null);
  const [genCompanyEmail, setGenCompanyEmail] = useState('contact@yaacreations.com');
  const [genContactNumber, setGenContactNumber] = useState('+91 98765 43210');
  const [genCompanyAddress, setGenCompanyAddress] = useState('No. 42, Innovation Hub, Tech City, Chennai, Tamil Nadu 600001');
  const [genWebsiteUrl, setGenWebsiteUrl] = useState('https://yaacreations.com');
  const [genGstNumber, setGenGstNumber] = useState('33AAAAA0000A1Z5');
  const [genPanNumber, setGenPanNumber] = useState('AAAAA0000A');

  // B. Regional Settings
  const [currency, setCurrency] = useState('INR');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [timeFormat, setTimeFormat] = useState<'12' | '24'>('12');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [defaultLanguage, setDefaultLanguage] = useState('English');

  // C. Notification Preferences
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifInApp, setNotifInApp] = useState(true);
  const [notifPaymentReminders, setNotifPaymentReminders] = useState(true);
  const [notifSubscriptionExpiry, setNotifSubscriptionExpiry] = useState(true);
  const [notifInvoices, setNotifInvoices] = useState(true);
  const [notifLowStock, setNotifLowStock] = useState(true);

  // D. Application Preferences
  const [defaultDashboard, setDefaultDashboard] = useState('Sales & Financial Overview');
  const [itemsPerPage, setItemsPerPage] = useState<'10' | '25' | '50' | '100'>('25');
  const [defaultLandingPage, setDefaultLandingPage] = useState('/dashboard');
  const [enableSoundAlerts, setEnableSoundAlerts] = useState(true);

  // Legacy/Compatibility state
  const [systemName, setSystemName] = useState('Nexus CRM & ERP Platform');
  const [supportEmail, setSupportEmail] = useState('superadmin@gmail.com');
  const [billingEmail, setBillingEmail] = useState('billing@yaacreations.com');
  const [supportPhone, setSupportPhone] = useState('+91 98765 43210');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // ==========================================
  // ACCOUNT SETTINGS STATE
  // ==========================================
  // A. Profile Information
  const [accountProfilePhoto, setAccountProfilePhoto] = useState<string | null>(null);
  const [accountFullName, setAccountFullName] = useState(currentUser?.name || 'Super Admin');
  const [accountEmail, setAccountEmail] = useState(currentUser?.email || 'superadmin@gmail.com');
  const [accountPhone, setAccountPhone] = useState('+91 98765 43210');
  const [accountDesignation, setAccountDesignation] = useState('Chief Technology Officer & System Admin');
  const [accountDepartment, setAccountDepartment] = useState('Executive IT & Operations');
  const [accountEmployeeId, setAccountEmployeeId] = useState('EMP-2026-001');

  // B. Login & Security
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [twoFactorAuth, setTwoFactorAuth] = useState(true);

  // Last Login Information
  const lastLoginInfo = {
    timestamp: '25/11/2026 02:30:15 PM',
    ipAddress: '103.24.182.10',
    deviceBrowser: 'Chrome 131.0 (Windows 11 64-bit)',
    location: 'Chennai, India',
    status: 'Success'
  };

  // Backwards compatibility bindings
  const accountName = accountFullName;
  const setAccountName = setAccountFullName;

  // Company Information State (For Standard Admin)
  const [companyName, setCompanyName] = useState('Yaa Creations');

  // Notification & Automated Reminder settings
  const [leadFollowUpDays, setLeadFollowUpDays] = useState(2);
  const [paymentDueReminderDays, setPaymentDueReminderDays] = useState(3);
  const [subscriptionExpiryDays, setSubscriptionExpiryDays] = useState(14);

  // Taxes & GST State
  const [enableGst, setEnableGst] = useState(true);
  const [enableHsnSac, setEnableHsnSac] = useState(true);
  const [reverseCharge, setReverseCharge] = useState(false);
  const [enablePlaceOfSupply, setEnablePlaceOfSupply] = useState(true);
  const [compositeScheme, setCompositeScheme] = useState(false);
  const [enableTcs, setEnableTcs] = useState(false);
  const [enableTdsState, setEnableTdsState] = useState(false);

  // Tax Rates list
  const [taxRates, setTaxRates] = useState([
    { id: 'tr-1', name: 'IGST@0%', rate: 0 },
    { id: 'tr-2', name: 'SGST@0%', rate: 0 },
    { id: 'tr-3', name: 'CGST@0%', rate: 0 },
    { id: 'tr-4', name: 'IGST@0.25%', rate: 0.25 },
    { id: 'tr-5', name: 'SGST@0.125%', rate: 0.125 },
    { id: 'tr-6', name: 'CGST@0.125%', rate: 0.125 },
    { id: 'tr-7', name: 'IGST@3%', rate: 3 },
    { id: 'tr-8', name: 'SGST@1.5%', rate: 1.5 },
    { id: 'tr-9', name: 'CGST@1.5%', rate: 1.5 },
    { id: 'tr-10', name: 'IGST@5%', rate: 5 },
    { id: 'tr-11', name: 'SGST@2.5%', rate: 2.5 },
    { id: 'tr-12', name: 'CGST@2.5%', rate: 2.5 },
    { id: 'tr-13', name: 'IGST@12%', rate: 12 },
    { id: 'tr-14', name: 'SGST@6%', rate: 6 },
    { id: 'tr-15', name: 'CGST@6%', rate: 6 },
    { id: 'tr-16', name: 'IGST@18%', rate: 18 },
    { id: 'tr-17', name: 'SGST@9%', rate: 9 },
    { id: 'tr-18', name: 'CGST@9%', rate: 9 },
    { id: 'tr-19', name: 'IGST@28%', rate: 28 },
    { id: 'tr-20', name: 'SGST@14%', rate: 14 },
    { id: 'tr-21', name: 'CGST@14%', rate: 14 },
    { id: 'tr-22', name: 'IGST@40%', rate: 40 },
    { id: 'tr-23', name: 'SGST@20%', rate: 20 },
    { id: 'tr-24', name: 'CGST@20%', rate: 20 },
  ]);

  // Tax Rate Modal state
  const [isTaxRateModalOpen, setIsTaxRateModalOpen] = useState(false);
  const [newTaxRateName, setNewTaxRateName] = useState('');
  const [newTaxRateValue, setNewTaxRateValue] = useState('');

  // Transaction Message Settings State
  const [messageChannel, setMessageChannel] = useState<'vyapar' | 'whatsapp'>('vyapar');
  const [sendMsgToParty, setSendMsgToParty] = useState(true);
  const [sendMsgCopyToSelf, setSendMsgCopyToSelf] = useState(false);
  const [sendTxnUpdateMsg, setSendTxnUpdateMsg] = useState(false);
  const [autoShareVyaparNetwork, setAutoShareVyaparNetwork] = useState(false);

  // Message Content controls
  const [partyBalanceInMsg, setPartyBalanceInMsg] = useState(false);
  const [webInvoiceLinkInMsg, setWebInvoiceLinkInMsg] = useState(true);
  const [paymentLinkInMsg, setPaymentLinkInMsg] = useState(false);

  // Send Automatic Message For checkboxes
  const [autoMsgTypes, setAutoMsgTypes] = useState<{ [key: string]: boolean }>({
    Sales: true,
    Purchase: true,
    'Sales Return': true,
    'Purchase Return': true,
    'Payment In': true,
    'Payment Out': true,
    'Sale Order': true,
    'Purchase Order': false,
    Estimate: false,
    'Proforma Invoice': false,
    'Delivery Challan': false,
    'Cancelled Invoice': true,
  });

  // Preview Transaction Type selector
  const [previewTxnType, setPreviewTxnType] = useState('Sales');
  const [isTxnTypeDropdownOpen, setIsTxnTypeDropdownOpen] = useState(false);

  // Transaction Settings State (Matching user reference)
  // 1. Transaction Header
  const [invoiceBillNo, setInvoiceBillNo] = useState(true);
  const [addTimeOnTransactions, setAddTimeOnTransactions] = useState(false);
  const [cashSaleByDefault, setCashSaleByDefault] = useState(false);
  const [billingNameOfParties, setBillingNameOfParties] = useState(false);
  const [poDetailsOnTransactions, setPoDetailsOnTransactions] = useState(false);

  // 2. Items Table
  const [inclusiveExclusiveTaxRate, setInclusiveExclusiveTaxRate] = useState(true);
  const [displayPurchasePrice, setDisplayPurchasePrice] = useState(true);
  const [showLast5SalePrice, setShowLast5SalePrice] = useState(false);
  const [showLast5PurchasePrice, setShowLast5PurchasePrice] = useState(false);
  const [freeItemQuantity, setFreeItemQuantity] = useState(false);
  const [enableItemCount, setEnableItemCount] = useState(false);

  // 3. Taxes, Discount & Totals
  const [transactionWiseTax, setTransactionWiseTax] = useState(false);
  const [transactionWiseDiscount, setTransactionWiseDiscount] = useState(false);
  const [roundOffType, setRoundOffType] = useState('Nearest');
  const [roundOffTo, setRoundOffTo] = useState('1');

  // 4. More Transaction Features
  const [ewayBillNo, setEwayBillNo] = useState(false);
  const [quickEntry, setQuickEntry] = useState(false);
  const [doNotShowInvoicePreview, setDoNotShowInvoicePreview] = useState(false);
  const [repeatInvoices, setRepeatInvoices] = useState(false);
  const [enablePasscodeForEditDelete, setEnablePasscodeForEditDelete] = useState(false);
  const [discountDuringPayments, setDiscountDuringPayments] = useState(false);
  const [linkPaymentsToInvoices, setLinkPaymentsToInvoices] = useState(false);
  const [dueDatesAndPaymentTerms, setDueDatesAndPaymentTerms] = useState(false);
  const [showProfitWhileMakingSale, setShowProfitWhileMakingSale] = useState(false);
  const [termsAndConditionsEnabled, setTermsAndConditionsEnabled] = useState(true);

  // 5. Billing Type
  const [billingType, setBillingType] = useState<'Lite Sale' | 'Full Sale'>('Full Sale');

  // Documents & Billing Settings State
  const [defaultTaxRate, setDefaultTaxRate] = useState('18');
  const [enableTds, setEnableTds] = useState(false);
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState('Net 30');
  const [invoiceDuePeriodDays, setInvoiceDuePeriodDays] = useState(30);
  const [invoiceNotes, setInvoiceNotes] = useState('Thank you for your business. Please remit payment by the due date.');
  const [invoiceTerms, setInvoiceTerms] = useState('1. Interest @ 18% p.a. charged on overdue payments.\n2. Goods once sold will not be taken back.');
  const [signatureName, setSignatureName] = useState('Authorized Signatory');
  const [roundOffTotal, setRoundOffTotal] = useState(true);

  // Document / Print Settings State
  const [printerTab, setPrinterTab] = useState<'regular' | 'thermal'>('regular');
  const [printSubTab, setPrintSubTab] = useState<'layout' | 'colors'>('layout');
  const [selectedInvoiceTemplate, setSelectedInvoiceTemplate] = useState('landscape_theme_2');
  const [makeRegularPrinterDefault, setMakeRegularPrinterDefault] = useState(true);
  const [printRepeatHeader, setPrintRepeatHeader] = useState(true);
  const [printCompanyName, setPrintCompanyName] = useState('My Company');
  const [printCompanyLogo, setPrintCompanyLogo] = useState(true);
  const [printAddress, setPrintAddress] = useState(true);
  const [printAddressValue, setPrintAddressValue] = useState('');
  const [printEmail, setPrintEmail] = useState(true);
  const [printEmailValue, setPrintEmailValue] = useState('');
  const [printPhone, setPrintPhone] = useState(true);
  const [printPhoneValue, setPrintPhoneValue] = useState('9080185828');
  const [printGstin, setPrintGstin] = useState(true);
  const [printGstinValue, setPrintGstinValue] = useState('');
  const [paperSize, setPaperSize] = useState('A4');
  const [orientation, setOrientation] = useState('Portrait');
  const [companyNameSize, setCompanyNameSize] = useState('Large');
  const [invoiceTextSize, setInvoiceTextSize] = useState('Medium');
  const [printOriginalDuplicate, setPrintOriginalDuplicate] = useState(false);
  const [extraSpaceTopPdf, setExtraSpaceTopPdf] = useState(0);

  // Item Table Settings
  const [expandTableToWholePage, setExpandTableToWholePage] = useState(true);
  const [minItemRows, setMinItemRows] = useState(0);

  // Totals & Taxes Settings
  const [totalItemQuantity, setTotalItemQuantity] = useState(true);
  const [amountWithDecimal, setAmountWithDecimal] = useState(true);
  const [receivedAmount, setReceivedAmount] = useState(true);
  const [balanceAmount, setBalanceAmount] = useState(true);
  const [currentBalanceOfParty, setCurrentBalanceOfParty] = useState(false);
  const [taxDetails, setTaxDetails] = useState(true);
  const [youSaved, setYouSaved] = useState(true);
  const [printAmountWithGrouping, setPrintAmountWithGrouping] = useState(true);
  const [amountInWordsFormat, setAmountInWordsFormat] = useState('Indian');

  // Footer Settings
  const [printDescription, setPrintDescription] = useState(true);
  const [printTermsConditions, setPrintTermsConditions] = useState(true);
  const [printReceivedBy, setPrintReceivedBy] = useState(true);
  const [printDeliveredBy, setPrintDeliveredBy] = useState(true);
  const [printSignature, setPrintSignature] = useState(true);
  const [signatureText, setSignatureText] = useState('Authorized Signatory');
  const [printPaymentMode, setPrintPaymentMode] = useState(false);
  const [printAcknowledgement, setPrintAcknowledgement] = useState(false);

  // Numbering & Prefix State
  interface TransactionPrefixConfig {
    id: string;
    label: string;
    prefix: string;
    nextNumber: string;
  }

  const [prefixFirm, setPrefixFirm] = useState('My Company');
  const [prefixOptions, setPrefixOptions] = useState<string[]>([
    'None',
    '2026-27',
    'FY26-27',
    'INV-',
    'EST-',
    'DC-',
    'REC-',
  ]);
  const [newCustomPrefix, setNewCustomPrefix] = useState('');
  const [openPrefixDropdown, setOpenPrefixDropdown] = useState<string | null>(null);

  const [transactionPrefixes, setTransactionPrefixes] = useState<{
    [key: string]: { prefix: string; nextNumber: string };
  }>({
    firm: { prefix: 'My Company', nextNumber: '' },
    // Standard 4
    invoice: { prefix: '2026-27', nextNumber: '' },
    proforma: { prefix: 'None', nextNumber: '' },
    payment: { prefix: 'None', nextNumber: '' },
    quotation: { prefix: 'None', nextNumber: '' },
    // Additional 11 Modules
    estimation: { prefix: 'None', nextNumber: '' },
    proforma_invoice: { prefix: 'None', nextNumber: '' },
    sale_invoice: { prefix: '2026-27', nextNumber: '' },
    sales_order: { prefix: 'None', nextNumber: '' },
    delivery_challan: { prefix: 'None', nextNumber: '' },
    payment_in: { prefix: 'None', nextNumber: '' },
    sales_return: { prefix: 'None', nextNumber: '' },
    purchase_request: { prefix: 'None', nextNumber: '' },
    purchase_bill: { prefix: 'None', nextNumber: '' },
    purchase_return: { prefix: 'None', nextNumber: '' },
    payment_out: { prefix: 'None', nextNumber: '' },
  });

  const [invoicePrefix, setInvoicePrefix] = useState('INV-');
  const [invoiceNextNumber, setInvoiceNextNumber] = useState('1001');
  const [proformaPrefix, setProformaPrefix] = useState('PI-');
  const [proformaNextNumber, setProformaNextNumber] = useState('501');
  const [estimatePrefix, setEstimatePrefix] = useState('EST-');
  const [estimateNextNumber, setEstimateNextNumber] = useState('201');
  const [paymentReceiptPrefix, setPaymentReceiptPrefix] = useState('REC-');
  const [paymentReceiptNextNumber, setPaymentReceiptNextNumber] = useState('3001');
  const [creditNotePrefix, setCreditNotePrefix] = useState('CN-');
  const [creditNoteNextNumber, setCreditNoteNextNumber] = useState('101');
  const [purchaseOrderPrefix, setPurchaseOrderPrefix] = useState('PO-');
  const [purchaseOrderNextNumber, setPurchaseOrderNextNumber] = useState('401');

  // WhatsApp Integration State
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [whatsappProvider, setWhatsappProvider] = useState('meta_cloud');
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState('104829104829104');
  const [whatsappBusinessAccountId, setWhatsappBusinessAccountId] = useState('209384029384029');
  const [whatsappAccessToken, setWhatsappAccessToken] = useState('••••••••••••••••••••••••••••••');
  const [whatsappAutoSendInvoice, setWhatsappAutoSendInvoice] = useState(true);
  const [whatsappAutoSendReceipt, setWhatsappAutoSendReceipt] = useState(true);
  const [whatsappAutoSendReminder, setWhatsappAutoSendReminder] = useState(true);

  // Integrations State
  const [emailService, setEmailService] = useState('smtp');
  const [smtpHost, setSmtpHost] = useState('smtp.mailgun.org');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('postmaster@yaacreations.com');
  const [paymentGateway, setPaymentGateway] = useState('razorpay');
  const [razorpayKeyId, setRazorpayKeyId] = useState('rzp_live_9a8b7c6d5e4f');
  const [smsGateway, setSmsGateway] = useState('fast2sms');

  // Security State
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(60);
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(5);
  const [enforcePasswordPolicy, setEnforcePasswordPolicy] = useState(true);
  const [ipWhitelistEnabled, setIpWhitelistEnabled] = useState(false);
  const [whitelistedIps, setWhitelistedIps] = useState('192.168.1.1, 10.0.0.1');

  // -------------------------------------------------------------------------
  // Role Management Modules & Sub-modules Structure (Exact Sidebar Hierarchy)
  // -------------------------------------------------------------------------
  interface SystemModuleDef {
    id: string;
    name: string;
    subModules?: { id: string; name: string }[];
  }

  const systemModuleCatalog: SystemModuleDef[] = [
    {
      id: 'dashboard',
      name: 'DASHBOARD',
    },
    {
      id: 'organizations',
      name: 'ORGANIZATIONS & SUB-ORGANIZATIONS',
      subModules: [
        { id: 'org_directory', name: 'Organizations List' },
        { id: 'sub_organizations', name: 'Sub Organizations' },
      ],
    },
    {
      id: 'branches',
      name: 'BRANCHES & LOCATIONS',
    },
    {
      id: 'products',
      name: 'PRODUCTS & ITEMS',
      subModules: [
        { id: 'prod_items', name: 'Products Catalog' },
        { id: 'prod_categories', name: 'Categories' },
        { id: 'prod_subcategories', name: 'Subcategories' },
        { id: 'prod_stock', name: 'Stock Summary & Inventory' },
      ],
    },
    {
      id: 'leads',
      name: 'CLIENTS & LEADS (CRM)',
      subModules: [
        { id: 'leads_pipeline', name: 'Leads & Inquiries' },
        { id: 'clients_customers', name: 'Customers & Clients' },
        { id: 'suppliers_parties', name: 'Suppliers & Vendors' },
      ],
    },
    {
      id: 'quotes',
      name: 'QUOTATIONS & ESTIMATES',
    },
    {
      id: 'proforma',
      name: 'PROFORMA INVOICES',
      subModules: [
        { id: 'proforma_create', name: 'New Proforma Invoice' },
        { id: 'proforma_list', name: 'Proforma Invoices List' },
      ],
    },
    {
      id: 'invoices',
      name: 'INVOICES & BILLING',
      subModules: [
        { id: 'sales_new_invoice', name: 'Create New Invoice' },
        { id: 'sales_invoices_list', name: 'Sales Invoices List' },
        { id: 'sales_returns_credit', name: 'Sales Return (Credit Note)' },
      ],
    },
    {
      id: 'work_mgmt',
      name: 'WORK MANAGEMENT',
      subModules: [
        { id: 'content_planner', name: 'Content Planner' },
        { id: 'today_tasks', name: "Today's Tasks" },
      ],
    },
    {
      id: 'payments',
      name: 'PAYMENTS & RECEIPTS',
    },
    {
      id: 'subscriptions',
      name: 'SUBSCRIPTIONS & PLANS',
      subModules: [
        { id: 'subscription_plans', name: 'Subscription Plans' },
        { id: 'org_subscriptions', name: 'Organization Subscriptions' },
      ],
    },
    {
      id: 'reminders',
      name: 'REMINDERS & NOTIFICATIONS',
    },
    {
      id: 'reports',
      name: 'REPORTS & ANALYTICS',
      subModules: [
        { id: 'rep_sales_gst', name: 'Sales & GST Reports' },
        { id: 'rep_inventory', name: 'Stock & Inventory Reports' },
        { id: 'rep_financial', name: 'Financial Statements' },
      ],
    },
    {
      id: 'sale_management',
      name: 'SALE MANAGEMENT (ERP & PURCHASE)',
      subModules: [
        { id: 'sm_sales_hub', name: 'Sales Hub & Orders' },
        { id: 'sm_purchase_bills', name: 'Purchase Bills & PO' },
        { id: 'sm_purchase_returns', name: 'Purchase Return (Debit Note)' },
      ],
    },
    {
      id: 'pending_dues',
      name: 'PENDING DUES & AGING',
    },
    {
      id: 'system_settings',
      name: 'SYSTEM SETTINGS',
      subModules: [
        { id: 'set_general', name: 'General Platform Settings' },
        { id: 'set_theme', name: 'Theme & Branding Colors' },
        { id: 'set_security', name: 'Account & Security Protocols' },
        { id: 'set_staff_roles', name: 'Staff & Roles Management' },
      ],
    },
  ];

  // Flattened list helper of all modules and submodules
  const generateFullModulePermissionsList = (allEnabled = true): ModulePermissionItem[] => {
    const list: ModulePermissionItem[] = [];
    systemModuleCatalog.forEach((mod) => {
      // Main Module Entry
      list.push({
        moduleId: mod.id,
        moduleName: mod.name,
        isSubModule: false,
        actions: {
          add: allEnabled,
          view: allEnabled,
          edit: allEnabled,
          delete: allEnabled,
          approval: allEnabled,
        },
      });

      // Sub Modules Entries
      if (mod.subModules && mod.subModules.length > 0) {
        mod.subModules.forEach((sub) => {
          list.push({
            moduleId: sub.id,
            moduleName: sub.name,
            isSubModule: true,
            parentModuleId: mod.id,
            actions: {
              add: allEnabled,
              view: allEnabled,
              edit: allEnabled,
              delete: allEnabled,
              approval: allEnabled,
            },
          });
        });
      }
    });
    return list;
  };

  const defaultRoleRecords: RoleRecord[] = [
    {
      id: 'role-1',
      serialNo: 'YC-YAA-005',
      roleName: 'CEO',
      type: 'Custom',
      createdOn: '9/21/2026',
      status: 'Active',
      adminAccess: true,
      modulePermissions: generateFullModulePermissionsList(true),
    },
    {
      id: 'role-2',
      serialNo: 'YC-004',
      roleName: 'Staff',
      type: 'Custom',
      createdOn: '9/10/2026',
      status: 'Active',
      adminAccess: false,
      modulePermissions: generateFullModulePermissionsList(false).map((item) => {
        const allowed = ['dashboard', 'products', 'prod_items', 'leads', 'leads_pipeline', 'clients_customers', 'quotes', 'invoices', 'sales_invoices_list', 'reminders', 'pending_dues'].includes(item.moduleId);
        return {
          ...item,
          actions: {
            add: allowed,
            view: allowed,
            edit: false,
            delete: false,
            approval: false,
          },
        };
      }),
    },
    {
      id: 'role-3',
      serialNo: 'YC-003',
      roleName: 'Branch Manager',
      type: 'Custom',
      createdOn: '9/05/2026',
      status: 'Active',
      adminAccess: true,
      modulePermissions: generateFullModulePermissionsList(false).map((item) => {
        const excluded = ['organizations', 'org_directory', 'sub_organizations', 'subscriptions', 'subscription_plans', 'org_subscriptions', 'system_settings', 'set_general', 'set_theme', 'set_security', 'set_staff_roles'].includes(item.moduleId);
        return {
          ...item,
          actions: {
            add: !excluded,
            view: !excluded,
            edit: !excluded,
            delete: false,
            approval: !excluded,
          },
        };
      }),
    },
  ];

  const [roleList, setRoleList] = useState<RoleRecord[]>(defaultRoleRecords);
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [activeRoleDropdownId, setActiveRoleDropdownId] = useState<string | null>(null);
  const [roleDropdownPos, setRoleDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  // Modal state
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'add'>('view');
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null);

  // Form Fields for Add / Edit / View Role Modal
  const [formRoleName, setFormRoleName] = useState('');
  const [formRoleStatus, setFormRoleStatus] = useState<'Active' | 'Inactive'>('Active');
  const [formAdminAccess, setFormAdminAccess] = useState<boolean>(true);
  const [formModulePermissions, setFormModulePermissions] = useState<ModulePermissionItem[]>([]);

  // Open View Role Modal
  const handleOpenViewRole = (role: RoleRecord) => {
    setEditingRole(role);
    setFormRoleName(role.roleName);
    setFormRoleStatus(role.status);
    setFormAdminAccess(role.adminAccess);
    setFormModulePermissions(JSON.parse(JSON.stringify(role.modulePermissions)));
    setModalMode('view');
    setIsRoleModalOpen(true);
  };

  // Open Edit Role Modal
  const handleOpenEditRole = (role: RoleRecord) => {
    setEditingRole(role);
    setFormRoleName(role.roleName);
    setFormRoleStatus(role.status);
    setFormAdminAccess(role.adminAccess);
    setFormModulePermissions(JSON.parse(JSON.stringify(role.modulePermissions)));
    setModalMode('edit');
    setIsRoleModalOpen(true);
  };

  // Open Add Role Modal
  const handleOpenAddRole = () => {
    setEditingRole(null);
    setFormRoleName('');
    setFormRoleStatus('Active');
    setFormAdminAccess(true);
    setFormModulePermissions(generateFullModulePermissionsList(true));
    setModalMode('add');
    setIsRoleModalOpen(true);
  };

  // Delete Role
  const handleDeleteRole = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete role "${name}"?`)) {
      setRoleList((prev) => prev.filter((r) => r.id !== id));
      showToast('success', 'Role Removed', `Role "${name}" has been deleted.`);
    }
  };

  // Toggle specific action for a module in modal
  const handleToggleModuleAction = (moduleId: string, actionKey: keyof RolePermissionActions) => {
    setFormModulePermissions((prev) =>
      prev.map((item) => {
        if (item.moduleId !== moduleId) return item;
        return {
          ...item,
          actions: {
            ...item.actions,
            [actionKey]: !item.actions[actionKey],
          },
        };
      })
    );
  };

  // Toggle ALL ACCESS ON / OFF for a module (and its submodules if it's a parent)
  const handleToggleAllAccess = (moduleId: string, enableAll: boolean) => {
    setFormModulePermissions((prev) => {
      // Check if this module is a parent module with submodules
      const isParent = prev.some((item) => item.parentModuleId === moduleId);

      return prev.map((item) => {
        // If this item is the target module OR a child of this parent module
        if (item.moduleId === moduleId || (isParent && item.parentModuleId === moduleId)) {
          return {
            ...item,
            actions: {
              add: enableAll,
              view: enableAll,
              edit: enableAll,
              delete: enableAll,
              approval: enableAll,
            },
          };
        }
        return item;
      });
    });
  };

  // Save Role from Modal
  const handleSaveRoleModal = () => {
    if (!formRoleName.trim()) {
      showToast('error', 'Validation Error', 'Please enter a valid role name.');
      return;
    }

    if (modalMode === 'edit' && editingRole) {
      setRoleList((prev) =>
        prev.map((r) =>
          r.id === editingRole.id
            ? {
              ...r,
              roleName: formRoleName,
              status: formRoleStatus,
              adminAccess: formAdminAccess,
              modulePermissions: formModulePermissions,
            }
            : r
        )
      );
      showToast('success', 'Role Updated', `Permissions for "${formRoleName}" updated successfully.`);
    } else if (modalMode === 'add') {
      const newRole: RoleRecord = {
        id: `role-${Date.now()}`,
        serialNo: `YC-00${roleList.length + 5}`,
        roleName: formRoleName,
        type: 'Custom',
        createdOn: new Date().toLocaleDateString('en-US'),
        status: formRoleStatus,
        adminAccess: formAdminAccess,
        modulePermissions: formModulePermissions,
      };
      setRoleList((prev) => [newRole, ...prev]);
      showToast('success', 'Role Created', `New role "${formRoleName}" added successfully.`);
    }

    setIsRoleModalOpen(false);
  };

  // Filtered Roles
  const filteredRoles = roleList.filter((r) =>
    roleSearchQuery
      ? r.roleName.toLowerCase().includes(roleSearchQuery.toLowerCase()) ||
      r.serialNo.toLowerCase().includes(roleSearchQuery.toLowerCase())
      : true
  );



  // Staff / Super Admin Team State
  const [staffMembers, setStaffMembers] = useState([
    {
      id: 'staff-1',
      name: 'Super Admin',
      email: 'superadmin@gmail.com',
      role: 'Platform Owner',
      department: 'Executive Administration',
      status: 'Active',
      lastActive: 'Just now',
    },
    {
      id: 'staff-2',
      name: 'Eswaran A',
      email: 'eswaran@yaacreations.com',
      role: 'Lead Architect',
      department: 'Engineering & DevOps',
      status: 'Active',
      lastActive: '12 mins ago',
    },
    {
      id: 'staff-3',
      name: 'Aditi Sharma',
      email: 'aditi.sharma@platform.com',
      role: 'Security Officer',
      department: 'Compliance & Audit',
      status: 'Active',
      lastActive: '2 hours ago',
    },
    {
      id: 'staff-4',
      name: 'Vikram Malhotra',
      email: 'vikram.m@platform.com',
      role: 'Support Manager',
      department: 'Customer Success',
      status: 'Active',
      lastActive: 'Yesterday',
    },
  ]);

  // New staff modal state
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('System Admin');
  const [newStaffDept, setNewStaffDept] = useState('Technical Support');

  const fontOptions = [
    { label: 'Inter (Modern Standard UI)', value: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
    { label: 'Poppins (Modern Clean Sans-Serif)', value: '"Poppins", sans-serif' },
    { label: 'EB Garamond (Classic Editorial Serif)', value: '"EB Garamond", serif' },
    { label: 'Plus Jakarta Sans (Sleek Geometric)', value: '"Plus Jakarta Sans", sans-serif' },
    { label: 'JetBrains Mono (Technical Monospace)', value: '"JetBrains Mono", monospace' },
  ];

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('error', 'Unauthorized', 'Only Administrators can update system configuration.');
      return;
    }
    showToast('success', 'Configuration Saved', 'Settings updated successfully across the system.');
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      showToast('error', 'Validation Error', 'Please enter your current and new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('error', 'Password Mismatch', 'New password and confirmation do not match.');
      return;
    }

    try {
      setIsUpdatingPassword(true);
      await authApi.changePassword({
        currentPassword,
        newPassword,
      });
      showToast('success', 'Password Updated', 'Your password has been changed and other sessions revoked.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast('error', 'Update Failed', err?.message || 'Failed to update password. Please check your credentials.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffEmail.trim()) {
      showToast('error', 'Validation Error', 'Please enter staff name and email.');
      return;
    }
    const newMember = {
      id: `staff-${Date.now()}`,
      name: newStaffName.trim(),
      email: newStaffEmail.trim(),
      role: newStaffRole,
      department: newStaffDept,
      status: 'Active',
      lastActive: 'Just added',
    };
    setStaffMembers([newMember, ...staffMembers]);
    setIsStaffModalOpen(false);
    setNewStaffName('');
    setNewStaffEmail('');
    showToast('success', 'Staff Member Added', `${newMember.name} added to platform staff.`);
  };

  const handleDeleteStaff = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name}?`)) return;
    setStaffMembers(staffMembers.filter((s) => s.id !== id));
    showToast('success', 'Staff Removed', `${name} has been removed.`);
  };

  const handleExportDatabase = () => {
    showToast('info', 'Database Backup Created', 'apex_management_backup_2026.json ready for download.');
  };

  if (!isAdmin) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
        <h3 className="text-sm font-bold text-slate-800">Restricted Access</h3>
        <p className="text-xs text-slate-500 mt-1">System settings and administration are reserved for Admins.</p>
      </div>
    );
  }

  // =========================================================================
  // UNIFIED SETTINGS LAYOUT WITH GROUPED SIDEBAR NAVIGATION
  // Sections:
  // 1. GENERAL (General, Account, Permission, Staff)
  // 2. DOCUMENTS & BILLING (Invoice Settings, Document Templates, Numbering & Prefix)
  // 3. INTEGRATIONS & SECURITY (WhatsApp Integration, Integrations, Security, Activity Logs)
  // =========================================================================
  if (isSuperAdmin || isAdmin) {
    interface SidebarSection {
      groupTitle: string;
      items: { id: SettingsTabId; label: string; icon: React.ComponentType<any> }[];
    }

    const settingsSidebarSections: SidebarSection[] = [
      {
        groupTitle: 'GENERAL',
        items: [
          { id: 'general', label: 'General', icon: Sliders },
          { id: 'account', label: 'Account', icon: User },
          { id: 'permission', label: 'Permission', icon: ShieldCheck },
          { id: 'staff', label: 'Staff', icon: Users },
        ],
      },
      {
        groupTitle: 'DOCUMENTS & BILLING',
        items: [
          { id: 'taxes_gst', label: 'Taxes & GST', icon: Percent },
          { id: 'numbering_prefix', label: 'Numbering & Prefix', icon: Hash },
        ],
      },
      {
        groupTitle: 'INTEGRATIONS & COMMUNICATIONS',
        items: [
          { id: 'whatsapp_integration', label: 'WhatsApp Integration', icon: MessageSquare },
        ],
      },
      {
        groupTitle: 'AUDIT & LOGS',
        items: [
          { id: 'activity_logs', label: 'Activity Logs', icon: History },
        ],
      },
    ];

    const pageTitle = isSuperAdmin ? 'Super Admin Settings' : 'Settings & Configuration';
    const pageSubtitle = isSuperAdmin
      ? 'Configure platform parameters, branding themes, security protocols, roles and administration staff.'
      : 'Configure system parameters, branding themes, account credentials, permissions and staff members.';

    return (
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
                <Sliders className="w-4.5 h-4.5" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {pageTitle}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              {pageSubtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleSaveSettings}
              className="h-10 px-5 bg-[#33077C] hover:bg-[#432eb5] text-white text-xs sm:text-[13px] font-bold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>

        {/* Unified Single Card Container */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[680px]">
            {/* Left Settings Sidebar */}
            <div className="lg:col-span-3 xl:col-span-3 2xl:col-span-2 p-3 sm:p-3.5 border-b lg:border-b-0 lg:border-r border-slate-200/80 space-y-3.5 bg-slate-50/40">
              {settingsSidebarSections.map((section, idx) => (
                <div key={section.groupTitle} className={idx > 0 ? 'pt-2.5 border-t border-slate-200/60' : ''}>
                  <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {section.groupTitle}
                  </div>
                  <div className="space-y-1 mt-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = superAdminTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSuperAdminTab(item.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${isActive
                            ? 'bg-[#33077C] text-white shadow-sm shadow-[#33077C]/15 font-bold'
                            : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 font-semibold'
                            }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-white text-slate-600 border border-slate-200/60 shadow-2xs'
                              }`}
                          >
                            <Icon className="w-4 h-4 stroke-[2]" />
                          </div>
                          <span className="text-[13px] sm:text-[13.5px] font-semibold truncate leading-tight">
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Right Content Area */}
            <div className="lg:col-span-9 xl:col-span-9 2xl:col-span-10 p-5 sm:p-6 space-y-6">
              {/* 1. GENERAL TAB */}
              {superAdminTab === 'general' && (
                <div className="space-y-6">
                  {/* SECTION A: Company Information */}
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      Company Information
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Set business profile, branding logo, tax registration, and primary touchpoints.
                    </p>
                  </div>

                  <div className="bg-white rounded-[4px] border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-5">
                    {/* Company Logo Row */}
                    <div className="pb-4 border-b border-slate-100 max-w-sm">
                      <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                        Company Logo <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <div className="flex items-center gap-3">
                        <label className="relative group shrink-0 cursor-pointer">
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/svg+xml"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = () => setGenCompanyLogo(reader.result as string);
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <div className={`w-16 h-16 rounded-full bg-slate-100/70 ${!genCompanyLogo ? 'border-2 border-dashed border-slate-300 group-hover:border-[#33077C]' : 'border-2 border-[#33077C]'} flex items-center justify-center overflow-hidden shrink-0 shadow-2xs transition-all`}>
                            {genCompanyLogo ? (
                              <img src={genCompanyLogo} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-7 h-7 text-slate-400 group-hover:text-[#33077C] transition-colors" />
                            )}
                          </div>
                        </label>

                        <label className="flex-1 h-11 px-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-[4px] text-xs sm:text-[13px] border border-slate-200 hover:border-slate-300 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs">
                          <Upload className="w-4 h-4 text-[#33077C]" />
                          <span>{genCompanyLogo ? 'Change' : 'Upload Logo'}</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/svg+xml"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = () => setGenCompanyLogo(reader.result as string);
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>

                        {genCompanyLogo && (
                          <button
                            type="button"
                            onClick={() => setGenCompanyLogo(null)}
                            title="Remove logo"
                            className="h-11 px-3 text-rose-500 hover:text-rose-600 hover:bg-rose-50 border border-rose-100 rounded-[4px] text-xs font-semibold transition-all cursor-pointer flex items-center justify-center shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Fields Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-5 pt-1">
                      <div>
                        <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                          Company Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={genCompanyName}
                          onChange={(e) => setGenCompanyName(e.target.value)}
                          placeholder="e.g. Yaa Creations Pvt Ltd"
                          className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-[4px] text-xs sm:text-[13px] font-medium text-slate-800 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                        />
                      </div>

                      <div>
                        <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                          Company Email <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={genCompanyEmail}
                          onChange={(e) => setGenCompanyEmail(e.target.value)}
                          placeholder="contact@company.com"
                          className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-[4px] text-xs sm:text-[13px] font-medium text-slate-800 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                        />
                      </div>

                      <div>
                        <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                          Contact Number <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="tel"
                          value={genContactNumber}
                          onChange={(e) => setGenContactNumber(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-[4px] text-xs sm:text-[13px] font-medium text-slate-800 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                        />
                      </div>

                      <div>
                        <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                          Website URL
                        </label>
                        <input
                          type="url"
                          value={genWebsiteUrl}
                          onChange={(e) => setGenWebsiteUrl(e.target.value)}
                          placeholder="https://company.com"
                          className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-[4px] text-xs sm:text-[13px] font-medium text-slate-800 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                          Company Address
                        </label>
                        <input
                          type="text"
                          value={genCompanyAddress}
                          onChange={(e) => setGenCompanyAddress(e.target.value)}
                          placeholder="Street, City, State, PIN"
                          className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-[4px] text-xs sm:text-[13px] font-medium text-slate-800 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                        />
                      </div>

                      <div>
                        <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                          GST Number
                        </label>
                        <input
                          type="text"
                          value={genGstNumber}
                          onChange={(e) => setGenGstNumber(e.target.value.toUpperCase())}
                          placeholder="33AAAAA0000A1Z5"
                          className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-[4px] text-xs sm:text-[13px] font-mono font-medium text-slate-800 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all uppercase"
                        />
                      </div>

                      <div>
                        <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                          PAN Number
                        </label>
                        <input
                          type="text"
                          value={genPanNumber}
                          onChange={(e) => setGenPanNumber(e.target.value.toUpperCase())}
                          placeholder="AAAAA0000A"
                          className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-[4px] text-xs sm:text-[13px] font-mono font-medium text-slate-800 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION B: Regional Settings */}
                  <div className="pt-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      Regional Settings
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure currency codes, standard display date &amp; time formatting, and default locale.
                    </p>
                  </div>

                  <div className="bg-white rounded-[4px] border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-5 pt-1">
                      <div>
                        <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                          Default Currency
                        </label>
                        <select
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-[4px] text-xs sm:text-[13px] font-medium text-slate-800 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer"
                        >
                          <option value="INR">INR (₹ - Indian Rupee)</option>
                          <option value="USD">USD ($ - US Dollar)</option>
                          <option value="EUR">EUR (€ - Euro)</option>
                          <option value="GBP">GBP (£ - British Pound)</option>
                          <option value="AED">AED (د.إ - UAE Dirham)</option>
                          <option value="SGD">SGD (S$ - Singapore Dollar)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                          Date Format
                        </label>
                        <select
                          value={dateFormat}
                          onChange={(e) => setDateFormat(e.target.value)}
                          className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-[4px] text-xs sm:text-[13px] font-medium text-slate-800 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer"
                        >
                          <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 25/11/2026)</option>
                          <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 11/25/2026)</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-11-25)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                          Time Format
                        </label>
                        <select
                          value={timeFormat}
                          onChange={(e) => setTimeFormat(e.target.value as '12' | '24')}
                          className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-[4px] text-xs sm:text-[13px] font-medium text-slate-800 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer"
                        >
                          <option value="12">12 Hours with AM/PM (e.g. 02:30:00 PM)</option>
                          <option value="24">24 Hours (e.g. 14:30:00)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                          Time Zone
                        </label>
                        <select
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-[4px] text-xs sm:text-[13px] font-medium text-slate-800 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer"
                        >
                          <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+05:30)</option>
                          <option value="UTC">UTC (Coordinated Universal Time)</option>
                          <option value="America/New_York">America/New_York (EST - UTC-05:00)</option>
                          <option value="Europe/London">Europe/London (GMT - UTC+00:00)</option>
                          <option value="Asia/Dubai">Asia/Dubai (GST - UTC+04:00)</option>
                          <option value="Asia/Singapore">Asia/Singapore (SGT - UTC+08:00)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                          Default Language
                        </label>
                        <select
                          value={defaultLanguage}
                          onChange={(e) => setDefaultLanguage(e.target.value)}
                          className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-[4px] text-xs sm:text-[13px] font-medium text-slate-800 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer"
                        >
                          <option value="English">English</option>
                          <option value="Tamil">Tamil</option>
                          <option value="Hindi">Hindi</option>
                          <option value="Malayalam">Malayalam</option>
                          <option value="Telugu">Telugu</option>
                          <option value="Kannada">Kannada</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* SECTION C: Notification Preferences */}
                  <div className="pt-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      Notification Preferences
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure delivery channels and system alert rules for payments, invoices, and stock.
                    </p>
                  </div>

                  <div className="bg-white rounded-[4px] border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-5 pt-1">
                      {[
                        {
                          id: 'notifEmail',
                          label: 'Email Notifications',
                          checked: notifEmail,
                          onChange: setNotifEmail,
                        },
                        {
                          id: 'notifInApp',
                          label: 'In-App Notifications',
                          checked: notifInApp,
                          onChange: setNotifInApp,
                        },
                        {
                          id: 'notifPaymentReminders',
                          label: 'Payment Reminders',
                          checked: notifPaymentReminders,
                          onChange: setNotifPaymentReminders,
                        },
                        {
                          id: 'notifSubscriptionExpiry',
                          label: 'Subscription Expiry Reminders',
                          checked: notifSubscriptionExpiry,
                          onChange: setNotifSubscriptionExpiry,
                        },
                        {
                          id: 'notifInvoices',
                          label: 'Invoice Notifications',
                          checked: notifInvoices,
                          onChange: setNotifInvoices,
                        },
                        {
                          id: 'notifLowStock',
                          label: 'Low Stock Alerts',
                          checked: notifLowStock,
                          onChange: setNotifLowStock,
                        },
                        {
                          id: 'notifSounds',
                          label: 'Notification Sounds',
                          checked: enableSoundAlerts,
                          onChange: setEnableSoundAlerts,
                        },
                      ].map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-1">
                          <span className="text-xs sm:text-[13px] font-medium text-slate-700">
                            {item.label}
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={item.checked}
                            onClick={() => item.onChange(!item.checked)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              item.checked ? 'bg-[#33077C]' : 'bg-slate-300'
                            }`}
                          >
                            <span
                              aria-hidden="true"
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                item.checked ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. ACCOUNT TAB */}
              {superAdminTab === 'account' && (
                <div className="space-y-6">
                  {/* SECTION A: Profile Information */}
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      Profile Information
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Personal identity, corporate employee credentials, and contact touchpoints.
                    </p>
                  </div>

                  <div className="bg-white rounded-[4px] border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-5">
                    {/* Profile Photo Row */}
                    <div className="pb-4 border-b border-slate-100 max-w-sm">
                      <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                        Profile Photo <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <div className="flex items-center gap-3">
                        <label className="relative group shrink-0 cursor-pointer">
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = () => setAccountProfilePhoto(reader.result as string);
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <div className={`w-16 h-16 rounded-full bg-[#33077C] text-white font-bold text-lg ${!accountProfilePhoto ? 'border-2 border-[#33077C]' : 'border-2 border-[#33077C]'} flex items-center justify-center overflow-hidden shrink-0 shadow-2xs transition-all`}>
                            {accountProfilePhoto ? (
                              <img src={accountProfilePhoto} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                              <span>
                                {accountFullName
                                  .split(' ')
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join('')
                                  .toUpperCase()}
                              </span>
                            )}
                          </div>
                        </label>

                        <label className="flex-1 h-11 px-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-[4px] text-xs sm:text-[13px] border border-slate-200 hover:border-slate-300 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs">
                          <Upload className="w-4 h-4 text-[#33077C]" />
                          <span>{accountProfilePhoto ? 'Change' : 'Upload Photo'}</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = () => setAccountProfilePhoto(reader.result as string);
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>

                        {accountProfilePhoto && (
                          <button
                            type="button"
                            onClick={() => setAccountProfilePhoto(null)}
                            title="Remove photo"
                            className="h-11 px-3 text-rose-500 hover:text-rose-600 hover:bg-rose-50 border border-rose-100 rounded-[4px] text-xs font-semibold transition-all cursor-pointer flex items-center justify-center shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Profile Fields Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-5 pt-1">
                      <div>
                        <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                          Full Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={accountFullName}
                          onChange={(e) => setAccountFullName(e.target.value)}
                          placeholder="John Doe"
                          className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-[4px] text-xs sm:text-[13px] font-medium text-slate-800 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                        />
                      </div>

                      <div>
                        <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                          Email Address <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={accountEmail}
                          onChange={(e) => setAccountEmail(e.target.value)}
                          placeholder="user@yaacreations.com"
                          className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-[4px] text-xs sm:text-[13px] font-medium text-slate-800 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                        />
                      </div>

                      <div>
                        <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                          Mobile Number <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="tel"
                          value={accountPhone}
                          onChange={(e) => setAccountPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-[4px] text-xs sm:text-[13px] font-medium text-slate-800 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION B: Login & Security */}
                  <div className="pt-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      Login &amp; Security
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Change login credentials, configure two-factor authentication, and monitor login activity.
                    </p>
                  </div>

                  <div className="bg-white rounded-[4px] border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-5">
                    {/* Change Password Sub-form */}
                    <form noValidate onSubmit={handlePasswordUpdate} className="space-y-4">
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-xs sm:text-[13px] font-semibold text-slate-800">
                          Change Password
                        </span>
                        <span className="text-xs text-slate-400">Requires minimum 8 characters</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
                        <div>
                          <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                            Current Password
                          </label>
                          <div className="relative">
                            <input
                              type={showCurrentPassword ? 'text' : 'password'}
                              placeholder="••••••••"
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              className="w-full h-11 pl-4 pr-10 bg-white border border-slate-200 hover:border-slate-300 rounded-[4px] text-xs sm:text-[13px] font-medium text-slate-800 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                              aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                            >
                              {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                            New Password
                          </label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? 'text' : 'password'}
                              placeholder="••••••••"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="w-full h-11 pl-4 pr-10 bg-white border border-slate-200 hover:border-slate-300 rounded-[4px] text-xs sm:text-[13px] font-medium text-slate-800 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                              aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                            >
                              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                            Confirm New Password
                          </label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              placeholder="••••••••"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="w-full h-11 pl-4 pr-10 bg-white border border-slate-200 hover:border-slate-300 rounded-[4px] text-xs sm:text-[13px] font-medium text-slate-800 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                            >
                              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="submit"
                          disabled={isUpdatingPassword || !currentPassword || !newPassword}
                          className="h-10 px-5 bg-[#33077C] hover:bg-[#432eb5] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-[13px] font-bold rounded-[4px] shadow-sm transition-all cursor-pointer flex items-center gap-2 uppercase tracking-wider"
                        >
                          {isUpdatingPassword ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Updating...</span>
                            </>
                          ) : (
                            <>
                              <Key className="w-4 h-4" />
                              <span>Update Password</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>

                    {/* Two-Factor Authentication (2FA) */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                      <div>
                        <h5 className="text-xs sm:text-[13px] font-semibold text-slate-800">
                          Two-Factor Authentication (2FA)
                        </h5>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Requires a multi-factor verification code (TOTP or SMS OTP) on every administrative login.
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={twoFactorAuth}
                        onClick={() => setTwoFactorAuth(!twoFactorAuth)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          twoFactorAuth ? 'bg-[#33077C]' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            twoFactorAuth ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. PERMISSION & ROLE MANAGEMENT TAB */}
              {superAdminTab === 'permission' && (
                <div className="space-y-6">
                  {/* Header & Add Role */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900">Roles & Permissions</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Configure granular role permissions and module access across the platform.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenAddRole}
                      className="h-10 px-4 bg-[#33077C] hover:bg-[#432eb5] text-white text-xs sm:text-[13px] font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer self-start sm:self-auto"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>Add Role</span>
                    </button>
                  </div>

                  {/* Default Search Bar Component with Total Roles on Top Right */}
                  <SearchBar
                    value={roleSearchQuery}
                    onChange={(val) => setRoleSearchQuery(val)}
                    placeholder="Search by role name, type, or status..."
                    onSubmit={(val) => setRoleSearchQuery(val)}
                    onReset={() => setRoleSearchQuery('')}
                    rightSlot={
                      <span className="text-xs sm:text-[13px] font-semibold text-slate-500 pr-2">
                        Total Roles :{' '}
                        <span className="text-[#33077C] font-bold">{filteredRoles.length}</span>
                      </span>
                    }
                    className="w-full !p-0 !border-0 !shadow-none !bg-transparent"
                  />

                  {/* Roles Table matching reference UI */}
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
                    <table className="w-full text-left border-collapse border border-slate-200 min-w-[750px]">
                      <thead>
                        <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white tracking-wider uppercase">
                          <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">SERIAL NO</th>
                          <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">ROLE NAME</th>
                          <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">TYPE</th>
                          <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">CREATED DATE</th>
                          <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">STATUS</th>
                          <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">ADMIN ACCESS</th>
                          <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">ACTION</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {filteredRoles.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                              No roles found matching "{roleSearchQuery}".
                            </td>
                          </tr>
                        ) : (
                          filteredRoles.map((role) => (
                            <tr key={role.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-4 px-5 border border-slate-200 font-bold text-slate-800 text-xs sm:text-sm">{role.serialNo}</td>
                              <td className="py-4 px-5 border border-slate-200">
                                <span className="font-bold text-slate-900 text-xs sm:text-sm">{role.roleName}</span>
                              </td>
                              <td className="py-4 px-5 border border-slate-200">
                                <span className="font-semibold text-slate-800 text-xs sm:text-sm">
                                  {role.type}
                                </span>
                              </td>
                              <td className="py-4 px-5 border border-slate-200">
                                <div className="font-bold text-slate-900 text-xs">
                                  {role.createdOn}
                                </div>
                                <span className="text-[11px] text-slate-400 block mt-0.5 font-normal">
                                  Active Account
                                </span>
                              </td>
                              <td className="py-4 px-5 border border-slate-200 text-center">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  {role.status}
                                </span>
                              </td>
                              <td className="py-4 px-5 border border-slate-200 text-center">
                                <span className={`text-xs sm:text-sm font-bold ${role.adminAccess ? 'text-emerald-600' : 'text-slate-500'}`}>
                                  {role.adminAccess ? 'True' : 'False'}
                                </span>
                              </td>
                              {/* 7. Action: Three Dots Dropdown */}
                              <td className="py-4 px-5 border border-slate-200 text-center relative">
                                <div className="inline-block text-left">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (activeRoleDropdownId === role.id) {
                                        setActiveRoleDropdownId(null);
                                        setRoleDropdownPos(null);
                                      } else {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const spaceBelow = window.innerHeight - rect.bottom;
                                        const dropdownHeight = 180;

                                        if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
                                          setRoleDropdownPos({
                                            bottom: window.innerHeight - rect.top + 6,
                                            right: window.innerWidth - rect.right,
                                          });
                                        } else {
                                          setRoleDropdownPos({
                                            top: rect.bottom + 6,
                                            right: window.innerWidth - rect.right,
                                          });
                                        }
                                        setActiveRoleDropdownId(role.id);
                                      }
                                    }}
                                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer bg-[#33077C] hover:bg-[#432eb5] text-white shadow-xs active:scale-95"
                                    title="More Actions"
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

                  {/* Role Action Dropdown Menu Portal */}
                  {activeRoleDropdownId && roleDropdownPos && (() => {
                    const targetRole = roleList.find((r) => r.id === activeRoleDropdownId);
                    if (!targetRole) return null;

                    return (
                      <>
                        <div
                          className="fixed inset-0 z-[9998]"
                          onClick={() => {
                            setActiveRoleDropdownId(null);
                            setRoleDropdownPos(null);
                          }}
                        />
                        <div
                          style={{
                            position: 'fixed',
                            ...(roleDropdownPos.bottom !== undefined
                              ? { bottom: `${roleDropdownPos.bottom}px` }
                              : { top: `${roleDropdownPos.top}px` }),
                            right: `${Math.min(Math.max(8, roleDropdownPos.right), Math.max(8, window.innerWidth - 204))}px`,
                          }}
                          className="w-48 max-w-[calc(100vw-1rem)] bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[9999] animate-in fade-in zoom-in-95 duration-100 text-left"
                        >
                          {/* 1. View */}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveRoleDropdownId(null);
                              setRoleDropdownPos(null);
                              handleOpenViewRole(targetRole);
                            }}
                            className="w-full px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center gap-3 transition-colors rounded-xl cursor-pointer"
                          >
                            <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white shrink-0 shadow-xs">
                              <Eye className="w-3.5 h-3.5 stroke-[2.5]" />
                            </div>
                            <span className="font-semibold text-slate-800 text-[13px]">View</span>
                          </button>

                          {/* 2. Edit */}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveRoleDropdownId(null);
                              setRoleDropdownPos(null);
                              handleOpenEditRole(targetRole);
                            }}
                            className="w-full px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center gap-3 transition-colors rounded-xl cursor-pointer"
                          >
                            <div className="w-7 h-7 rounded-full bg-[#7C3AED] flex items-center justify-center text-white shrink-0 shadow-xs">
                              <Edit2 className="w-3.5 h-3.5 stroke-[2.5]" />
                            </div>
                            <span className="font-semibold text-slate-800 text-[13px]">Edit</span>
                          </button>

                          {/* 3. Delete */}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveRoleDropdownId(null);
                              setRoleDropdownPos(null);
                              handleDeleteRole(targetRole.id, targetRole.roleName);
                            }}
                            className="w-full px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-3 transition-colors rounded-xl cursor-pointer"
                          >
                            <div className="w-7 h-7 rounded-full bg-rose-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                              <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                            </div>
                            <span className="font-semibold text-rose-600 text-[13px]">Delete</span>
                          </button>
                        </div>
                      </>
                    );
                  })()}

                  {/* MODAL: VIEW / EDIT / ADD ROLE WITH MODULE ON/OFF BUTTONS */}
                  {isRoleModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-2.5 sm:p-6 overflow-y-auto">
                      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-2xl max-w-6xl w-full max-h-[93dvh] flex flex-col overflow-hidden animate-in fade-in duration-200">
                        {/* Modal Header exactly matching Add Organization */}
                        <div
                          className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4.5 text-white shrink-0"
                          style={{ background: '#33077C' }}
                        >
                          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                            <button
                              type="button"
                              onClick={() => setIsRoleModalOpen(false)}
                              className="p-1.5 -ml-1 rounded-xl text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                              title="Go back"
                            >
                              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
                            </button>
                            <div>
                              <h3 className="text-xl font-bold tracking-tight text-white">
                                {modalMode === 'view' ? 'View Role' : modalMode === 'edit' ? 'Edit Role' : 'Add Role'}
                              </h3>
                              <p className="text-xs sm:text-[13px] mt-0.5 text-white/90 font-medium">
                                Configure role profile, system permissions, and module access
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Modal Scrollable Body */}
                        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-white">
                          {/* 3 Fields Per Row matching Reference Image */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* 1. Role Name */}
                            <div>
                              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                                Role Name <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="text"
                                disabled={modalMode === 'view'}
                                value={formRoleName}
                                onChange={(e) => setFormRoleName(e.target.value)}
                                placeholder="Enter role name"
                                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 disabled:bg-slate-50 disabled:text-slate-600 transition-all placeholder:text-slate-400"
                              />
                              <p className="text-[11px] text-slate-400 mt-1">Enter role name</p>
                            </div>

                            {/* 2. Role Status */}
                            <div>
                              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                                Role Status <span className="text-rose-500">*</span>
                              </label>
                              <CustomSelect
                                value={formRoleStatus}
                                onChange={(val) => setFormRoleStatus(val as 'Active' | 'Inactive')}
                                options={[
                                  { value: 'Active', label: 'Active' },
                                  { value: 'Inactive', label: 'Inactive' },
                                ]}
                                placeholder="Select role status"
                                activeColor="brand"
                              />
                              <p className="text-[11px] text-slate-400 mt-1">Set the active status for this role</p>
                            </div>

                            {/* 3. Admin Access */}
                            <div>
                              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                                Admin Access <span className="text-rose-500">*</span>
                              </label>
                              <CustomSelect
                                value={formAdminAccess ? 'true' : 'false'}
                                onChange={(val) => setFormAdminAccess(val === 'true')}
                                options={[
                                  { value: 'true', label: 'True' },
                                  { value: 'false', label: 'False' },
                                ]}
                                placeholder="Select admin access"
                                activeColor="brand"
                              />
                              <p className="text-[11px] text-slate-400 mt-1">Enable admin screens for employee login with this role</p>
                            </div>
                          </div>

                          {/* Section 2: Role Permissions Table with Checkboxes */}
                          <div className="space-y-4 pt-2 border-t border-slate-100">
                            {/* Permissions Table with Checkboxes and Header Background */}
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-[#f2f9ed] border-b border-slate-200 text-slate-800 font-bold text-[11px] uppercase tracking-wider">
                                    <th className="py-3.5 px-4 min-w-[200px] text-slate-800 font-extrabold">MODULE ACCESS</th>
                                    <th className="py-3.5 px-3 text-center text-slate-800 font-extrabold">ADD</th>
                                    <th className="py-3.5 px-3 text-center text-slate-800 font-extrabold">VIEW</th>
                                    <th className="py-3.5 px-3 text-center text-slate-800 font-extrabold">EDIT</th>
                                    <th className="py-3.5 px-3 text-center text-slate-800 font-extrabold">DELETE</th>
                                    <th className="py-3.5 px-3 text-center text-slate-800 font-extrabold">APPROVAL</th>
                                    <th className="py-3.5 px-3 text-center text-slate-800 font-extrabold">ALL ACCESS</th>
                                    <th className="py-3.5 px-3 text-center text-slate-800 font-extrabold">NO ACCESS</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 text-slate-700 font-medium">
                                  {formModulePermissions.map((mod) => {
                                    const allActionsEnabled =
                                      mod.actions.add &&
                                      mod.actions.view &&
                                      mod.actions.edit &&
                                      mod.actions.delete &&
                                      mod.actions.approval;

                                    const noActionsEnabled =
                                      !mod.actions.add &&
                                      !mod.actions.view &&
                                      !mod.actions.edit &&
                                      !mod.actions.delete &&
                                      !mod.actions.approval;

                                    const isSub = Boolean(mod.isSubModule);

                                    return (
                                      <tr
                                        key={mod.moduleId}
                                        className={`transition-colors ${!isSub
                                          ? 'bg-slate-50/80 font-bold border-t border-slate-200'
                                          : 'hover:bg-slate-50/50 bg-white'
                                          }`}
                                      >
                                        {/* Module Name with Distinct Sub-Module Tree Styling */}
                                        <td className={`py-3 px-4 ${isSub ? 'pl-10' : 'pl-4'}`}>
                                          <div className="flex items-center gap-2">
                                            {isSub ? (
                                              <span className="text-slate-300 font-mono text-xs select-none">↳</span>
                                            ) : (
                                              <span className="w-2 h-2 rounded-full bg-[#33077C]" />
                                            )}
                                            <span
                                              className={`text-xs ${!isSub
                                                ? 'font-bold text-slate-900 tracking-wide uppercase'
                                                : 'font-medium text-slate-700'
                                                }`}
                                            >
                                              {mod.moduleName}
                                            </span>
                                          </div>
                                        </td>

                                        {/* ADD Checkbox */}
                                        <td className="py-3 px-3 text-center">
                                          <label className="inline-flex items-center justify-center cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={mod.actions.add}
                                              onChange={() => handleToggleModuleAction(mod.moduleId, 'add')}
                                              className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C]/20 accent-[#33077C] cursor-pointer"
                                            />
                                          </label>
                                        </td>

                                        {/* VIEW Checkbox */}
                                        <td className="py-3 px-3 text-center">
                                          <label className="inline-flex items-center justify-center cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={mod.actions.view}
                                              onChange={() => handleToggleModuleAction(mod.moduleId, 'view')}
                                              className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C]/20 accent-[#33077C] cursor-pointer"
                                            />
                                          </label>
                                        </td>

                                        {/* EDIT Checkbox */}
                                        <td className="py-3 px-3 text-center">
                                          <label className="inline-flex items-center justify-center cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={mod.actions.edit}
                                              onChange={() => handleToggleModuleAction(mod.moduleId, 'edit')}
                                              className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C]/20 accent-[#33077C] cursor-pointer"
                                            />
                                          </label>
                                        </td>

                                        {/* DELETE Checkbox */}
                                        <td className="py-3 px-3 text-center">
                                          <label className="inline-flex items-center justify-center cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={mod.actions.delete}
                                              onChange={() => handleToggleModuleAction(mod.moduleId, 'delete')}
                                              className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C]/20 accent-[#33077C] cursor-pointer"
                                            />
                                          </label>
                                        </td>

                                        {/* APPROVAL Checkbox */}
                                        <td className="py-3 px-3 text-center">
                                          <label className="inline-flex items-center justify-center cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={mod.actions.approval}
                                              onChange={() => handleToggleModuleAction(mod.moduleId, 'approval')}
                                              className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C]/20 accent-[#33077C] cursor-pointer"
                                            />
                                          </label>
                                        </td>

                                        {/* ALL ACCESS Checkbox */}
                                        <td className="py-3 px-3 text-center">
                                          <label className="inline-flex items-center justify-center cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={allActionsEnabled}
                                              onChange={() => handleToggleAllAccess(mod.moduleId, !allActionsEnabled)}
                                              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600/20 accent-emerald-600 cursor-pointer"
                                            />
                                          </label>
                                        </td>

                                        {/* NO ACCESS Checkbox */}
                                        <td className="py-3 px-3 text-center">
                                          <label className="inline-flex items-center justify-center cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={noActionsEnabled}
                                              onChange={() => handleToggleAllAccess(mod.moduleId, false)}
                                              className="w-4 h-4 rounded border-slate-300 text-rose-500 focus:ring-rose-500/20 accent-rose-500 cursor-pointer"
                                            />
                                          </label>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>

                        {/* Modal Footer Actions matching 2nd Reference Image */}
                        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-100 flex items-center justify-end gap-2.5 sm:gap-3 shrink-0 bg-white">
                          <button
                            type="button"
                            onClick={() => setIsRoleModalOpen(false)}
                            className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center gap-2"
                          >
                            <X className="w-4 h-4 text-slate-500" />
                            <span>Cancel</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleSaveRoleModal}
                            className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2"
                          >
                            <Check className="w-4 h-4 stroke-[2.5]" />
                            <span>Save</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 5. STAFF TAB */}
              {superAdminTab === 'staff' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Super Admin Administrative Staff</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Platform engineers, support personnel, and security officers with administrative rights.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsStaffModalOpen(true)}
                      className="h-10 px-4 bg-[#33077C] hover:bg-[#432eb5] text-white text-xs sm:text-[13px] font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer self-start sm:self-auto"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>Add Staff Member</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-[11px] uppercase tracking-wider">
                          <th className="py-3 px-4">Member Name</th>
                          <th className="py-3 px-4">Email</th>
                          <th className="py-3 px-4">Role / Department</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-700 font-medium">
                        {staffMembers.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-[#33077C] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                  {m.name.substring(0, 2).toUpperCase()}
                                </div>
                                <span className="font-bold text-slate-900 text-xs sm:text-[13px]">{m.name}</span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-slate-600 font-medium">{m.email}</td>

                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-800">{m.role}</div>
                              <div className="text-[11px] text-slate-400 font-normal">{m.department}</div>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {m.status}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              {m.email !== 'superadmin@gmail.com' && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStaff(m.id, m.name)}
                                  className="w-8 h-8 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors inline-flex items-center justify-center cursor-pointer"
                                  title="Remove staff"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 5.5 TAXES & GST TAB */}
              {superAdminTab === 'taxes_gst' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Percent className="w-5 h-5 text-[#33077C]" />
                        Taxes & GST Configuration
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Manage Goods & Services Tax (GST), tax slabs, split rates, and tax group mappings.
                      </p>
                    </div>
                  </div>

                  {/* 2-Column Layout: Column 1 = GST Settings, Column 2 = Tax Rates */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Column 1: GST Settings (Width: 6/12) */}
                    <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-5">
                      <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                        GST Settings
                      </h4>

                      <div className="space-y-4">
                        {[
                          { label: 'Enable GST', checked: enableGst, onChange: setEnableGst },
                          { label: 'Enable HSN/SAC Code', checked: enableHsnSac, onChange: setEnableHsnSac },
                          { label: 'Reverse Charge', checked: reverseCharge, onChange: setReverseCharge },
                          { label: 'Enable Place of Supply', checked: enablePlaceOfSupply, onChange: setEnablePlaceOfSupply },
                          { label: 'Composite Scheme', checked: compositeScheme, onChange: setCompositeScheme },
                          { label: 'Enable TCS', checked: enableTcs, onChange: setEnableTcs },
                          { label: 'Enable TDS', checked: enableTdsState, onChange: setEnableTdsState },
                        ].map((item) => (
                          <label key={item.label} className="flex items-center gap-3 cursor-pointer py-0.5">
                            <input
                              type="checkbox"
                              checked={item.checked}
                              onChange={(e) => item.onChange(e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C]"
                            />
                            <span className="text-xs sm:text-[13px] font-medium text-slate-700 flex items-center gap-1.5">
                              {item.label}
                              <Info className="w-3.5 h-3.5 text-slate-400" />
                            </span>
                          </label>
                        ))}

                        <div className="pt-2">
                          <button
                            type="button"
                            className="text-xs sm:text-[13px] font-semibold text-[#33077C] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            Tax List &gt;
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Tax Rates (Width: 6/12) */}
                    <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          Tax Rates
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            setNewTaxRateName('');
                            setNewTaxRateValue('');
                            setIsTaxRateModalOpen(true);
                          }}
                          className="w-6 h-6 rounded-full bg-[#33077C]/10 text-[#33077C] hover:bg-[#33077C] hover:text-white transition-all flex items-center justify-center cursor-pointer shadow-2xs"
                          title="Add Tax Rate"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </div>

                      <div className="space-y-1 max-h-[680px] overflow-y-auto pr-1 custom-scrollbar divide-y divide-slate-100">
                        {taxRates.map((tr) => (
                          <div key={tr.id} className="py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50/60 px-2 rounded-lg transition-colors group">
                            <span className="text-xs sm:text-[13px] font-medium text-slate-700">
                              {tr.name}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-semibold text-slate-900 min-w-8 text-right">
                                {tr.rate}
                              </span>
                              <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextVal = prompt(`Update rate for ${tr.name}:`, String(tr.rate));
                                    if (nextVal !== null && !isNaN(Number(nextVal))) {
                                      setTaxRates((prev) =>
                                        prev.map((item) => (item.id === tr.id ? { ...item, rate: Number(nextVal) } : item))
                                      );
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-[#33077C] cursor-pointer rounded"
                                  title="Edit rate"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Delete ${tr.name}?`)) {
                                      setTaxRates((prev) => prev.filter((item) => item.id !== tr.id));
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer rounded"
                                  title="Delete rate"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Add Tax Rate Modal */}
                  {isTaxRateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <h4 className="text-sm font-bold text-slate-900">Add New Tax Rate</h4>
                          <button
                            type="button"
                            onClick={() => setIsTaxRateModalOpen(false)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-medium text-slate-500 block mb-1">Tax Rate Name</label>
                            <input
                              type="text"
                              placeholder="e.g. IGST@18%"
                              value={newTaxRateName}
                              onChange={(e) => setNewTaxRateName(e.target.value)}
                              className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#4309A2]"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-500 block mb-1">Rate (%)</label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="e.g. 18"
                              value={newTaxRateValue}
                              onChange={(e) => setNewTaxRateValue(e.target.value)}
                              className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#4309A2]"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setIsTaxRateModalOpen(false)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!newTaxRateName.trim()) return;
                              setTaxRates((prev) => [
                                ...prev,
                                {
                                  id: `tr-${Date.now()}`,
                                  name: newTaxRateName.trim(),
                                  rate: Number(newTaxRateValue) || 0,
                                },
                              ]);
                              setIsTaxRateModalOpen(false);
                            }}
                            className="px-4 py-1.5 rounded-lg bg-[#33077C] text-white text-xs font-bold hover:bg-[#432eb5]"
                          >
                            Add Rate
                          </button>
                        </div>
                      </div>
                    </div>
                  )}


                </div>
              )}

              {/* 8. NUMBERING & PREFIX TAB */}
              {superAdminTab === 'numbering_prefix' && (
                <div className="space-y-6">
                  {/* BOX 1: Primary Document & Transaction Prefixes (4 modules) */}
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      Transaction Prefixes
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Set custom prefixes and sequence identifiers for core transaction documents.
                    </p>
                  </div>

                  <div className="bg-white rounded-[4px] border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-5 pt-1">
                      {[
                        { key: 'invoice', label: 'Invoice' },
                        { key: 'proforma', label: 'Proforma' },
                        { key: 'payment', label: 'Payment' },
                        { key: 'quotation', label: 'Quotation' },
                      ].map((item) => {
                        const current = transactionPrefixes[item.key] || { prefix: 'None', nextNumber: '1001' };
                        const isOpen = openPrefixDropdown === item.key;

                        return (
                          <div key={item.key} className="space-y-1.5">
                            <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                              {item.label}
                            </label>

                            <div>
                              <div className="relative w-full">
                                <div
                                  onClick={() => {
                                    setOpenPrefixDropdown(isOpen ? null : item.key);
                                    setNewCustomPrefix('');
                                  }}
                                  className={`w-full h-11 px-4 bg-white hover:bg-slate-50/60 rounded-[4px] border flex items-center justify-between cursor-pointer transition-all ${isOpen
                                    ? 'border-[#4309A2] ring-4 ring-[#4309A2]/10 shadow-xs'
                                    : 'border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                  <span
                                    className={`text-xs sm:text-[13px] truncate ${current.prefix && current.prefix !== 'None'
                                      ? 'text-slate-800 font-medium'
                                      : 'text-slate-400 font-medium'
                                      }`}
                                  >
                                    {current.prefix && current.prefix !== 'None'
                                      ? current.prefix
                                      : `Select ${item.label.toLowerCase()} prefix`}
                                  </span>
                                  <ChevronDown
                                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ml-1.5 ${isOpen ? 'rotate-180 text-[#33077C]' : ''
                                      }`}
                                  />
                                </div>

                                {isOpen && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-30"
                                      onClick={() => setOpenPrefixDropdown(null)}
                                    />
                                    <div className="absolute left-0 top-full mt-1.5 z-40 w-full min-w-full bg-white rounded-[4px] shadow-xl shadow-slate-900/10 border border-slate-200/90 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                                      <div className="max-h-56 overflow-y-auto space-y-0.5 p-0.5 custom-scrollbar">
                                        {prefixOptions
                                          .filter((opt) => opt !== 'None')
                                          .map((opt) => {
                                            const isSelected = current.prefix === opt;
                                            return (
                                              <div
                                                key={opt}
                                                onClick={() => {
                                                  setTransactionPrefixes({
                                                    ...transactionPrefixes,
                                                    [item.key]: { ...current, prefix: opt },
                                                  });
                                                  setOpenPrefixDropdown(null);
                                                }}
                                                className={`group/opt w-full px-3 py-1.5 rounded-[4px] flex items-center justify-between text-[12.5px] tracking-normal transition-colors cursor-pointer ${isSelected
                                                  ? 'bg-slate-100 text-slate-900 font-bold'
                                                  : 'text-slate-800 font-semibold hover:bg-slate-50 hover:text-slate-900'
                                                  }`}
                                              >
                                                <span className="truncate">{opt}</span>
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPrefixOptions((prev) => prev.filter((p) => p !== opt));
                                                    if (current.prefix === opt) {
                                                      setTransactionPrefixes({
                                                        ...transactionPrefixes,
                                                        [item.key]: { ...current, prefix: 'None' },
                                                      });
                                                    }
                                                  }}
                                                  className="opacity-0 group-hover/opt:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition-all cursor-pointer shrink-0 ml-1.5"
                                                  title={`Delete ${opt}`}
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            );
                                          })}
                                      </div>

                                      <div className="pt-2 px-1 pb-1 border-t border-slate-100 flex items-center gap-2">
                                        <input
                                          type="text"
                                          value={newCustomPrefix}
                                          onChange={(e) => setNewCustomPrefix(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' && newCustomPrefix.trim()) {
                                              const trimmed = newCustomPrefix.trim();
                                              if (!prefixOptions.includes(trimmed)) {
                                                setPrefixOptions([...prefixOptions, trimmed]);
                                              }
                                              setTransactionPrefixes({
                                                ...transactionPrefixes,
                                                [item.key]: { ...current, prefix: trimmed },
                                              });
                                              setNewCustomPrefix('');
                                              setOpenPrefixDropdown(null);
                                            }
                                          }}
                                          className="flex-1 h-9 px-3 text-xs sm:text-[12.5px] font-medium border border-slate-200 rounded-[4px] outline-none focus:border-[#4309A2] text-slate-800 transition-colors"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (newCustomPrefix.trim()) {
                                              const trimmed = newCustomPrefix.trim();
                                              if (!prefixOptions.includes(trimmed)) {
                                                setPrefixOptions([...prefixOptions, trimmed]);
                                              }
                                              setTransactionPrefixes({
                                                ...transactionPrefixes,
                                                [item.key]: { ...current, prefix: trimmed },
                                              });
                                              setNewCustomPrefix('');
                                              setOpenPrefixDropdown(null);
                                            }
                                          }}
                                          className="h-9 px-4 bg-[#33077C] hover:bg-[#432eb5] text-white text-xs font-bold rounded-[4px] cursor-pointer uppercase tracking-wider transition-all shadow-xs active:scale-[0.97]"
                                        >
                                          ADD
                                        </button>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* BOX 2: Module Specific Numbering & Prefixes (11 modules) */}
                  <div className="pt-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      Module Prefixes
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure numbering prefixes for sales, purchasing, estimations, and dispatch vouchers.
                    </p>
                  </div>

                  <div className="bg-white rounded-[4px] border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-5 pt-1">
                      {[
                        { key: 'estimation', label: 'Sale Estimation' },
                        { key: 'proforma_invoice', label: 'Sale Proforma Invoice' },
                        { key: 'sale_invoice', label: 'Sale Invoice' },
                        { key: 'sales_order', label: 'Sales Order' },
                        { key: 'delivery_challan', label: 'Delivery Challan' },
                        { key: 'payment_in', label: 'Payment In' },
                        { key: 'sales_return', label: 'Sales Return' },
                        { key: 'purchase_request', label: 'Purchase Request' },
                        { key: 'purchase_bill', label: 'Purchase Bill' },
                        { key: 'purchase_return', label: 'Purchase Return' },
                        { key: 'payment_out', label: 'Payment Out' },
                      ].map((item) => {
                        const current = transactionPrefixes[item.key] || { prefix: 'None', nextNumber: '1001' };
                        const isOpen = openPrefixDropdown === item.key;

                        return (
                          <div key={item.key} className="space-y-1.5">
                            <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                              {item.label}
                            </label>

                            <div>
                              <div className="relative w-full">
                                <div
                                  onClick={() => {
                                    setOpenPrefixDropdown(isOpen ? null : item.key);
                                    setNewCustomPrefix('');
                                  }}
                                  className={`w-full h-11 px-4 bg-white hover:bg-slate-50/60 rounded-[4px] border flex items-center justify-between cursor-pointer transition-all ${isOpen
                                    ? 'border-[#4309A2] ring-4 ring-[#4309A2]/10 shadow-xs'
                                    : 'border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                  <span
                                    className={`text-xs sm:text-[13px] truncate ${current.prefix && current.prefix !== 'None'
                                      ? 'text-slate-800 font-medium'
                                      : 'text-slate-400 font-medium'
                                      }`}
                                  >
                                    {current.prefix && current.prefix !== 'None'
                                      ? current.prefix
                                      : `Select ${item.label.toLowerCase()} prefix`}
                                  </span>
                                  <ChevronDown
                                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ml-1.5 ${isOpen ? 'rotate-180 text-[#33077C]' : ''
                                      }`}
                                  />
                                </div>

                                {isOpen && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-30"
                                      onClick={() => setOpenPrefixDropdown(null)}
                                    />
                                    <div className="absolute left-0 top-full mt-1.5 z-40 w-full min-w-full bg-white rounded-[4px] shadow-xl shadow-slate-900/10 border border-slate-200/90 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                                      <div className="max-h-56 overflow-y-auto space-y-0.5 p-0.5 custom-scrollbar">
                                        {prefixOptions
                                          .filter((opt) => opt !== 'None')
                                          .map((opt) => {
                                            const isSelected = current.prefix === opt;
                                            return (
                                              <div
                                                key={opt}
                                                onClick={() => {
                                                  setTransactionPrefixes({
                                                    ...transactionPrefixes,
                                                    [item.key]: { ...current, prefix: opt },
                                                  });
                                                  setOpenPrefixDropdown(null);
                                                }}
                                                className={`group/opt w-full px-3 py-1.5 rounded-[4px] flex items-center justify-between text-[12.5px] tracking-normal transition-colors cursor-pointer ${isSelected
                                                  ? 'bg-slate-100 text-slate-900 font-bold'
                                                  : 'text-slate-800 font-semibold hover:bg-slate-50 hover:text-slate-900'
                                                  }`}
                                              >
                                                <span className="truncate">{opt}</span>
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPrefixOptions((prev) => prev.filter((p) => p !== opt));
                                                    if (current.prefix === opt) {
                                                      setTransactionPrefixes({
                                                        ...transactionPrefixes,
                                                        [item.key]: { ...current, prefix: 'None' },
                                                      });
                                                    }
                                                  }}
                                                  className="opacity-0 group-hover/opt:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition-all cursor-pointer shrink-0 ml-1.5"
                                                  title={`Delete ${opt}`}
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            );
                                          })}
                                      </div>

                                      <div className="pt-2 px-1 pb-1 border-t border-slate-100 flex items-center gap-2">
                                        <input
                                          type="text"
                                          value={newCustomPrefix}
                                          onChange={(e) => setNewCustomPrefix(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' && newCustomPrefix.trim()) {
                                              const trimmed = newCustomPrefix.trim();
                                              if (!prefixOptions.includes(trimmed)) {
                                                setPrefixOptions([...prefixOptions, trimmed]);
                                              }
                                              setTransactionPrefixes({
                                                ...transactionPrefixes,
                                                [item.key]: { ...current, prefix: trimmed },
                                              });
                                              setNewCustomPrefix('');
                                              setOpenPrefixDropdown(null);
                                            }
                                          }}
                                          className="flex-1 h-9 px-3 text-xs sm:text-[12.5px] font-medium border border-slate-200 rounded-[4px] outline-none focus:border-[#4309A2] text-slate-800 transition-colors"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (newCustomPrefix.trim()) {
                                              const trimmed = newCustomPrefix.trim();
                                              if (!prefixOptions.includes(trimmed)) {
                                                setPrefixOptions([...prefixOptions, trimmed]);
                                              }
                                              setTransactionPrefixes({
                                                ...transactionPrefixes,
                                                [item.key]: { ...current, prefix: trimmed },
                                              });
                                              setNewCustomPrefix('');
                                              setOpenPrefixDropdown(null);
                                            }
                                          }}
                                          className="h-9 px-4 bg-[#33077C] hover:bg-[#432eb5] text-white text-xs font-bold rounded-[4px] cursor-pointer uppercase tracking-wider transition-all shadow-xs active:scale-[0.97]"
                                        >
                                          ADD
                                        </button>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* 9. WHATSAPP INTEGRATION TAB */}
              {superAdminTab === 'whatsapp_integration' && (
                <div className="space-y-6">
                  {/* Top Header Card */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                          WhatsApp Cloud &amp; Business API Integration
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Configure automated messaging for invoices, payment receipts, and balance reminders.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-2xs ${whatsappEnabled
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 ring-1 ring-emerald-500/10'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                        <span className={`w-2 h-2 rounded-full ${whatsappEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                        {whatsappEnabled ? 'Service Active' : 'Service Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* API Credentials Card */}
                  <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-6">
                    <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                      <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 uppercase tracking-wider">
                        API Credentials &amp; Gateway Settings
                      </h4>
                      <span className="text-[11px] font-semibold text-slate-400">
                        Meta Graph API v20.0
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                      <div>
                        <label className="text-xs sm:text-[13px] font-medium text-slate-600 block mb-1.5">
                          API Provider
                        </label>
                        <select
                          value={whatsappProvider}
                          onChange={(e) => setWhatsappProvider(e.target.value)}
                          className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-[4px] text-xs sm:text-[13px] font-medium text-slate-800 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer"
                        >
                          <option value="meta_cloud">Meta Cloud API (Official)</option>
                          <option value="wati">Wati.io</option>
                          <option value="interakt">Interakt.shop</option>
                          <option value="aisensy">AiSensy</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs sm:text-[13px] font-medium text-slate-600 block mb-1.5">
                          Phone Number ID
                        </label>
                        <input
                          type="text"
                          value={whatsappPhoneNumberId}
                          onChange={(e) => setWhatsappPhoneNumberId(e.target.value)}
                          placeholder="e.g. 104829104829104"
                          className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-[4px] text-xs sm:text-[13px] font-medium text-slate-800 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-xs sm:text-[13px] font-medium text-slate-600 block mb-1.5">
                          WhatsApp Business Account ID (WABA)
                        </label>
                        <input
                          type="text"
                          value={whatsappBusinessAccountId}
                          onChange={(e) => setWhatsappBusinessAccountId(e.target.value)}
                          placeholder="e.g. 209384029384029"
                          className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-[4px] text-xs sm:text-[13px] font-medium text-slate-800 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-xs sm:text-[13px] font-medium text-slate-600 block mb-1.5">
                          Permanent Access Token
                        </label>
                        <input
                          type="password"
                          value={whatsappAccessToken}
                          onChange={(e) => setWhatsappAccessToken(e.target.value)}
                          placeholder="••••••••••••••••••••••••••••••••••••••••"
                          className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-[4px] text-xs sm:text-[13px] font-medium text-slate-800 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Automated Notification Triggers Card */}
                  <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
                    <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                      <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 uppercase tracking-wider">
                        Automated Notification Triggers
                      </h4>
                      <span className="text-[11px] text-slate-400 font-medium">
                        Instant customer notifications
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {[
                        {
                          id: 'invoice',
                          title: 'Auto-send PDF when Invoice is finalized',
                          desc: 'Dispatches customer tax invoice PDF link on invoice confirmation',
                          checked: whatsappAutoSendInvoice,
                          onChange: setWhatsappAutoSendInvoice,
                        },
                        {
                          id: 'receipt',
                          title: 'Auto-send confirmation on Payment Receipt',
                          desc: 'Sends digital receipt acknowledgment as soon as payment is recorded',
                          checked: whatsappAutoSendReceipt,
                          onChange: setWhatsappAutoSendReceipt,
                        },
                        {
                          id: 'reminder',
                          title: 'Send reminder alerts before payment due date',
                          desc: 'Automated friendly payment schedule alerts 3 days before due date',
                          checked: whatsappAutoSendReminder,
                          onChange: setWhatsappAutoSendReminder,
                        },
                      ].map((trigger) => (
                        <label
                          key={trigger.id}
                          className="flex items-center justify-between py-3.5 px-2 hover:bg-slate-50/70 rounded-lg cursor-pointer transition-colors group"
                        >
                          <div className="space-y-0.5 pr-4">
                            <span className="text-xs sm:text-[13px] font-semibold text-slate-800 block group-hover:text-[#33077C] transition-colors">
                              {trigger.title}
                            </span>
                            <span className="text-[11px] text-slate-400 block font-normal">
                              {trigger.desc}
                            </span>
                          </div>
                          <input
                            type="checkbox"
                            checked={trigger.checked}
                            onChange={(e) => trigger.onChange(e.target.checked)}
                            className="w-4.5 h-4.5 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] cursor-pointer shrink-0"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 12. ACTIVITY LOGS TAB */}
              {superAdminTab === 'activity_logs' && (
                <div className="space-y-6">
                  {/* Top Header Card */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
                        <History className="w-5 h-5 text-[#33077C]" />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                          Audit Trail & Activity Logs
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Real-time immutable log of administrative actions, user logins, and critical system events.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Filter and Search Bar */}
                  <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:w-80">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search logs by user, action, module, or IP..."
                        className="w-full h-10 pl-9 pr-4 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-[#4309A2] focus:bg-white transition-all"
                      />
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto text-xs font-medium text-slate-500">
                      <span>Total Logs: <strong className="text-slate-900 font-bold">5</strong></span>
                    </div>
                  </div>

                  {/* Activity Logs Table */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white tracking-wider uppercase">
                            <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">TIMESTAMP</th>
                            <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">USER</th>
                            <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">ACTION</th>
                            <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">MODULE / TARGET</th>
                            <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">IP ADDRESS</th>
                            <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center w-28">STATUS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                          {[
                            { time: '23/11/2026 03:02:18 PM', user: 'superadmin@gmail.com', action: 'Update Settings', module: 'System / Theme', ip: '103.24.182.10', status: 'Success' },
                            { time: '23/11/2026 02:48:42 PM', user: 'orgadmin@yaa.com', action: 'Generate Invoice', module: 'Sale Mgmt / Invoices', ip: '115.99.231.54', status: 'Success' },
                            { time: '23/11/2026 02:15:10 PM', user: 'admin@apexgroup.com', action: 'Update Role Matrix', module: 'Settings / Permissions', ip: '103.24.182.10', status: 'Success' },
                            { time: '23/11/2026 01:30:05 PM', user: 'sarah.m@platform.com', action: 'Export Snapshot', module: 'Settings / Backup', ip: '49.207.198.88', status: 'Success' },
                            { time: '23/11/2026 11:10:49 AM', user: 'john.doe@client.com', action: 'Failed Auth Attempt', module: 'Auth / OTP Verification', ip: '182.73.45.12', status: 'Blocked' },
                          ].map((log, i) => (
                            <tr key={i} className="hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-0">
                              <td className="py-3.5 px-5 font-mono text-[11.5px] text-slate-600 font-medium">
                                {log.time}
                              </td>
                              <td className="py-3.5 px-5 font-bold text-slate-900 text-xs">
                                {log.user}
                              </td>
                              <td className="py-3.5 px-5 font-semibold text-slate-800 text-xs">
                                {log.action}
                              </td>
                              <td className="py-3.5 px-5 text-slate-600 text-xs font-medium">
                                <span className="inline-block px-2.5 py-1 rounded-md bg-slate-100/90 text-slate-700 text-[11px] font-semibold">
                                  {log.module}
                                </span>
                              </td>
                              <td className="py-3.5 px-5 font-mono text-[11.5px] text-slate-500">
                                {log.ip}
                              </td>
                              <td className="py-3.5 px-5 text-center">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold shadow-2xs ${log.status === 'Success'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 ring-1 ring-emerald-500/10'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200/80 ring-1 ring-rose-500/10'
                                    }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${log.status === 'Success' ? 'bg-emerald-500' : 'bg-rose-500'
                                      }`}
                                  />
                                  {log.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add Staff Modal */}
        {isStaffModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150 overflow-y-auto">
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full max-h-[92dvh] overflow-y-auto p-4 sm:p-6 space-y-4 my-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Add Platform Staff</h3>
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form noValidate onSubmit={handleAddStaff} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs sm:text-[13px] outline-none focus:border-[#33077C]"
                    placeholder="e.g. John Doe"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs sm:text-[13px] outline-none focus:border-[#33077C]"
                    placeholder="e.g. john.doe@platform.com"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Role Title</label>
                    <input
                      type="text"
                      value={newStaffRole}
                      onChange={(e) => setNewStaffRole(e.target.value)}
                      className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs sm:text-[13px] outline-none focus:border-[#33077C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Department</label>
                    <input
                      type="text"
                      value={newStaffDept}
                      onChange={(e) => setNewStaffDept(e.target.value)}
                      className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs sm:text-[13px] outline-none focus:border-[#33077C]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsStaffModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#33077C] hover:bg-[#432eb5] text-white text-xs font-bold shadow-md cursor-pointer"
                  >
                    Add Member
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // STANDARD ADMIN LAYOUT (UNCHANGED)
  // =========================================================================
  const inputCls =
    'w-full h-11 px-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-[13px] font-medium text-slate-700 placeholder:text-slate-400 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all';

  const passwordChecks = [
    { label: '8+ characters', ok: newPassword.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(newPassword) },
    { label: 'Number', ok: /[0-9]/.test(newPassword) },
    { label: 'Symbol', ok: /[^A-Za-z0-9]/.test(newPassword) },
  ];
  const passwordScore = passwordChecks.filter((c) => c.ok).length;
  const strengthMeta = [
    { label: 'Too weak', color: 'bg-slate-200', text: 'text-slate-400' },
    { label: 'Weak', color: 'bg-rose-500', text: 'text-rose-600' },
    { label: 'Fair', color: 'bg-amber-500', text: 'text-amber-600' },
    { label: 'Good', color: 'bg-lime-500', text: 'text-lime-600' },
    { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-600' },
  ][newPassword ? passwordScore : 0];
  const passwordsMismatch = !!confirmPassword && confirmPassword !== newPassword;

  const renderPasswordField = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    visible: boolean,
    toggle: () => void,
    invalid = false,
  ) => (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          placeholder="••••••••"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} pr-10 ${invalid ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : ''}`}
        />
        <button
          type="button"
          onClick={toggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  const accountInitials =
    (accountName || 'U')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || 'U';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-brand text-primary-contrast flex items-center justify-center shrink-0 shadow-sm">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              System Settings & Enterprise Configuration
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Brand styling, automated contrast colors, global font family, and organization profiles.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          

          <button
            onClick={handleSaveSettings}
            className="h-10 px-5 bg-accent text-accent-contrast text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-100/80 border border-slate-200/70 rounded-2xl p-1.5 flex items-center gap-1 overflow-x-auto">
        {[
          { id: 'account', label: 'My Account', icon: User },
          
          { id: 'company', label: 'Company Profile', icon: Building2 },
          { id: 'reminders', label: 'Automated Reminders & SLA', icon: Bell },
          { id: 'backup', label: 'Data Management & Export', icon: Database },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-4 h-10 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${isActive
                ? 'bg-brand text-primary-contrast shadow-md'
                : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: MY ACCOUNT */}
      {activeTab === 'account' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left: identity summary */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden lg:sticky lg:top-4">
            <div className="h-20" style={{ background: "linear-gradient(120deg, var(--primary-dark, var(--primary)), var(--primary) 55%, var(--accent))" }} />
            <div className="px-6 pb-6 -mt-10 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-accent text-2xl font-bold flex items-center justify-center ring-4 ring-white shadow-md">
                {accountInitials}
              </div>
              <h3 className="mt-3 text-base font-bold text-slate-900 truncate">{accountName || 'Your Name'}</h3>
              <p className="text-xs text-slate-500 truncate">{accountEmail}</p>
              <span className="inline-flex items-center gap-1 mt-2.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                Administrator
              </span>

              <div className="mt-5 pt-5 border-t border-slate-100 space-y-3 text-left">
                <div className="flex items-center gap-3 text-xs">
                  <span className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                    <Mail className="w-4 h-4" />
                  </span>
                  <span className="min-w-0 truncate font-medium text-slate-700">{accountEmail || '—'}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                    <Clock className="w-4 h-4" />
                  </span>
                  <span className="min-w-0 truncate font-medium text-slate-700">{accountPhone || '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
                  <span className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <Shield className={`w-4 h-4 ${twoFactorAuth ? 'text-emerald-600' : 'text-slate-400'}`} />
                    Two-factor auth
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${twoFactorAuth ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                      }`}
                  >
                    {twoFactorAuth ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Profile Details */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <User className="w-4.5 h-4.5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Account Profile</h3>
                  <p className="text-xs text-slate-500">
                    Manage your administrative credentials, contact details, and account preferences.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Direct Phone</label>
                  <input
                    type="text"
                    value={accountPhone}
                    onChange={(e) => setAccountPhone(e.target.value)}
                    className={inputCls}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={accountEmail}
                    onChange={(e) => setAccountEmail(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* Password & Security Form */}
            <form
              noValidate
              onSubmit={handlePasswordUpdate}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5"
            >
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Password & Security</h3>
                  <p className="text-xs text-slate-500">
                    Keep your account secure with a strong password and multi-factor authentication.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  {renderPasswordField(
                    'Current Password',
                    currentPassword,
                    setCurrentPassword,
                    showCurrentPassword,
                    () => setShowCurrentPassword(!showCurrentPassword),
                  )}
                </div>
                {renderPasswordField(
                  'New Password',
                  newPassword,
                  setNewPassword,
                  showNewPassword,
                  () => setShowNewPassword(!showNewPassword),
                )}
                {renderPasswordField(
                  'Confirm New Password',
                  confirmPassword,
                  setConfirmPassword,
                  showConfirmPassword,
                  () => setShowConfirmPassword(!showConfirmPassword),
                  passwordsMismatch,
                )}
              </div>

              {passwordsMismatch && (
                <p className="text-[11px] font-semibold text-rose-600 -mt-2">Passwords do not match.</p>
              )}

              {newPassword && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-500">Password strength</span>
                    <span className={strengthMeta.text}>{strengthMeta.label}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className={`h-1.5 rounded-full transition-colors ${i < passwordScore ? strengthMeta.color : 'bg-slate-200'
                          }`}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {passwordChecks.map((c) => (
                      <span
                        key={c.label}
                        className={`flex items-center gap-1 text-[11px] font-medium ${c.ok ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {c.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Two-Factor Authentication (2FA)</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Requires an authenticator code (TOTP) on every login to ensure utmost security.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={twoFactorAuth}
                  onClick={() => setTwoFactorAuth(!twoFactorAuth)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${twoFactorAuth ? 'bg-brand' : 'bg-slate-300'
                    }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${twoFactorAuth ? 'translate-x-5' : 'translate-x-0'
                      }`}
                  />
                </button>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="h-10 px-5 bg-brand text-primary-contrast text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdatingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB CONTENT: COMPANY PROFILE */}
      {activeTab === 'company' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div
              className="h-20"
              style={{ background: 'linear-gradient(120deg, var(--primary-dark, var(--primary)), var(--primary) 55%, var(--accent))' }}
            />
            <div className="px-6 pb-6 -mt-9 text-center">
              <div className="w-[72px] h-[72px] mx-auto rounded-2xl bg-white text-primary flex items-center justify-center ring-4 ring-white shadow-md border border-slate-100">
                <Building2 className="w-8 h-8" />
              </div>
              <h3 className="mt-3 text-base font-bold text-slate-900 truncate">{companyName || 'Your Company'}</h3>
              <p className="text-xs text-slate-500 truncate">{supportEmail || '—'}</p>
              <p className="mt-4 text-[11px] text-slate-500 leading-relaxed">
                This identity appears on customer invoices, estimates and reports.
              </p>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Organization Profile</h3>
                <p className="text-xs text-slate-500">General business identity used on customer invoices and reports.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Company Legal Name</label>
                <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Support Email</label>
                <input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Billing Inquiries Email</label>
                <input type="email" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Direct Phone</label>
                <input type="text" value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Timezone</label>
                <input type="text" value={timezone} onChange={(e) => setTimezone(e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: REMINDERS & SLA */}
      {activeTab === 'reminders' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Automated Reminder Automation Engine</h3>
              <p className="text-xs text-slate-500">
                Configure trigger conditions for automated notifications across products and agency clients.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: UserCheck,
                title: 'Lead Follow-up Schedule Window',
                desc: 'Trigger follow-up reminder after lead ingestion',
                value: leadFollowUpDays,
                set: setLeadFollowUpDays,
              },
              {
                icon: CreditCard,
                title: 'Payment Due Notice Window',
                desc: 'Generate invoice reminder alert prior to invoice due date',
                value: paymentDueReminderDays,
                set: setPaymentDueReminderDays,
              },
              {
                icon: Clock,
                title: 'Subscription Renewal Alert Window',
                desc: 'Trigger renewal reminder before SaaS contract or Retainer expires',
                value: subscriptionExpiryDays,
                set: setSubscriptionExpiryDays,
              },
            ].map((r) => {
              const Icon = r.icon;
              return (
                <div
                  key={r.title}
                  className="p-4 rounded-xl border border-slate-200 hover:border-primary/40 hover:shadow-xs transition-all flex flex-col gap-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{r.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{r.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-auto">
                    <button
                      type="button"
                      onClick={() => r.set(Math.max(0, r.value - 1))}
                      className="w-9 h-9 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold cursor-pointer"
                      aria-label="Decrease days"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={r.value}
                      onChange={(e) => r.set(Number(e.target.value))}
                      className="w-16 h-9 text-center text-sm font-bold border border-slate-200 rounded-lg outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
                    />
                    <button
                      type="button"
                      onClick={() => r.set(r.value + 1)}
                      className="w-9 h-9 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold cursor-pointer"
                      aria-label="Increase days"
                    >
                      +
                    </button>
                    <span className="text-xs font-medium text-slate-500">days</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT: BACKUP */}
      {activeTab === 'backup' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Database className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Data Portability & Database Archival</h3>
              <p className="text-xs text-slate-500">
                Export JSON state of products, customers, leads, payments, and marketing content.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-xl border border-dashed border-primary/30 bg-primary/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-primary flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Full System Snapshot</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Includes all product records, customer relationships, content calendar, and billing log.
                </p>
              </div>
            </div>

            <button
              onClick={handleExportDatabase}
              className="h-10 px-5 bg-brand text-primary-contrast text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Export Snapshot (.JSON)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
