import React, { useMemo, useState } from 'react';
import {
  Download,
  PieChart as PieIcon,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useDashboardScope } from '../../hooks/useDashboardScope';
import { useGetReportsAnalyticsQuery, type ReportsRange } from '../../api/platform/reportsAnalyticsApi';
import {
  BRAND,
  ChartCard,
  DonutChart,
  EmptyChart,
  SectionTitle,
  SimpleTable,
  StatCard,
  fmtDate,
  money,
  pct,
} from '../../components/dashboard/DashboardParts';

type Range = ReportsRange;

const RANGE_LABEL: Record<Range, string> = { '30d': 'Last 30 Days', '90d': 'Last 90 Days', '1y': 'Trailing 12 Months' };
const SERIES_COLORS = [BRAND.dark, BRAND.main, BRAND.mid, BRAND.soft, BRAND.pale];
const FUNNEL_COLORS = [BRAND.pale, BRAND.soft, BRAND.mid, BRAND.dark, BRAND.muted];
const PAYMENT_COLORS: Record<string, string> = { Paid: BRAND.main, Pending: BRAND.soft, Overdue: BRAND.dark };

export const ReportsView: React.FC = () => {
  const { isAdmin, showToast } = useAuth();
  const [range, setRange] = useState<Range>('30d');
  const { orgId, subOrgId, branchId, subOrgName, branchName } = useDashboardScope();

  const { data: res, isLoading, isError, refetch } = useGetReportsAnalyticsQuery(
    { range, organizationId: orgId, subOrganizationId: subOrgId, branchId },
    { skip: !isAdmin }
  );
  const report = res?.data;

  const from = report ? new Date(report.from) : new Date();
  const kpis = report?.kpis;
  const revenue = kpis?.totalRevenue ?? 0;
  const revenueChange = kpis?.revenueChangePercent ?? null;
  const collectionRate = kpis?.collectionRate ?? 0;
  const conversionRate = kpis?.leadConversionRate ?? 0;
  const convertedCount = kpis?.leadsConverted ?? 0;
  const leadsTotal = kpis?.leadsTotal ?? 0;
  const avgPerClient = kpis?.avgRevenuePerClient ?? 0;
  const payingClients = kpis?.payingClients ?? 0;

  const productRevenue = useMemo(
    () => (report?.revenueByProduct ?? []).map((r, i) => ({ ...r, color: SERIES_COLORS[i % SERIES_COLORS.length] })),
    [report]
  );
  const topProducts = productRevenue.slice(0, 5);
  const trend = report?.revenueTrend.rows ?? [];
  const funnel = useMemo(
    () => (report?.funnel ?? []).map((f, i) => ({ ...f, fill: FUNNEL_COLORS[i % FUNNEL_COLORS.length] })),
    [report]
  );
  const paymentDonut = useMemo(
    () => (report?.paymentStatus ?? []).map((p) => ({ ...p, color: PAYMENT_COLORS[p.name] || BRAND.mid })),
    [report]
  );
  const subsByProduct = useMemo(() => (report?.subscriptionsByProduct ?? []).map((r) => ({ ...r, id: r.name })), [report]);
  const topClients = useMemo(() => (report?.topClients ?? []).map((r) => ({ ...r, id: r.name })), [report]);

  // ---- Export ------------------------------------------------------------------
  const handleExportCSV = () => {
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines: string[] = [];
    lines.push(`Reports & Analytics,${esc(RANGE_LABEL[range])},Generated ${esc(fmtDate(new Date()))}`);
    lines.push('');
    lines.push('Summary');
    lines.push(`Total Revenue,${revenue}`);
    lines.push(`Lead Conversion Rate,${conversionRate}%`);
    lines.push(`Avg Revenue per Client,${Math.round(avgPerClient)}`);
    lines.push(`Collection Rate,${collectionRate}%`);
    lines.push('');
    lines.push('Revenue by Product');
    lines.push('Product,Revenue');
    productRevenue.forEach((p) => lines.push(`${esc(p.name)},${p.value}`));
    lines.push('');
    lines.push('Lead Funnel');
    lines.push('Stage,Leads');
    funnel.forEach((f) => lines.push(`${esc(f.stage)},${f.count}`));
    lines.push('');
    lines.push('Top Clients');
    lines.push('Client,Payments,Revenue');
    topClients.forEach((c) => lines.push(`${esc(c.name)},${c.payments},${c.total}`));

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Report Exported', 'Reports & Analytics CSV downloaded.');
  };

  if (!isAdmin) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
        <h3 className="text-sm font-bold text-slate-800">Restricted Access</h3>
        <p className="text-xs text-slate-500 mt-1">Analytics and financial reports are reserved for Administrators.</p>
      </div>
    );
  }

  const trendUp = revenueChange !== null && revenueChange >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="selection:!bg-white selection:!text-[#33077C] rounded-2xl p-6 sm:p-8 text-white shadow-md bg-gradient-to-r from-[#33077C] via-[#4309A2] to-[#6B3FD4] flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-white/85 mt-1">Revenue, collections, subscriptions and lead conversion across your products.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-md bg-white/20 border border-white/30 font-semibold">
              {RANGE_LABEL[range]} · from {fmtDate(new Date(from))}
            </span>
            {(subOrgName || branchName) && (
              <span className="px-2.5 py-1 rounded-md bg-white/20 border border-white/30 font-semibold">
                {branchName || subOrgName}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as Range)}
            className="h-11 px-3 text-xs font-semibold rounded-xl bg-white text-slate-800 outline-none cursor-pointer"
          >
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Trailing 12 Months</option>
          </select>
          <button
            onClick={handleExportCSV}
            className="h-11 px-5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {isLoading && <p className="text-xs text-slate-400">Loading report data...</p>}
      {isError && (
        <p className="text-xs text-red-600">
          Could not load report data.{' '}
          <button onClick={() => refetch()} className="underline font-semibold cursor-pointer">Retry</button>
        </p>
      )}

      {/* KPIs */}
      <section>
        <SectionTitle>Key Metrics</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Total Revenue"
            value={money(revenue)}
            note={
              revenueChange === null
                ? 'No prior-period data to compare'
                : `${revenueChange >= 0 ? '+' : ''}${revenueChange.toFixed(1)}% from prior period`
            }
            icon={
              trendUp || revenueChange === null ? (
                <TrendingUp className="w-5 h-5 text-emerald-700" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-700" />
              )
            }
            iconCls={trendUp || revenueChange === null ? 'bg-emerald-200' : 'bg-red-200'}
          />
          <StatCard
            label="Lead Conversion Rate"
            value={`${conversionRate}%`}
            note={`${convertedCount} of ${leadsTotal} leads converted`}
            icon={<Target className="w-5 h-5 text-[#4309A2]" />}
            iconCls="bg-[#EDE7F9]"
          />
          <StatCard
            label="Avg. Revenue per Client"
            value={money(avgPerClient)}
            note={`Across ${payingClients} paying client${payingClients === 1 ? '' : 's'}`}
            icon={<Users className="w-5 h-5 text-[#33077C]" />}
            iconCls="bg-[#E3DAF5]"
          />
          <StatCard
            label="Collection Rate"
            value={`${collectionRate}%`}
            percent={collectionRate}
            icon={<Wallet className="w-5 h-5 text-emerald-700" />}
            iconCls="bg-emerald-200"
            barCls="bg-emerald-600"
            trackCls="bg-emerald-100"
          />
        </div>
      </section>

      {/* Trend + share */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartCard
          title="Revenue Trends Across Products"
          className="lg:col-span-2"
          action={<span className="text-xs text-slate-400">Monthly breakdown (₹ INR)</span>}
        >
          {topProducts.length === 0 ? (
            <EmptyChart text="No paid payments to chart yet" />
          ) : (
            <div className="h-[300px] [&_.recharts-wrapper]:!outline-none [&_.recharts-surface]:!outline-none [&_*:focus]:!outline-none">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} barCategoryGap="28%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `₹${+(v / 1000).toFixed(1)}k` : `₹${v}`)} />
                  <RechartsTooltip cursor={{ fill: "#EDE7F9", opacity: 0.6 }} formatter={(v: any, name: any) => [money(Number(v)), name]} contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e2e8f0" }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  {topProducts.map((p) => (
                    <Bar key={p.name} dataKey={p.name} stackId="rev" fill={p.color} radius={[2, 2, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Revenue Share">
          {productRevenue.length === 0 ? (
            <EmptyChart />
          ) : (
            <>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={productRevenue} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="88%" paddingAngle={3} cornerRadius={4}>
                      {productRevenue.map((p) => (
                        <Cell key={p.name} fill={p.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(v: any) => money(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 pt-3 mt-2 border-t border-slate-100 text-xs">
                {productRevenue.slice(0, 6).map((p) => (
                  <div key={p.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.name}
                    </span>
                    <span className="font-bold text-slate-900">{money(p.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>
      </div>

      {/* Funnel */}
      <ChartCard
        title="Sales Conversion Funnel"
        action={<span className="text-xs text-slate-400">Leads created in period: {leadsTotal}</span>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          {funnel.map((f, i) => (
            <div key={f.stage} className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">{`Stage ${i + 1}`}</span>
              <h4 className="text-xs font-bold text-slate-900 mt-1">{f.stage}</h4>
              <div className="my-3">
                <span className="text-2xl font-black text-[#33077C]">{f.count}</span>
                <span className="text-[10px] text-slate-500 block">leads</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct(f.count, leadsTotal)}%`, backgroundColor: f.fill }}
                />
              </div>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Payments + subscriptions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartCard
          title="Payment Status"
          action={<PieIcon className="w-4 h-4 text-[#4309A2]" />}
        >
          <DonutChart data={paymentDonut} />
        </ChartCard>
        <div className="lg:col-span-2">
          <SimpleTable
            title="Subscriptions by Product"
            emptyText="No subscriptions found"
            rows={subsByProduct.slice(0, 6)}
            columns={[
              { header: 'Product', render: (r: any) => <span className="font-medium text-slate-800">{r.name}</span> },
              { header: 'Active', render: (r: any) => r.active },
              { header: 'Expiring', render: (r: any) => r.expiring },
              { header: 'Expired', render: (r: any) => r.expired },
              { header: 'Live Value', align: 'right', render: (r: any) => money(r.value) },
            ]}
          />
        </div>
      </div>

      <SimpleTable
        title="Top Clients by Revenue"
        emptyText="No paid payments in this period"
        rows={topClients}
        columns={[
          { header: 'Client', render: (r: any) => <span className="font-medium text-slate-800">{r.name}</span> },
          { header: 'Payments', render: (r: any) => r.payments },
          { header: 'Revenue', align: 'right', render: (r: any) => <span className="font-bold text-slate-900">{money(r.total)}</span> },
        ]}
      />
    </div>
  );
};
