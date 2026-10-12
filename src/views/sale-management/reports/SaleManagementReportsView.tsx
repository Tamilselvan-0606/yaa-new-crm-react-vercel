import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  IndianRupee,
  Download,
  Printer,
  Calendar,
  Filter,
  Search,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  Users,
  ShoppingCart,
  Truck,
  Package,
  Boxes,
  AlertTriangle,
  FileText,
  RotateCcw,
  Tag,
  CheckCircle2,
  Clock,
  ChevronRight,
  Building2,
  DollarSign,
  PieChart as PieIcon,
  RefreshCw,
  Eye,
  Mail,
  X,
  Check,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useSalesManagementStore } from '../../../store/useSalesManagementStore';
import { Modal } from '../../../components/common/Modal';
import { toast } from 'sonner';

type ReportCategory = 'transaction' | 'sales' | 'collections' | 'inventory' | 'purchase' | 'tax';

type ReportId =
  // Transaction reports
  | 'bill_wise_profit'
  | 'all_transactions'
  | 'sale_report'
  | 'purchase_report'
  | 'day_book'
  // Sales Hub reports
  | 'sales_summary'
  | 'customer_statement'
  | 'sales_by_customer'
  | 'sales_return_report'
  // Collection & Dues reports
  | 'collection_summary'
  | 'sales_rep_collections'
  | 'customer_aging_report'
  // Inventory reports
  | 'stock_summary'
  | 'low_stock_summary'
  | 'item_movement'
  | 'category_stock'
  // Purchase reports
  | 'purchase_summary'
  | 'supplier_statement'
  | 'purchase_by_supplier'
  | 'purchase_return_report'
  // Tax reports
  | 'hsn_summary'
  | 'gst_summary';

interface ReportMenuItem {
  id: ReportId;
  label: string;
  category: ReportCategory;
  description: string;
}

const REPORT_MENU: { category: ReportCategory; label: string; icon: any; items: ReportMenuItem[] }[] = [
  {
    category: 'transaction',
    label: 'Transaction Reports',
    icon: FileSpreadsheet,
    items: [
      { id: 'bill_wise_profit', label: 'Bill-Wise Profit', category: 'transaction', description: 'Gross profit margins and cost vs. revenue per invoice' },
      { id: 'all_transactions', label: 'All Transactions', category: 'transaction', description: 'Complete ledger of all Sales, Purchases, Returns & Payments' },
      { id: 'sale_report', label: 'Sale Report', category: 'transaction', description: 'Itemized sales invoices, receivables, and payment methods' },
      { id: 'purchase_report', label: 'Purchase Report', category: 'transaction', description: 'Procurement bills, payables, and vendor orders' },
      { id: 'day_book', label: 'Day Book', category: 'transaction', description: 'Chronological daily register of all inflows and outflows' },
    ],
  },
  {
    category: 'sales',
    label: 'Sales Hub Reports',
    icon: ShoppingCart,
    items: [
      { id: 'sales_summary', label: 'Sales Performance & Analytics', category: 'sales', description: 'Revenue graphs, monthly trends, and performance metrics' },
      { id: 'customer_statement', label: 'Customer Statement (Ledger)', category: 'sales', description: 'Detailed account statement by customer with outstanding balance' },
      { id: 'sales_by_customer', label: 'Sales by Customer', category: 'sales', description: 'Top revenue-generating clients and sales frequency' },
      { id: 'sales_return_report', label: 'Sales Return Report', category: 'sales', description: 'Refunds, credit notes, and return reasons' },
    ],
  },
  {
    category: 'collections',
    label: 'Collection & Dues Reports',
    icon: IndianRupee,
    items: [
      { id: 'collection_summary', label: 'Collection Report', category: 'collections', description: 'Total outstanding, collections, overdue amounts, due today, and collection rate' },
      { id: 'sales_rep_collections', label: 'Sales Representative Collection Report', category: 'collections', description: 'Representative performance, assigned customers, dues, and recovery rates' },
      { id: 'customer_aging_report', label: 'Customer Aging Report', category: 'collections', description: 'Receivables aging analysis across 0–30, 31–60, 61–90, and 90+ day buckets' },
    ],
  },
  {
    category: 'inventory',
    label: 'Inventory & Stock Reports',
    icon: Package,
    items: [
      { id: 'stock_summary', label: 'Stock Summary & Valuation', category: 'inventory', description: 'Current on-hand stock quantities and asset valuation' },
      { id: 'low_stock_summary', label: 'Low Stock & Reorder Alert', category: 'inventory', description: 'Items at or below minimum threshold requiring reorder' },
      { id: 'item_movement', label: 'Item Stock Movement', category: 'inventory', description: 'Inward purchase vs. outward sales audit trail per product' },
      { id: 'category_stock', label: 'Category-wise Stock & Sales', category: 'inventory', description: 'Stock value distribution across categories and subcategories' },
    ],
  },
  {
    category: 'purchase',
    label: 'Purchase Reports',
    icon: Truck,
    items: [
      { id: 'purchase_summary', label: 'Purchase Summary & Analytics', category: 'purchase', description: 'Procurement volume, vendor expense breakdown, and stats' },
      { id: 'supplier_statement', label: 'Supplier Statement (Ledger)', category: 'purchase', description: 'Supplier accounts, payments released, and pending payables' },
      { id: 'purchase_by_supplier', label: 'Purchase by Supplier', category: 'purchase', description: 'Total purchase expenditure grouped by vendor' },
      { id: 'purchase_return_report', label: 'Purchase Return (Debit Note)', category: 'purchase', description: 'Returned purchase goods and debit adjustments' },
    ],
  },
  {
    category: 'tax',
    label: 'Tax & GST Reports',
    icon: Tag,
    items: [
      { id: 'hsn_summary', label: 'Sale Summary by HSN', category: 'tax', description: 'HSN code breakdown, taxable values, and GST liability' },
      { id: 'gst_summary', label: 'GST Slabs Summary (GSTR-1)', category: 'tax', description: 'Intra-state (CGST+SGST) vs. Inter-state (IGST) tax summary' },
    ],
  },
];

export const SaleManagementReportsView: React.FC = () => {
  const {
    sales = [],
    salesReturns = [],
    purchases = [],
    purchaseReturns = [],
    customers = [],
    suppliers = [],
    stocks = [],
    salesRepresentatives = [],
  } = useSalesManagementStore();

  const [activeReport, setActiveReport] = useState<ReportId>('bill_wise_profit');
  const [timeRange, setTimeRange] = useState<'today' | 'this_week' | 'this_month' | 'this_year' | 'all' | 'custom'>('this_month');
  const [customStartDate, setCustomStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPartyFilter, setSelectedPartyFilter] = useState('ALL');

  // Preview Modal State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Helper date filter
  const isWithinDateRange = (dateStr?: string) => {
    if (!dateStr || timeRange === 'all') return true;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (timeRange === 'today') return dateStr.startsWith(todayStr);
    if (timeRange === 'this_week') {
      const weekAgo = new Date(Date.now() - 7 * 86400000);
      return new Date(dateStr) >= weekAgo;
    }
    if (timeRange === 'this_month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return new Date(dateStr) >= monthStart;
    }
    if (timeRange === 'this_year') {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      return new Date(dateStr) >= yearStart;
    }
    if (timeRange === 'custom') {
      return dateStr >= customStartDate && dateStr <= customEndDate;
    }
    return true;
  };

  // Filtered Datasets
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchDate = isWithinDateRange(s.saleDate);
      const matchSearch =
        searchTerm === '' ||
        s.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchParty = selectedPartyFilter === 'ALL' || s.customerId === selectedPartyFilter;
      return matchDate && matchSearch && matchParty;
    });
  }, [sales, timeRange, customStartDate, customEndDate, searchTerm, selectedPartyFilter]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const matchDate = isWithinDateRange(p.purchaseDate);
      const matchSearch =
        searchTerm === '' ||
        p.purchaseNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchParty = selectedPartyFilter === 'ALL' || p.supplierId === selectedPartyFilter;
      return matchDate && matchSearch && matchParty;
    });
  }, [purchases, timeRange, customStartDate, customEndDate, searchTerm, selectedPartyFilter]);

  const filteredSalesReturns = useMemo(() => {
    return salesReturns.filter((r) => {
      const matchDate = isWithinDateRange(r.returnDate);
      const matchSearch =
        searchTerm === '' ||
        r.returnNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase());
      return matchDate && matchSearch;
    });
  }, [salesReturns, timeRange, customStartDate, customEndDate, searchTerm]);

  const filteredPurchaseReturns = useMemo(() => {
    return purchaseReturns.filter((r) => {
      const matchDate = isWithinDateRange(r.returnDate);
      const matchSearch =
        searchTerm === '' ||
        r.returnNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.purchaseNo.toLowerCase().includes(searchTerm.toLowerCase());
      return matchDate && matchSearch;
    });
  }, [purchaseReturns, timeRange, customStartDate, customEndDate, searchTerm]);

  // Unified All Transactions Ledger
  const allTransactions = useMemo(() => {
    const list: Array<{
      id: string;
      date: string;
      type: 'Sale' | 'Purchase' | 'Sales Return' | 'Purchase Return';
      refNo: string;
      partyName: string;
      totalAmount: number;
      paidAmount: number;
      balance: number;
      status: string;
      paymentMode?: string;
    }> = [];

    filteredSales.forEach((s) => {
      list.push({
        id: `sale-${s.id}`,
        date: s.saleDate,
        type: 'Sale',
        refNo: s.invoiceNo,
        partyName: s.customerName,
        totalAmount: s.grandTotal,
        paidAmount: s.paidAmount,
        balance: s.balance,
        status: s.paymentStatus,
        paymentMode: s.paymentMethod,
      });
    });

    filteredPurchases.forEach((p) => {
      list.push({
        id: `purchase-${p.id}`,
        date: p.purchaseDate,
        type: 'Purchase',
        refNo: p.purchaseNo,
        partyName: p.supplierName,
        totalAmount: p.grandTotal,
        paidAmount: p.paidAmount,
        balance: p.balance,
        status: p.paymentStatus,
        paymentMode: p.paymentMethod,
      });
    });

    filteredSalesReturns.forEach((r) => {
      list.push({
        id: `sret-${r.id}`,
        date: r.returnDate,
        type: 'Sales Return',
        refNo: r.returnNo,
        partyName: r.customerName,
        totalAmount: r.returnAmount,
        paidAmount: r.refundStatus === 'Refunded' ? r.returnAmount : 0,
        balance: r.refundStatus === 'Pending' ? r.returnAmount : 0,
        status: r.returnStatus,
        paymentMode: r.refundMethod || 'Store Credit',
      });
    });

    filteredPurchaseReturns.forEach((r) => {
      list.push({
        id: `pret-${r.id}`,
        date: r.returnDate,
        type: 'Purchase Return',
        refNo: r.returnNo,
        partyName: r.supplierName,
        totalAmount: r.returnAmount,
        paidAmount: r.refundStatus === 'Refunded' ? r.returnAmount : 0,
        balance: r.refundStatus === 'Pending' ? r.returnAmount : 0,
        status: r.returnStatus,
        paymentMode: 'Vendor Credit',
      });
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredSales, filteredPurchases, filteredSalesReturns, filteredPurchaseReturns]);

  // Overall KPIs
  const totalSalesVal = useMemo(() => filteredSales.reduce((acc, s) => acc + s.grandTotal, 0), [filteredSales]);
  const totalReceivedVal = useMemo(() => filteredSales.reduce((acc, s) => acc + s.paidAmount, 0), [filteredSales]);
  const totalSalesDueVal = useMemo(() => filteredSales.reduce((acc, s) => acc + s.balance, 0), [filteredSales]);
  const totalPurchaseVal = useMemo(() => filteredPurchases.reduce((acc, p) => acc + p.grandTotal, 0), [filteredPurchases]);
  const totalStockVal = useMemo(() => stocks.reduce((acc, st) => acc + (st.inStock * (st.unitCost || 0)), 0), [stocks]);

  // Helper date formatter
  const formatToDDMMYYYY = (iso?: string) => {
    if (!iso) return '-';
    const clean = iso.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return iso;
  };

  // Metadata Helpers
  const currentReportMeta = useMemo(() => {
    for (const group of REPORT_MENU) {
      const found = group.items.find((i) => i.id === activeReport);
      if (found) return found;
    }
    return REPORT_MENU[0].items[0];
  }, [activeReport]);

  const activePartyName = useMemo(() => {
    if (selectedPartyFilter === 'ALL') return 'All Parties';
    const c = customers.find((cust) => cust.id === selectedPartyFilter);
    if (c) return c.name;
    const s = suppliers.find((sup) => sup.id === selectedPartyFilter);
    if (s) return s.name;
    return selectedPartyFilter;
  }, [selectedPartyFilter, customers, suppliers]);

  const formattedDateRange = useMemo(() => {
    if (timeRange === 'custom') {
      return `From ${formatToDDMMYYYY(customStartDate)} to ${formatToDDMMYYYY(customEndDate)}`;
    }
    const today = new Date().toISOString().split('T')[0];
    return `From ${formatToDDMMYYYY(today)} to ${formatToDDMMYYYY(today)}`;
  }, [timeRange, customStartDate, customEndDate]);

  interface ReportColumn {
    label: string;
    align?: 'left' | 'right' | 'center';
    isBold?: boolean;
    isMono?: boolean;
  }

  // ==========================================
  // DYNAMIC REPORT DATASET ENGINE (All 19 Reports)
  // ==========================================
  const currentReportData = useMemo<{
    title: string;
    columns: ReportColumn[];
    rows: Array<{ id: string; cells: string[] }>;
    summary: Array<{ label: string; value: string }>;
  }>(() => {
    const formatCurrency = (val: number) =>
      `₹ ${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    switch (activeReport) {
      // 1. BILL-WISE PROFIT
      case 'bill_wise_profit': {
        const rows = filteredSales.map((s, idx) => {
          const cost = (s.items && s.items.length > 0)
            ? s.items.reduce((acc, item) => {
                const itemCost = item.purchasePrice ?? stocks.find((st) => st.productId === item.productId)?.unitCost ?? (item.unitPrice * 0.7);
                return acc + (itemCost * item.quantity);
              }, 0)
            : (s.subtotal * 0.7);
          const profit = s.grandTotal - cost;
          return {
            id: s.id,
            cells: [
              formatToDDMMYYYY(s.saleDate),
              s.invoiceNo || String(idx + 1),
              s.customerName || 'Walk-in Customer',
              formatCurrency(s.grandTotal),
              formatCurrency(profit),
            ],
          };
        });
        const totalSale = filteredSales.reduce((acc, s) => acc + s.grandTotal, 0);
        const totalProfit = filteredSales.reduce((acc, s) => {
          const cost = (s.items && s.items.length > 0)
            ? s.items.reduce((c, item) => {
                const itemCost = item.purchasePrice ?? stocks.find((st) => st.productId === item.productId)?.unitCost ?? (item.unitPrice * 0.7);
                return c + (itemCost * item.quantity);
              }, 0)
            : (s.subtotal * 0.7);
          return acc + (s.grandTotal - cost);
        }, 0);
        return {
          title: 'Bill wise profit & loss report',
          columns: [
            { label: 'Date', align: 'left', isMono: true },
            { label: 'Ref No.', align: 'left', isBold: true },
            { label: 'Name', align: 'left' },
            { label: 'Total Sale Amount', align: 'right', isBold: true },
            { label: 'Profit(+)/Loss(-)', align: 'right', isBold: true },
          ],
          rows,
          summary: [
            { label: 'Total Sale Amount', value: formatCurrency(totalSale) },
            { label: 'Total Profit(+)/Loss(-)', value: formatCurrency(totalProfit) },
          ],
        };
      }

      // 2. ALL TRANSACTIONS
      case 'all_transactions': {
        const rows = allTransactions.map((t) => ({
          id: t.id,
          cells: [
            formatToDDMMYYYY(t.date),
            t.type,
            t.refNo,
            t.partyName,
            t.paymentMode || 'N/A',
            formatCurrency(t.totalAmount),
            formatCurrency(t.paidAmount),
            formatCurrency(t.balance),
            t.status,
          ],
        }));
        const totalVal = allTransactions.reduce((acc, t) => acc + t.totalAmount, 0);
        const totalPaid = allTransactions.reduce((acc, t) => acc + t.paidAmount, 0);
        const totalDue = allTransactions.reduce((acc, t) => acc + t.balance, 0);
        return {
          title: 'All Transactions Ledger Report',
          columns: [
            { label: 'Date', align: 'left', isMono: true },
            { label: 'Type', align: 'center', isBold: true },
            { label: 'Ref / Bill #', align: 'left', isBold: true },
            { label: 'Party Name', align: 'left' },
            { label: 'Payment Mode', align: 'left' },
            { label: 'Total Amount', align: 'right', isBold: true },
            { label: 'Paid Amount', align: 'right' },
            { label: 'Balance Due', align: 'right' },
            { label: 'Status', align: 'center' },
          ],
          rows,
          summary: [
            { label: 'Total Transactions', value: `${allTransactions.length} records` },
            { label: 'Total Amount', value: formatCurrency(totalVal) },
            { label: 'Total Paid / Settled', value: formatCurrency(totalPaid) },
            { label: 'Total Balance Due', value: formatCurrency(totalDue) },
          ],
        };
      }

      // 3. SALE REPORT
      case 'sale_report': {
        const rows = filteredSales.map((s) => ({
          id: s.id,
          cells: [
            formatToDDMMYYYY(s.saleDate),
            s.invoiceNo,
            s.customerName,
            formatCurrency(s.subtotal),
            formatCurrency(s.totalTax),
            formatCurrency(s.grandTotal),
            formatCurrency(s.paidAmount),
            formatCurrency(s.balance),
            s.paymentStatus,
          ],
        }));
        const subtotalSum = filteredSales.reduce((acc, s) => acc + s.subtotal, 0);
        const taxSum = filteredSales.reduce((acc, s) => acc + s.totalTax, 0);
        const grandSum = filteredSales.reduce((acc, s) => acc + s.grandTotal, 0);
        const paidSum = filteredSales.reduce((acc, s) => acc + s.paidAmount, 0);
        const balSum = filteredSales.reduce((acc, s) => acc + s.balance, 0);
        return {
          title: 'Sale Invoices & Receivables Report',
          columns: [
            { label: 'Date', align: 'left', isMono: true },
            { label: 'Invoice No', align: 'left', isBold: true },
            { label: 'Customer Name', align: 'left' },
            { label: 'Taxable Value', align: 'right' },
            { label: 'Total Tax', align: 'right' },
            { label: 'Grand Total', align: 'right', isBold: true },
            { label: 'Paid (₹)', align: 'right' },
            { label: 'Balance (₹)', align: 'right' },
            { label: 'Status', align: 'center' },
          ],
          rows,
          summary: [
            { label: 'Total Invoices', value: `${filteredSales.length}` },
            { label: 'Total Taxable Turnover', value: formatCurrency(subtotalSum) },
            { label: 'Total Tax Collected', value: formatCurrency(taxSum) },
            { label: 'Total Sales Revenue', value: formatCurrency(grandSum) },
            { label: 'Total Paid', value: formatCurrency(paidSum) },
            { label: 'Total Outstanding Balance', value: formatCurrency(balSum) },
          ],
        };
      }

      // 4. PURCHASE REPORT
      case 'purchase_report': {
        const rows = filteredPurchases.map((p) => ({
          id: p.id,
          cells: [
            formatToDDMMYYYY(p.purchaseDate),
            p.purchaseNo,
            p.supplierName,
            formatCurrency(p.subtotal),
            formatCurrency(p.tax || 0),
            formatCurrency(p.grandTotal),
            formatCurrency(p.paidAmount),
            formatCurrency(p.balance),
            p.paymentStatus,
          ],
        }));
        const subtotalSum = filteredPurchases.reduce((acc, p) => acc + p.subtotal, 0);
        const taxSum = filteredPurchases.reduce((acc, p) => acc + (p.tax || 0), 0);
        const grandSum = filteredPurchases.reduce((acc, p) => acc + p.grandTotal, 0);
        const paidSum = filteredPurchases.reduce((acc, p) => acc + p.paidAmount, 0);
        const balSum = filteredPurchases.reduce((acc, p) => acc + p.balance, 0);
        return {
          title: 'Purchase Bills & Procurement Report',
          columns: [
            { label: 'Date', align: 'left', isMono: true },
            { label: 'Purchase No', align: 'left', isBold: true },
            { label: 'Supplier Name', align: 'left' },
            { label: 'Taxable Value', align: 'right' },
            { label: 'Tax Paid', align: 'right' },
            { label: 'Grand Total', align: 'right', isBold: true },
            { label: 'Paid Amount', align: 'right' },
            { label: 'Balance Payable', align: 'right' },
            { label: 'Status', align: 'center' },
          ],
          rows,
          summary: [
            { label: 'Total Purchase Bills', value: `${filteredPurchases.length}` },
            { label: 'Total Taxable Purchases', value: formatCurrency(subtotalSum) },
            { label: 'Total Tax Paid', value: formatCurrency(taxSum) },
            { label: 'Total Procurement Cost', value: formatCurrency(grandSum) },
            { label: 'Total Payments Released', value: formatCurrency(paidSum) },
            { label: 'Total Outstanding Payable', value: formatCurrency(balSum) },
          ],
        };
      }

      // 5. DAY BOOK
      case 'day_book': {
        const rows = allTransactions.map((t) => ({
          id: t.id,
          cells: [
            formatToDDMMYYYY(t.date),
            t.type,
            t.refNo,
            t.partyName,
            t.paymentMode || 'Cash',
            t.type === 'Sale' || t.type === 'Purchase Return' ? formatCurrency(t.totalAmount) : '₹ 0.00',
            t.type === 'Purchase' || t.type === 'Sales Return' ? formatCurrency(t.totalAmount) : '₹ 0.00',
            t.status,
          ],
        }));
        const totalInflows = allTransactions
          .filter((t) => t.type === 'Sale' || t.type === 'Purchase Return')
          .reduce((acc, t) => acc + t.totalAmount, 0);
        const totalOutflows = allTransactions
          .filter((t) => t.type === 'Purchase' || t.type === 'Sales Return')
          .reduce((acc, t) => acc + t.totalAmount, 0);
        return {
          title: 'Day Book & Daily Register Report',
          columns: [
            { label: 'Date', align: 'left', isMono: true },
            { label: 'Voucher Type', align: 'center', isBold: true },
            { label: 'Voucher No.', align: 'left', isBold: true },
            { label: 'Party / Account', align: 'left' },
            { label: 'Payment Mode', align: 'left' },
            { label: 'Inflow / Debit', align: 'right', isBold: true },
            { label: 'Outflow / Credit', align: 'right', isBold: true },
            { label: 'Status', align: 'center' },
          ],
          rows,
          summary: [
            { label: 'Total Daily Inflows', value: formatCurrency(totalInflows) },
            { label: 'Total Daily Outflows', value: formatCurrency(totalOutflows) },
            { label: 'Net Day Balance', value: formatCurrency(totalInflows - totalOutflows) },
          ],
        };
      }

      // 6. SALES SUMMARY
      case 'sales_summary': {
        const rows = filteredSales.map((s) => ({
          id: s.id,
          cells: [
            s.invoiceNo,
            formatToDDMMYYYY(s.saleDate),
            s.customerName,
            `${(s.items || []).reduce((a, b) => a + b.quantity, 0)} Items`,
            s.paymentMethod,
            formatCurrency(s.subtotal),
            formatCurrency(s.totalTax),
            formatCurrency(s.grandTotal),
            s.paymentStatus,
          ],
        }));
        const totalGrand = filteredSales.reduce((acc, s) => acc + s.grandTotal, 0);
        const avgOrder = filteredSales.length ? totalGrand / filteredSales.length : 0;
        return {
          title: 'Sales Performance & Analytics Summary Report',
          columns: [
            { label: 'Invoice No.', align: 'left', isBold: true },
            { label: 'Date', align: 'left', isMono: true },
            { label: 'Customer', align: 'left' },
            { label: 'Items Qty', align: 'center' },
            { label: 'Payment Method', align: 'left' },
            { label: 'Subtotal', align: 'right' },
            { label: 'Tax (₹)', align: 'right' },
            { label: 'Grand Total', align: 'right', isBold: true },
            { label: 'Status', align: 'center' },
          ],
          rows,
          summary: [
            { label: 'Total Orders Count', value: `${filteredSales.length}` },
            { label: 'Total Sales Turnover', value: formatCurrency(totalGrand) },
            { label: 'Average Order Value (AOV)', value: formatCurrency(avgOrder) },
          ],
        };
      }

      // 7. CUSTOMER STATEMENT (LEDGER)
      case 'customer_statement': {
        const rows = filteredSales.map((s) => ({
          id: s.id,
          cells: [
            formatToDDMMYYYY(s.saleDate),
            s.invoiceNo,
            s.customerName,
            'Sales Invoice',
            formatCurrency(s.grandTotal),
            formatCurrency(s.paidAmount),
            formatCurrency(s.balance),
            s.paymentStatus,
          ],
        }));
        const billedSum = filteredSales.reduce((acc, s) => acc + s.grandTotal, 0);
        const recSum = filteredSales.reduce((acc, s) => acc + s.paidAmount, 0);
        const dueSum = filteredSales.reduce((acc, s) => acc + s.balance, 0);
        return {
          title: 'Customer Statement & Account Ledger Report',
          columns: [
            { label: 'Date', align: 'left', isMono: true },
            { label: 'Invoice / Ref No.', align: 'left', isBold: true },
            { label: 'Customer Name', align: 'left' },
            { label: 'Transaction Type', align: 'center' },
            { label: 'Debit / Billed (₹)', align: 'right', isBold: true },
            { label: 'Credit / Paid (₹)', align: 'right' },
            { label: 'Balance Due (₹)', align: 'right', isBold: true },
            { label: 'Status', align: 'center' },
          ],
          rows,
          summary: [
            { label: 'Total Invoiced Amount', value: formatCurrency(billedSum) },
            { label: 'Total Payments Received', value: formatCurrency(recSum) },
            { label: 'Total Closing Balance Due', value: formatCurrency(dueSum) },
          ],
        };
      }

      // 8. SALES BY CUSTOMER
      case 'sales_by_customer': {
        const customerMap = new Map<
          string,
          { name: string; phone: string; count: number; total: number; paid: number; balance: number }
        >();
        filteredSales.forEach((s) => {
          const key = s.customerId || s.customerName;
          const current = customerMap.get(key) || {
            name: s.customerName,
            phone: s.customerPhone || 'N/A',
            count: 0,
            total: 0,
            paid: 0,
            balance: 0,
          };
          current.count += 1;
          current.total += s.grandTotal;
          current.paid += s.paidAmount;
          current.balance += s.balance;
          customerMap.set(key, current);
        });
        const rows = Array.from(customerMap.entries()).map(([k, val]) => ({
          id: k,
          cells: [
            val.name,
            val.phone,
            `${val.count} Invoices`,
            formatCurrency(val.total),
            formatCurrency(val.paid),
            formatCurrency(val.balance),
          ],
        }));
        const totalSales = Array.from(customerMap.values()).reduce((acc, c) => acc + c.total, 0);
        const totalDue = Array.from(customerMap.values()).reduce((acc, c) => acc + c.balance, 0);
        return {
          title: 'Sales by Customer & Account Revenue Report',
          columns: [
            { label: 'Customer Name', align: 'left', isBold: true },
            { label: 'Contact Phone', align: 'left' },
            { label: 'Total Invoices', align: 'center' },
            { label: 'Total Revenue (₹)', align: 'right', isBold: true },
            { label: 'Total Paid (₹)', align: 'right' },
            { label: 'Outstanding Balance (₹)', align: 'right', isBold: true },
          ],
          rows,
          summary: [
            { label: 'Total Unique Clients', value: `${customerMap.size}` },
            { label: 'Total Sales Volume', value: formatCurrency(totalSales) },
            { label: 'Total Pending Receivables', value: formatCurrency(totalDue) },
          ],
        };
      }

      // 9. SALES RETURN REPORT
      case 'sales_return_report': {
        const rows = filteredSalesReturns.map((r) => ({
          id: r.id,
          cells: [
            formatToDDMMYYYY(r.returnDate),
            r.returnNo,
            r.invoiceNo,
            r.customerName,
            r.items?.[0]?.reason || r.notes || 'Defective Goods',
            formatCurrency(r.returnAmount),
            r.refundStatus,
          ],
        }));
        const totalReturnVal = filteredSalesReturns.reduce((acc, r) => acc + r.returnAmount, 0);
        return {
          title: 'Sales Return & Credit Notes Report',
          columns: [
            { label: 'Return Date', align: 'left', isMono: true },
            { label: 'Credit Note / Return #', align: 'left', isBold: true },
            { label: 'Original Invoice #', align: 'left' },
            { label: 'Customer Name', align: 'left' },
            { label: 'Return Reason', align: 'left' },
            { label: 'Returned Value (₹)', align: 'right', isBold: true },
            { label: 'Refund Status', align: 'center' },
          ],
          rows,
          summary: [
            { label: 'Total Return Claims', value: `${filteredSalesReturns.length}` },
            { label: 'Total Returned Value', value: formatCurrency(totalReturnVal) },
          ],
        };
      }

      // 9A. COLLECTION REPORT
      case 'collection_summary': {
        const todayStr = '2026-10-08';
        const rows = filteredSales.map((s) => {
          const paid = s.paidAmount || 0;
          const outstanding = s.balance !== undefined ? s.balance : Math.max(0, s.grandTotal - paid);
          const rep = salesRepresentatives.find(
            (r) =>
              r.id ===
              (s.salesRepresentativeId ||
                customers.find((c) => c.id === s.customerId)?.salesRepresentativeId)
          );
          let status = 'Paid';
          if (outstanding > 0) {
            if (s.dueDate && s.dueDate < todayStr) status = 'Overdue';
            else if (s.dueDate && s.dueDate === todayStr) status = 'Due Today';
            else status = 'Upcoming';
          }
          return {
            id: s.id,
            cells: [
              s.customerName || 'Customer',
              s.invoiceNo,
              formatToDDMMYYYY(s.saleDate),
              formatToDDMMYYYY(s.dueDate || s.saleDate),
              formatCurrency(s.grandTotal),
              formatCurrency(paid),
              formatCurrency(outstanding),
              rep?.name || 'Unassigned',
              status,
            ],
          };
        });

        const totalInvoiced = filteredSales.reduce((acc, s) => acc + s.grandTotal, 0);
        const totalCollected = filteredSales.reduce((acc, s) => acc + (s.paidAmount || 0), 0);
        const totalOutstanding = filteredSales.reduce(
          (acc, s) =>
            acc + (s.balance !== undefined ? s.balance : Math.max(0, s.grandTotal - (s.paidAmount || 0))),
          0
        );
        const overdueAmount = filteredSales
          .filter((s) => {
            const bal =
              s.balance !== undefined ? s.balance : Math.max(0, s.grandTotal - (s.paidAmount || 0));
            return bal > 0 && s.dueDate && s.dueDate < todayStr;
          })
          .reduce(
            (acc, s) =>
              acc + (s.balance !== undefined ? s.balance : Math.max(0, s.grandTotal - (s.paidAmount || 0))),
            0
          );
        const dueTodayAmount = filteredSales
          .filter((s) => {
            const bal =
              s.balance !== undefined ? s.balance : Math.max(0, s.grandTotal - (s.paidAmount || 0));
            return bal > 0 && s.dueDate && s.dueDate === todayStr;
          })
          .reduce(
            (acc, s) =>
              acc + (s.balance !== undefined ? s.balance : Math.max(0, s.grandTotal - (s.paidAmount || 0))),
            0
          );
        const collectionRate =
          totalInvoiced > 0 ? Math.min(100, (totalCollected / totalInvoiced) * 100) : 0;

        return {
          title: 'Customer Collections & Dues Summary Report',
          columns: [
            { label: 'Customer Name', align: 'left', isBold: true },
            { label: 'Invoice No', align: 'left', isMono: true },
            { label: 'Invoice Date', align: 'left', isMono: true },
            { label: 'Due Date', align: 'left', isMono: true },
            { label: 'Invoice Total', align: 'right' },
            { label: 'Collected Amount', align: 'right' },
            { label: 'Outstanding Balance', align: 'right', isBold: true },
            { label: 'Sales Representative', align: 'left' },
            { label: 'Status', align: 'center' },
          ],
          rows,
          summary: [
            { label: 'Total Outstanding', value: formatCurrency(totalOutstanding) },
            { label: 'Total Collected', value: formatCurrency(totalCollected) },
            { label: 'Overdue Amount', value: formatCurrency(overdueAmount) },
            { label: 'Due Today', value: formatCurrency(dueTodayAmount) },
            { label: 'Collection Rate', value: `${collectionRate.toFixed(1)}%` },
          ],
        };
      }

      // 9B. SALES REPRESENTATIVE COLLECTION REPORT
      case 'sales_rep_collections': {
        const todayStr = '2026-10-08';
        const rows = salesRepresentatives.map((rep) => {
          const assignedCustomers = customers.filter((c) => c.salesRepresentativeId === rep.id);
          const repInvoices = filteredSales.filter(
            (s) =>
              s.salesRepresentativeId === rep.id ||
              assignedCustomers.some((c) => c.id === s.customerId)
          );
          const totalOut = repInvoices.reduce(
            (acc, s) =>
              acc + (s.balance !== undefined ? s.balance : Math.max(0, s.grandTotal - (s.paidAmount || 0))),
            0
          );
          const totalOverdue = repInvoices
            .filter((s) => {
              const bal =
                s.balance !== undefined ? s.balance : Math.max(0, s.grandTotal - (s.paidAmount || 0));
              return bal > 0 && s.dueDate && s.dueDate < todayStr;
            })
            .reduce(
              (acc, s) =>
                acc + (s.balance !== undefined ? s.balance : Math.max(0, s.grandTotal - (s.paidAmount || 0))),
              0
            );
          const totalCollected = repInvoices.reduce((acc, s) => acc + (s.paidAmount || 0), 0);
          const totalBilled = totalCollected + totalOut;
          const rate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;

          return {
            id: rep.id,
            cells: [
              rep.name,
              `${assignedCustomers.length}`,
              formatCurrency(totalOut),
              formatCurrency(totalOverdue),
              formatCurrency(totalCollected),
              `${rate.toFixed(1)}%`,
            ],
          };
        });

        const totalRepsOut = salesRepresentatives.reduce((acc, rep) => {
          const assigned = customers.filter((c) => c.salesRepresentativeId === rep.id);
          const invs = filteredSales.filter(
            (s) => s.salesRepresentativeId === rep.id || assigned.some((c) => c.id === s.customerId)
          );
          return (
            acc +
            invs.reduce(
              (sub, s) =>
                sub + (s.balance !== undefined ? s.balance : Math.max(0, s.grandTotal - (s.paidAmount || 0))),
              0
            )
          );
        }, 0);

        const totalRepsCol = salesRepresentatives.reduce((acc, rep) => {
          const assigned = customers.filter((c) => c.salesRepresentativeId === rep.id);
          const invs = filteredSales.filter(
            (s) => s.salesRepresentativeId === rep.id || assigned.some((c) => c.id === s.customerId)
          );
          return acc + invs.reduce((sub, s) => sub + (s.paidAmount || 0), 0);
        }, 0);

        const overallRepRate =
          totalRepsOut + totalRepsCol > 0 ? (totalRepsCol / (totalRepsOut + totalRepsCol)) * 100 : 0;

        return {
          title: 'Sales Representative Collection Performance Report',
          columns: [
            { label: 'Representative', align: 'left', isBold: true },
            { label: 'Customers', align: 'center' },
            { label: 'Outstanding', align: 'right', isBold: true },
            { label: 'Overdue', align: 'right' },
            { label: 'Collected', align: 'right' },
            { label: 'Collection Rate', align: 'center' },
          ],
          rows,
          summary: [
            { label: 'Active Representatives', value: `${salesRepresentatives.length}` },
            { label: 'Total Assigned Outstanding', value: formatCurrency(totalRepsOut) },
            { label: 'Total Collected by Reps', value: formatCurrency(totalRepsCol) },
            { label: 'Overall Recovery Rate', value: `${overallRepRate.toFixed(1)}%` },
          ],
        };
      }

      // 9C. CUSTOMER AGING REPORT
      case 'customer_aging_report': {
        const todayTime = new Date('2026-10-08').getTime();
        let totalBucket0_30 = 0;
        let totalBucket31_60 = 0;
        let totalBucket61_90 = 0;
        let totalBucket90Plus = 0;

        const customerRows = customers.map((c) => {
          const custInvoices = filteredSales.filter(
            (s) => s.customerId === c.id || s.customerName?.toLowerCase() === c.name.toLowerCase()
          );

          let b0_30 = 0;
          let b31_60 = 0;
          let b61_90 = 0;
          let b90Plus = 0;

          custInvoices.forEach((s) => {
            const bal =
              s.balance !== undefined ? s.balance : Math.max(0, s.grandTotal - (s.paidAmount || 0));
            if (bal > 0) {
              const invDate = new Date(s.dueDate || s.saleDate).getTime();
              const diffDays = Math.max(0, Math.floor((todayTime - invDate) / (1000 * 3600 * 24)));

              if (diffDays <= 30) b0_30 += bal;
              else if (diffDays <= 60) b31_60 += bal;
              else if (diffDays <= 90) b61_90 += bal;
              else b90Plus += bal;
            }
          });

          const custTotal = b0_30 + b31_60 + b61_90 + b90Plus;
          totalBucket0_30 += b0_30;
          totalBucket31_60 += b31_60;
          totalBucket61_90 += b61_90;
          totalBucket90Plus += b90Plus;

          const rep = salesRepresentatives.find((r) => r.id === c.salesRepresentativeId);

          return {
            id: c.id,
            cells: [
              c.name,
              rep?.name || 'Unassigned',
              formatCurrency(b0_30),
              formatCurrency(b31_60),
              formatCurrency(b61_90),
              formatCurrency(b90Plus),
              formatCurrency(custTotal),
            ],
          };
        });

        const grandTotal = totalBucket0_30 + totalBucket31_60 + totalBucket61_90 + totalBucket90Plus;

        return {
          title: 'Customer Receivables Aging Analysis Report',
          columns: [
            { label: 'Customer', align: 'left', isBold: true },
            { label: 'Representative', align: 'left' },
            { label: '0–30 Days', align: 'right' },
            { label: '31–60 Days', align: 'right' },
            { label: '61–90 Days', align: 'right' },
            { label: '90+ Days', align: 'right' },
            { label: 'Total Outstanding', align: 'right', isBold: true },
          ],
          rows: customerRows,
          summary: [
            { label: '0–30 Days Total', value: formatCurrency(totalBucket0_30) },
            { label: '31–60 Days Total', value: formatCurrency(totalBucket31_60) },
            { label: '61–90 Days Total', value: formatCurrency(totalBucket61_90) },
            { label: '90+ Days Total', value: formatCurrency(totalBucket90Plus) },
            { label: 'Grand Total Outstanding', value: formatCurrency(grandTotal) },
          ],
        };
      }

      // 10. STOCK SUMMARY & VALUATION
      case 'stock_summary': {
        const rows = stocks.map((st) => ({
          id: st.id,
          cells: [
            st.sku,
            st.productName,
            st.category || 'General',
            st.unit || 'Units',
            `${st.inStock}`,
            formatCurrency(st.unitCost || 0),
            formatCurrency(st.unitPrice || 0),
            formatCurrency(st.inStock * (st.unitCost || 0)),
          ],
        }));
        const totalStockUnits = stocks.reduce((acc, s) => acc + s.inStock, 0);
        const totalStockValue = stocks.reduce((acc, s) => acc + s.inStock * (s.unitCost || 0), 0);
        return {
          title: 'Stock Summary & Inventory Valuation Report',
          columns: [
            { label: 'SKU / Code', align: 'left', isBold: true },
            { label: 'Product Name', align: 'left' },
            { label: 'Category', align: 'left' },
            { label: 'Unit', align: 'center' },
            { label: 'In Stock Qty', align: 'right', isBold: true },
            { label: 'Unit Cost (₹)', align: 'right' },
            { label: 'Selling Price (₹)', align: 'right' },
            { label: 'Total Asset Valuation', align: 'right', isBold: true },
          ],
          rows,
          summary: [
            { label: 'Total SKU Items', value: `${stocks.length}` },
            { label: 'Total Physical Units', value: `${totalStockUnits} Units` },
            { label: 'Total Inventory Valuation', value: formatCurrency(totalStockValue) },
          ],
        };
      }

      // 11. LOW STOCK & REORDER ALERT
      case 'low_stock_summary': {
        const lowItems = stocks.filter((st) => st.inStock <= (st.reorderLevel || 10));
        const rows = lowItems.map((st) => {
          const reorder = st.reorderLevel || 10;
          const deficit = Math.max(0, reorder - st.inStock);
          const estCost = deficit * (st.unitCost || 0);
          return {
            id: st.id,
            cells: [
              st.sku,
              st.productName,
              st.category || 'General',
              `${st.inStock}`,
              `${reorder}`,
              `${deficit}`,
              formatCurrency(st.unitCost || 0),
              formatCurrency(estCost),
            ],
          };
        });
        const totalDeficitUnits = lowItems.reduce((acc, s) => acc + Math.max(0, (s.reorderLevel || 10) - s.inStock), 0);
        const totalRestockInvestment = lowItems.reduce(
          (acc, s) => acc + Math.max(0, (s.reorderLevel || 10) - s.inStock) * (s.unitCost || 0),
          0
        );
        return {
          title: 'Low Stock & Reorder Alert Report',
          columns: [
            { label: 'SKU', align: 'left', isBold: true },
            { label: 'Product Name', align: 'left' },
            { label: 'Category', align: 'left' },
            { label: 'Current Stock', align: 'right', isBold: true },
            { label: 'Min Reorder Level', align: 'right' },
            { label: 'Deficit Qty', align: 'right', isBold: true },
            { label: 'Unit Cost (₹)', align: 'right' },
            { label: 'Est. Restock Cost', align: 'right', isBold: true },
          ],
          rows,
          summary: [
            { label: 'Low Stock SKU Count', value: `${lowItems.length}` },
            { label: 'Total Deficit Units', value: `${totalDeficitUnits} Units` },
            { label: 'Est. Restock Investment', value: formatCurrency(totalRestockInvestment) },
          ],
        };
      }

      // 12. ITEM STOCK MOVEMENT
      case 'item_movement': {
        const rows: Array<{ id: string; cells: string[] }> = [];
        filteredSales.forEach((s) => {
          (s.items || []).forEach((item, idx) => {
            rows.push({
              id: `sale-${s.id}-${idx}`,
              cells: [
                formatToDDMMYYYY(s.saleDate),
                item.productName,
                'Outward (Sale)',
                s.invoiceNo,
                s.customerName,
                `-${item.quantity}`,
                formatCurrency(item.unitPrice || 0),
                formatCurrency(item.total),
              ],
            });
          });
        });
        filteredPurchases.forEach((p) => {
          (p.items || []).forEach((item, idx) => {
            rows.push({
              id: `purch-${p.id}-${idx}`,
              cells: [
                formatToDDMMYYYY(p.purchaseDate),
                item.productName,
                'Inward (Purchase)',
                p.purchaseNo,
                p.supplierName,
                `+${item.quantity}`,
                formatCurrency(item.purchasePrice || 0),
                formatCurrency(item.total),
              ],
            });
          });
        });
        return {
          title: 'Item Stock Movement & Audit Trail Report',
          columns: [
            { label: 'Date', align: 'left', isMono: true },
            { label: 'Product Item', align: 'left', isBold: true },
            { label: 'Movement Type', align: 'center', isBold: true },
            { label: 'Ref / Voucher #', align: 'left' },
            { label: 'Party Name', align: 'left' },
            { label: 'Qty Moved', align: 'right', isBold: true },
            { label: 'Unit Rate (₹)', align: 'right' },
            { label: 'Total Value (₹)', align: 'right', isBold: true },
          ],
          rows: rows.slice(0, 30),
          summary: [
            { label: 'Total Audit Movements', value: `${rows.length} lines` },
            { label: 'Movement Period', value: formattedDateRange },
          ],
        };
      }

      // 13. CATEGORY-WISE STOCK
      case 'category_stock': {
        const catMap = new Map<string, { count: number; units: number; val: number }>();
        stocks.forEach((st) => {
          const cat = st.category || 'General';
          const cur = catMap.get(cat) || { count: 0, units: 0, val: 0 };
          cur.count += 1;
          cur.units += st.inStock;
          cur.val += st.inStock * (st.unitCost || 0);
          catMap.set(cat, cur);
        });
        const rows = Array.from(catMap.entries()).map(([cat, val]) => ({
          id: cat,
          cells: [
            cat,
            `${val.count} SKUs`,
            `${val.units} Units`,
            formatCurrency(val.units ? val.val / val.units : 0),
            formatCurrency(val.val),
          ],
        }));
        const totalCatVal = Array.from(catMap.values()).reduce((acc, c) => acc + c.val, 0);
        return {
          title: 'Category-wise Stock & Valuation Report',
          columns: [
            { label: 'Category Name', align: 'left', isBold: true },
            { label: 'Unique Products', align: 'center' },
            { label: 'In-Stock Units', align: 'right', isBold: true },
            { label: 'Avg. Unit Cost', align: 'right' },
            { label: 'Category Valuation (₹)', align: 'right', isBold: true },
          ],
          rows,
          summary: [
            { label: 'Total Categories', value: `${catMap.size}` },
            { label: 'Total Portfolio Asset Value', value: formatCurrency(totalCatVal) },
          ],
        };
      }

      // 14. PURCHASE SUMMARY
      case 'purchase_summary': {
        const rows = filteredPurchases.map((p) => ({
          id: p.id,
          cells: [
            p.purchaseNo,
            formatToDDMMYYYY(p.purchaseDate),
            p.supplierName,
            `${(p.items || []).reduce((a, b) => a + b.quantity, 0)} Items`,
            p.paymentMethod,
            formatCurrency(p.subtotal),
            formatCurrency(p.tax || 0),
            formatCurrency(p.grandTotal),
            p.paymentStatus,
          ],
        }));
        const totalPurchases = filteredPurchases.reduce((acc, p) => acc + p.grandTotal, 0);
        return {
          title: 'Purchase Summary & Procurement Analytics Report',
          columns: [
            { label: 'Purchase No', align: 'left', isBold: true },
            { label: 'Date', align: 'left', isMono: true },
            { label: 'Supplier Name', align: 'left' },
            { label: 'Items Qty', align: 'center' },
            { label: 'Payment Mode', align: 'left' },
            { label: 'Subtotal (₹)', align: 'right' },
            { label: 'Tax (₹)', align: 'right' },
            { label: 'Grand Total (₹)', align: 'right', isBold: true },
            { label: 'Status', align: 'center' },
          ],
          rows,
          summary: [
            { label: 'Total Purchase Orders', value: `${filteredPurchases.length}` },
            { label: 'Total Procurement Expenditure', value: formatCurrency(totalPurchases) },
          ],
        };
      }

      // 15. SUPPLIER STATEMENT (LEDGER)
      case 'supplier_statement': {
        const rows = filteredPurchases.map((p) => ({
          id: p.id,
          cells: [
            formatToDDMMYYYY(p.purchaseDate),
            p.purchaseNo,
            p.supplierName,
            'Purchase Bill',
            formatCurrency(p.grandTotal),
            formatCurrency(p.paidAmount),
            formatCurrency(p.balance),
            p.paymentStatus,
          ],
        }));
        const billedSum = filteredPurchases.reduce((acc, p) => acc + p.grandTotal, 0);
        const paidSum = filteredPurchases.reduce((acc, p) => acc + p.paidAmount, 0);
        const dueSum = filteredPurchases.reduce((acc, p) => acc + p.balance, 0);
        return {
          title: 'Supplier Statement & Account Ledger Report',
          columns: [
            { label: 'Date', align: 'left', isMono: true },
            { label: 'Bill / Purchase #', align: 'left', isBold: true },
            { label: 'Supplier Name', align: 'left' },
            { label: 'Type', align: 'center' },
            { label: 'Billed / Credit (₹)', align: 'right', isBold: true },
            { label: 'Paid / Debit (₹)', align: 'right' },
            { label: 'Balance Payable (₹)', align: 'right', isBold: true },
            { label: 'Status', align: 'center' },
          ],
          rows,
          summary: [
            { label: 'Total Billed by Suppliers', value: formatCurrency(billedSum) },
            { label: 'Total Payments Released', value: formatCurrency(paidSum) },
            { label: 'Total Outstanding Payable', value: formatCurrency(dueSum) },
          ],
        };
      }

      // 16. PURCHASE BY SUPPLIER
      case 'purchase_by_supplier': {
        const supMap = new Map<string, { name: string; count: number; total: number; paid: number; balance: number }>();
        filteredPurchases.forEach((p) => {
          const key = p.supplierId || p.supplierName;
          const cur = supMap.get(key) || { name: p.supplierName, count: 0, total: 0, paid: 0, balance: 0 };
          cur.count += 1;
          cur.total += p.grandTotal;
          cur.paid += p.paidAmount;
          cur.balance += p.balance;
          supMap.set(key, cur);
        });
        const rows = Array.from(supMap.entries()).map(([k, val]) => ({
          id: k,
          cells: [
            val.name,
            `${val.count} Bills`,
            formatCurrency(val.total),
            formatCurrency(val.paid),
            formatCurrency(val.balance),
          ],
        }));
        const totalProcurement = Array.from(supMap.values()).reduce((acc, s) => acc + s.total, 0);
        const totalPayables = Array.from(supMap.values()).reduce((acc, s) => acc + s.balance, 0);
        return {
          title: 'Purchase by Supplier & Vendor Expenditure Report',
          columns: [
            { label: 'Supplier Name', align: 'left', isBold: true },
            { label: 'Bills Count', align: 'center' },
            { label: 'Total Purchases (₹)', align: 'right', isBold: true },
            { label: 'Total Paid (₹)', align: 'right' },
            { label: 'Outstanding Payable (₹)', align: 'right', isBold: true },
          ],
          rows,
          summary: [
            { label: 'Total Active Suppliers', value: `${supMap.size}` },
            { label: 'Total Procurement Volume', value: formatCurrency(totalProcurement) },
            { label: 'Total Balance Payable', value: formatCurrency(totalPayables) },
          ],
        };
      }

      // 17. PURCHASE RETURN (DEBIT NOTE)
      case 'purchase_return_report': {
        const rows = filteredPurchaseReturns.map((r) => ({
          id: r.id,
          cells: [
            formatToDDMMYYYY(r.returnDate),
            r.returnNo,
            r.purchaseNo,
            r.supplierName,
            r.notes || 'Goods Returned to Vendor',
            formatCurrency(r.returnAmount),
            r.refundStatus,
          ],
        }));
        const totalPRet = filteredPurchaseReturns.reduce((acc, r) => acc + r.returnAmount, 0);
        return {
          title: 'Purchase Return (Debit Note) Report',
          columns: [
            { label: 'Date', align: 'left', isMono: true },
            { label: 'Debit Note #', align: 'left', isBold: true },
            { label: 'Original Purchase #', align: 'left' },
            { label: 'Supplier Name', align: 'left' },
            { label: 'Reason / Remarks', align: 'left' },
            { label: 'Returned Value (₹)', align: 'right', isBold: true },
            { label: 'Refund / Adjustment', align: 'center' },
          ],
          rows,
          summary: [
            { label: 'Total Debit Notes', value: `${filteredPurchaseReturns.length}` },
            { label: 'Total Returned Value', value: formatCurrency(totalPRet) },
          ],
        };
      }

      // 18. HSN SUMMARY
      case 'hsn_summary': {
        const hsnMap = new Map<string, { desc: string; qty: number; taxable: number; tax: number }>();
        filteredSales.forEach((s) => {
          (s.items || []).forEach((item) => {
            const hsn = item.sku || 'HSN-8471';
            const cur = hsnMap.get(hsn) || { desc: item.productName, qty: 0, taxable: 0, tax: 0 };
            cur.qty += item.quantity;
            cur.taxable += item.total;
            cur.tax += (item.total * (item.taxPercent || 18)) / 100;
            hsnMap.set(hsn, cur);
          });
        });
        const rows = Array.from(hsnMap.entries()).map(([hsn, val]) => {
          const halfTax = val.tax / 2;
          return {
            id: hsn,
            cells: [
              hsn,
              val.desc,
              `${val.qty}`,
              formatCurrency(val.taxable),
              formatCurrency(halfTax),
              formatCurrency(halfTax),
              formatCurrency(val.tax),
            ],
          };
        });
        const totalTaxable = Array.from(hsnMap.values()).reduce((acc, h) => acc + h.taxable, 0);
        const totalTax = Array.from(hsnMap.values()).reduce((acc, h) => acc + h.tax, 0);
        return {
          title: 'Sale Summary by HSN / SAC Code Report',
          columns: [
            { label: 'HSN / SAC Code', align: 'left', isBold: true },
            { label: 'Description', align: 'left' },
            { label: 'Total Qty Sold', align: 'right' },
            { label: 'Taxable Value (₹)', align: 'right', isBold: true },
            { label: 'CGST (9%)', align: 'right' },
            { label: 'SGST (9%)', align: 'right' },
            { label: 'Total Tax (₹)', align: 'right', isBold: true },
          ],
          rows,
          summary: [
            { label: 'Total Taxable Turnover', value: formatCurrency(totalTaxable) },
            { label: 'Total Tax Liability', value: formatCurrency(totalTax) },
          ],
        };
      }

      // 19. GST SUMMARY
      case 'gst_summary': {
        const slabMap = new Map<string, { count: number; taxable: number; cgst: number; sgst: number; totalGst: number }>();
        filteredSales.forEach((s) => {
          const rate = s.totalTax > 0 ? '18% GST' : '0% Exempt';
          const cur = slabMap.get(rate) || { count: 0, taxable: 0, cgst: 0, sgst: 0, totalGst: 0 };
          cur.count += 1;
          cur.taxable += s.subtotal;
          cur.cgst += s.totalTax / 2;
          cur.sgst += s.totalTax / 2;
          cur.totalGst += s.totalTax;
          slabMap.set(rate, cur);
        });
        const rows = Array.from(slabMap.entries()).map(([rate, val]) => ({
          id: rate,
          cells: [
            rate,
            `${val.count} Invoices`,
            formatCurrency(val.taxable),
            formatCurrency(val.cgst),
            formatCurrency(val.sgst),
            formatCurrency(val.totalGst),
          ],
        }));
        const totalTaxable = Array.from(slabMap.values()).reduce((acc, s) => acc + s.taxable, 0);
        const totalGst = Array.from(slabMap.values()).reduce((acc, s) => acc + s.totalGst, 0);
        return {
          title: 'GST Slabs Summary (GSTR-1 Report)',
          columns: [
            { label: 'GST Rate Slab', align: 'left', isBold: true },
            { label: 'Invoices Count', align: 'center' },
            { label: 'Taxable Value (₹)', align: 'right', isBold: true },
            { label: 'CGST Amount (₹)', align: 'right' },
            { label: 'SGST Amount (₹)', align: 'right' },
            { label: 'Total GST Amount (₹)', align: 'right', isBold: true },
          ],
          rows,
          summary: [
            { label: 'Total Invoices', value: `${filteredSales.length}` },
            { label: 'Total Taxable Turnover', value: formatCurrency(totalTaxable) },
            { label: 'Total GST Liability', value: formatCurrency(totalGst) },
          ],
        };
      }

      default:
        return {
          title: currentReportMeta.label,
          columns: [
            { label: 'Date', align: 'left', isMono: true },
            { label: 'Reference', align: 'left', isBold: true },
            { label: 'Party', align: 'left' },
            { label: 'Total Amount', align: 'right', isBold: true },
          ],
          rows: [],
          summary: [{ label: 'Report Status', value: 'Ready' }],
        };
    }
  }, [
    activeReport,
    filteredSales,
    filteredPurchases,
    filteredSalesReturns,
    filteredPurchaseReturns,
    stocks,
    allTransactions,
    salesRepresentatives,
    customers,
    currentReportMeta,
    formattedDateRange,
  ]);

  // Dedicated Print Function for the clean preview document
  const handlePrintDocument = () => {
    const printEl = document.getElementById('report-document-printable-content');
    if (!printEl) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank', 'width=950,height=750');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${currentReportData.title}</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm 12mm 15mm 12mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #0f172a;
              background: #ffffff;
              margin: 0;
              padding: 12px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .report-title {
              text-align: center;
              font-size: 20px;
              font-weight: 800;
              text-decoration: underline;
              text-underline-offset: 4px;
              margin-bottom: 24px;
              color: #0f172a;
            }
            .meta-block {
              margin-bottom: 18px;
              font-size: 13px;
              line-height: 1.6;
              color: #0f172a;
            }
            .meta-block strong {
              font-weight: 800;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
              margin-bottom: 24px;
            }
            thead th {
              background-color: #e2e8f0 !important;
              border-top: 1px solid #cbd5e1;
              border-bottom: 1px solid #cbd5e1;
              padding: 7px 10px;
              text-align: left;
              font-weight: 700;
              color: #1e293b;
            }
            tbody td {
              padding: 7px 10px;
              border-bottom: 1px solid #f1f5f9;
              color: #1e293b;
            }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-bold { font-weight: 700; }
            .summary-box {
              margin-top: 24px;
              font-size: 13px;
              line-height: 1.8;
              color: #0f172a;
            }
            .summary-title {
              font-weight: 800;
              margin-bottom: 4px;
            }
          </style>
        </head>
        <body>
          ${printEl.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 350);
  };

  // Unified Dynamic CSV Export
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += currentReportData.columns.map((c) => `"${c.label}"`).join(',') + '\n';
    currentReportData.rows.forEach((r) => {
      csvContent += r.cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',') + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeReport}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported to CSV successfully!');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 font-sans pb-12">
      {/* 1. Header & Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Sale Report
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Unified analytics & transaction reports for Sales, Purchase, Inventory & GST
              </p>
            </div>
          </div>
        </div>

        {/* Global Actions: Preview & Print, Export CSV */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleExportCSV}
            className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-[13px] font-bold shadow-2xs transition-all cursor-pointer flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-[#33077C]" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md shadow-[#33077C]/20 hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2"
          >
            <Printer className="w-4 h-4 text-white" />
            <span>Preview &amp; Print</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-[#33077C]/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Sales (Revenue)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900">₹{totalSalesVal.toLocaleString('en-IN')}</p>
            <p className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1">
              <span>{filteredSales.length} Invoices</span> • <span>₹{totalReceivedVal.toLocaleString('en-IN')} Received</span>
            </p>
          </div>
        </div>

        {/* Sales Due (Receivables) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-[#33077C]/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sales Outstanding Due</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-amber-600">₹{totalSalesDueVal.toLocaleString('en-IN')}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Pending customer settlement</p>
          </div>
        </div>

        {/* Total Purchases */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-[#33077C]/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Purchases</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900">₹{totalPurchaseVal.toLocaleString('en-IN')}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              <span>{filteredPurchases.length} Purchase Bills</span>
            </p>
          </div>
        </div>

        {/* Stock Valuation */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-[#33077C]/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Stock Valuation</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#33077C] flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-[#33077C]">₹{totalStockVal.toLocaleString('en-IN')}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              <span>{stocks.length} SKU items in warehouse</span>
            </p>
          </div>
        </div>
      </div>

      {/* 3. Main Split View: Left Report Sidebar Menu & Right Report Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Navigation Menu (Report Hub) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200">
            <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-[#33077C]" />
              <span>Report Categories</span>
            </h2>
          </div>

          <div className="p-2 space-y-4 max-h-[750px] overflow-y-auto">
            {REPORT_MENU.map((group) => {
              const IconComponent = group.icon;
              return (
                <div key={group.category} className="space-y-1">
                  <div className="px-3 py-1.5 flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <IconComponent className="w-3.5 h-3.5 text-slate-400" />
                    <span>{group.label}</span>
                  </div>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const isActive = activeReport === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveReport(item.id)}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-between group cursor-pointer ${
                            isActive
                              ? 'bg-[#33077C] text-white font-bold shadow-xs'
                              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <span className="truncate">{item.label}</span>
                          <ChevronRight
                            className={`w-4 h-4 shrink-0 transition-transform ${
                              isActive ? 'text-white translate-x-0.5' : 'text-slate-300 group-hover:text-slate-600'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Report Content Area */}
        <div className="lg:col-span-9 space-y-4">
          {/* Active Report Header & Filters Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-[#33077C] flex items-center gap-2">
                  <span>{currentReportMeta.label}</span>
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-[#33077C] border border-purple-200 uppercase">
                    {currentReportMeta.category}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {currentReportMeta.description}
                </p>
              </div>

              {/* Date Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap bg-slate-50 p-1 rounded-xl border border-slate-200">
                {(['today', 'this_week', 'this_month', 'this_year', 'all', 'custom'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setTimeRange(r)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors capitalize cursor-pointer ${
                      timeRange === r
                        ? 'bg-[#33077C] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    {r.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Inputs & Search */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {timeRange === 'custom' && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="h-9.5 px-3 text-xs font-medium border border-slate-300 rounded-xl bg-white focus:outline-[#33077C]"
                  />
                  <span className="text-xs text-slate-400 font-bold">to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="h-9.5 px-3 text-xs font-medium border border-slate-300 rounded-xl bg-white focus:outline-[#33077C]"
                  />
                </div>
              )}

              {/* Search Bar */}
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by Bill #, Customer / Supplier name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-9.5 pl-9 pr-4 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-[#33077C] transition-all"
                />
              </div>

              {/* Party Selector */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Party:</span>
                <select
                  value={selectedPartyFilter}
                  onChange={(e) => setSelectedPartyFilter(e.target.value)}
                  className="h-9.5 px-3 text-xs font-medium border border-slate-300 rounded-xl bg-white focus:outline-[#33077C] cursor-pointer"
                >
                  <option value="ALL">All Parties</option>
                  <optgroup label="Customers">
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Suppliers">
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>
          </div>

          {/* Dynamic Table for Active Report */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/90 border-b border-slate-200 font-bold text-slate-700">
                    {currentReportData.columns.map((col, cIdx) => (
                      <th
                        key={cIdx}
                        className={`py-3 px-4 ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        }`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {currentReportData.rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={currentReportData.columns.length}
                        className="py-12 text-center text-slate-400 font-normal"
                      >
                        No records found for the selected time range and filters.
                      </td>
                    </tr>
                  ) : (
                    currentReportData.rows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                        {row.cells.map((cellVal, cellIdx) => {
                          const col: ReportColumn = currentReportData.columns[cellIdx] || { label: '', align: 'left' };
                          const isStatusCol = (col.label || '').toLowerCase().includes('status');
                          return (
                            <td
                              key={cellIdx}
                              className={`py-3 px-4 ${
                                col.align === 'right'
                                  ? 'text-right'
                                  : col.align === 'center'
                                  ? 'text-center'
                                  : 'text-left'
                              } ${col.isBold ? 'font-bold text-slate-900' : ''} ${
                                col.isMono ? 'font-mono text-slate-600' : ''
                              }`}
                            >
                              {isStatusCol ? (
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    String(cellVal).toLowerCase().includes('paid') ||
                                    String(cellVal).toLowerCase().includes('complete') ||
                                    String(cellVal).toLowerCase().includes('refunded')
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : String(cellVal).toLowerCase().includes('partial')
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}
                                >
                                  {cellVal}
                                </span>
                              ) : (
                                cellVal
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
                {currentReportData.summary.length > 0 && currentReportData.rows.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                      <td colSpan={currentReportData.columns.length} className="py-3 px-4">
                        <div className="flex flex-wrap items-center justify-end gap-6 text-xs">
                          {currentReportData.summary.map((sumItem, sIdx) => (
                            <div key={sIdx} className="flex items-center gap-1.5">
                              <span className="text-slate-500 font-semibold">{sumItem.label}:</span>
                              <span className="font-extrabold text-[#33077C]">{sumItem.value}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          REPORT PREVIEW & ISOLATED PRINT MODAL (Dynamic for ALL Categories)
         ========================================================================= */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Preview"
        maxWidth="5xl"
      >
        <div className="space-y-6 pt-1 text-slate-900 font-sans">
          {/* Document Content Canvas (What Gets Rendered & Printed) */}
          <div
            id="report-document-printable-content"
            className="p-6 sm:p-10 bg-white border border-slate-200/90 rounded-xl shadow-xs font-sans text-slate-800"
          >
            {/* Centered Bold Report Title */}
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 text-center tracking-tight underline decoration-2 underline-offset-4 mb-6">
              {currentReportData.title}
            </h2>

            {/* Metadata Info on Left */}
            <div className="space-y-1.5 mb-6 text-sm font-medium text-slate-900">
              <div>
                <span className="font-bold">Party Name: </span>
                <span className="font-bold">{activePartyName}</span>
              </div>
              <div>
                <span className="font-bold">Duration: </span>
                <span className="font-bold">{formattedDateRange}</span>
              </div>
            </div>

            {/* Document Table */}
            <div className="overflow-x-auto border-t border-b border-slate-300">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-200/90 border-b border-slate-300 font-bold text-slate-800">
                    {currentReportData.columns.map((col, cIdx) => (
                      <th
                        key={cIdx}
                        className={`py-2.5 px-3 ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        }`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                  {currentReportData.rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={currentReportData.columns.length}
                        className="py-8 text-center text-slate-400 font-normal"
                      >
                        No transactions found for the selected period.
                      </td>
                    </tr>
                  ) : (
                    currentReportData.rows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/50">
                        {row.cells.map((cellVal, cellIdx) => {
                          const col: ReportColumn = currentReportData.columns[cellIdx] || { label: '', align: 'left' };
                          return (
                            <td
                              key={cellIdx}
                              className={`py-2.5 px-3 ${
                                col.align === 'right'
                                  ? 'text-right'
                                  : col.align === 'center'
                                  ? 'text-center'
                                  : 'text-left'
                              } ${col.isBold ? 'font-bold text-slate-900' : ''} ${
                                col.isMono ? 'font-mono text-slate-800' : ''
                              }`}
                            >
                              {cellVal}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Document Summary on Left Below Table */}
            <div className="mt-6 pt-2 space-y-1.5 text-xs sm:text-sm text-slate-900">
              <div className="font-bold text-slate-900 mb-1">Summary</div>
              {currentReportData.summary.map((sumItem, sIdx) => (
                <div key={sIdx}>
                  <span>{sumItem.label}: </span>
                  <span className="font-bold text-slate-900">{sumItem.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Action Buttons (Pill-shaped as per reference & themed) */}
          <div className="pt-2 flex flex-wrap items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handlePrintDocument}
              className="h-9 px-4.5 rounded-full border border-purple-200 hover:border-purple-400 bg-white hover:bg-purple-50/60 text-[#33077C] text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            >
              Open PDF
            </button>
            <button
              type="button"
              onClick={handlePrintDocument}
              className="h-9 px-4.5 rounded-full border border-purple-200 hover:border-purple-400 bg-white hover:bg-purple-50/60 text-[#33077C] text-xs font-semibold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="h-9 px-4.5 rounded-full border border-purple-200 hover:border-purple-400 bg-white hover:bg-purple-50/60 text-[#33077C] text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            >
              Save PDF
            </button>
            <button
              type="button"
              onClick={() => toast.success('Report PDF dispatched via email!')}
              className="h-9 px-4.5 rounded-full border border-purple-200 hover:border-purple-400 bg-white hover:bg-purple-50/60 text-[#33077C] text-xs font-semibold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email PDF</span>
            </button>
            <button
              type="button"
              onClick={() => setIsPreviewOpen(false)}
              className="h-9 px-6 rounded-full bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold transition-all shadow-sm active:scale-[0.98] cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
