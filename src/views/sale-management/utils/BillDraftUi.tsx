import React from 'react';
import { AlertTriangle, CheckCircle2, CloudUpload, FileClock, Loader2 } from 'lucide-react';
import type { DocumentDraft } from '../../../api/commerce/documentDraftTypes';
import type { DraftSyncStatus, DraftTotals } from '../../../hooks/useBillDraft';

const timeText = (d: Date | null) =>
  d ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

/** Small "Saving draft... / Draft saved" chip for the bill form header. Renders nothing until a draft exists. */
export const DraftSyncIndicator: React.FC<{
  status: DraftSyncStatus;
  lastSavedAt: Date | null;
  totals: DraftTotals | null;
  error?: string | null;
  className?: string;
}> = ({ status, lastSavedAt, totals, error, className = '' }) => {
  if (status === 'idle') return null;
  const base = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold max-w-full';
  if (status === 'saving') {
    return (
      <span className={`${base} bg-slate-50 border-slate-200 text-slate-600 ${className}`} role="status">
        <Loader2 className="w-3 h-3 animate-spin shrink-0" />
        <span className="truncate">Saving draft...</span>
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span
        className={`${base} bg-amber-50 border-amber-200 text-amber-700 ${className}`}
        title={error || 'The draft could not be saved. The bill itself can still be saved.'}
        role="status"
      >
        <AlertTriangle className="w-3 h-3 shrink-0" />
        <span className="truncate">Draft not saved</span>
      </span>
    );
  }
  return (
    <span
      className={`${base} bg-emerald-50 border-emerald-200 text-emerald-700 ${className}`}
      title="Items are saved on the server as a draft until you save the bill."
      role="status"
    >
      <CheckCircle2 className="w-3 h-3 shrink-0" />
      <span className="truncate">
        Draft saved{totals ? ` · ${totals.itemCount} item${totals.itemCount === 1 ? '' : 's'}` : ''}
        {lastSavedAt ? ` · ${timeText(lastSavedAt)}` : ''}
      </span>
    </span>
  );
};

/** "You have an unfinished draft" prompt shown when a new bill is opened. */
export const ResumeDraftBanner: React.FC<{
  draft: DocumentDraft;
  /** e.g. "estimate" */
  documentLabel: string;
  onResume: () => void;
  onDiscard: () => void;
  busy?: boolean;
}> = ({ draft, documentLabel, onResume, onDiscard, busy = false }) => {
  const when = draft.updated_at ? new Date(draft.updated_at) : null;
  const whenText =
    when && !Number.isNaN(when.getTime())
      ? when.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
      : '';
  const count = Number(draft.item_count) || 0;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-[#33077C]/15 bg-[#33077C]/[0.04] px-4 py-3 text-xs font-sans">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className="w-9 h-9 rounded-xl bg-[#33077C] text-white flex items-center justify-center shrink-0 shadow-2xs">
          <FileClock className="w-4.5 h-4.5" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-slate-900 text-[13px]">You have an unfinished {documentLabel}</p>
          <p className="mt-0.5 text-slate-500 leading-relaxed">
            {count} item{count === 1 ? '' : 's'} saved as a draft{whenText ? ` on ${whenText}` : ''}. Continue where you left off?
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:shrink-0">
        <button
          type="button"
          disabled={busy}
          onClick={onDiscard}
          className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-[12px] font-bold disabled:opacity-50 cursor-pointer"
        >
          Start fresh
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onResume}
          className="h-9 px-4 rounded-xl bg-[#33077C] hover:bg-[#432fb3] text-white text-[12px] font-bold shadow-xs disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudUpload className="w-3.5 h-3.5" />}
          Resume draft
        </button>
      </div>
    </div>
  );
};
