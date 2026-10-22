import { baseClient } from '../baseApi';
import type { AiActionResult, AiCapabilities, AiChatResponse, AiConversation, AiMessage } from './aiTypes';

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

export const aiApi = {
  chat: async (message: string, conversationId?: string | null, signal?: AbortSignal): Promise<AiChatResponse> => {
    // Read error bodies here (the shared interceptor keeps only the message). 401 still goes through the
    // interceptor so an expired access token is refreshed and the request retried.
    const res = await baseClient.post('/ai/chat', { conversation_id: conversationId ?? null, message }, { timeout: CHAT_TIMEOUT_MS, signal, validateStatus: (s) => s !== 401 });
    if (res.status >= 400) {
      const error = res.data?.error ?? {};
      throw new AiChatError(error.message ?? 'The assistant could not answer this request', error.code ?? 'AI_ERROR', res.status, error.conversation_id ?? null);
    }
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
    // A 422 still carries a structured result (the operation was attempted and failed downstream).
    const res = await baseClient.post(`/ai/actions/${actionId}/confirm`, {}, { timeout: CHAT_TIMEOUT_MS, validateStatus: (s) => s === 200 || s === 422 });
    return res.data;
  },
  cancelAction: async (actionId: string): Promise<void> => {
    await baseClient.post(`/ai/actions/${actionId}/cancel`, {});
  },
};
