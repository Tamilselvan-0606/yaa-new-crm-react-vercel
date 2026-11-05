import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, BadgeCheck, CalendarDays, Copy, HelpCircle, CheckCircle2, ChevronDown, Circle, CircleDashed, Info, Loader2, Lock, MinusCircle, RotateCw, SearchX, ShieldCheck, Wrench, XCircle, type LucideIcon } from 'lucide-react';
import { toast } from '../../utils/toast';
import type { AiAgentTrace, AiChatAnalysis, AiEvidence, AiPlanStepStatus } from '../../api/ai/aiTypes';

/** Friendly labels for the backend tool names (anything unknown is prettified from the snake_case name). */
const TOOL_LABELS: Record<string, string> = {
  plan_task: 'Planning the task',
  get_sales_summary: 'Reading the sales summary',
  compare_sales_periods: 'Comparing sales periods',
  get_sales_insights: 'Reading sales insights',
  get_top_selling_products: 'Finding top-selling products',
  get_sales_trend: 'Reading the sales trend',
  get_sales_by_branch: 'Reading sales by branch',
  get_sales_by_representative: 'Reading sales by representative',
  get_my_sales: 'Reading your sales',
  run_report: 'Running the report',
  search_products: 'Searching products',
  get_product: 'Opening the product',
  create_product: 'Preparing a new product',
  update_product: 'Preparing a product update',
  get_low_stock_products: 'Checking low stock',
  get_stock_levels: 'Checking stock levels',
  get_batch_availability: 'Checking batch availability',
  search_leads: 'Searching leads',
  get_lead: 'Opening the lead',
  get_lead_metrics: 'Reading lead metrics',
  create_lead: 'Preparing a new lead',
  update_lead: 'Preparing a lead update',
  search_customers: 'Searching customers',
  get_customer: 'Opening the customer',
  get_customer_purchase_history: 'Reading purchase history',
  get_customer_statement: 'Reading the customer statement',
  create_customer: 'Preparing a new customer',
  update_customer: 'Preparing a customer update',
  search_suppliers: 'Searching suppliers',
  get_supplier: 'Opening the supplier',
  create_supplier: 'Preparing a new supplier',
  update_supplier: 'Preparing a supplier update',
  get_collections: 'Reading collections',
  get_pending_payments: 'Reading pending payments',
  get_pending_dues: 'Reading pending dues',
  get_collection_queue: 'Reading the collection queue',
  lookup_location: 'Looking up locations',
  get_my_profile: 'Reading your profile',
  get_my_organization: 'Reading the organization',
  list_branches: 'Listing branches',
  list_sub_organizations: 'Listing sub-organizations',
  list_staff: 'Listing staff',
  draft_email: 'Drafting the email',
  get_email_status: 'Checking the email status',
  send_email: 'Preparing the email',
  cancel_scheduled_email: 'Cancelling the scheduled email',
  email_sales_report: 'Preparing the sales report email',
  send_payment_reminders: 'Preparing payment reminders',
  // Catalogue, expenses, sales documents and deletes (added with the multi-module backend release)
  search_categories: 'Finding categories', create_category: 'Adding a category', update_category: 'Editing a category',
  change_category_status: 'Changing a category status', delete_category: 'Deleting a category',
  search_subcategories: 'Finding subcategories', create_subcategory: 'Adding a subcategory', update_subcategory: 'Editing a subcategory',
  change_subcategory_status: 'Changing a subcategory status', delete_subcategory: 'Deleting a subcategory',
  search_units: 'Finding units', create_unit: 'Adding a unit', update_unit: 'Editing a unit',
  change_unit_status: 'Changing a unit status', delete_unit: 'Deleting a unit',
  search_expense_categories: 'Finding expense categories', create_expense_category: 'Adding an expense category',
  update_expense_category: 'Editing an expense category', change_expense_category_status: 'Changing an expense category status',
  delete_expense_category: 'Deleting an expense category',
  search_expenses: 'Finding expenses', get_expense: 'Opening the expense', create_expense: 'Recording an expense',
  update_expense: 'Editing an expense', delete_expense: 'Deleting an expense',
  search_quotations: 'Finding quotations', get_quotation: 'Opening the quotation', change_quotation_status: 'Changing the quotation status', delete_quotation: 'Deleting a quotation',
  search_proformas: 'Finding proformas', get_proforma: 'Opening the proforma', change_proforma_status: 'Changing the proforma status', delete_proforma: 'Deleting a proforma',
  search_sale_orders: 'Finding sale orders', get_sale_order: 'Opening the sale order', change_sale_order_status: 'Changing the order status', delete_sale_order: 'Deleting a sale order',
  search_delivery_challans: 'Finding challans', get_delivery_challan: 'Opening the challan', change_delivery_challan_status: 'Changing the challan status', delete_delivery_challan: 'Deleting a challan',
  delete_product: 'Deleting a product', delete_customer: 'Deleting a customer', delete_supplier: 'Deleting a supplier', delete_lead: 'Deleting a lead',
};

export const toolLabel = (tool: string) =>
  TOOL_LABELS[tool] ?? tool.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

const PLAN_ICON: Record<AiPlanStepStatus, { icon: LucideIcon; cls: string; label: string }> = {
  pending: { icon: Circle, cls: 'text-slate-300', label: 'Pending' },
  in_progress: { icon: Loader2, cls: 'text-[#6D28D9] animate-spin', label: 'In progress' },
  done: { icon: CheckCircle2, cls: 'text-emerald-500', label: 'Done' },
  failed: { icon: XCircle, cls: 'text-rose-500', label: 'Failed' },
  skipped: { icon: MinusCircle, cls: 'text-slate-400', label: 'Skipped' },
};

const DECISION_LABEL: Record<string, string> = {
  continue: 'Continued',
  retry: 'Retried',
  replan: 'Re-planned',
  ask_user: 'Asked you',
  await_confirmation: 'Awaiting your confirmation',
  stop: 'Stopped',
};

const fmtMs = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`);

/**
 * What the assistant did for one reply: the plan checklist (multi-step tasks) and a collapsible step log, plus the
 * call-to-action banners (`requires_human`, tool/step limit). Rendered under the assistant message it belongs to.
 */
export function AgentPanel({ agent, onContinue, canContinue }: { agent: AiAgentTrace; onContinue?: () => void; canContinue?: boolean }) {
  const [open, setOpen] = useState(false);
  const { plan, steps, stop_reason: stop, requires_human: needsHuman } = agent;
  const limit = stop === 'tool_limit' || stop === 'step_limit' || stop === 'token_budget';
  const saveFailed = agent.task_persistence === 'unavailable';
  const reduced = agent.context_reduced ?? [];
  if (!plan && steps.length === 0 && !needsHuman && !limit && !saveFailed && reduced.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {saveFailed && (
        <div className="flex items-start gap-2 text-xs font-semibold rounded-xl px-3 py-2 border bg-rose-50 border-rose-200 text-rose-800">
          <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" />
          <span>Changes are temporarily unavailable, and nothing was changed. Please try again shortly.</span>
        </div>
      )}

      {reduced.length > 0 && (
        <div className="flex items-start gap-2 text-[11px] rounded-xl px-3 py-2 border bg-slate-50 border-slate-200 text-slate-500">
          <Info className="w-3.5 h-3.5 mt-px shrink-0" />
          <span>This is a long conversation, so older messages were not used for this answer. Start a new chat if it misses something.</span>
        </div>
      )}

      {needsHuman && (
        <div className="flex items-center gap-2 text-xs font-semibold rounded-xl px-3 py-2 border bg-violet-50 border-violet-200 text-[#5B21B6]">
          <span className="relative flex w-2 h-2"><span className="absolute inline-flex w-full h-full rounded-full bg-violet-400 opacity-75 animate-ping" /><span className="relative inline-flex w-2 h-2 rounded-full bg-[#6D28D9]" /></span>
          {stop === 'awaiting_confirmation' ? 'Waiting for you — review the card below and press Confirm or Cancel.' : 'Waiting for your answer — reply in the box below.'}
        </div>
      )}

      {limit && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs rounded-xl px-3 py-2 border bg-amber-50 border-amber-200 text-amber-800">
          <span className="font-medium">{stop === 'token_budget' ? 'This request hit its size budget' : 'I reached my limit for one request'} and may not have finished.</span>
          {onContinue && (
            <button type="button" onClick={onContinue} disabled={!canContinue}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white border border-amber-300 px-2.5 py-1 font-semibold hover:bg-amber-100 disabled:opacity-50 disabled:pointer-events-none">
              <RotateCw className="w-3 h-3" /> Ask me to continue
            </button>
          )}
        </div>
      )}

      {plan && (
        <div className="rounded-xl border border-violet-100 bg-white/80 px-3.5 py-3">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#5B21B6]">
            <CircleDashed className="w-3.5 h-3.5" /> Plan{plan.revision > 1 ? ` · revised ×${plan.revision - 1}` : ''}
          </div>
          <p className="text-xs font-semibold text-slate-800 mt-1">{plan.goal}</p>
          <ol className="mt-2 space-y-1.5">
            {plan.steps.map((st) => {
              const { icon: Icon, cls, label } = PLAN_ICON[st.status] ?? PLAN_ICON.pending;
              return (
                <li key={st.id} className="flex items-start gap-2 text-xs">
                  <Icon className={`w-4 h-4 mt-px shrink-0 ${cls}`} aria-label={label} />
                  <span className={`min-w-0 ${st.status === 'done' ? 'text-slate-500' : st.status === 'skipped' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                    {st.description}
                    {st.tool && <span className="ml-1.5 text-[10px] text-slate-400">· {toolLabel(st.tool)}</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {steps.length > 0 && (
        <div>
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-[#5B21B6] transition-colors">
            <Wrench className="w-3 h-3" /> What I did ({steps.length} step{steps.length === 1 ? '' : 's'})
            <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
                <ul className="mt-2 rounded-xl border border-slate-200/80 bg-slate-50/70 divide-y divide-slate-200/70">
                  {steps.map((st) => (
                    <li key={st.step} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-2 text-[11px]">
                      <span className="w-4 text-slate-400 tabular-nums">{st.step}</span>
                      <span className="font-semibold text-slate-700">{toolLabel(st.tool)}</span>
                      <span className="text-slate-500">{DECISION_LABEL[st.decision] ?? st.decision}</span>
                      {st.attempts > 1 && <span className="rounded-full bg-amber-100 text-amber-700 px-1.5 py-px font-semibold">retried ×{st.attempts - 1}</span>}
                      <span className="ml-auto text-slate-400 tabular-nums">{fmtMs(st.duration_ms)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400"><ShieldCheck className="w-3 h-3" /> Acting as: {agent.role.acting_as?.split(':')[0] || agent.role.level}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/** Out-of-app questions and "data this CRM does not hold": shown as a neutral notice, not an error. */
export const isNoticeAnalysis = (a?: AiChatAnalysis): boolean =>
  !!a && (!a.supported || a.reason === 'out_of_scope' || a.reason === 'unavailable_module' || a.reason === 'prompt_request');

/** Resolved period(s) as chips above the answer, e.g. "Today (2026-10-14)". */
export function AnalysisChips({ analysis }: { analysis?: AiChatAnalysis }) {
  const periods = analysis?.restructured.periods?.length ? analysis.restructured.periods : analysis?.restructured.date_range ? [analysis.restructured.date_range] : [];
  if (!periods.length || isNoticeAnalysis(analysis) || analysis?.reason === 'needs_clarification') return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {periods.map((p) => (
        <span key={`${p.from}-${p.to}`} className="inline-flex items-center gap-1 rounded-full bg-violet-50 text-[#5B21B6] ring-1 ring-violet-200/70 px-2.5 py-0.5 text-[11px] font-semibold">
          <CalendarDays className="w-3 h-3" />{p.label}
        </span>
      ))}
    </div>
  );
}

const REASON_LABEL: Record<string, string> = {
  out_of_scope: 'Judged unrelated to the CRM (out_of_scope)',
  unavailable_module: 'Asks about data this CRM does not hold (unavailable_module)',
  prompt_request: 'Looks like a request for the assistant\'s instructions (prompt_request)',
  needs_clarification: 'Needs clarification (needs_clarification)',
  unclassified: 'Not classified (unclassified)',
  semantic_matched: 'Understood by the language model (semantic_matched)',
};

/** Where each figure in the answer came from (collapsed by default). Useful for a quick check or for QA. */
function EvidenceList({ evidence }: { evidence: AiEvidence[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-[#5B21B6] transition-colors">
        <BadgeCheck className="w-3 h-3" /> Sources ({evidence.length})
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul className="mt-2 rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 text-[11px]">
          {evidence.map((e, i) => (
            <li key={`${e.claim}-${i}`} className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 px-3 py-1.5">
              <span className="font-bold text-slate-800 tabular-nums">{e.claim}</span>
              {e.metric && <span className="rounded-full bg-violet-50 text-[#5B21B6] px-1.5 py-px font-semibold">{e.metric}</span>}
              <span className="text-slate-500">{toolLabel(e.source)} · <span className="font-mono text-[10px]">{e.field}</span></span>
              {e.record && <span className="text-slate-500">· {e.record}</span>}
              {e.derived && <span className="rounded-full bg-amber-50 text-amber-700 px-1.5 py-px font-semibold">calculated</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Support details for a refused reply: how the server classified the question. Collapsed by default. */
function RefusalDetails({ analysis }: { analysis: AiChatAnalysis }) {
  const [open, setOpen] = useState(false);
  const rows: [string, string][] = [
    ['Reason', REASON_LABEL[analysis.reason] ?? analysis.reason],
    ...(analysis.guard ? [['Rule that fired', `${analysis.guard.rule}${analysis.guard.matched?.length ? ` — matched: ${analysis.guard.matched.join(', ')}` : ''}`] as [string, string]] : []),
    ['Intent / module', `${analysis.intent} / ${analysis.module}`],
    ['Confidence', String(analysis.confidence)],
    ['Language', analysis.language],
    ['Understood as', analysis.restructured.normalized_text || '—'],
    ['Model called', analysis.route === 'llm' ? 'yes' : 'no (answered by the scope guard)'],
    ['Request id', analysis.request_id ?? '—'],
  ];
  const copy = async () => {
    const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');
    try { await navigator.clipboard.writeText(text); toast.success('Details copied'); } catch { toast.error('Could not copy'); }
  };
  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-[#5B21B6] transition-colors">
        <HelpCircle className="w-3 h-3" /> Why was this refused?
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[11px]">
          <dl className="space-y-1">
            {rows.map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="w-28 shrink-0 text-slate-400">{k}</dt>
                <dd className="min-w-0 break-words font-medium text-slate-700">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-2.5 flex items-center justify-between gap-3">
            <span className="text-[10px] text-slate-400">If this request is valid, send these details to support.</span>
            <button type="button" onClick={copy}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 font-semibold text-slate-600 hover:border-violet-300 hover:text-[#5B21B6]">
              <Copy className="w-3 h-3" /> Copy details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Hints below the answer: neutral out-of-scope notice, empty state, retry for failed lookups, role-denied style and a
 * "verified" badge. Only reads `analysis` (the message and blocks are rendered by the caller as usual).
 */
export function AnalysisFooter({ analysis, hasBlocks, onRetry, canRetry, quickActions, onQuickAction }: {
  analysis?: AiChatAnalysis;
  hasBlocks: boolean;
  onRetry?: () => void;
  canRetry?: boolean;
  quickActions?: { label: string; prompt: string }[];
  onQuickAction?: (prompt: string) => void;
}) {
  if (!analysis) return null;
  const { tool_status: status, validation } = analysis;
  const notice = isNoticeAnalysis(analysis);
  const verified = !notice && (validation.status === 'passed' || validation.status === 'corrected') && (status === 'success' || status === 'partial');

  return (
    <div className="space-y-2.5">
      {notice && quickActions && quickActions.length > 0 && onQuickAction && (
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mb-1.5"><Info className="w-3 h-3" /> Here is what I can help with:</p>
          <div className="flex flex-wrap gap-1.5">
            {quickActions.slice(0, 8).map((q) => (
              <button key={q.label} type="button" disabled={!canRetry} onClick={() => onQuickAction(q.prompt)} title={q.prompt}
                className="rounded-full border border-violet-200 bg-white px-3 py-1 text-[11px] font-semibold text-[#5B21B6] hover:bg-violet-50 disabled:opacity-50 disabled:pointer-events-none transition-colors">
                {q.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {notice && <RefusalDetails analysis={analysis} />}

      {status === 'no_records' && !hasBlocks && (
        <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-3.5 py-3 text-xs text-slate-500">
          <SearchX className="w-5 h-5 text-slate-300 shrink-0" />
          <span>Nothing matched. Try a different date range or filter.</span>
        </div>
      )}

      {status === 'denied' && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          <Lock className="w-3.5 h-3.5 shrink-0" /> Not available for your role.
        </div>
      )}

      {(status === 'failed' || status === 'partial') && onRetry && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          <span className="font-medium">{status === 'partial' ? 'Some data could not be loaded.' : 'The data could not be loaded right now.'}</span>
          <button type="button" onClick={onRetry} disabled={!canRetry}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white border border-rose-300 px-2.5 py-1 font-semibold hover:bg-rose-100 disabled:opacity-50 disabled:pointer-events-none">
            <RotateCw className="w-3 h-3" /> Try again
          </button>
        </div>
      )}

      {verified && (
        <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700"
          title={validation.status === 'corrected' ? 'Some unsupported claims were removed from this answer.' : 'Numbers in this answer were checked against your CRM data.'}>
          <BadgeCheck className="w-3.5 h-3.5" /> Verified against your data{validation.status === 'corrected' ? ' (corrected)' : ''}
        </span>
      )}

      {!notice && validation.evidence && validation.evidence.length > 0 && <EvidenceList evidence={validation.evidence} />}
    </div>
  );
}
