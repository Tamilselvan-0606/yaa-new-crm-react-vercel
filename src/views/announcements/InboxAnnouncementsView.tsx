import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, CheckCheck, Megaphone, Paperclip, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { SearchBar } from '../../components/common/SearchBar';
import { FilterDropdown } from '../../components/common/FilterDropdown';
import { Pagination } from '../../components/common/Pagination';
import { StatusBadge, StatusTone } from '../../components/common/StatusBadge';
import { announcementInboxApi, notifyAnnouncementsChanged } from '../../api/platform/announcementApi';
import type { InboxAnnouncementDetail, InboxAnnouncementItem } from '../../api/platform/announcementTypes';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { sanitizeHtml } from '../../utils/sanitizeHtml';

const STATUS_TONES: Record<string, StatusTone> = {
  Unread: { wrap: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', pulse: true },
  Read: { wrap: 'bg-slate-100 text-slate-600 border-slate-300', dot: 'bg-slate-400' },
};

const formatDate = (iso?: string | null) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatSize = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/** Announcements received by the signed-in organization (sent by the Platform Administrator). */
export const InboxAnnouncementsView: React.FC = () => {
  const { showToast } = useAuth();
  // showToast is a new function on every render of the auth provider: keep it out of the effect dependencies.
  const toastRef = useRef(showToast);
  toastRef.current = showToast;

  const [items, setItems] = useState<InboxAnnouncementItem[]>([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pendingState, setPendingState] = useState('ALL');
  const [appliedState, setAppliedState] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [viewing, setViewing] = useState<InboxAnnouncementDetail | null>(null);
  const [opening, setOpening] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await announcementInboxApi.list({
        page_no: page,
        page_size: pageSize,
        search: appliedSearch.trim() || undefined,
        isRead: appliedState === 'ALL' ? undefined : appliedState === 'READ',
      });
      setItems(Array.isArray(res?.data) ? res.data : []);
      setTotal(res?.pagination?.totalRecords ?? res?.data?.length ?? 0);
      if (res?.summary?.unreadCount !== undefined) setUnread(res.summary.unreadCount);
    } catch (err) {
      setItems([]);
      setTotal(0);
      toastRef.current?.('error', 'Could not load announcements', getApiErrorMessage(err, 'Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, appliedSearch, appliedState]);

  useEffect(() => {
    void load();
  }, [load]);

  const openAnnouncement = async (item: InboxAnnouncementItem) => {
    setOpening(true);
    // Show what the list already has at once; the full message (and "read") comes from the server.
    setViewing({ ...item, contentHtml: '' });
    try {
      const res = await announcementInboxApi.open(item.id);
      if (res?.data) setViewing(res.data);
      notifyAnnouncementsChanged();
      void load();
    } catch (err) {
      setViewing(null);
      showToast?.('error', 'Could not open the announcement', getApiErrorMessage(err, 'Please try again.'));
    } finally {
      setOpening(false);
    }
  };

  const markRead = async (item: InboxAnnouncementItem) => {
    setMarkingId(item.id);
    try {
      await announcementInboxApi.markRead(item.id);
      notifyAnnouncementsChanged();
      await load();
    } catch (err) {
      showToast?.('error', 'Could not mark as read', getApiErrorMessage(err, 'Please try again.'));
    } finally {
      setMarkingId(null);
    }
  };

  const headCell = 'py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white';

  return (
    <div className="space-y-6 pb-12 font-sans">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Announcements</h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">Important updates sent to your organization</p>
        </div>
        <span className="inline-flex items-center gap-2 text-xs font-bold text-[#33077C] bg-indigo-50 border border-indigo-100 rounded-full px-3.5 py-1.5 self-start sm:self-auto">
          <Megaphone className="w-4 h-4" />
          {unread} unread
        </span>
      </div>

      <SearchBar
        value={pendingSearch}
        onChange={setPendingSearch}
        placeholder="Search announcements by subject, theme or content..."
        onSubmit={() => {
          setAppliedSearch(pendingSearch);
          setAppliedState(pendingState);
          setPage(1);
        }}
        onReset={() => {
          setPendingSearch('');
          setAppliedSearch('');
          setPendingState('ALL');
          setAppliedState('ALL');
          setPage(1);
        }}
        filterSlot={
          <div className="flex items-center gap-2.5 flex-wrap">
            <FilterDropdown
              options={[
                { label: 'Status : All', value: 'ALL' },
                { label: 'Unread', value: 'UNREAD', dotColor: '#f59e0b' },
                { label: 'Read', value: 'READ', dotColor: '#64748b' },
              ]}
              value={pendingState}
              onChange={setPendingState}
              placeholder="Status : All"
            />
          </div>
        }
        rightSlot={
          <div className="flex items-center gap-3 pr-1">
            <span className="text-xs font-semibold text-slate-500">
              Total Announcements : <span className="text-[#33077C] font-bold">{total}</span>
            </span>
          </div>
        }
      />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200 min-w-[900px]">
            <thead>
              <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white tracking-wider uppercase">
                <th className={headCell}>SUBJECT & THEME</th>
                <th className={headCell}>SENT DATE</th>
                <th className={`${headCell} text-center`}>ATTACHMENT</th>
                <th className={`${headCell} text-center`}>STATUS</th>
                <th className={`${headCell} text-center`}>ACTIONS</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-7 h-7 border-2 border-purple-200 border-t-[#33077C] rounded-full animate-spin" />
                      <span className="text-xs text-slate-500">Loading announcements...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    <div className="flex flex-col items-center gap-2">
                      <Megaphone className="w-8 h-8 text-slate-300" />
                      <span className="text-sm text-slate-500">No announcements found.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((a) => (
                  <tr key={a.id} className={`transition-colors hover:bg-slate-50/60 ${a.isRead ? '' : 'bg-amber-50/30'}`}>
                    <td className="py-4 px-5 border border-slate-200 align-top max-w-[420px]">
                      <div className={`truncate text-slate-900 ${a.isRead ? 'font-semibold' : 'font-bold'}`}>{a.subject}</div>
                      <div className="text-xs text-[#33077C] font-semibold mt-0.5">
                        {a.theme}
                        {a.code ? <span className="text-slate-400 font-medium"> · {a.code}</span> : null}
                      </div>
                      {a.contentPreview && (
                        <div className="text-xs text-slate-500 font-medium mt-1 line-clamp-2">{a.contentPreview}</div>
                      )}
                    </td>
                    <td className="py-4 px-5 border border-slate-200 font-semibold text-slate-700">{formatDate(a.sentAt)}</td>
                    <td className="py-4 px-5 border border-slate-200 text-center">
                      {a.attachment ? (
                        <span title={a.attachment.fileName} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                          <Paperclip className="w-3.5 h-3.5 text-[#33077C]" />
                          <span className="truncate max-w-[120px]">{a.attachment.fileName}</span>
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-4 px-5 border border-slate-200 text-center">
                      <StatusBadge status={a.isRead ? 'Read' : 'Unread'} tones={STATUS_TONES} />
                    </td>
                    <td className="py-4 px-5 border border-slate-200">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => openAnnouncement(a)}
                          title="Open"
                          className="w-8 h-8 rounded-lg bg-indigo-50 text-[#33077C] hover:bg-indigo-100 flex items-center justify-center cursor-pointer transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {!a.isRead && (
                          <button
                            type="button"
                            onClick={() => markRead(a)}
                            disabled={markingId === a.id}
                            title="Mark as read"
                            className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50 flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <CheckCheck className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        total={total}
        currentPage={page}
        pageSize={pageSize}
        pageSizeOptions={[5, 10, 20, 50]}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />

      <Modal
        isOpen={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.subject || 'Announcement'}
        subtitle={viewing ? `${viewing.theme} · ${formatDate(viewing.sentAt)}` : ''}
        maxWidth="3xl"
        headerGradient={true}
        showBackIcon={true}
        hideCloseButton={true}
      >
        {viewing && (
          <div className="space-y-4 p-2 sm:p-4" aria-busy={opening}>
            <div className="border border-slate-200 rounded-xl p-5 bg-white min-h-[120px]">
              {opening && !viewing.contentHtml ? (
                <p className="text-xs font-medium text-slate-400">Loading message…</p>
              ) : (
                <div className="rte-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(viewing.contentHtml) }} />
              )}
            </div>
            {viewing.attachment && (
              <div className="flex flex-wrap items-center justify-between gap-3 border border-slate-200 rounded-xl px-4 py-3 bg-slate-50/60">
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <Paperclip className="w-4 h-4 text-[#33077C]" />
                  {viewing.attachment.fileName}
                  <span className="text-slate-400 font-medium">{formatSize(viewing.attachment.size)}</span>
                </span>
                {viewing.attachment.url && (
                  <a href={viewing.attachment.url} target="_blank" rel="noopener noreferrer">
                    <Button type="button" variant="primary" size="sm" icon={<Download className="w-4 h-4" />}>
                      Download
                    </Button>
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
