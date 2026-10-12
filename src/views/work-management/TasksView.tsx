import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ColumnDef } from '@tanstack/react-table';
import { useAuth } from '../../context/AuthContext';
import { useTasks, useTodayWork, useUpdateTask, useLeads } from '../../hooks/useQueries';
import { useAppDispatch } from '../../hooks/redux';
import { baseApi } from '../../api/baseApi';
import { api } from '../../services/api';
import { TaskItem, TaskPriority, TaskStatus, Lead } from '../../types';
import { LeadFeedbackSchema, LeadFeedbackFormData } from '../../validations';
import { FormError } from '../../components/common/FormError';
import {
  CheckSquare,
  Calendar,
  Clock,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Trash2,
  List,
  Sparkles,
  Phone,
  MessageCircle,
  Mail,
  UserCheck,
  Building2,
  MessageSquare,
  ArrowRight,
  User,
  History,
  Check,
  Search,
} from 'lucide-react';
import { getStatusBadge } from '../../components/common/Badge';
import { DataTable } from '../../components/common/DataTable';
import { TaskFormModal } from '../../components/forms/TaskFormModal';
import { Modal } from '../../components/common/Modal';
import { CustomSelect } from '../../components/common/CustomSelect';
import Tooltip from '@mui/material/Tooltip';

interface TasksViewProps {
  initialCreateOpen?: boolean;
  onCloseInitialCreate?: () => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  initialCreateOpen = false,
  onCloseInitialCreate,
}) => {
  const dispatch = useAppDispatch();
  const { currentUser, users, isAdmin, showToast } = useAuth();
  const { data: tasks = [], isLoading: loading, refetch: loadTasks } = useTasks();
  const { data: todayWork, refetch: loadTodayWork } = useTodayWork();
  const { data: leads = [], refetch: loadLeads } = useLeads();
  const updateTaskMutation = useUpdateTask();

  const [activeTab, setActiveTab] = useState<'today' | 'followups' | 'all'>('today');

  // Filters
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterStaff, setFilterStaff] = useState('ALL');

  // Lead Follow-up Search & Filters
  const [leadSearch, setLeadSearch] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(initialCreateOpen);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  // Quick Log Feedback Modal State
  const [selectedLeadForFeedback, setSelectedLeadForFeedback] = useState<Lead | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const {
    register: registerFeedback,
    handleSubmit: handleSubmitFeedback,
    reset: resetFeedback,
    formState: { errors: feedbackErrors, isSubmitting: isSavingFeedback },
  } = useForm<LeadFeedbackFormData>({
    resolver: zodResolver(LeadFeedbackSchema),
    defaultValues: {
      leadFeedback: '',
      newStatus: 'Follow-up',
      nextDate: '',
      nextAction: '',
      callNotes: '',
    },
  });

  const handleCopy = (e: React.MouseEvent, text: string, key: string) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  const handleToggleTaskStatus = async (task: TaskItem) => {
    const nextStatus: TaskStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    try {
      await updateTaskMutation.mutateAsync({
        id: task.id,
        data: {
          status: nextStatus,
          completedAt: nextStatus === 'Completed' ? new Date().toISOString() : undefined,
        },
      });
      showToast('info', 'Task Updated', `Marked as ${nextStatus}`);
    } catch (e: any) {
      // Handled in hook
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.deleteTask(taskId);
      showToast('info', 'Task Deleted', 'Task removed.');
      loadTasks();
      loadTodayWork();
    } catch (e: any) {
      showToast('error', 'Delete Failed', e.message);
    }
  };

  const openFeedbackModal = (lead: Lead) => {
    setSelectedLeadForFeedback(lead);
    resetFeedback({
      leadFeedback: lead.feedback || '',
      callNotes: '',
      newStatus: lead.status || 'Follow-up',
      nextDate: lead.nextFollowUpDate ? lead.nextFollowUpDate.split('T')[0] : '',
      nextAction: lead.nextAction || '',
    });
  };

  const handleSaveFeedback = async (data: LeadFeedbackFormData) => {
    if (!selectedLeadForFeedback) return;
    try {
      await api.updateLead(selectedLeadForFeedback.id, {
        feedback: data.leadFeedback,
        status: data.newStatus as any,
        nextFollowUpDate: data.nextDate ? `${data.nextDate}T10:00` : undefined,
        nextAction: data.nextAction,
        contactedBy: currentUser?.name || 'Staff',
      });

      if (data.callNotes) {
        await api.addLeadFollowUp(selectedLeadForFeedback.id, {
          type: 'Call',
          notes: data.callNotes,
          outcome: data.leadFeedback || 'Follow-up call completed',
          nextActionDate: data.nextDate,
        });
      }

      showToast('success', 'Feedback Recorded', `Updated status & notes for ${selectedLeadForFeedback.company || selectedLeadForFeedback.name}`);
      setSelectedLeadForFeedback(null);
      dispatch(baseApi.util.invalidateTags([{ type: 'Lead', id: 'LIST' }, 'Task']));
    } catch (err: any) {
      showToast('error', 'Save Failed', err.message || 'Could not save feedback');
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesPriority = filterPriority === 'ALL' || t.priority === filterPriority;
      const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;
      const matchesStaff = filterStaff === 'ALL' || t.assignedStaffId === filterStaff;
      return matchesPriority && matchesStatus && matchesStaff;
    });
  }, [tasks, filterPriority, filterStatus, filterStaff]);

  const filteredLeadFollowups = useMemo(() => {
    return leads.filter((l) => {
      const q = leadSearch.toLowerCase();
      const matchesSearch =
        (l.name || '').toLowerCase().includes(q) ||
        (l.company || '').toLowerCase().includes(q) ||
        (l.assignedStaffName || '').toLowerCase().includes(q) ||
        (l.feedback || '').toLowerCase().includes(q);
      const matchesStatus = leadStatusFilter === 'ALL' || l.status === leadStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [leads, leadSearch, leadStatusFilter]);

  const tableColumns = useMemo<ColumnDef<TaskItem>[]>(
    () => [
      {
        id: 'completed',
        header: '',
        cell: ({ row }) => {
          const task = row.original;
          const isDone = task.status === 'Completed';
          return (
            <button
              onClick={() => handleToggleTaskStatus(task)}
              className={`p-1 rounded transition-colors ${
                isDone ? 'text-emerald-600' : 'text-slate-300 hover:text-slate-500'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          );
        },
      },
      {
        accessorKey: 'title',
        header: 'Task & Details',
        cell: ({ row }) => (
          <div>
            <span
              className={`font-bold text-xs ${
                row.original.status === 'Completed'
                  ? 'line-through text-slate-400'
                  : 'text-slate-900'
              }`}
            >
              {row.original.title}
            </span>
            {row.original.description && (
              <p className="text-[11px] text-slate-500 line-clamp-1">{row.original.description}</p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'targetName',
        header: 'Target / Scope',
        cell: ({ row }) => (
          <div>
            <span className="font-semibold text-[#33077C]">{row.original.targetName}</span>
            <span className="block text-[10px] text-slate-400">{row.original.targetType}</span>
          </div>
        ),
      },
      {
        accessorKey: 'assignedStaffName',
        header: 'Assignee',
        cell: ({ row }) => (
          <span className="font-medium text-slate-800">{row.original.assignedStaffName || 'Staff'}</span>
        ),
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: ({ row }) => (
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              row.original.priority === 'High'
                ? 'bg-rose-50 text-rose-700'
                : row.original.priority === 'Medium'
                ? 'bg-amber-50 text-amber-700'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {row.original.priority}
          </span>
        ),
      },
      {
        accessorKey: 'dueDate',
        header: 'Due Date',
        cell: ({ row }) => (
          <span className="font-mono text-[11px] text-slate-600">{row.original.dueDate}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => getStatusBadge(row.original.status),
      },
      {
        id: 'actions',
        header: () => <span className="text-right block">Actions</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Tooltip title="Delete Task">
              <button
                onClick={() => handleDeleteTask(row.original.id)}
                className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <CheckSquare className="w-6 h-6 text-[#33077C]" />
            <span>Today's Tasks</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track daily task commitments, follow-up feedback, and manage your work schedule.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingTask(null);
            setIsCreateModalOpen(true);
          }}
          className="h-11 px-6 bg-[#4309A2] hover:bg-[#e67e00] text-white text-sm font-bold rounded-xl shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create Task</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/70 max-w-2xl">
        <button
          onClick={() => setActiveTab('today')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'today'
              ? 'bg-white text-[#33077C] shadow-sm border border-slate-200/50'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Sparkles className={`w-4 h-4 ${activeTab === 'today' ? 'text-[#4309A2]' : 'text-slate-400'}`} />
          <span>Today's Work Schedule</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold ${
            activeTab === 'today' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-600'
          }`}>
            {(todayWork?.tasks?.length || 0) + (todayWork?.followUps?.length || 0)}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('followups')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'followups'
              ? 'bg-white text-[#33077C] shadow-sm border border-slate-200/50'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <MessageSquare className={`w-4 h-4 ${activeTab === 'followups' ? 'text-purple-600' : 'text-slate-400'}`} />
          <span>Lead Follow-up Tracking</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold ${
            activeTab === 'followups' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-600'
          }`}>
            {leads.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'all'
              ? 'bg-white text-[#33077C] shadow-sm border border-slate-200/50'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <List className={`w-4 h-4 ${activeTab === 'all' ? 'text-blue-600' : 'text-slate-400'}`} />
          <span>All Tasks</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold ${
            activeTab === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
          }`}>
            {tasks.length}
          </span>
        </button>
      </div>

      {/* TAB 1: TODAY'S SCHEDULE */}
      {activeTab === 'today' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Section 1: Today's Tasks */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#4309A2]" />
                <span>Scheduled Tasks Due Today</span>
              </h3>
              <span className="text-xs font-semibold text-slate-400">
                {todayWork?.tasks?.length || 0} tasks pending
              </span>
            </div>

            {todayWork?.tasks && todayWork.tasks.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {todayWork.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="py-3.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/50 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleTaskStatus(task)}
                        className={`p-1 rounded cursor-pointer ${
                          task.status === 'Completed' ? 'text-emerald-600' : 'text-slate-300 hover:text-slate-600'
                        }`}
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                      <div>
                        <span
                          className={`font-bold text-[13px] ${
                            task.status === 'Completed'
                              ? 'line-through text-slate-400'
                              : 'text-slate-900'
                          }`}
                        >
                          {task.title}
                        </span>
                        <span className="block text-xs text-slate-500 mt-0.5">
                          Scope: <strong className="text-[#33077C]">{task.targetName}</strong> &bull; Assignee: <strong>{task.assignedStaffName}</strong>
                        </span>
                      </div>
                    </div>
                    <div>{getStatusBadge(task.status)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-8 text-center bg-slate-50/50 rounded-xl">
                No tasks scheduled for today.
              </div>
            )}
          </div>

          {/* Section 2: Lead Follow-up Calls & Progress Tracking */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#33077C]" />
                  <span>Lead Follow-up Calls & Feedback Summary</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Who followed the lead, current lead status, and feedback recorded
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('followups')}
                className="text-xs font-bold text-[#4309A2] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Tracking</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {todayWork?.followUps && todayWork.followUps.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {todayWork.followUps.map((lead) => (
                  <div
                    key={lead.id}
                    className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-orange-200 hover:shadow-sm transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">
                          {lead.name}
                        </div>
                        <div className="text-xs font-medium text-[#33077C]">
                          {lead.company}
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        lead.status === 'Converted' ? 'bg-emerald-50 text-emerald-700' :
                        lead.status === 'Interested' ? 'bg-purple-50 text-purple-700' :
                        lead.status === 'Onboarding' ? 'bg-cyan-50 text-cyan-700' :
                        'bg-orange-50 text-orange-700'
                      }`}>
                        {lead.status}
                      </span>
                    </div>

                    {/* Who Followed the Lead */}
                    <div className="flex items-center gap-2 text-xs text-slate-600 bg-white/80 p-2 rounded-xl border border-slate-100">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Followed by: <strong className="text-slate-900">{lead.assignedStaffName || 'Staff'}</strong></span>
                      {lead.contactDate && (
                        <span className="text-[10px] text-slate-400">({lead.contactDate.split('T')[0]})</span>
                      )}
                    </div>

                    {/* What the Lead Said / Feedback */}
                    <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900">
                        <MessageSquare className="w-3 h-3 text-amber-600" />
                        <span>Lead Feedback & Notes:</span>
                      </div>
                      <p className="text-xs text-slate-800 italic leading-relaxed">
                        "{lead.feedback || lead.requirements || 'No call feedback logged yet.'}"
                      </p>
                    </div>

                    {/* Bottom Quick Call & Log Feedback Action */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 gap-2">
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Next: {lead.nextFollowUpDate ? lead.nextFollowUpDate.split('T')[0] : 'Today'}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <div className="relative group">
                          <button
                            type="button"
                            onClick={(e) => handleCopy(e, lead.phone || '', `today-${lead.id}-phone`)}
                            className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </button>
                          <div className={`transition-all duration-200 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 text-white text-[11px] font-semibold rounded-lg shadow-lg whitespace-nowrap z-30 ${
                            copiedKey === `today-${lead.id}-phone`
                              ? 'opacity-100 bg-emerald-600 scale-100'
                              : 'opacity-0 group-hover:opacity-100 bg-slate-900'
                          }`}>
                            {copiedKey === `today-${lead.id}-phone` ? 'Phone number copied' : (lead.phone || 'No phone')}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => openFeedbackModal(lead)}
                          className="px-3 py-1.5 bg-[#33077C] hover:bg-[#432eb5] text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                        >
                          Log Feedback
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-8 text-center bg-slate-50/50 rounded-xl">
                No lead follow-ups due today.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DEDICATED LEAD FOLLOW-UP TRACKING VIEW */}
      {activeTab === 'followups' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Filter & Search Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search lead by name, company, assignee, or feedback keywords..."
                value={leadSearch}
                onChange={(e) => setLeadSearch(e.target.value)}
                className="w-full h-11 pl-10 pr-4 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200/80 focus:border-[#4309A2] rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all"
              />
            </div>

            <CustomSelect
              value={leadStatusFilter}
              onChange={(val) => setLeadStatusFilter(val)}
              options={[
                { value: 'ALL', label: 'All Lead Statuses' },
                { value: 'New', label: 'New' },
                { value: 'Contacted', label: 'Contacted' },
                { value: 'Interested', label: 'Interested' },
                { value: 'Follow-up', label: 'Follow-up' },
                { value: 'Onboarding', label: 'Onboarding' },
                { value: 'Converted', label: 'Converted' },
                { value: 'Lost', label: 'Lost' },
              ]}
              className="w-full sm:w-52 shrink-0"
              activeColor="emerald"
            />
          </div>

          {/* Lead Follow-up Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredLeadFollowups.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30 text-purple-400" />
                <p className="font-bold text-slate-700 text-sm">No lead follow-ups found</p>
                <p className="text-xs text-slate-400 mt-0.5">Try searching with a different term or adjust the status filter.</p>
              </div>
            ) : (
              filteredLeadFollowups.map((lead) => (
                <div
                  key={lead.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3.5">
                    {/* Top Header */}
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">
                          {lead.company || lead.name}
                        </h4>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Contact: <strong className="text-slate-800">{lead.name}</strong> {lead.designation ? `(${lead.designation})` : ''}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                        lead.status === 'Converted' ? 'bg-emerald-50 text-emerald-700' :
                        lead.status === 'Interested' ? 'bg-purple-50 text-purple-700' :
                        lead.status === 'Onboarding' ? 'bg-cyan-50 text-cyan-700' :
                        lead.status === 'Lost' ? 'bg-rose-50 text-rose-700' :
                        'bg-orange-50 text-orange-700'
                      }`}>
                        {lead.status}
                      </span>
                    </div>

                    {/* 1. Who Followed the Lead */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="flex items-center gap-1.5 font-bold text-slate-700">
                          <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                          <span>Who Followed the Lead:</span>
                        </span>
                        <span className="font-extrabold text-[#33077C]">
                          {lead.assignedStaffName || 'Alex Rivera'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60">
                        <span>Offering: <strong>{lead.interestedProductOrService || 'OmniFlow ERP'}</strong></span>
                        <span>Source: <strong>{lead.leadSource || 'Direct'}</strong></span>
                      </div>
                    </div>

                    {/* 2. What the Lead Says / Feedback */}
                    <div className="p-3.5 bg-amber-50/80 border border-amber-200/70 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
                        <span className="flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                          <span>What Lead Says (Feedback):</span>
                        </span>
                        <span className="text-[10px] text-amber-700 font-semibold">Voice of Client</span>
                      </div>
                      <p className="text-xs text-slate-800 font-medium italic leading-relaxed bg-white/70 p-2 rounded-lg border border-amber-100">
                        "{lead.feedback || lead.requirements || 'No feedback recorded yet. Click Log Feedback to add conversation notes.'}"
                      </p>
                    </div>

                    {/* 3. Next Follow-up & Action Commitment */}
                    <div className="flex items-center justify-between text-xs p-2.5 bg-purple-50/60 rounded-xl border border-purple-100">
                      <span className="font-semibold text-purple-900 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-purple-600" />
                        <span>Next Follow-up:</span>
                      </span>
                      <span className="font-bold text-purple-700">
                        {lead.nextFollowUpDate ? lead.nextFollowUpDate.split('T')[0] : 'Not Scheduled'}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {/* Phone */}
                      <div className="relative group">
                        <button
                          type="button"
                          onClick={(e) => handleCopy(e, lead.phone || '', `followup-${lead.id}-phone`)}
                          className="w-8.5 h-8.5 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                        >
                          <Phone className="w-4 h-4" />
                        </button>
                        <div className={`transition-all duration-200 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 text-white text-[11px] font-semibold rounded-lg shadow-lg whitespace-nowrap z-30 ${
                          copiedKey === `followup-${lead.id}-phone`
                            ? 'opacity-100 bg-emerald-600 scale-100'
                            : 'opacity-0 group-hover:opacity-100 bg-slate-900'
                        }`}>
                          {copiedKey === `followup-${lead.id}-phone` ? 'Phone number copied' : (lead.phone || 'No phone')}
                        </div>
                      </div>

                      {/* WhatsApp */}
                      <div className="relative group">
                        <button
                          type="button"
                          onClick={(e) => handleCopy(e, lead.whatsapp || lead.phone || '', `followup-${lead.id}-wa`)}
                          className="w-8.5 h-8.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <div className={`transition-all duration-200 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 text-white text-[11px] font-semibold rounded-lg shadow-lg whitespace-nowrap z-30 ${
                          copiedKey === `followup-${lead.id}-wa`
                            ? 'opacity-100 bg-emerald-600 scale-100'
                            : 'opacity-0 group-hover:opacity-100 bg-slate-900'
                        }`}>
                          {copiedKey === `followup-${lead.id}-wa` ? 'WhatsApp number copied' : (lead.whatsapp || lead.phone || 'No WhatsApp')}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openFeedbackModal(lead)}
                      className="px-4 py-2 bg-[#33077C] hover:bg-[#432eb5] text-white rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-xs"
                    >
                      Update Feedback & Status
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ALL TASKS TABLE */}
      {activeTab === 'all' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-xs flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Filter className="w-3.5 h-3.5 text-[#4309A2]" />
              <span>Filters:</span>
            </div>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-[#33077C]"
            >
              <option value="ALL">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-[#33077C]"
            >
              <option value="ALL">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>

            <select
              value={filterStaff}
              onChange={(e) => setFilterStaff(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-[#33077C]"
            >
              <option value="ALL">All Staff</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <DataTable
            columns={tableColumns}
            data={filteredTasks}
            searchPlaceholder="Search tasks by title, scope, or assignee..."
            pageSize={10}
          />
        </div>
      )}

      {/* Quick Log Call Feedback Modal */}
      {selectedLeadForFeedback && (
        <Modal
          isOpen={!!selectedLeadForFeedback}
          onClose={() => setSelectedLeadForFeedback(null)}
          title={`Log Call Feedback: ${selectedLeadForFeedback.company || selectedLeadForFeedback.name}`}
          maxWidth="md"
        >
          <form noValidate onSubmit={handleSubmitFeedback(handleSaveFeedback)} className="space-y-4">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs space-y-1">
              <div>Prospect: <strong>{selectedLeadForFeedback.name}</strong> ({selectedLeadForFeedback.company})</div>
              <div>Staff Handler: <strong>{selectedLeadForFeedback.assignedStaffName || currentUser?.name}</strong></div>
              <div>Phone: <strong>{selectedLeadForFeedback.phone}</strong></div>
            </div>

            {/* What the lead said / Feedback */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                What the Lead Said (Feedback & Conversation Notes) *
              </label>
              <textarea
                rows={3}
                {...registerFeedback('leadFeedback')}
                placeholder="e.g. Client loved the demo, requested pricing discount for 20 seats and contract review..."
                className={`w-full p-3 bg-white border rounded-xl text-xs text-slate-800 outline-none resize-none font-medium ${
                  feedbackErrors.leadFeedback ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20' : 'border-slate-200 focus:border-[#4309A2] focus:ring-2 focus:ring-orange-500/10'
                }`}
              />
              <FormError message={feedbackErrors.leadFeedback?.message} />
            </div>

            {/* Current Status Update */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Updated Lead Status
                </label>
                <select
                  {...registerFeedback('newStatus')}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-[#4309A2]"
                >
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Interested">Interested</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Onboarding">Onboarding</option>
                  <option value="Converted">Converted</option>
                  <option value="Not Interested">Not Interested</option>
                  <option value="Lost">Lost</option>
                </select>
                <FormError message={feedbackErrors.newStatus?.message} />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Next Follow-up Date
                </label>
                <input
                  type="date"
                  {...registerFeedback('nextDate')}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-[#4309A2]"
                />
                <FormError message={feedbackErrors.nextDate?.message} />
              </div>
            </div>

            {/* Next Action Commitment */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Next Action / Commitment
              </label>
              <input
                type="text"
                {...registerFeedback('nextAction')}
                placeholder="e.g. Send revised contract with 10% annual billing discount"
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-[#4309A2]"
              />
              <FormError message={feedbackErrors.nextAction?.message} />
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedLeadForFeedback(null)}
                className="h-11 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm cursor-pointer transition-colors flex items-center justify-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingFeedback}
                className="h-11 px-6 bg-[#4309A2] hover:bg-[#e67e00] text-white font-bold rounded-xl text-sm cursor-pointer shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                {isSavingFeedback ? 'Saving...' : 'Save Feedback & Update Status'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Task Form Modal */}
      <TaskFormModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingTask(null);
          if (onCloseInitialCreate) onCloseInitialCreate();
        }}
        initialTask={editingTask}
      />
    </div>
  );
};

