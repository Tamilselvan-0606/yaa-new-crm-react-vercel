import { useCallback, useEffect, useRef, useState } from 'react';
import { ANNOUNCEMENTS_CHANGED_EVENT, announcementInboxApi } from '../api/platform/announcementApi';

/** Minimum interval between background unread-count requests (5 minutes) */
const UNREAD_THROTTLE_MS = 5 * 60 * 1000;
/** Polling interval (5 minutes) while the tab is active */
const POLL_INTERVAL_MS = 5 * 60 * 1000;

// Module-level cache so re-renders, route changes, and remounts do not refetch if recently fetched
let cachedCount = 0;
let lastFetchedAt = 0;
let inFlightPromise: Promise<number> | null = null;

const fetchUnreadCount = async (force = false): Promise<number> => {
  const now = Date.now();
  if (!force && lastFetchedAt > 0 && now - lastFetchedAt < UNREAD_THROTTLE_MS) {
    return cachedCount;
  }
  if (inFlightPromise) {
    return inFlightPromise;
  }

  inFlightPromise = (async () => {
    try {
      const res = await announcementInboxApi.unreadCount();
      const count = Number(res?.data?.count) || 0;
      cachedCount = count;
      lastFetchedAt = Date.now();
      return count;
    } catch {
      return cachedCount;
    } finally {
      inFlightPromise = null;
    }
  })();

  return inFlightPromise;
};

/** Number of unread announcements for the signed-in organization user (sidebar badge). */
export const useAnnouncementUnread = (enabled: boolean): number => {
  const [count, setCount] = useState(cachedCount);
  const isEnabledRef = useRef(enabled);
  isEnabledRef.current = enabled;

  const refresh = useCallback(async (force = false) => {
    if (!isEnabledRef.current) return;
    const nextCount = await fetchUnreadCount(force);
    setCount(nextCount);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }

    // Initial load (respects throttle if already loaded moments ago)
    void refresh(false);

    // Periodic poll every 5 minutes, only if tab is visible
    const timer = window.setInterval(() => {
      if (!document.hidden && isEnabledRef.current) {
        void refresh(false);
      }
    }, POLL_INTERVAL_MS);

    // On explicit announcement change (e.g. marked as read, created), force refresh immediately
    const onAnnouncementsChanged = () => {
      void refresh(true);
    };

    // When returning to the tab, only refresh if the 5-minute throttle has expired
    const onFocus = () => {
      if (Date.now() - lastFetchedAt >= UNREAD_THROTTLE_MS) {
        void refresh(false);
      }
    };

    window.addEventListener(ANNOUNCEMENTS_CHANGED_EVENT, onAnnouncementsChanged);
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener(ANNOUNCEMENTS_CHANGED_EVENT, onAnnouncementsChanged);
      window.removeEventListener('focus', onFocus);
    };
  }, [enabled, refresh]);

  return count;
};
