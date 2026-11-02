import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Check, X, Loader2, AlertCircle } from 'lucide-react';
import { toast } from "../../../utils/toast";
import { Modal } from '../../../components/common/Modal';
import { CustomSelect } from '../../../components/common/CustomSelect';
import { FormLabel, FORM_INPUT_CLS, FORM_INPUT_ERROR_CLS } from '../utils/formUtils';
import { subcategoryApi, ApiSubcategory, categoryApi } from '../../../api';
import { store } from '../../../store/store';
import { baseApi } from '../../../api/baseApi';
import { useSubmitGuard, extractApiFieldErrors, getApiErrorMessage } from '../../../utils/formValidation';

export interface AddSubcategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: string;
  categories?: (string | { label: string; value: string })[];
  onSubcategoryCreated?: (subcategory: ApiSubcategory | { id: string; subcategory: string; category: string; name?: string }) => void;
}

export interface SubcategoryFormValues {
  category: string;
  subcategory: string;
  status: 'Active' | 'Inactive';
}

const DEFAULT_CATEGORY_OPTIONS = [
  { label: 'General', value: 'General' },
  { label: 'Electronics & Hardware', value: 'Electronics & Hardware' },
  { label: 'Apparel & Fashion', value: 'Apparel & Fashion' },
  { label: 'Home & Office Supplies', value: 'Home & Office Supplies' },
  { label: 'Industrial Equipment', value: 'Industrial Equipment' },
];

export const AddSubcategoryModal: React.FC<AddSubcategoryModalProps> = ({
  isOpen,
  onClose,
  initialCategory = '',
  categories = [],
  onSubcategoryCreated,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [liveCategoryOptions, setLiveCategoryOptions] = useState<{ label: string; value: string }[]>([]);
  const { runOnce } = useSubmitGuard();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitted },
  } = useForm<SubcategoryFormValues>({
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      category: initialCategory || 'General',
      subcategory: '',
      status: 'Active',
    },
  });

  const watchCategory = watch('category');
  const watchStatus = watch('status');

  // Category is a custom select (not a native input): register its rules so submit and re-validation both use them
  register('category', {
    validate: (val) => {
      const v = (val || '').trim();
      if (!v) return 'Please select a category before continuing.';
      if (liveCategoryOptions.length > 0 && !liveCategoryOptions.some((o) => o.value === v)) {
        return 'Please choose the category from the list.';
      }
      return true;
    },
  });

  // Load fresh categories from API and merge with passed categories
  const loadCategories = async () => {
    try {
      const res = await categoryApi.getCategories({
        pagination_required: false,
        status: 'Active',
      });
      if (res?.data && Array.isArray(res.data)) {
        const mapped = res.data.map((c) => ({
          label: c.name || c.categoryName,
          value: c.name || c.categoryName,
        }));
        if (mapped.length > 0) {
          setLiveCategoryOptions(mapped);
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch categories for subcategory modal:', err);
    }

    // Fallback to passed categories or defaults
    if (categories && categories.length > 0) {
      const normalized = categories.map((c) =>
        typeof c === 'string' ? { label: c, value: c } : c
      );
      setLiveCategoryOptions(normalized);
    } else {
      setLiveCategoryOptions(DEFAULT_CATEGORY_OPTIONS);
    }
  };

  useEffect(() => {
    // Start clean every time the modal opens or closes (no errors carried over)
    reset({
      category: initialCategory || 'General',
      subcategory: '',
      status: 'Active',
    });
    if (isOpen) loadCategories();
  }, [isOpen, initialCategory, reset]);

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

  const handleSaveSubcategory = (data: SubcategoryFormValues) => runOnce(async () => {
    const trimmedCat = (data.category || '').trim();
    const trimmedSub = (data.subcategory || '').trim();


    const finalStatus = data.status;
    setIsSubmitting(true);

    try {
      const res = await subcategoryApi.createSubcategory({
        category: trimmedCat,
        subcategory: trimmedSub,
        status: finalStatus,
      });

      const created = res?.data || (res as any)?.subcategory || {
        id: `subcat_${Date.now()}`,
        subcategory: trimmedSub,
        name: trimmedSub,
        category: trimmedCat,
        categoryName: trimmedCat,
        status: finalStatus,
      };

      store.dispatch(
        baseApi.util.invalidateTags([
          { type: 'Subcategory', id: 'LIST' },
          { type: 'Category', id: 'LIST' },
          { type: 'Product', id: 'LIST' },
        ])
      );

      toast.success(`Subcategory "${created.subcategory || created.name || trimmedSub}" created successfully.`);

      try {
        onSubcategoryCreated?.(created);
      } catch (cbErr) {
        console.error('onSubcategoryCreated callback error:', cbErr);
      }

      onClose();
    } catch (apiErr: any) {
      console.error('Subcategory creation failed:', apiErr);
      const fieldErrs = extractApiFieldErrors(apiErr);
      if (fieldErrs.subcategory || fieldErrs.category) {
        if (fieldErrs.subcategory) setError('subcategory', { type: 'server', message: fieldErrs.subcategory });
        if (fieldErrs.category) setError('category', { type: 'server', message: fieldErrs.category });
      } else {
        toast.error(getApiErrorMessage(apiErr, 'Failed to create subcategory.'));
      }
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      title="Add Subcategory"
      subtitle="Configure subcategory details, parent category, and status"
      maxWidth="xl"
      headerGradient={true}
      showBackIcon={true}
      hideCloseButton={true}
      onBack={() => !isSubmitting && onClose()}
    >
      <form noValidate onSubmit={handleSubmit(handleSaveSubcategory)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="flex flex-col">
            <FormLabel required>Category</FormLabel>
            <CustomSelect
              options={liveCategoryOptions}
              value={watchCategory}
              onChange={(val) => setValue('category', val, { shouldValidate: isSubmitted })}
              placeholder="Select category"
              activeColor="brand"
              disabled={isSubmitting}
            />
            {errors.category && (
              <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.category.message}</span>
              </p>
            )}
          </div>

          <div className="flex flex-col">
            <FormLabel required>Subcategory Name</FormLabel>
            <input
              type="text"
              disabled={isSubmitting}
              autoFocus
              placeholder="Enter subcategory name"
              {...register('subcategory', {
                required: 'Please enter the subcategory name.',
                validate: (val) =>
                  val.trim().length >= 2 || 'The subcategory name must be at least 2 characters.',
              })}
              onKeyDown={handleTextOnlyKeyDown}
              onInput={(e) => {
                e.currentTarget.value = e.currentTarget.value.replace(/[^A-Za-z\s&'-]/g, '');
              }}
              className={errors.subcategory ? FORM_INPUT_ERROR_CLS : FORM_INPUT_CLS}
            />
            {errors.subcategory && (
              <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.subcategory.message}</span>
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
              onChange={(val) => setValue('status', val as 'Active' | 'Inactive', { shouldValidate: isSubmitted })}
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
            className="w-full sm:w-auto h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <X className="w-4 h-4 text-slate-500" />
            <span>Cancel</span>
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
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
  );
};
