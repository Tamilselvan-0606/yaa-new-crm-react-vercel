import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PaymentSchema, PaymentFormData } from '../../schemas';
import { PaymentItem } from '../../types';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useCreatePayment } from '../../hooks/useQueries';

interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPayment?: PaymentItem | null;
}

export const PaymentFormModal: React.FC<PaymentFormModalProps> = ({
  isOpen,
  onClose,
  initialPayment,
}) => {
  const { isAdmin } = useAuth();
  const createPaymentMutation = useCreatePayment();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(PaymentSchema),
    defaultValues: {
      customerId: 'cust_direct_entry',
      customerName: '',
      productOrService: 'OmniFlow ERP',
      plan: 'Enterprise Tier',
      amount: 1499,
      dueDate: new Date().toISOString().split('T')[0],
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'Stripe',
      status: 'Paid',
      notes: '',
    },
  });

  const onSubmit = async (data: PaymentFormData) => {
    try {
      await createPaymentMutation.mutateAsync({
        ...data,
        productName: data.productOrService,
      } as any);
      reset();
      onClose();
    } catch (e) {
      // Handled in mutation hook
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Payment / Create Invoice"
      subtitle="React Hook Form + Zod Financial Ledger"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              Amount ($ USD) <span className="text-red-500">*</span>
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
              <option value="OmniFlow ERP">OmniFlow ERP</option>
              <option value="NexusCRM Pro">NexusCRM Pro</option>
              <option value="PulseAnalytics">PulseAnalytics</option>
              <option value="ChatSphere AI">ChatSphere AI</option>
              <option value="Digital Marketing - Scale">Digital Marketing - Scale Plan</option>
              <option value="Digital Marketing - Enterprise">Digital Marketing - Enterprise</option>
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

        <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-5 border border-[#E2E8F0] text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || createPaymentMutation.isPending}
            className="h-11 px-6 bg-[#4309A2] hover:bg-[#e67e00] text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Record Payment</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
