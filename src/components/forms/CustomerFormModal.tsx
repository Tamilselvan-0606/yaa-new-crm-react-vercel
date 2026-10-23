import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CustomerSchema, CustomerFormData } from '../../schemas';
import { Customer, DocumentItem } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { CustomSelect } from '../common/CustomSelect';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { customerApi } from '../../api/commerce/customerApi';
import {
  clientProductApi,
  ClientProductApiItem,
  platformClientApi,
  subOrganizationApi,
  SubOrganizationApiItem,
  branchApi,
  BranchApiItem,
  organizationApi,
  OrganizationApiItem,
  getStoredOrganizationId,
} from '../../api';
import { useAppDispatch } from '../../hooks/redux';
import { baseApi } from '../../api/baseApi';
import { toast } from 'sonner';
import {
  Upload,
  Trash2,
  FileText,
  X,
  Check,
  CheckCircle2,
  FileCheck,
  Paperclip,
  Eye,
  ExternalLink,
} from 'lucide-react';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCustomer?: Customer | null;
}

const inputClass =
  'w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all';
const labelClass = 'text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5';

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  initialCustomer,
}) => {
  const dispatch = useAppDispatch();
  const { currentUser } = useAuth();

  // Role determination
  const userRole = (currentUser?.role || '').toString().toUpperCase();
  const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'SUPERADMIN';
  const isSubOrgAdmin =
    userRole === 'SUB_ORG_ADMIN' ||
    userRole === 'SUBORGADMIN' ||
    currentUser?.email?.toLowerCase() === 'suborgadmin@gmail.com' ||
    currentUser?.email?.toLowerCase() === 'yaaadmin@gmail.com';
  const isOrgAdmin = !isSuperAdmin && !isSubOrgAdmin;

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

  // Fetch Organizations (for Super Admin) or default org name
  useEffect(() => {
    if (!isOpen) return;
    if (isSuperAdmin) {
      organizationApi.getOrganizations(1, 100).then((res) => {
        if (res && Array.isArray(res.data)) {
          setOrganizations(res.data);
          if (res.data.length > 0 && !selectedOrgId) {
            setSelectedOrgId(res.data[0].id);
            setSelectedOrgName(res.data[0].name);
          }
        }
      }).catch((e) => console.warn('Could not load orgs:', e));
    } else {
      setSelectedOrgId(activeOrgId || '');
      if (activeOrgId) {
        organizationApi.getOrganizationById(activeOrgId).then((res) => {
          if (res?.data?.name) {
            setSelectedOrgName(res.data.name);
          }
        }).catch(() => {});
      }
    }
  }, [isOpen, isSuperAdmin, activeOrgId]);

  // Fetch Sub-Organizations
  useEffect(() => {
    if (!isOpen) return;
    const fetchSubOrgs = async () => {
      try {
        setLoadingSubOrgs(true);
        const orgToQuery = isSuperAdmin ? selectedOrgId : activeOrgId;
        const res = await subOrganizationApi.getSubOrganizations(
          { page_no: 1, page_size: 100, pagination_required: 'false' },
          orgToQuery || undefined
        );
        if (res && Array.isArray(res.data)) {
          setSubOrganizations(res.data);

          // If sub-org admin, resolve default sub-org
          if (isSubOrgAdmin) {
            const savedSubName =
              localStorage.getItem('active_sub_organization') ||
              (currentUser as any)?.subOrganization?.name ||
              (currentUser as any)?.subOrganizationName ||
              '';
            const matched = res.data.find(
              (s) =>
                s.name.toLowerCase() === savedSubName.toLowerCase() ||
                s.id === (currentUser as any)?.subOrganizationId
            ) || res.data[0];
            if (matched) {
              setSelectedSubOrgId(matched.id);
              setSelectedSubOrgName(matched.name);
            }
          }
        } else {
          setSubOrganizations([]);
        }
      } catch (err) {
        console.warn('Failed to load sub-organizations:', err);
        setSubOrganizations([]);
      } finally {
        setLoadingSubOrgs(false);
      }
    };
    fetchSubOrgs();
  }, [isOpen, selectedOrgId, activeOrgId, isSuperAdmin, isSubOrgAdmin]);

  // Fetch Branches
  useEffect(() => {
    if (!isOpen) return;
    const fetchBranches = async () => {
      try {
        setLoadingBranches(true);
        const orgToQuery = isSuperAdmin ? selectedOrgId : activeOrgId;
        const res = await branchApi.getBranches(
          {
            page_no: 1,
            page_size: 100,
            pagination_required: 'false',
            sub_organization_id: selectedSubOrgId || undefined,
            organization_id: orgToQuery || undefined,
          },
          orgToQuery || undefined
        );
        if (res && Array.isArray(res.data)) {
          setBranches(res.data);
        } else {
          setBranches([]);
        }
      } catch (err) {
        console.warn('Failed to load branches:', err);
        setBranches([]);
      } finally {
        setLoadingBranches(false);
      }
    };
    fetchBranches();
  }, [isOpen, selectedOrgId, selectedSubOrgId, activeOrgId, isSuperAdmin]);

  // Products from API
  const [products, setProducts] = useState<ClientProductApiItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  // Documents: shared_by_company (our documents) & shared_by_client (client documents)
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  const generateClientId = () => `CLI-${Math.floor(1000 + Math.random() * 9000)}`;

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(CustomerSchema),
    defaultValues: {
      clientId: generateClientId(),
      clientName: '',
      businessName: '',
      contactPerson: '',
      phone: '',
      whatsapp: '',
      email: '',
      gstNumber: '',
      panNumber: '',
      address: '',
    },
  });

  // Load real products from API
  useEffect(() => {
    if (!isOpen) return;
    const loadProducts = async () => {
      try {
        setLoadingProducts(true);
        const res = await clientProductApi.getProducts({ page: 1, limit: 100 });
        if (res && res.success && Array.isArray(res.data)) {
          setProducts(res.data);
        } else {
          setProducts([]);
        }
      } catch (err) {
        console.warn('Failed to load products in customer form:', err);
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };
    loadProducts();
  }, [isOpen]);

  // Reset or pre-fill form
  useEffect(() => {
    if (isOpen) {
      if (initialCustomer) {
        reset({
          clientId: initialCustomer.clientId || `CLI-${initialCustomer.id}`,
          clientName: initialCustomer.clientName || initialCustomer.name || '',
          businessName: initialCustomer.businessName || initialCustomer.company || '',
          contactPerson: initialCustomer.contactPerson || initialCustomer.name || '',
          phone: initialCustomer.phone || '',
          whatsapp: initialCustomer.whatsapp || '',
          email: initialCustomer.email || '',
          gstNumber: (initialCustomer as any).gstNumber || initialCustomer.gstin || initialCustomer.taxId || '',
          panNumber: (initialCustomer as any).panNumber || initialCustomer.pan || '',
          address: initialCustomer.address || initialCustomer.location || '',
        });

        const firstLinkedProd = initialCustomer.linkedProducts?.[0]?.productName || initialCustomer.linkedProducts?.[0]?.productId || '';
        setSelectedProductId(firstLinkedProd);

        setDocuments(
          initialCustomer.documents && initialCustomer.documents.length > 0
            ? initialCustomer.documents
            : [
                {
                  id: 'doc_init_1',
                  title: 'Master Service Agreement (MSA)',
                  category: 'Agreement',
                  fileType: 'PDF',
                  fileSize: '2.4 MB',
                  url: '#',
                  uploadedBy: 'Company Staff',
                  uploadedAt: new Date().toISOString().split('T')[0],
                  type: 'shared_by_company',
                },
                {
                  id: 'doc_init_2',
                  title: 'Corporate GST Certificate',
                  category: 'Tax/GST',
                  fileType: 'PDF',
                  fileSize: '850 KB',
                  url: '#',
                  uploadedBy: 'Client',
                  uploadedAt: new Date().toISOString().split('T')[0],
                  type: 'shared_by_client',
                },
              ]
        );
      } else {
        reset({
          clientId: generateClientId(),
          clientName: '',
          businessName: '',
          contactPerson: '',
          phone: '',
          whatsapp: '',
          email: '',
          gstNumber: '',
          panNumber: '',
          address: '',
        });
        setSelectedProductId('');
        setDocuments([
          {
            id: 'doc_init_1',
            title: 'Master Service Agreement (MSA)',
            category: 'Agreement',
            fileType: 'PDF',
            fileSize: '2.4 MB',
            url: '#',
            uploadedBy: 'Company Staff',
            uploadedAt: new Date().toISOString().split('T')[0],
            type: 'shared_by_company',
          },
          {
            id: 'doc_init_2',
            title: 'Corporate GST Certificate',
            category: 'Tax/GST',
            fileType: 'PDF',
            fileSize: '850 KB',
            url: '#',
            uploadedBy: 'Client',
            uploadedAt: new Date().toISOString().split('T')[0],
            type: 'shared_by_client',
          },
        ]);
      }
      setFormErrors({});
      setApiModalError(null);
    }
  }, [isOpen, initialCustomer, reset]);

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'shared_by_company' | 'shared_by_client'
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const sizeStr = Number(sizeMB) < 1 ? `${Math.round(file.size / 1024)} KB` : `${sizeMB} MB`;
      const newDoc: DocumentItem = {
        id: 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        title: file.name,
        category: type === 'shared_by_company' ? 'Our Document' : 'Client Document',
        fileType: ext,
        fileSize: sizeStr,
        url: '#',
        uploadedBy: type === 'shared_by_company' ? 'Company Staff' : 'Client',
        uploadedAt: new Date().toISOString().split('T')[0],
        type,
      };
      setDocuments((prev) => [...prev, newDoc]);
    });
    toast.success(`Uploaded ${files.length} document(s)`);
    e.target.value = '';
  };

  const handleRemoveDoc = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const productOptions = products.map((p) => ({
    value: p.name,
    label: `${p.name}${p.code ? ` (${p.code})` : ''}`,
  }));

  const ourDocuments = documents.filter((d) => (d.type || 'shared_by_company') === 'shared_by_company');
  const clientDocuments = documents.filter((d) => d.type === 'shared_by_client');

  const onSubmit = async (data: CustomerFormData) => {
    const customErrors: Record<string, string> = {};
    if (isSuperAdmin && !selectedOrgId) {
      customErrors.organization = 'Organization is required';
    }
    if (subOrganizations.length > 0 && !selectedSubOrgId) {
      customErrors.subOrganization = 'Sub-Organization is required';
    }
    if (branches.length > 0 && !selectedBranchId) {
      customErrors.branch = 'Branch is required';
    }
    if (!selectedProductId) {
      customErrors.product = 'Product Selection is required';
    }

    if (Object.keys(customErrors).length > 0) {
      setFormErrors(customErrors);
      return;
    }
    setFormErrors({});

    try {
      const selectedProductItem = products.find((p) => p.name === selectedProductId);
      const linkedProducts: Customer['linkedProducts'] = selectedProductId
        ? [
            {
              productId: selectedProductItem?.id || 'prod_custom',
              productName: selectedProductId,
              planName: 'Standard Plan',
              amount: 0,
              status: 'Active',
              since: new Date().toISOString().split('T')[0],
            },
          ]
        : [];

      const payload: Partial<Customer> = {
        clientId: data.clientId,
        name: data.clientName,
        company: data.businessName,
        contactPerson: data.contactPerson,
        phone: data.phone,
        whatsapp: data.whatsapp || data.phone,
        email: data.email,
        address: data.address,
        gstin: data.gstNumber,
        pan: data.panNumber,
        status: 'Active',
        linkedProducts,
        documents,
      };

      const effectiveOrgId = (isSuperAdmin ? selectedOrgId : activeOrgId) || undefined;
      const resolvedProdId =
        selectedProductItem?.id ||
        products.find((p) => p.name === selectedProductId || p.id === selectedProductId)?.id ||
        selectedProductId ||
        undefined;

      if (initialCustomer) {
        await platformClientApi.updateClient(initialCustomer.id, {
          name: data.businessName || data.clientName,
          legalName: data.businessName || data.clientName,
          contactPerson: data.contactPerson || data.clientName,
          phone: data.phone,
          whatsapp: data.whatsapp || data.phone,
          email: data.email,
          address: data.address,
          gstNumber: data.gstNumber,
          panNumber: data.panNumber,
          registrationType: 'Pvt Ltd',
          organizationType: 1,
          status: 'Active',
          subOrganizationSupport: true,
          organizationId: effectiveOrgId,
          subOrganizationId: selectedSubOrgId || undefined,
          branchId: selectedBranchId || undefined,
          productId: resolvedProdId,
        });
        toast.success('Client updated successfully');
      } else {
        await platformClientApi.createClient({
          code: data.clientId,
          name: data.businessName || data.clientName,
          legalName: data.businessName || `${data.clientName} Private Limited`,
          contactPerson: data.contactPerson || data.clientName,
          phone: data.phone,
          whatsapp: data.whatsapp || data.phone,
          email: data.email,
          password: 'Password@123',
          gstNumber: data.gstNumber,
          panNumber: data.panNumber,
          address: data.address,
          organizationId: effectiveOrgId,
          subOrganizationId: selectedSubOrgId || undefined,
          branchId: selectedBranchId || undefined,
          productId: resolvedProdId,
          registrationType: 'Pvt Ltd',
          organizationType: 1,
          status: 'Active',
          subOrganizationSupport: true,
        });
        toast.success('Client profile created successfully');
      }

      dispatch(
        baseApi.util.invalidateTags([
          { type: 'Customer', id: 'LIST' },
          { type: 'PlatformClient', id: 'LIST' },
          'Dashboard',
        ])
      );
      onClose();
    } catch (e: any) {
      console.error('Client save failed:', e);
      const errMsg =
        e?.response?.data?.message ||
        e?.response?.data?.error?.message ||
        (Array.isArray(e?.response?.data?.fields)
          ? e.response.data.fields.map((f: any) => `${f.path?.join('.') ? f.path.join('.') + ': ' : ''}${f.message}`).join(', ')
          : null) ||
        (Array.isArray(e?.response?.data?.errors)
          ? e.response.data.errors.map((er: any) => er.message || er).join(', ')
          : null) ||
        e?.data?.message ||
        e?.message ||
        'Operation failed';
      setApiModalError(errMsg);
      toast.error('Operation failed', { description: errMsg });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialCustomer ? 'Edit Client Profile' : 'Create Client Profile'}
      subtitle={
        <span className="text-white/80 text-xs font-normal">
          {initialCustomer
            ? 'Update client details, tax numbers, product and attached documents'
            : 'Register a new client profile with contact info, tax registration, product and documents'}
        </span>
      }
      maxWidth="4xl"
      headerGradient={true}
      showBackIcon={true}
      hideCloseButton={true}
      onBack={onClose}
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-2 sm:p-4 animate-in fade-in duration-150">
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
                  title="Default organization cannot be modified"
                  className={`${inputClass} bg-slate-100/80 cursor-not-allowed text-slate-600 font-semibold`}
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Default organization (non-editable)</span>
              </div>
            )}
          </div>

          {/* Sub-Organization */}
          <div>
            <label className={labelClass}>
              Sub-Organization <span className="text-rose-500 font-bold">*</span>
            </label>
            {isSubOrgAdmin ? (
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
            <CustomSelect
              value={selectedBranchId}
              error={!!formErrors.branch}
              onChange={(val) => {
                setSelectedBranchId(val);
                if (formErrors.branch) setFormErrors((prev) => ({ ...prev, branch: '' }));
              }}
              options={
                branches.length > 0
                  ? branches.map((b) => ({
                      value: b.id,
                      label: `${b.name}${b.location ? ` - ${b.location}` : ''}`,
                    }))
                  : [{ value: '', label: loadingBranches ? 'Loading branches...' : 'No branches found' }]
              }
              placeholder={loadingBranches ? 'Loading branches...' : 'Select Branch'}
            />
            {formErrors.branch && (
              <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.branch}</p>
            )}
          </div>
        </div>

        {/* Row 1: Client ID | Client Name | Client Business */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>
              Client ID <span className="text-rose-500 font-bold">*</span>
            </label>
            <input
              {...register('clientId')}
              type="text"
              className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                errors.clientId
                  ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                  : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
              }`}
            />
            {errors.clientId && (
              <p className="text-[11px] font-medium text-red-500 mt-1">{errors.clientId.message}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>
              Client Name <span className="text-rose-500 font-bold">*</span>
            </label>
            <input
              {...register('clientName')}
              type="text"
              placeholder="e.g. John Doe"
              className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                errors.clientName
                  ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                  : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
              }`}
            />
            {errors.clientName && (
              <p className="text-[11px] font-medium text-red-500 mt-1">{errors.clientName.message}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>
              Client Business <span className="text-rose-500 font-bold">*</span>
            </label>
            <input
              {...register('businessName')}
              type="text"
              placeholder="Company / Business Name"
              className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                errors.businessName
                  ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                  : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
              }`}
            />
            {errors.businessName && (
              <p className="text-[11px] font-medium text-red-500 mt-1">{errors.businessName.message}</p>
            )}
          </div>
        </div>

        {/* Row 2: Contact Person | Phone Number | WhatsApp Number */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>
              Contact Person <span className="text-rose-500 font-bold">*</span>
            </label>
            <input
              {...register('contactPerson')}
              type="text"
              placeholder="Contact Person Full Name"
              className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                errors.contactPerson
                  ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                  : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
              }`}
            />
            {errors.contactPerson && (
              <p className="text-[11px] font-medium text-red-500 mt-1">{errors.contactPerson.message}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>
              Phone Number <span className="text-rose-500 font-bold">*</span>
            </label>
            <Controller
              name="phone"
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
                    errors.phone
                      ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                      : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                  }`}
                />
              )}
            />
            {errors.phone && (
              <p className="text-[11px] font-medium text-red-500 mt-1">{errors.phone.message}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>WhatsApp Number</label>
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

        {/* Row 3: Email | GST Number | PAN Number */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>
              Email <span className="text-rose-500 font-bold">*</span>
            </label>
            <input
              {...register('email')}
              type="email"
              placeholder="client@company.com"
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
              GST Number <span className="text-rose-500 font-bold">*</span>
            </label>
            <Controller
              name="gstNumber"
              control={control}
              render={({ field }) => (
                <input
                  type="text"
                  maxLength={15}
                  placeholder="e.g. 33AAAAA0000A1Z5"
                  value={field.value || ''}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 15);
                    field.onChange(clean);
                  }}
                  className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all uppercase ${
                    errors.gstNumber
                      ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                      : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                  }`}
                />
              )}
            />
            {errors.gstNumber && (
              <p className="text-[11px] font-medium text-red-500 mt-1">{errors.gstNumber.message}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>
              PAN Number <span className="text-rose-500 font-bold">*</span>
            </label>
            <Controller
              name="panNumber"
              control={control}
              render={({ field }) => (
                <input
                  type="text"
                  maxLength={10}
                  placeholder="e.g. ABCDE1234F"
                  value={field.value || ''}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);
                    field.onChange(clean);
                  }}
                  className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all uppercase ${
                    errors.panNumber
                      ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                      : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                  }`}
                />
              )}
            />
            {errors.panNumber && (
              <p className="text-[11px] font-medium text-red-500 mt-1">{errors.panNumber.message}</p>
            )}
          </div>
        </div>

        {/* Row 4: Address | Product Selection (3 fields per row grid layout) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>
              Address <span className="text-rose-500 font-bold">*</span>
            </label>
            <input
              {...register('address')}
              type="text"
              placeholder="Street Address, City, State, Pincode"
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
            <label className={labelClass}>
              Product Selection <span className="text-rose-500 font-bold">*</span>
            </label>
            <CustomSelect
              value={selectedProductId}
              error={!!formErrors.product}
              onChange={(val) => {
                setSelectedProductId(val);
                if (formErrors.product) setFormErrors((prev) => ({ ...prev, product: '' }));
              }}
              options={
                productOptions.length > 0
                  ? productOptions
                  : [{ value: '', label: loadingProducts ? 'Loading products...' : 'No products found' }]
              }
              placeholder={loadingProducts ? 'Loading products...' : 'Select Product'}
            />
            {formErrors.product && (
              <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.product}</p>
            )}
          </div>
        </div>

        {/* Row 5: Document Uploads (Two Columns: Our Documents & Client Documents) */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <label className="text-xs sm:text-[13px] font-bold text-slate-800 flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-[#4309A2]" />
                Document Uploads
              </label>
              <p className="text-[11px] text-slate-400 mt-0.5">Attach contractual agreements and verification documents</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                Total: <span className="font-bold text-slate-800">{ourDocuments.length + clientDocuments.length}</span> files
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Column A: Our Documents (Shared to Client) */}
            <div className="group/card bg-gradient-to-b from-purple-50/40 via-white to-white rounded-2xl border border-purple-100/80 hover:border-purple-200 p-4 transition-all shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-100/70 text-[#4309A2] flex items-center justify-center shrink-0 shadow-2xs">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800">Our Documents</h4>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-100/80 text-[#4309A2]">
                        {ourDocuments.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                      Contracts, MSA &amp; proposals sent to client
                    </p>
                  </div>
                </div>
                <label className="inline-flex items-center gap-1.5 h-8 px-3.5 bg-gradient-to-r from-[#4309A2] to-[#5A0EC8] hover:from-[#370685] hover:to-[#4309A2] text-white font-semibold text-xs rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload</span>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => handleFileUpload(e, 'shared_by_company')}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Uploaded Our Documents List */}
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                {ourDocuments.length === 0 ? (
                  <label className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-purple-200/70 hover:border-[#4309A2]/40 rounded-xl bg-white/70 hover:bg-purple-50/20 text-slate-400 cursor-pointer transition-all">
                    <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-[#4309A2] mb-1.5">
                      <Upload className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-semibold text-slate-600">No company documents attached</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Click "Upload" or drop files here</p>
                    <input
                      type="file"
                      multiple
                      onChange={(e) => handleFileUpload(e, 'shared_by_company')}
                      className="hidden"
                    />
                  </label>
                ) : (
                  ourDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="group/item p-2.5 bg-white hover:bg-purple-50/30 rounded-xl border border-slate-200/80 hover:border-purple-200 flex items-center justify-between gap-2.5 transition-all shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#4309A2] flex items-center justify-center shrink-0 font-bold border border-purple-100">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate" title={doc.title}>
                            {doc.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                              {doc.category || 'Agreement'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {doc.fileSize || 'PDF'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {doc.url && (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-[#4309A2] hover:bg-purple-50 p-1.5 rounded-lg transition-colors"
                            title="View Document"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveDoc(doc.id)}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                          title="Remove Document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column B: Client Documents (Received from Client) */}
            <div className="group/card bg-gradient-to-b from-emerald-50/40 via-white to-white rounded-2xl border border-emerald-100/80 hover:border-emerald-200 p-4 transition-all shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800">Client Documents</h4>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100/80 text-emerald-700">
                        {clientDocuments.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                      GST certificate, PAN card, cheques &amp; proofs
                    </p>
                  </div>
                </div>
                <label className="inline-flex items-center gap-1.5 h-8 px-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload</span>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => handleFileUpload(e, 'shared_by_client')}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Uploaded Client Documents List */}
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                {clientDocuments.length === 0 ? (
                  <label className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-emerald-200/70 hover:border-emerald-500/40 rounded-xl bg-white/70 hover:bg-emerald-50/20 text-slate-400 cursor-pointer transition-all">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-1.5">
                      <Upload className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-semibold text-slate-600">No client documents attached</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Click "Upload" or drop files here</p>
                    <input
                      type="file"
                      multiple
                      onChange={(e) => handleFileUpload(e, 'shared_by_client')}
                      className="hidden"
                    />
                  </label>
                ) : (
                  clientDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="group/item p-2.5 bg-white hover:bg-emerald-50/30 rounded-xl border border-slate-200/80 hover:border-emerald-200 flex items-center justify-between gap-2.5 transition-all shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 font-bold border border-emerald-100">
                          <FileCheck className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate" title={doc.title}>
                            {doc.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                              {doc.category || 'Proof'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {doc.fileSize || 'PDF'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {doc.url && (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 p-1.5 rounded-lg transition-colors"
                            title="View Document"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveDoc(doc.id)}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                          title="Remove Document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Buttons */}
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
            {isSubmitting ? 'Saving...' : initialCustomer ? 'Save Changes' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
