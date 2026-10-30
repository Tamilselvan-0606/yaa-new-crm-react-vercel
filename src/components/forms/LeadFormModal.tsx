import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LeadSchema, LeadFormData } from '../../schemas';
import { Lead } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { useScopeLock } from '../../hooks/useScopeLock';
import {
  useCreatePlatformLeadMutation,
  useUpdatePlatformLeadMutation,
  CreatePlatformLeadRequest,
} from '../../api/platform/leadApi';
import {
  clientProductApi,
  ClientProductApiItem,
  subOrganizationApi,
  SubOrganizationApiItem,
  branchApi,
  BranchApiItem,
  organizationApi,
  OrganizationApiItem,
  getStoredOrganizationId,
} from '../../api';
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

// 'Converted to Client' is set by creating the client from the lead, not by hand.
const LEAD_STATUS_OPTIONS = ['Open', 'Contacted', 'Qualified', 'Inactive', 'Lost'];

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

  // Role determination
  const userRole = (currentUser?.role || '').toString().toUpperCase();
  const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'SUPERADMIN';
  const isSubOrgAdmin =
    userRole === 'SUB_ORG_ADMIN' ||
    userRole === 'SUBORGADMIN' ||
    currentUser?.email?.toLowerCase() === 'suborgadmin@gmail.com' ||
    currentUser?.email?.toLowerCase() === 'yaaadmin@gmail.com';
  const isOrgAdmin = !isSuperAdmin && !isSubOrgAdmin;
  const { lockSubOrg, lockBranch, lockedSubOrgId, lockedBranchId } = useScopeLock();

  // Organization, SubOrg, Branch State
  const activeOrgId = currentUser?.organizationId || getStoredOrganizationId();
  const [organizations, setOrganizations] = useState<OrganizationApiItem[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedOrgName, setSelectedOrgName] = useState<string>(() => {
    return (
      localStorage.getItem('active_organization_orgsuperadmin') ||
      localStorage.getItem('active_organization') ||
      currentUser?.organization?.name ||
      'Yaa Creations'
    );
  });

  const [subOrganizations, setSubOrganizations] = useState<SubOrganizationApiItem[]>([]);
  const [loadingSubOrgs, setLoadingSubOrgs] = useState(false);
  const [selectedSubOrgId, setSelectedSubOrgId] = useState<string>('');
  const [selectedSubOrgName, setSelectedSubOrgName] = useState<string>('');

  const [branches, setBranches] = useState<BranchApiItem[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [apiModalError, setApiModalError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const effectiveOrgId = (isSuperAdmin ? selectedOrgId : activeOrgId) || undefined;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormData>({
    resolver: zodResolver(LeadSchema),
    defaultValues: {
      leadId: '',
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
      status: 'Open',
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

  // 1. Initialize Form Values & Selected Organization hierarchy when modal opens or lead changes
  useEffect(() => {
    if (!isOpen) return;

    setFormErrors({});
    setApiModalError(null);

    if (!initialLead) {
      reset({
        leadId: '',
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
        status: 'Open',
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
      return;
    }

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
      status: (initialLead.status as any) || 'Open',
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
      feedback: initialLead.feedback || initialLead.notes || '',
      nextAction: initialLead.nextAction || '',
      nextFollowUpDate: initialLead.nextFollowUpDate ? initialLead.nextFollowUpDate.split('T')[0] : '',
      notes: initialLead.notes || initialLead.feedback || '',
    });

    if (initialLead.organizationId) setSelectedOrgId(initialLead.organizationId);
    if (initialLead.subOrganizationId) setSelectedSubOrgId(initialLead.subOrganizationId);
    if (initialLead.branchId) setSelectedBranchId(initialLead.branchId);
  }, [isOpen, initialLead, reset, currentUser]);

  // Sub-org / branch admins are pinned to the scope from their login
  useEffect(() => {
    if (!isOpen) return;
    if (lockSubOrg) setSelectedSubOrgId(lockedSubOrgId);
    if (lockBranch) setSelectedBranchId(lockedBranchId);
  }, [isOpen, lockSubOrg, lockBranch, lockedSubOrgId, lockedBranchId, initialLead, subOrganizations]);

  // 2. Fetch Organizations
  useEffect(() => {
    if (!isOpen) return;

    if (!isSuperAdmin) {
      setSelectedOrgId(activeOrgId || '');
      if (activeOrgId) {
        organizationApi
          .getOrganizationById(activeOrgId)
          .then((res) => {
            if (res?.data?.name) setSelectedOrgName(res.data.name);
          })
          .catch(() => {});
      }
      return;
    }

    organizationApi
      .getOrganizations(1, 100)
      .then((res) => {
        const orgs = Array.isArray(res?.data) ? res.data : [];
        setOrganizations(orgs);
        if (orgs.length > 0 && !selectedOrgId) {
          setSelectedOrgId(orgs[0].id);
          setSelectedOrgName(orgs[0].name);
        }
      })
      .catch((e) => console.warn('Could not load orgs:', e));
  }, [isOpen, isSuperAdmin, activeOrgId]);

  // 3. Sub-organizations depend only on the organization
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setLoadingSubOrgs(true);

    subOrganizationApi
      .getSubOrganizations({ page_no: 1, page_size: 100, pagination_required: 'false' }, effectiveOrgId)
      .then((res) => {
        if (!isMounted) return;
        const subs = Array.isArray(res?.data) ? res.data : [];
        setSubOrganizations(subs);

        if (isSubOrgAdmin) {
          const savedSubName = (
            localStorage.getItem('active_sub_organization') ||
            (currentUser as any)?.subOrganization?.name ||
            (currentUser as any)?.subOrganizationName ||
            ''
          ).toLowerCase();
          const matched =
            subs.find(
              (s) => s.name.toLowerCase() === savedSubName || s.id === (currentUser as any)?.subOrganizationId
            ) || subs[0];
          if (matched) {
            setSelectedSubOrgId(matched.id);
            setSelectedSubOrgName(matched.name);
          }
        }
      })
      .catch(() => isMounted && setSubOrganizations([]))
      .finally(() => isMounted && setLoadingSubOrgs(false));

    return () => {
      isMounted = false;
    };
    // currentUser is read by id/name only; depend on those so a new object identity doesn't refetch
  }, [isOpen, effectiveOrgId, isSubOrgAdmin, currentUser?.id]);

  // 4. Branches depend on the organization and the selected sub-organization
  const branchesKey = `${effectiveOrgId || ''}|${selectedSubOrgId}`;
  const [branchesLoadedFor, setBranchesLoadedFor] = useState('');
  useEffect(() => {
    if (!isOpen) {
      setBranchesLoadedFor('');
      return;
    }
    let isMounted = true;
    setLoadingBranches(true);

    branchApi
      .getBranches(
        {
          page_no: 1,
          page_size: 100,
          pagination_required: 'false',
          sub_organization_id: selectedSubOrgId || undefined,
          organization_id: effectiveOrgId,
        },
        effectiveOrgId
      )
      .then((res) => (Array.isArray(res?.data) ? res.data : []))
      .catch(() => [] as BranchApiItem[])
      .then((list) => {
        if (!isMounted) return;
        setBranches(list);
        // Drop a branch that belongs to a previously selected sub-organization
        if (!lockBranch) setSelectedBranchId((cur) => (cur && !list.some((b) => b.id === cur) ? '' : cur));
        setBranchesLoadedFor(branchesKey);
        setLoadingBranches(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, effectiveOrgId, selectedSubOrgId, lockBranch]);

  // 5. Products: requested with the selected branch once the branches for the current org/sub-org are loaded
  // (so a stale branch id is never sent). If the server rejects the branch, the org/sub-org products are
  // loaded and filtered by the branch here instead.
  useEffect(() => {
    if (!isOpen || branchesLoadedFor !== branchesKey) return;
    let isMounted = true;
    const branchId = branches.some((b) => b.id === selectedBranchId) ? selectedBranchId : undefined;
    const load = (withBranch: boolean) =>
      clientProductApi.getProducts(
        {
          page: 1,
          limit: 100,
          organizationId: effectiveOrgId,
          subOrganizationId: selectedSubOrgId || undefined,
          branchId: withBranch ? branchId : undefined,
        },
        effectiveOrgId
      );

    setLoadingProducts(true);
    load(true)
      .then((res) => ({ res, filterByBranch: false }))
      .catch((e) =>
        branchId && /branch/i.test(e?.message || '')
          ? load(false).then((res) => ({ res, filterByBranch: true }))
          : Promise.reject(e)
      )
      .then(({ res, filterByBranch }) => {
        if (!isMounted) return;
        const list = Array.isArray(res?.data) ? res.data : [];
        const linkedProductId = branches.find((b) => b.id === branchId)?.productId;
        setProducts(filterByBranch ? list.filter((p) => p.branchId === branchId || p.id === linkedProductId) : list);
      })
      .catch(() => isMounted && setProducts([]))
      .finally(() => isMounted && setLoadingProducts(false));
    return () => {
      isMounted = false;
    };
  }, [isOpen, branchesLoadedFor, branchesKey, branches, effectiveOrgId, selectedSubOrgId, selectedBranchId]);

  const productOptions = products.map((prod) => ({
    value: prod.name,
    label: `${prod.name}${prod.code ? ` (${prod.code})` : ''}`,
  }));

  const validateCustomFields = () => {
    const errs: Record<string, string> = {};
    if (isSuperAdmin && !selectedOrgId) errs.organization = 'Organization is required';
    if (subOrganizations.length > 0 && !selectedSubOrgId) errs.subOrganization = 'Sub-Organization is required';
    if (branches.length > 0 && !selectedBranchId) errs.branch = 'Branch is required';
    return errs;
  };

  const extractApiErrorMessage = (e: any): string => {
    const firstFieldError =
      e?.data?.fields?.[0]?.message ||
      e?.response?.data?.fields?.[0]?.message;
    return (
      e?.data?.message ||
      e?.response?.data?.message ||
      e?.response?.data?.error?.message ||
      firstFieldError ||
      e?.message ||
      'Failed to save lead.'
    );
  };

  const onSubmit = async (data: LeadFormData) => {
    const customErrors = validateCustomFields();
    if (Object.keys(customErrors).length > 0) {
      setFormErrors(customErrors);
      return;
    }
    setFormErrors({});

    try {
      setApiModalError(null);
      const chosenPlan = data.interestedProductOrService || '';
      const effectivePhone = data.whatsapp || data.phone || '';

      const platformPayload: CreatePlatformLeadRequest = {
        name: data.name,
        company: data.company,
        email: data.email || `${data.company.toLowerCase().replace(/[^a-z0-9]/g, '') || 'lead'}@example.com`,
        phone: effectivePhone,
        whatsapp: data.whatsapp || effectivePhone,
        source: data.leadSource || 'Website',
        status: data.status || 'Open',
        priority: data.priority || 'Medium',
        value: 0,
        planInterest: chosenPlan,
        industry: data.company ? `${data.company} Industry` : 'General Business',
        location: data.address || '',
        followUpDate: data.leadDate ? new Date(data.leadDate).toISOString() : undefined,
        notes: data.feedback || data.notes || '',
        designation: data.designation || undefined,
        organizationId: effectiveOrgId,
        subOrganizationId: selectedSubOrgId || undefined,
        branchId: selectedBranchId || undefined,
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
      setApiModalError(extractApiErrorMessage(e));
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
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-0.5 sm:p-2 animate-in fade-in duration-150">
        {apiModalError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center justify-between">
            <span>{apiModalError}</span>
            <button
              type="button"
              onClick={() => setApiModalError(null)}
              className="text-rose-500 hover:text-rose-700 font-bold ml-2 cursor-pointer"
            >
              ×
            </button>
          </div>
        )}
        {/* Row 0: Organization | Sub-Organization | Branch (Role-based) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-2 border-b border-slate-100">
          {/* Organization */}
          <div>
            <label className={labelClass}>
              Organization <span className="text-rose-500 font-bold">*</span>
            </label>
            {isSuperAdmin ? (
              <>
                <CustomSelect
                  value={selectedOrgId}
                  error={!!formErrors.organization}
                  onChange={(val) => {
                    setSelectedOrgId(val);
                    const matched = organizations.find((o) => o.id === val);
                    if (matched) setSelectedOrgName(matched.name);
                    setSelectedSubOrgId('');
                    setSelectedBranchId('');
                    if (formErrors.organization) setFormErrors((prev) => ({ ...prev, organization: '' }));
                  }}
                  options={
                    organizations.length > 0
                      ? organizations.map((org) => ({ value: org.id, label: org.name }))
                      : [{ value: '', label: 'No Organizations found' }]
                  }
                  placeholder="Select Organization"
                />
                {formErrors.organization && (
                  <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.organization}</p>
                )}
              </>
            ) : (
              <div>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={selectedOrgName}
                  className={`${inputClass} bg-slate-100/80 cursor-not-allowed text-slate-600 font-semibold`}
                />
              </div>
            )}
          </div>

          {/* Sub-Organization */}
          <div>
            <label className={labelClass}>
              Sub-Organization <span className="text-rose-500 font-bold">*</span>
            </label>
            {lockSubOrg || initialLead ? (
              <input
                type="text"
                readOnly
                disabled
                value={
                  subOrganizations.find((s) => s.id === selectedSubOrgId)?.name ||
                  initialLead?.subOrganizationName ||
                  (loadingSubOrgs ? 'Loading...' : '')
                }
                title="Sub-organization cannot be modified"
                className={`${inputClass} bg-slate-100/80 cursor-not-allowed text-slate-600 font-semibold`}
              />
            ) : isSubOrgAdmin ? (
              <div>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={selectedSubOrgName || 'Sub Organization'}
                  title="Default sub-organization cannot be modified"
                  className={`${inputClass} bg-slate-100/80 cursor-not-allowed text-slate-600 font-semibold`}
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Default sub-organization (non-editable)</span>
              </div>
            ) : (
              <>
                <CustomSelect
                  value={selectedSubOrgId}
                  error={!!formErrors.subOrganization}
                  onChange={(val) => {
                    setSelectedSubOrgId(val);
                    const matched = subOrganizations.find((s) => s.id === val);
                    if (matched) setSelectedSubOrgName(matched.name);
                    setSelectedBranchId('');
                    if (formErrors.subOrganization) setFormErrors((prev) => ({ ...prev, subOrganization: '' }));
                  }}
                  options={
                    subOrganizations.length > 0
                      ? subOrganizations.map((s) => ({ value: s.id, label: s.name }))
                      : [{ value: '', label: loadingSubOrgs ? 'Loading Sub-Organizations...' : 'No Sub-Organizations' }]
                  }
                  placeholder={loadingSubOrgs ? 'Loading Sub-Organizations...' : 'Select Sub-Organization'}
                />
                {formErrors.subOrganization && (
                  <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.subOrganization}</p>
                )}
              </>
            )}
          </div>

          {/* Branch */}
          <div>
            <label className={labelClass}>
              Branch <span className="text-rose-500 font-bold">*</span>
            </label>
            {lockBranch ? (
              <input
                type="text"
                readOnly
                disabled
                value={branches.find((b) => b.id === lockedBranchId)?.name || (loadingBranches ? 'Loading...' : '')}
                title="Branch cannot be modified"
                className={`${inputClass} bg-slate-100/80 cursor-not-allowed text-slate-600 font-semibold`}
              />
            ) : (
            <CustomSelect
              value={selectedBranchId}
              error={!!formErrors.branch}
              onChange={(val) => {
                setSelectedBranchId(val);
                if (formErrors.branch) setFormErrors((prev) => ({ ...prev, branch: '' }));
              }}
              options={
                branches.length > 0 || (selectedBranchId && initialLead?.branchName)
                  ? [
                      ...branches,
                      ...(selectedBranchId && initialLead?.branchName && !branches.some((x) => x.id === selectedBranchId)
                        ? [{ id: selectedBranchId, name: initialLead.branchName, location: '' } as any]
                        : []),
                    ].map((b) => ({
                      value: b.id,
                      label: `${b.name}${b.location ? ` - ${b.location}` : ''}`,
                    }))
                  : [{ value: '', label: loadingBranches ? 'Loading branches...' : 'No branches found' }]
              }
              placeholder={loadingBranches ? 'Loading branches...' : 'Select Branch'}
            />
            )}
            {formErrors.branch && (
              <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.branch}</p>
            )}
          </div>
        </div>

        {/* Row 1: Lead ID | Lead Name | Date */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>
              Lead ID <span className="text-rose-500 font-bold">*</span>
            </label>
            <input
              {...register('leadId')}
              type="text"
              placeholder="e.g. LD-2026-001"
              className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                errors.leadId
                  ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                  : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
              }`}
            />
            {errors.leadId && (
              <p className="text-[11px] font-medium text-red-500 mt-1">{errors.leadId.message}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>
              Lead Name <span className="text-rose-500 font-bold">*</span>
            </label>
            <input
              {...register('company')}
              type="text"
              placeholder="Lead / Company Name"
              className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                errors.company
                  ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                  : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
              }`}
            />
            {errors.company && (
              <p className="text-[11px] font-medium text-red-500 mt-1">{errors.company.message}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>
              Date <span className="text-rose-500 font-bold">*</span>
            </label>
            <input
              {...register('leadDate')}
              type="date"
              className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                errors.leadDate
                  ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                  : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
              }`}
            />
            {errors.leadDate && (
              <p className="text-[11px] font-medium text-red-500 mt-1">{errors.leadDate.message}</p>
            )}
          </div>
        </div>

        {/* Row 2: Contact Person Name | Designation | WhatsApp */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>
              Contact Person Name <span className="text-rose-500 font-bold">*</span>
            </label>
            <input
              {...register('name')}
              type="text"
              placeholder="Full Name"
              className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                errors.name
                  ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                  : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
              }`}
            />
            {errors.name && (
              <p className="text-[11px] font-medium text-red-500 mt-1">{errors.name.message}</p>
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
            <label className={labelClass}>
              WhatsApp <span className="text-rose-500 font-bold">*</span>
            </label>
            <Controller
              name="whatsapp"
              control={control}
              render={({ field }) => (
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="e.g. 9876543210"
                  value={field.value || ''}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                    field.onChange(clean);
                  }}
                  className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                    errors.whatsapp
                      ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                      : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                  }`}
                />
              )}
            />
            {errors.whatsapp && (
              <p className="text-[11px] font-medium text-red-500 mt-1">{errors.whatsapp.message}</p>
            )}
          </div>
        </div>

        {/* Row 3: Email | Address | Lead Source */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>
              Email <span className="text-rose-500 font-bold">*</span>
            </label>
            <input
              {...register('email')}
              type="email"
              placeholder="name@company.com"
              className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                errors.email
                  ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                  : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
              }`}
            />
            {errors.email && (
              <p className="text-[11px] font-medium text-red-500 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>
              Address <span className="text-rose-500 font-bold">*</span>
            </label>
            <input
              {...register('address')}
              type="text"
              placeholder="City, State, Address"
              className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                errors.address
                  ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                  : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
              }`}
            />
            {errors.address && (
              <p className="text-[11px] font-medium text-red-500 mt-1">{errors.address.message}</p>
            )}
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
            <label className={labelClass}>
              Product Interest <span className="text-rose-500 font-bold">*</span>
            </label>
            <Controller
              name="interestedProductOrService"
              control={control}
              render={({ field }) => (
                <CustomSelect
                  value={field.value || ''}
                  error={!!errors.interestedProductOrService}
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
            {errors.interestedProductOrService && (
              <p className="text-[11px] font-medium text-red-500 mt-1">{errors.interestedProductOrService.message}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>Current Status</label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <CustomSelect
                  value={field.value || 'Open'}
                  onChange={field.onChange}
                  options={LEAD_STATUS_OPTIONS}
                  placeholder="Select Status"
                />
              )}
            />
          </div>

          <div>
            <label className={labelClass}>Feedback</label>
            <input
              {...register('feedback')}
              type="text"
              placeholder="Client feedback or notes..."
              className={inputClass}
            />
          </div>
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
