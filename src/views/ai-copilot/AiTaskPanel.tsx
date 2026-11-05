import React from 'react';
import { Ban, CheckCircle2, ChevronRight, Circle, Clock, HelpCircle, ListChecks, Loader2, MinusCircle, Play, ShieldCheck, X, XCircle, type LucideIcon } from 'lucide-react';
import type { AiTaskStatus, AiTaskStepStatus, AiTaskView } from '../../api/ai/aiTypes';
import { toolLabel } from './AiAgentPanel';

/** Statuses after which nothing more can happen to a task. */
export const isTaskFinished = (status: AiTaskStatus) => status === 'completed' || status === 'failed' || status === 'cancelled' || status === 'expired';

const STATUS_CHIP: Record<AiTaskStatus, { label: string; cls: string }> = {
  running: { label: 'Working', cls: 'bg-violet-100 text-[#5B21B6]' },
  waiting_approval: { label: 'Needs your approval', cls: 'bg-amber-100 text-amber-800' },
  waiting_input: { label: 'Needs your answer', cls: 'bg-amber-100 text-amber-800' },
  paused: { label: 'Ready to continue', cls: 'bg-sky-100 text-sky-800' },
  completed: { label: 'Completed', cls: 'bg-emerald-100 text-emerald-800' },
  failed: { label: 'Failed', cls: 'bg-rose-100 text-rose-800' },
  cancelled: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-600' },
  expired: { label: 'Expired', cls: 'bg-slate-100 text-slate-600' },
};
export const taskStatusLabel = (s: AiTaskStatus) => STATUS_CHIP[s]?.label ?? s;

const STEP_ICON: Record<AiTaskStepStatus, { icon: LucideIcon; cls: string; label: string }> = {
  pending: { icon: Circle, cls: 'text-slate-300', label: 'Pending' },
  running: { icon: Loader2, cls: 'text-[#6D28D9] animate-spin', label: 'Running' },
  awaiting_approval: { icon: ShieldCheck, cls: 'text-amber-500', label: 'Waiting for your confirmation' },
  waiting_input: { icon: HelpCircle, cls: 'text-amber-500', label: 'Waiting for your answer' },
  done: { icon: CheckCircle2, cls: 'text-emerald-500', label: 'Done' },
  failed: { icon: XCircle, cls: 'text-rose-500', label: 'Failed' },
  skipped: { icon: MinusCircle, cls: 'text-slate-400', label: 'Skipped' },
  cancelled: { icon: Ban, cls: 'text-slate-400', label: 'Cancelled' },
};

const fmtWhen = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

const HINT: Partial<Record<AiTaskStatus, string>> = {
  running: 'Working on it…',
  waiting_approval: 'Waiting for you: confirm or cancel the card above, then the task can continue.',
  waiting_input: 'Waiting for your answer: reply in the box below.',
  paused: 'The step is done. Continue the task?',
  completed: 'All steps are done.',
  failed: 'This task could not be finished. Nothing more will run.',
  cancelled: 'This task was cancelled. Steps that already finished are not undone.',
  expired: 'This task expired. Ask again to start over.',
};

/**
 * The saved multi-step task behind a reply: its goal, every step with a status icon, and the one button that makes
 * sense now (driven by `task.next` / `task.status`). It never resumes by itself: the user must click.
 */
export function TaskPanel({ task, busy, onResume, onCancel, onDismiss }: {
  task: AiTaskView;
  busy?: boolean;
  onResume: (taskId: string) => void;
  onCancel: (taskId: string) => void;
  onDismiss?: () => void;
}) {
  const chip = STATUS_CHIP[task.status] ?? STATUS_CHIP.running;
  const finished = isTaskFinished(task.status);
  const canResume = !finished && (task.next === 'resume' || task.status === 'paused');
  const canCancel = !finished;
  const done = task.steps.filter((s) => s.status === 'done').length;

  return (
    <div className="rounded-[18px] border border-violet-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="w-8 h-8 shrink-0 rounded-lg bg-violet-100 text-[#5B21B6] flex items-center justify-center"><ListChecks className="w-4 h-4" /></span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wide text-[#5B21B6]">Task</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${chip.cls}`}>{chip.label}</span>
              {task.steps.length > 0 && <span className="text-[10px] text-slate-400 tabular-nums">{done}/{task.steps.length} steps</span>}
            </div>
            <p className="text-sm font-semibold text-slate-800 mt-0.5 break-words">{task.goal}</p>
          </div>
        </div>
        {finished && onDismiss && (
          <button type="button" onClick={onDismiss} aria-label="Hide task" className="shrink-0 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"><X className="w-4 h-4" /></button>
        )}
      </div>

      <ol className="mt-3 space-y-1.5">
        {task.steps.map((st) => {
          const { icon: Icon, cls, label } = STEP_ICON[st.status] ?? STEP_ICON.pending;
          return (
            <li key={st.id} className="flex items-start gap-2 text-xs">
              <Icon className={`w-4 h-4 mt-px shrink-0 ${cls}`} aria-label={label} />
              <span className={`min-w-0 ${st.status === 'done' ? 'text-slate-500' : st.status === 'skipped' || st.status === 'cancelled' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                {st.description}
                {st.tool && <span className="ml-1.5 text-[10px] text-slate-400">· {toolLabel(st.tool)}</span>}
                {st.attempts > 1 && <span className="ml-1.5 text-[10px] text-amber-600">· tried {st.attempts}×</span>}
                {st.depends_on.length > 0 && st.status === 'pending' && <span className="ml-1.5 text-[10px] text-slate-400">· after step {st.depends_on.join(', ')}</span>}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-t border-slate-100 pt-3">
        <p className="text-[11px] text-slate-500 leading-snug">
          {HINT[task.status]}
          {!finished && task.expires_at && <span className="ml-1 inline-flex items-center gap-1 text-slate-400"><Clock className="w-3 h-3" /> expires {fmtWhen(task.expires_at)}</span>}
        </p>
        {(canResume || canCancel) && (
          <div className="flex gap-2 shrink-0">
            {canCancel && (
              <button type="button" disabled={busy} onClick={() => onCancel(task.id)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-rose-300 hover:text-rose-600 disabled:opacity-50 disabled:pointer-events-none transition-colors">
                Cancel task
              </button>
            )}
            {canResume && (
              <button type="button" disabled={busy} onClick={() => onResume(task.id)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#33077C] to-[#7C3AED] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-60 disabled:pointer-events-none">
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} Resume
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** One row of the sidebar's Tasks tab. */
export const TaskRow: React.FC<{ task: AiTaskView; active: boolean; onOpen: (task: AiTaskView) => void }> = ({ task, active, onOpen }) => {
  const chip = STATUS_CHIP[task.status] ?? STATUS_CHIP.running;
  const done = task.steps.filter((s) => s.status === 'done').length;
  return (
    <button type="button" onClick={() => onOpen(task)}
      className={`group w-full text-left rounded-xl mb-1 px-3 py-2.5 transition-colors ${active ? 'bg-violet-100/70' : 'hover:bg-slate-50'}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-semibold text-slate-800 line-clamp-2 break-words">{task.goal}</span>
        <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
      </div>
      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${chip.cls}`}>{chip.label}</span>
        {task.steps.length > 0 && <span className="text-[10px] text-slate-400 tabular-nums">{done}/{task.steps.length} steps</span>}
      </div>
    </button>
  );
};
