import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, GitBranch, Package, Users, UserPlus, BadgeCheck, Wallet, Target } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Cell } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useDashboardScope } from '../../hooks/useDashboardScope';
import { useGetOrganizationOverviewQuery } from '../../api/platform/dashboardOverviewApi';
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

export const OrgAdminDashboardView: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { orgId, subOrgId, branchId, subOrgName, branchName } = useDashboardScope();

  const { data: res, isLoading, refetch } = useGetOrganizationOverviewQuery({
    organizationId: orgId,
    subOrganizationId: subOrgId,
    branchId,
  });
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

  const orgName = (currentUser as any)?.organization?.name || currentUser?.name || 'Organization';
  const scopeLabel = branchName || subOrgName || undefined;

  const subOrgs = o?.structure.subOrganizations ?? ZERO_TOTALS;
  const branches = o?.structure.branches ?? ZERO_TOTALS;
  const products = o?.structure.products ?? ZERO_TOTALS;
  const clients = o?.structure.clients ?? ZERO_TOTALS;
  const leads = o?.leads ?? { total: 0, converted: 0, funnel: ZERO_FUNNEL };
  const subs = o?.subscriptions ?? { active: 0, expiring: 0, expired: 0, total: 0 };
  const pay = o?.payments ?? { paid: 0, pending: 0, overdue: 0, partial: 0, paidAmt: 0, pendingAmt: 0, overdueAmt: 0, total: 0 };
  const productWise = o?.productWise ?? [];
  const expiring = o?.upcomingExpiries ?? [];
  const recentPayments = o?.recentPayments ?? [];

  const funnel = useMemo(() => leadFunnelFromCounts(leads.funnel), [leads.funnel]);

  const subscriptionDonut = [
    { name: 'Active', value: subs.active, color: BRAND.success },
    { name: 'Expiring Soon', value: subs.expiring, color: BRAND.warning },
    { name: 'Expired', value: subs.expired, color: BRAND.danger },
  ];

  const collectionData = [
    { name: 'Collected', amount: pay.paidAmt, fill: BRAND.main },
    { name: 'Pending', amount: pay.pendingAmt, fill: BRAND.soft },
    { name: 'Overdue', amount: pay.overdueAmt, fill: BRAND.dark },
  ];

  const maxProductSubs = Math.max(1, ...productWise.map((p) => p.active));

  return (
    <div className="space-y-6">
      <DashboardBanner
        title="Organization Dashboard"
        subtitle={`${orgName} · sub-organizations, branches, products, clients and billing at a glance`}
        scopeLabel={scopeLabel}
        lastUpdated={lastUpdated}
        refreshing={refreshing}
        onRefresh={refreshAll}
        buttons={[
          { label: 'Sub Organizations', icon: Building2, onClick: () => navigate('/organization') },
          { label: 'Branches', icon: GitBranch, onClick: () => navigate('/branches') },
          { label: 'Products', icon: Package, onClick: () => navigate('/products') },
        ]}
      />

      {isLoading && <p className="text-xs text-slate-400">Loading dashboard data...</p>}

      <section>
        <SectionTitle>Organization Structure</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Sub Organizations"
            value={subOrgs.total}
            percent={pct(subOrgs.active, subOrgs.total)}
            icon={<Building2 className="w-5 h-5 text-[#4309A2]" />}
            iconCls="bg-[#EDE7F9]"
            onClick={() => navigate('/organization')}
          />
          <StatCard
            label="Branches"
            value={branches.total}
            percent={pct(branches.active, branches.total)}
            icon={<GitBranch className="w-5 h-5 text-[#4309A2]" />}
            iconCls="bg-[#E3DAF5]"
            onClick={() => navigate('/branches')}
          />
          <StatCard
            label="Products"
            value={products.total}
            percent={pct(products.active, products.total)}
            icon={<Package className="w-5 h-5 text-[#33077C]" />}
            iconCls="bg-[#EDE7F9]"
            onClick={() => navigate('/products')}
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
        <SectionTitle>Business Overview</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Total Leads"
            value={leads.total}
            note={`${leads.converted} converted to clients`}
            icon={<Target className="w-5 h-5 text-[#4309A2]" />}
            iconCls="bg-[#EDE7F9]"
            onClick={() => navigate('/leads')}
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
          <StatCard
            label="Revenue Collected"
            value={money(pay.paidAmt)}
            note={`${pay.paid} paid payments`}
            icon={<Wallet className="w-5 h-5 text-emerald-700" />}
            iconCls="bg-emerald-200"
            onClick={() => navigate('/payments')}
          />
          <StatCard
            label="Outstanding"
            value={money(pay.pendingAmt + pay.overdueAmt)}
            note={`${pay.overdue} overdue · ${pay.pending + pay.partial} pending`}
            icon={<Wallet className="w-5 h-5 text-red-700" />}
            iconCls="bg-red-200"
            onClick={() => navigate('/payments')}
          />
        </div>
      </section>

      <QuickActions
        onGo={navigate}
        actions={[
          { title: 'Add Sub Organization', desc: 'Create a new sub-organization', icon: Building2, cls: 'bg-[#EDE7F9] text-[#4309A2]', to: '/organization' },
          { title: 'Add Branch', desc: 'Register a new branch', icon: GitBranch, cls: 'bg-[#33077C] text-white', to: '/branches' },
          { title: 'Add Product', desc: 'Set up a new product', icon: Package, cls: 'bg-[#7C4DDB] text-white', to: '/products' },
          { title: 'Add Lead', desc: 'Capture a new sales lead', icon: UserPlus, cls: 'bg-[#A78BEA] text-white', to: '/leads' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartCard title="Lead Pipeline">
          <DonutChart data={funnel} />
        </ChartCard>
        <ChartCard title="Subscription Status">
          <DonutChart data={subscriptionDonut} />
        </ChartCard>
        <ChartCard title="Payment Collection (₹)">
          {pay.total === 0 ? (
            <EmptyChart />
          ) : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={collectionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip formatter={(v: any) => money(Number(v))} />
                  <Bar dataKey="amount" name="Amount" radius={[2, 2, 0, 0]}>
                    {collectionData.map((c) => (
                      <Cell key={c.name} fill={c.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <QuotationInvoiceChart summary={o?.quotationsInvoices ?? ZERO_QI} className="lg:col-span-2" />

        <ChartCard title="Product-wise Active Subscriptions">
          {productWise.length === 0 ? (
            <EmptyChart />
          ) : (
            <div className="space-y-4">
              {productWise.map((p) => (
                <div key={p.id}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 truncate pr-2">{p.name}</span>
                    <span className="text-slate-400 shrink-0">{p.active} active</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-[#EDE7F9]">
                    <div className="h-1.5 rounded-full bg-[#4309A2]" style={{ width: `${pct(p.active, maxProductSubs)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
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
        <SimpleTable
          title="Recent Payments"
          onViewAll={() => navigate('/payments')}
          emptyText="No payments recorded yet"
          rows={recentPayments}
          columns={[
            { header: 'Client', render: (p: any) => <span className="font-medium text-slate-800">{p.customerName || '-'}</span> },
            { header: 'Amount', render: (p: any) => money(Number(p.amount)) },
            { header: 'Status', render: (p: any) => <StatusPill status={p.status} /> },
            { header: 'Date', align: 'right', render: (p: any) => fmtDate(p.paymentDate || p.dueDate) },
          ]}
        />
      </div>
    </div>
  );
};
