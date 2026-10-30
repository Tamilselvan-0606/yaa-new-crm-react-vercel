import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PaymentSchema, PaymentFormData } from '../../schemas';
import { PaymentItem } from '../../types';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useCreatePlatformPaymentMutation, clientProductApi } from '../../api';

interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPayment?: PaymentItem | null;
  onSuccess?: () => void;
}

export const PaymentFormModal: React.FC<PaymentFormModalProps> = ({
  isOpen,
  onClose,
  initialPayment,
  onSuccess,
}) => {
  const { showToast } = useAuth();
  const [createPayment, { isLoading: isSubmittingPayment }] = useCreatePlatformPaymentMutation();
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchProducts = async () => {
      try {
        const res = await clientProductApi.getProducts({ limit: 100 });
        if (res?.success && Array.isArray(res.data)) {
          setProducts(res.data);
        }
      } catch (err) {
        console.warn('Failed to fetch products for payment form:', err);
      }
    };
    fetchProducts();
  }, [isOpen]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(PaymentSchema),
    defaultValues: {
      customerId: 'cust_direct_entry',
      customerName: '',
      productOrService: '',
      plan: 'Standard Tier',
      amount: 0,
      dueDate: new Date().toISOString().split('T')[0],
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'Bank Transfer',
      status: 'Paid',
      notes: '',
    },
  });

  // When products are fetched and no product is selected yet, default to first real product
  useEffect(() => {
    if (products.length > 0 && !watch('productOrService')) {
      reset((prev) => ({
        ...prev,
        productOrService: products[0].name,
      }));
    }
  }, [products, reset, watch]);

  const onSubmit = async (data: PaymentFormData) => {
    try {
      const selectedProd = products.find(
        (p) => p.name === data.productOrService || p.id === data.productOrService
      );

      await createPayment({
        customerName: data.customerName,
        customerId: data.customerId,
        amount: Number(data.amount) || 0,
        productOrService: data.productOrService,
        productName: data.productOrService,
        productId: selectedProd?.id,
        plan: data.plan,
        paymentMethod: data.paymentMethod,
        status: data.status,
        dueDate: data.dueDate,
        paymentDate: data.status === 'Paid' ? (data.paymentDate || new Date().toISOString().split('T')[0]) : undefined,
        referenceNumber: (data as any).transactionId || undefined,
        notes: data.notes,
      }).unwrap();

      showToast('success', 'Payment Recorded', `Payment recorded successfully for ${data.customerName}.`);
      reset();
      if (onSuccess) onSuccess();
      onClose();
    } catch (e: any) {
      const msg = e?.data?.message || e?.message || 'Failed to record payment.';
      showToast('error', 'Error', msg);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Payment / Create Invoice"
      subtitle="React Hook Form + Zod Financial Ledger"
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Customer / Company Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register('customerName')}
              type="text"
              placeholder="e.g. Apex Global Solutions"
              className={`w-full px-3 py-2 text-xs border rounded-md outline-none transition-colors ${
                errors.customerName ? 'border-red-500' : 'border-[#E2E8F0] focus:border-[#33077C]'
              }`}
            />
            {errors.customerName && <p className="text-[10px] text-red-500 mt-1">{errors.customerName.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Amount (₹) <span className="text-red-500">*</span>
            </label>
            <input
              {...register('amount', { valueAsNumber: true })}
              type="number"
              step="0.01"
              placeholder="1499.00"
              className={`w-full px-3 py-2 text-xs border rounded-md outline-none transition-colors ${
                errors.amount ? 'border-red-500' : 'border-[#E2E8F0] focus:border-[#33077C]'
              }`}
            />
            {errors.amount && <p className="text-[10px] text-red-500 mt-1">{errors.amount.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Product / Service</label>
            <select
              {...register('productOrService')}
              className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-md outline-none focus:border-[#33077C] bg-white"
            >
              {products.length > 0 ? (
                products.map((prod) => (
                  <option key={prod.id} value={prod.name}>
                    {prod.name}
                  </option>
                ))
              ) : (
                <option value="">No products available</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Plan Tier</label>
            <input
              {...register('plan')}
              type="text"
              placeholder="e.g. Enterprise Tier"
              className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-md outline-none focus:border-[#33077C]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
            <select
              {...register('paymentMethod')}
              className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-md outline-none focus:border-[#33077C] bg-white"
            >
              <option value="Stripe">Stripe</option>
              <option value="Bank Wire">Bank Wire</option>
              <option value="Credit Card">Credit Card</option>
              <option value="PayPal">PayPal</option>
              <option value="Cash">Cash</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Status</label>
            <select
              {...register('status')}
              className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-md outline-none focus:border-[#33077C] bg-white"
            >
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
            <input
              {...register('dueDate')}
              type="date"
              className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-md outline-none focus:border-[#33077C] bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Internal Reference / Notes</label>
          <textarea
            {...register('notes')}
            rows={2}
            placeholder="Invoice ID, transaction confirmation, or billing details..."
            className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-md outline-none focus:border-[#33077C]"
          />
        </div>

        <div className="pt-4 border-t border-[#E2E8F0] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto h-11 px-5 border border-[#E2E8F0] text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isSubmittingPayment}
            className="w-full sm:w-auto h-11 px-6 bg-[#4309A2] hover:bg-[#e67e00] text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{isSubmitting || isSubmittingPayment ? 'Recording...' : 'Record Payment'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
