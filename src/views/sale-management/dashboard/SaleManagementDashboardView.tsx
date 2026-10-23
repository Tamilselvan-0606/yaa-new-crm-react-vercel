import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  ShoppingCart,
  Truck,
  BarChart3,
  TrendingUp,
  IndianRupee,
  AlertTriangle,
  Boxes,
  CreditCard,
  Receipt,
  CheckCircle2,
  Clock,
  PieChart as PieIcon,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Loader2,
  Users,
  FileText,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { useSalesManagementStore } from '../../../store/useSalesManagementStore';
import { useAuth } from '../../../context/AuthContext';
import {
  salesDashboardApi,
  SalesDashboardModulesData,
  SalesDashboardLowStockData,
  SalesDashboardTopProductsData,
  SalesDashboardRecentTransactionsData,
  RecentTransactionType,
  getStoredOrganizationId,
} from '../../../api';

type TimeRange = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all';
type ModuleTab = 'all' | 'inventory' | 'sales_hub' | 'purchase' | 'reports';

export const SaleManagementDashboardView: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { sales, purchases } = useSalesManagementStore();

  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [activeModuleTab, setActiveModuleTab] = useState<ModuleTab>('all');
  const [recentTab, setRecentTab] = useState<RecentTransactionType>('sales_invoices');

  // Sub-organization & Branch filter state from Header
  const [activeSubOrgName, setActiveSubOrgName] = useState<string>(() => {
    return (
      localStorage.getItem('active_sub_organization_sales') ||
      localStorage.getItem('active_sub_organization') ||
      'All'
    );
  });
  const [activeSubOrgId, setActiveSubOrgId] = useState<string | undefined>(() => {
    return (
      localStorage.getItem('active_sub_organization_id_sales') ||
      localStorage.getItem('active_sub_organization_id') ||
      undefined
    );
  });

  const [activeBranchName, setActiveBranchName] = useState<string>(() => {
    return (
      localStorage.getItem('active_branch_sales') ||
      localStorage.getItem('active_branch') ||
      'All'
    );
  });
  const [activeBranchId, setActiveBranchId] = useState<string | undefined>(() => {
    return (
      localStorage.getItem('active_branch_id_sales') ||
      localStorage.getItem('active_branch_id') ||
      undefined
    );
  });

  // API Data States
  const [modulesData, setModulesData] = useState<SalesDashboardModulesData | null>(null);
  const [lowStockData, setLowStockData] = useState<SalesDashboardLowStockData | null>(null);
  const [topProductsData, setTopProductsData] = useState<SalesDashboardTopProductsData | null>(null);
  const [recentTransactionsData, setRecentTransactionsData] = useState<SalesDashboardRecentTransactionsData | null>(null);

  // Loading & Refreshing States
  const [loadingModules, setLoadingModules] = useState(false);
  const [loadingLowStock, setLoadingLowStock] = useState(false);
  const [loadingTopProducts, setLoadingTopProducts] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Listen to Header Sub-Org & Branch changes
  useEffect(() => {
    const handleSubOrgChanged = (e: any) => {
      const name = e?.detail?.name || 'All';
      const id = e?.detail?.subOrganizationId || e?.detail?.id;
      setActiveSubOrgName(name);
      setActiveSubOrgId(id && id !== 'all' ? id : undefined);
    };

    const handleBranchChanged = (e: any) => {
      const name = e?.detail?.branch || e?.detail?.name || 'All';
      const id = e?.detail?.branchId || e?.detail?.id;
      setActiveBranchName(name);
      setActiveBranchId(id && id !== 'all' ? id : undefined);
    };

    window.addEventListener('subOrgChanged', handleSubOrgChanged);
    window.addEventListener('branchChanged', handleBranchChanged);

    return () => {
      window.removeEventListener('subOrgChanged', handleSubOrgChanged);
      window.removeEventListener('branchChanged', handleBranchChanged);
    };
  }, []);

  // Map UI timeRange to API period query parameter
  const apiPeriod = useMemo(() => {
    if (timeRange === 'quarter') return 'this_quarter';
    return timeRange;
  }, [timeRange]);

  // Main Dashboard APIs fetcher
  const fetchAllDashboardApis = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setIsRefreshing(true);
      setLoadingModules(true);
      setLoadingLowStock(true);
      setLoadingTopProducts(true);
      setLoadingRecent(true);

      const activeOrgId = currentUser?.organizationId || getStoredOrganizationId();

      const commonParams = {
        period: apiPeriod,
        organization_id: activeOrgId || undefined,
        sub_organization_id: activeSubOrgId,
        branch_id: activeBranchId,
      };

      // 1. GET /commerce/sales/dashboard/modules (Row 3 - Module cards)
      salesDashboardApi
        .getModules(commonParams)
        .then((res) => {
          if (res?.data) {
            setModulesData(res.data);
          }
        })
        .catch(() => {
          // Gracefully fallback to local calculations
        })
        .finally(() => setLoadingModules(false));

      // 2. GET /commerce/sales/dashboard/low-stock (Row 4 - Low Stock Health)
      salesDashboardApi
        .getLowStock({
          limit: 10,
          organization_id: activeOrgId || undefined,
          sub_organization_id: activeSubOrgId,
          branch_id: activeBranchId,
        })
        .then((res) => {
          if (res?.data) {
            setLowStockData(res.data);
          }
        })
        .catch(() => {
          // Gracefully fallback to local inventory stocks
        })
        .finally(() => setLoadingLowStock(false));

      // 3. GET /commerce/sales/dashboard/top-products (Row 4 - Top Revenue Drivers)
      salesDashboardApi
        .getTopProducts({
          ...commonParams,
          limit: 5,
        })
        .then((res) => {
          if (res?.data) {
            setTopProductsData(res.data);
          }
        })
        .catch(() => {
          // Gracefully fallback to local product sales
        })
        .finally(() => setLoadingTopProducts(false));

      // 4. GET /commerce/sales/dashboard/recent-transactions (Row 5 - Recent Operations)
      salesDashboardApi
        .getRecentTransactions({
          ...commonParams,
          type: recentTab,
          limit: 10,
        })
        .then((res) => {
          if (res?.data) {
            setRecentTransactionsData(res.data);
          }
        })
        .catch(() => {
          // Gracefully fallback to local transactions
        })
        .finally(() => {
          setLoadingRecent(false);
          if (isManualRefresh) setIsRefreshing(false);
        });
    },
    [apiPeriod, activeSubOrgId, activeBranchId, recentTab, currentUser]
  );

  // Trigger full API sync when period, sub_organization_id, or branch_id change
  useEffect(() => {
    fetchAllDashboardApis();
  }, [fetchAllDashboardApis]);

  // Tab switch for Recent Transactions table
  const handleRecentTabChange = (tab: RecentTransactionType) => {
    setRecentTab(tab);
    setLoadingRecent(true);
    const activeOrgId = currentUser?.organizationId || getStoredOrganizationId();

    salesDashboardApi
      .getRecentTransactions({
        period: apiPeriod,
        type: tab,
        limit: 10,
        organization_id: activeOrgId || undefined,
        sub_organization_id: activeSubOrgId,
        branch_id: activeBranchId,
      })
      .then((res) => {
        if (res?.data) {
          setRecentTransactionsData(res.data);
        }
      })
      .catch(() => {
        // Fallback
      })
      .finally(() => setLoadingRecent(false));
  };

  // Sub-tab switch handler for Module Filter Bar: filters views and auto-syncs transaction tabs
  const handleModuleTabChange = (tab: ModuleTab) => {
    setActiveModuleTab(tab);
    if (tab === 'sales_hub') {
      handleRecentTabChange('sales_invoices');
    } else if (tab === 'purchase') {
      handleRecentTabChange('purchase_bills');
    } else if (tab === 'reports') {
      handleRecentTabChange('payments_in');
    }
  };

  // ==========================================
  // REAL TRANSACTION AGGREGATIONS (ZERO MOCK DATA)
  // ==========================================

  // Aggregated analytics strictly derived from real transactions & API modules
  const reportAnalytics = useMemo(() => {
    const grossProfit = Number(modulesData?.saleReport?.grossProfit || 0);
    const grossProfitMargin = Number(modulesData?.saleReport?.grossMarginPercent || 0);

    // Dynamic last 6 calendar months
    const monthNames: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthNames.push(d.toLocaleString('en-US', { month: 'short' }));
    }

    // Monthly comparison strictly calculated from real sales & purchases without mock multipliers
    const monthlyComparisonData = monthNames.map((month) => {
      const monthSales = (sales || [])
        .filter((s) => {
          if (s.saleStatus === 'Cancelled') return false;
          const d = new Date(s.saleDate || s.createdAt);
          return !isNaN(d.getTime()) && d.toLocaleString('en-US', { month: 'short' }) === month;
        })
        .reduce((sum, s) => sum + (s.grandTotal || 0), 0);

      const monthPurchases = (purchases || [])
        .filter((p) => {
          if (p.purchaseStatus === 'Cancelled') return false;
          const d = new Date(p.purchaseDate || p.createdAt);
          return !isNaN(d.getTime()) && d.toLocaleString('en-US', { month: 'short' }) === month;
        })
        .reduce((sum, p) => sum + (p.grandTotal || 0), 0);

      return {
        month,
        Sales: monthSales,
        Purchases: monthPurchases,
        Profit: Math.max(0, monthSales - monthPurchases),
      };
    });

    const activeSales = (sales || []).filter((s) => s.saleStatus !== 'Cancelled');
    const fullyPaid = activeSales.filter((s) => s.paymentStatus === 'Paid').length;
    const partial = activeSales.filter((s) => s.paymentStatus === 'Partial').length;
    const unpaid = activeSales.filter((s) => s.paymentStatus === 'Unpaid' || s.paymentStatus === 'Pending').length;

    const paymentStatusDistribution = [
      { name: 'Fully Paid', value: fullyPaid, color: '#10B981' },
      { name: 'Partial', value: partial, color: '#F59E0B' },
      { name: 'Unpaid / Due', value: unpaid, color: '#EF4444' },
    ];

    return {
      grossProfit,
      grossProfitMargin,
      monthlyComparisonData,
      paymentStatusDistribution,
    };
  }, [modulesData, sales, purchases]);

  // Helper date formatter
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Resolved list of Low Stock items (Row 4) - Strictly from live API
  const displayLowStockItems = useMemo(() => {
    if (lowStockData && Array.isArray(lowStockData.items)) {
      return lowStockData.items;
    }
    return [];
  }, [lowStockData]);

  // Resolved list of Top Revenue Products (Row 4) - Strictly from live API
  const displayTopProducts = useMemo(() => {
    if (topProductsData && Array.isArray(topProductsData.items)) {
      return topProductsData.items;
    }
    return [];
  }, [topProductsData]);

  // Resolved counts for Recent Transactions tabs (Row 5) - Strictly from live API
  const recentCounts = useMemo(() => {
    return {
      salesInvoices: recentTransactionsData?.counts?.salesInvoices ?? 0,
      purchaseBills: recentTransactionsData?.counts?.purchaseBills ?? 0,
      paymentsIn: recentTransactionsData?.counts?.paymentsIn ?? 0,
    };
  }, [recentTransactionsData]);

  // Resolved active rows for Recent Transactions table (Row 5) - Strictly from live API
  const displayRecentRows = useMemo(() => {
    if (recentTransactionsData && Array.isArray(recentTransactionsData.rows)) {
      return recentTransactionsData.rows;
    }
    return [];
  }, [recentTransactionsData]);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Executive Top Header Banner */}
      <div className="bg-gradient-to-r from-[#33077C] via-[#3E0994] to-[#4F46E5] rounded-2xl p-6 text-white shadow-md border border-purple-900/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-white/20 text-white backdrop-blur-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Sale Management Operations
              </span>
              <span className="text-xs text-purple-200/90 font-medium">
                {currentUser?.organization?.name || 'Yaa Creations'}
              </span>
              {(activeSubOrgName !== 'All' || activeBranchName !== 'All') && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/15 text-purple-100 border border-white/20">
                  {activeSubOrgName !== 'All' ? activeSubOrgName : 'All Sub-Orgs'} •{' '}
                  {activeBranchName !== 'All' ? activeBranchName : 'All Branches'}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              Enterprise Sales & Inventory Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-purple-200/90 max-w-2xl">
              Consolidated intelligence across Inventory, Sales Hub, Purchases, and Financial Reports.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0">
            <button
              onClick={() => fetchAllDashboardApis(true)}
              disabled={isRefreshing}
              className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all border border-white/20 flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-60"
              title="Refresh live dashboard APIs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>
            <button
              onClick={() => navigate('/sale-management/sales/sale')}
              className="px-3.5 py-2 rounded-xl bg-white text-[#33077C] hover:bg-purple-50 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-[#33077C]" />
              <span>+ New Sale</span>
            </button>
            <button
              onClick={() => navigate('/sale-management/purchase/purchase')}
              className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all border border-white/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Truck className="w-3.5 h-3.5 text-white" />
              <span>+ New Purchase</span>
            </button>
            <button
              onClick={() => navigate('/sale-management/inventory/products')}
              className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all border border-white/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Package className="w-3.5 h-3.5 text-white" />
              <span>+ Add Item</span>
            </button>
            <button
              onClick={() => navigate('/sale-management/reports')}
              className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all border border-white/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <BarChart3 className="w-3.5 h-3.5 text-white" />
              <span>View Reports</span>
            </button>
          </div>
        </div>

        {/* Module Sub-tabs Filter Bar */}
        <div className="mt-6 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-black/20 p-1 rounded-xl backdrop-blur-xs overflow-x-auto no-scrollbar">
            <button
              onClick={() => handleModuleTabChange('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeModuleTab === 'all'
                  ? 'bg-white text-[#33077C] shadow-xs'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              All Modules
            </button>
            <button
              onClick={() => handleModuleTabChange('inventory')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeModuleTab === 'inventory'
                  ? 'bg-white text-[#33077C] shadow-xs'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Inventory</span>
              {(modulesData?.inventory?.lowStockItems ?? 0) > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px]">
                  {modulesData?.inventory?.lowStockItems ?? 0}
                </span>
              )}
            </button>
            <button
              onClick={() => handleModuleTabChange('purchase')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeModuleTab === 'purchase'
                  ? 'bg-white text-[#33077C] shadow-xs'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Purchase</span>
              {(modulesData?.purchase?.purchaseRequests?.pending ?? 0) > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px]">
                  {modulesData?.purchase?.purchaseRequests?.pending ?? 0}
                </span>
              )}
            </button>
            <button
              onClick={() => handleModuleTabChange('sales_hub')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeModuleTab === 'sales_hub'
                  ? 'bg-white text-[#33077C] shadow-xs'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Sales Hub</span>
            </button>
            <button
              onClick={() => handleModuleTabChange('reports')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeModuleTab === 'reports'
                  ? 'bg-white text-[#33077C] shadow-xs'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Sale Report</span>
            </button>
          </div>

          {/* Time range selector */}
          <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl text-xs">
            {(['today', 'week', 'month', 'year', 'all'] as TimeRange[]).map((tr) => (
              <button
                key={tr}
                onClick={() => setTimeRange(tr)}
                className={`px-2.5 py-1 rounded-lg font-semibold uppercase text-[11px] cursor-pointer transition-colors ${
                  timeRange === tr
                    ? 'bg-white/30 text-white font-bold'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {tr}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Top Executive 4 KPI Metric Cards (Dynamically adapts to selected module) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {activeModuleTab === 'all' && (
          <>
            {/* All Modules: Inventory KPI */}
            <div
              onClick={() => navigate('/sale-management/inventory/stocks')}
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-purple-300 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-purple-600" />
                  Inventory Valuation
                </span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 group-hover:bg-purple-100 flex items-center justify-center text-purple-700 transition-colors">
                  <Boxes className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  ₹
                  {(
                    modulesData?.inventory?.stockValuation ?? 0
                  ).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </h3>
                <div className="flex items-center justify-between mt-1 text-xs">
                  <span className="text-slate-500 font-medium">
                    {modulesData?.inventory?.products ?? 0} products
                  </span>
                  {(modulesData?.inventory?.lowStockItems ?? 0) > 0 && (
                    <span className="text-amber-600 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {modulesData?.inventory?.lowStockItems ?? 0} Low
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* All Modules: Purchase KPI */}
            <div
              onClick={() => navigate('/sale-management/purchase/purchase')}
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                  Purchase & Expenses
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center text-blue-700 transition-colors">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  ₹
                  {(
                    modulesData?.purchase?.paymentOutSettled ?? 0
                  ).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </h3>
                <div className="flex items-center justify-between mt-1 text-xs">
                  <span className="text-slate-500 font-medium">
                    {modulesData?.purchase?.suppliers ?? 0} Vendors
                  </span>
                  <span className="text-rose-600 font-bold">
                    {modulesData?.purchase?.purchaseRequests?.pending ?? 0} Pending Req
                  </span>
                </div>
              </div>
            </div>

            {/* All Modules: Sales Hub KPI */}
            <div
              onClick={() => navigate('/sale-management/sales/sale')}
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
                  Sales Hub Revenue
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center text-emerald-700 transition-colors">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-emerald-700 tracking-tight">
                  ₹
                  {(
                    modulesData?.saleReport?.netSales ?? 0
                  ).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </h3>
                <div className="flex items-center justify-between mt-1 text-xs">
                  <span className="text-slate-500 font-medium">
                    {modulesData?.salesHub?.activeCustomers ?? 0} Accounts
                  </span>
                  <span className="text-emerald-600 font-bold">
                    {modulesData?.salesHub?.quotations?.total ?? 0} Quotes
                  </span>
                </div>
              </div>
            </div>

            {/* All Modules: Sale Report KPI */}
            <div
              onClick={() => navigate('/sale-management/sales/collections')}
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-amber-300 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                  Gross Margin & Profit
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 group-hover:bg-amber-100 flex items-center justify-center text-amber-700 transition-colors">
                  <IndianRupee className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-amber-600 tracking-tight">
                  {modulesData?.saleReport?.grossMarginPercent !== undefined
                    ? modulesData.saleReport.grossMarginPercent
                    : reportAnalytics.grossProfitMargin}
                  %
                </h3>
                <div className="flex items-center justify-between mt-1 text-xs">
                  <span className="text-slate-500 font-medium">
                    Profit: ₹
                    {(
                      modulesData?.saleReport?.grossProfit ?? reportAnalytics.grossProfit
                    ).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-purple-700 font-bold flex items-center gap-0.5">
                    Dues <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {activeModuleTab === 'inventory' && (
          <>
            {/* Inventory KPI 1: Valuation */}
            <div
              onClick={() => navigate('/sale-management/inventory/stocks')}
              className="bg-white p-5 rounded-2xl border border-purple-200/90 shadow-2xs hover:shadow-md hover:border-purple-400 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-purple-600" />
                  Total Stock Valuation
                </span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 group-hover:bg-purple-100 flex items-center justify-center text-purple-700 transition-colors">
                  <Boxes className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  ₹
                  {(
                    modulesData?.inventory?.stockValuation ?? 0
                  ).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </h3>
                <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                  <span>Valuation across branches</span>
                  <span className="text-purple-700 font-bold flex items-center gap-0.5">
                    Stocks <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>

            {/* Inventory KPI 2: Products */}
            <div
              onClick={() => navigate('/sale-management/inventory/products')}
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-indigo-600" />
                  Active Products Catalog
                </span>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center text-indigo-700 transition-colors">
                  <Package className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  {modulesData?.inventory?.products ?? 0} SKUs
                </h3>
                <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                  <span>Configured catalog items</span>
                  <span className="text-indigo-600 font-bold flex items-center gap-0.5">
                    Catalog <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>

            {/* Inventory KPI 3: Low Stock Alerts */}
            <div
              onClick={() => navigate('/sale-management/inventory/stocks')}
              className="bg-white p-5 rounded-2xl border border-amber-200/90 shadow-2xs hover:shadow-md hover:border-amber-400 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Low Stock Reorder Alerts
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 group-hover:bg-amber-100 flex items-center justify-center text-amber-700 transition-colors">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-amber-600 tracking-tight">
                  {modulesData?.inventory?.lowStockItems ?? 0} Items
                </h3>
                <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                  <span>Below safety reorder</span>
                  <span className="text-amber-700 font-bold flex items-center gap-0.5">
                    Restock <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>

            {/* Inventory KPI 4: Categories & Subcategories */}
            <div
              onClick={() => navigate('/sale-management/inventory/category')}
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-teal-300 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-teal-600" />
                  Product Categories
                </span>
                <div className="w-9 h-9 rounded-xl bg-teal-50 group-hover:bg-teal-100 flex items-center justify-center text-teal-700 transition-colors">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  {modulesData?.inventory?.categories ?? 0}
                  <span className="text-sm font-semibold text-slate-500 ml-1.5">
                    / {modulesData?.inventory?.subcategories ?? 0} Sub
                  </span>
                </h3>
                <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                  <span>Hierarchy breakdown</span>
                  <span className="text-teal-700 font-bold flex items-center gap-0.5">
                    Manage <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {activeModuleTab === 'purchase' && (
          <>
            {/* Purchase KPI 1: Spend */}
            <div
              onClick={() => navigate('/sale-management/purchase/purchase')}
              className="bg-white p-5 rounded-2xl border border-blue-200/90 shadow-2xs hover:shadow-md hover:border-blue-400 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                  Procurement & Expense Spend
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center text-blue-700 transition-colors">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  ₹
                  {(
                    modulesData?.purchase?.paymentOutSettled ?? 0
                  ).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </h3>
                <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                  <span>Settled purchase expenses</span>
                  <span className="text-blue-700 font-bold flex items-center gap-0.5">
                    Bills <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>

            {/* Purchase KPI 2: Suppliers */}
            <div
              onClick={() => navigate('/sale-management/purchase/supplier')}
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-sky-300 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-sky-600" />
                  Suppliers & Vendors
                </span>
                <div className="w-9 h-9 rounded-xl bg-sky-50 group-hover:bg-sky-100 flex items-center justify-center text-sky-700 transition-colors">
                  <Truck className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  {modulesData?.purchase?.suppliers ?? 0} Vendors
                </h3>
                <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                  <span>Registered suppliers</span>
                  <span className="text-sky-700 font-bold flex items-center gap-0.5">
                    Vendors <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>

            {/* Purchase KPI 3: Requests */}
            <div
              onClick={() => navigate('/sale-management/purchase/request')}
              className="bg-white p-5 rounded-2xl border border-rose-200/90 shadow-2xs hover:shadow-md hover:border-rose-400 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  Pending Purchase Requests
                </span>
                <div className="w-9 h-9 rounded-xl bg-rose-50 group-hover:bg-rose-100 flex items-center justify-center text-rose-700 transition-colors">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-rose-600 tracking-tight">
                  {modulesData?.purchase?.purchaseRequests?.pending ?? 0} Pending
                </h3>
                <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                  <span>
                    {modulesData?.purchase?.purchaseRequests?.approved ?? 0} Approved
                  </span>
                  <span className="text-rose-700 font-bold flex items-center gap-0.5">
                    Review <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>

            {/* Purchase KPI 4: Payment Out */}
            <div
              onClick={() => navigate('/sale-management/purchase/payment-out')}
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                  Payments Out Settled
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center text-emerald-700 transition-colors">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  ₹
                  {(
                    modulesData?.purchase?.paymentOutSettled ?? 0
                  ).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </h3>
                <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                  <span>Disbursed vendor payments</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                    Payments <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {activeModuleTab === 'sales_hub' && (
          <>
            {/* Sales Hub KPI 1: Sales Revenue */}
            <div
              onClick={() => navigate('/sale-management/sales/sale')}
              className="bg-white p-5 rounded-2xl border border-emerald-200/90 shadow-2xs hover:shadow-md hover:border-emerald-400 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                  <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
                  Invoiced Sales Revenue
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center text-emerald-700 transition-colors">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-emerald-700 tracking-tight">
                  ₹
                  {(
                    modulesData?.saleReport?.netSales ?? 0
                  ).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </h3>
                <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                  <span>Net billed in period</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                    Invoices <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>

            {/* Sales Hub KPI 2: Customer Accounts */}
            <div
              onClick={() => navigate('/sale-management/sales/customer')}
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  Customer Accounts
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center text-blue-700 transition-colors">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  {modulesData?.salesHub?.activeCustomers ?? 0} Accounts
                </h3>
                <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                  <span>Active customer base</span>
                  <span className="text-blue-700 font-bold flex items-center gap-0.5">
                    Customers <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>

            {/* Sales Hub KPI 3: Quotations */}
            <div
              onClick={() => navigate('/sale-management/sales/quotations')}
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-purple-300 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-purple-600" />
                  Quotations & Estimates
                </span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 group-hover:bg-purple-100 flex items-center justify-center text-purple-700 transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  {modulesData?.salesHub?.quotations?.total ?? 0} Quotes
                </h3>
                <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                  <span className="text-emerald-600 font-semibold">
                    {modulesData?.salesHub?.quotations?.open ?? 0} Open •{' '}
                    {modulesData?.salesHub?.quotations?.converted ?? 0} Converted
                  </span>
                  <span className="text-purple-700 font-bold flex items-center gap-0.5">
                    Pipeline <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>

            {/* Sales Hub KPI 4: Sales Reps */}
            <div
              onClick={() => navigate('/sale-management/sales/sales-representative')}
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-violet-300 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-violet-600" />
                  Sales Representatives
                </span>
                <div className="w-9 h-9 rounded-xl bg-violet-50 group-hover:bg-violet-100 flex items-center justify-center text-violet-700 transition-colors">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  {modulesData?.salesHub?.salesRepresentatives?.active ?? 0} Active
                </h3>
                <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                  <span>{modulesData?.salesHub?.salesRepresentatives?.assigned ?? 0} Assigned leads</span>
                  <span className="text-violet-700 font-bold flex items-center gap-0.5">
                    Team <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {activeModuleTab === 'reports' && (
          <>
            {/* Report KPI 1: Gross Margin % */}
            <div
              onClick={() => navigate('/sale-management/reports')}
              className="bg-white p-5 rounded-2xl border border-amber-200/90 shadow-2xs hover:shadow-md hover:border-amber-400 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                  Gross Margin %
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 group-hover:bg-amber-100 flex items-center justify-center text-amber-700 transition-colors">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-amber-600 tracking-tight">
                  {modulesData?.saleReport?.grossMarginPercent !== undefined
                    ? modulesData.saleReport.grossMarginPercent
                    : reportAnalytics.grossProfitMargin}
                  %
                </h3>
                <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                  <span>Overall margin efficiency</span>
                  <span className="text-amber-700 font-bold flex items-center gap-0.5">
                    Reports <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>

            {/* Report KPI 2: Gross Profit */}
            <div
              onClick={() => navigate('/sale-management/reports')}
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                  Gross Profit
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center text-emerald-700 transition-colors">
                  <IndianRupee className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-emerald-700 tracking-tight">
                  ₹
                  {(
                    modulesData?.saleReport?.grossProfit ?? reportAnalytics.grossProfit
                  ).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </h3>
                <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                  <span>Total profit earned</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                    Profit <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>

            {/* Report KPI 3: Net Sales */}
            <div
              onClick={() => navigate('/sale-management/reports')}
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-purple-300 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
                  Net Sales
                </span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 group-hover:bg-purple-100 flex items-center justify-center text-purple-700 transition-colors">
                  <BarChart3 className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  ₹
                  {(
                    modulesData?.saleReport?.netSales ?? 0
                  ).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </h3>
                <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                  <span>Invoiced sales total</span>
                  <span className="text-purple-700 font-bold flex items-center gap-0.5">
                    Sales <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>

            {/* Report KPI 4: COGS */}
            <div
              onClick={() => navigate('/sale-management/reports')}
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-400 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Boxes className="w-3.5 h-3.5 text-slate-600" />
                  Cost of Goods Sold (COGS)
                </span>
                <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors">
                  <Boxes className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  ₹
                  {(
                    modulesData?.saleReport?.cogs ?? 0
                  ).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </h3>
                <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                  <span>Procurement cost of goods</span>
                  <span className="text-slate-700 font-bold flex items-center gap-0.5">
                    COGS <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 3. Deep Dive Visuals */}
      {(activeModuleTab === 'all' || activeModuleTab === 'sales_hub' || activeModuleTab === 'reports') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Visual: Monthly Sales vs Purchases Comparative Performance (8 cols) */}
          <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#33077C]" />
                  Sales vs. Purchase & Operating Profit
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Monthly trend comparing invoiced revenue against vendor purchase costs and gross margin.
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-[#33077C]" />
                  <span className="text-slate-600">Sales</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-sky-500" />
                  <span className="text-slate-600">Purchases</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-emerald-500" />
                  <span className="text-slate-600">Gross Profit</span>
                </div>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={reportAnalytics.monthlyComparisonData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#33077C" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#33077C" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="purchaseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: '#E2E8F0' }} fontSize={11} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <RechartsTooltip
                    formatter={(val: any, name: any) => [
                      `₹${Number(val).toLocaleString('en-IN')}`,
                      name,
                    ]}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #E2E8F0' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Sales"
                    stroke="#33077C"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#salesGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Purchases"
                    stroke="#0EA5E9"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#purchaseGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payment Status Breakdown Donut Chart (4 cols) */}
          <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <PieIcon className="w-5 h-5 text-emerald-600" />
                  Sales Collection Status
                </h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Ratio of collected invoices vs dues requiring collection follow-ups.
              </p>

              <div className="h-48 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportAnalytics.paymentStatusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {reportAnalytics.paymentStatusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(val: any, name: any) => [`${val} Invoices`, name]}
                      contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #e2e8f0' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Legend & Quick Info */}
            <div className="space-y-2 pt-4 border-t border-slate-100">
              {reportAnalytics.paymentStatusDistribution.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">{item.value} Invoices</span>
                </div>
              ))}
              <div className="pt-2">
                <button
                  onClick={() => navigate('/sale-management/sales/collections')}
                  className="w-full py-2 bg-slate-50 hover:bg-purple-50 text-purple-700 hover:text-purple-900 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  Open Collection Hub <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3b. Purchase Dedicated Visuals */}
      {activeModuleTab === 'purchase' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Purchase Spend & Procurement Trend (8 cols) */}
          <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-600" />
                  Monthly Procurement & Purchase Bill Trend
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Monthly spending trend on vendor bills, purchases, and supply acquisitions.
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-[#0EA5E9]" />
                  <span className="text-slate-600">Purchase Bills</span>
                </div>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={reportAnalytics.monthlyComparisonData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="purchaseOnlyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: '#E2E8F0' }} fontSize={11} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <RechartsTooltip
                    formatter={(val: any, name: any) => [
                      `₹${Number(val).toLocaleString('en-IN')}`,
                      name,
                    ]}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #E2E8F0' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Purchases"
                    stroke="#0EA5E9"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#purchaseOnlyGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Vendor Orders & Payables Quick Status (4 cols) */}
          <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-600" />
                  Procurement Status
                </h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Vendor accounts and purchase orders breakdown.
              </p>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Active Suppliers</p>
                    <h4 className="text-base font-bold text-slate-900 mt-0.5">
                      {modulesData?.purchase?.suppliers ?? 0} Vendors
                    </h4>
                  </div>
                  <button
                    onClick={() => navigate('/sale-management/purchase/supplier')}
                    className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"
                  >
                    View
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-rose-600 font-medium">Pending Requests</p>
                    <h4 className="text-base font-bold text-rose-700 mt-0.5">
                      {modulesData?.purchase?.purchaseRequests?.pending ?? 0} Needs Action
                    </h4>
                  </div>
                  <button
                    onClick={() => navigate('/sale-management/purchase/request')}
                    className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-white hover:bg-rose-100 rounded-lg cursor-pointer border border-rose-200"
                  >
                    Review
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-emerald-600 font-medium">Approved Requests</p>
                    <h4 className="text-base font-bold text-emerald-700 mt-0.5">
                      {modulesData?.purchase?.purchaseRequests?.approved ?? 0} Approved
                    </h4>
                  </div>
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100">
              <button
                onClick={() => navigate('/sale-management/purchase/purchase')}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Receipt className="w-3.5 h-3.5" /> + New Purchase Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Row 3: Module Cards (Inventory, Sales Hub, Purchase, Sale Report) */}
      <div className={activeModuleTab === 'all' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5' : 'grid grid-cols-1 gap-5'}>
        {/* Module 1: INVENTORY CARD */}
        {(activeModuleTab === 'all' || activeModuleTab === 'inventory') && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between hover:border-purple-300 transition-colors">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center">
                    <Package className="w-4.5 h-4.5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Inventory</h4>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 flex items-center gap-1">
                  {loadingModules && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                  {modulesData?.inventory?.sections ?? 4} Sections
                </span>
              </div>

              <div className="mt-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Categories & Sub:</span>
                  <span className="font-bold text-slate-900">
                    {modulesData?.inventory?.categories ?? 0} Categories
                    {modulesData?.inventory?.subcategories !== undefined && (
                      <span className="text-slate-400 font-normal"> • {modulesData.inventory.subcategories} Sub</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Stock Valuation:</span>
                  <span className="font-bold text-slate-900">
                    ₹
                    {(
                      modulesData?.inventory?.stockValuation ?? 0
                    ).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Low Stock Alert:</span>
                  <span
                    className={`font-bold ${
                      (modulesData?.inventory?.lowStockItems ?? 0) > 0
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                    }`}
                  >
                    {modulesData?.inventory?.lowStockItems ?? 0} items need restock
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                onClick={() => navigate('/sale-management/inventory/category')}
                className="px-2 py-1.5 text-center text-[11px] font-semibold text-slate-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
              >
                Category
              </button>
              <button
                onClick={() => navigate('/sale-management/inventory/subcategory')}
                className="px-2 py-1.5 text-center text-[11px] font-semibold text-slate-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
              >
                Subcategory
              </button>
              <button
                onClick={() => navigate('/sale-management/inventory/products')}
                className="px-2 py-1.5 text-center text-[11px] font-semibold text-slate-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
              >
                Products
              </button>
              <button
                onClick={() => navigate('/sale-management/inventory/stocks')}
                className="px-2 py-1.5 text-center text-[11px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer font-bold"
              >
                Stocks →
              </button>
            </div>
          </div>
        )}

        {/* Module 2: PURCHASE CARD */}
        {(activeModuleTab === 'all' || activeModuleTab === 'purchase') && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between hover:border-blue-300 transition-colors">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                    <Truck className="w-4.5 h-4.5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Purchase</h4>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 flex items-center gap-1">
                  {loadingModules && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                  {modulesData?.purchase?.sections ?? 6} Sections
                </span>
              </div>

              <div className="mt-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Suppliers / Vendors:</span>
                  <span className="font-bold text-slate-900">
                    {modulesData?.purchase?.suppliers ?? 0} Vendors
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Purchase Requests:</span>
                  <span className="font-bold text-slate-900">
                    {modulesData?.purchase?.purchaseRequests?.pending ?? 0} Pending (
                    {modulesData?.purchase?.purchaseRequests?.approved ?? 0} Approved)
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Payment Out Settled:</span>
                  <span className="font-bold text-slate-900">
                    ₹
                    {(
                      modulesData?.purchase?.paymentOutSettled ?? 0
                    ).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    {modulesData?.purchase?.paymentsOut !== undefined && (
                      <span className="text-slate-400 font-normal"> ({modulesData.purchase.paymentsOut} Bills)</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                onClick={() => navigate('/sale-management/purchase/supplier')}
                className="px-2 py-1.5 text-center text-[11px] font-semibold text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
              >
                Suppliers
              </button>
              <button
                onClick={() => navigate('/sale-management/purchase/request')}
                className="px-2 py-1.5 text-center text-[11px] font-semibold text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
              >
                Requests
              </button>
              <button
                onClick={() => navigate('/sale-management/purchase/payment-out')}
                className="px-2 py-1.5 text-center text-[11px] font-semibold text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
              >
                Payment Out
              </button>
              <button
                onClick={() => navigate('/sale-management/purchase/purchase')}
                className="px-2 py-1.5 text-center text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer font-bold"
              >
                Purchase Bills →
              </button>
            </div>
          </div>
        )}

        {/* Module 3: SALES HUB CARD */}
        {(activeModuleTab === 'all' || activeModuleTab === 'sales_hub') && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between hover:border-emerald-300 transition-colors">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <ShoppingCart className="w-4.5 h-4.5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Sales Hub</h4>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 flex items-center gap-1">
                  {loadingModules && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                  {modulesData?.salesHub?.sections ?? 10} Sections
                </span>
              </div>

              <div className="mt-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Active Customers:</span>
                  <span className="font-bold text-slate-900">
                    {modulesData?.salesHub?.activeCustomers ?? 0} Accounts
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Estimates / Quotes:</span>
                  <span className="font-bold text-slate-900">
                    {modulesData?.salesHub?.quotations?.open ?? 0} Open (
                    {modulesData?.salesHub?.quotations?.converted ?? 0} Converted)
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Sales Representatives:</span>
                  <span className="font-bold text-slate-900">
                    {modulesData?.salesHub?.salesRepresentatives?.active ?? 0} Active
                    {modulesData?.salesHub?.salesRepresentatives?.assigned !== undefined && (
                      <span className="text-slate-400 font-normal">
                        {' '}
                        ({modulesData.salesHub.salesRepresentatives.assigned} Assigned)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                onClick={() => navigate('/sale-management/sales/customer')}
                className="px-2 py-1.5 text-center text-[11px] font-semibold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
              >
                Customers
              </button>
              <button
                onClick={() => navigate('/sale-management/sales/quotation')}
                className="px-2 py-1.5 text-center text-[11px] font-semibold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
              >
                Quotes
              </button>
              <button
                onClick={() => navigate('/sale-management/sales/payment-in')}
                className="px-2 py-1.5 text-center text-[11px] font-semibold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
              >
                Payment-In
              </button>
              <button
                onClick={() => navigate('/sale-management/sales/sale')}
                className="px-2 py-1.5 text-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer font-bold"
              >
                Sales Invoice →
              </button>
            </div>
          </div>
        )}

        {/* Module 4: SALE REPORT CARD */}
        {(activeModuleTab === 'all' || activeModuleTab === 'reports') && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between hover:border-amber-300 transition-colors">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                    <BarChart3 className="w-4.5 h-4.5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Sale Report</h4>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 flex items-center gap-1">
                  {loadingModules && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                  Analytics
                </span>
              </div>

              <div className="mt-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Gross Margin:</span>
                  <span className="font-bold text-emerald-600">
                    {modulesData?.saleReport?.grossMarginPercent !== undefined
                      ? modulesData.saleReport.grossMarginPercent
                      : reportAnalytics.grossProfitMargin}
                    % Profit
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Gross Profit (₹):</span>
                  <span className="font-bold text-slate-900">
                    ₹
                    {(
                      modulesData?.saleReport?.grossProfit ?? reportAnalytics.grossProfit
                    ).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Net Sales:</span>
                  <span className="font-bold text-slate-900">
                    ₹
                    {(
                      modulesData?.saleReport?.netSales ?? 0
                    ).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 grid grid-cols-1 gap-1.5">
              <button
                onClick={() => navigate('/sale-management/reports')}
                className="w-full py-2 text-center text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <BarChart3 className="w-4 h-4" />
                Open Full Sale Reports Hub →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Row 4: Inventory Low-Stock Alerts & Top Products Breakdown */}
      {(activeModuleTab === 'all' || activeModuleTab === 'inventory' || activeModuleTab === 'sales_hub') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Low Stock Watchlist (6 Cols) - Shown for All and Inventory */}
          {(activeModuleTab === 'all' || activeModuleTab === 'inventory') && (
            <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    Inventory Stock Health & Critical Reorder
                    {lowStockData?.totalLowStock !== undefined && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[11px] font-extrabold rounded-full">
                        {lowStockData.totalLowStock} Low
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Items currently near or below minimum safety stock levels, largest shortage first.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/sale-management/inventory/stocks')}
                  className="text-xs font-bold text-[#33077C] hover:underline cursor-pointer"
                >
                  View Stocks
                </button>
              </div>

              {loadingLowStock ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-[#33077C]" />
                  <span>Fetching live stock health records...</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {displayLowStockItems.length > 0 ? (
                    displayLowStockItems.slice(0, 5).map((item: any, idx: number) => (
                      <div
                        key={item.productId || item.id || idx}
                        className="py-3 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-slate-900 truncate">{item.productName}</h4>
                          <p className="text-xs text-slate-500 truncate">
                            SKU: {item.sku || 'N/A'} • {item.category || 'General'}
                            {item.shortage ? (
                              <span className="text-rose-600 font-semibold ml-2">Shortage: -{item.shortage}</span>
                            ) : null}
                          </p>
                        </div>
                        <div className="text-right flex items-center gap-3 shrink-0">
                          <div>
                            <span className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                              {item.inStock} {item.unit || 'units'} left
                            </span>
                            <p className="text-[11px] text-slate-400 mt-0.5">Min: {item.reorderLevel}</p>
                          </div>
                          <button
                            onClick={() => navigate('/sale-management/purchase/purchase')}
                            className="px-2.5 py-1 text-xs font-bold text-white bg-[#33077C] hover:bg-purple-900 rounded-lg transition-colors cursor-pointer"
                          >
                            Order
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      All inventory items are currently well above safety reorder levels!
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Top Selling Products / Category Distribution (6 Cols or 12 Cols for Sales Hub) */}
          <div className={`${activeModuleTab === 'sales_hub' ? 'lg:col-span-12' : 'lg:col-span-6'} bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-purple-700" />
                  Top Revenue Drivers (Products)
                  {topProductsData?.totalRevenue !== undefined && (
                    <span className="px-2 py-0.5 bg-purple-50 text-[#33077C] text-[11px] font-bold rounded-full">
                      Total: ₹{topProductsData.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Best performing items ranked by invoiced total in the selected period.
                </p>
              </div>
              <button
                onClick={() => navigate('/sale-management/inventory/products')}
                className="text-xs font-bold text-[#33077C] hover:underline cursor-pointer"
              >
                Catalog
              </button>
            </div>

            {loadingTopProducts ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-[#33077C]" />
                <span>Fetching top revenue drivers...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {displayTopProducts.length > 0 ? (
                  displayTopProducts.map((p: any, idx: number) => {
                    const maxRev = displayTopProducts[0]?.revenue || 1;
                    const pct =
                      p.sharePercent !== undefined
                        ? Math.min(100, Math.round(Number(p.sharePercent)))
                        : Math.min(100, Math.round((p.revenue / maxRev) * 100));

                    return (
                      <div key={p.productId || idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold gap-2">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-4 h-4 rounded-full bg-purple-100 text-[#33077C] text-[10px] font-extrabold flex items-center justify-center shrink-0">
                              {p.rank || idx + 1}
                            </span>
                            <span className="text-slate-800 truncate max-w-[200px]">
                              {p.productName || p.name}
                            </span>
                            {p.category && (
                              <span className="text-[10px] text-slate-400 hidden sm:inline">({p.category})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-slate-500">
                              {p.quantitySold ?? p.quantity} {p.unit || 'units'} sold
                            </span>
                            <span className="text-slate-900 font-bold">
                              ₹{Number(p.revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </span>
                            {p.sharePercent !== undefined && (
                              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                                {p.sharePercent}%
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#33077C] to-purple-500 transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No product sales recorded for this period.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Row 5: Recent Operations & Transactions */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Header Tabs */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#33077C]" />
              Recent Operations & Transactions
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live transaction records across Sales Hub, Purchase Bills, and Customer Payments.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => handleRecentTabChange('sales_invoices')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                recentTab === 'sales_invoices'
                  ? 'bg-white text-[#33077C] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sales Invoices ({recentCounts.salesInvoices})
            </button>
            <button
              onClick={() => handleRecentTabChange('purchase_bills')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                recentTab === 'purchase_bills'
                  ? 'bg-white text-[#33077C] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Purchase Bills ({recentCounts.purchaseBills})
            </button>
            <button
              onClick={() => handleRecentTabChange('payments_in')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                recentTab === 'payments_in'
                  ? 'bg-white text-[#33077C] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Payment-In ({recentCounts.paymentsIn})
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="overflow-x-auto min-h-[220px]">
          {loadingRecent ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-[#33077C]" />
              <span>Fetching live transactions...</span>
            </div>
          ) : recentTab === 'sales_invoices' ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[11px] border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Invoice No</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Grand Total</th>
                  <th className="px-5 py-3">Paid Amount</th>
                  <th className="px-5 py-3">Balance</th>
                  <th className="px-5 py-3">Payment Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayRecentRows.length > 0 ? (
                  displayRecentRows.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-[#33077C]">{inv.invoiceNo}</td>
                      <td className="px-5 py-3.5 text-slate-900 font-medium">
                        {inv.customerName || inv.customerCompany || 'Walk-in Customer'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{formatDate(inv.date || inv.saleDate)}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        ₹{Number(inv.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3.5 text-emerald-700 font-semibold">
                        ₹{Number(inv.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 font-medium">
                        ₹
                        {Number(
                          inv.balanceAmount ??
                            inv.balance ??
                            Math.max(0, (inv.grandTotal || 0) - (inv.paidAmount || 0))
                        ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            inv.paymentStatus === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.paymentStatus === 'Partial'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {inv.paymentStatus || 'Pending'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => navigate('/sale-management/sales/sale')}
                          className="text-[#33077C] hover:underline font-bold text-xs cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                      No sales invoices recorded for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : recentTab === 'purchase_bills' ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[11px] border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Bill / Purchase No</th>
                  <th className="px-5 py-3">Supplier</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Grand Total</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayRecentRows.length > 0 ? (
                  displayRecentRows.map((pur: any) => (
                    <tr key={pur.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-blue-700">{pur.billNo || pur.purchaseNo}</td>
                      <td className="px-5 py-3.5 text-slate-900 font-medium">{pur.supplierName}</td>
                      <td className="px-5 py-3.5 text-slate-500">{formatDate(pur.date || pur.purchaseDate)}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        ₹{Number(pur.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800">
                          {pur.status || pur.purchaseStatus || 'Completed'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => navigate('/sale-management/purchase/purchase')}
                          className="text-blue-700 hover:underline font-bold text-xs cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                      No purchase bills recorded for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[11px] border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Receipt / Payment No</th>
                  <th className="px-5 py-3">Invoice No</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Payment Mode</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayRecentRows.length > 0 ? (
                  displayRecentRows.map((pay: any) => (
                    <tr key={pay.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-emerald-700">{pay.receiptNo || pay.id}</td>
                      <td className="px-5 py-3.5 text-slate-600 font-medium">{pay.invoiceNo || '-'}</td>
                      <td className="px-5 py-3.5 text-slate-900 font-medium">
                        {pay.customerName || pay.partyName || pay.customerCompany || 'Customer'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{formatDate(pay.date || pay.paymentDate)}</td>
                      <td className="px-5 py-3.5 font-bold text-emerald-700">
                        ₹
                        {Number(pay.amount || pay.receivedAmount || 0).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {pay.paymentType || pay.paymentMethod || 'Online'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700">
                          {pay.status || 'Success'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => navigate('/sale-management/sales/payment-in')}
                          className="text-emerald-700 hover:underline font-bold text-xs cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                      No payments-in recorded for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
