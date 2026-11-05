import { useCallback, useEffect, useState } from 'react';
import { ANNOUNCEMENTS_CHANGED_EVENT, announcementInboxApi } from '../api/platform/announcementApi';

/** Number of unread announcements for the signed-in organization user (sidebar badge). */
export const useAnnouncementUnread = (enabled: boolean): number => {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await announcementInboxApi.unreadCount();
      setCount(Number(res?.data?.count) || 0);
    } catch {
      /* keep the last known count; a failed badge must not disturb the page */
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener(ANNOUNCEMENTS_CHANGED_EVENT, refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(ANNOUNCEMENTS_CHANGED_EVENT, refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [enabled, refresh]);

  return count;
};
