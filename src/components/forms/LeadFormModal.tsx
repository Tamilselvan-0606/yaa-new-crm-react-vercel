import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LeadSchema, LeadFormData } from '../../schemas';
import { Lead } from '../../types';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useCreateLead, useUpdateLead } from '../../hooks/useQueries';
import {
  useCreatePlatformLeadMutation,
  useUpdatePlatformLeadMutation,
  CreatePlatformLeadRequest,
} from '../../api/platform/leadApi';
import { CustomSelect } from '../common/CustomSelect';
import { ToggleField } from './ProductConfigForms';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  Building2, 
  Stethoscope, 
  Activity, 
  Bot, 
  Megaphone,
  Check
} from 'lucide-react';

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLead?: Lead | null;
  onLeadSaved?: () => void;
}

const LEAD_STEPS = [
  'Lead Information',
  'Location Details',
  'Lead Source & Product Interest',
  'Lead Management',
  'Initial Requirement',
  'Follow-up & Activity',
];

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

const PRIORITY_OPTIONS = ['High', 'Medium', 'Low'];
const INTEREST_LEVEL_OPTIONS = ['High', 'Medium', 'Low'];
const CONTACT_METHOD_OPTIONS = ['Call', 'WhatsApp', 'Email', 'Meeting', 'Other'];

const PRODUCT_INTEREST_OPTIONS = [
  { id: 'YaaConnect', name: 'YaaConnect', desc: 'Workforce & HR Management', icon: Building2, color: 'text-blue-600 bg-blue-50' },
  { id: 'DocMotez', name: 'DocMotez', desc: 'Clinic & Hospital Management', icon: Stethoscope, color: 'text-emerald-600 bg-emerald-50' },
  { id: 'TurfyLock', name: 'TurfyLock', desc: 'Turf & Sports Venue Booking', icon: Activity, color: 'text-amber-600 bg-amber-50' },
  { id: 'Aarudam AI', name: 'Aarudam AI', desc: 'AI Astrology & Insights', icon: Bot, color: 'text-purple-600 bg-purple-50' },
  { id: 'Digital Marketing', name: 'Digital Marketing', desc: 'Meta Ads, Reels & Growth', icon: Megaphone, color: 'text-rose-600 bg-rose-50' },
  { id: 'Other', name: 'Other Services', desc: 'Custom Development & Services', icon: Sparkles, color: 'text-slate-600 bg-slate-100' },
];

const inputClass = "w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all";
const labelClass = "text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5";

export const LeadFormModal: React.FC<LeadFormModalProps> = ({
  isOpen,
  onClose,
  initialLead,
  onLeadSaved,
}) => {
  const { users, currentUser } = useAuth();
  const createLeadMutation = useCreateLead();
  const updateLeadMutation = useUpdateLead();
  const [createPlatformLead] = useCreatePlatformLeadMutation();
  const [updatePlatformLead] = useUpdatePlatformLeadMutation();

  const [step, setStep] = useState(1);
  const [selectedProducts, setSelectedProducts] = useState<string[]>(['YaaConnect']);

  const generateLeadId = () => `LD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    trigger,
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
      interestedProducts: ['YaaConnect'],
      interestedProductOrService: 'YaaConnect',
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
      setStep(1);
      if (initialLead) {
        const prods = initialLead.interestedProducts || (initialLead.interestedProductOrService ? [initialLead.interestedProductOrService] : ['YaaConnect']);
        setSelectedProducts(prods);
        reset({
          leadId: initialLead.leadId || `LD-${initialLead.id}`,
          leadDate: initialLead.leadDate || (initialLead.createdAt ? initialLead.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
          name: initialLead.name,
          company: initialLead.company,
          designation: initialLead.designation || '',
          phone: initialLead.phone,
          whatsapp: initialLead.whatsapp || '',
          email: initialLead.email,
          alternatePhone: initialLead.alternatePhone || '',
          address: initialLead.address || '',
          city: initialLead.city || '',
          state: initialLead.state || '',
          pincode: initialLead.pincode || '',
          leadSource: initialLead.leadSource || initialLead.source || 'Website',
          interestedProducts: prods,
          interestedProductOrService: initialLead.interestedProductOrService || 'YaaConnect',
          assignedStaffId: initialLead.assignedStaffId || currentUser?.id || 'usr_staff_sales',
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
        setSelectedProducts(['YaaConnect']);
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
          interestedProducts: ['YaaConnect'],
          interestedProductOrService: 'YaaConnect',
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
        });
      }
    }
  }, [isOpen, initialLead, reset, currentUser]);

  const toggleProduct = (productId: string) => {
    setSelectedProducts((prev) => {
      const next = prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId];
      const valid = next.length > 0 ? next : [productId];
      setValue('interestedProducts', valid);
      setValue('interestedProductOrService', valid[0]);
      return valid;
    });
  };

  const staffOptions = users.map((u) => ({
    value: u.id,
    label: `${u.name} (${u.role})`,
  }));

  const handleNext = async () => {
    let isValid = true;
    if (step === 1) {
      isValid = await trigger(['name', 'company', 'phone', 'email']);
    }
    if (isValid && step < LEAD_STEPS.length) {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => s - 1);
    }
  };

  const onSubmit = async (data: LeadFormData) => {
    try {
      const assignedUser = users.find((u) => u.id === data.assignedStaffId);
      const tagList = data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
      const locationVal = [data.city, data.state].filter(Boolean).join(', ') || data.address || '';
      const chosenPlan = selectedProducts.join(', ') || data.interestedProductOrService || 'YaaConnect';
      const parsedValue = data.expectedBudget ? Number(data.expectedBudget) || 0 : 0;

      // Platform Leads API payload (aligned with OpenAPI specs)
      const platformPayload: CreatePlatformLeadRequest = {
        name: data.name,
        company: data.company,
        email: data.email || `${data.company.toLowerCase().replace(/[^a-z0-9]/g, '') || 'lead'}@example.com`,
        phone: data.phone,
        whatsapp: data.whatsapp || data.phone,
        source: data.leadSource || 'Website',
        status: data.status || 'New',
        priority: data.priority || 'Medium',
        value: parsedValue,
        planInterest: chosenPlan,
        industry: data.company ? `${data.company} Industry` : 'General Business',
        location: locationVal,
        assignedTo: data.assignedStaffId || undefined,
        followUpDate: data.nextFollowUpDate ? new Date(data.nextFollowUpDate).toISOString() : undefined,
        notes: data.notes || data.requirements || data.feedback || '',
      };

      if (initialLead) {
        await updatePlatformLead({ id: initialLead.id, payload: platformPayload }).unwrap();
      } else {
        await createPlatformLead(platformPayload).unwrap();
      }

      // Also trigger legacy mutation asynchronously for local store backward compatibility if needed
      try {
        const legacyPayload: Partial<Lead> = {
          ...data,
          leadSource: data.leadSource as any,
          source: data.leadSource as any,
          location: locationVal,
          assignedStaffName: assignedUser?.name || 'Sales Team',
          interestedProducts: selectedProducts,
          interestedProductOrService: chosenPlan,
          tags: tagList,
        };
        if (initialLead) {
          updateLeadMutation.mutate({ id: initialLead.id, data: legacyPayload as any });
        } else {
          createLeadMutation.mutate(legacyPayload as any);
        }
      } catch (_) {
        // ignore legacy sync errors
      }

      if (onLeadSaved) onLeadSaved();
      onClose();
    } catch (e: any) {
      // RTK Query or server error
      console.error('Failed to save platform lead:', e);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={LEAD_STEPS[step - 1] || 'Lead Details'}
      maxWidth="2xl"
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* ========================================================================= */}
        {/* STEP 1: LEAD INFORMATION */}
        {/* ========================================================================= */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Row 1: Lead ID & Lead Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  Lead ID <span className="text-slate-400 font-normal">(Auto)</span>
                </label>
                <input
                  {...register('leadId')}
                  type="text"
                  readOnly
                  className={`${inputClass} bg-slate-50 cursor-not-allowed`}
                />
              </div>
              <div>
                <label className={labelClass}>Lead Date</label>
                <input
                  {...register('leadDate')}
                  type="date"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Row 2: Lead Name / Business Name & Contact Person Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  Lead Name / Business Name <span className="text-slate-500">*</span>
                </label>
                <input
                  {...register('company')}
                  type="text"
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
                <label className={labelClass}>
                  Contact Person Name <span className="text-slate-500">*</span>
                </label>
                <input
                  {...register('name')}
                  type="text"
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
            </div>

            {/* Row 3: Designation & Phone Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Designation</label>
                <input
                  {...register('designation')}
                  type="text"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Phone Number <span className="text-slate-500">*</span>
                </label>
                <input
                  {...register('phone')}
                  type="text"
                  className={`w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                    errors.phone
                      ? 'border-rose-400 focus:ring-4 focus:ring-rose-500/10'
                      : 'border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                  }`}
                />
                {errors.phone && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{errors.phone.message}</p>
                )}
              </div>
            </div>

            {/* Row 4: WhatsApp Number & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>WhatsApp Number</label>
                <input
                  {...register('whatsapp')}
                  type="text"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Email Address</label>
                <input
                  {...register('email')}
                  type="email"
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
            </div>

            {/* Row 5: Alternate Phone Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Alternate Phone Number</label>
                <input
                  {...register('alternatePhone')}
                  type="text"
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: LOCATION DETAILS */}
        {/* ========================================================================= */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Address */}
            <div>
              <label className={labelClass}>Address</label>
              <textarea
                {...register('address')}
                rows={2}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none resize-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>

            {/* City, State, Pincode */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>City</label>
                <input
                  {...register('city')}
                  type="text"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>State</label>
                <input
                  {...register('state')}
                  type="text"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Pincode</label>
                <input
                  {...register('pincode')}
                  type="text"
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: LEAD SOURCE & PRODUCT INTEREST */}
        {/* ========================================================================= */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Lead Source */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    />
                  )}
                />
              </div>
            </div>

            {/* Product Interest Cards */}
            <div>
              <label className={labelClass}>
                Product Interest <span className="text-slate-400 font-normal">(Multi-select applicable offerings)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {PRODUCT_INTEREST_OPTIONS.map((prod) => {
                  const isSelected = selectedProducts.includes(prod.id);
                  const IconComponent = prod.icon;

                  return (
                    <div
                      key={prod.id}
                      onClick={() => toggleProduct(prod.id)}
                      className={`relative p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 select-none ${
                        isSelected
                          ? 'border-[#4309A2] ring-2 ring-[#4309A2]/15 bg-gradient-to-r from-orange-50/60 via-white to-orange-50/30 shadow-sm'
                          : 'border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-2xs'
                      }`}
                    >
                      {/* Checkbox badge */}
                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                          isSelected
                            ? 'bg-[#4309A2] text-white shadow-xs'
                            : 'border border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${prod.color}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800 text-xs sm:text-[13px] truncate">
                          {prod.name}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {prod.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: LEAD MANAGEMENT */}
        {/* ========================================================================= */}
        {step === 4 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Row 1: Assigned Staff & Lead Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Assigned Staff</label>
                <Controller
                  name="assignedStaffId"
                  control={control}
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value || currentUser?.id || 'usr_staff_sales'}
                      onChange={field.onChange}
                      options={staffOptions}
                    />
                  )}
                />
              </div>

              <div>
                <label className={labelClass}>Lead Status</label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value || 'New'}
                      onChange={field.onChange}
                      options={LEAD_STATUS_OPTIONS}
                    />
                  )}
                />
              </div>
            </div>

            {/* Row 2: Priority & Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Priority</label>
                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value || 'Medium'}
                      onChange={field.onChange}
                      options={PRIORITY_OPTIONS}
                    />
                  )}
                />
              </div>

              <div>
                <label className={labelClass}>Tags (comma-separated)</label>
                <input
                  {...register('tags')}
                  type="text"
                  placeholder="e.g. VIP, Hot Prospect, Urgent"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Row 3: Lead Notes */}
            <div>
              <label className={labelClass}>Lead Notes</label>
              <textarea
                {...register('notes')}
                rows={3}
                placeholder="Internal background notes, team context, or special instructions..."
                className="w-full px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none resize-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 5: INITIAL REQUIREMENT */}
        {/* ========================================================================= */}
        {step === 5 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Requirement / Enquiry */}
            <div>
              <label className={labelClass}>Requirement / Enquiry Details</label>
              <textarea
                {...register('requirements')}
                rows={3}
                placeholder="Specify the prospect's operational needs, required features, or pain points..."
                className="w-full px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none resize-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>

            {/* Primary Interested Product & Interest Level */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Primary Interested Product</label>
                <Controller
                  name="interestedProductOrService"
                  control={control}
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value || selectedProducts[0] || 'YaaConnect'}
                      onChange={field.onChange}
                      options={PRODUCT_INTEREST_OPTIONS.map((p) => p.name)}
                    />
                  )}
                />
              </div>

              <div>
                <label className={labelClass}>Interest Level</label>
                <Controller
                  name="interest"
                  control={control}
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value || 'High'}
                      onChange={field.onChange}
                      options={INTEREST_LEVEL_OPTIONS}
                    />
                  )}
                />
              </div>
            </div>

            {/* Expected Budget & Expected Onboarding Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Expected Budget (₹)</label>
                <input
                  {...register('expectedBudget')}
                  type="number"
                  placeholder="e.g. 500"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Expected Onboarding Date</label>
                <input
                  {...register('expectedOnboardingDate')}
                  type="date"
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 6: FOLLOW-UP & ACTIVITY */}
        {/* ========================================================================= */}
        {step === 6 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Contacted Toggle & Contact Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className={labelClass}>Prospect Contact Status</label>
                <Controller
                  name="isContacted"
                  control={control}
                  render={({ field }) => (
                    <ToggleField
                      label="Contacted Prospect"
                      value={field.value ?? true}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>

              <div>
                <label className={labelClass}>Contact Date</label>
                <input
                  {...register('contactDate')}
                  type="date"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Contact Method & Contacted By */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Contact Method</label>
                <Controller
                  name="contactMethod"
                  control={control}
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value || 'Call'}
                      onChange={field.onChange}
                      options={CONTACT_METHOD_OPTIONS}
                    />
                  )}
                />
              </div>

              <div>
                <label className={labelClass}>Contacted By</label>
                <input
                  {...register('contactedBy')}
                  type="text"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Feedback / Customer Requirement */}
            <div>
              <label className={labelClass}>Feedback / Customer Requirement</label>
              <textarea
                {...register('feedback')}
                rows={2}
                placeholder="Notes from call/meeting, client responses, or specific requests..."
                className="w-full px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none resize-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>

            {/* Next Action & Next Follow-up Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Next Action</label>
                <input
                  {...register('nextAction')}
                  type="text"
                  placeholder="e.g. Send proposal deck / Schedule product demo"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Next Follow-up Date</label>
                <input
                  {...register('nextFollowUpDate')}
                  type="date"
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FOOTER ACTIONS */}
        {/* ========================================================================= */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="h-11 px-5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-sm border border-slate-200 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-sm border border-slate-200 transition-colors cursor-pointer shadow-2xs flex items-center justify-center"
            >
              Cancel
            </button>

            {step < LEAD_STEPS.length ? (
              <button
                type="button"
                onClick={handleNext}
                className="h-11 px-6 bg-[#4309A2] hover:bg-[#e67e00] text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-11 px-6 bg-[#4309A2] hover:bg-[#e67e00] text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{initialLead ? 'Save Lead' : 'Create Lead'}</span>
              </button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};
