import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../context/AuthContext';
import { Product, ProductPlan, BillingCycle, PricingType } from '../../types';
import { PlanSchema, PlanFormData } from '../../validations';
import { CustomSelect } from '../common/CustomSelect';
import { FormError } from '../common/FormError';
import { Modal } from '../common/Modal';
import {
  Plus,
  Check,
  X,
  LayoutDashboard,
  Building2,
  GitBranch,
  Boxes,
  UsersRound,
  FileText,
  FileSpreadsheet,
  Receipt,
  CheckSquare,
  CreditCard,
  Repeat,
  Bell,
  BarChart3,
  ShoppingBag,
  Settings,
  Package,
  ShoppingCart,
  Truck,
} from 'lucide-react';

const GST_RATE_OPTIONS = [
  { value: '18', label: '18% (Standard GST)' },
  { value: '12', label: '12% GST' },
  { value: '5', label: '5% GST' },
  { value: '0', label: '0% (Tax Exempt)' },
];

const BILLING_CYCLE_OPTIONS = [
  'Monthly',
  'Quarterly',
  'Annually',
  'One-Time',
  'Custom',
];

const PLAN_TYPE_OPTIONS = [
  'Fixed',
  'Per-User',
  'Usage-Based',
  'Custom Quote',
  'Tiered',
];

const PLAN_STATUS_OPTIONS = [
  'Active',
  'Inactive',
];

export interface AppPermissionModule {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}

export const APPLICATION_MODULES: AppPermissionModule[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: LayoutDashboard,
    iconColor: '#33077C',
  },
  {
    id: 'organizations',
    name: 'Organizations & Sub-Orgs',
    icon: Building2,
    iconColor: '#2563eb',
  },
  {
    id: 'branches',
    name: 'Branches',
    icon: GitBranch,
    iconColor: '#059669',
  },
  {
    id: 'products',
    name: 'products',
    icon: Boxes,
    iconColor: '#d97706',
  },
  {
    id: 'leads',
    name: 'Clients & Leads',
    icon: UsersRound,
    iconColor: '#7c3aed',
  },
  {
    id: 'quotes',
    name: 'Quotations',
    icon: FileText,
    iconColor: '#0891b2',
  },
  {
    id: 'proforma',
    name: 'Proforma Invoices',
    icon: FileSpreadsheet,
    iconColor: '#4f46e5',
  },
  {
    id: 'invoices',
    name: 'Invoices',
    icon: Receipt,
    iconColor: '#16a34a',
  },
  {
    id: 'work_mgmt',
    name: 'Work Management',
    icon: CheckSquare,
    iconColor: '#ea580c',
  },
  {
    id: 'payments',
    name: 'Payments',
    icon: CreditCard,
    iconColor: '#0284c7',
  },
  {
    id: 'subscriptions',
    name: 'subscription plans',
    icon: Repeat,
    iconColor: '#9333ea',
  },
  {
    id: 'reminders',
    name: 'Notifications',
    icon: Bell,
    iconColor: '#e11d48',
  },
  {
    id: 'reports',
    name: 'CRM Reports',
    icon: BarChart3,
    iconColor: '#0d9488',
  },
  {
    id: 'sm_inventory',
    name: 'Inventory',
    icon: Package,
    iconColor: '#0891b2',
  },
  {
    id: 'sm_sales_hub',
    name: 'Sales Hub',
    icon: ShoppingCart,
    iconColor: '#ca8a04',
  },
  {
    id: 'sm_purchase',
    name: 'Purchase',
    icon: Truck,
    iconColor: '#ea580c',
  },
  {
    id: 'settings',
    name: 'System Settings',
    icon: Settings,
    iconColor: '#475569',
  },
];

interface PlanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productId: string, planData: Partial<ProductPlan>, planId?: string) => Promise<void>;
  products: Product[];
  initialProductId?: string;
  initialPlan?: ProductPlan | null;
  isSuperAdmin?: boolean;
}

const inputClass =
  'w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all';
const labelClass = 'text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5';

export const PlanFormModal: React.FC<PlanFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  products,
  initialProductId,
  initialPlan,
  isSuperAdmin: propIsSuperAdmin,
}) => {
  const { isSuperAdmin: contextIsSuperAdmin } = useAuth();
  const isSuperAdmin = propIsSuperAdmin !== undefined ? propIsSuperAdmin : contextIsSuperAdmin;

  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialProductId || products[0]?.id || 'prod_1'
  );
  const [isCustomPlanSelected, setIsCustomPlanSelected] = useState(false);
  const [customPlanName, setCustomPlanName] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState('');
  const [specs, setSpecs] = useState<Record<string, any>>({});

  // Module Permissions state: key is module id, value is 'all' or 'none'
  const [modulePermissions, setModulePermissions] = useState<Record<string, 'all' | 'none'>>(() => {
    const init: Record<string, 'all' | 'none'> = {};
    APPLICATION_MODULES.forEach((mod) => {
      init[mod.id] = 'all';
    });
    return init;
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PlanFormData>({
    resolver: zodResolver(PlanSchema),
    defaultValues: {
      name: '',
      price: '' as any,
      gstRate: '' as any,
      currency: '₹',
      billingCycle: '' as any,
      planType: '' as any,
      status: '' as any,
      maxBranchLimit: '',
      description: '',
      isPopular: false,
      features: [],
    },
  });

  const price = watch('price');
  const gstRate = watch('gstRate');
  const currency = watch('currency') || '₹';
  const name = watch('name');

  // Auto calculate GST and Total Price
  const numericPrice = Number(price) || 0;
  const hasPrice = price !== undefined && price !== null && !isNaN(Number(price)) && Number(price) > 0;
  const numericGst = gstRate !== undefined && gstRate !== '' ? Number(gstRate) : 0;
  const gstAmount = Math.round((numericPrice * numericGst) / 100);
  const totalPriceWithGst = numericPrice + gstAmount;

  const getInitialProductSpecs = (prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    const code = prod?.code;
    if (prodId === 'prod_1' || code === 'YAA_CONNECT') {
      return {
        attendance: true,
        leaveManagement: true,
      };
    }
    if (prodId === 'prod_2' || code === 'DOC_MOTEZ') {
      return {
        appointmentManagement: true,
        medicalRecords: true,
      };
    }
    if (prodId === 'prod_5' || code === 'TURFY') {
      return {
        onlineBooking: true,
        paymentIntegration: true,
      };
    }
    if (prodId === 'prod_4' || code === 'AARUDAM_AI') {
      return {
        aiAstrology: true,
        onlineConsultation: true,
      };
    }
    if (prodId === 'prod_6' || code === 'DIGITAL_MARKETING') {
      return {
        socialMediaManagement: true,
      };
    }
    if (prodId === 'prod_3' || code === 'DOC_DENTQ') {
      return {
        dentalCharting: true,
        treatmentPlansBilling: true,
      };
    }
    return {};
  };

  useEffect(() => {
    if (initialPlan) {
      const isCustom = !['Basic', 'Standard', 'Premium', 'Enterprise'].includes(initialPlan.name || '');
      setIsCustomPlanSelected(isCustom);
      setCustomPlanName(isCustom ? (initialPlan.name || '') : '');
      reset({
        name: initialPlan.name || '',
        price: initialPlan.price ?? 0,
        gstRate: (initialPlan.specs as any)?.gstRate ?? 18,
        currency: initialPlan.currency || '₹',
        billingCycle: (initialPlan.billingCycle as any) || 'Monthly',
        planType: (initialPlan.pricingType as any) || (initialPlan.customizablePrice ? 'Custom Quote' : 'Fixed'),
        status: (initialPlan.status as any) || 'Active',
        maxBranchLimit:
          initialPlan.maxBranchLimit !== undefined
            ? initialPlan.maxBranchLimit
            : initialPlan.specs?.maxBranchLimit !== undefined
            ? initialPlan.specs.maxBranchLimit
            : '',
        description: initialPlan.description || '',
        isPopular: !!initialPlan.isPopular,
        features: initialPlan.features ? [...initialPlan.features] : [],
      });
      setFeatures(initialPlan.features ? [...initialPlan.features] : []);
      setSpecs(initialPlan.specs || {});

      // Restore module permissions from initialPlan if present
      const loadedPerms: Record<string, 'all' | 'none'> = {};
      const planPerms = (initialPlan as any).permissions || (initialPlan.specs as any)?.modulePermissions;
      APPLICATION_MODULES.forEach((mod) => {
        if (planPerms && planPerms[mod.id]) {
          loadedPerms[mod.id] = planPerms[mod.id];
        } else {
          loadedPerms[mod.id] = 'all';
        }
      });
      setModulePermissions(loadedPerms);
    } else {
      setIsCustomPlanSelected(false);
      setCustomPlanName('');
      reset({
        name: '',
        price: '' as any,
        gstRate: '' as any,
        currency: '₹',
        billingCycle: '' as any,
        planType: '' as any,
        status: '' as any,
        maxBranchLimit: '',
        description: '',
        isPopular: false,
        features: [],
      });
      setFeatures([]);
      const effectiveProdId = initialProductId || products[0]?.id || 'prod_1';
      setSpecs(getInitialProductSpecs(effectiveProdId));

      const defaultPerms: Record<string, 'all' | 'none'> = {};
      APPLICATION_MODULES.forEach((mod) => {
        defaultPerms[mod.id] = 'all';
      });
      setModulePermissions(defaultPerms);
    }
  }, [initialPlan, isOpen, initialProductId, reset]);

  useEffect(() => {
    if (initialProductId) {
      setSelectedProductId(initialProductId);
      if (!initialPlan) {
        setSpecs(getInitialProductSpecs(initialProductId));
      }
    }
  }, [initialProductId]);

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    if (!initialPlan) {
      setFeatures([]);
      setSpecs(getInitialProductSpecs(prodId));
    }
  };

  const handleSpecChange = (key: string, value: any) => {
    setSpecs((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleAddFeature = (text?: string) => {
    const itemToAdd = (text ?? newFeature).trim();
    if (itemToAdd && !features.includes(itemToAdd)) {
      setFeatures((prev) => [...prev, itemToAdd]);
    }
    setNewFeature('');
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  // Master check state for All Access and No Access
  const allModulesHaveAllAccess = APPLICATION_MODULES.every((m) => modulePermissions[m.id] === 'all');
  const allModulesHaveNoAccess = APPLICATION_MODULES.every((m) => modulePermissions[m.id] === 'none');

  const handleToggleGlobalAllAccess = (checked: boolean) => {
    const next: Record<string, 'all' | 'none'> = {};
    APPLICATION_MODULES.forEach((m) => {
      next[m.id] = checked ? 'all' : 'none';
    });
    setModulePermissions(next);
  };

  const handleToggleGlobalNoAccess = (checked: boolean) => {
    const next: Record<string, 'all' | 'none'> = {};
    APPLICATION_MODULES.forEach((m) => {
      next[m.id] = checked ? 'none' : 'all';
    });
    setModulePermissions(next);
  };

  const handleSetModuleAccess = (moduleId: string, access: 'all' | 'none') => {
    setModulePermissions((prev) => ({
      ...prev,
      [moduleId]: access,
    }));
  };

  const [submitError, setSubmitError] = useState<string | null>(null);

  const onSubmit = async (data: PlanFormData) => {
    setSubmitError(null);
    const finalPlanName = isCustomPlanSelected ? customPlanName.trim() : (data.name || '').trim();
    if (!finalPlanName) {
      setSubmitError('Plan Name is required');
      return;
    }

    try {
      const planData: Partial<ProductPlan> = {
        name: finalPlanName,
        price: Number(data.price) || 0,
        currency: data.currency || '₹',
        billingCycle: (data.billingCycle as BillingCycle) || 'Monthly',
        pricingType: data.planType ? (data.planType as PricingType) : 'Fixed',
        customizablePrice: data.planType === 'Custom Quote',
        status: (data.status as 'Active' | 'Inactive') || 'Active',
        maxBranchLimit: data.maxBranchLimit !== '' && data.maxBranchLimit !== undefined ? Number(data.maxBranchLimit) : undefined,
        description: (data.description || '').trim(),
        isPopular: data.isPopular,
        features: features.filter(Boolean),
        permissions: modulePermissions,
        specs: {
          ...specs,
          modulePermissions,
          ...(data.gstRate !== '' && data.gstRate !== undefined ? { gstRate: Number(data.gstRate) } : {}),
          ...(data.maxBranchLimit !== '' && data.maxBranchLimit !== undefined ? { maxBranchLimit: Number(data.maxBranchLimit) } : {}),
        },
      };

      await onSave(selectedProductId, planData, initialPlan?.id);
      onClose();
    } catch (err: any) {
      console.error('Plan save error in modal:', err);
      const msg = err?.response?.data?.message || err?.response?.data?.error?.message || err?.message || 'Failed to save plan';
      setSubmitError(msg);
    }
  };

  const onInvalid = (errors: any) => {
    console.warn('Form validation failed:', errors);
  };

  const currentProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const renderModulePills = (
    label: string,
    items: { key: string; label: string }[]
  ) => (
    <div className="space-y-1.5 pt-1">
      <label className={labelClass}>{label}</label>
      <div className="flex flex-wrap gap-2 pt-0.5">
        {items.map((item) => {
          const isChecked = !!specs[item.key];
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleSpecChange(item.key, !isChecked)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                isChecked
                  ? 'bg-[#33077C] text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {isChecked && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderFeaturesField = () => (
    <div>
      <label className={labelClass}>Features</label>
      <div className="relative">
        <input
          type="text"
          value={newFeature}
          onChange={(e) => setNewFeature(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddFeature();
            }
          }}
          className={`${inputClass} pr-10`}
        />
        <button
          type="button"
          onClick={() => handleAddFeature()}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-[#33077C] hover:bg-[#33077C]/10 rounded-lg transition-colors cursor-pointer"
          title="Add feature"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );

  const renderFeatureTags = () =>
    features.length > 0 && (
      <div className="flex flex-wrap gap-2 pt-1">
        {features.map((feat, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#33077C] text-white text-xs font-semibold rounded-xl shadow-xs group"
          >
            <Check className="w-3.5 h-3.5 stroke-[3] text-white shrink-0" />
            <span>{feat}</span>
            <button
              type="button"
              onClick={() => handleRemoveFeature(index)}
              className="text-white/70 hover:text-white p-0.5 rounded transition-colors cursor-pointer ml-0.5"
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </span>
        ))}
      </div>
    );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialPlan ? `Edit Plan: ${initialPlan.name}` : 'Add Plan'}
      subtitle={isSuperAdmin ? "Set plan pricing, taxes, billing cycle, and plan tier status" : "Configure pricing, billing intervals, and feature limits"}
      maxWidth="5xl"
      headerGradient={true}
      showBackIcon={true}
      hideCloseButton={true}
    >
      <form noValidate onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4.5 p-2 sm:p-4 animate-in fade-in duration-150">
        {submitError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center justify-between">
            <span>{submitError}</span>
            <button
              type="button"
              onClick={() => setSubmitError(null)}
              className="text-rose-500 hover:text-rose-700 font-bold ml-2 cursor-pointer"
            >
              ×
            </button>
          </div>
        )}
        {isSuperAdmin ? (
          <div className="space-y-4">
            {/* Row 1: Plan Name (1 col), Price (1 col), GST Rate (1 col) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>
                  Plan Name <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter plan name"
                  {...register('name')}
                  className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                    errors.name
                      ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                      : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                  }`}
                />
                {errors.name?.message && (
                  <p className="text-[11px] font-medium text-red-500 mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className={labelClass}>
                  Price ({currency}) <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">
                    {currency}
                  </span>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    {...register('price', { valueAsNumber: true })}
                    className={`w-full h-11 pl-8 pr-4 bg-white rounded-xl text-xs sm:text-[13px] font-semibold text-slate-900 outline-none transition-all ${
                      errors.price
                        ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                        : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                    }`}
                  />
                </div>
                {errors.price?.message && (
                  <p className="text-[11px] font-medium text-red-500 mt-1">{errors.price.message}</p>
                )}
              </div>

              <div>
                <label className={labelClass}>
                  GST Rate <span className="text-rose-500 font-bold">*</span>
                </label>
                <Controller
                  control={control}
                  name="gstRate"
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value !== undefined && field.value !== '' ? String(field.value) : ''}
                      onChange={(val) => field.onChange(val === '' ? '' : Number(val))}
                      options={GST_RATE_OPTIONS}
                      placeholder="Select GST Rate"
                      activeColor="brand"
                      error={!!errors.gstRate}
                    />
                  )}
                />
                {errors.gstRate?.message && (
                  <p className="text-[11px] font-medium text-red-500 mt-1">{errors.gstRate.message}</p>
                )}
              </div>
            </div>

            {/* Row 2: Total Price with GST (1 col), Billing Cycle (1 col), Plan Type (1 col) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Total Price with GST</label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    tabIndex={-1}
                    value={hasPrice ? `${currency}${totalPriceWithGst.toLocaleString()}` : ''}
                    placeholder=""
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-[13px] font-bold text-[#33077C] cursor-default select-none pr-28 outline-none"
                    style={{ borderRadius: '0.75rem' }}
                  />
                  {hasPrice && gstRate !== '' && (
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-400 pointer-events-none">
                      Incl. {gstRate}% GST
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  Billing Cycle <span className="text-rose-500 font-bold">*</span>
                </label>
                <Controller
                  control={control}
                  name="billingCycle"
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value}
                      onChange={(val) => field.onChange(val as any)}
                      options={BILLING_CYCLE_OPTIONS}
                      placeholder="Select Billing Cycle"
                      activeColor="brand"
                      error={!!errors.billingCycle}
                    />
                  )}
                />
                {errors.billingCycle?.message && (
                  <p className="text-[11px] font-medium text-red-500 mt-1">{errors.billingCycle.message}</p>
                )}
              </div>

              <div>
                <label className={labelClass}>
                  Plan Type <span className="text-rose-500 font-bold">*</span>
                </label>
                <Controller
                  control={control}
                  name="planType"
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value}
                      onChange={(val) => field.onChange(val as any)}
                      options={PLAN_TYPE_OPTIONS}
                      placeholder="Select Plan Type"
                      activeColor="brand"
                      error={!!errors.planType}
                    />
                  )}
                />
                {errors.planType?.message && (
                  <p className="text-[11px] font-medium text-red-500 mt-1">{errors.planType.message}</p>
                )}
              </div>
            </div>

            {/* Row 3: Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>
                  Status <span className="text-rose-500 font-bold">*</span>
                </label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value}
                      onChange={(val) => field.onChange(val as any)}
                      options={PLAN_STATUS_OPTIONS}
                      placeholder="Select Status"
                      activeColor="brand"
                      error={!!errors.status}
                    />
                  )}
                />
                {errors.status?.message && (
                  <p className="text-[11px] font-medium text-red-500 mt-1">{errors.status.message}</p>
                )}
              </div>
            </div>

            {/* Module Permissions Section - Exact Reference Image 2 Design */}
            <div className="pt-6 sm:pt-8 border-t border-slate-100">
              <div className="mb-5">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">Module Permissions</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Configure access permissions for each module. Users with "All Access" can use all features, while "No Access" restricts module usage.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse border border-slate-200">
                    <thead>
                      <tr className="bg-[#33077C] text-white text-[11px] sm:text-[12px] font-bold uppercase tracking-wider">
                        <th className="py-3.5 px-5 border border-[#33077C]/30 bg-[#33077C] text-white font-extrabold">MODULE</th>
                        <th className="py-3.5 px-4 text-center border border-[#33077C]/30 bg-[#33077C] text-white font-extrabold">ALL ACCESS</th>
                        <th className="py-3.5 px-4 text-center border border-[#33077C]/30 bg-[#33077C] text-white font-extrabold">NO ACCESS</th>
                        <th className="py-3.5 px-5 text-center border border-[#33077C]/30 bg-[#33077C] text-white font-extrabold">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700">
                      {APPLICATION_MODULES.map((mod) => {
                        const Icon = mod.icon;
                        const isAll = modulePermissions[mod.id] === 'all';
                        const isNone = modulePermissions[mod.id] === 'none';

                        return (
                          <tr
                            key={mod.id}
                            className={`transition-colors hover:bg-slate-50/80 ${
                              isAll ? 'bg-white' : 'bg-slate-50/40'
                            }`}
                          >
                            {/* Module Name with Icon */}
                            <td className="py-3.5 px-5 border border-slate-200">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs"
                                  style={{
                                    backgroundColor: `${mod.iconColor}15`,
                                    color: mod.iconColor,
                                  }}
                                >
                                  <Icon className="w-4.5 h-4.5" />
                                </div>
                                <span className="font-bold text-slate-800 text-xs sm:text-[13px] tracking-tight">
                                  {mod.name}
                                </span>
                              </div>
                            </td>

                            {/* ALL ACCESS Checkbox */}
                            <td className="py-3.5 px-4 text-center border border-slate-200">
                              <label className="inline-flex items-center justify-center cursor-pointer p-1">
                                <input
                                  type="checkbox"
                                  checked={isAll}
                                  onChange={() => handleSetModuleAccess(mod.id, 'all')}
                                  className="w-4.5 h-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 accent-emerald-600 cursor-pointer"
                                />
                              </label>
                            </td>

                            {/* NO ACCESS Checkbox (Red/Rose color when checked) */}
                            <td className="py-3.5 px-4 text-center border border-slate-200">
                              <label className="inline-flex items-center justify-center cursor-pointer p-1">
                                <input
                                  type="checkbox"
                                  checked={isNone}
                                  onChange={() => handleSetModuleAccess(mod.id, 'none')}
                                  className="w-4.5 h-4.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500/20 accent-rose-600 cursor-pointer"
                                />
                              </label>
                            </td>

                            {/* Status Badge */}
                            <td className="py-3.5 px-5 text-center border border-slate-200">
                              {isAll ? (
                                <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-bold border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-2xs">
                                  All Access
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-bold border border-rose-200 bg-rose-50 text-rose-700 shadow-2xs">
                                  No Access
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Grid for basic plan details (Product, Plan Name, Enter Plan Name if custom, Price, Billing Cycle, Status) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>
                  Product <span className="text-slate-500">*</span>
                </label>
                <CustomSelect
                  value={selectedProductId}
                  onChange={(val) => !initialPlan && handleProductChange(val)}
                  options={products.map((p) => ({
                    value: p.id,
                    label: p.name,
                  }))}
                  placeholder="Select Product"
                  activeColor="brand"
                />
              </div>

              <div>
                <label className={labelClass}>
                  Plan Name <span className="text-slate-500">*</span>
                </label>
                <CustomSelect
                  value={
                    isCustomPlanSelected
                      ? 'Custom'
                      : !name
                      ? ''
                      : ['Basic', 'Standard', 'Premium', 'Enterprise'].includes(name)
                      ? name
                      : 'Custom'
                  }
                  onChange={(val) => {
                    if (val === 'Custom') {
                      setIsCustomPlanSelected(true);
                      setValue('name', customPlanName.trim(), { shouldValidate: true });
                    } else {
                      setIsCustomPlanSelected(false);
                      setValue('name', val, { shouldValidate: true });
                    }
                  }}
                  options={[
                    { value: 'Basic', label: 'Basic' },
                    { value: 'Standard', label: 'Standard' },
                    { value: 'Premium', label: 'Premium' },
                    { value: 'Enterprise', label: 'Enterprise' },
                    { value: 'Custom', label: 'Custom Plan' },
                  ]}
                  placeholder="Select Plan Name"
                  activeColor="brand"
                />
                <FormError message={errors.name?.message} />
              </div>

              <div>
                <label className={labelClass}>
                  Enter Plan Name {isCustomPlanSelected && <span className="text-slate-500">*</span>}
                </label>
                <input
                  type="text"
                  disabled={!isCustomPlanSelected}
                  value={isCustomPlanSelected ? customPlanName : name}
                  onChange={(e) => {
                    setCustomPlanName(e.target.value);
                    if (isCustomPlanSelected) {
                      setValue('name', e.target.value);
                    }
                  }}
                  className={`${inputClass} ${
                    !isCustomPlanSelected
                      ? 'bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed select-none'
                      : 'bg-white'
                  }`}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Price ({currency}) <span className="text-slate-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  {...register('price', { valueAsNumber: true })}
                  className={inputClass}
                />
                <FormError message={errors.price?.message} />
              </div>

              <div>
                <label className={labelClass}>
                  Billing Cycle <span className="text-slate-500">*</span>
                </label>
                <Controller
                  control={control}
                  name="billingCycle"
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value}
                      onChange={(val) => field.onChange(val as any)}
                      options={BILLING_CYCLE_OPTIONS}
                      placeholder="Select Billing Cycle"
                      activeColor="brand"
                    />
                  )}
                />
                <FormError message={errors.billingCycle?.message} />
              </div>

              <div>
                <label className={labelClass}>
                  Status <span className="text-slate-500">*</span>
                </label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value}
                      onChange={(val) => field.onChange(val as any)}
                      options={PLAN_STATUS_OPTIONS}
                      placeholder="Select Status"
                      activeColor="brand"
                    />
                  )}
                />
              </div>
            </div>

            {(selectedProductId === 'prod_6' || currentProduct?.code === 'DIGITAL_MARKETING') && (
                <>
                  <div>
                    <label className={labelClass}>Monthly Post Limit</label>
                    <input
                      type="number"
                      min="0"
                      value={specs.monthlyPostLimit ?? ''}
                      onChange={(e) => handleSpecChange('monthlyPostLimit', e.target.value === '' ? '' : Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Monthly Video Limit</label>
                    <input
                      type="number"
                      min="0"
                      value={specs.monthlyVideoLimit ?? ''}
                      onChange={(e) => handleSpecChange('monthlyVideoLimit', e.target.value === '' ? '' : Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Features</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={newFeature}
                        onChange={(e) => setNewFeature(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddFeature();
                          }
                        }}
                        className={`${inputClass} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddFeature()}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-[#33077C] hover:bg-[#33077C]/10 rounded-lg transition-colors cursor-pointer"
                        title="Add feature"
                      >
                        <Plus className="w-5 h-5 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                </>
              )}

            {/* Feature tags if added */}
            {features.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {features.map((feat, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#33077C] text-white text-xs font-semibold rounded-xl shadow-xs group"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3] text-white shrink-0" />
                    <span>{feat}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFeature(index)}
                      className="text-white/70 hover:text-white p-0.5 rounded transition-colors cursor-pointer ml-0.5"
                    >
                      <X className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {(selectedProductId === 'prod_1' || currentProduct?.code === 'YAA_CONNECT') && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Employee Limit</label>
                    <input
                      type="number"
                      min="0"
                      value={specs.employeeLimit ?? ''}
                      onChange={(e) => handleSpecChange('employeeLimit', e.target.value === '' ? '' : Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Admin User Limit</label>
                    <input
                      type="number"
                      min="0"
                      value={specs.adminUserLimit ?? ''}
                      onChange={(e) => handleSpecChange('adminUserLimit', e.target.value === '' ? '' : Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                  {renderFeaturesField()}
                </div>

                {renderFeatureTags()}

                {renderModulePills('HR Modules Included', [
                  { key: 'attendance', label: 'Attendance' },
                  { key: 'leaveManagement', label: 'Leave Management' },
                  { key: 'payroll', label: 'Payroll' },
                  { key: 'reports', label: 'Reports' },
                ])}
              </>
            )}

            {(selectedProductId === 'prod_2' || currentProduct?.code === 'DOC_MOTEZ') && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Doctor Limit</label>
                    <input
                      type="number"
                      min="0"
                      value={specs.doctorLimit ?? ''}
                      onChange={(e) => handleSpecChange('doctorLimit', e.target.value === '' ? '' : Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Staff User Limit</label>
                    <input
                      type="number"
                      min="0"
                      value={specs.staffUserLimit ?? ''}
                      onChange={(e) => handleSpecChange('staffUserLimit', e.target.value === '' ? '' : Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Patient Limit</label>
                    <input
                      type="number"
                      min="0"
                      value={specs.patientLimit ?? ''}
                      onChange={(e) => handleSpecChange('patientLimit', e.target.value === '' ? '' : Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                  {renderFeaturesField()}
                </div>

                {renderFeatureTags()}

                {renderModulePills('Doctor & Clinic Features', [
                  { key: 'appointmentManagement', label: 'Appointment Management' },
                  { key: 'medicalRecords', label: 'Medical Records' },
                  { key: 'billing', label: 'Billing' },
                  { key: 'videoConsultation', label: 'Video Consultation' },
                ])}
              </>
            )}

            {(selectedProductId === 'prod_5' || currentProduct?.code === 'TURFY') && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Venue Limit</label>
                    <input
                      type="number"
                      min="0"
                      value={specs.venueLimit ?? ''}
                      onChange={(e) => handleSpecChange('venueLimit', e.target.value === '' ? '' : Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Turf/Court Limit</label>
                    <input
                      type="number"
                      min="0"
                      value={specs.turfCourtLimit ?? ''}
                      onChange={(e) => handleSpecChange('turfCourtLimit', e.target.value === '' ? '' : Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Booking Limit / Mo</label>
                    <input
                      type="number"
                      min="0"
                      value={specs.bookingLimit ?? ''}
                      onChange={(e) => handleSpecChange('bookingLimit', e.target.value === '' ? '' : Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                  {renderFeaturesField()}
                </div>

                {renderFeatureTags()}

                {renderModulePills('Turf Management Features', [
                  { key: 'onlineBooking', label: 'Online Booking' },
                  { key: 'paymentIntegration', label: 'Payment Integration' },
                  { key: 'tournamentManagement', label: 'Tournament Management' },
                ])}
              </>
            )}

            {(selectedProductId === 'prod_4' || currentProduct?.code === 'AARUDAM_AI') && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Astrologer User Limit</label>
                    <input
                      type="number"
                      min="0"
                      value={specs.astrologerUserLimit ?? ''}
                      onChange={(e) => handleSpecChange('astrologerUserLimit', e.target.value === '' ? '' : Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Consultation Limit / Mo</label>
                    <input
                      type="number"
                      min="0"
                      value={specs.consultationLimit ?? ''}
                      onChange={(e) => handleSpecChange('consultationLimit', e.target.value === '' ? '' : Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                  {renderFeaturesField()}
                </div>

                {renderFeatureTags()}

                {renderModulePills('AI & Astrology Modules', [
                  { key: 'aiAstrology', label: 'AI Astrology' },
                  { key: 'onlineConsultation', label: 'Online Consultation' },
                  { key: 'bookingManagement', label: 'Booking Management' },
                  { key: 'customerManagement', label: 'Customer Management' },
                ])}
              </>
            )}

            {(selectedProductId === 'prod_6' || currentProduct?.code === 'DIGITAL_MARKETING') && (
              <>
                {renderModulePills('Marketing Services', [
                  { key: 'socialMediaManagement', label: 'Social Media Management' },
                  { key: 'seo', label: 'SEO' },
                  { key: 'adsManagement', label: 'Ads Management' },
                ])}
              </>
            )}

            {(selectedProductId === 'prod_3' || currentProduct?.code === 'DOC_DENTQ') && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Dentist / Doctor Limit</label>
                    <input
                      type="number"
                      min="0"
                      value={specs.dentistDoctorLimit ?? ''}
                      onChange={(e) => handleSpecChange('dentistDoctorLimit', e.target.value === '' ? '' : Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Dental Chair Limit</label>
                    <input
                      type="number"
                      min="0"
                      value={specs.dentalChairLimit ?? ''}
                      onChange={(e) => handleSpecChange('dentalChairLimit', e.target.value === '' ? '' : Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Patient Limit</label>
                    <input
                      type="number"
                      min="0"
                      value={specs.patientLimit ?? ''}
                      onChange={(e) => handleSpecChange('patientLimit', e.target.value === '' ? '' : Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                  {renderFeaturesField()}
                </div>

                {renderFeatureTags()}

                {renderModulePills('Dental Features', [
                  { key: 'dentalCharting', label: 'Dental Charting' },
                  { key: 'digitalXRayDicom', label: 'Digital X-Ray / DICOM' },
                  { key: 'treatmentPlansBilling', label: 'Treatment Plans & Billing' },
                ])}
              </>
            )}
          </>
        )}

        <div className="pt-4 flex justify-end items-center gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center gap-2"
          >
            <X className="w-4 h-4 text-slate-500" />
            <span>Cancel</span>
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Saving...</span>
            ) : initialPlan ? (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Save Changes</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Save</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
