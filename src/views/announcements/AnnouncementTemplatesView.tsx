import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Eye, Pencil, Trash2, Power, FileText, Check, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { SearchBar } from '../../components/common/SearchBar';
import { FilterDropdown } from '../../components/common/FilterDropdown';
import { Pagination } from '../../components/common/Pagination';
import { CustomSelect } from '../../components/common/CustomSelect';
import { StatusBadge, StatusTone } from '../../components/common/StatusBadge';
import { RichTextEditor } from '../../components/common/RichTextEditor';
import { TextField } from '../../components/common/FormField';
import { ConfirmationModal } from '../../utils/confirmationModal';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { htmlToText, sanitizeHtml } from '../../utils/sanitizeHtml';
import { announcementTemplateApi, notifyTemplatesChanged } from '../../api/platform/announcementApi';
import type { AnnouncementTemplate } from '../../api/platform/announcementTypes';

const STATUS_TONES: Record<string, StatusTone> = {
  Active: { wrap: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  Inactive: { wrap: 'bg-slate-100 text-slate-700 border-slate-300', dot: 'bg-slate-400' },
};

const formatDate = (iso?: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const emptyForm = () => ({ name: '', description: '', contentHtml: '', isActive: 'Active' });

/** Manage the email templates the announcement editor offers (Platform Administrator). */
export const AnnouncementTemplatesView: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useAuth();
  // showToast is a new function on every render of the auth provider: keep it out of the effect dependencies.
  const toastRef = useRef(showToast);
  toastRef.current = showToast;

  const [items, setItems] = useState<AnnouncementTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pendingStatus, setPendingStatus] = useState('ALL');
  const [appliedStatus, setAppliedStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [previewing, setPreviewing] = useState<AnnouncementTemplate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<AnnouncementTemplate | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleting, setDeleting] = useState<AnnouncementTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await announcementTemplateApi.list({ page_no: 1, page_size: 100 });
      const rows = Array.isArray(res?.data) ? res.data : [];
      setItems([...rows].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
    } catch (err) {
      setItems([]);
      toastRef.current?.('error', 'Could not load templates', getApiErrorMessage(err, 'Please try again.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = appliedSearch.trim().toLowerCase();
    return items
      .filter((t) => !q || t.name.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q))
      .filter((t) => appliedStatus === 'ALL' || (appliedStatus === 'ACTIVE' ? t.isActive : !t.isActive));
  }, [items, appliedSearch, appliedStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const afterChange = async () => {
    notifyTemplatesChanged();
    await load();
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setErrors({});
    setSaveError(null);
    setIsModalOpen(true);
  };

  const openEdit = async (t: AnnouncementTemplate) => {
    setEditing(t);
    setForm({ name: t.name, description: t.description || '', contentHtml: t.contentHtml, isActive: t.isActive ? 'Active' : 'Inactive' });
    setErrors({});
    setSaveError(null);
    setIsModalOpen(true);
    // The list row already has the body; GET by id makes sure it is the saved version.
    try {
      const res = await announcementTemplateApi.getById(t.id);
      if (res?.data) {
        setEditing(res.data);
        setForm({
          name: res.data.name,
          description: res.data.description || '',
          contentHtml: res.data.contentHtml,
          isActive: res.data.isActive ? 'Active' : 'Inactive',
        });
      }
    } catch {
      /* keep the list row */
    }
  };

  const handleSave = async () => {
    const found: Record<string, string> = {};
    if (!form.name.trim()) found.name = 'Template name is required';
    if (!htmlToText(form.contentHtml)) found.content = 'Template content is required';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setIsSaving(true);
    setSaveError(null);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      contentHtml: form.contentHtml,
      isActive: form.isActive === 'Active',
    };
    try {
      if (editing) {
        await announcementTemplateApi.update(editing.id, payload);
        toastRef.current?.('success', 'Template Updated', `"${payload.name}" has been updated.`);
      } else {
        await announcementTemplateApi.create(payload);
        toastRef.current?.('success', 'Template Created', `"${payload.name}" has been created.`);
      }
      setIsModalOpen(false);
      await afterChange();
    } catch (err) {
      setSaveError(getApiErrorMessage(err, 'Could not save the template.'));
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (t: AnnouncementTemplate) => {
    setTogglingId(t.id);
    try {
      await announcementTemplateApi.update(t.id, { isActive: !t.isActive });
      toastRef.current?.('success', t.isActive ? 'Template Deactivated' : 'Template Activated', `"${t.name}" is now ${t.isActive ? 'inactive' : 'active'}.`);
      await afterChange();
    } catch (err) {
      toastRef.current?.('error', 'Update Failed', getApiErrorMessage(err, 'Could not update the template.'));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await announcementTemplateApi.remove(deleting.id);
      toastRef.current?.('success', 'Template Deleted', `"${deleting.name}" has been deleted.`);
      setDeleting(null);
      await afterChange();
    } catch (err) {
      toastRef.current?.('error', 'Delete Failed', getApiErrorMessage(err, 'Could not delete the template.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const headCell = 'py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white';

  return (
    <div className="space-y-6 pb-12 font-sans">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Announcement Templates</h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">Email templates offered by the announcement editor</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch gap-3 shrink-0 w-full sm:w-auto">
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate('/announcements')}
            icon={<ArrowLeft className="w-4 h-4 text-slate-500" />}
            className="justify-center"
          >
            Back to Announcements
          </Button>
          <Button variant="primary" size="md" onClick={openAdd} icon={<Plus className="w-4 h-4 text-white" />} className="justify-center">
            Add Template
          </Button>
        </div>
      </div>

      <SearchBar
        value={pendingSearch}
        onChange={setPendingSearch}
        placeholder="Search templates by name or description..."
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
          <div className="flex items-center gap-2.5 flex-wrap">
            <FilterDropdown
              options={[
                { label: 'Status : All', value: 'ALL' },
                { label: 'Active', value: 'ACTIVE', dotColor: '#10b981' },
                { label: 'Inactive', value: 'INACTIVE', dotColor: '#64748b' },
              ]}
              value={pendingStatus}
              onChange={setPendingStatus}
              placeholder="Status : All"
            />
          </div>
        }
        rightSlot={
          <div className="flex items-center gap-3 pr-1">
            <span className="text-xs font-semibold text-slate-500">
              Total Templates : <span className="text-[#33077C] font-bold">{filtered.length}</span>
            </span>
          </div>
        }
      />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200 min-w-[900px]">
            <thead>
              <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white tracking-wider uppercase">
                <th className={headCell}>TEMPLATE</th>
                <th className={`${headCell} text-center`}>TYPE</th>
                <th className={`${headCell} text-center`}>STATUS</th>
                <th className={headCell}>UPDATED</th>
                <th className={`${headCell} text-center`}>ACTIONS</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-7 h-7 border-2 border-purple-200 border-t-[#33077C] rounded-full animate-spin" />
                      <span className="text-xs text-slate-500">Loading templates...</span>
                    </div>
                  </td>
                </tr>
              ) : pageItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="w-8 h-8 text-slate-300" />
                      <span className="text-sm text-slate-500">No templates found.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                pageItems.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-5 border border-slate-200 align-top max-w-[420px]">
                      <div className="font-bold text-slate-900 truncate">{t.name}</div>
                      {t.description && <div className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-2">{t.description}</div>}
                    </td>
                    <td className="py-4 px-5 border border-slate-200 text-center">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full border text-[11px] font-bold ${
                          t.isSystem ? 'bg-indigo-50 text-[#33077C] border-indigo-100' : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {t.isSystem ? 'System' : 'Custom'}
                      </span>
                    </td>
                    <td className="py-4 px-5 border border-slate-200 text-center">
                      <StatusBadge status={t.isActive ? 'Active' : 'Inactive'} tones={STATUS_TONES} />
                    </td>
                    <td className="py-4 px-5 border border-slate-200 text-xs font-semibold text-slate-600">{formatDate(t.updatedAt || t.createdAt)}</td>
                    <td className="py-4 px-5 border border-slate-200">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewing(t)}
                          title="Preview"
                          className="w-8 h-8 rounded-lg bg-indigo-50 text-[#33077C] hover:bg-indigo-100 flex items-center justify-center cursor-pointer transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(t)}
                          title="Edit"
                          className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleActive(t)}
                          disabled={togglingId === t.id}
                          title={t.isActive ? 'Deactivate' : 'Activate'}
                          className={`w-8 h-8 rounded-lg disabled:opacity-50 flex items-center justify-center cursor-pointer transition-colors ${
                            t.isActive ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          }`}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        {!t.isSystem && (
                          <button
                            type="button"
                            onClick={() => setDeleting(t)}
                            title="Delete"
                            className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
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
        total={filtered.length}
        currentPage={safePage}
        pageSize={pageSize}
        pageSizeOptions={[5, 10, 20, 50]}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />

      {/* Preview */}
      <Modal
        isOpen={!!previewing}
        onClose={() => setPreviewing(null)}
        title={previewing?.name || 'Template'}
        subtitle={previewing?.description || ''}
        maxWidth="3xl"
        headerGradient={true}
        showBackIcon={true}
        hideCloseButton={true}
      >
        {previewing && (
          <div className="p-2 sm:p-4">
            <div className="border border-slate-200 rounded-xl p-5 bg-white">
              <div className="rte-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewing.contentHtml) }} />
            </div>
          </div>
        )}
      </Modal>

      {/* Add / Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isSaving) setIsModalOpen(false);
        }}
        title={editing ? 'Edit Template' : 'Add Template'}
        subtitle={editing?.isSystem ? 'System template: it can be edited and deactivated, not deleted' : 'Write the template the editor will offer'}
        maxWidth="4xl"
        headerGradient={true}
        showBackIcon={true}
        hideCloseButton={true}
      >
        <div className="space-y-4 p-2 sm:p-4">
          {saveError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center justify-between">
              <span>{saveError}</span>
              <button type="button" onClick={() => setSaveError(null)} className="text-rose-500 hover:text-rose-700 font-bold ml-2 cursor-pointer">
                ×
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <TextField
                label="Template Name"
                required
                value={form.name}
                error={errors.name}
                placeholder="e.g. Price update"
                onValueChange={(v) => {
                  setForm((p) => ({ ...p, name: v }));
                  setErrors((p) => ({ ...p, name: '' }));
                }}
              />
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">Status</label>
              <CustomSelect
                value={form.isActive}
                onChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
                options={['Active', 'Inactive']}
                placeholder="Select status"
                activeColor="brand"
              />
            </div>
          </div>
          <TextField
            label="Description"
            value={form.description}
            placeholder="One line that tells when to use it"
            onValueChange={(v) => setForm((p) => ({ ...p, description: v }))}
          />
          <div>
            <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
              Template Content <span className="text-rose-500 font-bold">*</span>
            </label>
            <RichTextEditor
              value={form.contentHtml}
              onChange={(html) => {
                setForm((p) => ({ ...p, contentHtml: html }));
                setErrors((p) => ({ ...p, content: '' }));
              }}
              placeholder="Write the template..."
              error={errors.content}
              minHeight={240}
            />
          </div>
          <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
              icon={<X className="w-4 h-4 text-slate-500" />}
              className="w-full sm:w-auto justify-center"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleSave}
              disabled={isSaving}
              icon={<Check className="w-4 h-4 stroke-[2.5]" />}
              className="w-full sm:w-auto justify-center"
            >
              {isSaving ? 'Saving...' : editing ? 'Save Changes' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmationModal
        isOpen={!!deleting}
        onClose={() => {
          if (!isDeleting) setDeleting(null);
        }}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        type="Delete"
        itemTypeLabel="Template"
        itemName={deleting?.name}
        title="Delete Template"
      />
    </div>
  );
};
