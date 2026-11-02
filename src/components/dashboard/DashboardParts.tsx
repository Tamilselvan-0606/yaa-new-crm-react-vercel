import React from 'react';
import { Clock, RefreshCw } from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { quoteInvoiceMonthly, quoteInvoiceTotals } from '../../utils/dashboardStats';
import { BRAND } from './brand';

export { BRAND };


export const fmtDate = (d?: string | Date | null) => {
  if (!d) return '-';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '-';
  return `${String(dt.getDate()).padStart(2, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}-${dt.getFullYear()}`;
};

export const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

export const money = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

export const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-[13px] font-bold text-slate-900 mb-3">{children}</h2>
);

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  percent?: number;
  note?: string;
  icon: React.ReactNode;
  iconCls: string;
  barCls?: string;
  trackCls?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, percent, note, icon, iconCls, barCls, trackCls, onClick }) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-xl border border-slate-200 shadow-2xs p-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
  >
    <div className="flex items-start justify-between">
      <span className="text-[13px] text-slate-500 font-medium">{label}</span>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconCls}`}>{icon}</div>
    </div>
    <div className="mt-2 text-xl font-bold text-slate-900">{value}</div>
    {percent !== undefined ? (
      <div className="mt-3 flex items-center gap-3">
        <div className={`flex-1 h-1.5 rounded-full ${trackCls || 'bg-slate-100'}`}>
          <div className={`h-1.5 rounded-full ${barCls || 'bg-[#4309A2]'}`} style={{ width: `${percent}%` }} />
        </div>
        <span className="text-[11px] text-slate-400 font-medium">{percent}%</span>
      </div>
    ) : (
      <p className="mt-3 text-[11px] text-slate-400">{note}</p>
    )}
  </div>
);

export const ChartCard: React.FC<{ title: string; children: React.ReactNode; className?: string; action?: React.ReactNode }> = ({
  title,
  children,
  className = '',
  action,
}) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-2xs p-5 ${className}`}>
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-[13px] font-bold text-slate-900">{title}</h3>
      {action}
    </div>
    {children}
  </div>
);

export const EmptyChart: React.FC<{ text?: string }> = ({ text = 'No data available' }) => (
  <div className="h-[220px] flex items-center justify-center text-xs text-slate-400">{text}</div>
);

export interface DonutDatum {
  name: string;
  value: number;
  color: string;
}

export const DonutChart: React.FC<{ data: DonutDatum[] }> = ({ data }) => {
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
              return (
                <span className="text-xs text-slate-600">
                  {value}: {item?.value ?? 0}
                </span>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

interface BannerProps {
  title: string;
  subtitle: string;
  scopeLabel?: string;
  lastUpdated: Date;
  refreshing: boolean;
  onRefresh: () => void;
  buttons: { label: string; icon: React.ComponentType<{ className?: string }>; onClick: () => void }[];
}

export const DashboardBanner: React.FC<BannerProps> = ({ title, subtitle, scopeLabel, lastUpdated, refreshing, onRefresh, buttons }) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return (
    <div className="selection:!bg-white selection:!text-[#33077C] rounded-2xl p-6 sm:p-8 text-white shadow-md bg-gradient-to-r from-[#33077C] via-[#4309A2] to-[#6B3FD4] flex flex-col lg:flex-row lg:items-center justify-between gap-5">
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
          {scopeLabel && (
            <span className="px-2.5 py-1 rounded-md bg-white/20 border border-white/30 text-xs font-semibold">{scopeLabel}</span>
          )}
        </div>
        <p className="text-sm text-white/85 mt-1">{subtitle}</p>
        <div className="text-xs text-white/80 mt-3 flex flex-wrap items-center gap-x-2 gap-y-2">
          <Clock className="w-3.5 h-3.5" />
          <span>
            Last updated: {fmtDate(lastUpdated)} {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button
            type="button"
            onClick={onRefresh}
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
        {buttons.map(({ label, icon: Icon, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export interface QuickAction {
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  cls: string;
  to: string;
}

export const QuickActions: React.FC<{ actions: QuickAction[]; onGo: (to: string) => void }> = ({ actions, onGo }) => (
  <section>
    <SectionTitle>Quick Actions</SectionTitle>
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${actions.length >= 4 ? 'xl:grid-cols-4' : 'xl:grid-cols-3'} gap-4`}>
      {actions.map(({ title, desc, icon: Icon, cls, to }) => (
        <div
          key={title}
          onClick={() => onGo(to)}
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
);

export const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const s = status.toLowerCase();
  const cls =
    s === 'active' || s === 'paid' || s === 'converted to client' || s === 'qualified'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
      : s.includes('expiring') || s === 'pending' || s.includes('partial') || s === 'contacted' || s === 'open'
        ? 'bg-amber-50 text-amber-700 border-amber-300'
        : s === 'inactive'
          ? 'bg-slate-100 text-slate-600 border-slate-300'
          : 'bg-rose-50 text-rose-700 border-rose-300';
  return <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold whitespace-nowrap ${cls}`}>{status}</span>;
};

export const DaysLeftPill: React.FC<{ days: number }> = ({ days }) => (
  <span
    className={`px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap ${days <= 15 ? 'bg-rose-50 text-rose-600' : days <= 30 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}
  >
    {days} days
  </span>
);

export interface Column<T> {
  header: string;
  align?: 'left' | 'right';
  render: (row: T) => React.ReactNode;
}

export function SimpleTable<T extends { id?: string }>({
  title,
  columns,
  rows,
  emptyText,
  onViewAll,
}: {
  title: string;
  columns: Column<T>[];
  rows: T[];
  emptyText: string;
  onViewAll?: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-bold text-slate-900">{title}</h3>
        {onViewAll && (
          <button onClick={onViewAll} className="text-xs font-semibold text-[#4309A2] hover:underline cursor-pointer">
            View All →
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px]">
              {columns.map((c) => (
                <th key={c.header} className={`px-4 py-3 font-semibold ${c.align === 'right' ? 'text-right' : ''}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-400">
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={row.id || i} className="border-t border-slate-100">
                  {columns.map((c) => (
                    <td key={c.header} className={`px-4 py-3 text-slate-600 ${c.align === 'right' ? 'text-right' : ''}`}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Monthly quotations vs invoices, with headline totals. Shared by the org-level dashboards. */
export const QuotationInvoiceChart: React.FC<{
  quotes?: any[];
  invoices?: any[];
  /** Server-computed series/totals; when given, `quotes` / `invoices` are not needed. */
  summary?: {
    monthly: { label: string; Quotations: number; Invoices: number }[];
    totals: { quotes: number; accepted: number; invoices: number; invoiced: number; outstanding: number };
  };
  className?: string;
}> = ({ quotes = [], invoices = [], summary, className }) => {
  const monthly = React.useMemo(() => summary?.monthly ?? quoteInvoiceMonthly(quotes, invoices), [summary, quotes, invoices]);
  const t = React.useMemo(() => summary?.totals ?? quoteInvoiceTotals(quotes, invoices), [summary, quotes, invoices]);
  const chips = [
    { label: 'Quotations', value: String(t.quotes), sub: `${t.accepted} accepted` },
    { label: 'Invoices', value: String(t.invoices), sub: 'excluding cancelled' },
    { label: 'Total Invoiced', value: money(t.invoiced), sub: 'grand total' },
    { label: 'Outstanding', value: money(t.outstanding), sub: 'balance due' },
  ];
  return (
    <ChartCard title="Quotations & Invoices" className={className} action={<span className="text-xs text-slate-400">Last 12 months</span>}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {chips.map((c) => (
          <div key={c.label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="text-[11px] text-slate-500">{c.label}</div>
            <div className="text-base font-bold text-slate-900">{c.value}</div>
            <div className="text-[10px] text-slate-400">{c.sub}</div>
          </div>
        ))}
      </div>
      {t.quotes === 0 && t.invoices === 0 ? (
        <EmptyChart text="No quotations or invoices yet" />
      ) : (
        <div className="h-[240px] [&_.recharts-wrapper]:!outline-none [&_*:focus]:!outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <RechartsTooltip cursor={{ fill: '#EDE7F9', opacity: 0.6 }} contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid #e2e8f0' }} />
              <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Quotations" fill={BRAND.soft} radius={[2, 2, 0, 0]} />
              <Bar dataKey="Invoices" fill={BRAND.dark} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
};
