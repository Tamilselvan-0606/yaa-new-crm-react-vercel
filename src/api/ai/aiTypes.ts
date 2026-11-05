// Types for the AI Copilot API (/api/v1/ai). Blocks are built by the backend from real CRM data.

export type AiValueFormat = 'currency' | 'number' | 'percent' | 'text' | 'date';

export interface AiMetric {
  label: string;
  value: number | string | null;
  format?: AiValueFormat;
}

export interface AiColumn {
  key: string;
  label: string;
  format?: AiValueFormat;
}

export type AiBlock =
  | { type: 'report'; title: string; period?: string; currency?: string; metrics: AiMetric[] }
  | { type: 'table'; title: string; columns: AiColumn[]; rows: Record<string, unknown>[]; totalRecords?: number; truncated?: boolean }
  | { type: 'chart'; title: string; chartType: 'bar' | 'line'; xKey: string; series: { key: string; label: string }[]; data: Record<string, unknown>[] }
  | { type: 'record_details'; title: string; fields: AiMetric[] }
  | { type: 'confirmation'; actionId: string; toolName: string; title: string; summary: string; fields: AiMetric[]; warnings: string[]; expiresAt: string }
  | {
      type: 'email_preview';
      actionId?: string;
      from: string;
      replyTo?: string;
      to: string[];
      cc: string[];
      bcc: string[];
      subject: string;
      text: string;
      html: string;
      recipientCount: number;
      recipients?: { email: string; type: string; name?: string }[];
      attachments: string[];
      relatedEntity?: { type: string; id: string; name?: string } | null;
      warnings: string[];
      expiresAt?: string;
      scheduledAt?: string;
      scheduledFor?: string;
    };

export type AiResponseType = 'text' | 'report' | 'table' | 'chart' | 'record_details' | 'confirmation' | 'email_preview' | 'error';

export interface AiPendingAction {
  action_id: string;
  tool: string;
  summary: string;
  expires_at: string;
}

export type AiScopeLevel = 'organization' | 'sub_organization' | 'branch' | 'manager' | 'staff' | 'sales_representative';
export type AiDecision = 'continue' | 'retry' | 'replan' | 'ask_user' | 'await_confirmation' | 'stop';
export type AiStopReason = 'completed' | 'awaiting_confirmation' | 'needs_input' | 'tool_limit' | 'step_limit' | 'token_budget' | 'unsupported';
export type AiPlanStepStatus = 'pending' | 'in_progress' | 'done' | 'failed' | 'skipped';

/** What the agent did for one request (returned by the live /chat call only; it is not stored with messages). */
export interface AiAgentTrace {
  role: { level: AiScopeLevel; role_code: string | null; acting_as: string };
  plan: { goal: string; revision: number; steps: { id: number; description: string; tool: string | null; status: AiPlanStepStatus }[] } | null;
  steps: { step: number; phase: 'plan' | 'act'; tool: string; status: string; decision: AiDecision; reason: string; attempts: number; duration_ms: number }[];
  iterations: number;
  stop_reason: AiStopReason;
  requires_human: boolean;
  /** The saved multi-step task for this request (null when the request needed no plan). */
  task?: AiTaskView | null;
  /** "unavailable": saving the task failed, so no change was proposed or made in this request. */
  task_persistence?: 'unavailable';
  /** Parts of the context dropped to fit the token budget, e.g. ['history', 'guides', 'tools']. */
  context_reduced?: string[];
}

/* ---- Saved multi-step tasks (GET/POST /ai/tasks) ---- */
export type AiTaskStatus = 'running' | 'waiting_approval' | 'waiting_input' | 'paused' | 'completed' | 'failed' | 'cancelled' | 'expired';
export type AiTaskStepStatus = 'pending' | 'running' | 'awaiting_approval' | 'waiting_input' | 'done' | 'failed' | 'skipped' | 'cancelled';

export interface AiTaskStepView {
  id: number;
  description: string;
  tool: string | null;
  status: AiTaskStepStatus;
  depends_on: number[];
  attempts: number;
  /** The confirmation card of this step, if any. */
  action_id: string | null;
}

export interface AiTaskView {
  id: string;
  goal: string;
  status: AiTaskStatus;
  revision: number;
  expires_at: string;
  /** Which button to offer: confirm the open card, answer the question, or Resume. */
  next: 'confirm_pending_action' | 'answer_question' | 'resume' | null;
  steps: AiTaskStepView[];
}

export interface AiTaskDetail extends AiTaskView {
  last_error: string | null;
  conversation_id: string | null;
  created_at: string;
  updated_at: string;
  events: { type: string; step_id: string | null; metadata: unknown; at: string }[];
}

export type AiToolStatus = 'none' | 'success' | 'no_records' | 'pending_confirmation' | 'needs_input' | 'partial' | 'failed' | 'denied';
export type AiAnalysisReason = 'module_matched' | 'follow_up' | 'conversation' | 'out_of_scope' | 'unavailable_module' | 'prompt_request' | 'needs_clarification' | 'unclassified' | 'semantic_matched';

/** One figure kept in an answer, with where it came from. */
export interface AiEvidence {
  claim: string;
  value: number;
  metric: string | null;
  source: string;
  field: string;
  /** The customer / product / branch the figure belongs to, when it belongs to one row. */
  record: string | null;
  /** True when the figure is a sum, difference, share or growth of the listed fields. */
  derived: boolean;
}

/** How the server understood and checked one question. Used for small UI hints only (it holds no prompts or raw data). */
export interface AiChatAnalysis {
  request_id: string | null;
  intent: string;
  module: string;
  /** New values may be added by the server; screens must keep a default branch. */
  operation: 'read' | 'count' | 'compare' | 'create' | 'update' | 'delete' | 'status' | 'send';
  supported: boolean;
  /** static / fast_path = answered without the model (usage.model is "none"). */
  route: 'static' | 'fast_path' | 'llm';
  reason: AiAnalysisReason;
  language: 'en' | 'ta' | 'tanglish' | 'mixed';
  confidence: number;
  missing: string[];
  injection_suspected: boolean;
  /** Which rule refused the request and the few terms that matched (sent by the backend only for refusals, when enabled). */
  guard?: { rule: string; matched?: string[] };
  model: string | null;
  prompt_version: string;
  restructured: {
    filters: { status?: string; search?: string; payment_status?: string[] };
    date_range: { period: string; from: string; to: string; label: string } | null;
    sorting: { order: 'asc' | 'desc'; by: string | null } | null;
    pagination: { limit: number } | null;
    candidate_tools: string[];
    entities?: { names?: string[]; phones?: string[]; emails?: string[]; amounts?: number[] };
    periods?: { period: string; from: string; to: string; label: string }[];
    output_format?: 'text' | 'table' | 'chart' | 'report' | 'email';
    normalized_text?: string;
    corrections?: { from: string; to: string }[];
  };
  tools: string[];
  tool_status: AiToolStatus;
  transport: 'in_process' | 'mcp';
  validation: { status: 'passed' | 'corrected' | 'flagged' | 'skipped'; removed_claims: number; checks: { check: string; passed: boolean; detail?: string }[]; evidence?: AiEvidence[] };
}

export interface AiChatResponse {
  success: boolean;
  conversation_id: string;
  message_id: string;
  response_type: AiResponseType;
  message: string;
  data: { blocks: AiBlock[] };
  actions: AiPendingAction[];
  requires_confirmation: boolean;
  usage: { model: string; tool_calls: number; input_tokens: number; output_tokens: number; total_tokens: number; cached_tokens?: number };
  agent?: AiAgentTrace;
  analysis?: AiChatAnalysis;
}

export type AiActionStatus = 'pending' | 'executing' | 'succeeded' | 'partial' | 'failed' | 'outcome_unknown' | 'cancelled' | 'expired';

export interface AiActionState {
  action_id: string;
  status: AiActionStatus;
  message?: string;
}

export interface AiActionResult {
  success: boolean;
  action_id: string;
  tool: string;
  /**
   * succeeded · partial (only part of it happened) · failed (nothing changed) ·
   * outcome_unknown (sent, but no answer came back: it may have been applied; never offer a retry).
   */
  status: 'succeeded' | 'partial' | 'failed' | 'outcome_unknown';
  message: string;
  result: unknown;
  data: { blocks: AiBlock[] };
  /** Saved-task state after this step (null when the action was not part of a task). */
  task?: AiTaskView | null;
}

/** Answer of POST /ai/actions/:id/recheck (a read-only look-up; it never runs the change again). */
export interface AiRecheckResult {
  status: 'succeeded' | 'outcome_unknown';
  message: string;
}

export interface AiConversation {
  id: string;
  title: string;
  status: 'active' | 'archived';
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  responseType: AiResponseType | null;
  blocks: AiBlock[];
  createdAt: string;
}

export interface AiCapabilities {
  enabled: boolean;
  provider: string;
  model: string | null;
  scope: {
    level: AiScopeLevel;
    organizationId: string;
    organizationName: string;
    subOrganizationId: string | null;
    branchIds: string[] | null;
    roleCode: string | null;
    /** Plain-language description of what this user can see, e.g. "Sita (STAFF) can access only their own records…". */
    access?: string;
    actingAs?: string;
  };
  tools: { name: string; category: string; kind: 'read' | 'write'; description: string; requiresConfirmation: boolean }[];
  quickActions: { label: string; prompt: string }[];
  limits: { messageChars: number; toolCallsPerRequest: number; requestsPerMinute: number; pendingActionTtlMinutes: number; emailMaxRecipients: number };
}
