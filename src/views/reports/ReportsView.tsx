import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Download,
  UsersRound,
  Repeat,
  CheckCircle2,
  Film,
  Calendar,
  Layers,
  Sparkles,
  PieChart as PieIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';

export const ReportsView: React.FC = () => {
  const { isAdmin, showToast } = useAuth();
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | '1y'>('30d');

  const handleExportCSV = () => {
    showToast('info', 'Report Generated', 'Executive summary CSV exported.');
  };

  if (!isAdmin) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
        <h3 className="text-sm font-bold text-slate-800">Restricted Access</h3>
        <p className="text-xs text-slate-500 mt-1">Analytics and financial reports are reserved for Administrators.</p>
      </div>
    );
  }

  // Monthly Revenue Trend Data
  const revenueTrendData = [
    { month: 'Mar', YaaConnect: 24500, DocMotez: 18200, DocDentQ: 11500, AarudamAI: 9800, Marketing: 14200 },
    { month: 'Apr', YaaConnect: 26800, DocMotez: 19400, DocDentQ: 12800, AarudamAI: 11200, Marketing: 15800 },
    { month: 'May', YaaConnect: 29200, DocMotez: 21500, DocDentQ: 13900, AarudamAI: 12900, Marketing: 16900 },
    { month: 'Jun', YaaConnect: 31000, DocMotez: 22800, DocDentQ: 15400, AarudamAI: 14100, Marketing: 18400 },
    { month: 'Jul', YaaConnect: 33400, DocMotez: 24600, DocDentQ: 16800, AarudamAI: 15600, Marketing: 19800 },
    { month: 'Aug', YaaConnect: 36200, DocMotez: 26400, DocDentQ: 18200, AarudamAI: 17300, Marketing: 21500 },
  ];

  // Revenue by Product Pie Data
  const productDistribution = [
    { name: 'Yaa Connect', value: 36200, color: '#33077C' },
    { name: 'Doc Motez', value: 26400, color: '#6b21a8' },
    { name: 'Doc DentQ', value: 18200, color: '#9333ea' },
    { name: 'Aarudam AI', value: 17300, color: '#c084fc' },
    { name: 'Digital Marketing', value: 21500, color: '#4309A2' },
  ];

  // Lead Conversion Funnel Data
  const funnelData = [
    { stage: 'New Inquiries', count: 48, fill: '#3b82f6' },
    { stage: 'Contacted', count: 36, fill: '#6366f1' },
    { stage: 'Demo Scheduled', count: 24, fill: '#8b5cf6' },
    { stage: 'Proposal Sent', count: 18, fill: '#a855f7' },
    { stage: 'Converted / Won', count: 12, fill: '#10b981' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Executive Business Analytics & Performance Reports
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Multi-product revenue aggregation, marketing retainer returns, and CRM pipeline conversion metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white outline-none font-medium"
          >
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Trailing 12 Months</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="h-11 px-6 bg-[#33077C] hover:bg-[#432eb5] text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download className="w-4 h-4 text-[#4309A2]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Top High-level KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Group Revenue</span>
          <p className="text-2xl font-black text-slate-900 mt-1">₹119,600</p>
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" /> +14.2% from prior period
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Lead Conversion Rate</span>
          <p className="text-2xl font-black text-purple-900 mt-1">25.0%</p>
          <span className="text-[11px] text-purple-600 font-semibold">12 of 48 leads converted</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Avg. Revenue per Client</span>
          <p className="text-2xl font-black text-amber-600 mt-1">₹2,490</p>
          <span className="text-[11px] text-amber-600 font-semibold">Across products & retainers</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Task Velocity</span>
          <p className="text-2xl font-black text-emerald-700 mt-1">94.2%</p>
          <span className="text-[11px] text-emerald-600 font-semibold">On-time completion rate</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Revenue Growth Trend (8 cols) */}
        <div className="lg:col-span-8 p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#33077C] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#4309A2]" />
              Revenue Trends Across Offerings
            </h3>
            <span className="text-xs text-slate-400">Monthly breakdown (₹ INR)</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `₹${val / 1000}k`} />
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, '']}
                  contentStyle={{ borderRadius: '12px', fontSize: '11px', border: '1px solid #e2e8f0' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="YaaConnect" stroke="#33077C" strokeWidth={2.5} />
                <Line type="monotone" dataKey="DocMotez" stroke="#6b21a8" strokeWidth={2} />
                <Line type="monotone" dataKey="DocDentQ" stroke="#9333ea" strokeWidth={2} />
                <Line type="monotone" dataKey="AarudamAI" stroke="#c084fc" strokeWidth={2} />
                <Line type="monotone" dataKey="Marketing" stroke="#4309A2" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Share Distribution (4 cols) */}
        <div className="lg:col-span-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#33077C] flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-[#4309A2]" />
              Revenue Share
            </h3>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={productDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {productDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, '']}
                  contentStyle={{ borderRadius: '12px', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
            {productDistribution.map((p) => (
              <div key={p.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-slate-700 text-[11px]">{p.name}</span>
                </div>
                <span className="font-bold text-slate-900 text-[11px]">₹{p.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Conversion Funnel */}
        <div className="lg:col-span-12 p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#33077C] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#4309A2]" />
              Sales & Marketing Conversion Funnel
            </h3>
            <span className="text-xs text-slate-400">Total Leads Ingested: 48</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {funnelData.map((f, i) => (
              <div
                key={f.stage}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between text-center relative"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">{`Stage ${i + 1}`}</span>
                  <h4 className="text-xs font-bold text-slate-900 mt-1">{f.stage}</h4>
                </div>
                <div className="my-3">
                  <span className="text-2xl font-black text-[#33077C]">{f.count}</span>
                  <span className="text-[10px] text-slate-500 block">leads</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(f.count / 48) * 100}%`,
                      backgroundColor: f.fill,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
