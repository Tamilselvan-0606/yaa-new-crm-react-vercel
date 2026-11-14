import { CommonTableHead } from '../../../components/common/CommonTableHead';
import React, {
  useState,
  useMemo,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
} from "react";
import {
  Layers,
  Plus,
  Search,
  Filter,
  Eye,
  Edit3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Package,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  MoreVertical,
  SlidersHorizontal,
  Check,
  X,
  Calendar,
  Tag,
  ShieldCheck,
  History,
  Boxes,
  FileText,
  Activity,
  Layers3,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
  Printer,
  Download,
} from "lucide-react";
import { useForm } from "react-hook-form";
import {
  InventoryStockItem,
  StockBatch,
} from "../../../store/useSalesManagementStore";
import { Button } from "../../../components/common/Button";
import { Modal } from "../../../components/common/Modal";
import { Pagination } from "../../../components/common/Pagination";
import { SearchBar } from "../../../components/common/SearchBar";
import { ProductSearchableSelect, BatchSearchableSelect } from "../../../components/common/paginated-select";
import { FilterDropdown } from "../../../components/common/FilterDropdown";
import { exportTableToExcel } from "../../../utils/excelExport";
import { printBusinessDocument, printTableReport, downloadBusinessDocument, downloadTableReport, DocumentPrintOptions } from "../../../utils/printUtils";
import { toast } from "../../../utils/toast";
import { fetchAllReportRows, runReport } from "../../../utils/reportData";
import { SaleActionDropdown } from "../utils/SaleActionDropdown";
import type { StockListSummary } from "../../../api/commerce/stockTypes";
import {
  stockApi,
  mapApiStockToInventoryStockItem,
  mapApiStockBatchToStockBatch,
  ApiStockItem,
  ApiStockBatch,
  ApiStockMovement,
  AdjustStockPayload,
  productApi,
  categoryApi,
} from "../../../api";
import { FormError } from "../../../components/common/FormError";
import {
  useFieldErrors,
  useRevalidateAfterSubmit,
  useSubmitGuard,
  fieldAttr,
  collectErrors,
  checkRequiredSelection,
  checkRequiredText,
  checkQuantity,
  checkStockAvailable,
  checkNumber,
  checkMoney,
  checkDateNotBefore,
  extractApiFieldErrors,
  getApiErrorMessage,
} from "../../../utils/formValidation";

import { formatDate } from '../utils/dateUtils';
import { DateInput } from "../../../components/common/DateInput";
export interface EditStockFormValues {
  productName: string;
  sku: string;
  category: string;
  subcategory: string;
  unit: string;
  reorderLevel: number | string;
  unitCost: number | string;
  unitPrice: number | string;
}

export interface CatalogProductItem {
  id: string;
  name: string;
  sku: string;
  unit: string;
  category: string;
  subcategory?: string;
  unitCost: number;
  unitPrice: number;
  openingStock?: number;
  isBatchTracking?: boolean;
  batchNo?: string;
  initialBatchNo?: string;
  mfgDate?: string;
  expDate?: string;
  stockBatches?: ApiStockBatch[];
  itemImage?: string;
}

interface StockProductThumbnailProps {
  src?: string | null;
  fallbackSrc?: string | null;
  productId?: string;
  sku: string;
  productName: string;
}

const StockProductThumbnail: React.FC<StockProductThumbnailProps> = ({
  src,
  fallbackSrc,
  productId,
  sku,
  productName,
}) => {
  const [currentSrc, setCurrentSrc] = useState<string | null>(src || null);
  const [triedFallback, setTriedFallback] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (src) {
      setCurrentSrc(src);
      setTriedFallback(false);
      setHasError(false);
      return;
    }
    setCurrentSrc(null);
    setTriedFallback(false);
    setHasError(false);
  }, [src, productId, sku]);

  const handleImageError = () => {
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
    setHasError(true);
  };

  const isValid = Boolean(
    currentSrc &&
      typeof currentSrc === "string" &&
      currentSrc.trim() !== "" &&
      currentSrc !== "null" &&
      currentSrc !== "undefined" &&
      currentSrc !== "None" &&
      currentSrc !== "none",
  );

  if (isValid && !hasError) {
    return (
      <img
        src={currentSrc!}
        alt={productName}
        onError={handleImageError}
        loading="lazy"
        className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
      />
    );
  }

  return (
    <div className="w-10 h-10 rounded-full bg-[#33077C] text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-xs shrink-0 select-none">
      {sku.replace("SKU-", "").slice(0, 3)}
    </div>
  );
};

export const StocksView: React.FC = () => {
  // Live API Stocks State - zero initial mock data
  const [stocks, setStocks] = useState<InventoryStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState<boolean | null>(null);
  const [totalApiRecords, setTotalApiRecords] = useState<number | null>(null);
  const [apiSummary, setApiSummary] = useState<StockListSummary | null>(null);
  const [totalApiPages, setTotalApiPages] = useState<number | null>(null);

  // Request deduplication & Batch cache
  const requestSeqRef = useRef(0); // latest request wins; a superseded response is ignored
  const lastFetchKeyRef = useRef<string | null>(null);
  const cachedBatchesRef = useRef<Map<string, StockBatch[]> | null>(null);

  // Catalog products & categories from API for modal dropdowns and filters
  const [catalogProducts, setCatalogProducts] = useState<CatalogProductItem[]>([]);
  const catalogProductsRef = useRef<CatalogProductItem[]>([]);

  // Load Catalog products from API for authoritative batch matching & product metadata
  const loadCatalogProducts = useCallback(async () => {
    try {
      const res = await productApi.getProducts({
        activeOnly: true,
        pagination_required: false,
        page_size: 200,
      });
      if (res && res.success && Array.isArray(res.data)) {
        const items: CatalogProductItem[] = res.data.map((p) => ({
          id: p.id,
          name: p.productName || p.name || 'Unnamed',
          sku: p.productCode || p.sku || 'N/A',
          category: p.category || 'General',
          subcategory: p.subcategory || 'General',
          unit: p.unit || 'Units',
          unitCost: Number(p.purchasePrice || (p as any).unitCost || 0),
          unitPrice: Number(p.salePrice || (p as any).unitPrice || 0),
          reorderLevel: Number(p.minStockAlert || p.reorderLevel || 10),
          isBatchTracking: Boolean(p.isBatchTracking || (p as any).is_batch_tracking),
          batchNo: p.batchNo || (p as any).batch || undefined,
          initialBatchNo: p.batchNo || (p as any).batch || (p as any).initialBatchNo || undefined,
          mfgDate: p.mfgDate || undefined,
          expDate: p.expDate || undefined,
          itemImage: p.itemImage || (p as any).image || undefined,
        }));
        setCatalogProducts(items);
        catalogProductsRef.current = items;
        return items;
      }
    } catch (err) {
      console.warn('Failed to load catalog products for batch matching:', err);
    }
    return [];
  }, []);
  const [apiCategories, setApiCategories] = useState<string[]>([]);

  // Movement Ledger API State
  const [apiLedgerMovements, setApiLedgerMovements] = useState<
    ApiStockMovement[]
  >([]);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);

  // Search & Filter State
  const [pendingSearch, setPendingSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [pendingCategory, setPendingCategory] = useState("All");
  const [appliedCategory, setAppliedCategory] = useState("All");
  const [pendingStatus, setPendingStatus] = useState("All");
  const [appliedStatus, setAppliedStatus] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // 3-Dots Action dropdown
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);

  // Close action dropdown on click outside or scroll
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest(".stock-action-dropdown-container") &&
        !target.closest(".stock-action-dropdown-menu")
      ) {
        setActiveDropdownId(null);
        setDropdownPos(null);
      }
    };
    const handleScroll = () => {
      if (activeDropdownId) {
        setActiveDropdownId(null);
        setDropdownPos(null);
      }
    };
    window.addEventListener("click", handleOutside);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("click", handleOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [activeDropdownId]);

  // Modals
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<InventoryStockItem | null>(
    null,
  );
  const [detailTab, setDetailTab] = useState<
    "overview" | "batches" | "movements"
  >("overview");
  const [isDownloadingStockSlip, setIsDownloadingStockSlip] = useState(false);
  const [isDownloadingStocksReport, setIsDownloadingStocksReport] = useState(false);

  // Adjust Form State with Batch
  const [adjustType, setAdjustType] = useState<"add" | "deduct">("add");
  const [adjustQty, setAdjustQty] = useState<string>("10");
  const fe = useFieldErrors();
  const adjustGuard = useSubmitGuard();
  const editGuard = useSubmitGuard();
  const [adjustReason, setAdjustReason] = useState("Purchase Restock");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [batchMode, setBatchMode] = useState<"existing" | "new">("existing");
  const [selectedBatchNo, setSelectedBatchNo] = useState<string>("");
  const [newBatchNo, setNewBatchNo] = useState<string>("");
  const [batchMfgDate, setBatchMfgDate] = useState<string>("");
  const [batchExpDate, setBatchExpDate] = useState<string>("");

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

  // React Hook Form instance for Edit Stock Modal
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    setError: setEditError,
    clearErrors: clearEditErrors,
    getValues: getEditValues,
    watch: watchEdit,
    formState: { errors: editErrors, isSubmitted: isEditSubmitted },
  } = useForm<EditStockFormValues>({
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      productName: "",
      sku: "",
      category: "",
      subcategory: "",
      unit: "",
      reorderLevel: 10,
      unitCost: 0,
      unitPrice: 0,
    },
  });

  // Load Stocks from API with strict deduplication guards and batch resolution
  const loadStocks = useCallback(
    async (
      forceRefresh = false,
      overrides?: {
        search?: string;
        category?: string;
        status?: string;
        page?: number;
      }
    ) => {
      const targetPage = overrides?.page ?? currentPage;
      const targetSearch = overrides?.search !== undefined ? overrides.search : appliedSearch;
      const targetCategory = overrides?.category !== undefined ? overrides.category : appliedCategory;
      const targetStatus = overrides?.status !== undefined ? overrides.status : appliedStatus;
      const fetchKey = `${targetPage}_${pageSize}_${targetSearch.trim()}_${targetCategory}_${targetStatus}`;
      if (!forceRefresh && lastFetchKeyRef.current === fetchKey) return;

      const seq = ++requestSeqRef.current;
      lastFetchKeyRef.current = fetchKey;
      setIsLoading(true);

      try {
        if (catalogProductsRef.current.length === 0) {
          await loadCatalogProducts();
        }
        const isLowStock = targetStatus === "Low Stock";
        const res = await stockApi.getStocks({
          page_no: targetPage,
          page_size: pageSize,
          pagination_required: true,
          search: targetSearch.trim() || undefined,
          sortOrder: "desc",
          category: targetCategory !== "All" && targetCategory !== "ALL" ? targetCategory : undefined,
          lowStock: isLowStock ? true : undefined,
        });
        if (seq !== requestSeqRef.current) return;

        const batchesByProductId = cachedBatchesRef.current || new Map<string, StockBatch[]>();

        if (
          res &&
          res.success &&
          Array.isArray(res.data)
        ) {
          const currentCatalog = catalogProductsRef.current;
          const mapped = res.data.map((item) => {
            const stk = mapApiStockToInventoryStockItem(item);
            const itemBatches: StockBatch[] = [...(stk.batches || [])];

            // 1. Merge batches from /commerce/stocks/batches if cached
            const apiBatches = [
              ...(batchesByProductId.get(stk.productId) || []),
              ...(batchesByProductId.get(stk.id) || []),
              ...(batchesByProductId.get(stk.sku) || []),
            ];
            apiBatches.forEach((ab) => {
              const exIdx = itemBatches.findIndex(
                (eb) => eb.batchNo.toLowerCase() === ab.batchNo.toLowerCase(),
              );
              if (exIdx === -1) {
                itemBatches.push(ab);
              } else if (itemBatches[exIdx].quantity === 0 && ab.quantity > 0) {
                itemBatches[exIdx] = ab;
              }
            });

            const cat = currentCatalog.find(
              (p) => p.id === stk.productId || p.id === stk.id || p.sku === stk.sku,
            );

            // Determine authoritative stock from API response
            let effectiveInStock =
              typeof stk.inStock === 'number' && !isNaN(stk.inStock)
                ? stk.inStock
                : 0;

            // Determine authoritative batch from product master data or API stock item
            // The stock API response is the source of truth. Catalog batch data is only a
            // fallback when the API returned no batches for this item.
            const authoritativeBatchNo = (
              (stk as any).batchNo ||
              (stk as any).initialBatchNo ||
              (itemBatches.length === 0 ? cat?.batchNo || cat?.initialBatchNo : '') ||
              ''
            ).trim();

            // Only synthesize a batch when the API gave none
            if (authoritativeBatchNo && itemBatches.length === 0) {
              const hasAuthBatch = itemBatches.some(
                (b) => b.batchNo.toLowerCase() === authoritativeBatchNo.toLowerCase()
              );
              if (!hasAuthBatch) {
                itemBatches.unshift({
                  id: `bat_${stk.productId}_${authoritativeBatchNo}`,
                  batchNo: authoritativeBatchNo,
                  productId: stk.productId,
                  quantity: effectiveInStock,
                  costPrice: stk.unitCost || cat?.unitCost || 0,
                  sellingPrice: stk.unitPrice || cat?.unitPrice || 0,
                  mfgDate: cat?.mfgDate || (stk as any).mfgDate,
                  expDate: cat?.expDate || (stk as any).expDate,
                  status: effectiveInStock > 0 ? 'Active' : 'Depleted',
                  receivedDate: new Date().toISOString().split('T')[0],
                });
              }
            }

            // If no batches exist for this item, create at most one fallback batch
            if (itemBatches.length === 0) {
              const fallbackBatchNo = (authoritativeBatchNo || '').trim();
              if (fallbackBatchNo) {
                itemBatches.push({
                  id: `bat_${stk.productId}_${fallbackBatchNo}`,
                  batchNo: fallbackBatchNo,
                  productId: stk.productId,
                  quantity: effectiveInStock,
                  costPrice: stk.unitCost || cat?.unitCost || 0,
                  sellingPrice: stk.unitPrice || cat?.unitPrice || 0,
                  mfgDate: cat?.mfgDate,
                  expDate: cat?.expDate,
                  status: effectiveInStock > 0 ? 'Active' : 'Depleted',
                  receivedDate: new Date().toISOString().split('T')[0],
                });
              }
            } else if (itemBatches.length > 1) {
              // If multiple batches, and total batch qty exceeds effective stock, adjust gracefully
              const batchTotal = itemBatches.reduce((acc, b) => acc + (b.quantity || 0), 0);
              if (batchTotal > effectiveInStock && effectiveInStock >= 0) {
                let remaining = effectiveInStock;
                itemBatches.forEach((b, idx) => {
                  if (idx === itemBatches.length - 1) {
                    b.quantity = Math.max(0, remaining);
                  } else {
                    b.quantity = Math.min(b.quantity, Math.max(0, remaining));
                    remaining -= b.quantity;
                  }
                  b.status = b.quantity > 0 ? 'Active' : 'Depleted';
                });
              }
            }

            const effImage =
              stk.itemImage ||
              cat?.itemImage;

            return {
              ...stk,
              inStock: effectiveInStock,
              itemImage: effImage,
              batches: itemBatches,
            };
          });

          mapped.sort((a, b) => {
            const timeA = new Date(a.createdAt || a.lastUpdated || 0).getTime();
            const timeB = new Date(b.createdAt || b.lastUpdated || 0).getTime();
            if (timeB !== timeA) return timeB - timeA;
            return String(b.id || "").localeCompare(String(a.id || ""));
          });

          setStocks(mapped);
          setIsApiConnected(true);
          if (res.summary) setApiSummary(res.summary);
          if (res.pagination) {
            setTotalApiRecords(res.pagination.totalRecords);
            setTotalApiPages(res.pagination.totalPages);
          }
        } else {
          setIsApiConnected(false);
        }
      } catch (err: any) {
        console.warn(
          "Commerce Stock API call failed, falling back to local state:",
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
    [currentPage, pageSize, appliedSearch, appliedCategory, appliedStatus],
  );

  useEffect(() => {
    loadCatalogProducts();
    loadStocks();
  }, [loadCatalogProducts, loadStocks]);

  // Extract unique categories directly from loaded stocks (no redundant category API call on mount)
  const categories = useMemo(() => {
    const cats = Array.from(
      new Set([
        ...apiCategories,
        ...stocks.map((s) => s.category).filter(Boolean),
      ])
    );
    return cats;
  }, [stocks, apiCategories]);

  // Combined product list for Adjust Modal dropdown
  const allSelectableProducts = useMemo(() => {
    const list: Array<{ productId: string; productName: string; sku: string }> =
      [];
    const seen = new Set<string>();

    stocks.forEach((s) => {
      seen.add(s.productId);
      list.push({
        productId: s.productId,
        productName: s.productName,
        sku: s.sku,
      });
    });

    catalogProducts.forEach((p) => {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        list.push({ productId: p.id, productName: p.name, sku: p.sku });
      }
    });

    return list;
  }, [stocks, catalogProducts]);

  // Summary Metrics
  const summary = useMemo(() => {
    const totalItems =
      totalApiRecords !== null ? totalApiRecords : stocks.length;
    const healthyCount = stocks.filter(
      (s) => s.inStock > s.reorderLevel,
    ).length;
    const lowStockCount = stocks.filter(
      (s) => s.inStock > 0 && s.inStock <= s.reorderLevel,
    ).length;
    const outOfStockCount = stocks.filter((s) => s.inStock === 0).length;
    const totalValuation = stocks.reduce(
      (acc, s) => acc + s.inStock * s.unitCost,
      0,
    );

    if (apiSummary) {
      return {
        totalItems: apiSummary.totalItems ?? totalItems,
        healthyCount: apiSummary.healthyCount ?? healthyCount,
        lowStockCount: apiSummary.lowStockCount ?? lowStockCount,
        outOfStockCount: apiSummary.outOfStockCount ?? outOfStockCount,
        totalValuation: apiSummary.totalValuation ?? totalValuation,
      };
    }

    return {
      totalItems,
      healthyCount,
      lowStockCount,
      outOfStockCount,
      totalValuation,
    };
  }, [stocks, totalApiRecords, apiSummary]);

  // Open Adjust Modal
  const handleOpenAdjustModal = (
    stk?: InventoryStockItem,
    defaultQty?: number,
  ) => {
    // No product given: open with nothing selected so the user must choose one.
    // (Previously the first listed stock row was silently picked, which could adjust the wrong product.)
    let target = stk || null;
    fe.reset();

    if (target && (!target.batches || target.batches.length === 0)) {
      const cat = catalogProducts.find(
        (p) =>
          p.id === target?.productId ||
          p.id === target?.id ||
          p.sku === target?.sku,
      );
      if (cat) {
        const fallbackBatches: StockBatch[] = [];
        if (cat.stockBatches && cat.stockBatches.length > 0) {
          fallbackBatches.push(
            ...cat.stockBatches.map(mapApiStockBatchToStockBatch),
          );
        } else if (cat.batchNo || cat.initialBatchNo) {
          const bCode = (cat.batchNo || cat.initialBatchNo || "").trim();
          fallbackBatches.push({
            id: `bat_${target.productId}_${bCode}`,
            batchNo: bCode,
            productId: target.productId,
            quantity:
              target.inStock > 0 ? target.inStock : (cat.openingStock || 0),
            costPrice: target.unitCost || cat.unitCost,
            sellingPrice: target.unitPrice || cat.unitPrice,
            mfgDate: cat.mfgDate,
            expDate: cat.expDate,
            status: target.inStock > 0 ? "Active" : "Depleted",
            receivedDate: new Date().toISOString().split("T")[0],
          });
        }
        if (fallbackBatches.length > 0) {
          target = { ...target, batches: fallbackBatches };
        }
      }
    }

    setSelectedStock(target);
    setAdjustType("add");
    setAdjustQty(String(defaultQty && defaultQty > 0 ? defaultQty : 1));
    setAdjustReason("Purchase Restock");
    setAdjustNotes("");
    const firstBatch = target?.batches?.[0]?.batchNo || "";
    setSelectedBatchNo(firstBatch);
    setNewBatchNo("");
    setBatchMode(firstBatch ? "existing" : "new");
    if (target?.batches?.[0]?.mfgDate) {
      setBatchMfgDate(target.batches[0].mfgDate);
    } else {
      setBatchMfgDate(new Date().toISOString().split("T")[0]);
    }
    if (target?.batches?.[0]?.expDate) {
      setBatchExpDate(target.batches[0].expDate);
    } else {
      setBatchExpDate(
        new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
      );
    }
    setIsAdjustModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (stk: InventoryStockItem) => {
    setSelectedStock(stk);
    resetEdit({
      productName: stk.productName,
      sku: stk.sku,
      category: stk.category,
      subcategory: stk.subcategory || "",
      unit: stk.unit,
      reorderLevel: stk.reorderLevel,
      unitCost: stk.unitCost,
      unitPrice: stk.unitPrice,
    });
    setIsEditModalOpen(true);
  };

  // Save Edit Stock
  const computeEditErrors = (data: EditStockFormValues) =>
    collectErrors([
      ["productName", checkRequiredText(data.productName, "product name", 2)],
      ["sku", checkRequiredText(data.sku, "SKU")],
      ["reorderLevel", checkNumber(data.reorderLevel, "reorder level", { allowZero: true, maxDecimals: 0 })],
      ["unitCost", checkMoney(data.unitCost, "unit cost price", { allowZero: true })],
      ["unitPrice", checkMoney(data.unitPrice, "unit selling price", { allowZero: true })],
    ]);

  // Edit form: nothing shows before the first Save. Afterwards the business-rule errors follow the
  // values live (a field's error goes away only when the field is valid).
  const editWatched = watchEdit();
  useLayoutEffect(() => {
    if (!isEditModalOpen || !isEditSubmitted) return;
    const live = computeEditErrors(getEditValues());
    (Object.keys(live) as Array<keyof EditStockFormValues>).forEach((key) => {
      const current = editErrors[key];
      if (!current || current.type === "manual" || current.type === "server") {
        if (!current || current.message !== live[key]) {
          setEditError(key, { type: "manual", message: live[key] });
        }
      }
    });
    (["productName", "sku", "reorderLevel", "unitCost", "unitPrice"] as const).forEach((key) => {
      const current = editErrors[key];
      if (!live[key] && current && (current.type === "manual" || current.type === "server")) {
        clearEditErrors(key);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditModalOpen, isEditSubmitted, editWatched.productName, editWatched.sku, editWatched.reorderLevel, editWatched.unitCost, editWatched.unitPrice]);

  // Clear edit-form errors whenever the modal closes
  useEffect(() => {
    if (!isEditModalOpen) clearEditErrors();
  }, [isEditModalOpen, clearEditErrors]);

  // Registered-rule errors present: show every business-rule error in the same submit
  const handleInvalidEdit = (rhfErrors: Record<string, any>) => {
    const extra = computeEditErrors(getEditValues());
    Object.entries(extra).forEach(([k, msg]) => {
      if (!rhfErrors[k]) setEditError(k as keyof EditStockFormValues, { type: "manual", message: msg });
    });
  };

  const handleSaveEdit = (data: EditStockFormValues) => editGuard.runOnce(async () => {
    if (!selectedStock) return;
    const editErrs = computeEditErrors(data);
    if (checkRequiredSelection(selectedStock.productId, "product")) {
      setEditError("root", { type: "manual", message: "This product could not be identified. Please close and reopen it." });
      return;
    }
    if (Object.keys(editErrs).length > 0) {
      Object.entries(editErrs).forEach(([k, msg]) =>
        setEditError(k as keyof EditStockFormValues, { type: "manual", message: msg }),
      );
      return;
    }
    const reorderLevelNum = Number(data.reorderLevel);
    const unitCostNum = Number(data.unitCost);
    const unitPriceNum = Number(data.unitPrice);

    const updated: InventoryStockItem = {
      ...selectedStock,
      productName: data.productName.trim(),
      sku: data.sku.trim(),
      category: data.category.trim() || "General",
      subcategory: data.subcategory.trim() || "General",
      unit: data.unit.trim() || "Units",
      reorderLevel: reorderLevelNum,
      unitCost: unitCostNum,
      unitPrice: unitPriceNum,
    };

    try {
      await productApi.patchProduct(selectedStock.productId, {
        productName: updated.productName,
        category: updated.category,
        subcategory: updated.subcategory,
        unit: updated.unit,
        salePrice: updated.unitPrice,
        purchasePrice: updated.unitCost,
        minStockAlert: updated.reorderLevel,
      });
      toast.success(`Updated stock details for "${updated.productName}".`);
      setIsEditModalOpen(false);
      // Page change already triggers the list effect; only force a refetch when staying on page 1
      if (currentPage === 1) loadStocks(true);
      else setCurrentPage(1);
    } catch (err: any) {
      // Do not pretend the save worked: keep the modal open with the entered values.
      const apiFields = extractApiFieldErrors(err);
      const fieldMap: Record<string, keyof EditStockFormValues> = {
        productName: "productName",
        category: "category",
        subcategory: "subcategory",
        unit: "unit",
        salePrice: "unitPrice",
        purchasePrice: "unitCost",
        minStockAlert: "reorderLevel",
      };
      let mappedAny = false;
      for (const [k, v] of Object.entries(apiFields)) {
        if (fieldMap[k]) {
          setEditError(fieldMap[k], { type: "server", message: v });
          mappedAny = true;
        }
      }
      // Backend field errors are shown inline; anything else is an API error toast.
      if (!mappedAny) {
        toast.error(getApiErrorMessage(err, "Failed to update stock details. Please try again."));
      }
    }
  });

  // Pure validator for the stock-adjust modal (used on Save and for live re-validation afterwards)
  const computeAdjustErrors = (): Record<string, string> => {
    const effectiveBatchNo =
      adjustType === "add" && batchMode === "new"
        ? newBatchNo.trim()
        : selectedBatchNo.trim();
    const qtyNum = Number(adjustQty);
    const targetBatch =
      adjustType === "deduct" && effectiveBatchNo
        ? selectedStock?.batches?.find((b) => b.batchNo === effectiveBatchNo)
        : undefined;
    const checks: Array<[string, string | null]> = [
      ["product", checkRequiredSelection(selectedStock?.productId, "product")],
      ["quantity", checkQuantity(adjustQty, { integerOnly: true })],
    ];
    if (selectedStock && !checks[1][1] && adjustType === "deduct") {
      const totalErr = checkStockAvailable(qtyNum, selectedStock.inStock, selectedStock.productName);
      const batchErr = targetBatch
        ? qtyNum > targetBatch.quantity
          ? `Only ${targetBatch.quantity} ${selectedStock.unit} available in batch ${effectiveBatchNo}. Please reduce the quantity or choose another batch.`
          : null
        : null;
      checks.push(["quantity", batchErr || totalErr]);
    }
    if (adjustType === "add" && batchMode === "new") {
      checks.push(
        ["newBatchNo", checkRequiredText(newBatchNo, "batch number")],
        ["expDate", checkDateNotBefore(batchExpDate, batchMfgDate, "expiry date", "manufacturing date")],
      );
    }
    return collectErrors(checks);
  };

  // Errors appear only after the first Save click, then follow the values live.
  useRevalidateAfterSubmit(fe, computeAdjustErrors, [
    selectedStock, adjustType, adjustQty, batchMode, selectedBatchNo, newBatchNo, batchMfgDate, batchExpDate,
  ]);

  // Adjust modal starts clean every time it opens or closes
  useEffect(() => {
    fe.reset();
  }, [isAdjustModalOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirmAdjust = () => adjustGuard.runOnce(async () => {
    const effectiveBatchNo =
      adjustType === "add" && batchMode === "new"
        ? newBatchNo.trim()
        : selectedBatchNo.trim();

    // Validate everything at once; nothing is sent to the server unless all checks pass.
    const qtyNum = Number(adjustQty);
    if (!fe.validateAll(computeAdjustErrors())) return;
    if (!selectedStock) return;

    setIsAdjusting(true);
    const adjustQtyValue = qtyNum;
    const delta = adjustType === "add" ? adjustQtyValue : -adjustQtyValue;
    const isDamaged = adjustReason === "Damaged / Spoiled";
    const adjustmentType =
      adjustType === "deduct" ? (isDamaged ? "DAMAGED" : "OUTWARD") : "INWARD";

    try {
      const payload: AdjustStockPayload = {
        productId: selectedStock.productId,
        batchNo: effectiveBatchNo || undefined,
        adjustmentType,
        quantity: delta,
        reason: adjustNotes ? `${adjustReason} - ${adjustNotes}` : adjustReason,
        costPrice: selectedStock.unitCost,
        sellingPrice: selectedStock.unitPrice,
        mfgDate: batchMode === "new" ? batchMfgDate || undefined : undefined,
        expDate: batchMode === "new" ? batchExpDate || undefined : undefined,
      };

      const res = await stockApi.adjustStock(payload);
      if (res?.success) {
        toast.success(
          `Stock for "${selectedStock.productName}" adjusted successfully (${delta > 0 ? `+${delta}` : delta} ${selectedStock.unit})${effectiveBatchNo ? ` [Batch: ${effectiveBatchNo}]` : ""}`,
        );
        setIsAdjustModalOpen(false);
        // Page change already triggers the list effect; only force a refetch when staying on page 1
        if (currentPage === 1) loadStocks(true);
        else setCurrentPage(1);
        return;
      }
      toast.error("The stock adjustment could not be saved. Please try again.");
    } catch (err: any) {
      // The server rejected the adjustment: keep the modal open and the entered values, and
      // do NOT change local stock (the old code applied it locally and reported success).
      console.warn("Stock adjust API failed:", err?.message || err);
      const apiFields = extractApiFieldErrors(err);
      const mapped: Record<string, string> = {};
      if (apiFields.quantity) mapped.quantity = apiFields.quantity;
      if (apiFields.batchNo) mapped[adjustType === "add" && batchMode === "new" ? "newBatchNo" : "batch"] = apiFields.batchNo;
      if (apiFields.expDate) mapped.expDate = apiFields.expDate;
      if (Object.keys(mapped).length > 0) {
        fe.merge(mapped);
      } else {
        toast.error(getApiErrorMessage(err, "Failed to adjust stock. Please try again."));
      }
    } finally {
      setIsAdjusting(false);
    }
  });

  // Open Movement Ledger Modal with API Fetch
  const handleOpenMovementModal = async (stk: InventoryStockItem) => {
    setSelectedStock(stk);
    setIsMovementModalOpen(true);
    setIsLoadingLedger(true);
    setApiLedgerMovements([]);

    try {
      const res = await stockApi.getStockLedger({
        productId: stk.productId,
        page_size: 50,
        pagination_required: false,
        sortOrder: "desc",
      });
      if (res?.success && Array.isArray(res.data)) {
        setApiLedgerMovements(res.data);
      }
    } catch (err: any) {
      console.warn(
        "Failed to fetch stock movement ledger from API:",
        err?.message || err,
      );
    } finally {
      setIsLoadingLedger(false);
    }
  };

  // Filtered & Displayed Stocks
  const displayedStocks = useMemo(() => {
    let list: InventoryStockItem[] = [];
    if (isApiConnected) {
      list = stocks;
    } else {
      list = stocks.filter((s) => {
        const q = appliedSearch.toLowerCase().trim();
        const matchesSearch =
          !q ||
          s.productName.toLowerCase().includes(q) ||
          s.sku.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          (s.subcategory && s.subcategory.toLowerCase().includes(q)) ||
          s.batches?.some((b) => b.batchNo.toLowerCase().includes(q));

        const matchesCat =
          appliedCategory === "All" || s.category === appliedCategory;

        let matchesStatus = true;
        if (appliedStatus === "Healthy" || appliedStatus === "In Stock") {
          matchesStatus = s.inStock > s.reorderLevel;
        } else if (appliedStatus === "Low Stock") {
          matchesStatus = s.inStock > 0 && s.inStock <= s.reorderLevel;
        } else if (appliedStatus === "Out of Stock") {
          matchesStatus = s.inStock === 0;
        }

        return matchesSearch && matchesCat && matchesStatus;
      });
    }

    return [...list].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.lastUpdated || 0).getTime();
      const timeB = new Date(b.createdAt || b.lastUpdated || 0).getTime();
      if (timeB !== timeA) return timeB - timeA;
      return String(b.id || "").localeCompare(String(a.id || ""));
    });
  }, [stocks, isApiConnected, appliedSearch, appliedCategory, appliedStatus]);

  const pagedStocks = useMemo(() => {
    if (displayedStocks.length <= pageSize) return displayedStocks;
    const start = (currentPage - 1) * pageSize;
    return displayedStocks.slice(start, start + pageSize);
  }, [displayedStocks, currentPage, pageSize]);

  const totalRecords =
    totalApiRecords !== null ? totalApiRecords : displayedStocks.length;
  const totalPages =
    totalApiPages !== null
      ? totalApiPages
      : Math.ceil(totalRecords / pageSize) || 1;

  // Export Stocks to Excel
  const fetchStockReportPage = async (reportPage: number, reportPageSize: number) => {
    const res = await stockApi.getStocks({
      page_no: reportPage,
      page_size: reportPageSize,
      pagination_required: true,
      search: appliedSearch.trim() || undefined,
      sortOrder: "desc",
      category:
        appliedCategory !== "All" && appliedCategory !== "ALL"
          ? appliedCategory
          : undefined,
      lowStock: appliedStatus === "Low Stock" ? true : undefined,
    });
    const items: InventoryStockItem[] =
      res?.success && Array.isArray(res.data)
        ? res.data.map((item) => {
            const stk = mapApiStockToInventoryStockItem(item);
            return {
              ...stk,
              inStock:
                typeof stk.inStock === "number" && !isNaN(stk.inStock)
                  ? stk.inStock
                  : 0,
            };
          })
        : [];
    return {
      items,
      totalRecords: res?.pagination?.totalRecords,
      totalPages: res?.pagination?.totalPages,
      hasNextPage: res?.pagination?.hasNextPage,
    };
  };

  const loadStocksForReport = async (): Promise<InventoryStockItem[]> => {
    const all = await fetchAllReportRows(fetchStockReportPage);
    return all.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.lastUpdated || 0).getTime();
      const timeB = new Date(b.createdAt || b.lastUpdated || 0).getTime();
      if (timeB !== timeA) return timeB - timeA;
      return String(b.id || "").localeCompare(String(a.id || ""));
    });
  };

  const handleExportExcel = () =>
    runReport({
      label: "stock records",
      load: loadStocksForReport,
      onRows: (rows) => exportStocksExcel(rows),
    });

  const exportStocksExcel = (displayedStocks: InventoryStockItem[]) => {
    const excelRows = displayedStocks.map((s, idx) => {
      const stockValuation = (s.inStock || 0) * (s.unitCost || 0);
      let stockStatus = "In Stock";
      if (s.inStock === 0) stockStatus = "Out of Stock";
      else if (s.inStock <= s.reorderLevel) stockStatus = "Low Stock";

      return {
        sNo: idx + 1,
        sku: s.sku,
        productName: s.productName,
        category: s.category,
        subcategory: s.subcategory || "-",
        unit: s.unit,
        inStock: Number(s.inStock || 0),
        reorderLevel: Number(s.reorderLevel || 0),
        unitCost: Number(s.unitCost || 0),
        unitPrice: Number(s.unitPrice || 0),
        valuation: stockValuation,
        status: stockStatus,
      };
    });

    const totalQty = excelRows.reduce((acc, row) => acc + row.inStock, 0);
    const totalValuation = excelRows.reduce(
      (acc, row) => acc + row.valuation,
      0,
    );

    exportTableToExcel({
      filename: `Stocks_Inventory_Report_${new Date().toISOString().split("T")[0]}`,
      sheetName: "Stock Levels",
      title: "YAA CREATIONS CRM - INVENTORY & WAREHOUSE STOCK DIRECTORY",
      subtitle: `Total SKUs: ${displayedStocks.length} | Generated: ${new Date().toLocaleDateString('en-GB')}`,
      columns: [
        { header: "#", key: "sNo", align: "center", width: 8 },
        { header: "SKU Code", key: "sku", align: "center", width: 14 },
        {
          header: "Product Name",
          key: "productName",
          align: "left",
          width: 28,
        },
        { header: "Category", key: "category", align: "left", width: 18 },
        { header: "Subcategory", key: "subcategory", align: "left", width: 20 },
        { header: "Unit", key: "unit", align: "center", width: 10 },
        { header: "In Stock", key: "inStock", align: "right", width: 12 },
        {
          header: "Reorder Level",
          key: "reorderLevel",
          align: "right",
          width: 14,
        },
        {
          header: "Cost Price (₹)",
          key: "unitCost",
          align: "right",
          type: "currency",
          width: 16,
        },
        {
          header: "Sale Price (₹)",
          key: "unitPrice",
          align: "right",
          type: "currency",
          width: 16,
        },
        {
          header: "Stock Value (₹)",
          key: "valuation",
          align: "right",
          type: "currency",
          width: 18,
        },
        { header: "Status", key: "status", align: "center", width: 14 },
      ],
      data: excelRows,
      summaryRow: {
        sNo: "TOTAL",
        productName: `${displayedStocks.length} SKUs`,
        inStock: totalQty,
        valuation: totalValuation,
      },
    });

    toast.success(
      `Stock levels Excel report downloaded (${displayedStocks.length} records)!`,
    );
  };

  // Print & Download Individual Stock Item Slip via universal printUtils
  const buildStockSlipPrintOptions = (stk: InventoryStockItem): DocumentPrintOptions => {
    const computedStatus =
      (stk as any).status ||
      (stk.inStock <= 0
        ? 'Out of Stock'
        : stk.inStock <= stk.reorderLevel
        ? 'Low Stock'
        : 'In Stock');
    return {
      docTypeTitle: 'STOCK ITEM INVENTORY SLIP',
      docNo: stk.sku || stk.id.slice(0, 8).toUpperCase(),
      docDate: new Date().toISOString().split('T')[0],
      status: computedStatus,
      statusColor: computedStatus === 'In Stock' ? 'emerald' : computedStatus === 'Low Stock' ? 'amber' : 'rose',
      partyTitle: 'Inventory Classification',
      partyName: stk.productName,
      partyCompany: `Category: ${stk.category} / ${stk.subcategory || 'General'}`,
      extraMeta: [
        { label: 'Reorder Level', value: `${stk.reorderLevel} ${stk.unit}` },
        { label: 'Current In-Stock', value: `${stk.inStock} ${stk.unit}` },
        { label: 'Total Active Batches', value: `${stk.batches?.length || 0} Batches` },
        ...((stk as any).location ? [{ label: 'Warehouse Bin/Rack', value: (stk as any).location }] : []),
      ],
      columns: [
        { header: 'Batch / Lot #', width: '25%' },
        { header: 'Expiry Date', width: '20%' },
        { header: 'Mfg Date', width: '20%' },
        { header: 'Quantity', align: 'center', width: '15%' },
        { header: 'Batch Cost (₹)', align: 'right', width: '20%' },
      ],
      items: (stk.batches && stk.batches.length > 0)
        ? stk.batches.map((b) => ({
            name: b.batchNo || 'Primary Batch',
            remarks: `Exp: ${b.expDate || (b as any).expiryDate || 'N/A'} | Cost: ₹${b.costPrice || stk.unitCost || (stk as any).costPrice}`,
            quantity: b.quantity,
            unit: stk.unit,
            unitPrice: b.costPrice || stk.unitCost || (stk as any).costPrice,
            total: (b.quantity || 0) * (b.costPrice || stk.unitCost || (stk as any).costPrice || 0),
          }))
        : [
            {
              name: stk.productName,
              sku: stk.sku,
              unit: stk.unit,
              quantity: stk.inStock,
              unitPrice: stk.unitCost || (stk as any).costPrice,
              total: (stk.inStock || 0) * (stk.unitCost || (stk as any).costPrice || 0),
            },
          ],
      subtotal: (stk.inStock || 0) * (stk.unitCost || (stk as any).costPrice || 0),
      grandTotal: (stk.inStock || 0) * (stk.unitCost || (stk as any).costPrice || 0),
      paidAmountLabel: 'Retail Potential (Selling)',
      paidAmount: (stk.inStock || 0) * (stk.unitPrice || (stk as any).sellingPrice || 0),
      notes: `Product SKU: ${stk.sku || 'N/A'}. Tracked in warehouse inventory catalog.`,
    };
  };

  const handlePrintStockSlip = (stk: InventoryStockItem) => {
    printBusinessDocument(buildStockSlipPrintOptions(stk));
  };

  const handleDownloadStockSlip = async (stk: InventoryStockItem) => {
    if (isDownloadingStockSlip) return;
    setIsDownloadingStockSlip(true);
    const filename = `StockSlip_${(stk.sku || stk.productName || 'slip').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    try {
      await downloadBusinessDocument(buildStockSlipPrintOptions(stk), filename);
      toast.success(`Downloaded ${filename}`);
    } catch (err) {
      console.error('Failed to download stock slip PDF:', err);
      toast.error('Failed to download stock slip PDF. Please try again.');
    } finally {
      setIsDownloadingStockSlip(false);
    }
  };

  // Table Report for Stocks
  const getStocksReportTableOptions = (displayedStocks: InventoryStockItem[]) => {
    const printRows = displayedStocks.map((s) => ({
      productName: s.productName,
      category: s.category,
      subcategory: s.subcategory || 'General',
      inStock: `${s.inStock} ${s.unit}`,
      reorderLevel: `${s.reorderLevel} ${s.unit}`,
      costPrice: s.unitCost || (s as any).costPrice || 0,
      sellingPrice: s.unitPrice || (s as any).sellingPrice || 0,
      stockValue: (s.inStock || 0) * (s.unitCost || (s as any).costPrice || 0),
      status: s.inStock === 0 ? 'Out of Stock' : s.inStock <= s.reorderLevel ? 'Low Stock' : 'In Stock',
    }));

    return {
      title: 'Inventory & Warehouse Stock Valuation Report',
      subtitle: `Total SKUs: ${displayedStocks.length} | Category: ${appliedCategory} | Status: ${appliedStatus}`,
      columns: [
        { header: 'Product Name', key: 'productName', width: '22%' },
        { header: 'Category', key: 'category', width: '13%' },
        { header: 'Subcategory', key: 'subcategory', width: '12%' },
        { header: 'Available Qty', key: 'inStock', align: 'center' as const, width: '11%' },
        { header: 'Cost / Unit (₹)', key: 'costPrice', align: 'right' as const, type: 'currency' as const, width: '12%' },
        { header: 'Selling Price (₹)', key: 'sellingPrice', align: 'right' as const, type: 'currency' as const, width: '12%' },
        { header: 'Stock Value (₹)', key: 'stockValue', align: 'right' as const, type: 'currency' as const, width: '13%' },
        { header: 'Status', key: 'status', align: 'center' as const, width: '7%' },
      ],
      data: printRows,
      metrics: [
        { label: 'Total Tracked SKUs', value: summary.totalItems },
        { label: 'Total Asset Valuation', value: summary.totalValuation },
        { label: 'Low Stock Alerts', value: summary.lowStockCount },
        { label: 'Out of Stock SKUs', value: summary.outOfStockCount },
      ],
      summaryRow: {
        productName: 'Total',
        stockValue: displayedStocks.reduce((acc, s) => acc + (s.inStock || 0) * (s.unitCost || (s as any).costPrice || 0), 0),
      },
    };
  };

  const handlePrintStocksReport = () =>
    runReport({
      label: "stock records",
      load: loadStocksForReport,
      onRows: (rows) => printTableReport(getStocksReportTableOptions(rows)),
    });

  const handleDownloadStocksReport = async () => {
    if (displayedStocks.length === 0) {
      toast.info('No inventory stock records available to download.');
      return;
    }
    if (isDownloadingStocksReport) return;
    setIsDownloadingStocksReport(true);
    const filename = `Stock_Valuation_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    try {
      await downloadTableReport(getStocksReportTableOptions(displayedStocks), filename);
      toast.success('Stock valuation report PDF downloaded successfully!');
    } catch (err) {
      console.error('Failed to download stock report PDF:', err);
      toast.error('Failed to download stock report PDF. Please try again.');
    } finally {
      setIsDownloadingStocksReport(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-[220px] flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
              <Layers className="w-4.5 h-4.5" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Inventory &amp; Stock Levels
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Monitor real-time warehouse inventory quantities, subcategories,
            reorder thresholds, valuation, and stock adjustments
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <Button
            variant="secondary"
            size="md"
            className="flex-1 sm:flex-initial justify-center"
            onClick={handlePrintStocksReport}
            icon={<Printer className="w-4 h-4 text-[#33077C]" />}
          >
            Print Report
          </Button>

          <Button
            variant="secondary"
            size="md"
            className="flex-1 sm:flex-initial justify-center"
            onClick={handleExportExcel}
            icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
          >
            Excel Report
          </Button>

          <Button
            variant="secondary"
            size="md"
            disabled={isDownloadingStocksReport}
            className="flex-1 sm:flex-initial justify-center"
            onClick={handleDownloadStocksReport}
            icon={isDownloadingStocksReport ? <Loader2 className="w-4 h-4 animate-spin text-orange-600" /> : <Download className="w-4 h-4 text-orange-600" />}
          >
            {isDownloadingStocksReport ? 'Generating...' : 'Download Report'}
          </Button>

          <Button
            variant="primary"
            size="md"
            className="flex-1 sm:flex-initial justify-center"
            onClick={() => handleOpenAdjustModal()}
            icon={<Plus className="w-4 h-4 text-white" />}
          >
            Adjust Stock
          </Button>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total SKUs
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#33077C] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">
              {summary.totalItems}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Tracked catalogue items
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Healthy Stock
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">
              {summary.healthyCount}
            </div>
            <div className="text-xs text-emerald-600 font-medium mt-0.5">
              Above reorder level
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Low Stock Alert
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-amber-600">
              {summary.lowStockCount}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Below safety threshold
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Out of Stock
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-rose-600">
              {summary.outOfStockCount}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Replenishment required
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Valuation
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#33077C] flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-[#33077C]">
              ₹
              {summary.totalValuation.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Cost value on hand
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search Bar & Filter Row */}
      <SearchBar
        value={pendingSearch}
        onChange={(val) => setPendingSearch(val)}
        placeholder="Search by product, SKU, category, subcategory, batch..."
        onSubmit={() => {
          const trimmed = pendingSearch.trim();
          const isSame =
            appliedSearch === trimmed &&
            appliedCategory === pendingCategory &&
            appliedStatus === pendingStatus &&
            currentPage === 1;

          setAppliedSearch(trimmed);
          setAppliedCategory(pendingCategory);
          setAppliedStatus(pendingStatus);
          setCurrentPage(1);

          if (isSame) {
            loadStocks(true);
          }
        }}
        onReset={() => {
          lastFetchKeyRef.current = null;
          setPendingSearch("");
          setAppliedSearch("");
          setPendingCategory("All");
          setAppliedCategory("All");
          setPendingStatus("All");
          setAppliedStatus("All");
          setCurrentPage(1);
          loadStocks(true, {
            search: "",
            category: "All",
            status: "All",
            page: 1,
          });
        }}
        filterSlot={
          <div className="flex items-center gap-2.5 flex-wrap">
            <FilterDropdown
              placeholder="Category : All"
              value={pendingCategory}
              onChange={(val) => setPendingCategory(val)}
              options={[
                { label: "Category : All", value: "All" },
                ...categories.map((c) => ({ label: c, value: c })),
              ]}
            />

            <FilterDropdown
              placeholder="Status : All"
              value={pendingStatus}
              onChange={(val) => setPendingStatus(val)}
              options={[
                { label: "Status : All", value: "All" },
                { label: "In Stock", value: "In Stock", dotColor: "#10b981" },
                { label: "Low Stock", value: "Low Stock", dotColor: "#f59e0b" },
                {
                  label: "Out of Stock",
                  value: "Out of Stock",
                  dotColor: "#ef4444",
                },
              ]}
            />
          </div>
        }
        rightSlot={
          <div className="flex items-center gap-3 pr-1">
            <span className="text-xs font-semibold text-slate-500">
              Total SKUs :{" "}
              <span className="text-[#33077C] font-bold">{totalRecords}</span>
            </span>
          </div>
        }
      />

      {/* 4. Stocks Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200 min-w-[1320px]">
            <CommonTableHead
              columns={[
                { label: "PRODUCT & SKU", align: "left", minWidth: "200px" },
                { label: "CATEGORY", align: "left", minWidth: "140px" },
                { label: "SUBCATEGORY", align: "left", minWidth: "140px" },
                { label: "BATCH / LOT", align: "left", minWidth: "130px" },
                { label: "AVAILABLE QTY", align: "center", minWidth: "130px" },
                { label: "REORDER LEVEL", align: "center", minWidth: "130px" },
                { label: "COST / UNIT", align: "right", minWidth: "120px" },
                { label: "SELLING PRICE", align: "right", minWidth: "120px" },
                { label: "TOTAL VALUE", align: "right", minWidth: "130px" },
                { label: "STATUS", align: "center", minWidth: "110px" },
                { label: "ACTIONS", align: "center", minWidth: "130px" },
              ]}
            />
            <tbody className="text-sm">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={11}
                    className="py-20 text-center border border-slate-200"
                  >
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 text-[#33077C] animate-spin" />
                      <span className="text-xs font-semibold text-slate-500">
                        Loading live inventory stocks...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : displayedStocks.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="py-16 text-center text-slate-400 border border-slate-200 font-medium"
                  >
                    <Layers className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    <p className="font-semibold text-slate-600 text-sm">
                      No inventory items found
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {appliedSearch ||
                      appliedCategory !== "All" ||
                      appliedStatus !== "All"
                        ? "Try refining your search terms or filters."
                        : "There are no stock balances recorded in this organization."}
                    </p>
                    <div className="mt-4">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenAdjustModal()}
                        icon={<Plus className="w-3.5 h-3.5" />}
                      >
                        Adjust / Inward Stock
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedStocks.map((stk) => {
                  const isLow =
                    stk.inStock > 0 && stk.inStock <= stk.reorderLevel;
                  const isOut = stk.inStock === 0;
                  const valuation = stk.inStock * stk.unitCost;
                  const catalogItem = catalogProducts.find(
                    (p) => p.id === stk.productId || p.sku === stk.sku,
                  );
                  const activeBatches =
                    (stk.batches && stk.batches.length > 0)
                      ? (stk.batches.filter((b) => b.quantity > 0).length > 0
                          ? stk.batches.filter((b) => b.quantity > 0)
                          : stk.batches)
                      : (catalogItem?.batchNo || catalogItem?.initialBatchNo)
                      ? [
                          {
                            id: `bat_${stk.productId}_${catalogItem.batchNo || catalogItem.initialBatchNo}`,
                            batchNo: (catalogItem.batchNo || catalogItem.initialBatchNo)!,
                            productId: stk.productId,
                            quantity: stk.inStock,
                            costPrice: stk.unitCost || catalogItem.unitCost,
                            sellingPrice: stk.unitPrice || catalogItem.unitPrice,
                            mfgDate: catalogItem.mfgDate,
                            expDate: catalogItem.expDate,
                            status: stk.inStock > 0 ? "Active" : "Depleted",
                          } as StockBatch,
                        ]
                      : [];

                  return (
                    <tr
                      key={stk.id}
                      className="hover:bg-slate-50/80 transition-colors border-b border-slate-200 font-sans"
                    >
                      {/* 1. PRODUCT & SKU */}
                      <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <StockProductThumbnail
                            src={stk.itemImage || catalogItem?.itemImage}
                            productId={stk.productId || stk.id}
                            sku={stk.sku}
                            productName={stk.productName}
                          />
                          <div>
                            <span
                              onClick={() => {
                                setSelectedStock(stk);
                                setDetailTab("overview");
                                setIsDetailModalOpen(true);
                              }}
                              className="font-bold text-[#33077C] hover:underline cursor-pointer block text-sm leading-snug"
                            >
                              {stk.productName}
                            </span>
                            <span className="text-xs text-slate-400 font-medium mt-0.5 block">
                              {stk.sku}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. CATEGORY */}
                      <td className="py-4 px-4 border border-slate-200 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200/80">
                          {stk.category}
                        </span>
                      </td>

                      {/* 3. SUBCATEGORY */}
                      <td className="py-4 px-4 border border-slate-200 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md bg-purple-50/60 text-[#33077C] font-semibold text-xs border border-purple-200/60">
                          {stk.subcategory || "General"}
                        </span>
                      </td>

                      {/* 4. BATCH / LOT */}
                      <td className="py-4 px-4 border border-slate-200">
                        {activeBatches.length === 0 ? (
                          <span className="text-xs text-slate-400 font-medium italic">
                            No active batch
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-w-[220px]">
                            {activeBatches.slice(0, 2).map((b) => (
                              <span
                                key={b.id || b.batchNo}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 text-[#33077C] font-mono text-[11px] font-bold border border-purple-200 shadow-2xs"
                                title={`Batch: ${b.batchNo} | Qty: ${b.quantity} ${stk.unit}${b.expDate ? ` | Exp: ${b.expDate}` : ""}`}
                              >
                                <Tag className="w-3 h-3 text-[#33077C]" />
                                <span>{b.batchNo}</span>
                                <span className="text-purple-600/80">
                                  ({b.quantity})
                                </span>
                              </span>
                            ))}
                            {activeBatches.length > 2 && (
                              <span
                                onClick={() => {
                                  setSelectedStock(stk);
                                  setDetailTab("batches");
                                  setIsDetailModalOpen(true);
                                }}
                                className="inline-flex items-center px-1.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-bold text-[10px] cursor-pointer hover:bg-slate-200 transition-colors"
                              >
                                +{activeBatches.length - 2} more
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 5. AVAILABLE QTY */}
                      <td className="py-4 px-4 border border-slate-200 whitespace-nowrap">
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className={`font-bold text-sm ${isOut ? "text-rose-600" : isLow ? "text-amber-600" : "text-slate-900"}`}
                          >
                            {stk.inStock}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            {stk.unit}
                          </span>
                        </div>
                      </td>

                      {/* 6. REORDER LEVEL */}
                      <td className="py-4 px-4 border border-slate-200 whitespace-nowrap">
                        <span className="font-semibold text-slate-700 text-xs">
                          {stk.reorderLevel}{" "}
                          <span className="text-slate-500 font-normal">
                            {stk.unit}
                          </span>
                        </span>
                      </td>

                      {/* 7. UNIT COST */}
                      <td className="py-4 px-4 border border-slate-200 text-right whitespace-nowrap font-mono">
                        <span className="font-semibold text-slate-700 text-xs">
                          ₹
                          {stk.unitCost.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </td>

                      {/* 8. UNIT PRICE */}
                      <td className="py-4 px-4 border border-slate-200 text-right whitespace-nowrap font-mono">
                        <span className="font-bold text-slate-900 text-xs">
                          ₹
                          {stk.unitPrice.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </td>

                      {/* 9. TOTAL VALUATION */}
                      <td className="py-4 px-4 border border-slate-200 text-right whitespace-nowrap font-mono">
                        <span className="font-bold text-[#33077C] text-xs sm:text-sm">
                          ₹
                          {valuation.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </td>

                      {/* 10. STOCK STATUS */}
                      <td className="py-4 px-4 border border-slate-200 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            isOut
                              ? "bg-rose-50/90 text-rose-700 border border-rose-300/80"
                              : isLow
                                ? "bg-amber-50/90 text-amber-700 border border-amber-300/80"
                                : "bg-emerald-50/90 text-emerald-700 border border-emerald-300/80"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOut
                                ? "bg-rose-500"
                                : isLow
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                            }`}
                          />
                          {isOut
                            ? "Out of Stock"
                            : isLow
                              ? "Low Stock"
                              : "In Stock"}
                        </span>
                      </td>

                      {/* 11. ACTIONS */}
                      <td className="py-4 px-3 border border-slate-200 text-center whitespace-nowrap">
                        <SaleActionDropdown
                          items={[
                            {
                              label: 'View',
                              variant: 'view',
                              onClick: () => {
                                setSelectedStock(stk);
                                setDetailTab('overview');
                                setIsDetailModalOpen(true);
                              },
                            },
                            {
                              label: 'Print Stock Slip',
                              variant: 'print',
                              onClick: () => handlePrintStockSlip(stk),
                            },
                            {
                              label: 'Download Stock Slip',
                              variant: 'download',
                              onClick: () => handleDownloadStockSlip(stk),
                            },
                            {
                              label: 'Edit',
                              variant: 'edit',
                              onClick: () => handleOpenEditModal(stk),
                            },
                            {
                              label: 'View Batches',
                              variant: 'batches',
                              onClick: () => {
                                setSelectedStock(stk);
                                setDetailTab('batches');
                                setIsDetailModalOpen(true);
                              },
                            },
                            {
                              label: 'Stock Movement',
                              variant: 'movement',
                              onClick: () => handleOpenMovementModal(stk),
                            },
                            {
                              label: 'Stock Adjustment',
                              variant: 'adjust',
                              onClick: () => handleOpenAdjustModal(stk),
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

      {/* Pagination */}
      {totalRecords > 0 && (
        <Pagination
          currentPage={currentPage}
          total={totalRecords}
          pageSize={pageSize}
          pageSizeOptions={[5, 10, 20, 50]}
          onPageChange={(p) => setCurrentPage(p)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      )}

      {/* ==========================================
          MODAL 1: ADJUST STOCK WITH BATCH SUPPORT
         ========================================== */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Adjust Inventory Stock &amp; Batches"
        subtitle="Update warehouse inventory counts, lot movements, and batch assignments"
        maxWidth="4xl"
        headerGradient={true}
        showBackIcon={true}
        hideCloseButton={true}
        onBack={() => setIsAdjustModalOpen(false)}
      >
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            handleConfirmAdjust();
          }}
          className="space-y-4 p-2 sm:p-4 max-h-[75vh] overflow-y-auto animate-in fade-in duration-150 text-xs"
        >
          {/* Current Stock Banner */}
          {selectedStock && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-500">
                  Current Warehouse Stock:
                </span>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {selectedStock.inStock} {selectedStock.unit}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-medium text-slate-500">
                  Active Batches:
                </span>
                <div className="text-base font-bold text-[#33077C] mt-0.5">
                  {selectedStock.batches?.length || 0} Batches
                </div>
              </div>
            </div>
          )}

          {/* Row 1: Select Product | Adjustment Action | Adjustment Quantity */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Select Product <span className="text-slate-500">*</span>
              </label>
              <ProductSearchableSelect
                value={selectedStock?.productId || ""}
                onChange={(val, prod) => {
                  const targetProdId = val;
                  if (!targetProdId) {
                    setSelectedStock(null);
                    setSelectedBatchNo("");
                    return;
                  }
                  const existing = stocks.find(
                    (s) => s.productId === targetProdId,
                  );
                  if (existing) {
                    let effExisting = existing;
                    if (!effExisting.batches || effExisting.batches.length === 0) {
                      const cat = catalogProducts.find(
                        (p) => p.id === targetProdId || p.sku === existing.sku,
                      );
                      if (cat && (cat.batchNo || cat.initialBatchNo || cat.stockBatches?.length)) {
                        const fallbackBatches: StockBatch[] = [];
                        if (cat.stockBatches && cat.stockBatches.length > 0) {
                          fallbackBatches.push(
                            ...cat.stockBatches.map(mapApiStockBatchToStockBatch),
                          );
                        } else {
                          const bCode = (cat.batchNo || cat.initialBatchNo || "").trim();
                          fallbackBatches.push({
                            id: `bat_${existing.productId}_${bCode}`,
                            batchNo: bCode,
                            productId: existing.productId,
                            quantity:
                              existing.inStock > 0
                                ? existing.inStock
                                : (cat.openingStock || 0),
                            costPrice: existing.unitCost || cat.unitCost,
                            sellingPrice: existing.unitPrice || cat.unitPrice,
                            mfgDate: cat.mfgDate,
                            expDate: cat.expDate,
                            status: existing.inStock > 0 ? "Active" : "Depleted",
                            receivedDate: new Date().toISOString().split("T")[0],
                          });
                        }
                        effExisting = { ...existing, batches: fallbackBatches };
                      }
                    }
                    setSelectedStock(effExisting);
                    const firstBatch = effExisting.batches?.[0]?.batchNo || "";
                    setSelectedBatchNo(firstBatch);
                    setBatchMode(firstBatch ? "existing" : "new");
                  } else if (prod) {
                    const catItem = prod;
                    const catBatches: StockBatch[] = [];
                    if ((catItem as any).stockBatches && (catItem as any).stockBatches.length > 0) {
                      catBatches.push(
                        ...(catItem as any).stockBatches.map(mapApiStockBatchToStockBatch),
                      );
                    } else if ((catItem as any).batchNo || (catItem as any).initialBatchNo) {
                      const bCode = ((catItem as any).batchNo || (catItem as any).initialBatchNo || "").trim();
                      catBatches.push({
                        id: `bat_${catItem.id}_${bCode}`,
                        batchNo: bCode,
                        productId: catItem.id,
                        quantity: (catItem as any).openingStock || 0,
                        costPrice: (catItem as any).purchasePrice || 0,
                        sellingPrice: (catItem as any).salePrice || 0,
                        mfgDate: (catItem as any).mfgDate,
                        expDate: (catItem as any).expDate,
                        status:
                          ((catItem as any).openingStock || 0) > 0 ? "Active" : "Depleted",
                        receivedDate: new Date().toISOString().split("T")[0],
                      });
                    }
                    setSelectedStock({
                      id: catItem.id,
                      productId: catItem.id,
                      productName: catItem.productName,
                      sku: (catItem as any).sku || catItem.productCode || "",
                      category: (catItem as any).category || "",
                      subcategory: (catItem as any).subcategory,
                      unit: (catItem as any).unit || "PCS",
                      inStock: (catItem as any).openingStock || 0,
                      reorderLevel: 10,
                      unitCost: (catItem as any).purchasePrice || 0,
                      unitPrice: (catItem as any).salePrice || 0,
                      lastUpdated: new Date().toISOString(),
                      batches: catBatches,
                    });
                    const firstBatch = catBatches[0]?.batchNo || "";
                    setSelectedBatchNo(firstBatch);
                    setBatchMode(firstBatch ? "existing" : "new");
                  } else {
                    setSelectedStock(null);
                    setSelectedBatchNo("");
                  }
                }}
                selectedProduct={
                  selectedStock
                    ? {
                        id: selectedStock.productId,
                        productName: selectedStock.productName,
                        productCode: selectedStock.sku,
                      }
                    : null
                }
                size="md"
                placeholder="-- Select Product --"
              />
              <FormError message={fe.errors.product} showIcon />
            </div>

            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Adjustment Action <span className="text-slate-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2 h-11">
                <button
                  type="button"
                  onClick={() => setAdjustType("add")}
                  className={`h-full px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    adjustType === "add"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>+ Inflow</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAdjustType("deduct")}
                  className={`h-full px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    adjustType === "deduct"
                      ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <ArrowDownRight className="w-4 h-4" />
                  <span>- Outflow</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Adjustment Quantity <span className="text-slate-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                value={adjustQty}
                {...fieldAttr("quantity")}
                onKeyDown={(e) => handleNumberOnlyKeyDown(e, false)}
                onInput={(e) => {
                  e.currentTarget.value = e.currentTarget.value.replace(
                    /[^0-9]/g,
                    "",
                  );
                }}
                onChange={(e) => {
                  // Keep exactly what the user typed (empty stays empty, it is not turned into 1).
                  setAdjustQty(e.target.value.replace(/[^0-9]/g, ""));
                  fe.clearError("quantity");
                }}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
              <FormError message={fe.errors.quantity} showIcon />
            </div>
          </div>

          {/* Row 2: BATCH SELECTION & MANAGEMENT */}
          <div className="p-4 bg-purple-50/40 border border-purple-200/80 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#33077C] flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-[#33077C]" />
                <span>Batch Assignment</span>
              </span>
              {adjustType === "add" && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBatchMode("existing")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      batchMode === "existing"
                        ? "bg-[#33077C] text-white shadow-2xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Select Existing
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchMode("new")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      batchMode === "new"
                        ? "bg-[#33077C] text-white shadow-2xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    + New Batch
                  </button>
                </div>
              )}
            </div>

            {adjustType === "deduct" || batchMode === "existing" ? (
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1.5">
                  Select Batch / Lot{" "}
                  {adjustType === "deduct" ? "(Deduct From)" : "(Add To)"}
                </label>
                <BatchSearchableSelect
                  productId={selectedStock?.productId || ""}
                  value={selectedBatchNo}
                  onChange={(val) => {
                    setSelectedBatchNo(val);
                    fe.clearError("quantity");
                    fe.clearError("batch");
                  }}
                  allowCustomBatch={false}
                  placeholder="-- Auto FIFO / General Lot --"
                />
                <FormError message={fe.errors.batch} showIcon />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1.5">
                    New Batch Number <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    
                    value={newBatchNo}
                    onChange={(e) => setNewBatchNo(e.target.value)}
                    {...fieldAttr("newBatchNo")}
                    placeholder="Auto-generated if left blank"
                    className={`w-full h-11 px-4 bg-white rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-4 transition-all ${
                      fe.errors.newBatchNo
                        ? "border border-rose-400 focus:border-rose-500 focus:ring-rose-500/10"
                        : "border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-[#4309A2]/10"
                    }`}
                  />
                  <FormError message={fe.errors.newBatchNo} showIcon />
                  <p className="mt-1 text-[11px] text-slate-400">Auto-generated if left blank</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1.5">
                    Mfg Date
                  </label>
                  <DateInput
                    value={batchMfgDate}
                    onChange={(v) => ((e) => {
                      setBatchMfgDate(e.target.value);
                      fe.clearError("expDate");
                    })({ target: { value: v } } as any)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1.5">
                    Expiry Date
                  </label>
                  <DateInput
                    value={batchExpDate}
                    onChange={(v) => ((e) => {
                      setBatchExpDate(e.target.value);
                      fe.clearError("expDate");
                    })({ target: { value: v } } as any)}
                    {...fieldAttr("expDate")}
                  />
                  <FormError message={fe.errors.expDate} showIcon />
                </div>
              </div>
            )}
          </div>

          {/* Row 3: Reason | Remarks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Reason / Reference <span className="text-slate-500">*</span>
              </label>
              <select
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer"
              >
                <option value="Purchase Restock">Purchase Restock</option>
                <option value="Batch Lot Inward">Batch Lot Inward</option>
                <option value="Physical Audit Count">
                  Physical Audit Count
                </option>
                <option value="Damaged / Spoiled">Damaged / Spoiled</option>
                <option value="Internal Usage">Internal Usage</option>
                <option value="Warehouse Transfer">Warehouse Transfer</option>
                <option value="Customer Return Correction">
                  Customer Return Correction
                </option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Remarks &amp; Lot Reference
              </label>
              <input
                type="text"
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                placeholder="e.g. Batch received from supplier with quality certification"
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAdjustModalOpen(false)}
              className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4 text-slate-500" />
              <span>Cancel</span>
            </button>
            <button
              type="submit"
              disabled={isAdjusting}
              className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isAdjusting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Saving Adjustment...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Adjustment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ==========================================
          MODAL 2: STOCK DETAIL & BATCH VIEW
         ========================================== */}
      {selectedStock && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Inventory Item: ${selectedStock.productName}`}
          subtitle="Complete SKU details, subcategories, lot breakdown, pricing, and gross margin"
          maxWidth="4xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setIsDetailModalOpen(false)}
        >
          <div className="space-y-5 text-xs font-sans max-h-[75vh] overflow-y-auto p-2">
            {/* Modal Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setDetailTab("overview")}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                  detailTab === "overview"
                    ? "bg-[#33077C] text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Overview &amp; Valuation</span>
              </button>
              <button
                type="button"
                onClick={() => setDetailTab("batches")}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                  detailTab === "batches"
                    ? "bg-[#33077C] text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>
                  Batches / Lots (
                  {selectedStock.batches?.filter((b) => b.quantity > 0)
                    .length || 0}
                  )
                </span>
              </button>
            </div>

            {/* Top Stat Ribbon */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-purple-50/60 border border-[#33077C]/20 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-[#33077C]">
                  Available Stock
                </span>
                <div className="text-xl font-bold text-[#33077C] mt-0.5">
                  {selectedStock.inStock}{" "}
                  <span className="text-xs font-semibold">
                    {selectedStock.unit}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-500">
                  Unit Cost
                </span>
                <div className="text-xl font-bold text-slate-900 mt-0.5">
                  ₹
                  {selectedStock.unitCost.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>

              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-emerald-700">
                  Unit Selling Price
                </span>
                <div className="text-xl font-bold text-emerald-700 mt-0.5">
                  ₹
                  {selectedStock.unitPrice.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>

              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-blue-700">
                  Total Valuation
                </span>
                <div className="text-xl font-bold text-blue-700 mt-0.5">
                  ₹
                  {(
                    selectedStock.inStock * selectedStock.unitCost
                  ).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {detailTab === "overview" ? (
              /* Spec Matrix */
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">SKU Code:</span>
                  <span className="font-bold text-slate-900">
                    {selectedStock.sku}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">
                    Product Category:
                  </span>
                  <span className="font-bold text-slate-900">
                    {selectedStock.category}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">
                    Product Subcategory:
                  </span>
                  <span className="font-bold text-[#33077C]">
                    {selectedStock.subcategory || "General"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">
                    Reorder Safety Level:
                  </span>
                  <span className="font-bold text-amber-600">
                    {selectedStock.reorderLevel} {selectedStock.unit}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">
                    Total Asset Valuation:
                  </span>
                  <span className="font-bold text-[#33077C]">
                    ₹
                    {(
                      selectedStock.inStock * selectedStock.unitCost
                    ).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-medium">
                    Gross Margin %:
                  </span>
                  <span className="font-bold text-emerald-600">
                    {selectedStock.unitPrice > 0
                      ? `${Math.round(((selectedStock.unitPrice - selectedStock.unitCost) / selectedStock.unitPrice) * 100)}% Margin`
                      : "0%"}
                  </span>
                </div>
              </div>
            ) : (
              /* BATCH BREAKDOWN MATRIX */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[#33077C]" />
                    <span>Batch &amp; Lot Inventory Breakdown</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      handleOpenAdjustModal(selectedStock);
                    }}
                    className="px-3 py-1.5 bg-[#33077C]/10 hover:bg-[#33077C]/20 text-[#33077C] font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add / Adjust Batch</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                  <table className="w-full min-w-[580px] text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                        <th className="py-2.5 px-3">Batch Number</th>
                        <th className="py-2.5 px-3 text-center">
                          Available Qty
                        </th>
                        <th className="py-2.5 px-3">Mfg Date</th>
                        <th className="py-2.5 px-3">Expiry Date</th>
                        <th className="py-2.5 px-3 text-right">Cost (₹)</th>
                        <th className="py-2.5 px-3 text-right">Selling (₹)</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {!selectedStock.batches ||
                      selectedStock.batches.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="py-6 text-center text-slate-400"
                          >
                            No active batches registered for this SKU. Use Stock
                            Adjustment to create lots.
                          </td>
                        </tr>
                      ) : (
                        selectedStock.batches.map((batch) => (
                          <tr
                            key={batch.id || batch.batchNo}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="py-2.5 px-3 font-mono font-bold text-[#33077C]">
                              {batch.batchNo}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                              {batch.quantity} {selectedStock.unit}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {formatDate(batch.mfgDate, "N/A")}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {formatDate(batch.expDate, "N/A")}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-slate-700 font-mono">
                              ₹
                              {batch.costPrice.toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-700 font-mono">
                              ₹
                              {batch.sellingPrice.toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  batch.quantity <= 0
                                    ? "bg-slate-100 text-slate-600 border border-slate-200"
                                    : batch.status === "Near Expiry"
                                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                }`}
                              >
                                {batch.quantity <= 0
                                  ? "Depleted"
                                  : batch.status || "Active"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleOpenEditModal(selectedStock);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                <span>Edit Product Info</span>
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => handlePrintStockSlip(selectedStock)}
                  icon={<Printer className="w-3.5 h-3.5 text-[#33077C]" />}
                >
                  Print Stock Slip
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  disabled={isDownloadingStockSlip}
                  onClick={() => handleDownloadStockSlip(selectedStock)}
                  icon={isDownloadingStockSlip ? <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-600" /> : <Download className="w-3.5 h-3.5 text-orange-600" />}
                >
                  {isDownloadingStockSlip ? 'Generating...' : 'Download Stock Slip'}
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setIsDetailModalOpen(false)}
                >
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleOpenAdjustModal(selectedStock);
                  }}
                >
                  Adjust Stock / Batch
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ==========================================
          MODAL 3: STOCK MOVEMENT LEDGER
         ========================================== */}
      {selectedStock && (
        <Modal
          isOpen={isMovementModalOpen}
          onClose={() => setIsMovementModalOpen(false)}
          title={`Stock Movement Ledger: ${selectedStock.productName}`}
          subtitle={`Audit trail of warehouse inward/outward transactions, sales deliveries, and adjustments for SKU ${selectedStock.sku}`}
          maxWidth="4xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setIsMovementModalOpen(false)}
        >
          <div className="space-y-4 text-xs font-sans p-0.5 sm:p-1">
            {/* Header info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">
                  Current Available Qty
                </span>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {selectedStock.inStock} {selectedStock.unit}
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">
                  Subcategory
                </span>
                <div className="text-base font-bold text-[#33077C] mt-0.5">
                  {selectedStock.subcategory || "General"}
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">
                  Total Valuation
                </span>
                <div className="text-base font-bold text-emerald-700 mt-0.5">
                  ₹
                  {(
                    selectedStock.inStock * selectedStock.unitCost
                  ).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Movement table */}
            <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
              <table className="w-full min-w-[640px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-3.5">Date &amp; Time</th>
                    <th className="py-3 px-3">Transaction Type</th>
                    <th className="py-3 px-3">Reference / Order #</th>
                    <th className="py-3 px-3">Batch / Lot</th>
                    <th className="py-3 px-3 text-center">Inflow / Outflow</th>
                    <th className="py-3 px-3 text-right">Balance After</th>
                    <th className="py-3 px-3">Remarks / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {isLoadingLedger ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-12 text-center text-slate-400"
                      >
                        <Loader2 className="w-6 h-6 mx-auto mb-2 text-[#33077C] animate-spin" />
                        <p className="font-semibold text-slate-600">
                          Loading stock audit ledger...
                        </p>
                      </td>
                    </tr>
                  ) : apiLedgerMovements.length > 0 ? (
                    apiLedgerMovements.map((mv) => {
                      const isInflow =
                        mv.inward > 0 ||
                        (mv.quantity > 0 && mv.movementType === "INWARD");
                      const displayQty =
                        mv.inward > 0
                          ? mv.inward
                          : mv.outward > 0
                            ? mv.outward
                            : Math.abs(mv.quantity);
                      return (
                        <tr
                          key={mv.id}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="py-3 px-3.5 text-slate-600 font-medium whitespace-nowrap">
                            {new Date(
                              mv.date || mv.createdAt || "",
                            ).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                isInflow
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {isInflow ? (
                                <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <ArrowDownRight className="w-3 h-3 text-rose-600" />
                              )}
                              {mv.movementType}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                            {mv.referenceNo ||
                              mv.referenceType ||
                              mv.id.slice(0, 8)}
                          </td>
                          <td className="py-3 px-3 font-mono text-purple-700 font-semibold whitespace-nowrap">
                            {mv.batchNo || "General Lot"}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap font-bold">
                            <span
                              className={
                                isInflow ? "text-emerald-700" : "text-rose-700"
                              }
                            >
                              {isInflow ? `+${displayQty}` : `-${displayQty}`}{" "}
                              {selectedStock.unit}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-semibold text-slate-700 whitespace-nowrap">
                            {typeof mv.balanceAfter === "number"
                              ? `${mv.balanceAfter} ${selectedStock.unit}`
                              : "—"}
                          </td>
                          <td
                            className="py-3 px-3 text-slate-500 max-w-[200px] truncate"
                            title={mv.reason || undefined}
                          >
                            {mv.reason || "—"}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-8 text-center text-slate-400"
                      >
                        <History className="w-8 h-8 mx-auto mb-1.5 text-slate-300 stroke-[1.5]" />
                        <p className="font-semibold text-slate-600">
                          No recorded movements yet for this item
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Perform inward stock, adjustments, or sales to build
                          the audit ledger.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setIsMovementModalOpen(false)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setIsMovementModalOpen(false);
                  handleOpenAdjustModal(selectedStock);
                }}
              >
                New Adjustment
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ==========================================
          MODAL 4: EDIT STOCK PARAMETERS
         ========================================== */}
      {selectedStock && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Edit Stock Item: ${selectedStock.productName}`}
          subtitle="Update product catalogue parameters, subcategory, safety threshold, and pricing"
          maxWidth="4xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setIsEditModalOpen(false)}
        >
          <form
            noValidate
            onSubmit={handleSubmitEdit(handleSaveEdit, (rhfErrors) =>
              handleInvalidEdit(rhfErrors as Record<string, any>),
            )}
            className="space-y-4 p-2 sm:p-4 max-h-[75vh] overflow-y-auto animate-in fade-in duration-150 text-xs"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Standard Widget"
                  {...registerEdit("productName", {
                    required: "Please enter the product name.",
                    minLength: {
                      value: 2,
                      message: "The product name must be at least 2 characters.",
                    },
                    validate: (val) =>
                      /^[A-Za-z0-9\s&'().\-\[\]{}/,+%#:*_"]+$/.test(String(val).trim()) ||
                      "The product name contains characters that are not allowed.",
                  })}
                  onInput={(e) => {
                    e.currentTarget.value = e.currentTarget.value.replace(
                      /[^A-Za-z0-9\s&'().\-\[\]{}/,+%#:*_"]/g,
                      "",
                    );
                  }}
                  className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-semibold text-slate-800 outline-none transition-all ${
                    editErrors.productName
                      ? "border border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 bg-rose-50/20"
                      : "border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                  }`}
                />
                {editErrors.productName && (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{editErrors.productName.message}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">
                  SKU Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...registerEdit("sku", {
                    required: "Please enter the SKU code.",
                  })}
                  className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-semibold text-slate-800 outline-none transition-all font-mono ${
                    editErrors.sku
                      ? "border border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 bg-rose-50/20"
                      : "border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                  }`}
                />
                {editErrors.sku && (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{editErrors.sku.message}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">
                  Category <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Software Solutions"
                  {...registerEdit("category", {
                    required: "Please enter the category.",
                    validate: (val) =>
                      !val ||
                      /^[A-Za-z\s&'.-]+$/.test(String(val).trim()) ||
                      "The category can contain only letters and spaces.",
                  })}
                  onKeyDown={handleTextOnlyKeyDown}
                  onInput={(e) => {
                    e.currentTarget.value = e.currentTarget.value.replace(
                      /[^A-Za-z\s&'.-]/g,
                      "",
                    );
                  }}
                  className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-semibold text-slate-800 outline-none transition-all ${
                    editErrors.category
                      ? "border border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 bg-rose-50/20"
                      : "border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                  }`}
                />
                {editErrors.category && (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{editErrors.category.message}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">
                  Subcategory <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Enterprise Software"
                  {...registerEdit("subcategory", {
                    required: "Please enter the subcategory.",
                    validate: (val) =>
                      !val ||
                      /^[A-Za-z\s&'.-]+$/.test(String(val).trim()) ||
                      "The subcategory can contain only letters and spaces.",
                  })}
                  onKeyDown={handleTextOnlyKeyDown}
                  onInput={(e) => {
                    e.currentTarget.value = e.currentTarget.value.replace(
                      /[^A-Za-z\s&'.-]/g,
                      "",
                    );
                  }}
                  className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-semibold text-slate-800 outline-none transition-all ${
                    editErrors.subcategory
                      ? "border border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 bg-rose-50/20"
                      : "border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                  }`}
                />
                {editErrors.subcategory && (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{editErrors.subcategory.message}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">
                  Unit of Measure <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Licenses, Units, Boxes"
                  {...registerEdit("unit", {
                    required: "Please enter the unit.",
                    validate: (val) =>
                      !val ||
                      /^[A-Za-z\s&'.-]+$/.test(String(val).trim()) ||
                      "The unit can contain only letters and spaces.",
                  })}
                  onKeyDown={handleTextOnlyKeyDown}
                  onInput={(e) => {
                    e.currentTarget.value = e.currentTarget.value.replace(
                      /[^A-Za-z\s&'.-]/g,
                      "",
                    );
                  }}
                  className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-semibold text-slate-800 outline-none transition-all ${
                    editErrors.unit
                      ? "border border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 bg-rose-50/20"
                      : "border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                  }`}
                />
                {editErrors.unit && (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{editErrors.unit.message}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">
                  Reorder Safety Level <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  {...registerEdit("reorderLevel", {
                    validate: (val) =>
                      val === "" ||
                      val === undefined ||
                      Number(val) >= 0 ||
                      "Please enter the reorder level as a whole number (0 or more).",
                  })}
                  onKeyDown={(e) => handleNumberOnlyKeyDown(e, false)}
                  onInput={(e) => {
                    e.currentTarget.value = e.currentTarget.value.replace(
                      /[^0-9]/g,
                      "",
                    );
                  }}
                  className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-semibold text-slate-800 outline-none transition-all ${
                    editErrors.reorderLevel
                      ? "border border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 bg-rose-50/20"
                      : "border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                  }`}
                />
                {editErrors.reorderLevel && (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{editErrors.reorderLevel.message}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">
                  Unit Cost Price (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  {...registerEdit("unitCost", {
                    validate: (val) =>
                      val === "" ||
                      val === undefined ||
                      Number(val) >= 0 ||
                      "Please enter a valid unit cost price (0 or more).",
                  })}
                  onKeyDown={(e) => handleNumberOnlyKeyDown(e, true)}
                  onInput={(e) => {
                    e.currentTarget.value = e.currentTarget.value
                      .replace(/[^0-9.]/g, "")
                      .replace(/(\..*?)\..*/g, "$1");
                  }}
                  className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-semibold text-slate-800 outline-none transition-all font-mono ${
                    editErrors.unitCost
                      ? "border border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 bg-rose-50/20"
                      : "border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                  }`}
                />
                {editErrors.unitCost && (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{editErrors.unitCost.message}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">
                  Unit Selling Price (₹){" "}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  {...registerEdit("unitPrice", {
                    validate: (val) =>
                      val === "" ||
                      val === undefined ||
                      Number(val) >= 0 ||
                      "Please enter a valid unit selling price (0 or more).",
                  })}
                  onKeyDown={(e) => handleNumberOnlyKeyDown(e, true)}
                  onInput={(e) => {
                    e.currentTarget.value = e.currentTarget.value
                      .replace(/[^0-9.]/g, "")
                      .replace(/(\..*?)\..*/g, "$1");
                  }}
                  className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-semibold text-slate-800 outline-none transition-all font-mono ${
                    editErrors.unitPrice
                      ? "border border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 bg-rose-50/20"
                      : "border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                  }`}
                />
                {editErrors.unitPrice && (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{editErrors.unitPrice.message}</span>
                  </p>
                )}
              </div>
            </div>

            <FormError message={editErrors.root?.message} showIcon />

            {/* Modal Action Buttons */}
            <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4 text-slate-500" />
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
