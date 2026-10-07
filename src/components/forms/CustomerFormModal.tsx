import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CustomerSchema, CustomerFormData } from '../../schemas';
import { Customer, DocumentItem } from '../../types';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../hooks/useQueries';
import { toast } from 'sonner';
import {
  Boxes,
  Check,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Cpu,
  BarChart3,
  Megaphone,
  Layers,
  CheckCircle2,
  FileText,
  Upload,
  Trash2,
  Paperclip,
  Plus,
  FileCheck,
  FolderUp,
  FolderDown,
  Download
} from 'lucide-react';
import {
  YaaConnectConfigForm,
  YAA_CONNECT_STEPS,
  DocMotezConfigForm,
  DOCMOTEZ_STEPS,
  TurfyLockConfigForm,
  TURFYLOCK_STEPS,
  AarudamAIConfigForm,
  AARUDAM_STEPS,
  DigitalMarketingConfigForm,
  DIGITAL_MARKETING_STEPS
} from './ProductConfigForms';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCustomer?: Customer | null;
}

interface ProductSelection {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: any;
  defaultPlan: string;
  price: number;
}

const AVAILABLE_PRODUCTS: ProductSelection[] = [
  {
    id: 'prod_1',
    name: 'Yaa connect',
    category: 'Communication & HR',
    description: 'Real-time workforce management, attendance tracking, and customer communication hub.',
    icon: Boxes,
    defaultPlan: 'Yaa Silver',
    price: 1749,
  },
  {
    id: 'prod_2',
    name: 'Doc motez',
    category: 'Healthcare Suite',
    description: 'Clinical practice management, patient EHR records, and doctor telehealth scheduling.',
    icon: ShieldCheck,
    defaultPlan: 'Yaa Diamond',
    price: 3599,
  },
  {
    id: 'prod_3',
    name: 'Doc DentQ',
    category: 'Dental Specialty',
    description: 'Specialized dental practice management, tooth charting, and appointment recall.',
    icon: Layers,
    defaultPlan: 'Dental Standard',
    price: 349,
  },
  {
    id: 'prod_4',
    name: 'Aarudam AI',
    category: 'AI Intelligence',
    description: 'Next-gen autonomous astrology and agent intelligence NLP platform.',
    icon: Cpu,
    defaultPlan: 'Autonomous Enterprise',
    price: 699,
  },
  {
    id: 'prod_5',
    name: 'Turfylock',
    category: 'Sports & Venues',
    description: 'Sports facility booking, real-time slot scheduling, and arena lighting relay.',
    icon: BarChart3,
    defaultPlan: 'Multi-Sport Complex',
    price: 299,
  },
  {
    id: 'prod_6',
    name: 'Digital Marketing',
    category: 'Growth & Marketing',
    description: 'Full-service SEO optimization, paid ad campaigns, and social media retainers.',
    icon: Megaphone,
    defaultPlan: 'Growth Accelerator',
    price: 1299,
  },
];

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  initialCustomer,
}) => {
  const queryClient = useQueryClient();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(['prod_1']);
  const [activeProductTab, setActiveProductTab] = useState<string>('prod_1');
  const [subStep, setSubStep] = useState<number>(1);
  const [productConfigs, setProductConfigs] = useState<Record<string, any>>({});

  const generateClientId = () => {
    return `CLI-${Math.floor(1000 + Math.random() * 9000)}`;
  };

  const {
    register,
    handleSubmit,
    trigger,
    reset,
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
      alternatePhone: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
    },
  });

  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  React.useEffect(() => {
    if (initialCustomer) {
      setStep(1);
      setSubStep(1);
      reset({
        clientId: initialCustomer.clientId || initialCustomer.id || generateClientId(),
        clientName: initialCustomer.clientName || initialCustomer.name || '',
        businessName: initialCustomer.businessName || initialCustomer.company || '',
        contactPerson: initialCustomer.contactPerson || initialCustomer.name || '',
        phone: initialCustomer.phone || '',
        whatsapp: initialCustomer.whatsapp || '',
        email: initialCustomer.email || '',
        alternatePhone: initialCustomer.alternatePhone || '',
        address: initialCustomer.address || '',
        city: initialCustomer.city || '',
        state: initialCustomer.state || '',
        pincode: initialCustomer.pincode || '',
      });

      if (initialCustomer.linkedProducts && initialCustomer.linkedProducts.length > 0) {
        const productIds = initialCustomer.linkedProducts.map((p) => p.productId);
        if (initialCustomer.usesDigitalMarketing && !productIds.includes('prod_6')) productIds.push('prod_6');
        setSelectedProductIds(productIds);
        setActiveProductTab(productIds[0] || 'prod_1');
      }

      if (initialCustomer.documents && initialCustomer.documents.length > 0) {
        setDocuments(initialCustomer.documents);
      } else {
        setDocuments([
          { id: 'doc_init_1', title: 'Master Service Agreement (MSA)', category: 'Agreement', fileType: 'PDF', fileSize: '2.4 MB', url: '#', uploadedBy: 'Company Staff', uploadedAt: new Date().toISOString().split('T')[0], type: 'shared_by_company' },
          { id: 'doc_init_2', title: 'Corporate GST Certificate', category: 'Tax/GST', fileType: 'PDF', fileSize: '850 KB', url: '#', uploadedBy: 'Client', uploadedAt: new Date().toISOString().split('T')[0], type: 'shared_by_client' }
        ]);
      }
    } else {
      setStep(1);
      setSubStep(1);
      reset({
        clientId: generateClientId(),
        clientName: '',
        businessName: '',
        contactPerson: '',
        phone: '',
        whatsapp: '',
        email: '',
        alternatePhone: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
      });
      setSelectedProductIds(['prod_1']);
      setActiveProductTab('prod_1');
      setProductConfigs({});
      setDocuments([
        { id: 'doc_init_1', title: 'Master Service Agreement (MSA)', category: 'Agreement', fileType: 'PDF', fileSize: '2.4 MB', url: '#', uploadedBy: 'Company Staff', uploadedAt: new Date().toISOString().split('T')[0], type: 'shared_by_company' },
        { id: 'doc_init_2', title: 'Corporate GST Certificate', category: 'Tax/GST', fileType: 'PDF', fileSize: '850 KB', url: '#', uploadedBy: 'Client', uploadedAt: new Date().toISOString().split('T')[0], type: 'shared_by_client' }
      ]);
    }
  }, [initialCustomer, reset, isOpen]);

  const getSubStepsForProduct = (pId: string): string[] => {
    switch (pId) {
      case 'prod_1':
        return YAA_CONNECT_STEPS;
      case 'prod_2':
      case 'prod_3':
        return DOCMOTEZ_STEPS;
      case 'prod_5':
        return TURFYLOCK_STEPS;
      case 'prod_4':
        return AARUDAM_STEPS;
      case 'prod_6':
        return DIGITAL_MARKETING_STEPS;
      default:
        return ['Configuration Details'];
    }
  };

  const currentSubSteps = getSubStepsForProduct(activeProductTab);
  const maxSubSteps = currentSubSteps.length;

  const handleStep1Next = async () => {
    const isValid = await trigger();
    if (isValid) {
      setStep(2);
    }
  };

  const handleStep2Next = () => {
    if (selectedProductIds.length > 0) {
      if (!selectedProductIds.includes(activeProductTab)) {
        setActiveProductTab(selectedProductIds[0]);
      }
      setSubStep(1);
      setStep(3);
    } else {
      setStep(4);
    }
  };

  const handleStep3Next = () => {
    if (subStep < maxSubSteps) {
      setSubStep((prev) => prev + 1);
    } else {
      // Check if there is another product selected after this one
      const currentIndex = selectedProductIds.indexOf(activeProductTab);
      if (currentIndex >= 0 && currentIndex < selectedProductIds.length - 1) {
        const nextProductId = selectedProductIds[currentIndex + 1];
        setActiveProductTab(nextProductId);
        setSubStep(1);
      } else {
        // All sub-steps of all selected products completed -> Proceed to Step 4: Documents Exchange!
        setStep(4);
      }
    }
  };

  const handleStep3Back = () => {
    if (subStep > 1) {
      setSubStep((prev) => prev - 1);
    } else {
      // Check if there was a previous product tab
      const currentIndex = selectedProductIds.indexOf(activeProductTab);
      if (currentIndex > 0) {
        const prevProductId = selectedProductIds[currentIndex - 1];
        setActiveProductTab(prevProductId);
        const prevSteps = getSubStepsForProduct(prevProductId);
        setSubStep(prevSteps.length);
      } else {
        setStep(2);
      }
    }
  };

  const handleStep4Back = () => {
    if (selectedProductIds.length > 0) {
      const lastProduct = selectedProductIds[selectedProductIds.length - 1];
      setActiveProductTab(lastProduct);
      const lastSteps = getSubStepsForProduct(lastProduct);
      setSubStep(lastSteps.length);
      setStep(3);
    } else {
      setStep(2);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'shared_by_company' | 'shared_by_client') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const sizeStr = Number(sizeMB) < 1 ? `${Math.round(file.size / 1024)} KB` : `${sizeMB} MB`;
      const newDoc: DocumentItem = {
        id: 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        title: file.name,
        category: 'Agreement',
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

  const toggleProduct = (productId: string) => {
    setSelectedProductIds((prev) => {
      const next = prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId];
      if (next.length > 0 && !next.includes(activeProductTab)) {
        setActiveProductTab(next[0]);
      }
      return next;
    });
  };

  const handleConfigChange = (productId: string, fieldKey: string, val: any) => {
    setProductConfigs((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        [fieldKey]: val,
      },
    }));
  };

  const onSubmit = async (data: CustomerFormData) => {
    try {
      const linkedProducts: Customer['linkedProducts'] = selectedProductIds
        .filter((id) => id !== 'prod_6')
        .map((id) => {
          const item = AVAILABLE_PRODUCTS.find((p) => p.id === id);
          const config = productConfigs[id] || {};
          return {
            productId: id,
            productName: item?.name || 'Enterprise Service',
            planName: config.selectedPlan || item?.defaultPlan || 'Standard Tier',
            amount: item?.price || 499,
            since: config.startDate || new Date().toISOString().split('T')[0],
            status: 'Active' as const,
          };
        });

      const usesDigitalMarketing = selectedProductIds.includes('prod_6');

      const payload: Partial<Customer> = {
        ...data,
        name: data.clientName,
        company: data.businessName,
        location: [data.city, data.state].filter(Boolean).join(', '),
        linkedProducts,
        usesDigitalMarketing,
        documents,
        notes: JSON.stringify(productConfigs),
      };

      if (initialCustomer) {
        await api.updateCustomer(initialCustomer.id, payload);
        toast.success('Client updated successfully');
      } else {
        await api.createCustomer(payload);
        toast.success('Client registered with complete configuration');
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customers });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboardStats });
      onClose();
    } catch (e: any) {
      toast.error('Operation failed', { description: e.message });
    }
  };

  const activeProduct = AVAILABLE_PRODUCTS.find((p) => p.id === activeProductTab);
  const isLastProduct = selectedProductIds.indexOf(activeProductTab) === selectedProductIds.length - 1;
  const isFinalStep = subStep === maxSubSteps && isLastProduct;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        step === 1
          ? initialCustomer
            ? 'Edit Client'
            : 'Add New Client'
          : step === 2
            ? 'Select Subscribed Products & Offerings'
            : step === 3
              ? currentSubSteps[subStep - 1] || 'Product Details'
              : step === 4
                ? 'Documents Shared to Client'
                : 'Documents Received from Client'
      }
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* ========================================================================= */}
        {/* STEP 1: CLIENT CREDENTIALS & ADDRESS DETAILS */}
        {/* ========================================================================= */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Row 1: Client ID & Client Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Client ID <span className="text-slate-500">*</span>
                </label>
                <input
                  {...register('clientId')}
                  type="text"
                  className={`w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${errors.clientId
                    ? 'border-rose-400 focus:ring-4 focus:ring-rose-500/10'
                    : 'border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                    }`}
                />
                {errors.clientId && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{errors.clientId.message}</p>
                )}
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Client Name <span className="text-slate-500">*</span>
                </label>
                <input
                  {...register('clientName')}
                  type="text"
                  className={`w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${errors.clientName
                    ? 'border-rose-400 focus:ring-4 focus:ring-rose-500/10'
                    : 'border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                    }`}
                />
                {errors.clientName && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{errors.clientName.message}</p>
                )}
              </div>
            </div>

            {/* Row 2: Client Business Name & Contact Person Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Client Business Name <span className="text-slate-500">*</span>
                </label>
                <input
                  {...register('businessName')}
                  type="text"
                  className={`w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${errors.businessName
                    ? 'border-rose-400 focus:ring-4 focus:ring-rose-500/10'
                    : 'border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                    }`}
                />
                {errors.businessName && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{errors.businessName.message}</p>
                )}
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Contact Person Name <span className="text-slate-500">*</span>
                </label>
                <input
                  {...register('contactPerson')}
                  type="text"
                  className={`w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${errors.contactPerson
                    ? 'border-rose-400 focus:ring-4 focus:ring-rose-500/10'
                    : 'border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                    }`}
                />
                {errors.contactPerson && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{errors.contactPerson.message}</p>
                )}
              </div>
            </div>

            {/* Row 3: Phone Number & WhatsApp Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Phone Number <span className="text-slate-500">*</span>
                </label>
                <input
                  {...register('phone')}
                  type="text"
                  className={`w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${errors.phone
                    ? 'border-rose-400 focus:ring-4 focus:ring-rose-500/10'
                    : 'border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                    }`}
                />
                {errors.phone && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  WhatsApp Number
                </label>
                <input
                  {...register('whatsapp')}
                  type="text"
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>
            </div>

            {/* Row 4: Email & Alternate Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Email <span className="text-slate-500">*</span>
                </label>
                <input
                  {...register('email')}
                  type="email"
                  className={`w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${errors.email
                    ? 'border-rose-400 focus:ring-4 focus:ring-rose-500/10'
                    : 'border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                    }`}
                />
                {errors.email && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Alternate Phone
                </label>
                <input
                  {...register('alternatePhone')}
                  type="text"
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>
            </div>

            {/* Row 5: Address */}
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Address <span className="text-slate-500">*</span>
              </label>
              <textarea
                {...register('address')}
                rows={2}
                className={`w-full px-4 py-2.5 bg-white border rounded-xl text-xs sm:text-sm font-semibold text-slate-900 outline-none resize-none transition-all ${errors.address
                  ? 'border-rose-400 focus:ring-4 focus:ring-rose-500/10'
                  : 'border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                  }`}
              />
              {errors.address && (
                <p className="text-xs text-rose-500 mt-1 font-medium">{errors.address.message}</p>
              )}
            </div>

            {/* Row 6: City, State, Pincode */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  City <span className="text-slate-500">*</span>
                </label>
                <input
                  {...register('city')}
                  type="text"
                  className={`w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${errors.city
                    ? 'border-rose-400 focus:ring-4 focus:ring-rose-500/10'
                    : 'border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                    }`}
                />
                {errors.city && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{errors.city.message}</p>
                )}
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  State <span className="text-slate-500">*</span>
                </label>
                <input
                  {...register('state')}
                  type="text"
                  className={`w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${errors.state
                    ? 'border-rose-400 focus:ring-4 focus:ring-rose-500/10'
                    : 'border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                    }`}
                />
                {errors.state && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{errors.state.message}</p>
                )}
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Pincode <span className="text-slate-500">*</span>
                </label>
                <input
                  {...register('pincode')}
                  type="text"
                  className={`w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${errors.pincode
                    ? 'border-rose-400 focus:ring-4 focus:ring-rose-500/10'
                    : 'border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                    }`}
                />
                {errors.pincode && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{errors.pincode.message}</p>
                )}
              </div>
            </div>

            {/* Step 1 Footer Action Buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="h-11 px-5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-sm border border-slate-200 transition-colors cursor-pointer flex items-center justify-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStep1Next}
                className="h-11 px-6 bg-[#4309A2] hover:bg-[#e67e00] text-white font-bold rounded-xl text-sm transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: SELECT PRODUCTS WITH CHECKBOXES */}
        {/* ========================================================================= */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Step Progress & Subtitle */}
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                Choose the software products and services to assign to this client account:
              </p>
              <span className="text-[11px] font-bold text-[#33077C] bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200/60 shrink-0">
                {selectedProductIds.length} Selected
              </span>
            </div>

            {/* Product Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {AVAILABLE_PRODUCTS.map((prod) => {
                const isSelected = selectedProductIds.includes(prod.id);
                const IconComponent = prod.icon;

                return (
                  <div
                    key={prod.id}
                    onClick={() => toggleProduct(prod.id)}
                    className={`group relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3.5 select-none ${isSelected
                      ? 'bg-gradient-to-r from-orange-50/60 via-white to-orange-50/30 border-[#4309A2] shadow-xs ring-2 ring-[#4309A2]/15'
                      : 'bg-white hover:bg-slate-50/80 border-slate-200 hover:border-slate-300 shadow-2xs'
                      }`}
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Product Brand Icon Badge */}
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shrink-0 ${prod.id === 'prod_1'
                          ? 'bg-blue-50 text-blue-600 border border-blue-200/80'
                          : prod.id === 'prod_2'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/80'
                            : prod.id === 'prod_3'
                              ? 'bg-cyan-50 text-cyan-600 border border-cyan-200/80'
                              : prod.id === 'prod_4'
                                ? 'bg-purple-50 text-purple-600 border border-purple-200/80'
                                : prod.id === 'prod_5'
                                  ? 'bg-amber-50 text-amber-600 border border-amber-200/80'
                                  : 'bg-rose-50 text-rose-600 border border-rose-200/80'
                          }`}
                      >
                        <IconComponent className="w-5 h-5" />
                      </div>

                      {/* Product Name & Category */}
                      <div>
                        <span
                          className={`text-sm block tracking-tight transition-colors ${isSelected ? 'font-bold text-[#33077C]' : 'font-semibold text-slate-800'
                            }`}
                        >
                          {prod.name}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {prod.category}
                        </span>
                      </div>
                    </div>

                    {/* Animated Checkbox */}
                    <div
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 shrink-0 ${isSelected
                        ? 'bg-[#4309A2] border-[#4309A2] text-white shadow-xs scale-105'
                        : 'bg-white border-slate-300 group-hover:border-slate-400'
                        }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Step 2 Footer Action Buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs sm:text-sm border border-slate-200 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs sm:text-sm border border-slate-200 transition-colors cursor-pointer shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStep2Next}
                  className="px-6 py-2.5 bg-[#4309A2] hover:bg-[#e67e00] text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 cursor-pointer flex items-center gap-1.5"
                >
                  <span>Next</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: PRODUCT-SPECIFIC SUB-STEP CONFIGURATION */}
        {/* ========================================================================= */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Multiple Product Indicator if more than 1 product selected */}
            {selectedProductIds.length > 1 && (
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-500">
                  Product {selectedProductIds.indexOf(activeProductTab) + 1} of {selectedProductIds.length}: <strong className="text-[#33077C]">{activeProduct?.name}</strong>
                </span>
                <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                  Section {subStep} of {maxSubSteps}
                </span>
              </div>
            )}

            {/* Sub-step Form Content matching Step 1 common details */}
            <div className="space-y-4">
              {activeProductTab === 'prod_1' && (
                <YaaConnectConfigForm
                  subStep={subStep}
                  data={productConfigs.prod_1 || {}}
                  onChange={(k, v) => handleConfigChange('prod_1', k, v)}
                />
              )}

              {activeProductTab === 'prod_2' && (
                <DocMotezConfigForm
                  subStep={subStep}
                  data={productConfigs.prod_2 || {}}
                  onChange={(k, v) => handleConfigChange('prod_2', k, v)}
                  isDental={false}
                />
              )}

              {activeProductTab === 'prod_3' && (
                <DocMotezConfigForm
                  subStep={subStep}
                  data={productConfigs.prod_3 || {}}
                  onChange={(k, v) => handleConfigChange('prod_3', k, v)}
                  isDental={true}
                />
              )}

              {activeProductTab === 'prod_4' && (
                <AarudamAIConfigForm
                  subStep={subStep}
                  data={productConfigs.prod_4 || {}}
                  onChange={(k, v) => handleConfigChange('prod_4', k, v)}
                />
              )}

              {activeProductTab === 'prod_5' && (
                <TurfyLockConfigForm
                  subStep={subStep}
                  data={productConfigs.prod_5 || {}}
                  onChange={(k, v) => handleConfigChange('prod_5', k, v)}
                />
              )}

              {activeProductTab === 'prod_6' && (
                <DigitalMarketingConfigForm
                  subStep={subStep}
                  data={productConfigs.prod_6 || {}}
                  onChange={(k, v) => handleConfigChange('prod_6', k, v)}
                />
              )}
            </div>

            {/* Step 3 Footer Action Buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleStep3Back}
                className="h-11 px-5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-sm border border-slate-200 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-11 px-5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-sm border border-slate-200 transition-colors cursor-pointer shadow-2xs flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStep3Next}
                  disabled={isSubmitting}
                  className="h-11 px-6 bg-[#4309A2] hover:bg-[#e67e00] text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>{isFinalStep ? 'Next: Documents' : 'Next'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: DOCUMENTS SHARED TO CLIENT (COMPANY DOCUMENTS - COMPACT CARD VIEW) */}
        {/* ========================================================================= */}
        {step === 4 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Plain Text Header & Top Upload Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-semibold text-slate-800">
                  Documents Shared to Client
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload contracts, service agreements, proposals, and onboarding kits provided to this client.
                </p>
              </div>

              {/* Upload Button - Orange, rounded-[4px], text-sm */}
              <label className="inline-flex items-center justify-center gap-2 h-11 px-5 bg-[#4309A2] hover:bg-[#e67e00] text-white font-bold text-sm rounded-xl shadow-sm hover:shadow-orange-500/20 transition-all cursor-pointer shrink-0 hover:scale-[1.02] active:scale-[0.98]">
                <Upload className="w-4 h-4 text-white" />
                <span>Upload Document</span>
                <input
                  type="file"
                  multiple
                  onChange={(e) => handleFileUpload(e, 'shared_by_company')}
                  className="hidden"
                />
              </label>
            </div>

            {/* Compact Document Cards (Reduced width w-56) */}
            <div className="flex flex-wrap gap-3 min-h-[110px] max-h-[360px] overflow-y-auto pr-0.5 items-start">
              {(() => {
                const companyDocs = documents.filter(
                  (d) => (d.type || 'shared_by_company') === 'shared_by_company'
                );
                if (companyDocs.length === 0) {
                  return (
                    <div className="w-full py-10 text-center text-slate-400 border border-dashed border-slate-200 rounded-[6px] space-y-1.5">
                      <FileText className="w-6 h-6 text-slate-300 mx-auto" />
                      <p className="text-xs font-medium text-slate-600">No company documents uploaded yet</p>
                      <p className="text-[11px] text-slate-400">Click "Upload Document" above to attach PDF or DOCX files</p>
                    </div>
                  );
                }

                return companyDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="w-56 p-2.5 bg-white rounded-[6px] border border-slate-200/90 hover:border-[#4309A2]/50 hover:shadow-2xs transition-all flex flex-col justify-between group min-h-[88px]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-6 h-6 rounded-[4px] bg-orange-50 text-[#4309A2] flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDoc(doc.id)}
                        className="w-5 h-5 rounded-[3px] text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                        title="Remove Document"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="mt-1.5 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate" title={doc.title}>
                        {doc.title}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                        <span className="font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-[3px] text-[9px]">
                          {doc.category || 'Agreement'}
                        </span>
                        <span>&bull;</span>
                        <span>{doc.fileSize || 'PDF'}</span>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Step 4 Footer Action Buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleStep4Back}
                className="h-11 px-5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-sm border border-slate-200 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-11 px-5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-sm border border-slate-200 transition-colors cursor-pointer shadow-2xs flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="h-11 px-6 bg-[#4309A2] hover:bg-[#e67e00] text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Next: Client Documents</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 5: DOCUMENTS RECEIVED FROM CLIENT (CLIENT DOCUMENTS - COMPACT CARD VIEW) */}
        {/* ========================================================================= */}
        {step === 5 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Plain Text Header & Top Upload Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-semibold text-slate-800">
                  Documents Received from Client
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload GST registration certificate, PAN card copy, bank cheques, and business proofs.
                </p>
              </div>

              {/* Upload Button - Orange, rounded-[4px], text-sm */}
              <label className="inline-flex items-center justify-center gap-2 h-11 px-5 bg-[#4309A2] hover:bg-[#e67e00] text-white font-bold text-sm rounded-xl shadow-sm hover:shadow-orange-500/20 transition-all cursor-pointer shrink-0 hover:scale-[1.02] active:scale-[0.98]">
                <Upload className="w-4 h-4 text-white" />
                <span>Upload Document</span>
                <input
                  type="file"
                  multiple
                  onChange={(e) => handleFileUpload(e, 'shared_by_client')}
                  className="hidden"
                />
              </label>
            </div>

            {/* Compact Document Cards (Reduced width w-56) */}
            <div className="flex flex-wrap gap-3 min-h-[110px] max-h-[360px] overflow-y-auto pr-0.5 items-start">
              {(() => {
                const clientDocs = documents.filter((d) => d.type === 'shared_by_client');
                if (clientDocs.length === 0) {
                  return (
                    <div className="w-full py-10 text-center text-slate-400 border border-dashed border-slate-200 rounded-[6px] space-y-1.5">
                      <FileText className="w-6 h-6 text-slate-300 mx-auto" />
                      <p className="text-xs font-medium text-slate-600">No client documents uploaded yet</p>
                      <p className="text-[11px] text-slate-400">Click "Upload Document" above to attach GST, PAN, or cheques</p>
                    </div>
                  );
                }

                return clientDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="w-56 p-2.5 bg-white rounded-[6px] border border-slate-200/90 hover:border-[#4309A2]/50 hover:shadow-2xs transition-all flex flex-col justify-between group min-h-[88px]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-6 h-6 rounded-[4px] bg-orange-50 text-[#4309A2] flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDoc(doc.id)}
                        className="w-5 h-5 rounded-[3px] text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                        title="Remove Document"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="mt-1.5 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate" title={doc.title}>
                        {doc.title}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                        <span className="font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-[3px] text-[9px]">
                          {doc.category || 'Tax/Proof'}
                        </span>
                        <span>&bull;</span>
                        <span>{doc.fileSize || 'PDF'}</span>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Step 5 Footer Action Buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="h-11 px-5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-sm border border-slate-200 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-11 px-5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-sm border border-slate-200 transition-colors cursor-pointer shadow-2xs flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 px-6 bg-[#4309A2] hover:bg-[#e67e00] text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{initialCustomer ? 'Save Client' : 'Add Client'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};
