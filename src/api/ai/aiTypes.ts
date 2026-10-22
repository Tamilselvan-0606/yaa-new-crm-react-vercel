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
    };

export type AiResponseType = 'text' | 'report' | 'table' | 'chart' | 'record_details' | 'confirmation' | 'email_preview' | 'error';

export interface AiPendingAction {
  action_id: string;
  tool: string;
  summary: string;
  expires_at: string;
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
  usage: { model: string; tool_calls: number; input_tokens: number; output_tokens: number; total_tokens: number };
}

export interface AiActionResult {
  success: boolean;
  action_id: string;
  tool: string;
  status: 'succeeded' | 'failed';
  message: string;
  result: unknown;
  data: { blocks: AiBlock[] };
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
  scope: { level: string; organizationId: string; organizationName: string; subOrganizationId: string | null; branchIds: string[] | null; roleCode: string | null };
  tools: { name: string; category: string; kind: 'read' | 'write'; description: string; requiresConfirmation: boolean }[];
  quickActions: { label: string; prompt: string }[];
  limits: { messageChars: number; toolCallsPerRequest: number; requestsPerMinute: number; pendingActionTtlMinutes: number; emailMaxRecipients: number };
}
