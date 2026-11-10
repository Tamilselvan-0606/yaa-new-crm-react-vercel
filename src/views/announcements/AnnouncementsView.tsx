import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Trash2, Megaphone, Paperclip, Download, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { SearchBar } from '../../components/common/SearchBar';
import { FilterDropdown } from '../../components/common/FilterDropdown';
import { Pagination } from '../../components/common/Pagination';
import { StatusBadge, StatusTone } from '../../components/common/StatusBadge';
import { ConfirmationModal } from '../../utils/confirmationModal';
import { sanitizeHtml } from '../../utils/sanitizeHtml';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { announcementApi } from '../../api/platform/announcementApi';
import { AnnouncementDeliveryPanel } from './AnnouncementDeliveryPanel';
import type { AnnouncementDetail, AnnouncementListItem, AnnouncementRecipientMode } from '../../api/platform/announcementTypes';

const STATUS_TONES: Record<string, StatusTone> = {
  Sent: { wrap: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  Draft: { wrap: 'bg-slate-100 text-slate-700 border-slate-300', dot: 'bg-slate-400' },
  Scheduled: { wrap: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  Failed: { wrap: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
};

const TYPE_NAMES: Record<number, string> = { 1: 'Client Management', 2: 'Sales Management' };

const formatDate = (iso?: string | null) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const recipientsLabel = (a: Pick<AnnouncementListItem, 'recipientMode' | 'organizationTypes'>) =>
  a.recipientMode === 'ALL'
    ? 'All Organizations'
    : a.recipientMode === 'TYPE'
      ? (a.organizationTypes || []).map((t) => TYPE_NAMES[t] || String(t)).join(' + ') || 'By Organization Type'
      : 'Particular Organizations';

export const AnnouncementsView: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useAuth();
  // showToast is a new function on every render of the auth provider: keep it out of the effect dependencies.
  const toastRef = useRef(showToast);
  toastRef.current = showToast;

  const [items, setItems] = useState<AnnouncementListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Search / filter (applied on the Apply button, as on the other list pages)
  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pendingAudience, setPendingAudience] = useState('ALL');
  const [appliedAudience, setAppliedAudience] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [viewing, setViewing] = useState<AnnouncementDetail | null>(null);
  const [opening, setOpening] = useState(false);
  const [viewTab, setViewTab] = useState<'message' | 'delivery'>('message');
  const [deleting, setDeleting] = useState<AnnouncementListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await announcementApi.list({
        page_no: page,
        page_size: pageSize,
        search: appliedSearch.trim() || undefined,
        recipientMode:
          appliedAudience === 'ALL'
            ? undefined
            : appliedAudience === 'ALL_ORGS'
              ? 'ALL'
              : (appliedAudience as AnnouncementRecipientMode),
      });
      setItems(Array.isArray(res?.data) ? res.data : []);
      setTotal(res?.pagination?.totalRecords ?? res?.data?.length ?? 0);
    } catch (err) {
      setItems([]);
      setTotal(0);
      toastRef.current?.('error', 'Could not load announcements', getApiErrorMessage(err, 'Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, appliedSearch, appliedAudience]);

  useEffect(() => {
    void load();
  }, [load]);

  const openAnnouncement = async (item: AnnouncementListItem) => {
    setOpening(true);
    setViewTab('message');
    // The list row shows at once; the full message and recipients come from GET by id.
    setViewing({ ...item, contentHtml: '' });
    try {
      const res = await announcementApi.getById(item.id);
      if (res?.data) setViewing(res.data);
    } catch (err) {
      setViewing(null);
      toastRef.current?.('error', 'Could not open the announcement', getApiErrorMessage(err, 'Please try again.'));
    } finally {
      setOpening(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await announcementApi.remove(deleting.id);
      toastRef.current?.('success', 'Announcement Deleted', `"${deleting.subject}" has been deleted.`);
      setDeleting(null);
      // Stay on a valid page when the last row of the page was deleted.
      if (items.length === 1 && page > 1) setPage(page - 1);
      else await load();
    } catch (err) {
      toastRef.current?.('error', 'Delete Failed', getApiErrorMessage(err, 'Could not delete the announcement.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const headCell = 'py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white';

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Announcements</h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">Send important updates to your organizations</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch gap-3 shrink-0 w-full sm:w-auto">
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate('/announcements/templates')}
            icon={<ArrowRight className="w-4 h-4 text-slate-500" />}
            iconPosition="right"
            className="w-full sm:w-auto justify-center"
          >
            Template
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/announcements/new')}
            icon={<Plus className="w-4 h-4 text-white" />}
            className="w-full sm:w-auto justify-center"
          >
            Add Announcement
          </Button>
        </div>
      </div>

      {/* Search + filters */}
      <SearchBar
        value={pendingSearch}
        onChange={setPendingSearch}
        placeholder="Search announcements by subject, theme or content..."
        onSubmit={() => {
          setAppliedSearch(pendingSearch);
          setAppliedAudience(pendingAudience);
          setPage(1);
        }}
        onReset={() => {
          setPendingSearch('');
          setAppliedSearch('');
          setPendingAudience('ALL');
          setAppliedAudience('ALL');
          setPage(1);
        }}
        filterSlot={
          <div className="flex items-center gap-2.5 flex-wrap">
            <FilterDropdown
              options={[
                { label: 'Recipients : All', value: 'ALL' },
                { label: 'All Organizations', value: 'ALL_ORGS' },
                { label: 'By Organization Type', value: 'TYPE' },
                { label: 'Particular Organizations', value: 'SELECTED' },
              ]}
              value={pendingAudience}
              onChange={setPendingAudience}
              placeholder="Recipients : All"
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

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200 min-w-[900px]">
            <thead>
              <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white tracking-wider uppercase">
                <th className={headCell}>SUBJECT & THEME</th>
                <th className={headCell}>RECIPIENTS</th>
                <th className={`${headCell} text-center`}>ATTACHMENT</th>
                <th className={headCell}>SENT DATE</th>
                <th className={`${headCell} text-center`}>STATUS</th>
                <th className={`${headCell} text-center`}>ACTIONS</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-7 h-7 border-2 border-purple-200 border-t-[#33077C] rounded-full animate-spin" />
                      <span className="text-xs text-slate-500">Loading announcements...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    <div className="flex flex-col items-center gap-2">
                      <Megaphone className="w-8 h-8 text-slate-300" />
                      <span className="text-sm text-slate-500">
                        {appliedSearch || appliedAudience !== 'ALL'
                          ? 'No announcements match your filters.'
                          : 'No announcements yet. Click “Add Announcement” to create one.'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-5 border border-slate-200 align-top max-w-[360px]">
                      <div className="font-bold text-slate-900 truncate">{a.subject}</div>
                      <div className="text-xs text-[#33077C] font-semibold mt-0.5">
                        {a.theme}
                        {a.code ? <span className="text-slate-400 font-medium"> · {a.code}</span> : null}
                      </div>
                    </td>
                    <td className="py-4 px-5 border border-slate-200 align-top">
                      <div className="font-semibold text-slate-700">{recipientsLabel(a)}</div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">
                        {a.recipientCount} organization{a.recipientCount === 1 ? '' : 's'}
                      </div>
                    </td>
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
                    <td className="py-4 px-5 border border-slate-200 font-semibold text-slate-700">{formatDate(a.sentAt)}</td>
                    <td className="py-4 px-5 border border-slate-200 text-center">
                      <StatusBadge status={a.status} tones={STATUS_TONES} />
                    </td>
                    <td className="py-4 px-5 border border-slate-200">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => openAnnouncement(a)}
                          title="View"
                          className="w-8 h-8 rounded-lg bg-indigo-50 text-[#33077C] hover:bg-indigo-100 flex items-center justify-center cursor-pointer transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(a)}
                          title="Delete"
                          className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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

      {/* View */}
      <Modal
        isOpen={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.subject || 'Announcement'}
        subtitle={viewing ? `${viewing.theme} · ${formatDate(viewing.sentAt)}` : ''}
        maxWidth="4xl"
        headerGradient={true}
        showBackIcon={true}
        hideCloseButton={true}
      >
        {viewing && (
          <div className="space-y-4 p-2 sm:p-4" aria-busy={opening}>
            <div className="flex flex-wrap items-center gap-3">
              {(['message', 'delivery'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setViewTab(tab)}
                  className={`h-10 px-6 inline-flex items-center gap-2 rounded-lg text-xs sm:text-[13px] font-bold cursor-pointer transition-all active:scale-[0.98] ${
                    viewTab === tab
                      ? 'bg-[#33077C] text-white shadow-md'
                      : 'bg-white text-slate-700 border border-slate-200 shadow-xs hover:bg-slate-50'
                  }`}
                >
                  {viewTab === tab && <Check className="w-4 h-4 stroke-[2.5]" />}
                  {tab === 'message' ? 'Message' : 'Delivery'}
                </button>
              ))}
            </div>

            {viewTab === 'delivery' ? (
              <AnnouncementDeliveryPanel
                announcementId={viewing.id}
                totals={viewing.delivery}
                onError={(message) => toastRef.current?.('error', 'Delivery results', message)}
              />
            ) : (
              <>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
              <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-[#33077C] border border-indigo-100">
                {recipientsLabel(viewing)} · {viewing.recipientCount}
              </span>
            </div>
            {viewing.recipientMode === 'SELECTED' && (viewing.recipients || []).length > 0 && (
              <p className="text-xs font-medium text-slate-500">
                To: {(viewing.recipients || []).map((r) => r.name).join(', ')}
              </p>
            )}
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
              </>
            )}
          </div>
        )}
      </Modal>

      <ConfirmationModal
        isOpen={!!deleting}
        onClose={() => {
          if (!isDeleting) setDeleting(null);
        }}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        type="Delete"
        itemTypeLabel="Announcement"
        itemName={deleting?.subject}
        title="Delete Announcement"
      />
    </div>
  );
};
