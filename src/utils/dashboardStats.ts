import { BRAND } from '../components/dashboard/brand';
import type { DonutDatum } from '../components/dashboard/DashboardParts';

const DAY = 86400000;

export const leadFunnel = (leads: any[]): DonutDatum[] => {
  const c = { open: 0, contacted: 0, qualified: 0, converted: 0, lost: 0 };
  leads.forEach((l) => {
    const s = String(l.status || '').toLowerCase();
    if (s.startsWith('converted')) c.converted++;
    else if (s === 'qualified') c.qualified++;
    else if (s === 'contacted') c.contacted++;
    else if (s === 'lost' || s === 'inactive') c.lost++;
    else c.open++;
  });
  return [
    { name: 'Open', value: c.open, color: BRAND.pale },
    { name: 'Contacted', value: c.contacted, color: BRAND.soft },
    { name: 'Qualified', value: c.qualified, color: BRAND.mid },
    { name: 'Converted', value: c.converted, color: BRAND.dark },
    { name: 'Lost / Inactive', value: c.lost, color: BRAND.muted },
  ];
};

export const paymentStats = (payments: any[]) => {
  let paid = 0, pending = 0, overdue = 0, partial = 0;
  let paidAmt = 0, pendingAmt = 0, overdueAmt = 0;
  payments.forEach((p) => {
    const s = String(p.status || '').toLowerCase();
    const amt = Number(p.amount) || 0;
    if (s === 'paid') { paid++; paidAmt += amt; }
    else if (s === 'overdue') { overdue++; overdueAmt += amt; }
    else if (s.includes('partial')) { partial++; pendingAmt += amt; }
    else if (s === 'pending') { pending++; pendingAmt += amt; }
  });
  return { paid, pending, overdue, partial, paidAmt, pendingAmt, overdueAmt };
};

export const subscriptionStats = (subs: any[]) => {
  let active = 0, expiring = 0, expired = 0;
  subs.forEach((s) => {
    if (s.status === 'Active') active++;
    else if (s.status === 'Expiring Soon') expiring++;
    else expired++;
  });
  return { active, expiring, expired, total: subs.length };
};

/** Next subscriptions to expire (not cancelled, not already past). */
export const upcomingExpiries = (subs: any[], limit = 5) =>
  subs
    .filter((s) => s.status !== 'Cancelled' && s.endDate)
    .map((s) => ({ ...s, daysLeft: Math.ceil((new Date(s.endDate).getTime() - Date.now()) / DAY) }))
    .filter((s) => s.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, limit);

/** Counts items created in each of the last `months` months. */
export const monthlyCounts = (items: any[], months = 12, dateKey = 'createdAt') => {
  const now = new Date();
  const rows: { key: string; label: string; count: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    rows.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: `${d.toLocaleString('en-US', { month: 'short' })} ${String(d.getFullYear()).slice(2)}`,
      count: 0,
    });
  }
  items.forEach((it) => {
    if (!it[dateKey]) return;
    const d = new Date(it[dateKey]);
    const row = rows.find((r) => r.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (row) row.count++;
  });
  return rows;
};

export const statusCounts = (items: any[], statuses: string[]) => {
  const out: Record<string, number> = {};
  statuses.forEach((s) => (out[s] = 0));
  items.forEach((i) => {
    const raw = String(i.status || '').toLowerCase();
    const hit = statuses.find((s) => raw.startsWith(s.toLowerCase().slice(0, 7)));
    if (hit) out[hit]++;
  });
  return out;
};

/** Leads whose follow-up is today or later (or overdue), soonest first. */
export const upcomingFollowUps = (leads: any[], limit = 5) =>
  leads
    .filter((l) => l.followUpDate && !String(l.status || '').toLowerCase().startsWith('converted') && String(l.status).toLowerCase() !== 'lost')
    .sort((a, b) => new Date(a.followUpDate).getTime() - new Date(b.followUpDate).getTime())
    .slice(0, limit);

/** Quotations and invoices created per month (counts), oldest first. */
export const quoteInvoiceMonthly = (quotes: any[], invoices: any[], months = 12) => {
  const now = new Date();
  const rows: { key: string; label: string; Quotations: number; Invoices: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    rows.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: `${d.toLocaleString('en-US', { month: 'short' })} ${String(d.getFullYear()).slice(2)}`,
      Quotations: 0,
      Invoices: 0,
    });
  }
  const add = (items: any[], dateOf: (x: any) => any, field: 'Quotations' | 'Invoices') =>
    items.forEach((it) => {
      const raw = dateOf(it);
      if (!raw) return;
      const d = new Date(raw);
      const row = rows.find((r) => r.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (row) row[field]++;
    });
  add(quotes, (q) => q.date || q.createdAt, 'Quotations');
  add(invoices, (v) => v.invoiceDate || v.createdAt, 'Invoices');
  return rows;
};

export const quoteInvoiceTotals = (quotes: any[], invoices: any[]) => {
  const live = invoices.filter((i) => String(i.status).toLowerCase() !== 'cancelled');
  return {
    quotes: quotes.length,
    accepted: quotes.filter((q) => String(q.status).toUpperCase() === 'ACCEPTED').length,
    invoices: live.length,
    invoiced: live.reduce((s, i) => s + (Number(i.grandTotal) || 0), 0),
    outstanding: live.reduce((s, i) => s + (Number(i.balanceDue) || 0), 0),
  };
};

/** Donut data for the lead pipeline from server-side stage counts. */
export const leadFunnelFromCounts = (c: { open: number; contacted: number; qualified: number; converted: number; lost: number }): DonutDatum[] => [
  { name: 'Open', value: c.open, color: BRAND.pale },
  { name: 'Contacted', value: c.contacted, color: BRAND.soft },
  { name: 'Qualified', value: c.qualified, color: BRAND.mid },
  { name: 'Converted', value: c.converted, color: BRAND.dark },
  { name: 'Lost / Inactive', value: c.lost, color: BRAND.muted },
];
