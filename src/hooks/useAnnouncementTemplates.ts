import { useCallback, useEffect, useState } from 'react';
import type { EditorTemplate } from '../components/common/RichTextEditor';
import { ANNOUNCEMENT_TEMPLATES_CHANGED_EVENT, announcementTemplateApi } from '../api/platform/announcementApi';
import { EMAIL_TEMPLATES } from '../views/announcements/announcementStorage';

/**
 * Templates for the announcement editor, read from the API (active ones, in the server's order).
 * If the call fails the built-in templates are used, so the editor always has something to offer.
 */
export const useAnnouncementTemplates = (): { templates: EditorTemplate[]; loading: boolean } => {
  const [templates, setTemplates] = useState<EditorTemplate[]>(EMAIL_TEMPLATES);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await announcementTemplateApi.list({ page_no: 1, page_size: 100 });
      const rows = Array.isArray(res?.data) ? res.data : [];
      const active = rows
        .filter((t) => t.isActive !== false)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((t) => ({ id: t.id, name: t.name, description: t.description || undefined, html: t.contentHtml }));
      setTemplates(active);
    } catch {
      setTemplates(EMAIL_TEMPLATES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    window.addEventListener(ANNOUNCEMENT_TEMPLATES_CHANGED_EVENT, load);
    return () => window.removeEventListener(ANNOUNCEMENT_TEMPLATES_CHANGED_EVENT, load);
  }, [load]);

  return { templates, loading };
};
