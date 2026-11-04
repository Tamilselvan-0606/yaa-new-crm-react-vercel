import React from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Hash,
  Loader2,
  ShieldCheck,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

/**
 * Shared body for every "View History" dialog (Purchase + Sales Hub).
 * Renders a summary card, key facts and a responsive lifecycle timeline built from the record returned by
 * the module's get-by-id API. Pass it as the children of a themed <Modal headerGradient showBackIcon ...>.
 */
export type HistoryTone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

export interface HistoryEvent {
  title: string;
  description?: React.ReactNode;
  /** ISO date or date-time (shown as a chip; events with a date are sorted oldest -> newest). */
  at?: string | null;
  tone?: HistoryTone;
  icon?: LucideIcon;
  details?: { label: string; value: React.ReactNode }[];
}

export interface HistoryTimelineViewProps {
  isLoading?: boolean;
  /** Small label above the document number, e.g. "Purchase Order No". */
  eyebrow: string;
  title: string;
  subtitle?: React.ReactNode;
  amount?: { label: string; value: string };
  badges?: { label: string; tone: HistoryTone }[];
  facts?: { label: string; value: React.ReactNode }[];
  events: HistoryEvent[];
  recordId?: string;
  updatedAt?: string | null;
  onClose: () => void;
}

const TONE: Record<HistoryTone, { dot: string; ring: string; badge: string; text: string }> = {
  primary: { dot: 'bg-[#33077C]', ring: 'ring-purple-100', badge: 'bg-purple-100 text-purple-700', text: 'text-[#33077C]' },
  success: { dot: 'bg-emerald-500', ring: 'ring-emerald-100', badge: 'bg-emerald-100 text-emerald-700', text: 'text-emerald-600' },
  warning: { dot: 'bg-amber-500', ring: 'ring-amber-100', badge: 'bg-amber-100 text-amber-700', text: 'text-amber-600' },
  danger: { dot: 'bg-rose-500', ring: 'ring-rose-100', badge: 'bg-rose-100 text-rose-700', text: 'text-rose-600' },
  info: { dot: 'bg-blue-500', ring: 'ring-blue-100', badge: 'bg-blue-100 text-blue-700', text: 'text-blue-600' },
  muted: { dot: 'bg-slate-400', ring: 'ring-slate-100', badge: 'bg-slate-100 text-slate-600', text: 'text-slate-500' },
};

const DEFAULT_ICON: Record<HistoryTone, LucideIcon> = {
  primary: FileText,
  success: CheckCircle2,
  warning: Clock,
  danger: XCircle,
  info: Circle,
  muted: ShieldCheck,
};

const formatWhen = (value?: string | null): string => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(String(value));
  return dateOnly
    ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const time = (v?: string | null) => {
  const t = v ? new Date(v).getTime() : NaN;
  return isNaN(t) ? null : t;
};

export const HistoryTimelineView: React.FC<HistoryTimelineViewProps> = ({
  isLoading,
  eyebrow,
  title,
  subtitle,
  amount,
  badges = [],
  facts = [],
  events,
  recordId,
  updatedAt,
  onClose,
}) => {
  // Dated events oldest -> newest; undated events keep their given order after them.
  const ordered = [...events]
    .map((e, i) => ({ e, i, t: time(e.at) }))
    .sort((a, b) => (a.t === null && b.t === null ? a.i - b.i : a.t === null ? 1 : b.t === null ? -1 : a.t - b.t || a.i - b.i))
    .map((x) => x.e);

  return (
    <div className="space-y-4 sm:space-y-5 text-xs font-sans">
      {/* Summary */}
      <div className="p-3.5 sm:p-4 bg-purple-50/70 rounded-2xl border border-purple-100 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-bold text-[#33077C] uppercase tracking-wider">{eyebrow}</div>
          <div className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5 break-words">{title}</div>
          {subtitle && <div className="text-xs text-slate-600 font-medium mt-0.5 break-words">{subtitle}</div>}
        </div>
        <div className="sm:text-right shrink-0">
          {amount && (
            <>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{amount.label}</div>
              <div className="text-base sm:text-lg font-extrabold text-[#33077C] mt-0.5">{amount.value}</div>
            </>
          )}
          {badges.length > 0 && (
            <div className="flex items-center gap-1.5 sm:justify-end mt-1.5 flex-wrap">
              {badges.map((b, i) => (
                <span key={i} className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${TONE[b.tone].badge}`}>
                  {b.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Key facts */}
      {facts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
          {facts.map((f, i) => (
            <div key={i} className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl min-w-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{f.label}</div>
              <div className="text-xs font-bold text-slate-800 mt-0.5 break-words">{f.value || '—'}</div>
            </div>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div>
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
          Lifecycle &amp; Activity Timeline
        </div>

        {isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-[#33077C]" />
            <span className="text-xs font-semibold">Syncing live history…</span>
          </div>
        ) : ordered.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs font-medium">No history recorded for this record yet.</div>
        ) : (
          <ol className="relative ml-3.5 sm:ml-4 border-l-2 border-purple-100 space-y-3.5 sm:space-y-4">
            {ordered.map((ev, idx) => {
              const tone = TONE[ev.tone || 'muted'];
              const Icon = ev.icon || DEFAULT_ICON[ev.tone || 'muted'];
              return (
                <li key={idx} className="relative pl-6 sm:pl-7">
                  <span
                    className={`absolute -left-[13px] top-0.5 w-6 h-6 rounded-full ${tone.dot} ring-4 ${tone.ring} flex items-center justify-center`}
                  >
                    <Icon className="w-3 h-3 text-white" />
                  </span>
                  <div className="p-3 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-3">
                      <div className="font-bold text-slate-800 text-xs sm:text-[13px] min-w-0 break-words">{ev.title}</div>
                      {ev.at && (
                        <span className={`text-[10px] sm:text-[11px] font-semibold ${tone.text} whitespace-nowrap shrink-0`}>
                          {formatWhen(ev.at)}
                        </span>
                      )}
                    </div>
                    {ev.description && <div className="text-slate-500 text-[11px] sm:text-xs mt-1 break-words">{ev.description}</div>}
                    {ev.details && ev.details.length > 0 && (
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                        {ev.details.map((d, i) => (
                          <div key={i} className="text-[11px] text-slate-500 flex items-baseline gap-1.5 min-w-0">
                            <span className="text-slate-400 shrink-0">{d.label}:</span>
                            <span className="font-semibold text-slate-700 break-words min-w-0">{d.value || '—'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* Audit footer */}
      {(recordId || updatedAt) && (
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 text-[11px] text-slate-500">
          {recordId && (
            <span className="flex items-center gap-1.5 min-w-0">
              <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              Record ID: <span className="font-mono text-slate-700 break-all">{recordId}</span>
            </span>
          )}
          {updatedAt && <span>Last updated: {formatWhen(updatedAt)}</span>}
        </div>
      )}

      {/* Footer */}
      <div className="pt-4 flex flex-col-reverse sm:flex-row sm:flex-wrap justify-end items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onClose}
          className="h-10 px-5 rounded-lg border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center shadow-2xs whitespace-nowrap"
        >
          Close
        </button>
      </div>
    </div>
  );
};
