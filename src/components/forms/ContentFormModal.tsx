import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ContentSchema, ContentFormData } from '../../schemas';
import { ContentItem } from '../../types';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useCreateContent } from '../../hooks/useQueries';

interface ContentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialContent?: ContentItem | null;
}

export const ContentFormModal: React.FC<ContentFormModalProps> = ({
  isOpen,
  onClose,
  initialContent,
}) => {
  const { users, currentUser } = useAuth();
  const createContentMutation = useCreateContent();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContentFormData>({
    resolver: zodResolver(ContentSchema),
    defaultValues: {
      title: '',
      clientName: 'Internal Marketing',
      contentType: 'Post',
      platform: 'Instagram',
      caption: '',
      assignedStaffId: currentUser?.id || 'usr_staff_marketing',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Idea',
      mediaUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      mediaType: 'image',
      notes: '',
    },
  });

  const onSubmit = async (data: ContentFormData) => {
    try {
      await createContentMutation.mutateAsync(data as any);
      reset();
      onClose();
    } catch (e) {
      // Handled in mutation hook
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Social Content / Post"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Row 1: Title */}
        <div>
          <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
            Content / Post Title <span className="text-slate-500">*</span>
          </label>
          <input
            {...register('title')}
            type="text"
            placeholder="e.g. 5 Signs Your ERP Needs an Upgrade in 2026"
            className={`w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
              errors.title
                ? 'border-rose-400 focus:ring-4 focus:ring-rose-500/10'
                : 'border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
            }`}
          />
          {errors.title && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.title.message}</p>}
        </div>

        {/* Row 2: Client / Brand Name & Platform */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
              Client / Brand Name <span className="text-slate-500">*</span>
            </label>
            <input
              {...register('clientName')}
              type="text"
              placeholder="e.g. OmniFlow Brand"
              className={`w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                errors.clientName
                  ? 'border-rose-400 focus:ring-4 focus:ring-rose-500/10'
                  : 'border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
              }`}
            />
            {errors.clientName && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.clientName.message}</p>}
          </div>

          <div>
            <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
              Platform
            </label>
            <select
              {...register('platform')}
              className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer"
            >
              <option value="Instagram">Instagram</option>
              <option value="Facebook">Facebook</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="TikTok">TikTok</option>
              <option value="YouTube">YouTube</option>
              <option value="Website">Website Blog</option>
            </select>
          </div>
        </div>

        {/* Row 3: Format Type, Assignee & Due Date */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
              Format Type
            </label>
            <select
              {...register('contentType')}
              className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer"
            >
              <option value="Post">Single Image Post</option>
              <option value="Reel">Short-form Reel / Video</option>
              <option value="Carousel">Multi-slide Carousel</option>
              <option value="Story">Story Highlight</option>
              <option value="Ad Copy">Performance Ad Creative</option>
            </select>
          </div>

          <div>
            <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
              Assignee
            </label>
            <select
              {...register('assignedStaffId')}
              className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
              Due Date
            </label>
            <input
              {...register('dueDate')}
              type="date"
              className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
            />
          </div>
        </div>

        {/* Row 4: Caption / Copy */}
        <div>
          <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
            Caption / Copy
          </label>
          <textarea
            {...register('caption')}
            rows={3}
            placeholder="Draft caption, hashtags, and call to action..."
            className="w-full p-4 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:ring-4 focus:ring-[#4309A2]/10 transition-all resize-none"
          />
        </div>

        {/* Bottom Actions Bar */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || createContentMutation.isPending}
            className="px-6 py-2.5 bg-[#4309A2] hover:bg-[#e67e00] text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
          >
            {isSubmitting || createContentMutation.isPending ? 'Creating...' : 'Create Content Item'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
