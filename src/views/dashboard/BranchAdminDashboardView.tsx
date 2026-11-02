import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Users, UserPlus, Wallet, Target, CalendarClock, BadgeCheck, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useDashboardData } from '../../hooks/useDashboardData';
import {
  BRAND,
  ChartCard,
  DashboardBanner,
  DaysLeftPill,
  DonutChart,
  EmptyChart,
  QuickActions,
  SectionTitle,
  SimpleTable,
  StatCard,
  StatusPill,
  fmtDate,
  money,
  pct,
} from '../../components/dashboard/DashboardParts';
import { leadFunnel, monthlyCounts, paymentStats, subscriptionStats, upcomingExpiries, upcomingFollowUps } from '../../utils/dashboardStats';

const isStatus = (x: any, s: string) => String(x.status || '').toLowerCase().startsWith(s);

const todayKey = () => new Date().toISOString().split('T')[0];

export const BranchAdminDashboardView: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const d = useDashboardData();

  const branchName =
    d.scopeNames.branchName || (currentUser as any)?.branch?.name || (currentUser as any)?.memberships?.[0]?.branch?.name || currentUser?.name || 'Branch';

  const funnel = useMemo(() => leadFunnel(d.leads), [d.leads]);
  const pay = useMemo(() => paymentStats(d.payments), [d.payments]);
  const subs = useMemo(() => subscriptionStats(d.subscriptions), [d.subscriptions]);
  const monthly = useMemo(() => monthlyCounts(d.leads, 6), [d.leads]);
  const expiring = useMemo(() => upcomingExpiries(d.subscriptions), [d.subscriptions]);
  const followUps = useMemo(() => upcomingFollowUps(d.leads, 6), [d.leads]);
  const recentPayments = useMemo(
    () => [...d.payments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
    [d.payments]
  );

  const today = todayKey();
  const dueToday = d.leads.filter((l) => l.followUpDate && String(l.followUpDate).startsWith(today)).length;
  const overdueFollowUps = d.leads.filter(
    (l) =>
      l.followUpDate &&
      String(l.followUpDate).slice(0, 10) < today &&
      !String(l.status).toLowerCase().startsWith('converted') &&
      String(l.status).toLowerCase() !== 'lost'
  ).length;
  const converted = funnel[3].value;

  const paymentDonut = [
    { name: 'Paid', value: pay.paid, color: BRAND.main },
    { name: 'Pending', value: pay.pending + pay.partial, color: BRAND.soft },
    { name: 'Overdue', value: pay.overdue, color: BRAND.dark },
  ];
  const subscriptionDonut = [
    { name: 'Active', value: subs.active, color: BRAND.success },
    { name: 'Expiring Soon', value: subs.expiring, color: BRAND.warning },
    { name: 'Expired', value: subs.expired, color: BRAND.danger },
  ];

  return (
    <div className="space-y-6">
      <DashboardBanner
        title="Branch Dashboard"
        subtitle={`${branchName} · today's follow-ups, client billing and collections`}
        lastUpdated={d.lastUpdated}
        refreshing={d.refreshing}
        onRefresh={d.refreshAll}
        buttons={[
          { label: 'Leads', icon: Target, onClick: () => navigate('/leads') },
          { label: 'Payments', icon: Wallet, onClick: () => navigate('/payments') },
          { label: 'Subscriptions', icon: BadgeCheck, onClick: () => navigate('/subscriptions') },
        ]}
      />

      {d.loading && <p className="text-xs text-slate-400">Loading dashboard data...</p>}

      <section>
        <SectionTitle>Today at Your Branch</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Branch Leads"
            value={d.totalLeads}
            note={`${converted} converted to clients`}
            icon={<Target className="w-5 h-5 text-[#4309A2]" />}
            iconCls="bg-[#EDE7F9]"
            onClick={() => navigate('/leads')}
          />
          <StatCard
            label="Follow-ups Due Today"
            value={dueToday}
            note="Calls & demos scheduled for today"
            icon={<CalendarClock className="w-5 h-5 text-[#4309A2]" />}
            iconCls="bg-[#E3DAF5]"
            onClick={() => navigate('/leads')}
          />
          <StatCard
            label="Overdue Follow-ups"
            value={overdueFollowUps}
            note="Need attention"
            icon={<AlertTriangle className="w-5 h-5 text-red-700" />}
            iconCls="bg-red-200"
            onClick={() => navigate('/leads')}
          />
          <StatCard
            label="Clients"
            value={d.totalClients}
            note={`${d.clients.filter((c) => isStatus(c, 'active')).length} active clients`}
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
            label="Collected"
            value={money(pay.paidAmt)}
            note={`${pay.paid} paid payments`}
            icon={<Wallet className="w-5 h-5 text-emerald-700" />}
            iconCls="bg-emerald-200"
            onClick={() => navigate('/payments')}
          />
          <StatCard
            label="Pending"
            value={money(pay.pendingAmt)}
            note={`${pay.pending + pay.partial} pending payments`}
            icon={<Wallet className="w-5 h-5 text-amber-700" />}
            iconCls="bg-amber-200"
            onClick={() => navigate('/payments')}
          />
          <StatCard
            label="Overdue"
            value={money(pay.overdueAmt)}
            note={`${pay.overdue} overdue payments`}
            icon={<Wallet className="w-5 h-5 text-red-700" />}
            iconCls="bg-red-200"
            onClick={() => navigate('/payments')}
          />
          <StatCard
            label="Products"
            value={d.totalProducts}
            percent={pct(d.products.filter((p) => isStatus(p, 'active')).length, d.products.length)}
            icon={<Package className="w-5 h-5 text-[#33077C]" />}
            iconCls="bg-[#EDE7F9]"
            onClick={() => navigate('/products')}
          />
        </div>
      </section>

      <QuickActions
        onGo={navigate}
        actions={[
          { title: 'Add Lead', desc: 'Capture a new sales lead', icon: UserPlus, cls: 'bg-[#EDE7F9] text-[#4309A2]', to: '/leads' },
          { title: 'Payments', desc: 'View and manage payments', icon: Wallet, cls: 'bg-[#33077C] text-white', to: '/payments' },
          { title: 'Subscriptions', desc: 'Track client subscriptions', icon: BadgeCheck, cls: 'bg-[#7C4DDB] text-white', to: '/subscriptions' },
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

      <ChartCard title="Leads Created (Last 6 Months)">
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <RechartsTooltip />
              <Legend iconType="square" iconSize={10} />
              <Bar dataKey="count" name="Leads" fill={BRAND.main} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <SimpleTable
          title="Upcoming Lead Follow-ups"
          onViewAll={() => navigate('/leads')}
          emptyText="No follow-ups scheduled"
          rows={followUps}
          columns={[
            { header: 'Lead', render: (l: any) => <span className="font-medium text-slate-800">{l.name}</span> },
            { header: 'Status', render: (l: any) => <StatusPill status={l.status} /> },
            { header: 'Follow-up', align: 'right', render: (l: any) => fmtDate(l.followUpDate) },
          ]}
        />
        <SimpleTable
          title="Upcoming Subscription Expiry"
          onViewAll={() => navigate('/subscriptions')}
          emptyText="No upcoming subscription expiries"
          rows={expiring}
          columns={[
            { header: 'Client', render: (s: any) => <span className="font-medium text-slate-800">{s.customer?.name || '-'}</span> },
            { header: 'Expiry', render: (s: any) => fmtDate(s.endDate) },
            { header: 'Days Left', align: 'right', render: (s: any) => <DaysLeftPill days={s.daysLeft} /> },
          ]}
        />
      </div>

      <SimpleTable
        title="Recent Payments"
        onViewAll={() => navigate('/payments')}
        emptyText="No payments recorded yet"
        rows={recentPayments}
        columns={[
          { header: 'Client', render: (p: any) => <span className="font-medium text-slate-800">{p.customerName || '-'}</span> },
          { header: 'Product', render: (p: any) => p.productName || p.productOrService || '-' },
          { header: 'Amount', render: (p: any) => money(Number(p.amount)) },
          { header: 'Status', render: (p: any) => <StatusPill status={p.status} /> },
          { header: 'Date', align: 'right', render: (p: any) => fmtDate(p.paymentDate || p.dueDate) },
        ]}
      />
    </div>
  );
};

