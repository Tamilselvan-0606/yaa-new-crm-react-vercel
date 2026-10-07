import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Product, ProductPlan, BillingCycle, PricingType } from '../../types';
import { CustomSelect } from '../common/CustomSelect';
import { Modal } from '../common/Modal';
import { Plus, Check, X } from 'lucide-react';

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
const selectClass =
  'w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer';
const labelClass = 'text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5';

const DEFAULT_SPECS: Record<string, Record<string, any>> = {
  prod_1: {
    employeeLimit: 25,
    adminUserLimit: 3,
    attendance: true,
    leaveManagement: true,
    payroll: false,
    reports: true,
  },
  prod_2: {
    doctorLimit: 3,
    staffUserLimit: 5,
    patientLimit: 500,
    appointmentManagement: true,
    medicalRecords: true,
    billing: true,
    videoConsultation: false,
  },
  prod_5: {
    venueLimit: 1,
    turfCourtLimit: 2,
    bookingLimit: 500,
    onlineBooking: true,
    paymentIntegration: true,
    tournamentManagement: false,
  },
  prod_4: {
    astrologerUserLimit: 2,
    consultationLimit: 200,
    aiAstrology: true,
    onlineConsultation: true,
    bookingManagement: true,
    customerManagement: true,
  },
  prod_6: {
    monthlyPostLimit: 12,
    monthlyReelLimit: 4,
    monthlyVideoLimit: 2,
    socialMediaManagement: true,
    seo: false,
    adsManagement: false,
  },
  prod_3: {
    dentistDoctorLimit: 2,
    dentalChairLimit: 2,
    patientLimit: 500,
    dentalCharting: true,
    digitalXRayDicom: true,
    treatmentPlansBilling: true,
  },
};

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
  const [name, setName] = useState('');
  const [isCustomPlanSelected, setIsCustomPlanSelected] = useState(false);
  const [customPlanName, setCustomPlanName] = useState('');
  const [price, setPrice] = useState<number | string>('');
  const [gstRate, setGstRate] = useState<number | ''>('');
  const [currency, setCurrency] = useState('₹');
  const [billingCycle, setBillingCycle] = useState<BillingCycle | ''>('');
  const [planType, setPlanType] = useState<PricingType | ''>('');
  const [status, setStatus] = useState<'Active' | 'Inactive' | ''>('');
  const [maxBranchLimit, setMaxBranchLimit] = useState<number | string>('');
  const [description, setDescription] = useState('');
  const [isPopular, setIsPopular] = useState(false);
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState('');
  const [specs, setSpecs] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto calculate GST and Total Price
  const numericPrice = Number(price) || 0;
  const hasPrice = price !== '' && !isNaN(Number(price)) && Number(price) > 0;
  const numericGst = gstRate !== '' ? Number(gstRate) : 0;
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
      setName(initialPlan.name || '');
      setIsCustomPlanSelected(isCustom);
      setCustomPlanName(isCustom ? (initialPlan.name || '') : '');
      setPrice(initialPlan.price ?? '');
      setGstRate(18);
      setCurrency(initialPlan.currency || '₹');
      setBillingCycle(initialPlan.billingCycle || 'Monthly');
      setPlanType(initialPlan.pricingType || (initialPlan.customizablePrice ? 'Custom Quote' : 'Fixed'));
      setStatus(initialPlan.status || 'Active');
      setMaxBranchLimit(
        initialPlan.maxBranchLimit !== undefined
          ? initialPlan.maxBranchLimit
          : initialPlan.specs?.maxBranchLimit !== undefined
          ? initialPlan.specs.maxBranchLimit
          : ''
      );
      setDescription(initialPlan.description || '');
      setIsPopular(!!initialPlan.isPopular);
      setFeatures(initialPlan.features ? [...initialPlan.features] : []);
      setSpecs(initialPlan.specs || {});
    } else {
      setName('');
      setIsCustomPlanSelected(false);
      setCustomPlanName('');
      setPrice('');
      setGstRate('');
      setCurrency('₹');
      setBillingCycle('');
      setPlanType('');
      setStatus('');
      setMaxBranchLimit('');
      setDescription('');
      setIsPopular(false);
      setFeatures([]);
      const effectiveProdId = initialProductId || products[0]?.id || 'prod_1';
      setSpecs(getInitialProductSpecs(effectiveProdId));
    }
  }, [initialPlan, isOpen, initialProductId]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalPlanName = isCustomPlanSelected ? customPlanName.trim() : name.trim();
    if (!finalPlanName) return;

    setIsSubmitting(true);
    try {
      const planData: Partial<ProductPlan> = {
        name: finalPlanName,
        price: Number(price) || 0,
        currency,
        billingCycle: (billingCycle as BillingCycle) || 'Monthly',
        pricingType: planType ? (planType as PricingType) : undefined,
        customizablePrice: planType === 'Custom Quote',
        status: (status as 'Active' | 'Inactive') || 'Active',
        maxBranchLimit: maxBranchLimit !== '' ? Number(maxBranchLimit) : undefined,
        description: description.trim(),
        isPopular,
        features: features.filter(Boolean),
        specs: {
          ...specs,
          ...(maxBranchLimit !== '' ? { maxBranchLimit: Number(maxBranchLimit) } : {}),
        },
      };

      await onSave(selectedProductId, planData, initialPlan?.id);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
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
      maxWidth="4xl"
      headerGradient={true}
      showBackIcon={true}
      hideCloseButton={true}
    >
      <form onSubmit={handleSubmit} className="space-y-4.5 p-2 sm:p-4 animate-in fade-in duration-150">
        {isSuperAdmin ? (
          <div className="space-y-4">
            {/* Row 1: Plan Name (1 col), Price (1 col), GST Rate (1 col) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>
                  Plan Name <span className="text-slate-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Price ({currency}) <span className="text-slate-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">
                    {currency}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className={`${inputClass} pl-8 font-semibold text-slate-900`}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>GST Rate</label>
                <CustomSelect
                  value={gstRate !== '' ? String(gstRate) : ''}
                  onChange={(val) => setGstRate(val === '' ? '' : Number(val))}
                  options={GST_RATE_OPTIONS}
                  placeholder="Select GST Rate"
                  activeColor="brand"
                />
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
                    className={`${inputClass} font-bold text-xs sm:text-[13px] text-[#33077C] cursor-default select-none pr-28`}
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
                  Billing Cycle <span className="text-slate-500">*</span>
                </label>
                <CustomSelect
                  value={billingCycle}
                  onChange={(val) => setBillingCycle(val as any)}
                  options={BILLING_CYCLE_OPTIONS}
                  placeholder="Select Billing Cycle"
                  activeColor="brand"
                />
              </div>

              <div>
                <label className={labelClass}>
                  Plan Type <span className="text-slate-500">*</span>
                </label>
                <CustomSelect
                  value={planType}
                  onChange={(val) => setPlanType(val as any)}
                  options={PLAN_TYPE_OPTIONS}
                  placeholder="Select Plan Type"
                  activeColor="brand"
                />
              </div>
            </div>

            {/* Row 3: Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>
                  Status <span className="text-slate-500">*</span>
                </label>
                <CustomSelect
                  value={status}
                  onChange={(val) => setStatus(val as any)}
                  options={PLAN_STATUS_OPTIONS}
                  placeholder="Select Status"
                  activeColor="brand"
                />
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
                      setName('');
                    } else {
                      setIsCustomPlanSelected(false);
                      setName(val);
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
              </div>

              <div>
                <label className={labelClass}>
                  Enter Plan Name {isCustomPlanSelected && <span className="text-slate-500">*</span>}
                </label>
                <input
                  type="text"
                  required={isCustomPlanSelected}
                  disabled={!isCustomPlanSelected}
                  value={isCustomPlanSelected ? customPlanName : name}
                  onChange={(e) => setCustomPlanName(e.target.value)}
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
                  min="0"
                  step="any"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Billing Cycle <span className="text-slate-500">*</span>
                </label>
                <CustomSelect
                  value={billingCycle}
                  onChange={(val) => setBillingCycle(val as any)}
                  options={BILLING_CYCLE_OPTIONS}
                  placeholder="Select Billing Cycle"
                  activeColor="brand"
                />
              </div>

              <div>
                <label className={labelClass}>
                  Status <span className="text-slate-500">*</span>
                </label>
                <CustomSelect
                  value={status}
                  onChange={(val) => setStatus(val as any)}
                  options={PLAN_STATUS_OPTIONS}
                  placeholder="Select Status"
                  activeColor="brand"
                />
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
            </div>

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
