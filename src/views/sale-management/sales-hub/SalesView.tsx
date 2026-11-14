import { attachStockQty } from "../../../utils/stockDisplay";
import { getNextSalesInvoiceNumber } from "../../../utils/documentNumbering";
import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  ArrowLeft,
} from "lucide-react";
import {
  useSalesManagementStore,
  SaleTransaction,
  SaleProductItem,
  SalePaymentStatus,
  PaymentSplitItem,
  SalePaymentRecord,
  SalePaymentIn,
} from "../../../store/useSalesManagementStore";
import { DeleteConfirmationModal } from "../../../components/common/DeleteConfirmationModal";
import { Pagination } from "../../../components/common/Pagination";
import { SearchBar } from "../../../components/common/SearchBar";
import { FilterDropdown } from "../../../components/common/FilterDropdown";
import { toast } from "../../../utils/toast";
import { fetchAllReportRows, runReport } from "../../../utils/reportData";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import {
  downloadBusinessDocument,
  DocumentPrintOptions,
} from "../../../utils/printUtils";
import { useCompanyDocumentProfile } from "../../../hooks/useCompanyDocumentProfile";
import { SalesGraphModal } from "./SalesGraphModal";
import { salesRepresentativeApi } from "../../../api/commerce/salesRepresentativeApi";
import { collectionApi } from "../../../api/commerce/collectionApi";
import { useAppDispatch } from "../../../hooks/redux";
import { baseApi } from "../../../api/baseApi";
import {
  commerceInvoiceApi,
  mapApiInvoiceToSaleTransaction,
  mapSaleTransactionToInvoicePayload,
  InvoiceFilterParams,
  CommerceInvoiceSummary,
  UUID_REGEX,
  customerApi,
  mapApiCustomerToSalesCustomer,
  stockApi,
  mapApiStockToInventoryStockItem,
  productApi,
  unpackProducts,
  isProductActive,
  ApiStockBatch,
  commercePaymentInApi,
  normalizeCommercePaymentType,
  quotationApi,
  commerceSaleOrderApi,
  commerceDeliveryChallanApi,
  commerceProformaApi,
  clientProductApi,
} from "../../../api";
import {
  initializeWorkflowIntegrity,
  recordDocumentConversion,
  findDocumentLineage,
  inferDocType,
  syncQuotationStatusInStorage,
  syncOrderStatusInStorage,
  syncProformaStatusInStorage,
} from "../../../utils/salesDocumentWorkflow";
import {
  calculateLineItem,
  calculateDocumentTotals,
  round2,
} from "../../../utils/financialCalculations";

import {
  FieldErrors,
  checkRequiredDate,
  checkPaymentWithinBalance,
  validateBatchStock,
  useFieldErrors,
  useRevalidateAfterSubmit,
  useSubmitGuard,
  focusField,
  extractApiFieldErrors,
  getApiErrorMessage,
} from "../../../utils/formValidation";
import { parseNumericValue } from "../../../utils/validation";
import { useBatchStock } from "../../../hooks/useBatchStock";

import { AddCustomerModal } from "./AddCustomerModal";
import { AddItemModal } from "../inventory/AddItemModal";

import {
  makeSplitRowId,
} from "../purchase/SplitPaymentSection";
import {
  SALES_SPLIT_PAYMENT_METHODS,
  activeSplitRows,
  newSplitRow,
  rowAmount,
  splitRowToPaymentFields,
  summarizeSplit,
  validateSplit,
  SplitPaymentRow,
} from "../../../utils/splitPayments";
import {
  validateInvoiceForm,
  mapInvoiceApiErrorKey,
  isInvoiceRowBlank,
  type InvoiceValidationContext,
} from "./sales-invoice/salesInvoiceValidation";
import {
  exportSalesInvoicesToExcel,
  printSalesInvoicesReport,
} from "./sales-invoice/salesInvoiceReports";
import {
  buildSalesInvoicePrintHtml,
  mapSaleToDocumentPrintOptions as mapSaleToDocumentPrintOptionsPure,
} from "./sales-invoice/salesInvoiceDocument";
import type {
  SalesInvoiceFormData,
  SalesInvoiceTotals,
} from "./sales-invoice/salesInvoiceTypes";
import { PaymentReceiptModal } from "./sales-invoice/PaymentReceiptModal";
import { PaymentHistoryModal } from "./sales-invoice/PaymentHistoryModal";
import { QuickAssignInvoiceModal } from "./sales-invoice/QuickAssignInvoiceModal";
import { InvoiceDetailModal } from "./sales-invoice/InvoiceDetailModal";
import { RecordPaymentModal } from "./sales-invoice/RecordPaymentModal";
import { SalesInvoiceListHeader } from "./sales-invoice/SalesInvoiceListHeader";
import { SalesInvoiceSummaryCards } from "./sales-invoice/SalesInvoiceSummaryCards";
import { SalesInvoiceTable } from "./sales-invoice/SalesInvoiceTable";
import { GstConfigurationBar } from "./sales-invoice/GstConfigurationBar";
import { InvoiceDetailsSection } from "./sales-invoice/InvoiceDetailsSection";
import { InvoiceItemsTable } from "./sales-invoice/InvoiceItemsTable";
import { InvoiceSummaryAndPayment } from "./sales-invoice/InvoiceSummaryAndPayment";
import { InvoiceFormActionBar } from "./sales-invoice/InvoiceFormActionBar";
import { InvoiceFormPaymentHistory } from "./sales-invoice/InvoiceFormPaymentHistory";
import { PaymentTransactionLogsPanel } from "./sales-invoice/PaymentTransactionLogsPanel";
import { usePaymentTransactionLogs } from "./sales-invoice/usePaymentTransactionLogs";

export const SalesView: React.FC = () => {
  const companyProfile = useCompanyDocumentProfile();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const {
    saveSale: storeSaveSale,
    deleteSale,
    updateSalePayment,
    setCustomersList,
    setStocksList,
    setSalesList: storeSetSalesList,
    adjustStock,
    savePaymentIn,
    updateQuotationStatus,
  } = useSalesManagementStore();
  // Everything displayed comes from component state filled ONLY by API responses.
  const [sales, setSales] = useState<SaleTransaction[]>([]);

  // Computed next preview number based on currently loaded sales invoices
  const computedPreviewNo = useMemo(() => {
    return getNextSalesInvoiceNumber(sales);
  }, [sales]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [salesRepresentatives, setSalesRepresentatives] = useState<any[]>([]);
  const [customerList, setCustomerList] = useState<any[]>([]);
  const customers = customerList;
  // Keep shared session memory in sync for other screens, but never read it here.
  const setSalesList = useCallback(
    (list: SaleTransaction[]) => {
      setSales(list);
      storeSetSalesList(list);
    },
    [storeSetSalesList],
  );
  // Upsert an API-returned invoice into the displayed list.
  const saveSale = useCallback(
    (sale: SaleTransaction) => {
      setSales((prev) =>
        prev.some((s) => s.id === sale.id)
          ? prev.map((s) => (s.id === sale.id ? sale : s))
          : [sale, ...prev],
      );
      storeSaveSale(sale);
    },
    [storeSaveSale],
  );
  const [productList, setProductList] = useState<any[]>([]);

  // Deduplicated customer master data loader (only runs once on mount)
  const hasLoadedCustomersRef = useRef(false);
  const loadCustomersData = useCallback(async () => {
    if (hasLoadedCustomersRef.current) return;
    hasLoadedCustomersRef.current = true;
    try {
      const custRes = await customerApi
        .getCustomers({ pagination_required: false, page_size: 100 })
        .catch(() => null);
      const rawCust = unpackProducts(custRes);
      const mapped = rawCust.map(mapApiCustomerToSalesCustomer);
      setCustomerList(mapped);
      setCustomersList(mapped);
    } catch (err) {
      console.warn("Failed to load customers in SalesView:", err);
    }
  }, [setCustomersList]);

  useEffect(() => {
    loadCustomersData();
  }, [loadCustomersData]);

  // Sales representatives for filters / assignment pickers come from the API only.
  useEffect(() => {
    let cancelled = false;
    salesRepresentativeApi
      .getList({ page: 1, limit: 100 }, { fresh: true })
      .then((res) => {
        if (!cancelled)
          setSalesRepresentatives(Array.isArray(res?.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) setSalesRepresentatives([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Search & Filter State
  const [pendingSearch, setPendingSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [pendingSaleStatus, setPendingSaleStatus] = useState("All");
  const [appliedSaleStatus, setAppliedSaleStatus] = useState("All");
  const [pendingPaymentStatus, setPendingPaymentStatus] = useState("All");
  const [appliedPaymentStatus, setAppliedPaymentStatus] = useState("All");
  const [pendingCustomer, setPendingCustomer] = useState("All");
  const [appliedCustomer, setAppliedCustomer] = useState("All");
  const [pendingSalesRep, setPendingSalesRep] = useState("All");
  const [appliedSalesRep, setAppliedSalesRep] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [isSalesGraphModalOpen, setIsSalesGraphModalOpen] = useState(false);

  useEffect(() => {
    initializeWorkflowIntegrity();
  }, []);

  // Track upstream document conversion source info
  const convertSourceRef = useRef<{
    sourceType?: string;
    sourceId?: string;
    sourceNo?: string;
  } | null>(null);

  // Handle conversion navigation from Sale Order, Estimate, Proforma, or Challan
  useEffect(() => {
    const convertData = (location.state as any)?.convertFrom;
    if (convertData) {
      convertSourceRef.current = {
        sourceType: convertData.sourceType || "Estimate",
        sourceId: convertData.sourceId || "",
        sourceNo: convertData.sourceNo || convertData.referenceNo || "",
      };

      const resolvedItems: SaleProductItem[] = (convertData.items || []).map(
        (it: any, idx: number) => {
          const qty = Number(it.quantity) || 1;
          const uPrice = Number(it.unitPrice ?? it.price ?? 0);
          const pPrice = Number(it.purchasePrice ?? it.cost ?? 0);
          const dPct = Number(it.discountPercent ?? 0);
          const tPct = Number(it.taxPercent ?? 0);
          const lineRes = calculateLineItem(
            {
              quantity: qty,
              unitPrice: uPrice,
              discountPercent: dPct,
              taxPercent: tPct,
            },
            {
              withGst: convertData.withGst !== false,
              gstType: convertData.gstType || "intra_state",
            },
          );
          return {
            id: it.id || `s_item_${Date.now()}_${idx}`,
            productId: it.productId || "",
            productName: it.productName || it.name || "Product",
            sku: it.sku || "",
            batch: it.batch || it.batchNo || "",
            quantity: qty,
            purchasePrice: pPrice,
            salesPrice: uPrice,
            unitPrice: uPrice,
            discountPercent: dPct,
            taxPercent: tPct,
            total: lineRes.lineTotal,
          };
        },
      );

      if (resolvedItems.length === 0) {
        resolvedItems.push({
          id: `s_item_${Date.now()}`,
          productId: "",
          productName: "",
          sku: "",
          batch: "",
          quantity: 1,
          purchasePrice: 0,
          salesPrice: 0,
          unitPrice: 0,
          discountPercent: 0,
          taxPercent: 0,
          total: 0,
        });
      }

      const initialPaid = Number(
        convertData.paidAmount ?? convertData.advanceAmount ?? 0,
      );
      const initialMethod = convertData.paymentMethod || "Bank Transfer";

      setFormData({
        invoiceNo: "",
        salesInvoiceManualNo: "",
        referenceNo: convertData.sourceNo || convertData.referenceNo || "",
        saleDate: new Date().toISOString().split("T")[0],
        dueDate:
          convertData.dueDate ||
          new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
        customerId: convertData.customerId || "",
        customerName: convertData.customerName || convertData.partyName || "",
        customerCompany: convertData.customerCompany || "",
        customerPhone: convertData.customerPhone || "",
        customerEmail: convertData.customerEmail || "",
        billingAddress: convertData.billingAddress || "",
        shippingAddress:
          convertData.shippingAddress || convertData.billingAddress || "",
        items: resolvedItems,
        withGst: convertData.withGst !== false,
        gstType: convertData.gstType || "intra_state",
        overallDiscount: Number(
          convertData.overallDiscount ?? convertData.discount ?? 0,
        ),
        shippingCharges: Number(convertData.shippingCharges ?? 0),
        otherCharges: Number(convertData.otherCharges ?? 0),
        paymentMethod: initialMethod,
        paymentSplits: [
          {
            id: "ps_1",
            method: initialMethod,
            amount: initialPaid,
            referenceNo: convertData.sourceNo || "",
          },
        ],
        paymentRecords: [],
        paymentTerms: convertData.paymentTerms || "Net 15 Days",
        paidAmount: initialPaid,
        roundMode: (convertData.roundMode as any) || "none",
        invoiceStatus: "Draft",
        saleStatus: "Confirmed",
        salesperson: convertData.salesperson || "",
        notes:
          convertData.notes ||
          `Converted from ${convertData.sourceType || "Document"} ${convertData.sourceNo || ""}`,
      });

      setEditingSale(null);
      resetFormErrors();
      setIsFormModalOpen(true);
      toast.info(
        `Loaded details from ${convertData.sourceType || "document"} ${convertData.sourceNo || ""}. Review payment calculations and confirm invoice.`,
      );

      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  useEffect(() => {
    const q = searchParams.get("search");
    if (q) {
      setPendingSearch(q);
      setAppliedSearch(q);
    }
  }, [searchParams]);

  // 3-Dots Action dropdown
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);

  // Share Popover dropdown
  const [activeShareDropdownId, setActiveShareDropdownId] = useState<
    string | null
  >(null);
  const [shareDropdownPos, setShareDropdownPos] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);

  // Next Stage / Convert Dropdown state
  const [activeConvertDropdownId, setActiveConvertDropdownId] = useState<
    string | null
  >(null);
  const [convertDropdownPos, setConvertDropdownPos] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);

  // Bottom Payment History Logs Filters & Pagination

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  // Split payment (Single / Split mode in the Billing Summary) for a NEW invoice
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splitRows, setSplitRows] = useState<SplitPaymentRow[]>(() => [
    newSplitRow(makeSplitRowId()),
  ]);
  const [splitShowErrors, setSplitShowErrors] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPaymentHistoryModalOpen, setIsPaymentHistoryModalOpen] =
    useState(false);
  const [isPaymentDetailsModalOpen, setIsPaymentDetailsModalOpen] =
    useState(false);
  const [selectedPaymentRecord, setSelectedPaymentRecord] =
    useState<SalePaymentRecord | null>(null);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [activeItemRowIndex, setActiveItemRowIndex] = useState<number | null>(
    null,
  );
  const [openProductDropdownRow, setOpenProductDropdownRow] = useState<
    number | null
  >(null);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const productDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedSale, setSelectedSale] = useState<SaleTransaction | null>(
    null,
  );
  const [editingSale, setEditingSale] = useState<SaleTransaction | null>(null);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetSale, setDeleteTargetSale] =
    useState<SaleTransaction | null>(null);
  const [isDeletingSale, setIsDeletingSale] = useState(false);
  const [deleteSaleError, setDeleteSaleError] = useState<string | null>(null);

  // Live Batches & Products state for Search & Dropdown Popover
  const [liveBatches, setLiveBatches] = useState<ApiStockBatch[]>([]);
  const isFetchingProductsRef = useRef(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const productSearchTimerRef = useRef<any>(null);

  // Robust live product loader with multi-source fallback (Commerce products, client products, stocks)
  const fetchLiveProducts = useCallback(async (searchQuery?: string) => {
    if (isFetchingProductsRef.current) return;
    isFetchingProductsRef.current = true;
    setIsLoadingProducts(true);
    try {
      let prods: any[] = [];

      // 1. First attempt: standard pagination_required: true
      try {
        const res = await productApi.getProducts({
          activeOnly: true,
          page_no: 1,
          page_size: 100,
          pagination_required: true,
          search: searchQuery?.trim() || undefined,
          sortOrder: "desc",
        });
        const raw = unpackProducts(res);
        if (raw.length > 0) prods = raw;
      } catch (err) {
        console.warn(
          "Product load pagination_required:true error in SalesView:",
          err,
        );
      }

      // 2. Second attempt: pagination_required: false
      if (prods.length === 0) {
        try {
          const res2 = await productApi.getProducts({
            activeOnly: true,
            search: searchQuery?.trim() || undefined,
            page_size: 100,
            pagination_required: false,
          });
          const raw2 = unpackProducts(res2);
          if (raw2.length > 0) prods = raw2;
        } catch (err2) {
          console.warn(
            "Product load pagination_required:false error in SalesView:",
            err2,
          );
        }
      }

      // 3. Third attempt: clientProductApi (platform products)
      if (prods.length === 0) {
        try {
          const cRes = await clientProductApi.getProducts({
            page: 1,
            limit: 100,
            search: searchQuery?.trim() || undefined,
          });
          const cItems = unpackProducts(cRes).filter(isProductActive);
          if (cItems.length > 0) {
            prods = cItems.map((cp: any) => ({
              id: cp.id,
              productId: cp.id,
              productName: cp.name || cp.productName,
              productCode: cp.code || cp.sku,
              salePrice: cp.plans?.[0]?.price || cp.price || 0,
              unit: "PCS",
              category: cp.tagline || "General",
            }));
          }
        } catch (cErr) {
          console.warn(
            "clientProductApi load fallback error in SalesView:",
            cErr,
          );
        }
      }

      const activeProds = prods.filter(isProductActive);
      if (!searchQuery?.trim()) {
        const list: any[] = [];
        activeProds.forEach((p: any) => {
          const pId = p.id || p.productId;
          if (!pId) return;
          list.push({
            id: pId,
            productId: pId,
            name: p.productName || p.name || "Unnamed Product",
            productName: p.productName || p.name || "Unnamed Product",
            code: p.productCode || p.sku || p.code || pId,
            sku: p.productCode || p.sku || p.code || pId,
            price: Number(
              p.salePrice ?? p.sellingPrice ?? p.price ?? p.unitPrice ?? 0,
            ),
            salePrice: Number(
              p.salePrice ?? p.sellingPrice ?? p.price ?? p.unitPrice ?? 0,
            ),
            unitPrice: Number(
              p.salePrice ?? p.sellingPrice ?? p.price ?? p.unitPrice ?? 0,
            ),
            cost: Number(p.purchasePrice ?? p.costPrice ?? 0),
            unit: p.unit || "PCS",
            batches: p.batches || p.stockBatches || [],
            hsnCode: p.hsnCode || "",
            category: p.category || "General",
            imageUrl:
              (p as any).images?.[0] ||
              (p as any).image ||
              (p as any).imageUrl ||
              "",
            status: p.status || "Active",
          });
        });
        setProductList(list);
      } else if (activeProds.length > 0) {
        setProductList((prev) => {
          const map = new Map<string, any>();
          prev.filter(isProductActive).forEach((p) => map.set(p.id, p));
          activeProds.forEach((p: any) => {
            const pId = p.id || p.productId;
            if (!pId) return;
            map.set(pId, {
              id: pId,
              productId: pId,
              name: p.productName || p.name || "Unnamed Product",
              productName: p.productName || p.name || "Unnamed Product",
              code: p.productCode || p.sku || p.code || pId,
              sku: p.productCode || p.sku || p.code || pId,
              price: Number(
                p.salePrice ?? p.sellingPrice ?? p.price ?? p.unitPrice ?? 0,
              ),
              salePrice: Number(
                p.salePrice ?? p.sellingPrice ?? p.price ?? p.unitPrice ?? 0,
              ),
              unitPrice: Number(
                p.salePrice ?? p.sellingPrice ?? p.price ?? p.unitPrice ?? 0,
              ),
              cost: Number(p.purchasePrice ?? p.costPrice ?? 0),
              unit: p.unit || "PCS",
              batches: p.batches || p.stockBatches || [],
              hsnCode: p.hsnCode || "",
              category: p.category || "General",
              imageUrl:
                (p as any).images?.[0] ||
                (p as any).image ||
                (p as any).imageUrl ||
                "",
              status: p.status || "Active",
            });
          });
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.warn("Failed to search products in SalesView:", err);
    } finally {
      setIsLoadingProducts(false);
      isFetchingProductsRef.current = false;
    }
  }, []);

  // Load Stocks & Products on demand when Form Modal is opened
  const hasLoadedProductsRef = useRef(false);
  const loadProductAndStockData = useCallback(async () => {
    fetchLiveProducts();

    if (hasLoadedProductsRef.current) return;
    hasLoadedProductsRef.current = true;
    try {
      const stockRes = await stockApi
        .getStocks({ pagination_required: false, page_size: 100 })
        .catch(() => null);
      const rawStocks = unpackProducts(stockRes);
      if (rawStocks.length > 0) {
        const mappedStocks = rawStocks.map(mapApiStockToInventoryStockItem);
        setStocks(mappedStocks);
        setStocksList(mappedStocks);
      }
    } catch (err) {
      console.warn("Failed to load stocks for form modal in SalesView:", err);
    }

    try {
      const batchRes = await stockApi
        .getStockBatches({ pagination_required: false, page_size: 100 })
        .catch(() => null);
      const rawBatches = unpackProducts(batchRes);
      if (rawBatches.length > 0) {
        setLiveBatches(rawBatches);
      }
    } catch (err) {
      console.warn("Failed to load batches for form modal in SalesView:", err);
    }
  }, [fetchLiveProducts, setStocksList]);

  useEffect(() => {
    if (isFormModalOpen) {
      loadProductAndStockData();
      if (!hasLoadedProductsRef.current || productList.length === 0) {
        fetchLiveProducts();
      }
    }
  }, [
    isFormModalOpen,
    loadProductAndStockData,
    fetchLiveProducts,
    productList.length,
  ]);

  // API States
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [totalApiRecords, setTotalApiRecords] = useState(0);
  const [apiSummary, setApiSummary] = useState<CommerceInvoiceSummary | null>(
    null,
  );
  const [totalApiPages, setTotalApiPages] = useState(1);

  // Resolves a line to a real product record id. It never creates a product and never substitutes a
  // different one: when nothing matches it returns undefined and the form asks the user to pick from the list.
  const resolveProductId = (item: SaleProductItem): string | undefined => {
    if (item.productId && UUID_REGEX.test(item.productId)) {
      return item.productId;
    }
    const foundStock = (stocks || []).find(
      (s) =>
        (s.sku && item.sku && s.sku.toLowerCase() === item.sku.toLowerCase()) ||
        (s.productName &&
          item.productName &&
          s.productName.toLowerCase() === item.productName.toLowerCase()) ||
        s.id === item.productId ||
        s.productId === item.productId,
    );
    if (foundStock) {
      if (foundStock.productId && UUID_REGEX.test(foundStock.productId))
        return foundStock.productId;
      if (foundStock.id && UUID_REGEX.test(foundStock.id)) return foundStock.id;
    }
    const foundProd = (productList as any[]).find(
      (p: any) =>
        (p.sku && item.sku && p.sku.toLowerCase() === item.sku.toLowerCase()) ||
        (p.name &&
          item.productName &&
          p.name.toLowerCase() === item.productName.toLowerCase()) ||
        p.id === item.productId,
    );
    if (foundProd && UUID_REGEX.test(foundProd.id)) {
      return foundProd.id;
    }
    return undefined;
  };

  // Helper to ensure Customer UUID
  const ensureCustomerUUID = (
    custId?: string,
    custName?: string,
  ): string | undefined => {
    if (custId && UUID_REGEX.test(custId)) {
      return custId;
    }
    const foundCust = (customers || []).find(
      (c) =>
        c.id === custId ||
        (c.name &&
          custName &&
          c.name.toLowerCase() === custName.toLowerCase()) ||
        (c.company &&
          custName &&
          c.company.toLowerCase() === custName.toLowerCase()),
    );
    if (foundCust && UUID_REGEX.test(foundCust.id)) {
      return foundCust.id;
    }
    const foundInList = (customerList as any[]).find(
      (c: any) =>
        c.id === custId ||
        (c.name && custName && c.name.toLowerCase() === custName.toLowerCase()),
    );
    if (foundInList && UUID_REGEX.test(foundInList.id)) {
      return foundInList.id;
    }
    return undefined;
  };

  // Live Invoices Fetching
  const isFetchingInvoicesRef = useRef(false);
  const fetchSalesInvoices = useCallback(
    async (overrides?: {
      page?: number;
      search?: string;
      saleStatus?: string;
      paymentStatus?: string;
      customer?: string;
    }): Promise<boolean> => {
      if (isFetchingInvoicesRef.current) return false;
      isFetchingInvoicesRef.current = true;
      setIsApiLoading(true);
      try {
        const targetPage = overrides?.page ?? currentPage;
        const targetSearch =
          overrides?.search !== undefined ? overrides.search : appliedSearch;
        const targetSaleStatus =
          overrides?.saleStatus !== undefined
            ? overrides.saleStatus
            : appliedSaleStatus;
        const targetPaymentStatus =
          overrides?.paymentStatus !== undefined
            ? overrides.paymentStatus
            : appliedPaymentStatus;
        const targetCustomer =
          overrides?.customer !== undefined
            ? overrides.customer
            : appliedCustomer;

        const params: InvoiceFilterParams = {
          page_no: targetPage,
          page_size: pageSize,
          pagination_required: "true",
          sortOrder: "desc",
        };
        if (targetSearch && targetSearch.trim()) {
          params.search = targetSearch.trim();
        }
        if (targetSaleStatus && targetSaleStatus.toUpperCase() !== "ALL") {
          params.status = targetSaleStatus;
        }
        if (
          targetPaymentStatus &&
          targetPaymentStatus.toUpperCase() !== "ALL"
        ) {
          params.paymentStatus = targetPaymentStatus;
        }
        if (
          targetCustomer &&
          targetCustomer.toUpperCase() !== "ALL" &&
          UUID_REGEX.test(targetCustomer)
        ) {
          params.customerId = targetCustomer;
        }

        const res = await commerceInvoiceApi.getInvoices(params);
        if (res && res.data && Array.isArray(res.data)) {
          const mapped = res.data.map((inv) =>
            mapApiInvoiceToSaleTransaction(inv),
          );

          setSalesList(mapped);

          // Self-heal and record cross-module lineage for all fetched invoices with references
          mapped.forEach((sale) => {
            if (!sale.invoiceNo) return;
            const ref = sale.referenceNo?.trim();
            if (!ref) return;

            const existing = findDocumentLineage(sale.invoiceNo);
            if (!existing || !existing.invoiceNo) {
              const inferredType = inferDocType(ref);
              if (inferredType) {
                recordDocumentConversion({
                  fromType: inferredType,
                  fromNo: ref,
                  toType: "Invoice",
                  toNo: sale.invoiceNo,
                  toId: sale.id,
                  partyName: sale.customerName,
                  customerId: sale.customerId,
                });
              }
            }
          });
          setApiSummary(res.summary ?? null);
          if (res.pagination) {
            setTotalApiRecords(res.pagination.totalRecords ?? mapped.length);
            setTotalApiPages(
              Math.max(
                1,
                Math.ceil(
                  (res.pagination.totalRecords ?? mapped.length) / pageSize,
                ),
              ),
            );
          } else {
            setTotalApiRecords(mapped.length);
            setTotalApiPages(1);
          }
          setIsApiConnected(true);
          return true;
        }
        return false;
      } catch (err: any) {
        console.error("Failed to fetch invoices:", err);
        setSalesList([]);
        setTotalApiRecords(0);
        setTotalApiPages(1);
        setIsApiConnected(false);
        return false;
      } finally {
        setIsApiLoading(false);
        isFetchingInvoicesRef.current = false;
      }
    },
    [
      currentPage,
      pageSize,
      appliedSearch,
      appliedSaleStatus,
      appliedPaymentStatus,
      appliedCustomer,
      setSalesList,
    ],
  );

  useEffect(() => {
    fetchSalesInvoices();
  }, [fetchSalesInvoices]);

  // Listen for sidebar click navigation events to immediately re-fetch sales invoices
  useEffect(() => {
    const handleSidebarNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<{ path: string; id: string }>;
      if (
        customEvent.detail?.path === "/sale-management/sales/sale" ||
        customEvent.detail?.id === "sale"
      ) {
        isFetchingInvoicesRef.current = false;
        fetchSalesInvoices();
      }
    };
    window.addEventListener("crm:sidebar-navigate", handleSidebarNavigate);
    return () => {
      window.removeEventListener("crm:sidebar-navigate", handleSidebarNavigate);
    };
  }, [fetchSalesInvoices]);

  // Quick Assign Sales Rep Modal State (Table Row Action)
  const [isAssignInvoiceModalOpen, setIsAssignInvoiceModalOpen] =
    useState(false);
  const [assignInvoiceTarget, setAssignInvoiceTarget] =
    useState<SaleTransaction | null>(null);
  const [assignRepId, setAssignRepId] = useState("");
  const [assignStatus, setAssignStatus] = useState("Pending Follow-up");
  const [assignNextFollowUp, setAssignNextFollowUp] = useState("");

  // Invoice Details Modal Assignment Card State
  const [detailRepId, setDetailRepId] = useState("");
  const [detailCollectionStatus, setDetailCollectionStatus] =
    useState("Pending Follow-up");
  const [detailNextFollowUp, setDetailNextFollowUp] = useState("");

  useEffect(() => {
    if (selectedSale) {
      setDetailRepId(selectedSale.salesRepresentativeId || "");
      setDetailCollectionStatus(
        selectedSale.collectionStatus || "Pending Follow-up",
      );
      setDetailNextFollowUp(selectedSale.nextFollowUpDate || "");
    }
  }, [selectedSale]);

  // Payment Recording Modal State
  const [paymentModalSplits, setPaymentModalSplits] = useState<
    PaymentSplitItem[]
  >([{ id: "rec_1", method: "Bank Transfer", amount: 0, referenceNo: "" }]);
  const [paymentModalDate, setPaymentModalDate] = useState<string>(
    () => new Date().toISOString().split("T")[0],
  );
  const [recordNotes, setRecordNotes] = useState("");

  // Form State for Create / Edit
  const [formData, setFormData] = useState<SalesInvoiceFormData>({
    invoiceNo: "",
    salesInvoiceManualNo: "",
    invoiceStatus: "Draft",
    referenceNo: "",
    saleDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
    customerId: "",
    customerName: "",
    customerCompany: "",
    customerPhone: "",
    customerEmail: "",
    billingAddress: "",
    shippingAddress: "",
    items: [],
    withGst: true,
    gstType: "intra_state",
    overallDiscount: 0,
    shippingCharges: 0,
    otherCharges: 0,
    paymentMethod: "Bank Transfer",
    paymentSplits: [
      { id: "ps_1", method: "Bank Transfer", amount: 0, referenceNo: "" },
    ],
    paymentRecords: [],
    paymentTerms: "Net 15 Days",
    paidAmount: 0,
    roundMode: "none",
    saleStatus: "Confirmed",
    salesperson: "",
    notes: "",
  });

  // Inline validation state + double-submit protection for the invoice form and its actions
  const invoiceFe = useFieldErrors();
  const {
    errors: formErrors,
    validateAll: validateAllFields,
    clearError: clearFormError,
    clearGroup: clearFormGroup,
    merge: mergeFormErrors,
    reset: resetFormErrors,
  } = invoiceFe;
  const saveGuard = useSubmitGuard();
  // Backend batch stock (per product, cached; fetched on product selection and refreshed on submit only).
  const batchStock = useBatchStock();
  const {
    loadProduct: loadBatchStock,
    refresh: refreshBatchStock,
    forget: forgetBatchStock,
    getBatches: getStockBatches,
    getAvailable: getBatchAvailable,
  } = batchStock;
  // Products already on the form (opened for edit, prefilled by a conversion, or picked by the user)
  // get their batch stock loaded once; cached products are not refetched.
  const invoiceProductIdsKey = isFormModalOpen
    ? Array.from(
        new Set(formData.items.map((it) => it.productId).filter(Boolean)),
      )
        .sort()
        .join(",")
    : "";
  useEffect(() => {
    if (!invoiceProductIdsKey) return;
    invoiceProductIdsKey.split(",").forEach((id) => {
      void loadBatchStock(id);
    });
  }, [invoiceProductIdsKey, loadBatchStock]);
  // Every open/close of the invoice form or the Add Payment modal starts with a clean slate.
  useEffect(() => {
    resetFormErrors();
  }, [isFormModalOpen, resetFormErrors]);
  useEffect(() => {
    paymentFe.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaymentModalOpen]);
  const paymentGuard = useSubmitGuard();
  const cancelGuard = useSubmitGuard();
  const deleteGuard = useSubmitGuard();
  // Add Payment modal errors (shown only after the first submit attempt).
  const paymentFe = useFieldErrors();
  const paymentFormErrors = paymentFe.errors;
  const setPaymentFormErrors = paymentFe.setErrors;
  const assignFe = useFieldErrors();
  const detailFe = useFieldErrors();
  const assignRepError = assignFe.errors.assignRepId;
  const detailRepError = detailFe.errors.detailRepId;

  // Close action & share dropdown on click outside or scroll
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest(".action-dropdown-container") &&
        !target.closest(".action-dropdown-menu")
      ) {
        setActiveDropdownId(null);
        setDropdownPos(null);
      }
      if (
        !target.closest(".share-dropdown-container") &&
        !target.closest(".share-dropdown-menu")
      ) {
        setActiveShareDropdownId(null);
        setShareDropdownPos(null);
      }
    };
    const handleScroll = () => {
      if (activeDropdownId) {
        setActiveDropdownId(null);
        setDropdownPos(null);
      }
      if (activeShareDropdownId) {
        setActiveShareDropdownId(null);
        setShareDropdownPos(null);
      }
    };
    window.addEventListener("click", handleOutside);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("click", handleOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [activeDropdownId, activeShareDropdownId]);

  // KPI card metrics come ONLY from the API summary (zeros until the API responds).
  const cardSummary = {
    totalCount: apiSummary?.totalCount ?? 0,
    totalSalesAmount: apiSummary?.totalSalesAmount ?? 0,
    todayAmount: apiSummary?.todayAmount ?? 0,
    todayCount: apiSummary?.todayCount ?? 0,
    pendingPaymentsAmount: apiSummary?.pendingPaymentsAmount ?? 0,
    completedCount: apiSummary?.completedCount ?? 0,
    cancelledCount: apiSummary?.cancelledCount ?? 0,
  };
  const summary = cardSummary;

  // Helper to extract batches for a product
  const getBatchesForProduct = useCallback(
    (productId: string, sku: string, name: string, explicitBatches?: any[]) => {
      if (Array.isArray(explicitBatches) && explicitBatches.length > 0) {
        return explicitBatches;
      }
      const matched = liveBatches.filter((b) => {
        const bPid = String(
          (b as any).productId || (b as any).product_id || "",
        );
        if (productId && bPid && bPid === productId) return true;
        if (sku && (b as any).sku && (b as any).sku === sku) return true;
        if (
          name &&
          (b as any).productName &&
          (b as any).productName.toLowerCase() === name.toLowerCase()
        )
          return true;
        return false;
      });
      return matched;
    },
    [liveBatches],
  );

  // Product Selection helper with real stock batches and searched products
  const availableProducts = useMemo(() => {
    const map = new Map<string, any>();

    // 1. Live Products from /commerce/products
    productList.forEach((p: any) => {
      if (!isProductActive(p)) return;
      const pId = String(p.id || p.productId || "");
      if (!pId) return;
      const sku = p.sku || p.code || p.productCode || "";
      const name = p.name || p.productName || "Unnamed Product";
      const batches = getBatchesForProduct(
        pId,
        sku,
        name,
        p.batches || p.stockBatches,
      );
      map.set(pId, {
        id: pId,
        productId: pId,
        name,
        productName: name,
        price: Number(p.price ?? p.salePrice ?? p.unitPrice ?? 0),
        salePrice: Number(p.price ?? p.salePrice ?? p.unitPrice ?? 0),
        unitPrice: Number(p.price ?? p.salePrice ?? p.unitPrice ?? 0),
        cost: Number(p.cost ?? p.purchasePrice ?? 0),
        sku,
        code: sku,
        category: p.category || "General",
        unit: p.unit || "PCS",
        imageUrl: p.imageUrl || p.image || (p as any).images?.[0] || "",
        batches,
        stock: p.stock ?? 0,
        status: p.status || "Active",
      });
    });

    // Also include line items currently on the invoice so their names are retained
    formData.items.forEach((it: any) => {
      const itPid = String(it.productId || "");
      if (itPid && !map.has(itPid)) {
        map.set(itPid, {
          id: itPid,
          productId: itPid,
          name: it.productName || "Product",
          productName: it.productName || "Product",
          price: Number(it.unitPrice ?? it.salesPrice ?? 0),
          salePrice: Number(it.unitPrice ?? it.salesPrice ?? 0),
          unitPrice: Number(it.unitPrice ?? it.salesPrice ?? 0),
          cost: Number(it.purchasePrice || 0),
          sku: it.sku || "",
          code: it.sku || "",
          category: it.category || "General",
          unit: it.unit || "PCS",
          imageUrl: it.imageUrl || it.image || "",
          batches: [],
          stock: 0,
        });
      }
    });

    return attachStockQty(Array.from(map.values()), stocks).filter((s: any) => {
      const pid = String(s.productId || s.id || "").trim();
      const name = String(s.name || s.productName || "").trim();
      if (!pid && !name) return false;
      if (pid.startsWith("mock_")) return false;
      return true;
    });
  }, [stocks, productList, formData.items, getBatchesForProduct]);

  // The quantity shown in each product row is read live: refresh the stock whenever a product dropdown opens, so it
  // reflects what the last saved document changed (the stock endpoint is never cached).
  useEffect(() => {
    if (openProductDropdownRow === null || openProductDropdownRow === undefined)
      return;
    let cancelled = false;
    stockApi
      .getStocks({ pagination_required: false, page_size: 100 })
      .then((res) => {
        if (cancelled) return;
        const raw = unpackProducts(res);
        if (raw.length > 0) setStocks(raw.map(mapApiStockToInventoryStockItem));
      })
      .catch(() => {
        /* keep the quantities already shown */
      });
    return () => {
      cancelled = true;
    };
  }, [openProductDropdownRow]);

  const matchingProducts = useMemo(() => {
    const q = productSearchQuery.toLowerCase().trim();
    if (!q) return availableProducts;
    return availableProducts.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.productName && p.productName.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.code && p.code.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)),
    );
  }, [availableProducts, productSearchQuery]);

  const handleSelectProduct = (index: number, product: any) => {
    const prodId = product.productId || product.id;
    handleItemProductChange(index, prodId);
    setOpenProductDropdownRow(null);
    setProductSearchQuery("");
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest(".si-product-cell") &&
        !target.closest(".si-product-dropdown")
      ) {
        setOpenProductDropdownRow(null);
      }
      if (
        !target.closest(".invoice-convert-dropdown-container") &&
        !target.closest(".invoice-convert-dropdown-menu")
      ) {
        setActiveConvertDropdownId(null);
        setConvertDropdownPos(null);
      }
    };
    const handleScroll = () => {
      setActiveConvertDropdownId(null);
      setConvertDropdownPos(null);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, []);

  // Handle opening Create Modal
  const handleOpenCreateModal = () => {
    const initialItem: SaleProductItem = {
      id: `s_item_${Date.now()}`,
      productId: "",
      productName: "",
      sku: "",
      batch: "",
      quantity: 1,
      purchasePrice: 0,
      salesPrice: 0,
      unitPrice: 0,
      discountPercent: 0,
      taxPercent: 0,
      total: 0,
    };

    setFormData({
      invoiceNo: "",
      salesInvoiceManualNo: "",
      referenceNo: "",
      saleDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
      customerId: "",
      customerName: "",
      customerCompany: "",
      customerPhone: "",
      customerEmail: "",
      billingAddress: "",
      shippingAddress: "",
      items: [initialItem],
      withGst: true,
      gstType: "intra_state",
      overallDiscount: 0,
      shippingCharges: 0,
      otherCharges: 0,
      paymentMethod: "Bank Transfer",
      paymentSplits: [
        { id: "ps_1", method: "Bank Transfer", amount: 0, referenceNo: "" },
        { id: "ps_2", method: "Cash", amount: 0, referenceNo: "" },
      ],
      paymentTerms: "",
      paidAmount: 0,
      roundMode: "none",
      invoiceStatus: "Draft",
      paymentRecords: [],
      saleStatus: "Confirmed",
      salesperson: "",
      notes: "",
    });
    setEditingSale(null);
    setIsFormModalOpen(true);
  };

  // Handle opening View Modal
  const handleOpenViewInvoice = async (sale: SaleTransaction) => {
    let targetSale = sale;
    if (UUID_REGEX.test(sale.id)) {
      try {
        const fresh = await commerceInvoiceApi.getInvoiceById(sale.id);
        if (fresh && fresh.data) {
          targetSale = mapApiInvoiceToSaleTransaction(fresh.data);
        }
      } catch (err) {
        console.warn("Could not fetch fresh invoice details:", err);
      }
    }
    setSelectedSale(targetSale);
    setIsInvoiceModalOpen(true);
  };

  // Handle opening Edit Modal
  const handleOpenEditModal = async (sale: SaleTransaction) => {
    resetFormErrors();
    let targetSale = sale;
    if (UUID_REGEX.test(sale.id)) {
      try {
        const fresh = await commerceInvoiceApi.getInvoiceById(sale.id);
        if (fresh && fresh.data) {
          targetSale = mapApiInvoiceToSaleTransaction(fresh.data);
        }
      } catch (err) {
        console.warn("Could not fetch fresh invoice details for editing:", err);
      }
    }
    const existingSplits: PaymentSplitItem[] =
      sale.paymentSplits && sale.paymentSplits.length > 0
        ? JSON.parse(JSON.stringify(sale.paymentSplits))
        : [
            {
              id: "ps_1",
              method: sale.paymentMethod || "Bank Transfer",
              amount: sale.paidAmount || 0,
              referenceNo: "",
            },
          ];

    setFormData({
      invoiceNo: sale.invoiceNo,
      salesInvoiceManualNo: sale.salesInvoiceManualNo || "",
      referenceNo: sale.referenceNo || "",
      saleDate: sale.saleDate,
      dueDate: sale.dueDate,
      customerId: sale.customerId,
      customerName: sale.customerName,
      customerCompany: sale.customerCompany || "",
      customerPhone: sale.customerPhone || "",
      customerEmail: sale.customerEmail || "",
      billingAddress: sale.billingAddress,
      shippingAddress: sale.shippingAddress,
      items: JSON.parse(JSON.stringify(sale.items)),
      withGst: sale.withGst !== undefined ? sale.withGst : true,
      gstType: sale.gstType || "intra_state",
      overallDiscount:
        sale.overallDiscount !== undefined
          ? sale.overallDiscount
          : sale.totalDiscount || 0,
      shippingCharges: sale.shippingCharges,
      otherCharges: sale.otherCharges,
      paymentMethod: sale.paymentMethod,
      paymentSplits: existingSplits,
      paymentTerms: sale.paymentTerms,
      paidAmount: sale.paidAmount,
      roundMode: (sale as any).roundMode || "none",
      invoiceStatus: sale.invoiceStatus || "Generated",
      paymentRecords: sale.paymentRecords || [],
      saleStatus: sale.saleStatus,
      salesperson: sale.salesperson,
      notes: sale.notes || "",
    });
    setEditingSale(sale);
    setIsFormModalOpen(true);
  };

  // Duplicate: open the New Invoice form prefilled from this invoice. Nothing is saved until the user presses Save,
  // so the copy is created through the API like any other new invoice (it is never a hidden local draft).
  const handleDuplicateSale = (sale: SaleTransaction) => {
    resetFormErrors();
    const today = new Date().toISOString().split("T")[0];
    const dayMs = 86_400_000;
    const termDays =
      sale.dueDate && sale.saleDate
        ? Math.max(
            0,
            Math.round(
              (new Date(sale.dueDate).getTime() -
                new Date(sale.saleDate).getTime()) /
                dayMs,
            ),
          )
        : 0;
    const dueDate = new Date(Date.now() + termDays * dayMs)
      .toISOString()
      .split("T")[0];
    setFormData({
      invoiceNo: "",
      salesInvoiceManualNo: "",
      referenceNo: "",
      saleDate: today,
      dueDate,
      customerId: sale.customerId,
      customerName: sale.customerName,
      customerCompany: sale.customerCompany || "",
      customerPhone: sale.customerPhone || "",
      customerEmail: sale.customerEmail || "",
      billingAddress: sale.billingAddress,
      shippingAddress: sale.shippingAddress,
      items: JSON.parse(JSON.stringify(sale.items)),
      withGst: sale.withGst !== undefined ? sale.withGst : true,
      gstType: sale.gstType || "intra_state",
      overallDiscount:
        sale.overallDiscount !== undefined
          ? sale.overallDiscount
          : sale.totalDiscount || 0,
      shippingCharges: sale.shippingCharges,
      otherCharges: sale.otherCharges,
      paymentMethod: sale.paymentMethod,
      paymentSplits: [
        {
          id: "ps_1",
          method: sale.paymentMethod || "Bank Transfer",
          amount: 0,
          referenceNo: "",
        },
      ],
      paymentTerms: sale.paymentTerms,
      paidAmount: 0,
      roundMode: (sale as any).roundMode || "none",
      invoiceStatus: "Draft",
      paymentRecords: [],
      saleStatus: "Draft",
      salesperson: sale.salesperson,
      notes: sale.notes || "",
    });
    setEditingSale(null);
    setIsFormModalOpen(true);
    toast.info(
      `Review the copy of ${sale.invoiceNo} and press Save to create the new invoice.`,
    );
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const mapSaleToDocumentPrintOptions = (
    sale: SaleTransaction,
  ): DocumentPrintOptions =>
    mapSaleToDocumentPrintOptionsPure(sale, companyProfile);

  // Load the latest record (GET /commerce/invoices/:id) so print / download use server data
  const fetchLatestInvoice = async (
    sale: SaleTransaction,
  ): Promise<SaleTransaction> => {
    if (!UUID_REGEX.test(sale.id)) return sale;
    try {
      const res = await commerceInvoiceApi.getInvoiceById(sale.id);
      if (res?.data) return mapApiInvoiceToSaleTransaction(res.data);
    } catch (err) {
      console.warn("Could not fetch latest invoice for print/download:", err);
    }
    return sale;
  };

  const handleDownloadSaleInvoice = async (listSale: SaleTransaction) => {
    if (isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    const toastId = `dl-sale-${listSale.id}`;
    toast.loading(`Preparing PDF for Invoice ${listSale.invoiceNo}...`, {
      id: toastId,
    });
    try {
      const sale = await fetchLatestInvoice(listSale);
      const options = mapSaleToDocumentPrintOptions(sale);
      await downloadBusinessDocument(
        options,
        `Invoice_${sale.invoiceNo.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`,
      );
      toast.success(`Invoice ${sale.invoiceNo} downloaded successfully!`, {
        id: toastId,
      });
    } catch (err: any) {
      console.error("Invoice PDF download error:", err);
      toast.error("Failed to generate and download invoice PDF.", {
        id: toastId,
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadPaymentReceipt = async (record: SalePaymentRecord) => {
    if (isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    const toastId = `dl-rcpt-${record.id}`;
    toast.loading(`Preparing payment receipt...`, { id: toastId });
    try {
      const parentSale = sales.find((s) => s.invoiceNo === record.invoiceNo);
      const receiptOptions: DocumentPrintOptions = {
        docTypeTitle: "PAYMENT IN RECEIPT",
        docNo: record.referenceNo || record.id,
        docDate: record.paymentDate,
        status: "Received",
        statusColor: "emerald",
        partyTitle: "Received From (Customer)",
        partyName:
          (record as any).customerName ||
          parentSale?.customerName ||
          "Customer",
        extraMeta: [
          { label: "Invoice No", value: record.invoiceNo },
          {
            label: "Payment Mode",
            value: (record as any).paymentMode || record.method || "Cash",
          },
          { label: "Recorded By", value: record.recordedBy || "Cashier" },
        ],
        items: [
          {
            name: `Payment towards Invoice #${record.invoiceNo}`,
            quantity: 1,
            unitPrice: record.amount,
            total: record.amount,
            remarks: record.notes || "Payment received in full/part",
          },
        ],
        grandTotal: record.amount,
        paidAmount: record.amount,
        balance: 0,
        paidAmountLabel: "Amount Received",
        notes: record.notes || "Thank you for your business!",
        primarySignatoryLabel: "Cashier / Accounts",
      };
      await downloadBusinessDocument(
        receiptOptions,
        `Receipt_${record.invoiceNo}_${record.id}.pdf`,
      );
      toast.success("Payment receipt downloaded successfully!", {
        id: toastId,
      });
    } catch (err: any) {
      console.error("Receipt download error:", err);
      toast.error("Failed to download payment receipt.", { id: toastId });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Direct Print Invoice
  const handlePrintSaleInvoice = async (listSale: SaleTransaction) => {
    const sale = await fetchLatestInvoice(listSale);
    const printWindow = window.open("", "_blank", "width=850,height=900");
    if (!printWindow) {
      toast.error("Unable to open print preview. Please allow popups.");
      return;
    }

    printWindow.document.write(
      buildSalesInvoicePrintHtml(sale, companyProfile),
    );
    printWindow.document.close();
  };

  const handleToggleWithGst = (enableGst: boolean) => {
    setFormData((prev) => {
      const updatedItems = prev.items.map((it) => {
        const lineRes = calculateLineItem(
          {
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discountPercent: it.discountPercent,
            taxPercent: it.taxPercent,
          },
          { withGst: enableGst, gstType: prev.gstType },
        );
        return { ...it, total: lineRes.lineTotal };
      });
      return { ...prev, withGst: enableGst, items: updatedItems };
    });
  };

  const handleSetGstType = (type: "intra_state" | "inter_state") => {
    setFormData((prev) => ({ ...prev, gstType: type }));
  };

  // Selected Customer Credit Stats (from the customer API record)
  const selectedCustomerFinancials = useMemo(() => {
    if (!formData.customerId) return null;
    const c = customerList.find((x: any) => x.id === formData.customerId);
    if (!c) return null;
    const creditLimit = Number(c.creditLimit) || 0;
    const outstandingAmount = Number(c.outstandingAmount) || 0;
    return {
      creditLimit,
      outstandingAmount,
      availableCredit: Math.max(0, creditLimit - outstandingAmount),
    };
  }, [formData.customerId, customerList]);

  // Handle URL Query Params for creating sale with preselected customer
  useEffect(() => {
    const custId = searchParams.get("customerId");
    const shouldCreate = searchParams.get("createSale");
    if (custId && shouldCreate === "true") {
      handleOpenCreateModal();
      setTimeout(() => {
        handleCustomerChange(custId);
      }, 50);
    }
  }, [searchParams]);

  // Customer Select Change
  const handleCustomerChange = (custId: string) => {
    clearFormError("customer");
    const cust = customerList.find((c) => c.id === custId);
    if (cust) {
      setFormData((prev) => ({
        ...prev,
        customerId: cust.id,
        customerName:
          cust.name || (cust as any).contactPerson || cust.company || "",
        customerCompany: cust.company || cust.name || "",
        customerPhone: cust.phone || "",
        customerEmail: cust.email || "",
        billingAddress:
          (cust as any).billingAddress ||
          cust.address ||
          `${(cust as any).city || ""} ${(cust as any).state || ""}`.trim() ||
          "Address on file",
        shippingAddress:
          (cust as any).shippingAddress ||
          (cust as any).billingAddress ||
          cust.address ||
          `${(cust as any).city || ""} ${(cust as any).state || ""}`.trim() ||
          "Address on file",
        paymentTerms:
          (cust as any).paymentTerms || prev.paymentTerms || "Net 15 Days",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        customerId: "",
        customerName: "",
        customerCompany: "",
        customerPhone: "",
        customerEmail: "",
        billingAddress: "",
        shippingAddress: "",
      }));
    }
  };

  // Line item updates
  const handleItemProductNameChange = (index: number, val: string) => {
    clearFormError(`items.${index}.product`);
    setFormData((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], productName: val };
      return { ...prev, items: newItems };
    });
  };

  const handleItemProductChange = (index: number, prodId: string) => {
    const prod = availableProducts.find((p) => p.id === prodId);
    [
      "product",
      "quantity",
      "price",
      "discountPercent",
      "discountAmount",
      "taxPercent",
    ].forEach((f) => clearFormError(`items.${index}.${f}`));
    clearFormError("items");
    clearFormError("totals");
    // The line's batch and stock belong to the old product: drop stale stock, then load the new one.
    const oldProductId = formData.items[index]?.productId;
    if (oldProductId && oldProductId !== prodId) {
      const usedElsewhere = formData.items.some(
        (o, i) => i !== index && o.productId === oldProductId,
      );
      if (!usedElsewhere) forgetBatchStock(oldProductId);
    }
    if (prod) void loadBatchStock(prod.id);
    setFormData((prev) => {
      const newItems = [...prev.items];
      const item = { ...newItems[index] };
      if (prod) {
        const activeBatch =
          prod.batches?.find((b: any) => b.quantity > 0) || prod.batches?.[0];
        item.productId = prod.id;
        item.productName = prod.name;
        item.sku = prod.sku;
        item.batch = activeBatch?.batchNo || "";
        const defaultSalePrice = Number(
          activeBatch?.sellingPrice ??
            prod.price ??
            (prod as any).salePrice ??
            0,
        );
        item.salesPrice = defaultSalePrice;
        item.unitPrice = defaultSalePrice;
        if (defaultSalePrice === 0) {
          toast.warning(
            `Product "${prod.name}" has no default Sale Price configured.`,
          );
        }
        // GST is applied only when the user picks a GST rate for the line; a product's own tax rate is not copied onto the line.
        item.taxPercent = item.taxPercent ?? 0;
        const lineRes = calculateLineItem(
          {
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent || 0,
            taxPercent: item.taxPercent,
          },
          { withGst: prev.withGst, gstType: prev.gstType },
        );
        item.total = lineRes.lineTotal;
      } else {
        item.productId = "";
        item.productName = "";
        item.sku = "";
        item.batch = "";
        item.purchasePrice = 0;
        item.salesPrice = 0;
        item.unitPrice = 0;
        item.taxPercent = 0;
        item.total = 0;
      }
      newItems[index] = item;
      return { ...prev, items: newItems };
    });
  };

  const handleItemBatchChange = (index: number, batchNo: string) => {
    clearFormError(`items.${index}.quantity`);
    clearFormError(`items.${index}.price`);
    clearFormError("totals");
    setFormData((prev) => {
      const newItems = [...prev.items];
      const item = { ...newItems[index] };
      item.batch = batchNo;
      const prod = availableProducts.find((p) => p.id === item.productId);
      const selectedBatch = prod?.batches?.find(
        (b: any) => b.batchNo === batchNo,
      );
      if (selectedBatch) {
        if (selectedBatch.sellingPrice) {
          item.unitPrice = selectedBatch.sellingPrice;
          item.salesPrice = selectedBatch.sellingPrice;
        }
        if (selectedBatch.costPrice) {
          item.purchasePrice = selectedBatch.costPrice;
        }
        const lineRes = calculateLineItem(
          {
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            discountPercent: item.discountPercent || 0,
            taxPercent: item.taxPercent,
          },
          { withGst: prev.withGst, gstType: prev.gstType },
        );
        item.total = lineRes.lineTotal;
      }
      newItems[index] = item;
      return { ...prev, items: newItems };
    });
  };

  const handleItemFieldChange = (
    index: number,
    field: keyof SaleProductItem,
    val: number,
  ) => {
    const sanitizedVal = Math.max(0, val);
    const errField: Record<string, string> = { unitPrice: "price" };
    clearFormError(`items.${index}.${errField[field as string] || field}`);
    if (field === "quantity" || field === "unitPrice") {
      clearFormError(`items.${index}.discountAmount`);
    }
    clearFormError("totals");
    setFormData((prev) => {
      const newItems = [...prev.items];
      const item = { ...newItems[index] };
      const qty = field === "quantity" ? sanitizedVal : item.quantity || 0;
      const unitPrice =
        field === "unitPrice" ? sanitizedVal : item.unitPrice || 0;
      const taxPercent =
        field === "taxPercent" ? sanitizedVal : item.taxPercent || 0;
      const gross = qty * unitPrice;

      let discountPercent = item.discountPercent || 0;
      let discountAmount = item.discountAmount || 0;

      if (field === "discountPercent") {
        item.discountType = "percent";
        discountPercent = Math.min(100, sanitizedVal);
        discountAmount = 0;
        item.discountPercent = discountPercent;
        item.discountAmount = 0;
      } else if (field === "discountAmount") {
        item.discountType = "amount";
        discountAmount = Math.min(gross, sanitizedVal);
        discountPercent = 0;
        item.discountAmount = discountAmount;
        item.discountPercent = 0;
      } else if (field === "quantity" || field === "unitPrice") {
        item[field] = sanitizedVal;
      } else {
        (item as any)[field] = sanitizedVal;
      }

      item.quantity = qty;
      item.unitPrice = unitPrice;
      item.taxPercent = taxPercent;

      const lineRes = calculateLineItem(
        {
          quantity: qty,
          unitPrice,
          discountPercent,
          discountAmount,
          taxPercent,
        },
        { withGst: prev.withGst, gstType: prev.gstType },
      );
      item.total = lineRes.lineTotal;
      newItems[index] = item;
      return { ...prev, items: newItems };
    });
  };

  const handleAddItemRow = () => {
    const newItem: SaleProductItem = {
      id: `s_item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      productId: "",
      productName: "",
      sku: "",
      batch: "",
      quantity: 1,
      unitPrice: 0,
      taxPercent: 0,
      discountPercent: 0,
      discountAmount: 0,
      discountType: "amount",
      total: 0,
    };
    clearFormError("items");
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  const handleRemoveItemRow = (index: number) => {
    if (formData.items.length <= 1) {
      toast.error("A sale must have at least one product line item.");
      return;
    }
    // Row indices shift after removal, so stale per-row errors are dropped.
    clearFormGroup("items.");
    clearFormError("totals");
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Live Totals Calculations using Centralized Financial Calculation Engine
  const calculatedTotals = useMemo<SalesInvoiceTotals>(() => {
    const rawPaid =
      formData.paidAmount !== undefined
        ? Number(formData.paidAmount) || 0
        : (formData.paymentSplits || []).reduce(
            (acc, p) => acc + (Number(p.amount) || 0),
            0,
          );
    const paid = Math.max(0, rawPaid);
    const docTotals = calculateDocumentTotals({
      items: formData.items.map((it) => ({
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discountPercent: it.discountPercent,
        taxPercent: it.taxPercent,
      })),
      withGst: formData.withGst,
      gstType: formData.gstType,
      overallDiscount: Number(formData.overallDiscount) || 0,
      shippingCharges: Number(formData.shippingCharges) || 0,
      otherCharges: Number(formData.otherCharges) || 0,
      roundMode: formData.roundMode || "none",
      paidAmount: paid,
    });

    const unrounded = docTotals.unroundedTotal;
    const floorInt = Math.floor(unrounded);
    const ceilInt = Math.ceil(unrounded);
    const roundDownDiff = round2(floorInt - unrounded);
    const roundUpDiff = round2(ceilInt - unrounded);

    return {
      subtotal: docTotals.subtotal,
      lineDiscountTotal: docTotals.lineDiscountTotal,
      overallDiscount: docTotals.overallDiscount,
      totalDiscount: docTotals.totalDiscount,
      taxableAmount: docTotals.taxableAmount,
      totalTax: docTotals.totalTax,
      cgst: docTotals.cgst,
      sgst: docTotals.sgst,
      igst: docTotals.igst,
      shippingCharges: docTotals.shippingCharges,
      roundOff: docTotals.roundOff,
      roundDownDiff,
      roundUpDiff,
      grandTotal: docTotals.grandTotal,
      paid: docTotals.paidAmount,
      balance: docTotals.balance,
      paymentStatus: docTotals.paymentStatus,
    };
  }, [formData]);

  // Immediately clamp paid amount if invoice grand total is reduced below current paid amount
  useEffect(() => {
    if (isSplitMode) return; // split entries are checked (and shown) by the split section instead
    const currentPaid = Number(formData.paidAmount) || 0;
    if (
      calculatedTotals.grandTotal >= 0 &&
      currentPaid > calculatedTotals.grandTotal
    ) {
      setFormData((prev) => ({
        ...prev,
        paidAmount: calculatedTotals.grandTotal,
        paymentSplits:
          prev.paymentSplits.length > 0
            ? [
                {
                  ...prev.paymentSplits[0],
                  amount: calculatedTotals.grandTotal,
                },
              ]
            : [
                {
                  id: "ps_1",
                  method: prev.paymentMethod || "Bank Transfer",
                  amount: calculatedTotals.grandTotal,
                  referenceNo: "",
                },
              ],
      }));
    }
  }, [calculatedTotals.grandTotal, isSplitMode]);

  // Split payment: live totals and validation for the entries (a new invoice starts with nothing paid)
  const splitSummary = summarizeSplit(
    calculatedTotals.grandTotal,
    0,
    splitRows,
  );
  const splitValidation = validateSplit(
    calculatedTotals.grandTotal,
    0,
    splitRows,
    SALES_SPLIT_PAYMENT_METHODS,
  );

  // Every time the form opens (or another invoice is edited) it starts in Single mode with one empty entry
  useEffect(() => {
    setIsSplitMode(false);
    setSplitRows([newSplitRow(makeSplitRowId())]);
    setSplitShowErrors(false);
  }, [isFormModalOpen, editingSale?.id]);

  // The invoice's paid amount and payment list follow the split entries, so the balance updates on every keystroke
  useEffect(() => {
    if (!isSplitMode) return;
    const active = activeSplitRows(splitRows);
    setFormData((prev) => ({
      ...prev,
      paidAmount: splitSummary.totalPaid,
      paymentMethod:
        active.length > 0 ? (active[0].method as any) : prev.paymentMethod,
      paymentSplits:
        active.length > 0
          ? active.map((r) => ({
              id: r.id,
              method: r.method as any,
              amount: rowAmount(r),
              referenceNo: r.reference.trim(),
            }))
          : [
              {
                id: "ps_1",
                method: prev.paymentMethod || "Bank Transfer",
                amount: 0,
                referenceNo: "",
              },
            ],
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSplitMode, splitRows]);

  const switchPaymentMode = (split: boolean) => {
    if (split === isSplitMode) return;
    if (split) {
      // carry over what was typed in the single field as the first entry
      const carried = Math.max(0, Number(formData.paidAmount) || 0);
      const m = formData.paymentSplits[0]?.method || formData.paymentMethod;
      setSplitRows([
        {
          ...newSplitRow(
            makeSplitRowId(),
            (SALES_SPLIT_PAYMENT_METHODS as string[]).includes(m as string)
              ? (m as any)
              : "Cash",
          ),
          amount: carried > 0 ? String(carried) : "",
        },
      ]);
      setSplitShowErrors(false);
    }
    setIsSplitMode(split);
  };

  // Generate Invoice Handler (Creates invoice on backend and local store)
  // Available stock of the line's chosen batch (null when stock data is not loaded for it).
  // Other lines of this form using the same product + batch are deducted; when editing a saved
  // invoice its own previously-deducted quantity is added back.
  // Stock of the line's batch comes from the backend (useBatchStock), never from local/mock data.
  const getLineAvailableStock = (it: SaleProductItem): number | null => {
    const pid = it.productId || resolveProductId(it);
    return getBatchAvailable(pid, it.batch);
  };

  // Stock this same saved (non-draft) invoice already holds for the line's product + batch: the
  // backend deducted it when the invoice was posted, so an unchanged quantity must not be flagged.
  const getLineStockCredit = (it: SaleProductItem): number => {
    if (!editingSale || !UUID_REGEX.test(editingSale.id)) return 0;
    if (editingSale.invoiceStatus === "Draft") return 0;
    const pid = it.productId || resolveProductId(it);
    return (editingSale.items || [])
      .filter(
        (o) => o.productId === pid && (o.batch || "") === (it.batch || ""),
      )
      .reduce((acc, o) => acc + (Number(o.quantity) || 0), 0);
  };

  const buildInvoiceValidationContext = (
    checkStock: boolean,
  ): InvoiceValidationContext => ({
    totals: calculatedTotals,
    checkStock,
    resolveProductId,
    availableStock: getLineAvailableStock,
    stockCredit: getLineStockCredit,
  });

  // LIVE stock errors (explicit exception to submit-first): recomputed whenever quantities, products,
  // batches or the loaded stock change, so the Qty cell reacts immediately. Never a toast.
  const liveStockErrors = useMemo<FieldErrors>(() => {
    if (!isFormModalOpen) return {};
    return validateBatchStock(
      formData.items.map((it) =>
        isInvoiceRowBlank(it)
          ? {}
          : {
              id: it.id,
              productId: it.productId || resolveProductId(it),
              productName: it.productName,
              batch: it.batch,
              quantity: it.quantity,
            },
      ),
      {
        getAvailable: (_l, i) => getLineAvailableStock(formData.items[i]),
        credit: (_l, i) => getLineStockCredit(formData.items[i]),
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFormModalOpen, formData.items, editingSale, batchStock.version]);

  // Submit-first: errors appear only after a submit attempt, then stay in sync with the values.
  const lastCheckStockRef = useRef(true);
  useRevalidateAfterSubmit(
    invoiceFe,
    () =>
      validateInvoiceForm(
        formData,
        buildInvoiceValidationContext(lastCheckStockRef.current),
      ),
    [formData, calculatedTotals],
  );

  // Maps backend `error.fields` onto the form and shows a friendly toast for system errors.
  const handleInvoiceSaveError = (err: any, fallback: string) => {
    const raw = extractApiFieldErrors(err);
    const mapped: FieldErrors = {};
    Object.entries(raw).forEach(([k, v]) => {
      const mk = mapInvoiceApiErrorKey(k);
      if (!(mk in mapped)) mapped[mk] = v;
    });
    // A stock rejection from the backend is shown inline on the quantity field in friendly wording.
    const stockWording = /stock|insufficient|not enough|available|quantity/i;
    let stockRejected = false;
    Object.keys(mapped).forEach((k) => {
      if (/^items.d+.quantity$/.test(k) && stockWording.test(mapped[k])) {
        mapped[k] =
          "Not enough stock is available in this batch. Please reduce the quantity.";
        stockRejected = true;
      }
    });
    if (stockRejected) {
      // Stock changed since the form was opened: pull fresh figures for the next check.
      void refreshBatchStock(formData.items.map((it) => it.productId));
    }
    const keys = Object.keys(mapped);
    if (keys.length > 0) {
      mergeFormErrors(mapped);
      requestAnimationFrame(() => focusField(keys[0]));
      if (!stockRejected) {
        toast.error(
          getApiErrorMessage(
            err,
            "Please correct the highlighted fields and try again.",
          ),
        );
      }
    } else {
      toast.error(getApiErrorMessage(err, fallback));
    }
  };

  const handleGenerateInvoice = async (): Promise<boolean> => {
    const result = await saveGuard.runOnce(() => generateInvoiceInner());
    return result === true;
  };

  const generateInvoiceInner = async (): Promise<boolean> => {
    // Split payments are checked first so the message appears next to the entries
    if (isSplitMode) {
      setSplitShowErrors(true);
      if (!splitValidation.ok) return false;
    }
    lastCheckStockRef.current = true;
    // Stock may have changed since the form was opened: refetch each distinct product once, then
    // run the full validation (every line) against the fresh batch stock.
    await refreshBatchStock(
      formData.items.map((it) => it.productId || resolveProductId(it)),
    );
    const errs = validateInvoiceForm(
      formData,
      buildInvoiceValidationContext(true),
    );
    if (!validateAllFields(errs)) return false;

    const rawValidItems = formData.items.filter(
      (it) => it.productId || it.productName,
    );

    setIsActionLoading(true);
    try {
      const validItems: SaleProductItem[] = rawValidItems.map((it) => ({
        ...it,
        productId: resolveProductId(it) as string,
      }));

      const resolvedCustomerId = ensureCustomerUUID(
        formData.customerId,
        formData.customerName,
      );

      const grandTotal = calculatedTotals.grandTotal;
      const currentPaid =
        formData.paidAmount !== undefined
          ? Number(formData.paidAmount) || 0
          : editingSale?.paidAmount || 0;
      const balance = Math.max(0, grandTotal - currentPaid);
      const paymentStatus: SalePaymentStatus =
        grandTotal > 0 && balance <= 0
          ? "Paid"
          : currentPaid > 0
            ? "Partial"
            : "Unpaid";
      const primaryPaymentMethod =
        formData.paymentSplits[0]?.method ||
        formData.paymentMethod ||
        "Bank Transfer";

      const isEdit = Boolean(
        editingSale && editingSale.id && UUID_REGEX.test(editingSale.id),
      );

      const salePayload: SaleTransaction = {
        id: isEdit ? editingSale!.id : `sale_${Date.now()}`,
        invoiceNo: isEdit ? formData.invoiceNo : "",
        salesInvoiceManualNo:
          (formData.salesInvoiceManualNo || "").trim() || undefined,
        invoiceStatus: "Generated",
        referenceNo: formData.referenceNo || undefined,
        saleDate: formData.saleDate,
        dueDate: formData.dueDate,
        customerId: resolvedCustomerId || "",
        customerName: formData.customerName,
        customerCompany: formData.customerCompany || undefined,
        customerPhone: formData.customerPhone || undefined,
        customerEmail: formData.customerEmail || undefined,
        billingAddress: formData.billingAddress,
        shippingAddress: formData.shippingAddress || formData.billingAddress,
        items: validItems,
        subtotal: calculatedTotals.subtotal,
        withGst: formData.withGst,
        gstType: formData.gstType,
        cgst: calculatedTotals.cgst,
        sgst: calculatedTotals.sgst,
        igst: calculatedTotals.igst,
        overallDiscount: calculatedTotals.overallDiscount,
        totalDiscount: calculatedTotals.totalDiscount,
        totalTax: calculatedTotals.totalTax,
        shippingCharges: Number(formData.shippingCharges) || 0,
        otherCharges: Number(formData.otherCharges) || 0,
        grandTotal: grandTotal,
        paidAmount: currentPaid,
        balance: balance,
        paymentMethod: primaryPaymentMethod as any,
        paymentSplits: formData.paymentSplits.filter(
          (p) => Number(p.amount) > 0,
        ),
        paymentRecords:
          editingSale?.paymentRecords || formData.paymentRecords || [],
        paymentTerms: formData.paymentTerms || "Net 15 Days",
        paymentStatus: paymentStatus,
        saleStatus: "Confirmed",
        createdBy: editingSale ? editingSale.createdBy : "",
        salesperson: formData.salesperson || editingSale?.salesperson || "",
        notes: formData.notes || undefined,
        convertedAt:
          convertSourceRef.current ||
          (formData.referenceNo &&
            /^(EST|QT|SO|DC|PRO)-/i.test(formData.referenceNo.trim()))
            ? editingSale?.convertedAt || new Date().toISOString()
            : editingSale?.convertedAt || undefined,
        createdAt: editingSale
          ? editingSale.createdAt
          : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Only send values the user actually entered (no silent defaults)
      const apiPayload = mapSaleTransactionToInvoicePayload({
        ...salePayload,
        dueDate: "",
        paymentTerms: "",
        shippingAddress: formData.shippingAddress || "",
        shippingCharges: Number(formData.shippingCharges) || (undefined as any),
        otherCharges: Number(formData.otherCharges) || (undefined as any),
        // On create the payment is recorded right after as Payment In receipt(s); sending the splits
        // here as well would make the backend count the same money twice (paid = 2x total).
        ...(isEdit ? {} : { paymentSplits: [] }),
      });

      let savedApiSale: SaleTransaction;
      if (isEdit) {
        const updateRes = await commerceInvoiceApi.updateInvoice(
          editingSale!.id,
          apiPayload,
        );
        if (updateRes.data) {
          savedApiSale = mapApiInvoiceToSaleTransaction(updateRes.data);
        } else {
          savedApiSale = salePayload;
        }
      } else {
        const createRes = await commerceInvoiceApi.createInvoice(
          apiPayload as any,
        );
        if (createRes.data) {
          savedApiSale = mapApiInvoiceToSaleTransaction(createRes.data);
        } else {
          savedApiSale = {
            ...salePayload,
            invoiceNo: formData.invoiceNo || "",
          };
        }
      }

      if (
        (convertSourceRef.current ||
          (formData.referenceNo &&
            /^(EST|QT|SO|DC|PRO)-/i.test(formData.referenceNo.trim()))) &&
        !savedApiSale.convertedAt
      ) {
        savedApiSale.convertedAt =
          salePayload.convertedAt || new Date().toISOString();
      }

      saveSale(savedApiSale);

      // The backend posted the stock movement for this invoice: drop cached batch stock so the next
      // form (and the Stock screens) read fresh figures.
      dispatch(
        baseApi.util.invalidateTags([
          { type: "Batch", id: "LIST" },
          { type: "Stock", id: "LIST" },
        ]),
      );
      validItems.forEach((it) => forgetBatchStock(it.productId));
      editingSale?.items?.forEach((it) => forgetBatchStock(it.productId));

      // Execute inventory stock reduction & payment in recording for new sales
      if (!isEdit) {
        // 1. Stock Reduction for every item sold
        for (const it of validItems) {
          adjustStock(it.productId, -Number(it.quantity), it.batch, {
            sku: it.sku,
            productName: it.productName,
            sellingPrice: it.unitPrice,
            costPrice: it.purchasePrice,
          });

          // The backend deducts invoice stock itself when the invoice is created in a stock-holding status
          // (syncInvoiceStock); a second OUTWARD adjustment here would deduct the same goods twice.
        }
        dispatch(
          baseApi.util.invalidateTags([
            { type: "Stock", id: "LIST" },
            { type: "Product", id: "LIST" },
          ]),
        );

        // 2. Payment In entry creation if payment received
        if (currentPaid > 0) {
          const newPaymentInRecord: SalePaymentIn = {
            id: `payin_${Date.now()}`,
            receiptNo: "",
            date:
              savedApiSale.saleDate || new Date().toISOString().split("T")[0],
            paymentDate:
              savedApiSale.saleDate || new Date().toISOString().split("T")[0],
            partyName: savedApiSale.customerName,
            customerId: savedApiSale.customerId,
            customerPhone: savedApiSale.customerPhone,
            customerCompany: savedApiSale.customerCompany,
            paymentType: normalizeCommercePaymentType(primaryPaymentMethod),
            paymentMethod: primaryPaymentMethod,
            amount: currentPaid,
            receivedAmount: currentPaid,
            invoiceId: savedApiSale.id,
            invoiceNo: savedApiSale.invoiceNo,
            referenceNo: savedApiSale.referenceNo || savedApiSale.invoiceNo,
            notes: `Payment received on creation of Invoice ${savedApiSale.invoiceNo}`,
            status: "Completed",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          let paymentFailed = false;
          let paymentFailureReason = "";
          let splitSaved = 0;
          const splitToRecord = isSplitMode ? activeSplitRows(splitRows) : [];
          try {
            const payInPayload: any = {
              date:
                savedApiSale.saleDate || new Date().toISOString().split("T")[0],
              partyName: savedApiSale.customerName,
              paymentType: normalizeCommercePaymentType(primaryPaymentMethod),
              receivedAmount: currentPaid,
              invoiceNo: savedApiSale.invoiceNo,
              referenceNo: savedApiSale.referenceNo || savedApiSale.invoiceNo,
              // receiptNo is left out on purpose: the server assigns it. Sending an empty string is
              // rejected by the API ("expected string to have >=1 characters").
              notes: `Payment received on creation of Invoice ${savedApiSale.invoiceNo}`,
            };
            if (UUID_REGEX.test(savedApiSale.customerId)) {
              payInPayload.customerId = savedApiSale.customerId;
            }
            if (UUID_REGEX.test(savedApiSale.id)) {
              payInPayload.invoiceId = savedApiSale.id;
            }
            if (isSplitMode) {
              // One receipt per split entry, sent one at a time and never retried: if one fails the rest are not sent.
              for (const row of splitToRecord) {
                const fields = splitRowToPaymentFields(
                  row,
                  savedApiSale.invoiceNo,
                );
                await commercePaymentInApi.createPaymentIn({
                  ...payInPayload,
                  paymentType: normalizeCommercePaymentType(fields.paymentType),
                  receivedAmount: fields.amount,
                  referenceNo: fields.referenceNo || payInPayload.referenceNo,
                  notes: fields.notes,
                });
                splitSaved += 1;
              }
            } else {
              await commercePaymentInApi.createPaymentIn(payInPayload);
            }
          } catch (payInErr) {
            console.warn(
              "commercePaymentInApi.createPaymentIn notice:",
              payInErr,
            );
            paymentFailed = true;
            paymentFailureReason = getApiErrorMessage(payInErr, "");
          }

          // The backend owns the receipt and the customer's paid total. A local copy with an empty receipt
          // number would show up as a phantom receipt (and add the amount again to the local customer
          // balance), so it is only kept for local-only invoices that never reached the server.
          if (!UUID_REGEX.test(savedApiSale.id)) {
            savePaymentIn(newPaymentInRecord);
          }
          dispatch(
            baseApi.util.invalidateTags([
              { type: "PaymentIn", id: "LIST" },
              { type: "SalesInvoice", id: "LIST" },
              { type: "Customer", id: "LIST" },
            ]),
          );

          if (paymentFailed) {
            toast.warning(
              `Invoice ${savedApiSale.invoiceNo} was generated, but ${isSplitMode ? `only ${splitSaved} of ${splitToRecord.length} split payments were recorded` : "the initial payment could not be recorded"}${paymentFailureReason ? `: ${paymentFailureReason}` : "."} You can add the payment from the invoice without re-creating it.`,
              { duration: 8000 },
            );
          }
        }

        // 3. Upstream document lineage synchronization
        const srcInfo = convertSourceRef.current;
        const refNo = (formData.referenceNo || srcInfo?.sourceNo || "").trim();
        const srcType = srcInfo?.sourceType;
        const srcId = srcInfo?.sourceId;

        // A. Originating from Estimate / Quotation
        if (
          srcType === "Estimate" ||
          srcType === "Quotation" ||
          refNo.startsWith("EST-") ||
          refNo.startsWith("QT-")
        ) {
          const quotId = srcId || "";
          const quotNo = srcInfo?.sourceNo || refNo;

          // 1. Update quotation status in backend API
          if (quotId && UUID_REGEX.test(quotId)) {
            try {
              await quotationApi.updateStatus(quotId, { status: "Converted" });
            } catch (quotErr) {
              console.warn("Backend quotation status update notice:", quotErr);
            }
          }

          // 2. Update quotation in memory store
          try {
            updateQuotationStatus(quotId || quotNo, "Converted");
          } catch (stErr) {
            console.warn("Store updateQuotationStatus notice:", stErr);
          }

          // 3. Dispatch storage sync event
          syncQuotationStatusInStorage(quotId || quotNo, "Converted", {
            type: "Invoice",
            documentNo: savedApiSale.invoiceNo,
            id: savedApiSale.id,
          });

          // 4. Record cross-module document conversion lineage
          recordDocumentConversion({
            fromType: "Estimate",
            fromId: quotId || undefined,
            fromNo: quotNo || undefined,
            toType: "Invoice",
            toId: savedApiSale.id,
            toNo: savedApiSale.invoiceNo,
            partyName: savedApiSale.customerName,
            customerId: savedApiSale.customerId,
            grandTotal: savedApiSale.grandTotal,
          });

          // 5. Invalidate RTK cache
          dispatch(
            baseApi.util.invalidateTags([
              { type: "Estimation", id: "LIST" },
              ...(quotId && UUID_REGEX.test(quotId)
                ? [{ type: "Estimation" as const, id: quotId }]
                : []),
              { type: "SalesInvoice", id: "LIST" },
            ]),
          );
        }

        // B. Originating from Sale Order
        if (srcType === "Order" || refNo.startsWith("SO-")) {
          const orderId = srcId || "";
          const orderNo = srcInfo?.sourceNo || refNo;
          if (orderId && UUID_REGEX.test(orderId)) {
            try {
              await commerceSaleOrderApi.updateStatus(orderId, "Converted");
            } catch (soErr) {
              console.warn("Backend order status update notice:", soErr);
            }
          }
          syncOrderStatusInStorage(orderId || orderNo, "Converted", {
            type: "Invoice",
            documentNo: savedApiSale.invoiceNo,
            id: savedApiSale.id,
          });
          recordDocumentConversion({
            fromType: "Order",
            fromId: orderId || undefined,
            fromNo: orderNo || undefined,
            toType: "Invoice",
            toId: savedApiSale.id,
            toNo: savedApiSale.invoiceNo,
            partyName: savedApiSale.customerName,
            customerId: savedApiSale.customerId,
            grandTotal: savedApiSale.grandTotal,
          });
          dispatch(
            baseApi.util.invalidateTags([
              { type: "SaleOrder", id: "LIST" },
              ...(orderId && UUID_REGEX.test(orderId)
                ? [{ type: "SaleOrder" as const, id: orderId }]
                : []),
            ]),
          );
        }

        // C. Originating from Proforma Invoice
        if (srcType === "Proforma" || refNo.startsWith("PRO-")) {
          const proformaId = srcId || "";
          const proformaNo = srcInfo?.sourceNo || refNo;
          if (proformaId && UUID_REGEX.test(proformaId)) {
            try {
              await commerceProformaApi.updateStatus(proformaId, "Converted");
            } catch (pfErr) {
              console.warn("Backend proforma status update notice:", pfErr);
            }
          }
          syncProformaStatusInStorage(proformaId || proformaNo, "Converted", {
            type: "Invoice",
            documentNo: savedApiSale.invoiceNo,
            id: savedApiSale.id,
          });
          recordDocumentConversion({
            fromType: "Proforma",
            fromId: proformaId || undefined,
            fromNo: proformaNo || undefined,
            toType: "Invoice",
            toId: savedApiSale.id,
            toNo: savedApiSale.invoiceNo,
            partyName: savedApiSale.customerName,
            customerId: savedApiSale.customerId,
            grandTotal: savedApiSale.grandTotal,
          });
          dispatch(
            baseApi.util.invalidateTags([
              { type: "ProformaInvoice", id: "LIST" },
            ]),
          );
        }

        // D. Originating from Delivery Challan
        if (srcType === "Challan" || refNo.startsWith("DC-")) {
          const challanId = srcId || "";
          const challanNo = srcInfo?.sourceNo || refNo;
          // Mark the source delivery challan as Converted in the backend
          if (challanId && UUID_REGEX.test(challanId)) {
            try {
              await commerceDeliveryChallanApi.updateStatus(
                challanId,
                "Converted",
              );
            } catch (dcErr) {
              console.warn("Backend challan status update notice:", dcErr);
            }
          }
          recordDocumentConversion({
            fromType: "Challan",
            fromId: challanId || undefined,
            fromNo: challanNo || undefined,
            toType: "Invoice",
            toId: savedApiSale.id,
            toNo: savedApiSale.invoiceNo,
            partyName: savedApiSale.customerName,
            customerId: savedApiSale.customerId,
            grandTotal: savedApiSale.grandTotal,
          });
          dispatch(
            baseApi.util.invalidateTags([
              { type: "DeliveryChallan", id: "LIST" },
              ...(challanId && UUID_REGEX.test(challanId)
                ? [{ type: "DeliveryChallan" as const, id: challanId }]
                : []),
            ]),
          );
        }

        // Clear conversion source ref
        convertSourceRef.current = null;
      }
      setIsFormModalOpen(false);
      setEditingSale(null);
      setSelectedSale(savedApiSale);

      toast.success(
        `Invoice ${savedApiSale.invoiceNo} ${isEdit ? "updated" : "generated"} successfully! Payment Status: ${savedApiSale.paymentStatus.toUpperCase()}`,
      );
      resetFormErrors();
      await fetchSalesInvoices();
      return true;
    } catch (err: any) {
      console.error("Failed to generate invoice:", err);
      // Entered values are kept; backend field errors are shown inline.
      handleInvoiceSaveError(
        err,
        "Failed to save the invoice. Please try again.",
      );
      return false;
    } finally {
      setIsActionLoading(false);
    }
  };

  // Save Draft Sale Handler
  const handleSaveDraft = async (): Promise<boolean> => {
    const result = await saveGuard.runOnce(() => saveDraftInner());
    return result === true;
  };

  const saveDraftInner = async (): Promise<boolean> => {
    // Drafts do not deduct stock, so stock availability is not enforced here.
    lastCheckStockRef.current = false;
    const errs = validateInvoiceForm(
      formData,
      buildInvoiceValidationContext(false),
    );
    if (!validateAllFields(errs)) return false;

    const rawValidItems = formData.items.filter(
      (it) => it.productId || it.productName,
    );

    setIsActionLoading(true);
    try {
      const validItems: SaleProductItem[] = rawValidItems.map((it) => ({
        ...it,
        productId: resolveProductId(it) as string,
      }));

      const resolvedCustomerId = ensureCustomerUUID(
        formData.customerId,
        formData.customerName,
      );

      const grandTotal = calculatedTotals.grandTotal;
      const currentPaid = formData.paidAmount || 0;
      const balance = Math.max(0, grandTotal - currentPaid);
      const paymentStatus: SalePaymentStatus =
        balance <= 0 ? "Paid" : currentPaid > 0 ? "Partial" : "Unpaid";
      const primaryPaymentMethod =
        formData.paymentSplits[0]?.method ||
        formData.paymentMethod ||
        "Bank Transfer";

      const isEdit = Boolean(
        editingSale && editingSale.id && UUID_REGEX.test(editingSale.id),
      );

      const salePayload: SaleTransaction = {
        id: isEdit ? editingSale!.id : `sale_${Date.now()}`,
        invoiceNo: isEdit ? formData.invoiceNo : "",
        salesInvoiceManualNo:
          (formData.salesInvoiceManualNo || "").trim() || undefined,
        invoiceStatus: formData.invoiceStatus || "Draft",
        referenceNo: formData.referenceNo || undefined,
        saleDate: formData.saleDate,
        dueDate: formData.dueDate,
        customerId: resolvedCustomerId || "",
        customerName: formData.customerName,
        customerCompany: formData.customerCompany || undefined,
        customerPhone: formData.customerPhone || undefined,
        customerEmail: formData.customerEmail || undefined,
        billingAddress: formData.billingAddress,
        shippingAddress: formData.shippingAddress || formData.billingAddress,
        items: validItems,
        subtotal: calculatedTotals.subtotal,
        withGst: formData.withGst,
        gstType: formData.gstType,
        cgst: calculatedTotals.cgst,
        sgst: calculatedTotals.sgst,
        igst: calculatedTotals.igst,
        overallDiscount: calculatedTotals.overallDiscount,
        totalDiscount: calculatedTotals.totalDiscount,
        totalTax: calculatedTotals.totalTax,
        shippingCharges: Number(formData.shippingCharges) || 0,
        otherCharges: Number(formData.otherCharges) || 0,
        grandTotal: grandTotal,
        paidAmount: currentPaid,
        balance: balance,
        paymentMethod: primaryPaymentMethod as any,
        paymentSplits: formData.paymentSplits.filter(
          (p) => Number(p.amount) > 0,
        ),
        paymentRecords: formData.paymentRecords || [],
        paymentTerms: formData.paymentTerms || "Net 15 Days",
        paymentStatus: paymentStatus,
        saleStatus: "Draft",
        createdBy: editingSale ? editingSale.createdBy : "",
        salesperson: formData.salesperson || editingSale?.salesperson || "",
        notes: formData.notes || undefined,
        createdAt: editingSale
          ? editingSale.createdAt
          : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Only send values the user actually entered (no silent defaults)
      const apiPayload = mapSaleTransactionToInvoicePayload({
        ...salePayload,
        dueDate: "",
        paymentTerms: "",
        shippingAddress: formData.shippingAddress || "",
        shippingCharges: Number(formData.shippingCharges) || (undefined as any),
        otherCharges: Number(formData.otherCharges) || (undefined as any),
      });

      let savedApiSale: SaleTransaction;
      if (isEdit) {
        const updateRes = await commerceInvoiceApi.updateInvoice(
          editingSale!.id,
          apiPayload,
        );
        if (updateRes.data) {
          savedApiSale = mapApiInvoiceToSaleTransaction(updateRes.data);
        } else {
          savedApiSale = salePayload;
        }
      } else {
        const createRes = await commerceInvoiceApi.createInvoice(
          apiPayload as any,
        );
        if (createRes.data) {
          savedApiSale = mapApiInvoiceToSaleTransaction(createRes.data);
        } else {
          savedApiSale = {
            ...salePayload,
            invoiceNo: formData.invoiceNo || "",
          };
        }
      }

      saveSale(savedApiSale);
      setEditingSale(savedApiSale);
      setSelectedSale(savedApiSale);
      toast.success(
        `Draft invoice ${savedApiSale.invoiceNo} saved successfully!`,
      );
      resetFormErrors();
      await fetchSalesInvoices();
      return true;
    } catch (err: any) {
      console.error("Failed to save draft invoice:", err);
      handleInvoiceSaveError(
        err,
        "Failed to save the draft invoice. Please try again.",
      );
      return false;
    } finally {
      setIsActionLoading(false);
    }
  };

  // Void / Cancel Invoice
  const handleCancelInvoice = async (sale: SaleTransaction) => {
    await cancelGuard.runOnce(() => cancelInvoiceInner(sale));
  };

  const cancelInvoiceInner = async (sale: SaleTransaction) => {
    if (!(sale?.id || "").trim()) {
      toast.error(
        "This invoice could not be identified. Please refresh the page and try again.",
      );
      return;
    }
    if (String(sale.saleStatus).toLowerCase() === "cancelled") {
      toast.warning(`Invoice ${sale.invoiceNo} is already cancelled.`);
      return;
    }
    setIsActionLoading(true);
    try {
      const cleanId = (sale.id || "").trim();
      if (
        cleanId &&
        !cleanId.startsWith("mock_") &&
        !cleanId.startsWith("local_")
      ) {
        await commerceInvoiceApi.updateStatus(cleanId, "Cancelled");
        // The backend posts the stock movement for the cancelled invoice: refresh stock figures.
        dispatch(
          baseApi.util.invalidateTags([
            { type: "Batch", id: "LIST" },
            { type: "Stock", id: "LIST" },
          ]),
        );
      }
      const updatedSale: SaleTransaction = {
        ...sale,
        saleStatus: "Cancelled",
        updatedAt: new Date().toISOString(),
      };
      saveSale(updatedSale);
      toast.success(`Invoice ${sale.invoiceNo} cancelled successfully.`);
      await fetchSalesInvoices();
    } catch (err: any) {
      console.error("Failed to cancel invoice:", err);
      toast.error(
        getApiErrorMessage(
          err,
          "Failed to cancel the invoice. Please try again.",
        ),
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  // Delete Invoice with confirmation modal
  const handleOpenDeleteModal = (sale: SaleTransaction) => {
    setActiveDropdownId(null);
    setDropdownPos(null);
    setDeleteTargetSale(sale);
    setDeleteSaleError(null);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteSale = async () => {
    await deleteGuard.runOnce(() => confirmDeleteSaleInner());
  };

  const confirmDeleteSaleInner = async () => {
    if (!deleteTargetSale) return;
    if (!(deleteTargetSale.id || "").trim()) {
      setDeleteSaleError(
        "This invoice could not be identified. Please refresh the page and try again.",
      );
      return;
    }
    setIsDeletingSale(true);
    setDeleteSaleError(null);
    try {
      const cleanId = (deleteTargetSale.id || "").trim();
      if (
        cleanId &&
        !cleanId.startsWith("mock_") &&
        !cleanId.startsWith("local_")
      ) {
        await commerceInvoiceApi.deleteInvoice(cleanId);
      }
      deleteSale(deleteTargetSale.id);
      setSalesList(
        sales.filter(
          (s) =>
            s.id !== deleteTargetSale.id &&
            s.invoiceNo !== deleteTargetSale.invoiceNo,
        ),
      );
      dispatch(
        baseApi.util.invalidateTags([
          { type: "SalesInvoice", id: deleteTargetSale.id },
          { type: "SalesInvoice", id: "LIST" },
          { type: "Customer", id: "LIST" },
          { type: "Batch", id: "LIST" },
          { type: "Stock", id: "LIST" },
          "Dashboard",
          "Collection",
        ]),
      );
      toast.success(
        `Invoice "${deleteTargetSale.invoiceNo}" deleted successfully.`,
      );
      setIsDeleteModalOpen(false);
      setDeleteTargetSale(null);
      await fetchSalesInvoices();
    } catch (err: any) {
      console.error("Failed to delete invoice:", err);
      const errMsg = getApiErrorMessage(
        err,
        "Failed to delete the invoice. Please try again.",
      );
      setDeleteSaleError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsDeletingSale(false);
    }
  };

  // General Save Sale Form Handler (legacy support for form submit)
  const handleSaveSale = async (
    mode: "draft" | "confirm" | "print" | "new",
  ) => {
    if (mode === "draft") {
      await handleSaveDraft();
      return;
    }
    // Only continue to print / new when validation passed and the invoice was actually saved.
    const saved = await handleGenerateInvoice();
    if (!saved) return;
    if (mode === "print") {
      setIsFormModalOpen(false);
      setIsInvoiceModalOpen(true);
      if (selectedSale) {
        handlePrintSaleInvoice(selectedSale);
      }
    } else if (mode === "new") {
      handleOpenCreateModal();
    }
  };

  // Open Add Payment Modal for a sale (or current form sale)
  const handleOpenAddPayment = (saleToPay?: SaleTransaction) => {
    let targetSale: SaleTransaction;
    if (saleToPay) {
      targetSale = saleToPay;
    } else if (editingSale) {
      const validItems = formData.items.filter(
        (it) => it.productId || it.productName,
      );
      const grandTotal = calculatedTotals.grandTotal;
      const currentPaid = editingSale.paidAmount || formData.paidAmount || 0;
      const balance = Math.max(0, grandTotal - currentPaid);
      const paymentStatus: SalePaymentStatus =
        balance <= 0 ? "Paid" : currentPaid > 0 ? "Partial" : "Unpaid";

      targetSale = {
        ...editingSale,
        invoiceNo: formData.invoiceNo,
        salesInvoiceManualNo:
          (formData.salesInvoiceManualNo || "").trim() || undefined,
        invoiceStatus: "Generated",
        referenceNo: formData.referenceNo,
        saleDate: formData.saleDate,
        dueDate: formData.dueDate,
        customerId: formData.customerId,
        customerName: formData.customerName,
        customerCompany: formData.customerCompany,
        customerPhone: formData.customerPhone,
        customerEmail: formData.customerEmail,
        billingAddress: formData.billingAddress,
        shippingAddress: formData.shippingAddress,
        items: validItems.length > 0 ? validItems : editingSale.items,
        subtotal: calculatedTotals.subtotal,
        withGst: formData.withGst,
        gstType: formData.gstType,
        cgst: calculatedTotals.cgst,
        sgst: calculatedTotals.sgst,
        igst: calculatedTotals.igst,
        overallDiscount: calculatedTotals.overallDiscount,
        totalDiscount: calculatedTotals.totalDiscount,
        totalTax: calculatedTotals.totalTax,
        shippingCharges: Number(formData.shippingCharges) || 0,
        otherCharges: Number(formData.otherCharges) || 0,
        grandTotal: grandTotal,
        paidAmount: currentPaid,
        balance: balance,
        paymentStatus: paymentStatus,
        paymentRecords:
          editingSale.paymentRecords || formData.paymentRecords || [],
        notes: formData.notes,
        updatedAt: new Date().toISOString(),
      };
      storeSaveSale(targetSale);
      setEditingSale(targetSale);
    } else {
      const validItems = formData.items.filter(
        (it) => it.productId || it.productName,
      );
      const grandTotal = calculatedTotals.grandTotal;
      const currentPaid = formData.paidAmount || 0;
      const balance = Math.max(0, grandTotal - currentPaid);
      const paymentStatus: SalePaymentStatus =
        balance <= 0 ? "Paid" : currentPaid > 0 ? "Partial" : "Unpaid";

      targetSale = {
        id: `sale_${Date.now()}`,
        invoiceNo: formData.invoiceNo || "",
        salesInvoiceManualNo:
          (formData.salesInvoiceManualNo || "").trim() || undefined,
        invoiceStatus: "Generated",
        referenceNo: formData.referenceNo,
        saleDate: formData.saleDate,
        dueDate: formData.dueDate,
        customerId: formData.customerId,
        customerName: formData.customerName || "Walk-in Customer",
        customerCompany: formData.customerCompany,
        customerPhone: formData.customerPhone,
        customerEmail: formData.customerEmail,
        billingAddress: formData.billingAddress,
        shippingAddress: formData.shippingAddress,
        items: validItems,
        subtotal: calculatedTotals.subtotal,
        withGst: formData.withGst,
        gstType: formData.gstType,
        cgst: calculatedTotals.cgst,
        sgst: calculatedTotals.sgst,
        igst: calculatedTotals.igst,
        overallDiscount: calculatedTotals.overallDiscount,
        totalDiscount: calculatedTotals.totalDiscount,
        totalTax: calculatedTotals.totalTax,
        shippingCharges: Number(formData.shippingCharges) || 0,
        otherCharges: Number(formData.otherCharges) || 0,
        grandTotal: grandTotal,
        paidAmount: currentPaid,
        balance: balance,
        paymentMethod: "Bank Transfer",
        paymentSplits: formData.paymentSplits,
        paymentRecords: formData.paymentRecords || [],
        paymentTerms: formData.paymentTerms,
        paymentStatus: paymentStatus,
        saleStatus: "Confirmed",
        createdBy: editingSale ? editingSale.createdBy : "",
        salesperson: formData.salesperson || editingSale?.salesperson || "",
        notes: formData.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      storeSaveSale(targetSale);
      setEditingSale(targetSale);
    }

    setSelectedSale(targetSale);
    const balanceDue =
      targetSale.balance !== undefined
        ? targetSale.balance
        : Math.max(0, targetSale.grandTotal - (targetSale.paidAmount || 0));
    setPaymentModalSplits([
      {
        id: `rec_${Date.now()}`,
        method: "Bank Transfer",
        amount: balanceDue,
        referenceNo: "",
      },
    ]);
    setPaymentModalDate(new Date().toISOString().split("T")[0]);
    setRecordNotes("");
    paymentFe.reset();
    setIsPaymentModalOpen(true);
  };

  const handleAddPaymentModalSplit = () => {
    const allocated = paymentModalSplits.reduce(
      (acc, p) => acc + (Number(p.amount) || 0),
      0,
    );
    const currentBalance = selectedSale
      ? selectedSale.balance !== undefined
        ? selectedSale.balance
        : Math.max(0, selectedSale.grandTotal - (selectedSale.paidAmount || 0))
      : calculatedTotals.balance;
    const remaining = Math.max(0, currentBalance - allocated);
    const newSplit: PaymentSplitItem = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      method: "Cash",
      amount: remaining,
      referenceNo: "",
    };
    setPaymentModalSplits((prev) => [...prev, newSplit]);
  };

  const handleRemovePaymentModalSplit = (index: number) => {
    if (paymentModalSplits.length <= 1) {
      toast.error("At least one payment method row is required.");
      return;
    }
    // Row indices shift; errors are recomputed by useRevalidateAfterSubmit after a submit attempt.
    paymentFe.clearGroup("payment");
    setPaymentModalSplits((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePaymentModalSplitChange = (
    index: number,
    field: keyof PaymentSplitItem,
    value: string | number,
  ) => {
    if (field === "amount" && selectedSale) {
      const due =
        selectedSale.balance !== undefined
          ? selectedSale.balance
          : Math.max(
              0,
              selectedSale.grandTotal - (selectedSale.paidAmount || 0),
            );
      const otherRows = paymentModalSplits.reduce(
        (acc, p, i) => (i === index ? acc : acc + (Number(p.amount) || 0)),
        0,
      );
      const room = Math.max(0, round2(due - otherRows));
      if (Number(value) > room + 0.005) {
        value = room;
        paymentFe.merge({
          [`payment.${index}.amount`]: `Payment cannot exceed the outstanding balance of ₹${due.toFixed(2)}.`,
        });
      } else {
        paymentFe.clearError(`payment.${index}.amount`);
      }
    }
    setPaymentModalSplits((prev) => {
      const newSplits = [...prev];
      newSplits[index] = { ...newSplits[index], [field]: value };
      return newSplits;
    });
  };

  // Confirm Payment: Records payment against the SAME invoice and updates payment status
  // Validates the Add Payment modal. Keys: payment.{i}.amount, payment.{i}.method, paymentDate, payments
  const validatePaymentModal = (): FieldErrors => {
    const errs: FieldErrors = {};
    if (!selectedSale) return errs;
    const balance =
      selectedSale.balance !== undefined
        ? selectedSale.balance
        : Math.max(0, selectedSale.grandTotal - (selectedSale.paidAmount || 0));

    if (String(selectedSale.saleStatus).toLowerCase() === "cancelled") {
      errs.payments =
        "Payments cannot be recorded against a cancelled invoice.";
      return errs;
    }

    let total = 0;
    paymentModalSplits.forEach((p, i) => {
      const n = parseNumericValue(p.amount);
      if (n === null) {
        if (String(p.amount ?? "").trim() !== "") {
          errs[`payment.${i}.amount`] =
            "Payment amount must be a valid number.";
        }
        return;
      }
      if (n < 0) {
        errs[`payment.${i}.amount`] = "Payment amount cannot be negative.";
        return;
      }
      if (n > 0) {
        total += n;
        if (!String(p.method || "").trim()) {
          errs[`payment.${i}.method`] = "Please select a payment mode.";
        }
      }
    });

    if (Object.keys(errs).length === 0) {
      if (total <= 0) {
        errs["payment.0.amount"] =
          "Please enter a payment amount greater than zero.";
      } else {
        const over = checkPaymentWithinBalance(total, balance);
        if (over) errs["payment.0.amount"] = over;
      }
    }

    const dateErr = checkRequiredDate(paymentModalDate, "payment date");
    if (dateErr) errs.paymentDate = dateErr;
    return errs;
  };

  useRevalidateAfterSubmit(paymentFe, () => validatePaymentModal(), [
    selectedSale,
    paymentModalSplits,
    paymentModalDate,
  ]);

  const handleConfirmPayment = async () => {
    await paymentGuard.runOnce(() => confirmPaymentInner());
  };

  const confirmPaymentInner = async () => {
    if (!selectedSale) return;
    if (!paymentFe.validateAll(validatePaymentModal())) return;
    const totalAllocated = paymentModalSplits.reduce(
      (acc, p) => acc + (Number(p.amount) || 0),
      0,
    );

    const primaryMethod = paymentModalSplits[0]?.method || "Bank Transfer";
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const paymentDateStr = paymentModalDate || now.toISOString().split("T")[0];

    // Attempt to persist to backend via Commerce Payment-In API
    try {
      const isUuidInvoice = UUID_REGEX.test(selectedSale.id);
      const isUuidCust =
        selectedSale.customerId && UUID_REGEX.test(selectedSale.customerId);
      await commercePaymentInApi.createPaymentIn({
        partyName: selectedSale.customerName || "Customer",
        customerId: isUuidCust ? selectedSale.customerId : undefined,
        paymentType: normalizeCommercePaymentType(primaryMethod),
        receivedAmount: totalAllocated,
        invoiceId: isUuidInvoice ? selectedSale.id : undefined,
        invoiceNo: selectedSale.invoiceNo,
        date: paymentDateStr,
        notes:
          recordNotes ||
          `Payment received for Invoice ${selectedSale.invoiceNo}`,
      });
      dispatch(
        baseApi.util.invalidateTags([
          { type: "SalesInvoice", id: selectedSale.id },
          { type: "SalesInvoice", id: "LIST" },
          { type: "PaymentIn", id: "LIST" },
          { type: "Customer", id: "LIST" },
          "Dashboard",
          "Collection",
        ]),
      );
    } catch (apiErr: any) {
      console.warn("Backend payment recording notice:", apiErr);
      // A saved invoice must not show a payment that the server did not record: keep the modal open
      // with the entered values. Unsaved/local invoices keep the previous local-only behaviour.
      if (UUID_REGEX.test(selectedSale.id)) {
        const apiFieldErrs = extractApiFieldErrors(apiErr);
        const mapped: FieldErrors = {};
        Object.entries(apiFieldErrs).forEach(([k, v]) => {
          if (/amount/i.test(k)) mapped["payment.0.amount"] = v;
          else if (/date/i.test(k)) mapped.paymentDate = v;
          else if (/type|method/i.test(k)) mapped["payment.0.method"] = v;
        });
        if (Object.keys(mapped).length > 0) {
          setPaymentFormErrors(mapped);
          requestAnimationFrame(() => focusField(Object.keys(mapped)[0]));
        }
        toast.error(
          getApiErrorMessage(
            apiErr,
            "Failed to record the payment. Please try again.",
          ),
        );
        return;
      }
    }

    // Generate individual payment receipt records for this payment transaction
    const newRecords: SalePaymentRecord[] = paymentModalSplits
      .filter((p) => Number(p.amount) > 0)
      .map((p) => ({
        id: `local_pay_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        invoiceNo: selectedSale.invoiceNo,
        paymentDate: paymentDateStr,
        paymentTime: timeStr,
        method: p.method,
        referenceNo: p.referenceNo || "",
        amount: Number(p.amount),
        status: "Paid",
        recordedBy: "Org Super Administrator",
        notes: recordNotes || `Payment received via ${p.method}`,
        createdAt: now.toISOString(),
      }));

    // Shared session memory is updated for other screens, but this screen never displays from it:
    // the list is re-fetched from the API right after, and the open dialog mirrors the recorded payment.
    updateSalePayment(
      selectedSale.id,
      totalAllocated,
      primaryMethod,
      recordNotes,
      paymentModalSplits,
      newRecords,
    );

    const updatedSale = {
      ...selectedSale,
      paidAmount: (selectedSale.paidAmount || 0) + totalAllocated,
      balance: Math.max(
        0,
        selectedSale.grandTotal -
          ((selectedSale.paidAmount || 0) + totalAllocated),
      ),
      paymentStatus:
        Math.max(
          0,
          selectedSale.grandTotal -
            ((selectedSale.paidAmount || 0) + totalAllocated),
        ) <= 0
          ? ("Paid" as SalePaymentStatus)
          : ("Partial" as SalePaymentStatus),
      paymentRecords: [...(selectedSale.paymentRecords || []), ...newRecords],
      paymentSplits: [
        ...(selectedSale.paymentSplits || []),
        ...paymentModalSplits,
      ],
    };

    setSelectedSale(updatedSale);
    if (editingSale && editingSale.id === selectedSale.id) {
      setEditingSale(updatedSale);
    }
    setFormData((prev) => ({
      ...prev,
      paidAmount: updatedSale.paidAmount,
      invoiceStatus: "Generated",
      paymentRecords: updatedSale.paymentRecords || [],
      paymentSplits: updatedSale.paymentSplits || prev.paymentSplits,
    }));

    toast.success(
      `Payment of ₹${totalAllocated.toLocaleString("en-IN", { minimumFractionDigits: 2 })} recorded successfully for Invoice ${selectedSale.invoiceNo}!`,
    );
    setIsPaymentModalOpen(false);
    await fetchSalesInvoices();
  };

  const handleViewPaymentDetails = (record: SalePaymentRecord) => {
    setSelectedPaymentRecord(record);
    setIsPaymentDetailsModalOpen(true);
  };

  // Filtering Sales
  const applyScreenFilters = useCallback(
    (list: SaleTransaction[]) =>
      list.filter((s) => {
      const q = appliedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.invoiceNo.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        (s.customerCompany || "").toLowerCase().includes(q) ||
        s.items.some((it) => it.productName.toLowerCase().includes(q)) ||
        s.salesperson.toLowerCase().includes(q) ||
        (s.salesRepresentativeName || "").toLowerCase().includes(q);

      const matchesSaleStatus =
        appliedSaleStatus === "All" ||
        s.saleStatus.toLowerCase() === appliedSaleStatus.toLowerCase();

      const matchesPaymentStatus =
        appliedPaymentStatus === "All" ||
        s.paymentStatus.toLowerCase() === appliedPaymentStatus.toLowerCase();

      const matchesCustomer =
        appliedCustomer === "All" ||
        s.customerId === appliedCustomer ||
        s.customerName === appliedCustomer;

      const matchesSalesRep =
        appliedSalesRep === "All" ||
        s.salesRepresentativeId === appliedSalesRep ||
        s.salesRepresentativeName === appliedSalesRep;

      return (
        matchesSearch &&
        matchesSaleStatus &&
        matchesPaymentStatus &&
        matchesCustomer &&
        matchesSalesRep
      );
    }),
    [
      appliedSearch,
      appliedSaleStatus,
      appliedPaymentStatus,
      appliedCustomer,
      appliedSalesRep,
    ],
  );
  const filteredSales = useMemo(
    () => applyScreenFilters(sales),
    [sales, applyScreenFilters],
  );

  // Report pages: same list API + applied filters as fetchSalesInvoices, any page.
  const fetchSalesReportPage = async (page: number, size: number) => {
    const params: InvoiceFilterParams = {
      page_no: page,
      page_size: size,
      pagination_required: "true",
      sortOrder: "desc",
    };
    if (appliedSearch && appliedSearch.trim()) {
      params.search = appliedSearch.trim();
    }
    if (appliedSaleStatus && appliedSaleStatus.toUpperCase() !== "ALL") {
      params.status = appliedSaleStatus;
    }
    if (appliedPaymentStatus && appliedPaymentStatus.toUpperCase() !== "ALL") {
      params.paymentStatus = appliedPaymentStatus;
    }
    if (
      appliedCustomer &&
      appliedCustomer.toUpperCase() !== "ALL" &&
      UUID_REGEX.test(appliedCustomer)
    ) {
      params.customerId = appliedCustomer;
    }
    const res = await commerceInvoiceApi.getInvoices(params);
    return {
      items: Array.isArray(res?.data)
        ? res.data.map((inv) => mapApiInvoiceToSaleTransaction(inv))
        : [],
      totalRecords: res?.pagination?.totalRecords,
      totalPages: res?.pagination?.totalPages,
      hasNextPage: res?.pagination?.hasNextPage,
    };
  };

  // Submit-first validation for the two assign-rep forms.
  const validateAssignRep = (repId: string, key: string): FieldErrors =>
    repId
      ? {}
      : { [key]: "Please select a sales representative before saving." };
  useRevalidateAfterSubmit(
    assignFe,
    () => validateAssignRep(assignRepId, "assignRepId"),
    [assignRepId],
  );
  useRevalidateAfterSubmit(
    detailFe,
    () => validateAssignRep(detailRepId, "detailRepId"),
    [detailRepId],
  );
  useEffect(() => {
    assignFe.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAssignInvoiceModalOpen]);
  useEffect(() => {
    detailFe.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInvoiceModalOpen, selectedSale?.id]);

  // Open Quick Assign Modal from Table Row Action
  const handleOpenAssignInvoiceModal = (sale: SaleTransaction) => {
    setAssignInvoiceTarget(sale);
    assignFe.reset();
    const cust = customers.find((c) => c.id === sale.customerId);
    setAssignRepId(
      cust?.salesRepresentativeId || sale.salesRepresentativeId || "",
    );
    setAssignStatus(sale.collectionStatus || "Pending Follow-up");
    setAssignNextFollowUp(sale.nextFollowUpDate || "");
    setIsAssignInvoiceModalOpen(true);
  };

  // Assign the representative on the server (the same API the Customer screen uses). Returns true only when it was saved.
  const assignRepViaApi = async (
    customerId: string,
    repId: string,
  ): Promise<boolean> => {
    if (!customerId) return true;
    try {
      const res = await collectionApi.assignCustomer({
        customerId,
        salesRepresentativeId: repId,
        assignmentType: "Primary",
      });
      if (res && res.success === false)
        throw new Error(res.message || "The assignment was not saved");
      const assigned = salesRepresentatives.find((r) => r.id === repId);
      setCustomerList((prev) =>
        prev.map((c: any) =>
          c.id === customerId
            ? {
                ...c,
                salesRepresentativeId: repId,
                salesRepresentativeName:
                  assigned?.name || c.salesRepresentativeName,
              }
            : c,
        ),
      );
      return true;
    } catch (err: any) {
      toast.error("Could not assign the sales representative", {
        description:
          err?.response?.data?.error?.message ||
          err?.message ||
          "Please try again.",
      });
      return false;
    }
  };

  // Save Quick Assignment
  const handleSaveQuickAssignInvoice = async () => {
    if (!assignInvoiceTarget) return;
    if (!assignFe.validateAll(validateAssignRep(assignRepId, "assignRepId")))
      return;
    const cust = customers.find((c) => c.id === assignInvoiceTarget.customerId);
    if (!(await assignRepViaApi(assignInvoiceTarget.customerId, assignRepId)))
      return;
    const rep = salesRepresentatives.find((r) => r.id === assignRepId);

    toast.success(
      `Sales Rep assigned to customer ${cust?.name || assignInvoiceTarget.customerName}!`,
      {
        description: `Assigned ${rep?.name || "Representative"} across all customer invoices.`,
      },
    );
    setIsAssignInvoiceModalOpen(false);
    setAssignInvoiceTarget(null);
  };

  // Save Assignment from Invoice Details Modal Card
  const handleSaveDetailAssignment = async () => {
    if (!selectedSale) return;
    if (!detailFe.validateAll(validateAssignRep(detailRepId, "detailRepId")))
      return;
    const cust = customers.find((c) => c.id === selectedSale.customerId);
    if (!(await assignRepViaApi(selectedSale.customerId, detailRepId))) return;
    const rep = salesRepresentatives.find((r) => r.id === detailRepId);

    setSelectedSale({
      ...selectedSale,
      salesRepresentativeId: detailRepId,
      salesRepresentativeName: rep?.name || "Unassigned",
      collectionStatus: detailCollectionStatus,
      nextFollowUpDate: detailNextFollowUp,
    });

    toast.success(
      `Sales Rep assigned to customer ${cust?.name || selectedSale.customerName}!`,
      {
        description: `Assigned ${rep?.name || "Representative"} across all customer invoices.`,
      },
    );
  };

  // Export Sales to Excel Report
  const handleExportExcel = () =>
    runReport<SaleTransaction>({
      label: "sales invoices",
      load: async () =>
        applyScreenFilters(await fetchAllReportRows(fetchSalesReportPage)),
      onRows: (rows) =>
        exportSalesInvoicesToExcel(rows, appliedSaleStatus, summary),
    });

  const handlePrintTableReport = () =>
    runReport<SaleTransaction>({
      label: "sales invoices",
      load: async () =>
        applyScreenFilters(await fetchAllReportRows(fetchSalesReportPage)),
      onRows: (rows) =>
        printSalesInvoicesReport(rows, appliedSaleStatus, summary),
    });

  // Pagination
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSales.slice(start, start + pageSize);
  }, [filteredSales, currentPage, pageSize]);

  // Payment History Logs (Aggregated across all sales transactions)
  const paymentLogs = usePaymentTransactionLogs(sales);

  // =========================================================================
  // FULL PAGE CREATE / EDIT SALE VIEW (Matching New Quotation Page Layout)
  // =========================================================================
  return (
    <>
      {isFormModalOpen ? (
        <div className="space-y-6 animate-in fade-in duration-150 font-sans pb-12">
          {/* Top Full-Page Navigation Header with Back button on the RIGHT */}
          <div className="bg-[#33077C] rounded-2xl shadow-md p-5 sm:p-6 flex items-center justify-between gap-4 text-white">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {editingSale ? "Edit Sale" : "New Sale"}
                </h1>
                {editingSale && formData.invoiceNo && (
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-[#33077C] font-mono text-xs sm:text-[13px] bg-white px-2.5 py-0.5 rounded-md border border-purple-200/80 shadow-2xs">
                      #{formData.invoiceNo}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-xs sm:text-sm text-white/80 font-medium mt-0.5">
                Create, configure, and issue a formal sale transaction.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
              className="inline-flex items-center justify-center gap-2 h-10 px-4.5 bg-white text-[#33077C] hover:bg-slate-100 rounded-xl text-sm font-bold transition-all cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-[#33077C] stroke-[2.5]" />
              <span>Back</span>
            </button>
          </div>

          {/* Full-Page Form Canvas */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden p-6 sm:p-8">
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveSale("confirm");
              }}
              className="space-y-6"
            >
              {/* Flat 3-column Grid matching New Quotation layout */}
              <InvoiceDetailsSection
                formData={formData}
                setFormData={setFormData}
                formErrors={formErrors}
                clearFormError={clearFormError}
                editingSale={editingSale}
                computedPreviewNo={computedPreviewNo}
                calculatedTotals={calculatedTotals}
                selectedCustomerFinancials={selectedCustomerFinancials}
                handleCustomerChange={handleCustomerChange}
                setIsAddCustomerModalOpen={setIsAddCustomerModalOpen}
              />

              {/* SECTION: Taxation & GST Configuration Bar */}
              <GstConfigurationBar
                withGst={formData.withGst}
                gstType={formData.gstType}
                onToggleWithGst={handleToggleWithGst}
                onSetGstType={handleSetGstType}
              />

              {/* SECTION: Dynamic Itemized Table */}
              <InvoiceItemsTable
                formData={formData}
                setFormData={setFormData}
                formErrors={formErrors}
                liveStockErrors={liveStockErrors}
                openProductDropdownRow={openProductDropdownRow}
                setOpenProductDropdownRow={setOpenProductDropdownRow}
                productDropdownRef={productDropdownRef}
                productSearchQuery={productSearchQuery}
                setProductSearchQuery={setProductSearchQuery}
                productSearchTimerRef={productSearchTimerRef}
                productList={productList}
                availableProducts={availableProducts}
                matchingProducts={matchingProducts}
                isLoadingProducts={isLoadingProducts}
                fetchLiveProducts={fetchLiveProducts}
                setActiveItemRowIndex={setActiveItemRowIndex}
                setIsAddItemModalOpen={setIsAddItemModalOpen}
                handleItemProductNameChange={handleItemProductNameChange}
                handleItemProductChange={handleItemProductChange}
                handleSelectProduct={handleSelectProduct}
                getStockBatches={getStockBatches}
                getBatchAvailable={getBatchAvailable}
                handleItemBatchChange={handleItemBatchChange}
                handleItemFieldChange={handleItemFieldChange}
                handleRemoveItemRow={handleRemoveItemRow}
                handleAddItemRow={handleAddItemRow}
              />

              {/* BOTTOM SECTION: INVOICE SUMMARY & ACTION AREA */}
              <InvoiceSummaryAndPayment
                formData={formData}
                setFormData={setFormData}
                calculatedTotals={calculatedTotals}
                clearFormError={clearFormError}
                mergeFormErrors={mergeFormErrors}
                formErrors={formErrors}
                editingSale={editingSale}
                switchPaymentMode={switchPaymentMode}
                isSplitMode={isSplitMode}
                splitRows={splitRows}
                setSplitRows={setSplitRows}
                splitSummary={splitSummary}
                splitValidation={splitValidation}
                splitShowErrors={splitShowErrors}
                isActionLoading={isActionLoading}
              />

              {/* Bottom Actions Bar (with Cancel and Generate Invoice button ONLY - 3 buttons removed) */}
              <InvoiceFormActionBar
                calculatedTotals={calculatedTotals}
                isActionLoading={isActionLoading}
                isSubmitting={saveGuard.isSubmitting}
                onCancel={() => setIsFormModalOpen(false)}
              />


              {/* SECTION: FULL-WIDTH PAYMENT HISTORY AT THE VERY END OF SALES PAGE */}
              <InvoiceFormPaymentHistory
                formData={formData}
                editingSale={editingSale}
                calculatedTotals={calculatedTotals}
                handleOpenAddPayment={handleOpenAddPayment}
                handleViewPaymentDetails={handleViewPaymentDetails}
              />
            </form>
          </div>
        </div>
      ) : (
        <div className="space-y-6 pb-12 font-sans">
          {/* 1. Header Banner */}
          <SalesInvoiceListHeader
            totalCount={sales.length}
            onExportExcel={handleExportExcel}
            onPrintReport={handlePrintTableReport}
            onOpenSalesGraph={() => setIsSalesGraphModalOpen(true)}
            onAddInvoice={handleOpenCreateModal}
          />

          {/* 2. KPI Summary Cards */}
          <SalesInvoiceSummaryCards cardSummary={cardSummary} />

          {/* 3. Search Bar & Filter Row */}
          <SearchBar
            value={pendingSearch}
            onChange={(val) => setPendingSearch(val)}
            placeholder="Search by invoice #, customer, rep, product..."
            onSubmit={() => {
              const trimmed = pendingSearch.trim();
              const isSame =
                appliedSearch === trimmed &&
                appliedSaleStatus === pendingSaleStatus &&
                appliedPaymentStatus === pendingPaymentStatus &&
                appliedCustomer === pendingCustomer &&
                appliedSalesRep === pendingSalesRep &&
                currentPage === 1;

              setAppliedSearch(trimmed);
              setAppliedSaleStatus(pendingSaleStatus);
              setAppliedPaymentStatus(pendingPaymentStatus);
              setAppliedCustomer(pendingCustomer);
              setAppliedSalesRep(pendingSalesRep);
              setCurrentPage(1);

              if (isSame) {
                isFetchingInvoicesRef.current = false;
                fetchSalesInvoices();
              }
            }}
            onReset={() => {
              setPendingSearch("");
              setAppliedSearch("");
              setPendingSaleStatus("All");
              setAppliedSaleStatus("All");
              setPendingPaymentStatus("All");
              setAppliedPaymentStatus("All");
              setPendingCustomer("All");
              setAppliedCustomer("All");
              setPendingSalesRep("All");
              setAppliedSalesRep("All");
              setCurrentPage(1);

              isFetchingInvoicesRef.current = false;
              fetchSalesInvoices({
                page: 1,
                search: "",
                saleStatus: "All",
                paymentStatus: "All",
                customer: "All",
              });
            }}
            filterSlot={
              <div className="flex items-center gap-2.5 flex-wrap">
                <FilterDropdown
                  placeholder="Sale Status : All"
                  value={pendingSaleStatus}
                  onChange={(val) => {
                    setPendingSaleStatus(val);
                  }}
                  options={[
                    { label: "Sale Status : All", value: "All" },
                    { label: "Draft", value: "Draft", dotColor: "#64748b" },
                    {
                      label: "Confirmed",
                      value: "Confirmed",
                      dotColor: "#33077C",
                    },
                    {
                      label: "Cancelled",
                      value: "Cancelled",
                      dotColor: "#ef4444",
                    },
                  ]}
                />

                <FilterDropdown
                  placeholder="Payment : All"
                  value={pendingPaymentStatus}
                  onChange={(val) => {
                    setPendingPaymentStatus(val);
                  }}
                  options={[
                    { label: "Payment : All", value: "All" },
                    { label: "Paid", value: "Paid", dotColor: "#10b981" },
                    { label: "Partial", value: "Partial", dotColor: "#f59e0b" },
                    { label: "Unpaid", value: "Unpaid", dotColor: "#ef4444" },
                    { label: "Pending", value: "Pending", dotColor: "#64748b" },
                  ]}
                />

                <FilterDropdown
                  placeholder="Customer : All"
                  value={pendingCustomer}
                  onChange={(val) => {
                    setPendingCustomer(val);
                  }}
                  options={[
                    { label: "Customer : All", value: "All" },
                    ...customerList.map((c) => ({
                      label: c.name || c.company,
                      value: c.id,
                    })),
                  ]}
                />

                <FilterDropdown
                  placeholder="Sales Rep : All"
                  value={pendingSalesRep}
                  onChange={(val) => {
                    setPendingSalesRep(val);
                  }}
                  options={[
                    { label: "Sales Rep : All", value: "All" },
                    ...salesRepresentatives.map((r) => ({
                      label: r.name,
                      value: r.id,
                      dotColor: r.status === "Active" ? "#10b981" : "#94a3b8",
                    })),
                  ]}
                />
              </div>
            }
            rightSlot={
              <div className="flex items-center gap-3 pr-1">
                <span className="text-xs font-semibold text-slate-500">
                  Total Sales :{" "}
                  <span className="text-[#33077C] font-bold">
                    {filteredSales.length}
                  </span>
                </span>
              </div>
            }
          />

          {/* 4. Sales Data Table */}
          <SalesInvoiceTable
            paginatedSales={paginatedSales}
            customers={customers}
            customerList={customerList}
            activeShareDropdownId={activeShareDropdownId}
            setActiveShareDropdownId={setActiveShareDropdownId}
            shareDropdownPos={shareDropdownPos}
            setShareDropdownPos={setShareDropdownPos}
            handleOpenViewInvoice={handleOpenViewInvoice}
            handleOpenEditModal={handleOpenEditModal}
            handleDuplicateSale={handleDuplicateSale}
            handlePrintSaleInvoice={handlePrintSaleInvoice}
            handleDownloadSaleInvoice={handleDownloadSaleInvoice}
            setSelectedSale={setSelectedSale}
            setIsPaymentHistoryModalOpen={setIsPaymentHistoryModalOpen}
            handleOpenAddPayment={handleOpenAddPayment}
            handleOpenAssignInvoiceModal={handleOpenAssignInvoiceModal}
            navigate={navigate}
            handleCancelInvoice={handleCancelInvoice}
            handleOpenDeleteModal={handleOpenDeleteModal}
          />

          {/* Pagination */}
          {filteredSales.length > 0 && (
            <Pagination
              total={filteredSales.length}
              currentPage={currentPage}
              pageSize={pageSize}
              pageSizeOptions={[5, 10, 20, 50]}
              onPageChange={(newPage) => setCurrentPage(newPage)}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
            />
          )}

          {/* =========================================================================
          BOTTOM SECTION: PAYMENT HISTORY & TRANSACTION AUDIT LOGS
         ========================================================================= */}
          <PaymentTransactionLogsPanel
            sales={sales}
            logs={paymentLogs}
            setSelectedSale={setSelectedSale}
            setIsInvoiceModalOpen={setIsInvoiceModalOpen}
            setIsPaymentHistoryModalOpen={setIsPaymentHistoryModalOpen}
          />
        </div>
      )}

      {/* ==========================================
          MODAL 2: INVOICE DETAIL & PRINT PREVIEW
         ========================================== */}
      <InvoiceDetailModal
        sale={selectedSale}
        isOpen={isInvoiceModalOpen}
        isDownloadingPdf={isDownloadingPdf}
        salesRepresentatives={salesRepresentatives}
        detailRepId={detailRepId}
        detailRepError={detailRepError}
        detailCollectionStatus={detailCollectionStatus}
        detailNextFollowUp={detailNextFollowUp}
        onDetailRepIdChange={setDetailRepId}
        onDetailCollectionStatusChange={setDetailCollectionStatus}
        onDetailNextFollowUpChange={setDetailNextFollowUp}
        onSaveAssignment={handleSaveDetailAssignment}
        onClose={() => setIsInvoiceModalOpen(false)}
        onNavigate={navigate}
        onPrint={handlePrintSaleInvoice}
        onDownload={handleDownloadSaleInvoice}
      />

      {/* ==========================================
          MODAL: QUICK ASSIGN SALES REP TO INVOICE (FROM 3-DOTS)
         ========================================== */}
      <QuickAssignInvoiceModal
        target={assignInvoiceTarget}
        isOpen={isAssignInvoiceModalOpen}
        salesRepresentatives={salesRepresentatives}
        assignRepId={assignRepId}
        assignRepError={assignRepError}
        assignStatus={assignStatus}
        assignNextFollowUp={assignNextFollowUp}
        onAssignRepIdChange={setAssignRepId}
        onAssignStatusChange={setAssignStatus}
        onNextFollowUpChange={setAssignNextFollowUp}
        onClose={() => {
          setIsAssignInvoiceModalOpen(false);
          setAssignInvoiceTarget(null);
        }}
        onSubmit={handleSaveQuickAssignInvoice}
      />

      {/* ==========================================
          MODAL 3: RECORD PAYMENT MODAL (2-COLUMN 5XL LAYOUT)
         ========================================== */}
      <RecordPaymentModal
        sale={selectedSale}
        isOpen={isPaymentModalOpen}
        isSubmitting={paymentGuard.isSubmitting}
        paymentModalSplits={paymentModalSplits}
        paymentFormErrors={paymentFormErrors}
        paymentModalDate={paymentModalDate}
        recordNotes={recordNotes}
        onClose={() => setIsPaymentModalOpen(false)}
        onSubmit={handleConfirmPayment}
        onAddSplit={handleAddPaymentModalSplit}
        onRemoveSplit={handleRemovePaymentModalSplit}
        onSplitChange={handlePaymentModalSplitChange}
        onDateChange={setPaymentModalDate}
        onNotesChange={setRecordNotes}
        onViewInvoice={() => setIsInvoiceModalOpen(true)}
      />

      {/* ==========================================
          ADD CUSTOMER & ADD ITEM MODALS
         ========================================== */}
      <AddCustomerModal
        isOpen={isAddCustomerModalOpen}
        onClose={() => setIsAddCustomerModalOpen(false)}
        onCustomerCreated={(newCust) => {
          dispatch(baseApi.util.invalidateTags(["Customer"]));
          hasLoadedCustomersRef.current = false;
          loadCustomersData();
          handleCustomerChange(newCust.id);
        }}
      />

      <AddItemModal
        isOpen={isAddItemModalOpen}
        onClose={() => {
          setIsAddItemModalOpen(false);
          setActiveItemRowIndex(null);
        }}
        onProductCreated={(newProd) => {
          dispatch(baseApi.util.invalidateTags(["Product", "Stock", "Batch"]));
          const pId = newProd.id || (newProd as any).productId;
          const mapped = {
            id: pId,
            productId: pId,
            name:
              newProd.productName || (newProd as any).name || "Unnamed Product",
            productName:
              newProd.productName || (newProd as any).name || "Unnamed Product",
            code: newProd.productCode || (newProd as any).sku || pId,
            sku: newProd.productCode || (newProd as any).sku || pId,
            price: Number(newProd.salePrice ?? (newProd as any).unitPrice ?? 0),
            salePrice: Number(
              newProd.salePrice ?? (newProd as any).unitPrice ?? 0,
            ),
            unitPrice: Number(
              newProd.salePrice ?? (newProd as any).unitPrice ?? 0,
            ),
            cost: Number(newProd.purchasePrice ?? 0),
            unit: newProd.unit || "PCS",
            batches: newProd.batches || [],
            hsnCode: newProd.hsnCode || "",
            category: newProd.category || "General",
            imageUrl: (newProd as any).imageUrl || (newProd as any).image || "",
          };
          setProductList((prev) => [
            mapped,
            ...prev.filter((p) => p.id !== pId),
          ]);
          hasLoadedProductsRef.current = false;
          loadProductAndStockData();
          if (activeItemRowIndex !== null) {
            handleItemProductChange(activeItemRowIndex, pId);
          }
          setIsAddItemModalOpen(false);
          setActiveItemRowIndex(null);
        }}
      />

      {/* ==========================================
          MODAL 5: PAYMENT HISTORY MODAL (GLOBAL VIEW)
         ========================================== */}
      <PaymentHistoryModal
        sale={selectedSale}
        isOpen={isPaymentHistoryModalOpen}
        onClose={() => setIsPaymentHistoryModalOpen(false)}
        onViewPaymentDetails={handleViewPaymentDetails}
        onViewFullInvoice={() => setIsInvoiceModalOpen(true)}
        onRecordPayment={handleOpenAddPayment}
      />

      {/* ==========================================
          MODAL 6: PAYMENT DETAILS & RECEIPT VIEW MODAL
         ========================================== */}
      <PaymentReceiptModal
        record={selectedPaymentRecord}
        isOpen={isPaymentDetailsModalOpen}
        isDownloadingPdf={isDownloadingPdf}
        onClose={() => setIsPaymentDetailsModalOpen(false)}
        onDownload={handleDownloadPaymentReceipt}
      />
      {/* Sales Graph Modal */}
      <SalesGraphModal
        isOpen={isSalesGraphModalOpen}
        onClose={() => setIsSalesGraphModalOpen(false)}
        sales={sales}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeletingSale) {
            setIsDeleteModalOpen(false);
            setDeleteTargetSale(null);
            setDeleteSaleError(null);
          }
        }}
        onConfirm={handleConfirmDeleteSale}
        entityName="Sales Invoice"
        recordName={deleteTargetSale?.invoiceNo}
        isLoading={isDeletingSale}
        error={deleteSaleError}
      />
    </>
  );
};
