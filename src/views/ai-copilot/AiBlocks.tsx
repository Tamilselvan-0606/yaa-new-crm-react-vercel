import React, { useEffect, useState } from 'react';
import { AnimatePresence, animate, motion, useReducedMotion } from 'motion/react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import {
  AlertTriangle, BadgePercent, BarChart3, CheckCircle2, Clock, FileText, IndianRupee, LineChart as LineChartIcon, ListChecks,
  Mail, ReceiptText, ShieldCheck, Table2, Tag, TrendingUp, Wallet, XCircle, type LucideIcon,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import type { AiBlock, AiMetric, AiValueFormat } from '../../api/ai/aiTypes';

const SERIES_COLORS = ['#6D28D9', '#0EA5E9', '#F59E0B', '#10B981'];
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export function formatValue(value: unknown, format?: AiValueFormat, currency = 'INR'): string {
  if (value === null || value === undefined || value === '') return '—';
  if (format === 'currency' && typeof value === 'number') {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
  }
  if (format === 'number' && typeof value === 'number') return new Intl.NumberFormat('en-IN').format(value);
  if (format === 'percent' && typeof value === 'number') return `${value}%`;
  if (format === 'date' && typeof value === 'string') return value.slice(0, 10);
  return String(value);
}

const card = 'relative bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_30px_-14px_rgba(51,7,124,0.18)]';

function CardHeader({ icon: Icon, title, right }: { icon: LucideIcon; title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-violet-100 to-fuchsia-50 text-[#5B21B6] flex items-center justify-center ring-1 ring-violet-200/60">
          <Icon className="w-4 h-4" />
        </span>
        <h4 className="text-sm font-bold text-slate-900 truncate">{title}</h4>
      </div>
      {right}
    </div>
  );
}

const CountPill = ({ children }: { children: React.ReactNode }) => (
  <span className="shrink-0 rounded-full bg-violet-50 text-[#5B21B6] text-[11px] font-semibold px-2.5 py-1 ring-1 ring-violet-200/60">{children}</span>
);

/** Animates a numeric value up from zero; non-numbers render as-is. */
function CountUp({ value, format, currency }: { value: unknown; format?: AiValueFormat; currency?: string }) {
  const reduce = useReducedMotion();
  const numeric = typeof value === 'number' && !reduce;
  const [display, setDisplay] = useState(numeric ? 0 : value);
  useEffect(() => {
    if (!numeric) { setDisplay(value); return; }
    const controls = animate(0, value as number, { duration: 1.1, ease: EASE_OUT, onUpdate: setDisplay });
    return () => controls.stop();
  }, [value, numeric]);
  const shown = typeof display === 'number' && Number.isInteger(value) ? Math.round(display) : display;
  return <>{formatValue(shown, format, currency)}</>;
}

const METRIC_STYLES: { match: RegExp; icon: LucideIcon; tint: string; bar: string }[] = [
  { match: /outstanding|due|pending/i, icon: Clock, tint: 'bg-amber-100 text-amber-700', bar: 'from-amber-400 to-orange-500' },
  { match: /payment|received|paid|collected/i, icon: Wallet, tint: 'bg-emerald-100 text-emerald-700', bar: 'from-emerald-400 to-teal-500' },
  { match: /discount/i, icon: Tag, tint: 'bg-rose-100 text-rose-700', bar: 'from-rose-400 to-pink-500' },
  { match: /tax|gst/i, icon: BadgePercent, tint: 'bg-sky-100 text-sky-700', bar: 'from-sky-400 to-blue-500' },
  { match: /net/i, icon: IndianRupee, tint: 'bg-fuchsia-100 text-fuchsia-700', bar: 'from-fuchsia-500 to-violet-500' },
  { match: /gross|sales|revenue/i, icon: TrendingUp, tint: 'bg-violet-100 text-violet-700', bar: 'from-[#33077C] to-violet-500' },
  { match: /invoice|bill|count|orders?/i, icon: ReceiptText, tint: 'bg-indigo-100 text-indigo-700', bar: 'from-indigo-500 to-violet-500' },
];
const metricStyle = (label: string) =>
  METRIC_STYLES.find((s) => s.match.test(label)) ?? { icon: FileText, tint: 'bg-slate-100 text-slate-700', bar: 'from-slate-400 to-slate-500' };

function ReportBlock({ block }: { block: Extract<AiBlock, { type: 'report' }> }) {
  return (
    <div className={card}>
      <CardHeader icon={BarChart3} title={block.title} right={block.period && <CountPill>{block.period}</CountPill>} />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {block.metrics.map((m, i) => {
          const { icon: Icon, tint, bar } = metricStyle(m.label);
          return (
            <motion.div key={m.label}
              initial={{ opacity: 0, y: 14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.05 + i * 0.06, duration: 0.45, ease: EASE_OUT }}
              whileHover={{ y: -3 }}
              className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-white to-slate-50 border border-slate-200/80 px-3.5 py-3 hover:shadow-lg hover:shadow-violet-500/10 hover:border-violet-200 transition-[box-shadow,border-color]">
              <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${bar}`} />
              <div className="flex items-center justify-between gap-2">
                <div className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide leading-tight">{m.label}</div>
                <span className={`w-6 h-6 rounded-md flex items-center justify-center ${tint} group-hover:scale-110 group-hover:rotate-6 transition-transform`}><Icon className="w-3.5 h-3.5" /></span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1.5 tabular-nums tracking-tight">
                <CountUp value={m.value} format={m.format} currency={block.currency} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

const STATUS_TONES: [RegExp, string][] = [
  [/^(in ?active|cancel+ed|failed|overdue|rejected|lost|expired|unpaid|out of stock|disabled)/i, 'bg-rose-50 text-rose-700 ring-rose-200 [&>i]:bg-rose-500'],
  [/^(active|paid|completed?|success|won|delivered|approved|converted|in stock|enabled)/i, 'bg-emerald-50 text-emerald-700 ring-emerald-200 [&>i]:bg-emerald-500'],
  [/^(pending|partial|partially|draft|due|new|open|low)/i, 'bg-amber-50 text-amber-700 ring-amber-200 [&>i]:bg-amber-500'],
];
const isStatusColumn = (keyOrLabel: string) => /status|stage/i.test(keyOrLabel);

export function StatusPill({ value }: { value: string }) {
  const tone = STATUS_TONES.find(([re]) => re.test(value.trim()))?.[1] ?? 'bg-slate-100 text-slate-600 ring-slate-200 [&>i]:bg-slate-400';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${tone}`}>
      <i className="w-1.5 h-1.5 rounded-full" />{value}
    </span>
  );
}

function TableBlock({ block }: { block: Extract<AiBlock, { type: 'table' }> }) {
  return (
    <div className={card}>
      <CardHeader icon={Table2} title={block.title} right={typeof block.totalRecords === 'number' && (
        <CountPill>{block.truncated ? `Showing ${block.rows.length} of ${block.totalRecords}` : `${block.totalRecords} record${block.totalRecords === 1 ? '' : 's'}`}</CountPill>
      )} />
      {block.rows.length === 0 ? (
        <div className="flex flex-col items-center py-6 text-center">
          <ListChecks className="w-6 h-6 text-slate-300 mb-1.5" />
          <p className="text-xs text-slate-500">No records found.</p>
        </div>
      ) : (
        <div className="ai-scroll overflow-auto max-h-[420px] rounded-xl border border-slate-200/80">
          <table className="min-w-full text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50/95 backdrop-blur">
                {block.columns.map((c) => (
                  <th key={c.key} className={`px-3 py-2.5 font-semibold whitespace-nowrap border-b border-slate-200 ${c.format === 'currency' || c.format === 'number' ? 'text-right' : ''}`}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <motion.tr key={i}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i, 15) * 0.035, duration: 0.3, ease: EASE_OUT }}
                  className="border-b border-slate-100 last:border-0 even:bg-slate-50/40 hover:bg-violet-50/60 transition-colors">
                  {block.columns.map((c, ci) => {
                    const raw = row[c.key];
                    const numeric = c.format === 'currency' || c.format === 'number';
                    return (
                      <td key={c.key} className={`px-3 py-2.5 whitespace-nowrap ${ci === 0 ? 'font-semibold text-slate-900' : 'text-slate-700'} ${numeric ? 'text-right tabular-nums' : ''}`}>
                        {isStatusColumn(`${c.key} ${c.label}`) && typeof raw === 'string' && raw ? <StatusPill value={raw} /> : formatValue(raw, c.format)}
                      </td>
                    );
                  })}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ChartBlock({ block }: { block: Extract<AiBlock, { type: 'chart' }> }) {
  if (!block.data.length) return null;
  const isLine = block.chartType === 'line';
  const Chart = isLine ? LineChart : BarChart;
  return (
    <div className={card}>
      <CardHeader icon={isLine ? LineChartIcon : BarChart3} title={block.title} />
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <Chart data={block.data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <defs>
              {SERIES_COLORS.map((color, i) => (
                <linearGradient key={color} id={`ai-bar-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.45} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
            <XAxis dataKey={block.xKey} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} width={60} />
            <Tooltip
              cursor={{ fill: 'rgba(124,58,237,0.06)' }}
              contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 12px 30px -12px rgba(51,7,124,0.3)', fontSize: 12 }} />
            {block.series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />}
            {block.series.map((s, i) =>
              isLine
                ? <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} animationDuration={1200} />
                : <Bar key={s.key} dataKey={s.key} name={s.label} fill={`url(#ai-bar-${i % SERIES_COLORS.length})`} radius={[6, 6, 0, 0]} maxBarSize={44} animationDuration={900} />,
            )}
          </Chart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Fields({ fields }: { fields: AiMetric[] }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 rounded-xl bg-slate-50/70 border border-slate-100 px-3.5 py-2">
      {fields.map((f) => (
        <div key={f.label} className="flex justify-between gap-3 border-b border-slate-200/60 last:border-0 py-2 text-xs">
          <dt className="text-slate-500 font-medium">{f.label}</dt>
          <dd className="text-slate-900 font-semibold text-right break-words">{formatValue(f.value, f.format)}</dd>
        </div>
      ))}
    </dl>
  );
}

export type ActionState = { status: 'pending' | 'working' | 'succeeded' | 'failed' | 'cancelled'; message?: string };

interface ActionProps {
  state?: ActionState;
  onConfirm: (actionId: string) => void;
  onCancel: (actionId: string) => void;
}

const resultMotion = {
  initial: { opacity: 0, y: 6, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.3, ease: EASE_OUT },
};

function ActionFooter({ actionId, expiresAt, state, onConfirm, onCancel, confirmLabel }: ActionProps & { actionId: string; expiresAt?: string; confirmLabel: string }) {
  const status = state?.status ?? 'pending';
  let content: React.ReactNode;
  if (status === 'succeeded') {
    content = (
      <motion.p key="ok" {...resultMotion} className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
        <motion.span initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}>
          <CheckCircle2 className="w-4 h-4" />
        </motion.span>
        {state?.message ?? 'Done'}
      </motion.p>
    );
  } else if (status === 'failed') {
    content = (
      <motion.p key="fail" {...resultMotion} className="flex items-center gap-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5">
        <XCircle className="w-4 h-4 shrink-0" />{state?.message ?? 'Failed'}
      </motion.p>
    );
  } else if (status === 'cancelled') {
    content = <motion.p key="cancel" {...resultMotion} className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">Cancelled — nothing was changed.</motion.p>;
  } else {
    content = (
      <motion.div key="pending" {...resultMotion} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-[#6D28D9]" />
          Nothing happens until you confirm{expiresAt ? ` · expires ${new Date(expiresAt).toLocaleTimeString()}` : ''}.
        </span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={status === 'working'} onClick={() => onCancel(actionId)}>Cancel</Button>
          <Button variant="primary" size="sm" loading={status === 'working'} onClick={() => onConfirm(actionId)}
            className="bg-gradient-to-r from-[#33077C] to-[#7C3AED] hover:brightness-110">{confirmLabel}</Button>
        </div>
      </motion.div>
    );
  }
  return <div className="mt-4"><AnimatePresence mode="wait" initial={false}>{content}</AnimatePresence></div>;
}

function Warnings({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null;
  return (
    <ul className="mt-3 space-y-1.5">
      {warnings.map((w) => (
        <li key={w} className="flex items-start gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />{w}
        </li>
      ))}
    </ul>
  );
}

const actionCard = `${card} border-violet-200 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-[#33077C] before:via-violet-500 before:to-fuchsia-500`;

function ConfirmationBlock({ block, ...actions }: { block: Extract<AiBlock, { type: 'confirmation' }> } & ActionProps) {
  return (
    <div className={actionCard}>
      <CardHeader icon={ShieldCheck} title={block.title} right={<CountPill>Needs your approval</CountPill>} />
      <p className="text-xs text-slate-600 -mt-1 mb-3 leading-relaxed">{block.summary}</p>
      <Fields fields={block.fields} />
      <Warnings warnings={block.warnings} />
      <ActionFooter {...actions} actionId={block.actionId} expiresAt={block.expiresAt} confirmLabel="Confirm" />
    </div>
  );
}

function EmailPreviewBlock({ block, ...actions }: { block: Extract<AiBlock, { type: 'email_preview' }> } & ActionProps) {
  const [mode, setMode] = useState<'html' | 'text'>('html');
  return (
    <div className={block.actionId ? actionCard : card}>
      <CardHeader icon={Mail} title={block.actionId ? 'Email ready to send' : 'Email draft (not sent)'} right={
        <div className="relative flex rounded-lg bg-slate-100 p-0.5 text-[11px] font-semibold">
          {(['html', 'text'] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} className={`relative px-2.5 py-1 rounded-md transition-colors ${mode === m ? 'text-white' : 'text-slate-600 hover:text-slate-900'}`}>
              {mode === m && <motion.span layoutId={`email-mode-${block.subject}`} className="absolute inset-0 rounded-md bg-[#33077C] shadow-sm" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
              <span className="relative">{m === 'html' ? 'Preview' : 'Plain text'}</span>
            </button>
          ))}
        </div>
      } />
      <Fields fields={[
        { label: 'From', value: block.from },
        ...(block.replyTo ? [{ label: 'Reply-to', value: block.replyTo }] : []),
        { label: 'To', value: block.to.join(', ') },
        ...(block.cc.length ? [{ label: 'CC', value: block.cc.join(', ') }] : []),
        ...(block.bcc.length ? [{ label: 'BCC', value: block.bcc.join(', ') }] : []),
        { label: 'Subject', value: block.subject },
        { label: 'Recipients', value: block.recipientCount, format: 'number' },
        { label: 'Attachments', value: block.attachments.length ? block.attachments.join(', ') : 'None' },
        ...(block.relatedEntity ? [{ label: `Related ${block.relatedEntity.type}`, value: block.relatedEntity.name ?? block.relatedEntity.id }] : []),
      ]} />
      {block.recipients && block.recipients.length > 1 && (
        <p className="text-[11px] text-slate-500 mt-2">Recipients: {block.recipients.slice(0, 8).map((r) => `${r.name ?? r.email} (${r.type})`).join(', ')}{block.recipients.length > 8 ? ` and ${block.recipients.length - 8} more` : ''}</p>
      )}
      <div className="mt-3 rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
        {mode === 'html'
          // Fully sandboxed: no scripts, no same-origin access, no navigation.
          ? <iframe title="Email preview" sandbox="" srcDoc={block.html} className="w-full h-80 bg-white" />
          : <pre className="ai-scroll text-xs text-slate-700 whitespace-pre-wrap p-3 max-h-80 overflow-auto font-sans">{block.text}</pre>}
      </div>
      <Warnings warnings={block.warnings} />
      {block.actionId && <ActionFooter {...actions} actionId={block.actionId} expiresAt={block.expiresAt} confirmLabel={block.recipientCount > 1 ? `Send ${block.recipientCount} emails` : 'Send email'} />}
    </div>
  );
}

export function AiBlockView({ block, actionStates, onConfirm, onCancel }: { block: AiBlock; actionStates: Record<string, ActionState>; onConfirm: (id: string) => void; onCancel: (id: string) => void }) {
  switch (block.type) {
    case 'report': return <ReportBlock block={block} />;
    case 'table': return <TableBlock block={block} />;
    case 'chart': return <ChartBlock block={block} />;
    case 'record_details': return <div className={card}><CardHeader icon={FileText} title={block.title} /><Fields fields={block.fields} /></div>;
    case 'confirmation': return <ConfirmationBlock block={block} state={actionStates[block.actionId]} onConfirm={onConfirm} onCancel={onCancel} />;
    case 'email_preview': return <EmailPreviewBlock block={block} state={block.actionId ? actionStates[block.actionId] : undefined} onConfirm={onConfirm} onCancel={onCancel} />;
    default: return null;
  }
}

/* ------------------------------------------------------------------------------------------------
 * Assistant text: a small, safe markdown subset (headings, lists, tables, code, bold/italic/code
 * spans). Everything renders as React text nodes — model output is never injected as HTML.
 * ---------------------------------------------------------------------------------------------- */

type MdBlock =
  | { kind: 'p'; text: string }
  | { kind: 'h'; level: number; text: string }
  | { kind: 'ul' | 'ol'; items: string[] }
  | { kind: 'table'; head: string[]; rows: string[][]; align: ('left' | 'right' | 'center')[] }
  | { kind: 'code'; text: string }
  | { kind: 'hr' };

const UL = /^\s*[-*•]\s+/;
const OL = /^\s*\d+[.)]\s+/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const HR = /^\s*(-{3,}|\*{3,}|_{3,})\s*$/;
const FENCE = /^\s*```/;
const TABLE_SEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

const splitRow = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
const isTableStart = (lines: string[], i: number) => lines[i].includes('|') && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1]);
const isBlockStart = (lines: string[], i: number) =>
  FENCE.test(lines[i]) || HEADING.test(lines[i]) || HR.test(lines[i]) || UL.test(lines[i]) || OL.test(lines[i]) || isTableStart(lines, i);

function parseMarkdown(src: string): MdBlock[] {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const out: MdBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (FENCE.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !FENCE.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push({ kind: 'code', text: buf.join('\n') });
      continue;
    }
    if (isTableStart(lines, i)) {
      const head = splitRow(line);
      const align = splitRow(lines[i + 1]).map((c) => (c.endsWith(':') ? (c.startsWith(':') ? 'center' : 'right') : 'left') as 'left' | 'right' | 'center');
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) rows.push(splitRow(lines[i++]));
      out.push({ kind: 'table', head, rows, align });
      continue;
    }
    const h = HEADING.exec(line);
    if (h) { out.push({ kind: 'h', level: h[1].length, text: h[2] }); i++; continue; }
    if (HR.test(line)) { out.push({ kind: 'hr' }); i++; continue; }
    if (UL.test(line) || OL.test(line)) {
      const re = UL.test(line) ? UL : OL;
      const items: string[] = [];
      while (i < lines.length && re.test(lines[i])) items.push(lines[i++].replace(re, ''));
      out.push({ kind: re === UL ? 'ul' : 'ol', items });
      continue;
    }
    const buf = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines, i)) buf.push(lines[i++]);
    out.push({ kind: 'p', text: buf.join('\n') });
  }
  return out;
}

function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*?\*)/g).map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) return <code key={i} className="px-1.5 py-0.5 rounded-md bg-violet-50 text-[#5B21B6] text-[0.85em] font-mono">{part.slice(1, -1)}</code>;
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;

function MdTable({ block }: { block: Extract<MdBlock, { kind: 'table' }> }) {
  const statusCols = block.head.map(isStatusColumn);
  return (
    <div className="ai-scroll overflow-x-auto rounded-xl border border-slate-200/80 my-1">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-gradient-to-r from-violet-50 to-fuchsia-50/40 text-[11px] uppercase tracking-wide text-[#5B21B6]">
            {block.head.map((h, c) => <th key={c} className={`px-3 py-2.5 font-semibold whitespace-nowrap border-b border-violet-100 ${ALIGN[block.align[c] ?? 'left']}`}><Inline text={h} /></th>)}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, r) => (
            <tr key={r} className="border-b border-slate-100 last:border-0 even:bg-slate-50/50 hover:bg-violet-50/50 transition-colors">
              {block.head.map((_, c) => {
                const cell = row[c] ?? '';
                return (
                  <td key={c} className={`px-3 py-2.5 whitespace-nowrap ${c === 0 ? 'font-semibold text-slate-900' : 'text-slate-700'} ${ALIGN[block.align[c] ?? 'left']}`}>
                    {statusCols[c] && cell && cell !== '—' && cell !== '-' ? <StatusPill value={cell} /> : <Inline text={cell} />}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MdBlockView({ block }: { block: MdBlock }) {
  switch (block.kind) {
    case 'h': {
      const size = block.level <= 1 ? 'text-base' : block.level === 2 ? 'text-[15px]' : 'text-sm';
      return <h3 className={`${size} font-bold text-slate-900 tracking-tight pt-1`}><Inline text={block.text} /></h3>;
    }
    case 'ul':
      return (
        <ul className="space-y-1.5">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="mt-[0.55em] w-1.5 h-1.5 shrink-0 rounded-full bg-gradient-to-br from-[#33077C] to-fuchsia-500" />
              <span className="min-w-0"><Inline text={item} /></span>
            </li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol className="space-y-1.5">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="mt-0.5 w-5 h-5 shrink-0 rounded-md bg-violet-100 text-[#5B21B6] text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
              <span className="min-w-0"><Inline text={item} /></span>
            </li>
          ))}
        </ol>
      );
    case 'table': return <MdTable block={block} />;
    case 'code': return <pre className="ai-scroll overflow-x-auto rounded-xl bg-slate-900 text-slate-100 text-xs p-3 font-mono">{block.text}</pre>;
    case 'hr': return <hr className="border-slate-200" />;
    default: return <p className="whitespace-pre-line"><Inline text={block.text} /></p>;
  }
}

/** Renders model text safely as formatted markdown (no HTML injection). */
export function AssistantText({ text, error }: { text: string; error?: boolean }) {
  const blocks = parseMarkdown(text);
  return (
    <div className={`text-sm leading-relaxed break-words space-y-3 ${error ? 'text-rose-800' : 'text-slate-700'}`}>
      {blocks.map((b, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.05, duration: 0.35, ease: EASE_OUT }}>
          <MdBlockView block={b} />
        </motion.div>
      ))}
    </div>
  );
}
