import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Package,
  Boxes,
  TrendingUp,
  AlertTriangle,
  Layers,
  BarChart3,
  PieChart as PieIcon,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../../../components/common/Button';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';

// Data for Stock In vs Stock Out by Category (Bar Chart)
const STOCK_MOVEMENT_DATA = [
  { category: 'Electronics', stockIn: 450, stockOut: 380, available: 520 },
  { category: 'Apparel', stockIn: 620, stockOut: 510, available: 410 },
  { category: 'Supplies', stockIn: 310, stockOut: 240, available: 390 },
  { category: 'Machinery', stockIn: 180, stockOut: 110, available: 220 },
  { category: 'Hardware', stockIn: 540, stockOut: 460, available: 480 },
];

// Data for Category Share (Donut Chart)
const CATEGORY_SHARE_DATA = [
  { name: 'Electronics & Hardware', value: 38, count: 1240, color: '#33077C' },
  { name: 'Apparel & Fashion', value: 27, count: 880, color: '#7C3AED' },
  { name: 'Home & Office Supplies', value: 20, count: 650, color: '#06B6D4' },
  { name: 'Industrial Equipment', value: 15, count: 490, color: '#10B981' },
];

// Data for Stock Health Status (Pie Chart)
const STOCK_HEALTH_DATA = [
  { name: 'In Stock (Healthy)', value: 68, color: '#10B981' },
  { name: 'Low Stock (< Threshold)', value: 22, color: '#F59E0B' },
  { name: 'Out of Stock (Depleted)', value: 10, color: '#EF4444' },
];

// Monthly Stock Valuation Trend (Area Chart)
const MONTHLY_VALUATION_DATA = [
  { month: 'Jan', valuation: 1850000, itemsMoved: 720 },
  { month: 'Feb', valuation: 2100000, itemsMoved: 840 },
  { month: 'Mar', valuation: 1980000, itemsMoved: 790 },
  { month: 'Apr', valuation: 2450000, itemsMoved: 960 },
  { month: 'May', valuation: 2780000, itemsMoved: 1120 },
  { month: 'Jun', valuation: 3150000, itemsMoved: 1290 },
];

// Top 5 Stock Valuation by Product (Horizontal Bar Chart)
const TOP_PRODUCTS_VALUE = [
  { product: 'Ultra-Slim Laptop 14"', value: 1350000, qty: 30 },
  { product: 'Ergonomic Office Chair', value: 650000, qty: 100 },
  { product: 'Wireless BT Headset', value: 480000, qty: 400 },
  { product: 'Industrial Drill Machine', value: 380000, qty: 45 },
  { product: 'Cotton Casual Shirt', value: 290000, qty: 360 },
];

// Monthly Revenue vs Inventory Cost & Gross Profit Data
const REVENUE_ANALYTICS_DATA = [
  { month: 'Jan', revenue: 420000, cost: 280000, profit: 140000 },
  { month: 'Feb', revenue: 580000, cost: 360000, profit: 220000 },
  { month: 'Mar', revenue: 510000, cost: 310000, profit: 200000 },
  { month: 'Apr', revenue: 690000, cost: 420000, profit: 270000 },
  { month: 'May', revenue: 840000, cost: 490000, profit: 350000 },
  { month: 'Jun', revenue: 980000, cost: 560000, profit: 420000 },
];

export const InventoryReportView: React.FC = () => {
  const [timeRange, setTimeRange] = useState('6M');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const handleExport = () => {
    const csvRows = [
      ['Metric', 'Category / Item', 'Value'],
      ...STOCK_MOVEMENT_DATA.map((d) => ['Stock Movement', d.category, `In: ${d.stockIn}, Out: ${d.stockOut}`]),
      ...CATEGORY_SHARE_DATA.map((d) => ['Category Share', d.name, `${d.value}% (${d.count} items)`]),
      ...STOCK_HEALTH_DATA.map((d) => ['Stock Health', d.name, `${d.value}%`]),
      ...REVENUE_ANALYTICS_DATA.map((d) => ['Revenue Analytics', d.month, `Revenue: ₹${d.revenue}, Profit: ₹${d.profit}`]),
    ];
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      csvRows.map((r) => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'inventory_charts_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
              <FileSpreadsheet className="w-4.5 h-4.5" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Inventory & Stock Analytics
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Visual reports, stock movement charts, category donut distribution, and valuation trends.
          </p>
        </div>

        {/* Top Right Action Controls */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <FilterDropdown
            options={[
              { label: 'All Categories', value: 'ALL' },
              { label: 'Electronics & Hardware', value: 'Electronics' },
              { label: 'Apparel & Fashion', value: 'Apparel' },
              { label: 'Home & Office Supplies', value: 'Supplies' },
              { label: 'Industrial Equipment', value: 'Machinery' },
            ]}
            value={selectedCategory}
            onChange={(val) => setSelectedCategory(val)}
            placeholder="Category : All"
          />
          <Button
            variant="secondary"
            size="md"
            onClick={handlePrint}
            icon={<Printer className="w-4 h-4 text-slate-600" />}
          >
            Print
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleExport}
            icon={<Download className="w-4 h-4 text-white" />}
          >
            Export Report
          </Button>
        </div>
      </div>

      {/* 2. Key Metrics Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Total Stock In Hand
            </span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              3,260 <span className="text-xs font-medium text-slate-500">Units</span>
            </span>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+12.4% vs last month</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-[#33077C] shrink-0">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Total Inventory Value
            </span>
            <span className="text-2xl font-bold text-emerald-700 mt-1 block">
              ₹31.50 L
            </span>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+8.2% growth</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Stock Turnover Rate
            </span>
            <span className="text-2xl font-bold text-blue-600 mt-1 block">
              4.6x
            </span>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 mt-1">
              <Activity className="w-3.5 h-3.5" />
              <span>Optimal velocity</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Low / Depleted Stock
            </span>
            <span className="text-2xl font-bold text-rose-600 mt-1 block">
              32 Items
            </span>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 mt-1">
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Action required</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Primary Charts Row: Stock Movement Bar Chart & Category Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Premium Bar Chart: Stock Flow Dynamics */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#33077C]" />
                  Stock Flow Dynamics
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Monthly inbound receipts, customer dispatches & live inventory balances
                </p>
              </div>
              <div className="flex items-center gap-4 self-end sm:self-auto text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#33077C]" />
                  <span className="font-semibold text-slate-700">Available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#7C3AED]" />
                  <span className="font-semibold text-slate-700">Stock In</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#EC4899]" />
                  <span className="font-semibold text-slate-700">Stock Out</span>
                </div>
              </div>
            </div>

            <div className="h-72 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={STOCK_MOVEMENT_DATA}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  barGap={6}
                >
                  <defs>
                    <linearGradient id="barAvailableGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#33077C" />
                      <stop offset="100%" stopColor="#4c1d95" />
                    </linearGradient>
                    <linearGradient id="barInGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#6d28d9" />
                    </linearGradient>
                    <linearGradient id="barOutGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" />
                      <stop offset="100%" stopColor="#e11d48" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="category"
                    tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
                    axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                    tickLine={false}
                    dy={6}
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(51, 7, 124, 0.03)', radius: 8 }}
                    contentStyle={{
                      backgroundColor: '#1e1b4b',
                      borderRadius: '14px',
                      border: 'none',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
                      padding: '12px 16px',
                      color: '#ffffff',
                      fontSize: '12px',
                    }}
                    itemStyle={{ color: '#e0e7ff', padding: '2px 0' }}
                    labelStyle={{ color: '#ffffff', fontWeight: 'bold', marginBottom: '6px' }}
                  />
                  <Bar
                    dataKey="available"
                    name="Available Stock"
                    fill="url(#barAvailableGrad)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={22}
                  />
                  <Bar
                    dataKey="stockIn"
                    name="Stock In"
                    fill="url(#barInGrad)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={22}
                  />
                  <Bar
                    dataKey="stockOut"
                    name="Stock Out"
                    fill="url(#barOutGrad)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={22}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Premium Donut Chart: Category Share */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#7C3AED]" />
                  Category Allocation
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Proportion of inventory volume by catalog segment
                </p>
              </div>
            </div>

            <div className="h-56 w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={CATEGORY_SHARE_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={86}
                    paddingAngle={4}
                    dataKey="value"
                    strokeWidth={2}
                    stroke="#ffffff"
                  >
                    {CATEGORY_SHARE_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${val}%`, 'Allocation']}
                    contentStyle={{
                      backgroundColor: '#1e1b4b',
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 15px 20px -3px rgba(0,0,0,0.25)',
                      color: '#ffffff',
                      fontSize: '12px',
                      padding: '8px 12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Inner Center Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs font-semibold text-slate-400">Total</span>
                <span className="text-lg font-extrabold text-[#33077C]">3,260</span>
                <span className="text-[10px] text-slate-400 font-medium">Units</span>
              </div>
            </div>

            {/* Custom Legend List */}
            <div className="space-y-2.5 mt-3 pt-3 border-t border-slate-100">
              {CATEGORY_SHARE_DATA.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium text-slate-700 truncate max-w-[150px]">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-semibold text-slate-900">
                    <span>{item.count} qty</span>
                    <span className="text-slate-400 font-normal">({item.value}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Secondary Charts Row: Stock Health Pie Chart & Monthly Valuation Trend Area Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Premium Pie Chart: Stock Health Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Stock Health Status
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Proportion of healthy vs critical inventory levels
                </p>
              </div>
            </div>

            <div className="h-56 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={STOCK_HEALTH_DATA}
                    cx="50%"
                    cy="50%"
                    outerRadius={84}
                    dataKey="value"
                    strokeWidth={2}
                    stroke="#ffffff"
                    label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {STOCK_HEALTH_DATA.map((entry, index) => (
                      <Cell key={`health-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${val}%`, 'Portion']}
                    contentStyle={{
                      backgroundColor: '#1e1b4b',
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 15px 20px -3px rgba(0,0,0,0.25)',
                      color: '#ffffff',
                      fontSize: '12px',
                      padding: '8px 12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Legend for Health */}
            <div className="space-y-2.5 mt-3 pt-3 border-t border-slate-100">
              {STOCK_HEALTH_DATA.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium text-slate-700">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Premium Area Chart: Monthly Inventory Valuation Trajectory */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#33077C]" />
                  <h3 className="text-base font-bold text-slate-900">
                    Inventory Valuation Trajectory
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200/60">
                    +70.2% Growth
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track warehouse inventory asset valuation growth over the last 6 months
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs bg-slate-100 p-1 rounded-xl self-end sm:self-auto">
                {['3M', '6M', '1Y'].map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      timeRange === range
                        ? 'bg-white text-[#33077C] shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-72 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MONTHLY_VALUATION_DATA} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValuation" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.4} />
                      <stop offset="50%" stopColor="#33077C" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#33077C" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
                    axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                    tickLine={false}
                    dy={6}
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`}
                  />
                  <Tooltip
                    cursor={{ stroke: '#7C3AED', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                    formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Valuation']}
                    contentStyle={{
                      backgroundColor: '#1e1b4b',
                      borderRadius: '14px',
                      border: 'none',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
                      padding: '12px 16px',
                      color: '#ffffff',
                      fontSize: '12px',
                    }}
                    itemStyle={{ color: '#c7d2fe', padding: '2px 0' }}
                    labelStyle={{ color: '#ffffff', fontWeight: 'bold', marginBottom: '6px' }}
                  />
                  <Area
                    type="natural"
                    dataKey="valuation"
                    name="Inventory Value"
                    stroke="#7C3AED"
                    strokeWidth={3.5}
                    dot={{ fill: '#ffffff', stroke: '#7C3AED', strokeWidth: 2.5, r: 4.5 }}
                    activeDot={{ fill: '#33077C', stroke: '#ffffff', strokeWidth: 3, r: 7 }}
                    fillOpacity={1}
                    fill="url(#colorValuation)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Bottom Dual-Chart Row: Top Valued Products & Warehouse Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Top 5 Highest Valued Products */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#EC4899]" />
                  Top 5 Valued Products
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Capital investment by product line
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-purple-50 text-[#33077C] px-2.5 py-1 rounded-lg">
                Top 5
              </span>
            </div>

            <div className="h-72 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={TOP_PRODUCTS_VALUE}
                  margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="horizontalBarGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#33077C" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                    tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`}
                  />
                  <YAxis
                    type="category"
                    dataKey="product"
                    tick={{ fill: '#334155', fontSize: 11, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    width={140}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(51, 7, 124, 0.04)', radius: 6 }}
                    formatter={(val: any, _name: any, item: any) => [
                      `₹${Number(val).toLocaleString()} (${item.payload.qty} units)`,
                      'Valuation',
                    ]}
                    contentStyle={{
                      backgroundColor: '#1e1b4b',
                      borderRadius: '14px',
                      border: 'none',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
                      padding: '12px 16px',
                      color: '#ffffff',
                      fontSize: '12px',
                    }}
                    itemStyle={{ color: '#c7d2fe', padding: '2px 0' }}
                    labelStyle={{ color: '#ffffff', fontWeight: 'bold', marginBottom: '6px' }}
                  />
                  <Bar
                    dataKey="value"
                    name="Inventory Value"
                    fill="url(#horizontalBarGrad)"
                    radius={[0, 6, 6, 0]}
                    barSize={18}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right: Monthly Sales Revenue & Profit Performance Chart */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Revenue & Margin Performance
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Monthly gross sales revenue vs inventory acquisition cost
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#33077C]" />
                  <span className="font-semibold text-slate-700">Revenue</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                  <span className="font-semibold text-slate-700">Gross Profit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-300" />
                  <span className="font-semibold text-slate-500">Cost</span>
                </div>
              </div>
            </div>

            <div className="h-72 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={REVENUE_ANALYTICS_DATA}
                  margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
                  barGap={4}
                >
                  <defs>
                    <linearGradient id="revenueBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7C3AED" />
                      <stop offset="100%" stopColor="#33077C" />
                    </linearGradient>
                    <linearGradient id="profitBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                    dy={6}
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(51, 7, 124, 0.04)', radius: 8 }}
                    formatter={(val: any, name: any) => [
                      `₹${Number(val).toLocaleString()}`,
                      name,
                    ]}
                    contentStyle={{
                      backgroundColor: '#1e1b4b',
                      borderRadius: '14px',
                      border: 'none',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
                      padding: '12px 16px',
                      color: '#ffffff',
                      fontSize: '12px',
                    }}
                    itemStyle={{ color: '#c7d2fe', padding: '2px 0' }}
                    labelStyle={{ color: '#ffffff', fontWeight: 'bold', marginBottom: '6px' }}
                  />
                  <Bar
                    dataKey="revenue"
                    name="Gross Revenue"
                    fill="url(#revenueBarGrad)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={18}
                  />
                  <Bar
                    dataKey="profit"
                    name="Gross Profit"
                    fill="url(#profitBarGrad)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={18}
                  />
                  <Bar
                    dataKey="cost"
                    name="Cost of Goods"
                    fill="#e2e8f0"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={18}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
