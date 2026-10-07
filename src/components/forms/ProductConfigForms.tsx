import React from 'react';
import { Check } from 'lucide-react';
import { CustomSelect } from '../common/CustomSelect';

interface ToggleFieldProps {
  label: string;
  value: boolean;
  onChange: (val: boolean) => void;
}

export const ToggleField: React.FC<ToggleFieldProps> = ({ label, value, onChange }) => (
  <div
    onClick={() => onChange(!value)}
    className={`h-11 px-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all select-none ${value
      ? 'bg-orange-50/50 border-[#4309A2] text-slate-900 shadow-2xs'
      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
      }`}
  >
    <span className="text-xs sm:text-[13px] font-semibold">{label}</span>
    <div className={`w-9 h-5 rounded-full transition-colors flex items-center p-0.5 ${value ? 'bg-[#4309A2]' : 'bg-slate-200'}`}>
      <div className={`w-4 h-4 rounded-full bg-white transition-transform shadow-xs ${value ? 'translate-x-4' : 'translate-x-0'}`} />
    </div>
  </div>
);

interface PillSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export const PillSelect: React.FC<PillSelectProps> = ({ options, selected, onChange }) => {
  const toggleOption = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((item) => item !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {options.map((opt) => {
        const isChecked = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggleOption(opt)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${isChecked
              ? 'bg-[#33077C] text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
              }`}
          >
            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
            <span>{opt}</span>
          </button>
        );
      })}
    </div>
  );
};

const inputClass = "w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all";
const labelClass = "text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5";

const BILLING_CYCLE_OPTIONS = ['Monthly', 'Quarterly', 'Annually'];

// =========================================================================
// 1. YAACONNECT SUB-STEPS
// =========================================================================
export const YAA_CONNECT_STEPS = [
  'Organization Details',
  'HR / Admin Details',
  'HR Requirements & Modules',
  'Configuration & Plan',
];

const YAA_CONNECT_PLANS = [
  { value: 'Yaa Bronze', label: 'Yaa Bronze (\u20B9999/mo)' },
  { value: 'Yaa Silver', label: 'Yaa Silver (\u20B91749/mo)' },
  { value: 'Yaa Gold', label: 'Yaa Gold (\u20B92499/mo)' },
];

export const YaaConnectConfigForm: React.FC<{
  subStep: number;
  data: any;
  onChange: (key: string, val: any) => void
}> = ({ subStep, data, onChange }) => {
  const hrReqs = data.hrRequirements || {};
  const setHrReq = (k: string, v: boolean) => {
    onChange('hrRequirements', { ...hrReqs, [k]: v });
  };

  return (
    <div className="space-y-4">
      {/* Sub-Step 1: Organization Details */}
      {subStep === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Number of Employees</label>
              <input
                type="number"
                value={data.numberOfEmployees || ''}
                onChange={(e) => onChange('numberOfEmployees', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Number of Branches</label>
              <input
                type="number"
                value={data.numberOfBranches || ''}
                onChange={(e) => onChange('numberOfBranches', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Industry</label>
              <input
                type="text"
                value={data.industry || ''}
                onChange={(e) => onChange('industry', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Company Registration Number</label>
              <input
                type="text"
                value={data.companyRegNumber || ''}
                onChange={(e) => onChange('companyRegNumber', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>GST Number</label>
              <input
                type="text"
                value={data.gstNumber || ''}
                onChange={(e) => onChange('gstNumber', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Head Office Location</label>
              <input
                type="text"
                value={data.headOfficeLocation || ''}
                onChange={(e) => onChange('headOfficeLocation', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}

      {/* Sub-Step 2: HR/Admin Details */}
      {subStep === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>HR / Admin Name</label>
              <input
                type="text"
                value={data.hrAdminName || ''}
                onChange={(e) => onChange('hrAdminName', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>HR / Admin Phone</label>
              <input
                type="text"
                value={data.hrAdminPhone || ''}
                onChange={(e) => onChange('hrAdminPhone', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>HR / Admin Email</label>
              <input
                type="email"
                value={data.hrAdminEmail || ''}
                onChange={(e) => onChange('hrAdminEmail', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Number of Admin Users</label>
              <input
                type="number"
                value={data.numAdminUsers || ''}
                onChange={(e) => onChange('numAdminUsers', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Number of Staff Users</label>
              <input
                type="number"
                value={data.numStaffUsers || ''}
                onChange={(e) => onChange('numStaffUsers', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}

      {/* Sub-Step 3: HR Requirements (Yes/No) */}
      {subStep === 3 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ToggleField label="Employee Management" value={hrReqs.employeeManagement ?? true} onChange={(v) => setHrReq('employeeManagement', v)} />
          <ToggleField label="Attendance Management" value={hrReqs.attendanceManagement ?? true} onChange={(v) => setHrReq('attendanceManagement', v)} />
          <ToggleField label="Leave Management" value={hrReqs.leaveManagement ?? true} onChange={(v) => setHrReq('leaveManagement', v)} />
          <ToggleField label="Payroll Management" value={hrReqs.payrollManagement ?? true} onChange={(v) => setHrReq('payrollManagement', v)} />
          <ToggleField label="Performance Management" value={hrReqs.performanceManagement ?? false} onChange={(v) => setHrReq('performanceManagement', v)} />
          <ToggleField label="Employee Self-Service" value={hrReqs.employeeSelfService ?? true} onChange={(v) => setHrReq('employeeSelfService', v)} />
          <ToggleField label="Field Staff Tracking" value={hrReqs.fieldStaffTracking ?? false} onChange={(v) => setHrReq('fieldStaffTracking', v)} />
          <ToggleField label="Reports & Analytics" value={hrReqs.reports ?? true} onChange={(v) => setHrReq('reports', v)} />
        </div>
      )}

      {/* Sub-Step 4: Configuration & Plan */}
      {subStep === 4 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Departments</label>
              <input
                type="text"
                value={data.departments || ''}
                onChange={(e) => onChange('departments', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Designations</label>
              <input
                type="text"
                value={data.designations || ''}
                onChange={(e) => onChange('designations', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Number of Shifts</label>
              <input
                type="number"
                value={data.numShifts || ''}
                onChange={(e) => onChange('numShifts', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Selected Plan</label>
              <CustomSelect
                value={data.selectedPlan || 'Yaa Silver'}
                onChange={(v) => onChange('selectedPlan', v)}
                options={YAA_CONNECT_PLANS}
              />
            </div>
            <div>
              <label className={labelClass}>Billing Cycle</label>
              <CustomSelect
                value={data.billingCycle || 'Monthly'}
                onChange={(v) => onChange('billingCycle', v)}
                options={BILLING_CYCLE_OPTIONS}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Start Date</label>
              <input
                type="date"
                value={data.startDate || new Date().toISOString().split('T')[0]}
                onChange={(e) => onChange('startDate', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Renewal Date</label>
              <input
                type="date"
                value={data.renewalDate || ''}
                onChange={(e) => onChange('renewalDate', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// 2. DOCMOTEZ / DOC DENTQ SUB-STEPS
// =========================================================================
export const DOCMOTEZ_STEPS = [
  'Healthcare Organization',
  'Doctor / Practitioner Details',
  'Features & Modules',
  'Plan & Subscription',
];

const ORG_TYPE_OPTIONS = ['Individual Doctor', 'Clinic', 'Hospital', 'Diagnostic Center'];

const DOCMOTEZ_PLANS = [
  { value: 'Yaa Diamond', label: 'Yaa Diamond (\u20B93599/mo)' },
  { value: 'Yaa Platinum', label: 'Yaa Platinum (\u20B94999/mo)' },
  { value: 'Hospital Enterprise', label: 'Hospital Enterprise (₹999/mo)' },
];

const DENTAL_PLANS = [
  { value: 'Dental Standard', label: 'Dental Standard (₹129/mo)' },
  { value: 'Orthodontic Pro', label: 'Orthodontic Pro (₹349/mo)' },
  { value: 'Dental Chain Network', label: 'Dental Chain Network (₹849/mo)' },
];

export const DocMotezConfigForm: React.FC<{
  subStep: number;
  data: any;
  onChange: (key: string, val: any) => void;
  isDental?: boolean
}> = ({ subStep, data, onChange, isDental = false }) => {
  const features = data.featuresRequired || {};
  const setFeature = (k: string, v: boolean) => {
    onChange('featuresRequired', { ...features, [k]: v });
  };

  return (
    <div className="space-y-4">
      {/* Sub-Step 1: Organization */}
      {subStep === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Organization Type</label>
              <CustomSelect
                value={data.orgType || 'Clinic'}
                onChange={(v) => onChange('orgType', v)}
                options={ORG_TYPE_OPTIONS}
              />
            </div>
            <div>
              <label className={labelClass}>{isDental ? 'Dental Clinic Name' : 'Clinic / Hospital Name'}</label>
              <input
                type="text"
                value={data.clinicName || ''}
                onChange={(e) => onChange('clinicName', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Number of Doctors</label>
              <input
                type="number"
                value={data.numDoctors || ''}
                onChange={(e) => onChange('numDoctors', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Number of Staff</label>
              <input
                type="number"
                value={data.numStaff || ''}
                onChange={(e) => onChange('numStaff', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Number of Branches</label>
              <input
                type="number"
                value={data.numBranches || ''}
                onChange={(e) => onChange('numBranches', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Departments</label>
              <input
                type="text"
                value={data.departments || ''}
                onChange={(e) => onChange('departments', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}

      {/* Sub-Step 2: Doctor Details */}
      {subStep === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Doctor Name</label>
              <input
                type="text"
                value={data.doctorName || ''}
                onChange={(e) => onChange('doctorName', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Specialization</label>
              <input
                type="text"
                value={data.specialization || ''}
                onChange={(e) => onChange('specialization', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Qualification</label>
              <input
                type="text"
                value={data.qualification || ''}
                onChange={(e) => onChange('qualification', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Medical Registration Number</label>
              <input
                type="text"
                value={data.medRegNumber || ''}
                onChange={(e) => onChange('medRegNumber', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Medical Council</label>
              <input
                type="text"
                value={data.medicalCouncil || ''}
                onChange={(e) => onChange('medicalCouncil', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Years of Experience</label>
              <input
                type="number"
                value={data.yearsExperience || ''}
                onChange={(e) => onChange('yearsExperience', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Consultation Fee (₹)</label>
              <input
                type="number"
                value={data.consultationFee || ''}
                onChange={(e) => onChange('consultationFee', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}

      {/* Sub-Step 3: Features Required */}
      {subStep === 3 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ToggleField label="Appointment Management" value={features.appointmentMgt ?? true} onChange={(v) => setFeature('appointmentMgt', v)} />
          <ToggleField label="Patient Management" value={features.patientMgt ?? true} onChange={(v) => setFeature('patientMgt', v)} />
          <ToggleField label="Medical Records EHR" value={features.medicalRecords ?? true} onChange={(v) => setFeature('medicalRecords', v)} />
          <ToggleField label="E-Prescriptions" value={features.ePrescription ?? true} onChange={(v) => setFeature('ePrescription', v)} />
          <ToggleField label="Video Consultation" value={features.videoConsultation ?? false} onChange={(v) => setFeature('videoConsultation', v)} />
          <ToggleField label="Medical Billing" value={features.billing ?? true} onChange={(v) => setFeature('billing', v)} />
          <ToggleField label="Pharmacy / Inventory" value={features.pharmacy ?? false} onChange={(v) => setFeature('pharmacy', v)} />
          <ToggleField label="Clinical Reports" value={features.reports ?? true} onChange={(v) => setFeature('reports', v)} />
        </div>
      )}

      {/* Sub-Step 4: Plan Details */}
      {subStep === 4 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Selected Plan</label>
              <CustomSelect
                value={data.selectedPlan || (isDental ? 'Dental Standard' : 'Yaa Diamond')}
                onChange={(v) => onChange('selectedPlan', v)}
                options={isDental ? DENTAL_PLANS : DOCMOTEZ_PLANS}
              />
            </div>
            <div>
              <label className={labelClass}>Billing Cycle</label>
              <CustomSelect
                value={data.billingCycle || 'Monthly'}
                onChange={(v) => onChange('billingCycle', v)}
                options={BILLING_CYCLE_OPTIONS}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Start Date</label>
              <input
                type="date"
                value={data.startDate || new Date().toISOString().split('T')[0]}
                onChange={(e) => onChange('startDate', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Renewal Date</label>
              <input
                type="date"
                value={data.renewalDate || ''}
                onChange={(e) => onChange('renewalDate', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// 3. TURFYLOCK SUB-STEPS
// =========================================================================
export const TURFYLOCK_STEPS = [
  'Venue Details & Sports',
  'Slot & Pricing Configuration',
  'Plan & Subscription',
];

const SPORTS_LIST = ['Football', 'Cricket', 'Box Cricket', 'Badminton', 'Tennis', 'Basketball', 'Volleyball', 'Other'];
const FACILITIES_LIST = ['Parking', 'Washroom', 'Changing Room', 'Drinking Water', 'Flood Lights', 'Seating', 'Cafeteria', 'Equipment Rental'];

const TURFYLOCK_PLANS = [
  { value: 'Single Turf Arena', label: 'Single Turf Arena (₹99/mo)' },
  { value: 'Multi-Sport Complex', label: 'Multi-Sport Complex (₹299/mo)' },
  { value: 'Stadium Chain Pro', label: 'Stadium Chain Pro (₹749/mo)' },
];

export const TurfyLockConfigForm: React.FC<{
  subStep: number;
  data: any;
  onChange: (key: string, val: any) => void
}> = ({ subStep, data, onChange }) => {
  const sports = data.sportsAvailable || ['Football', 'Cricket'];
  const facilities = data.facilities || ['Parking', 'Flood Lights', 'Washroom'];

  return (
    <div className="space-y-4">
      {/* Sub-Step 1: Venue & Sports */}
      {subStep === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Venue / Turf Name</label>
              <input
                type="text"
                value={data.venueName || ''}
                onChange={(e) => onChange('venueName', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Number of Turfs / Courts</label>
              <input
                type="number"
                value={data.numTurfs || '2'}
                onChange={(e) => onChange('numTurfs', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Google Maps Location URL</label>
              <input
                type="text"
                value={data.googleMapsUrl || ''}
                onChange={(e) => onChange('googleMapsUrl', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Sports Available (Multi-select)</label>
            <PillSelect options={SPORTS_LIST} selected={sports} onChange={(v) => onChange('sportsAvailable', v)} />
          </div>

          <div>
            <label className={labelClass}>Facilities Provided</label>
            <PillSelect options={FACILITIES_LIST} selected={facilities} onChange={(v) => onChange('facilities', v)} />
          </div>
        </div>
      )}

      {/* Sub-Step 2: Slot & Pricing */}
      {subStep === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Opening Time</label>
              <input
                type="time"
                value={data.openingTime || '06:00'}
                onChange={(e) => onChange('openingTime', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Closing Time</label>
              <input
                type="time"
                value={data.closingTime || '23:30'}
                onChange={(e) => onChange('closingTime', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Weekday Price ($/hr)</label>
              <input
                type="number"
                value={data.weekdayPrice || '40'}
                onChange={(e) => onChange('weekdayPrice', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Weekend Price ($/hr)</label>
              <input
                type="number"
                value={data.weekendPrice || '60'}
                onChange={(e) => onChange('weekendPrice', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}

      {/* Sub-Step 3: Plan */}
      {subStep === 3 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Selected Plan</label>
              <CustomSelect
                value={data.selectedPlan || 'Multi-Sport Complex'}
                onChange={(v) => onChange('selectedPlan', v)}
                options={TURFYLOCK_PLANS}
              />
            </div>
            <div>
              <label className={labelClass}>Billing Cycle</label>
              <CustomSelect
                value={data.billingCycle || 'Monthly'}
                onChange={(v) => onChange('billingCycle', v)}
                options={BILLING_CYCLE_OPTIONS}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Start Date</label>
              <input
                type="date"
                value={data.startDate || new Date().toISOString().split('T')[0]}
                onChange={(e) => onChange('startDate', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Renewal Date</label>
              <input
                type="date"
                value={data.renewalDate || ''}
                onChange={(e) => onChange('renewalDate', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// 4. AARUDAM AI SUB-STEPS
// =========================================================================
export const AARUDAM_STEPS = [
  'Astrologer Partner Profile',
  'Services & Languages',
  'Plan & Subscription',
];

const ASTRO_PARTNER_OPTIONS = ['Individual Astrologer', 'Astrology Center', 'Astrology Consultant', 'Marketing Partner', 'Business Partner'];

const AARUDAM_PLANS = [
  { value: 'AI Core Sandbox', label: 'AI Core Sandbox (₹249/mo)' },
  { value: 'Autonomous Enterprise', label: 'Autonomous Enterprise (₹699/mo)' },
  { value: 'Custom Private LLM', label: 'Custom Private LLM (₹1599/mo)' },
];

const ASTRO_SERVICES = ['Horoscope', 'Kundli', 'Birth Chart', 'Raasi', 'Nakshatram', 'Compatibility', 'Predictions', 'Tamil Astrology', 'AI Astrology'];
const ASTRO_LANGUAGES = ['Tamil', 'English', 'Hindi', 'Telugu', 'Malayalam', 'Kannada', 'Other'];

export const AarudamAIConfigForm: React.FC<{
  subStep: number;
  data: any;
  onChange: (key: string, val: any) => void
}> = ({ subStep, data, onChange }) => {
  const services = data.servicesOffered || ['Horoscope', 'Kundli', 'Predictions', 'AI Astrology'];
  const languages = data.languages || ['Tamil', 'English'];

  return (
    <div className="space-y-4">
      {/* Sub-Step 1: Partner Profile */}
      {subStep === 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Partner Type</label>
            <CustomSelect
              value={data.partnerType || 'Individual Astrologer'}
              onChange={(v) => onChange('partnerType', v)}
              options={ASTRO_PARTNER_OPTIONS}
            />
          </div>
          <div>
            <label className={labelClass}>Astrologer / Brand Name</label>
            <input
              type="text"
              value={data.astrologerName || ''}
              onChange={(e) => onChange('astrologerName', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Specialization</label>
            <input
              type="text"
              value={data.specialization || ''}
              onChange={(e) => onChange('specialization', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      )}

      {/* Sub-Step 2: Services & Languages */}
      {subStep === 2 && (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Services Offered (Multi-select)</label>
            <PillSelect options={ASTRO_SERVICES} selected={services} onChange={(v) => onChange('servicesOffered', v)} />
          </div>

          <div>
            <label className={labelClass}>Languages Supported</label>
            <PillSelect options={ASTRO_LANGUAGES} selected={languages} onChange={(v) => onChange('languages', v)} />
          </div>
        </div>
      )}

      {/* Sub-Step 3: Plan */}
      {subStep === 3 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Selected Plan</label>
              <CustomSelect
                value={data.selectedPlan || 'Autonomous Enterprise'}
                onChange={(v) => onChange('selectedPlan', v)}
                options={AARUDAM_PLANS}
              />
            </div>
            <div>
              <label className={labelClass}>Billing Cycle</label>
              <CustomSelect
                value={data.billingCycle || 'Monthly'}
                onChange={(v) => onChange('billingCycle', v)}
                options={BILLING_CYCLE_OPTIONS}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Start Date</label>
              <input
                type="date"
                value={data.startDate || new Date().toISOString().split('T')[0]}
                onChange={(e) => onChange('startDate', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Renewal Date</label>
              <input
                type="date"
                value={data.renewalDate || ''}
                onChange={(e) => onChange('renewalDate', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// 5. DIGITAL MARKETING SUB-STEPS
// =========================================================================
export const DIGITAL_MARKETING_STEPS = [
  'Business Profile & Strategy',
  'Social Media & Content Volume',
  'Marketing Retainer Plan',
];

const DIGITAL_MARKETING_PLANS = [
  { value: 'Social Kickstart', label: 'Social Kickstart (₹599/mo)' },
  { value: 'Growth Accelerator', label: 'Growth Accelerator (₹1299/mo)' },
  { value: 'Enterprise Domination', label: 'Enterprise Domination (₹2499/mo)' },
];

const MARKETING_SERVICES_LIST = [
  'Social Media Management',
  'Content Creation',
  'Poster Design',
  'Reels',
  'Video Editing',
  'Photography',
  'Videography',
  'SEO',
  'Google Ads',
  'Meta Ads',
  'Website Management',
  'Other',
];

export const DigitalMarketingConfigForm: React.FC<{
  subStep: number;
  data: any;
  onChange: (key: string, val: any) => void
}> = ({ subStep, data, onChange }) => {
  const services = data.marketingServices || ['Social Media Management', 'Content Creation', 'Reels', 'Meta Ads'];

  return (
    <div className="space-y-4">
      {/* Sub-Step 1: Business Profile */}
      {subStep === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Industry</label>
              <input
                type="text"
                value={data.industry || ''}
                onChange={(e) => onChange('industry', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Target Audience</label>
              <input
                type="text"
                value={data.targetAudience || ''}
                onChange={(e) => onChange('targetAudience', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Target Geography</label>
              <input
                type="text"
                value={data.targetLocation || ''}
                onChange={(e) => onChange('targetLocation', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Services Required (Multi-select)</label>
            <PillSelect options={MARKETING_SERVICES_LIST} selected={services} onChange={(v) => onChange('marketingServices', v)} />
          </div>
        </div>
      )}

      {/* Sub-Step 2: Social Media & Volume */}
      {subStep === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Instagram Handle</label>
              <input
                type="text"
                value={data.instagram || ''}
                onChange={(e) => onChange('instagram', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Monthly Posts</label>
              <input
                type="number"
                value={data.monthlyPosts || '12'}
                onChange={(e) => onChange('monthlyPosts', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Monthly Reels</label>
              <input
                type="number"
                value={data.monthlyReels || '8'}
                onChange={(e) => onChange('monthlyReels', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Monthly Ad Budget (₹)</label>
              <input
                type="number"
                value={data.monthlyAdBudget || '1000'}
                onChange={(e) => onChange('monthlyAdBudget', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}

      {/* Sub-Step 3: Plan */}
      {subStep === 3 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Selected Plan</label>
              <CustomSelect
                value={data.selectedPlan || 'Growth Accelerator'}
                onChange={(v) => onChange('selectedPlan', v)}
                options={DIGITAL_MARKETING_PLANS}
              />
            </div>
            <div>
              <label className={labelClass}>Billing Cycle</label>
              <CustomSelect
                value={data.billingCycle || 'Monthly'}
                onChange={(v) => onChange('billingCycle', v)}
                options={BILLING_CYCLE_OPTIONS}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Start Date</label>
              <input
                type="date"
                value={data.startDate || new Date().toISOString().split('T')[0]}
                onChange={(e) => onChange('startDate', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Renewal Date</label>
              <input
                type="date"
                value={data.renewalDate || ''}
                onChange={(e) => onChange('renewalDate', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
