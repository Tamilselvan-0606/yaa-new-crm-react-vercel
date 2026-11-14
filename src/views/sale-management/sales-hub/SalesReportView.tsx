import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  IndianRupee,
  Download,
  Printer,
  Calendar,
  Filter,
  PieChart as PieIcon,
  Tag,
  Users,
  Layers,
  ArrowUpRight,
  FileSpreadsheet,
  Loader2,
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
import { SaleTransaction } from '../../../store/useSalesManagementStore';
import { commerceInvoiceApi, mapApiInvoiceToSaleTransaction } from '../../../api/commerce/invoiceApi';
import { salesReportApi, SalesReportSummary } from '../../../api/commerce/salesReportApi';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { toast } from "../../../utils/toast";
import { exportTableToExcel } from '../../../utils/excelExport';
import { printTableReport, downloadTableReport } from '../../../utils/printUtils';

import { formatDate } from '../utils/dateUtils';
import { DateInput } from "../../../components/common/DateInput";
const CHART_COLORS = ['#4309A2', '#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

export const SalesReportView: React.FC = () => {
  // Date Filter State
  const [timeRange, setTimeRange] = useState<'today' | 'this_week' | 'this_month' | 'this_year' | 'custom'>('this_month');
  const [customStartDate, setCustomStartDate] = useState(
    new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );


  // Server-side KPI summary (zero until the API responds)
  const [apiSummary, setApiSummary] = useState<SalesReportSummary | null>(null);
  useEffect(() => {
    let cancelled = false;
    const params =
      timeRange === 'custom'
        ? {
            from: customStartDate <= customEndDate ? customStartDate : customEndDate,
            to: customStartDate <= customEndDate ? customEndDate : customStartDate,
          }
        : { period: timeRange };
    salesReportApi
      .getReportSummary(params)
      .then((res) => {
        if (!cancelled) setApiSummary(res?.success && res.data ? res.data : null);
      })
      .catch(() => {
        if (!cancelled) setApiSummary(null);
      });
    return () => {
      cancelled = true;
    };
  }, [timeRange, customStartDate, customEndDate]);

  // Invoices for the chosen range, fetched from the Commerce API (nothing is read from browser storage)
  const [filteredSales, setFilteredSales] = useState<SaleTransaction[]>([]);
  useEffect(() => {
    let cancelled = false;
    const params =
      timeRange === 'custom'
        ? {
            from: customStartDate <= customEndDate ? customStartDate : customEndDate,
            to: customStartDate <= customEndDate ? customEndDate : customStartDate,
          }
        : { period: timeRange };
    commerceInvoiceApi
      .getInvoices({ ...params, pagination_required: false, page_size: 500, sortOrder: 'desc' })
      .then((res) => {
        if (cancelled) return;
        setFilteredSales(
          res?.success && Array.isArray(res.data) ? res.data.map(mapApiInvoiceToSaleTransaction) : [],
        );
      })
      .catch(() => {
        if (!cancelled) setFilteredSales([]);
      });
    return () => {
      cancelled = true;
    };
  }, [timeRange, customStartDate, customEndDate]);

  // Overall Financial KPIs
  const kpis = useMemo(() => {
    const totalSales = filteredSales.reduce((acc, s) => acc + s.grandTotal, 0);
    const totalDiscount = filteredSales.reduce((acc, s) => acc + s.totalDiscount, 0);
    const totalTax = filteredSales.reduce((acc, s) => acc + s.totalTax, 0);
    const netSales = filteredSales.reduce((acc, s) => acc + (s.subtotal - s.totalDiscount), 0);
    const outstandingAmount = filteredSales.reduce((acc, s) => acc + s.balance, 0);

    if (apiSummary) {
      return {
        totalSales: apiSummary.totalSales,
        netSales: apiSummary.netSales,
        totalDiscount: apiSummary.totalDiscount,
        totalTax: apiSummary.totalTax,
        totalReturns: apiSummary.totalReturns,
        totalProfit: apiSummary.grossProfit,
        outstandingAmount: apiSummary.outstandingAmount,
      };
    }

    // Until the API summary loads: totals from the fetched invoices; returns / profit are not
    // available from invoices alone, so they stay at 0.
    return {
      totalSales,
      netSales,
      totalDiscount,
      totalTax,
      totalReturns: 0,
      totalProfit: 0,
      outstandingAmount,
    };
  }, [filteredSales, apiSummary]);

  // Chart 1: Sales Trend
  const trendData = useMemo(() => {
    const map: Record<string, { date: string; sales: number; profit: number }> = {};
    filteredSales.forEach((s) => {
      const d = s.saleDate;
      if (!map[d]) {
        map[d] = { date: d.slice(5), sales: 0, profit: 0 };
      }
      map[d].sales += s.grandTotal;
      map[d].profit += (s.subtotal - s.totalDiscount) * 0.45;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredSales]);

  // Chart 2: Sales by Product
  const productData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredSales.forEach((s) => {
      s.items.forEach((it) => {
        map[it.productName] = (map[it.productName] || 0) + it.total;
      });
    });
    return Object.entries(map).map(([name, value]) => ({
      name: name.length > 20 ? `${name.slice(0, 18)}...` : name,
      fullName: name,
      sales: value,
    }));
  }, [filteredSales]);

  // Chart 3: Sales by Customer
  const customerData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredSales.forEach((s) => {
      const cName = s.customerCompany || s.customerName;
      map[cName] = (map[cName] || 0) + s.grandTotal;
    });
    return Object.entries(map).map(([name, value]) => ({
      name: name.length > 18 ? `${name.slice(0, 16)}...` : name,
      sales: value,
    }));
  }, [filteredSales]);

  // Chart 4: Sales by Category
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredSales.forEach((s) => {
      s.items.forEach((it) => {
        // Invoice line items carry no category from the API
        const cat = (it as any).category || 'General Sales';
        map[cat] = (map[cat] || 0) + it.total;
      });
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredSales]);

  // Chart 5: Payment Method Distribution
  const paymentMethodData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredSales.forEach((s) => {
      const method = s.paymentMethod || 'Other';
      map[method] = (map[method] || 0) + s.grandTotal;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredSales]);

  // Top Selling Products Leaderboard
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    filteredSales.forEach((s) => {
      s.items.forEach((it) => {
        if (!map[it.productName]) {
          map[it.productName] = { name: it.productName, qty: 0, revenue: 0 };
        }
        map[it.productName].qty += it.quantity;
        map[it.productName].revenue += it.total;
      });
    });
    return Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredSales]);

  // Export Excel
  const handleExportCSV = () => {
    if (filteredSales.length === 0) {
      toast.error('No sales data to export');
      return;
    }

    const excelRows = filteredSales.map((s, idx) => ({
      srNo: idx + 1,
      date: s.saleDate,
      invoiceNo: s.invoiceNo,
      customer: s.customerName,
      subtotal: Number(s.subtotal || 0),
      discount: Number(s.totalDiscount || 0),
      tax: Number(s.totalTax || 0),
      grandTotal: Number(s.grandTotal || 0),
      paid: Number(s.paidAmount || 0),
      balance: Number(s.balance || 0),
      status: s.saleStatus || 'Confirmed',
    }));

    exportTableToExcel({
      filename: `Sales_Executive_Report_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Sales Ledger',
      title: 'YAA CREATIONS CRM - DETAILED SALES TRANSACTIONS AUDIT',
      subtitle: `Time Range: ${timeRange.toUpperCase()} | Total Sales: ${filteredSales.length} | Generated: ${new Date().toLocaleDateString('en-GB')}`,
      columns: [
        { header: '#', key: 'srNo', align: 'center', width: 8 },
        { header: 'Date', key: 'date', align: 'center', width: 15 },
        { header: 'Invoice No', key: 'invoiceNo', align: 'center', width: 18 },
        { header: 'Customer', key: 'customer', align: 'left', width: 28 },
        { header: 'Subtotal (₹)', key: 'subtotal', align: 'right', type: 'currency', width: 18 },
        { header: 'Discount (₹)', key: 'discount', align: 'right', type: 'currency', width: 16 },
        { header: 'Tax (₹)', key: 'tax', align: 'right', type: 'currency', width: 16 },
        { header: 'Grand Total (₹)', key: 'grandTotal', align: 'right', type: 'currency', width: 20 },
        { header: 'Paid (₹)', key: 'paid', align: 'right', type: 'currency', width: 18 },
        { header: 'Balance (₹)', key: 'balance', align: 'right', type: 'currency', width: 18 },
        { header: 'Status', key: 'status', align: 'center', width: 14 },
      ],
      data: excelRows,
      summaryRow: {
        srNo: 'TOTAL',
        customer: `${filteredSales.length} Invoices`,
        subtotal: kpis.totalSales,
        discount: kpis.totalDiscount,
        tax: kpis.totalTax,
        grandTotal: kpis.netSales,
      },
    });

    toast.success(`Sales report Excel downloaded (${filteredSales.length} records)!`);
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const getReportTableOptions = () => {
    const printRows = filteredSales.map((s) => ({
      invoiceNo: s.invoiceNo,
      date: s.saleDate,
      customer: s.customerName,
      itemsCount: s.items?.length || 1,
      tax: Number(s.totalTax || 0),
      grandTotal: Number(s.grandTotal || 0),
      status: s.saleStatus,
    }));

    return {
      title: 'SALES ANALYTICS & REVENUE REPORT',
      subtitle: `Filter: ${timeRange} | Total Records: ${filteredSales.length}`,
      columns: [
        { header: 'Invoice No.', key: 'invoiceNo', align: 'center' as const, width: '15%' },
        { header: 'Date', key: 'date', align: 'center' as const, width: '12%' },
        { header: 'Customer', key: 'customer', align: 'left' as const, width: '25%' },
        { header: 'Items', key: 'itemsCount', align: 'center' as const, width: '8%' },
        { header: 'Tax (₹)', key: 'tax', align: 'right' as const, type: 'currency' as const, width: '15%' },
        { header: 'Grand Total (₹)', key: 'grandTotal', align: 'right' as const, type: 'currency' as const, width: '15%' },
        { header: 'Status', key: 'status', align: 'center' as const, width: '10%' },
      ],
      data: printRows,
      summaryRow: {
        invoiceNo: 'TOTAL',
        customer: `${filteredSales.length} Invoices`,
        tax: kpis.totalTax,
        grandTotal: kpis.netSales,
      },
      metrics: [
        { label: 'Gross Sales', value: kpis.totalSales },
        { label: 'Total Tax', value: kpis.totalTax },
        { label: 'Net Sales', value: kpis.netSales },
      ],
    };
  };

  const handlePrintReport = () => {
    if (filteredSales.length === 0) {
      toast.error('No sales data to print');
      return;
    }
    printTableReport(getReportTableOptions());
  };

  const handleDownloadPdfReport = async () => {
    if (filteredSales.length === 0) {
      toast.error('No sales data to download');
      return;
    }
    if (isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    const filename = `Sales_Report_${timeRange}_${new Date().toISOString().split('T')[0]}.pdf`;
    try {
      await downloadTableReport(getReportTableOptions(), filename);
      toast.success('Sales report PDF downloaded successfully!');
    } catch (err) {
      console.error('Failed to download sales report PDF:', err);
      toast.error('Failed to download sales report PDF. Please try again.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-[220px] flex-1">
          <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Sales Analytics & Reports
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-[#33077C] border border-purple-200">
                {filteredSales.length} records
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Analyze revenue trends, profit margins, product leaderboards, and tax summaries.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <Button
            size="md"
            variant="secondary"
            onClick={handleExportCSV}
            icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
            className="hover:border-emerald-500 hover:text-emerald-700 transition-colors"
          >
            Excel Report
          </Button>
          <Button
            size="md"
            variant="primary"
            onClick={handlePrintReport}
            icon={<Printer className="w-4 h-4 text-white" />}
            className="bg-[#33077C] hover:bg-[#280563] text-white shadow-sm hover:shadow transition-all"
          >
            Print Report
          </Button>
          <Button
            size="md"
            variant="secondary"
            disabled={isDownloadingPdf}
            onClick={handleDownloadPdfReport}
            icon={isDownloadingPdf ? <Loader2 className="w-4 h-4 animate-spin text-orange-600" /> : <Download className="w-4 h-4 text-orange-600" />}
            className="hover:border-orange-500 hover:text-orange-700 transition-colors"
          >
            {isDownloadingPdf ? 'Generating...' : 'Download PDF'}
          </Button>
        </div>
      </div>

      {/* 2. Date Filter Toggle */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
          {[
            { id: 'today', label: 'Today' },
            { id: 'this_week', label: 'This Week' },
            { id: 'this_month', label: 'This Month' },
            { id: 'this_year', label: 'This Year' },
            { id: 'custom', label: 'Custom' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTimeRange(tab.id as any)}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                timeRange === tab.id
                  ? 'bg-white text-[#4309A2] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {timeRange === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <DateInput
              value={customStartDate}
              onChange={(v) => ((e) => setCustomStartDate(e.target.value))({ target: { value: v } } as any)}
              heightClass="h-8"
            />
            <span className="text-slate-400 font-bold">to</span>
            <DateInput
              value={customEndDate}
              onChange={(v) => ((e) => setCustomEndDate(e.target.value))({ target: { value: v } } as any)}
              heightClass="h-8"
            />
          </div>
        )}
      </div>

      {/* 3. Executive KPI Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3.5">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Sales</span>
          <div className="text-base font-extrabold text-slate-900 mt-1">
            ₹{kpis.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Net Revenue</span>
          <div className="text-base font-extrabold text-purple-900 mt-1">
            ₹{kpis.netSales.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Discounts</span>
          <div className="text-base font-extrabold text-amber-600 mt-1">
            ₹{kpis.totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Tax Collected</span>
          <div className="text-base font-extrabold text-blue-600 mt-1">
            ₹{kpis.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Returns</span>
          <div className="text-base font-extrabold text-rose-600 mt-1">
            ₹{kpis.totalReturns.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Gross Profit</span>
          <div className={`text-base font-extrabold ${kpis.totalProfit < 0 ? 'text-rose-600' : 'text-emerald-600'} mt-1`}>
            {kpis.totalProfit < 0 ? '-' : ''}₹{Math.abs(kpis.totalProfit).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Receivables</span>
          <div className="text-base font-extrabold text-amber-600 mt-1">
            ₹{kpis.outstandingAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* 4. Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Sales & Profit Trend */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#4309A2]" />
              Sales & Gross Profit Trend
            </h3>
            <span className="text-xs text-slate-400">Daily Revenue Timeline</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4309A2" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4309A2" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="sales" name="Gross Sales" stroke="#4309A2" strokeWidth={2} fillOpacity={1} fill="url(#salesGrad)" />
                <Area type="monotone" dataKey="profit" name="Gross Profit" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#profitGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Sales by Product */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#4309A2]" />
              Revenue by Product Solution
            </h3>
            <span className="text-xs text-slate-400">Total Volume (₹)</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} interval={0} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="sales" fill="#7C3AED" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Product Category Breakdown (Pie) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-[#4309A2]" />
              Sales Distribution by Category
            </h3>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Sales']}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Payment Methods Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-600" />
              Payment Methods Breakdown
            </h3>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentMethodData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {paymentMethodData.map((_, index) => (
                    <Cell key={`cell-pay-${index}`} fill={CHART_COLORS[(index + 2) % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Received']}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 5. Top Selling Products Leaderboard */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          Top Selling Products Leaderboard
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {topProducts.map((p, idx) => (
            <div key={p.name} className="p-3 bg-slate-50/70 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center justify-between">
                <span className="w-5 h-5 rounded-full bg-purple-100 text-[#4309A2] font-black text-[10px] flex items-center justify-center">
                  #{idx + 1}
                </span>
                <span className="font-semibold text-slate-500">{p.qty} units sold</span>
              </div>
              <div className="font-bold text-slate-900 mt-2 truncate" title={p.name}>
                {p.name}
              </div>
              <div className="text-purple-700 font-extrabold text-sm mt-0.5">
                ₹{p.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Detailed Transaction Report Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4.5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Detailed Sales Transactions Log</h3>
            <p className="text-xs text-slate-500 mt-0.5">Audit log of sales in the selected date range</p>
          </div>
          <span className="text-xs font-bold text-[#33077C] bg-purple-50 px-2.5 py-1 rounded-full">
            {filteredSales.length} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200 min-w-[950px]">
            <thead>
              <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white tracking-wider uppercase select-none">
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white min-w-[110px]">DATE</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white min-w-[120px]">INVOICE</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white min-w-[180px]">CUSTOMER</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-right min-w-[110px]">SUBTOTAL</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-right min-w-[110px]">DISCOUNT</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-right min-w-[110px]">TAX</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-right min-w-[120px]">GRAND TOTAL</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-right min-w-[120px]">EST. PROFIT</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center min-w-[110px]">STATUS</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredSales.map((s) => {
                const profit = (s.subtotal - s.totalDiscount) * 0.45;
                return (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-200 font-sans">
                    <td className="py-4 px-5 border border-slate-200 text-slate-600 text-xs align-middle">{formatDate(s.saleDate)}</td>
                    <td className="py-4 px-5 border border-slate-200 font-bold text-[#33077C] text-xs align-middle">{s.invoiceNo}</td>
                    <td className="py-4 px-5 border border-slate-200 whitespace-nowrap align-middle">
                      <div className="font-bold text-slate-900 text-xs sm:text-[13px]">{s.customerName}</div>
                      {s.customerCompany && <div className="text-[10px] text-slate-400">{s.customerCompany}</div>}
                    </td>
                    <td className="py-4 px-4 border border-slate-200 text-right text-slate-700 text-xs font-semibold align-middle">₹{s.subtotal.toLocaleString('en-IN')}</td>
                    <td className="py-4 px-4 border border-slate-200 text-right text-amber-600 text-xs font-semibold align-middle">-₹{s.totalDiscount.toLocaleString('en-IN')}</td>
                    <td className="py-4 px-4 border border-slate-200 text-right text-blue-600 text-xs font-semibold align-middle">+₹{s.totalTax.toLocaleString('en-IN')}</td>
                    <td className="py-4 px-4 border border-slate-200 text-right font-bold text-slate-900 text-xs sm:text-[13px] align-middle">
                      ₹{s.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-4 border border-slate-200 text-right font-bold text-emerald-600 text-xs align-middle">
                      ₹{profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap align-middle">
                      {s.saleStatus === 'Completed' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50/90 text-emerald-700 border border-emerald-300/80 text-xs font-bold shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span>Completed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-[#33077C] border border-purple-300 text-xs font-bold shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#33077C] shrink-0" />
                          <span>{s.saleStatus}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
