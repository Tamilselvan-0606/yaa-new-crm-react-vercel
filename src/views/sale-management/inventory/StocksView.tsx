import React, {
  useState,
  useMemo,
  useEffect,
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
  Printer,
  Forward,
  FileSpreadsheet,
  Loader2,
  Database,
  AlertCircle,
} from "lucide-react";
import { useForm } from "react-hook-form";
import {
  useSalesManagementStore,
  InventoryStockItem,
  StockBatch,
} from "../../../store/useSalesManagementStore";
import { Button } from "../../../components/common/Button";
import { Modal } from "../../../components/common/Modal";
import { Pagination } from "../../../components/common/Pagination";
import { SearchBar } from "../../../components/common/SearchBar";
import { FilterDropdown } from "../../../components/common/FilterDropdown";
import { exportTableToExcel } from "../../../utils/excelExport";
import {
  UniversalShareDropdown,
  formatStockShare,
} from "../../../utils/shareUtils";
import { toast } from "sonner";
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
import { getProductImageFromCache } from "./InventoryProductsView";

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
    const cached = getProductImageFromCache(productId, sku, src);
    if (cached && src && !src.startsWith("data:")) {
      setCurrentSrc(cached);
      setTriedFallback(true);
      setHasError(false);
      return;
    }
    setCurrentSrc(src || null);
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
    const cached = getProductImageFromCache(productId, sku, src, currentSrc);
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
  const {
    stocks: storeStocks,
    adjustStock: adjustStockInStore,
    updateStockItem: updateStockItemInStore,
    sales,
    purchases,
    purchaseReturns,
    salesReturns,
  } = useSalesManagementStore();

  // Live API Stocks State - zero initial mock data
  const [stocks, setStocks] = useState<InventoryStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState<boolean | null>(null);
  const [totalApiRecords, setTotalApiRecords] = useState<number | null>(null);
  const [totalApiPages, setTotalApiPages] = useState<number | null>(null);

  // Request deduplication & Batch cache
  const isFetchingRef = useRef(false);
  const lastFetchKeyRef = useRef<string | null>(null);
  const cachedBatchesRef = useRef<Map<string, StockBatch[]> | null>(null);
  const storeStocksRef = useRef(storeStocks);
  useEffect(() => {
    storeStocksRef.current = storeStocks;
  }, [storeStocks]);

  // Catalog products & categories from API for modal dropdowns and filters
  const [catalogProducts, setCatalogProducts] = useState<CatalogProductItem[]>([]);
  const catalogProductsRef = useRef<CatalogProductItem[]>([]);
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
  const [pageSize, setPageSize] = useState(10);

  // 3-Dots Action dropdown & Share Popover
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);
  const [activeShareId, setActiveShareId] = useState<string | null>(null);
  const [sharePos, setSharePos] = useState<{
    top?: number;
    bottom?: number;
    right?: number;
  } | null>(null);

  // Close action dropdown and share popover on click outside or scroll
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
      if (
        !target.closest(".share-popover-container") &&
        !target.closest(".share-popover-menu")
      ) {
        setActiveShareId(null);
        setSharePos(null);
      }
    };
    const handleScroll = () => {
      if (activeDropdownId) {
        setActiveDropdownId(null);
        setDropdownPos(null);
      }
      if (activeShareId) {
        setActiveShareId(null);
        setSharePos(null);
      }
    };
    window.addEventListener("click", handleOutside);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("click", handleOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [activeDropdownId, activeShareId]);

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

  // Adjust Form State with Batch
  const [adjustType, setAdjustType] = useState<"add" | "deduct">("add");
  const [adjustQty, setAdjustQty] = useState<number>(10);
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
    formState: { errors: editErrors },
  } = useForm<EditStockFormValues>({
    mode: "onChange",
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
    async (forceRefresh = false) => {
      const fetchKey = `${currentPage}_${pageSize}_${appliedSearch.trim()}_${appliedCategory}_${appliedStatus}`;
      if (isFetchingRef.current) return;
      if (!forceRefresh && lastFetchKeyRef.current === fetchKey) return;

      isFetchingRef.current = true;
      lastFetchKeyRef.current = fetchKey;
      setIsLoading(true);

      try {
        const isLowStock = appliedStatus === "Low Stock";
        const shouldFetchBatches = forceRefresh || !cachedBatchesRef.current;
        const [res, batchRes] = await Promise.allSettled([
          stockApi.getStocks({
            page_no: currentPage,
            page_size: pageSize,
            pagination_required: true,
            search: appliedSearch.trim() || undefined,
            sortOrder: "desc",
            category: appliedCategory !== "All" && appliedCategory !== "ALL" ? appliedCategory : undefined,
            lowStock: isLowStock ? true : undefined,
          }),
          shouldFetchBatches
            ? stockApi.getStockBatches({
                pagination_required: false,
                sortOrder: "desc",
              })
            : Promise.resolve(null),
        ]);

        let batchesByProductId = cachedBatchesRef.current || new Map<string, StockBatch[]>();
        if (
          batchRes.status === "fulfilled" &&
          batchRes.value &&
          (batchRes.value as any)?.success &&
          Array.isArray((batchRes.value as any).data)
        ) {
          const freshMap = new Map<string, StockBatch[]>();
          (batchRes.value as any).data.forEach((b: any) => {
            const mappedBatch = mapApiStockBatchToStockBatch(b);
            if (b.productId) {
              const list = freshMap.get(b.productId) || [];
              list.push(mappedBatch);
              freshMap.set(b.productId, list);
            }
            if (b.sku) {
              const list = freshMap.get(b.sku) || [];
              list.push(mappedBatch);
              freshMap.set(b.sku, list);
            }
          });
          cachedBatchesRef.current = freshMap;
          batchesByProductId = freshMap;
        }

        if (
          res.status === "fulfilled" &&
          res.value &&
          res.value.success &&
          Array.isArray(res.value.data)
        ) {
          const currentCatalog = catalogProductsRef.current;
          const mapped = res.value.data.map((item) => {
            const stk = mapApiStockToInventoryStockItem(item);
            const itemBatches: StockBatch[] = [...(stk.batches || [])];

            // 1. Merge batches from /commerce/stocks/batches
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

            // 2. Merge batches from catalog products (e.g. BAT-2026-Oct on Cargo pant or Lays)
            const cat = currentCatalog.find(
              (p) => p.id === stk.productId || p.id === stk.id || p.sku === stk.sku,
            );
            if (cat) {
              if (cat.stockBatches && cat.stockBatches.length > 0) {
                cat.stockBatches.forEach((cb) => {
                  if (
                    !itemBatches.some(
                      (eb) => eb.batchNo.toLowerCase() === cb.batchNo.toLowerCase(),
                    )
                  ) {
                    itemBatches.push(mapApiStockBatchToStockBatch(cb));
                  }
                });
              }
              const catBatchNo = (cat.batchNo || cat.initialBatchNo || "").trim();
              if (
                catBatchNo &&
                !itemBatches.some(
                  (eb) => eb.batchNo.toLowerCase() === catBatchNo.toLowerCase(),
                )
              ) {
                const bQty = stk.inStock > 0 ? stk.inStock : (cat.openingStock || 0);
                itemBatches.push({
                  id: `bat_${stk.productId}_${catBatchNo}`,
                  batchNo: catBatchNo,
                  productId: stk.productId,
                  quantity: bQty,
                  costPrice: stk.unitCost || cat.unitCost,
                  sellingPrice: stk.unitPrice || cat.unitPrice,
                  mfgDate: cat.mfgDate,
                  expDate: cat.expDate,
                  status: bQty > 0 ? "Active" : "Depleted",
                  receivedDate: new Date().toISOString().split("T")[0],
                });
              }
            }

            // 3. Merge batches from local store
            const storeItem = storeStocksRef.current.find(
              (s) => s.productId === stk.productId || s.sku === stk.sku,
            );
            if (storeItem?.batches && storeItem.batches.length > 0) {
              storeItem.batches.forEach((sb) => {
                const exIdx = itemBatches.findIndex(
                  (eb) => eb.batchNo.toLowerCase() === sb.batchNo.toLowerCase(),
                );
                if (exIdx === -1) {
                  itemBatches.push(sb);
                } else if (itemBatches[exIdx].quantity === 0 && sb.quantity > 0) {
                  itemBatches[exIdx] = sb;
                }
              });
            }

            return {
              ...stk,
              itemImage: stk.itemImage || cat?.itemImage,
              batches: itemBatches,
            };
          });

          setStocks(mapped);
          setIsApiConnected(true);
          if (res.value.pagination) {
            setTotalApiRecords(res.value.pagination.totalRecords);
            setTotalApiPages(res.value.pagination.totalPages);
          }
        } else {
          setIsApiConnected(false);
        }
      } catch (err: any) {
        console.warn(
          "Commerce Stock API call failed, falling back to local state:",
          err?.message || err,
        );
        setIsApiConnected(false);
      } finally {
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    },
    [currentPage, pageSize, appliedSearch, appliedCategory, appliedStatus],
  );

  useEffect(() => {
    loadStocks();
  }, [loadStocks]);

  // Debounced Search (600ms) - waits until typing completes before triggering API
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = pendingSearch.trim();
      if (trimmed !== appliedSearch) {
        setAppliedSearch(trimmed);
        setCurrentPage(1);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [pendingSearch, appliedSearch]);

  // Fetch Categories for Modal & Filter (catalog products fetched on demand)
  useEffect(() => {
    let isMounted = true;
    const fetchCatalogAndCategories = async () => {
      try {
        const catRes = await categoryApi.getCategories({
          pagination_required: false,
          sortOrder: "asc",
        });

        if (
          isMounted &&
          catRes &&
          catRes.success &&
          Array.isArray(catRes.data)
        ) {
          const names = catRes.data
            .map((c) => c.categoryName || c.name || "")
            .filter((n) => n.trim() !== "");
          if (names.length > 0) {
            setApiCategories(Array.from(new Set(names)));
          }
        }
      } catch (e) {
        // Silently fallback
      }
    };

    fetchCatalogAndCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  // Extract unique categories (combines API categories and stock categories)
  const categories = useMemo(() => {
    const cats = Array.from(
      new Set([
        ...apiCategories,
        ...stocks.map((s) => s.category).filter(Boolean),
      ]),
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

    return {
      totalItems,
      healthyCount,
      lowStockCount,
      outOfStockCount,
      totalValuation,
    };
  }, [stocks, totalApiRecords]);

  // Open Adjust Modal
  const handleOpenAdjustModal = (
    stk?: InventoryStockItem,
    defaultQty?: number,
  ) => {
    let target = stk || null;
    if (!target && stocks.length > 0) {
      target = stocks[0];
    } else if (!target && catalogProducts.length > 0) {
      const p = catalogProducts[0];
      const pBatches: StockBatch[] = [];
      if (p.stockBatches && p.stockBatches.length > 0) {
        pBatches.push(...p.stockBatches.map(mapApiStockBatchToStockBatch));
      } else if (p.batchNo || p.initialBatchNo) {
        const bCode = (p.batchNo || p.initialBatchNo || "").trim();
        pBatches.push({
          id: `bat_${p.id}_${bCode}`,
          batchNo: bCode,
          productId: p.id,
          quantity: p.openingStock || 0,
          costPrice: p.unitCost,
          sellingPrice: p.unitPrice,
          mfgDate: p.mfgDate,
          expDate: p.expDate,
          status: (p.openingStock || 0) > 0 ? "Active" : "Depleted",
          receivedDate: new Date().toISOString().split("T")[0],
        });
      }
      target = {
        id: p.id,
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        category: p.category,
        subcategory: p.subcategory,
        unit: p.unit,
        inStock: p.openingStock || 0,
        reorderLevel: 10,
        unitCost: p.unitCost,
        unitPrice: p.unitPrice,
        lastUpdated: new Date().toISOString(),
        batches: pBatches,
      };
    }

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
    setAdjustQty(defaultQty && defaultQty > 0 ? defaultQty : 1);
    setAdjustReason("Purchase Restock");
    setAdjustNotes("");
    const firstBatch = target?.batches?.[0]?.batchNo || "";
    setSelectedBatchNo(firstBatch);
    setNewBatchNo(
      `BAT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    );
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
  const handleSaveEdit = async (data: EditStockFormValues) => {
    if (!selectedStock) return;
    if (!data.productName.trim() || !data.sku.trim()) {
      toast.error("Product Name and SKU are required.");
      return;
    }
    const updated: InventoryStockItem = {
      ...selectedStock,
      productName: data.productName.trim(),
      sku: data.sku.trim(),
      category: data.category.trim() || "General",
      subcategory: data.subcategory.trim() || "General",
      unit: data.unit.trim() || "Units",
      reorderLevel: Math.max(0, Number(data.reorderLevel) || 0),
      unitCost: Math.max(0, Number(data.unitCost) || 0),
      unitPrice: Math.max(0, Number(data.unitPrice) || 0),
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
      loadStocks(true);
    } catch (err: any) {
      updateStockItemInStore(updated);
      toast.success(`Updated stock details for "${updated.productName}".`);
      setIsEditModalOpen(false);
      loadStocks(true);
    }
  };

  const handleConfirmAdjust = async () => {
    if (!selectedStock) {
      toast.error("Please select a product to adjust.");
      return;
    }
    if (adjustQty <= 0) {
      toast.error("Adjustment quantity must be greater than zero.");
      return;
    }

    const effectiveBatchNo =
      adjustType === "add" && batchMode === "new"
        ? newBatchNo.trim()
        : selectedBatchNo.trim();

    if (adjustType === "deduct") {
      if (adjustQty > selectedStock.inStock) {
        toast.error(
          `Cannot deduct more than available total stock (${selectedStock.inStock} ${selectedStock.unit}).`,
        );
        return;
      }
      if (effectiveBatchNo) {
        const targetBatch = selectedStock.batches?.find(
          (b) => b.batchNo === effectiveBatchNo,
        );
        if (targetBatch && adjustQty > targetBatch.quantity) {
          toast.error(
            `Cannot deduct more than available in batch ${effectiveBatchNo} (${targetBatch.quantity} ${selectedStock.unit}).`,
          );
          return;
        }
      }
    }

    setIsAdjusting(true);
    const delta = adjustType === "add" ? adjustQty : -adjustQty;
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
        adjustStockInStore(selectedStock.productId, delta, effectiveBatchNo, {
          costPrice: selectedStock.unitCost,
          sellingPrice: selectedStock.unitPrice,
          mfgDate: batchMfgDate,
          expDate: batchExpDate,
        });
        toast.success(
          `Stock for "${selectedStock.productName}" adjusted successfully (${delta > 0 ? `+${delta}` : delta} ${selectedStock.unit})${effectiveBatchNo ? ` [Batch: ${effectiveBatchNo}]` : ""}`,
        );
        setIsAdjustModalOpen(false);
        loadStocks(true);
        return;
      }
    } catch (err: any) {
      console.warn(
        "API adjust failed, using local update:",
        err?.message || err,
      );
      adjustStockInStore(selectedStock.productId, delta, effectiveBatchNo, {
        costPrice: selectedStock.unitCost,
        sellingPrice: selectedStock.unitPrice,
        mfgDate: batchMfgDate,
        expDate: batchExpDate,
      });
      toast.success(
        `Stock for "${selectedStock.productName}" updated locally (${delta > 0 ? `+${delta}` : delta} ${selectedStock.unit}).`,
      );
      setIsAdjustModalOpen(false);
      loadStocks(true);
    } finally {
      setIsAdjusting(false);
    }
  };

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
    if (isApiConnected) {
      return stocks;
    }
    return stocks.filter((s) => {
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
  }, [stocks, isApiConnected, appliedSearch, appliedCategory, appliedStatus]);

  const totalRecords =
    totalApiRecords !== null ? totalApiRecords : displayedStocks.length;
  const totalPages =
    totalApiPages !== null
      ? totalApiPages
      : Math.ceil(totalRecords / pageSize) || 1;

  // Export Stocks to Excel
  const handleExportExcel = () => {
    if (displayedStocks.length === 0) {
      toast.error("No stock records available to export.");
      return;
    }

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
      subtitle: `Total SKUs: ${displayedStocks.length} | Generated: ${new Date().toLocaleDateString("en-IN")}`,
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

  // Stock Movements for selected product
  const stockMovements = useMemo(() => {
    if (!selectedStock) return [];
    const movements: Array<{
      id: string;
      date: string;
      type:
        | "Purchase Received"
        | "Sale Delivered"
        | "Sales Return Inward"
        | "Purchase Return Outward"
        | "Manual Adjustment";
      reference: string;
      batchNo?: string;
      quantity: number;
      direction: "in" | "out";
      balanceAfter?: number;
      unitPrice: number;
      notes?: string;
    }> = [];

    // Check Purchases
    purchases.forEach((po) => {
      const item = po.items?.find(
        (i) => i.productId === selectedStock.productId,
      );
      if (
        item &&
        (po.purchaseStatus === "Completed" || po.purchaseStatus === "Received")
      ) {
        movements.push({
          id: `mv_po_${po.id}`,
          date: po.purchaseDate || po.createdAt,
          type: "Purchase Received",
          reference: po.purchaseNo,
          batchNo: item.batch || "General Lot",
          quantity: item.quantity,
          direction: "in",
          unitPrice: item.purchasePrice,
          notes: `Received from ${po.supplierName}`,
        });
      }
    });

    // Check Sales
    sales.forEach((so) => {
      const item = so.items?.find(
        (i) => i.productId === selectedStock.productId,
      );
      if (item && so.saleStatus === "Completed") {
        movements.push({
          id: `mv_so_${so.id}`,
          date: so.saleDate || so.createdAt,
          type: "Sale Delivered",
          reference: so.invoiceNo,
          batchNo: item.batch || "Auto FIFO",
          quantity: item.quantity,
          direction: "out",
          unitPrice: item.unitPrice,
          notes: `Billed to ${so.customerName}`,
        });
      }
    });

    // Check Sales Returns
    salesReturns.forEach((sr) => {
      const item = sr.items?.find(
        (i) => i.productId === selectedStock.productId,
      );
      if (
        item &&
        (sr.returnStatus === "Received" ||
          sr.returnStatus === "Refunded" ||
          sr.returnStatus === "Approved")
      ) {
        movements.push({
          id: `mv_sr_${sr.id}`,
          date: sr.returnDate || sr.createdAt,
          type: "Sales Return Inward",
          reference: sr.returnNo,
          batchNo: item.batch || "Restocked Lot",
          quantity: item.returnQuantity,
          direction: "in",
          unitPrice: item.unitPrice,
          notes: `Return from ${sr.customerName} (${item.reason})`,
        });
      }
    });

    // Sort newest first
    return movements.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [selectedStock, purchases, sales, salesReturns]);

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
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

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 sm:gap-3 shrink-0 w-full sm:w-auto">
          <Button
            variant="secondary"
            size="md"
            className="w-full sm:w-auto justify-center"
            onClick={handleExportExcel}
            icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
          >
            Excel Report
          </Button>

          <Button
            variant="primary"
            size="md"
            className="w-full sm:w-auto justify-center"
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
          setAppliedSearch(pendingSearch);
          setAppliedCategory(pendingCategory);
          setAppliedStatus(pendingStatus);
          setCurrentPage(1);
        }}
        onReset={() => {
          setPendingSearch("");
          setAppliedSearch("");
          setPendingCategory("All");
          setAppliedCategory("All");
          setPendingStatus("All");
          setAppliedStatus("All");
          setCurrentPage(1);
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
            <thead>
              <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white tracking-wider uppercase">
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">
                  PRODUCT &amp; SKU
                </th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white">
                  CATEGORY
                </th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white">
                  SUBCATEGORY
                </th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white">
                  BATCH / LOT
                </th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white">
                  AVAILABLE QTY
                </th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white">
                  REORDER LEVEL
                </th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-right">
                  COST / UNIT
                </th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-right">
                  SELLING PRICE
                </th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-right">
                  STOCK VALUE
                </th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-center">
                  STATUS
                </th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-center">
                  ACTIONS
                </th>
              </tr>
            </thead>
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
                displayedStocks.map((stk) => {
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
                      <td className="py-4 px-4 border border-slate-200 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {/* Print Icon Button */}
                          <button
                            type="button"
                            title="Print"
                            onClick={() => {
                              toast.info(
                                `Preparing print for ${stk.productName}...`,
                              );
                              window.print();
                            }}
                            className="w-8 h-8 rounded-lg bg-transparent hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Share Popover Button */}
                          <UniversalShareDropdown
                            id={stk.id}
                            activeShareId={activeShareId}
                            setActiveShareId={setActiveShareId}
                            sharePos={sharePos}
                            setSharePos={setSharePos}
                            getShareData={() => formatStockShare(stk)}
                            title="Share Stock Item"
                          />

                          {/* 3-dots Actions Dropdown */}
                          <div className="relative inline-block text-left stock-action-dropdown-container">
                            <button
                              type="button"
                              title="More Options"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activeDropdownId === stk.id) {
                                  setActiveDropdownId(null);
                                  setDropdownPos(null);
                                } else {
                                  setActiveShareId(null);
                                  const btnRect = (
                                    e.currentTarget as HTMLElement
                                  ).getBoundingClientRect();
                                  const spaceBelow =
                                    window.innerHeight - btnRect.bottom;
                                  const dropdownHeight = 220;
                                  const rightPos =
                                    window.innerWidth - btnRect.right;
                                  if (
                                    spaceBelow < dropdownHeight &&
                                    btnRect.top > dropdownHeight
                                  ) {
                                    setDropdownPos({
                                      bottom:
                                        window.innerHeight - btnRect.top + 4,
                                      right: rightPos,
                                    });
                                  } else {
                                    setDropdownPos({
                                      top: btnRect.bottom + 4,
                                      right: rightPos,
                                    });
                                  }
                                  setActiveDropdownId(stk.id);
                                }
                              }}
                              className="w-8 h-8 rounded-lg bg-transparent hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeDropdownId === stk.id && dropdownPos && (
                              <div
                                className="stock-action-dropdown-menu fixed z-[9999] w-48 bg-white rounded-xl shadow-xl border border-slate-200/90 py-1.5 animate-in fade-in zoom-in-95 duration-100 font-sans text-left"
                                style={{
                                  top:
                                    dropdownPos.top !== undefined
                                      ? `${dropdownPos.top}px`
                                      : "auto",
                                  bottom:
                                    dropdownPos.bottom !== undefined
                                      ? `${dropdownPos.bottom}px`
                                      : "auto",
                                  right: `${dropdownPos.right}px`,
                                }}
                              >
                                {/* 1. View */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setDropdownPos(null);
                                    setSelectedStock(stk);
                                    setDetailTab("overview");
                                    setIsDetailModalOpen(true);
                                  }}
                                  className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-[#33077C] hover:text-white transition-colors cursor-pointer block"
                                >
                                  View
                                </button>

                                {/* 2. Edit */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setDropdownPos(null);
                                    handleOpenEditModal(stk);
                                  }}
                                  className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-[#33077C] hover:text-white transition-colors cursor-pointer block"
                                >
                                  Edit
                                </button>

                                {/* 3. View Batches */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setDropdownPos(null);
                                    setSelectedStock(stk);
                                    setDetailTab("batches");
                                    setIsDetailModalOpen(true);
                                  }}
                                  className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-[#33077C] hover:text-white transition-colors cursor-pointer block"
                                >
                                  View Batches
                                </button>

                                {/* 4. Stock Movement */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setDropdownPos(null);
                                    handleOpenMovementModal(stk);
                                  }}
                                  className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-[#33077C] hover:text-white transition-colors cursor-pointer block"
                                >
                                  Stock Movement
                                </button>

                                {/* 5. Stock Adjustment */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setDropdownPos(null);
                                    handleOpenAdjustModal(stk);
                                  }}
                                  className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-[#33077C] hover:text-white transition-colors cursor-pointer block"
                                >
                                  Stock Adjustment
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
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
              <select
                value={selectedStock?.productId || ""}
                onChange={(e) => {
                  const targetProdId = e.target.value;
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
                  } else {
                    const catItem = catalogProducts.find(
                      (p) => p.id === targetProdId,
                    );
                    if (catItem) {
                      const catBatches: StockBatch[] = [];
                      if (catItem.stockBatches && catItem.stockBatches.length > 0) {
                        catBatches.push(
                          ...catItem.stockBatches.map(mapApiStockBatchToStockBatch),
                        );
                      } else if (catItem.batchNo || catItem.initialBatchNo) {
                        const bCode = (catItem.batchNo || catItem.initialBatchNo || "").trim();
                        catBatches.push({
                          id: `bat_${catItem.id}_${bCode}`,
                          batchNo: bCode,
                          productId: catItem.id,
                          quantity: catItem.openingStock || 0,
                          costPrice: catItem.unitCost,
                          sellingPrice: catItem.unitPrice,
                          mfgDate: catItem.mfgDate,
                          expDate: catItem.expDate,
                          status:
                            (catItem.openingStock || 0) > 0 ? "Active" : "Depleted",
                          receivedDate: new Date().toISOString().split("T")[0],
                        });
                      }
                      setSelectedStock({
                        id: catItem.id,
                        productId: catItem.id,
                        productName: catItem.name,
                        sku: catItem.sku,
                        category: catItem.category,
                        subcategory: catItem.subcategory,
                        unit: catItem.unit,
                        inStock: catItem.openingStock || 0,
                        reorderLevel: 10,
                        unitCost: catItem.unitCost,
                        unitPrice: catItem.unitPrice,
                        lastUpdated: new Date().toISOString(),
                        batches: catBatches,
                      });
                      const firstBatch = catBatches[0]?.batchNo || "";
                      setSelectedBatchNo(firstBatch);
                      setBatchMode(firstBatch ? "existing" : "new");
                    }
                  }
                }}
                required
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer"
              >
                <option value="">-- Select Product --</option>
                {allSelectableProducts.map((s) => (
                  <option key={s.productId} value={s.productId}>
                    {s.productName} ({s.sku})
                  </option>
                ))}
              </select>
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
                onKeyDown={(e) => handleNumberOnlyKeyDown(e, false)}
                onInput={(e) => {
                  e.currentTarget.value = e.currentTarget.value.replace(
                    /[^0-9]/g,
                    "",
                  );
                }}
                onChange={(e) =>
                  setAdjustQty(
                    Math.max(
                      1,
                      Number(e.target.value.replace(/[^0-9]/g, "")) || 1,
                    ),
                  )
                }
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
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
                <select
                  value={selectedBatchNo}
                  onChange={(e) => setSelectedBatchNo(e.target.value)}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer"
                >
                  <option value="">-- Auto FIFO / General Lot --</option>
                  {selectedStock?.batches?.map((b) => (
                    <option key={b.id || b.batchNo} value={b.batchNo}>
                      {b.batchNo} (Available: {b.quantity} {selectedStock.unit}
                      {b.expDate ? ` | Exp: ${b.expDate}` : ""})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1.5">
                    New Batch Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newBatchNo}
                    onChange={(e) => setNewBatchNo(e.target.value)}
                    placeholder="e.g. BAT-2026-09"
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1.5">
                    Mfg Date
                  </label>
                  <input
                    type="date"
                    value={batchMfgDate}
                    onChange={(e) => setBatchMfgDate(e.target.value)}
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1.5">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={batchExpDate}
                    onChange={(e) => setBatchExpDate(e.target.value)}
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
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

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left border-collapse">
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
                              {batch.mfgDate || "N/A"}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {batch.expDate || "N/A"}
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
            <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
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
              <div className="flex items-center gap-2.5">
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
          <div className="space-y-4 text-xs font-sans max-h-[75vh] overflow-y-auto p-2">
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
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse">
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
                  ) : stockMovements.length > 0 ? (
                    stockMovements.map((mv) => (
                      <tr
                        key={mv.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 px-3.5 text-slate-600 font-medium whitespace-nowrap">
                          {new Date(mv.date).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              mv.direction === "in"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {mv.direction === "in" ? (
                              <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3 text-rose-600" />
                            )}
                            {mv.type}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                          {mv.reference}
                        </td>
                        <td className="py-3 px-3 font-mono text-purple-700 font-semibold whitespace-nowrap">
                          {mv.batchNo}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap font-bold">
                          <span
                            className={
                              mv.direction === "in"
                                ? "text-emerald-700"
                                : "text-rose-700"
                            }
                          >
                            {mv.direction === "in"
                              ? `+${mv.quantity}`
                              : `-${mv.quantity}`}{" "}
                            {selectedStock.unit}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-slate-700 whitespace-nowrap">
                          {mv.balanceAfter !== undefined
                            ? `${mv.balanceAfter} ${selectedStock.unit}`
                            : "—"}
                        </td>
                        <td
                          className="py-3 px-3 text-slate-500 max-w-[180px] truncate"
                          title={mv.notes}
                        >
                          {mv.notes || "—"}
                        </td>
                      </tr>
                    ))
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
            onSubmit={handleSubmitEdit(handleSaveEdit)}
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
                    required: "Product name is required",
                    minLength: {
                      value: 2,
                      message: "Must be at least 2 characters",
                    },
                    validate: (val) =>
                      /^[A-Za-z\s&'.-]+$/.test(String(val).trim()) ||
                      "Only text characters (letters and spaces) are allowed",
                  })}
                  onKeyDown={handleTextOnlyKeyDown}
                  onInput={(e) => {
                    e.currentTarget.value = e.currentTarget.value.replace(
                      /[^A-Za-z\s&'.-]/g,
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
                    required: "SKU Code is required",
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
                    required: "Category is required",
                    validate: (val) =>
                      !val ||
                      /^[A-Za-z\s&'.-]+$/.test(String(val).trim()) ||
                      "Only text characters (letters and spaces) are allowed",
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
                    required: "Subcategory is required",
                    validate: (val) =>
                      !val ||
                      /^[A-Za-z\s&'.-]+$/.test(String(val).trim()) ||
                      "Only text characters (letters and spaces) are allowed",
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
                    required: "Unit is required",
                    validate: (val) =>
                      !val ||
                      /^[A-Za-z\s&'.-]+$/.test(String(val).trim()) ||
                      "Only text characters (letters and spaces) are allowed",
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
                      "Must be a valid positive integer",
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
                      "Must be a valid positive number",
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
                      "Must be a valid positive number",
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
