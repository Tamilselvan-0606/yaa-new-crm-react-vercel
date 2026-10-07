import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  MapPin,
  ExternalLink,
  Users,
  Calendar,
  ShieldCheck,
  Edit2,
  Trash2,
  Globe,
  Mail,
  Phone,
  MessageCircle,
  Tag,
  Briefcase,
  Layers,
  Zap,
  MoreVertical,
  Eye,
  EyeOff,
  Loader2,
  Ban,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Upload,
  Image as ImageIcon,
  AlertCircle,
  X,
  Check,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { SearchBar } from '../../components/common/SearchBar';
import { Pagination } from '../../components/common/Pagination';
import { FilterDropdown } from '../../components/common/FilterDropdown';
import { CustomSelect } from '../../components/common/CustomSelect';

import { organizationApi } from '../../api';
import { OrganizationApiItem } from '../../api/platform/organizationTypes';

interface OrganizationItem {
  id: string;
  name: string;
  code: string;
  legalName: string;
  organizationType?: string;
  industry: string;
  location: string;
  subscriptionPlan?: string;
  branchesCount: number;
  membersCount: number;
  status: 'Active' | 'Pending' | 'Inactive' | 'Suspend';
  createdAt: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  contactPerson?: string;
  logo?: string;
  gstNumber?: string;
  panNumber?: string;
  registrationType?: string;
  address?: string;
  subOrganizationSupport?: boolean;
}

const ORGANIZATION_TYPE_OPTIONS = [
  'All',
  'Client Management',
  'Sales Management',
];

const REGISTRATION_TYPE_OPTIONS = [
  'Proprietorship',
  'Partnership',
  'LLP',
  'Pvt Ltd',
  'Public Ltd',
  'Other',
];

const SUBSCRIPTION_PLAN_OPTIONS = [
  'Enterprise Pro',
  'Growth Tier',
  'Business Starter',
  'Yaa Gold',
  'Yaa Silver',
  'Yaa Bronze',
  'Yaa Diamond',
  'Yaa Platinum',
  'Hospital Enterprise',
];

const STATUS_OPTIONS: ('Active' | 'Inactive' | 'Suspend')[] = [
  'Active',
  'Inactive',
  'Suspend',
];

const mapApiOrgToItem = (apiOrg: OrganizationApiItem): OrganizationItem => {
  return {
    id: apiOrg.id,
    name: apiOrg.name || 'Unnamed Organization',
    code: apiOrg.code || 'ORG',
    legalName: apiOrg.legalName || apiOrg.name || '',
    organizationType: apiOrg.organizationType || 'All',
    industry: 'Enterprise Business',
    location: 'Corporate HQ',
    subscriptionPlan: 'Enterprise Pro',
    branchesCount: 1,
    membersCount: 1,
    status: apiOrg.active ? 'Active' : 'Inactive',
    createdAt: apiOrg.createdAt ? new Date(apiOrg.createdAt).toISOString().split('T')[0] : '',
    email: apiOrg.email || '',
    phone: apiOrg.phone || '',
    whatsapp: apiOrg.phone || '',
    contactPerson: apiOrg.user?.name || '',
    gstNumber: apiOrg.gstNumber || '',
    panNumber: apiOrg.panNumber || '',
    registrationType: 'Pvt Ltd',
    address: '',
    subOrganizationSupport: false,
  };
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();
    return `${day} ${month}, ${year}`;
  } catch {
    return dateStr;
  }
};

export const OrganizationView: React.FC = () => {
  const { currentUser, isSuperAdmin, showToast } = useAuth();
  const isOrgSuperAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'Admin';

  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Pagination states from server
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  // Fetch Organizations from live API
  const loadOrganizations = async (page = currentPage, limit = pageSize) => {
    setIsLoading(true);
    try {
      const res = await organizationApi.getOrganizations(page, limit);
      if (res && res.success && Array.isArray(res.data)) {
        const mapped = res.data.map(mapApiOrgToItem);
        setOrganizations(mapped);
        if (res.pagination) {
          setTotalRecords(res.pagination.totalRecords || mapped.length);
        } else {
          setTotalRecords(mapped.length);
        }
      } else {
        setOrganizations([]);
        setTotalRecords(0);
      }
    } catch (err: any) {
      console.error('Failed to load organizations:', err);
      showToast('error', 'Failed to fetch organizations', err?.message || 'Could not connect to API');
      setOrganizations([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations(currentPage, pageSize);
  }, [currentPage, pageSize]);

  // Pending state - tracks what's typed/selected (not yet applied)
  const [pendingSearch, setPendingSearch] = useState('');
  const [pendingStatus, setPendingStatus] = useState<'All' | 'Active' | 'Inactive' | 'Suspend'>('All');
  // Applied state - what actually drives the filter (set only on Apply)
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedStatus, setAppliedStatus] = useState<'All' | 'Active' | 'Inactive' | 'Suspend'>('All');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrganizationItem | null>(null);
  const [viewingOrg, setViewingOrg] = useState<OrganizationItem | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'Suspend' | 'Inactive' | 'Delete';
    orgId: string;
    orgName: string;
  } | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const handleCopy = (e: React.MouseEvent, text: string, key: string) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  // Close dropdown on click outside, update or close on scroll/resize
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.action-dropdown-container') && !target.closest('.action-dropdown-menu')) {
        setActiveDropdownId(null);
        setDropdownPos(null);
      }
    };
    const handleScrollOrResize = () => {
      if (activeDropdownId) {
        setActiveDropdownId(null);
        setDropdownPos(null);
      }
    };

    document.addEventListener('click', handleOutsideClick);
    window.addEventListener('scroll', handleScrollOrResize, { passive: true, capture: true });
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [activeDropdownId]);

  const handleUpdateStatus = async (id: string, newStatus: 'Active' | 'Pending' | 'Inactive' | 'Suspend') => {
    try {
      setIsProcessingAction(true);
      await organizationApi.updateOrganization(id, {
        name: organizations.find((o) => o.id === id)?.name,
      });
      await loadOrganizations(currentPage, pageSize);
      setActiveDropdownId(null);
      showToast('success', 'Status Updated', `Organization updated successfully.`);
    } catch (err: any) {
      showToast('error', 'Update Failed', err?.message || 'Could not update status.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDeleteOrganization = async (id: string, orgName: string) => {
    try {
      setIsProcessingAction(true);
      const res = await organizationApi.deleteOrganization(id);
      showToast('success', 'Organization Deactivated', res?.message || `${orgName} deactivated successfully.`);
      await loadOrganizations(currentPage, pageSize);
    } catch (err: any) {
      showToast('error', 'Delete Failed', err?.message || `Failed to delete ${orgName}.`);
    } finally {
      setIsProcessingAction(false);
      setConfirmAction(null);
    }
  };

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [legalName, setLegalName] = useState('');
  const [organizationType, setOrganizationType] = useState('All');
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [subscriptionPlan, setSubscriptionPlan] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [logo, setLogo] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [registrationType, setRegistrationType] = useState('');
  const [formStatus, setFormStatus] = useState<string>('Active');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [subOrganizationSupport, setSubOrganizationSupport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('error', 'File Too Large', 'Please upload an image smaller than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenAddModal = () => {
    setEditingOrg(null);
    setName('');
    setCode('');
    setLegalName('');
    setOrganizationType('All');
    setIndustry('');
    setLocation('');
    setSubscriptionPlan('');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setWhatsapp('');
    setLogo('');
    setGstNumber('');
    setPanNumber('');
    setRegistrationType('');
    setFormStatus('Active');
    setAddress('');
    setPassword('');
    setShowPassword(false);
    setSubOrganizationSupport(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (org: OrganizationItem) => {
    setEditingOrg(org);
    setName(org.name);
    setCode(org.code);
    setLegalName(org.legalName);
    setOrganizationType(org.organizationType || 'All');
    setIndustry(org.industry);
    setLocation(org.location);
    setSubscriptionPlan(org.subscriptionPlan || 'Enterprise Pro');
    setContactPerson(org.contactPerson || '');
    setEmail(org.email || '');
    setPhone(org.phone || '');
    setWhatsapp(org.whatsapp || '');
    setLogo(org.logo || '');
    setGstNumber(org.gstNumber || '');
    setPanNumber(org.panNumber || '');
    setRegistrationType(org.registrationType || 'Pvt Ltd');
    setFormStatus(org.status);
    setAddress(org.address || '');
    setPassword('');
    setShowPassword(false);
    setSubOrganizationSupport(!!org.subOrganizationSupport);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('error', 'Validation Error', 'Organization name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingOrg) {
        await organizationApi.updateOrganization(editingOrg.id, {
          name: name.trim(),
          legalName: legalName.trim() || name.trim(),
          organizationType: organizationType || 'All',
          gstNumber: gstNumber.trim() || undefined,
          panNumber: panNumber.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          password: password.trim() || undefined,
        });
        showToast('success', 'Organization Updated', `${name} has been updated.`);
      } else {
        await organizationApi.createOrganization({
          code: code.trim().toUpperCase() || `ORG-${Date.now().toString().slice(-4)}`,
          name: name.trim(),
          organizationType: organizationType || 'All',
          legalName: legalName.trim() || name.trim(),
          gstNumber: gstNumber.trim() || undefined,
          panNumber: panNumber.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          password: password.trim() || undefined,
        });
        showToast('success', 'Organization Created', `${name} has been successfully created.`);
      }
      setIsModalOpen(false);
      await loadOrganizations(currentPage, pageSize);
    } catch (err: any) {
      showToast('error', 'Operation Failed', err?.message || 'Could not save organization.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const searchedOrgs = organizations.filter(
    (o) =>
      o.name.toLowerCase().includes(appliedSearch.toLowerCase()) ||
      o.legalName.toLowerCase().includes(appliedSearch.toLowerCase()) ||
      o.code.toLowerCase().includes(appliedSearch.toLowerCase()) ||
      (o.organizationType && o.organizationType.toLowerCase().includes(appliedSearch.toLowerCase())) ||
      o.location.toLowerCase().includes(appliedSearch.toLowerCase()) ||
      o.industry.toLowerCase().includes(appliedSearch.toLowerCase()) ||
      (o.subscriptionPlan && o.subscriptionPlan.toLowerCase().includes(appliedSearch.toLowerCase()))
  );

  const filteredOrgs = appliedStatus === 'All'
    ? searchedOrgs
    : searchedOrgs.filter((o) => o.status === appliedStatus);

  // Only updates pending - does NOT filter until Apply is clicked
  const handleSearchChange = (val: string) => setPendingSearch(val);
  const handleStatusFilter = (val: 'All' | 'Active' | 'Inactive' | 'Suspend') => setPendingStatus(val);

  // Apply: copy pending -> applied and reset to page 1
  const handleApply = () => {
    setAppliedSearch(pendingSearch);
    setAppliedStatus(pendingStatus);
    setCurrentPage(1);
  };

  // Reset: clear everything
  const handleReset = () => {
    setPendingSearch('');
    setPendingStatus('All');
    setAppliedSearch('');
    setAppliedStatus('All');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Top Action Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
              <Building2 className="w-4.5 h-4.5" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {isOrgSuperAdmin ? 'Sub Organization' : 'Organizations'}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            {isOrgSuperAdmin
              ? 'Manage sub organizations, multi-tenant units, and corporate profiles'
              : 'Manage enterprise organizations, multi-tenant units, and corporate profiles'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenAddModal}
            icon={<Plus className="w-4 h-4" strokeWidth={2.5} />}
          >
            Add New Organization
          </Button>
        </div>
      </div>

      {/* Filter / Search row */}
      <SearchBar
        value={pendingSearch}
        onChange={handleSearchChange}
        placeholder="Search organizations by name, code, type, industry, location..."
        onSubmit={handleApply}
        onReset={handleReset}
        filterSlot={
          <FilterDropdown
            options={[
              { label: 'Status : All', value: 'All' },
              { label: 'Active', value: 'Active', dotColor: '#10b981' },
              { label: 'Inactive', value: 'Inactive', dotColor: '#f43f5e' },
              { label: 'Suspend', value: 'Suspend', dotColor: '#f59e0b' },
            ]}
            value={pendingStatus}
            onChange={handleStatusFilter}
          />
        }
        rightSlot={
          <span className="text-xs font-semibold text-slate-500 pr-2">
            Total Organization :{' '}
            <span className="text-[#33077C] font-bold">{filteredOrgs.length}</span>
          </span>
        }
      />

      {/* Organizations Table matching 2nd reference image UI */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200 min-w-[900px]">
            <thead>
              <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white tracking-wider uppercase">
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">ORGANIZATION & CODE</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-center">CONTACT INFO</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">SUBSCRIPTION PLANS</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">LOCATION</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">STATUS</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">CREATED DATE</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-slate-500 border border-slate-200">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-[#33077C] border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-semibold text-slate-500">Loading organizations...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    No organizations found matching your search.
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((org) => {
                  const initials = org.name.substring(0, 2).toUpperCase();
                  const phone = org.phone || '+91 98765 43210';
                  const whatsappVal = org.whatsapp || org.phone || '+91 98765 43210';
                  const email = org.email || 'contact@org.com';

                  return (
                    <tr key={org.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* 1. Organization & Code */}
                      <td className="py-4 px-5 border border-slate-200">
                        <div className="flex items-center gap-3.5">
                          {org.logo ? (
                            <img src={org.logo} alt={org.name} className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200 shadow-xs" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2B3991] to-[#33077C] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                              {initials}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 text-sm">{org.name}</span>
                              <span className="text-xs font-semibold text-[#4309A2]">
                                ({org.code})
                              </span>
                              {org.organizationType && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                  org.organizationType === 'Sales Management'
                                    ? 'bg-purple-50 text-[#33077C] border-purple-200'
                                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                }`}>
                                  {org.organizationType}
                                </span>
                              )}
                            </div>
                            {org.contactPerson && (
                              <p className="text-xs text-slate-500 font-medium mt-0.5">
                                {org.contactPerson}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Contact Info Actions */}
                      <td className="py-4 px-4 border border-slate-200">
                        <div className="flex items-center justify-center gap-2">
                          {/* Phone */}
                          <div className="relative group">
                            <button
                              type="button"
                              onClick={(e) => handleCopy(e, phone, `${org.id}-phone`)}
                              className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </button>
                            <div className={`transition-all duration-200 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 text-white text-[11px] font-semibold rounded-lg shadow-lg whitespace-nowrap z-30 ${copiedKey === `${org.id}-phone`
                              ? 'opacity-100 bg-emerald-600 scale-100'
                              : 'opacity-0 group-hover:opacity-100 bg-slate-900'
                              }`}>
                              {copiedKey === `${org.id}-phone` ? 'Phone number copied' : phone}
                            </div>
                          </div>

                          {/* WhatsApp */}
                          <div className="relative group">
                            <button
                              type="button"
                              onClick={(e) => handleCopy(e, whatsappVal, `${org.id}-wa`)}
                              className="w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                            <div className={`transition-all duration-200 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 text-white text-[11px] font-semibold rounded-lg shadow-lg whitespace-nowrap z-30 ${copiedKey === `${org.id}-wa`
                              ? 'opacity-100 bg-emerald-600 scale-100'
                              : 'opacity-0 group-hover:opacity-100 bg-slate-900'
                              }`}>
                              {copiedKey === `${org.id}-wa` ? 'WhatsApp number copied' : whatsappVal}
                            </div>
                          </div>

                          {/* Email */}
                          <div className="relative group">
                            <button
                              type="button"
                              onClick={(e) => handleCopy(e, email, `${org.id}-email`)}
                              className="w-8 h-8 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-600 flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                            <div className={`transition-all duration-200 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 text-white text-[11px] font-semibold rounded-lg shadow-lg whitespace-nowrap z-30 ${copiedKey === `${org.id}-email`
                              ? 'opacity-100 bg-emerald-600 scale-100'
                              : 'opacity-0 group-hover:opacity-100 bg-slate-900'
                              }`}>
                              {copiedKey === `${org.id}-email` ? 'Email address copied' : email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. Subscription Plans */}
                      <td className="py-4 px-5 border border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-[#33077C] font-bold text-xs shadow-2xs">
                            <Layers className="w-3.5 h-3.5 text-[#33077C] shrink-0" />
                            {org.subscriptionPlan || 'Enterprise Pro'}
                          </span>
                        </div>
                      </td>

                      {/* 4. Location */}
                      <td className="py-4 px-5 border border-slate-200">
                        <div className="flex items-center gap-2 font-medium text-slate-900">
                          <MapPin className="w-4 h-4 text-[#4309A2] shrink-0" />
                          <span>{org.location}</span>
                        </div>
                      </td>

                      {/* 5. Status */}
                      <td className="py-4 px-5 border border-slate-200 text-center">
                        {org.status === 'Active' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        )}
                        {org.status === 'Suspend' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-xs border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Suspend
                          </span>
                        )}
                        {org.status === 'Inactive' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Inactive
                          </span>
                        )}
                        {org.status === 'Pending' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-xs border border-slate-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Pending
                          </span>
                        )}
                      </td>

                      {/* 6. Created Date */}
                      <td className="py-4 px-5 border border-slate-200">
                        <div className="font-bold text-slate-900 text-xs">
                          {formatDate(org.createdAt)}
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          Active Account
                        </span>
                      </td>

                      {/* 7. Action: Three Dots Dropdown */}
                      <td className="py-4 px-5 border border-slate-200 text-center relative action-dropdown-container">
                        <div className="inline-block text-left">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeDropdownId === org.id) {
                                setActiveDropdownId(null);
                                setDropdownPos(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const spaceBelow = window.innerHeight - rect.bottom;
                                const dropdownHeight = 240;

                                if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
                                  // Open upwards if not enough space below
                                  setDropdownPos({
                                    bottom: window.innerHeight - rect.top + 6,
                                    right: window.innerWidth - rect.right,
                                  });
                                } else {
                                  // Open downwards
                                  setDropdownPos({
                                    top: rect.bottom + 6,
                                    right: window.innerWidth - rect.right,
                                  });
                                }
                                setActiveDropdownId(org.id);
                              }
                            }}
                            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer bg-[#33077C] hover:bg-[#432eb5] text-white shadow-xs active:scale-95"
                            title="More Actions"
                          >
                            <MoreVertical className="w-4 h-4 text-white" />
                          </button>

                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Bar - standalone card */}
      <Pagination
        total={totalRecords}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={(page) => setCurrentPage(page)}
        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
      />

      {/* Action Dropdown Menu Portal / Overlay */}
      {activeDropdownId && dropdownPos && (() => {
        const targetOrg = organizations.find((o) => o.id === activeDropdownId);
        if (!targetOrg) return null;

        return (
          <div
            style={{
              position: 'fixed',
              ...(dropdownPos.bottom !== undefined
                ? { bottom: `${dropdownPos.bottom}px` }
                : { top: `${dropdownPos.top}px` }),
              right: `${dropdownPos.right}px`,
            }}
            className="w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[9999] action-dropdown-menu animate-in fade-in zoom-in-95 duration-100 text-left"
          >
            {/* 1. View */}
            <button
              type="button"
              onClick={() => {
                setActiveDropdownId(null);
                setDropdownPos(null);
                setViewingOrg(targetOrg);
              }}
              className="w-full px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center gap-3 transition-colors rounded-xl cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white shrink-0 shadow-xs">
                <Eye className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <span className="font-semibold text-slate-800 text-[13px]">View</span>
            </button>

            {/* 2. Edit */}
            <button
              type="button"
              onClick={() => {
                setActiveDropdownId(null);
                setDropdownPos(null);
                handleOpenEditModal(targetOrg);
              }}
              className="w-full px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center gap-3 transition-colors rounded-xl cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-[#7C3AED] flex items-center justify-center text-white shrink-0 shadow-xs">
                <Edit2 className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <span className="font-semibold text-slate-800 text-[13px]">Edit</span>
            </button>

            {/* 3. Suspend */}
            <button
              type="button"
              onClick={() => {
                setActiveDropdownId(null);
                setDropdownPos(null);
                setConfirmAction({
                  type: 'Suspend',
                  orgId: targetOrg.id,
                  orgName: targetOrg.name,
                });
              }}
              className="w-full px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center gap-3 transition-colors rounded-xl cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-white shrink-0 shadow-xs">
                <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <span className="font-semibold text-slate-800 text-[13px]">Suspend</span>
            </button>

            {/* 4. Inactive */}
            <button
              type="button"
              onClick={() => {
                setActiveDropdownId(null);
                setDropdownPos(null);
                setConfirmAction({
                  type: 'Inactive',
                  orgId: targetOrg.id,
                  orgName: targetOrg.name,
                });
              }}
              className="w-full px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center gap-3 transition-colors rounded-xl cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-slate-500 flex items-center justify-center text-white shrink-0 shadow-xs">
                <Ban className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <span className="font-semibold text-slate-800 text-[13px]">Inactive</span>
            </button>

            {/* Divider */}
            <div className="my-1.5 border-t border-slate-100" />

            {/* 5. Delete */}
            <button
              type="button"
              onClick={() => {
                setActiveDropdownId(null);
                setDropdownPos(null);
                setConfirmAction({
                  type: 'Delete',
                  orgId: targetOrg.id,
                  orgName: targetOrg.name,
                });
              }}
              className="w-full px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50/70 flex items-center gap-3 transition-colors rounded-xl cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-[#EF4444] flex items-center justify-center text-white shrink-0 shadow-xs">
                <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <span className="font-bold text-rose-600 text-[13px]">Delete</span>
            </button>
          </div>
        );
      })()}

      {/* Modal: Add / Edit Organization */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingOrg ? 'Edit Organization' : 'Add Organization'}
          subtitle="Configure organization profile, subscription tier, and contact details"
          maxWidth="4xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
        >
          <form onSubmit={handleSubmit} className="space-y-4.5 p-2 sm:p-4">
            {/* Row 1: Organization Logo, Organization Name, Organization Code */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Organization Logo
                </label>
                <div className="flex items-center gap-2.5">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                    {logo && (
                      <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 h-11 px-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs sm:text-[13px] border border-slate-200 hover:border-slate-300 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#33077C]" />
                    <span>{logo ? 'Change' : 'Upload Logo'}</span>
                  </button>
                  {logo && (
                    <button
                      type="button"
                      onClick={() => setLogo('')}
                      title="Remove logo"
                      className="h-11 px-2.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 border border-rose-100 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Organization Name <span className="text-slate-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Organization Code <span className="text-slate-500">*</span>
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>
            </div>

            {/* Row 2: Organization Type, Legal Entity Name, Company Registration Type */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Organization Type
                </label>
                <CustomSelect
                  value={organizationType}
                  onChange={(val) => setOrganizationType(val)}
                  options={ORGANIZATION_TYPE_OPTIONS}
                  placeholder="Select organization type"
                  activeColor="brand"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Legal Entity Name
                </label>
                <input
                  type="text"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Company Registration Type
                </label>
                <CustomSelect
                  value={registrationType}
                  onChange={(val) => setRegistrationType(val)}
                  options={REGISTRATION_TYPE_OPTIONS}
                  placeholder="Select company registration type"
                  activeColor="brand"
                />
              </div>
            </div>

            {/* Row 3: Status, Subscription Plan, GST Number */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Status
                </label>
                <CustomSelect
                  value={formStatus}
                  onChange={(val) => setFormStatus(val as 'Active' | 'Inactive' | 'Suspend')}
                  options={STATUS_OPTIONS}
                  placeholder="Select status"
                  activeColor="brand"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Subscription Plan
                </label>
                <CustomSelect
                  value={subscriptionPlan}
                  onChange={(val) => setSubscriptionPlan(val)}
                  options={SUBSCRIPTION_PLAN_OPTIONS}
                  placeholder="Select subscription plan"
                  activeColor="brand"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  GST Number
                </label>
                <input
                  type="text"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all uppercase"
                />
              </div>
            </div>

            {/* Row 4: PAN Number, Industry / Domain, Location / HQ City */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  PAN Number
                </label>
                <input
                  type="text"
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all uppercase"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Industry / Domain
                </label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Location / HQ City
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>
            </div>

            {/* Row 5: Contact Person Name, Contact Phone, WhatsApp Number */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Contact Person Name
                </label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  WhatsApp Number
                </label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>
            </div>

            {/* Row 6: Official Email, Password, Address, and Sub-organization support (3 items per row layout) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Official Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={editingOrg ? 'Leave empty to keep unchanged' : '••••••••'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 pl-4 pr-10 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>

              {isSuperAdmin && (
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Sub-Organization Support
                  </label>
                  <div className="h-11 px-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs hover:border-slate-300 transition-all">
                    <span className="text-xs font-semibold text-slate-600">
                      {subOrganizationSupport ? 'Enabled' : 'Disabled'}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={subOrganizationSupport}
                      onClick={() => setSubOrganizationSupport(!subOrganizationSupport)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        subOrganizationSupport ? 'bg-[#33077C]' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          subOrganizationSupport ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end items-center gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center gap-2"
              >
                <X className="w-4 h-4 text-slate-500" />
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
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
      )}

      {/* Modal: View Organization Details */}
      {viewingOrg && (
        <Modal
          isOpen={!!viewingOrg}
          onClose={() => setViewingOrg(null)}
          title="Organization Details"
          subtitle="View profile, contact information, and active subscription plan"
          maxWidth="4xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
        >
          <div className="space-y-5">
            {/* Top Overview / Profile Header Card (Matching Card Design) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-4">
                {viewingOrg.logo ? (
                  <div className="w-14 h-14 rounded-full bg-white border border-slate-200 p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                    <img src={viewingOrg.logo} alt={viewingOrg.name} className="w-full h-full object-cover rounded-full" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-full bg-[#33077C] text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
                    {viewingOrg.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">{viewingOrg.name}</h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                      {viewingOrg.code}
                    </span>
                    {viewingOrg.organizationType && (
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${
                        viewingOrg.organizationType === 'Sales Management'
                          ? 'bg-purple-50 text-[#33077C] border-purple-200'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}>
                        {viewingOrg.organizationType}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">{viewingOrg.legalName || viewingOrg.name}</p>
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{viewingOrg.location}</span>
                  </div>
                </div>
              </div>

              {/* Status & Plan Pills */}
              <div className="flex sm:flex-col items-start sm:items-end gap-2 shrink-0">
                {viewingOrg.status === 'Active' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active
                  </span>
                )}
                {viewingOrg.status === 'Suspend' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-xs border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Suspend
                  </span>
                )}
                {viewingOrg.status === 'Inactive' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    Inactive
                  </span>
                )}
                {viewingOrg.status === 'Pending' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-xs border border-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    Pending
                  </span>
                )}

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200 text-[#33077C] font-bold text-xs shadow-2xs">
                  <Layers className="w-3.5 h-3.5 text-[#33077C]" />
                  <span>{viewingOrg.subscriptionPlan || 'Enterprise Pro'}</span>
                </span>
              </div>
            </div>

            {/* Two Column Layout Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              {/* Left Column: Corporate & Registration Details */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3.5">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[#33077C] flex items-center justify-center font-bold">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <span>Corporate & Registration Details</span>
                </div>

                <div className="space-y-3 text-xs sm:text-[13px]">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400 font-medium shrink-0">Organization Type</span>
                    <span className="font-bold text-slate-800 text-right">{viewingOrg.organizationType || 'Client Management'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">Registration Type</span>
                    <span className="font-bold text-slate-800 text-right">{viewingOrg.registrationType || 'Pvt Ltd'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">GST Number</span>
                    <span className="font-bold text-slate-800 text-right">{viewingOrg.gstNumber || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">PAN Number</span>
                    <span className="font-bold text-slate-800 text-right">{viewingOrg.panNumber || '-'}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">Industry / Domain</span>
                    <span className="font-bold text-slate-800 text-right leading-snug">{viewingOrg.industry || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">Location / HQ City</span>
                    <span className="font-bold text-slate-800 text-right">{viewingOrg.location || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Contact & Address Details */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3.5">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[#33077C] flex items-center justify-center font-bold">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <span>Contact & Address Details</span>
                </div>

                <div className="space-y-3 text-xs sm:text-[13px]">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400 font-medium shrink-0">Contact Person</span>
                    <span className="font-bold text-slate-800 text-right">{viewingOrg.contactPerson || '-'}</span>
                  </div>

                  {/* Contact Phone */}
                  <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">Contact Phone</span>
                    <span className="font-bold text-slate-800 text-right">{viewingOrg.phone || '-'}</span>
                  </div>

                  {/* WhatsApp Number */}
                  <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">WhatsApp Number</span>
                    <span className="font-bold text-slate-800 text-right">{viewingOrg.whatsapp || viewingOrg.phone || '-'}</span>
                  </div>

                  {/* Official Email */}
                  <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">Official Email</span>
                    <span className="font-bold text-slate-800 text-right break-all">{viewingOrg.email || '-'}</span>
                  </div>

                  {/* Registered Address */}
                  <div className="flex items-start justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">Address</span>
                    <span className="font-bold text-slate-800 text-right leading-snug">{viewingOrg.address || viewingOrg.location || '-'}</span>
                  </div>

                  {/* Sub-Organization Support (Super Admin Only) */}
                  {isSuperAdmin && (
                    <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                      <span className="text-slate-400 font-medium shrink-0">Sub-Org Support</span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold border ${
                        viewingOrg.subOrganizationSupport
                          ? 'bg-purple-50 text-[#33077C] border-purple-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${viewingOrg.subOrganizationSupport ? 'bg-[#33077C]' : 'bg-slate-400'}`} />
                        {viewingOrg.subOrganizationSupport ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 flex justify-end items-center gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingOrg(null)}
                className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center gap-2"
              >
                <X className="w-4 h-4 text-slate-500" />
                <span>Close</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const orgToEdit = viewingOrg;
                  setViewingOrg(null);
                  handleOpenEditModal(orgToEdit);
                }}
                className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit Organization</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Modal: Suspend / Inactive / Delete */}
      {confirmAction && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setConfirmAction(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform scale-100 p-6 text-center animate-in zoom-in-95 duration-150"
          >
            {/* Action Icon */}
            <div className="mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center shadow-inner">
              {confirmAction.type === 'Delete' && (
                <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Trash2 className="w-7 h-7 stroke-[2.2]" />
                </div>
              )}
              {confirmAction.type === 'Suspend' && (
                <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                  <AlertCircle className="w-7 h-7 stroke-[2.2]" />
                </div>
              )}
              {confirmAction.type === 'Inactive' && (
                <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                  <Ban className="w-7 h-7 stroke-[2.2]" />
                </div>
              )}
            </div>

            {/* Title */}
            <h3 className="text-lg font-bold text-slate-800">
              {confirmAction.type === 'Delete' && 'Delete Organization'}
              {confirmAction.type === 'Suspend' && 'Suspend Organization'}
              {confirmAction.type === 'Inactive' && 'Deactivate Organization'}
            </h3>

            {/* Description */}
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              {confirmAction.type === 'Delete' && (
                <>
                  Are you sure you want to delete <span className="font-semibold text-slate-700">{confirmAction.orgName}</span>? This action cannot be undone.
                </>
              )}
              {confirmAction.type === 'Suspend' && (
                <>
                  Are you sure you want to mark <span className="font-semibold text-slate-700">{confirmAction.orgName}</span> as <span className="font-semibold text-amber-600">Suspended</span>?
                </>
              )}
              {confirmAction.type === 'Inactive' && (
                <>
                  Are you sure you want to mark <span className="font-semibold text-slate-700">{confirmAction.orgName}</span> as <span className="font-semibold text-slate-700">Inactive</span>?
                </>
              )}
            </p>

            {/* Action Buttons */}
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={() => setConfirmAction(null)}
                className="flex-1 h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={async () => {
                  if (confirmAction.type === 'Delete') {
                    await handleDeleteOrganization(confirmAction.orgId, confirmAction.orgName);
                  } else {
                    await handleUpdateStatus(confirmAction.orgId, confirmAction.type);
                    setConfirmAction(null);
                  }
                }}
                className={`flex-1 h-10 px-4 rounded-xl text-white text-xs sm:text-[13px] font-bold shadow-sm hover:shadow transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 ${confirmAction.type === 'Delete'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : confirmAction.type === 'Suspend'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-slate-700 hover:bg-slate-800'
                  }`}
              >
                {isProcessingAction ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    {confirmAction.type === 'Delete' && 'Yes, Delete'}
                    {confirmAction.type === 'Suspend' && 'Yes, Suspend'}
                    {confirmAction.type === 'Inactive' && 'Yes, Inactive'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
