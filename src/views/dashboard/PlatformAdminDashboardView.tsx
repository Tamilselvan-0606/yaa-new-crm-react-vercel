import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Building2, Clock, CreditCard, FileText, Layers, Package, RefreshCw, ShieldCheck, UserPlus } from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useGetPlatformOverviewQuery } from '../../api/platform/dashboardOverviewApi';
import { ChartCard, EmptyChart, StatCard, fmtDate, pct } from '../../components/dashboard/DashboardParts';

// Only subscriptions renewing in fewer than this many days appear under "Upcoming Subscription Expiry".
const EXPIRY_WINDOW_DAYS = 45;





export const PlatformAdminDashboardView: React.FC = () => {
  const navigate = useNavigate();
  const { data: res, isLoading, refetch } = useGetPlatformOverviewQuery();
  const ov = res?.data;

  const [lastUpdated, setLastUpdated] = React.useState(() => new Date());
  const [refreshing, setRefreshing] = React.useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      setLastUpdated(new Date());
    } finally {
      setRefreshing(false);
    }
  };

  const totalOrgs = ov?.organizations.total ?? 0;
  const orgStats = ov?.organizations ?? { total: 0, active: 0, inactive: 0, suspended: 0, createdThisMonth: 0 };
  const subStats = ov?.subscriptions ?? { active: 0, expiring: 0, expired: 0, noSubscription: 0 };
  const noSub = subStats.noSubscription;

  const monthStart = ov ? new Date(ov.period.from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const monthEnd = ov ? new Date(ov.period.to) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

  const subscriptionStatusData = [
    { name: 'Active', value: subStats.active, color: '#4CAF50' },
    { name: 'Expiring Soon', value: subStats.expiring, color: '#FF9800' },
    { name: 'Expired', value: subStats.expired, color: '#F44336' },
    { name: 'No Subscription', value: noSub, color: '#9E9E9E' },
  ];

  const orgTypeStats = React.useMemo(() => {
    const t = ov?.organizationTypes ?? { all: 0, client: 0, sale: 0, other: 0 };
    const rows = [
      { name: 'All (Client + Sales Management)', value: t.all, color: '#33077C' },
      { name: 'Client Management', value: t.client, color: '#4309A2' },
      { name: 'Sales Management', value: t.sale, color: '#7C4DDB' },
    ];
    if (t.other > 0) rows.push({ name: 'Not Specified', value: t.other, color: '#A78BEA' });
    return rows;
  }, [ov]);

  const subOrgSupportData = [
    { name: 'Supports Sub Organizations', value: ov?.subOrganizationSupport.supports ?? 0, color: '#4309A2' },
    { name: 'Does Not Support', value: ov?.subOrganizationSupport.notSupported ?? 0, color: '#CDBDF2' },
  ];

  const subOrgChartData = React.useMemo(() => {
    const palette = ['#33077C', '#4309A2', '#7C4DDB', '#A78BEA', '#CDBDF2', '#9E9E9E'];
    const sorted = (ov?.subOrganizationsByOrganization ?? []).filter((r) => r.count > 0);
    const top = sorted.slice(0, 5).map((r) => ({ fullName: r.name, count: r.count }));
    const rest = sorted.slice(5).reduce((a, r) => a + r.count, 0);
    if (rest > 0) top.push({ fullName: `Others (${sorted.length - 5})`, count: rest });
    return top.map((r, i) => ({ ...r, color: palette[i % palette.length] }));
  }, [ov]);
  const totalSubOrgs = ov?.totalSubOrganizations ?? 0;

  const planWise = ov?.planWise ?? [];
  const subscribedOrgs = planWise.reduce((a, p) => a + p.total, 0);
  const upcomingExpiry = ov?.upcomingExpiry ?? [];

  const daysCls = (d: number) =>
    d <= 15 ? 'bg-amber-50 text-amber-700' : 'bg-orange-50 text-orange-600';
  const statusCls = (s: string) =>
    s === 'Active'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
      : s === 'Expiring Soon'
        ? 'bg-amber-50 text-amber-700 border-amber-300'
        : 'bg-rose-50 text-rose-700 border-rose-300';

  const loading = isLoading;

  const renderDonut = (data: { name: string; value: number; color: string }[]) => {
    const total = data.reduce((a, b) => a + b.value, 0);
    if (!total) return <EmptyChart />;
    return (
      <div className="h-[260px] [&_.recharts-wrapper]:!outline-none [&_*:focus]:!outline-none">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="85%" paddingAngle={3} cornerRadius={4}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <RechartsTooltip />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              formatter={(value: string) => {
                const item = data.find((d) => d.name === value);
                return <span className="text-xs text-slate-600">{value}: {item?.value ?? 0}</span>;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="selection:!bg-white selection:!text-[#33077C] rounded-2xl p-6 sm:p-8 text-white shadow-md bg-gradient-to-r from-[#33077C] via-[#4309A2] to-[#6B3FD4] flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Platform Admin Dashboard</h1>
          <p className="text-sm text-white/85 mt-1">Overview of system status and activities</p>
          <div className="text-xs text-white/80 mt-3 flex flex-wrap items-center gap-x-2 gap-y-2">
            <Clock className="w-3.5 h-3.5" />
            <span>
              Last updated: {fmtDate(lastUpdated)}{' '}
              {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh"
              aria-label="Refresh dashboard data"
              className="w-6 h-6 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center cursor-pointer transition-colors disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <span className="text-white/40">|</span>
            <span className="px-2.5 py-1 rounded-md bg-white/20 border border-white/30 text-white font-semibold">
              Report Period: {fmtDate(monthStart)} - {fmtDate(monthEnd)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Organizations', icon: Building2, to: '/organization' },
            { label: 'Subscriptions', icon: Layers, to: '/organization-subscriptions' },
            { label: 'Subscription Plans', icon: ShieldCheck, to: '/subscription-plans' },
          ].map(({ label, icon: Icon, to }) => (
            <button
              key={label}
              onClick={() => navigate(to)}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-xs text-slate-400">Loading dashboard data...</p>}

      {/* Organization statistics */}
      <section>
        <h2 className="text-[13px] font-bold text-slate-900 mb-3">Organization Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Total Organizations"
            value={totalOrgs}
            note={`${orgStats.createdThisMonth} created this month`}
            icon={<Building2 className="w-5 h-5 text-[#4309A2]" />}
            iconCls="bg-[#EDE7F9]"
            barCls=""
            trackCls=""
            onClick={() => navigate('/organization')}
          />
          <StatCard
            label="Active Organizations"
            value={orgStats.active}
            percent={pct(orgStats.active, totalOrgs)}
            icon={<Building2 className="w-5 h-5 text-emerald-700" />}
            iconCls="bg-emerald-200"
            barCls="bg-emerald-600"
            trackCls="bg-emerald-100"
          />
          <StatCard
            label="Inactive Organizations"
            value={orgStats.inactive}
            percent={pct(orgStats.inactive, totalOrgs)}
            icon={<Building2 className="w-5 h-5 text-amber-700" />}
            iconCls="bg-amber-200"
            barCls="bg-amber-500"
            trackCls="bg-amber-100"
          />
          <StatCard
            label="Suspended Organizations"
            value={orgStats.suspended}
            percent={pct(orgStats.suspended, totalOrgs)}
            icon={<Building2 className="w-5 h-5 text-red-700" />}
            iconCls="bg-red-200"
            barCls="bg-red-500"
            trackCls="bg-red-100"
          />
        </div>
      </section>

      {/* Subscription statistics */}
      <section>
        <h2 className="text-[13px] font-bold text-slate-900 mb-3">Subscription Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Active Subscriptions"
            value={subStats.active}
            percent={pct(subStats.active, totalOrgs)}
            icon={<Package className="w-5 h-5 text-emerald-700" />}
            iconCls="bg-emerald-200"
            barCls="bg-emerald-600"
            trackCls="bg-emerald-100"
          />
          <StatCard
            label="Expiring Soon"
            value={subStats.expiring}
            percent={pct(subStats.expiring, totalOrgs)}
            icon={<Package className="w-5 h-5 text-amber-700" />}
            iconCls="bg-amber-200"
            barCls="bg-amber-500"
            trackCls="bg-amber-100"
          />
          <StatCard
            label="Expired Subscriptions"
            value={subStats.expired}
            percent={pct(subStats.expired, totalOrgs)}
            icon={<Package className="w-5 h-5 text-red-700" />}
            iconCls="bg-red-200"
            barCls="bg-red-500"
            trackCls="bg-red-100"
          />
          <StatCard
            label="No Subscription"
            value={subStats.noSubscription}
            percent={pct(subStats.noSubscription, totalOrgs)}
            icon={<Package className="w-5 h-5 text-[#33077C]" />}
            iconCls="bg-[#E3DAF5]"
            barCls="bg-[#33077C]"
            trackCls="bg-[#E3DAF5]"
          />
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="text-[13px] font-bold text-slate-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { title: 'Add Organization', desc: 'Register a new company organization', icon: UserPlus, cls: 'bg-[#EDE7F9] text-[#4309A2]', to: '/organization' },
            { title: 'Create Invoice', desc: 'Generate a new invoice', icon: FileText, cls: 'bg-[#33077C] text-white', to: '/sales/new' },
            { title: 'Subscription Plans', desc: 'Configure subscription plan details', icon: BadgeCheck, cls: 'bg-[#7C4DDB] text-white', to: '/subscription-plans' },
            { title: 'Org Subscriptions', desc: 'View organization subscriptions', icon: CreditCard, cls: 'bg-[#A78BEA] text-white', to: '/organization-subscriptions' },
          ].map(({ title, desc, icon: Icon, cls, to }) => (
            <div
              key={title}
              onClick={() => navigate(to)}
              className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${cls}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-slate-800">{title}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-3">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartCard title="Subscription Status">{renderDonut(subscriptionStatusData)}</ChartCard>
        <ChartCard title="Organization Types" action={<span className="text-xs text-slate-400">Total: {totalOrgs}</span>}>
          {totalOrgs === 0 ? (
            <EmptyChart />
          ) : (
            <div className="space-y-5 pt-2">
              {orgTypeStats.map((t) => (
                <div key={t.name}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-semibold text-slate-800">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                      {t.name}
                    </span>
                    <span className="text-slate-500">
                      <span className="font-bold text-slate-900 text-sm">{t.value}</span> · {pct(t.value, totalOrgs)}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-[#EDE7F9]">
                    <div className="h-2 rounded-full" style={{ width: `${pct(t.value, totalOrgs)}%`, backgroundColor: t.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
        <ChartCard title="Sub Organization Support" action={<span className="text-xs text-slate-400">Total: {totalOrgs}</span>}>
          {totalOrgs === 0 ? (
            <EmptyChart />
          ) : (
            <>
              {renderDonut(subOrgSupportData)}
              <div className="grid grid-cols-2 gap-3 mt-2">
                {subOrgSupportData.map((s) => (
                  <div key={s.name} className="rounded-lg border border-slate-200 p-3 text-center">
                    <div className="text-xl font-bold text-slate-900">{s.value}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{s.name}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>
      </div>

      {/* Organization-wise sub-organizations + plan-wise */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartCard
          title="Organization-wise Sub Organizations Created"
          className="lg:col-span-2"
          action={<span className="text-xs text-slate-400">Total sub-organizations: {totalSubOrgs}</span>}
        >
          {subOrgChartData.length === 0 ? (
            <EmptyChart text="No sub-organizations created yet" />
          ) : (
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative h-[240px] w-full md:w-1/2 [&_.recharts-wrapper]:!outline-none [&_*:focus]:!outline-none">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={subOrgChartData} dataKey="count" nameKey="fullName" innerRadius="62%" outerRadius="88%" paddingAngle={3} cornerRadius={4}>
                      {subOrgChartData.map((d) => (
                        <Cell key={d.fullName} fill={d.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid #e2e8f0' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-slate-900">{totalSubOrgs}</span>
                  <span className="text-[11px] text-slate-400">Sub Organizations</span>
                </div>
              </div>
              <div className="w-full md:w-1/2 space-y-3">
                {subOrgChartData.map((d) => (
                  <div key={d.fullName} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-700 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="truncate">{d.fullName}</span>
                    </span>
                    <span className="shrink-0 pl-3">
                      <span className="font-bold text-slate-900">{d.count}</span>
                      <span className="text-slate-400"> · {pct(d.count, totalSubOrgs)}%</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Plan-wise Subscriptions">
          {planWise.length === 0 ? (
            <EmptyChart />
          ) : (
            <div className="space-y-4">
              {planWise.map((p) => (
                <div key={p.name}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{p.name}</span>
                    <span className="text-slate-400">
                      {p.active} active{p.expiring ? ` · ${p.expiring} expiring` : ''}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-[#EDE7F9]">
                    <div
                      className="h-1.5 rounded-full bg-[#4309A2]"
                      style={{ width: `${pct(p.total, subscribedOrgs)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      {/* Upcoming expiry */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-bold text-slate-900">Upcoming Subscription Expiry</h3>
          <button
            onClick={() => navigate('/organization-subscriptions')}
            className="text-xs font-semibold text-[#4309A2] hover:underline flex items-center gap-1 cursor-pointer"
          >
            View All <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px]">
                <th className="px-4 py-3 font-semibold">Organization</th>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Expiry Date</th>
                <th className="px-4 py-3 font-semibold text-right">Days Left</th>
              </tr>
            </thead>
            <tbody>
              {upcomingExpiry.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No subscriptions expiring in the next 45 days
                  </td>
                </tr>
              ) : (
                upcomingExpiry.map((s) => {
                  const logo = s.logo;
                  const name = s.orgName || '-';
                  return (
                    <tr key={s.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {logo ? (
                            <img src={logo} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#4309A2] text-white flex items-center justify-center font-bold">
                              {name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium text-slate-800">{name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{s.planName}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${statusCls(s.status)}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{fmtDate(s.endDate)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${daysCls(s.daysLeft)}`}>
                          {s.daysLeft} days
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

