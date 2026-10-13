import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CustomerSchema, CustomerFormData } from '../../schemas';
import { Customer, DocumentItem } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { CustomSelect } from '../common/CustomSelect';
import { api } from '../../services/api';
import { customerApi } from '../../api/commerce/customerApi';
import { clientProductApi, ClientProductApiItem } from '../../api';
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

  // Products from API
  const [products, setProducts] = useState<ClientProductApiItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  // Documents: shared_by_company (our documents) & shared_by_client (client documents)
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  const generateClientId = () => `CLI-${Math.floor(1000 + Math.random() * 9000)}`;

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

      if (initialCustomer) {
        try {
          await customerApi.updateCustomer(initialCustomer.id, {
            name: data.clientName,
            company: data.businessName,
            phone: data.phone,
            email: data.email,
            address: data.address,
            gstin: data.gstNumber,
            pan: data.panNumber,
          } as any);
        } catch {
          await api.updateCustomer(initialCustomer.id, payload as any);
        }
        toast.success('Client updated successfully');
      } else {
        try {
          await customerApi.createCustomer({
            name: data.clientName,
            company: data.businessName,
            phone: data.phone,
            email: data.email,
            customerType: 'Business',
            address: data.address,
            country: 'India',
            status: 'Active',
            gstin: data.gstNumber,
            pan: data.panNumber,
          } as any);
        } catch {
          await api.createCustomer(payload as any);
        }
        toast.success('Client profile created successfully');
      }

      dispatch(
        baseApi.util.invalidateTags([
          { type: 'Customer', id: 'LIST' },
          'Dashboard',
        ])
      );
      onClose();
    } catch (e: any) {
      toast.error('Operation failed', { description: e.message });
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
        {/* Row 1: Client ID | Client Name | Client Business */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>
              Client ID <span className="text-slate-500">*</span>
            </label>
            <input
              {...register('clientId')}
              type="text"
              className={`w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                errors.clientId
                  ? 'border-rose-400 focus:ring-4 focus:ring-rose-500/10'
                  : 'border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
              }`}
            />
            {errors.clientId && (
              <p className="text-xs text-rose-500 mt-1 font-medium">{errors.clientId.message}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>
              Client Name <span className="text-slate-500">*</span>
            </label>
            <input
              {...register('clientName')}
              type="text"
              placeholder="e.g. John Doe"
              className={`w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                errors.clientName
                  ? 'border-rose-400 focus:ring-4 focus:ring-rose-500/10'
                  : 'border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
              }`}
            />
            {errors.clientName && (
              <p className="text-xs text-rose-500 mt-1 font-medium">{errors.clientName.message}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>
              Client Business <span className="text-slate-500">*</span>
            </label>
            <input
              {...register('businessName')}
              type="text"
              placeholder="Company / Business Name"
              className={`w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                errors.businessName
                  ? 'border-rose-400 focus:ring-4 focus:ring-rose-500/10'
                  : 'border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
              }`}
            />
            {errors.businessName && (
              <p className="text-xs text-rose-500 mt-1 font-medium">{errors.businessName.message}</p>
            )}
          </div>
        </div>

        {/* Row 2: Contact Person | Phone Number | WhatsApp Number */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>
              Contact Person <span className="text-slate-500">*</span>
            </label>
            <input
              {...register('contactPerson')}
              type="text"
              placeholder="Contact Person Full Name"
              className={`w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                errors.contactPerson
                  ? 'border-rose-400 focus:ring-4 focus:ring-rose-500/10'
                  : 'border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
              }`}
            />
            {errors.contactPerson && (
              <p className="text-xs text-rose-500 mt-1 font-medium">{errors.contactPerson.message}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>
              Phone Number <span className="text-slate-500">*</span>
            </label>
            <input
              {...register('phone')}
              type="text"
              placeholder="e.g. +91 98765 43210"
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

          <div>
            <label className={labelClass}>WhatsApp Number</label>
            <input
              {...register('whatsapp')}
              type="text"
              placeholder="e.g. +91 98765 43210"
              className={inputClass}
            />
          </div>
        </div>

        {/* Row 3: Email | GST Number | PAN Number */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>
              Email <span className="text-slate-500">*</span>
            </label>
            <input
              {...register('email')}
              type="email"
              placeholder="client@company.com"
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
            <label className={labelClass}>GST Number</label>
            <input
              {...register('gstNumber')}
              type="text"
              placeholder="e.g. 33AAAAA0000A1Z5"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>PAN Number</label>
            <input
              {...register('panNumber')}
              type="text"
              placeholder="e.g. ABCDE1234F"
              className={inputClass}
            />
          </div>
        </div>

        {/* Row 4: Address (2 columns) | Product Selection (1 column) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className={labelClass}>
              Address <span className="text-slate-500">*</span>
            </label>
            <input
              {...register('address')}
              type="text"
              placeholder="Street Address, City, State, Pincode"
              className={`w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                errors.address
                  ? 'border-rose-400 focus:ring-4 focus:ring-rose-500/10'
                  : 'border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
              }`}
            />
            {errors.address && (
              <p className="text-xs text-rose-500 mt-1 font-medium">{errors.address.message}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>Product Selection</label>
            <CustomSelect
              value={selectedProductId}
              onChange={(val) => setSelectedProductId(val)}
              options={
                productOptions.length > 0
                  ? productOptions
                  : [{ value: '', label: loadingProducts ? 'Loading products...' : 'No products found' }]
              }
              placeholder={loadingProducts ? 'Loading products...' : 'Select Product'}
            />
          </div>
        </div>

        {/* Row 5: Document Uploads (Two Columns: Our Documents & Client Documents) */}
        <div className="pt-2 border-t border-slate-100">
          <label className="text-xs sm:text-[13px] font-bold text-slate-700 block mb-3">
            Document Uploads
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Column A: Our Documents (Shared to Client) */}
            <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800">Our Documents</h4>
                  <p className="text-[11px] text-slate-400">Contracts, agreements, and proposals shared to client</p>
                </div>
                <label className="inline-flex items-center gap-1.5 h-8 px-3 bg-[#33077C] hover:bg-[#432eb5] text-white font-bold text-xs rounded-lg transition-all cursor-pointer shadow-2xs">
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
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {ourDocuments.length === 0 ? (
                  <div className="text-center py-5 border border-dashed border-slate-200 rounded-xl bg-white text-slate-400">
                    <FileText className="w-5 h-5 mx-auto mb-1 text-slate-300" />
                    <p className="text-xs font-medium">No company documents attached</p>
                  </div>
                ) : (
                  ourDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-2.5 bg-white rounded-xl border border-slate-200/90 flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-purple-50 text-[#33077C] flex items-center justify-center shrink-0 font-bold text-xs">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate" title={doc.title}>
                            {doc.title}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {doc.category || 'Agreement'} &bull; {doc.fileSize || 'PDF'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDoc(doc.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                        title="Remove Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column B: Client Documents (Received from Client) */}
            <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800">Client Documents</h4>
                  <p className="text-[11px] text-slate-400">GST certificate, PAN card, cheques, and proof files</p>
                </div>
                <label className="inline-flex items-center gap-1.5 h-8 px-3 bg-[#33077C] hover:bg-[#432eb5] text-white font-bold text-xs rounded-lg transition-all cursor-pointer shadow-2xs">
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
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {clientDocuments.length === 0 ? (
                  <div className="text-center py-5 border border-dashed border-slate-200 rounded-xl bg-white text-slate-400">
                    <FileCheck className="w-5 h-5 mx-auto mb-1 text-slate-300" />
                    <p className="text-xs font-medium">No client documents attached</p>
                  </div>
                ) : (
                  clientDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-2.5 bg-white rounded-xl border border-slate-200/90 flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 font-bold text-xs">
                          <FileCheck className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate" title={doc.title}>
                            {doc.title}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {doc.category || 'Tax/Proof'} &bull; {doc.fileSize || 'PDF'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDoc(doc.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                        title="Remove Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
