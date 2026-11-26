import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CustomerSchema, CustomerFormData } from '../../schemas';
import { Customer, DocumentItem } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { CustomSelect } from '../common/CustomSelect';
import { useAuth } from '../../context/AuthContext';
import { useScopeLock } from '../../hooks/useScopeLock';
import { useActiveOrgType } from '../../hooks/useActiveOrgType';
import { filterBranchesForSuite, excludeInactiveBranches } from '../../utils/branchSuite';
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
import { baseApi, baseClient } from '../../api/baseApi';
import { store } from '../../store/store';
import { RegisteredField } from '../common/FormField';
import { PhoneField } from '../common/PhoneField';
import { LocationFields, LocationMeta } from '../common/LocationFields';
import {
  alphanumericUpper,
  digitsOnly,
  lettersOnly,
  cleanPincode,
  pincodeMatching,
  liveGstError,
  liveMobileStartError,
  livePanError,
} from '../../utils/fieldValidators';
import { toast } from "../../utils/toast";
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
  onCustomerSaved?: () => void;
}

const inputClass =
  'w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all';
const labelClass = 'text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5';

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  initialCustomer,
  onCustomerSaved,
}) => {
  // Prefilled records (e.g. converting a lead) have no id yet and must be created, not updated.
  const isEditing = Boolean(initialCustomer?.id);
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
  const { lockSubOrg, lockBranch, lockedSubOrgId, lockedBranchId } = useScopeLock();
  const { isSaleManagement } = useActiveOrgType();

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

  // Fetch Sub-Organizations (filtered for Client Management)
  useEffect(() => {
    if (!isOpen) return;
    const fetchSubOrgs = async () => {
      try {
        setLoadingSubOrgs(true);
        const orgToQuery = isSuperAdmin ? selectedOrgId : activeOrgId;
        const res = await subOrganizationApi.getSubOrganizations(
          { page_no: 1, page_size: 100, pagination_required: 'false', subOrganizationType: 1 },
          orgToQuery || undefined
        );
        if (res && Array.isArray(res.data)) {
          // Only include Client Management (1) or Both (3); exclude pure Sales Management (2)
          const subs = res.data.filter((s: any) => {
            const t = Number(s.subOrganizationType);
            return isNaN(t) || t === 1 || t === 3;
          });
          setSubOrganizations(subs);

          // If sub-org admin, resolve default sub-org
          if (isSubOrgAdmin) {
            const savedSubName =
              localStorage.getItem('active_sub_organization') ||
              (currentUser as any)?.subOrganization?.name ||
              (currentUser as any)?.subOrganizationName ||
              '';
            const matched = subs.find(
              (s) =>
                s.name.toLowerCase() === savedSubName.toLowerCase() ||
                s.id === (currentUser as any)?.subOrganizationId
            ) || subs[0];
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
  const branchesKey = `${(isSuperAdmin ? selectedOrgId : activeOrgId) || ''}|${selectedSubOrgId}`;
  const [branchesLoadedFor, setBranchesLoadedFor] = useState('');
  useEffect(() => {
    if (!isOpen) {
      setBranchesLoadedFor('');
      return;
    }
    // If no sub-organization has been selected, require selecting sub-organization first
    if (!selectedSubOrgId) {
      setBranches([]);
      setSelectedBranchId('');
      setBranchesLoadedFor(branchesKey);
      setLoadingBranches(false);
      return;
    }
    let cancelled = false;
    const fetchBranches = async () => {
      try {
        setLoadingBranches(true);
        const orgToQuery = isSuperAdmin ? selectedOrgId : activeOrgId;
        const res = await branchApi.getBranches(
          {
            page_no: 1,
            page_size: 100,
            pagination_required: 'false',
            sub_organization_id: selectedSubOrgId && selectedSubOrgId !== '__PARENT_ORG__' ? selectedSubOrgId : undefined,
            organization_id: orgToQuery || undefined,
          },
          orgToQuery || undefined
        );
        if (cancelled) return;
        const all = excludeInactiveBranches(filterBranchesForSuite(res && Array.isArray(res.data) ? res.data : [], isSaleManagement));
        let list = !selectedSubOrgId
          ? []
          : selectedSubOrgId === '__PARENT_ORG__'
            ? // Main organization: only branches not attached to a sub-organization
              all.filter((b) => !b.subOrganizationId)
            : all.filter((b) => b.subOrganizationId === selectedSubOrgId);
        // Ensure initial customer's branch is never filtered out in edit mode
        const existingBranchId = (initialCustomer as any)?.branchId || (initialCustomer as any)?.branch_id;
        if (initialCustomer && existingBranchId && !list.some((b) => b.id === existingBranchId)) {
          const matchInAll = all.find((b) => b.id === existingBranchId);
          if (matchInAll) {
            list = [matchInAll, ...list];
          }
        }
        setBranches(list);
        // Drop a branch that belongs to a previously selected sub-organization
        if (!initialCustomer) setSelectedBranchId((cur) => (cur && !list.some((b) => b.id === cur) ? '' : cur));
      } catch (err) {
        console.warn('Failed to load branches:', err);
        if (!cancelled) setBranches([]);
      } finally {
        if (!cancelled) {
          setBranchesLoadedFor(branchesKey);
          setLoadingBranches(false);
        }
      }
    };
    fetchBranches();
    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedOrgId, selectedSubOrgId, activeOrgId, isSuperAdmin, isSaleManagement]);

  // Products from API
  const [products, setProducts] = useState<ClientProductApiItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  // Documents: shared_by_company (our documents) & shared_by_client (client documents)
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [locationMeta, setLocationMeta] = useState<LocationMeta>({ stateRequired: true, districtRequired: true });

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(CustomerSchema),
    defaultValues: {
      clientId: '',
      clientName: '',
      businessName: '',
      contactPerson: '',
      phone: '',
      whatsapp: '',
      email: '',
      gstNumber: '',
      panNumber: '',
      address: '',
      country: '',
      countryId: '',
      state: '',
      stateId: '',
      district: '',
      districtId: '',
      city: '',
      pincode: '',
    },
  });

  /** Shows (or clears) an error while the user is still typing, before the form is submitted. */
  const showLiveError = (field: 'gstNumber' | 'panNumber' | 'phone' | 'whatsapp', message: string) =>
    message ? setError(field, { type: 'manual', message }) : clearErrors(field);

  // Load real products, requested with the selected branch once the branches for the current org/sub-org are
  // loaded (so a stale branch id is never sent). If the server rejects the branch, the org/sub-org products
  // are loaded and filtered by the branch here instead.
  useEffect(() => {
    if (!isOpen || branchesLoadedFor !== branchesKey) return;
    let cancelled = false;
    const orgToQuery = (isSuperAdmin ? selectedOrgId : activeOrgId) || undefined;
    const branchId = branches.some((b) => b.id === selectedBranchId) ? selectedBranchId : undefined;
    const load = (withBranch: boolean) =>
      clientProductApi.getProducts(
        {
          page: 1,
          limit: 100,
          organizationId: orgToQuery,
          subOrganizationId: selectedSubOrgId || undefined,
          branchId: withBranch ? branchId : undefined,
        },
        orgToQuery
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
        if (cancelled) return;
        let list = res && res.success && Array.isArray(res.data) ? res.data : [];
        if (filterByBranch) {
          const linkedProductId = branches.find((b) => b.id === branchId)?.productId;
          list = list.filter((p) => p.branchId === branchId || p.id === linkedProductId);
        }
        setProducts(list);
        // A product chosen for another branch no longer applies (existing clients keep their linked product).
        if (branchId && !initialCustomer) {
          setSelectedProductId((prev) => (prev && !list.some((p) => p.name === prev) ? '' : prev));
        }
      })
      .catch((err) => {
        console.warn('Failed to load products in customer form:', err);
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingProducts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, branchesLoadedFor, branchesKey, branches, selectedBranchId, selectedSubOrgId, selectedOrgId, activeOrgId, isSuperAdmin]);

  // Reset or pre-fill form
  useEffect(() => {
    if (isOpen) {
      if (initialCustomer) {
        reset({
          clientId: (initialCustomer as any).code || initialCustomer.clientId || '',
          clientName: initialCustomer.clientName || initialCustomer.name || '',
          businessName: initialCustomer.businessName || initialCustomer.company || '',
          contactPerson: initialCustomer.contactPerson || initialCustomer.name || '',
          phone: initialCustomer.phone || '',
          whatsapp: initialCustomer.whatsapp || '',
          email: initialCustomer.email || '',
          gstNumber: (initialCustomer as any).gstNumber || initialCustomer.gstin || initialCustomer.taxId || '',
          panNumber: (initialCustomer as any).panNumber || initialCustomer.pan || '',
          address: initialCustomer.address || initialCustomer.location || '',
          country: (initialCustomer as any).countryName || (initialCustomer as any).country || '',
          state: (initialCustomer as any).stateName || (initialCustomer as any).state || '',
          district: (initialCustomer as any).districtName || (initialCustomer as any).district || '',
          city: (initialCustomer as any).city || initialCustomer.location || '',
          countryId: '',
          stateId: '',
          districtId: '',
          pincode: (initialCustomer as any).pincode || '',
        });

        const existingSubOrgId =
          (initialCustomer as any).subOrganizationId || (initialCustomer as any).sub_organization_id || '';
        const existingBranchId = (initialCustomer as any).branchId || (initialCustomer as any).branch_id || '';
        if (existingSubOrgId) {
          setSelectedSubOrgId(existingSubOrgId);
        } else if (existingBranchId) {
          // If sub-org id not directly provided, check if branch carries it
          const matchedBranch = branches.find((b) => b.id === existingBranchId);
          if (matchedBranch?.subOrganizationId) {
            setSelectedSubOrgId(matchedBranch.subOrganizationId);
          }
        }
        if (existingBranchId) setSelectedBranchId(existingBranchId);

        const firstLinkedProd = initialCustomer.linkedProducts?.[0]?.productName || initialCustomer.linkedProducts?.[0]?.productId || '';
        setSelectedProductId(firstLinkedProd);

        const existingDocs: DocumentItem[] = [];
        if (Array.isArray(initialCustomer.documents) && initialCustomer.documents.length > 0) {
          existingDocs.push(...initialCustomer.documents);
        }
        if (Array.isArray((initialCustomer as any).ourDocuments)) {
          (initialCustomer as any).ourDocuments.forEach((doc: any, idx: number) => {
            if (!existingDocs.some((d) => d.url === doc.url)) {
              existingDocs.push({
                id: `existing_our_${idx}_${Date.now()}`,
                title: doc.name || doc.title || 'Our Document',
                fileType: (doc.name || doc.url || '').split('.').pop()?.toUpperCase() || 'PDF',
                fileSize: '',
                url: doc.url || '#',
                uploadedBy: 'Company Staff',
                uploadedAt: new Date().toISOString().split('T')[0],
                category: 'Our Document',
                type: 'shared_by_company',
              });
            }
          });
        }
        if (Array.isArray((initialCustomer as any).clientDocuments)) {
          (initialCustomer as any).clientDocuments.forEach((doc: any, idx: number) => {
            if (!existingDocs.some((d) => d.url === doc.url)) {
              existingDocs.push({
                id: `existing_client_${idx}_${Date.now()}`,
                title: doc.name || doc.title || 'Client Document',
                fileType: (doc.name || doc.url || '').split('.').pop()?.toUpperCase() || 'PDF',
                fileSize: '',
                url: doc.url || '#',
                uploadedBy: 'Client',
                uploadedAt: new Date().toISOString().split('T')[0],
                category: 'Client Document',
                type: 'shared_by_client',
              });
            }
          });
        }
        setDocuments(existingDocs);
      } else {
        reset({
          clientId: '',
          clientName: '',
          businessName: '',
          contactPerson: '',
          phone: '',
          whatsapp: '',
          email: '',
          gstNumber: '',
          panNumber: '',
          address: '',
          country: '',
          countryId: '',
          state: '',
          stateId: '',
          district: '',
          districtId: '',
          city: '',
          pincode: '',
        });
        setSelectedProductId('');
        setDocuments([]);
        if (!isSubOrgAdmin) {
          setSelectedSubOrgId('');
          setSelectedBranchId('');
        }
      }
      setFormErrors({});
      setApiModalError(null);
    }
  }, [isOpen, initialCustomer, reset]);

  // Sub-org / branch admins are pinned to the scope from their login
  useEffect(() => {
    if (!isOpen) return;
    if (lockSubOrg) setSelectedSubOrgId(lockedSubOrgId);
    if (lockBranch) setSelectedBranchId(lockedBranchId);
  }, [isOpen, lockSubOrg, lockBranch, lockedSubOrgId, lockedBranchId, initialCustomer, subOrganizations]);

  const isAudioOrVideoFile = (file: File): boolean => {
    const mime = (file.type || '').toLowerCase();
    if (mime.startsWith('audio/') || mime.startsWith('video/')) return true;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const audioVideoExts = [
      'mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'wma',
      'mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp', 'mpeg', 'mpg'
    ];
    return audioVideoExts.includes(ext);
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'shared_by_company' | 'shared_by_client'
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const validFiles: File[] = [];
    let hasMediaError = false;

    fileList.forEach((file: File) => {
      if (isAudioOrVideoFile(file)) {
        hasMediaError = true;
      } else {
        validFiles.push(file);
      }
    });

    if (hasMediaError) {
      toast.error('Invalid file format. Audio and video files are not supported. Please upload documents or images (such as PDF, DOCX, XLSX, JPG, or PNG).');
    }

    if (validFiles.length === 0) {
      e.target.value = '';
      return;
    }

    validFiles.forEach((file: File) => {
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
        file,
        uploadedBy: type === 'shared_by_company' ? 'Company Staff' : 'Client',
        uploadedAt: new Date().toISOString().split('T')[0],
        type,
      };

      // Also read data URL for preview/fallback
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result as string;
        newDoc.dataUrl = base64Data;
        newDoc.url = base64Data || '#';
        setDocuments((prev) => [...prev]);
      };
      reader.readAsDataURL(file);

      setDocuments((prev) => [...prev, newDoc]);
    });
    toast.success(`Uploaded ${validFiles.length} document(s)`);
    e.target.value = '';
  };

  const handleRemoveDoc = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const handlePreviewDoc = (doc: DocumentItem) => {
    if (doc.file instanceof File) {
      const blobUrl = URL.createObjectURL(doc.file);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    const raw = doc.dataUrl || doc.url;
    if (!raw || raw === '#') return;

    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      window.open(raw, '_blank', 'noopener,noreferrer');
      return;
    }

    if (raw.startsWith('data:')) {
      try {
        const parts = raw.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
        const byteString = atob(parts[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
        return;
      } catch (err) {
        console.warn('Failed to convert base64 to Blob URL:', err);
      }
    }

    window.open(raw, '_blank', 'noopener,noreferrer');
  };

  // Inactive products cannot be chosen (the one already saved on the record stays visible when editing).
  const productOptions = products
    .filter((p) => String(p.status ?? "Active").toLowerCase() !== "inactive" || p.name === selectedProductId)
    .map((p) => ({
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
    // Sub-Organization and Branch are optional
    // Product selection is optional
    if (!data.country) customErrors.country = 'Country is required';
    if (!data.state && locationMeta.stateRequired) customErrors.state = 'State is required';
    if (!data.district && locationMeta.districtRequired) customErrors.district = 'District is required';
    if (!data.city && (locationMeta.cityRequired ?? true)) customErrors.city = 'City is required';
    if (!data.pincode) customErrors.pincode = 'Pincode is required';
    else {
      const pinError = pincodeMatching(locationMeta.pincodeRegex, locationMeta.pincodeFormat)(data.pincode);
      if (pinError) customErrors.pincode = pinError;
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

      const effectivePhone = data.phone?.trim() || undefined;
      const effectiveEmail = data.email?.trim() || undefined;

      const payload: Partial<Customer> = {
        clientId: data.clientId,
        name: data.clientName,
        company: data.businessName,
        contactPerson: data.contactPerson,
        phone: effectivePhone || '',
        whatsapp: data.whatsapp || undefined,
        email: effectiveEmail || '',
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

      // Helper to upload document to S3 via /media/upload or fallback to /uploads/base64
      const uploadDocumentToS3 = async (doc: DocumentItem): Promise<{ url: string; name: string }> => {
        const docName = doc.title || doc.name || 'document.pdf';
        const rawData = doc.dataUrl || doc.url || '';

        // If it's already an http/https S3 URL or external URL, keep as is
        if (rawData.startsWith('http://') || rawData.startsWith('https://')) {
          return { url: rawData, name: docName };
        }

        // 1. Primary: Use /media/upload (multipart/form-data) supporting all document formats (PDF, DOC, DOCX, XLS, XLSX, etc.)
        if (doc.file instanceof File) {
          try {
            const formData = new FormData();
            formData.append('file', doc.file);
            formData.append('folder', 'documents');
            if (doc.category) formData.append('category', doc.category);
            formData.append('shareType', doc.type || 'shared_by_company');

            const mediaRes = await baseClient.post('/media/upload', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });

            const returnedMediaUrl =
              mediaRes.data?.data?.url ||
              (typeof mediaRes.data?.data === 'string' ? mediaRes.data.data : null) ||
              mediaRes.data?.url;

            if (returnedMediaUrl && typeof returnedMediaUrl === 'string') {
              return { url: returnedMediaUrl, name: docName };
            }
          } catch (mediaErr) {
            console.warn('/media/upload failed, trying fallback...', mediaErr);
          }
        }

        // 2. Fallback for image data URLs: /uploads/base64 with folder 'attachments'
        if (rawData.startsWith('data:image/')) {
          try {
            const uploadRes = await baseClient.post('/uploads/base64', {
              image: rawData,
              folder: 'attachments',
              fileName: `doc_${Date.now()}_${docName.replace(/\s+/g, '_')}`,
            });
            const returnedUrl =
              (typeof uploadRes.data?.data === 'string' ? uploadRes.data.data : null) ||
              uploadRes.data?.data?.url ||
              uploadRes.data?.data?.fileUrl ||
              uploadRes.data?.data?.imageUrl ||
              uploadRes.data?.data?.location ||
              uploadRes.data?.data?.path ||
              (typeof uploadRes.data === 'string' ? uploadRes.data : null) ||
              uploadRes.data?.url ||
              uploadRes.data?.fileUrl ||
              uploadRes.data?.imageUrl ||
              uploadRes.data?.location;

            if (returnedUrl && typeof returnedUrl === 'string') {
              return { url: returnedUrl, name: docName };
            }
          } catch (uploadErr) {
            console.warn('Failed to upload document via base64, using raw URL:', uploadErr);
          }
        }

        return { url: rawData, name: docName };
      };

      // Upload and map ourDocuments and clientDocuments
      const ourDocumentsPayload = await Promise.all(ourDocuments.map(uploadDocumentToS3));
      const clientDocumentsPayload = await Promise.all(clientDocuments.map(uploadDocumentToS3));

      if (isEditing) {
        await platformClientApi.updateClient(initialCustomer.id, {
          name: data.clientName || data.businessName,
          legalName: data.businessName || data.clientName,
          contactPerson: data.contactPerson || data.clientName,
          phone: effectivePhone,
          whatsapp: data.whatsapp || undefined,
          email: effectiveEmail,
          address: data.address,
          city: data.city || undefined,
          countryId: data.countryId || undefined,
          stateId: data.stateId || undefined,
          districtId: data.districtId || undefined,
          pincode: data.pincode || undefined,
          gstNumber: data.gstNumber,
          panNumber: data.panNumber,
          registrationType: 'Pvt Ltd',
          organizationType: 1,
          status: 'Active',
          subOrganizationSupport: true,
          ourDocuments: ourDocumentsPayload,
          clientDocuments: clientDocumentsPayload,
          organizationId: effectiveOrgId,
          subOrganizationId: (selectedSubOrgId && selectedSubOrgId !== '__PARENT_ORG__') ? selectedSubOrgId : undefined,
          branchId: selectedBranchId || undefined,
          productId: resolvedProdId,
        });
        toast.success('Client updated successfully');
      } else {
        await platformClientApi.createClient({
          name: data.clientName || data.businessName,
          legalName: data.businessName || `${data.clientName} Private Limited`,
          contactPerson: data.contactPerson || data.clientName,
          phone: effectivePhone,
          whatsapp: data.whatsapp || undefined,
          email: effectiveEmail,
          password: 'Password@123',
          gstNumber: data.gstNumber,
          panNumber: data.panNumber,
          address: data.address,
          city: data.city || undefined,
          countryId: data.countryId || undefined,
          stateId: data.stateId || undefined,
          districtId: data.districtId || undefined,
          pincode: data.pincode || undefined,
          ourDocuments: ourDocumentsPayload,
          clientDocuments: clientDocumentsPayload,
          organizationId: effectiveOrgId,
          subOrganizationId: (selectedSubOrgId && selectedSubOrgId !== '__PARENT_ORG__') ? selectedSubOrgId : undefined,
          branchId: selectedBranchId || undefined,
          productId: resolvedProdId,
          registrationType: 'Pvt Ltd',
          organizationType: 1,
          status: 'Active',
          subOrganizationSupport: true,
          leadId: (initialCustomer as any)?.sourceLeadId || undefined,
        });
        toast.success('Client profile created successfully');
      }

      // Invalidate RTK Query cache so client lists immediately reflect the saved changes
      store.dispatch(
        baseApi.util.invalidateTags([
          { type: 'PlatformClient', id: 'LIST' },
          ...(initialCustomer?.id ? [{ type: 'PlatformClient' as const, id: initialCustomer.id }] : []),
        ])
      );
      if (onCustomerSaved) onCustomerSaved();

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
      title={isEditing ? 'Edit Client Profile' : 'Create Client Profile'}
      subtitle={
        <span className="text-white/80 text-xs font-normal">
          {isEditing
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
        {/* Customer Details: 3 fields per row throughout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Sub-Organization */}
          <div>
            <label className={labelClass}>
              Sub-Organization
            </label>
            {lockSubOrg || initialCustomer ? (
              <input
                type="text"
                readOnly
                disabled
                value={(() => {
                  const matchedSub =
                    subOrganizations.find(
                      (s) =>
                        s.id === selectedSubOrgId ||
                        s.id === (initialCustomer as any)?.subOrganizationId ||
                        s.id === (initialCustomer as any)?.sub_organization_id
                    ) ||
                    (() => {
                      const bId = selectedBranchId || (initialCustomer as any)?.branchId || (initialCustomer as any)?.branch_id;
                      const br = branches.find((b) => b.id === bId);
                      return br?.subOrganizationId ? subOrganizations.find((s) => s.id === br.subOrganizationId) : null;
                    })();

                  if (matchedSub?.name) {
                    return `${matchedSub.name}${matchedSub.code ? ` (${matchedSub.code})` : ''}`;
                  }

                  const explicitName =
                    initialCustomer?.subOrganizationName ||
                    (initialCustomer as any)?.sub_organization_name ||
                    (initialCustomer as any)?.subOrganization?.name;
                  if (explicitName) return explicitName;

                  if (
                    selectedSubOrgId === '__PARENT_ORG__' ||
                    (!selectedSubOrgId && initialCustomer && !(initialCustomer as any).subOrganizationId && !(initialCustomer as any).sub_organization_id)
                  ) {
                    return selectedOrgName ? `${selectedOrgName} (Main Organization)` : 'Main Organization';
                  }

                  return loadingSubOrgs ? 'Loading...' : (selectedOrgName ? `${selectedOrgName} (Main Organization)` : 'Main Organization');
                })()}
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
                    if (val === '__PARENT_ORG__') {
                      setSelectedSubOrgName(selectedOrgName);
                    } else {
                      const matched = subOrganizations.find((s) => s.id === val);
                      if (matched) setSelectedSubOrgName(matched.name);
                    }
                    setSelectedBranchId('');
                    if (formErrors.subOrganization) setFormErrors((prev) => ({ ...prev, subOrganization: '' }));
                  }}
                  options={(() => {
                    const parentOrgLabel = selectedOrgName ? `${selectedOrgName} (Main Organization)` : 'Main Organization';
                    const list: { value: string; label: string }[] = [];
                    if (selectedOrgId) {
                      list.push({ value: '__PARENT_ORG__', label: parentOrgLabel });
                    }
                    if (subOrganizations.length > 0) {
                      subOrganizations.forEach((s) => {
                        list.push({
                          value: s.id,
                          label: s.code ? `${s.name} (${s.code})` : s.name,
                        });
                      });
                    }
                    if (list.length === 0) {
                      return [{ value: '', label: loadingSubOrgs ? 'Loading Sub-Organizations...' : 'No Sub-Organizations' }];
                    }
                    return list;
                  })()}
                  optionVariant="strong"
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
              Branch
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
                (() => {
                  if (!selectedSubOrgId) return [];
                  const existingName =
                    initialCustomer?.branchName ||
                    (initialCustomer as any)?.branch?.name ||
                    (initialCustomer as any)?.branch_name;
                  const combined = [
                    ...branches,
                    ...(selectedBranchId && !branches.some((x) => x.id === selectedBranchId)
                      ? [{ id: selectedBranchId, name: existingName || 'Current Branch', location: '' } as any]
                      : []),
                  ];
                  return combined.map((b) => ({
                    value: b.id,
                    label: `${b.name}${(b as any).code ? ` (${(b as any).code})` : ''}`,
                  }));
                })()
              }
              optionVariant="strong"
              placeholder={
                !selectedSubOrgId
                  ? 'Select Sub-Organization first'
                  : loadingBranches
                  ? 'Loading branches...'
                  : branches.length === 0
                  ? 'No branches in this sub-organization'
                  : 'Select Branch'
              }
            />
            )}
            {formErrors.branch && (
              <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.branch}</p>
            )}
          </div>

          {/* Client Code */}
          <div>
            <label className={labelClass}>Client Code</label>
            <input
              {...register('clientId')}
              type="text"
              readOnly
              placeholder="Auto-generated"
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-[13px] font-semibold text-slate-600 outline-none cursor-not-allowed"
            />
          </div>

          {/* Row 2 */}
          <RegisteredField
            label="Client Name"
            required
            registration={register("clientName")}
            transform={lettersOnly}
            error={errors.clientName?.message}
            placeholder="e.g. John Doe"
          />

          <RegisteredField
            label="Client Business"
            required
            registration={register("businessName")}
            error={errors.businessName?.message}
            placeholder="Company / Business Name"
          />

          <RegisteredField
            label="Contact Person"
            required
            registration={register("contactPerson")}
            transform={lettersOnly}
            error={errors.contactPerson?.message}
            placeholder="Contact Person Full Name"
          />

          {/* Row 3 */}
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <PhoneField
                label="Phone Number"
                value={field.value || ''}
                onChange={field.onChange}
                error={errors.phone?.message}
                placeholder="e.g. 9876543210"
              />
            )}
          />

          <Controller
            name="whatsapp"
            control={control}
            render={({ field }) => (
              <PhoneField
                label="WhatsApp Number"
                value={field.value || ''}
                onChange={field.onChange}
                error={errors.whatsapp?.message}
                placeholder="e.g. 9876543210"
              />
            )}
          />

          <RegisteredField
            label="Email"
            type="email"
            registration={register("email")}
            error={errors.email?.message}
            placeholder="client@company.com"
          />

          {/* Row 4 */}
          <div>
            <label className={labelClass}>
              GST Number
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
                    const clean = alphanumericUpper(e.target.value, 15);
                    field.onChange(clean);
                    showLiveError('gstNumber', liveGstError(clean));
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
              PAN Number
            </label>
            <Controller
              name="panNumber"
              control={control}
              render={({ field }) => (
                <input
                  type="text"
                  maxLength={10}
                  placeholder="e.g. AAAAA0000A"
                  value={field.value || ''}
                  onChange={(e) => {
                    const clean = alphanumericUpper(e.target.value, 10);
                    field.onChange(clean);
                    showLiveError('panNumber', livePanError(clean));
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

          <div>
            <label className={labelClass}>
              Product Selection
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

          {/* Row 5 onwards: Location fields (Country, State, District, City, Pincode, Address) */}
          <LocationFields
            country={watch('country') || ''}
            state={watch('state') || ''}
            district={watch('district') || ''}
            city={watch('city') || ''}
            errors={{ country: formErrors.country, state: formErrors.state, district: formErrors.district, city: formErrors.city }}
            onMeta={setLocationMeta}
            onChange={(patch) => {
              (Object.keys(patch) as (keyof typeof patch)[]).forEach((k) => setValue(k as any, patch[k] ?? ''));
              setFormErrors((prev) => ({ ...prev, ...Object.fromEntries(Object.keys(patch).map((k) => [k, ''])) }));
            }}
          />

          <RegisteredField
            label="Pincode"
            required
            inputMode="numeric"
            registration={register("pincode")}
            transform={(v: string) => cleanPincode(v, locationMeta.pincodeRegex)}
            error={errors.pincode?.message || formErrors.pincode}
            placeholder="e.g. 600001"
          />

          <div className="md:col-span-3">
            <label className={labelClass}>
              Address <span className="text-rose-500 font-bold">*</span>
            </label>
            <textarea
              rows={3}
              {...register("address")}
              placeholder="Street Address"
              className={`w-full min-h-[88px] px-4 py-3 bg-white rounded-[4px] text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all resize-y ${
                errors.address
                  ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                  : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
              }`}
            />
            {errors.address && (
              <p className="text-[11px] font-medium text-red-500 mt-1">{errors.address.message}</p>
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
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.odt,.ods,.jpg,.jpeg,.png,.webp,.gif,.svg,.zip,.rar"
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
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.odt,.ods,.jpg,.jpeg,.png,.webp,.gif,.svg,.zip,.rar"
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
                        <button
                          type="button"
                          onClick={() => handlePreviewDoc(doc)}
                          className="text-slate-400 hover:text-[#4309A2] hover:bg-purple-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="View Document"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveDoc(doc.id)}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
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
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.odt,.ods,.jpg,.jpeg,.png,.webp,.gif,.svg,.zip,.rar"
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
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.odt,.ods,.jpg,.jpeg,.png,.webp,.gif,.svg,.zip,.rar"
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
                        <button
                          type="button"
                          onClick={() => handlePreviewDoc(doc)}
                          className="text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="View Document"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveDoc(doc.id)}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
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
            {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
