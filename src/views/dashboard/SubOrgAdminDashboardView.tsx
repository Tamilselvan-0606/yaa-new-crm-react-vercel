import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch, Package, Users, UserPlus, BadgeCheck, Wallet, Target, CalendarClock } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useDashboardScope } from '../../hooks/useDashboardScope';
import { useGetSubOrganizationOverviewQuery } from '../../api/platform/dashboardOverviewApi';
import {
  BRAND,
  ChartCard,
  DashboardBanner,
  DaysLeftPill,
  DonutChart,
  EmptyChart,
  QuickActions,
  QuotationInvoiceChart,
  SectionTitle,
  SimpleTable,
  StatCard,
  StatusPill,
  fmtDate,
  money,
  pct,
} from '../../components/dashboard/DashboardParts';
import { leadFunnelFromCounts } from '../../utils/dashboardStats';

const ZERO_TOTALS = { total: 0, active: 0 };
const ZERO_FUNNEL = { open: 0, contacted: 0, qualified: 0, converted: 0, lost: 0 };
const ZERO_QI = { monthly: [], totals: { quotes: 0, accepted: 0, invoices: 0, invoiced: 0, outstanding: 0 } };

export const SubOrgAdminDashboardView: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { orgId, subOrgId, branchId, subOrgName, branchName } = useDashboardScope();

  const { data: res, isLoading, refetch } = useGetSubOrganizationOverviewQuery(
    { organizationId: orgId, subOrganizationId: subOrgId, branchId },
    { skip: !subOrgId }
  );
  const o = res?.data;

  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [refreshing, setRefreshing] = useState(false);
  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
      setLastUpdated(new Date());
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const displayName =
    subOrgName || (currentUser as any)?.subOrganization?.name || (currentUser as any)?.memberships?.[0]?.subOrganization?.name || currentUser?.name || 'Sub Organization';

  const branches = o?.overview.branches ?? ZERO_TOTALS;
  const products = o?.overview.products ?? ZERO_TOTALS;
  const clients = o?.overview.clients ?? ZERO_TOTALS;
  const leads = o?.leads ?? { total: 0, converted: 0, funnel: ZERO_FUNNEL };
  const subs = o?.subscriptions ?? { active: 0, expiring: 0, expired: 0, total: 0 };
  const pay = o?.payments ?? { paid: 0, pending: 0, overdue: 0, partial: 0, paidAmt: 0, pendingAmt: 0, overdueAmt: 0, total: 0 };
  const expiring = o?.upcomingExpiries ?? [];
  const followUps = o?.upcomingFollowUps ?? [];

  const funnel = useMemo(() => leadFunnelFromCounts(leads.funnel), [leads.funnel]);
  const branchChart = useMemo(
    () =>
      (o?.branchRows ?? [])
        .slice(0, 8)
        .map((b) => ({ name: b.name.length > 12 ? `${b.name.slice(0, 11)}…` : b.name, Leads: b.leads, Converted: b.converted })),
    [o?.branchRows]
  );

  const subscriptionDonut = [
    { name: 'Active', value: subs.active, color: BRAND.success },
    { name: 'Expiring Soon', value: subs.expiring, color: BRAND.warning },
    { name: 'Expired', value: subs.expired, color: BRAND.danger },
  ];
  const paymentDonut = [
    { name: 'Paid', value: pay.paid, color: BRAND.main },
    { name: 'Pending', value: pay.pending + pay.partial, color: BRAND.soft },
    { name: 'Overdue', value: pay.overdue, color: BRAND.dark },
  ];

  return (
    <div className="space-y-6">
      <DashboardBanner
        title="Sub Organization Dashboard"
        subtitle={`${displayName} · branch performance, leads, clients and collections`}
        scopeLabel={branchName}
        lastUpdated={lastUpdated}
        refreshing={refreshing}
        onRefresh={refreshAll}
        buttons={[
          { label: 'Branches', icon: GitBranch, onClick: () => navigate('/branches') },
          { label: 'Leads', icon: Target, onClick: () => navigate('/leads') },
          { label: 'Payments', icon: Wallet, onClick: () => navigate('/payments') },
        ]}
      />

      {isLoading && <p className="text-xs text-slate-400">Loading dashboard data...</p>}

      <section>
        <SectionTitle>Sub Organization Overview</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Branches"
            value={branches.total}
            percent={pct(branches.active, branches.total)}
            icon={<GitBranch className="w-5 h-5 text-[#4309A2]" />}
            iconCls="bg-[#EDE7F9]"
            onClick={() => navigate('/branches')}
          />
          <StatCard
            label="Products"
            value={products.total}
            note={`${products.active} active products`}
            icon={<Package className="w-5 h-5 text-[#33077C]" />}
            iconCls="bg-[#E3DAF5]"
            onClick={() => navigate('/products')}
          />
          <StatCard
            label="Leads"
            value={leads.total}
            note={`${leads.converted} converted`}
            icon={<Target className="w-5 h-5 text-[#4309A2]" />}
            iconCls="bg-[#EDE7F9]"
            onClick={() => navigate('/leads')}
          />
          <StatCard
            label="Clients"
            value={clients.total}
            note={`${clients.active} active clients`}
            icon={<Users className="w-5 h-5 text-[#33077C]" />}
            iconCls="bg-[#E3DAF5]"
            onClick={() => navigate('/leads')}
          />
        </div>
      </section>

      <section>
        <SectionTitle>Collections & Subscriptions</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Revenue Collected"
            value={money(pay.paidAmt)}
            note={`${pay.paid} paid payments`}
            icon={<Wallet className="w-5 h-5 text-emerald-700" />}
            iconCls="bg-emerald-200"
            onClick={() => navigate('/payments')}
          />
          <StatCard
            label="Pending Amount"
            value={money(pay.pendingAmt)}
            note={`${pay.pending + pay.partial} pending payments`}
            icon={<Wallet className="w-5 h-5 text-amber-700" />}
            iconCls="bg-amber-200"
            onClick={() => navigate('/payments')}
          />
          <StatCard
            label="Overdue Amount"
            value={money(pay.overdueAmt)}
            note={`${pay.overdue} overdue payments`}
            icon={<Wallet className="w-5 h-5 text-red-700" />}
            iconCls="bg-red-200"
            onClick={() => navigate('/payments')}
          />
          <StatCard
            label="Active Subscriptions"
            value={subs.active}
            percent={pct(subs.active, subs.total)}
            icon={<BadgeCheck className="w-5 h-5 text-emerald-700" />}
            iconCls="bg-emerald-200"
            barCls="bg-emerald-600"
            trackCls="bg-emerald-100"
            onClick={() => navigate('/subscriptions')}
          />
        </div>
      </section>

      <QuickActions
        onGo={navigate}
        actions={[
          { title: 'Add Branch', desc: 'Register a new branch', icon: GitBranch, cls: 'bg-[#EDE7F9] text-[#4309A2]', to: '/branches' },
          { title: 'Add Product', desc: 'Set up a new product', icon: Package, cls: 'bg-[#33077C] text-white', to: '/products' },
          { title: 'Add Lead', desc: 'Capture a new sales lead', icon: UserPlus, cls: 'bg-[#7C4DDB] text-white', to: '/leads' },
          { title: 'Record Payment', desc: 'View and manage payments', icon: Wallet, cls: 'bg-[#A78BEA] text-white', to: '/payments' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartCard title="Lead Pipeline">
          <DonutChart data={funnel} />
        </ChartCard>
        <ChartCard title="Payment Status">
          <DonutChart data={paymentDonut} />
        </ChartCard>
        <ChartCard title="Subscription Status">
          <DonutChart data={subscriptionDonut} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Branch-wise Leads">
          {branchChart.length === 0 ? (
            <EmptyChart />
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <RechartsTooltip />
                  <Legend iconType="square" iconSize={10} />
                  <Bar dataKey="Leads" fill={BRAND.soft} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Converted" fill={BRAND.dark} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
        <QuotationInvoiceChart summary={o?.quotationsInvoices ?? ZERO_QI} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <SimpleTable
          title="Upcoming Lead Follow-ups"
          onViewAll={() => navigate('/leads')}
          emptyText="No follow-ups scheduled"
          rows={followUps}
          columns={[
            { header: 'Lead', render: (l: any) => <span className="font-medium text-slate-800">{l.name}</span> },
            { header: 'Company', render: (l: any) => l.company || '-' },
            { header: 'Status', render: (l: any) => <StatusPill status={l.status} /> },
            {
              header: 'Follow-up',
              align: 'right',
              render: (l: any) => (
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="w-3.5 h-3.5 text-[#4309A2]" />
                  {fmtDate(l.followUpDate)}
                </span>
              ),
            },
          ]}
        />
        <SimpleTable
          title="Upcoming Subscription Expiry"
          onViewAll={() => navigate('/subscriptions')}
          emptyText="No upcoming subscription expiries"
          rows={expiring}
          columns={[
            { header: 'Client', render: (s: any) => <span className="font-medium text-slate-800">{s.customerName || '-'}</span> },
            { header: 'Product', render: (s: any) => s.productName || '-' },
            { header: 'Expiry', render: (s: any) => fmtDate(s.endDate) },
            { header: 'Days Left', align: 'right', render: (s: any) => <DaysLeftPill days={s.daysLeft} /> },
          ]}
        />
      </div>
    </div>
  );
};
