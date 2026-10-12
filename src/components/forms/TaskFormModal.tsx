import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TaskSchema, TaskFormData } from '../../schemas';
import { TaskItem } from '../../types';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useCreateTask, useUpdateTask } from '../../hooks/useQueries';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTask?: TaskItem | null;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  initialTask,
}) => {
  const { users, currentUser } = useAuth();
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormData>({
    resolver: zodResolver(TaskSchema),
    defaultValues: initialTask
      ? {
          title: initialTask.title,
          description: initialTask.description || '',
          targetType: initialTask.targetType as any,
          targetId: initialTask.targetId,
          targetName: initialTask.targetName,
          clientId: initialTask.clientId || '',
          clientName: initialTask.clientName || '',
          assignedStaffId: initialTask.assignedStaffId || currentUser?.id || 'usr_staff_sales',
          dueDate: initialTask.dueDate || new Date().toISOString().split('T')[0],
          priority: initialTask.priority as any,
          status: initialTask.status as any,
          notes: initialTask.notes || '',
        }
      : {
          title: '',
          description: '',
          targetType: 'Product',
          targetId: 'prod_1',
          targetName: 'OmniFlow ERP',
          clientId: '',
          clientName: '',
          assignedStaffId: currentUser?.id || 'usr_staff_sales',
          dueDate: new Date().toISOString().split('T')[0],
          priority: 'Medium',
          status: 'Pending',
          notes: '',
        },
  });

  React.useEffect(() => {
    if (initialTask) {
      reset({
        title: initialTask.title,
        description: initialTask.description || '',
        targetType: initialTask.targetType as any,
        targetId: initialTask.targetId,
        targetName: initialTask.targetName,
        clientId: initialTask.clientId || '',
        clientName: initialTask.clientName || '',
        assignedStaffId: initialTask.assignedStaffId || currentUser?.id || 'usr_staff_sales',
        dueDate: initialTask.dueDate || new Date().toISOString().split('T')[0],
        priority: initialTask.priority as any,
        status: initialTask.status as any,
        notes: initialTask.notes || '',
      });
    } else {
      reset({
        title: '',
        description: '',
        targetType: 'Product',
        targetId: 'prod_1',
        targetName: 'OmniFlow ERP',
        clientId: '',
        clientName: '',
        assignedStaffId: currentUser?.id || 'usr_staff_sales',
        dueDate: new Date().toISOString().split('T')[0],
        priority: 'Medium',
        status: 'Pending',
        notes: '',
      });
    }
  }, [initialTask, reset, currentUser]);

  const onSubmit = async (data: TaskFormData) => {
    try {
      if (initialTask) {
        await updateTaskMutation.mutateAsync({ id: initialTask.id, data: data as any });
      } else {
        await createTaskMutation.mutateAsync(data as any);
      }
      onClose();
    } catch (e) {
      // Handled in mutation hook
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialTask ? 'Edit Task' : 'Create New Operational Task'}
      maxWidth="lg"
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Row 1: Task Title */}
        <div>
          <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
            Task Title <span className="text-slate-500">*</span>
          </label>
          <input
            {...register('title')}
            type="text"
            placeholder="e.g. Schedule onboarding kickoff with client team"
            className={`w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
              errors.title
                ? 'border-rose-400 focus:ring-4 focus:ring-rose-500/10'
                : 'border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
            }`}
          />
          {errors.title && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.title.message}</p>}
        </div>

        {/* Row 2: Target Type & Target Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">Target Type</label>
            <select
              {...register('targetType')}
              className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer"
            >
              <option value="Product">Product Roadmap</option>
              <option value="Digital Marketing">Digital Marketing</option>
              <option value="Client">Client Specific</option>
              <option value="Internal">Internal Ops</option>
            </select>
          </div>

          <div>
            <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">Target Name</label>
            <input
              {...register('targetName')}
              type="text"
              placeholder="e.g. OmniFlow ERP or Brand Campaign"
              className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
            />
          </div>
        </div>

        {/* Row 3: Assignee, Due Date & Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">Assignee</label>
            <select
              {...register('assignedStaffId')}
              className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">Due Date</label>
            <input
              {...register('dueDate')}
              type="date"
              className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
            />
          </div>

          <div>
            <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">Priority</label>
            <select
              {...register('priority')}
              className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer"
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        {/* Row 4: Description */}
        <div>
          <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">Description & Checklist</label>
          <textarea
            {...register('description')}
            rows={3}
            placeholder="Details, acceptance criteria, or links to assets..."
            className="w-full p-4 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:ring-4 focus:ring-[#4309A2]/10 transition-all resize-none"
          />
        </div>

        {/* Bottom Actions Bar */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || createTaskMutation.isPending || updateTaskMutation.isPending}
            className="h-11 px-6 bg-[#4309A2] hover:bg-[#e67e00] text-white rounded-xl text-sm font-bold shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {initialTask ? 'Update Task' : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
