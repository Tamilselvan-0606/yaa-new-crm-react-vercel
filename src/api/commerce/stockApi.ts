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
  return {
    id: item.id || item.productId,
    productId: item.productId || item.id,
    productName: item.productName || 'Unnamed Product',
    sku: item.sku || 'N/A',
    category: item.category || 'General',
    subcategory: item.subcategory || 'General',
    unit: item.unit || 'Units',
    inStock: Number(item.inStock ?? 0),
    reorderLevel: Number(item.reorderLevel ?? 0),
    unitCost: Number(item.unitCost ?? 0),
    unitPrice: Number(item.unitPrice ?? 0),
    lastUpdated: item.lastUpdated || new Date().toISOString(),
    batches: Array.isArray(item.batches)
      ? item.batches.map(mapApiStockBatchToStockBatch)
      : [],
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
          params: queryParams,
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
      invalidatesTags: [{ type: 'Stock', id: 'LIST' }, { type: 'Product', id: 'LIST' }],
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
          params: queryParams,
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
          if (params.status && params.status !== 'ALL') {
            queryParams.status = params.status;
          }
          if (typeof params.expiringWithinDays === 'number') {
            queryParams.expiringWithinDays = params.expiringWithinDays;
          }
        }
        return {
          url: '/commerce/stocks/batches',
          params: queryParams,
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
          params: queryParams,
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
      params: queryParams,
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
      if (params.movementType && params.movementType !== 'ALL') {
        queryParams.movementType = params.movementType;
      }
      if (params.from) queryParams.from = params.from;
      if (params.to) queryParams.to = params.to;
      if (params.period && params.period !== 'all') {
        queryParams.period = params.period;
      }
    }

    const response = await baseClient.get<StockLedgerResponse>('/commerce/stocks/ledger', {
      params: queryParams,
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
      if (params.status && params.status !== 'ALL') {
        queryParams.status = params.status;
      }
      if (typeof params.expiringWithinDays === 'number') {
        queryParams.expiringWithinDays = params.expiringWithinDays;
      }
    }

    const response = await baseClient.get<StockBatchesResponse>('/commerce/stocks/batches', {
      params: queryParams,
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
      params: queryParams,
    });
    return response.data;
  },
};
