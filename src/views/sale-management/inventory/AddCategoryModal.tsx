import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Check, X, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '../../../components/common/Modal';
import { CustomSelect } from '../../../components/common/CustomSelect';
import { FormLabel, FORM_INPUT_CLS, FORM_INPUT_ERROR_CLS } from '../utils/formUtils';
import { categoryApi, ApiCategory } from '../../../api/commerce/categoryApi';
import { store } from '../../../store/store';
import { baseApi } from '../../../api/baseApi';

export interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryCreated?: (category: ApiCategory | { id: string; categoryName: string; name?: string }) => void;
}

export interface CategoryFormValues {
  categoryName: string;
  status: 'Active' | 'Inactive';
}

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  isOpen,
  onClose,
  onCategoryCreated,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    mode: 'onChange',
    defaultValues: {
      categoryName: '',
      status: 'Active',
    },
  });

  const watchStatus = watch('status');

  useEffect(() => {
    if (isOpen) {
      reset({
        categoryName: '',
        status: 'Active',
      });
    }
  }, [isOpen, reset]);

  // Keystroke sanitizer: disallow typing numeric characters in text-only fields
  const handleTextOnlyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'Tab' ||
      e.key === 'Enter' ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
    }
  };

  const handleSaveCategory = async (data: CategoryFormValues) => {
    const trimmedName = data.categoryName.trim();
    if (!trimmedName) {
      setError('categoryName', { type: 'manual', message: 'Category name is required' });
      return;
    }

    const finalStatus = (data.status || 'Active') as 'Active' | 'Inactive';
    setIsSubmitting(true);

    try {
      const res = await categoryApi.createCategory({
        categoryName: trimmedName,
        status: finalStatus,
      });

      const created = res?.data || (res as any)?.category || { id: `cat_${Date.now()}`, categoryName: trimmedName, name: trimmedName };

      store.dispatch(
        baseApi.util.invalidateTags([
          { type: 'Category', id: 'LIST' },
          { type: 'Product', id: 'LIST' },
        ])
      );

      toast.success(`Category "${created.categoryName || created.name || trimmedName}" created successfully.`);

      try {
        onCategoryCreated?.(created);
      } catch (cbErr) {
        console.error('onCategoryCreated callback error:', cbErr);
      }

      onClose();
    } catch (apiErr: any) {
      console.error('Category creation failed:', apiErr);
      const errMsg =
        apiErr?.response?.data?.error?.message ||
        apiErr?.response?.data?.message ||
        apiErr?.message ||
        'Failed to create category.';
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      title="Add Category"
      subtitle="Configure category details, status, and classification"
      maxWidth="lg"
      headerGradient={true}
      showBackIcon={true}
      hideCloseButton={true}
      onBack={() => !isSubmitting && onClose()}
    >
      <form noValidate onSubmit={handleSubmit(handleSaveCategory)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="flex flex-col">
            <FormLabel required>Category Name</FormLabel>
            <input
              type="text"
              disabled={isSubmitting}
              autoFocus
              {...register('categoryName', {
                required: 'Category name is required',
                minLength: { value: 2, message: 'Category name must be at least 2 characters' },
                validate: (val) =>
                  /^[A-Za-z\s&'-]+$/.test(val.trim()) || 'Only text characters (letters and spaces) are allowed',
              })}
              onKeyDown={handleTextOnlyKeyDown}
              onInput={(e) => {
                e.currentTarget.value = e.currentTarget.value.replace(/[^A-Za-z\s&'-]/g, '');
              }}
              placeholder="Enter category name"
              className={errors.categoryName ? FORM_INPUT_ERROR_CLS : FORM_INPUT_CLS}
            />
            {errors.categoryName && (
              <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.categoryName.message}</span>
              </p>
            )}
          </div>

          <div className="flex flex-col">
            <FormLabel required>Status</FormLabel>
            <CustomSelect
              options={[
                { label: 'Active', value: 'Active' },
                { label: 'Inactive', value: 'Inactive' },
              ]}
              value={watchStatus || 'Active'}
              onChange={(val) => setValue('status', val as 'Active' | 'Inactive', { shouldValidate: true })}
              placeholder="Select status"
              activeColor="brand"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="pt-3 flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="w-full sm:w-auto h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <X className="w-4 h-4 text-slate-500" />
            <span>Cancel</span>
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Check className="w-4 h-4 stroke-[2.5]" />
            )}
            <span>{isSubmitting ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
