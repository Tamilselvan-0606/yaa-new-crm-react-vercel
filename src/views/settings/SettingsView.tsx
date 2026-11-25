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
    | 'transaction_message'
    | 'invoice_settings'
    | 'document_templates'
    | 'numbering_prefix'
    | 'whatsapp_integration'
    | 'integrations'
    | 'security'
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
      'transaction_message',
      'invoice_settings',
      'document_templates',
      'numbering_prefix',
      'whatsapp_integration',
      'integrations',
      'security',
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

  // General Settings State
  const [systemName, setSystemName] = useState('Nexus CRM & ERP Platform');
  const [supportEmail, setSupportEmail] = useState('superadmin@gmail.com');
  const [billingEmail, setBillingEmail] = useState('billing@yaacreations.com');
  const [supportPhone, setSupportPhone] = useState('+91 98765 43210');
  const [timezone, setTimezone] = useState('UTC+05:30 (India Standard Time)');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [currency, setCurrency] = useState('INR (₹)');
  const [defaultLanguage, setDefaultLanguage] = useState('English (US)');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Account Settings State
  const [accountName, setAccountName] = useState(currentUser?.name || 'Super Admin');
  const [accountEmail, setAccountEmail] = useState(currentUser?.email || 'superadmin@gmail.com');
  const [accountPhone, setAccountPhone] = useState('+91 98765 43210');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [twoFactorAuth, setTwoFactorAuth] = useState(true);

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

  // Tax Groups list
  const [taxGroups, setTaxGroups] = useState([
    { id: 'tg-1', name: 'GST@0%', subTaxes: 'SGST@0%  CGST@0%' },
    { id: 'tg-2', name: 'GST@0.25%', subTaxes: 'SGST@0.125%  CGST@0.125%' },
    { id: 'tg-3', name: 'GST@3%', subTaxes: 'SGST@1.5%  CGST@1.5%' },
    { id: 'tg-4', name: 'GST@5%', subTaxes: 'SGST@2.5%  CGST@2.5%' },
    { id: 'tg-5', name: 'GST@12%', subTaxes: 'SGST@6%  CGST@6%' },
    { id: 'tg-6', name: 'GST@18%', subTaxes: 'SGST@9%  CGST@9%' },
    { id: 'tg-7', name: 'GST@28%', subTaxes: 'SGST@14%  CGST@14%' },
    { id: 'tg-8', name: 'GST@40%', subTaxes: 'SGST@20%  CGST@20%' },
  ]);

  // Modals for adding Tax Rate / Tax Group
  const [isTaxRateModalOpen, setIsTaxRateModalOpen] = useState(false);
  const [newTaxRateName, setNewTaxRateName] = useState('');
  const [newTaxRateValue, setNewTaxRateValue] = useState('');

  const [isTaxGroupModalOpen, setIsTaxGroupModalOpen] = useState(false);
  const [newTaxGroupName, setNewTaxGroupName] = useState('');
  const [newTaxGroupSubTaxes, setNewTaxGroupSubTaxes] = useState('');

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
    invoice: { prefix: '2026-27', nextNumber: '1001' },
    proforma: { prefix: 'None', nextNumber: '501' },
    payment: { prefix: 'None', nextNumber: '3001' },
    quotation: { prefix: 'None', nextNumber: '201' },
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
          { id: 'invoice_settings', label: 'Transaction Settings', icon: Sliders },
          { id: 'transaction_message', label: 'Transaction Message', icon: MessageSquare },
          { id: 'document_templates', label: 'Print / Document Settings', icon: Printer },
          { id: 'numbering_prefix', label: 'Numbering & Prefix', icon: Hash },
        ],
      },
      {
        groupTitle: 'INTEGRATIONS & SECURITY',
        items: [
          { id: 'whatsapp_integration', label: 'WhatsApp Integration', icon: MessageSquare },
          { id: 'integrations', label: 'Integrations', icon: Share2 },
          { id: 'security', label: 'Security', icon: Shield },
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
                  <div>
                    <h3 className="text-base font-bold text-slate-900">General Platform Configuration</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Basic identification, time zones, standard formatting, and maintenance controls.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs sm:text-[13px] font-medium text-slate-600 mb-1.5">
                        Platform Name
                      </label>
                      <input
                        type="text"
                        value={systemName}
                        onChange={(e) => setSystemName(e.target.value)}
                        className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-[13px] font-medium text-slate-600 mb-1.5">
                        Support Email
                      </label>
                      <input
                        type="email"
                        value={supportEmail}
                        onChange={(e) => setSupportEmail(e.target.value)}
                        className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-[13px] font-medium text-slate-600 mb-1.5">
                        Timezone
                      </label>
                      <input
                        type="text"
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-[13px] font-medium text-slate-600 mb-1.5">
                        Default Currency
                      </label>
                      <input
                        type="text"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-[13px] font-medium text-slate-600 mb-1.5">
                        Date Format
                      </label>
                      <select
                        value={dateFormat}
                        onChange={(e) => setDateFormat(e.target.value)}
                        className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] transition-all cursor-pointer"
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 01/10/2026)</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 10/01/2026)</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-10-01)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-[13px] font-medium text-slate-600 mb-1.5">
                        Default Language
                      </label>
                      <select
                        value={defaultLanguage}
                        onChange={(e) => setDefaultLanguage(e.target.value)}
                        className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] transition-all cursor-pointer"
                      >
                        <option value="English (US)">English (US)</option>
                        <option value="English (UK)">English (UK)</option>
                        <option value="Spanish">Spanish</option>
                        <option value="French">French</option>
                        <option value="German">German</option>
                      </select>
                    </div>
                  </div>

                  {/* Maintenance Mode Box */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs sm:text-[13px] font-bold text-slate-900">Platform Maintenance Mode</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        When enabled, all organization users see a maintenance screen. Super Admins retain full access.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={maintenanceMode}
                      onClick={() => setMaintenanceMode(!maintenanceMode)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${maintenanceMode ? 'bg-amber-500' : 'bg-slate-300'
                        }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                          }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* 3. ACCOUNT TAB */}
              {superAdminTab === 'account' && (
                <div className="space-y-8">
                  {/* Account Profile Details */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{isSuperAdmin ? 'Super Admin Profile' : 'Account Profile'}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Manage your administrative profile credentials and contact preferences.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs sm:text-[13px] font-medium text-slate-600 mb-1.5">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={accountName}
                          onChange={(e) => setAccountName(e.target.value)}
                          className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs sm:text-[13px] font-medium text-slate-600 mb-1.5">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={accountEmail}
                          onChange={(e) => setAccountEmail(e.target.value)}
                          className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs sm:text-[13px] font-medium text-slate-600 mb-1.5">
                          Direct Phone
                        </label>
                        <input
                          type="text"
                          value={accountPhone}
                          onChange={(e) => setAccountPhone(e.target.value)}
                          className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Password & Security Form */}
                  <form noValidate onSubmit={handlePasswordUpdate} className="pt-6 border-t border-slate-100 space-y-6">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-[#33077C]" />
                        Password & Security
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Keep your administrative account secure with a strong password and multi-factor authentication.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs sm:text-[13px] font-medium text-slate-600 mb-1.5">
                          Current Password
                        </label>
                        <div className="relative">
                          <input
                            type={showCurrentPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full h-11 pl-4 pr-10 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
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
                        <label className="block text-xs sm:text-[13px] font-medium text-slate-600 mb-1.5">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full h-11 pl-4 pr-10 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
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
                        <label className="block text-xs sm:text-[13px] font-medium text-slate-600 mb-1.5">
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full h-11 pl-4 pr-10 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
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

                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 flex items-center gap-2">
                          <Shield className="w-4 h-4 text-emerald-600" />
                          Two-Factor Authentication (2FA)
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Requires an authenticator code (TOTP) on every login to ensure utmost security.
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={twoFactorAuth}
                        onClick={() => setTwoFactorAuth(!twoFactorAuth)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${twoFactorAuth ? 'bg-[#33077C]' : 'bg-slate-300'
                          }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${twoFactorAuth ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                      </button>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isUpdatingPassword}
                        className="h-10 px-5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-[13px] font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
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

                  {/* 3-Column Layout: Column 1 = GST Settings, Column 2 = Tax Rates, Column 3 = Tax Group */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Column 1: GST Settings (Width: 4/12) */}
                    <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-5">
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

                    {/* Column 2: Tax Rates (Width: 4/12) */}
                    <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
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

                    {/* Column 3: Tax Group (Width: 4/12) */}
                    <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          Tax Group
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            setNewTaxGroupName('');
                            setNewTaxGroupSubTaxes('');
                            setIsTaxGroupModalOpen(true);
                          }}
                          className="w-6 h-6 rounded-full bg-[#33077C]/10 text-[#33077C] hover:bg-[#33077C] hover:text-white transition-all flex items-center justify-center cursor-pointer shadow-2xs"
                          title="Add Tax Group"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </div>

                      <div className="space-y-1 max-h-[680px] overflow-y-auto pr-1 custom-scrollbar divide-y divide-slate-100">
                        {taxGroups.map((tg) => (
                          <div key={tg.id} className="py-3 flex items-start justify-between gap-2 hover:bg-slate-50/60 px-2 rounded-lg transition-colors group">
                            <div>
                              <span className="text-xs sm:text-[13px] font-bold text-slate-900 block leading-tight">
                                {tg.name}
                              </span>
                              <span className="text-[11.5px] font-medium text-slate-400 block mt-1">
                                {tg.subTaxes}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 pt-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => {
                                  const nextName = prompt('Update Tax Group Name:', tg.name);
                                  if (nextName) {
                                    setTaxGroups((prev) =>
                                      prev.map((item) => (item.id === tg.id ? { ...item, name: nextName } : item))
                                    );
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-[#33077C] cursor-pointer rounded"
                                title="Edit group"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Delete ${tg.name}?`)) {
                                    setTaxGroups((prev) => prev.filter((item) => item.id !== tg.id));
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer rounded"
                                title="Delete group"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

                  {/* Add Tax Group Modal */}
                  {isTaxGroupModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <h4 className="text-sm font-bold text-slate-900">Add New Tax Group</h4>
                          <button
                            type="button"
                            onClick={() => setIsTaxGroupModalOpen(false)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-medium text-slate-500 block mb-1">Group Name</label>
                            <input
                              type="text"
                              placeholder="e.g. GST@18%"
                              value={newTaxGroupName}
                              onChange={(e) => setNewTaxGroupName(e.target.value)}
                              className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#4309A2]"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-500 block mb-1">Sub-Taxes Included</label>
                            <input
                              type="text"
                              placeholder="e.g. SGST@9%  CGST@9%"
                              value={newTaxGroupSubTaxes}
                              onChange={(e) => setNewTaxGroupSubTaxes(e.target.value)}
                              className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#4309A2]"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setIsTaxGroupModalOpen(false)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!newTaxGroupName.trim()) return;
                              setTaxGroups((prev) => [
                                ...prev,
                                {
                                  id: `tg-${Date.now()}`,
                                  name: newTaxGroupName.trim(),
                                  subTaxes: newTaxGroupSubTaxes.trim() || 'Custom Grouping',
                                },
                              ]);
                              setIsTaxGroupModalOpen(false);
                            }}
                            className="px-4 py-1.5 rounded-lg bg-[#33077C] text-white text-xs font-bold hover:bg-[#432eb5]"
                          >
                            Add Group
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 5.6 TRANSACTION MESSAGE TAB */}
              {superAdminTab === 'transaction_message' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-[#33077C]" />
                        Transaction Message
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Configure automated WhatsApp and SMS delivery for sales, purchases, payment receipts, and orders.
                      </p>
                    </div>
                  </div>

                  {/* 2-Column Split: Left = Settings & Controls, Right = Live Chat Message Preview */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Column (Width: 7/12) */}
                    <div className="lg:col-span-7 space-y-6">
                      {/* Section: Select Message Type Channel */}
                      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3.5">
                        <label className="text-xs sm:text-[13px] font-bold text-slate-900 uppercase tracking-wider block">
                          Select Message Type:
                        </label>
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setMessageChannel('vyapar')}
                            className={`h-11 px-4 rounded-xl border text-xs sm:text-[13px] font-semibold transition-all cursor-pointer flex items-center gap-2.5 ${
                              messageChannel === 'vyapar'
                                ? 'border-[#33077C] bg-[#33077C]/5 text-[#33077C] ring-2 ring-[#33077C]/20 font-bold'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="w-3.5 h-3.5 rounded-full bg-rose-500 flex items-center justify-center text-white text-[9px] font-bold">
                              ▼
                            </span>
                            <span>Send via System Server</span>
                            {messageChannel === 'vyapar' && (
                              <span className="w-4 h-4 rounded-full bg-[#33077C] text-white flex items-center justify-center text-[10px] ml-1">
                                ✓
                              </span>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setMessageChannel('whatsapp')}
                            className={`h-11 px-4 rounded-xl border text-xs sm:text-[13px] font-semibold transition-all cursor-pointer flex items-center gap-2.5 ${
                              messageChannel === 'whatsapp'
                                ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-600/20 font-bold'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <MessageSquare className="w-4 h-4 text-emerald-600" />
                            <span>Send via Personal WhatsApp</span>
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 ml-1">
                              Login
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Section: Message Recipient Settings */}
                      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
                        <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 uppercase tracking-wider">
                          Message Recipient Settings:
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <label className="flex items-center gap-3 cursor-pointer py-0.5">
                            <input
                              type="checkbox"
                              checked={sendMsgToParty}
                              onChange={(e) => setSendMsgToParty(e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C]"
                            />
                            <span className="text-xs sm:text-[13px] font-medium text-slate-700 flex items-center gap-1.5">
                              Send Message to Party
                              <Info className="w-3.5 h-3.5 text-slate-400" />
                            </span>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer py-0.5">
                            <input
                              type="checkbox"
                              checked={sendTxnUpdateMsg}
                              onChange={(e) => setSendTxnUpdateMsg(e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C]"
                            />
                            <span className="text-xs sm:text-[13px] font-medium text-slate-700 flex items-center gap-1.5">
                              Send Transaction Update Message
                              <Info className="w-3.5 h-3.5 text-slate-400" />
                            </span>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer py-0.5">
                            <input
                              type="checkbox"
                              checked={sendMsgCopyToSelf}
                              onChange={(e) => setSendMsgCopyToSelf(e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C]"
                            />
                            <span className="text-xs sm:text-[13px] font-medium text-slate-700 flex items-center gap-1.5">
                              Send Message Copy to Self
                              <Info className="w-3.5 h-3.5 text-slate-400" />
                            </span>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer py-0.5">
                            <input
                              type="checkbox"
                              checked={autoShareVyaparNetwork}
                              onChange={(e) => setAutoShareVyaparNetwork(e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C]"
                            />
                            <span className="text-xs sm:text-[13px] font-medium text-slate-700 flex items-center gap-1.5">
                              Auto Share Invoices on Network
                              <Info className="w-3.5 h-3.5 text-slate-400" />
                            </span>
                          </label>
                        </div>

                        <div className="flex items-center gap-3 pt-2 border-t border-slate-100 text-xs">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                            ★ 100 CREDITS &gt;
                          </span>
                          <span className="text-slate-400 flex items-center gap-1.5">
                            Last synced: now
                            <RotateCcw className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-700" />
                          </span>
                        </div>
                      </div>

                      {/* Section: Message Content */}
                      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
                        <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 uppercase tracking-wider">
                          Message Content:
                        </h4>

                        <div className="space-y-3">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={partyBalanceInMsg}
                              onChange={(e) => setPartyBalanceInMsg(e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C]"
                            />
                            <span className="text-xs sm:text-[13px] font-medium text-slate-700 flex items-center gap-1.5">
                              Party Current Balance in Message
                              <Info className="w-3.5 h-3.5 text-slate-400" />
                            </span>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={webInvoiceLinkInMsg}
                              onChange={(e) => setWebInvoiceLinkInMsg(e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C]"
                            />
                            <span className="text-xs sm:text-[13px] font-medium text-slate-700 flex items-center gap-1.5">
                              Web invoice link in Message
                              <Info className="w-3.5 h-3.5 text-slate-400" />
                            </span>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={paymentLinkInMsg}
                              onChange={(e) => setPaymentLinkInMsg(e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C]"
                            />
                            <span className="text-xs sm:text-[13px] font-medium text-slate-700 flex items-center gap-1.5">
                              Send payment link in Message
                              <Info className="w-3.5 h-3.5 text-slate-400" />
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Section: Send Automatic Message for: */}
                      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
                        <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 uppercase tracking-wider">
                          Send Automatic Message for:
                        </h4>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                          {[
                            'Sales',
                            'Purchase',
                            'Sales Return',
                            'Purchase Return',
                            'Payment In',
                            'Payment Out',
                            'Sale Order',
                            'Purchase Order',
                            'Estimate',
                            'Proforma Invoice',
                            'Delivery Challan',
                            'Cancelled Invoice',
                          ].map((tName) => (
                            <label key={tName} className="flex items-center gap-3 cursor-pointer py-1">
                              <input
                                type="checkbox"
                                checked={!!autoMsgTypes[tName]}
                                onChange={(e) =>
                                  setAutoMsgTypes((prev) => ({ ...prev, [tName]: e.target.checked }))
                                }
                                className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C]"
                              />
                              <span className="text-xs sm:text-[13px] font-medium text-slate-700">
                                {tName}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Live Message Preview (Width: 5/12) */}
                    <div className="lg:col-span-5 sticky top-4 space-y-4">
                      {/* Top Type Selector */}
                      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3">
                        <span className="text-xs sm:text-[13px] font-bold text-slate-700">
                          Transaction Type:
                        </span>
                        <div className="w-48">
                          <CustomSelect
                            value={previewTxnType}
                            onChange={(val) => setPreviewTxnType(val)}
                            options={[
                              { label: 'Sales', value: 'Sales' },
                              { label: 'Purchase', value: 'Purchase' },
                              { label: 'Sales Return', value: 'Sales Return' },
                              { label: 'Purchase Return', value: 'Purchase Return' },
                              { label: 'Payment In', value: 'Payment In' },
                              { label: 'Payment Out', value: 'Payment Out' },
                              { label: 'Sale Order', value: 'Sale Order' },
                              { label: 'Purchase Order', value: 'Purchase Order' },
                              { label: 'Estimate', value: 'Estimate' },
                              { label: 'Proforma Invoice', value: 'Proforma Invoice' },
                              { label: 'Delivery Challan', value: 'Delivery Challan' },
                              { label: 'Cancelled Invoice', value: 'Cancelled Invoice' },
                            ]}
                            placeholder="Select Transaction"
                            optionVariant="strong"
                            activeColor="brand"
                          />
                        </div>
                      </div>

                      {/* Mockup WhatsApp Bubble Preview matching reference image */}
                      <div className="bg-slate-100/70 border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center pb-1">
                          Message Preview ({previewTxnType})
                        </div>

                        {/* WhatsApp Chat Bubble */}
                        <div className="bg-[#E7F8E8] border border-emerald-200 rounded-2xl p-4 text-slate-800 text-xs sm:text-[12.5px] leading-relaxed shadow-xs space-y-2">
                          <div className="flex items-center gap-1.5 text-emerald-800 font-bold border-b border-emerald-200/70 pb-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-600" />
                            <span>Transaction Confirmation</span>
                          </div>

                          <p className="font-semibold text-slate-900">
                            Thanks for your purchase with us!
                          </p>
                          <div className="space-y-0.5 text-slate-700">
                            <div><span className="font-semibold text-slate-800">Purchase Details:</span> #{previewTxnType.toUpperCase()}-101</div>
                            <div><span className="font-semibold text-slate-800">Invoice Amount:</span> ₹792.00</div>
                            <div><span className="font-semibold text-slate-800">Received:</span> ₹300.00</div>
                            <div><span className="font-semibold text-slate-800">Balance:</span> ₹492.00</div>
                            {partyBalanceInMsg && (
                              <div><span className="font-semibold text-slate-800">Total Party Balance:</span> ₹800.00</div>
                            )}
                          </div>

                          {webInvoiceLinkInMsg && (
                            <div className="pt-2 border-t border-emerald-200/70 text-blue-600 font-medium break-all">
                              🔗 <span className="underline cursor-pointer">https://inv.yaacreations.com/tx/inv-101</span>
                            </div>
                          )}

                          {paymentLinkInMsg && (
                            <div className="text-emerald-700 font-medium">
                              💳 <span className="underline cursor-pointer">https://pay.yaacreations.com/inv-101</span>
                            </div>
                          )}

                          <div className="text-right text-[10px] text-slate-400 pt-1">
                            12:45 PM · Delivered ✓✓
                          </div>
                        </div>

                        {/* Additional template notice */}
                        <div className="bg-white border border-slate-200 rounded-xl p-3 text-[11px] text-slate-500">
                          <span className="font-bold text-slate-700">Notice:</span> Variables such as Invoice Amount, Received, and Balance automatically resolve for each customer at the moment of dispatch.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. TRANSACTION SETTINGS TAB */}
              {superAdminTab === 'invoice_settings' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-[#33077C]" />
                      Transaction Settings
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure transaction header details, item pricing behaviors, taxation, and billing modes.
                    </p>
                  </div>

                  {/* 3 Balanced Columns Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* COLUMN 1: Transaction Header */}
                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 pb-3 border-b border-slate-100">
                        Transaction Header
                      </h4>
                      <div className="space-y-4">
                        <label className="flex items-center gap-3 cursor-pointer group py-0.5">
                          <input
                            type="checkbox"
                            checked={invoiceBillNo}
                            onChange={(e) => setInvoiceBillNo(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] cursor-pointer"
                          />
                          <span className="text-xs sm:text-[13px] font-medium text-slate-700 group-hover:text-slate-900">
                            Invoice/Bill No.
                          </span>
                          <Info className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer group py-0.5">
                          <input
                            type="checkbox"
                            checked={addTimeOnTransactions}
                            onChange={(e) => setAddTimeOnTransactions(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] cursor-pointer"
                          />
                          <span className="text-xs sm:text-[13px] font-medium text-slate-700 group-hover:text-slate-900">
                            Add Time on Transactions
                          </span>
                          <Info className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer group py-0.5">
                          <input
                            type="checkbox"
                            checked={cashSaleByDefault}
                            onChange={(e) => setCashSaleByDefault(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] cursor-pointer"
                          />
                          <span className="text-xs sm:text-[13px] font-medium text-slate-700 group-hover:text-slate-900">
                            Cash Sale by default
                          </span>
                          <Info className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer group py-0.5">
                          <input
                            type="checkbox"
                            checked={billingNameOfParties}
                            onChange={(e) => setBillingNameOfParties(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] cursor-pointer"
                          />
                          <span className="text-xs sm:text-[13px] font-medium text-slate-700 group-hover:text-slate-900">
                            Billing Name of Parties
                          </span>
                          <Info className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer group py-0.5">
                          <input
                            type="checkbox"
                            checked={poDetailsOnTransactions}
                            onChange={(e) => setPoDetailsOnTransactions(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] cursor-pointer"
                          />
                          <span className="text-xs sm:text-[13px] font-medium text-slate-700 group-hover:text-slate-900">
                            Customers P.O. Details on Transactions
                          </span>
                          <Info className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                        </label>
                      </div>
                    </div>

                    {/* COLUMN 2: Items Table */}
                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 pb-3 border-b border-slate-100">
                        Items Table
                      </h4>
                      <div className="space-y-4">
                        <label className="flex items-center gap-3 cursor-pointer group py-0.5">
                          <input
                            type="checkbox"
                            checked={inclusiveExclusiveTaxRate}
                            onChange={(e) => setInclusiveExclusiveTaxRate(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] cursor-pointer"
                          />
                          <span className="text-xs sm:text-[13px] font-medium text-slate-700 group-hover:text-slate-900">
                            Inclusive/Exclusive Tax on Rate(Price/Unit)
                          </span>
                          <Info className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer group py-0.5">
                          <input
                            type="checkbox"
                            checked={displayPurchasePrice}
                            onChange={(e) => setDisplayPurchasePrice(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] cursor-pointer"
                          />
                          <span className="text-xs sm:text-[13px] font-medium text-slate-700 group-hover:text-slate-900">
                            Display Purchase Price of Items
                          </span>
                          <Info className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer group py-0.5">
                          <input
                            type="checkbox"
                            checked={showLast5SalePrice}
                            onChange={(e) => setShowLast5SalePrice(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] cursor-pointer"
                          />
                          <span className="text-xs sm:text-[13px] font-medium text-slate-700 group-hover:text-slate-900">
                            Show last 5 Sale Price of Items
                          </span>
                          <Info className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer group py-0.5">
                          <input
                            type="checkbox"
                            checked={showLast5PurchasePrice}
                            onChange={(e) => setShowLast5PurchasePrice(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] cursor-pointer"
                          />
                          <span className="text-xs sm:text-[13px] font-medium text-slate-700 group-hover:text-slate-900">
                            Show last 5 Purchase Price of Items
                          </span>
                          <Info className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer group py-0.5">
                          <input
                            type="checkbox"
                            checked={freeItemQuantity}
                            onChange={(e) => setFreeItemQuantity(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] cursor-pointer"
                          />
                          <span className="text-xs sm:text-[13px] font-medium text-slate-700 group-hover:text-slate-900">
                            Free Item Quantity
                          </span>
                          <Info className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                        </label>

                        <div className="pt-0.5">
                          <label className="flex items-center gap-3 cursor-pointer group py-0.5">
                            <input
                              type="checkbox"
                              checked={enableItemCount}
                              onChange={(e) => setEnableItemCount(e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] cursor-pointer"
                            />
                            <span className="text-xs sm:text-[13px] font-medium text-slate-700 group-hover:text-slate-900">
                              Count
                            </span>
                            <button
                              type="button"
                              className="text-xs font-semibold text-[#33077C] hover:underline cursor-pointer ml-1"
                            >
                              Change Text
                            </button>
                            <Info className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* COLUMN 3: Taxes, Discount & Totals & Billing Type */}
                    <div className="space-y-6">
                      {/* Section: Taxes, Discount & Totals */}
                      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 pb-3 border-b border-slate-100">
                          Taxes, Discount & Totals
                        </h4>
                        <div className="space-y-4">
                          <label className="flex items-center gap-3 cursor-pointer group py-0.5">
                            <input
                              type="checkbox"
                              checked={transactionWiseTax}
                              onChange={(e) => setTransactionWiseTax(e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] cursor-pointer"
                            />
                            <span className="text-xs sm:text-[13px] font-medium text-slate-700 group-hover:text-slate-900">
                              Transaction wise Tax
                            </span>
                            <Info className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer group py-0.5">
                            <input
                              type="checkbox"
                              checked={transactionWiseDiscount}
                              onChange={(e) => setTransactionWiseDiscount(e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] cursor-pointer"
                            />
                            <span className="text-xs sm:text-[13px] font-medium text-slate-700 group-hover:text-slate-900">
                              Transaction wise Discount
                            </span>
                            <Info className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                          </label>

                          <div className="pt-0.5 space-y-3">
                            <label className="flex items-center gap-3 cursor-pointer group py-0.5">
                              <input
                                type="checkbox"
                                checked={roundOffTotal}
                                onChange={(e) => setRoundOffTotal(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] cursor-pointer"
                              />
                              <span className="text-xs sm:text-[13px] font-medium text-slate-700 group-hover:text-slate-900">
                                Round Off Total
                              </span>
                              <Info className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                            </label>

                            {roundOffTotal && (
                              <div className="grid grid-cols-2 gap-3 pl-7 pt-1">
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Type</label>
                                  <CustomSelect
                                    value={roundOffType}
                                    onChange={setRoundOffType}
                                    options={[
                                      { value: 'Nearest', label: 'Nearest' },
                                      { value: 'Round Up', label: 'Round Up' },
                                      { value: 'Round Down', label: 'Round Down' },
                                    ]}
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">To</label>
                                  <CustomSelect
                                    value={roundOffTo}
                                    onChange={setRoundOffTo}
                                    options={[
                                      { value: '1', label: 'To 1' },
                                      { value: '5', label: 'To 5' },
                                      { value: '10', label: 'To 10' },
                                    ]}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Section: Billing Type */}
                      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 pb-3 border-b border-slate-100">
                          Billing Type
                        </h4>
                        <div className="flex items-center gap-6">
                          <label className="flex items-center gap-2.5 cursor-pointer group">
                            <input
                              type="radio"
                              name="billingType"
                              value="Lite Sale"
                              checked={billingType === 'Lite Sale'}
                              onChange={(e) => setBillingType(e.target.value)}
                              className="w-4 h-4 text-[#33077C] focus:ring-[#33077C] border-slate-300 cursor-pointer"
                            />
                            <span className="text-xs sm:text-[13px] font-medium text-slate-700 group-hover:text-slate-900">
                              Lite Sale
                            </span>
                          </label>

                          <label className="flex items-center gap-2.5 cursor-pointer group">
                            <input
                              type="radio"
                              name="billingType"
                              value="Full Sale"
                              checked={billingType === 'Full Sale'}
                              onChange={(e) => setBillingType(e.target.value)}
                              className="w-4 h-4 text-[#33077C] focus:ring-[#33077C] border-slate-300 cursor-pointer"
                            />
                            <span className="text-xs sm:text-[13px] font-medium text-slate-700 group-hover:text-slate-900">
                              Full Sale
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section: More Transaction Features (Full Width 2-Column Grid) */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 pb-3 border-b border-slate-100">
                      More Transaction Features
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                      <label className="flex items-center gap-3 cursor-pointer group py-0.5">
                        <input
                          type="checkbox"
                          checked={ewayBillNo}
                          onChange={(e) => setEwayBillNo(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] cursor-pointer"
                        />
                        <span className="text-xs sm:text-[13px] font-medium text-slate-700 group-hover:text-slate-900">
                          E-way bill no
                        </span>
                        <Info className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group py-0.5">
                        <input
                          type="checkbox"
                          checked={quickEntry}
                          onChange={(e) => setQuickEntry(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] cursor-pointer"
                        />
                        <span className="text-xs sm:text-[13px] font-medium text-slate-700 group-hover:text-slate-900">
                          Quick Entry
                        </span>
                        <Info className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group py-0.5">
                        <input
                          type="checkbox"
                          checked={doNotShowInvoicePreview}
                          onChange={(e) => setDoNotShowInvoicePreview(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] cursor-pointer"
                        />
                        <span className="text-xs sm:text-[13px] font-medium text-slate-700 group-hover:text-slate-900">
                          Do not Show Invoice Preview
                        </span>
                        <Info className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group py-0.5">
                        <input
                          type="checkbox"
                          checked={repeatInvoices}
                          onChange={(e) => setRepeatInvoices(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] cursor-pointer"
                        />
                        <span className="text-xs sm:text-[13px] font-medium text-slate-700 group-hover:text-slate-900">
                          Repeat Invoices
                        </span>
                        <Info className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group py-0.5">
                        <input
                          type="checkbox"
                          checked={enablePasscodeForEditDelete}
                          onChange={(e) => setEnablePasscodeForEditDelete(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] cursor-pointer"
                        />
                        <span className="text-xs sm:text-[13px] font-medium text-slate-700 group-hover:text-slate-900">
                          Enable Passcode for transaction edit/delete
                        </span>
                        <Info className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group py-0.5">
                        <input
                          type="checkbox"
                          checked={discountDuringPayments}
                          onChange={(e) => setDiscountDuringPayments(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] cursor-pointer"
                        />
                        <span className="text-xs sm:text-[13px] font-medium text-slate-700 group-hover:text-slate-900">
                          Discount During Payments
                        </span>
                        <Info className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group py-0.5">
                        <input
                          type="checkbox"
                          checked={linkPaymentsToInvoices}
                          onChange={(e) => setLinkPaymentsToInvoices(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] cursor-pointer"
                        />
                        <span className="text-xs sm:text-[13px] font-medium text-slate-700 group-hover:text-slate-900">
                          Link Payments to Invoices
                        </span>
                        <Info className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group py-0.5">
                        <input
                          type="checkbox"
                          checked={dueDatesAndPaymentTerms}
                          onChange={(e) => setDueDatesAndPaymentTerms(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] cursor-pointer"
                        />
                        <span className="text-xs sm:text-[13px] font-medium text-slate-700 group-hover:text-slate-900">
                          Due Dates and Payment Terms
                        </span>
                        <Info className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group py-0.5">
                        <input
                          type="checkbox"
                          checked={showProfitWhileMakingSale}
                          onChange={(e) => setShowProfitWhileMakingSale(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] cursor-pointer"
                        />
                        <span className="text-xs sm:text-[13px] font-medium text-slate-700 group-hover:text-slate-900">
                          Show Profit while making Sale Invoice
                        </span>
                        <Info className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                      </label>

                      <div>
                        <label className="flex items-center gap-3 cursor-pointer group py-0.5">
                          <input
                            type="checkbox"
                            checked={termsAndConditionsEnabled}
                            onChange={(e) => setTermsAndConditionsEnabled(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] cursor-pointer"
                          />
                          <span className="text-xs sm:text-[13px] font-medium text-slate-700 group-hover:text-slate-900">
                            Terms and Conditions
                          </span>
                          <Info className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                        </label>
                        <button
                          type="button"
                          className="text-xs font-semibold text-[#33077C] hover:text-[#4309A2] hover:underline pl-7 mt-0.5 cursor-pointer block"
                        >
                          Set Terms and Conditions
                        </button>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center gap-6">
                      <button
                        type="button"
                        className="text-xs font-semibold text-[#33077C] hover:text-[#4309A2] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Additional Fields &gt;
                      </button>
                      <button
                        type="button"
                        className="text-xs font-semibold text-[#33077C] hover:text-[#4309A2] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Transportation Details &gt;
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 7. PRINT / DOCUMENT SETTINGS TAB */}
              {superAdminTab === 'document_templates' && (
                <div className="space-y-6">
                  {/* Top Bar with Tabs and Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-6">
                      <button
                        type="button"
                        onClick={() => setPrinterTab('regular')}
                        className={`text-xs sm:text-sm font-bold uppercase tracking-wider pb-3 -mb-3 transition-colors cursor-pointer border-b-2 ${
                          printerTab === 'regular'
                            ? 'border-[#33077C] text-[#33077C]'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Regular Printer
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrinterTab('thermal')}
                        className={`text-xs sm:text-sm font-bold uppercase tracking-wider pb-3 -mb-3 transition-colors cursor-pointer border-b-2 ${
                          printerTab === 'thermal'
                            ? 'border-[#33077C] text-[#33077C]'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Thermal Printer
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setPrintSubTab('layout')}
                        className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                          printSubTab === 'layout'
                            ? 'bg-[#33077C]/10 text-[#33077C] border border-[#33077C]/20'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        Change Layout
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrintSubTab('colors')}
                        className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                          printSubTab === 'colors'
                            ? 'bg-[#33077C]/10 text-[#33077C] border border-[#33077C]/20'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        Change Colors
                      </button>
                    </div>
                  </div>

                  {/* Main Two-Column View: Left Form Controls, Right Live Invoice Preview */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                    {/* Left Settings Column with comfortable spacing */}
                    <div className="xl:col-span-7 space-y-8 max-h-[85vh] overflow-y-auto pr-2 custom-scrollbar">
                      {/* Theme / Template Carousel Selection */}
                      <div className="space-y-3">
                        <label className="text-xs sm:text-[13px] font-bold text-slate-800 uppercase tracking-wider block">
                          Select Invoice Theme
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-1">
                          {[
                            { id: 'tally_theme', label: 'Tally Theme' },
                            { id: 'landscape_theme_1', label: 'Landscape Theme 1' },
                            { id: 'landscape_theme_2', label: 'Landscape Theme 2' },
                            { id: 'gst_theme_1', label: 'GST Theme 1' },
                          ].map((tpl) => {
                            const isSelected = selectedInvoiceTemplate === tpl.id;
                            return (
                              <button
                                key={tpl.id}
                                type="button"
                                onClick={() => setSelectedInvoiceTemplate(tpl.id)}
                                className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between gap-3 ${
                                  isSelected
                                    ? 'border-[#33077C] bg-[#33077C]/5 ring-2 ring-[#33077C]/20 shadow-xs'
                                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                                }`}
                              >
                                {/* Miniature Document Preview Glyph */}
                                <div className="w-16 h-12 bg-white border border-slate-200 rounded p-1.5 flex flex-col justify-between shadow-2xs">
                                  <div className="h-1.5 w-1/2 bg-slate-300 rounded-xs" />
                                  <div className="space-y-0.5">
                                    <div className="h-1 w-full bg-slate-200 rounded-xs" />
                                    <div className="h-1 w-3/4 bg-slate-200 rounded-xs" />
                                    <div className="h-1 w-full bg-slate-200 rounded-xs" />
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <div className="h-1 w-1/3 bg-slate-300 rounded-xs" />
                                    <div className="h-1 w-1/4 bg-[#33077C]/60 rounded-xs" />
                                  </div>
                                </div>
                                <span className={`text-xs truncate w-full ${
                                  isSelected ? 'text-[#33077C] font-bold' : 'text-slate-700 font-medium'
                                }`}>
                                  {tpl.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Section 1: Print Company Info / Header */}
                      <div className="space-y-5 pt-6 border-t border-slate-200/80">
                        <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 uppercase tracking-wider">
                          Print Company Info / Header
                        </h4>

                        <div className="space-y-4">
                          <label className="flex items-center gap-3 cursor-pointer py-0.5">
                            <input
                              type="checkbox"
                              checked={makeRegularPrinterDefault}
                              onChange={(e) => setMakeRegularPrinterDefault(e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C]"
                            />
                            <span className="text-xs sm:text-[13.5px] font-medium text-slate-700 flex items-center gap-1.5">
                              Make Regular Printer Default
                              <Info className="w-3.5 h-3.5 text-slate-400" />
                            </span>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer py-0.5">
                            <input
                              type="checkbox"
                              checked={printRepeatHeader}
                              onChange={(e) => setPrintRepeatHeader(e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C]"
                            />
                            <span className="text-xs sm:text-[13.5px] font-medium text-slate-700 flex items-center gap-1.5">
                              Print repeat header in all pages
                              <Info className="w-3.5 h-3.5 text-slate-400" />
                            </span>
                          </label>

                          {/* Company Name field */}
                          <div className="flex items-start gap-3.5 pt-2">
                            <input
                              type="checkbox"
                              checked={!!printCompanyName}
                              onChange={(e) => setPrintCompanyName(e.target.checked ? 'My Company' : '')}
                              className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] shrink-0 mt-8"
                            />
                            <div className="flex-1">
                              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                                Company Name
                              </label>
                              <input
                                type="text"
                                placeholder="Enter company name"
                                value={printCompanyName}
                                onChange={(e) => setPrintCompanyName(e.target.value)}
                                className="w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all placeholder:text-slate-400"
                              />
                            </div>
                          </div>

                          {/* Company Logo */}
                          <div className="flex items-center justify-between py-1.5">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={printCompanyLogo}
                                onChange={(e) => setPrintCompanyLogo(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C]"
                              />
                              <span className="text-xs sm:text-[13.5px] font-medium text-slate-700 flex items-center gap-1.5">
                                Company Logo
                                <span className="text-xs text-[#33077C] hover:underline cursor-pointer font-semibold ml-1">(Change)</span>
                                <Info className="w-3.5 h-3.5 text-slate-400" />
                              </span>
                            </label>
                          </div>

                          {/* Address */}
                          <div className="flex items-start gap-3.5 pt-1">
                            <input
                              type="checkbox"
                              checked={printAddress}
                              onChange={(e) => setPrintAddress(e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] shrink-0 mt-8"
                            />
                            <div className="flex-1">
                              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                                Address
                              </label>
                              <input
                                type="text"
                                placeholder="Enter complete address"
                                value={printAddressValue}
                                onChange={(e) => setPrintAddressValue(e.target.value)}
                                className="w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all placeholder:text-slate-400"
                              />
                            </div>
                          </div>

                          {/* Email */}
                          <div className="flex items-start gap-3.5 pt-1">
                            <input
                              type="checkbox"
                              checked={printEmail}
                              onChange={(e) => setPrintEmail(e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] shrink-0 mt-8"
                            />
                            <div className="flex-1">
                              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                                Email
                              </label>
                              <input
                                type="email"
                                placeholder="e.g. billing@company.com"
                                value={printEmailValue}
                                onChange={(e) => setPrintEmailValue(e.target.value)}
                                className="w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all placeholder:text-slate-400"
                              />
                            </div>
                          </div>

                          {/* Phone Number */}
                          <div className="flex items-start gap-3.5 pt-1">
                            <input
                              type="checkbox"
                              checked={printPhone}
                              onChange={(e) => setPrintPhone(e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] shrink-0 mt-8"
                            />
                            <div className="flex-1">
                              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                                Phone Number
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. 9080185828"
                                value={printPhoneValue}
                                onChange={(e) => setPrintPhoneValue(e.target.value)}
                                className="w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all placeholder:text-slate-400"
                              />
                            </div>
                          </div>

                          {/* GSTIN on Sale */}
                          <div className="flex items-start gap-3.5 pt-1">
                            <input
                              type="checkbox"
                              checked={printGstin}
                              onChange={(e) => setPrintGstin(e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] shrink-0 mt-8"
                            />
                            <div className="flex-1">
                              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                                GSTIN on Sale
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. 33AABCA1234F1Z5"
                                value={printGstinValue}
                                onChange={(e) => setPrintGstinValue(e.target.value)}
                                className="w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all placeholder:text-slate-400 uppercase"
                              />
                            </div>
                          </div>

                          {/* Paper Size, Orientation, and Font Sizes */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 pt-3">
                            <div>
                              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                                Paper Size
                              </label>
                              <CustomSelect
                                value={paperSize}
                                onChange={(val) => setPaperSize(val)}
                                options={[
                                  { label: 'A4', value: 'A4' },
                                  { label: 'A5', value: 'A5' },
                                  { label: 'Letter', value: 'Letter' },
                                  { label: '3-inch Thermal', value: '3-inch' },
                                ]}
                                placeholder="Select paper size"
                                optionVariant="strong"
                                activeColor="brand"
                              />
                            </div>

                            <div>
                              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                                Orientation
                              </label>
                              <CustomSelect
                                value={orientation}
                                onChange={(val) => setOrientation(val)}
                                options={[
                                  { label: 'Portrait', value: 'Portrait' },
                                  { label: 'Landscape', value: 'Landscape' },
                                ]}
                                placeholder="Select orientation"
                                optionVariant="strong"
                                activeColor="brand"
                              />
                            </div>

                            <div>
                              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                                Company Name Text Size
                              </label>
                              <CustomSelect
                                value={companyNameSize}
                                onChange={(val) => setCompanyNameSize(val)}
                                options={[
                                  { label: 'Small', value: 'Small' },
                                  { label: 'Medium', value: 'Medium' },
                                  { label: 'Large', value: 'Large' },
                                  { label: 'Extra Large', value: 'Extra Large' },
                                ]}
                                placeholder="Select text size"
                                optionVariant="strong"
                                activeColor="brand"
                              />
                            </div>

                            <div>
                              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                                Invoice Text Size
                              </label>
                              <CustomSelect
                                value={invoiceTextSize}
                                onChange={(val) => setInvoiceTextSize(val)}
                                options={[
                                  { label: 'Small', value: 'Small' },
                                  { label: 'Medium', value: 'Medium' },
                                  { label: 'Large', value: 'Large' },
                                ]}
                                placeholder="Select text size"
                                optionVariant="strong"
                                activeColor="brand"
                              />
                            </div>
                          </div>

                          <label className="flex items-center gap-3 cursor-pointer pt-2">
                            <input
                              type="checkbox"
                              checked={printOriginalDuplicate}
                              onChange={(e) => setPrintOriginalDuplicate(e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C]"
                            />
                            <span className="text-xs sm:text-[13.5px] font-medium text-slate-700 flex items-center gap-1.5">
                              Print Original/Duplicate
                              <Info className="w-3.5 h-3.5 text-slate-400" />
                            </span>
                          </label>

                          <div className="flex items-center justify-between py-2 border-t border-slate-100 mt-2">
                            <span className="text-xs sm:text-[13.5px] font-medium text-slate-700 flex items-center gap-1.5">
                              Extra space on Top of PDF
                              <Info className="w-3.5 h-3.5 text-slate-400" />
                            </span>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={extraSpaceTopPdf}
                                onChange={(e) => setExtraSpaceTopPdf(Number(e.target.value))}
                                className="w-24 h-10 px-3 border border-slate-200 rounded-xl text-xs font-semibold text-center text-slate-800 outline-none focus:border-[#4309A2]"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Item Table */}
                      <div className="space-y-5 pt-6 border-t border-slate-200/80">
                        <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 uppercase tracking-wider">
                          Item Table
                        </h4>

                        <div className="space-y-4">
                          <label className="flex items-center gap-3 cursor-pointer py-0.5">
                            <input
                              type="checkbox"
                              checked={expandTableToWholePage}
                              onChange={(e) => setExpandTableToWholePage(e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C]"
                            />
                            <span className="text-xs sm:text-[13.5px] font-medium text-slate-700 flex items-center gap-1.5">
                              Expand table to print on whole page
                              <Info className="w-3.5 h-3.5 text-slate-400" />
                            </span>
                          </label>

                          <div className="flex items-center justify-between py-1">
                            <span className="text-xs sm:text-[13.5px] font-medium text-slate-700 flex items-center gap-1.5">
                              Min No. of Rows in Item Table
                              <Info className="w-3.5 h-3.5 text-slate-400" />
                            </span>
                            <input
                              type="number"
                              min={0}
                              max={50}
                              value={minItemRows}
                              onChange={(e) => setMinItemRows(Number(e.target.value))}
                              className="w-24 h-10 px-3 border border-slate-200 rounded-xl text-xs font-semibold text-center text-slate-800 outline-none focus:border-[#4309A2]"
                            />
                          </div>

                          <button
                            type="button"
                            className="text-xs sm:text-[13px] font-semibold text-[#33077C] hover:underline flex items-center gap-1 cursor-pointer pt-1"
                          >
                            Item Table Customization &gt;
                          </button>
                        </div>
                      </div>

                      {/* Section 3: Totals & Taxes */}
                      <div className="space-y-5 pt-6 border-t border-slate-200/80">
                        <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 uppercase tracking-wider">
                          Totals & Taxes
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {[
                            { label: 'Total Item Quantity', val: totalItemQuantity, set: setTotalItemQuantity },
                            { label: 'Amount with Decimal e.g. 0.00', val: amountWithDecimal, set: setAmountWithDecimal },
                            { label: 'Received Amount', val: receivedAmount, set: setReceivedAmount },
                            { label: 'Balance Amount', val: balanceAmount, set: setBalanceAmount },
                            { label: 'Current Balance of Party', val: currentBalanceOfParty, set: setCurrentBalanceOfParty },
                            { label: 'Tax Details', val: taxDetails, set: setTaxDetails },
                            { label: 'You Saved', val: youSaved, set: setYouSaved },
                            { label: 'Print Amount with Grouping', val: printAmountWithGrouping, set: setPrintAmountWithGrouping },
                          ].map((item) => (
                            <label key={item.label} className="flex items-center gap-3 cursor-pointer py-1">
                              <input
                                type="checkbox"
                                checked={item.val}
                                onChange={(e) => item.set(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C]"
                              />
                              <span className="text-xs sm:text-[13px] font-medium text-slate-700 flex items-center gap-1.5">
                                {item.label}
                                <Info className="w-3.5 h-3.5 text-slate-400" />
                              </span>
                            </label>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                          <span className="text-xs sm:text-[13px] font-medium text-slate-700 flex items-center gap-1.5">
                            Amount In Words
                            <Info className="w-3.5 h-3.5 text-slate-400" />
                          </span>
                          <div className="w-44">
                            <CustomSelect
                              value={amountInWordsFormat}
                              onChange={(val) => setAmountInWordsFormat(val)}
                              options={[
                                { label: 'Indian (Lakhs, Crores)', value: 'Indian' },
                                { label: 'International (Millions)', value: 'International' },
                              ]}
                              placeholder="Select format"
                              optionVariant="strong"
                              activeColor="brand"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 4: Footer */}
                      <div className="space-y-5 pt-6 border-t border-slate-200/80">
                        <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 uppercase tracking-wider">
                          Footer
                        </h4>

                        <div className="space-y-4">
                          {[
                            { label: 'Print Description', val: printDescription, set: setPrintDescription },
                            { label: 'Print Terms and Conditions', val: printTermsConditions, set: setPrintTermsConditions },
                            { label: 'Print Received by details', val: printReceivedBy, set: setPrintReceivedBy },
                            { label: 'Print Delivered by details', val: printDeliveredBy, set: setPrintDeliveredBy },
                          ].map((item) => (
                            <label key={item.label} className="flex items-center gap-3 cursor-pointer py-0.5">
                              <input
                                type="checkbox"
                                checked={item.val}
                                onChange={(e) => item.set(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C]"
                              />
                              <span className="text-xs sm:text-[13.5px] font-medium text-slate-700 flex items-center gap-1.5">
                                {item.label}
                                <Info className="w-3.5 h-3.5 text-slate-400" />
                              </span>
                            </label>
                          ))}

                          {/* Print Signature Text */}
                          <div className="flex items-start gap-3.5 pt-2">
                            <input
                              type="checkbox"
                              checked={printSignature}
                              onChange={(e) => setPrintSignature(e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] shrink-0 mt-8"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs sm:text-[13px] font-medium text-slate-500">
                                  Print Signature Text
                                </label>
                                <button
                                  type="button"
                                  className="text-xs font-semibold text-[#33077C] hover:underline"
                                >
                                  Change Signature
                                </button>
                              </div>
                              <input
                                type="text"
                                placeholder="e.g. Authorized Signatory"
                                value={signatureText}
                                onChange={(e) => setSignatureText(e.target.value)}
                                className="w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all placeholder:text-slate-400"
                              />
                            </div>
                          </div>

                          <label className="flex items-center gap-3 cursor-pointer py-1">
                            <input
                              type="checkbox"
                              checked={printPaymentMode}
                              onChange={(e) => setPrintPaymentMode(e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C]"
                            />
                            <span className="text-xs sm:text-[13.5px] font-medium text-slate-700 flex items-center gap-1.5">
                              Payment Mode
                              <Info className="w-3.5 h-3.5 text-slate-400" />
                            </span>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer py-1">
                            <input
                              type="checkbox"
                              checked={printAcknowledgement}
                              onChange={(e) => setPrintAcknowledgement(e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C]"
                            />
                            <span className="text-xs sm:text-[13.5px] font-medium text-slate-700 flex items-center gap-1.5">
                              Print Acknowledgement
                              <Info className="w-3.5 h-3.5 text-slate-400" />
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Right Live Document Preview Column (Dynamic to selected theme) */}
                    <div className="xl:col-span-5 sticky top-4">
                      {/* Tally Theme Layout */}
                      {selectedInvoiceTemplate === 'tally_theme' && (
                        <div className="bg-white border-2 border-slate-400 rounded-none shadow-md p-4 text-[10.5px] text-slate-800 space-y-2.5 font-mono max-h-[85vh] overflow-y-auto">
                          <div className="text-center font-bold text-xs uppercase tracking-widest border-b-2 border-slate-700 pb-1">
                            TAX INVOICE (TALLY FORMAT)
                          </div>
                          <div className="border border-slate-400 p-2 flex justify-between items-start">
                            <div>
                              <div className="font-bold text-sm text-slate-900">{printCompanyName || 'My Company'}</div>
                              {printAddress && printAddressValue && <div className="text-slate-600">{printAddressValue}</div>}
                              {printPhone && <div className="text-slate-600">Contact: {printPhoneValue}</div>}
                              {printGstin && printGstinValue && <div className="text-slate-600 font-bold">GSTIN/UIN: {printGstinValue}</div>}
                            </div>
                            <div className="text-right text-[10px]">
                              <div>Invoice No: <span className="font-bold">INV-101</span></div>
                              <div>Dated: <span className="font-bold">24-Nov-2026</span></div>
                              <div>Mode of Pay: <span className="font-bold">Credit - 30 Days</span></div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 border border-slate-400 divide-x divide-slate-400 p-2">
                            <div>
                              <span className="font-bold underline block mb-1">Buyer (Bill to):</span>
                              <div className="font-bold">Classic Enterprises</div>
                              <div>Plot No. 1, Koramangala, Bangalore</div>
                              <div>GSTIN/UIN: 29AABCA1234F1Z5</div>
                            </div>
                            <div className="pl-2">
                              <span className="font-bold underline block mb-1">Consignee (Ship to):</span>
                              <div className="font-bold">Mahita Textiles</div>
                              <div>Marathahalli Road, Bangalore</div>
                              <div>State Name: Karnataka, Code: 29</div>
                            </div>
                          </div>

                          <table className="w-full text-left text-[10px] border border-slate-400 border-collapse">
                            <thead>
                              <tr className="bg-slate-200 border-b border-slate-400 font-bold">
                                <th className="p-1 border-r border-slate-400 w-6 text-center">Sl</th>
                                <th className="p-1 border-r border-slate-400">Description of Goods</th>
                                <th className="p-1 border-r border-slate-400 text-center">HSN/SAC</th>
                                <th className="p-1 border-r border-slate-400 text-center">Quantity</th>
                                <th className="p-1 border-r border-slate-400 text-right">Rate</th>
                                <th className="p-1 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-300">
                              <tr>
                                <td className="p-1 border-r border-slate-400 text-center">1</td>
                                <td className="p-1 border-r border-slate-400 font-bold">Cotton Fabric A-Grade</td>
                                <td className="p-1 border-r border-slate-400 text-center">5208</td>
                                <td className="p-1 border-r border-slate-400 text-center">10 m</td>
                                <td className="p-1 border-r border-slate-400 text-right">50.00</td>
                                <td className="p-1 text-right font-bold">500.00</td>
                              </tr>
                              <tr>
                                <td className="p-1 border-r border-slate-400 text-center">2</td>
                                <td className="p-1 border-r border-slate-400 font-bold">Silk Embroidery Thread</td>
                                <td className="p-1 border-r border-slate-400 text-center">5004</td>
                                <td className="p-1 border-r border-slate-400 text-center">5 rolls</td>
                                <td className="p-1 border-r border-slate-400 text-right">80.00</td>
                                <td className="p-1 text-right font-bold">400.00</td>
                              </tr>
                              <tr className="bg-slate-50 font-bold border-t border-slate-400">
                                <td colSpan={3} className="p-1 border-r border-slate-400 text-right">OUTPUT CGST @ 2.5%</td>
                                <td colSpan={2} className="p-1 border-r border-slate-400"></td>
                                <td className="p-1 text-right">22.50</td>
                              </tr>
                              <tr className="bg-slate-50 font-bold">
                                <td colSpan={3} className="p-1 border-r border-slate-400 text-right">OUTPUT SGST @ 2.5%</td>
                                <td colSpan={2} className="p-1 border-r border-slate-400"></td>
                                <td className="p-1 text-right">22.50</td>
                              </tr>
                            </tbody>
                            <tfoot>
                              <tr className="bg-slate-200 border-t-2 border-slate-600 font-bold text-[11px]">
                                <td colSpan={3} className="p-1 border-r border-slate-400 text-right">Total:</td>
                                <td className="p-1 border-r border-slate-400 text-center">15 pcs</td>
                                <td className="p-1 border-r border-slate-400"></td>
                                <td className="p-1 text-right">₹945.00</td>
                              </tr>
                            </tfoot>
                          </table>

                          <div className="border border-slate-400 p-1.5 text-[10px]">
                            <span className="font-bold">Amount Chargeable (in words): </span>
                            INR Nine Hundred Forty Five Only
                          </div>

                          <div className="grid grid-cols-2 border border-slate-400 p-2 text-[10px]">
                            <div>
                              <span className="font-bold underline block">Declaration:</span>
                              We declare that this invoice shows the actual price of the goods described.
                            </div>
                            <div className="text-right flex flex-col justify-between items-end">
                              <span className="font-bold">for {printCompanyName || 'My Company'}</span>
                              <div className="pt-6 font-bold">{signatureText || 'Authorised Signatory'}</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Landscape Theme 1 Layout */}
                      {selectedInvoiceTemplate === 'landscape_theme_1' && (
                        <div className="bg-white border-2 border-blue-200 rounded-lg shadow-md p-4 text-[10.5px] text-slate-800 space-y-3 font-sans max-h-[85vh] overflow-y-auto">
                          {/* Banner Header with primary accent styling */}
                          <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-3 rounded-md flex justify-between items-center shadow-xs">
                            <div className="flex items-center gap-2.5">
                              {printCompanyLogo && (
                                <div className="w-10 h-10 bg-white/20 border border-white/30 rounded flex items-center justify-center text-xs font-bold text-white">
                                  Logo
                                </div>
                              )}
                              <div>
                                <h3 className="font-bold text-base text-white">{printCompanyName || 'My Company'}</h3>
                                {printPhone && <p className="text-[10px] text-blue-100">Tel: {printPhoneValue}</p>}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded">
                                Landscape Invoice
                              </span>
                              <div className="text-[10px] text-blue-100 mt-1">#INV-101 | 24-11-2026</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 p-2 bg-blue-50/50 border border-blue-100 rounded-md">
                            <div>
                              <span className="font-bold text-blue-900 block text-xs mb-0.5">Invoiced To:</span>
                              <div className="font-semibold text-slate-800">Classic Enterprises</div>
                              <div className="text-slate-500">Plot 1, Koramangala, Bangalore</div>
                              <div className="text-slate-500">GSTIN: 29AABCA1234F1Z5</div>
                            </div>
                            <div>
                              <span className="font-bold text-blue-900 block text-xs mb-0.5">Dispatched To:</span>
                              <div className="font-semibold text-slate-800">Mahita Textiles</div>
                              <div className="text-slate-500">Marathahalli, Bangalore, 560037</div>
                              <div className="text-slate-500">Due: 15-12-2026 (Net 30)</div>
                            </div>
                          </div>

                          <table className="w-full text-left text-[10px] border border-blue-200 rounded-md overflow-hidden">
                            <thead className="bg-blue-600 text-white font-bold">
                              <tr>
                                <th className="p-1.5 w-6 text-center">#</th>
                                <th className="p-1.5">Item & Description</th>
                                <th className="p-1.5 text-center">Qty</th>
                                <th className="p-1.5 text-right">Unit Rate</th>
                                <th className="p-1.5 text-right">GST</th>
                                <th className="p-1.5 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-blue-100">
                              <tr className="hover:bg-blue-50/30">
                                <td className="p-1.5 text-center">1</td>
                                <td className="p-1.5 font-medium">Cotton Fabric A-Grade (HSN 5208)</td>
                                <td className="p-1.5 text-center">10 m</td>
                                <td className="p-1.5 text-right">50.00</td>
                                <td className="p-1.5 text-right">5% (25.00)</td>
                                <td className="p-1.5 text-right font-semibold">525.00</td>
                              </tr>
                              <tr className="hover:bg-blue-50/30">
                                <td className="p-1.5 text-center">2</td>
                                <td className="p-1.5 font-medium">Silk Embroidery Thread (HSN 5004)</td>
                                <td className="p-1.5 text-center">5 rolls</td>
                                <td className="p-1.5 text-right">80.00</td>
                                <td className="p-1.5 text-right">12% (45.60)</td>
                                <td className="p-1.5 text-right font-semibold">425.60</td>
                              </tr>
                            </tbody>
                            <tfoot className="bg-blue-50 font-bold border-t border-blue-200">
                              <tr>
                                <td colSpan={2} className="p-1.5 text-right">Grand Total:</td>
                                <td className="p-1.5 text-center">15</td>
                                <td colSpan={2} className="p-1.5 text-right">Taxes: ₹70.60</td>
                                <td className="p-1.5 text-right font-bold text-blue-900 text-xs">₹950.60</td>
                              </tr>
                            </tfoot>
                          </table>

                          <div className="flex justify-between items-end pt-2 border-t border-slate-200">
                            <div className="text-[10px] text-slate-500">
                              <span className="font-bold text-slate-700">Bank:</span> HDFC Bank | A/C: 123456789012
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] text-slate-500">Authorized Signature</div>
                              <div className="font-bold text-slate-800 mt-1">{signatureText || 'Authorized Signatory'}</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Landscape Theme 2 Layout (Original default layout with purple corporate styling) */}
                      {selectedInvoiceTemplate === 'landscape_theme_2' && (
                        <div className="bg-white border-2 border-purple-200 rounded-sm shadow-md p-4 text-[11px] text-slate-800 space-y-3 font-sans max-h-[85vh] overflow-y-auto">
                          {/* Tax Invoice Header */}
                          <div className="text-center font-bold text-xs uppercase tracking-wide border-b-2 border-[#33077C] pb-1 text-[#33077C]">
                            Tax Invoice
                          </div>

                          {/* Company Header Block */}
                          <div className="flex items-start justify-between border-b border-slate-300 pb-2">
                            <div className="flex items-center gap-2.5">
                              {printCompanyLogo && (
                                <div className="w-12 h-12 bg-purple-50 border border-purple-200 flex items-center justify-center text-[10px] text-[#33077C] font-bold rounded">
                                  Logo
                                </div>
                              )}
                              <div>
                                <h4 className="font-bold text-sm text-slate-900 leading-tight">
                                  {printCompanyName || 'My Company'}
                                </h4>
                                {printPhone && (
                                  <p className="text-[11px] text-slate-600 mt-0.5">Phone: {printPhoneValue}</p>
                                )}
                                {printEmail && printEmailValue && (
                                  <p className="text-[11px] text-slate-600">Email: {printEmailValue}</p>
                                )}
                                {printAddress && printAddressValue && (
                                  <p className="text-[11px] text-slate-600">{printAddressValue}</p>
                                )}
                                {printGstin && printGstinValue && (
                                  <p className="text-[11px] text-slate-600">GSTIN: {printGstinValue}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right text-[10.5px] space-y-0.5 text-slate-600">
                              <div><span className="font-semibold text-slate-800">Invoice No:</span> INV-101</div>
                              <div><span className="font-semibold text-slate-800">Date:</span> 24-11-2026</div>
                              <div><span className="font-semibold text-slate-800">Time:</span> 12:30 PM</div>
                              <div><span className="font-semibold text-slate-800">Due Date:</span> 15-12-2026</div>
                            </div>
                          </div>

                          {/* Bill To & Ship To */}
                          <div className="grid grid-cols-2 gap-2 border-b border-slate-300 pb-2 text-[10.5px]">
                            <div className="pr-1 border-r border-slate-200">
                              <span className="font-bold text-[#33077C] block mb-0.5">Bill To:</span>
                              <div className="font-semibold text-slate-800">Classic Enterprises</div>
                              <div className="text-slate-500">Plot No. 1, Shop No. 4, Koramangala</div>
                              <div className="text-slate-500">Bangalore, Karnataka, 560034</div>
                              <div className="text-slate-500">Contact: 9876543210</div>
                            </div>
                            <div className="pl-1">
                              <span className="font-bold text-[#33077C] block mb-0.5">Ship To:</span>
                              <div className="font-semibold text-slate-800">Mahita Textiles</div>
                              <div className="text-slate-500">Marathahalli Road, Bangalore</div>
                              <div className="text-slate-500">Karnataka, 560037</div>
                            </div>
                          </div>

                          {/* Item Table Grid */}
                          <div className="border border-purple-200 rounded-xs overflow-hidden">
                            <table className="w-full text-left text-[10px] border-collapse">
                              <thead>
                                <tr className="bg-[#33077C]/10 border-b border-purple-200 font-bold text-[#33077C]">
                                  <th className="p-1 border-r border-purple-200 w-6 text-center">#</th>
                                  <th className="p-1 border-r border-purple-200">Item Name</th>
                                  <th className="p-1 border-r border-purple-200 text-center">HSN</th>
                                  <th className="p-1 border-r border-purple-200 text-center">Qty</th>
                                  <th className="p-1 border-r border-purple-200 text-right">Price</th>
                                  <th className="p-1 border-r border-purple-200 text-right">Discount</th>
                                  <th className="p-1 border-r border-purple-200 text-right">GST</th>
                                  <th className="p-1 text-right">Amount</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-purple-100">
                                <tr>
                                  <td className="p-1 border-r border-purple-100 text-center">1</td>
                                  <td className="p-1 border-r border-purple-100 font-medium">Cotton Fabric A-Grade</td>
                                  <td className="p-1 border-r border-purple-100 text-center font-mono">5208</td>
                                  <td className="p-1 border-r border-purple-100 text-center">10 m</td>
                                  <td className="p-1 border-r border-purple-100 text-right">50.00</td>
                                  <td className="p-1 border-r border-purple-100 text-right">0.00</td>
                                  <td className="p-1 border-r border-purple-100 text-right">5% (25.00)</td>
                                  <td className="p-1 text-right font-semibold">525.00</td>
                                </tr>
                                <tr>
                                  <td className="p-1 border-r border-purple-100 text-center">2</td>
                                  <td className="p-1 border-r border-purple-100 font-medium">Silk Embroidery Thread</td>
                                  <td className="p-1 border-r border-purple-100 text-center font-mono">5004</td>
                                  <td className="p-1 border-r border-purple-100 text-center">5 rolls</td>
                                  <td className="p-1 border-r border-purple-100 text-right">80.00</td>
                                  <td className="p-1 border-r border-purple-100 text-right">5% (20.00)</td>
                                  <td className="p-1 border-r border-purple-100 text-right">12% (45.60)</td>
                                  <td className="p-1 text-right font-semibold">425.60</td>
                                </tr>
                              </tbody>
                              <tfoot>
                                <tr className="bg-purple-50/50 border-t border-purple-200 font-bold text-slate-800">
                                  <td colSpan={3} className="p-1 text-right">Total:</td>
                                  <td className="p-1 text-center">15</td>
                                  <td colSpan={3} className="p-1 text-right">Taxable: 880.00</td>
                                  <td className="p-1 text-right font-bold text-[#33077C]">₹950.60</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>

                          {/* Taxes Breakdown & Summary */}
                          <div className="grid grid-cols-2 gap-2 border border-slate-300 rounded-xs p-2 text-[10px]">
                            <div>
                              <span className="font-bold text-slate-900 block mb-0.5">Tax Details:</span>
                              <div className="text-slate-600">CGST (2.5%): ₹12.50</div>
                              <div className="text-slate-600">SGST (2.5%): ₹12.50</div>
                              <div className="text-slate-600">IGST (12%): ₹45.60</div>
                              {youSaved && (
                                <div className="text-emerald-700 font-semibold mt-1">You Saved: ₹20.00</div>
                              )}
                            </div>
                            <div className="text-right space-y-0.5">
                              <div><span className="text-slate-600">Sub Total:</span> ₹880.00</div>
                              <div><span className="text-slate-600">Total Tax:</span> ₹70.60</div>
                              <div className="font-bold text-[#33077C] text-xs border-t border-purple-200 pt-0.5">
                                Invoice Total: ₹950.60
                              </div>
                              {receivedAmount && (
                                <div className="text-emerald-600 font-medium">Received: ₹500.00</div>
                              )}
                              {balanceAmount && (
                                <div className="text-rose-600 font-medium">Balance: ₹450.60</div>
                              )}
                            </div>
                          </div>

                          {/* Amount in Words */}
                          <div className="border border-purple-100 bg-purple-50/30 p-1.5 text-[10px] text-slate-700">
                            <span className="font-bold text-[#33077C]">Invoice Amount In Words:</span> Nine Hundred Fifty Rupees and Sixty Paise only
                          </div>

                          {/* Footer & Signature */}
                          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-300 text-[10px]">
                            <div>
                              {printTermsConditions && (
                                <div className="mb-1">
                                  <span className="font-bold block">Terms & Conditions:</span>
                                  <span className="text-slate-500">1. Goods once sold will not be taken back.</span>
                                </div>
                              )}
                              {printDescription && (
                                <div>
                                  <span className="font-bold block">Bank Details:</span>
                                  <span className="text-slate-500 block">Bank Name: HDFC Bank</span>
                                  <span className="text-slate-500 block">A/C: 123456789012</span>
                                  <span className="text-slate-500 block">IFSC: HDFC0001234</span>
                                </div>
                              )}
                            </div>

                            <div className="text-right flex flex-col justify-between items-end">
                              <span className="font-bold text-[#33077C]">For: {printCompanyName || 'My Company'}</span>
                              <div className="pt-6 border-t border-slate-300 w-32 text-center text-slate-500">
                                {signatureText || 'Authorized Signatory'}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* GST Theme 1 Layout (Clean government GST compliant table matching user uploaded image) */}
                      {selectedInvoiceTemplate === 'gst_theme_1' && (
                        <div className="bg-white border-2 border-slate-300 rounded-sm shadow-md p-4 text-[11px] text-slate-800 space-y-3 font-sans max-h-[85vh] overflow-y-auto">
                          {/* Centered GST Tax Invoice Title */}
                          <div className="text-center font-bold text-xs uppercase tracking-wide border-b border-slate-300 pb-1 text-slate-900">
                            TAX INVOICE
                          </div>

                          {/* Company Header Block */}
                          <div className="flex items-start justify-between border-b border-slate-300 pb-2">
                            <div className="flex items-center gap-2.5">
                              {printCompanyLogo && (
                                <div className="w-12 h-12 bg-slate-100 border border-slate-300 flex items-center justify-center text-[10px] text-slate-400 font-semibold">
                                  Logo
                                </div>
                              )}
                              <div>
                                <h4 className="font-bold text-sm text-slate-900 leading-tight">
                                  {printCompanyName || 'My Company'}
                                </h4>
                                {printPhone && (
                                  <p className="text-[11px] text-slate-600 mt-0.5">Phone: {printPhoneValue}</p>
                                )}
                                {printEmail && printEmailValue && (
                                  <p className="text-[11px] text-slate-600">Email: {printEmailValue}</p>
                                )}
                                {printAddress && printAddressValue && (
                                  <p className="text-[11px] text-slate-600">{printAddressValue}</p>
                                )}
                                {printGstin && printGstinValue && (
                                  <p className="text-[11px] text-slate-600">GSTIN: {printGstinValue}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right text-[10.5px] space-y-0.5 text-slate-600">
                              <div><span className="font-semibold text-slate-800">Invoice No:</span> INV-101</div>
                              <div><span className="font-semibold text-slate-800">Date:</span> 24-11-2026</div>
                              <div><span className="font-semibold text-slate-800">Time:</span> 12:30 PM</div>
                              <div><span className="font-semibold text-slate-800">Due Date:</span> 15-12-2026</div>
                            </div>
                          </div>

                          {/* Bill To & Ship To */}
                          <div className="grid grid-cols-2 gap-2 border-b border-slate-300 pb-2 text-[10.5px]">
                            <div className="pr-1 border-r border-slate-200">
                              <span className="font-bold text-slate-900 block mb-0.5">Bill To:</span>
                              <div className="font-semibold text-slate-800">Classic Enterprises</div>
                              <div className="text-slate-500">Plot No. 1, Shop No. 4, Koramangala</div>
                              <div className="text-slate-500">Bangalore, Karnataka, 560034</div>
                              <div className="text-slate-500">Contact: 9876543210</div>
                            </div>
                            <div className="pl-1">
                              <span className="font-bold text-slate-900 block mb-0.5">Ship To:</span>
                              <div className="font-semibold text-slate-800">Mahita Textiles</div>
                              <div className="text-slate-500">Marathahalli Road, Bangalore</div>
                              <div className="text-slate-500">Karnataka, 560037</div>
                            </div>
                          </div>

                          {/* Item Table Grid */}
                          <div className="border border-slate-300 rounded-xs overflow-hidden">
                            <table className="w-full text-left text-[10px] border-collapse">
                              <thead>
                                <tr className="bg-slate-100/90 border-b border-slate-300 font-bold text-slate-800">
                                  <th className="p-1 border-r border-slate-200 w-6 text-center">#</th>
                                  <th className="p-1 border-r border-slate-200">Item Name</th>
                                  <th className="p-1 border-r border-slate-200 text-center">HSN</th>
                                  <th className="p-1 border-r border-slate-200 text-center">Qty</th>
                                  <th className="p-1 border-r border-slate-200 text-right">Price</th>
                                  <th className="p-1 border-r border-slate-200 text-right">Discount</th>
                                  <th className="p-1 border-r border-slate-200 text-right">GST</th>
                                  <th className="p-1 text-right">Amount</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                <tr>
                                  <td className="p-1 border-r border-slate-200 text-center">1</td>
                                  <td className="p-1 border-r border-slate-200 font-medium">Cotton Fabric A-Grade</td>
                                  <td className="p-1 border-r border-slate-200 text-center font-mono">5208</td>
                                  <td className="p-1 border-r border-slate-200 text-center">10 m</td>
                                  <td className="p-1 border-r border-slate-200 text-right">50.00</td>
                                  <td className="p-1 border-r border-slate-200 text-right">0.00</td>
                                  <td className="p-1 border-r border-slate-200 text-right">5% (25.00)</td>
                                  <td className="p-1 text-right font-semibold">525.00</td>
                                </tr>
                                <tr>
                                  <td className="p-1 border-r border-slate-200 text-center">2</td>
                                  <td className="p-1 border-r border-slate-200 font-medium">Silk Embroidery Thread</td>
                                  <td className="p-1 border-r border-slate-200 text-center font-mono">5004</td>
                                  <td className="p-1 border-r border-slate-200 text-center">5 rolls</td>
                                  <td className="p-1 border-r border-slate-200 text-right">80.00</td>
                                  <td className="p-1 border-r border-slate-200 text-right">5% (20.00)</td>
                                  <td className="p-1 border-r border-slate-200 text-right">12% (45.60)</td>
                                  <td className="p-1 text-right font-semibold">425.60</td>
                                </tr>
                              </tbody>
                              <tfoot>
                                <tr className="bg-slate-50 border-t border-slate-300 font-bold text-slate-800">
                                  <td colSpan={3} className="p-1 text-right">Total:</td>
                                  <td className="p-1 text-center">15</td>
                                  <td colSpan={3} className="p-1 text-right">Taxable: 880.00</td>
                                  <td className="p-1 text-right font-bold text-slate-900">₹950.60</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>

                          {/* Taxes Breakdown & Summary */}
                          <div className="grid grid-cols-2 gap-2 border border-slate-300 rounded-xs p-2 text-[10px]">
                            <div>
                              <span className="font-bold text-slate-900 block mb-0.5">Tax Details:</span>
                              <div className="text-slate-600">CGST (2.5%): ₹12.50</div>
                              <div className="text-slate-600">SGST (2.5%): ₹12.50</div>
                              <div className="text-slate-600">IGST (12%): ₹45.60</div>
                              {youSaved && (
                                <div className="text-emerald-700 font-semibold mt-1">You Saved: ₹20.00</div>
                              )}
                            </div>
                            <div className="text-right space-y-0.5">
                              <div><span className="text-slate-600">Sub Total:</span> ₹880.00</div>
                              <div><span className="text-slate-600">Total Tax:</span> ₹70.60</div>
                              <div className="font-bold text-slate-900 text-xs border-t border-slate-200 pt-0.5">
                                Invoice Total: ₹950.60
                              </div>
                              {receivedAmount && (
                                <div className="text-emerald-600 font-medium">Received: ₹500.00</div>
                              )}
                              {balanceAmount && (
                                <div className="text-rose-600 font-medium">Balance: ₹450.60</div>
                              )}
                            </div>
                          </div>

                          {/* Amount in Words */}
                          <div className="border border-slate-200 bg-slate-50 p-1.5 text-[10px] text-slate-700">
                            <span className="font-bold">Invoice Amount In Words:</span> Nine Hundred Fifty Rupees and Sixty Paise only
                          </div>

                          {/* Footer & Signature */}
                          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-300 text-[10px]">
                            <div>
                              {printTermsConditions && (
                                <div className="mb-1">
                                  <span className="font-bold block">Terms & Conditions:</span>
                                  <span className="text-slate-500">1. Goods once sold will not be taken back.</span>
                                </div>
                              )}
                              {printDescription && (
                                <div>
                                  <span className="font-bold block">Bank Details:</span>
                                  <span className="text-slate-500 block">Bank Name: HDFC Bank</span>
                                  <span className="text-slate-500 block">A/C: 123456789012</span>
                                  <span className="text-slate-500 block">IFSC: HDFC0001234</span>
                                </div>
                              )}
                            </div>

                            <div className="text-right flex flex-col justify-between items-end">
                              <span className="font-bold">For: {printCompanyName || 'My Company'}</span>
                              <div className="pt-6 border-t border-slate-300 w-32 text-center text-slate-500">
                                {signatureText || 'Authorized Signatory'}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 8. NUMBERING & PREFIX TAB */}
              {superAdminTab === 'numbering_prefix' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      Transaction Prefixes
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Set custom prefixes and starting sequence counters for financial documents and transaction types.
                    </p>
                  </div>

                  <div className="bg-white rounded-[4px] border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-5">
                    {/* Transaction Rows Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 pt-1">
                      {[
                        { key: 'invoice', label: 'Invoice' },
                        { key: 'proforma', label: 'Proforma' },
                        { key: 'payment', label: 'Payment' },
                        { key: 'quotation', label: 'Quotation' },
                      ].map((item) => {
                        const current = transactionPrefixes[item.key] || { prefix: 'None', nextNumber: '1001' };
                        const isOpen = openPrefixDropdown === item.key;

                        const filteredOpts = prefixOptions.filter((opt) =>
                          opt.toLowerCase().includes(newCustomPrefix.toLowerCase().trim())
                        );

                        return (
                          <div key={item.key} className="space-y-1.5">
                            {/* Standard Top Label matching reference image typography */}
                            <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                              {item.label}
                            </label>

                            <div className="flex items-center gap-3">
                              {/* Left: Prefix Selector matching reference image */}
                              <div className="relative flex-1 max-w-[260px] sm:max-w-[280px]">
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

                                {/* Dropdown matching reference images */}
                                {isOpen && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-30"
                                      onClick={() => setOpenPrefixDropdown(null)}
                                    />
                                    <div className="absolute left-0 top-full mt-1.5 z-40 w-full min-w-full bg-white rounded-[4px] shadow-xl shadow-slate-900/10 border border-slate-200/90 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                                      {/* Options List */}
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
                                                className={`w-full px-3 py-1.5 rounded-[4px] flex items-center justify-between text-[12.5px] tracking-normal transition-colors cursor-pointer ${isSelected
                                                  ? 'bg-slate-100 text-slate-900 font-bold'
                                                  : 'text-slate-800 font-semibold hover:bg-slate-50 hover:text-slate-900'
                                                  }`}
                                              >
                                                <span className="truncate">{opt}</span>
                                              </div>
                                            );
                                          })}
                                      </div>

                                      {/* Bottom Add Prefix Input + ADD button */}
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

                              {/* Right: Next Number Input */}
                              <div className="w-32 sm:w-36">
                                <input
                                  type="text"
                                  placeholder="0001"
                                  value={current.nextNumber}
                                  onChange={(e) =>
                                    setTransactionPrefixes({
                                      ...transactionPrefixes,
                                      [item.key]: { ...current, nextNumber: e.target.value },
                                    })
                                  }
                                  className="w-full h-11 px-4 bg-white rounded-[4px] border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 outline-none text-xs sm:text-[13px] font-medium text-slate-800 font-mono transition-all"
                                />
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-emerald-600" />
                        WhatsApp Cloud & Business API Integration
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Configure automated messaging for invoices, payment receipts, and balance reminders.
                      </p>
                    </div>

                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${whatsappEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}>
                      <span className={`w-2 h-2 rounded-full ${whatsappEnabled ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'}`} />
                      {whatsappEnabled ? 'Service Active' : 'Disabled'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs sm:text-[13px] font-medium text-slate-600 mb-1.5">
                        API Provider
                      </label>
                      <select
                        value={whatsappProvider}
                        onChange={(e) => setWhatsappProvider(e.target.value)}
                        className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] transition-all cursor-pointer"
                      >
                        <option value="meta_cloud">Meta Cloud API (Official)</option>
                        <option value="wati">Wati.io</option>
                        <option value="interakt">Interakt.shop</option>
                        <option value="aisensy">AiSensy</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-[13px] font-medium text-slate-600 mb-1.5">
                        Phone Number ID
                      </label>
                      <input
                        type="text"
                        value={whatsappPhoneNumberId}
                        onChange={(e) => setWhatsappPhoneNumberId(e.target.value)}
                        className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] transition-all font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-[13px] font-medium text-slate-600 mb-1.5">
                        WhatsApp Business Account ID (WABA)
                      </label>
                      <input
                        type="text"
                        value={whatsappBusinessAccountId}
                        onChange={(e) => setWhatsappBusinessAccountId(e.target.value)}
                        className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] transition-all font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-[13px] font-medium text-slate-600 mb-1.5">
                        Permanent Access Token
                      </label>
                      <input
                        type="password"
                        value={whatsappAccessToken}
                        onChange={(e) => setWhatsappAccessToken(e.target.value)}
                        className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* Automated Triggers */}
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Automated Notification Triggers</h4>
                    <div className="space-y-2.5">
                      <label className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer">
                        <span className="text-xs font-semibold text-slate-800">Auto-send PDF when Invoice is finalized</span>
                        <input
                          type="checkbox"
                          checked={whatsappAutoSendInvoice}
                          onChange={(e) => setWhatsappAutoSendInvoice(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                      </label>
                      <label className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer">
                        <span className="text-xs font-semibold text-slate-800">Auto-send confirmation on Payment Receipt</span>
                        <input
                          type="checkbox"
                          checked={whatsappAutoSendReceipt}
                          onChange={(e) => setWhatsappAutoSendReceipt(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                      </label>
                      <label className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer">
                        <span className="text-xs font-semibold text-slate-800">Send reminder alerts before payment due date</span>
                        <input
                          type="checkbox"
                          checked={whatsappAutoSendReminder}
                          onChange={(e) => setWhatsappAutoSendReminder(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* 10. INTEGRATIONS TAB */}
              {superAdminTab === 'integrations' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Share2 className="w-5 h-5 text-[#33077C]" />
                      Connected Services & Gateways
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Connect email dispatchers, payment gateway accounts, SMS relays, and webhooks.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Email Relay */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                          <Mail className="w-4 h-4 text-[#33077C]" />
                          Email Dispatcher (SMTP)
                        </span>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Connected</span>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div>
                          <label className="text-[11px] text-slate-500 font-semibold block mb-1">Host Server</label>
                          <input
                            type="text"
                            value={smtpHost}
                            onChange={(e) => setSmtpHost(e.target.value)}
                            className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs font-mono"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] text-slate-500 font-semibold block mb-1">Port</label>
                            <input
                              type="text"
                              value={smtpPort}
                              onChange={(e) => setSmtpPort(e.target.value)}
                              className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-500 font-semibold block mb-1">Username</label>
                            <input
                              type="text"
                              value={smtpUser}
                              onChange={(e) => setSmtpUser(e.target.value)}
                              className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Payment Gateway */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-[#33077C]" />
                          Payment Gateway (Razorpay)
                        </span>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Live Mode</span>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div>
                          <label className="text-[11px] text-slate-500 font-semibold block mb-1">Gateway Provider</label>
                          <select
                            value={paymentGateway}
                            onChange={(e) => setPaymentGateway(e.target.value)}
                            className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
                          >
                            <option value="razorpay">Razorpay (Cards, UPI, Netbanking)</option>
                            <option value="stripe">Stripe</option>
                            <option value="phonepe">PhonePe Payment Gateway</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 font-semibold block mb-1">Key ID / Publishable Key</label>
                          <input
                            type="text"
                            value={razorpayKeyId}
                            onChange={(e) => setRazorpayKeyId(e.target.value)}
                            className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 11. SECURITY TAB */}
              {superAdminTab === 'security' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-[#33077C]" />
                      Enterprise Security & Authentication Policies
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure session durations, login attempt throttling, and IP access restrictions.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs sm:text-[13px] font-medium text-slate-600 mb-1.5">
                        Session Inactivity Timeout (Minutes)
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={720}
                        value={sessionTimeoutMinutes}
                        onChange={(e) => setSessionTimeoutMinutes(Number(e.target.value))}
                        className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-[13px] font-medium text-slate-600 mb-1.5">
                        Max Failed Login Attempts Before Lockout
                      </label>
                      <input
                        type="number"
                        min={3}
                        max={15}
                        value={maxLoginAttempts}
                        onChange={(e) => setMaxLoginAttempts(Number(e.target.value))}
                        className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] transition-all"
                      />
                    </div>

                    <div className="md:col-span-2 p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xs sm:text-[13px] font-bold text-slate-900">Enforce Strong Password Policy</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Require uppercase, lowercase, numbers, symbols and minimum 8 characters for all users.
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={enforcePasswordPolicy}
                        onClick={() => setEnforcePasswordPolicy(!enforcePasswordPolicy)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${enforcePasswordPolicy ? 'bg-[#33077C]' : 'bg-slate-300'
                          }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${enforcePasswordPolicy ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                      </button>
                    </div>

                    <div className="md:col-span-2 p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs sm:text-[13px] font-bold text-slate-900">IP Whitelist Access Control</h4>
                          <p className="text-xs text-slate-500 mt-0.5">Restrict admin login only to designated office/VPN IP addresses.</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={ipWhitelistEnabled}
                          onClick={() => setIpWhitelistEnabled(!ipWhitelistEnabled)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${ipWhitelistEnabled ? 'bg-[#33077C]' : 'bg-slate-300'
                            }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${ipWhitelistEnabled ? 'translate-x-5' : 'translate-x-0'
                              }`}
                          />
                        </button>
                      </div>
                      {ipWhitelistEnabled && (
                        <input
                          type="text"
                          value={whitelistedIps}
                          onChange={(e) => setWhitelistedIps(e.target.value)}
                          placeholder="e.g. 192.168.1.1, 10.0.0.1"
                          className="w-full h-10 px-3 border border-slate-200 rounded-lg text-xs font-mono"
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 12. ACTIVITY LOGS TAB */}
              {superAdminTab === 'activity_logs' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <History className="w-5 h-5 text-[#33077C]" />
                      Audit Trail & Activity Logs
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Real-time immutable log of administrative actions, user logins, and critical system events.
                    </p>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-[11px] uppercase tracking-wider">
                          <th className="py-3 px-4">Timestamp</th>
                          <th className="py-3 px-4">User</th>
                          <th className="py-3 px-4">Action</th>
                          <th className="py-3 px-4">Module / Target</th>
                          <th className="py-3 px-4">IP Address</th>
                          <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-700 font-medium">
                        {[
                          { time: '2026-11-23 15:02:18', user: 'superadmin@gmail.com', action: 'Update Settings', module: 'System / Theme', ip: '103.24.182.10', status: 'Success' },
                          { time: '2026-11-23 14:48:42', user: 'orgadmin@yaa.com', action: 'Generate Invoice', module: 'Sale Mgmt / Invoices', ip: '115.99.231.54', status: 'Success' },
                          { time: '2026-11-23 14:15:10', user: 'admin@apexgroup.com', action: 'Update Role Matrix', module: 'Settings / Permissions', ip: '103.24.182.10', status: 'Success' },
                          { time: '2026-11-23 13:30:05', user: 'sarah.m@platform.com', action: 'Export Snapshot', module: 'Settings / Backup', ip: '49.207.198.88', status: 'Success' },
                          { time: '2026-11-23 11:10:49', user: 'john.doe@client.com', action: 'Failed Auth Attempt', module: 'Auth / OTP Verification', ip: '182.73.45.12', status: 'Blocked' },
                        ].map((log, i) => (
                          <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{log.time}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{log.user}</td>
                            <td className="py-3 px-4 font-semibold text-slate-800">{log.action}</td>
                            <td className="py-3 px-4 text-slate-600">{log.module}</td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{log.ip}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${log.status === 'Success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
