import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  Plus,
  Search,
  Calendar,
  CreditCard,
  MoreVertical,
  X,
  Check,
  FileText,
  ChevronDown,
  Pencil,
  Printer,
  Trash2,
  Eye,
  IndianRupee,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  Forward,
  Camera,
  User,
  RotateCcw,
} from "lucide-react";
import {
  useSalesManagementStore,
  SalePaymentIn,
  PaymentInType,
  SalesCustomer,
} from "../../../store/useSalesManagementStore";
import { Button } from "../../../components/common/Button";
import { Modal } from "../../../components/common/Modal";
import { Pagination } from "../../../components/common/Pagination";
import { SearchBar } from "../../../components/common/SearchBar";
import { FilterDropdown } from "../../../components/common/FilterDropdown";
import { exportTableToExcel } from "../../../utils/excelExport";
import { toast } from "sonner";

// Helper for DD/MM/YYYY <-> YYYY-MM-DD
const isoToDdmmyyyy = (iso?: string): string => {
  if (!iso) return "";
  const cleanDate = iso.split("T")[0];
  const parts = cleanDate.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return iso;
};

// Convert number to Indian currency words
function numberToWords(num: number): string {
  if (!num || isNaN(num)) return "Zero Rupees Only";
  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const inWords = (n: number): string => {
    if (n === 0) return "";
    if (n < 20) return a[n] + " ";
    if (n < 100)
      return (
        b[Math.floor(n / 10)] + " " + (n % 10 !== 0 ? a[n % 10] + " " : "")
      );
    if (n < 1000)
      return (
        a[Math.floor(n / 100)] +
        " Hundred " +
        (n % 100 !== 0 ? inWords(n % 100) : "")
      );
    if (n < 100000)
      return (
        inWords(Math.floor(n / 1000)) +
        "Thousand " +
        (n % 1000 !== 0 ? inWords(n % 1000) : "")
      );
    if (n < 10000000)
      return (
        inWords(Math.floor(n / 100000)) +
        "Lakh " +
        (n % 100000 !== 0 ? inWords(n % 100000) : "")
      );
    return (
      inWords(Math.floor(n / 10000000)) +
      "Crore " +
      (n % 10000000 !== 0 ? inWords(n % 10000000) : "")
    );
  };

  const str = inWords(Math.floor(num)).trim();
  return `${str} Rupees Only`;
}

// Default payment type options
const DEFAULT_PAYMENT_TYPES: PaymentInType[] = [
  "Cash",
  "Bank Transfer",
  "Cheque",
  "UPI",
  "Credit Card",
  "Debit Card",
  "Online Payment",
  "PayTM",
  "Google Pay",
  "PhonePe",
];

// Quick Date Range Presets
const PERIOD_OPTIONS = [
  { label: "This Month", value: "This Month" },
  { label: "Today", value: "Today" },
  { label: "Yesterday", value: "Yesterday" },
  { label: "This Week", value: "This Week" },
  { label: "Last Month", value: "Last Month" },
  { label: "This Quarter", value: "This Quarter" },
  { label: "This Year", value: "This Year" },
  { label: "All Time", value: "All Time" },
];

export const PaymentInView: React.FC = () => {
  const {
    customers,
    paymentIns = [],
    savePaymentIn,
    deletePaymentIn,
    saveCustomer,
  } = useSalesManagementStore();

  // Filter States
  const [selectedPeriod, setSelectedPeriod] = useState<string>("This Month");
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return start.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return end.toISOString().split("T")[0];
  });
  const [selectedFirm, setSelectedFirm] = useState<string>("All");
  const [selectedPaymentType, setSelectedPaymentType] = useState<string>("All");
  const [pendingSearch, setPendingSearch] = useState<string>("");
  const [appliedSearch, setAppliedSearch] = useState<string>("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPaymentIn, setEditingPaymentIn] =
    useState<SalePaymentIn | null>(null);
  const [isViewReceiptModalOpen, setIsViewReceiptModalOpen] = useState(false);
  const [selectedPaymentIn, setSelectedPaymentIn] =
    useState<SalePaymentIn | null>(null);

  // Quick Customer Modal
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerCompany, setNewCustomerCompany] = useState("");

  // Custom Payment Types list
  const [availablePaymentTypes, setAvailablePaymentTypes] = useState<string[]>(
    () => {
      const saved = localStorage.getItem("yaa_crm_custom_payment_types");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
      return DEFAULT_PAYMENT_TYPES;
    },
  );
  const [isAddPaymentTypeOpen, setIsAddPaymentTypeOpen] = useState(false);
  const [newPaymentTypeName, setNewPaymentTypeName] = useState("");

  // Form State for Create / Edit Modal
  const [formPartySearchOpen, setFormPartySearchOpen] = useState(false);
  const [formPartyQuery, setFormPartyQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedCustomerObj, setSelectedCustomerObj] =
    useState<SalesCustomer | null>(null);
  const [formPaymentType, setFormPaymentType] = useState<PaymentInType>("Cash");
  const [formReceiptNo, setFormReceiptNo] = useState("");
  const [formDate, setFormDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [formReceivedAmount, setFormReceivedAmount] = useState("");
  const [formReferenceNo, setFormReferenceNo] = useState("");
  const [formStatus, setFormStatus] = useState<
    "Received" | "Cleared" | "In Process"
  >("Received");
  const [formDescription, setFormDescription] = useState("");
  const [imageAttachment, setImageAttachment] = useState<string | null>(null);

  // 3-Dots Action Dropdown & Share Dropdown & History State
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);
  const [activeShareDropdownId, setActiveShareDropdownId] = useState<
    string | null
  >(null);
  const [shareDropdownPos, setShareDropdownPos] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);
  const [historyPaymentIn, setHistoryPaymentIn] =
    useState<SalePaymentIn | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const partySelectDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click or scroll
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest(".payment-in-dropdown-container") &&
        !target.closest(".payment-in-dropdown-menu")
      ) {
        setActiveDropdownId(null);
        setDropdownPos(null);
      }
      if (
        !target.closest(".payment-in-share-dropdown-container") &&
        !target.closest(".payment-in-share-dropdown-menu")
      ) {
        setActiveShareDropdownId(null);
        setShareDropdownPos(null);
      }
      if (
        partySelectDropdownRef.current &&
        !partySelectDropdownRef.current.contains(target)
      ) {
        setFormPartySearchOpen(false);
      }
    };
    const handleScroll = () => {
      setActiveDropdownId(null);
      setDropdownPos(null);
      setActiveShareDropdownId(null);
      setShareDropdownPos(null);
    };
    document.addEventListener("mousedown", handleOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  // Update date ranges when period changes
  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    const now = new Date();
    if (period === "This Month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(start.toISOString().split("T")[0]);
      setEndDate(end.toISOString().split("T")[0]);
    } else if (period === "Today") {
      const today = now.toISOString().split("T")[0];
      setStartDate(today);
      setEndDate(today);
    } else if (period === "Yesterday") {
      const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const yStr = y.toISOString().split("T")[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (period === "This Week") {
      const curr = new Date();
      const day = curr.getDay();
      const diffToMonday = curr.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(curr.getFullYear(), curr.getMonth(), diffToMonday);
      const sun = new Date(
        mon.getFullYear(),
        mon.getMonth(),
        mon.getDate() + 6,
      );
      setStartDate(mon.toISOString().split("T")[0]);
      setEndDate(sun.toISOString().split("T")[0]);
    } else if (period === "Last Month") {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(start.toISOString().split("T")[0]);
      setEndDate(end.toISOString().split("T")[0]);
    } else if (period === "This Quarter") {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), qMonth, 1);
      const end = new Date(now.getFullYear(), qMonth + 3, 0);
      setStartDate(start.toISOString().split("T")[0]);
      setEndDate(end.toISOString().split("T")[0]);
    } else if (period === "This Year") {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      setStartDate(start.toISOString().split("T")[0]);
      setEndDate(end.toISOString().split("T")[0]);
    } else if (period === "All Time") {
      setStartDate("2020-01-01");
      setEndDate("2030-12-31");
    }
  };

  // Calculate Next Receipt Number
  const getNextReceiptNo = useCallback((): string => {
    if (paymentIns.length === 0) return "1";
    const numbers = paymentIns
      .map((p) => {
        const num = parseInt(p.receiptNo.replace(/\D/g, ""), 10);
        return isNaN(num) ? 0 : num;
      })
      .filter((n) => n > 0);
    const max = numbers.length > 0 ? Math.max(...numbers) : 0;
    return String(max + 1);
  }, [paymentIns]);

  // Open Create Modal
  const handleOpenCreateModal = (customer?: SalesCustomer) => {
    setEditingPaymentIn(null);
    setSelectedCustomerId(customer?.id || "");
    setSelectedCustomerObj(customer || null);
    setFormPartyQuery(customer ? customer.name : "");
    setFormPaymentType("Cash");
    setFormReceiptNo(getNextReceiptNo());
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormReceivedAmount("");
    setFormReferenceNo("");
    setFormStatus("Received");
    setFormDescription("");
    setImageAttachment(null);
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: SalePaymentIn) => {
    setEditingPaymentIn(item);
    setSelectedCustomerId(item.customerId || "");
    const foundCust = customers.find(
      (c) =>
        c.id === item.customerId ||
        c.name.toLowerCase() === item.partyName.toLowerCase(),
    );
    setSelectedCustomerObj(foundCust || null);
    setFormPartyQuery(item.partyName);
    setFormPaymentType(item.paymentType);
    setFormReceiptNo(item.receiptNo);
    setFormDate(item.date ? item.date.split("T")[0] : new Date().toISOString().split("T")[0]);
    setFormReceivedAmount(String(item.receivedAmount));
    setFormReferenceNo(item.referenceNo || "");
    setFormStatus((item.status as any) || "Received");
    setFormDescription(item.description || "");
    setImageAttachment(item.imageAttachment || null);
    setIsCreateModalOpen(true);
  };

  // Filtered Customer Candidates for Modal Dropdown
  const filteredCustomerCandidates = useMemo(() => {
    const q = formPartyQuery.toLowerCase().trim();
    if (!q) return customers.slice(0, 15);
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.company && c.company.toLowerCase().includes(q)),
    );
  }, [customers, formPartyQuery]);

  // Handle Create Quick Customer
  const handleCreateQuickCustomer = () => {
    if (!newCustomerName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    const newCust: SalesCustomer = {
      id: `cust_${Date.now()}`,
      customerCode: `CUS-${Math.floor(1000 + Math.random() * 9000)}`,
      name: newCustomerName.trim(),
      phone: newCustomerPhone.trim() || "N/A",
      email: "",
      company: newCustomerCompany.trim() || "",
      customerType: "Business",
      status: "Active",
      creditLimit: 50000,
      paymentTerms: "Net 15 Days",
      openingBalance: 0,
      preferredPaymentMethod: "Cash",
      address: "",
      billingAddress: "",
      shippingAddress: "",
      sameAsBilling: true,
      city: "Chennai",
      state: "Tamil Nadu",
      country: "India",
      pincode: "600001",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveCustomer(newCust);
    setSelectedCustomerId(newCust.id);
    setSelectedCustomerObj(newCust);
    setFormPartyQuery(newCust.name);
    setIsQuickCustomerOpen(false);
    setNewCustomerName("");
    setNewCustomerPhone("");
    setNewCustomerCompany("");
    toast.success(`Party "${newCust.name}" added successfully`);
  };

  // Handle Add Custom Payment Type
  const handleAddPaymentType = () => {
    if (!newPaymentTypeName.trim()) {
      toast.error("Payment type name is required");
      return;
    }
    const formatted = newPaymentTypeName.trim();
    if (availablePaymentTypes.includes(formatted)) {
      toast.error("Payment type already exists");
      return;
    }
    const updated = [...availablePaymentTypes, formatted];
    setAvailablePaymentTypes(updated);
    localStorage.setItem(
      "yaa_crm_custom_payment_types",
      JSON.stringify(updated),
    );
    setFormPaymentType(formatted as PaymentInType);
    setIsAddPaymentTypeOpen(false);
    setNewPaymentTypeName("");
    toast.success(`Payment type "${formatted}" added`);
  };

  // Handle Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageAttachment(reader.result as string);
      toast.success("Receipt image attached");
    };
    reader.readAsDataURL(file);
  };

  // Print Receipt Slip
  const handlePrintReceipt = useCallback((item: SalePaymentIn) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocked. Please allow popups for this site.");
      return;
    }
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Receipt #${item.receiptNo}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
          body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            padding: 40px;
            color: #1e293b;
            max-width: 650px;
            margin: auto;
          }
          .header {
            border-bottom: 2px solid #33077C;
            padding-bottom: 16px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .title { font-size: 24px; font-weight: 800; color: #33077C; }
          .badge {
            background: #f1f5f9;
            padding: 4px 12px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 700;
          }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
          .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
          .label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 4px; }
          .val { font-size: 15px; font-weight: 700; color: #0f172a; }
          .amount-box {
            background: #ede9fe;
            border: 2px solid #c4b5fd;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            margin: 24px 0;
          }
          .amount { font-size: 32px; font-weight: 800; color: #33077C; }
          .words { font-size: 13px; color: #475569; font-style: italic; margin-top: 6px; }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px dashed #cbd5e1;
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: #64748b;
          }
          .sign { text-align: right; }
          .sign-line { width: 140px; border-top: 1px solid #0f172a; margin-top: 40px; }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">PAYMENT RECEIPT</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">OFFICIAL CASH/BANK VOUCHER</div>
          </div>
          <div class="badge">RECEIPT #${item.receiptNo}</div>
        </div>

        <div class="grid">
          <div class="card">
            <div class="label">Received From (Party)</div>
            <div class="val">${item.partyName}</div>
            ${item.customerCompany ? `<div style="font-size:12px; color:#64748b; margin-top:2px;">${item.customerCompany}</div>` : ""}
            ${item.customerPhone ? `<div style="font-size:12px; color:#64748b;">${item.customerPhone}</div>` : ""}
          </div>
          <div class="card">
            <div class="label">Receipt Details</div>
            <div style="font-size:13px; margin-bottom:4px;"><strong>Date:</strong> ${isoToDdmmyyyy(item.date)}</div>
            <div style="font-size:13px;"><strong>Mode:</strong> ${item.paymentType}</div>
          </div>
        </div>

        <div class="amount-box">
          <div class="label" style="color:#33077C;">Amount Received</div>
          <div class="amount">₹ ${item.receivedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          <div class="words">${numberToWords(item.receivedAmount)}</div>
        </div>

        ${
          item.description
            ? `<div class="card" style="margin-bottom:24px;">
                <div class="label">Remarks / Description</div>
                <div style="font-size:13px; color:#334155;">${item.description}</div>
               </div>`
            : ""
        }

        <div class="footer">
          <div>
            <div>Generated electronically via CRM Sales Hub.</div>
            <div style="margin-top:4px;">Date: ${new Date().toLocaleDateString()}</div>
          </div>
          <div class="sign">
            <div>Authorized Signatory</div>
            <div class="sign-line"></div>
          </div>
        </div>
      </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  }, []);

  // Share Handlers (Email, WhatsApp)
  const handleShareEmail = (item: SalePaymentIn) => {
    setActiveShareDropdownId(null);
    setShareDropdownPos(null);
    const customer = customers.find(
      (c) =>
        c.id === item.customerId ||
        c.name.toLowerCase() === item.partyName.toLowerCase(),
    );
    const email = customer?.email || "";
    const subject = encodeURIComponent(
      `Payment Receipt Voucher #${item.receiptNo} from YAA CRM`,
    );
    const body = encodeURIComponent(
      `Dear ${item.partyName},\n\n` +
        `We have received your payment. Here are the receipt details:\n\n` +
        `Receipt No: #${item.receiptNo}\n` +
        `Date: ${isoToDdmmyyyy(item.date)}\n` +
        `Payment Mode: ${item.paymentType}\n` +
        `Amount Received: ₹${item.receivedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n` +
        (item.referenceNo
          ? `Reference / Cheque No: ${item.referenceNo}\n`
          : "") +
        (item.description ? `Notes: ${item.description}\n` : "") +
        `\nThank you for your prompt payment!\n\nBest regards,\nYAA Sales & Accounts Team`,
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
    toast.success(`Opening email for Receipt #${item.receiptNo}`);
  };

  const handleShareWhatsApp = (item: SalePaymentIn) => {
    setActiveShareDropdownId(null);
    setShareDropdownPos(null);
    const cleanPhone = (item.customerPhone || "").replace(/\D/g, "");
    const text = encodeURIComponent(
      `*PAYMENT RECEIPT ACKNOWLEDGEMENT*\n` +
        `--------------------------------\n` +
        `*Receipt #:* #${item.receiptNo}\n` +
        `*Party Name:* ${item.partyName}\n` +
        `*Date:* ${isoToDdmmyyyy(item.date)}\n` +
        `*Payment Mode:* ${item.paymentType}\n` +
        `*Amount Received:* ₹${item.receivedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n` +
        (item.referenceNo ? `*Ref / Txn No:* ${item.referenceNo}\n` : "") +
        (item.description ? `*Note:* ${item.description}\n` : "") +
        `\nThank you for choosing YAA CRM!`,
    );
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(waUrl, "_blank");
    toast.success(`Opening WhatsApp for Receipt #${item.receiptNo}`);
  };

  // Delete Payment Record
  const handleDeletePayment = (id: string, receiptNo: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete payment receipt #${receiptNo}?`,
      )
    ) {
      deletePaymentIn(id);
      toast.success(`Payment-In #${receiptNo} deleted`);
    }
  };

  // Duplicate Payment Record
  const handleDuplicatePayment = (item: SalePaymentIn) => {
    const nextNo = getNextReceiptNo();
    const duplicated: SalePaymentIn = {
      ...item,
      id: `payin_${Date.now()}`,
      receiptNo: nextNo,
      date: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    savePaymentIn(duplicated);
    toast.success(`Duplicated Payment-In #${item.receiptNo} as #${nextNo}!`);
  };

  // Save / Submit Payment-In
  const handleSavePayment = useCallback(() => {
    if (!selectedCustomerId && !formPartyQuery.trim()) {
      toast.error("Please select or enter a party / customer name");
      return;
    }
    const amountNum = parseFloat(formReceivedAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid received amount");
      return;
    }
    if (!formReceiptNo.trim()) {
      toast.error("Receipt number is required");
      return;
    }

    const partyName = selectedCustomerObj
      ? selectedCustomerObj.name
      : formPartyQuery.trim();

    const matchedCustomer =
      selectedCustomerObj ||
      customers.find(
        (c) =>
          c.id === selectedCustomerId ||
          c.name.toLowerCase() === partyName.toLowerCase(),
      );

    const paymentRecord: SalePaymentIn = {
      id: editingPaymentIn ? editingPaymentIn.id : `payin_${Date.now()}`,
      receiptNo: formReceiptNo.trim(),
      customerId: matchedCustomer?.id || selectedCustomerId || undefined,
      partyName,
      customerPhone: matchedCustomer?.phone || undefined,
      customerCompany: matchedCustomer?.company || undefined,
      date: formDate,
      paymentType: formPaymentType,
      receivedAmount: amountNum,
      referenceNo: formReferenceNo.trim() || undefined,
      description: formDescription.trim() || undefined,
      imageAttachment: imageAttachment || undefined,
      status: (formStatus as any) || "Received",
      createdAt: editingPaymentIn
        ? editingPaymentIn.createdAt
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any;

    savePaymentIn(paymentRecord);
    setIsCreateModalOpen(false);

    toast.success(
      editingPaymentIn
        ? `Payment-In #${paymentRecord.receiptNo} updated successfully`
        : `Payment-In #${paymentRecord.receiptNo} created successfully`,
    );
  }, [
    selectedCustomerId,
    formPartyQuery,
    formReceivedAmount,
    formReceiptNo,
    selectedCustomerObj,
    customers,
    editingPaymentIn,
    formDate,
    formPaymentType,
    formReferenceNo,
    formDescription,
    imageAttachment,
    formStatus,
    savePaymentIn,
  ]);

  // Keyboard shortcut: Alt+S or Ctrl+S to save modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey || e.ctrlKey) && (e.key === "s" || e.key === "S")) {
        if (isCreateModalOpen) {
          e.preventDefault();
          handleSavePayment();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCreateModalOpen, handleSavePayment]);

  // Filtered Payments Calculation with robust date parsing
  const filteredPaymentIns = useMemo(() => {
    return paymentIns.filter((item) => {
      const itemDateStr = (item.date || "").split("T")[0];

      // Date filter
      if (startDate && itemDateStr < startDate) return false;
      if (endDate && itemDateStr > endDate) return false;

      // Firm / Customer filter
      if (selectedFirm !== "All") {
        const selectedCust = customers.find((c) => c.id === selectedFirm);
        const matchId = item.customerId === selectedFirm;
        const matchName =
          selectedCust &&
          item.partyName?.toLowerCase() === selectedCust.name.toLowerCase();
        if (!matchId && !matchName) return false;
      }

      // Payment Type filter
      if (
        selectedPaymentType !== "All" &&
        item.paymentType !== selectedPaymentType
      ) {
        return false;
      }

      // Search Query filter
      if (appliedSearch && appliedSearch.trim()) {
        const q = appliedSearch.toLowerCase().trim();
        const matchParty = item.partyName?.toLowerCase().includes(q);
        const matchReceipt = item.receiptNo?.toLowerCase().includes(q);
        const matchPhone = item.customerPhone?.toLowerCase().includes(q);
        const matchDesc = item.description?.toLowerCase().includes(q);
        if (!matchParty && !matchReceipt && !matchPhone && !matchDesc) {
          return false;
        }
      }

      return true;
    });
  }, [
    paymentIns,
    customers,
    startDate,
    endDate,
    selectedFirm,
    selectedPaymentType,
    appliedSearch,
  ]);

  // Aggregate Metrics
  const totalAmount = useMemo(() => {
    return filteredPaymentIns.reduce(
      (acc, curr) => acc + (curr.receivedAmount || 0),
      0,
    );
  }, [filteredPaymentIns]);

  const cashCollections = useMemo(() => {
    return filteredPaymentIns
      .filter((p) => p.paymentType === "Cash")
      .reduce((acc, curr) => acc + (curr.receivedAmount || 0), 0);
  }, [filteredPaymentIns]);

  const onlineCollections = useMemo(() => {
    return filteredPaymentIns
      .filter((p) => p.paymentType !== "Cash")
      .reduce((acc, curr) => acc + (curr.receivedAmount || 0), 0);
  }, [filteredPaymentIns]);

  // Paged Payments
  const pagedPaymentIns = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredPaymentIns.slice(startIdx, startIdx + pageSize);
  }, [filteredPaymentIns, currentPage, pageSize]);

  // Export to Excel
  const handleExportCSV = () => {
    if (filteredPaymentIns.length === 0) {
      toast.error("No payment records to export");
      return;
    }

    const excelRows = filteredPaymentIns.map((p, idx) => ({
      srNo: idx + 1,
      receiptNo: p.receiptNo,
      date: isoToDdmmyyyy(p.date),
      partyName: p.partyName,
      customerPhone: p.customerPhone || "-",
      paymentType: p.paymentType,
      receivedAmount: Number(p.receivedAmount || 0),
      status: p.status || "Received",
      description: p.description || "-",
    }));

    exportTableToExcel({
      filename: `Payment_In_Report_${new Date().toISOString().split("T")[0]}`,
      sheetName: "Payment Receipts",
      title: "YAA CREATIONS CRM - PAYMENT-IN REPORT",
      subtitle: `Filter: ${selectedPeriod} | Total Records: ${filteredPaymentIns.length} | Generated: ${new Date().toLocaleDateString()}`,
      columns: [
        { header: "#", key: "srNo", align: "center", width: 8 },
        { header: "Date", key: "date", align: "center", width: 15 },
        { header: "Receipt No.", key: "receiptNo", align: "center", width: 16 },
        { header: "Party Name", key: "partyName", align: "left", width: 28 },
        { header: "Phone", key: "customerPhone", align: "left", width: 18 },
        {
          header: "Payment Type",
          key: "paymentType",
          align: "left",
          width: 16,
        },
        {
          header: "Amount Received (₹)",
          key: "receivedAmount",
          align: "right",
          type: "currency",
          width: 20,
        },
        { header: "Status", key: "status", align: "center", width: 14 },
        {
          header: "Remarks / Notes",
          key: "description",
          align: "left",
          width: 30,
        },
      ],
      data: excelRows,
      summaryRow: {
        srNo: "TOTAL",
        partyName: `${filteredPaymentIns.length} Receipts`,
        receivedAmount: totalAmount,
      },
    });

    toast.success(
      `Payment-In Excel report downloaded (${filteredPaymentIns.length} records)!`,
    );
  };

  const handleResetFilters = () => {
    setPendingSearch("");
    setAppliedSearch("");
    handlePeriodChange("This Month");
    setSelectedFirm("All");
    setSelectedPaymentType("All");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-5 pb-16 font-sans">
      {/* 1. TOP HEADER CARD */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Payment-In
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-[#33077C] border border-purple-200">
                {paymentIns.length} total
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Record customer payment receipts, track cash in counter, and monitor digital settlements.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <Button
            variant="secondary"
            size="md"
            icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
            onClick={handleExportCSV}
            className="hover:border-emerald-500 hover:text-emerald-700 transition-colors"
          >
            Excel Report
          </Button>

          <Button
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4 text-white stroke-[2.5]" />}
            onClick={() => handleOpenCreateModal()}
            className="bg-[#33077C] hover:bg-[#280563] text-white shadow-sm hover:shadow transition-all"
          >
            Add Payment-In
          </Button>
        </div>
      </div>

      {/* 2. SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Collections */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Collections
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              ₹
              {totalAmount.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              {filteredPaymentIns.length} recorded payments
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#33077C] flex items-center justify-center font-bold shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Cash Received */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Cash Received
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
              ₹
              {cashCollections.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              Cash in counter
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Online / Digital */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-blue-600 uppercase tracking-wider">
              Online / Bank / UPI
            </div>
            <div className="text-xl sm:text-2xl font-black text-blue-600 mt-1">
              ₹
              {onlineCollections.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              Digital settlements
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Average Receipt */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Avg. Per Receipt
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              ₹
              {filteredPaymentIns.length > 0
                ? (totalAmount / filteredPaymentIns.length).toLocaleString(
                    "en-IN",
                    { maximumFractionDigits: 0 },
                  )
                : "0"}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              Average collection size
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. SEARCH BAR & FILTER ROW */}
      <SearchBar
        value={pendingSearch}
        onChange={(val) => {
          setPendingSearch(val);
          setAppliedSearch(val);
        }}
        placeholder="Search by party name, receipt #, phone, notes..."
        onSubmit={() => {
          setAppliedSearch(pendingSearch);
          setCurrentPage(1);
        }}
        onReset={handleResetFilters}
        filterSlot={
          <div className="flex items-center gap-2.5 flex-wrap">
            <FilterDropdown
              options={PERIOD_OPTIONS}
              value={selectedPeriod}
              onChange={(val) => handlePeriodChange(val)}
              placeholder="Period : This Month"
            />
            <FilterDropdown
              options={[
                { label: "Payment Mode : All", value: "All" },
                ...availablePaymentTypes.map((t) => ({ label: t, value: t })),
              ]}
              value={selectedPaymentType}
              onChange={(val) => setSelectedPaymentType(val)}
              placeholder="Payment Mode : All"
            />
            <FilterDropdown
              options={[
                { label: "Customer : All", value: "All" },
                ...customers.map((c) => ({
                  label: c.name || c.company,
                  value: c.id,
                })),
              ]}
              value={selectedFirm}
              onChange={(val) => setSelectedFirm(val)}
              placeholder="Customer : All"
            />
          </div>
        }
        rightSlot={
          <div className="flex items-center gap-3 pr-1">
            <span className="text-xs font-semibold text-slate-500">
              Total Receipts :{" "}
              <span className="text-[#33077C] font-bold">
                {filteredPaymentIns.length}
              </span>
            </span>
          </div>
        }
      />

      {/* 4. MAIN CONTENT: EMPTY STATE OR TRANSACTIONS TABLE */}
      {paymentIns.length === 0 ? (
        /* Total Empty State */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-16 sm:p-20 flex flex-col items-center justify-center text-center">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-purple-50/70 border border-purple-100 flex items-center justify-center mb-6 relative shadow-inner">
            <div className="w-18 h-20 bg-[#33077C]/80 rounded-2xl p-3 flex flex-col justify-between shadow-md">
              <div className="flex items-center gap-1.5 border-b border-purple-400/50 pb-2">
                <div className="w-4 h-4 rounded-full bg-white/90" />
                <div className="w-8 h-2 bg-white/90 rounded-full" />
              </div>
              <div className="space-y-1.5">
                <div className="w-full h-2 bg-purple-300/80 rounded-full" />
                <div className="w-3/4 h-2 bg-purple-300/80 rounded-full" />
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold shadow-md">
              <Check className="w-5 h-5 stroke-[3]" />
            </div>
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-slate-900">
            No Transactions to show
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md">
            You haven't added any payment transactions yet. Click below to
            record your first incoming payment.
          </p>

          <div className="mt-8">
            <Button
              variant="primary"
              size="lg"
              onClick={() => handleOpenCreateModal()}
              icon={<Plus className="w-5 h-5 text-white" />}
            >
              Add Payment-In
            </Button>
          </div>
        </div>
      ) : filteredPaymentIns.length === 0 ? (
        /* Filter Empty State */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-12 sm:p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#33077C] flex items-center justify-center mb-4">
            <Search className="w-8 h-8 stroke-[1.8]" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            No payment receipts match your filters
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md">
            Try adjusting your search terms, date range, payment mode, or party filters.
          </p>
          <div className="mt-6">
            <Button
              variant="secondary"
              size="md"
              onClick={handleResetFilters}
              icon={<RotateCcw className="w-4 h-4" />}
            >
              Reset Filters
            </Button>
          </div>
        </div>
      ) : (
        /* Transactions Table */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-[#33077C] text-white text-xs font-bold uppercase tracking-wider">
                  <th className="py-4 px-4 border-r border-[#4309A2]/60 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>DATE</span>
                      <Calendar className="w-3.5 h-3.5 text-purple-200 opacity-80" />
                    </div>
                  </th>
                  <th className="py-4 px-4 border-r border-[#4309A2]/60 whitespace-nowrap text-center">
                    RECEIPT NO.
                  </th>
                  <th className="py-4 px-5 border-r border-[#4309A2]/60 min-w-[200px]">
                    PARTY NAME
                  </th>
                  <th className="py-4 px-4 border-r border-[#4309A2]/60 text-center whitespace-nowrap">
                    PAYMENT TYPE
                  </th>
                  <th className="py-4 px-4 border-r border-[#4309A2]/60 text-right whitespace-nowrap">
                    AMOUNT RECEIVED
                  </th>
                  <th className="py-4 px-4 border-r border-[#4309A2]/60 whitespace-nowrap">
                    DESCRIPTION
                  </th>
                  <th className="py-4 px-4 text-center whitespace-nowrap w-36">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs sm:text-[13px] text-slate-700">
                {pagedPaymentIns.map((item) => {
                  const isActionOpen = activeDropdownId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-purple-50/30 transition-colors border-b border-slate-200"
                    >
                      {/* Date */}
                      <td className="py-4 px-4 font-semibold text-slate-700 border-r border-slate-200 whitespace-nowrap">
                        {isoToDdmmyyyy(item.date)}
                      </td>

                      {/* Receipt No */}
                      <td className="py-4 px-4 font-extrabold text-slate-800 text-center border-r border-slate-200 whitespace-nowrap">
                        #{item.receiptNo}
                      </td>

                      {/* Party Name */}
                      <td className="py-4 px-5 font-semibold text-slate-900 border-r border-slate-200 break-words">
                        <div className="font-bold text-sm text-slate-900">
                          {item.partyName}
                        </div>
                        {item.customerCompany && (
                          <div className="text-xs text-slate-500 font-normal mt-0.5">
                            {item.customerCompany}
                          </div>
                        )}
                        {item.customerPhone && (
                          <div className="text-xs text-slate-400 font-normal">
                            {item.customerPhone}
                          </div>
                        )}
                      </td>

                      {/* Payment Type Badge */}
                      <td className="py-4 px-4 text-center border-r border-slate-200 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                            item.paymentType === "Cash"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                              : item.paymentType === "UPI"
                                ? "bg-purple-50 text-purple-700 border border-purple-200/80"
                                : item.paymentType === "Bank Transfer"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200/80"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              item.paymentType === "Cash"
                                ? "bg-emerald-500"
                                : item.paymentType === "UPI"
                                  ? "bg-[#33077C]"
                                  : "bg-blue-500"
                            }`}
                          />
                          <span>{item.paymentType}</span>
                        </span>
                      </td>

                      {/* Amount Received */}
                      <td className="py-4 px-4 text-right font-black text-slate-900 border-r border-slate-200 whitespace-nowrap">
                        <span className="text-[#33077C] text-sm sm:text-base font-extrabold">
                          ₹{" "}
                          {item.receivedAmount.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="py-4 px-4 text-slate-600 border-r border-slate-200 max-w-xs truncate">
                        {item.description || (
                          <span className="text-slate-300 italic">None</span>
                        )}
                      </td>

                      {/* Action Buttons Column */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1">
                          {/* 1. Direct Print Button */}
                          <button
                            type="button"
                            onClick={() => handlePrintReceipt(item)}
                            className="w-7 h-7 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                            title="Print Receipt Voucher"
                          >
                            <Printer className="w-4 h-4 text-slate-600" />
                          </button>

                          {/* 2. Share Dropdown Button */}
                          <div className="payment-in-share-dropdown-container relative inline-block text-left">
                            <button
                              type="button"
                              title="Share / Forward"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownId(null);
                                setDropdownPos(null);
                                if (activeShareDropdownId === item.id) {
                                  setActiveShareDropdownId(null);
                                  setShareDropdownPos(null);
                                } else {
                                  const btnRect = (
                                    e.currentTarget as HTMLElement
                                  ).getBoundingClientRect();
                                  const spaceBelow =
                                    window.innerHeight - btnRect.bottom;
                                  if (spaceBelow < 160) {
                                    setShareDropdownPos({
                                      bottom:
                                        window.innerHeight - btnRect.top + 4,
                                      right:
                                        window.innerWidth - btnRect.right - 10,
                                    });
                                  } else {
                                    setShareDropdownPos({
                                      top: btnRect.bottom + 4,
                                      right:
                                        window.innerWidth - btnRect.right - 10,
                                    });
                                  }
                                  setActiveShareDropdownId(item.id);
                                }
                              }}
                              className="w-8 h-8 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50 flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            >
                              <Forward className="w-4 h-4 stroke-[2.2] text-[#2563EB]" />
                            </button>

                            {/* Share Popover Popup */}
                            {activeShareDropdownId === item.id &&
                              shareDropdownPos && (
                                <div
                                  className="payment-in-share-dropdown-menu share-dropdown-menu fixed z-[9999] w-48 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-3.5 animate-in fade-in zoom-in-95 duration-100 font-sans text-left"
                                  style={{
                                    top:
                                      shareDropdownPos.top !== undefined
                                        ? `${shareDropdownPos.top}px`
                                        : "auto",
                                    bottom:
                                      shareDropdownPos.bottom !== undefined
                                        ? `${shareDropdownPos.bottom}px`
                                        : "auto",
                                    right: `${shareDropdownPos.right}px`,
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="text-xs font-bold text-slate-800 mb-2.5 px-1">
                                    Share
                                  </div>
                                  <div className="flex items-center justify-around gap-3 pt-0.5 pb-0.5">
                                    {/* Email Option */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleShareEmail(item);
                                      }}
                                      className="flex flex-col items-center gap-1.5 group cursor-pointer focus:outline-none"
                                      title="Share via Email"
                                    >
                                      <div className="w-11 h-11 rounded-xl border-2 border-blue-200 group-hover:border-blue-400 bg-white group-hover:bg-blue-50/50 flex items-center justify-center transition-all shadow-2xs group-hover:scale-105">
                                        <svg
                                          viewBox="0 0 24 24"
                                          className="w-5.5 h-5.5"
                                          fill="none"
                                        >
                                          <path
                                            d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                                            stroke="#EA4335"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            fill="#fff"
                                          />
                                          <path
                                            d="M22 6l-10 7L2 6"
                                            stroke="#EA4335"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                        </svg>
                                      </div>
                                      <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-900">
                                        Email
                                      </span>
                                    </button>

                                    {/* WhatsApp Option */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleShareWhatsApp(item);
                                      }}
                                      className="flex flex-col items-center gap-1.5 group cursor-pointer focus:outline-none"
                                      title="Share via WhatsApp"
                                    >
                                      <div className="w-11 h-11 rounded-xl border border-emerald-100 group-hover:border-emerald-300 bg-white group-hover:bg-emerald-50/50 flex items-center justify-center transition-all shadow-2xs group-hover:scale-105">
                                        <svg
                                          viewBox="0 0 24 24"
                                          className="w-6.5 h-6.5"
                                          fill="#25D366"
                                        >
                                          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 6.46 17.5 2 12.04 2ZM12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.8 7.37 7.5 3.67 12.04 3.67C16.58 3.67 20.28 7.37 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15ZM16.56 14.39C16.31 14.27 15.09 13.67 14.86 13.59C14.63 13.5 14.47 13.46 14.31 13.71C14.14 13.95 13.67 14.51 13.53 14.67C13.39 14.84 13.25 14.86 13 14.73C12.75 14.61 11.95 14.35 11 13.5C10.26 12.84 9.76 12.03 9.62 11.78C9.48 11.54 9.6 11.41 9.73 11.28C9.84 11.17 9.98 10.99 10.1 10.85C10.23 10.71 10.27 10.6 10.35 10.44C10.43 10.28 10.39 10.14 10.33 10.02C10.27 9.9 9.78 8.7 9.58 8.2C9.38 7.72 9.18 7.78 9.03 7.77L8.56 7.76C8.4 7.76 8.13 7.82 7.9 8.07C7.68 8.32 7.04 8.92 7.04 10.14C7.04 11.36 7.93 12.54 8.05 12.7C8.17 12.87 9.8 15.38 12.28 16.45C12.87 16.71 13.33 16.86 13.69 16.97C14.29 17.16 14.83 17.14 15.26 17.07C15.74 17 16.74 16.47 16.95 15.89C17.15 15.3 17.15 14.8 17.09 14.7C17.03 14.6 16.81 14.52 16.56 14.39Z" />
                                        </svg>
                                      </div>
                                      <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-900">
                                        WhatsApp
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              )}
                          </div>

                          {/* 3. 3-Dots Menu Button */}
                          <div className="payment-in-dropdown-container relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveShareDropdownId(null);
                                setShareDropdownPos(null);
                                if (isActionOpen) {
                                  setActiveDropdownId(null);
                                  setDropdownPos(null);
                                } else {
                                  const rect = (
                                    e.currentTarget as HTMLElement
                                  ).getBoundingClientRect();
                                  const spaceBelow =
                                    window.innerHeight - rect.bottom;
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
                              title="More Options"
                            >
                              <MoreVertical className="w-4 h-4 text-slate-600" />
                            </button>

                            {/* Floating Dropdown Menu matching exact reference list */}
                            {isActionOpen && dropdownPos && (
                              <div
                                style={{
                                  position: "fixed",
                                  top:
                                    dropdownPos.top !== undefined
                                      ? `${dropdownPos.top}px`
                                      : "auto",
                                  bottom:
                                    dropdownPos.bottom !== undefined
                                      ? `${dropdownPos.bottom}px`
                                      : "auto",
                                  right: `${dropdownPos.right}px`,
                                  zIndex: 9999,
                                }}
                                className="payment-in-dropdown-menu w-44 bg-white rounded-xl shadow-2xl border border-slate-200/90 py-2 animate-in fade-in zoom-in-95 duration-100 text-left font-sans overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* 1. View/Edit */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    handleOpenEditModal(item);
                                  }}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                                >
                                  View/Edit
                                </button>

                                {/* 2. Open PDF */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setSelectedPaymentIn(item);
                                    setIsViewReceiptModalOpen(true);
                                  }}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                                >
                                  Open PDF
                                </button>

                                {/* 3. Print */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    handlePrintReceipt(item);
                                  }}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                                >
                                  Print
                                </button>

                                {/* 4. Delete */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    handleDeletePayment(
                                      item.id,
                                      item.receiptNo,
                                    );
                                  }}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-rose-600 transition-colors cursor-pointer block"
                                >
                                  Delete
                                </button>

                                {/* 5. Duplicate */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    handleDuplicatePayment(item);
                                  }}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                                >
                                  Duplicate
                                </button>

                                {/* 6. View History */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setHistoryPaymentIn(item);
                                  }}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                                >
                                  View History
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

          {/* Pagination */}
          <div className="p-4 sm:p-5 border-t border-slate-200">
            <Pagination
              currentPage={currentPage}
              total={filteredPaymentIns.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(sz) => {
                setPageSize(sz);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ADD / EDIT PAYMENT-IN MODAL (Matching Exact CRM Section-Card System)   */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title={
            editingPaymentIn
              ? `Edit Payment-In: #${editingPaymentIn.receiptNo}`
              : "Add Payment-In"
          }
          subtitle={
            editingPaymentIn
              ? `Update payment voucher #${editingPaymentIn.receiptNo} and party balance`
              : "Record client payment receipts, counter cash settlements, and digital collections"
          }
          maxWidth="4xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setIsCreateModalOpen(false)}
        >
          <div className="space-y-6 max-h-[75vh] overflow-y-auto p-2 sm:p-4 text-xs animate-in fade-in duration-150">
            {/* Section 1: Party & Basic Voucher Info */}
            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-100">
                <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-[#33077C] font-bold text-xs flex items-center gap-1.5 border border-purple-200">
                  <User className="w-3.5 h-3.5 text-[#4309A2]" />
                  1. Party & Voucher Information
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Party / Customer Name */}
                <div
                  className="sm:col-span-2 relative"
                  ref={partySelectDropdownRef}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs sm:text-[13px] font-medium text-slate-600">
                      Party / Customer Name{" "}
                      <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsQuickCustomerOpen(true)}
                      className="text-xs font-bold text-[#33077C] hover:underline cursor-pointer"
                    >
                      + Add New Party
                    </button>
                  </div>
                  <div
                    onClick={() => setFormPartySearchOpen(!formPartySearchOpen)}
                    className={`w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-[13px] font-medium flex items-center justify-between cursor-pointer transition-all ${
                      formPartySearchOpen
                        ? "border-[#4309A2] ring-4 ring-[#4309A2]/10"
                        : selectedCustomerObj
                          ? "border-purple-300 hover:border-[#33077C]"
                          : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="truncate pr-2">
                      {selectedCustomerObj ? (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs sm:text-[13px]">
                            {selectedCustomerObj.name}
                          </span>
                          {selectedCustomerObj.phone && (
                            <span className="text-slate-400 text-xs">
                              ({selectedCustomerObj.phone})
                            </span>
                          )}
                          {selectedCustomerObj.company && (
                            <span className="text-slate-500 text-xs">
                              • {selectedCustomerObj.company}
                            </span>
                          )}
                        </div>
                      ) : formPartyQuery ? (
                        <span className="font-bold text-slate-900">
                          {formPartyQuery}
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          Search customer by name or phone...
                        </span>
                      )}
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>

                  {/* Customer Dropdown Search Menu */}
                  {formPartySearchOpen && (
                    <div className="absolute left-0 top-full mt-1.5 w-full bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div className="relative mb-2">
                        <div className="flex items-center w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl focus-within:border-[#33077C] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#33077C]/10 transition-all">
                          <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
                          <input
                            type="text"
                            placeholder="Type to filter party name or phone..."
                            value={formPartyQuery}
                            onChange={(e) => {
                              setFormPartyQuery(e.target.value);
                              if (
                                selectedCustomerObj &&
                                selectedCustomerObj.name !== e.target.value
                              ) {
                                setSelectedCustomerId("");
                                setSelectedCustomerObj(null);
                              }
                            }}
                            autoFocus
                            className="w-full bg-transparent text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none"
                          />
                          {formPartyQuery && (
                            <button
                              type="button"
                              onClick={() => {
                                setFormPartyQuery("");
                                setSelectedCustomerId("");
                                setSelectedCustomerObj(null);
                              }}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {filteredCustomerCandidates.length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-400">
                            No party found matching "{formPartyQuery}".
                          </div>
                        ) : (
                          filteredCustomerCandidates.map((cust) => (
                            <div
                              key={cust.id}
                              onClick={() => {
                                setSelectedCustomerId(cust.id);
                                setSelectedCustomerObj(cust);
                                setFormPartyQuery(cust.name);
                                setFormPartySearchOpen(false);
                              }}
                              className="px-3 py-2 rounded-xl hover:bg-purple-50 cursor-pointer flex items-center justify-between transition-colors group"
                            >
                              <div>
                                <div className="font-bold text-xs text-slate-900 group-hover:text-[#33077C]">
                                  {cust.name}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {cust.phone}{" "}
                                  {cust.company ? `• ${cust.company}` : ""}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-[11px] font-bold text-slate-700">
                                  Outstanding: ₹
                                  {(
                                    cust.outstandingAmount || 0
                                  ).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Receipt No */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-600 block mb-1.5">
                    Receipt Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formReceiptNo}
                    onChange={(e) => setFormReceiptNo(e.target.value)}
                    placeholder="e.g. 1001"
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-mono font-bold text-[#33077C] outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-600 block mb-1.5">
                    Payment Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                </div>

                {/* Payment Mode / Type */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs sm:text-[13px] font-medium text-slate-600">
                      Payment Mode <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddPaymentTypeOpen(true)}
                      className="text-xs font-bold text-[#33077C] hover:underline cursor-pointer"
                    >
                      + Add Type
                    </button>
                  </div>
                  <select
                    value={formPaymentType}
                    onChange={(e) =>
                      setFormPaymentType(e.target.value as PaymentInType)
                    }
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer"
                  >
                    {availablePaymentTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Settlement Status */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-600 block mb-1.5">
                    Voucher Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer"
                  >
                    <option value="Received">Received / Cleared</option>
                    <option value="In Process">
                      In Process / Pending Clearing
                    </option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Payment & Amount Details */}
            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-100">
                <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-[#33077C] font-bold text-xs flex items-center gap-1.5 border border-purple-200">
                  <CreditCard className="w-3.5 h-3.5 text-[#4309A2]" />
                  2. Amount & Settlement Details
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Received Amount Input */}
                <div className="sm:col-span-2">
                  <label className="text-xs sm:text-[13px] font-bold text-slate-800 block mb-1.5">
                    Received Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-sm font-bold text-slate-400 pointer-events-none">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={formReceivedAmount}
                      onChange={(e) => setFormReceivedAmount(e.target.value)}
                      autoFocus
                      className="w-full h-11 pl-9 pr-4 bg-white border-2 border-purple-200 hover:border-[#33077C] rounded-xl text-base font-extrabold text-[#33077C] outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                    />
                  </div>
                  {formReceivedAmount && parseFloat(formReceivedAmount) > 0 && (
                    <div className="text-xs text-slate-500 font-medium italic mt-1.5">
                      {numberToWords(parseFloat(formReceivedAmount))}
                    </div>
                  )}
                </div>

                {/* Reference Number */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-600 block mb-1.5">
                    Cheque / UPI / Ref No. (Optional)
                  </label>
                  <input
                    type="text"
                    value={formReferenceNo}
                    onChange={(e) => setFormReferenceNo(e.target.value)}
                    placeholder="e.g. UPI-98302198"
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Remarks & Proof Attachments */}
            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-100">
                <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-[#33077C] font-bold text-xs flex items-center gap-1.5 border border-purple-200">
                  <FileText className="w-3.5 h-3.5 text-[#4309A2]" />
                  3. Description & Receipt Attachment
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                {/* Description Textarea */}
                <div className="sm:col-span-2">
                  <label className="text-xs sm:text-[13px] font-medium text-slate-600 block mb-1.5">
                    Description / Remarks
                  </label>
                  <textarea
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Enter transaction remarks, invoice reference, or settlement notes..."
                    className="w-full p-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                </div>

                {/* Camera / Receipt Image Upload */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-600 block mb-1.5">
                    Receipt Photo / Attachment
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  {!imageAttachment ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-24 rounded-xl border-2 border-dashed border-slate-200 hover:border-[#33077C] text-slate-500 hover:text-[#33077C] hover:bg-purple-50/40 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Camera className="w-5 h-5 text-slate-400" />
                      <span className="text-xs font-bold">
                        Upload Photo Proof
                      </span>
                    </button>
                  ) : (
                    <div className="relative inline-block border border-slate-200 rounded-xl p-1.5 bg-slate-50">
                      <img
                        src={imageAttachment}
                        alt="Receipt Proof"
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setImageAttachment(null)}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md cursor-pointer"
                        title="Remove image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                size="md"
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="button"
                onClick={() => handleSavePayment()}
              >
                {editingPaymentIn ? "Update Payment" : "Save Payment"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 6. QUICK ADD CUSTOMER MODAL                                               */}
      {/* ========================================================================= */}
      {isQuickCustomerOpen && (
        <Modal
          isOpen={isQuickCustomerOpen}
          onClose={() => setIsQuickCustomerOpen(false)}
          title="Add New Party / Customer"
          subtitle="Create customer record directly from voucher entry"
          maxWidth="md"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setIsQuickCustomerOpen(false)}
        >
          <div className="p-2 space-y-4 text-xs sm:text-sm">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Customer Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="e.g. Anand Supermarket"
                className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-[#33077C]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Company / Firm Name
              </label>
              <input
                type="text"
                value={newCustomerCompany}
                onChange={(e) => setNewCustomerCompany(e.target.value)}
                placeholder="e.g. Anand Trading Pvt Ltd"
                className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-[#33077C]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Phone Number
              </label>
              <input
                type="text"
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                placeholder="e.g. +91 98400 12345"
                className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-[#33077C]"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                variant="secondary"
                size="md"
                type="button"
                onClick={() => setIsQuickCustomerOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="button"
                onClick={handleCreateQuickCustomer}
              >
                Save Party
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 7. ADD CUSTOM PAYMENT TYPE MODAL                                          */}
      {/* ========================================================================= */}
      {isAddPaymentTypeOpen && (
        <Modal
          isOpen={isAddPaymentTypeOpen}
          onClose={() => setIsAddPaymentTypeOpen(false)}
          title="Add Custom Payment Type"
          subtitle="Add custom payment channel or bank"
          maxWidth="md"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setIsAddPaymentTypeOpen(false)}
        >
          <div className="p-2 space-y-4 text-xs sm:text-sm">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Payment Type Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newPaymentTypeName}
                onChange={(e) => setNewPaymentTypeName(e.target.value)}
                placeholder="e.g. RTGS / NEFT or Google Pay"
                className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-[#33077C]"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                variant="secondary"
                size="md"
                type="button"
                onClick={() => setIsAddPaymentTypeOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="button"
                onClick={handleAddPaymentType}
              >
                Add Type
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 8. VIEW RECEIPT VOUCHER MODAL                                            */}
      {/* ========================================================================= */}
      {isViewReceiptModalOpen && selectedPaymentIn && (
        <Modal
          isOpen={isViewReceiptModalOpen}
          onClose={() => {
            setIsViewReceiptModalOpen(false);
            setSelectedPaymentIn(null);
          }}
          title={`Payment Receipt Voucher #${selectedPaymentIn.receiptNo}`}
          subtitle="Official receipt record breakdown"
          maxWidth="lg"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => {
            setIsViewReceiptModalOpen(false);
            setSelectedPaymentIn(null);
          }}
        >
          <div className="space-y-6 text-xs sm:text-sm p-2">
            <div className="bg-purple-50/70 border-2 border-[#33077C]/20 rounded-2xl p-6 text-center">
              <div className="text-xs font-bold text-[#33077C] uppercase tracking-wider">
                Amount Received
              </div>
              <div className="text-4xl font-black text-[#33077C] mt-1.5">
                ₹{" "}
                {selectedPaymentIn.receivedAmount.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </div>
              <div className="text-xs sm:text-sm text-slate-500 font-medium italic mt-1.5">
                {numberToWords(selectedPaymentIn.receivedAmount)}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Party Name
                </div>
                <div className="font-bold text-base text-slate-900 mt-1">
                  {selectedPaymentIn.partyName}
                </div>
                {selectedPaymentIn.customerCompany && (
                  <div className="text-slate-500 text-xs mt-0.5">
                    {selectedPaymentIn.customerCompany}
                  </div>
                )}
                {selectedPaymentIn.customerPhone && (
                  <div className="text-slate-400 text-xs mt-0.5">
                    {selectedPaymentIn.customerPhone}
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt No:</span>
                  <span className="font-bold text-slate-900">
                    #{selectedPaymentIn.receiptNo}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span className="font-bold text-slate-900">
                    {isoToDdmmyyyy(selectedPaymentIn.date)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Mode:</span>
                  <span className="font-bold text-emerald-700">
                    {selectedPaymentIn.paymentType}
                  </span>
                </div>
              </div>
            </div>

            {selectedPaymentIn.description && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Remarks / Description
                </div>
                <div className="text-slate-800 font-medium">
                  {selectedPaymentIn.description}
                </div>
              </div>
            )}

            {selectedPaymentIn.imageAttachment && (
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Attached Receipt Proof
                </div>
                <img
                  src={selectedPaymentIn.imageAttachment}
                  alt="Proof"
                  className="max-h-56 rounded-2xl border border-slate-200 object-contain shadow-xs"
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                variant="secondary"
                size="md"
                type="button"
                onClick={() => {
                  setIsViewReceiptModalOpen(false);
                  handleOpenEditModal(selectedPaymentIn);
                }}
                icon={<Pencil className="w-4 h-4" />}
              >
                Edit
              </Button>
              <Button
                variant="primary"
                size="md"
                type="button"
                onClick={() => handlePrintReceipt(selectedPaymentIn)}
                icon={<Printer className="w-4 h-4" />}
              >
                Print Receipt
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 9. PAYMENT HISTORY / AUDIT MODAL                                          */}
      {/* ========================================================================= */}
      {historyPaymentIn && (
        <Modal
          isOpen={Boolean(historyPaymentIn)}
          onClose={() => setHistoryPaymentIn(null)}
          title={`Payment History - Receipt #${historyPaymentIn.receiptNo}`}
          maxWidth="md"
        >
          <div className="p-6 space-y-4 text-xs font-sans">
            <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-100 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-[#33077C] uppercase tracking-wider">
                  Receipt No
                </div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">
                  #{historyPaymentIn.receiptNo}
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {historyPaymentIn.partyName}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Amount
                </div>
                <div className="text-base font-extrabold text-[#33077C] mt-0.5">
                  ₹{" "}
                  {historyPaymentIn.receivedAmount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                  {historyPaymentIn.paymentType}
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Activity Timeline
              </div>

              <div className="relative pl-6 space-y-4 border-l-2 border-purple-200 ml-2">
                {/* Event 1 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-[#33077C] ring-4 ring-purple-100" />
                  <div>
                    <div className="font-bold text-slate-800">
                      Payment-In Recorded
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      Date: {isoToDdmmyyyy(historyPaymentIn.date)} • Mode:{" "}
                      {historyPaymentIn.paymentType}
                    </div>
                    <div className="text-slate-400 text-[10px] mt-0.5">
                      Recorded by System Admin
                    </div>
                  </div>
                </div>

                {/* Event 2 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                  <div>
                    <div className="font-bold text-slate-800">
                      Receipt Voucher Generated
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      Voucher #{historyPaymentIn.receiptNo} marked as{" "}
                      {historyPaymentIn.status || "Received"}
                    </div>
                    <div className="text-slate-400 text-[10px] mt-0.5">
                      Timestamp:{" "}
                      {new Date(
                        historyPaymentIn.createdAt || Date.now(),
                      ).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Event 3 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-slate-300 ring-4 ring-slate-100" />
                  <div>
                    <div className="font-bold text-slate-700">
                      Last Verified
                    </div>
                    <div className="text-slate-400 text-[10px] mt-0.5">
                      Updated:{" "}
                      {new Date(
                        historyPaymentIn.updatedAt || Date.now(),
                      ).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button
                variant="secondary"
                size="md"
                type="button"
                onClick={() => setHistoryPaymentIn(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PaymentInView;
