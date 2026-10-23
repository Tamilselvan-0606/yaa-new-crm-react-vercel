import { baseClient, baseApi } from '../baseApi';
import {
  ApiStockItem,
  StockFilterParams,
  StockListResponse,
  AdjustStockPayload,
  AdjustStockResponse,
  StockLedgerParams,
  StockLedgerResponse,
  StockBatchesParams,
  StockBatchesResponse,
  LowStockParams,
  LowStockResponse,
} from './stockTypes';
import { ApiStockBatch } from './productTypes';
import { InventoryStockItem, StockBatch } from '../../store/useSalesManagementStore';

export * from './stockTypes';

/**
 * Mapper: ApiStockBatch -> StockBatch
 */
export const mapApiStockBatchToStockBatch = (b: ApiStockBatch): StockBatch => {
  return {
    id: b.id || `bat_${b.batchNo}`,
    batchNo: b.batchNo,
    productId: b.productId,
    quantity: Number(b.quantity ?? 0),
    costPrice: Number(b.costPrice ?? 0),
    sellingPrice: Number(b.sellingPrice ?? 0),
    mfgDate: b.mfgDate || undefined,
    expDate: b.expDate || undefined,
    supplierName: b.supplierName || undefined,
    status: (b.status as any) || 'Active',
    receivedDate: b.receivedDate || undefined,
  };
};

/**
 * Mapper: ApiStockItem -> InventoryStockItem
 */
export const mapApiStockToInventoryStockItem = (item: ApiStockItem): InventoryStockItem => {
  const anyItem = item as any;
  const rawStock = item.inStock ?? anyItem.currentStock ?? anyItem.availableQty ?? anyItem.quantity ?? anyItem.availableQuantity;
  
  // Discover batches across possible array properties
  const rawBatches: any[] =
    Array.isArray(item.batches) && item.batches.length > 0
      ? item.batches
      : Array.isArray(anyItem.stockBatches) && anyItem.stockBatches.length > 0
      ? anyItem.stockBatches
      : Array.isArray(anyItem.stock_batches) && anyItem.stock_batches.length > 0
      ? anyItem.stock_batches
      : Array.isArray(anyItem.product?.stockBatches) && anyItem.product?.stockBatches.length > 0
      ? anyItem.product.stockBatches
      : Array.isArray(anyItem.product?.batches) && anyItem.product?.batches.length > 0
      ? anyItem.product.batches
      : [];

  let mappedBatches: StockBatch[] = rawBatches.map(mapApiStockBatchToStockBatch);

  // If no batch array is returned, check if the item has batch tracking properties
  const hasBatchTracking = Boolean(anyItem.isBatchTracking ?? anyItem.is_batch_tracking ?? anyItem.product?.isBatchTracking);
  const fallbackBatchNo = (
    anyItem.batchNo ||
    anyItem.initialBatchNo ||
    anyItem.product?.batchNo ||
    anyItem.product?.initialBatchNo ||
    ''
  ).trim();

  if (mappedBatches.length === 0 && (hasBatchTracking || fallbackBatchNo)) {
    if (fallbackBatchNo) {
      const fallbackQty = Number(
        rawStock !== null && rawStock !== undefined
          ? rawStock
          : (anyItem.openingStock ?? anyItem.product?.openingStock ?? 0)
      );
      mappedBatches = [
        {
          id: `bat_${item.productId || item.id}_${fallbackBatchNo}`,
          batchNo: fallbackBatchNo,
          productId: item.productId || item.id,
          quantity: fallbackQty,
          costPrice: Number(item.unitCost ?? anyItem.purchasePrice ?? anyItem.costPrice ?? 0),
          sellingPrice: Number(item.unitPrice ?? anyItem.salePrice ?? anyItem.sellingPrice ?? 0),
          mfgDate: anyItem.mfgDate || anyItem.product?.mfgDate || undefined,
          expDate: anyItem.expDate || anyItem.product?.expDate || undefined,
          status: fallbackQty > 0 ? 'Active' : 'Depleted',
          receivedDate: anyItem.createdAt ? anyItem.createdAt.split('T')[0] : undefined,
        },
      ];
    }
  }

  const batchSum = mappedBatches.length > 0
    ? mappedBatches.reduce((sum, b) => sum + Number(b.quantity || 0), 0)
    : undefined;
  const finalStock = Number(rawStock !== null && rawStock !== undefined ? rawStock : (batchSum ?? 0));

  return {
    id: item.id || item.productId,
    productId: item.productId || item.id,
    productName: item.productName || anyItem.name || anyItem.product?.name || 'Unnamed Product',
    sku: item.sku || anyItem.productCode || anyItem.product?.sku || 'N/A',
    category: item.category || anyItem.product?.category || 'General',
    subcategory: item.subcategory || anyItem.product?.subcategory || 'General',
    unit: item.unit || anyItem.product?.unit || 'Units',
    inStock: finalStock,
    reorderLevel: Number(item.reorderLevel ?? anyItem.minStockAlert ?? anyItem.product?.minStockAlert ?? 0),
    unitCost: Number(item.unitCost ?? anyItem.purchasePrice ?? anyItem.costPrice ?? anyItem.product?.purchasePrice ?? anyItem.product?.costPrice ?? 0),
    unitPrice: Number(item.unitPrice ?? anyItem.salePrice ?? anyItem.sellingPrice ?? anyItem.product?.salePrice ?? anyItem.product?.sellingPrice ?? 0),
    lastUpdated: item.lastUpdated || anyItem.updatedAt || new Date().toISOString(),
    batches: mappedBatches,
    itemImage: anyItem.itemImage || anyItem.image || anyItem.item_image || anyItem.product?.itemImage || anyItem.product?.image || anyItem.product?.item_image || undefined,
  };
};

// =========================================================================
// RTK Query Injected Endpoints for Commerce Stock
// =========================================================================

export const stockEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCommerceStocks: builder.query<StockListResponse, StockFilterParams | void>({
      query: (params) => {
        const queryParams: Record<string, any> = {};
        if (params) {
          if (typeof params.page_no === 'number') queryParams.page_no = params.page_no;
          if (typeof params.page_size === 'number') queryParams.page_size = params.page_size;
          if (typeof params.pagination_required !== 'undefined') {
            queryParams.pagination_required = String(params.pagination_required);
          }
          if (params.search && params.search.trim()) {
            queryParams.search = params.search.trim();
          }
          if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
          if (params.productId) queryParams.productId = params.productId;
          if (params.category && params.category !== 'All' && params.category !== 'ALL') {
            queryParams.category = params.category;
          }
          if (params.subcategory && params.subcategory !== 'All' && params.subcategory !== 'ALL') {
            queryParams.subcategory = params.subcategory;
          }
          if (params.branchId) queryParams.branchId = params.branchId;
          if (typeof params.lowStock !== 'undefined') {
            queryParams.lowStock = String(params.lowStock);
          }
        }
        return {
          url: '/commerce/stocks',
          params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
        };
      },
      providesTags: [{ type: 'Stock', id: 'LIST' }],
    }),

    adjustCommerceStock: builder.mutation<AdjustStockResponse, AdjustStockPayload>({
      query: (payload) => ({
        url: '/commerce/stocks/adjust',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [
        { type: 'Stock', id: 'LIST' },
        { type: 'Stock', id: 'LEDGER' },
        { type: 'Stock', id: 'BATCHES' },
        { type: 'Stock', id: 'LOW' },
        { type: 'Product', id: 'LIST' },
      ],
    }),

    getCommerceStockLedger: builder.query<StockLedgerResponse, StockLedgerParams | void>({
      query: (params) => {
        const queryParams: Record<string, any> = {};
        if (params) {
          if (typeof params.page_no === 'number') queryParams.page_no = params.page_no;
          if (typeof params.page_size === 'number') queryParams.page_size = params.page_size;
          if (typeof params.pagination_required !== 'undefined') {
            queryParams.pagination_required = String(params.pagination_required);
          }
          if (params.search && params.search.trim()) {
            queryParams.search = params.search.trim();
          }
          if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
          if (params.productId) queryParams.productId = params.productId;
          if (params.batchNo) queryParams.batchNo = params.batchNo;
          if (params.branchId) queryParams.branchId = params.branchId;
          if (params.movementType && params.movementType !== 'ALL') {
            queryParams.movementType = params.movementType;
          }
          if (params.from) queryParams.from = params.from;
          if (params.to) queryParams.to = params.to;
          if (params.period && params.period !== 'all') {
            queryParams.period = params.period;
          }
        }
        return {
          url: '/commerce/stocks/ledger',
          params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
        };
      },
      providesTags: [{ type: 'Stock', id: 'LEDGER' }],
    }),

    getCommerceStockBatches: builder.query<StockBatchesResponse, StockBatchesParams | void>({
      query: (params) => {
        const queryParams: Record<string, any> = {};
        if (params) {
          if (typeof params.page_no === 'number') queryParams.page_no = params.page_no;
          if (typeof params.page_size === 'number') queryParams.page_size = params.page_size;
          if (typeof params.pagination_required !== 'undefined') {
            queryParams.pagination_required = String(params.pagination_required);
          }
          if (params.search && params.search.trim()) {
            queryParams.search = params.search.trim();
          }
          if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
          if (params.productId) queryParams.productId = params.productId;
          if (params.branchId) queryParams.branchId = params.branchId;
          if (params.status && params.status.toUpperCase() !== 'ALL') {
            queryParams.status = params.status;
          }
          if (typeof params.expiringWithinDays === 'number') {
            queryParams.expiringWithinDays = params.expiringWithinDays;
          }
        }
        return {
          url: '/commerce/stocks/batches',
          params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
        };
      },
      providesTags: [{ type: 'Stock', id: 'BATCHES' }],
    }),

    getCommerceLowStock: builder.query<LowStockResponse, LowStockParams | void>({
      query: (params) => {
        const queryParams: Record<string, any> = {};
        if (params) {
          if (typeof params.page_no === 'number') queryParams.page_no = params.page_no;
          if (typeof params.page_size === 'number') queryParams.page_size = params.page_size;
          if (typeof params.pagination_required !== 'undefined') {
            queryParams.pagination_required = String(params.pagination_required);
          }
          if (params.search && params.search.trim()) {
            queryParams.search = params.search.trim();
          }
          if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
        }
        return {
          url: '/commerce/stocks/low-stock',
          params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
        };
      },
      providesTags: [{ type: 'Stock', id: 'LOW' }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCommerceStocksQuery,
  useAdjustCommerceStockMutation,
  useGetCommerceStockLedgerQuery,
  useGetCommerceStockBatchesQuery,
  useGetCommerceLowStockQuery,
} = stockEndpoints;

/**
 * Commerce Stock API Service
 */
export const stockApi = {
  /**
   * List current stock balances
   * GET /commerce/stocks
   */
  getStocks: async (params?: StockFilterParams): Promise<StockListResponse> => {
    const queryParams: Record<string, any> = {};

    if (params) {
      if (typeof params.page_no === 'number') queryParams.page_no = params.page_no;
      if (typeof params.page_size === 'number') queryParams.page_size = params.page_size;
      if (typeof params.pagination_required !== 'undefined') {
        queryParams.pagination_required = String(params.pagination_required);
      }
      if (params.search && params.search.trim()) {
        queryParams.search = params.search.trim();
      }
      if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
      if (params.productId) queryParams.productId = params.productId;
      if (params.category && params.category !== 'All' && params.category !== 'ALL') {
        queryParams.category = params.category;
      }
      if (params.subcategory && params.subcategory !== 'All' && params.subcategory !== 'ALL') {
        queryParams.subcategory = params.subcategory;
      }
      if (params.branchId) queryParams.branchId = params.branchId;
      if (typeof params.lowStock !== 'undefined') {
        queryParams.lowStock = String(params.lowStock);
      }
    }

    const response = await baseClient.get<StockListResponse>('/commerce/stocks', {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });
    return response.data;
  },

  /**
   * Manual stock adjustment
   * POST /commerce/stocks/adjust
   */
  adjustStock: async (payload: AdjustStockPayload): Promise<AdjustStockResponse> => {
    const response = await baseClient.post<AdjustStockResponse>('/commerce/stocks/adjust', payload);
    return response.data;
  },

  /**
   * Stock movement ledger
   * GET /commerce/stocks/ledger
   */
  getStockLedger: async (params?: StockLedgerParams): Promise<StockLedgerResponse> => {
    const queryParams: Record<string, any> = {};

    if (params) {
      if (typeof params.page_no === 'number') queryParams.page_no = params.page_no;
      if (typeof params.page_size === 'number') queryParams.page_size = params.page_size;
      if (typeof params.pagination_required !== 'undefined') {
        queryParams.pagination_required = String(params.pagination_required);
      }
      if (params.search && params.search.trim()) {
        queryParams.search = params.search.trim();
      }
      if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
      if (params.productId) queryParams.productId = params.productId;
      if (params.batchNo) queryParams.batchNo = params.batchNo;
      if (params.branchId) queryParams.branchId = params.branchId;
      if (params.movementType && params.movementType.toUpperCase() !== 'ALL') {
        queryParams.movementType = params.movementType;
      }
      if (params.from) queryParams.from = params.from;
      if (params.to) queryParams.to = params.to;
      if (params.period && params.period.toLowerCase() !== 'all') {
        queryParams.period = params.period;
      }
    }

    const response = await baseClient.get<StockLedgerResponse>('/commerce/stocks/ledger', {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });
    return response.data;
  },

  /**
   * List stock batches
   * GET /commerce/stocks/batches
   */
  getStockBatches: async (params?: StockBatchesParams): Promise<StockBatchesResponse> => {
    const queryParams: Record<string, any> = {};

    if (params) {
      if (typeof params.page_no === 'number') queryParams.page_no = params.page_no;
      if (typeof params.page_size === 'number') queryParams.page_size = params.page_size;
      if (typeof params.pagination_required !== 'undefined') {
        queryParams.pagination_required = String(params.pagination_required);
      }
      if (params.search && params.search.trim()) {
        queryParams.search = params.search.trim();
      }
      if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
      if (params.productId) queryParams.productId = params.productId;
      if (params.branchId) queryParams.branchId = params.branchId;
      if (params.status && params.status.toUpperCase() !== 'ALL') {
        queryParams.status = params.status;
      }
      if (typeof params.expiringWithinDays === 'number') {
        queryParams.expiringWithinDays = params.expiringWithinDays;
      }
    }

    const response = await baseClient.get<StockBatchesResponse>('/commerce/stocks/batches', {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });
    return response.data;
  },

  /**
   * Products at or below reorder level
   * GET /commerce/stocks/low-stock
   */
  getLowStock: async (params?: LowStockParams): Promise<LowStockResponse> => {
    const queryParams: Record<string, any> = {};

    if (params) {
      if (typeof params.page_no === 'number') queryParams.page_no = params.page_no;
      if (typeof params.page_size === 'number') queryParams.page_size = params.page_size;
      if (typeof params.pagination_required !== 'undefined') {
        queryParams.pagination_required = String(params.pagination_required);
      }
      if (params.search && params.search.trim()) {
        queryParams.search = params.search.trim();
      }
      if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
    }

    const response = await baseClient.get<LowStockResponse>('/commerce/stocks/low-stock', {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });
    return response.data;
  },
};
