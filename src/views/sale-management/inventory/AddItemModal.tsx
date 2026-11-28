import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  X,
  Search,
  Loader2,
  Check,
  AlertCircle,
  Plus,
  MinusCircle,
  Info,
  Tag,
  Image as ImageIcon,
  ChevronDown,
  Settings,
} from "lucide-react";
import {
  FormLabel,
  FORM_INPUT_CLS,
  FORM_INPUT_ERROR_CLS,
  FORM_SELECT_CLS,
  FORM_TEXTAREA_CLS,
} from "../utils/formUtils";
import {
  PRODUCT_ITEM_IMAGE_ACCEPT,
  PRODUCT_ITEM_IMAGE_EXTENSIONS,
  PRODUCT_ITEM_IMAGE_MIME_TYPES,
  validateImageFile,
} from "../utils/imageUpload";
import {
  productApi,
  CreateProductPayload,
  mapApiProductToProductItem,
} from "../../../api/commerce/productApi";
import { categoryApi, ApiCategory } from "../../../api/commerce/categoryApi";
import { subcategoryApi } from "../../../api/commerce/subcategoryApi";
import { unitApi, ApiUnit, resolveBaseUnitId } from "../../../api/commerce/unitApi";
import { toast } from "../../../utils/toast";
import { sanitizeHsnCodeInput } from "../../../utils/validation";
import { BATCH_PREFIX, cleanBatchNo } from "../utils/textUtils";
import { BatchPrefixInput } from "../utils/BatchPrefixInput";
import { FormError } from "../../../components/common/FormError";
import {
  useFieldErrors,
  useRevalidateAfterSubmit,
  useSubmitGuard,
  fieldAttr,
  collectErrors,
  checkRequiredSelection,
  checkMoney,
  checkNotGreaterThan,
  checkPercent,
  checkNumber,
  checkRequiredText,
  checkDateNotBefore,
  checkDateAfter,
  extractApiFieldErrors,
  getApiErrorMessage,
} from "../../../utils/formValidation";
import { store } from "../../../store/store";
import { baseApi } from "../../../api/baseApi";
import { AddCategoryModal } from "./AddCategoryModal";
import { AddSubcategoryModal } from "./AddSubcategoryModal";
import { ItemSettingsModal, useItemSettings } from "./ItemSettingsModal";
import { DateInput } from "../../../components/common/DateInput";

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: (product: any) => void;
}

export interface ItemModalFormData {
  itemType: "Product" | "Service";
  productName: string;
  description?: string;
  category: string;
  subcategory?: string;
  hsnCode?: string;
  unit: string;
  baseUnitId?: string;
  secondaryUnitId?: string | null;
  itemImage?: string;
  salePrice: number | string;
  salePriceTaxType: "Excluded" | "Included";
  discountValue?: number | string;
  discountType?: "Percentage" | "Amount";
  hasWholesale?: boolean;
  wholesalePrice?: number | string;
  wholesaleTaxType?: "Excluded" | "Included";
  minWholesaleQty?: number | string;
  purchasePrice?: number | string;
  purchasePriceTaxType?: "Excluded" | "Included";
  taxRate: string;
  openingStock?: number | string;
  atPrice?: number | string;
  minStockAlert?: number | string;
  location?: string;
  batchNo?: string;
  mfgDate?: string;
  expDate?: string;
}

const TAX_RATE_OPTIONS = [
  { label: "None", value: "None" },
  { label: "Exempted", value: "Exempted" },
  { label: "GST @ 0%", value: "GST @ 0%" },
  { label: "GST @ 0.25%", value: "GST @ 0.25%" },
  { label: "GST @ 3%", value: "GST @ 3%" },
  { label: "GST @ 5%", value: "GST @ 5%" },
  { label: "GST @ 18%", value: "GST @ 18%" },
  { label: "GST @ 40%", value: "GST @ 40%" },
];

const formatUnitOption = (u: { name: string; shortCode?: string }) => {
  const short = u.shortCode || "";
  const fullName = u.name || "";
  return short
    ? `${fullName.toUpperCase()} (${short})`
    : fullName.toUpperCase();
};

import { SearchableDropdown } from "./SearchableDropdown";
export type { SearchableDropdownOption } from "./SearchableDropdown";
export { SearchableDropdown };

export const AddItemModal: React.FC<AddItemModalProps> = ({
  isOpen,
  onClose,
  onProductCreated,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { runOnce } = useSubmitGuard();
  const unitGuard = useSubmitGuard();
  const fe = useFieldErrors();

  // Categories & Subcategories
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [isAddSubcategoryModalOpen, setIsAddSubcategoryModalOpen] =
    useState(false);
  const [itemSettings, setItemSettings] = useItemSettings();
  const [isItemSettingsOpen, setIsItemSettingsOpen] = useState(false);

  // Units
  const [allAvailableUnits, setAllAvailableUnits] = useState<ApiUnit[]>([]);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [selectedBaseUnit, setSelectedBaseUnit] = useState<string>("");
  const [selectedSecondaryUnit, setSelectedSecondaryUnit] =
    useState<string>("None");
  const [customUnitName, setCustomUnitName] = useState("");
  const [customUnitShortCode, setCustomUnitShortCode] = useState("");
  const [isCreatingUnit, setIsCreatingUnit] = useState(false);
  // Inline errors for the custom-unit form appear only after "Create Custom Unit" was clicked
  const [unitCreateAttempted, setUnitCreateAttempted] = useState(false);
  const customUnitNameError = unitCreateAttempted && !customUnitName.trim() ? "Please enter the unit name." : null;
  const customUnitCodeError = unitCreateAttempted && !customUnitShortCode.trim() ? "Please enter the unit short code." : null;
  // Image file rejected on selection; shown inline once a submit has been attempted
  const [imageFileError, setImageFileError] = useState<string | null>(null);

  // Image Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [itemImageState, setItemImageState] = useState<string>("");
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);

  // HSN Search

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    setError,
    formState: { errors, isSubmitted },
  } = useForm<ItemModalFormData>({
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      itemType: "Product",
      productName: "",
      description: "",
      category: "",
      subcategory: "",
      hsnCode: "",
      unit: "",
      salePrice: "",
      salePriceTaxType: "Excluded",
      discountValue: "",
      discountType: "Percentage",
      hasWholesale: false,
      wholesalePrice: "",
      wholesaleTaxType: "Excluded",
      minWholesaleQty: "",
      purchasePrice: "",
      purchasePriceTaxType: "Excluded",
      taxRate: "None",
      minStockAlert: "",
      openingStock: "",
      location: "",
      batchNo: BATCH_PREFIX,
      mfgDate: "",
      expDate: "",
      itemImage: "",
    },
  });

  const formData = watch();

  // Load Categories
  const loadCategories = async () => {
    try {
      const res = await categoryApi.getCategories({
        pagination_required: false,
        status: "Active",
      });
      if (res && res.data) {
        setCategories(
          res.data.filter((c: any) => String(c.status || "Active").toLowerCase() !== "inactive"),
        );
      }
    } catch (err) {
      console.warn("Failed to load categories in AddItemModal:", err);
    }
  };

  // Load Subcategories
  const loadSubcategories = async () => {
    try {
      const res = await subcategoryApi.getSubcategories({
        pagination_required: false,
        status: "Active",
      });
      if (res && res.data) {
        setSubcategories(res.data);
      }
    } catch (err) {
      console.warn("Failed to load subcategories in AddItemModal:", err);
    }
  };

  // Load Units
  const loadUnits = async () => {
    try {
      const res = await unitApi.getUnits({
        sortOrder: "asc",
      });
      const list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
          ? res
          : Array.isArray((res as any)?.data?.data)
            ? (res as any).data.data
            : [];
      if (list && list.length > 0) {
        setAllAvailableUnits(list);
        const currentVals = getValues();
        if (!currentVals.baseUnitId && currentVals.unit) {
          const matched =
            list.find(
              (u) =>
                (currentVals.unit &&
                  (u.shortCode?.toUpperCase() === currentVals.unit.toUpperCase() ||
                    u.name?.toUpperCase() === currentVals.unit.toUpperCase())),
            );
          if (matched) {
            setValue("baseUnitId", matched.id);
            if (!currentVals.unit) setValue("unit", matched.shortCode || matched.name);
            setSelectedBaseUnit(formatUnitOption(matched));
          }
        }
      }
    } catch (err) {
      console.warn("Failed to load units in AddItemModal:", err);
    }
  };

  // Filter available subcategories for current category
  const availableSubcategories = React.useMemo(() => {
    const selectedCat = (formData.category || "").trim().toLowerCase();
    const activeSubs = subcategories.filter((s) => s.status !== "Inactive");

    if (!selectedCat || selectedCat === "general") {
      const all = activeSubs
        .map((s) => s.subcategory || s.name || "")
        .filter((n: string) => n.trim() !== "");
      return Array.from(new Set(all)) as string[];
    }

    const matching = activeSubs
      .filter((s) => {
        const cat = (s.category || s.categoryName || "").trim().toLowerCase();
        return cat === selectedCat;
      })
      .map((s) => s.subcategory || s.name || "")
      .filter((n: string) => n.trim() !== "");

    return Array.from(new Set(matching)) as string[];
  }, [subcategories, formData.category]);

  // Memoized options for SearchableDropdowns matching Customer dropdown
  const categoryOptions = React.useMemo(() => {
    return categories.map((c) => {
      const name = c.name || (c as any).categoryName || "";
      return {
        value: name,
        label: name,
      };
    });
  }, [categories]);

  const subcategoryOptions = React.useMemo(() => {
    return availableSubcategories.map((s) => ({
      value: s,
      label: s,
    }));
  }, [availableSubcategories]);

  const unitOptions = React.useMemo(() => {
    const opts: Array<{ value: string; label: string; subLabel?: string }> = [];
    const seenCodes = new Set<string>();

    allAvailableUnits.forEach((u) => {
      const code = (u.shortCode || u.name || "").trim().toUpperCase();
      if (code && !seenCodes.has(code)) {
        seenCodes.add(code);
        opts.push({
          value: code,
          label: formatUnitOption(u),
          subLabel: u.shortCode ? `Code: ${u.shortCode}` : undefined,
        });
      }
    });

    if (!seenCodes.has("PCS")) {
      opts.unshift({
        value: "PCS",
        label: "PIECES (PCS)",
        subLabel: "Code: PCS",
      });
    }

    return opts;
  }, [allAvailableUnits]);

  const taxRateOptions = React.useMemo(() => {
    const opts = TAX_RATE_OPTIONS.map((tax) => ({
      value: tax.value,
      label: tax.label,
    }));
    // A rate saved under an older slab (12%, 28% ...) stays visible instead of silently turning into "None".
    const current = formData.taxRate;
    if (current && !opts.some((o) => o.value === current)) {
      opts.push({ value: current, label: `${current} (old slab)` });
    }
    return opts;
  }, [formData.taxRate]);

  const handleUnitChange = (val: string) => {
    setValue("unit", val, { shouldValidate: isSubmitted });
    const matched = allAvailableUnits.find(
      (u) =>
        u.shortCode?.toUpperCase() === val.toUpperCase() ||
        u.name?.toUpperCase() === val.toUpperCase() ||
        u.id === val ||
        formatUnitOption(u) === val,
    );
    if (matched) {
      setValue("baseUnitId", matched.id);
      setSelectedBaseUnit(formatUnitOption(matched));
    } else {
      setSelectedBaseUnit(val);
    }
  };

  // Reset modal state upon opening; clear all errors on open and on close
  useEffect(() => {
    fe.reset();
    setUnitCreateAttempted(false);
    setImageFileError(null);
    if (!isOpen) reset();
    if (isOpen) {
      setItemImageState("");
      const defaultUnitObj =
        itemSettings.defaultUnitEnabled && itemSettings.defaultUnitId
          ? allAvailableUnits.find((u) => u.id === itemSettings.defaultUnitId)
          : undefined;
      setSelectedBaseUnit(defaultUnitObj ? formatUnitOption(defaultUnitObj) : "");
      setSelectedSecondaryUnit("None");
      reset({
        itemType: "Product",
        productName: "",
        description: "",
        category: "",
        subcategory: "",
        hsnCode: "",
        unit: defaultUnitObj
          ? defaultUnitObj.shortCode || defaultUnitObj.name
          : "",
        baseUnitId: defaultUnitObj?.id,
        salePrice: "",
        salePriceTaxType: "Excluded",
        discountValue: "",
        discountType: "Percentage",
        hasWholesale: false,
        wholesalePrice: "",
        wholesaleTaxType: "Excluded",
        minWholesaleQty: "",
        purchasePrice: "",
        purchasePriceTaxType: "Excluded",
        taxRate: "None",
        minStockAlert: "",
        openingStock: "",
        location: "",
        batchNo: BATCH_PREFIX,
        mfgDate: "",
        expDate: "",
        itemImage: "",
      });
      loadCategories();
      loadSubcategories();
      loadUnits();
    }
  }, [isOpen, reset]);

  // Custom-unit form starts clean whenever the unit modal opens or closes
  useEffect(() => {
    setUnitCreateAttempted(false);
  }, [isUnitModalOpen]);

  // Image Upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const validation = validateImageFile(file, {
      allowedMimeTypes: PRODUCT_ITEM_IMAGE_MIME_TYPES,
      allowedExtensions: PRODUCT_ITEM_IMAGE_EXTENSIONS,
      maxSizeBytes: 5 * 1024 * 1024,
      invalidTypeMessage:
        "Only image files (.png, .jpg, .jpeg, .webp) are allowed.",
      tooLargeMessage: "Image size must be less than 5MB.",
    });
    if (!validation.valid) {
      setImageFileError(validation.error);
      toast.error(validation.error);
      return;
    }
    setImageFileError(null);

    setIsUploadingImage(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setItemImageState(base64);
      setValue("itemImage", base64, { shouldValidate: isSubmitted });
      setIsUploadingImage(false);
      toast.success("Image selected successfully");
    };
    reader.onerror = () => {
      setIsUploadingImage(false);
      const errMsg =
        "Could not read the image file. Please choose another image.";
      setImageFileError(errMsg);
      toast.error(errMsg);
    };
    reader.readAsDataURL(file);
  };

  // Add Custom Unit handler
  const handleAddCustomUnit = () => unitGuard.runOnce(async () => {
    setUnitCreateAttempted(true);
    if (!customUnitName.trim() || !customUnitShortCode.trim()) return;
    setIsCreatingUnit(true);
    try {
      const res = await unitApi.createUnit({
        name: customUnitName.trim(),
        shortCode: customUnitShortCode.trim().toUpperCase(),
      });
      if (res && res.data) {
        toast.success(`Unit "${customUnitName}" created`);
        await loadUnits();
        const formatted = `${customUnitName.toUpperCase()} (${customUnitShortCode.toUpperCase()})`;
        setSelectedBaseUnit(formatted);
        setValue("unit", customUnitShortCode.trim().toUpperCase(), {
          shouldValidate: isSubmitted,
        });
        setValue("baseUnitId", res.data.id);
        setCustomUnitName("");
        setCustomUnitShortCode("");
        setUnitCreateAttempted(false);
        setIsUnitModalOpen(false);
      }
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, "Failed to create unit."));
    } finally {
      setIsCreatingUnit(false);
    }
  });

  // Apply Unit Selection
  const handleConfirmUnit = () => {
    let baseUnitCode = "PCS";
    let baseId: string | undefined = undefined;

    const matchedBase = allAvailableUnits.find(
      (u) =>
        formatUnitOption(u) === selectedBaseUnit ||
        u.shortCode?.toUpperCase() === selectedBaseUnit.toUpperCase() ||
        u.name?.toUpperCase() === selectedBaseUnit.toUpperCase(),
    );

    if (matchedBase) {
      baseUnitCode = matchedBase.shortCode || matchedBase.name;
      baseId = matchedBase.id;
    } else if (selectedBaseUnit) {
      baseUnitCode = selectedBaseUnit;
    }

    setValue("unit", baseUnitCode, { shouldValidate: isSubmitted });
    setValue("baseUnitId", baseId);

    if (selectedSecondaryUnit && selectedSecondaryUnit !== "None") {
      const matchedSec = allAvailableUnits.find(
        (u) => formatUnitOption(u) === selectedSecondaryUnit,
      );
      if (matchedSec) {
        setValue("secondaryUnitId", matchedSec.id);
      }
    } else {
      setValue("secondaryUnitId", null);
    }

    setIsUnitModalOpen(false);
  };

  // Validation for fields that are not registered with React Hook Form (controlled inputs).
  const computeExtraErrors = (d: ItemModalFormData): Record<string, string> => {
    const saleBase = Number(d.salePrice);
    const discountErr = (() => {
      if (d.discountValue === "" || d.discountValue === undefined) return null;
      if (d.discountType === "Percentage") return checkPercent(d.discountValue, "discount percentage");
      const base = checkMoney(d.discountValue, "discount amount", { allowZero: true });
      if (base) return base;
      if (d.salePrice !== "" && d.salePrice !== undefined && !isNaN(saleBase) && Number(d.discountValue) > saleBase) {
        return "The discount cannot be more than the sale price.";
      }
      return null;
    })();
    // Tax-inclusive prices need a tax rate, otherwise the included tax can't be worked out.
    const anyTaxIncluded =
      d.salePriceTaxType === "Included" ||
      d.purchasePriceTaxType === "Included" ||
      (!!d.hasWholesale && d.wholesaleTaxType === "Included");
    const taxMissing = !d.taxRate || !d.taxRate.trim() || d.taxRate === "None";
    const checks: Array<[string, string | null]> = [
      [
        "taxRate",
        itemSettings.itemWiseTax && anyTaxIncluded && taxMissing
          ? "Select a tax rate: a price is marked as With Tax."
          : null,
      ],
      [
        "category",
        itemSettings.itemCategory
          ? checkRequiredSelection(d.category, "category")
          : null,
      ],
      [
        "subcategory",
        itemSettings.itemCategory
          ? checkRequiredSelection(d.subcategory, "subcategory")
          : null,
      ],
      [
        "unit",
        itemSettings.itemUnits ? checkRequiredSelection(d.unit, "unit") : null,
      ],
      ["salePrice", checkMoney(d.salePrice, "sale price", { allowZero: true, optional: true })],
      ["discountValue", discountErr],
      [
        "purchasePrice",
        checkMoney(d.purchasePrice, "purchase price", { allowZero: true, optional: true }) ||
          checkNotGreaterThan(d.purchasePrice, d.salePrice, "purchase price", "sale price"),
      ],
      ["minStockAlert", checkNumber(d.minStockAlert, "minimum stock", { allowZero: true, optional: true, maxDecimals: 0 })],
      [
        "batchNo",
        (d.mfgDate || d.expDate) && !cleanBatchNo(d.batchNo) ? checkRequiredText("", "batch number") : null,
      ],
      ["expDate", checkDateAfter(d.expDate, d.mfgDate, "expiry date", "manufacturing date")],
    ];
    if (d.hasWholesale) {
      checks.push(
        [
          "wholesalePrice",
          checkMoney(d.wholesalePrice, "wholesale price", { allowZero: true, optional: true }) ||
            checkNotGreaterThan(d.wholesalePrice, d.salePrice, "wholesale price", "sale price"),
        ],
        ["minWholesaleQty", checkNumber(d.minWholesaleQty, "minimum wholesale quantity", { allowZero: true, optional: true, maxDecimals: 0 })],
      );
    }
    return collectErrors(checks);
  };


  // Errors appear only after the first Save attempt, then stay in sync as values change.
  useRevalidateAfterSubmit(fe, () => computeExtraErrors(getValues()), [
    formData.category, formData.subcategory, formData.unit, formData.salePrice, formData.discountValue, formData.discountType,
    formData.wholesalePrice, formData.minWholesaleQty, formData.hasWholesale,
    formData.taxRate, formData.salePriceTaxType, formData.purchasePriceTaxType, formData.wholesaleTaxType,
    formData.purchasePrice, formData.minStockAlert, formData.batchNo, formData.mfgDate,
    formData.expDate,
  ]);

  // RHF fields invalid: also reveal the controlled-field errors in the same submit
  const onInvalid = () => {
    const extra = computeExtraErrors(getValues());
    fe.validateAll(extra);
    // Name/category fields are on top; only switch tabs when there are no top-level RHF errors
  };

  // Form submission to API
  const onSubmit = (data: ItemModalFormData) => runOnce(async () => {
    const extraErrors = computeExtraErrors(data);
    if (!fe.validateAll(extraErrors)) {
      return;
    }
    setIsSubmitting(true);
    try {
      let effUnit = (data.unit && data.unit.trim()) || "PCS";
      let effBaseUnitId = data.baseUnitId;

      if (!effBaseUnitId) {
        const matched = allAvailableUnits.find(
          (u) =>
            u.id === effUnit ||
            u.shortCode?.toUpperCase() === effUnit.toUpperCase() ||
            u.name?.toUpperCase() === effUnit.toUpperCase() ||
            formatUnitOption(u).toUpperCase().includes(`(${effUnit.toUpperCase()})`),
        );
        if (matched) {
          effBaseUnitId = matched.id;
          effUnit = matched.shortCode || matched.name;
        } else {
          const resolved = await resolveBaseUnitId(effUnit);
          if (resolved) {
            effBaseUnitId = resolved.baseUnitId;
            effUnit = resolved.unitCode;
          }
        }
      }

      const payload: Record<string, any> = {
        productName: data.productName.trim(),
        unit: effUnit,
      };

      if (data.itemType) payload.itemType = data.itemType;
      if (data.description && data.description.trim()) payload.description = data.description.trim();
      if (data.category && data.category.trim()) payload.category = data.category.trim();
      if (data.subcategory && data.subcategory.trim()) payload.subcategory = data.subcategory.trim();
      if (data.hsnCode && data.hsnCode.trim()) payload.hsnCode = data.hsnCode.trim();
      if (effBaseUnitId) payload.baseUnitId = effBaseUnitId;
      if (data.secondaryUnitId) payload.secondaryUnitId = data.secondaryUnitId;

      const effImg = itemImageState || data.itemImage;
      if (effImg && effImg.trim()) {
        payload.itemImage = effImg;
        payload.image = effImg;
        payload.imageBase64 = effImg;
      }

      if (data.salePrice !== "" && data.salePrice !== undefined) {
        payload.salePrice = Number(data.salePrice) || 0;
        if (data.salePriceTaxType) payload.salePriceTaxType = data.salePriceTaxType;
      }

      if (data.discountValue !== "" && data.discountValue !== undefined && Number(data.discountValue) > 0) {
        payload.discountValue = Number(data.discountValue);
        if (data.discountType) payload.discountType = data.discountType;
      }

      if (data.hasWholesale) {
        payload.hasWholesale = true;
        if (data.wholesalePrice !== "" && data.wholesalePrice !== undefined) {
          payload.wholesalePrice = Number(data.wholesalePrice) || 0;
        }
        if (data.wholesaleTaxType) payload.wholesaleTaxType = data.wholesaleTaxType;
        if (data.minWholesaleQty !== "" && data.minWholesaleQty !== undefined) {
          payload.minWholesaleQty = Number(data.minWholesaleQty) || 0;
        }
      }

      if (data.purchasePrice !== "" && data.purchasePrice !== undefined) {
        payload.purchasePrice = Number(data.purchasePrice) || 0;
        if (data.purchasePriceTaxType) payload.purchasePriceTaxType = data.purchasePriceTaxType;
      }

      if (data.taxRate && data.taxRate !== "None" && data.taxRate.trim()) {
        payload.taxRate = data.taxRate;
      }

      if (data.openingStock !== "" && data.openingStock !== undefined) {
        payload.openingStock = Number(data.openingStock) || 0;
        if (data.atPrice !== "" && data.atPrice !== undefined) {
          payload.atPrice = Number(data.atPrice) || 0;
        }
      }

      if (data.minStockAlert !== "" && data.minStockAlert !== undefined && Number(data.minStockAlert) > 0) {
        payload.minStockAlert = Number(data.minStockAlert);
      }

      if (data.location && data.location.trim()) {
        payload.location = data.location.trim();
      }

      if (cleanBatchNo(data.batchNo)) {
        payload.isBatchTracking = true;
        payload.batchNo = cleanBatchNo(data.batchNo);
        if (data.mfgDate && data.mfgDate.trim()) payload.mfgDate = data.mfgDate.trim();
        if (data.expDate && data.expDate.trim()) payload.expDate = data.expDate.trim();
      }


      const res = await productApi.createProduct(payload as unknown as CreateProductPayload);
      if (res?.success && res.data) {
        const createdItem = mapApiProductToProductItem(res.data);
        store.dispatch(
          baseApi.util.invalidateTags([
            { type: "Product", id: "LIST" },
            { type: "Stock", id: "LIST" },
          ]),
        );
        toast.success(`Item "${createdItem.productName}" added successfully!`);
        onProductCreated(createdItem);
        onClose();
      } else {
        throw new Error(res?.message || "Failed to create product");
      }
    } catch (apiErr: any) {
      const apiFields = extractApiFieldErrors(apiErr);
      const mapped: Record<string, string> = {};
      for (const [k, v] of Object.entries(apiFields)) {
        if (k === "productName" || k === "name") setError("productName", { type: "server", message: v });
        else mapped[k] = v;
      }
      if (Object.keys(mapped).length > 0) fe.merge(mapped);
      if (Object.keys(apiFields).length === 0) {
        toast.error(getApiErrorMessage(apiErr, "Failed to create item."));
      }
    } finally {
      setIsSubmitting(false);
    }
  });

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          className="relative w-full max-w-5xl bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94dvh] my-auto animate-in zoom-in-95 duration-100"
        >
          {/* Modal Header matching Image 1 */}
          <div
            className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4.5 text-white shrink-0"
            style={{ background: "#33077C" }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 -ml-1 rounded-xl text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center shrink-0"
                title="Go back"
              >
                <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
              </button>
              <div className="min-w-0">
                <h3 className="text-base sm:text-xl font-bold tracking-tight text-white truncate">
                  Add Item
                </h3>
                <p className="text-xs text-white/80 font-medium truncate mt-0.5">
                  Configure product details, pricing, inventory stock, and tax
                  rules
                </p>
              </div>
            </div>

            {/* Right Action: Item Settings (replaces Close in top-right corner) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsItemSettingsOpen(true)}
                className="p-1.5 rounded-xl text-white/85 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                title="Item Settings"
                aria-label="Item Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Body Scroll Area */}
          <div className="overflow-y-auto p-3.5 sm:p-6 pb-8 space-y-5 sm:space-y-6 flex-1 min-w-0 bg-[#fafbfc]">
            {/* Row 1: Category, Subcategory, Item Name */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start">
              {/* Category */}
              {itemSettings.itemCategory && (
                <div className="md:col-span-3" {...fieldAttr("category")}>
                  <SearchableDropdown
                    label="Category"
                    required
                    error={fe.errors.category}
                    value={formData.category}
                    onChange={(val) => {
                      setValue("category", val, { shouldValidate: isSubmitted });
                      setValue("subcategory", "");
                    }}
                    options={categoryOptions}
                    placeholder="Select Category"
                    searchPlaceholder="Search Category by name..."
                    addNewButtonLabel="+ Add New Category"
                    onAddNew={() => setIsAddCategoryModalOpen(true)}
                  />
                  <FormError message={fe.errors.category} showIcon />
                </div>
              )}

              {/* Subcategory */}
              {itemSettings.itemCategory && (
                <div className="md:col-span-3" {...fieldAttr("subcategory")}>
                  <SearchableDropdown
                    label="Subcategory"
                    required
                    error={fe.errors.subcategory}
                    value={formData.subcategory || ""}
                    onChange={(val) => setValue("subcategory", val)}
                    options={subcategoryOptions}
                    placeholder="Select Subcategory"
                    searchPlaceholder="Search Subcategory..."
                    addNewButtonLabel="+ Add New Subcategory"
                    onAddNew={() => setIsAddSubcategoryModalOpen(true)}
                    disabled={!formData.category}
                  />
                  <FormError message={fe.errors.subcategory} showIcon />
                </div>
              )}

              {/* Item Name */}
              <div className={itemSettings.itemCategory ? "md:col-span-6" : "md:col-span-12"}>
                <FormLabel required>Item Name</FormLabel>
                <input
                  type="text"
                  placeholder="Enter Item Name"
                  disabled={isSubmitting}
                  {...register("productName", {
                    required: "Please enter the item name.",
                    validate: (val) =>
                      String(val).trim().length >= 2 ||
                      "The item name must be at least 2 characters.",
                  })}
                  onInput={(e) => {
                    e.currentTarget.value = e.currentTarget.value.replace(
                      /[^A-Za-z0-9\s&'().\-\[\]{}/,+%#:*_"]/g,
                      "",
                    );
                  }}
                  className={
                    errors.productName ? FORM_INPUT_ERROR_CLS : FORM_INPUT_CLS
                  }
                />
                {errors.productName && (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.productName.message}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Row 2: Item HSN, Select Unit, Add Item Image */}
            {(() => {
              const row2Count =
                (itemSettings.hsnSacCode ? 1 : 0) +
                (itemSettings.itemUnits ? 1 : 0) +
                1;
              const row2ColCls =
                row2Count === 3
                  ? "md:col-span-4"
                  : row2Count === 2
                    ? "md:col-span-6"
                    : "md:col-span-4";
              return (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start">
              {/* Item HSN */}
              {itemSettings.hsnSacCode && (
                <div className={row2ColCls}>
                  <FormLabel>Item HSN</FormLabel>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Enter Item HSN"
                      value={formData.hsnCode || ""}
                      onChange={(e) => {
                        setValue("hsnCode", sanitizeHsnCodeInput(e.target.value));
                      }}
                      className={`${FORM_INPUT_CLS} font-mono`}
                    />
                  </div>
                </div>
              )}

              {/* Select Unit Searchable Dropdown */}
              {itemSettings.itemUnits && (
                <div className={row2ColCls}>
                  <SearchableDropdown
                    label="Unit"
                    required
                    value={formData.unit || ""}
                    onChange={handleUnitChange}
                    options={unitOptions}
                    placeholder="Select Unit"
                    searchPlaceholder="Search Unit by name or code..."
                    addNewButtonLabel="+ Add Custom Unit"
                    onAddNew={() => setIsUnitModalOpen(true)}
                    footerAction={{
                      label: "Configure Base & Secondary Units...",
                      onClick: () => setIsUnitModalOpen(true),
                    }}
                  />
                  <FormError message={fe.errors.unit} showIcon />
                </div>
              )}

              {/* Add Item Image */}
              <div className={row2ColCls}>
                {/* Invisible label keeps the button level with the HSN and Unit inputs, whatever errors show below them */}
                {(itemSettings.hsnSacCode || itemSettings.itemUnits) && (
                  <FormLabel className="hidden md:block invisible" aria-hidden="true">
                    Item Image
                  </FormLabel>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept={PRODUCT_ITEM_IMAGE_ACCEPT}
                  onChange={handleImageUpload}
                  className="hidden"
                />
                {isUploadingImage ? (
                  <div className="w-full h-11 px-3 bg-[#33077C]/5 border border-[#33077C]/20 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-[#33077C]">
                    <Loader2 className="w-4 h-4 animate-spin text-[#33077C]" />
                    <span>Processing image...</span>
                  </div>
                ) : itemImageState || formData.itemImage ? (
                  <div className="min-h-11 flex items-center gap-2">
                    <img
                      src={itemImageState || formData.itemImage}
                      alt="Preview"
                      className="w-10 h-10 object-cover rounded-lg border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-[#33077C] hover:underline font-bold cursor-pointer"
                    >
                      Change Image
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setItemImageState("");
                        setImageFileError(null);
                        setValue("itemImage", "");
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                      className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-11 px-3 bg-white hover:bg-[#33077C]/5 border border-slate-300 hover:border-[#33077C]/40 text-[#33077C] rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
                  >
                    <ImageIcon className="w-4 h-4 text-[#33077C]" />
                    <span>Add Item Image</span>
                  </button>
                )}
                <FormError message={imageFileError || fe.errors.itemImage} showIcon />
                <span className="hidden" {...fieldAttr("itemImage")} />
              </div>
            </div>
              );
            })()}

            {/* PRICING */}
            {(
              <div className="space-y-4 animate-in fade-in duration-100">
                {/* Card 1: Sale Price & Wholesale Price */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
                  <div
                    className={`grid grid-cols-1 ${
                      itemSettings.itemWiseDiscount ? "sm:grid-cols-2" : ""
                    } gap-4`}
                  >
                    {/* Sale Price + Tax Type */}
                    <div className="flex flex-col">
                      <FormLabel>Sale Price</FormLabel>
                      <div className="relative flex items-center h-11 bg-white rounded-xl border border-slate-200 hover:border-slate-300 focus-within:border-[#4309A2] focus-within:ring-4 focus-within:ring-[#4309A2]/10 transition-all">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={formData.salePrice ?? ""}
                          onChange={(e) => {
                            const val = e.target.value
                              .replace(/[^0-9.]/g, "")
                              .replace(/(\..*?)\..*/g, "$1");
                            setValue("salePrice", val, {
                              shouldValidate: isSubmitted,
                            });
                            fe.clearError("salePrice");
                          }}
                          {...fieldAttr("salePrice")}
                          className="flex-1 min-w-0 h-full px-3 sm:px-4 bg-transparent text-xs sm:text-[13px] font-medium text-slate-800 placeholder:text-slate-400 outline-none"
                        />
                        {itemSettings.itemWiseTax && (
                          <select
                            value={formData.salePriceTaxType}
                            onChange={(e) =>
                              setValue(
                                "salePriceTaxType",
                                e.target.value as "Excluded" | "Included",
                              )
                            }
                            className="shrink-0 h-full px-2.5 sm:px-3 bg-slate-50 border-l border-slate-200 text-xs font-medium text-slate-700 outline-none cursor-pointer hover:bg-slate-100 rounded-r-xl"
                          >
                            <option value="Excluded">Without Tax</option>
                            <option value="Included">With Tax</option>
                          </select>
                        )}
                      </div>
                      <FormError message={fe.errors.salePrice} showIcon />
                    </div>

                    {/* Disc. On Sale Price + Disc Type */}
                    {itemSettings.itemWiseDiscount && (
                      <div className="flex flex-col">
                        <FormLabel>Disc. On Sale Price</FormLabel>
                        <div className="relative flex items-center h-11 bg-white rounded-xl border border-slate-200 hover:border-slate-300 focus-within:border-[#4309A2] focus-within:ring-4 focus-within:ring-[#4309A2]/10 transition-all">
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={formData.discountValue ?? ""}
                            onChange={(e) => {
                              const val = e.target.value
                                .replace(/[^0-9.]/g, "")
                                .replace(/(\..*?)\..*/g, "$1");
                              setValue("discountValue", val);
                              fe.clearError("discountValue");
                            }}
                            {...fieldAttr("discountValue")}
                            className="flex-1 min-w-0 h-full px-3 sm:px-4 bg-transparent text-xs sm:text-[13px] font-medium text-slate-800 placeholder:text-slate-400 outline-none"
                          />
                          <select
                            value={formData.discountType}
                            onChange={(e) =>
                              setValue(
                                "discountType",
                                e.target.value as "Percentage" | "Amount",
                              )
                            }
                            className="shrink-0 h-full px-2.5 sm:px-3 bg-slate-50 border-l border-slate-200 text-xs font-medium text-slate-700 outline-none cursor-pointer hover:bg-slate-100 rounded-r-xl"
                          >
                            <option value="Percentage">Percentage</option>
                            <option value="Amount">Amount (₹)</option>
                          </select>
                        </div>
                        <FormError message={fe.errors.discountValue} showIcon />
                      </div>
                    )}
                  </div>

                  {/* Wholesale Price Section */}
                  {formData.itemType === "Product" && itemSettings.wholesalePrice && (
                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-bold text-slate-700">
                          Wholesale Price
                        </span>
                        {formData.hasWholesale ? (
                          <button
                            type="button"
                            onClick={() => {
                              setValue("hasWholesale", false);
                              setValue("wholesalePrice", "");
                              setValue("minWholesaleQty", "");
                            }}
                            className="text-xs font-semibold text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <MinusCircle className="w-3.5 h-3.5 text-slate-400" />
                            <span>Remove</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setValue("hasWholesale", true)}
                            className="text-xs font-bold text-[#33077C] hover:text-[#4309A2] flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 text-[#33077C]" />
                            <span>Add Wholesale Price</span>
                          </button>
                        )}
                      </div>

                      {formData.hasWholesale && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 animate-in fade-in duration-100">
                          {/* Wholesale Price */}
                          <div className="flex flex-col">
                            <FormLabel>Wholesale Price</FormLabel>
                            <div className="relative flex items-center h-11 bg-white rounded-xl border border-slate-200 hover:border-slate-300 focus-within:border-[#4309A2] focus-within:ring-4 focus-within:ring-[#4309A2]/10 transition-all">
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="0.00"
                                value={formData.wholesalePrice ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value
                                    .replace(/[^0-9.]/g, "")
                                    .replace(/(\..*?)\..*/g, "$1");
                                  setValue("wholesalePrice", val);
                                  fe.clearError("wholesalePrice");
                                }}
                                {...fieldAttr("wholesalePrice")}
                                className="flex-1 min-w-0 h-full px-3 sm:px-4 bg-transparent text-xs sm:text-[13px] font-medium text-slate-800 placeholder:text-slate-400 outline-none"
                              />
                              {itemSettings.itemWiseTax && (
                                <select
                                  value={formData.wholesaleTaxType}
                                  onChange={(e) =>
                                    setValue(
                                      "wholesaleTaxType",
                                      e.target.value as "Excluded" | "Included",
                                    )
                                  }
                                  className="shrink-0 h-full px-2.5 sm:px-3 bg-slate-50 border-l border-slate-200 text-xs font-medium text-slate-700 outline-none cursor-pointer hover:bg-slate-100 rounded-r-xl"
                                >
                                  <option value="Excluded">Without Tax</option>
                                  <option value="Included">With Tax</option>
                                </select>
                              )}
                            </div>
                            <FormError message={fe.errors.wholesalePrice} showIcon />
                          </div>

                          {/* Minimum Wholesale Qty */}
                          <div className="flex flex-col">
                            <FormLabel>Min Wholesale Qty</FormLabel>
                            <div className="relative flex items-center h-11 bg-white rounded-xl pr-3 border border-slate-200 hover:border-slate-300 focus-within:border-[#4309A2] focus-within:ring-4 focus-within:ring-[#4309A2]/10 transition-all">
                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder="0"
                                value={formData.minWholesaleQty ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value.replace(
                                    /[^0-9]/g,
                                    "",
                                  );
                                  setValue("minWholesaleQty", val);
                                  fe.clearError("minWholesaleQty");
                                }}
                                {...fieldAttr("minWholesaleQty")}
                                className="flex-1 min-w-0 h-full px-3 sm:px-4 bg-transparent text-xs sm:text-[13px] font-medium text-slate-800 placeholder:text-slate-400 outline-none"
                              />
                              <div
                                title="Minimum order quantity for wholesale pricing to apply"
                                className="text-slate-400 hover:text-[#33077C] cursor-help"
                              >
                                <Info className="w-4 h-4" />
                              </div>
                            </div>
                            <FormError message={fe.errors.minWholesaleQty} showIcon />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card 2 & 3: Purchase Price & Taxes */}
                <div
                  className={`grid grid-cols-1 ${
                    itemSettings.itemWiseTax ? "sm:grid-cols-2" : ""
                  } gap-4`}
                >
                  {/* Purchase Price Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                    <div className="flex flex-col">
                      <FormLabel>Purchase Price</FormLabel>
                      <div className="relative flex items-center h-11 bg-white rounded-xl border border-slate-200 hover:border-slate-300 focus-within:border-[#4309A2] focus-within:ring-4 focus-within:ring-[#4309A2]/10 transition-all">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={formData.purchasePrice ?? ""}
                          onChange={(e) => {
                            const val = e.target.value
                              .replace(/[^0-9.]/g, "")
                              .replace(/(\..*?)\..*/g, "$1");
                            setValue("purchasePrice", val);
                            fe.clearError("purchasePrice");
                          }}
                          {...fieldAttr("purchasePrice")}
                          className="flex-1 min-w-0 h-full px-3 sm:px-4 bg-transparent text-xs sm:text-[13px] font-medium text-slate-800 placeholder:text-slate-400 outline-none"
                        />
                        {itemSettings.itemWiseTax && (
                          <select
                            value={formData.purchasePriceTaxType}
                            onChange={(e) =>
                              setValue(
                                "purchasePriceTaxType",
                                e.target.value as "Excluded" | "Included",
                              )
                            }
                            className="shrink-0 h-full px-2.5 sm:px-3 bg-slate-50 border-l border-slate-200 text-xs font-medium text-slate-700 outline-none cursor-pointer hover:bg-slate-100 rounded-r-xl"
                          >
                            <option value="Excluded">Without Tax</option>
                            <option value="Included">With Tax</option>
                          </select>
                        )}
                      </div>
                      <FormError message={fe.errors.purchasePrice} showIcon />
                    </div>
                  </div>

                  {/* Taxes Card */}
                  {itemSettings.itemWiseTax && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                      <div>
                        <SearchableDropdown
                          label="Taxes"
                          required={
                            formData.salePriceTaxType === "Included" ||
                            formData.purchasePriceTaxType === "Included" ||
                            (!!formData.hasWholesale && formData.wholesaleTaxType === "Included")
                          }
                          error={fe.errors.taxRate}
                          value={formData.taxRate}
                          onChange={(val) => setValue("taxRate", val)}
                          options={taxRateOptions}
                          placeholder="Select Tax Rate"
                          searchPlaceholder="Search Tax Rate (e.g. 18%, Exempted)..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DESCRIPTION (controlled by Item Settings -> Description) */}
            {itemSettings.description && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <FormLabel>Description</FormLabel>
                <textarea
                  rows={2}
                  placeholder="Enter item description..."
                  {...register("description")}
                  className={FORM_TEXTAREA_CLS}
                />
              </div>
            )}

            {/* STOCK (always shown below pricing when Stock maintenance is enabled) */}
            {formData.itemType === "Product" && itemSettings.stockMaintenance && (
              <div className="space-y-4 pt-1 animate-in fade-in duration-100">
                {/* Min Stock To Maintain | Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Min Stock To Maintain */}
                  <div>
                    <FormLabel>Min Stock To Maintain</FormLabel>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={formData.minStockAlert ?? ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        setValue("minStockAlert", val);
                        fe.clearError("minStockAlert");
                      }}
                      {...fieldAttr("minStockAlert")}
                      className={FORM_INPUT_CLS}
                    />
                    <FormError message={fe.errors.minStockAlert} showIcon />
                  </div>

                  {/* Location */}
                  <div>
                    <FormLabel>Location</FormLabel>
                    <input
                      type="text"
                      placeholder="e.g. Warehouse A"
                      value={formData.location ?? ""}
                      onChange={(e) => setValue("location", e.target.value)}
                      className={FORM_INPUT_CLS}
                    />
                  </div>
                </div>

                {/* Batch & Lot Tracking Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
                      <Tag className="w-4.5 h-4.5 text-[#33077C]" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        Batch & Lot Tracking
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Batch/lot number and expiry date tracking for inventory
                        management.
                      </p>
                    </div>
                  </div>

                  {/* Batch Fields */}
                  <div className="pt-3 border-t border-slate-100">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Initial Batch Number */}
                      <div>
                        <FormLabel>Initial Batch No</FormLabel>
                        <BatchPrefixInput
                          value={formData.batchNo}
                          onChange={(v) => {
                            setValue("batchNo", v);
                            fe.clearError("batchNo");
                          }}
                          inputProps={fieldAttr("batchNo") as React.InputHTMLAttributes<HTMLInputElement>}
                          className={FORM_INPUT_CLS}
                        />
                        <FormError message={fe.errors.batchNo} showIcon />
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          Batch code identifier
                        </span>
                      </div>

                      {/* Manufacturing Date */}
                      <div>
                        <FormLabel>Mfg Date</FormLabel>
                        <DateInput
                          value={formData.mfgDate || ""}
                          onChange={(v) => ((e) => {
                            setValue("mfgDate", e.target.value);
                            fe.clearError("expDate");
                            fe.clearError("batchNo");
                          })({ target: { value: v } } as any)}
                        />
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          Manufacturing date
                        </span>
                      </div>

                      {/* Expiry Date */}
                      <div>
                        <FormLabel>Expiry Date</FormLabel>
                        <DateInput
                          value={formData.expDate || ""}
                          onChange={(v) => ((e) => {
                            setValue("expDate", e.target.value);
                            fe.clearError("expDate");
                            fe.clearError("batchNo");
                          })({ target: { value: v } } as any)}
                          {...fieldAttr("expDate")}
                        />
                        <FormError message={fe.errors.expDate} showIcon />
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          Expiry / Best before date
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer matching Image 1 */}
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-white border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 shrink-0">
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
      </div>

      {/* ========================================================================= */}
      {/* SELECT UNIT MODAL                                                         */}
      {/* ========================================================================= */}
      {isUnitModalOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-100"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsUnitModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-xl bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92dvh] animate-in zoom-in-95 duration-100 my-auto">
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4.5 text-white shrink-0"
              style={{ background: "#33077C" }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsUnitModalOpen(false)}
                  className="p-1.5 -ml-1 rounded-xl text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center shrink-0"
                >
                  <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
                </button>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-xl font-bold tracking-tight text-white truncate">
                    Select Unit
                  </h3>
                  <p className="text-xs text-white/80 font-medium truncate mt-0.5">
                    Configure base and secondary units or add custom units
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUnitModalOpen(false)}
                className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 space-y-5 bg-[#fafbfc] flex-1 overflow-y-auto">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Unit Configuration
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Base Unit */}
                  <div>
                    <SearchableDropdown
                      label="Base Unit"
                      required
                      value={selectedBaseUnit}
                      onChange={(val) => setSelectedBaseUnit(val)}
                      options={unitOptions}
                      placeholder="Select Base Unit"
                      searchPlaceholder="Search Base Unit..."
                    />
                  </div>

                  {/* Secondary Unit */}
                  <div>
                    <SearchableDropdown
                      label="Secondary Unit"
                      value={selectedSecondaryUnit}
                      onChange={(val) => setSelectedSecondaryUnit(val)}
                      options={[
                        { value: "None", label: "None" },
                        ...unitOptions,
                      ]}
                      placeholder="Select Secondary Unit"
                      searchPlaceholder="Search Secondary Unit..."
                      allowClear
                      clearLabel="None"
                    />
                  </div>
                </div>
              </div>

              {/* Add Custom Unit Card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
                <div className="text-xs font-bold text-slate-700">
                  Add Custom Unit
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Unit Name (e.g. Kilogram)"
                      value={customUnitName}
                      onChange={(e) => setCustomUnitName(e.target.value)}
                      className={customUnitNameError ? FORM_INPUT_ERROR_CLS : FORM_INPUT_CLS}
                    />
                    <FormError message={customUnitNameError ?? undefined} showIcon />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Short Code (e.g. KG)"
                      value={customUnitShortCode}
                      onChange={(e) => setCustomUnitShortCode(e.target.value)}
                      className={customUnitCodeError ? FORM_INPUT_ERROR_CLS : FORM_INPUT_CLS}
                    />
                    <FormError message={customUnitCodeError ?? undefined} showIcon />
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isCreatingUnit}
                  onClick={handleAddCustomUnit}
                  className="px-4 py-2 bg-[#33077C]/10 text-[#33077C] hover:bg-[#33077C]/20 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {isCreatingUnit ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>Create Custom Unit</span>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-white border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsUnitModalOpen(false)}
                className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUnit}
                className="h-10 px-5 rounded-xl bg-[#33077C] text-white text-xs font-bold shadow-md hover:bg-[#4309A2] transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODALS: ADD CATEGORY & ADD SUBCATEGORY                                */}
      {/* ========================================================================= */}
      {isAddCategoryModalOpen && (
        <AddCategoryModal
          isOpen={isAddCategoryModalOpen}
          onClose={() => setIsAddCategoryModalOpen(false)}
          onCategoryCreated={(createdCat: any) => {
            const catName =
              createdCat.name || createdCat.categoryName || "";
            if (catName) {
              setCategories((prev) => [createdCat as ApiCategory, ...prev]);
              setValue("category", catName, { shouldValidate: isSubmitted });
              setValue("subcategory", "");
            }
            loadCategories();
          }}
        />
      )}

      {isAddSubcategoryModalOpen && (
        <AddSubcategoryModal
          isOpen={isAddSubcategoryModalOpen}
          onClose={() => setIsAddSubcategoryModalOpen(false)}
          initialCategory={formData.category}
          categories={categories.map(
            (c) => c.name || (c as any).categoryName || "",
          )}
          onSubcategoryCreated={(createdSub: any) => {
            const subName =
              createdSub.subcategory ||
              createdSub.name ||
              createdSub.subcategoryName ||
              "";
            if (subName) {
              setSubcategories((prev) => [createdSub, ...prev]);
              setValue("subcategory", subName, { shouldValidate: isSubmitted });
            }
            loadSubcategories();
          }}
        />
      )}
      <ItemSettingsModal
        isOpen={isItemSettingsOpen}
        onClose={() => setIsItemSettingsOpen(false)}
        settings={itemSettings}
        onChange={setItemSettings}
        unitOptions={allAvailableUnits.map((u) => ({
          id: u.id,
          label: formatUnitOption(u),
        }))}
      />
    </>
  );
};
