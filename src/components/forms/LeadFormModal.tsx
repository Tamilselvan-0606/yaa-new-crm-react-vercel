import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LeadSchema, LeadFormData } from '../../schemas';
import { Lead } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import {
  useCreatePlatformLeadMutation,
  useUpdatePlatformLeadMutation,
  CreatePlatformLeadRequest,
} from '../../api/platform/leadApi';
import { clientProductApi, ClientProductApiItem } from '../../api';
import { CustomSelect } from '../common/CustomSelect';
import { X, Check } from 'lucide-react';

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLead?: Lead | null;
  onLeadSaved?: () => void;
}

const LEAD_SOURCE_OPTIONS = [
  'Website',
  'Referral',
  'LinkedIn',
  'Cold Call',
  'Campaign',
  'Event',
  'Google',
  'Instagram',
  'Facebook',
  'WhatsApp',
  'Direct',
  'Other',
];

const LEAD_STATUS_OPTIONS = [
  'New',
  'Contacted',
  'Qualified',
  'Proposal',
  'Negotiation',
  'Won',
  'Lost',
  'Interested',
  'Follow-up',
  'Onboarding',
];

const inputClass =
  'w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all';
const labelClass = 'text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5';

export const LeadFormModal: React.FC<LeadFormModalProps> = ({
  isOpen,
  onClose,
  initialLead,
  onLeadSaved,
}) => {
  const { users, currentUser } = useAuth();
  const [createPlatformLead] = useCreatePlatformLeadMutation();
  const [updatePlatformLead] = useUpdatePlatformLeadMutation();
  const [products, setProducts] = useState<ClientProductApiItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const generateLeadId = () => `LD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  useEffect(() => {
    if (!isOpen) return;
    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        const res = await clientProductApi.getProducts({ page: 1, limit: 100 });
        if (res && res.success && Array.isArray(res.data)) {
          setProducts(res.data);
        } else {
          setProducts([]);
        }
      } catch (err) {
        console.warn('Failed to load products for Lead modal:', err);
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, [isOpen]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormData>({
    resolver: zodResolver(LeadSchema),
    defaultValues: {
      leadId: generateLeadId(),
      leadDate: new Date().toISOString().split('T')[0],
      name: '',
      company: '',
      designation: '',
      phone: '',
      whatsapp: '',
      email: '',
      alternatePhone: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      leadSource: 'Website',
      interestedProducts: [],
      interestedProductOrService: '',
      assignedStaffId: currentUser?.id || 'usr_staff_sales',
      status: 'New',
      priority: 'Medium',
      interest: 'High',
      tags: '',
      requirements: '',
      expectedBudget: '',
      expectedOnboardingDate: '',
      isContacted: true,
      contactDate: new Date().toISOString().split('T')[0],
      contactMethod: 'Call',
      contactedBy: currentUser?.name || 'Sales Representative',
      feedback: '',
      nextAction: '',
      nextFollowUpDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (initialLead) {
        const prodInterest =
          initialLead.interestedProductOrService ||
          (initialLead.interestedProducts && initialLead.interestedProducts[0]) ||
          '';

        reset({
          leadId: initialLead.leadId || `LD-${initialLead.id}`,
          leadDate:
            initialLead.leadDate ||
            (initialLead.createdAt ? initialLead.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
          name: initialLead.name,
          company: initialLead.company,
          designation: initialLead.designation || '',
          phone: initialLead.phone || initialLead.whatsapp || '',
          whatsapp: initialLead.whatsapp || initialLead.phone || '',
          email: initialLead.email || '',
          alternatePhone: initialLead.alternatePhone || '',
          address: initialLead.address || '',
          city: initialLead.city || '',
          state: initialLead.state || '',
          pincode: initialLead.pincode || '',
          leadSource: initialLead.leadSource || initialLead.source || 'Website',
          interestedProducts: prodInterest ? [prodInterest] : [],
          interestedProductOrService: prodInterest,
          assignedStaffId: initialLead.assignedStaffName || initialLead.assignedStaffId || currentUser?.name || '',
          status: (initialLead.status as any) || 'New',
          priority: (initialLead.priority as any) || 'Medium',
          interest: initialLead.interest || 'High',
          tags: initialLead.tags?.join(', ') || '',
          requirements: initialLead.requirements || '',
          expectedBudget: initialLead.expectedBudget || '',
          expectedOnboardingDate: initialLead.expectedOnboardingDate || '',
          isContacted: initialLead.isContacted ?? true,
          contactDate: initialLead.contactDate || new Date().toISOString().split('T')[0],
          contactMethod: initialLead.contactMethod || 'Call',
          contactedBy: initialLead.contactedBy || currentUser?.name || 'Sales Representative',
          feedback: initialLead.feedback || '',
          nextAction: initialLead.nextAction || '',
          nextFollowUpDate: initialLead.nextFollowUpDate ? initialLead.nextFollowUpDate.split('T')[0] : '',
          notes: initialLead.notes || '',
        });
      } else {
        reset({
          leadId: generateLeadId(),
          leadDate: new Date().toISOString().split('T')[0],
          name: '',
          company: '',
          designation: '',
          phone: '',
          whatsapp: '',
          email: '',
          alternatePhone: '',
          address: '',
          city: '',
          state: '',
          pincode: '',
          leadSource: 'Website',
          interestedProducts: [],
          interestedProductOrService: '',
          assignedStaffId: currentUser?.name || '',
          status: 'New',
          priority: 'Medium',
          interest: 'High',
          tags: '',
          requirements: '',
          expectedBudget: '',
          expectedOnboardingDate: '',
          isContacted: true,
          contactDate: new Date().toISOString().split('T')[0],
          contactMethod: 'Call',
          contactedBy: currentUser?.name || 'Sales Representative',
          feedback: '',
          nextAction: '',
          nextFollowUpDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          notes: '',
        });
      }
    }
  }, [isOpen, initialLead, reset, currentUser]);

  const staffOptions = users.map((u) => ({
    value: u.id,
    label: `${u.name} (${u.role})`,
  }));

  const productOptions = products.map((prod) => ({
    value: prod.name,
    label: `${prod.name}${prod.code ? ` (${prod.code})` : ''}`,
  }));

  const onSubmit = async (data: LeadFormData) => {
    try {
      const chosenPlan = data.interestedProductOrService || '';
      const effectivePhone = data.whatsapp || data.phone || '';

      const platformPayload: CreatePlatformLeadRequest = {
        name: data.name,
        company: data.company,
        email: data.email || `${data.company.toLowerCase().replace(/[^a-z0-9]/g, '') || 'lead'}@example.com`,
        phone: effectivePhone,
        whatsapp: data.whatsapp || effectivePhone,
        source: data.leadSource || 'Website',
        status: data.status || 'New',
        priority: data.priority || 'Medium',
        value: 0,
        planInterest: chosenPlan,
        industry: data.company ? `${data.company} Industry` : 'General Business',
        location: data.address || '',
        assignedTo: data.assignedStaffId || undefined,
        followUpDate: data.leadDate ? new Date(data.leadDate).toISOString() : undefined,
        notes: data.feedback || data.notes || '',
      };

      if (initialLead) {
        await updatePlatformLead({ id: initialLead.id, payload: platformPayload }).unwrap();
      } else {
        await createPlatformLead(platformPayload).unwrap();
      }

      if (onLeadSaved) onLeadSaved();
      onClose();
    } catch (e: any) {
      console.error('Failed to save platform lead:', e);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialLead ? 'Edit Lead' : 'Add Lead'}
      subtitle={
        <span className="text-white/80 text-xs font-normal">
          {initialLead
            ? 'Update lead details, product interest and assignment'
            : 'Register a new sales lead and track its status and communication'}
        </span>
      }
      maxWidth="4xl"
      headerGradient={true}
      showBackIcon={true}
      hideCloseButton={true}
      onBack={onClose}
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-2 sm:p-4 animate-in fade-in duration-150">
        {/* Row 1: Lead ID | Lead Name | Date */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>
              Lead ID <span className="text-slate-400 font-normal">(Auto)</span>
            </label>
            <input
              {...register('leadId')}
              type="text"
              readOnly
              className={`${inputClass} bg-slate-100/80 cursor-not-allowed`}
            />
          </div>

          <div>
            <label className={labelClass}>
              Lead Name <span className="text-slate-500">*</span>
            </label>
            <input
              {...register('company')}
              type="text"
              placeholder="Lead / Company Name"
              className={`w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                errors.company
                  ? 'border-rose-400 focus:ring-4 focus:ring-rose-500/10'
                  : 'border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
              }`}
            />
            {errors.company && (
              <p className="text-xs text-rose-500 mt-1 font-medium">{errors.company.message}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>Date</label>
            <input
              {...register('leadDate')}
              type="date"
              className={inputClass}
            />
          </div>
        </div>

        {/* Row 2: Contact Person Name | Designation | WhatsApp */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>
              Contact Person Name <span className="text-slate-500">*</span>
            </label>
            <input
              {...register('name')}
              type="text"
              placeholder="Full Name"
              className={`w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                errors.name
                  ? 'border-rose-400 focus:ring-4 focus:ring-rose-500/10'
                  : 'border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
              }`}
            />
            {errors.name && (
              <p className="text-xs text-rose-500 mt-1 font-medium">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>Designation</label>
            <input
              {...register('designation')}
              type="text"
              placeholder="e.g. Founder, Ops Manager"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>WhatsApp</label>
            <input
              {...register('whatsapp')}
              type="text"
              placeholder="e.g. +91 98765 43210"
              className={inputClass}
            />
          </div>
        </div>

        {/* Row 3: Email | Address | Lead Source */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Email</label>
            <input
              {...register('email')}
              type="email"
              placeholder="name@company.com"
              className={`w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                errors.email
                  ? 'border-rose-400 focus:ring-4 focus:ring-rose-500/10'
                  : 'border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
              }`}
            />
            {errors.email && (
              <p className="text-xs text-rose-500 mt-1 font-medium">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>Address</label>
            <input
              {...register('address')}
              type="text"
              placeholder="City, State, Address"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Lead Source</label>
            <Controller
              name="leadSource"
              control={control}
              render={({ field }) => (
                <CustomSelect
                  value={field.value || 'Website'}
                  onChange={field.onChange}
                  options={LEAD_SOURCE_OPTIONS}
                  placeholder="Select Lead Source"
                />
              )}
            />
          </div>
        </div>

        {/* Row 4: Product Interest | Current Status | Assigned Staff */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Product Interest</label>
            <Controller
              name="interestedProductOrService"
              control={control}
              render={({ field }) => (
                <CustomSelect
                  value={field.value || ''}
                  onChange={field.onChange}
                  options={
                    productOptions.length > 0
                      ? productOptions
                      : [{ value: '', label: loadingProducts ? 'Loading products...' : 'No products found' }]
                  }
                  placeholder={loadingProducts ? 'Loading products...' : 'Select Product'}
                />
              )}
            />
          </div>

          <div>
            <label className={labelClass}>Current Status</label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <CustomSelect
                  value={field.value || 'New'}
                  onChange={field.onChange}
                  options={LEAD_STATUS_OPTIONS}
                  placeholder="Select Status"
                />
              )}
            />
          </div>

          <div>
            <label className={labelClass}>Assigned Staff</label>
            <input
              {...register('assignedStaffId')}
              type="text"
              placeholder="e.g. Sales Representative / Agent Name"
              className={inputClass}
            />
          </div>
        </div>

        {/* Row 5: Feedback (Full width or across 3 columns) */}
        <div>
          <label className={labelClass}>Feedback</label>
          <textarea
            {...register('feedback')}
            rows={3}
            placeholder="Notes from initial conversation, client feedback, or specific requirements..."
            className="w-full px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none resize-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
          />
        </div>

        {/* Modal Footer */}
        <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 border-t border-slate-100">
          <Button
            type="button"
            variant="secondary"
            size="md"
            icon={<X className="w-4 h-4 text-slate-500" />}
            onClick={onClose}
            className="w-full sm:w-auto justify-center"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSubmitting}
            icon={<Check className="w-4 h-4 stroke-[2.5]" />}
            className="w-full sm:w-auto justify-center"
          >
            {isSubmitting ? 'Saving...' : initialLead ? 'Save Changes' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
