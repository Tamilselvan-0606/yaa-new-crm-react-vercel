import React, { useCallback, useEffect, useState } from 'react';
import { SearchBar } from '../../components/common/SearchBar';
import { FilterDropdown } from '../../components/common/FilterDropdown';
import { Pagination } from '../../components/common/Pagination';
import { StatusBadge, StatusTone } from '../../components/common/StatusBadge';
import { announcementApi } from '../../api/platform/announcementApi';
import type { AnnouncementDeliveryTotals, AnnouncementRecipientResult } from '../../api/platform/announcementTypes';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';

const DELIVERY_TONES: Record<string, StatusTone> = {
  Delivered: { wrap: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  Pending: { wrap: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', pulse: true },
  Failed: { wrap: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
};

const EMAIL_TONES: Record<string, StatusTone> = {
  Sent: { wrap: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  Pending: { wrap: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', pulse: true },
  Failed: { wrap: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  Skipped: { wrap: 'bg-slate-100 text-slate-700 border-slate-300', dot: 'bg-slate-400' },
};

const formatDateTime = (iso?: string | null) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

interface Props {
  announcementId: string;
  /** Totals from the announcement itself (GET by id). */
  totals?: AnnouncementDeliveryTotals;
  onError?: (message: string) => void;
}

/** Delivery results of one announcement, per organization (GET /platform/announcements/{id}/recipients). */
export const AnnouncementDeliveryPanel: React.FC<Props> = ({ announcementId, totals, onError }) => {
  const [rows, setRows] = useState<AnnouncementRecipientResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pendingStatus, setPendingStatus] = useState('ALL');
  const [appliedStatus, setAppliedStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await announcementApi.recipients(announcementId, {
        page_no: page,
        page_size: pageSize,
        search: appliedSearch.trim() || undefined,
        deliveryStatus: appliedStatus === 'ALL' ? undefined : (appliedStatus as 'Pending' | 'Delivered' | 'Failed'),
        isRead: appliedStatus === 'READ' ? true : appliedStatus === 'UNREAD' ? false : undefined,
      });
      setRows(Array.isArray(res?.data) ? res.data : []);
      setTotal(res?.pagination?.totalRecords ?? res?.data?.length ?? 0);
    } catch (err) {
      setRows([]);
      setTotal(0);
      onError?.(getApiErrorMessage(err, 'Could not load the delivery results.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcementId, page, pageSize, appliedSearch, appliedStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const cards = [
    { label: 'Delivered', value: totals?.delivered, cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    { label: 'Failed', value: totals?.failed, cls: 'text-rose-700 bg-rose-50 border-rose-200' },
    { label: 'Pending', value: totals?.pending, cls: 'text-amber-700 bg-amber-50 border-amber-200' },
    { label: 'Read', value: totals?.read, cls: 'text-[#33077C] bg-indigo-50 border-indigo-100' },
  ];

  const headCell = 'py-3 px-4 border border-[#33077C]/30 bg-[#33077C] text-white';

  return (
    <div className="space-y-4">
      {totals && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {cards.map((c) => (
            <div key={c.label} className={`rounded-xl border px-4 py-3 ${c.cls}`}>
              <div className="text-[11px] font-bold uppercase tracking-wider opacity-80">{c.label}</div>
              <div className="text-xl font-bold mt-0.5">{c.value ?? 0}</div>
            </div>
          ))}
        </div>
      )}

      <SearchBar
        value={pendingSearch}
        onChange={setPendingSearch}
        placeholder="Search by organization name or code..."
        onSubmit={() => {
          setAppliedSearch(pendingSearch);
          setAppliedStatus(pendingStatus);
          setPage(1);
        }}
        onReset={() => {
          setPendingSearch('');
          setAppliedSearch('');
          setPendingStatus('ALL');
          setAppliedStatus('ALL');
          setPage(1);
        }}
        filterSlot={
          <FilterDropdown
            options={[
              { label: 'Delivery : All', value: 'ALL' },
              { label: 'Delivered', value: 'Delivered', dotColor: '#10b981' },
              { label: 'Pending', value: 'Pending', dotColor: '#f59e0b' },
              { label: 'Failed', value: 'Failed', dotColor: '#f43f5e' },
              { label: 'Read', value: 'READ', dotColor: '#33077C' },
              { label: 'Not read', value: 'UNREAD', dotColor: '#94a3b8' },
            ]}
            value={pendingStatus}
            onChange={setPendingStatus}
            placeholder="Delivery : All"
          />
        }
        rightSlot={
          <span className="text-xs font-semibold text-slate-500 pr-1">
            Organizations : <span className="text-[#33077C] font-bold">{total}</span>
          </span>
        }
      />

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200 min-w-[760px]">
            <thead>
              <tr className="text-[11px] font-bold tracking-wider uppercase">
                <th className={headCell}>ORGANIZATION</th>
                <th className={`${headCell} text-center`}>DELIVERY</th>
                <th className={`${headCell} text-center`}>EMAIL</th>
                <th className={headCell}>DELIVERED</th>
                <th className={headCell}>READ</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400 border border-slate-200 font-medium">
                    Loading delivery results…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400 border border-slate-200 font-medium">
                    No organizations found.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.organizationId} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 border border-slate-200 align-top">
                      <div className="font-bold text-slate-900">{r.name}</div>
                      {r.code && <div className="text-[11px] text-slate-500 font-medium mt-0.5">{r.code}</div>}
                    </td>
                    <td className="py-3 px-4 border border-slate-200 text-center align-top">
                      <StatusBadge status={r.deliveryStatus} tones={DELIVERY_TONES} />
                    </td>
                    <td className="py-3 px-4 border border-slate-200 text-center align-top">
                      {r.emailStatus ? <StatusBadge status={r.emailStatus} tones={EMAIL_TONES} /> : <span className="text-slate-300">-</span>}
                      {!!r.emailAttempts && r.emailAttempts > 1 && (
                        <div className="text-[11px] text-slate-500 font-medium mt-1">{r.emailAttempts} attempts</div>
                      )}
                      {r.error && <div className="text-[11px] text-rose-600 font-medium mt-1 max-w-[200px] mx-auto">{r.error}</div>}
                    </td>
                    <td className="py-3 px-4 border border-slate-200 font-semibold text-slate-600 align-top">{formatDateTime(r.deliveredAt)}</td>
                    <td className="py-3 px-4 border border-slate-200 font-semibold align-top">
                      {r.readAt ? <span className="text-slate-600">{formatDateTime(r.readAt)}</span> : <span className="text-slate-400">Not read</span>}
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
    </div>
  );
};
