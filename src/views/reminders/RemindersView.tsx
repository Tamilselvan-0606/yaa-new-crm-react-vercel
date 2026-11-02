import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useActiveOrgType } from '../../hooks/useActiveOrgType';
import { formatDateTimeAmPm } from '../../api/platform/adminNotificationApi';
import { CATEGORIES } from '../../utils/notificationCategories';
import { ReminderItem, ReminderType } from '../../types';
import {
  Bell,
  CheckCircle2,
  Clock,
  AlertCircle,
  Repeat,
  CheckSquare,
  CheckCheck,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { SearchBar } from '../../components/common/SearchBar';
import { FilterDropdown } from '../../components/common/FilterDropdown';
import { Button } from '../../components/common/Button';
import { Pagination } from '../../components/common/Pagination';
import { Badge } from '../../components/common/Badge';

export const RemindersView: React.FC = () => {
  const {
    isAdmin,
    reminders,
    refreshReminders,
    markReminderCompleted,
    markAllRemindersRead,
    showToast,
  } = useAuth();

  const { isSaleManagement } = useActiveOrgType();
  const notificationType = isSaleManagement ? 'SALES' : 'CLIENT';

  // Search & Filter State
  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pendingStatus, setPendingStatus] = useState('ALL');
  const [appliedStatus, setAppliedStatus] = useState('ALL');
  const [pendingCategory, setPendingCategory] = useState('ALL');
  const [appliedCategory, setAppliedCategory] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  useEffect(() => {
    refreshReminders(notificationType);
  }, [notificationType]);

  const handleMarkAllRead = async () => {
    try {
      setIsMarkingAll(true);
      // markAllRemindersRead() already shows the success toast; do not add a second one here.
      await markAllRemindersRead();
      await refreshReminders(notificationType);
    } catch (e: any) {
      showToast?.('error', 'Failed to mark read', e.message || 'An error occurred');
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleResolveReminder = async (id: string) => {
    try {
      setMarkingId(id);
      // markReminderCompleted() shows its own success / failure toast (and does not throw on failure),
      // so no extra success toast here: it would duplicate the message and also appear after a failure.
      await markReminderCompleted(id);
      await refreshReminders(notificationType);
    } catch (e: any) {
      showToast?.('error', 'Failed to resolve', e.message || 'An error occurred');
    } finally {
      setMarkingId(null);
    }
  };

  const getReminderIcon = (type: ReminderType) => {
    switch (type) {
      case 'Lead Follow-up':
      case 'Overdue Follow-up':
        return <Clock className="w-4 h-4 text-[#4309A2]" />;
      case 'Task Deadline':
        return <CheckSquare className="w-4 h-4 text-purple-600" />;
      case 'Payment Due':
      case 'Payment Overdue':
        return <AlertCircle className="w-4 h-4 text-rose-500" />;
      case 'Subscription Expiry':
        return <Repeat className="w-4 h-4 text-amber-500" />;
      default:
        return <Bell className="w-4 h-4 text-[#4309A2]" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-rose-600">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            <span>Urgent</span>
          </span>
        );
      case 'High':
        return (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-amber-600">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <span>High Priority</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
            <span>Normal</span>
          </span>
        );
    }
  };

  // Filter & Search Logic
  const filteredReminders = useMemo(() => {
    return reminders.filter((rem) => {
      const matchesSearch =
        !appliedSearch.trim() ||
        rem.title.toLowerCase().includes(appliedSearch.toLowerCase()) ||
        rem.description.toLowerCase().includes(appliedSearch.toLowerCase()) ||
        (rem.category || rem.type).toLowerCase().includes(appliedSearch.toLowerCase());

      const matchesStatus =
        appliedStatus === 'ALL' ||
        (appliedStatus === 'UNCOMPLETED' && !rem.isCompleted) ||
        (appliedStatus === 'COMPLETED' && rem.isCompleted);

      const matchesCategory =
        appliedCategory === 'ALL' || (rem.category || rem.type) === appliedCategory;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [reminders, appliedSearch, appliedStatus, appliedCategory]);

  // Category filter lists the areas of the active management type
  const categoryOptions = useMemo(
    () => [{ label: 'Category : All', value: 'ALL' }, ...CATEGORIES[notificationType].map((n) => ({ label: n, value: n }))],
    [notificationType],
  );

  // A category of the other management type no longer applies after switching
  useEffect(() => {
    setPendingCategory('ALL');
    setAppliedCategory('ALL');
    setPage(1);
  }, [notificationType]);

  // Pagination Logic
  const pagedReminders = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredReminders.slice(startIndex, startIndex + pageSize);
  }, [filteredReminders, page, pageSize]);

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200 pb-12 font-sans">
      {/* 1. Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Reminders & Notifications
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            {isAdmin
              ? 'Company-wide operational notifications, scheduled tasks, and critical action items.'
              : 'Your personal action items and scheduled reminders.'}
          </p>
        </div>

        {/* Top Right Action Button: Mark All Read */}
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="primary"
            size="md"
            onClick={handleMarkAllRead}
            disabled={isMarkingAll}
            icon={<CheckCheck className="w-4 h-4 text-white" />}
          >
            {isMarkingAll ? 'Marking All...' : 'Mark All Read'}
          </Button>
        </div>
      </div>

      {/* 2. Search Bar & Dropdown Filter Row */}
      <SearchBar
        value={pendingSearch}
        onChange={(val) => setPendingSearch(val)}
        placeholder="Search reminders by title, description, category..."
        onSubmit={() => {
          setAppliedSearch(pendingSearch);
          setAppliedStatus(pendingStatus);
          setAppliedCategory(pendingCategory);
          setPage(1);
        }}
        onReset={() => {
          setPendingSearch('');
          setAppliedSearch('');
          setPendingStatus('ALL');
          setAppliedStatus('ALL');
          setPendingCategory('ALL');
          setAppliedCategory('ALL');
          setPage(1);
        }}
        filterSlot={
          <div className="flex items-center gap-2.5">
            {/* Status Dropdown */}
            <FilterDropdown
              options={[
                { label: 'Status : All', value: 'ALL' },
                { label: 'Unread', value: 'UNCOMPLETED', dotColor: '#f59e0b' },
                { label: 'Read', value: 'COMPLETED', dotColor: '#10b981' },
              ]}
              value={pendingStatus}
              onChange={(val) => setPendingStatus(val)}
              placeholder="Status : All"
            />

            {/* Category Dropdown */}
            <FilterDropdown
              options={categoryOptions}
              maxHeightClass="max-h-[70vh]"
              value={pendingCategory}
              onChange={(val) => setPendingCategory(val)}
              placeholder="Category : All"
            />
          </div>
        }
        rightSlot={
          <div className="flex items-center gap-3 pr-1">
            <span className="text-xs font-semibold text-slate-500">
              Total Reminders :{' '}
              <span className="text-[#33077C] font-bold">{filteredReminders.length}</span>
            </span>
          </div>
        }
      />

      {/* 3. Reminders Table with Signature Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200 min-w-[950px]">
            <thead>
              <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white tracking-wider uppercase">
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">NOTIFICATION</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-center">CATEGORY</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">PRIORITY</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">DATE & TIME</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">STATUS</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center w-[150px] whitespace-nowrap">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredReminders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500/80" />
                      <span className="text-xs text-slate-500 font-semibold">No reminders matching your criteria.</span>
                      <span className="text-[11px] text-slate-400">Everything is caught up and resolved!</span>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedReminders.map((rem) => {
                  const isResolved = rem.isCompleted;
                  return (
                    <tr
                      key={rem.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !rem.isRead ? 'bg-amber-50/20' : 'bg-white'
                      }`}
                    >
                      {/* 1. REMINDER & DETAILS */}
                      <td className="py-4 px-5 border border-slate-200">
                        <div className="flex items-start gap-3.5">
                          <div className="w-9 h-9 rounded-xl bg-[#33077C]/10 text-[#33077C] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                            {getReminderIcon(rem.type)}
                          </div>
                          <div className="min-w-0">
                            <h4
                              className={`text-sm tracking-tight ${
                                isResolved ? 'font-normal text-slate-600' : 'font-bold text-slate-900'
                              }`}
                            >
                              {rem.title}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                              {rem.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 2. CATEGORY */}
                      <td className="py-4 px-4 border border-slate-200 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-purple-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0" />
                          <span>{rem.category || rem.type}</span>
                        </span>
                      </td>

                      {/* 3. PRIORITY */}
                      <td className="py-4 px-5 border border-slate-200 text-center">
                        {getPriorityBadge(rem.priority)}
                      </td>

                      {/* 4. DUE DATE */}
                      <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap">
                        <span className="text-slate-700 font-medium text-xs sm:text-[13px]">
                          {formatDateTimeAmPm(rem.dueDate)}
                        </span>
                      </td>

                      {/* 5. STATUS */}
                      <td className="py-4 px-5 border border-slate-200 text-center">
                        {isResolved ? (
                          <Badge variant="success" size="sm" dot>
                            Read
                          </Badge>
                        ) : (
                          <Badge variant="warning" size="sm" dot>
                            Unread
                          </Badge>
                        )}
                      </td>

                      {/* 6. ACTIONS */}
                      <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap w-[150px]">
                        {isResolved ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 whitespace-nowrap">
                            <CheckCircle2 className="w-4 h-4" />
                            Read
                          </span>
                        ) : (
                          <button
                            onClick={() => handleResolveReminder(rem.id)}
                            disabled={markingId === rem.id}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#33077C] hover:bg-[#4309A2] active:scale-[0.98] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span className="whitespace-nowrap">{markingId === rem.id ? 'Marking...' : 'Mark as Read'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Pagination */}
      {filteredReminders.length > 0 && (
        <Pagination
          total={filteredReminders.length}
          currentPage={page}
          pageSize={pageSize}
          pageSizeOptions={[5, 10, 20, 50]}
          onPageChange={(newPage) => setPage(newPage)}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      )}
    </div>
  );
};
