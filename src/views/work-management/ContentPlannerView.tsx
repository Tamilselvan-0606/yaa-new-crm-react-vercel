import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { customerApi, mapApiCustomerToSalesCustomer } from '../../api/commerce/customerApi';
import { api } from '../../services/api';
import { ContentItem, ContentType, ContentStatus, PlatformType, ApprovalStatus } from '../../types';
import {
  Film,
  Calendar as CalendarIcon,
  Plus,
  Search,
  Filter,
  Play,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  ExternalLink,
  Instagram,
  Linkedin,
  Facebook,
  Youtube,
  Twitter,
  Globe,
  Kanban,
  List,
  Grid,
  UploadCloud,
  Check,
  AlertCircle,
  Sparkles,
  CalendarDays,
  FileCheck2,
  RotateCcw,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { Badge, getStatusBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { MediaViewerModal } from '../../components/common/MediaViewerModal';
import { ContentFormModal } from '../../components/forms/ContentFormModal';
import { CustomSelect } from '../../components/common/CustomSelect';

interface ContentPlannerViewProps {
  initialCreateOpen?: boolean;
  onCloseInitialCreate?: () => void;
}

export const ContentPlannerView: React.FC<ContentPlannerViewProps> = ({
  initialCreateOpen = false,
  onCloseInitialCreate,
}) => {
  const { currentUser, users, isAdmin, showToast } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchCustomers = async () => {
      try {
        const res = await customerApi.getCustomers({ pagination_required: false, page_size: 100 });
        if (isMounted && res?.data && Array.isArray(res.data)) {
          setCustomers(res.data.map(mapApiCustomerToSalesCustomer));
        }
      } catch (err) {
        console.warn('Failed to load customers in ContentPlannerView:', err);
      }
    };
    fetchCustomers();
    return () => {
      isMounted = false;
    };
  }, []);

  const [contentList, setContentList] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'deliverables' | 'kanban' | 'grid' | 'calendar'>('deliverables');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClient, setFilterClient] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [filterApproval, setFilterApproval] = useState<'ALL' | 'Pending Upload' | 'Pending Review' | 'Admin Approved' | 'Revision Requested'>('ALL');
  const [filterPlatform, setFilterPlatform] = useState('ALL');

  // Media Player Lightbox
  const [selectedMedia, setSelectedMedia] = useState<{
    isOpen: boolean;
    title: string;
    mediaUrl: string;
    mediaType: 'image' | 'video';
    clientName?: string;
    caption?: string;
    tags?: string[];
  }>({
    isOpen: false,
    title: '',
    mediaUrl: '',
    mediaType: 'image',
  });

  // Single Content Create / Edit Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(initialCreateOpen);
  const [editingContent, setEditingContent] = useState<ContentItem | null>(null);

  // Deliverable Batch Generator Modal State
  const [isBatchScheduleOpen, setIsBatchScheduleOpen] = useState(false);
  const [batchClientName, setBatchClientName] = useState('');
  const [batchContentType, setBatchContentType] = useState<ContentType>('Reel');
  const [batchCount, setBatchCount] = useState<number>(6); // e.g., 6 videos for a month
  const [batchMonth, setBatchMonth] = useState('2026-09');
  const [batchPlatform, setBatchPlatform] = useState<PlatformType>('Instagram');
  const [batchStaffId, setBatchStaffId] = useState(currentUser?.id || 'usr_staff_1');
  const [batchCampaignTitle, setBatchCampaignTitle] = useState('Product Showcase & Engagement Campaign');
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);

  // Staff Upload Deliverable Modal State
  const [uploadingItem, setUploadingItem] = useState<ContentItem | null>(null);
  const [uploadFileUrl, setUploadFileUrl] = useState('');
  const [uploadThumbnailUrl, setUploadThumbnailUrl] = useState('');
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadHashtags, setUploadHashtags] = useState('#digitalmarketing #reels #growth');
  const [uploadNotes, setUploadNotes] = useState('');
  const [isSubmittingUpload, setIsSubmittingUpload] = useState(false);

  // Admin Revision Notes Modal State
  const [revisionItem, setRevisionItem] = useState<ContentItem | null>(null);
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setLoading(true);
    try {
      const items = await api.getContent();
      setContentList(items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Date Segregation Algorithm for Monthly Deliverables
  const segregatedPreviewDates = useMemo(() => {
    if (!batchMonth || batchCount <= 0) return [];
    const [yearStr, monthStr] = batchMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();

    // Distribute evenly across the month with starting buffer
    const interval = daysInMonth / (batchCount + 1);
    const dates: string[] = [];

    for (let i = 1; i <= batchCount; i++) {
      const dayNum = Math.min(Math.round(interval * i), daysInMonth);
      const dayFormatted = String(dayNum).padStart(2, '0');
      dates.push(`${batchMonth}-${dayFormatted}`);
    }
    return dates;
  }, [batchMonth, batchCount]);

  // Handle Monthly Batch Schedule Generation (e.g., 6 videos for the month)
  const handleGenerateBatchSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchClientName) {
      showToast('error', 'Select Client', 'Please select a client for this monthly schedule.');
      return;
    }
    setIsGeneratingSchedule(true);
    try {
      const assignedUser = users.find((u) => u.id === batchStaffId);
      const generatedItems: ContentItem[] = [];

      for (let i = 0; i < segregatedPreviewDates.length; i++) {
        const itemNumber = i + 1;
        const date = segregatedPreviewDates[i];
        const newDeliverable = await api.createContent({
          title: `${batchCampaignTitle} - ${batchContentType} #${itemNumber} of ${batchCount}`,
          clientName: batchClientName,
          clientOrProduct: 'Digital Marketing',
          contentType: batchContentType,
          platform: batchPlatform,
          status: 'Scheduled',
          approvalStatus: 'Pending Upload',
          deliverableNumber: itemNumber,
          totalDeliverables: batchCount,
          month: batchMonth,
          scheduledDate: date,
          scheduledTime: '18:00',
          assignedStaffId: batchStaffId,
          assignedStaffName: assignedUser?.name || 'Staff Member',
          caption: `Monthly Deliverable #${itemNumber} for ${batchClientName}. Ready for production.`,
          hashtags: ['#growth', '#digitalmarketing', '#viralcontent'],
          mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-set-of-plateaus-seen-from-the-sky-in-a-sunset-26070-large.mp4',
          mediaType: batchContentType === 'Reel' || batchContentType === 'Video' ? 'video' : 'image',
          mediaThumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600',
        });
        generatedItems.push(newDeliverable);
      }

      showToast(
        'success',
        'Monthly Schedule Created!',
        `Generated ${batchCount} segregated ${batchContentType} dates for ${batchClientName}.`
      );
      setIsBatchScheduleOpen(false);
      loadContent();
    } catch (err: any) {
      showToast('error', 'Generation Failed', err.message || 'Failed to generate schedule');
    } finally {
      setIsGeneratingSchedule(false);
    }
  };

  // Staff Submits Completed Video / Media Upload
  const handleOpenUploadModal = (item: ContentItem) => {
    setUploadingItem(item);
    setUploadFileUrl(
      item.uploadedFileUrl ||
      item.mediaUrl ||
      'https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-woman-typing-on-a-laptop-41221-large.mp4'
    );
    setUploadThumbnailUrl(
      item.mediaThumbnail ||
      'https://images.unsplash.com/photo-1542744094-3a31727560fa?w=600'
    );
    setUploadCaption(item.caption || `Completed final edit for ${item.title}`);
    setUploadHashtags((item.hashtags || []).join(' ') || '#marketing #reels #content');
    setUploadNotes(item.notes || '');
  };

  const handleSaveUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadingItem) return;
    setIsSubmittingUpload(true);
    try {
      const tagsArray = uploadHashtags
        .split(/[\s,]+/)
        .map((t) => (t.startsWith('#') ? t : `#${t}`))
        .filter((t) => t.length > 1);

      await api.updateContent(uploadingItem.id, {
        mediaUrl: uploadFileUrl,
        uploadedFileUrl: uploadFileUrl,
        mediaThumbnail: uploadThumbnailUrl,
        caption: uploadCaption,
        hashtags: tagsArray,
        notes: uploadNotes,
        status: 'Review',
        approvalStatus: 'Pending Review',
        uploadedAt: new Date().toISOString(),
        uploadedBy: currentUser?.name || 'Staff Member',
      });

      showToast(
        'success',
        'Media Uploaded for Approval',
        `Video/Post submitted for ${uploadingItem.clientName}. Awaiting Admin sign-off.`
      );
      setUploadingItem(null);
      loadContent();
    } catch (err: any) {
      showToast('error', 'Upload Failed', err.message || 'Could not submit upload');
    } finally {
      setIsSubmittingUpload(false);
    }
  };

  // Admin One-Click Approval
  const handleAdminApprove = async (item: ContentItem) => {
    try {
      await api.updateContent(item.id, {
        approvalStatus: 'Admin Approved',
        status: 'Scheduled',
        approvedBy: currentUser?.name || 'Administrator',
        approvedAt: new Date().toISOString(),
      });
      showToast(
        'success',
        'Deliverable Approved!',
        `Admin approved ${item.title}. Scheduled for publishing.`
      );
      loadContent();
    } catch (err: any) {
      showToast('error', 'Approval Failed', err.message);
    }
  };

  // Admin Request Revision
  const handleOpenRevisionModal = (item: ContentItem) => {
    setRevisionItem(item);
    setRevisionFeedback('');
  };

  const handleSaveRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionItem) return;
    setIsSubmittingRevision(true);
    try {
      await api.updateContent(revisionItem.id, {
        approvalStatus: 'Revision Requested',
        status: 'Editing',
        revisionNotes: revisionFeedback,
      });
      showToast(
        'info',
        'Revision Feedback Sent',
        `Notified staff to revise ${revisionItem.title}.`
      );
      setRevisionItem(null);
      loadContent();
    } catch (err: any) {
      showToast('error', 'Revision Request Failed', err.message);
    } finally {
      setIsSubmittingRevision(false);
    }
  };

  const getPlatformIcon = (p: PlatformType) => {
    switch (p) {
      case 'Instagram':
        return <Instagram className="w-3.5 h-3.5 text-pink-600" />;
      case 'LinkedIn':
        return <Linkedin className="w-3.5 h-3.5 text-blue-700" />;
      case 'Facebook':
        return <Facebook className="w-3.5 h-3.5 text-blue-600" />;
      case 'YouTube':
        return <Youtube className="w-3.5 h-3.5 text-red-600" />;
      case 'Twitter/X':
        return <Twitter className="w-3.5 h-3.5 text-slate-800" />;
      default:
        return <Globe className="w-3.5 h-3.5 text-purple-600" />;
    }
  };

  // Metrics for Deliverable Pipeline
  const pendingApprovalCount = useMemo(
    () => contentList.filter((c) => c.approvalStatus === 'Pending Review').length,
    [contentList]
  );
  const pendingUploadCount = useMemo(
    () => contentList.filter((c) => !c.approvalStatus || c.approvalStatus === 'Pending Upload').length,
    [contentList]
  );
  const approvedCount = useMemo(
    () => contentList.filter((c) => c.approvalStatus === 'Admin Approved').length,
    [contentList]
  );

  const filteredContent = useMemo(() => {
    return contentList.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.clientName && item.clientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.caption && item.caption.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesClient = filterClient === 'ALL' || item.clientName === filterClient;
      const matchesType = filterType === 'ALL' || item.contentType === filterType;
      const matchesApproval =
        filterApproval === 'ALL' ||
        (filterApproval === 'Pending Upload'
          ? !item.approvalStatus || item.approvalStatus === 'Pending Upload'
          : item.approvalStatus === filterApproval);
      const matchesPlatform = filterPlatform === 'ALL' || item.platform === filterPlatform;

      return matchesSearch && matchesClient && matchesType && matchesApproval && matchesPlatform;
    });
  }, [contentList, searchQuery, filterClient, filterType, filterApproval, filterPlatform]);

  const uniqueClients = useMemo(() => {
    const set = new Set<string>();
    contentList.forEach((c) => {
      if (c.clientName) set.add(c.clientName);
    });
    return Array.from(set);
  }, [contentList]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Film className="w-6 h-6 text-[#33077C]" />
            <span>Content Planner</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage monthly client video/post schedules, upload deliverables, and track admin approval sign-offs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Batch Schedule Generator Button (e.g., 6 videos/mo for a client) */}
          <button
            onClick={() => {
              setBatchClientName(customers[0]?.company || 'Veritas Logistics Corp');
              setIsBatchScheduleOpen(true);
            }}
            className="flex items-center justify-center gap-2 h-11 px-6 bg-[#33077C] hover:bg-[#432eb5] text-white text-sm font-bold rounded-xl shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <CalendarDays className="w-4 h-4 text-[#4309A2]" />
            <span>+ Monthly Plan Schedule</span>
          </button>

          {/* Single Content Create */}
          <button
            onClick={() => {
              setEditingContent(null);
              setIsCreateModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 h-11 px-6 bg-[#4309A2] hover:bg-[#e67e00] text-white text-sm font-bold rounded-xl shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Content</span>
          </button>
        </div>
      </div>

      {/* View Switcher & Approval Quick Counters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/70 max-w-xl">
          <button
            onClick={() => setViewMode('deliverables')}
            className={`flex-1 py-2 px-3.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              viewMode === 'deliverables'
                ? 'bg-white text-[#33077C] shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileCheck2 className={`w-3.5 h-3.5 ${viewMode === 'deliverables' ? 'text-[#4309A2]' : 'text-slate-400'}`} />
            <span>Deliverables & Approval</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
              viewMode === 'deliverables' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {contentList.length}
            </span>
          </button>

          <button
            onClick={() => setViewMode('grid')}
            className={`flex-1 py-2 px-3.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-white text-[#33077C] shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Grid className={`w-3.5 h-3.5 ${viewMode === 'grid' ? 'text-blue-600' : 'text-slate-400'}`} />
            <span>Media Grid</span>
          </button>

          <button
            onClick={() => setViewMode('calendar')}
            className={`flex-1 py-2 px-3.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              viewMode === 'calendar'
                ? 'bg-white text-[#33077C] shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <CalendarIcon className={`w-3.5 h-3.5 ${viewMode === 'calendar' ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>Calendar</span>
          </button>
        </div>

        {/* Approval Quick Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterApproval('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterApproval === 'ALL' ? 'bg-[#33077C] text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All ({contentList.length})
          </button>

          <button
            onClick={() => setFilterApproval('Pending Review')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              filterApproval === 'Pending Review'
                ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-600/20'
                : 'bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Needs Approval ({pendingApprovalCount})</span>
          </button>

          <button
            onClick={() => setFilterApproval('Pending Upload')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              filterApproval === 'Pending Upload'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 border border-blue-200 text-blue-800 hover:bg-blue-100'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Pending Upload ({pendingUploadCount})</span>
          </button>

          <button
            onClick={() => setFilterApproval('Admin Approved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              filterApproval === 'Admin Approved'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved ({approvedCount})</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search deliverables by title, client name, caption, topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200/80 focus:border-[#4309A2] rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all"
          />
        </div>

        {/* Client Filter */}
        <CustomSelect
          value={filterClient}
          onChange={(val) => setFilterClient(val)}
          options={[
            { value: 'ALL', label: 'All Clients' },
            ...uniqueClients.map((c) => ({ value: c, label: c })),
          ]}
          className="w-full sm:w-48 shrink-0"
          activeColor="emerald"
        />

        {/* Format Filter */}
        <CustomSelect
          value={filterType}
          onChange={(val) => setFilterType(val)}
          options={[
            { value: 'ALL', label: 'All Formats' },
            { value: 'Reel', label: 'Reels' },
            { value: 'Video', label: 'Videos' },
            { value: 'Post', label: 'Posts' },
            { value: 'Carousel', label: 'Carousels' },
            { value: 'Story', label: 'Stories' },
          ]}
          className="w-full sm:w-40 shrink-0"
          activeColor="emerald"
        />

        {/* Platform Filter */}
        <CustomSelect
          value={filterPlatform}
          onChange={(val) => setFilterPlatform(val)}
          options={[
            { value: 'ALL', label: 'All Platforms' },
            { value: 'Instagram', label: 'Instagram' },
            { value: 'YouTube', label: 'YouTube' },
            { value: 'LinkedIn', label: 'LinkedIn' },
            { value: 'Facebook', label: 'Facebook' },
            { value: 'Twitter/X', label: 'Twitter/X' },
            { value: 'Website', label: 'Website' },
          ]}
          className="w-full sm:w-40 shrink-0"
          activeColor="emerald"
        />
      </div>

      {/* 1. DELIVERABLES & ADMIN APPROVAL LIST VIEW (Primary Operational View) */}
      {viewMode === 'deliverables' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {filteredContent.length === 0 ? (
            <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <Film className="w-10 h-10 mx-auto mb-2 opacity-30 text-purple-400" />
              <p className="font-bold text-slate-700 text-sm">No deliverables match your filter</p>
              <p className="text-xs text-slate-400 mt-0.5">Click "+ Monthly Plan Schedule" above to generate a client's deliverable dates.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredContent.map((cnt) => {
                const isPendingApproval = cnt.approvalStatus === 'Pending Review';
                const isApproved = cnt.approvalStatus === 'Admin Approved';
                const isRevision = cnt.approvalStatus === 'Revision Requested';
                const isPendingUpload = !cnt.approvalStatus || cnt.approvalStatus === 'Pending Upload';

                return (
                  <div
                    key={cnt.id}
                    className={`bg-white rounded-2xl border p-5 shadow-xs transition-all hover:shadow-md flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 ${
                      isPendingApproval
                        ? 'border-amber-300 ring-2 ring-amber-500/10 bg-amber-50/20'
                        : isApproved
                        ? 'border-emerald-200/90'
                        : isRevision
                        ? 'border-rose-200 bg-rose-50/10'
                        : 'border-slate-200/90'
                    }`}
                  >
                    {/* Left: Thumbnail Preview & Platform Badge */}
                    <div className="flex items-start gap-4 w-full lg:w-auto">
                      <div
                        onClick={() =>
                          setSelectedMedia({
                            isOpen: true,
                            title: cnt.title,
                            mediaUrl: cnt.mediaUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
                            mediaType: cnt.contentType === 'Reel' || cnt.contentType === 'Video' ? 'video' : 'image',
                            clientName: cnt.clientName,
                            caption: cnt.caption,
                            tags: cnt.hashtags,
                          })
                        }
                        className="relative w-28 sm:w-36 aspect-video bg-slate-900 rounded-xl overflow-hidden shrink-0 group cursor-pointer border border-slate-200"
                      >
                        <img
                          src={cnt.mediaThumbnail || cnt.mediaUrl}
                          alt={cnt.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                        {cnt.contentType === 'Reel' || cnt.contentType === 'Video' ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10">
                            <Play className="w-5 h-5 text-white fill-white drop-shadow-md" />
                          </div>
                        ) : null}
                        <div className="absolute top-1 left-1 flex items-center gap-1 bg-black/70 backdrop-blur-xs px-1.5 py-0.5 rounded text-[9px] text-white font-semibold">
                          {getPlatformIcon(cnt.platform)}
                          <span>{cnt.contentType}</span>
                        </div>
                      </div>

                      {/* Deliverable Details */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-extrabold text-[#4309A2] uppercase tracking-wider">
                            {cnt.clientName || cnt.clientOrProduct}
                          </span>
                          {cnt.deliverableNumber && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold">
                              Slot #{cnt.deliverableNumber} of {cnt.totalDeliverables || 6}
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 leading-snug truncate">
                          {cnt.title}
                        </h3>

                        <p className="text-xs text-slate-600 line-clamp-1 max-w-xl">
                          {cnt.caption || 'No caption entered yet.'}
                        </p>

                        {/* Metadata row */}
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                          <span className="flex items-center gap-1 font-mono text-slate-600 font-semibold bg-slate-100 px-2 py-0.5 rounded">
                            <Clock className="w-3 h-3 text-[#4309A2]" />
                            <span>Date: {cnt.scheduledDate || 'Not Scheduled'}</span>
                          </span>
                          <span>Creator: <strong className="text-slate-700">{cnt.assignedStaffName}</strong></span>
                          {cnt.uploadedBy && (
                            <span className="text-blue-700 font-medium">Uploaded by: <strong>{cnt.uploadedBy}</strong></span>
                          )}
                          {cnt.approvedBy && (
                            <span className="text-emerald-700 font-bold">Approved by: <strong>{cnt.approvedBy}</strong></span>
                          )}
                        </div>

                        {/* Revision feedback note display if any */}
                        {isRevision && cnt.revisionNotes && (
                          <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 font-medium mt-1">
                            <strong>Admin Revision Feedback:</strong> "{cnt.revisionNotes}"
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Approval Status Badge & Action Buttons */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-end gap-2.5 w-full lg:w-auto shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      {/* Status Badges */}
                      <div className="flex items-center gap-2">
                        {isPendingApproval && (
                          <span className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-full text-xs font-extrabold flex items-center gap-1.5 animate-pulse">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Needs Admin Approval</span>
                          </span>
                        )}
                        {isApproved && (
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-extrabold flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Admin Approved</span>
                          </span>
                        )}
                        {isPendingUpload && (
                          <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold flex items-center gap-1.5">
                            <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                            <span>Pending Staff Upload</span>
                          </span>
                        )}
                        {isRevision && (
                          <span className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs font-bold flex items-center gap-1.5">
                            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                            <span>Revision Needed</span>
                          </span>
                        )}
                      </div>

                      {/* Interactive Actions (Staff Upload & Admin Review) */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Preview button */}
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedMedia({
                              isOpen: true,
                              title: cnt.title,
                              mediaUrl: cnt.mediaUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
                              mediaType: cnt.contentType === 'Reel' || cnt.contentType === 'Video' ? 'video' : 'image',
                              clientName: cnt.clientName,
                              caption: cnt.caption,
                              tags: cnt.hashtags,
                            })
                          }
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </button>

                        {/* Staff Upload Button */}
                        {(isPendingUpload || isRevision) && (
                          <button
                            type="button"
                            onClick={() => handleOpenUploadModal(cnt)}
                            className="px-3.5 py-1.5 bg-[#4309A2] hover:bg-[#e67e00] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all hover:scale-[1.02]"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>Upload Video / Post</span>
                          </button>
                        )}

                        {/* Admin Approval & Revision Actions */}
                        {isAdmin && (
                          <div className="flex items-center gap-1.5">
                            {!isApproved && (
                              <button
                                type="button"
                                onClick={() => handleAdminApprove(cnt)}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all hover:scale-[1.02]"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>Approve</span>
                              </button>
                            )}

                            {isPendingApproval && (
                              <button
                                type="button"
                                onClick={() => handleOpenRevisionModal(cnt)}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Request Edit</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. CREATIVE MEDIA GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-150">
          {filteredContent.map((cnt) => (
            <div
              key={cnt.id}
              onClick={() =>
                setSelectedMedia({
                  isOpen: true,
                  title: cnt.title,
                  mediaUrl: cnt.mediaUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
                  mediaType: cnt.contentType === 'Reel' || cnt.contentType === 'Video' ? 'video' : 'image',
                  clientName: cnt.clientName,
                  caption: cnt.caption,
                  tags: cnt.hashtags,
                })
              }
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-lg transition-all overflow-hidden cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-video bg-slate-950 overflow-hidden">
                  <img
                    src={cnt.mediaThumbnail || cnt.mediaUrl}
                    alt={cnt.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  {cnt.contentType === 'Reel' || cnt.contentType === 'Video' ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/10">
                      <div className="w-12 h-12 rounded-full bg-[#4309A2] text-white flex items-center justify-center shadow-xl">
                        <Play className="w-6 h-6 ml-0.5 fill-white" />
                      </div>
                    </div>
                  ) : null}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/70 backdrop-blur-xs px-2.5 py-1 rounded-full text-xs text-white">
                    {getPlatformIcon(cnt.platform)}
                    <span className="font-semibold">{cnt.contentType}</span>
                  </div>
                  <div className="absolute top-3 right-3">
                    {cnt.approvalStatus === 'Admin Approved' ? (
                      <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold">Approved</span>
                    ) : cnt.approvalStatus === 'Pending Review' ? (
                      <span className="px-2 py-0.5 bg-amber-500 text-white rounded text-[10px] font-bold">Review</span>
                    ) : (
                      getStatusBadge(cnt.status)
                    )}
                  </div>
                </div>

                <div className="p-4">
                  <span className="text-[10px] font-bold text-[#4309A2] uppercase tracking-wider">
                    {cnt.clientName || cnt.clientOrProduct}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">{cnt.title}</h4>
                  <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">{cnt.caption}</p>
                </div>
              </div>

              <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1 font-mono text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-[#4309A2]" />
                  {cnt.scheduledDate}
                </span>
                <span className="font-semibold text-slate-800">
                  {cnt.assignedStaffName}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. CALENDAR PREVIEW VIEW */}
      {viewMode === 'calendar' && (
        <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-[#33077C] flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#4309A2]" />
              <span>Monthly Content & Deliverable Schedule</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContent.map((cnt) => (
              <div
                key={cnt.id}
                onClick={() =>
                  setSelectedMedia({
                    isOpen: true,
                    title: cnt.title,
                    mediaUrl: cnt.mediaUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
                    mediaType: cnt.contentType === 'Reel' || cnt.contentType === 'Video' ? 'video' : 'image',
                    clientName: cnt.clientName,
                    caption: cnt.caption,
                    tags: cnt.hashtags,
                  })
                }
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-purple-300 transition-all cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-[#4309A2] bg-white px-2 py-0.5 rounded border border-slate-200">
                    {cnt.scheduledDate}
                  </span>
                  {cnt.approvalStatus === 'Admin Approved' ? (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">Approved</span>
                  ) : (
                    getStatusBadge(cnt.status)
                  )}
                </div>
                <h4 className="text-xs font-bold text-slate-900">{cnt.title}</h4>
                <p className="text-[11px] text-slate-500">{cnt.clientName} &bull; {cnt.contentType} on {cnt.platform}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: BATCH MONTHLY SCHEDULE GENERATOR (e.g., 6 videos for the month) */}
      {isBatchScheduleOpen && (
        <Modal
          isOpen={isBatchScheduleOpen}
          onClose={() => setIsBatchScheduleOpen(false)}
          title="Generate Client Monthly Deliverables Schedule"
          maxWidth="lg"
        >
          <form noValidate onSubmit={handleGenerateBatchSchedule} className="space-y-4">
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-xs text-purple-900 leading-relaxed">
              <strong className="font-bold flex items-center gap-1 text-[#33077C] mb-0.5">
                <Sparkles className="w-3.5 h-3.5 text-[#4309A2]" />
                Automated Date Segregation:
              </strong>
              Select the client and deliverable count (e.g. 6 Videos). The system will automatically calculate and space out the delivery dates across the entire month.
            </div>

            {/* Client Select */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Client Profile *
                </label>
                <select
                  required
                  value={batchClientName}
                  onChange={(e) => setBatchClientName(e.target.value)}
                  className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#4309A2]"
                >
                  <option value="">Select a Client...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.company}>
                      {c.company} ({c.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Month *
                </label>
                <input
                  type="month"
                  required
                  value={batchMonth}
                  onChange={(e) => setBatchMonth(e.target.value)}
                  className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#4309A2]"
                />
              </div>
            </div>

            {/* Format & Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deliverable Format *
                </label>
                <select
                  value={batchContentType}
                  onChange={(e) => setBatchContentType(e.target.value as ContentType)}
                  className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#4309A2]"
                >
                  <option value="Reel">Reels (Short-form)</option>
                  <option value="Video">Videos (Long-form)</option>
                  <option value="Post">Graphic Posts</option>
                  <option value="Carousel">Carousel Decks</option>
                  <option value="Story">Stories</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Monthly Quantity *
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  required
                  value={batchCount}
                  onChange={(e) => setBatchCount(parseInt(e.target.value, 10) || 1)}
                  className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#4309A2]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Publishing Platform *
                </label>
                <select
                  value={batchPlatform}
                  onChange={(e) => setBatchPlatform(e.target.value as PlatformType)}
                  className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#4309A2]"
                >
                  <option value="Instagram">Instagram</option>
                  <option value="YouTube">YouTube</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Facebook">Facebook</option>
                  <option value="TikTok">TikTok</option>
                  <option value="Website">Website</option>
                </select>
              </div>
            </div>

            {/* Campaign Concept & Assignee */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Campaign / Topic Title *
                </label>
                <input
                  type="text"
                  required
                  value={batchCampaignTitle}
                  onChange={(e) => setBatchCampaignTitle(e.target.value)}
                  placeholder="e.g. Skincare Drops & Behind the Scenes"
                  className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#4309A2]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assigned Content Creator / Editor
                </label>
                <select
                  value={batchStaffId}
                  onChange={(e) => setBatchStaffId(e.target.value)}
                  className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#4309A2]"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live Preview of Segregated Dates */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Calculated Segregated Publishing Schedule:</span>
                <span className="text-[#4309A2]">{segregatedPreviewDates.length} slots</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {segregatedPreviewDates.map((d, idx) => (
                  <div key={idx} className="p-2 bg-white rounded-lg border border-slate-200 text-center shadow-2xs">
                    <div className="text-[10px] font-extrabold text-purple-700">{batchContentType} #{idx + 1}</div>
                    <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">{d.split('-')[2]} {new Date(d).toLocaleString('default', { month: 'short' })}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsBatchScheduleOpen(false)}
                className="h-11 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm cursor-pointer transition-colors flex items-center justify-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isGeneratingSchedule}
                className="h-11 px-6 bg-[#4309A2] hover:bg-[#e67e00] text-white font-bold rounded-xl text-sm cursor-pointer shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                {isGeneratingSchedule ? 'Generating Slots...' : `Generate ${batchCount} Segregated Slots`}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: STAFF UPLOAD COMPLETED DELIVERABLE */}
      {uploadingItem && (
        <Modal
          isOpen={!!uploadingItem}
          onClose={() => setUploadingItem(null)}
          title={`Upload Completed ${uploadingItem.contentType}: ${uploadingItem.title}`}
          maxWidth="md"
        >
          <form noValidate onSubmit={handleSaveUpload} className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-900">
              Deliverable for: <strong>{uploadingItem.clientName}</strong> (Slot #{uploadingItem.deliverableNumber || 1}) &bull; Scheduled for: <strong>{uploadingItem.scheduledDate}</strong>
            </div>

            {/* Video / Media URL */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Completed Video File / Media URL *
              </label>
              <input
                type="url"
                required
                value={uploadFileUrl}
                onChange={(e) => setUploadFileUrl(e.target.value)}
                placeholder="https://assets.mixkit.co/videos/... or MP4 video URL"
                className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#4309A2]"
              />
              <span className="block text-[11px] text-slate-400 mt-1">Paste your exported video or design file link.</span>
            </div>

            {/* Thumbnail URL */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Preview Thumbnail Image URL
              </label>
              <input
                type="url"
                value={uploadThumbnailUrl}
                onChange={(e) => setUploadThumbnailUrl(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#4309A2]"
              />
            </div>

            {/* Caption */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Final Post Caption & Copy *
              </label>
              <textarea
                required
                rows={3}
                value={uploadCaption}
                onChange={(e) => setUploadCaption(e.target.value)}
                placeholder="Enter final engaging copy, CTA, and brand hook..."
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-[#4309A2] resize-none"
              />
            </div>

            {/* Hashtags & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hashtags
                </label>
                <input
                  type="text"
                  value={uploadHashtags}
                  onChange={(e) => setUploadHashtags(e.target.value)}
                  placeholder="#brand #product #marketing"
                  className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#4309A2]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Staff Notes for Admin Review
                </label>
                <input
                  type="text"
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  placeholder="e.g. Color graded with client font & audio"
                  className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#4309A2]"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setUploadingItem(null)}
                className="h-11 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm cursor-pointer transition-colors flex items-center justify-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingUpload}
                className="h-11 px-6 bg-[#4309A2] hover:bg-[#e67e00] text-white font-bold rounded-xl text-sm cursor-pointer shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                {isSubmittingUpload ? 'Submitting...' : 'Submit Video for Admin Approval'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: ADMIN REQUEST REVISION */}
      {revisionItem && (
        <Modal
          isOpen={!!revisionItem}
          onClose={() => setRevisionItem(null)}
          title={`Request Revision: ${revisionItem.title}`}
          maxWidth="md"
        >
          <form noValidate onSubmit={handleSaveRevision} className="space-y-4">
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-xs text-rose-900">
              Provide specific changes or feedback for <strong>{revisionItem.assignedStaffName}</strong> to revise on this deliverable.
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Revision Notes & Feedback *
              </label>
              <textarea
                required
                rows={4}
                value={revisionFeedback}
                onChange={(e) => setRevisionFeedback(e.target.value)}
                placeholder="e.g. Please increase subtitle font size, swap the ending CTA banner to the new white logo, and trim the first 2 seconds..."
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-rose-500 resize-none font-medium"
              />
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRevisionItem(null)}
                className="h-11 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm cursor-pointer transition-colors flex items-center justify-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingRevision}
                className="h-11 px-6 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm cursor-pointer shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                {isSubmittingRevision ? 'Sending...' : 'Send Revision Feedback to Staff'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* CREATE SINGLE CONTENT MODAL */}
      <ContentFormModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingContent(null);
          if (onCloseInitialCreate) onCloseInitialCreate();
        }}
        initialContent={editingContent}
      />

      {/* Media Lightbox */}
      <MediaViewerModal
        isOpen={selectedMedia.isOpen}
        onClose={() => setSelectedMedia((prev) => ({ ...prev, isOpen: false }))}
        title={selectedMedia.title}
        mediaUrl={selectedMedia.mediaUrl}
        mediaType={selectedMedia.mediaType}
        clientName={selectedMedia.clientName}
        caption={selectedMedia.caption}
        tags={selectedMedia.tags}
      />
    </div>
  );
};

