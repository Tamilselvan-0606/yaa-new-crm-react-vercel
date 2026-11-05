import { baseClient } from '../baseApi';
import type {
  AnnouncementAttachment,
  AnnouncementTemplate,
  AnnouncementTemplateListParams,
  SaveAnnouncementTemplateRequest,
  AnnouncementDetail,
  AnnouncementListItem,
  AnnouncementListParams,
  AnnouncementRecipientListParams,
  AnnouncementRecipientResult,
  ApiEnvelope,
  CreateAnnouncementRequest,
  GenerateAnnouncementRequest,
  GeneratedAnnouncement,
  InboxAnnouncementDetail,
  InboxAnnouncementItem,
  InboxListParams,
} from './announcementTypes';

const BASE = '/platform/announcements';

/** Only the parameters that have a value (the endpoints reject unknown / empty ones). */
const clean = (params: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));

/** Platform Administrator: write, send, list and delete announcements. */
export const announcementApi = {
  list: async (params: AnnouncementListParams = {}): Promise<ApiEnvelope<AnnouncementListItem[]>> => {
    const res = await baseClient.get(BASE, {
      params: clean({ page_no: 1, page_size: 10, sortBy: 'sentAt', sortOrder: 'desc', ...params }),
    });
    return res.data;
  },

  getById: async (id: string): Promise<ApiEnvelope<AnnouncementDetail>> => {
    const res = await baseClient.get(`${BASE}/${encodeURIComponent(id)}`);
    return res.data;
  },

  create: async (payload: CreateAnnouncementRequest): Promise<ApiEnvelope<AnnouncementDetail>> => {
    const res = await baseClient.post(BASE, payload);
    return res.data;
  },

  remove: async (id: string): Promise<ApiEnvelope<unknown>> => {
    const res = await baseClient.delete(`${BASE}/${encodeURIComponent(id)}`);
    return res.data;
  },

  /** Delivery result per organization (live: it changes while the emails go out, so it is never cached). */
  recipients: async (
    id: string,
    params: AnnouncementRecipientListParams = {}
  ): Promise<ApiEnvelope<AnnouncementRecipientResult[]>> => {
    const res = await baseClient.get(`${BASE}/${encodeURIComponent(id)}/recipients`, {
      params: clean({ page_no: 1, page_size: 10, ...params }),
    });
    return res.data;
  },

  /** One file (PDF, DOC, DOCX, JPG, JPEG, PNG; max 5 MB). Returns the id to send as `attachmentId`. */
  uploadAttachment: async (file: File): Promise<ApiEnvelope<AnnouncementAttachment>> => {
    const form = new FormData();
    form.append('file', file);
    const res = await baseClient.post(`${BASE}/attachments`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  /** The AI writes a subject and a message from a theme. Never saves or sends: load it into the editor. */
  generate: async (payload: GenerateAnnouncementRequest): Promise<ApiEnvelope<GeneratedAnnouncement>> => {
    const res = await baseClient.post(`${BASE}/generate`, clean(payload as unknown as Record<string, unknown>));
    return res.data;
  },

  /** How many organizations a choice of recipients reaches. */
  recipientCount: async (params: {
    recipientMode: string;
    organizationTypes?: number[];
    organizationIds?: string[];
  }): Promise<ApiEnvelope<{ count: number }>> => {
    const res = await baseClient.get(`${BASE}/recipient-count`, {
      params: clean({
        recipientMode: params.recipientMode,
        organizationTypes: params.organizationTypes?.join(','),
        organizationIds: params.organizationIds?.join(','),
      }),
    });
    return res.data;
  },
};

/** Organization users: the announcements sent to their organization. */
export const announcementInboxApi = {
  list: async (params: InboxListParams = {}): Promise<ApiEnvelope<InboxAnnouncementItem[]>> => {
    const res = await baseClient.get(`${BASE}/inbox`, {
      params: clean({ page_no: 1, page_size: 10, ...params }),
    });
    return res.data;
  },

  unreadCount: async (): Promise<ApiEnvelope<{ count: number }>> => {
    const res = await baseClient.get(`${BASE}/inbox/unread-count`);
    return res.data;
  },

  /** Opens an announcement; the server marks it read. */
  open: async (id: string): Promise<ApiEnvelope<InboxAnnouncementDetail>> => {
    const res = await baseClient.get(`${BASE}/inbox/${encodeURIComponent(id)}`);
    return res.data;
  },

  markRead: async (id: string): Promise<ApiEnvelope<{ id: string; isRead: boolean; readAt: string | null }>> => {
    const res = await baseClient.patch(`${BASE}/inbox/${encodeURIComponent(id)}/read`);
    return res.data;
  },
};

/** Tells the sidebar badge and open lists that the unread count may have changed. */
export const ANNOUNCEMENTS_CHANGED_EVENT = 'crm:announcements-changed';
export const notifyAnnouncementsChanged = () => window.dispatchEvent(new Event(ANNOUNCEMENTS_CHANGED_EVENT));

const TEMPLATES = '/platform/announcement-templates';

/** Platform Administrator: the email templates of the announcement editor. System templates can be edited and deactivated, not deleted. */
export const announcementTemplateApi = {
  list: async (
    params: AnnouncementTemplateListParams = {}
  ): Promise<ApiEnvelope<AnnouncementTemplate[]>> => {
    const res = await baseClient.get(TEMPLATES, { params: clean({ page_no: 1, page_size: 100, ...params }) });
    return res.data;
  },

  getById: async (id: string): Promise<ApiEnvelope<AnnouncementTemplate>> => {
    const res = await baseClient.get(`${TEMPLATES}/${encodeURIComponent(id)}`);
    return res.data;
  },

  create: async (
    payload: SaveAnnouncementTemplateRequest
  ): Promise<ApiEnvelope<AnnouncementTemplate>> => {
    const res = await baseClient.post(TEMPLATES, payload);
    return res.data;
  },

  update: async (
    id: string,
    payload: SaveAnnouncementTemplateRequest
  ): Promise<ApiEnvelope<AnnouncementTemplate>> => {
    const res = await baseClient.patch(`${TEMPLATES}/${encodeURIComponent(id)}`, payload);
    return res.data;
  },

  /** A system template answers 409 SYSTEM_TEMPLATE: deactivate it instead. */
  remove: async (id: string): Promise<ApiEnvelope<{ id: string; name: string }>> => {
    const res = await baseClient.delete(`${TEMPLATES}/${encodeURIComponent(id)}`);
    return res.data;
  },
};

/** Tells the editor that the template list may have changed. */
export const ANNOUNCEMENT_TEMPLATES_CHANGED_EVENT = 'crm:announcement-templates-changed';
export const notifyTemplatesChanged = () => window.dispatchEvent(new Event(ANNOUNCEMENT_TEMPLATES_CHANGED_EVENT));
