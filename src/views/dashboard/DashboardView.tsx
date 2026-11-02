import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UsersRound, Clock, CheckSquare, Film, Calendar, Plus } from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { useNavigate } from 'react-router-dom';
import { useActiveOrgType } from '../../hooks/useActiveOrgType';
import { useScopeLock } from '../../hooks/useScopeLock';
import { SaleManagementDashboardView } from '../sale-management/dashboard/SaleManagementDashboardView';
import { OrgAdminDashboardView } from './OrgAdminDashboardView';
import { SubOrgAdminDashboardView } from './SubOrgAdminDashboardView';
import { BranchAdminDashboardView } from './BranchAdminDashboardView';
import { useLeads, useTasks, useContent } from '../../hooks/useQueries';

interface DashboardViewProps {
  onNavigateTab?: (tab: string) => void;
  onOpenQuickModal?: (modalType: 'lead' | 'task' | 'content' | 'onboarding') => void;
  onOpenAddLead?: () => void;
  onOpenCreateTask?: () => void;
  onOpenCreateContent?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateTab,
  onOpenQuickModal,
  onOpenAddLead,
  onOpenCreateTask,
  onOpenCreateContent,
}) => {
  const navigate = useNavigate();
  const { currentUser, isAdmin, isSuperAdmin } = useAuth();
  const { isSaleManagement, isClientOnly } = useActiveOrgType();
  const { isBranchAdmin, isSubOrgAdminLocked } = useScopeLock();

  // ==========================================
  // SALE MANAGEMENT SUITE DASHBOARD (INVENTORY, SALES HUB, PURCHASE, SALE REPORT)
  // ==========================================
  if (isSaleManagement && !isClientOnly) {
    return <SaleManagementDashboardView />;
  }

  const handleNavigate = (tab: string) => {
    if (onNavigateTab) {
      onNavigateTab(tab);
    } else {
      navigate(`/${tab}`);
    }
  };

  // ==========================================
  // ADMIN DASHBOARDS: one per login level (branch / sub-organization / organization)
  // ==========================================
  if (isAdmin && !isSuperAdmin) {
    if (isBranchAdmin) return <BranchAdminDashboardView />;
    if (isSubOrgAdminLocked) return <SubOrgAdminDashboardView />;
    return <OrgAdminDashboardView />;
  }


  const { data: leads = [] } = useLeads();
  const { data: tasks = [] } = useTasks();
  const { data: content = [] } = useContent();

  const today = new Date().toISOString().split('T')[0];
  const myLeads = leads.filter((l: any) => l.assignedStaffId === currentUser?.id);
  const myFollowUps = myLeads.filter((l: any) => l.nextFollowUpDate && l.nextFollowUpDate.startsWith(today));
  const myTasks = tasks.filter((t: any) => t.assignedStaffId === currentUser?.id && t.status !== 'Completed');
  const myTodayTasks = myTasks.filter((t: any) => t.dueDate === today);
  const myPendingContent = content.filter((c: any) => c.assignedStaffId === currentUser?.id && c.status !== 'Published');

  const stats = {
    myLeadsCount: myLeads.length,
    myFollowUpsCount: myFollowUps.length,
    myFollowUps,
    myTasksCount: myTasks.length,
    myTodayTasks,
    myPendingContentCount: myPendingContent.length,
    myRemindersCount: 0,
    myReminders: [],
  };

  // ==========================================
  // STAFF DASHBOARD
  // ==========================================
  return (
    <div className="space-y-6">
      {/* Staff Welcome Banner */}
      <div className="p-6 rounded-lg bg-[#33077C] text-white shadow-sm border border-purple-950/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#4309A2] text-white">
              Staff Workspace
            </span>
            <span className="text-xs text-purple-200 font-medium">
              {currentUser?.department}
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
            Hello, {currentUser?.name}
          </h2>
          <p className="text-xs text-purple-200/90 mt-1">
            Here are your assigned leads, tasks due today, and scheduled follow-ups.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenQuickModal('lead')}
            className="px-4 py-2 bg-[#4309A2] hover:bg-[#e67e00] text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add New Lead
          </button>
          <button
            onClick={() => onNavigateTab('tasks')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-md border border-white/20 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            Today's Work
          </button>
        </div>
      </div>

      {/* Staff Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigateTab('leads')}
          className="card p-4 hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              My Assigned Leads
            </span>
            <div className="stat-icon group-hover:bg-[#4309A2]/20 transition-colors">
              <UsersRound className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#1A1A1A]">
              {stats?.myLeadsCount || 0}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">In Pipeline</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {stats?.myFollowUpsCount || 0} scheduled for today
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('tasks')}
          className="card p-4 hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              My Active Tasks
            </span>
            <div className="stat-icon group-hover:bg-[#4309A2]/20 transition-colors">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#1A1A1A]">
              {stats?.myTasksCount || 0}
            </span>
            <span className="text-[11px] font-semibold text-amber-600">
              {(stats?.myTodayTasks || []).length} Due Today
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Direct action items assigned to you
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('content')}
          className="card p-4 hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Pending Content
            </span>
            <div className="stat-icon group-hover:bg-[#4309A2]/20 transition-colors">
              <Film className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#1A1A1A]">
              {stats?.myPendingContentCount || 0}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Reels/Posts</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Designing, editing & approval
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('reminders')}
          className="card p-4 hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Upcoming Reminders
            </span>
            <div className="stat-icon group-hover:bg-[#4309A2]/20 transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#1A1A1A]">
              {stats?.myRemindersCount || 0}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600">Active</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Follow-ups & task deadlines
          </p>
        </div>
      </div>

      {/* Staff Operational Split: Today's Tasks & Today's Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Follow-ups */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#4309A2]" />
                Today's Lead Follow-ups
              </h3>
              <p className="text-xs text-slate-500">Calls and messages scheduled for today</p>
            </div>
            <button
              onClick={() => onNavigateTab('leads')}
              className="text-xs font-semibold text-[#4309A2] hover:underline cursor-pointer"
            >
              Open CRM -&gt;
            </button>
          </div>

          {(stats?.myFollowUps || []).length === 0 ? (
            <div className="p-8 text-center bg-[#F5F7FA] rounded-md border border-dashed border-[#E2E8F0]">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">No follow-ups scheduled for today</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Check upcoming leads in the CRM board.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {(stats?.myFollowUps || []).map((lead: any) => (
                <div
                  key={lead.id}
                  className="p-3 bg-[#F5F7FA] rounded-md border border-[#E2E8F0] hover:border-purple-300 transition-colors flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#1A1A1A]">{lead.name}</span>
                      <span className="text-xs text-slate-500">({lead.company})</span>
                      <Badge variant="purple" size="sm">{lead.interestedProductOrService}</Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                      {lead.feedback || lead.requirements || 'Pending discovery'}
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigateTab('leads')}
                    className="px-3 py-1 bg-[#33077C] text-white text-xs font-semibold rounded-md hover:bg-[#432eb5] transition-colors cursor-pointer"
                  >
                    View Lead
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's Tasks */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                Tasks Due Today
              </h3>
              <p className="text-xs text-slate-500">Work assignments requiring your attention</p>
            </div>
            <button
              onClick={() => onNavigateTab('tasks')}
              className="text-xs font-semibold text-[#4309A2] hover:underline cursor-pointer"
            >
              Task Board -&gt;
            </button>
          </div>

          {(stats?.myTodayTasks || []).length === 0 ? (
            <div className="p-8 text-center bg-[#F5F7FA] rounded-md border border-dashed border-[#E2E8F0]">
              <CheckSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">No urgent tasks due today</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Explore your broader task list.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {(stats?.myTodayTasks || []).map((task: any) => (
                <div
                  key={task.id}
                  className="p-3 bg-[#F5F7FA] rounded-md border border-[#E2E8F0] hover:border-amber-300 transition-colors flex items-center justify-between"
                >
                  <div className="flex-1 pr-3">
                    <p className="text-xs font-bold text-[#1A1A1A]">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-500">{task.targetName}</span>
                      <Badge variant={task.priority === 'High' ? 'danger' : 'accent'} size="sm">
                        {task.priority}
                      </Badge>
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigateTab('tasks')}
                    className="px-3 py-1 bg-[#4309A2] hover:bg-[#e67e00] text-white text-xs font-semibold rounded-md transition-colors shrink-0 cursor-pointer"
                  >
                    Action
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
