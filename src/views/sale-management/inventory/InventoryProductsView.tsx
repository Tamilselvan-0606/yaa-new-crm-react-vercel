import {
  CommonTableHead,
  CommonTableTh,
} from "../../../components/common/CommonTableHead";
import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
} from "react";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  MoreVertical,
  X,
  Check,
  Ban,
  Download,
  Search,
  Image as ImageIcon,
  Info,
  MinusCircle,
  Boxes,
  Layers,
  IndianRupee,
  AlertTriangle,
  ChevronDown,
  Sparkles,
  Layers3,
  SlidersHorizontal,
  Filter,
  Play,
  RotateCcw,
  Save,
  ArrowLeft,
  FileSpreadsheet,
  Loader2,
  Eye,
  AlertCircle,
  Tag,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { SearchBar } from "../../../components/common/SearchBar";
import { FilterDropdown } from "../../../components/common/FilterDropdown";
import { Button } from "../../../components/common/Button";
import { Pagination } from "../../../components/common/Pagination";
import { exportTableToExcel } from "../../../utils/excelExport";
import { toast } from "../../../utils/toast";
import { SaleActionDropdown } from "../utils/SaleActionDropdown";
import { DeleteConfirmationModal } from "../../../components/common/DeleteConfirmationModal";
import {
  baseClient,
  productApi,
  mapApiProductToProductItem,
  cleanProductImage,
  ApiProduct,
  CreateProductPayload,
  UpdateProductPayload,
  categoryApi,
  subcategoryApi,
  ApiSubcategory,
  unitApi,
  resolveBaseUnitId,
  ApiUnit,
  mapApiUnitToUnitItem,
  BulkProductCommonRow,
  BulkProductPricingRow,
  BulkProductStockRow,
  BulkProductItemInfoRow,
  BulkUpdateProductsPayload,
} from "../../../api";
import type { ProductListSummary } from "../../../api/commerce/productTypes";
import {
  FormLabel,
  FORM_INPUT_CLS,
  FORM_INPUT_ERROR_CLS,
  FORM_SELECT_CLS,
  FORM_TEXTAREA_CLS,
  handleNonNegativeKeyDown,
} from "../utils/formUtils";
import { AddCategoryModal } from "./AddCategoryModal";
import { AddSubcategoryModal } from "./AddSubcategoryModal";
import { FormError } from "../../../components/common/FormError";
import {
  useSubmitGuard,
  collectErrors,
  checkRequiredSelection,
  checkMoney,
  checkNotGreaterThan,
  checkPercent,
  checkNumber,
  checkDateNotBefore,
  extractApiFieldErrors,
  getApiErrorMessage,
} from "../../../utils/formValidation";

// Standard Industry Master Units (empty - units strictly loaded from live API)
export const DEFAULT_COMMERCE_UNITS: Array<{
  id: string;
  name: string;
  shortCode: string;
  status: number;
}> = [];

export interface ProductFormValues {
  itemType: "Product" | "Service";
  productCode: string;
  productName: string;
  description?: string;
  hsnCode: string;
  unit: string;
  baseUnitId?: string;
  secondaryUnitId?: string | null;
  secondaryUnit?: string;
  category: string;
  subcategory?: string;
  itemImage: string;
  salePrice: string | number;
  salePriceTaxType: "Excluded" | "Included";
  discountValue: string | number;
  discountType: "Percentage" | "Amount";
  hasWholesale: boolean;
  wholesalePrice: string | number;
  wholesaleTaxType: "Excluded" | "Included";
  minWholesaleQty: string | number;
  purchasePrice: string | number;
  purchasePriceTaxType: "Excluded" | "Included";
  taxRate: string;
  openingStock: string | number;
  atPrice: string | number;
  asOfDate: string;
  minStockAlert: string | number;
  location: string;
  isBatchTracking: boolean;
  batchNo?: string;
  mfgDate?: string;
  expDate?: string;
}

export const defaultProductFormValues: ProductFormValues = {
  itemType: "Product",
  productCode: "",
  productName: "",
  hsnCode: "",
  unit: "",
  baseUnitId: undefined,
  secondaryUnitId: undefined,
  secondaryUnit: undefined,
  category: "",
  subcategory: "",
  itemImage: "",
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
  openingStock: "",
  atPrice: "",
  asOfDate: new Date().toISOString().split("T")[0],
  minStockAlert: "",
  location: "",
  isBatchTracking: false,
  batchNo: "",
  mfgDate: "",
  expDate: "",
};

export interface ProductItem {
  id: string;
  sNo: number;
  itemType: "Product" | "Service";
  productCode: string;
  productName: string;
  description?: string;
  hsnCode: string;
  unit: string;
  baseUnitId?: string;
  secondaryUnitId?: string | null;
  secondaryUnit?: string;
  category: string;
  subcategory?: string;
  itemImage?: string;
  image?: string;
  imageBase64?: string;

  // Pricing
  salePrice: number;
  salePriceTaxType: "Excluded" | "Included";
  discountValue: number;
  discountType: "Percentage" | "Amount";

  // Wholesale
  hasWholesale: boolean;
  wholesalePrice: number;
  wholesaleTaxType: "Excluded" | "Included";
  minWholesaleQty: number;

  // Purchase & Tax
  purchasePrice: number;
  purchasePriceTaxType: "Excluded" | "Included";
  taxRate: string;

  // Stock
  openingStock: number;
  currentStock?: number;
  inStock?: number;
  atPrice: number;
  asOfDate: string;
  minStockAlert: number;
  location?: string;

  // Batch Tracking
  isBatchTracking?: boolean;
  batchNo?: string;
  mfgDate?: string;
  expDate?: string;

  status: "Active" | "Inactive";
}

const TAX_RATE_OPTIONS = [
  { label: "None", value: "None" },
  { label: "Exempted", value: "Exempted" },
  { label: "GST @ 0%", value: "GST @ 0%" },
  { label: "GST @ 0.1%", value: "GST @ 0.1%" },
  { label: "GST @ 0.25%", value: "GST @ 0.25%" },
  { label: "GST @ 1.5%", value: "GST @ 1.5%" },
  { label: "GST @ 3%", value: "GST @ 3%" },
  { label: "GST @ 5%", value: "GST @ 5%" },
  { label: "GST @ 12%", value: "GST @ 12%" },
  { label: "GST @ 18%", value: "GST @ 18%" },
  { label: "GST @ 28%", value: "GST @ 28%" },
  { label: "GST @ 40%", value: "GST @ 40%" },
  { label: "GST @ 28% + Cess", value: "GST @ 28% + Cess" },
];

const COMMON_HSN_CODES = [
  { code: "1006", desc: "Rice & Basmati Grain" },
  { code: "1101", desc: "Wheat Flour & Atta / Maida" },
  { code: "0713", desc: "Dried Legumes, Toor Dal, Moong Dal" },
  { code: "1512", desc: "Sunflower & Edible Refined Oils" },
  { code: "0405", desc: "Butter, Pure Cow Ghee & Dairy Spreads" },
  { code: "0902", desc: "Tea, Black Tea & Green Tea" },
  { code: "0901", desc: "Coffee, Roasted Coffee Beans" },
  { code: "1902", desc: "Instant Noodles, Pasta & Macaroni" },
  { code: "1701", desc: "Cane Sugar & Refined White Sugar" },
  { code: "2501", desc: "Iodized Cooking Salt & Rock Salt" },
  { code: "3402", desc: "Washing Powder, Liquid Detergent & Soaps" },
];

// =========================================================================
// PRODUCT THUMBNAIL WITH RESILIENT FALLBACK COMPONENT & PERSISTENT CACHE
// =========================================================================
const PRODUCT_IMAGE_CACHE_PREFIX = "crm_prod_img_";

export const saveProductImageToCache = (
  key?: string | null,
  dataUrl?: string | null,
) => {
  if (!key || !dataUrl) return;
  const cleanUrl = dataUrl.trim();
  if (!cleanUrl || cleanUrl === "null" || cleanUrl === "undefined") return;
  try {
    const cleanKey = key.trim();
    if (!cleanKey) return;
    localStorage.setItem(`${PRODUCT_IMAGE_CACHE_PREFIX}${cleanKey}`, cleanUrl);
  } catch (e) {
    // Quota exceeded or storage restricted
  }
};

export const getProductImageFromCache = (
  ...keys: Array<string | null | undefined>
): string | undefined => {
  for (const key of keys) {
    if (!key || typeof key !== "string") continue;
    const cleanKey = key.trim();
    if (!cleanKey) continue;
    try {
      const cached = localStorage.getItem(
        `${PRODUCT_IMAGE_CACHE_PREFIX}${cleanKey}`,
      );
      if (
        cached &&
        cached !== "null" &&
        cached !== "undefined" &&
        (cached.startsWith("data:") ||
          cached.startsWith("http") ||
          cached.startsWith("/") ||
          cached.startsWith("blob:"))
      ) {
        return cached;
      }
    } catch (e) {
      // Storage access error
    }
  }
  return undefined;
};

interface ProductThumbnailProps {
  src?: string | null;
  fallbackSrc?: string | null;
  alt: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  productId?: string;
  productCode?: string;
}

const ProductThumbnail: React.FC<ProductThumbnailProps> = ({
  src,
  fallbackSrc,
  alt,
  size = "sm",
  className,
  productId,
  productCode,
}) => {
  const [currentSrc, setCurrentSrc] = useState<string | null>(src || null);
  const [triedFallback, setTriedFallback] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // If src is an S3 URL or external URL, check if we have a locally cached data URI first
    const cached = getProductImageFromCache(productId, productCode, src);
    if (cached && src && !src.startsWith("data:")) {
      setCurrentSrc(cached);
      setTriedFallback(true);
      setHasError(false);
      return;
    }
    setCurrentSrc(src || null);
    setTriedFallback(false);
    setHasError(false);
  }, [src, productId, productCode]);

  const handleImageError = () => {
    // 1. If we have fallbackSrc that is different, try that
    if (
      !triedFallback &&
      fallbackSrc &&
      fallbackSrc !== currentSrc &&
      fallbackSrc.trim() !== ""
    ) {
      setTriedFallback(true);
      setCurrentSrc(fallbackSrc);
      return;
    }

    // 2. Check local persistent image cache
    const cached = getProductImageFromCache(
      productId,
      productCode,
      src,
      currentSrc,
    );
    if (!triedFallback && cached && cached !== currentSrc) {
      setTriedFallback(true);
      setCurrentSrc(cached);
      return;
    }

    setHasError(true);
  };

  const isValid = Boolean(
    currentSrc &&
    typeof currentSrc === "string" &&
    currentSrc.trim() !== "" &&
    currentSrc !== "null" &&
    currentSrc !== "undefined" &&
    currentSrc !== "[object Object]" &&
    currentSrc !== "None" &&
    currentSrc !== "none",
  );

  const sizeClasses = {
    sm: "w-8 h-8 rounded-lg",
    md: "w-11 h-11 rounded-xl",
    lg: "w-16 h-16 rounded-xl",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-8 h-8",
  };

  if (!isValid || hasError) {
    return (
      <div
        className={`${sizeClasses[size]} bg-[#33077C]/10 flex items-center justify-center text-[#33077C] shrink-0 font-bold border border-[#33077C]/10 select-none`}
        title={alt}
      >
        <Package className={`${iconSizes[size]} text-[#33077C]`} />
      </div>
    );
  }

  return (
    <img
      src={currentSrc!}
      alt={alt}
      onError={handleImageError}
      loading="lazy"
      className={
        className ||
        `${sizeClasses[size]} object-cover border border-slate-200 shrink-0`
      }
    />
  );
};

/**
 * Automatically downsizes and compresses large image files to prevent 413 Payload Too Large,
 * reduce base64 footprint and ensure fast upload and rendering.
 */
const compressImageFile = (
  file: File,
  maxWidth = 1024,
  maxHeight = 1024,
  quality = 0.85,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (file.type === "image/svg+xml") {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const outputType =
          file.type === "image/png" ? "image/png" : "image/jpeg";
        const compressedBase64 = canvas.toDataURL(outputType, quality);
        resolve(compressedBase64);
      };
      img.onerror = () => {
        reject(
          new Error(
            "Selected file could not be decoded as an image. Please choose a valid image.",
          ),
        );
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// =========================================================================
// CUSTOM CATEGORY SELECT COMPONENT
// =========================================================================
export interface CategorySelectProps {
  value: string;
  onChange: (val: string) => void;
  categories: string[];
  onOpenAddCategoryModal: () => void;
  required?: boolean;
  error?: string;
}

export const CategorySelectField: React.FC<CategorySelectProps> = ({
  value,
  onChange,
  categories,
  onOpenAddCategoryModal,
  required = false,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutside);
    };
  }, [isOpen]);

  const filteredCategories = categories.filter((c) =>
    c.toLowerCase().includes(searchQuery.toLowerCase().trim()),
  );

  return (
    <div ref={dropdownRef} className="relative w-full">
      <FormLabel required={required}>Category</FormLabel>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-full h-11 px-4 bg-white rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
          isOpen
            ? "border-[#4309A2] ring-4 ring-[#4309A2]/10"
            : error
              ? "border-rose-400 ring-2 ring-rose-100"
              : value
                ? "border-slate-300 hover:border-slate-400"
                : "border-slate-200 hover:border-slate-300"
        }`}
      >
        {/* Selected value or placeholder */}
        <span
          className={`text-xs sm:text-[13px] font-medium truncate ${value ? "text-slate-900 font-semibold" : "text-slate-400"}`}
        >
          {value || "Select Category"}
        </span>

        {/* Arrow (Triangle Up / Down) */}
        <span className="text-[10px] text-slate-500 font-black ml-2 transition-transform select-none">
          {isOpen ? "▲" : "▼"}
        </span>
      </div>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full min-w-0 sm:min-w-[260px] max-w-[calc(100vw-2.5rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          {/* 1. Search Pill Input */}
          <div className="relative mb-2">
            <div className="flex items-center w-full h-9 px-3 bg-white border border-slate-200 rounded-full focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/10 transition-all shadow-2xs">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search Category"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-slate-400 hover:text-slate-600 p-0.5 ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 2. Add New Category Action - Opens CategoryView Modal */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onOpenAddCategoryModal();
            }}
            className="w-full px-3 py-2 text-left text-xs font-bold text-[#33077C] hover:bg-[#33077C]/10 rounded-xl flex items-center gap-2 transition-colors cursor-pointer mb-1"
          >
            <Plus className="w-4 h-4 text-[#33077C] stroke-[2.5]" />
            <span>+ Add New Category</span>
          </button>

          {/* 3. Category Checkbox List */}
          <div className="max-h-48 overflow-y-auto space-y-1 p-0.5">
            {filteredCategories.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400 font-medium">
                No categories found
              </div>
            ) : (
              filteredCategories.map((cat) => {
                const isSelected = value === cat;
                return (
                  <div
                    key={cat}
                    onClick={() => {
                      onChange(isSelected ? "" : cat);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs font-medium flex items-center gap-2.5 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-[#33077C]/10 text-[#33077C] font-bold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {/* Checkbox Box */}
                    <div
                      className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all shrink-0 ${
                        isSelected
                          ? "border-[#33077C] bg-[#33077C] text-white"
                          : "border-slate-400 bg-white hover:border-[#33077C]"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>

                    <span className="truncate">{cat}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// CUSTOM SUBCATEGORY SELECT COMPONENT
// =========================================================================
export interface SubcategorySelectProps {
  value?: string;
  onChange: (val: string) => void;
  category: string;
  subcategories: string[];
  onOpenAddSubcategoryModal: () => void;
  required?: boolean;
  error?: string;
}

export const SubcategorySelectField: React.FC<SubcategorySelectProps> = ({
  value,
  onChange,
  category,
  subcategories,
  onOpenAddSubcategoryModal,
  required = false,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutside);
    };
  }, [isOpen]);

  const filteredSubcategories = useMemo(() => {
    const list = [...subcategories];
    if (value && !list.includes(value)) {
      list.unshift(value);
    }
    return list.filter((s) =>
      s.toLowerCase().includes(searchQuery.toLowerCase().trim()),
    );
  }, [subcategories, value, searchQuery]);

  return (
    <div ref={dropdownRef} className="relative w-full">
      <FormLabel required={required}>Subcategory</FormLabel>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-full h-11 px-4 bg-white rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
          isOpen
            ? "border-[#4309A2] ring-4 ring-[#4309A2]/10"
            : error
              ? "border-rose-400 ring-2 ring-rose-100"
              : value
                ? "border-slate-300 hover:border-slate-400"
                : "border-slate-200 hover:border-slate-300"
        }`}
      >
        {/* Selected value or placeholder */}
        <span
          className={`text-xs sm:text-[13px] font-medium truncate ${value ? "text-slate-900 font-semibold" : "text-slate-400"}`}
        >
          {value || "Select Subcategory"}
        </span>

        {/* Arrow / Clear */}
        <div className="flex items-center gap-1 shrink-0 ml-1">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="p-0.5 text-slate-400 hover:text-rose-500 rounded-full cursor-pointer transition-colors"
              title="Clear Subcategory"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <span className="text-[10px] text-slate-500 font-black transition-transform select-none">
            {isOpen ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full min-w-0 sm:min-w-[260px] max-w-[calc(100vw-2.5rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          {/* 1. Search Pill Input */}
          <div className="relative mb-2">
            <div className="flex items-center w-full h-9 px-3 bg-white border border-slate-200 rounded-full focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/10 transition-all shadow-2xs">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search Subcategory"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-slate-400 hover:text-slate-600 p-0.5 ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 2. Add New Subcategory Action - Opens SubcategoryView Modal */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onOpenAddSubcategoryModal();
            }}
            className="w-full px-3 py-2 text-left text-xs font-bold text-[#33077C] hover:bg-[#33077C]/10 rounded-xl flex items-center gap-2 transition-colors cursor-pointer mb-1"
          >
            <Plus className="w-4 h-4 text-[#33077C] stroke-[2.5]" />
            <span>+ Add New Subcategory</span>
          </button>

          {/* 3. Subcategory Checkbox List */}
          <div className="max-h-48 overflow-y-auto space-y-1 p-0.5">
            {filteredSubcategories.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400 font-medium">
                {subcategories.length === 0
                  ? `No subcategories in master for "${category || "selected category"}"`
                  : "No subcategories match search"}
              </div>
            ) : (
              filteredSubcategories.map((sub) => {
                const isSelected = value === sub;
                return (
                  <div
                    key={sub}
                    onClick={() => {
                      onChange(isSelected ? "" : sub);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs font-medium flex items-center gap-2.5 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-[#33077C]/10 text-[#33077C] font-bold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {/* Checkbox Box */}
                    <div
                      className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all shrink-0 ${
                        isSelected
                          ? "border-[#33077C] bg-[#33077C] text-white"
                          : "border-slate-400 bg-white hover:border-[#33077C]"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>

                    <span className="truncate">{sub}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const InventoryProductsView: React.FC = () => {
  // Categories List State (dynamically populated via commerce category API)
  const [categories, setCategories] = useState<string[]>([]);

  // Master Subcategories List State (dynamically populated via commerce subcategory master API)
  const [masterSubcategories, setMasterSubcategories] = useState<
    ApiSubcategory[]
  >([]);

  // Products collection - initialized empty (zero mock data)
  const [products, setProducts] = useState<ProductItem[]>([]);

  // Loading & API State
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const saveGuard = useSubmitGuard();
  const toggleGuard = useSubmitGuard();
  const deleteGuard = useSubmitGuard();
  const bulkStatusGuard = useSubmitGuard();
  const bulkUpdateGuard = useSubmitGuard();
  const unitGuard = useSubmitGuard();
  const [isApiConnected, setIsApiConnected] = useState<boolean | null>(null);
  const [totalApiRecords, setTotalApiRecords] = useState<number | null>(null);
  const [apiSummary, setApiSummary] = useState<ProductListSummary | null>(null);
  const [totalApiPages, setTotalApiPages] = useState<number | null>(null);

  // Request Deduplication Refs
  const requestSeqRef = useRef(0); // latest request wins; a superseded response is ignored
  const lastFetchKeyRef = useRef<string | null>(null);
  const isFetchingCategoriesRef = useRef(false);
  const isFetchingSubcategoriesRef = useRef(false);

  // Detail Modal State (GET /commerce/products/:id)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedProductDetail, setSelectedProductDetail] =
    useState<ApiProduct | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Delete Confirmation State
  const [deleteConfirmItem, setDeleteConfirmItem] =
    useState<ProductItem | null>(null);
  const [deleteProductError, setDeleteProductError] = useState<string | null>(
    null,
  );

  // Selected row IDs for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Split Button Dropdown Menu State
  const [isBulkMenuOpen, setIsBulkMenuOpen] = useState(false);
  const bulkMenuRef = useRef<HTMLDivElement>(null);

  // Quick Unit Modal
  const [isBulkUnitModalOpen, setIsBulkUnitModalOpen] = useState(false);
  const [selectedBulkUnit, setSelectedBulkUnit] = useState("PCS");

  // =========================================================================
  // FULL "BULK UPDATE ITEMS" SCREEN/MODAL STATE (MATCHING SCREENSHOT)
  // =========================================================================
  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);
  const [bulkTab, setBulkTab] = useState<
    "Pricing" | "Stock" | "Item Information"
  >("Pricing");
  const [bulkSearch, setBulkSearch] = useState("");
  const [bulkItems, setBulkItems] = useState<ProductItem[]>([]);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<string[]>([]);
  const [batchTaxSlab, setBatchTaxSlab] = useState("GST @ 18%");
  const [batchTaxDropdownOpen, setBatchTaxDropdownOpen] = useState(false);
  const [isBulkStatusLoading, setIsBulkStatusLoading] = useState(false);
  const [isSavingBulkUpdate, setIsSavingBulkUpdate] = useState(false);
  const [bulkRowErrors, setBulkRowErrors] = useState<
    Record<string, { productCode?: string; field?: string; message: string }>
  >({});
  const [bulkSubmitAttempted, setBulkSubmitAttempted] = useState(false);

  // Search & Filter State
  const [pendingSearch, setPendingSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [pendingCategory, setPendingCategory] = useState("ALL");
  const [appliedCategory, setAppliedCategory] = useState("ALL");
  const [pendingType, setPendingType] = useState("ALL");
  const [appliedType, setAppliedType] = useState("ALL");
  const [pendingStatus, setPendingStatus] = useState("ALL");
  const [appliedStatus, setAppliedStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Derive category options for filter from loaded products combined with any fetched master categories
  const filterCategoryOptions = useMemo(() => {
    const set = new Set<string>(categories);
    products.forEach((p) => {
      const c = p.category?.trim();
      if (c && c !== "---" && c !== "ALL") {
        set.add(c);
      }
    });
    return Array.from(set);
  }, [categories, products]);

  /**
   * Master API Loader with strict deduplication guards to ensure zero redundant calls
   * Query parameters are only requested when applied
   */
  const loadProducts = useCallback(
    async (
      forceRefresh = false,
      overrides?: {
        search?: string;
        category?: string;
        itemType?: string;
        status?: string;
        page?: number;
      }
    ) => {
      const targetPage = overrides?.page ?? page;
      const targetSearch = overrides?.search !== undefined ? overrides.search : appliedSearch;
      const targetCategory = overrides?.category !== undefined ? overrides.category : appliedCategory;
      const targetType = overrides?.itemType !== undefined ? overrides.itemType : appliedType;
      const targetStatus = overrides?.status !== undefined ? overrides.status : appliedStatus;
      const fetchKey = `${targetPage}_${pageSize}_${targetSearch.trim()}_${targetCategory}_${targetType}_${targetStatus}`;

      // Skip redundant re-fetching of identical parameters
      if (!forceRefresh && lastFetchKeyRef.current === fetchKey) return;

      const seq = ++requestSeqRef.current;
      lastFetchKeyRef.current = fetchKey;
      setIsLoading(true);

      try {
        const prodResult = await productApi.getProducts({
          page_no: targetPage,
          page_size: pageSize,
          pagination_required: true,
          search: targetSearch.trim() || undefined,
          sortOrder: "desc",
          status: targetStatus !== "ALL" ? targetStatus : undefined,
          category: targetCategory !== "ALL" ? targetCategory : undefined,
          itemType:
            targetType !== "ALL"
              ? (targetType as "Product" | "Service")
              : undefined,
        });
        if (seq !== requestSeqRef.current) return;

        if (prodResult?.success && Array.isArray(prodResult.data)) {
          const mapped = prodResult.data.map((item, idx) => {
            return mapApiProductToProductItem(
              item,
              (targetPage - 1) * pageSize + idx,
            );
          });
          // Cache product images for cross-module consistency (e.g. StocksView)
          mapped.forEach((p) => {
            const effImg =
              p.itemImage || (p as any).image || (p as any).imageBase64;
            if (effImg) {
              if (p.id) saveProductImageToCache(p.id, effImg);
              if (p.productCode) saveProductImageToCache(p.productCode, effImg);
              if ((p as any).sku)
                saveProductImageToCache((p as any).sku, effImg);
            }
          });
          setProducts(mapped);
          setIsApiConnected(true);
          if (prodResult.summary) setApiSummary(prodResult.summary);
          if (prodResult.pagination) {
            setTotalApiRecords(prodResult.pagination.totalRecords);
            setTotalApiPages(prodResult.pagination.totalPages);
          }
        } else {
          setIsApiConnected(false);
        }
      } catch (err: any) {
        console.warn(
          "Commerce Product API call failed, falling back to local state:",
          err?.message || err,
        );
        if (seq === requestSeqRef.current) {
          setIsApiConnected(false);
          lastFetchKeyRef.current = null; // allow a retry of the same parameters
        }
      } finally {
        if (seq === requestSeqRef.current) setIsLoading(false);
      }
    },
    [
      page,
      pageSize,
      appliedSearch,
      appliedCategory,
      appliedType,
      appliedStatus,
    ],
  );

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  /**
   * Fetch live categories to populate dropdowns in Add/Edit modal and filter (strictly on-demand)
   */
  const fetchLiveCategories = useCallback(async () => {
    if (isFetchingCategoriesRef.current) return;
    isFetchingCategoriesRef.current = true;
    try {
      const res = await categoryApi.getCategories({
        pagination_required: false,
        sortOrder: "asc",
      });
      if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
        const catNames = res.data
          .map((c) => c.categoryName || c.name || "")
          .filter((n) => n.trim() !== "");
        if (catNames.length > 0) {
          setCategories(Array.from(new Set(catNames)));
        }
      }
    } catch (err) {
      // Fallback to default categories
    } finally {
      isFetchingCategoriesRef.current = false;
    }
  }, []);

  /**
   * Fetch live subcategories from the separate Subcategory master (strictly on-demand)
   */
  const fetchLiveSubcategories = useCallback(async () => {
    if (isFetchingSubcategoriesRef.current) return;
    isFetchingSubcategoriesRef.current = true;
    try {
      const res = await subcategoryApi.getSubcategories({
        pagination_required: false,
        sortOrder: "asc",
      });
      if (res?.success && Array.isArray(res.data)) {
        setMasterSubcategories(res.data);
      }
    } catch (err) {
      // Keep existing subcategories
    } finally {
      isFetchingSubcategoriesRef.current = false;
    }
  }, []);

  // Open Details Modal (GET /commerce/products/:id)
  const handleOpenDetailModal = async (prod: ProductItem) => {
    setActiveDropdownId(null);
    setDropdownPos(null);
    setIsDetailModalOpen(true);
    setIsLoadingDetail(true);
    setSelectedProductDetail(null);

    try {
      const res = await productApi.getProductById(prod.id);
      if (res?.success && res.data) {
        const d = res.data;
        const effImg =
          d.itemImage ||
          d.image ||
          d.imageBase64 ||
          prod.itemImage ||
          prod.image ||
          prod.imageBase64;
        setSelectedProductDetail({
          ...d,
          itemImage: effImg,
          image: effImg,
          imageBase64: effImg,
        });
        return;
      }
    } catch (apiErr: any) {
      console.warn(
        "Product detail API failed, falling back to basic view:",
        apiErr,
      );
    } finally {
      setIsLoadingDetail(false);
    }

    // Local fallback for details
    const effImg = prod.itemImage || prod.image || prod.imageBase64;
    setSelectedProductDetail({
      id: prod.id,
      organizationId: "",
      sNo: prod.sNo,
      itemType: prod.itemType,
      productCode: prod.productCode,
      productName: prod.productName,
      hsnCode: prod.hsnCode,
      unit: prod.unit,
      category: prod.category,
      subcategory: prod.subcategory,
      itemImage: effImg,
      image: effImg,
      imageBase64: effImg,
      salePrice: prod.salePrice,
      salePriceTaxType: prod.salePriceTaxType,
      discountValue: prod.discountValue,
      discountType: prod.discountType,
      hasWholesale: prod.hasWholesale,
      wholesalePrice: prod.wholesalePrice,
      wholesaleTaxType: prod.wholesaleTaxType,
      minWholesaleQty: prod.minWholesaleQty,
      purchasePrice: prod.purchasePrice,
      purchasePriceTaxType: prod.purchasePriceTaxType,
      taxRate: prod.taxRate,
      openingStock: prod.openingStock,
      atPrice: prod.atPrice,
      asOfDate: prod.asOfDate,
      minStockAlert: prod.minStockAlert,
      location: prod.location,
      status: prod.status,
      stockBatches: [],
    });
  };

  // Toggle Product Status (PATCH /commerce/products/:id)
  const handleToggleStatus = (item: ProductItem) =>
    toggleGuard.runOnce(async () => {
      const nextStatus = item.status === "Active" ? "Inactive" : "Active";
      setActiveDropdownId(null);
      setDropdownPos(null);

      if (checkRequiredSelection(item?.id, "product")) {
        toast.error(
          "This product could not be identified. Please refresh and try again.",
        );
        return;
      }

      try {
        const res = await productApi.patchProduct(item.id, {
          status: nextStatus,
        });
        if (res?.success) {
          setProducts((prev) =>
            prev.map((p) =>
              p.id === item.id ? { ...p, status: nextStatus } : p,
            ),
          );
          toast.success(`Product "${item.productName}" set to ${nextStatus}.`);
          return;
        }
        toast.error(
          "The product status could not be updated. Please try again.",
        );
      } catch (apiErr: any) {
        // Do not pretend the change succeeded when the server rejected it.
        console.warn("Remote product status patch failed:", apiErr);
        toast.error(
          getApiErrorMessage(
            apiErr,
            "The product status could not be updated. Please try again.",
          ),
        );
      }
    });

  // Confirm and Execute Delete (DELETE /commerce/products/:id)
  const handleConfirmDelete = () =>
    deleteGuard.runOnce(async () => {
      if (!deleteConfirmItem) return;
      const { id, productName } = deleteConfirmItem;
      if (checkRequiredSelection(id, "product")) {
        setDeleteProductError(
          "This product could not be identified. Please refresh and try again.",
        );
        return;
      }
      setIsDeleting(true);
      setDeleteProductError(null);

      try {
        const res = await productApi.deleteProduct(id);
        if (res?.success) {
          setProducts((prev) => prev.filter((p) => p.id !== id));
          setTotalApiRecords((prev) =>
            prev !== null && prev > 0 ? prev - 1 : prev,
          );
          toast.success(`Product "${productName}" deleted successfully.`);
          setDeleteConfirmItem(null);
          setDeleteProductError(null);
          return;
        } else {
          const errorMsg = (res as any)?.message || "Failed to delete product.";
          setDeleteProductError(errorMsg);
          toast.error(errorMsg);
        }
      } catch (apiErr: any) {
        console.warn("Remote product delete failed:", apiErr);
        const errorMsg = getApiErrorMessage(
          apiErr,
          "Failed to delete product. Please try again.",
        );
        setDeleteProductError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setIsDeleting(false);
      }
    });

  // 3-Dots Action Dropdown State
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(
    null,
  );
  const isAtPriceManuallyEdited = useRef(false);

  // Secondary sub-modals for Unit & HSN search
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [selectedBaseUnit, setSelectedBaseUnit] = useState("");
  const [selectedSecondaryUnit, setSelectedSecondaryUnit] = useState("None");
  const [unitSearchQuery, setUnitSearchQuery] = useState("");
  const [customUnitCode, setCustomUnitCode] = useState("");
  const [isHsnModalOpen, setIsHsnModalOpen] = useState(false);
  const [hsnSearchQuery, setHsnSearchQuery] = useState("");

  // Live Units from Commerce API
  const [apiUnits, setApiUnits] = useState<ApiUnit[]>([]);
  const [isLoadingUnits, setIsLoadingUnits] = useState(false);
  const [isCreatingUnit, setIsCreatingUnit] = useState(false);
  const [deletingUnitId, setDeletingUnitId] = useState<string | null>(null);

  // Helper to format unit object to dropdown string format e.g. "PIECES (Pcs)"
  const formatUnitOption = useCallback(
    (u: ApiUnit | { name: string; shortCode?: string; code?: string }) => {
      const short = u.shortCode || (u as any).code || "";
      const name = u.name || (u as any).unitName || "";
      if (!name) return short ? short.toUpperCase() : "";
      return short ? `${name.toUpperCase()} (${short})` : name.toUpperCase();
    },
    [],
  );

  // Master units strictly loaded from live Commerce API
  const allAvailableUnits = useMemo<ApiUnit[]>(() => {
    return apiUnits;
  }, [apiUnits]);

  // Combined Units list string options
  const allUnitsList = useMemo(() => {
    const list: string[] = ["None"];
    allAvailableUnits.forEach((u) => {
      const formatted = formatUnitOption(u);
      if (!list.includes(formatted)) {
        list.push(formatted);
      }
    });
    return list;
  }, [allAvailableUnits, formatUnitOption]);

  // Master Loader for Commerce Units
  const loadUnits = useCallback(async () => {
    try {
      setIsLoadingUnits(true);
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
      if (list.length > 0) {
        setApiUnits(list);
        const currentVals = getValues();
        if (!currentVals.baseUnitId) {
          const matched =
            list.find(
              (u) =>
                u.shortCode?.toUpperCase() === "PCS" ||
                u.name?.toUpperCase().includes("PIECE") ||
                (currentVals.unit &&
                  (u.shortCode?.toUpperCase() === currentVals.unit.toUpperCase() ||
                    u.name?.toUpperCase() === currentVals.unit.toUpperCase())),
            ) || list[0];
          if (matched) {
            setValue("baseUnitId", matched.id);
            if (!currentVals.unit) setValue("unit", matched.shortCode || matched.name);
            setSelectedBaseUnit(formatUnitOption(matched));
          }
        }
      }
    } catch (err: any) {
      console.warn("Failed to load units from Commerce API:", err);
    } finally {
      setIsLoadingUnits(false);
    }
  }, []);

  // State for creating a new custom unit inside the Unit dialog
  const [newUnitFullName, setNewUnitFullName] = useState("");
  const [newUnitShortName, setNewUnitShortName] = useState("");
  const [showAddUnitForm, setShowAddUnitForm] = useState(true);
  // Inline errors for the unit dialog appear only after its action button was clicked
  const [unitModalAttempted, setUnitModalAttempted] = useState(false);
  const [unitDoneAttempted, setUnitDoneAttempted] = useState(false);
  // Image file rejected on selection; shown inline once Save has been attempted
  const [imageFileError, setImageFileError] = useState<string | null>(null);

  // Handler to add a new unit via Commerce unitApi
  const handleAddNewCustomUnit = async (
    overrideFullName?: string,
    overrideShortName?: string,
  ): Promise<ApiUnit | null> =>
    (await unitGuard.runOnce(() =>
      addNewCustomUnitImpl(overrideFullName, overrideShortName),
    )) ?? null;

  const addNewCustomUnitImpl = async (
    overrideFullName?: string,
    overrideShortName?: string,
  ): Promise<ApiUnit | null> => {
    const fullName = (
      overrideFullName !== undefined ? overrideFullName : newUnitFullName
    ).trim();
    const shortName = (
      overrideShortName !== undefined ? overrideShortName : newUnitShortName
    ).trim();
    if (!fullName) {
      setUnitModalAttempted(true); // inline error is shown under the unit name field
      return null;
    }
    const short = shortName
      ? shortName
      : fullName.length <= 4
        ? fullName.toUpperCase()
        : fullName.slice(0, 3).toUpperCase();
    const formatted = `${fullName.toUpperCase()} (${short})`;

    // Check if a unit with the same name or short code already exists in local list
    const existing = allAvailableUnits.find(
      (u) =>
        u.name?.toLowerCase().trim() === fullName.toLowerCase() ||
        (short && u.shortCode?.toLowerCase().trim() === short.toLowerCase()),
    );

    if (existing) {
      setSelectedBaseUnit(formatUnitOption(existing));
      setNewUnitFullName("");
      setNewUnitShortName("");
      toast.info(
        `Unit "${formatUnitOption(existing)}" is already in your unit list and selected.`,
      );
      return existing;
    }

    setIsCreatingUnit(true);
    try {
      const res = await unitApi.createUnit({
        name: fullName,
        shortCode: short,
        status: 1,
      });

      const createdUnit: ApiUnit | null =
        res && (res.data ? res.data : (res as any)?.id ? (res as any) : null);

      if (createdUnit && createdUnit.id) {
        setApiUnits((prev) => {
          const exists = prev.some((u) => u.id === createdUnit.id);
          return exists ? prev : [...prev, createdUnit];
        });
        const formattedOption = formatUnitOption(createdUnit);
        setSelectedBaseUnit(formattedOption);
        setNewUnitFullName("");
        setNewUnitShortName("");
        toast.success(`Unit "${formattedOption}" created successfully!`);
        loadUnits();
        return createdUnit;
      } else {
        throw new Error("Unexpected response format from Unit API");
      }
    } catch (err: any) {
      console.error("Failed to create unit via API:", err);
      const errCode = err?.response?.data?.error?.code || (err as any)?.code;
      const errMsg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create unit";

      // If unit already exists on backend (DUPLICATE_UNIT_NAME, DUPLICATE_UNIT_SHORT_CODE, etc.)
      const isDuplicate =
        errCode === "DUPLICATE_UNIT_NAME" ||
        errCode === "DUPLICATE_UNIT_SHORT_CODE" ||
        errMsg.toLowerCase().includes("already exists") ||
        errMsg.toLowerCase().includes("duplicate");

      if (isDuplicate) {
        try {
          const freshRes = await unitApi.getUnits({ sortOrder: "asc" });
          const list = Array.isArray(freshRes?.data)
            ? freshRes.data
            : Array.isArray(freshRes)
              ? freshRes
              : [];
          if (list.length > 0) {
            setApiUnits(list);
            const matched = list.find(
              (u) =>
                u.name?.toLowerCase().trim() === fullName.toLowerCase() ||
                (short &&
                  u.shortCode?.toLowerCase().trim() === short.toLowerCase()),
            );
            if (matched) {
              const formattedOption = formatUnitOption(matched);
              setSelectedBaseUnit(formattedOption);
              setNewUnitFullName("");
              setNewUnitShortName("");
              toast.info(
                `Unit "${formattedOption}" already exists and has been selected for you.`,
              );
              return matched;
            }
          }
        } catch {
          // ignore fallback load error
        }
      }

      toast.error(getApiErrorMessage(err, "Failed to create unit."));
      return null;
    } finally {
      setIsCreatingUnit(false);
    }
  };

  // Handler to delete unit via Commerce unitApi
  const handleDeleteCustomUnit = async (unitToRemove: ApiUnit) => {
    if (deletingUnitId || checkRequiredSelection(unitToRemove?.id, "unit"))
      return;
    const formatted = formatUnitOption(unitToRemove);
    setDeletingUnitId(unitToRemove.id);
    try {
      const res = await unitApi.deleteUnit(unitToRemove.id);
      if (res?.success) {
        setApiUnits((prev) => prev.filter((u) => u.id !== unitToRemove.id));
        if (selectedBaseUnit === formatted) {
          const fallback = apiUnits.find((u) => u.id !== unitToRemove.id);
          setSelectedBaseUnit(fallback ? formatUnitOption(fallback) : "None");
        }
        if (selectedSecondaryUnit === formatted) {
          setSelectedSecondaryUnit("None");
        }
        toast.success(`Unit "${unitToRemove.name}" deleted successfully`);
        await loadUnits();
      }
    } catch (err: any) {
      console.error("Failed to delete unit via API:", err);
      toast.error(getApiErrorMessage(err, "Failed to delete unit."));
    } finally {
      setDeletingUnitId(null);
    }
  };

  // Image Upload reference & reactive local state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [itemImageState, setItemImageState] = useState<string>("");
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  // Modal States for Add Category and Add Subcategory
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [isAddSubcategoryModalOpen, setIsAddSubcategoryModalOpen] =
    useState(false);

  // React Hook Form instance for Add / Edit Item Modal
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    getValues,
    setError,
    clearErrors,
    formState: { errors, isSubmitted },
  } = useForm<ProductFormValues>({
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: defaultProductFormValues,
  });

  // Explicitly register itemImage so React Hook Form tracks it
  useEffect(() => {
    register("itemImage");
  }, [register]);

  const formData = watch();

  // Backward-compatible state updater bridging to React Hook Form
  const setFormData = (
    updater:
      | Partial<ProductFormValues>
      | ((prev: ProductFormValues) => Partial<ProductFormValues>),
  ) => {
    const current = getValues();
    const updated = typeof updater === "function" ? updater(current) : updater;
    Object.entries(updated).forEach(([k, v]) => {
      setValue(k as keyof ProductFormValues, v as any, {
        shouldValidate: isSubmitted,
      });
    });
  };

  // Keystroke sanitizer: disallow typing numeric characters in text-only fields
  const handleTextOnlyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
    }
  };

  // Keystroke sanitizer: disallow typing non-numeric characters in number-only fields
  const handleNumberOnlyKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    allowDecimal = false,
  ) => {
    if (
      e.key === "Backspace" ||
      e.key === "Delete" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "Tab" ||
      e.key === "Enter" ||
      (allowDecimal && e.key === ".") ||
      e.ctrlKey ||
      e.metaKey
    ) {
      if (
        allowDecimal &&
        e.key === "." &&
        e.currentTarget.value.includes(".")
      ) {
        e.preventDefault();
      }
      return;
    }
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  // Close dropdowns on outside click or scroll
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest(".product-action-dropdown-container") &&
        !target.closest(".product-action-dropdown-menu")
      ) {
        setActiveDropdownId(null);
        setDropdownPos(null);
      }
      if (bulkMenuRef.current && !bulkMenuRef.current.contains(target)) {
        setIsBulkMenuOpen(false);
      }
    };
    const handleScroll = () => {
      if (activeDropdownId) {
        setActiveDropdownId(null);
        setDropdownPos(null);
      }
      if (isBulkMenuOpen) {
        setIsBulkMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [activeDropdownId, isBulkMenuOpen]);

  // Stock valuation price follows the sale (or purchase) price until the user types their own value
  useEffect(() => {
    if (isModalOpen && formData.itemType === "Product") {
      const currentAtPrice = getValues("atPrice");
      const currentSalePrice = getValues("salePrice");
      const currentPurchasePrice = getValues("purchasePrice");
      if (
        !currentAtPrice ||
        Number(currentAtPrice) === 0 ||
        !isAtPriceManuallyEdited.current
      ) {
        const fallbackPrice = currentSalePrice || currentPurchasePrice || "";
        if (fallbackPrice) {
          setValue("atPrice", fallbackPrice as any, {
            shouldValidate: isSubmitted,
          });
        }
      }
    }
  }, [
    isModalOpen,
    formData.itemType,
    formData.salePrice,
    formData.purchasePrice,
    getValues,
    setValue,
  ]);

  const handleOpenAddModal = (
    defaultType?: "Product" | "Service" | React.MouseEvent,
  ) => {
    if (allAvailableUnits.length === 0) loadUnits();
    if (categories.length === 0) fetchLiveCategories();
    if (masterSubcategories.length === 0) fetchLiveSubcategories();
    const type = typeof defaultType === "string" ? defaultType : "Product";
    setEditingProduct(null);
    isAtPriceManuallyEdited.current = false;

    const defaultUnit =
      allAvailableUnits.find(
        (u) =>
          u.shortCode?.toUpperCase() === "PCS" ||
          u.name?.toUpperCase().includes("PIECE"),
      ) || allAvailableUnits[0];

    const defaultUnitCode = defaultUnit?.shortCode || defaultUnit?.name || "PCS";
    const defaultUnitId = defaultUnit?.id;
    const defaultFormatted = defaultUnit ? formatUnitOption(defaultUnit) : "PCS";

    setSelectedBaseUnit(defaultFormatted);
    setSelectedSecondaryUnit("None");
    setItemImageState("");
    reset({
      ...defaultProductFormValues,
      itemType: type as "Product" | "Service",
      productCode: "", // generated by the server on save
      unit: defaultUnitCode,
      baseUnitId: defaultUnitId,
      secondaryUnitId: undefined,
      secondaryUnit: undefined,
      category: "",
      subcategory: "",
      itemImage: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prod: ProductItem) => {
    if (allAvailableUnits.length === 0) loadUnits();
    if (categories.length === 0) fetchLiveCategories();
    if (masterSubcategories.length === 0) fetchLiveSubcategories();
    setEditingProduct(prod);
    const initialAtPrice =
      prod.atPrice || prod.salePrice || prod.purchasePrice || "";
    isAtPriceManuallyEdited.current = Boolean(
      prod.atPrice && Number(prod.atPrice) > 0,
    );
    const matchedBase = allAvailableUnits.find(
      (u) =>
        u.id === prod.baseUnitId ||
        u.shortCode?.toUpperCase() === prod.unit?.toUpperCase() ||
        u.name?.toUpperCase() === prod.unit?.toUpperCase() ||
        formatUnitOption(u)
          .toUpperCase()
          .includes(`(${prod.unit?.toUpperCase()})`),
    );
    if (matchedBase) {
      setSelectedBaseUnit(formatUnitOption(matchedBase));
    } else if (prod.unit) {
      setSelectedBaseUnit(prod.unit);
    } else {
      setSelectedBaseUnit("");
    }

    const matchedSec = allAvailableUnits.find(
      (u) =>
        u.id === prod.secondaryUnitId ||
        (prod.secondaryUnit &&
          (u.shortCode?.toUpperCase() === prod.secondaryUnit?.toUpperCase() ||
            u.name?.toUpperCase() === prod.secondaryUnit?.toUpperCase())),
    );
    if (matchedSec) {
      setSelectedSecondaryUnit(formatUnitOption(matchedSec));
    } else {
      setSelectedSecondaryUnit("None");
    }

    const currentImg = prod.itemImage || prod.image || prod.imageBase64 || "";
    const cachedImg = getProductImageFromCache(
      prod.id,
      prod.productCode,
      currentImg,
    );
    const resolvedImg = cachedImg || currentImg;
    setItemImageState(resolvedImg);

    reset({
      itemType: prod.itemType,
      productCode: prod.productCode,
      productName: prod.productName,
      hsnCode: prod.hsnCode || "",
      unit:
        prod.unit ||
        (matchedBase ? matchedBase.shortCode || matchedBase.name : ""),
      baseUnitId:
        prod.baseUnitId ||
        (matchedBase && !matchedBase.id.startsWith("unit-")
          ? matchedBase.id
          : undefined),
      secondaryUnitId:
        prod.secondaryUnitId ||
        (matchedSec && !matchedSec.id.startsWith("unit-")
          ? matchedSec.id
          : null),
      secondaryUnit:
        prod.secondaryUnit ||
        (matchedSec ? matchedSec.shortCode || matchedSec.name : undefined),
      category: prod.category || "",
      subcategory: prod.subcategory || "",
      itemImage: resolvedImg,
      salePrice: prod.salePrice || "",
      salePriceTaxType: prod.salePriceTaxType || "Excluded",
      discountValue: prod.discountValue || "",
      discountType: prod.discountType || "Percentage",
      hasWholesale: prod.hasWholesale || false,
      wholesalePrice: prod.wholesalePrice || "",
      wholesaleTaxType: prod.wholesaleTaxType || "Excluded",
      minWholesaleQty: prod.minWholesaleQty || "",
      purchasePrice: prod.purchasePrice || "",
      purchasePriceTaxType: prod.purchasePriceTaxType || "Excluded",
      taxRate: prod.taxRate || "None",
      openingStock: prod.openingStock || "",
      atPrice: initialAtPrice,
      asOfDate: prod.asOfDate || new Date().toISOString().split("T")[0],
      minStockAlert: prod.minStockAlert || "",
      location: prod.location || "",
      isBatchTracking:
        prod.isBatchTracking !== undefined
          ? Boolean(prod.isBatchTracking)
          : true,
      batchNo: prod.batchNo || "",
      mfgDate: prod.mfgDate || "",
      expDate: prod.expDate || "",
    });
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedExtensions = [
      ".png",
      ".jpg",
      ".jpeg",
      ".webp",
      ".gif",
      ".bmp",
      ".svg",
      ".avif",
    ];
    const fileName = (file.name || "").toLowerCase();
    const hasValidExtension = allowedExtensions.some((ext) =>
      fileName.endsWith(ext),
    );
    const isImageMime = Boolean(file.type && file.type.startsWith("image/"));

    if (!isImageMime && !hasValidExtension) {
      setImageFileError(
        "Only image formats (.png, .jpg, .jpeg, .webp, .gif, .bmp, .svg) are allowed.",
      );
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImageFileError("Image size must be less than 10MB.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }
    setImageFileError(null);

    try {
      setIsUploadingImage(true);
      const base64String = await compressImageFile(file);
      setItemImageState(base64String);
      setValue("itemImage", base64String, {
        shouldValidate: isSubmitted,
        shouldDirty: true,
      });
      setFormData((prev) => ({ ...prev, itemImage: base64String }));
      toast.success("Image selected successfully");
    } catch (err: any) {
      console.error("Image upload processing failed:", err);
      setImageFileError(
        err?.message ||
          "Failed to process image. Please choose a valid image file.",
      );
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleAddCategory = (newCat: string) => {
    if (!categories.includes(newCat)) {
      setCategories((prev) => [...prev, newCat]);
    }
  };

  const handleAddSubcategory = async (newSubName: string) => {
    const trimmed = newSubName.trim();
    if (!trimmed) return;
    try {
      const res = await subcategoryApi.createSubcategory({
        category: formData.category || "General",
        subcategory: trimmed,
        status: "Active",
      });
      if (res?.success && res.data) {
        setMasterSubcategories((prev) => [res.data, ...prev]);
        toast.success(`Subcategory "${trimmed}" created successfully.`);
        return;
      }
    } catch (err: any) {
      console.warn("Subcategory creation in master API failed:", err);
      toast.error(getApiErrorMessage(err, "Failed to create subcategory."));
    }
  };

  const availableSubcategories = useMemo(() => {
    const selectedCat = (formData.category || "").trim().toLowerCase();
    const activeSubs = masterSubcategories.filter(
      (s) => s.status !== "Inactive",
    );

    if (!selectedCat) {
      const all = activeSubs
        .map((s) => s.subcategory || s.name || "")
        .filter((n) => n.trim() !== "");
      return Array.from(new Set(all));
    }

    const matching = activeSubs
      .filter((s) => {
        const cat = (s.category || s.categoryName || "").trim().toLowerCase();
        return cat === selectedCat;
      })
      .map((s) => s.subcategory || s.name || "")
      .filter((n) => n.trim() !== "");

    return Array.from(new Set(matching));
  }, [masterSubcategories, formData.category]);

  // Field-level validation for the product form. Returns { field: message } (empty when valid).
  const validateProductForm = (
    data: ProductFormValues,
  ): Record<string, string> => {
    const salePriceNum = Number(data.salePrice) || 0;
    const blank = (v: unknown) => v === "" || v === undefined || v === null;
    const discountErr = (() => {
      if (blank(data.discountValue)) return null;
      if (data.discountType === "Percentage")
        return checkPercent(data.discountValue, "discount percentage");
      const base = checkMoney(data.discountValue, "discount amount", {
        allowZero: true,
      });
      if (base) return base;
      return Number(data.discountValue) > salePriceNum
        ? `The discount (₹${Number(data.discountValue)}) cannot be more than the sale price (₹${salePriceNum}).`
        : null;
    })();
    const checks: Array<[string, string | null]> = [
      ["category", checkRequiredSelection(data.category, "category")],
      ["subcategory", checkRequiredSelection(data.subcategory, "subcategory")],
      [
        "productName",
        !(data.productName || "").trim()
          ? "Please enter the item name."
          : data.productName.trim().length < 2
            ? "The item name must be at least 2 characters."
            : null,
      ],
      [
        "salePrice",
        checkMoney(data.salePrice, "sale price", {
          allowZero: true,
          optional: true,
        }),
      ],
      ["discountValue", discountErr],
      [
        "purchasePrice",
        checkMoney(data.purchasePrice, "purchase price", {
          allowZero: true,
          optional: true,
        }) ||
          checkNotGreaterThan(
            data.purchasePrice,
            data.salePrice,
            "purchase price",
            "sale price",
          ),
      ],
      [
        "atPrice",
        checkMoney(data.atPrice, "stock valuation price", {
          allowZero: true,
          optional: true,
        }),
      ],
      [
        "minStockAlert",
        checkNumber(data.minStockAlert, "minimum stock level", {
          allowZero: true,
          optional: true,
          maxDecimals: 0,
        }),
      ],
      [
        "expDate",
        checkDateNotBefore(
          data.expDate,
          data.mfgDate,
          "expiry date",
          "manufacturing date",
        ),
      ],
      ["itemImage", imageFileError],
    ];
    if (data.hasWholesale) {
      checks.push(
        [
          "wholesalePrice",
          checkMoney(data.wholesalePrice, "wholesale price", {
            allowZero: true,
            optional: true,
          }) ||
            checkNotGreaterThan(
              data.wholesalePrice,
              data.salePrice,
              "wholesale price",
              "sale price",
            ),
        ],
        [
          "minWholesaleQty",
          checkNumber(data.minWholesaleQty, "minimum wholesale quantity", {
            allowZero: true,
            optional: true,
            maxDecimals: 0,
          }),
        ],
      );
    }
    return collectErrors(checks);
  };

  const MANAGED_KEYS = [
    "category",
    "subcategory",
    "productName",
    "salePrice",
    "discountValue",
    "purchasePrice",
    "openingStock",
    "atPrice",
    "minStockAlert",
    "expDate",
    "wholesalePrice",
    "minWholesaleQty",
    "itemImage",
  ] as const;

  // After the first Save attempt, keep the business-rule errors in sync with the values:
  // a field's error disappears only once the field is valid (also covers cross-field rules such as
  // purchase price vs sale price). Before any submit attempt this does nothing.
  useLayoutEffect(() => {
    if (!isModalOpen || !isSubmitted) return;
    const live = validateProductForm(getValues());
    MANAGED_KEYS.forEach((key) => {
      const current = errors[key as keyof ProductFormValues];
      const msg = live[key];
      if (msg) {
        // Do not overwrite messages produced by the field's own registered rule
        if (!current || current.message !== msg) {
          if (
            !current ||
            current.type === "manual" ||
            current.type === "server"
          ) {
            setError(key as keyof ProductFormValues, {
              type: "manual",
              message: msg,
            });
          }
        }
      } else if (
        current &&
        (current.type === "manual" || current.type === "server")
      ) {
        clearErrors(key as keyof ProductFormValues);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isModalOpen,
    isSubmitted,
    formData.category,
    formData.subcategory,
    formData.batchNo,
    formData.productName,
    formData.salePrice,
    formData.discountValue,
    formData.discountType,
    formData.wholesalePrice,
    formData.minWholesaleQty,
    formData.hasWholesale,
    formData.purchasePrice,
    formData.atPrice,
    formData.minStockAlert,
    formData.mfgDate,
    formData.expDate,
    imageFileError,
  ]);

  // Start clean whenever the item modal closes (opening already resets the form)
  useEffect(() => {
    if (!isModalOpen) {
      clearErrors();
      setImageFileError(null);
    }
  }, [isModalOpen, clearErrors]);

  // Unit dialog starts clean every time it opens or closes
  useEffect(() => {
    setUnitModalAttempted(false);
    setUnitDoneAttempted(false);
  }, [isUnitModalOpen]);

  // Registered-rule errors present: still show every business-rule error in the same submit
  const handleInvalidItem = (rhfErrors: Record<string, any>) => {
    const extra = validateProductForm(getValues());
    Object.keys(extra).forEach((k) => {
      if (!rhfErrors[k])
        setError(k as keyof ProductFormValues, {
          type: "manual",
          message: extra[k],
        });
    });
  };

  const handleSaveItem = (
    keepOpenAfterSave = false,
    formValuesParam?: ProductFormValues,
  ) =>
    saveGuard.runOnce(async () => {
      const data = formValuesParam || getValues();
      const validationErrors = validateProductForm(data);
      if (Object.keys(validationErrors).length > 0) {
        Object.keys(validationErrors).forEach((k) =>
          setError(k as keyof ProductFormValues, {
            type: "manual",
            message: validationErrors[k],
          }),
        );
        return;
      }
      if (
        editingProduct &&
        checkRequiredSelection(editingProduct.id, "product")
      ) {
        setError("root", {
          type: "manual",
          message:
            "This product could not be identified. Please close and reopen it.",
        });
        return;
      }
      let saveSucceeded = false;
      // Map backend field errors onto the form; fall back to a toast for anything else.
      const reportSaveError = (apiErr: any, fallback: string) => {
        const apiFields = extractApiFieldErrors(apiErr);
        let mappedAny = false;
        for (const [k, v] of Object.entries(apiFields)) {
          const field = k === "name" ? "productName" : k;
          if (field in defaultProductFormValues) {
            setError(field as keyof ProductFormValues, {
              type: "server",
              message: v,
            });
            mappedAny = true;
          }
        }
        // Backend field errors are shown inline; anything else is an API error toast.
        if (!mappedAny) toast.error(getApiErrorMessage(apiErr, fallback));
      };

      // Existing products keep their code; a new product gets one from the server.
      const finalCode = (data.productCode || "").trim();
      const finalStatus = (
        editingProduct ? editingProduct.status : "Active"
      ) as "Active" | "Inactive";

      const imageBase64Data = (
        itemImageState ||
        data.itemImage ||
        formData.itemImage ||
        ""
      ).trim();
      let finalImageUrl: string | null = null;
      if (imageBase64Data) {
        if (imageBase64Data.startsWith("data:")) {
          try {
            const uploadRes = await baseClient.post("/uploads/base64", {
              image: imageBase64Data,
              folder: "items",
              fileName: `item_${Date.now()}.png`,
            });
            const returnedUrl =
              (typeof uploadRes.data?.data === "string"
                ? uploadRes.data.data
                : null) ||
              uploadRes.data?.data?.url ||
              uploadRes.data?.data?.fileUrl ||
              uploadRes.data?.data?.imageUrl ||
              uploadRes.data?.data?.location ||
              uploadRes.data?.data?.path ||
              (typeof uploadRes.data === "string" ? uploadRes.data : null) ||
              uploadRes.data?.url ||
              uploadRes.data?.fileUrl ||
              uploadRes.data?.imageUrl ||
              uploadRes.data?.location;

            if (returnedUrl && typeof returnedUrl === "string") {
              finalImageUrl = returnedUrl;
            } else {
              finalImageUrl = imageBase64Data;
            }
          } catch (upErr) {
            console.warn(
              "Failed to upload base64 to S3, using data directly:",
              upErr,
            );
            finalImageUrl = imageBase64Data;
          }
        } else {
          finalImageUrl = imageBase64Data;
        }
      } else {
        finalImageUrl = null;
      }

      const payload: Record<string, any> = {
        itemType: data.itemType,
        productCode: finalCode || undefined,
        productName: data.productName.trim(),
      };

      if (data.itemType) payload.itemType = data.itemType;
      if (editingProduct && finalCode) {
        payload.productCode = finalCode;
      } else if (data.productCode && data.productCode.trim()) {
        payload.productCode = data.productCode.trim();
      }
      if (data.description && data.description.trim())
        payload.description = data.description.trim();
      if (data.hsnCode && data.hsnCode.trim())
        payload.hsnCode = data.hsnCode.trim();
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

      payload.unit = effUnit;
      if (effBaseUnitId) payload.baseUnitId = effBaseUnitId;
      if (data.secondaryUnitId) payload.secondaryUnitId = data.secondaryUnitId;
      if (data.category && data.category.trim())
        payload.category = data.category.trim();
      if (data.subcategory && data.subcategory.trim())
        payload.subcategory = data.subcategory.trim();

      const effImg = finalImageUrl || imageBase64Data;
      if (effImg && effImg.trim()) {
        payload.itemImage = effImg;
        payload.image = effImg;
        payload.imageBase64 = effImg;
      }

      if (data.salePrice !== "" && data.salePrice !== undefined) {
        payload.salePrice = Number(data.salePrice) || 0;
        if (data.salePriceTaxType)
          payload.salePriceTaxType = data.salePriceTaxType;
      }

      if (
        data.discountValue !== "" &&
        data.discountValue !== undefined &&
        Number(data.discountValue) > 0
      ) {
        payload.discountValue = Number(data.discountValue);
        if (data.discountType) payload.discountType = data.discountType;
      }

      if (data.hasWholesale) {
        payload.hasWholesale = true;
        if (data.wholesalePrice !== "" && data.wholesalePrice !== undefined) {
          payload.wholesalePrice = Number(data.wholesalePrice) || 0;
        }
        if (data.wholesaleTaxType)
          payload.wholesaleTaxType = data.wholesaleTaxType;
        if (data.minWholesaleQty !== "" && data.minWholesaleQty !== undefined) {
          payload.minWholesaleQty = Number(data.minWholesaleQty) || 0;
        }
      }

      if (data.purchasePrice !== "" && data.purchasePrice !== undefined) {
        payload.purchasePrice = Number(data.purchasePrice) || 0;
        if (data.purchasePriceTaxType)
          payload.purchasePriceTaxType = data.purchasePriceTaxType;
      }

      if (data.taxRate && data.taxRate !== "None" && data.taxRate.trim()) {
        payload.taxRate = data.taxRate;
      }

      if (data.openingStock !== "" && data.openingStock !== undefined) {
        payload.openingStock = Number(data.openingStock) || 0;
        if (data.atPrice !== "" && data.atPrice !== undefined) {
          payload.atPrice = Number(data.atPrice) || 0;
        }
        if (data.asOfDate) payload.asOfDate = data.asOfDate;
      }

      if (
        data.minStockAlert !== "" &&
        data.minStockAlert !== undefined &&
        Number(data.minStockAlert) > 0
      ) {
        payload.minStockAlert = Number(data.minStockAlert);
      }

      if (data.location && data.location.trim()) {
        payload.location = data.location.trim();
      }

      const hasBatch = Boolean(data.isBatchTracking || data.batchNo?.trim());
      if (hasBatch) {
        payload.isBatchTracking = true;
        if (data.batchNo && data.batchNo.trim())
          payload.batchNo = data.batchNo.trim();
        if (data.mfgDate && data.mfgDate.trim())
          payload.mfgDate = data.mfgDate.trim();
        if (data.expDate && data.expDate.trim())
          payload.expDate = data.expDate.trim();
      }

      if (finalStatus) payload.status = finalStatus;

      setIsSubmitting(true);

      try {
        if (editingProduct) {
          // PUT /commerce/products/:id
          try {
            const res = await productApi.updateProduct(
              editingProduct.id,
              payload,
            );
            if (res?.success && res.data) {
              const updated = mapApiProductToProductItem(res.data);
              const effImage =
                cleanProductImage(res.data.itemImage) ||
                cleanProductImage(res.data.image) ||
                cleanProductImage(res.data.imageBase64) ||
                cleanProductImage(updated.itemImage) ||
                finalImageUrl ||
                undefined;

              const effBase64 =
                (imageBase64Data && imageBase64Data.startsWith("data:")
                  ? imageBase64Data
                  : "") ||
                cleanProductImage(res.data.imageBase64) ||
                cleanProductImage(updated.imageBase64) ||
                effImage;

              if (effBase64 && effBase64.startsWith("data:")) {
                saveProductImageToCache(editingProduct.id, effBase64);
                if (finalCode) saveProductImageToCache(finalCode, effBase64);
                if (res.data.id)
                  saveProductImageToCache(res.data.id, effBase64);
                if (res.data.productCode)
                  saveProductImageToCache(res.data.productCode, effBase64);
                if (res.data.sku)
                  saveProductImageToCache(res.data.sku, effBase64);
                if (res.data.itemImage)
                  saveProductImageToCache(res.data.itemImage, effBase64);
              }

              setProducts((prev) =>
                prev.map((p) =>
                  p.id === editingProduct.id ||
                  p.id === res.data.id ||
                  (p.productCode &&
                    (p.productCode === finalCode ||
                      p.productCode === res.data.productCode ||
                      p.productCode === res.data.sku))
                    ? {
                        ...p,
                        ...updated,
                        itemImage: effImage,
                        image: effImage,
                        imageBase64: effBase64,
                      }
                    : p,
                ),
              );
              toast.success(
                `Item "${updated.productName}" updated successfully!`,
              );
              saveSucceeded = true;
              if (!keepOpenAfterSave) setIsModalOpen(false);
              return;
            }
            toast.error("The item could not be updated. Please try again.");
            return;
          } catch (apiErr: any) {
            console.error("Remote product update failed:", apiErr);
            reportSaveError(apiErr, "Failed to update product");
            return;
          }
        } else {
          // POST /commerce/products
          try {
            const res = await productApi.createProduct(payload as any);
            if (res?.success && res.data) {
              const created = mapApiProductToProductItem(res.data);
              const effImage =
                cleanProductImage(res.data.itemImage) ||
                cleanProductImage(res.data.image) ||
                cleanProductImage(res.data.imageBase64) ||
                cleanProductImage(created.itemImage) ||
                finalImageUrl ||
                undefined;

              const effBase64 =
                (imageBase64Data && imageBase64Data.startsWith("data:")
                  ? imageBase64Data
                  : "") ||
                cleanProductImage(res.data.imageBase64) ||
                cleanProductImage(created.imageBase64) ||
                effImage;

              if (effBase64 && effBase64.startsWith("data:")) {
                if (res.data.id)
                  saveProductImageToCache(res.data.id, effBase64);
                if (res.data.productCode)
                  saveProductImageToCache(res.data.productCode, effBase64);
                if (res.data.sku)
                  saveProductImageToCache(res.data.sku, effBase64);
                if (finalCode) saveProductImageToCache(finalCode, effBase64);
                if (res.data.itemImage)
                  saveProductImageToCache(res.data.itemImage, effBase64);
              }

              setProducts((prev) => [
                {
                  ...created,
                  itemImage: effImage,
                  image: effImage,
                  imageBase64: effBase64,
                },
                ...prev,
              ]);
              setTotalApiRecords((prev) => (prev !== null ? prev + 1 : prev));
              toast.success(
                `Item "${created.productName}" added successfully!`,
              );
              saveSucceeded = true;
              if (!keepOpenAfterSave) setIsModalOpen(false);
              return;
            }
            toast.error("The item could not be added. Please try again.");
            return;
          } catch (apiErr: any) {
            console.error("Remote product create failed:", apiErr);
            reportSaveError(apiErr, "Failed to create product");
            return;
          }
        }
      } finally {
        setIsSubmitting(false);
        if (!saveSucceeded) {
          // Keep the modal open and every entered value so the user can correct and retry.
        } else if (keepOpenAfterSave) {
          setItemImageState("");
          setEditingProduct(null);
          reset({
            ...defaultProductFormValues,
            itemType: data.itemType,
            productCode: "",
            category: data.category || "",
            subcategory: "",
            unit: data.unit || "PCS",
            baseUnitId: data.baseUnitId,
            secondaryUnitId: undefined,
            secondaryUnit: undefined,
            itemImage: "",
          });
        } else {
          setItemImageState("");
          setIsModalOpen(false);
        }
      }
    });

  const handleDeleteProduct = (id: string) => {
    setActiveDropdownId(null);
    setDropdownPos(null);
    setDeleteProductError(null);
    const prod = products.find((p) => p.id === id);
    if (prod) {
      setDeleteConfirmItem(prod);
    } else {
      // Never claim a delete happened when nothing was sent to the server.
      toast.error(
        "This item could not be found. Please refresh the list and try again.",
      );
    }
  };

  // =========================================================================
  // BULK ACTIONS HANDLERS
  // =========================================================================
  const runBulkStatus = (status: "Active" | "Inactive") =>
    bulkStatusGuard.runOnce(async () => {
      const targetIds = (
        selectedIds.length > 0 ? selectedIds : products.map((p) => p.id)
      ).filter((id) => !checkRequiredSelection(id, "product"));
      if (targetIds.length === 0) {
        toast.warning("Please select at least one item first.");
        return;
      }

      setIsBulkMenuOpen(false);
      setIsBulkStatusLoading(true);

      try {
        const res = await productApi.bulkUpdateProductStatus({
          productIds: targetIds,
          status,
        });
        if (res?.success) {
          toast.success(
            res.message || `${targetIds.length} item(s) marked as ${status}.`,
          );
          setSelectedIds([]);
          await loadProducts(true);
          return;
        }
        toast.error(
          `The items could not be marked as ${status}. Please try again.`,
        );
      } catch (err: any) {
        // No local fallback: do not show a status the server did not accept.
        console.warn(`Bulk status ${status} API failed:`, err);
        toast.error(
          getApiErrorMessage(err, `Failed to mark items as ${status}.`),
        );
      } finally {
        setIsBulkStatusLoading(false);
      }
    });

  const handleBulkInactive = () => runBulkStatus("Inactive");

  const handleBulkActive = () => runBulkStatus("Active");

  const handleBulkAssignCode = () => {
    const targetIds =
      selectedIds.length > 0 ? selectedIds : products.map((p) => p.id);
    setProducts((prev) =>
      prev.map((p) => {
        if (targetIds.includes(p.id)) {
          const prefix = p.itemType === "Product" ? "PRD" : "SRV";
          const randNum = Math.floor(1000 + Math.random() * 9000);
          return { ...p, productCode: `${prefix}-${randNum}` };
        }
        return p;
      }),
    );
    setIsBulkMenuOpen(false);
    toast.success(`Generated unique codes for ${targetIds.length} item(s).`);
  };

  const handleBulkAssignUnitsSubmit = () => {
    const targetIds =
      selectedIds.length > 0 ? selectedIds : products.map((p) => p.id);
    setProducts((prev) =>
      prev.map((p) =>
        targetIds.includes(p.id) ? { ...p, unit: selectedBulkUnit } : p,
      ),
    );
    setIsBulkUnitModalOpen(false);
    toast.success(
      `Assigned unit "${selectedBulkUnit}" to ${targetIds.length} item(s).`,
    );
  };

  // Open Full "Bulk Update Items" screen
  const handleOpenBulkUpdateModal = () => {
    loadUnits();
    if (categories.length === 0) fetchLiveCategories();
    if (masterSubcategories.length === 0) fetchLiveSubcategories();
    setIsBulkMenuOpen(false);
    setBulkItems(JSON.parse(JSON.stringify(products)));
    setBulkSelectedIds([]);
    setBulkSearch("");
    setBulkTab("Pricing");
    setBulkRowErrors({});
    setBulkSubmitAttempted(false);
    setIsBulkUpdateModalOpen(true);
  };

  // Update specific field in bulkItems
  // Update specific field in bulkItems with dynamic validation clearing
  const handleBulkItemChange = (
    id: string,
    field: keyof ProductItem,
    value: any,
  ) => {
    setBulkItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        // Errors are re-validated live (after the first Update click) by the bulkItems effect.
        return { ...item, [field]: value };
      }),
    );
  };

  // Batch update tax slab for selected items
  const handleApplyBatchTaxSlab = (tax: string) => {
    const targetIds =
      bulkSelectedIds.length > 0 ? bulkSelectedIds : bulkItems.map((p) => p.id);
    setBulkItems((prev) =>
      prev.map((item) =>
        targetIds.includes(item.id) ? { ...item, taxRate: tax } : item,
      ),
    );
    setBatchTaxDropdownOpen(false);
    toast.success(`Applied "${tax}" to ${targetIds.length} item(s).`);
  };

  // Calculate modifications count
  const updatesSummary = useMemo(() => {
    let commonUpdates = 0;
    let pricingUpdates = 0;
    let stockUpdates = 0;
    let infoUpdates = 0;

    bulkItems.forEach((item) => {
      const original = products.find((p) => p.id === item.id);
      if (!original) return;

      if (
        (item.productName || "").trim() !==
          (original.productName || "").trim() ||
        (item.category || "").trim() !== (original.category || "").trim() ||
        (item.hsnCode || "").trim() !== (original.hsnCode || "").trim()
      ) {
        commonUpdates++;
      }

      if (
        Number(item.purchasePrice || 0) !==
          Number(original.purchasePrice || 0) ||
        (item.purchasePriceTaxType || "Excluded") !==
          (original.purchasePriceTaxType || "Excluded") ||
        Number(item.salePrice || 0) !== Number(original.salePrice || 0) ||
        (item.salePriceTaxType || "Excluded") !==
          (original.salePriceTaxType || "Excluded") ||
        Number(item.discountValue || 0) !==
          Number(original.discountValue || 0) ||
        (item.discountType || "Percentage") !==
          (original.discountType || "Percentage") ||
        (item.taxRate || "None") !== (original.taxRate || "None")
      ) {
        pricingUpdates++;
      }

      if (
        Number(item.openingStock || 0) !== Number(original.openingStock || 0) ||
        Number(item.atPrice || 0) !== Number(original.atPrice || 0) ||
        (item.asOfDate || "").split("T")[0] !==
          (original.asOfDate || "").split("T")[0] ||
        Number(item.minStockAlert || 0) !==
          Number(original.minStockAlert || 0) ||
        (item.location || "").trim() !== (original.location || "").trim()
      ) {
        stockUpdates++;
      }

      if (
        (item.productCode || "").trim() !==
          (original.productCode || "").trim() ||
        (item.unit || "").trim() !== (original.unit || "").trim() ||
        item.status !== original.status
      ) {
        infoUpdates++;
      }
    });

    return { commonUpdates, pricingUpdates, stockUpdates, infoUpdates };
  }, [bulkItems, products]);

  // Save Bulk Updates (PUT /commerce/products/bulk)
  const computeBulkChanges = (bulkItems: ProductItem[]) => {
    const commonRows: BulkProductCommonRow[] = [];
    const pricingRows: BulkProductPricingRow[] = [];
    const stockRows: BulkProductStockRow[] = [];
    const itemInformationRows: BulkProductItemInfoRow[] = [];

    bulkItems.forEach((item) => {
      const original = products.find((p) => p.id === item.id);
      if (!original) return;

      const isCommonChanged =
        (item.productName || "").trim() !==
          (original.productName || "").trim() ||
        (item.category || "").trim() !== (original.category || "").trim() ||
        (item.hsnCode || "").trim() !== (original.hsnCode || "").trim();

      const isPricingChanged =
        Number(item.purchasePrice || 0) !==
          Number(original.purchasePrice || 0) ||
        (item.purchasePriceTaxType || "Excluded") !==
          (original.purchasePriceTaxType || "Excluded") ||
        Number(item.salePrice || 0) !== Number(original.salePrice || 0) ||
        (item.salePriceTaxType || "Excluded") !==
          (original.salePriceTaxType || "Excluded") ||
        Number(item.discountValue || 0) !==
          Number(original.discountValue || 0) ||
        (item.discountType || "Percentage") !==
          (original.discountType || "Percentage") ||
        (item.taxRate || "None") !== (original.taxRate || "None");

      const isStockChanged =
        Number(item.openingStock || 0) !== Number(original.openingStock || 0) ||
        Number(item.atPrice || 0) !== Number(original.atPrice || 0) ||
        (item.asOfDate || "").split("T")[0] !==
          (original.asOfDate || "").split("T")[0] ||
        Number(item.minStockAlert || 0) !==
          Number(original.minStockAlert || 0) ||
        (item.location || "").trim() !== (original.location || "").trim();

      const isInfoChanged =
        (item.productCode || "").trim() !==
          (original.productCode || "").trim() ||
        (item.unit || "").trim() !== (original.unit || "").trim() ||
        item.status !== original.status;

      if (isCommonChanged) {
        commonRows.push({
          id: item.id,
          productName: item.productName?.trim() || "",
          category:
            item.category && item.category !== "---"
              ? item.category.trim()
              : original.category || "General",
          hsnCode:
            item.hsnCode && item.hsnCode !== "---" ? item.hsnCode.trim() : "",
        });
      }

      if (isPricingChanged) {
        pricingRows.push({
          id: item.id,
          productName: item.productName?.trim() || "",
          category:
            item.category && item.category !== "---"
              ? item.category.trim()
              : original.category || "General",
          purchasePrice: Number(item.purchasePrice) || 0,
          purchasePriceTaxType: item.purchasePriceTaxType || "Excluded",
          salePrice: Number(item.salePrice) || 0,
          salePriceTaxType: item.salePriceTaxType || "Excluded",
          discountValue: Number(item.discountValue) || 0,
          discountType: item.discountType || "Percentage",
          taxRate: item.taxRate || "None",
        });
      }

      if (isStockChanged) {
        stockRows.push({
          id: item.id,
          openingStock: Number(item.openingStock) || 0,
          atPrice: Number(item.atPrice) || 0,
          asOfDate: item.asOfDate
            ? item.asOfDate.split("T")[0]
            : new Date().toISOString().split("T")[0],
          minStockAlert: Number(item.minStockAlert) || 0,
          location: item.location?.trim() || "",
        });
      }

      if (isInfoChanged) {
        itemInformationRows.push({
          id: item.id,
          productCode: item.productCode?.trim() || "",
          unit: item.unit?.trim() || "PCS",
          status: item.status || "Active",
        });
      }
    });

    return { commonRows, pricingRows, stockRows, itemInformationRows };
  };

  // Client-side validation of every changed row. Pure: shows nothing by itself.
  // Uses the raw edited values so an unreadable entry is reported instead of silently becoming 0.
  const computeBulkErrors = (
    bulkItems: ProductItem[],
    changes: ReturnType<typeof computeBulkChanges>,
  ) => {
    const { commonRows, pricingRows, stockRows, itemInformationRows } = changes;
    const validationErrors: Record<
      string,
      { productCode: string; field: string; message: string }
    > = {};
    const addRowError = (id: string, field: string, message: string | null) => {
      if (!message || validationErrors[id]) return; // keep the first problem per row
      const it = bulkItems.find((b) => b.id === id);
      validationErrors[id] = {
        productCode: it?.productCode || it?.productName || id,
        field,
        message,
      };
    };
    const changedIds = new Set<string>([
      ...commonRows.map((r) => r.id),
      ...pricingRows.map((r) => r.id),
      ...stockRows.map((r) => r.id),
      ...itemInformationRows.map((r) => r.id),
    ]);
    const rawBlank = (v: unknown) => v === "" || v === undefined || v === null;
    changedIds.forEach((id) => {
      const it = bulkItems.find((b) => b.id === id);
      if (!it) return;
      if (checkRequiredSelection(id, "product")) {
        addRowError(
          id,
          "productName",
          "This item could not be identified. Please reopen the bulk update screen.",
        );
        return;
      }
      if (!(it.productName || "").trim()) {
        addRowError(id, "productName", "Please enter the item name.");
      }
    });
    pricingRows.forEach((row) => {
      const it = bulkItems.find((b) => b.id === row.id);
      if (!it) return;
      addRowError(
        row.id,
        "purchasePrice",
        checkMoney(it.purchasePrice, "purchase price", {
          allowZero: true,
          optional: true,
        }),
      );
      addRowError(
        row.id,
        "salePrice",
        checkMoney(it.salePrice, "sale price", {
          allowZero: true,
          optional: true,
        }),
      );
      if (!rawBlank(it.discountValue)) {
        if ((it.discountType || "Percentage") === "Percentage") {
          addRowError(
            row.id,
            "discountValue",
            checkPercent(it.discountValue, "discount percentage"),
          );
        } else {
          addRowError(
            row.id,
            "discountValue",
            checkMoney(it.discountValue, "discount amount", {
              allowZero: true,
            }),
          );
          if (Number(it.discountValue) > (Number(it.salePrice) || 0)) {
            addRowError(
              row.id,
              "discountValue",
              `The discount amount (${Number(it.discountValue)}) cannot be more than the sale price (${Number(it.salePrice) || 0}).`,
            );
          }
        }
      }
    });
    stockRows.forEach((row) => {
      const it = bulkItems.find((b) => b.id === row.id);
      if (!it) return;
      addRowError(
        row.id,
        "openingStock",
        checkNumber(it.openingStock, "stock quantity", {
          allowZero: true,
          optional: true,
        }),
      );
      addRowError(
        row.id,
        "openingStock",
        checkMoney(it.atPrice, "stock valuation price", {
          allowZero: true,
          optional: true,
        }),
      );
      addRowError(
        row.id,
        "openingStock",
        checkNumber(it.minStockAlert, "minimum stock level", {
          allowZero: true,
          optional: true,
          maxDecimals: 0,
        }),
      );
    });

    return validationErrors;
  };

  // Re-validate the grid live, but only once the user has clicked Update at least once
  useEffect(() => {
    if (!isBulkUpdateModalOpen) {
      // Closed: start clean next time
      setBulkRowErrors({});
      setBulkSubmitAttempted(false);
      return;
    }
    if (!bulkSubmitAttempted) return;
    setBulkRowErrors(
      computeBulkErrors(bulkItems, computeBulkChanges(bulkItems)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkItems, bulkSubmitAttempted, isBulkUpdateModalOpen]);

  const handleSaveBulkUpdate = () =>
    bulkUpdateGuard.runOnce(async () => {
      const changes = computeBulkChanges(bulkItems);
      const { commonRows, pricingRows, stockRows, itemInformationRows } =
        changes;

      if (
        commonRows.length === 0 &&
        pricingRows.length === 0 &&
        stockRows.length === 0 &&
        itemInformationRows.length === 0
      ) {
        toast.info("No changes detected to update.");
        setIsBulkUpdateModalOpen(false);
        return;
      }

      // Validate every changed row at once; show inline per-row errors, no API call, no toast.
      setBulkSubmitAttempted(true);
      const validationErrors = computeBulkErrors(bulkItems, changes);
      if (Object.keys(validationErrors).length > 0) {
        setBulkRowErrors(validationErrors);
        const firstField = Object.values(validationErrors)[0].field;
        setBulkTab(firstField === "openingStock" ? "Stock" : "Pricing");
        return;
      }
      setBulkRowErrors({});
      const payload: BulkUpdateProductsPayload = {
        common: commonRows,
        pricing: pricingRows,
        stock: stockRows,
        itemInformation: itemInformationRows,
        products: [],
      };

      setIsSavingBulkUpdate(true);
      try {
        const res = await productApi.bulkUpdateProducts(payload);
        if (res?.success) {
          toast.success(res.message || "All item updates saved successfully!");
          setIsBulkUpdateModalOpen(false);
          await loadProducts(true);
          return;
        }
        toast.error("The item updates could not be saved. Please try again.");
        return;
      } catch (err: any) {
        console.error("Bulk update products API failed:", err);
        const errData = err?.response?.data;
        const failedList = errData?.data?.failed;
        if (Array.isArray(failedList) && failedList.length > 0) {
          const errorsMap: Record<
            string,
            { productCode: string; field: string; message: string }
          > = {};
          failedList.forEach((f: any) => {
            const firstErr = f.errors?.[0];
            errorsMap[f.id] = {
              productCode: f.productCode || f.id,
              field: firstErr?.field || "discountValue",
              message: firstErr?.message || "Validation error",
            };
          });
          setBulkRowErrors(errorsMap);
          setBulkTab("Pricing");
          const errorDetails = failedList
            .map((f: any) => {
              const itemMsg = f.errors?.map((e: any) => e.message).join(", ");
              return `${f.productCode || f.id}: ${itemMsg || "Validation error"}`;
            })
            .join("; ");
          toast.error(`Some items could not be updated. ${errorDetails}`);
        } else {
          toast.error(getApiErrorMessage(err, "Failed to save bulk updates."));
        }
        return;
      } finally {
        setIsSavingBulkUpdate(false);
      }
    });

  // Filtered bulk items based on bulkSearch
  const filteredBulkItems = useMemo(() => {
    const q = bulkSearch.toLowerCase().trim();
    if (!q) return bulkItems;
    return bulkItems.filter(
      (item) =>
        item.productName.toLowerCase().includes(q) ||
        (item.hsnCode && item.hsnCode.toLowerCase().includes(q)) ||
        item.productCode.toLowerCase().includes(q),
    );
  }, [bulkItems, bulkSearch]);

  const isAllBulkSelected =
    filteredBulkItems.length > 0 &&
    filteredBulkItems.every((item) => bulkSelectedIds.includes(item.id));

  const handleToggleBulkSelectAll = () => {
    if (isAllBulkSelected) {
      setBulkSelectedIds([]);
    } else {
      setBulkSelectedIds(filteredBulkItems.map((item) => item.id));
    }
  };

  const handleToggleBulkSelectRow = (id: string) => {
    setBulkSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  // Filter products for main table
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const q = appliedSearch.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        item.productCode.toLowerCase().includes(q) ||
        item.productName.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.hsnCode && item.hsnCode.toLowerCase().includes(q));

      const matchesCategory =
        appliedCategory === "ALL" || item.category === appliedCategory;

      const matchesType =
        appliedType === "ALL" || item.itemType === appliedType;

      const matchesStatus =
        appliedStatus === "ALL" || item.status === appliedStatus;

      return matchesSearch && matchesCategory && matchesType && matchesStatus;
    });
  }, [products, appliedSearch, appliedCategory, appliedType, appliedStatus]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalItems = products.length;
    const totalProducts = products.filter(
      (p) => p.itemType === "Product",
    ).length;
    const lowStockCount = products.filter(
      (p) =>
        (p.currentStock !== undefined ? p.currentStock : p.openingStock) <=
        (p.minStockAlert || 5),
    ).length;
    const totalStockVal = products.reduce((sum, p) => {
      const stock =
        p.currentStock !== undefined ? p.currentStock : p.openingStock;
      return sum + stock * (p.purchasePrice || p.salePrice || 0);
    }, 0);

    if (apiSummary) {
      return {
        totalItems: apiSummary.totalItems ?? totalItems,
        totalProducts: apiSummary.totalProducts ?? totalProducts,
        lowStockCount: apiSummary.lowStockCount ?? lowStockCount,
        totalStockVal: apiSummary.totalStockValue ?? totalStockVal,
      };
    }

    return { totalItems, totalProducts, lowStockCount, totalStockVal };
  }, [products, apiSummary]);

  // Total count calculation
  const totalCount =
    isApiConnected && totalApiRecords !== null
      ? totalApiRecords
      : filteredProducts.length;

  const totalPages =
    isApiConnected && totalApiPages !== null
      ? totalApiPages
      : Math.max(1, Math.ceil(totalCount / pageSize));

  const safePage = Math.min(page, totalPages);

  // When API is connected, server handles pagination; otherwise slice in memory
  const pagedProducts = useMemo(() => {
    if (isApiConnected) {
      return products;
    }
    return filteredProducts.slice(
      (safePage - 1) * pageSize,
      safePage * pageSize,
    );
  }, [isApiConnected, products, filteredProducts, safePage, pageSize]);

  // Handle select all toggle
  const isAllPageSelected =
    pagedProducts.length > 0 &&
    pagedProducts.every((p) => selectedIds.includes(p.id));

  const handleToggleSelectAll = () => {
    if (isAllPageSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !pagedProducts.some((p) => p.id === id)),
      );
    } else {
      const pageIds = pagedProducts.map((p) => p.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleExport = () => {
    if (filteredProducts.length === 0) {
      toast.error("No products available to export.");
      return;
    }

    const excelRows = filteredProducts.map((p, index) => ({
      sNo: index + 1,
      itemType: p.itemType,
      productCode: p.productCode,
      productName: p.productName,
      hsnCode: p.hsnCode || "-",
      unit: p.unit,
      category: p.category,
      subcategory: p.subcategory || "-",
      salePrice: Number(p.salePrice || 0),
      salePriceTaxType: p.salePriceTaxType,
      purchasePrice: Number(p.purchasePrice || 0),
      taxRate: Number(p.taxRate || 0),
      openingStock: Number(
        (p.currentStock !== undefined ? p.currentStock : p.openingStock) || 0,
      ),
      status: p.status,
    }));

    const totalStock = excelRows.reduce(
      (acc, row) => acc + row.openingStock,
      0,
    );

    exportTableToExcel({
      filename: `Inventory_Products_Report_${new Date().toISOString().split("T")[0]}`,
      sheetName: "Products",
      title: "YAA CREATIONS CRM - PRODUCTS INVENTORY",
      subtitle: `Total Items: ${filteredProducts.length} | Generated: ${new Date().toLocaleDateString("en-IN")}`,
      columns: [
        { header: "#", key: "sNo", align: "center", width: 8 },
        { header: "Type", key: "itemType", align: "center", width: 12 },
        { header: "Item Code", key: "productCode", align: "center", width: 14 },
        { header: "Item Name", key: "productName", align: "left", width: 26 },
        { header: "HSN/SAC", key: "hsnCode", align: "center", width: 12 },
        { header: "Unit", key: "unit", align: "center", width: 12 },
        { header: "Category", key: "category", align: "left", width: 20 },
        { header: "Subcategory", key: "subcategory", align: "left", width: 20 },
        {
          header: "Sale Price (₹)",
          key: "salePrice",
          align: "right",
          type: "currency",
          width: 16,
        },
        {
          header: "Tax Type",
          key: "salePriceTaxType",
          align: "center",
          width: 12,
        },
        {
          header: "Purchase Price (₹)",
          key: "purchasePrice",
          align: "right",
          type: "currency",
          width: 16,
        },
        { header: "GST %", key: "taxRate", align: "center", width: 10 },
        { header: "Stock Qty", key: "openingStock", align: "right", width: 12 },
        { header: "Status", key: "status", align: "center", width: 12 },
      ],
      data: excelRows,
      summaryRow: {
        sNo: "TOTAL",
        productName: `${filteredProducts.length} Items`,
        openingStock: totalStock,
      },
    });

    toast.success(
      `Inventory items Excel report downloaded (${filteredProducts.length} records)!`,
    );
  };

  const filteredUnits = allAvailableUnits.filter(
    (u) =>
      u.name.toLowerCase().includes(unitSearchQuery.toLowerCase()) ||
      u.shortCode.toLowerCase().includes(unitSearchQuery.toLowerCase()),
  );

  const filteredHsn = COMMON_HSN_CODES.filter(
    (h) =>
      h.code.includes(hsnSearchQuery) ||
      h.desc.toLowerCase().includes(hsnSearchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      {/* 1. Header Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Total Items
            </p>
            <p className="text-lg font-black text-slate-800">
              {metrics.totalItems}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Products
            </p>
            <p className="text-lg font-black text-slate-800">
              {metrics.totalProducts}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Low Stock
            </p>
            <p className="text-lg font-black text-slate-800">
              {metrics.lowStockCount}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Stock Value
            </p>
            <p className="text-lg font-black text-slate-800">
              ₹{metrics.totalStockVal.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-[220px] flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
              <Package className="w-4.5 h-4.5" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Products
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-[#33077C] border border-purple-200">
                {totalCount} total
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Manage inventory products, pricing, tax rates, stock alerts, and
            wholesale rates.
          </p>
        </div>

        {/* Top Right Action Buttons: Excel Report & Split Button "+ Add Item v" */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <Button
            variant="secondary"
            size="md"
            className="flex-1 sm:flex-initial justify-center"
            onClick={handleExport}
            icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
          >
            Excel Report
          </Button>

          {/* SPLIT BUTTON WITH BULK ACTIONS DROPDOWN (BRAND THEME #33077C) */}
          <div
            ref={bulkMenuRef}
            className="relative inline-flex flex-1 sm:flex-initial shrink-0"
          >
            <div className="inline-flex w-full sm:w-auto rounded-xl shadow-md hover:shadow-lg shadow-[#33077C]/20 bg-[#33077C] hover:bg-[#432eb5] text-white transition-all active:scale-[0.98]">
              {/* Left Button: + Add Item */}
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="h-10 sm:h-11 px-4 sm:px-5 flex-1 sm:flex-initial flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-white transition-colors cursor-pointer select-none rounded-l-xl whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4 text-white stroke-[2.5] shrink-0" />
                <span className="whitespace-nowrap">Add Item</span>
              </button>

              {/* Vertical Divider */}
              <div className="w-[1px] bg-white/20 my-2.5 shrink-0" />

              {/* Right Button: Chevron Arrow */}
              <button
                type="button"
                onClick={() => setIsBulkMenuOpen(!isBulkMenuOpen)}
                className="h-10 sm:h-11 px-3 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer text-white rounded-r-xl shrink-0"
                title="Bulk Operations"
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${isBulkMenuOpen ? "rotate-180" : ""}`}
                />
              </button>
            </div>

            {/* Bulk Actions Dropdown Menu */}
            {isBulkMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-[4px] shadow-2xl border border-slate-100 py-1.5 px-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                {/* 1. Bulk Inactive */}
                <button
                  type="button"
                  onClick={handleBulkInactive}
                  disabled={isBulkStatusLoading}
                  className="w-full px-3 py-2.5 text-left text-xs sm:text-[13px] font-semibold text-slate-700 hover:bg-purple-50/60 hover:text-[#33077C] rounded-xl flex items-center gap-2.5 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBulkStatusLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                  ) : (
                    <Ban className="w-4 h-4 text-slate-500" />
                  )}
                  <span>Bulk Inactive</span>
                </button>

                {/* 2. Bulk Active */}
                <button
                  type="button"
                  onClick={handleBulkActive}
                  disabled={isBulkStatusLoading}
                  className="w-full px-3 py-2.5 text-left text-xs sm:text-[13px] font-semibold text-slate-700 hover:bg-purple-50/60 hover:text-[#33077C] rounded-xl flex items-center gap-2.5 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBulkStatusLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                  <span>Bulk Active</span>
                </button>

                {/* 5. Bulk Update Items (Opens full screen) */}
                <button
                  type="button"
                  onClick={handleOpenBulkUpdateModal}
                  className="w-full px-3 py-2.5 text-left text-xs sm:text-[13px] font-semibold text-slate-700 hover:bg-purple-50/60 hover:text-[#33077C] rounded-xl flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <SlidersHorizontal className="w-4 h-4 text-[#33077C]" />
                  <span>Bulk Update Items</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Search Bar & Dropdown Filter Row */}
      <SearchBar
        value={pendingSearch}
        onChange={(val) => setPendingSearch(val)}
        placeholder="Search by item code, name, category, HSN..."
        onSubmit={() => {
          const trimmed = pendingSearch.trim();
          const isSame =
            appliedSearch === trimmed &&
            appliedCategory === pendingCategory &&
            appliedType === pendingType &&
            appliedStatus === pendingStatus &&
            page === 1;

          setAppliedSearch(trimmed);
          setAppliedCategory(pendingCategory);
          setAppliedType(pendingType);
          setAppliedStatus(pendingStatus);
          setPage(1);

          if (isSame) {
            loadProducts(true);
          }
        }}
        onReset={() => {
          lastFetchKeyRef.current = null;
          setPendingSearch("");
          setAppliedSearch("");
          setPendingCategory("ALL");
          setAppliedCategory("ALL");
          setPendingType("ALL");
          setAppliedType("ALL");
          setPendingStatus("ALL");
          setAppliedStatus("ALL");
          setPage(1);
          loadProducts(true, {
            search: "",
            category: "ALL",
            itemType: "ALL",
            status: "ALL",
            page: 1,
          });
        }}
        filterSlot={
          <div className="flex flex-wrap items-center gap-2.5">
            <div
              onClickCapture={() => {
                if (categories.length === 0) {
                  fetchLiveCategories();
                }
              }}
            >
              <FilterDropdown
                options={[
                  { label: "Category : All", value: "ALL" },
                  ...filterCategoryOptions.map((c) => ({ label: c, value: c })),
                ]}
                value={pendingCategory}
                onChange={(val) => setPendingCategory(val)}
                placeholder="Category : All"
              />
            </div>
            <FilterDropdown
              options={[
                { label: "Status : All", value: "ALL" },
                { label: "Active", value: "Active", dotColor: "#10b981" },
                { label: "Inactive", value: "Inactive", dotColor: "#64748b" },
              ]}
              value={pendingStatus}
              onChange={(val) => setPendingStatus(val)}
              placeholder="Status : All"
            />
          </div>
        }
        rightSlot={
          <div className="flex items-center gap-3 pr-1">
            {selectedIds.length > 0 && (
              <span className="text-xs bg-[#33077C]/10 text-[#33077C] font-bold px-2.5 py-1 rounded-lg border border-[#33077C]/20">
                {selectedIds.length} Selected
              </span>
            )}
            <span className="text-xs font-semibold text-slate-500">
              Total Items :{" "}
              <span className="text-[#33077C] font-bold">{totalCount}</span>
            </span>
          </div>
        }
      />

      {/* 4. Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200 min-w-[980px]">
            <CommonTableHead
              columns={[
                { label: "S.NO", align: "center", width: "48px" },
                { label: "ITEM CODE", align: "left", minWidth: "120px" },
                { label: "ITEM NAME", align: "left", minWidth: "160px" },
                { label: "CATEGORY", align: "left", minWidth: "140px" },
                { label: "SUBCATEGORY", align: "left", minWidth: "140px" },
                { label: "SALE PRICE", align: "right", minWidth: "120px" },
                { label: "PURCHASE PRICE", align: "right", minWidth: "120px" },
                { label: "STOCK / UNIT", align: "center", minWidth: "120px" },
                { label: "STATUS", align: "center", width: "120px" },
                { label: "ACTIONS", align: "center", width: "90px" },
              ]}
            />
            <tbody className="divide-y divide-slate-200 text-xs sm:text-[13px] text-slate-700">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={10}
                    className="py-16 text-center text-slate-400 font-medium"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-7 h-7 text-[#33077C] animate-spin" />
                      <span className="text-xs text-slate-500 font-semibold">
                        Loading products &amp; services...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : pagedProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="py-12 text-center text-slate-400 font-medium"
                  >
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Package className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                      <span className="text-sm font-semibold text-slate-600">
                        No products or services found
                      </span>
                      <p className="text-xs text-slate-400">
                        {appliedSearch ||
                        appliedCategory !== "ALL" ||
                        appliedType !== "ALL" ||
                        appliedStatus !== "ALL"
                          ? "Try resetting the search or filter query."
                          : 'Get started by clicking "+ Add Item" above.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedProducts.map((item, index) => {
                  const sNo = (safePage - 1) * pageSize + index + 1;
                  const isDropdownOpen = activeDropdownId === item.id;
                  const hasLiveStock =
                    item.currentStock !== undefined ||
                    item.inStock !== undefined;
                  const liveStock =
                    item.currentStock !== undefined
                      ? item.currentStock
                      : item.inStock;
                  const displayStock = hasLiveStock
                    ? (liveStock ?? 0)
                    : item.openingStock;
                  const isOutOfStock = hasLiveStock && displayStock === 0;
                  const isLowStock = displayStock <= (item.minStockAlert || 5);
                  const isSelected = selectedIds.includes(item.id);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-purple-50/30 transition-colors border-b border-slate-200 ${
                        isSelected ? "bg-purple-50/50" : ""
                      }`}
                    >
                      {/* S.NO */}
                      <td className="py-4 px-3 font-semibold text-slate-600 text-center border-r border-slate-200">
                        {sNo}
                      </td>

                      {/* ITEM CODE */}
                      <td className="py-4 px-5 font-semibold text-slate-800 border-r border-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#33077C]">
                            {item.productCode}
                          </span>
                          {item.hsnCode && (
                            <span className="text-[10px] bg-slate-100 text-slate-500 font-normal px-1.5 py-0.5 rounded">
                              HSN: {item.hsnCode}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* ITEM NAME */}
                      <td className="py-4 px-5 font-semibold text-slate-800 border-r border-slate-200">
                        <div className="flex items-center gap-3">
                          <ProductThumbnail
                            src={
                              item.itemImage || item.image || item.imageBase64
                            }
                            fallbackSrc={item.imageBase64 || item.image}
                            productId={item.id}
                            productCode={item.productCode}
                            alt={item.productName}
                            size="sm"
                          />
                          <div>
                            <div className="font-bold text-slate-900 leading-snug">
                              {item.productName}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {item.unit && (
                                <span className="text-[11px] font-medium text-slate-400">
                                  Unit: {item.unit}
                                </span>
                              )}
                              {item.isBatchTracking && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-[#33077C] border border-purple-200">
                                  <Tag className="w-2.5 h-2.5" />
                                  Batch Tracked
                                  {item.batchNo ? `: ${item.batchNo}` : ""}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* CATEGORY */}
                      <td className="py-4 px-5 font-medium text-slate-700 border-r border-slate-200">
                        {item.category || "-"}
                      </td>

                      {/* SUBCATEGORY */}
                      <td className="py-4 px-5 font-medium text-slate-700 border-r border-slate-200">
                        {item.subcategory ? (
                          <span className="px-2.5 py-1 rounded-md bg-purple-50/60 text-[#33077C] font-semibold text-xs border border-purple-200/60 inline-block">
                            {item.subcategory}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal italic">
                            -
                          </span>
                        )}
                      </td>

                      {/* SALE PRICE */}
                      <td className="py-4 px-5 font-bold text-slate-800 border-r border-slate-200 text-right whitespace-nowrap">
                        <div className="text-[#33077C] font-black">
                          ₹{Number(item.salePrice).toLocaleString("en-IN")}
                        </div>
                        <div className="text-[10px] font-normal text-slate-400">
                          {item.salePriceTaxType}
                        </div>
                      </td>

                      {/* PURCHASE PRICE */}
                      <td className="py-4 px-5 font-medium text-slate-600 border-r border-slate-200 text-right whitespace-nowrap">
                        {item.purchasePrice ? (
                          <>
                            <div>
                              ₹
                              {Number(item.purchasePrice).toLocaleString(
                                "en-IN",
                              )}
                            </div>
                            <div className="text-[10px] font-normal text-slate-400">
                              {item.purchasePriceTaxType}
                            </div>
                          </>
                        ) : (
                          "-"
                        )}
                      </td>

                      {/* STOCK / UNIT */}
                      <td className="py-4 px-5 text-center border-r border-slate-200">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`font-bold px-2 py-0.5 rounded-md text-xs ${
                              isOutOfStock
                                ? "bg-rose-100 text-rose-700 border border-rose-300"
                                : isLowStock
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "text-slate-800"
                            }`}
                          >
                            {displayStock} {item.unit}
                          </span>
                          {isOutOfStock ? (
                            <span className="text-[10px] font-bold text-rose-600 mt-0.5">
                              Out of Stock
                            </span>
                          ) : isLowStock ? (
                            <span className="text-[10px] font-bold text-amber-600 mt-0.5">
                              Low Stock
                            </span>
                          ) : null}
                          {hasLiveStock &&
                            item.openingStock !== undefined &&
                            item.openingStock !== displayStock && (
                              <span
                                className="text-[10px] text-slate-400 font-medium mt-0.5"
                                title="Opening stock registered during product creation"
                              >
                                Opening: {item.openingStock}
                              </span>
                            )}
                        </div>
                      </td>

                      {/* STATUS */}
                      <td className="py-4 px-5 text-center border-r border-slate-200">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold ${
                            item.status === "Active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.status === "Active"
                                ? "bg-emerald-500"
                                : "bg-slate-400"
                            }`}
                          />
                          {item.status}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="py-4 px-3 text-center">
                        <SaleActionDropdown
                          items={[
                            {
                              label: "View Details",
                              variant: "view",
                              onClick: () => handleOpenDetailModal(item),
                            },
                            {
                              label: "Edit",
                              variant: "edit",
                              onClick: () => handleOpenEditModal(item),
                            },
                            {
                              label:
                                item.status === "Active"
                                  ? "Deactivate"
                                  : "Activate",
                              variant:
                                item.status === "Active"
                                  ? "deactivate"
                                  : "activate",
                              onClick: () => handleToggleStatus(item),
                            },
                            {
                              label: "Delete",
                              variant: "delete",
                              onClick: () => handleDeleteProduct(item.id),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Pagination */}
      <Pagination
        total={totalCount}
        currentPage={safePage}
        pageSize={pageSize}
        pageSizeOptions={[5, 10, 20, 50]}
        onPageChange={(newPage) => setPage(newPage)}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
        }}
      />

      {/* ========================================================================= */}
      {/* 6. ADD / EDIT ITEM MODAL */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <form
            id="product-form"
            noValidate
            onSubmit={handleSubmit(
              (data) => handleSaveItem(false, data),
              (rhfErrors) =>
                handleInvalidItem(rhfErrors as Record<string, any>),
            )}
            className="relative w-full max-w-5xl bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94dvh] my-auto"
          >
            {/* Modal Header - Matches CRM Standard */}
            <div
              className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4.5 text-white shrink-0"
              style={{ background: "#33077C" }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 -ml-1 rounded-xl text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center shrink-0"
                  title="Go back"
                >
                  <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
                </button>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-xl font-bold tracking-tight text-white truncate">
                    {editingProduct ? "Edit Item" : "Add Item"}
                  </h3>
                  <p className="text-xs text-white/80 font-medium truncate mt-0.5">
                    Configure product details, pricing, inventory stock, and tax
                    rules
                  </p>
                </div>
              </div>

              {/* Right Action: Close */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body Scroll Area */}
            <div className="overflow-y-auto p-3.5 sm:p-6 space-y-5 sm:space-y-6 flex-1 min-w-0 bg-[#fafbfc]">
              {/* Row 1: Category, Subcategory, Item Name */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start">
                {/* 1.1 Category Select Component (First Field) */}
                <div className="md:col-span-3">
                  <CategorySelectField
                    value={formData.category}
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        category: val,
                        subcategory: "",
                      })
                    }
                    categories={categories}
                    onOpenAddCategoryModal={() =>
                      setIsAddCategoryModalOpen(true)
                    }
                    required
                    error={errors.category?.message}
                  />
                  <FormError message={errors.category?.message} showIcon />
                </div>

                {/* 1.2 Subcategory Select Component (Second Field) */}
                <div className="md:col-span-3">
                  <SubcategorySelectField
                    value={formData.subcategory || ""}
                    onChange={(val) =>
                      setFormData({ ...formData, subcategory: val })
                    }
                    category={formData.category}
                    subcategories={availableSubcategories}
                    onOpenAddSubcategoryModal={() =>
                      setIsAddSubcategoryModalOpen(true)
                    }
                    required
                    error={errors.subcategory?.message}
                  />
                  <FormError message={errors.subcategory?.message} showIcon />
                </div>

                {/* 1.3 Item Name */}
                <div className="md:col-span-4">
                  <FormLabel required>Item Name</FormLabel>
                  <input
                    type="text"
                    placeholder="Enter Item Name"
                    disabled={isSubmitting}
                    {...register("productName", {
                      required: "Please enter the item name.",
                      minLength: {
                        value: 2,
                        message: "The item name must be at least 2 characters.",
                      },
                      validate: (val) =>
                        /^[A-Za-z0-9\s&'().\-\[\]{}/,+%#:*_"]+$/.test(
                          String(val).trim(),
                        ) ||
                        "The item name contains characters that are not allowed.",
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

                {/* 1.4 Item Code (generated by the server) */}
                <div className="md:col-span-2">
                  <FormLabel>Item Code</FormLabel>
                  <input
                    type="text"
                    readOnly
                    placeholder="Auto-generated"
                    {...register("productCode")}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-[13px] font-semibold text-slate-600 outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Row 2: Item HSN, Select Unit, Add Item Image */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
                {/* 2.1 Item HSN */}
                <div className="md:col-span-4">
                  <FormLabel>Item HSN</FormLabel>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Enter Item HSN"
                      value={formData.hsnCode}
                      onChange={(e) =>
                        setFormData({ ...formData, hsnCode: e.target.value })
                      }
                      className={`${FORM_INPUT_CLS} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setIsHsnModalOpen(true)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#33077C] transition-colors cursor-pointer"
                      title="Search HSN / SAC Codes"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {/* 2.1 Select Unit Button */}
                <div className="md:col-span-4">
                  <button
                    type="button"
                    onClick={() => {
                      loadUnits();
                      if (formData.baseUnitId) {
                        const matched = allAvailableUnits.find(
                          (u) => u.id === formData.baseUnitId,
                        );
                        if (matched)
                          setSelectedBaseUnit(formatUnitOption(matched));
                      } else if (formData.unit && formData.unit !== "None") {
                        const matched = allAvailableUnits.find(
                          (u) =>
                            u.shortCode?.toUpperCase() ===
                              formData.unit.toUpperCase() ||
                            u.name?.toUpperCase() ===
                              formData.unit.toUpperCase() ||
                            formatUnitOption(u)
                              .toUpperCase()
                              .includes(`(${formData.unit.toUpperCase()})`),
                        );
                        if (matched)
                          setSelectedBaseUnit(formatUnitOption(matched));
                        else setSelectedBaseUnit(formData.unit);
                      } else {
                        setSelectedBaseUnit("");
                      }

                      if (formData.secondaryUnitId) {
                        const matchedSec = allAvailableUnits.find(
                          (u) => u.id === formData.secondaryUnitId,
                        );
                        if (matchedSec)
                          setSelectedSecondaryUnit(
                            formatUnitOption(matchedSec),
                          );
                      } else if (
                        formData.secondaryUnit &&
                        formData.secondaryUnit !== "None"
                      ) {
                        const matchedSec = allAvailableUnits.find(
                          (u) =>
                            u.shortCode?.toUpperCase() ===
                              formData.secondaryUnit?.toUpperCase() ||
                            u.name?.toUpperCase() ===
                              formData.secondaryUnit?.toUpperCase(),
                        );
                        if (matchedSec)
                          setSelectedSecondaryUnit(
                            formatUnitOption(matchedSec),
                          );
                        else setSelectedSecondaryUnit("None");
                      } else {
                        setSelectedSecondaryUnit("None");
                      }
                      setIsUnitModalOpen(true);
                    }}
                    className="w-full h-11 px-3 bg-[#33077C]/10 hover:bg-[#33077C]/15 text-[#33077C] border border-[#33077C]/25 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1.5 truncate"
                  >
                    <span>
                      {formData.unit && formData.unit !== "None"
                        ? `Unit: ${formData.unit}`
                        : "Select Unit"}
                    </span>
                  </button>
                </div>

                {/* 2.2 Add Item Image */}
                <div className="md:col-span-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/bmp,image/svg+xml,.png,.jpg,.jpeg,.webp,.gif,.bmp,.svg,.avif"
                    onClick={(e) => {
                      (e.currentTarget as HTMLInputElement).value = "";
                    }}
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  {isUploadingImage ? (
                    <div className="w-full h-11 px-3 bg-[#33077C]/5 border border-[#33077C]/20 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-[#33077C]">
                      <Loader2 className="w-4 h-4 animate-spin text-[#33077C]" />
                      <span>Processing image...</span>
                    </div>
                  ) : itemImageState || formData.itemImage ? (
                    <div className="flex items-center gap-2">
                      <ProductThumbnail
                        src={itemImageState || formData.itemImage}
                        fallbackSrc={itemImageState}
                        productId={editingProduct?.id}
                        productCode={editingProduct?.productCode}
                        alt="Preview"
                        size="md"
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
                          setValue("itemImage", "", {
                            shouldValidate: isSubmitted,
                            shouldDirty: true,
                          });
                          setFormData({ ...formData, itemImage: "" });
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
                  <FormError message={errors.itemImage?.message} showIcon />
                </div>
              </div>

              {/* PRICING */}
              {
                <div className="space-y-4 animate-in fade-in duration-100">
                  {/* Card 1: Sale Price & Wholesale Price */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
                    {/* 1.1 Sale Price Row */}
                    <div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Sale Price + Tax Type */}
                        <div className="flex flex-col">
                          <FormLabel>Sale Price</FormLabel>
                          <div
                            className={`relative flex items-center h-11 bg-white rounded-xl transition-all ${
                              errors.salePrice
                                ? "border border-rose-400 focus-within:border-rose-500 focus-within:ring-4 focus-within:ring-rose-500/10"
                                : "border border-slate-200 hover:border-slate-300 focus-within:border-[#4309A2] focus-within:ring-4 focus-within:ring-[#4309A2]/10"
                            }`}
                          >
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="0.00"
                              {...register("salePrice", {
                                validate: (val) =>
                                  val === "" ||
                                  val === undefined ||
                                  Number(val) >= 0 ||
                                  "Please enter a valid sale price (0 or more).",
                              })}
                              value={formData.salePrice ?? ""}
                              onKeyDown={(e) =>
                                handleNumberOnlyKeyDown(e, true)
                              }
                              onInput={(e) => {
                                const sanitized = e.currentTarget.value
                                  .replace(/[^0-9.]/g, "")
                                  .replace(/(\..*?)\..*/g, "$1");
                                e.currentTarget.value = sanitized;
                                setValue("salePrice", sanitized as any, {
                                  shouldValidate: isSubmitted,
                                });
                                if (
                                  !isAtPriceManuallyEdited.current ||
                                  !getValues("atPrice") ||
                                  Number(getValues("atPrice")) === 0
                                ) {
                                  setValue("atPrice", sanitized as any, {
                                    shouldValidate: isSubmitted,
                                  });
                                }
                              }}
                              className="flex-1 min-w-0 h-full px-3 sm:px-4 bg-transparent text-xs sm:text-[13px] font-medium text-slate-800 placeholder:text-slate-400 outline-none"
                            />
                            <select
                              value={formData.salePriceTaxType}
                              onChange={(e) =>
                                setValue(
                                  "salePriceTaxType",
                                  e.target.value as any,
                                )
                              }
                              className="shrink-0 h-full px-2.5 sm:px-3 bg-slate-50 border-l border-slate-200 text-xs font-medium text-slate-700 outline-none cursor-pointer hover:bg-slate-100 rounded-r-xl"
                            >
                              <option value="Excluded">Excluded</option>
                              <option value="Included">Included</option>
                            </select>
                          </div>
                          {errors.salePrice && (
                            <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>{errors.salePrice.message}</span>
                            </p>
                          )}
                        </div>

                        {/* Disc. On Sale Price + Disc Type */}
                        <div className="flex flex-col">
                          <FormLabel>Disc. On Sale Price</FormLabel>
                          <div
                            className={`relative flex items-center h-11 bg-white rounded-xl transition-all ${
                              errors.discountValue
                                ? "border border-rose-400 focus-within:border-rose-500 focus-within:ring-4 focus-within:ring-rose-500/10"
                                : "border border-slate-200 hover:border-slate-300 focus-within:border-[#4309A2] focus-within:ring-4 focus-within:ring-[#4309A2]/10"
                            }`}
                          >
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="0.00"
                              {...register("discountValue", {
                                validate: (val) =>
                                  val === "" ||
                                  val === undefined ||
                                  Number(val) >= 0 ||
                                  "Please enter a valid discount (0 or more).",
                              })}
                              onKeyDown={(e) =>
                                handleNumberOnlyKeyDown(e, true)
                              }
                              onInput={(e) => {
                                e.currentTarget.value = e.currentTarget.value
                                  .replace(/[^0-9.]/g, "")
                                  .replace(/(\..*?)\..*/g, "$1");
                              }}
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
                          {errors.discountValue && (
                            <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>{errors.discountValue.message}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 1.2 Wholesale Price Section */}
                    {formData.itemType === "Product" && (
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
                            {/* Wholesale Price + Tax Type */}
                            <div className="flex flex-col">
                              <FormLabel>Wholesale Price</FormLabel>
                              <div
                                className={`relative flex items-center h-11 bg-white rounded-xl transition-all ${
                                  errors.wholesalePrice
                                    ? "border border-rose-400 focus-within:border-rose-500 focus-within:ring-4 focus-within:ring-rose-500/10"
                                    : "border border-slate-200 hover:border-slate-300 focus-within:border-[#4309A2] focus-within:ring-4 focus-within:ring-[#4309A2]/10"
                                }`}
                              >
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="0.00"
                                  {...register("wholesalePrice", {
                                    validate: (val) =>
                                      val === "" ||
                                      val === undefined ||
                                      Number(val) >= 0 ||
                                      "Please enter a valid wholesale price (0 or more).",
                                  })}
                                  onKeyDown={(e) =>
                                    handleNumberOnlyKeyDown(e, true)
                                  }
                                  onInput={(e) => {
                                    e.currentTarget.value =
                                      e.currentTarget.value
                                        .replace(/[^0-9.]/g, "")
                                        .replace(/(\..*?)\..*/g, "$1");
                                  }}
                                  className="flex-1 min-w-0 h-full px-3 sm:px-4 bg-transparent text-xs sm:text-[13px] font-medium text-slate-800 placeholder:text-slate-400 outline-none"
                                />
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
                                  <option value="Excluded">Excluded</option>
                                  <option value="Included">Included</option>
                                </select>
                              </div>
                              {errors.wholesalePrice && (
                                <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  <span>{errors.wholesalePrice.message}</span>
                                </p>
                              )}
                            </div>

                            {/* Minimum Wholesale Qty */}
                            <div className="flex flex-col">
                              <FormLabel>Min Wholesale Qty</FormLabel>
                              <div
                                className={`relative flex items-center h-11 bg-white rounded-xl pr-3 transition-all ${
                                  errors.minWholesaleQty
                                    ? "border border-rose-400 focus-within:border-rose-500 focus-within:ring-4 focus-within:ring-rose-500/10"
                                    : "border border-slate-200 hover:border-slate-300 focus-within:border-[#4309A2] focus-within:ring-4 focus-within:ring-[#4309A2]/10"
                                }`}
                              >
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="0"
                                  {...register("minWholesaleQty", {
                                    validate: (val) =>
                                      val === "" ||
                                      val === undefined ||
                                      Number(val) >= 0 ||
                                      "Please enter the minimum wholesale quantity as a whole number.",
                                  })}
                                  onKeyDown={(e) =>
                                    handleNumberOnlyKeyDown(e, false)
                                  }
                                  onInput={(e) => {
                                    e.currentTarget.value =
                                      e.currentTarget.value.replace(
                                        /[^0-9]/g,
                                        "",
                                      );
                                  }}
                                  className="flex-1 min-w-0 h-full px-3 sm:px-4 bg-transparent text-xs sm:text-[13px] font-medium text-slate-800 placeholder:text-slate-400 outline-none"
                                />
                                <div
                                  title="Minimum order quantity for wholesale pricing to apply"
                                  className="text-slate-400 hover:text-[#33077C] cursor-help"
                                >
                                  <Info className="w-4 h-4" />
                                </div>
                              </div>
                              {errors.minWholesaleQty && (
                                <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  <span>{errors.minWholesaleQty.message}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card 2 & 3: Purchase Price & Taxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Purchase Price Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                      <div className="flex flex-col">
                        <FormLabel>Purchase Price</FormLabel>
                        <div
                          className={`relative flex items-center h-11 bg-white rounded-xl transition-all ${
                            errors.purchasePrice
                              ? "border border-rose-400 focus-within:border-rose-500 focus-within:ring-4 focus-within:ring-rose-500/10"
                              : "border border-slate-200 hover:border-slate-300 focus-within:border-[#4309A2] focus-within:ring-4 focus-within:ring-[#4309A2]/10"
                          }`}
                        >
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            {...register("purchasePrice", {
                              validate: (val) =>
                                val === "" ||
                                val === undefined ||
                                Number(val) >= 0 ||
                                "Please enter a valid purchase price (0 or more).",
                            })}
                            value={formData.purchasePrice ?? ""}
                            onKeyDown={(e) => handleNumberOnlyKeyDown(e, true)}
                            onInput={(e) => {
                              const sanitized = e.currentTarget.value
                                .replace(/[^0-9.]/g, "")
                                .replace(/(\..*?)\..*/g, "$1");
                              e.currentTarget.value = sanitized;
                              setValue("purchasePrice", sanitized as any, {
                                shouldValidate: isSubmitted,
                              });
                              if (
                                (!isAtPriceManuallyEdited.current ||
                                  !getValues("atPrice") ||
                                  Number(getValues("atPrice")) === 0) &&
                                !getValues("salePrice")
                              ) {
                                setValue("atPrice", sanitized as any, {
                                  shouldValidate: isSubmitted,
                                });
                              }
                            }}
                            className="flex-1 min-w-0 h-full px-3 sm:px-4 bg-transparent text-xs sm:text-[13px] font-medium text-slate-800 placeholder:text-slate-400 outline-none"
                          />
                          <select
                            value={formData.purchasePriceTaxType}
                            onChange={(e) =>
                              setValue(
                                "purchasePriceTaxType",
                                e.target.value as any,
                              )
                            }
                            className="shrink-0 h-full px-2.5 sm:px-3 bg-slate-50 border-l border-slate-200 text-xs font-medium text-slate-700 outline-none cursor-pointer hover:bg-slate-100 rounded-r-xl"
                          >
                            <option value="Excluded">Excluded</option>
                            <option value="Included">Included</option>
                          </select>
                        </div>
                        {errors.purchasePrice && (
                          <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{errors.purchasePrice.message}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Taxes Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                      <div>
                        <FormLabel>Taxes</FormLabel>
                        <select
                          value={formData.taxRate}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              taxRate: e.target.value,
                            })
                          }
                          className={FORM_SELECT_CLS}
                        >
                          {TAX_RATE_OPTIONS.map((tax) => (
                            <option key={tax.value} value={tax.value}>
                              {tax.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              }

              {/* STOCK (always shown below pricing; products only) */}
              {formData.itemType === "Product" && (
                <div className="space-y-4 pt-1 animate-in fade-in duration-100">
                  {/* Min Stock To Maintain | Location */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 1. Min Stock To Maintain */}
                    <div>
                      <FormLabel>Min Stock To Maintain</FormLabel>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        {...register("minStockAlert", {
                          validate: (val) =>
                            val === "" ||
                            val === undefined ||
                            Number(val) >= 0 ||
                            "Please enter the minimum stock level as a whole number.",
                        })}
                        onKeyDown={(e) => handleNumberOnlyKeyDown(e, false)}
                        onInput={(e) => {
                          e.currentTarget.value = e.currentTarget.value.replace(
                            /[^0-9]/g,
                            "",
                          );
                        }}
                        className={
                          errors.minStockAlert
                            ? FORM_INPUT_ERROR_CLS
                            : FORM_INPUT_CLS
                        }
                      />
                      {errors.minStockAlert && (
                        <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{errors.minStockAlert.message}</span>
                        </p>
                      )}
                    </div>

                    {/* 2. Location */}
                    <div>
                      <FormLabel>Location</FormLabel>
                      <input
                        type="text"
                        placeholder="e.g. Warehouse A"
                        {...register("location", {
                          validate: (val) =>
                            !val ||
                            /^[A-Za-z\s&'.-]+$/.test(String(val).trim()) ||
                            "The location can contain only letters and spaces.",
                        })}
                        onKeyDown={handleTextOnlyKeyDown}
                        onInput={(e) => {
                          e.currentTarget.value = e.currentTarget.value.replace(
                            /[^A-Za-z\s&'.-]/g,
                            "",
                          );
                        }}
                        className={
                          errors.location
                            ? FORM_INPUT_ERROR_CLS
                            : FORM_INPUT_CLS
                        }
                      />
                      {errors.location && (
                        <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{errors.location.message}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Batch & Lot Tracking Card */}
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
                          Batch/lot number and expiry date tracking for
                          inventory management.
                        </p>
                      </div>
                    </div>

                    {/* Batch Fields (Default visible) */}
                    <div className="pt-3 border-t border-slate-100">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* 1. Initial Batch Number */}
                        <div>
                          <FormLabel>Initial Batch No</FormLabel>
                          <input
                            type="text"
                            placeholder="e.g. BAT-2026-001"
                            {...register("batchNo")}
                            className={`${FORM_INPUT_CLS} font-mono`}
                          />
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            Batch code identifier
                          </span>
                        </div>

                        {/* 2. Manufacturing Date (MFG) */}
                        <div>
                          <FormLabel>Mfg Date</FormLabel>
                          <input
                            type="date"
                            value={formData.mfgDate || ""}
                            onChange={(e) => {
                              setValue("mfgDate", e.target.value);
                            }}
                            className={`${FORM_INPUT_CLS} cursor-pointer`}
                          />
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            Manufacturing date
                          </span>
                        </div>

                        {/* 3. Expiry Date (EXP) */}
                        <div>
                          <FormLabel>Expiry Date</FormLabel>
                          <input
                            type="date"
                            value={formData.expDate || ""}
                            onChange={(e) => {
                              setValue("expDate", e.target.value);
                            }}
                            className={`${FORM_INPUT_CLS} cursor-pointer`}
                          />
                          <FormError
                            message={errors.expDate?.message}
                            showIcon
                          />
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

            {/* Form-level messages (the stock valuation price has no inline input) */}
            {(errors.root || errors.atPrice) && (
              <div className="px-4 sm:px-6 py-2 bg-white border-t border-slate-100 shrink-0 space-y-0.5">
                <FormError message={errors.root?.message} showIcon />
                <FormError message={errors.atPrice?.message} showIcon />
              </div>
            )}

            {/* Modal Footer Bar - Matches CRM Standard */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-white border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 shrink-0">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsModalOpen(false)}
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
                    <span>{editingProduct ? "Update" : "Save"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. SELECT UNIT MODAL (CRM Standard Theme)                                  */}
      {/* ========================================================================= */}
      {isUnitModalOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-100"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsUnitModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-xl bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92dvh] animate-in zoom-in-95 duration-100 my-auto">
            {/* Modal Header - Matches CRM Standard */}
            <div
              className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4.5 text-white shrink-0"
              style={{ background: "#33077C" }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsUnitModalOpen(false)}
                  className="p-1.5 -ml-1 rounded-xl text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center shrink-0"
                  title="Go back"
                >
                  <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
                </button>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-xl font-bold tracking-tight text-white truncate">
                    Select Unit
                  </h3>
                  <p className="text-xs text-white/80 font-medium truncate mt-0.5">
                    Configure base and secondary units or add custom units
                    manually
                  </p>
                </div>
              </div>

              {/* Right Action Icons */}
              <button
                type="button"
                onClick={() => setIsUnitModalOpen(false)}
                className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - CRM Card Layout */}
            <div className="p-4 sm:p-6 space-y-5 bg-[#fafbfc] flex-1 overflow-y-auto">
              {/* Card 1: Unit Selection */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Unit Configuration
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* BASE UNIT */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Base Unit <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={selectedBaseUnit}
                        onChange={(e) => setSelectedBaseUnit(e.target.value)}
                        className="w-full h-11 px-3.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 outline-none cursor-pointer focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all shadow-2xs"
                      >
                        <option value="">Select Base Unit</option>
                        {allAvailableUnits.map((u) => {
                          const formatted = formatUnitOption(u);
                          return (
                            <option key={u.id} value={formatted}>
                              {formatted}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <FormError
                      message={
                        unitDoneAttempted &&
                        (!selectedBaseUnit || selectedBaseUnit === "None")
                          ? "Please select a base unit."
                          : undefined
                      }
                      showIcon
                    />
                  </div>

                  {/* SECONDARY UNIT */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Secondary Unit
                    </label>
                    <div className="relative">
                      <select
                        value={selectedSecondaryUnit}
                        onChange={(e) =>
                          setSelectedSecondaryUnit(e.target.value)
                        }
                        className="w-full h-11 px-3.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 outline-none cursor-pointer focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all shadow-2xs"
                      >
                        <option value="None">None</option>
                        {allAvailableUnits.map((u) => {
                          const formatted = formatUnitOption(u);
                          return (
                            <option key={u.id} value={formatted}>
                              {formatted}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Add Custom Unit Manually */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#33077C]" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Add Custom Unit Manually
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Reflects in dropdown
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-7">
                    <input
                      type="text"
                      placeholder="Unit Full Name (e.g. Dozen, Pack, Drum)"
                      value={newUnitFullName}
                      onChange={(e) => setNewUnitFullName(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          await handleAddNewCustomUnit();
                        }
                      }}
                      className={`w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:ring-4 transition-all shadow-2xs ${
                        unitModalAttempted && !newUnitFullName.trim()
                          ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10"
                          : "border-slate-300 hover:border-slate-400 focus:border-[#4309A2] focus:ring-[#4309A2]/10"
                      }`}
                    />
                    <FormError
                      message={
                        unitModalAttempted && !newUnitFullName.trim()
                          ? "Please enter the unit name (for example Dozen, Pack or Drum)."
                          : undefined
                      }
                      showIcon
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      placeholder="Short (e.g. Dzn)"
                      value={newUnitShortName}
                      onChange={(e) => setNewUnitShortName(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          await handleAddNewCustomUnit();
                        }
                      }}
                      className="w-full h-11 px-3.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all shadow-2xs uppercase"
                    />
                  </div>

                  <div className="sm:col-span-2 flex items-center">
                    <button
                      type="button"
                      disabled={isCreatingUnit}
                      onClick={() => handleAddNewCustomUnit()}
                      className="w-full h-11 px-3 bg-[#33077C] hover:bg-[#4309A2] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1 shrink-0 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                      title="Add Unit"
                    >
                      {isCreatingUnit ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                          <span>Add</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* List of Units Available */}
                {allAvailableUnits.length > 0 ? (
                  <div className="pt-2.5 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-semibold text-slate-500">
                        Available Units ({allAvailableUnits.length}):
                      </p>
                      {isLoadingUnits && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#33077C]" />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-0.5">
                      {allAvailableUnits.map((u) => {
                        const formatted = formatUnitOption(u);
                        const isCurrentBase = selectedBaseUnit === formatted;
                        const isCurrentSec =
                          selectedSecondaryUnit === formatted;
                        return (
                          <div
                            key={u.id}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                              isCurrentBase
                                ? "bg-purple-100 text-[#33077C] border-purple-300 ring-2 ring-[#33077C]/20 font-bold"
                                : isCurrentSec
                                  ? "bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold"
                                  : "bg-slate-100/80 text-slate-700 border-slate-200 hover:bg-slate-200 cursor-pointer"
                            }`}
                          >
                            <span
                              onClick={() => setSelectedBaseUnit(formatted)}
                              className="cursor-pointer hover:underline"
                              title="Click to select as Base Unit"
                            >
                              {formatted}
                            </span>
                            <button
                              type="button"
                              disabled={deletingUnitId === u.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCustomUnit(u);
                              }}
                              className="text-slate-400 hover:text-red-600 p-0.5 rounded cursor-pointer transition-colors disabled:opacity-50"
                              title="Delete this unit"
                            >
                              {deletingUnitId === u.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                              ) : (
                                <X className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="pt-2.5 border-t border-slate-100 text-center py-3 text-slate-400 text-xs">
                    No custom units added yet. Use the field above to add units.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer - Matches CRM Standard */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-100 bg-white flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsUnitModalOpen(false)}
                className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center gap-2"
              >
                <X className="w-4 h-4 text-slate-500" />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                disabled={isCreatingUnit}
                onClick={async () => {
                  setUnitDoneAttempted(true);
                  let effectiveBase = selectedBaseUnit;
                  let baseUnitObj = allAvailableUnits.find(
                    (u) =>
                      formatUnitOption(u) === selectedBaseUnit ||
                      u.id === selectedBaseUnit ||
                      u.shortCode?.toUpperCase() === selectedBaseUnit?.toUpperCase() ||
                      u.name?.toUpperCase() === selectedBaseUnit?.toUpperCase(),
                  );

                  // If user entered text in custom unit name without clicking Add, create and apply it
                  if (newUnitFullName.trim()) {
                    const created = await handleAddNewCustomUnit();
                    if (created) {
                      baseUnitObj = created;
                      effectiveBase = formatUnitOption(created);
                    }
                  }

                  const chosen =
                    effectiveBase && effectiveBase !== "None"
                      ? effectiveBase
                      : "";
                  if (!chosen) {
                    return; // the inline "base unit" error is shown by the Done-attempt flag
                  }

                  let unitCode = chosen;
                  if (chosen.includes("(")) {
                    const match = chosen.match(/\((.*?)\)/);
                    unitCode = match
                      ? match[1].toUpperCase()
                      : chosen.split(" ")[0];
                  }

                  if (!baseUnitObj && chosen) {
                    baseUnitObj = allAvailableUnits.find(
                      (u) =>
                        formatUnitOption(u) === chosen ||
                        u.id === chosen ||
                        u.shortCode?.toUpperCase() === chosen?.toUpperCase() ||
                        u.name?.toUpperCase() === chosen?.toUpperCase(),
                    );
                  }

                  const secUnitObj =
                    selectedSecondaryUnit && selectedSecondaryUnit !== "None"
                      ? allAvailableUnits.find(
                          (u) =>
                            formatUnitOption(u) === selectedSecondaryUnit ||
                            u.id === selectedSecondaryUnit ||
                            u.shortCode?.toUpperCase() === selectedSecondaryUnit?.toUpperCase() ||
                            u.name?.toUpperCase() === selectedSecondaryUnit?.toUpperCase(),
                        )
                      : null;

                  const finalUnit =
                    unitCode ||
                    baseUnitObj?.shortCode ||
                    baseUnitObj?.name ||
                    "";
                  setFormData({
                    ...formData,
                    unit: finalUnit,
                    baseUnitId: baseUnitObj?.id,
                    secondaryUnitId:
                      secUnitObj && !secUnitObj.id.startsWith("unit-")
                        ? secUnitObj.id
                        : null,
                    secondaryUnit: secUnitObj
                      ? secUnitObj.shortCode || secUnitObj.name
                      : undefined,
                  });
                  setIsUnitModalOpen(false);
                  toast.success(`Unit set to ${finalUnit}`);
                }}
                className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2 disabled:opacity-60"
              >
                {isCreatingUnit ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Check className="w-4 h-4 stroke-[2.5]" />
                )}
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. HSN / SAC SEARCH MODAL */}
      {/* ========================================================================= */}
      {isHsnModalOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-100"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsHsnModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-lg bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90dvh]">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-100 bg-[#33077C] text-white shrink-0">
              <h3 className="text-base font-bold text-white">
                Search HSN / SAC Code
              </h3>
              <button
                type="button"
                onClick={() => setIsHsnModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by HSN code or description..."
                  value={hsnSearchQuery}
                  onChange={(e) => setHsnSearchQuery(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#4309A2] focus:bg-white"
                />
              </div>

              <div className="space-y-1.5 max-h-72 overflow-y-auto p-1">
                {filteredHsn.map((h) => (
                  <div
                    key={h.code}
                    onClick={() => {
                      setFormData({ ...formData, hsnCode: h.code });
                      setIsHsnModalOpen(false);
                    }}
                    className="p-3 rounded-xl border border-slate-200 hover:border-[#33077C] hover:bg-purple-50/40 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        HSN: {h.code}
                      </div>
                      <div className="text-[11px] text-slate-500">{h.desc}</div>
                    </div>
                    <span className="text-xs font-bold text-[#33077C]">
                      Select
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. BULK ASSIGN UNITS QUICK MODAL */}
      {/* ========================================================================= */}
      {isBulkUnitModalOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-100"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsBulkUnitModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-md bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90dvh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-[#33077C] text-white">
              <h3 className="text-base font-bold text-white">
                Assign Units in Bulk
              </h3>
              <button
                type="button"
                onClick={() => setIsBulkUnitModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-500">
                Select the unit of measurement to apply to{" "}
                <strong className="text-slate-800">
                  {selectedIds.length > 0
                    ? `${selectedIds.length} selected item(s)`
                    : "all items"}
                </strong>
                .
              </p>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Select Unit
                </label>
                <select
                  value={selectedBulkUnit}
                  onChange={(e) => setSelectedBulkUnit(e.target.value)}
                  className="w-full h-11 px-4 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-[#33077C]"
                >
                  {allAvailableUnits.length === 0 ? (
                    <option value="PCS">PCS - Pieces</option>
                  ) : (
                    allAvailableUnits.map((u) => (
                      <option key={u.id} value={u.shortCode || u.name}>
                        {u.shortCode ? `${u.shortCode} - ${u.name}` : u.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkUnitModalOpen(false)}
                  className="h-9 px-4 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkAssignUnitsSubmit}
                  className="h-9 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold shadow-xs"
                >
                  Apply Unit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. FULL "BULK UPDATE ITEMS" SCREEN (MATCHING USER SCREENSHOT EXACTLY) */}
      {/* ========================================================================= */}
      {isBulkUpdateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150 overflow-hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsBulkUpdateModalOpen(false);
          }}
        >
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveBulkUpdate();
            }}
            className="relative w-full max-w-7xl h-[93dvh] bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          >
            {/* 10.1 Top Header Bar - Matches CRM Standard #33077C Theme */}
            <div
              className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 text-white shrink-0"
              style={{ background: "#33077C" }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsBulkUpdateModalOpen(false)}
                  className="p-1.5 -ml-1 rounded-xl text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center shrink-0"
                  title="Go back"
                >
                  <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
                </button>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-xl font-bold tracking-tight text-white truncate">
                    Bulk Update Items
                  </h3>
                  <p className="text-xs text-white/80 font-medium truncate mt-0.5">
                    Bulk edit inventory pricing, stock quantities, and item
                    information
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkUpdateModalOpen(false)}
                  className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 10.2 Controls & Tabs Secondary Toolbar */}
            <div className="px-4 sm:px-6 py-3 border-b border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
              {/* Left: Search input */}
              <div className="relative w-full md:w-auto">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by item name / HSN Code"
                  value={bulkSearch}
                  onChange={(e) => setBulkSearch(e.target.value)}
                  className="w-full md:w-72 h-9.5 pl-9 pr-3 bg-white border border-slate-300 hover:border-slate-400 focus:border-[#33077C] focus:ring-2 focus:ring-[#33077C]/15 rounded-xl text-xs sm:text-[13px] font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all shadow-2xs"
                />
              </div>

              {/* Center: Tabs styled with CRM brand theme */}
              <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 overflow-x-auto max-w-full">
                {(["Pricing", "Stock", "Item Information"] as const).map(
                  (tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setBulkTab(tab)}
                      className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                        bulkTab === tab
                          ? "bg-[#33077C] text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                      }`}
                    >
                      {tab}
                    </button>
                  ),
                )}
              </div>

              {/* Right: Selected items counter badge (Update Tax Slab removed) */}
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-[#33077C] border border-purple-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#33077C]"></span>
                  <span>{bulkSelectedIds.length} items selected</span>
                </span>
              </div>
            </div>

            {/* Validation Error Banner */}
            {Object.keys(bulkRowErrors).length > 0 && (
              <div className="mx-4 sm:mx-6 my-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start justify-between gap-3 text-rose-800 shrink-0 shadow-xs animate-in fade-in">
                <div className="flex items-start gap-2.5 min-w-0">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs min-w-0">
                    <span className="font-bold text-rose-900">
                      Validation Error ({Object.keys(bulkRowErrors).length}{" "}
                      item(s) need correction):
                    </span>
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-rose-700">
                      {Object.entries(bulkRowErrors).map(([id, err]) => (
                        <li key={id} className="truncate">
                          <span className="font-semibold text-rose-900">
                            {(err as any).productCode || id}:
                          </span>{" "}
                          {(err as any).message}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            {/* 10.3 Editable Data Grid - Follows Application Table Format & Theme */}
            <div className="flex-1 overflow-auto bg-white">
              <table className="w-full text-left border-collapse border border-slate-200 min-w-[1100px]">
                <thead>
                  <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white tracking-wider uppercase border-b border-[#33077C]">
                    {/* Checkbox */}
                    <th className="py-3.5 px-3 w-10 text-center border border-[#33077C]/30 bg-[#33077C] text-white">
                      <input
                        type="checkbox"
                        checked={isAllBulkSelected}
                        onChange={handleToggleBulkSelectAll}
                        className="w-4 h-4 rounded text-[#33077C] focus:ring-[#33077C] cursor-pointer"
                      />
                    </th>

                    {/* # Index */}
                    <th className="py-3.5 px-3 w-12 text-center border border-[#33077C]/30 bg-[#33077C] text-white whitespace-nowrap">
                      #
                    </th>

                    {/* Common Header 1: ITEM NAME */}
                    <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white whitespace-nowrap">
                      <div className="flex items-center justify-between gap-1">
                        <span>ITEM NAME*</span>
                        <Filter className="w-3 h-3 text-white/60 hover:text-white" />
                      </div>
                    </th>

                    {/* Common Header 2: CATEGORY */}
                    <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white whitespace-nowrap">
                      <div className="flex items-center justify-between gap-1">
                        <span>CATEGORY</span>
                        <Filter className="w-3 h-3 text-white/60 hover:text-white" />
                      </div>
                    </th>

                    {/* Common Header 3: ITEM HSN */}
                    <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white whitespace-nowrap">
                      <div className="flex items-center justify-between gap-1">
                        <span>ITEM HSN</span>
                        <Filter className="w-3 h-3 text-white/60 hover:text-white" />
                      </div>
                    </th>

                    {/* ================= PRICING TAB COLUMNS ================= */}
                    {bulkTab === "Pricing" && (
                      <>
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1">
                            <span>PURCHASE PRICE</span>
                            <Filter className="w-3 h-3 text-white/60 hover:text-white" />
                          </div>
                        </th>
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1">
                            <span>TAX TYPE</span>
                            <Filter className="w-3 h-3 text-white/60 hover:text-white" />
                          </div>
                        </th>
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1">
                            <span>SALE PRICE</span>
                            <Filter className="w-3 h-3 text-white/60 hover:text-white" />
                          </div>
                        </th>
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1">
                            <span>TAX TYPE</span>
                            <Filter className="w-3 h-3 text-white/60 hover:text-white" />
                          </div>
                        </th>
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1">
                            <span>DISCOUNT ON SALE</span>
                            <Filter className="w-3 h-3 text-white/60 hover:text-white" />
                          </div>
                        </th>
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1">
                            <span>DISCOUNT TYPE</span>
                            <Filter className="w-3 h-3 text-white/60 hover:text-white" />
                          </div>
                        </th>
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1">
                            <span>TAX RATE</span>
                            <Filter className="w-3 h-3 text-white/60 hover:text-white" />
                          </div>
                        </th>
                      </>
                    )}

                    {/* ================= STOCK TAB COLUMNS ================= */}
                    {bulkTab === "Stock" && (
                      <>
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1">
                            <span>OPENING QUANTITY</span>
                            <Filter className="w-3 h-3 text-white/60 hover:text-white" />
                          </div>
                        </th>
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1">
                            <span>AT PRICE</span>
                            <Filter className="w-3 h-3 text-white/60 hover:text-white" />
                          </div>
                        </th>
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1">
                            <span>AS OF DATE</span>
                            <Filter className="w-3 h-3 text-white/60 hover:text-white" />
                          </div>
                        </th>
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1">
                            <span>MIN STOCK TO MAINTAIN</span>
                            <Filter className="w-3 h-3 text-white/60 hover:text-white" />
                          </div>
                        </th>
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1">
                            <span>LOCATION</span>
                            <Filter className="w-3 h-3 text-white/60 hover:text-white" />
                          </div>
                        </th>
                      </>
                    )}

                    {/* ================= ITEM INFO TAB COLUMNS (NO TYPE COLUMN) ================= */}
                    {bulkTab === "Item Information" && (
                      <>
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1">
                            <span>ITEM CODE</span>
                            <Filter className="w-3 h-3 text-white/60 hover:text-white" />
                          </div>
                        </th>
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1">
                            <span>UNIT</span>
                            <Filter className="w-3 h-3 text-white/60 hover:text-white" />
                          </div>
                        </th>
                        <th className="py-3.5 px-4 border border-[#33077C]/30 bg-[#33077C] text-white whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1">
                            <span>STATUS</span>
                            <Filter className="w-3 h-3 text-white/60 hover:text-white" />
                          </div>
                        </th>
                      </>
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 text-xs">
                  {filteredBulkItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={12}
                        className="py-16 text-center text-slate-400 font-medium"
                      >
                        No items found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredBulkItems.map((item, index) => {
                      const isSelected = bulkSelectedIds.includes(item.id);

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-purple-50/20 transition-colors border-b border-slate-200 ${
                            isSelected ? "bg-purple-50/40" : ""
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3 px-3 text-center border-r border-slate-200">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() =>
                                handleToggleBulkSelectRow(item.id)
                              }
                              className="w-4 h-4 rounded text-[#33077C] focus:ring-[#33077C] cursor-pointer"
                            />
                          </td>

                          {/* # Index */}
                          <td className="py-3 px-3 text-center font-medium text-slate-500 border-r border-slate-200">
                            {index + 1}
                          </td>

                          {/* ITEM NAME */}
                          <td className="py-2.5 px-3 border-r border-slate-200">
                            <input
                              type="text"
                              value={item.productName}
                              onChange={(e) =>
                                handleBulkItemChange(
                                  item.id,
                                  "productName",
                                  e.target.value,
                                )
                              }
                              className="w-full h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#33077C] rounded-lg font-semibold text-slate-800 outline-none transition-all"
                            />
                          </td>

                          {/* CATEGORY */}
                          <td className="py-2.5 px-3 border-r border-slate-200">
                            <select
                              value={item.category}
                              onChange={(e) =>
                                handleBulkItemChange(
                                  item.id,
                                  "category",
                                  e.target.value,
                                )
                              }
                              className="w-full h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#33077C] rounded-lg text-slate-700 outline-none cursor-pointer transition-all"
                            >
                              <option value="---">---</option>
                              {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* ITEM HSN */}
                          <td className="py-2.5 px-3 border-r border-slate-200">
                            <input
                              type="text"
                              value={item.hsnCode || "---"}
                              onChange={(e) =>
                                handleBulkItemChange(
                                  item.id,
                                  "hsnCode",
                                  e.target.value,
                                )
                              }
                              className="w-full h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#33077C] rounded-lg text-slate-700 outline-none transition-all"
                            />
                          </td>

                          {/* ================= PRICING TAB ROW FIELDS ================= */}
                          {bulkTab === "Pricing" && (
                            <>
                              {/* PURCHASE PRICE */}
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                <div className="flex items-center">
                                  <span className="text-slate-400 mr-1 font-semibold">
                                    ₹
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={item.purchasePrice || ""}
                                    onKeyDown={handleNonNegativeKeyDown}
                                    onChange={(e) =>
                                      handleBulkItemChange(
                                        item.id,
                                        "purchasePrice",
                                        Number(e.target.value),
                                      )
                                    }
                                    className="w-24 h-8 px-1.5 bg-transparent hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#33077C] rounded-lg font-medium text-slate-800 outline-none transition-all"
                                  />
                                </div>
                              </td>

                              {/* PURCHASE TAX TYPE */}
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                <select
                                  value={
                                    item.purchasePriceTaxType || "Excluded"
                                  }
                                  onChange={(e) =>
                                    handleBulkItemChange(
                                      item.id,
                                      "purchasePriceTaxType",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#33077C] rounded-lg text-slate-700 outline-none cursor-pointer transition-all"
                                >
                                  <option value="Excluded">Excluded</option>
                                  <option value="Included">Included</option>
                                </select>
                              </td>

                              {/* SALE PRICE */}
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                <div className="flex items-center">
                                  <span className="text-slate-400 mr-1 font-semibold">
                                    ₹
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={item.salePrice || ""}
                                    onKeyDown={handleNonNegativeKeyDown}
                                    onChange={(e) =>
                                      handleBulkItemChange(
                                        item.id,
                                        "salePrice",
                                        Number(e.target.value),
                                      )
                                    }
                                    className="w-24 h-8 px-1.5 bg-transparent hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#33077C] rounded-lg font-bold text-slate-800 outline-none transition-all"
                                  />
                                </div>
                              </td>

                              {/* SALE TAX TYPE */}
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                <select
                                  value={item.salePriceTaxType || "Excluded"}
                                  onChange={(e) =>
                                    handleBulkItemChange(
                                      item.id,
                                      "salePriceTaxType",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#33077C] rounded-lg text-slate-700 outline-none cursor-pointer transition-all"
                                >
                                  <option value="Excluded">Excluded</option>
                                  <option value="Included">Included</option>
                                </select>
                              </td>

                              {/* DISCOUNT ON SALE */}
                              <td
                                className={`py-2.5 px-3 border-r border-slate-200 ${bulkRowErrors[item.id] ? "bg-rose-50/50" : ""}`}
                              >
                                <input
                                  type="number"
                                  min="0"
                                  value={item.discountValue || ""}
                                  onKeyDown={handleNonNegativeKeyDown}
                                  onChange={(e) =>
                                    handleBulkItemChange(
                                      item.id,
                                      "discountValue",
                                      Number(e.target.value),
                                    )
                                  }
                                  className={`w-20 h-8 px-1.5 bg-transparent hover:bg-slate-50 focus:bg-white border rounded-lg text-slate-800 outline-none transition-all ${
                                    bulkRowErrors[item.id]?.field ===
                                    "discountValue"
                                      ? "border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-500/20 font-bold"
                                      : "border-slate-200 hover:border-slate-300 focus:border-[#33077C]"
                                  }`}
                                  title={bulkRowErrors[item.id]?.message || ""}
                                />
                                {bulkRowErrors[item.id]?.field ===
                                  "discountValue" && (
                                  <span
                                    className="text-[10px] text-rose-600 font-bold block truncate max-w-[120px] mt-0.5"
                                    title={bulkRowErrors[item.id].message}
                                  >
                                    Exceeds price
                                  </span>
                                )}
                              </td>

                              {/* DISCOUNT TYPE */}
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                <select
                                  value={item.discountType || "Percentage"}
                                  onChange={(e) =>
                                    handleBulkItemChange(
                                      item.id,
                                      "discountType",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#33077C] rounded-lg text-slate-700 outline-none cursor-pointer transition-all"
                                >
                                  <option value="Percentage">Percentage</option>
                                  <option value="Amount">Amount</option>
                                </select>
                              </td>

                              {/* TAX RATE */}
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                <select
                                  value={item.taxRate || "None"}
                                  onChange={(e) =>
                                    handleBulkItemChange(
                                      item.id,
                                      "taxRate",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#33077C] rounded-lg text-slate-700 outline-none cursor-pointer transition-all"
                                >
                                  {TAX_RATE_OPTIONS.map((t) => (
                                    <option key={t.value} value={t.value}>
                                      {t.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            </>
                          )}

                          {/* ================= STOCK TAB ROW FIELDS ================= */}
                          {bulkTab === "Stock" && (
                            <>
                              {/* OPENING QUANTITY */}
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.openingStock}
                                  onKeyDown={handleNonNegativeKeyDown}
                                  onChange={(e) =>
                                    handleBulkItemChange(
                                      item.id,
                                      "openingStock",
                                      Number(e.target.value),
                                    )
                                  }
                                  className="w-24 h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#33077C] rounded-lg font-bold text-slate-800 outline-none transition-all"
                                />
                              </td>

                              {/* AT PRICE */}
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                <div className="flex items-center">
                                  <span className="text-slate-400 mr-1 font-semibold">
                                    ₹
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={item.atPrice || ""}
                                    onKeyDown={handleNonNegativeKeyDown}
                                    onChange={(e) =>
                                      handleBulkItemChange(
                                        item.id,
                                        "atPrice",
                                        Number(e.target.value),
                                      )
                                    }
                                    className="w-24 h-8 px-1.5 bg-transparent hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#33077C] rounded-lg text-slate-800 outline-none transition-all"
                                  />
                                </div>
                              </td>

                              {/* AS OF DATE */}
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                <input
                                  type="date"
                                  value={item.asOfDate || ""}
                                  onChange={(e) =>
                                    handleBulkItemChange(
                                      item.id,
                                      "asOfDate",
                                      e.target.value,
                                    )
                                  }
                                  className="h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#33077C] rounded-lg text-slate-700 outline-none cursor-pointer transition-all"
                                />
                              </td>

                              {/* MIN STOCK TO MAINTAIN */}
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.minStockAlert || ""}
                                  onKeyDown={handleNonNegativeKeyDown}
                                  onChange={(e) =>
                                    handleBulkItemChange(
                                      item.id,
                                      "minStockAlert",
                                      Number(e.target.value),
                                    )
                                  }
                                  className="w-24 h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#33077C] rounded-lg text-slate-800 outline-none transition-all"
                                />
                              </td>

                              {/* LOCATION */}
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                <input
                                  type="text"
                                  value={item.location || ""}
                                  onChange={(e) =>
                                    handleBulkItemChange(
                                      item.id,
                                      "location",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="e.g. Rack A"
                                  className="w-full h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#33077C] rounded-lg text-slate-700 outline-none transition-all"
                                />
                              </td>
                            </>
                          )}

                          {/* ================= ITEM INFO TAB ROW FIELDS (NO TYPE COLUMN) ================= */}
                          {bulkTab === "Item Information" && (
                            <>
                              {/* ITEM CODE */}
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                <input
                                  type="text"
                                  value={item.productCode}
                                  onChange={(e) =>
                                    handleBulkItemChange(
                                      item.id,
                                      "productCode",
                                      e.target.value,
                                    )
                                  }
                                  className="w-28 h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#33077C] rounded-lg font-mono text-slate-800 outline-none transition-all"
                                />
                              </td>

                              {/* UNIT */}
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                <select
                                  value={item.unit}
                                  onChange={(e) =>
                                    handleBulkItemChange(
                                      item.id,
                                      "unit",
                                      e.target.value,
                                    )
                                  }
                                  className="w-24 h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#33077C] rounded-lg text-slate-700 outline-none cursor-pointer transition-all"
                                >
                                  {allAvailableUnits.length === 0 ? (
                                    <option value={item.unit || "PCS"}>
                                      {item.unit || "PCS"}
                                    </option>
                                  ) : (
                                    allAvailableUnits.map((u) => (
                                      <option
                                        key={u.id}
                                        value={u.shortCode || u.name}
                                      >
                                        {u.shortCode || u.name}
                                      </option>
                                    ))
                                  )}
                                </select>
                              </td>

                              {/* STATUS */}
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                <select
                                  value={item.status}
                                  onChange={(e) =>
                                    handleBulkItemChange(
                                      item.id,
                                      "status",
                                      e.target.value as any,
                                    )
                                  }
                                  className="w-24 h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#33077C] rounded-lg text-slate-700 outline-none cursor-pointer transition-all font-semibold"
                                >
                                  <option value="Active">Active</option>
                                  <option value="Inactive">Inactive</option>
                                </select>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* 10.4 Bottom Action Footer Bar - Matches CRM Standard */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-white border-t border-slate-200 flex items-center justify-end gap-2.5 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsBulkUpdateModalOpen(false)}
                disabled={isSavingBulkUpdate}
                className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4 text-slate-500" />
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                disabled={isSavingBulkUpdate}
                className="h-10 px-6 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSavingBulkUpdate ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Update</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 8. Product Details Modal (GET /commerce/products/:id) */}
      {isDetailModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-100 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsDetailModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-2xl bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92dvh] my-auto">
            {/* Header */}
            <div
              className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4.5 text-white shrink-0"
              style={{ background: "#33077C" }}
            >
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 -ml-1 rounded-xl text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center shrink-0"
                title="Go back"
              >
                <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
              </button>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white truncate">
                  Item Details
                </h3>
                <p className="text-xs sm:text-[13px] text-white/80 font-medium truncate">
                  Product information, pricing, stock, and batch details
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs sm:text-[13px] bg-[#fafbfc]">
              {isLoadingDetail ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-8 h-8 text-[#33077C] animate-spin" />
                  <span className="text-xs font-semibold text-slate-500">
                    Fetching item details...
                  </span>
                </div>
              ) : selectedProductDetail ? (
                <>
                  {/* Header info card */}
                  <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-start gap-4">
                    <ProductThumbnail
                      src={
                        selectedProductDetail.itemImage ||
                        selectedProductDetail.image ||
                        selectedProductDetail.imageBase64
                      }
                      fallbackSrc={
                        selectedProductDetail.imageBase64 ||
                        selectedProductDetail.image
                      }
                      productId={selectedProductDetail.id}
                      productCode={selectedProductDetail.productCode}
                      alt={selectedProductDetail.productName}
                      size="lg"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-[#33077C] text-xs">
                          {selectedProductDetail.productCode}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            selectedProductDetail.itemType === "Product"
                              ? "bg-[#33077C]/10 text-[#33077C]"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {selectedProductDetail.itemType}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            selectedProductDetail.status === "Active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              selectedProductDetail.status === "Active"
                                ? "bg-emerald-500"
                                : "bg-slate-400"
                            }`}
                          />
                          {selectedProductDetail.status}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900 leading-tight">
                        {selectedProductDetail.productName}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Category:{" "}
                        <span className="font-semibold text-slate-800">
                          {selectedProductDetail.category}
                        </span>
                        {selectedProductDetail.subcategory && (
                          <span>
                            {" "}
                            • Subcategory:{" "}
                            <span className="font-semibold text-slate-800">
                              {selectedProductDetail.subcategory}
                            </span>
                          </span>
                        )}
                        {selectedProductDetail.hsnCode && (
                          <span>
                            {" "}
                            • HSN:{" "}
                            <span className="font-semibold text-slate-800">
                              {selectedProductDetail.hsnCode}
                            </span>
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Pricing & Stock Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-400 block mb-0.5">
                        Sale Price
                      </span>
                      <span className="text-sm font-black text-[#33077C]">
                        ₹
                        {Number(selectedProductDetail.salePrice).toLocaleString(
                          "en-IN",
                        )}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        ({selectedProductDetail.salePriceTaxType})
                      </span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-400 block mb-0.5">
                        Purchase Price
                      </span>
                      <span className="text-sm font-black text-slate-800">
                        ₹
                        {Number(
                          selectedProductDetail.purchasePrice || 0,
                        ).toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        (
                        {selectedProductDetail.purchasePriceTaxType ||
                          "Excluded"}
                        )
                      </span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-400 block mb-0.5">
                        Available Stock
                      </span>
                      <span className="text-sm font-black text-slate-800">
                        {selectedProductDetail.currentStock !== undefined
                          ? selectedProductDetail.currentStock
                          : (selectedProductDetail.openingStock ?? 0)}{" "}
                        {selectedProductDetail.unit}
                      </span>
                      {selectedProductDetail.openingStock !== undefined &&
                        selectedProductDetail.currentStock !== undefined &&
                        selectedProductDetail.openingStock !==
                          selectedProductDetail.currentStock && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Opening: {selectedProductDetail.openingStock}{" "}
                            {selectedProductDetail.unit}
                          </span>
                        )}
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Min Alert: {selectedProductDetail.minStockAlert ?? 0}
                      </span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-400 block mb-0.5">
                        Tax Rate
                      </span>
                      <span className="text-sm font-bold text-slate-800">
                        {selectedProductDetail.taxRate || "None"}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Location: {selectedProductDetail.location || "N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Wholesale info if configured */}
                  {selectedProductDetail.hasWholesale && (
                    <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[11px] font-bold text-[#33077C] block">
                          Wholesale Pricing
                        </span>
                        <span className="text-slate-600">
                          Min Quantity:{" "}
                          <strong>
                            {selectedProductDetail.minWholesaleQty}{" "}
                            {selectedProductDetail.unit}
                          </strong>
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-[#33077C]">
                          ₹
                          {Number(
                            selectedProductDetail.wholesalePrice,
                          ).toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          ({selectedProductDetail.wholesaleTaxType})
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Stock Batches if present */}
                  {selectedProductDetail.stockBatches &&
                    selectedProductDetail.stockBatches.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="font-bold text-slate-800 text-xs">
                          Stock Batches
                        </h5>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {selectedProductDetail.stockBatches.map((b) => (
                            <div
                              key={b.id}
                              className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-[#33077C]">
                                  {b.batchNo}
                                </span>
                                <span className="text-slate-500 text-[11px] block">
                                  Qty: {b.quantity} • Cost: ₹{b.costPrice} •
                                  Sell: ₹{b.sellingPrice}
                                </span>
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {b.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </>
              ) : null}
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-6 py-3 bg-white border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="h-9 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal from Category View */}
      {isAddCategoryModalOpen && (
        <AddCategoryModal
          isOpen={isAddCategoryModalOpen}
          onClose={() => setIsAddCategoryModalOpen(false)}
          onCategoryCreated={(newCat) => {
            const catName =
              (newCat as any).categoryName || (newCat as any).name || "";
            if (catName) {
              if (!categories.includes(catName)) {
                setCategories((prev) => [catName, ...prev]);
              }
              setFormData((prev) => ({
                ...prev,
                category: catName,
                subcategory: "",
              }));
            }
            setIsAddCategoryModalOpen(false);
          }}
        />
      )}

      {/* Add Subcategory Modal from Subcategory View */}
      {isAddSubcategoryModalOpen && (
        <AddSubcategoryModal
          isOpen={isAddSubcategoryModalOpen}
          onClose={() => setIsAddSubcategoryModalOpen(false)}
          initialCategory={formData.category}
          categories={categories}
          onSubcategoryCreated={(newSub) => {
            const subName =
              (newSub as any).subcategory || (newSub as any).name || "";
            const catName =
              (newSub as any).category ||
              (newSub as any).categoryName ||
              formData.category;
            if (subName) {
              setMasterSubcategories((prev) => [newSub as any, ...prev]);
              setFormData((prev) => ({
                ...prev,
                category: catName || prev.category,
                subcategory: subName,
              }));
            }
            setIsAddSubcategoryModalOpen(false);
          }}
        />
      )}

      {/* 9. Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={Boolean(deleteConfirmItem)}
        onClose={() => {
          if (!isDeleting) {
            setDeleteConfirmItem(null);
            setDeleteProductError(null);
          }
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Product"
        entityName="Product"
        recordName={deleteConfirmItem?.productName}
        isLoading={isDeleting}
        error={deleteProductError}
      />
    </div>
  );
};
