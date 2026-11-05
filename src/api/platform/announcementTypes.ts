/** Platform Administrator side: /platform/announcements */
export type AnnouncementRecipientMode = 'ALL' | 'TYPE' | 'SELECTED';

export interface AnnouncementAttachment {
  id: string;
  fileName: string;
  mimeType?: string;
  size: number;
  /** Signed download address (only on the single-record calls). */
  url?: string;
}

export interface AnnouncementRecipient {
  organizationId: string;
  name: string;
  code?: string;
  deliveryStatus?: 'Pending' | 'Delivered' | 'Failed' | string;
  readAt?: string | null;
}

export interface AnnouncementListItem {
  id: string;
  code?: string;
  theme: string;
  subject: string;
  contentPreview?: string;
  recipientMode: AnnouncementRecipientMode;
  /** 1 = Client Management, 2 = Sales Management */
  organizationTypes?: number[];
  recipientCount: number;
  attachment?: AnnouncementAttachment | null;
  status: string;
  sentAt: string;
  createdAt?: string;
}

/** Totals of the delivery results of one announcement. */
export interface AnnouncementDeliveryTotals {
  pending: number;
  delivered: number;
  failed: number;
  read: number;
}

/** One organization's delivery result: GET /platform/announcements/{id}/recipients */
export interface AnnouncementRecipientResult {
  organizationId: string;
  name: string;
  code?: string;
  organizationType?: number;
  /** Pending until the email step finished; Failed when the email failed 3 times (the in-app notification still arrived). */
  deliveryStatus: 'Pending' | 'Delivered' | 'Failed' | string;
  emailStatus?: 'Pending' | 'Sent' | 'Failed' | 'Skipped' | string;
  emailAttempts?: number;
  error?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
}

export interface AnnouncementRecipientListParams {
  page_no?: number;
  page_size?: number;
  search?: string;
  deliveryStatus?: 'Pending' | 'Delivered' | 'Failed';
  isRead?: boolean;
}

export interface AnnouncementDetail extends AnnouncementListItem {
  contentHtml: string;
  organizationIds?: string[];
  /** The first 100 recipient organizations; all of them come from the recipients call. */
  recipients?: AnnouncementRecipient[];
  delivery?: AnnouncementDeliveryTotals;
  createdBy?: { id: string; name: string; email?: string };
}

export interface AnnouncementListParams {
  page_no?: number;
  page_size?: number;
  search?: string;
  recipientMode?: AnnouncementRecipientMode;
  status?: string;
  from?: string;
  to?: string;
  sortBy?: 'sentAt' | 'subject' | 'theme';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateAnnouncementRequest {
  theme: string;
  subject: string;
  contentHtml: string;
  recipientMode: AnnouncementRecipientMode;
  organizationTypes?: number[];
  organizationIds?: string[];
  attachmentId?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  page_no?: number;
  page_size?: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ApiEnvelope<T> {
  success: boolean;
  statusCode?: number;
  message?: string;
  data: T;
  pagination?: Pagination;
  summary?: { unreadCount?: number };
  meta?: { timestamp: string; requestId: string };
}

/** Organization side: /platform/announcements/inbox */
export interface InboxAnnouncementItem {
  id: string;
  code?: string;
  theme: string;
  subject: string;
  contentPreview?: string;
  sentAt: string;
  isRead: boolean;
  readAt?: string | null;
  attachment?: AnnouncementAttachment | null;
}

export interface InboxAnnouncementDetail extends InboxAnnouncementItem {
  contentHtml: string;
}

export interface InboxListParams {
  page_no?: number;
  page_size?: number;
  search?: string;
  isRead?: boolean;
}

/** Email templates offered by the announcement editor: /platform/announcement-templates */
export interface AnnouncementTemplate {
  /** A readable id for system templates (e.g. "maintenance"), a UUID for the ones the team adds. */
  id: string;
  name: string;
  description?: string | null;
  contentHtml: string;
  isSystem: boolean;
  isActive: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AnnouncementTemplateListParams {
  page_no?: number;
  page_size?: number;
  search?: string;
  isActive?: boolean;
}

export interface SaveAnnouncementTemplateRequest {
  name?: string;
  description?: string;
  contentHtml?: string;
  isActive?: boolean;
  sortOrder?: number;
}

/** POST /platform/announcements/generate: the AI writes a draft; nothing is saved or sent. */
export type AnnouncementTone = 'professional' | 'friendly' | 'formal' | 'celebratory' | 'urgent';
export type AnnouncementLength = 'short' | 'medium' | 'long';

export interface GenerateAnnouncementRequest {
  theme: string;
  /** Kept exactly as written when given. */
  subject?: string;
  /** Facts the AI must use (dates, times, feature names); it never invents them. */
  instructions?: string;
  tone?: AnnouncementTone;
  length?: AnnouncementLength;
}

export interface GeneratedAnnouncement {
  theme: string;
  subject: string;
  heading?: string;
  contentHtml: string;
  contentText?: string;
  tone?: string;
  length?: string;
  model?: string;
}
