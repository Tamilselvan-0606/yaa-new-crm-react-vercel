import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Paperclip, UploadCloud, Users, X, Send, Search, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { TextAreaField, TextField } from '../../components/common/FormField';
import { Modal } from '../../components/common/Modal';
import { CustomSelect } from '../../components/common/CustomSelect';
import { RichTextEditor } from '../../components/common/RichTextEditor';
import { organizationApi } from '../../api/platform/organizationApi';
import type { OrganizationApiItem } from '../../api/platform/organizationTypes';
import { htmlToText } from '../../utils/sanitizeHtml';
import { useAnnouncementTemplates } from '../../hooks/useAnnouncementTemplates';
import { announcementApi, notifyAnnouncementsChanged } from '../../api/platform/announcementApi';
import type { AnnouncementLength, AnnouncementTone, CreateAnnouncementRequest } from '../../api/platform/announcementTypes';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];

const ORG_TYPES = ['Client Management', 'Sales Management'];

const sectionIcon = 'w-8 h-8 rounded-lg bg-indigo-50 text-[#33077C] flex items-center justify-center shrink-0';

export const CreateAnnouncementView: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useAuth();

  const { templates } = useAnnouncementTemplates();
  const [theme, setTheme] = useState('');
  const [subject, setSubject] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  // The chosen file is uploaded when the announcement is sent; only then does the API give it an id.
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const attachment = attachmentFile ? { name: attachmentFile.name, size: attachmentFile.size } : null;
  const [isSending, setIsSending] = useState(false);

  // Live count of the organizations the chosen recipients reach (server rules: active organizations only).
  const [serverCount, setServerCount] = useState<number | null>(null);

  // Generate with AI
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiInstructions, setAiInstructions] = useState('');
  const [aiTone, setAiTone] = useState<AnnouncementTone>('professional');
  const [aiLength, setAiLength] = useState<AnnouncementLength>('medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [recipientMode, setRecipientMode] = useState<'ALL' | 'TYPE' | 'SELECTED'>('ALL');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [orgSearch, setOrgSearch] = useState('');
  const [organizations, setOrganizations] = useState<OrganizationApiItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    organizationApi
      .getOrganizations(1, 100)
      .then((res) => {
        if (!alive || !res || !Array.isArray(res.data)) return;
        setOrganizations(res.data);
      })
      .catch(() => {
        /* the list stays empty; "all organizations" still works */
      });
    return () => {
      alive = false;
    };
  }, []);

  const visibleOrganizations = useMemo(() => {
    const q = orgSearch.trim().toLowerCase();
    return organizations.filter((o) => !q || o.name.toLowerCase().includes(q) || (o.code || '').toLowerCase().includes(q));
  }, [organizations, orgSearch]);

  useEffect(() => {
    const ready =
      recipientMode === 'ALL' ||
      (recipientMode === 'TYPE' && selectedTypes.length > 0) ||
      (recipientMode === 'SELECTED' && selectedIds.length > 0);
    if (!ready) {
      setServerCount(null);
      return;
    }
    let alive = true;
    const timer = window.setTimeout(async () => {
      try {
        const res = await announcementApi.recipientCount({
          recipientMode,
          ...(recipientMode === 'TYPE' ? { organizationTypes: selectedTypes.map((t) => (t === 'Sales Management' ? 2 : 1)) } : {}),
          ...(recipientMode === 'SELECTED' ? { organizationIds: selectedIds } : {}),
        });
        if (alive) setServerCount(Number(res?.data?.count) || 0);
      } catch {
        if (alive) setServerCount(null); // the count is only a hint: sending does not depend on it
      }
    }, 300);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [recipientMode, selectedTypes, selectedIds]);

  const clearError = (key: string) => setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      showToast?.('error', 'Unsupported file', 'Upload a PDF, DOC, JPG or PNG file.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      showToast?.('error', 'File too large', 'The attachment must be 5 MB or smaller.');
      return;
    }
    setAttachmentFile(file);
  };

  const toggleOrg = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    clearError('recipients');
  };

  const openAi = () => {
    if (!theme.trim()) {
      setErrors((prev) => ({ ...prev, theme: 'Enter a theme first: the AI writes the announcement from it' }));
      return;
    }
    setAiError(null);
    setIsAiOpen(true);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setAiError(null);
    try {
      const res = await announcementApi.generate({
        theme: theme.trim(),
        subject: subject.trim() || undefined,
        instructions: aiInstructions.trim() || undefined,
        tone: aiTone,
        length: aiLength,
      });
      const draft = res?.data;
      if (!draft?.contentHtml) throw new Error('The AI returned no draft. Please try again.');
      if (htmlToText(contentHtml) && !window.confirm('Replace the message in the editor with the AI draft?')) return;
      setContentHtml(draft.contentHtml);
      if (draft.subject) setSubject(draft.subject);
      clearError('content');
      clearError('subject');
      setIsAiOpen(false);
      showToast?.('success', 'Draft Ready', 'Review and edit the draft, then send it.');
    } catch (err: any) {
      const status = err?.response?.status;
      setAiError(
        status === 429
          ? 'The AI limit has been reached for now. Please try again later or write the announcement yourself.'
          : getApiErrorMessage(err, 'Could not generate the announcement.')
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    const found: Record<string, string> = {};
    if (!theme.trim()) found.theme = 'Theme is required';
    if (!subject.trim()) found.subject = 'Subject is required';
    if (!htmlToText(contentHtml)) found.content = 'Announcement content is required';
    if (recipientMode === 'SELECTED' && selectedIds.length === 0) found.recipients = 'Select at least one organization';
    if (recipientMode === 'TYPE' && selectedTypes.length === 0) found.recipients = 'Select at least one organization type';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setIsSending(true);
    setSendError(null);
    try {
      // 1. Upload the attachment (if any) to get its id.
      let attachmentId: string | undefined;
      if (attachmentFile) {
        const uploaded = await announcementApi.uploadAttachment(attachmentFile);
        attachmentId = uploaded?.data?.id;
      }

      // 2. Create and send the announcement. 1 = Client Management, 2 = Sales Management.
      const payload: CreateAnnouncementRequest = {
        theme: theme.trim(),
        subject: subject.trim(),
        contentHtml,
        recipientMode,
        ...(recipientMode === 'TYPE'
          ? { organizationTypes: selectedTypes.map((t) => (t === 'Sales Management' ? 2 : 1)) }
          : {}),
        ...(recipientMode === 'SELECTED' ? { organizationIds: selectedIds } : {}),
        ...(attachmentId ? { attachmentId } : {}),
      };
      const res = await announcementApi.create(payload);
      showToast?.('success', 'Announcement Sent', `"${res?.data?.subject || payload.subject}" has been sent.`);
      notifyAnnouncementsChanged();
      navigate('/announcements');
    } catch (err) {
      const message = getApiErrorMessage(err, 'Could not send the announcement.');
      setSendError(message);
      showToast?.('error', 'Send Failed', message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#33077C] flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Create Announcement</h1>
            <p className="text-sm text-slate-500 font-medium mt-0.5">Share important updates with your organizations</p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="md"
          onClick={() => navigate('/announcements')}
          icon={<ArrowLeft className="w-4 h-4 text-slate-500" />}
          className="w-full sm:w-auto justify-center"
        >
          Back to Announcements
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-7 shadow-xs space-y-6">
        {/* Theme + Subject */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextField
            label="Theme"
            required
            value={theme}
            error={errors.theme}
            placeholder="e.g. Maintenance, New Feature, Offer"
            onValueChange={(v) => {
              setTheme(v);
              clearError('theme');
            }}
          />
          <div className="md:col-span-2 flex items-end gap-3">
            <div className="flex-1 min-w-0">
            <TextField
              label="Subject"
              required
              value={subject}
              error={errors.subject}
              placeholder="Subject of the announcement"
              onValueChange={(v) => {
                setSubject(v);
                clearError('subject');
              }}
            />
            </div>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={openAi}
              title="Generate the subject and message with AI"
              className="shrink-0 justify-center"
            >
              Generate Content
            </Button>
          </div>
        </div>

        {/* Content */}
        <div>
          <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
            Announcement Content <span className="text-rose-500 font-bold">*</span>
          </label>
          <RichTextEditor
            value={contentHtml}
            onChange={(html) => {
              setContentHtml(html);
              clearError('content');
            }}
            templates={templates}
            placeholder="Type your message here..."
            error={errors.content}
          />
        </div>

        {/* Attachment */}
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className={sectionIcon}>
              <Paperclip className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">
              Attachment <span className="text-slate-400 font-medium">(Optional)</span>
            </h2>
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleFile} className="hidden" />
          <div className="border border-dashed border-slate-300 rounded-xl p-4 flex flex-wrap items-center gap-3 max-w-xl">
            {attachment ? (
              <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-700">
                <Paperclip className="w-4 h-4 text-[#33077C]" />
                <span className="truncate max-w-[260px]">{attachment.name}</span>
                <span className="text-slate-400 font-medium">{(attachment.size / 1024).toFixed(0)} KB</span>
                <button
                  type="button"
                  onClick={() => setAttachmentFile(null)}
                  title="Remove"
                  className="w-6 h-6 rounded-md hover:bg-rose-50 text-rose-500 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => fileInputRef.current?.click()}
                  icon={<UploadCloud className="w-4 h-4 text-[#33077C]" />}
                >
                  Upload File
                </Button>
                <span className="text-[11px] font-medium text-slate-500">Max size: 5MB. Supports: PDF, DOC, JPG, PNG</span>
              </>
            )}
          </div>
        </div>

        {/* Recipients */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className={sectionIcon}>
              <Users className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">Recipients</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {(
              [
                { mode: 'ALL', label: 'Send to All Organizations', badge: '' },
                { mode: 'TYPE', label: 'Send by Organization Type', badge: '' },
                { mode: 'SELECTED', label: 'Send to Particular Organization', badge: '' },
              ] as const
            ).map((opt) => {
              const active = recipientMode === opt.mode;
              return (
                <button
                  key={opt.mode}
                  type="button"
                  onClick={() => {
                    setRecipientMode(opt.mode);
                    clearError('recipients');
                  }}
                  className={`h-10 px-6 inline-flex items-center gap-2 rounded-lg text-xs sm:text-[13px] font-bold cursor-pointer transition-all active:scale-[0.98] ${
                    active
                      ? 'bg-[#33077C] text-white shadow-md'
                      : 'bg-white text-slate-700 border border-slate-200 shadow-xs hover:bg-slate-50'
                  }`}
                >
                  {active && <Check className="w-4 h-4 stroke-[2.5]" />}
                  {opt.label}
                  {opt.badge && (
                    <span
                      className={`text-[11px] font-bold rounded-full px-2.5 py-0.5 ${
                        active ? 'bg-white/20 text-white' : 'bg-indigo-50 text-[#33077C] border border-indigo-100'
                      }`}
                    >
                      {opt.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {recipientMode === 'TYPE' && (
            <div className="mt-4 bg-white rounded-xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-center gap-3">
                {ORG_TYPES.map((t) => {
                  const checked = selectedTypes.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setSelectedTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
                        clearError('recipients');
                      }}
                      className={`h-10 px-6 inline-flex items-center gap-2 rounded-lg text-xs sm:text-[13px] font-bold cursor-pointer transition-all active:scale-[0.98] ${
                        checked
                          ? 'bg-[#33077C] text-white shadow-md'
                          : 'bg-white text-slate-700 border border-slate-200 shadow-xs hover:bg-slate-50'
                      }`}
                    >
                      {checked && <Check className="w-4 h-4 stroke-[2.5]" />}
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {recipientMode === 'SELECTED' && (
            <div className="mt-4 bg-white rounded-xl border border-slate-200 p-3">
              <div className="relative mb-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={orgSearch}
                  onChange={(e) => setOrgSearch(e.target.value)}
                  placeholder="Search organizations by name or code..."
                  className="w-full h-10 pl-9 pr-3 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-[#4309A2]"
                />
              </div>
              <div className="max-h-56 overflow-y-auto space-y-0.5">
                {visibleOrganizations.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No organizations found.</p>
                ) : (
                  visibleOrganizations.map((o) => {
                    const checked = selectedIds.includes(o.id);
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => toggleOrg(o.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-xs cursor-pointer transition-colors ${
                          checked ? 'bg-[#33077C]/10' : 'hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            checked ? 'bg-[#33077C] border-[#33077C]' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {checked && <Check className="w-3 h-3 text-white stroke-[3]" />}
                        </span>
                        <span className="font-semibold text-slate-800 truncate">
                          {o.name}
                          {o.code ? ` (${o.code})` : ''}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
              <p className="text-[11px] font-semibold text-slate-500 mt-2">{selectedIds.length} selected</p>
            </div>
          )}
          {serverCount !== null && (
            <p className="text-xs font-semibold text-[#33077C] mt-3">
              {serverCount} active organization{serverCount === 1 ? '' : 's'} will receive this announcement
            </p>
          )}
          {errors.recipients && <p className="text-[11px] font-medium text-red-500 mt-2">{errors.recipients}</p>}
        </div>

        {sendError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center justify-between">
            <span>{sendError}</span>
            <button type="button" onClick={() => setSendError(null)} className="text-rose-500 hover:text-rose-700 font-bold ml-2 cursor-pointer">
              ×
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 border-t border-slate-100">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => navigate('/announcements')}
            icon={<X className="w-4 h-4 text-slate-500" />}
            className="w-full sm:w-auto justify-center mt-4 sm:mt-4"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleSend}
            disabled={isSending}
            icon={<Send className="w-4 h-4" />}
            className="w-full sm:w-auto justify-center sm:mt-4"
          >
            {isSending ? 'Sending...' : 'Send Announcement'}
          </Button>
        </div>
      </div>

      <Modal
        isOpen={isAiOpen}
        onClose={() => {
          if (!isGenerating) setIsAiOpen(false);
        }}
        title="Generate Content"
        subtitle="The AI writes a draft from the theme. Nothing is saved or sent."
        maxWidth="2xl"
        headerGradient={true}
        showBackIcon={true}
        hideCloseButton={true}
      >
        <div className="space-y-4 p-2 sm:p-4">
          {aiError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">{aiError}</div>
          )}
          <p className="text-xs font-semibold text-slate-600">
            Theme: <span className="text-[#33077C]">{theme.trim()}</span>
            {subject.trim() && <span className="text-slate-400 font-medium"> · your subject is kept as written</span>}
          </p>
          <TextAreaField
            label="Facts to include (optional)"
            rows={4}
            value={aiInstructions}
            placeholder="e.g. Saturday 15 November 2026, 10 PM to 2 AM IST. Login and billing will be unavailable."
            onValueChange={setAiInstructions}
          />
          <p className="text-[11px] font-medium text-slate-500 -mt-2">Dates, times and names you give here are used as written; the AI does not invent them.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">Tone</label>
              <CustomSelect
                value={aiTone}
                onChange={(v) => setAiTone(v as AnnouncementTone)}
                options={[
                  { value: 'professional', label: 'Professional' },
                  { value: 'friendly', label: 'Friendly' },
                  { value: 'formal', label: 'Formal' },
                  { value: 'celebratory', label: 'Celebratory' },
                  { value: 'urgent', label: 'Urgent' },
                ]}
                activeColor="brand"
              />
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">Length</label>
              <CustomSelect
                value={aiLength}
                onChange={(v) => setAiLength(v as AnnouncementLength)}
                options={[
                  { value: 'short', label: 'Short' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'long', label: 'Long' },
                ]}
                activeColor="brand"
              />
            </div>
          </div>
          <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsAiOpen(false)}
              disabled={isGenerating}
              icon={<X className="w-4 h-4 text-slate-500" />}
              className="w-full sm:w-auto justify-center"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full sm:w-auto justify-center"
            >
              {isGenerating ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
