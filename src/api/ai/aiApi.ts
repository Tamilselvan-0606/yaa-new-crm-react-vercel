import { baseClient } from '../baseApi';
import type {
  AiActionResult, AiActionState, AiCapabilities, AiChatResponse, AiConversation, AiMessage, AiRecheckResult, AiTaskDetail, AiTaskStatus, AiTaskView,
} from './aiTypes';

export * from './aiTypes';

// The OpenAI key never reaches the browser: every call goes to our backend, which authenticates the user and
// applies their organization/branch scope. Agent runs can take a while, hence the longer timeout on chat.
const CHAT_TIMEOUT_MS = 170000;

/** A failed chat. When the server had already started a conversation, `conversationId` lets the UI stay in it. */
export class AiChatError extends Error {
  constructor(message: string, public code: string, public status: number, public conversationId: string | null) {
    super(message);
    this.name = 'AiChatError';
  }
}

/** A failed confirm/cancel (expired, already processed, not found, outside the user's scope…). */
export class AiActionError extends Error {
  constructor(message: string, public code: string, public status: number) {
    super(message);
    this.name = 'AiActionError';
  }
}

/** Friendly wording for the documented error codes; falls back to the server's own message. */
export function friendlyAiError(code: string | undefined, status: number | undefined, fallback: string): string {
  switch (code) {
    case 'AI_RATE_LIMITED': return 'You are sending messages too quickly. Please wait a moment and try again.';
    case 'AI_BUSY': return 'The assistant is still working on your previous request. Please wait for it to finish.';
    case 'AI_QUOTA_EXCEEDED': return 'The AI usage quota has been reached. Please try again later.';
    case 'AI_SCOPE_DENIED': return 'This is not available for your role.';
    case 'AI_BUDGET_EXCEEDED': return 'Your daily AI usage budget has been reached. Please try again tomorrow.';
    case 'PROVIDER_NOT_CONFIGURED': return 'The AI assistant is not configured on the server yet.';
    case 'AI_DISABLED': return 'The AI assistant is currently unavailable.';
    case 'ORGANIZATION_REQUIRED': return 'Please choose an organization first.';
    case 'ACTION_ALREADY_PROCESSED': return 'This action was already processed.';
    case 'ACTION_EXPIRED': return 'This request expired. Ask me again to prepare it.';
    case 'ACTION_NOT_FOUND': return 'This action could not be found. Refresh and try again.';
    case 'CONVERSATION_NOT_FOUND': return 'This conversation no longer exists.';
    case 'AI_ORG_QUOTA_EXCEEDED': return 'Your organization has reached its daily AI usage limit. Please try again tomorrow.';
    case 'AI_ORG_BUDGET_EXCEEDED': return 'Your organization has reached its daily AI cost budget. Please try again tomorrow.';
    case 'PROVIDER_BAD_REQUEST': return 'The assistant is not set up correctly on the server. Please contact your administrator.';
    case 'ACTION_NOT_UNKNOWN': return 'This action does not need to be checked again.';
    case 'TASK_NOT_FOUND': return 'This task no longer exists. Refresh the list.';
    case 'TASKS_DISABLED': return 'Saved tasks are not turned on for this workspace.';
    case 'TASK_AWAITING_APPROVAL': return 'Confirm or cancel the pending step first, then continue the task.';
    case 'TASK_NOT_RESUMABLE': return 'This task can no longer be continued.';
    case 'TASK_IN_PROGRESS': return 'This task is already running. Refresh to see its progress.';
    case 'TASK_CHANGED': return 'This task was changed somewhere else. Refreshing it now.';
    case 'TASK_NOT_CANCELLABLE': return 'This task has already finished.';
    case 'TASK_STATE_UNAVAILABLE': return 'Changes are temporarily unavailable. Please try again shortly.';
  }
  if (code?.startsWith('PROVIDER_') || status === 502 || status === 503 || status === 504) return 'The assistant is unavailable right now. Please try again in a moment.';
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  return fallback;
}

const chatError = (res: { status: number; data?: any }, fallback: string) => {
  const error = res.data?.error ?? {};
  return new AiChatError(friendlyAiError(error.code, res.status, error.message ?? fallback), error.code ?? 'AI_ERROR', res.status, error.conversation_id ?? null);
};

const actionError = (res: { status: number; data?: any }, fallback: string) => {
  const error = res.data?.error ?? {};
  return new AiActionError(friendlyAiError(error.code, res.status, error.message ?? fallback), error.code ?? 'AI_ERROR', res.status);
};

export const aiApi = {
  /** `images` are data URIs ("data:image/png;base64,…"); the field is only sent when the user attached something. */
  chat: async (message: string, conversationId?: string | null, signal?: AbortSignal, images?: string[]): Promise<AiChatResponse> => {
    // Read error bodies here (the shared interceptor keeps only the message). 401 still goes through the
    // interceptor so an expired access token is refreshed and the request retried.
    const res = await baseClient.post('/ai/chat', { conversation_id: conversationId ?? null, message, ...(images?.length ? { images } : {}) }, { timeout: CHAT_TIMEOUT_MS, signal, validateStatus: (s) => s !== 401 });
    if (res.status >= 400) throw chatError(res, 'The assistant could not answer this request');
    return res.data;
  },
  capabilities: async (): Promise<AiCapabilities> => {
    const res = await baseClient.get('/ai/capabilities');
    return res.data.data;
  },
  listConversations: async (page = 1, limit = 30): Promise<AiConversation[]> => {
    const res = await baseClient.get('/ai/conversations', { params: { page, limit } });
    return res.data.data;
  },
  getMessages: async (conversationId: string, limit = 100): Promise<AiMessage[]> => {
    const res = await baseClient.get(`/ai/conversations/${conversationId}/messages`, { params: { limit } });
    return res.data.data;
  },
  renameConversation: async (conversationId: string, title: string): Promise<AiConversation> => {
    const res = await baseClient.patch(`/ai/conversations/${conversationId}`, { title });
    return res.data.data;
  },
  deleteConversation: async (conversationId: string): Promise<void> => {
    await baseClient.delete(`/ai/conversations/${conversationId}`);
  },
  confirmAction: async (actionId: string): Promise<AiActionResult> => {
    // A 422 still carries a structured result (the operation was attempted and failed downstream). Other
    // statuses (409 processed, 410 expired, 404, 403) carry { error: { code, message } }.
    const res = await baseClient.post(`/ai/actions/${actionId}/confirm`, {}, { timeout: CHAT_TIMEOUT_MS, validateStatus: (s) => s !== 401 });
    if (res.status === 200 || res.status === 422) return res.data;
    const error = res.data?.error ?? {};
    throw new AiActionError(friendlyAiError(error.code, res.status, error.message ?? 'Could not confirm this action'), error.code ?? 'AI_ERROR', res.status);
  },
  /** Returns the saved task this action belonged to (null when it was not part of one). */
  cancelAction: async (actionId: string): Promise<AiTaskView | null> => {
    const res = await baseClient.post(`/ai/actions/${actionId}/cancel`, {}, { validateStatus: (s) => s !== 401 });
    if (res.status >= 400) throw actionError(res, 'Could not cancel this action');
    return res.data?.data?.task ?? null;
  },
  /**
   * After an `outcome_unknown` answer: a read-only look-up of whether the change landed. It never runs the change
   * again, and "not found yet" stays `outcome_unknown` because the server may still be processing it.
   */
  recheckAction: async (actionId: string): Promise<AiRecheckResult> => {
    const res = await baseClient.post(`/ai/actions/${actionId}/recheck`, {}, { timeout: CHAT_TIMEOUT_MS, validateStatus: (s) => s !== 401 });
    if (res.status >= 400) throw actionError(res, 'Could not check this action');
    const d = res.data?.data ?? res.data;
    return { status: d.status === 'succeeded' ? 'succeeded' : 'outcome_unknown', message: d.message ?? '' };
  },

  /* ---- Saved multi-step tasks ---- */
  listTasks: async (status?: AiTaskStatus, page = 1, limit = 30): Promise<AiTaskView[]> => {
    const res = await baseClient.get('/ai/tasks', { params: { status, page, limit }, timeout: 0, validateStatus: (s) => s !== 401 });
    if (res.status >= 400) throw actionError(res, 'Could not load your tasks');
    return res.data?.data ?? [];
  },
  getTask: async (taskId: string): Promise<AiTaskDetail> => {
    const res = await baseClient.get(`/ai/tasks/${taskId}`, { timeout: 0, validateStatus: (s) => s !== 401 });
    if (res.status >= 400) throw actionError(res, 'Could not load this task');
    return res.data.data;
  },
  /** Continues a task in its own conversation. Answers like a normal chat reply. Only ever call it from a click. */
  resumeTask: async (taskId: string, signal?: AbortSignal): Promise<AiChatResponse> => {
    const res = await baseClient.post(`/ai/tasks/${taskId}/resume`, {}, { timeout: CHAT_TIMEOUT_MS, signal, validateStatus: (s) => s !== 401 });
    if (res.status >= 400) throw chatError(res, 'Could not continue this task');
    return res.data;
  },
  cancelTask: async (taskId: string): Promise<AiTaskView> => {
    const res = await baseClient.post(`/ai/tasks/${taskId}/cancel`, {}, { validateStatus: (s) => s !== 401 });
    if (res.status >= 400) throw actionError(res, 'Could not cancel this task');
    return res.data.data;
  },
  /** Current status of a proposed action (used to restore cards when an old conversation is reopened). */
  getAction: async (actionId: string): Promise<AiActionState> => {
    const res = await baseClient.get(`/ai/actions/${actionId}`, { timeout: 0 });
    const d = res.data?.data ?? res.data;
    return { action_id: actionId, status: d.status, message: d.message ?? d.result?.message };
  },
};
