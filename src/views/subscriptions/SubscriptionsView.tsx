import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  Product,
  ProductPlan,
  SubscriptionItem,
  Customer,
  BillingCycle,
  SubscriptionStatus,
  PricingType,
} from '../../types';
import {
  Sparkles,
  UserPlus,
  Repeat,
  Building2,
  Boxes,
  Activity,
  MessageSquareShare,
  CheckSquare,
  ExternalLink,
  Search,
  Phone,
  MessageCircle,
  Mail,
  Calendar,
  Clock,
  Pencil,
  Trash2,
  CheckCircle2,
  Check,
  Layers,
  Zap,
  History,
  Tag,
  TrendingUp,
  ShieldCheck,
  Plus,
  MoreVertical,
  Eye,
  Edit2,
  AlertCircle,
  Copy,
  RotateCcw,
  X,
  Video,
  Image,
  FileText,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { PlanFormModal } from '../../components/forms/PlanFormModal';
import { CustomSelect } from '../../components/common/CustomSelect';
import { SearchBar } from '../../components/common/SearchBar';
import { FilterDropdown } from '../../components/common/FilterDropdown';
import { Button } from '../../components/common/Button';
import { Pagination } from '../../components/common/Pagination';
import {
  subscriptionPlanApi,
  SubscriptionPlanApiItem,
  organizationApi,
  OrganizationApiItem,
  organizationSubscriptionApi,
  OrganizationSubscriptionApiItem,
  clientSubscriptionApi,
  ClientSubscriptionApiItem,
  clientProductApi,
  ClientProductApiItem,
  productPlanApi,
  ProductPlanApiItem,
  customerApi,
  mapApiCustomerToSalesCustomer,
} from '../../api';

export interface OrgSubscriptionItem {
  id: string;
  orgId: string;
  orgName: string;
  orgCode: string;
  industry: string;
  contactPerson: string;
  email: string;
  phone: string;
  whatsapp?: string;
  planId?: string;
  plan: string;
  billingCycle: BillingCycle;
  amount: number;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Expiring Soon' | 'Expired' | 'Cancelled';
  autoRenew: boolean;
  notes?: string;
  subscriptionNumber?: string;
}

const PRODUCT_ICONS: Record<string, any> = {
  prod_1: Boxes,
  prod_2: Building2,
  prod_3: Activity,
  prod_4: MessageSquareShare,
  prod_5: CheckSquare,
  prod_6: ExternalLink,
};

interface SubscriptionsViewProps {
  initialViewMode?: 'plans' | 'subscriptions';
  lockMode?: boolean;
}

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({
  initialViewMode = 'plans',
  lockMode = false,
}) => {
  const { currentUser, isSuperAdmin, showToast } = useAuth();

  // Core Data
  const [products, setProducts] = useState<Product[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab View: 'plans' | 'subscriptions'
  const [viewMode, setViewMode] = useState<'plans' | 'subscriptions'>(initialViewMode);

  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode);
    }
  }, [initialViewMode]);

  // Product Plan Selector: Dropdown selection (product.id or null)
  const [selectedPlanProductId, setSelectedPlanProductId] = useState<string | null>(null);

  // Filter States for Plans View
  const [pendingPlanSearch, setPendingPlanSearch] = useState('');
  const [appliedPlanSearch, setAppliedPlanSearch] = useState('');
  const [pendingPlanProduct, setPendingPlanProduct] = useState('ALL');
  const [appliedPlanProduct, setAppliedPlanProduct] = useState('ALL');
  const [pendingPlanStatus, setPendingPlanStatus] = useState('ALL');
  const [appliedPlanStatus, setAppliedPlanStatus] = useState('ALL');
  const [plansPage, setPlansPage] = useState(1);
  const [plansPageSize, setPlansPageSize] = useState(5);

  // Filter States for Client Subscriptions View
  const [pendingSubSearch, setPendingSubSearch] = useState('');
  const [appliedSubSearch, setAppliedSubSearch] = useState('');
  const [pendingSubProduct, setPendingSubProduct] = useState('ALL');
  const [appliedSubProduct, setAppliedSubProduct] = useState('ALL');
  const [pendingSubStatus, setPendingSubStatus] = useState('ALL');
  const [appliedSubStatus, setAppliedSubStatus] = useState('ALL');
  const [subsPage, setSubsPage] = useState(1);
  const [subsPageSize, setSubsPageSize] = useState(10);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, text: string, key: string) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  // Action Dropdown Menu State for Plans Table
  const [activePlanDropdownId, setActivePlanDropdownId] = useState<string | null>(null);
  const [planDropdownPos, setPlanDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  // Action Dropdown Menu State for Organization Subscriptions Table
  const [activeOrgDropdownId, setActiveOrgDropdownId] = useState<string | null>(null);
  const [orgDropdownPos, setOrgDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  // Action Dropdown Menu State for Client Subscriptions Table (Admin)
  const [activeClientSubDropdownId, setActiveClientSubDropdownId] = useState<string | null>(null);
  const [clientSubDropdownPos, setClientSubDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  // Close plan, org & client sub dropdowns on window click/scroll
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.plan-action-dropdown-container') && !target.closest('.plan-action-dropdown-menu')) {
        setActivePlanDropdownId(null);
        setPlanDropdownPos(null);
      }
      if (!target.closest('.org-action-dropdown-container') && !target.closest('.org-action-dropdown-menu')) {
        setActiveOrgDropdownId(null);
        setOrgDropdownPos(null);
      }
      if (!target.closest('.client-sub-action-dropdown-container') && !target.closest('.client-sub-action-dropdown-menu')) {
        setActiveClientSubDropdownId(null);
        setClientSubDropdownPos(null);
      }
    };
    const handleScroll = () => {
      if (activePlanDropdownId) {
        setActivePlanDropdownId(null);
        setPlanDropdownPos(null);
      }
      if (activeOrgDropdownId) {
        setActiveOrgDropdownId(null);
        setOrgDropdownPos(null);
      }
      if (activeClientSubDropdownId) {
        setActiveClientSubDropdownId(null);
        setClientSubDropdownPos(null);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [activePlanDropdownId, activeOrgDropdownId, activeClientSubDropdownId]);

  // Modals for Plans
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planModalProductId, setPlanModalProductId] = useState<string>('prod_1');
  const [editingPlan, setEditingPlan] = useState<ProductPlan | null>(null);

  // Modals for Customer Subscriptions
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<SubscriptionItem | null>(null);
  const [subCustomerId, setSubCustomerId] = useState('');
  const [subCustomerName, setSubCustomerName] = useState('');
  const [subProductId, setSubProductId] = useState('');
  const [subPlanName, setSubPlanName] = useState('');
  const [subBillingCycle, setSubBillingCycle] = useState<BillingCycle | ''>('');
  const [subAmount, setSubAmount] = useState<number | ''>('');
  const [subStartDate, setSubStartDate] = useState('');
  const [subEndDate, setSubEndDate] = useState('');
  const [subAutoRenew, setSubAutoRenew] = useState(true);
  const [subStatus, setSubStatus] = useState<SubscriptionStatus | ''>('');
  const [subNotes, setSubNotes] = useState('');

  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // SUPER ADMIN: Organization Subscriptions State (Live API)
  // -------------------------------------------------------------
  const [apiOrgSubs, setApiOrgSubs] = useState<OrganizationSubscriptionApiItem[]>([]);
  const [apiOrgSubsTotal, setApiOrgSubsTotal] = useState(0);
  const [isOrgSubsLoading, setIsOrgSubsLoading] = useState(false);

  // Available organizations from live API
  const [availableOrgs, setAvailableOrgs] = useState<OrganizationApiItem[]>([]);

  // Filter States for Super Admin Organization Subscriptions
  const [pendingOrgPlan, setPendingOrgPlan] = useState('ALL');
  const [appliedOrgPlan, setAppliedOrgPlan] = useState('ALL');
  const [orgSubsPage, setOrgSubsPage] = useState(1);
  const [orgSubsPageSize, setOrgSubsPageSize] = useState(10);

  // Modal State for Organization Subscriptions (Super Admin)
  const [isOrgSubModalOpen, setIsOrgSubModalOpen] = useState(false);
  const [editingOrgSub, setEditingOrgSub] = useState<OrgSubscriptionItem | null>(null);
  const [orgSubOrgId, setOrgSubOrgId] = useState('');
  const [orgSubOrgName, setOrgSubOrgName] = useState('');
  const [orgSubOrgCode, setOrgSubOrgCode] = useState('');
  const [orgSubIndustry, setOrgSubIndustry] = useState('');
  const [orgSubContactPerson, setOrgSubContactPerson] = useState('');
  const [orgSubEmail, setOrgSubEmail] = useState('');
  const [orgSubPhone, setOrgSubPhone] = useState('');
  const [orgSubWhatsapp, setOrgSubWhatsapp] = useState('');
  const [orgSubPlanId, setOrgSubPlanId] = useState('');
  const [orgSubPlan, setOrgSubPlan] = useState('');
  const [orgSubBillingCycle, setOrgSubBillingCycle] = useState<string>('Monthly');
  const [orgSubAmount, setOrgSubAmount] = useState<number>(0);
  const [orgSubStartDate, setOrgSubStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [orgSubEndDate, setOrgSubEndDate] = useState('');
  const [orgSubAutoRenew, setOrgSubAutoRenew] = useState(true);
  const [orgSubNotes, setOrgSubNotes] = useState('');

  // -------------------------------------------------------------
  // CLIENT SUBSCRIPTIONS: Live API State (Platform /subscriptions)
  // -------------------------------------------------------------
  const [apiClientSubs, setApiClientSubs] = useState<ClientSubscriptionApiItem[]>([]);
  const [apiClientSubsTotal, setApiClientSubsTotal] = useState(0);
  const [isClientSubsLoading, setIsClientSubsLoading] = useState(false);

  // Initial Data Load (Only for non-superadmin client subscriptions)
  useEffect(() => {
    if (!isSuperAdmin) {
      loadClientDependencies();
    } else {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  const loadClientDependencies = async () => {
    if (isSuperAdmin) return;
    setLoading(true);
    try {
      const [prodsData, custsData] = await Promise.all([
        clientProductApi.getProducts({ limit: 100 })
          .then((res) => {
            if (res && res.success && Array.isArray(res.data)) {
              return res.data.map((p) => ({
                id: p.id,
                name: p.name,
                code: p.code,
                plans: (p.plans || []).map((pl: any) => ({
                  id: pl.id,
                  name: pl.name,
                  price: Number(pl.price) || 0,
                  billingCycle: pl.billingCycle || 'Monthly',
                  features: pl.features || [],
                  status: pl.status || 'Active',
                })),
              })) as any[];
            }
            return [];
          })
          .catch(() => []),
        customerApi.getCustomers({ pagination_required: false, page_size: 100 })
          .then((res) => {
            if (res && res.success && Array.isArray(res.data)) {
              return res.data.map(mapApiCustomerToSalesCustomer) as any;
            }
            return [];
          })
          .catch(() => []),
      ]);
      const prods = prodsData || [];
      setProducts(prods);
      setCustomers(custsData || []);

      // Default selected product to Digital Marketing or the first loaded product
      setSelectedPlanProductId((prev) => {
        if (prev && prods.some((p) => p.id === prev)) return prev;
        const dmk = prods.find((p) => p.name?.toLowerCase().includes('digital marketing'));
        return dmk ? dmk.id : (prods[0]?.id || null);
      });
    } catch (e: any) {
      console.error(e);
      showToast('error', 'Data Load Error', e.message || 'Failed to load subscription details');
    } finally {
      setLoading(false);
    }
  };

  const loadClientSubscriptions = async (
    page = subsPage,
    limit = subsPageSize,
    search = appliedSubSearch,
    productFilter = appliedSubProduct,
    status = appliedSubStatus
  ) => {
    if (isSuperAdmin) return;
    setIsClientSubsLoading(true);
    try {
      const matchedProd = productFilter !== 'ALL' ? products.find((p) => p.name.toLowerCase() === productFilter.toLowerCase() || p.id === productFilter) : undefined;
      const res = await clientSubscriptionApi.getClientSubscriptions({
        page,
        limit,
        search: search.trim() ? search.trim() : undefined,
        productId: matchedProd?.id,
        status: status !== 'ALL' && status ? status : undefined,
        sortBy: 'endDate',
        sortOrder: 'asc',
      });
      if (res.success && Array.isArray(res.data)) {
        setApiClientSubs(res.data);
        const total = res.pagination?.totalRecords ?? res.data.length;
        setApiClientSubsTotal(total);
      }
    } catch (e: any) {
      console.error('Failed to load client subscriptions:', e);
      showToast('error', 'Subscriptions Load Failed', e.message || 'Failed to fetch client subscriptions');
    } finally {
      setIsClientSubsLoading(false);
    }
  };

  useEffect(() => {
    if (!isSuperAdmin && viewMode === 'subscriptions') {
      loadClientSubscriptions(subsPage, subsPageSize, appliedSubSearch, appliedSubProduct, appliedSubStatus);
    }
  }, [isSuperAdmin, viewMode, subsPage, subsPageSize, appliedSubSearch, appliedSubProduct, appliedSubStatus]);

  // -------------------------------------------------------------
  // PRODUCT PLANS: Live API State (Platform /products/{productId}/plans)
  // -------------------------------------------------------------
  const [productPlansByProductId, setProductPlansByProductId] = useState<Record<string, ProductPlan[]>>({});
  const [isProductPlansLoading, setIsProductPlansLoading] = useState(false);

  // Helper to map ProductPlanApiItem from backend to ProductPlan format for UI
  const mapApiProductPlanToProductPlan = (p: ProductPlanApiItem): ProductPlan => ({
    id: p.id,
    name: p.name,
    price: p.price,
    billingCycle: (p.billingCycle as BillingCycle) || 'Monthly',
    features: Array.isArray(p.features) ? p.features : [],
    status: (p.status as 'Active' | 'Inactive') || 'Active',
    currency: '₹',
    pricingType: 'Fixed',
    description: '',
    specs: {},
    isPopular: false,
  });

  const loadProductPlans = async (productId: string, status?: string) => {
    if (!productId) return;
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(productId);
    if (!isUuid) return; // Mock / local product ID, don't query remote API
    setIsProductPlansLoading(true);
    try {
      const res = await productPlanApi.getProductPlans(productId, {
        status: status && status !== 'ALL' ? status : undefined,
      });
      if (res.success && Array.isArray(res.data)) {
        const mappedPlans = res.data.map(mapApiProductPlanToProductPlan);
        setProductPlansByProductId((prev) => ({
          ...prev,
          [productId]: mappedPlans,
        }));
      }
    } catch (e: any) {
      console.error('Failed to load product plans for productId:', productId, e);
      showToast('error', 'Plans Load Failed', e.message || 'Failed to fetch product plans');
    } finally {
      setIsProductPlansLoading(false);
    }
  };

  useEffect(() => {
    if (!isSuperAdmin && viewMode === 'plans' && selectedPlanProductId) {
      loadProductPlans(selectedPlanProductId);
    }
  }, [isSuperAdmin, viewMode, selectedPlanProductId]);

  // -------------------------------------------------------------
  // SUPER ADMIN: Organization Subscription Plans (Live API)
  // -------------------------------------------------------------
  const [apiPlans, setApiPlans] = useState<SubscriptionPlanApiItem[]>([]);
  const [apiPlansTotal, setApiPlansTotal] = useState(0);
  const [isPlansLoading, setIsPlansLoading] = useState(false);

  // Helper to map SubscriptionPlanApiItem to ProductPlan format for UI compatibility
  const mapApiPlanToProductPlan = (p: SubscriptionPlanApiItem): ProductPlan => ({
    id: p.id,
    name: p.name,
    price: p.monthlyPrice,
    billingCycle: (p.billingCycle as BillingCycle) || 'Monthly',
    pricingType: (p.pricingType as PricingType) || 'Fixed',
    tier: (p.tier as any) || 'Enterprise',
    features: p.features || [],
    description: p.description || '',
    maxBranchLimit: p.limits?.branches ?? 5,
    specs: {
      ...(p.limits || {}),
      gstRate: p.gstRate,
      annualPrice: p.annualPrice,
      maxBranchLimit: p.limits?.branches ?? 5,
    },
    status: (p.status as 'Active' | 'Inactive') || 'Active',
    currency: '₹',
    customizablePrice: p.pricingType === 'Custom Quote',
    isPopular: !!p.isPopular,
  });

  const loadSubscriptionPlans = async (
    page = plansPage,
    limit = plansPageSize,
    search = appliedPlanSearch,
    status = appliedPlanStatus
  ) => {
    if (!isSuperAdmin) return;
    setIsPlansLoading(true);
    try {
      const res = await subscriptionPlanApi.getSubscriptionPlans({
        page,
        limit,
        search: search.trim() ? search.trim() : undefined,
        status: status !== 'ALL' && status ? status : undefined,
        sortBy: 'monthlyPrice',
        sortOrder: 'asc',
      });
      if (res.success && Array.isArray(res.data)) {
        setApiPlans(res.data);
        setApiPlansTotal(res.pagination?.totalRecords ?? res.data.length);
      }
    } catch (e: any) {
      console.error('Failed to load subscription plans:', e);
      showToast('error', 'Plans Load Failed', e.message || 'Failed to fetch subscription plans');
    } finally {
      setIsPlansLoading(false);
    }
  };

  const loadAvailableOrganizations = async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await organizationApi.getOrganizations(1, 100);
      if (res.success && Array.isArray(res.data)) {
        setAvailableOrgs(res.data);
      }
    } catch (e: any) {
      console.error('Failed to load organizations for dropdown:', e);
    }
  };

  const loadOrganizationSubscriptions = async (
    page = orgSubsPage,
    limit = orgSubsPageSize,
    search = appliedSubSearch,
    planName = appliedOrgPlan,
    status = appliedSubStatus
  ) => {
    if (!isSuperAdmin) return;
    setIsOrgSubsLoading(true);
    try {
      const matchedPlan = planName !== 'ALL' ? apiPlans.find((p) => p.name.toLowerCase() === planName.toLowerCase()) : undefined;
      const res = await organizationSubscriptionApi.getOrganizationSubscriptions({
        page,
        limit,
        search: search.trim() ? search.trim() : undefined,
        planId: matchedPlan?.id,
        status: status !== 'ALL' && status ? status : undefined,
        sortBy: 'endDate',
        sortOrder: 'asc',
      });
      if (res.success && Array.isArray(res.data)) {
        setApiOrgSubs(res.data);
        setApiOrgSubsTotal(res.pagination?.totalRecords ?? res.data.length);
      }
    } catch (e: any) {
      console.error('Failed to load organization subscriptions:', e);
      showToast('error', 'Subscriptions Load Failed', e.message || 'Failed to fetch organization subscriptions');
    } finally {
      setIsOrgSubsLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin && viewMode === 'plans') {
      loadSubscriptionPlans(plansPage, plansPageSize, appliedPlanSearch, appliedPlanStatus);
    }
  }, [isSuperAdmin, viewMode, plansPage, plansPageSize, appliedPlanSearch, appliedPlanStatus]);

  useEffect(() => {
    if (isSuperAdmin && viewMode === 'subscriptions') {
      loadOrganizationSubscriptions(orgSubsPage, orgSubsPageSize, appliedSubSearch, appliedOrgPlan, appliedSubStatus);
    }
  }, [isSuperAdmin, viewMode, orgSubsPage, orgSubsPageSize, appliedSubSearch, appliedOrgPlan, appliedSubStatus]);

  // Derived orgPlans from apiPlans
  const orgPlans = useMemo(() => {
    return apiPlans.map(mapApiPlanToProductPlan);
  }, [apiPlans]);

  // -------------------------------------------------------------
  // PLAN ACTIONS (Create, Edit, Delete, Duplicate)
  // -------------------------------------------------------------
  const handleOpenCreatePlan = (productId?: string) => {
    setPlanModalProductId(
      productId ||
      (isSuperAdmin ? 'prod_org' : (selectedPlanProductId && selectedPlanProductId !== 'ALL' ? selectedPlanProductId : products[0]?.id || 'prod_1'))
    );
    setEditingPlan(null);
    setIsPlanModalOpen(true);
  };

  const handleOpenEditPlan = (product: Product, plan: ProductPlan) => {
    setPlanModalProductId(product.id);
    setEditingPlan(plan);
    setIsPlanModalOpen(true);
  };

  const handleSavePlan = async (productId: string, planData: Partial<ProductPlan>, planId?: string) => {
    try {
      if (isSuperAdmin || productId === 'prod_org') {
        const branchLimit = Number(planData.maxBranchLimit || planData.specs?.maxBranchLimit || 5);
        const adminUsers = Number(planData.specs?.adminUsers || 10);
        const staffUsers = Number(planData.specs?.staffUsers || 50);
        const storageGB = Number(planData.specs?.storageGB || 100);
        const monthlyPrice = Number(planData.price) || 0;
        const annualPrice = planData.specs?.annualPrice ? Number(planData.specs.annualPrice) : Math.round(monthlyPrice * 10);
        const gstRate = planData.specs?.gstRate !== undefined ? Number(planData.specs.gstRate) : 18;

        const generateCode = (nameStr: string) => {
          return nameStr.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');
        };

        if (planId) {
          const matchedApiPlan = apiPlans.find((p) => p.id === planId);
          await subscriptionPlanApi.updateSubscriptionPlan(planId, {
            name: planData.name,
            code: matchedApiPlan?.code || generateCode(planData.name || 'PLAN'),
            description: planData.description || matchedApiPlan?.description || '',
            monthlyPrice,
            annualPrice,
            gstRate,
            billingCycle: planData.billingCycle || 'Monthly',
            pricingType: (planData.pricingType as any) || 'Fixed',
            status: planData.status || 'Active',
            features: planData.features || ['Multi-Branch Support', 'Unlimited Leads & Inquiries', 'Advanced Reports'],
            limits: {
              adminUsers,
              staffUsers,
              branches: branchLimit,
              storageGB,
            },
            isPopular: !!planData.isPopular,
          });
          showToast('success', 'Plan Updated', `Successfully updated "${planData.name}".`);
        } else {
          await subscriptionPlanApi.createSubscriptionPlan({
            name: planData.name || 'New Enterprise Plan',
            code: generateCode(planData.name || `PLAN_${Date.now()}`),
            description: planData.description || 'Comprehensive enterprise management suite',
            monthlyPrice,
            annualPrice,
            gstRate,
            billingCycle: planData.billingCycle || 'Monthly',
            pricingType: (planData.pricingType as any) || 'Fixed',
            status: planData.status || 'Active',
            features: planData.features && planData.features.length > 0 ? planData.features : ['Multi-Branch Support', 'Unlimited Leads & Inquiries', 'Advanced Reports'],
            limits: {
              adminUsers,
              staffUsers,
              branches: branchLimit,
              storageGB,
            },
            isPopular: !!planData.isPopular,
          });
          showToast('success', 'Plan Created', `New enterprise plan "${planData.name}" created.`);
        }
        setIsPlanModalOpen(false);
        await loadSubscriptionPlans();
        return;
      }

      const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(productId);

      if (planId) {
        if (isUuid) {
          await productPlanApi.updateProductPlan(productId, planId, {
            name: planData.name,
            price: Number(planData.price) || 0,
            billingCycle: planData.billingCycle || 'Monthly',
            features: planData.features || [],
            status: planData.status || 'Active',
          });
        }
        setProductPlansByProductId((prev) => {
          const list = prev[productId] || [];
          return {
            ...prev,
            [productId]: list.map((p) => (p.id === planId ? { ...p, ...planData } as ProductPlan : p)),
          };
        });
        showToast('success', 'Plan Updated', `Saved flexible pricing for ${planData.name}.`);
      } else {
        let newCreatedId = `plan_${Date.now()}`;
        if (isUuid) {
          const res = await productPlanApi.createProductPlan(productId, {
            name: planData.name || 'New Plan',
            price: Number(planData.price) || 0,
            billingCycle: planData.billingCycle || 'Monthly',
            features: planData.features || [],
            status: planData.status || 'Active',
          });
          if (res?.data?.id) newCreatedId = res.data.id;
        }
        const createdPlan: ProductPlan = {
          id: newCreatedId,
          name: planData.name || 'New Plan',
          price: Number(planData.price) || 0,
          currency: planData.currency || '₹',
          billingCycle: planData.billingCycle || 'Monthly',
          pricingType: planData.pricingType || 'Fixed',
          status: planData.status || 'Active',
          features: planData.features || [],
          description: planData.description || '',
          specs: planData.specs || {},
          isPopular: !!planData.isPopular,
        };
        setProductPlansByProductId((prev) => ({
          ...prev,
          [productId]: [...(prev[productId] || []), createdPlan],
        }));
        showToast('success', 'Plan Created', `New plan "${planData.name}" added to product.`);
      }
      setIsPlanModalOpen(false);
      if (isUuid) {
        await loadProductPlans(productId);
      }
    } catch (e: any) {
      console.error('Plan Save Failed:', e);
      const errMsg = e?.response?.data?.message || e?.response?.data?.error?.message || e.message || 'Error occurred while saving plan.';
      showToast('error', 'Plan Save Failed', errMsg);
      throw e;
    }
  };

  const handleDeletePlan = async (product: Product, plan: ProductPlan) => {
    if (!confirm(`Are you sure you want to remove the plan "${plan.name}"?`)) {
      return;
    }
    try {
      if (isSuperAdmin || product.id === 'prod_org') {
        await subscriptionPlanApi.deleteSubscriptionPlan(plan.id);
        showToast('success', 'Plan Removed', `Deleted ${plan.name} from enterprise plans.`);
        await loadSubscriptionPlans();
        return;
      }

      await productPlanApi.deleteProductPlan(product.id, plan.id);
      showToast('success', 'Plan Removed', `Deleted ${plan.name} from ${product.name}.`);
      await loadProductPlans(product.id);
    } catch (e: any) {
      console.error('Delete Failed:', e);
      const errMsg = e?.response?.data?.message || e?.response?.data?.error?.message || e.message || 'Failed to delete plan.';
      showToast('error', 'Delete Failed', errMsg);
    }
  };

  const handleDuplicatePlan = (product: Product, plan: ProductPlan) => {
    // Open the form modal pre-filled with a copy of the plan data
    const duplicatedPlan: ProductPlan = {
      ...plan,
      id: '',  // Clear id so it saves as a new plan
      name: `${plan.name} (Copy)`,
      isPopular: false,
    };
    setPlanModalProductId(product.id);
    setEditingPlan(duplicatedPlan);
    setIsPlanModalOpen(true);
  };

  // -------------------------------------------------------------
  // CUSTOMER SUBSCRIPTION ACTIONS (Create, Edit, Renew, Delete via Live API)
  // -------------------------------------------------------------
  const [subPlanId, setSubPlanId] = useState('');

  const handleOpenAssignSubscription = (product?: Product, plan?: ProductPlan) => {
    setEditingSub(null);
    setSubCustomerId('');
    setSubCustomerName('');
    const targetProd = product || products[0];
    setSubProductId(targetProd ? targetProd.id : '');
    setSubPlanId(plan ? plan.id : '');
    setSubPlanName(plan ? plan.name : '');
    setSubBillingCycle(plan ? plan.billingCycle : 'Monthly');
    setSubAmount(plan ? plan.price : '');
    const today = new Date().toISOString().split('T')[0];
    setSubStartDate(today);
    setSubEndDate(computeEndDate(today, (plan ? plan.billingCycle : 'Monthly') || 'Monthly'));
    setSubAutoRenew(true);
    setSubStatus('Active');
    setSubNotes('');
    setIsSubModalOpen(true);
  };

  const handleOpenEditSubscription = (sub: SubscriptionItem) => {
    setEditingSub(sub);
    setSubCustomerId(sub.customerId || '');
    setSubCustomerName(sub.customerName || '');

    const matchedProd = products.find((p) => p.name === sub.productOrService || p.name === sub.productName || p.id === (sub as any).productId) || products[0];
    setSubProductId(matchedProd ? matchedProd.id : 'prod_1');
    const matchedPlan = matchedProd?.plans?.find((pl) => pl.name === sub.plan || pl.id === (sub as any).planId);
    setSubPlanId(matchedPlan?.id || (sub as any).planId || '');
    setSubPlanName(sub.plan || matchedPlan?.name || '');
    setSubBillingCycle(sub.billingCycle || 'Monthly');
    setSubAmount(sub.amount || 0);
    setSubStartDate(sub.startDate || new Date().toISOString().split('T')[0]);
    setSubEndDate(sub.endDate || '');
    setSubAutoRenew(sub.autoRenew ?? true);
    setSubStatus(sub.status || 'Active');
    setSubNotes(sub.notes || '');
    setIsSubModalOpen(true);
  };

  const handleProductChangeInSubModal = (prodId: string) => {
    setSubProductId(prodId);
    setSubPlanId('');
    setSubPlanName('');
    setSubAmount('');
    setSubBillingCycle('');
  };

  const handlePlanChangeInSubModal = (planNameOrId: string) => {
    const prod = products.find((p) => p.id === subProductId);
    const availablePlans = (subProductId && productPlansByProductId[subProductId]) || prod?.plans || [];
    const foundPlan = availablePlans.find((pl) => pl.name === planNameOrId || pl.id === planNameOrId);
    if (foundPlan) {
      setSubPlanId(foundPlan.id);
      setSubPlanName(foundPlan.name);
      setSubAmount(foundPlan.price);
      setSubBillingCycle(foundPlan.billingCycle);
      if (subStartDate) {
        setSubEndDate(computeEndDate(subStartDate, foundPlan.billingCycle));
      }
    } else {
      setSubPlanName(planNameOrId);
    }
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subCustomerId) {
      showToast('error', 'Validation Error', 'Please select a customer.');
      return;
    }
    if (!subProductId) {
      showToast('error', 'Validation Error', 'Please select a product.');
      return;
    }

    const prod = products.find((p) => p.id === subProductId);
    const availablePlans = (subProductId && productPlansByProductId[subProductId]) || prod?.plans || [];
    const resolvedPlan = availablePlans.find((pl) => pl.name === subPlanName || pl.id === subPlanId);

    try {
      if (editingSub) {
        await clientSubscriptionApi.updateClientSubscription(editingSub.id, {
          customerId: subCustomerId,
          productId: subProductId,
          planId: resolvedPlan?.id || (subPlanId || undefined),
          billingCycle: subBillingCycle || 'Monthly',
          amount: Number(subAmount) || 0,
          startDate: subStartDate || undefined,
          endDate: subEndDate || undefined,
          status: subStatus || 'Active',
          autoRenew: subAutoRenew,
          notes: subNotes || undefined,
        });
        showToast('success', 'Subscription Updated', `Updated terms for ${subCustomerName || 'customer'}`);
      } else {
        await clientSubscriptionApi.createClientSubscription({
          customerId: subCustomerId,
          productId: subProductId,
          planId: resolvedPlan?.id || (subPlanId || undefined),
          billingCycle: subBillingCycle || 'Monthly',
          amount: Number(subAmount) || 0,
          startDate: subStartDate || undefined,
          endDate: subEndDate || undefined,
          status: subStatus || 'Active',
          autoRenew: subAutoRenew,
          notes: subNotes || undefined,
        });
        showToast('success', 'Subscription Created', `Enrolled ${subCustomerName || 'customer'} in ${subPlanName || 'plan'}`);
      }
      setIsSubModalOpen(false);
      await loadClientSubscriptions();
    } catch (e: any) {
      console.error('Subscription save failed:', e);
      const errMsg = e?.response?.data?.message || e?.response?.data?.error?.message || e.message || 'Error occurred while saving subscription.';
      showToast('error', 'Save Failed', errMsg);
    }
  };

  const handleRenewSubscription = async (sub: SubscriptionItem) => {
    try {
      await clientSubscriptionApi.renewClientSubscription(sub.id, {
        billingCycle: sub.billingCycle,
        amount: sub.amount,
        notes: sub.notes || 'Renewed by admin',
      });
      showToast('success', 'Subscription Renewed', `Successfully renewed subscription for ${sub.customerName}`);
      await loadClientSubscriptions();
    } catch (e: any) {
      console.error('Subscription renewal failed:', e);
      const errMsg = e?.response?.data?.message || e?.response?.data?.error?.message || e.message || 'Renewal failed.';
      showToast('error', 'Renewal Failed', errMsg);
    }
  };

  const handleDeleteSubscription = async (sub: SubscriptionItem) => {
    if (!confirm(`Are you sure you want to delete/cancel the subscription for ${sub.customerName}?`)) return;
    try {
      await clientSubscriptionApi.deleteClientSubscription(sub.id);
      showToast('success', 'Subscription Removed', `Removed subscription for ${sub.customerName}`);
      await loadClientSubscriptions();
    } catch (e: any) {
      console.error('Subscription deletion failed:', e);
      const errMsg = e?.response?.data?.message || e?.response?.data?.error?.message || e.message || 'Cancellation failed.';
      showToast('error', 'Cancellation Failed', errMsg);
    }
  };

  // -------------------------------------------------------------
  // SUPER ADMIN: Organization Subscription Actions & Handlers
  // -------------------------------------------------------------
  const handleOpenCreateOrgSub = () => {
    loadAvailableOrganizations();
    if (apiPlans.length === 0) {
      loadSubscriptionPlans(1, 100);
    }
    setEditingOrgSub(null);
    setOrgSubOrgId('');
    setOrgSubOrgName('');
    setOrgSubOrgCode('');
    setOrgSubIndustry('');
    setOrgSubContactPerson('');
    setOrgSubEmail('');
    setOrgSubPhone('');
    setOrgSubWhatsapp('');
    setOrgSubPlan('');
    setOrgSubBillingCycle('');
    setOrgSubAmount(0);
    setOrgSubStartDate('');
    setOrgSubEndDate('');
    setOrgSubAutoRenew(false);
    setOrgSubNotes('');
    setIsOrgSubModalOpen(true);
  };

  const handleOpenEditOrgSub = (sub: OrgSubscriptionItem) => {
    loadAvailableOrganizations();
    if (apiPlans.length === 0) {
      loadSubscriptionPlans(1, 100);
    }
    setEditingOrgSub(sub);
    setOrgSubOrgId(sub.orgId);
    setOrgSubOrgName(sub.orgName);
    setOrgSubOrgCode(sub.orgCode);
    setOrgSubIndustry(sub.industry);
    setOrgSubContactPerson(sub.contactPerson);
    setOrgSubEmail(sub.email);
    setOrgSubPhone(sub.phone);
    setOrgSubWhatsapp(sub.whatsapp || sub.phone);
    setOrgSubPlan(sub.plan);
    setOrgSubBillingCycle(sub.billingCycle);
    setOrgSubAmount(sub.amount);
    setOrgSubStartDate(sub.startDate);
    setOrgSubEndDate(sub.endDate);
    setOrgSubAutoRenew(sub.autoRenew);
    setOrgSubNotes(sub.notes || '');
    setIsOrgSubModalOpen(true);
  };

  const handleSelectOrgInModal = (orgId: string) => {
    setOrgSubOrgId(orgId);
    if (!orgId || orgId === 'org_custom') {
      setOrgSubOrgName('');
      setOrgSubOrgCode('');
      setOrgSubIndustry('');
      setOrgSubContactPerson('');
      setOrgSubEmail('');
      setOrgSubPhone('');
      setOrgSubWhatsapp('');
      return;
    }
    const org = availableOrgs.find((o) => o.id === orgId);
    if (org) {
      setOrgSubOrgName(org.name);
      setOrgSubOrgCode(org.code);
      setOrgSubIndustry((org as any).industry || org.organizationType || '');
      setOrgSubContactPerson((org as any).contactPerson || org.user?.name || org.legalName || '');
      setOrgSubEmail(org.email || org.user?.email || '');
      setOrgSubPhone(org.phone || org.user?.phone || '');
      setOrgSubWhatsapp((org as any).whatsapp || org.phone || org.user?.phone || '');
    }
  };

  const handlePlanChangeInOrgModal = (planName: string) => {
    setOrgSubPlan(planName);
    const foundApiPlan = apiPlans.find((p) => p.name === planName);
    if (foundApiPlan) {
      setOrgSubPlanId(foundApiPlan.id);
      const monthly = foundApiPlan.monthlyPrice || 0;
      const annual = foundApiPlan.annualPrice || (monthly * 10);
      setOrgSubAmount(orgSubBillingCycle === 'Annually' ? annual : monthly);
    } else {
      const found = orgPlans.find((p) => p.name === planName);
      if (found) {
        setOrgSubPlanId(found.id);
        const monthly = found.price || 0;
        const annual = monthly * 10;
        setOrgSubAmount(orgSubBillingCycle === 'Annually' ? annual : monthly);
      } else {
        setOrgSubAmount(0);
      }
    }
  };

  // Auto-compute end date based on start date and billing cycle
  const computeEndDate = (startDate: string, cycle: string): string => {
    if (!startDate) return '';
    const d = new Date(startDate);
    if (isNaN(d.getTime())) return '';
    if (cycle === 'Annually') {
      d.setFullYear(d.getFullYear() + 1);
    } else if (cycle === 'Quarterly') {
      d.setMonth(d.getMonth() + 3);
    } else if (cycle === 'Monthly') {
      d.setMonth(d.getMonth() + 1);
    } else {
      d.setMonth(d.getMonth() + 1); // One-Time or unknown
    }
    return d.toISOString().split('T')[0];
  };

  const handleBillingCycleChangeInOrgModal = (cycle: string) => {
    setOrgSubBillingCycle(cycle);
    // Auto-set end date from start date + new cycle
    if (orgSubStartDate) {
      setOrgSubEndDate(computeEndDate(orgSubStartDate, cycle));
    }
    const foundApiPlan = apiPlans.find((p) => p.name === orgSubPlan);
    if (foundApiPlan) {
      const monthly = foundApiPlan.monthlyPrice || 0;
      const annual = foundApiPlan.annualPrice || (monthly * 12);
      setOrgSubAmount(cycle === 'Annually' ? annual : monthly);
    } else {
      const found = orgPlans.find((p) => p.name === orgSubPlan);
      if (found) {
        const monthly = found.price || 0;
        const annual = monthly * 12;
        setOrgSubAmount(cycle === 'Annually' ? annual : monthly);
      }
    }
  };

  const handleSaveOrgSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgSubOrgId || orgSubOrgId === 'org_custom') {
      showToast('error', 'Validation Error', 'Please select a registered organization from the system.');
      return;
    }
    const resolvedPlan = apiPlans.find((p) => p.name === orgSubPlan || p.id === orgSubPlanId);
    if (!resolvedPlan) {
      showToast('error', 'Validation Error', 'Please select a valid subscription plan.');
      return;
    }
    if (!orgSubBillingCycle) {
      showToast('error', 'Validation Error', 'Please select a billing cycle.');
      return;
    }
    if (!orgSubStartDate) {
      showToast('error', 'Validation Error', 'Please select a start date.');
      return;
    }

    try {
      await organizationSubscriptionApi.createOrganizationSubscription({
        organizationId: orgSubOrgId,
        planId: resolvedPlan.id,
        billingCycle: orgSubBillingCycle,
        startDate: orgSubStartDate,
        endDate: orgSubEndDate || undefined,
        autoRenew: orgSubAutoRenew,
        notes: orgSubNotes || undefined,
      });
      showToast('success', 'Subscription Created', `Enrolled ${orgSubOrgName || 'organization'} in ${resolvedPlan.name}`);
      setIsOrgSubModalOpen(false);
      await loadOrganizationSubscriptions();
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.response?.data?.message || err?.response?.data?.error?.message || err.message || 'Failed to create subscription';
      showToast('error', 'Subscription Failed', errMsg);
    }
  };

  const handleRenewOrgSubscription = async (sub: OrgSubscriptionItem) => {
    try {
      await organizationSubscriptionApi.renewOrganizationSubscription(sub.id, {
        billingCycle: sub.billingCycle,
        autoRenew: sub.autoRenew,
      });
      showToast('success', 'Subscription Renewed', `Successfully renewed subscription for ${sub.orgName}.`);
      await loadOrganizationSubscriptions();
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.response?.data?.message || err?.response?.data?.error?.message || err.message || 'Failed to renew subscription';
      showToast('error', 'Renewal Failed', errMsg);
    }
  };

  const handleDeleteOrgSubscription = async (sub: OrgSubscriptionItem) => {
    if (!confirm(`Are you sure you want to cancel the subscription for ${sub.orgName}?`)) return;
    try {
      await organizationSubscriptionApi.cancelOrganizationSubscription(sub.id, {
        reason: 'Cancelled by platform administrator',
      });
      showToast('success', 'Subscription Cancelled', `Cancelled subscription for ${sub.orgName}`);
      await loadOrganizationSubscriptions();
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.response?.data?.message || err?.response?.data?.error?.message || err.message || 'Failed to cancel subscription';
      showToast('error', 'Cancellation Failed', errMsg);
    }
  };

  const getOrgPlanBadge = (planName: string) => {
    const normalized = (planName || '').trim().toLowerCase();
    let dotColor = 'bg-indigo-600';
    let textColor = 'text-indigo-900';

    if (normalized.includes('diamond')) {
      dotColor = 'bg-cyan-500';
      textColor = 'text-slate-900';
    } else if (normalized.includes('platinum')) {
      dotColor = 'bg-purple-600';
      textColor = 'text-slate-900';
    } else if (normalized.includes('gold')) {
      dotColor = 'bg-amber-500';
      textColor = 'text-slate-900';
    } else if (normalized.includes('silver')) {
      dotColor = 'bg-slate-400';
      textColor = 'text-slate-900';
    } else if (normalized.includes('bronze')) {
      dotColor = 'bg-orange-500';
      textColor = 'text-slate-900';
    }

    return (
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
        <span className={`text-xs sm:text-[13px] font-bold ${textColor}`}>
          {planName}
        </span>
      </div>
    );
  };

  // Map live API Organization Subscriptions into OrgSubscriptionItem format
  const mappedOrgSubs: OrgSubscriptionItem[] = useMemo(() => {
    return apiOrgSubs.map((item) => ({
      id: item.id,
      orgId: item.organizationId,
      orgName: item.orgName || 'Organization',
      orgCode: item.orgCode || '',
      industry: item.industry || '',
      contactPerson: item.contactPerson || '',
      email: item.email || '',
      phone: item.phone || '',
      planId: item.planId,
      plan: item.planName || 'Plan',
      billingCycle: (item.billingCycle as BillingCycle) || 'Monthly',
      amount: item.amount,
      startDate: item.startDate,
      endDate: item.endDate,
      status: (item.status as any) || 'Active',
      autoRenew: !!item.autoRenew,
      notes: item.notes || '',
      subscriptionNumber: item.subscriptionNumber,
    }));
  }, [apiOrgSubs]);

  const totalOrgSubsPages = Math.max(1, Math.ceil(apiOrgSubsTotal / orgSubsPageSize));
  const safeOrgSubsPage = Math.min(orgSubsPage, totalOrgSubsPages);

  // -------------------------------------------------------------
  // NORMALIZERS & BADGES (Matching reference image)
  // -------------------------------------------------------------
  const formatDisplayDate = (dateStr?: string): string => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const formatDisplaySubId = (rawId?: string, fallbackIdx = 101): string => {
    if (!rawId) return `SUB-${fallbackIdx}`;
    if (rawId.startsWith('SUB-')) return rawId;
    const cleanNum = rawId.replace(/[^0-9]/g, '');
    if (cleanNum) return `SUB-${cleanNum.length > 4 ? cleanNum.slice(-3) : cleanNum}`;
    return `SUB-${fallbackIdx}`;
  };

  const getProductDotColor = (name?: string): string => {
    const lower = (name || '').toLowerCase();
    if (lower.includes('yaa')) return 'bg-blue-600';
    if (lower.includes('motez')) return 'bg-emerald-600';
    if (lower.includes('dentq') || lower.includes('dent')) return 'bg-cyan-600';
    if (lower.includes('aarudam') || lower.includes('ai')) return 'bg-purple-600';
    if (lower.includes('turfy')) return 'bg-amber-600';
    if (lower.includes('marketing') || lower.includes('digital')) return 'bg-rose-600';
    return 'bg-indigo-600';
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-50 text-emerald-600 font-bold';
      case 'Expiring Soon':
        return 'bg-amber-50 text-amber-600 font-bold';
      case 'Expired':
        return 'bg-rose-50 text-rose-600 font-bold';
      case 'Cancelled':
        return 'bg-slate-100 text-slate-600 font-bold';
      case 'Onboarding':
      case 'Onboard':
        return 'bg-cyan-50 text-cyan-600 font-bold';
      default:
        return 'bg-cyan-50 text-cyan-600 font-bold';
    }
  };

  // -------------------------------------------------------------
  // ALL PLANS FLATTENED & FILTERED
  // -------------------------------------------------------------
  const allPlansWithProduct = useMemo(() => {
    if (isSuperAdmin) {
      // In Super Admin, show the dynamic Yaa Organization Plans
      return orgPlans.map((op) => ({
        plan: op,
        product: {
          id: 'prod_org',
          name: 'Yaa Enterprise Platform',
          code: 'YAA_PLATFORM',
          plans: [],
        } as any,
      }));
    }

    return products.flatMap((product) =>
      (product.plans || []).map((plan) => ({
        plan,
        product,
      }))
    );
  }, [products, isSuperAdmin, orgPlans]);

  const filteredPlansList = useMemo(() => {
    return allPlansWithProduct.filter(({ plan, product }) => {
      const q = appliedPlanSearch.toLowerCase().trim();
      const planType = (plan.pricingType || plan.tier || (plan.customizablePrice ? 'Custom' : 'Fixed')).toLowerCase();
      const matchesSearch =
        q === '' ||
        plan.name.toLowerCase().includes(q) ||
        product.name.toLowerCase().includes(q) ||
        (plan.description && plan.description.toLowerCase().includes(q)) ||
        (plan.billingCycle && plan.billingCycle.toLowerCase().includes(q)) ||
        planType.includes(q) ||
        String(plan.price).includes(q);

      const matchesStatus =
        appliedPlanStatus === 'ALL' || (plan.status || 'Active') === appliedPlanStatus;

      return matchesSearch && matchesStatus;
    });
  }, [allPlansWithProduct, appliedPlanSearch, appliedPlanStatus]);

  const totalPlansPages = isSuperAdmin
    ? Math.max(1, Math.ceil(apiPlansTotal / plansPageSize))
    : Math.max(1, Math.ceil(filteredPlansList.length / plansPageSize));
  const safePlansPage = Math.min(plansPage, totalPlansPages);
  const pagedPlans = useMemo(() => {
    if (isSuperAdmin) {
      return allPlansWithProduct;
    }
    return filteredPlansList.slice((safePlansPage - 1) * plansPageSize, safePlansPage * plansPageSize);
  }, [isSuperAdmin, allPlansWithProduct, filteredPlansList, safePlansPage, plansPageSize]);

  // Map API client subscriptions to SubscriptionItem model
  const mappedClientSubs = useMemo<SubscriptionItem[]>(() => {
    return apiClientSubs.map((item) => {
      const custName = item.customer?.company || item.customer?.name || 'Client';
      const prodName = item.product?.name || 'CRM Product';
      const planName = item.plan?.name || item.billingCycle || 'Standard';

      return {
        id: item.id,
        customerId: item.customerId,
        customerName: custName,
        productOrService: prodName,
        productName: prodName,
        plan: planName,
        billingCycle: (item.billingCycle as BillingCycle) || 'Monthly',
        amount: item.amount || 0,
        startDate: item.startDate || '',
        endDate: item.endDate || '',
        status: (item.status as SubscriptionStatus) || 'Active',
        autoRenew: item.autoRenew ?? true,
        notes: item.notes || '',
        daysRemaining: item.daysRemaining,
        subscriptionNumber: item.subscriptionNumber,
        customer: item.customer,
        product: item.product,
      } as any;
    });
  }, [apiClientSubs]);

  const totalSubsPages = Math.max(1, Math.ceil(apiClientSubsTotal / subsPageSize));
  const safeSubsPage = Math.min(subsPage, totalSubsPages);
  const pagedSubs = mappedClientSubs;

  const totalPlansCount = products.reduce((acc, p) => acc + (p.plans?.length || 0), 0);

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200 pb-12 font-sans">
      {/* 1. Top Header Row with Title on Left and Action Buttons on Right */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
              {isSuperAdmin ? (
                viewMode === 'subscriptions' ? (
                  <Building2 className="w-4.5 h-4.5" />
                ) : (
                  <Boxes className="w-4.5 h-4.5" />
                )
              ) : (
                <Repeat className="w-4.5 h-4.5" />
              )}
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {isSuperAdmin
                ? (viewMode === 'subscriptions' ? 'Organization Subscriptions' : 'Subscription Plans')
                : (viewMode === 'plans' ? 'Select Product Offering' : 'Client Subscriptions List')}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            {isSuperAdmin
              ? (viewMode === 'subscriptions'
                ? 'Manage recurring organization subscriptions, assigned platform plans, and renewal cycles.'
                : 'Streamline product plans, flexible pricing tiers, and manage recurring client subscriptions.')
              : (viewMode === 'plans'
                ? 'Filter by product suite to view and manage its subscription plan tiers.'
                : 'Manage recurring client subscriptions, assigned product plans, and renewal cycles.')}
          </p>
        </div>

        {/* Top Right Action Button */}
        {!isSuperAdmin ? (
          <div className="flex items-center gap-3 shrink-0">
            {viewMode === 'subscriptions' && (
              <Button
                variant="primary"
                size="md"
                onClick={() => handleOpenAssignSubscription()}
                icon={<UserPlus className="w-4 h-4 text-white" />}
              >
                Assign Subscription
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {viewMode === 'subscriptions' ? (
              <Button
                variant="primary"
                size="md"
                onClick={handleOpenCreateOrgSub}
                icon={<Plus className="w-4 h-4" strokeWidth={2.5} />}
              >
                New Subscription
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={() => handleOpenCreatePlan()}
                icon={<Plus className="w-4 h-4" strokeWidth={2.5} />}
              >
                Add Plan
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Standalone Centered View Switcher (Below the Card) */}
      {!lockMode && (
        <div className="flex justify-center items-center w-full">
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => setViewMode('plans')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer flex items-center gap-2 ${viewMode === 'plans'
                ? 'bg-[#33077C] text-white shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}
            >
              {viewMode === 'plans' && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
              <span>Product Subscription Plans</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('subscriptions')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer flex items-center gap-2 ${viewMode === 'subscriptions'
                ? 'bg-[#33077C] text-white shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}
            >
              {viewMode === 'subscriptions' && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
              <span>Client Subscriptions List</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: SUBSCRIPTIONS TABLE (SuperAdmin: Org / Admin: Client)*/}
      {/* ========================================================= */}
      {viewMode === 'subscriptions' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {isSuperAdmin ? (
            // =========================================================
            // SUPER ADMIN: Organization Subscriptions Table & Filters
            // =========================================================
            <>
              {/* Search Bar & Dropdown Filter Row */}
              <SearchBar
                value={pendingSubSearch}
                onChange={(val) => setPendingSubSearch(val)}
                placeholder="Search subscriptions by organization name, plan, contact..."
                onSubmit={() => {
                  setAppliedSubSearch(pendingSubSearch);
                  setAppliedOrgPlan(pendingOrgPlan);
                  setAppliedSubStatus(pendingSubStatus);
                  setOrgSubsPage(1);
                }}
                onReset={() => {
                  setPendingSubSearch('');
                  setAppliedSubSearch('');
                  setPendingOrgPlan('ALL');
                  setAppliedOrgPlan('ALL');
                  setPendingSubStatus('ALL');
                  setAppliedSubStatus('ALL');
                  setOrgSubsPage(1);
                }}
                filterSlot={
                  <div className="flex items-center gap-2.5">
                    {/* Plan Filter Dropdown */}
                    <FilterDropdown
                      options={[
                        { label: 'Plan : All', value: 'ALL' },
                        ...orgPlans.map((p) => ({
                          label: p.name,
                          value: p.name,
                        })),
                      ]}
                      value={pendingOrgPlan}
                      onChange={(val) => setPendingOrgPlan(val)}
                      placeholder="Plan : All"
                    />

                    {/* Status Dropdown */}
                    <FilterDropdown
                      options={[
                        { label: 'Status : All', value: 'ALL' },
                        { label: 'Active', value: 'Active', dotColor: '#10b981' },
                        { label: 'Expiring Soon', value: 'Expiring Soon', dotColor: '#f59e0b' },
                        { label: 'Expired', value: 'Expired', dotColor: '#f43f5e' },
                        { label: 'Cancelled', value: 'Cancelled', dotColor: '#64748b' },
                      ]}
                      value={pendingSubStatus}
                      onChange={(val) => setPendingSubStatus(val)}
                      placeholder="Status : All"
                    />
                  </div>
                }
                rightSlot={
                  <span className="text-xs font-semibold text-slate-500 pr-2">
                    Total Subscriptions :{' '}
                    <span className="text-[#33077C] font-bold">{apiOrgSubsTotal}</span>
                  </span>
                }
              />

              {/* Organization Subscriptions Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-slate-200 min-w-[950px]">
                    <thead>
                      <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white tracking-wider uppercase">
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">ORGANIZATION</th>
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">PLAN</th>
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">START DATE</th>
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">EXPIRY DATE</th>
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">AMOUNT</th>
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">STATUS</th>
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {isOrgSubsLoading ? (
                        <tr>
                          <td colSpan={7} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <div className="w-7 h-7 border-3 border-[#33077C] border-t-transparent rounded-full animate-spin" />
                              <span className="text-xs text-slate-500 font-medium">Loading organization subscriptions...</span>
                            </div>
                          </td>
                        </tr>
                      ) : mappedOrgSubs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                            No organization subscriptions found matching your criteria.
                          </td>
                        </tr>
                      ) : (
                        mappedOrgSubs.map((sub) => {
                          return (
                            <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                              {/* 1. Organization */}
                              <td className="py-4 px-5 border border-slate-200">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-[#33077C] text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-xs shrink-0">
                                    {(sub.orgName || 'OR').replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase() || 'OR'}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-slate-900 text-sm">{sub.orgName}</span>
                                      {sub.orgCode && (
                                        <span className="text-xs font-semibold text-[#4309A2]">({sub.orgCode})</span>
                                      )}
                                    </div>
                                    {sub.contactPerson && (
                                      <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                                        {sub.contactPerson}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* 2. Plan */}
                              <td className="py-4 px-5 border border-slate-200">
                                {getOrgPlanBadge(sub.plan)}
                              </td>

                              {/* 3. Start Date */}
                              <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                                <span className="text-xs sm:text-[13px] font-medium text-slate-700">
                                  {formatDisplayDate(sub.startDate)}
                                </span>
                              </td>

                              {/* 4. Expiry / Next Billing Date */}
                              <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                                <span className="text-xs sm:text-[13px] font-semibold text-slate-900 block">
                                  {formatDisplayDate(sub.endDate)}
                                </span>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className={`w-1.5 h-1.5 rounded-full ${sub.autoRenew ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                  <span className="text-[11px] text-slate-500 font-medium">
                                    {sub.autoRenew ? 'Auto-Renew: On' : 'Auto-Renew: Off'}
                                  </span>
                                </div>
                              </td>

                              {/* 5. Amount */}
                              <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                                <p className="font-bold text-slate-900 text-xs sm:text-[14px]">
                                  ₹{sub.amount.toLocaleString()}{' '}
                                  <span className="text-[11px] text-slate-500 font-normal">/ {sub.billingCycle}</span>
                                </p>
                              </td>

                              {/* 6. Status */}
                              <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs ${getStatusBadgeClass(sub.status)}`}>
                                  {sub.status}
                                </span>
                              </td>

                              {/* 7. Action (3-Dots Menu) */}
                              <td className="py-4 px-5 border border-slate-200 text-center">
                                <div className="relative inline-block text-left org-action-dropdown-container">
                                  <button
                                    type="button"
                                    title="Subscription Actions"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (activeOrgDropdownId === sub.id) {
                                        setActiveOrgDropdownId(null);
                                        setOrgDropdownPos(null);
                                      } else {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const spaceBelow = window.innerHeight - rect.bottom;
                                        const dropdownHeight = 160;
                                        const rightPos = window.innerWidth - rect.right;

                                        if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
                                          setOrgDropdownPos({
                                            bottom: window.innerHeight - rect.top + 6,
                                            right: rightPos,
                                          });
                                        } else {
                                          setOrgDropdownPos({
                                            top: rect.bottom + 6,
                                            right: rightPos,
                                          });
                                        }
                                        setActiveOrgDropdownId(sub.id);
                                      }
                                    }}
                                    className="w-8 h-8 rounded-lg bg-[#33077C] hover:bg-[#432fb3] flex items-center justify-center text-white shadow-xs transition-all hover:scale-105 active:scale-95 mx-auto cursor-pointer"
                                  >
                                    <MoreVertical className="w-4 h-4 fill-white" />
                                  </button>

                                  {/* Portal Dropdown Menu */}
                                  {activeOrgDropdownId === sub.id && orgDropdownPos && (
                                    <div
                                      className="org-action-dropdown-menu fixed z-50 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 py-3 px-2 animate-in fade-in zoom-in-95 duration-100"
                                      style={{
                                        top: orgDropdownPos.top !== undefined ? `${orgDropdownPos.top}px` : undefined,
                                        bottom: orgDropdownPos.bottom !== undefined ? `${orgDropdownPos.bottom}px` : undefined,
                                        right: `${orgDropdownPos.right}px`,
                                      }}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveOrgDropdownId(null);
                                          handleRenewOrgSubscription(sub);
                                        }}
                                        className="w-full px-3 py-2 text-left text-[13px] font-bold text-slate-800 hover:bg-slate-50 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                                      >
                                        <span
                                          style={{ width: '26.25px', height: '26.25px' }}
                                          className="rounded-full bg-[#F59E0B] flex items-center justify-center shrink-0 shadow-2xs"
                                        >
                                          <History style={{ width: '13.13px', height: '13.13px' }} className="text-white stroke-[2.2]" />
                                        </span>
                                        <span>Renew</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveOrgDropdownId(null);
                                          handleOpenEditOrgSub(sub);
                                        }}
                                        className="w-full px-3 py-2 text-left text-[13px] font-bold text-slate-800 hover:bg-slate-50 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                                      >
                                        <span
                                          style={{ width: '26.25px', height: '26.25px' }}
                                          className="rounded-full bg-[#3B82F6] flex items-center justify-center shrink-0 shadow-2xs"
                                        >
                                          <Pencil style={{ width: '13.13px', height: '13.13px' }} className="text-white stroke-[2.2]" />
                                        </span>
                                        <span>Edit</span>
                                      </button>

                                      <div className="my-1.5 mx-2 border-t border-slate-100" />

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveOrgDropdownId(null);
                                          handleDeleteOrgSubscription(sub);
                                        }}
                                        className="w-full px-3 py-2 text-left text-[13px] font-bold text-[#E11D48] hover:bg-rose-50/70 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                                      >
                                        <span
                                          style={{ width: '26.25px', height: '26.25px' }}
                                          className="rounded-full bg-[#E11D48] flex items-center justify-center shrink-0 shadow-2xs"
                                        >
                                          <Trash2 style={{ width: '13.13px', height: '13.13px' }} className="text-white stroke-[2.2]" />
                                        </span>
                                        <span>Cancel Subscription</span>
                                      </button>
                                    </div>
                                  )}
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

              {/* Pagination Card */}
              {apiOrgSubsTotal > 0 && (
                <Pagination
                  currentPage={safeOrgSubsPage}
                  total={apiOrgSubsTotal}
                  pageSize={orgSubsPageSize}
                  onPageChange={(page) => setOrgSubsPage(page)}
                  onPageSizeChange={(size) => {
                    setOrgSubsPageSize(size);
                    setOrgSubsPage(1);
                  }}
                />
              )}
            </>
          ) : (
            // =========================================================
            // ADMIN & STAFF: Original Client Subscriptions Table
            // =========================================================
            <>
              {/* Search Bar & Dropdown Filter Row */}
              <SearchBar
                value={pendingSubSearch}
                onChange={(val) => setPendingSubSearch(val)}
                placeholder="Search subscriptions by client name, product, plan tier, ID..."
                onSubmit={() => {
                  setAppliedSubSearch(pendingSubSearch);
                  setAppliedSubProduct(pendingSubProduct);
                  setAppliedSubStatus(pendingSubStatus);
                  setSubsPage(1);
                }}
                onReset={() => {
                  setPendingSubSearch('');
                  setAppliedSubSearch('');
                  setPendingSubProduct('ALL');
                  setAppliedSubProduct('ALL');
                  setPendingSubStatus('ALL');
                  setAppliedSubStatus('ALL');
                  setSubsPage(1);
                }}
                filterSlot={
                  <div className="flex items-center gap-2.5">
                    {/* Product Dropdown */}
                    <FilterDropdown
                      options={[
                        { label: 'Product : All', value: 'ALL' },
                        ...products.map((p) => ({
                          label: p.name,
                          value: p.name,
                        })),
                      ]}
                      value={pendingSubProduct}
                      onChange={(val) => setPendingSubProduct(val)}
                      placeholder="Product : All"
                    />

                    {/* Status Dropdown */}
                    <FilterDropdown
                      options={[
                        { label: 'Status : All', value: 'ALL' },
                        { label: 'Active', value: 'Active', dotColor: '#10b981' },
                        { label: 'Expiring Soon', value: 'Expiring Soon', dotColor: '#f59e0b' },
                        { label: 'Expired', value: 'Expired', dotColor: '#f43f5e' },
                        { label: 'Cancelled', value: 'Cancelled', dotColor: '#64748b' },
                      ]}
                      value={pendingSubStatus}
                      onChange={(val) => setPendingSubStatus(val)}
                      placeholder="Status : All"
                    />
                  </div>
                }
                rightSlot={
                  <div className="flex items-center gap-3 pr-1">
                    <span className="text-xs font-semibold text-slate-500">
                      Total Subscriptions :{' '}
                      <span className="text-[#33077C] font-bold">{apiClientSubsTotal}</span>
                    </span>
                  </div>
                }
              />

              {/* Subscriptions Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-slate-200 min-w-[950px]">
                    <thead>
                      <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white tracking-wider uppercase">
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">SUBSCRIPTION & CLIENT</th>
                        <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-center">CONTACT INFO</th>
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">PRODUCT & OFFERING</th>
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">PLAN & PRICING</th>
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">STATUS & CYCLE</th>
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">NEXT RENEWAL</th>
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {isClientSubsLoading ? (
                        <tr>
                          <td colSpan={7} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <div className="w-7 h-7 border-3 border-[#33077C] border-t-transparent rounded-full animate-spin" />
                              <span className="text-xs text-slate-500 font-medium">Loading client subscriptions...</span>
                            </div>
                          </td>
                        </tr>
                      ) : pagedSubs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                            No subscriptions found matching your criteria.
                          </td>
                        </tr>
                      ) : (
                        pagedSubs.map((sub: any, idx) => {
                          const prodName = sub.product?.name || sub.productOrService || sub.productName || 'CRM Product';
                          const matchedCust = customers.find(
                            (c) => c.id === sub.customerId || (sub.customer?.id && c.id === sub.customer.id)
                          );
                          const displayId = sub.subscriptionNumber || formatDisplaySubId(sub.id, (safeSubsPage - 1) * subsPageSize + 101 + idx);
                          const contactName = sub.customer?.name || matchedCust?.contactPerson || 'Primary Account Holder';
                          const phone = sub.customer?.phone || matchedCust?.phone || '+1 (555) 234-5678';
                          const whatsapp = (matchedCust as any)?.whatsapp || phone;
                          const email = sub.customer?.email || matchedCust?.email || 'contact@client.com';

                          return (
                            <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                              {/* 1. Client & ID */}
                              <td className="py-4 px-5 border border-slate-200">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-slate-900 text-sm">{sub.customerName}</span>
                                  <span className="text-xs font-semibold text-[#4309A2]">({displayId})</span>
                                </div>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                  {contactName}
                                </p>
                              </td>

                              {/* 2. Contact Info Actions */}
                              <td className="py-4 px-4 border border-slate-200">
                                <div className="flex items-center justify-center gap-2">
                                  {/* Phone */}
                                  <div className="relative group">
                                    <button
                                      type="button"
                                      onClick={(e) => handleCopy(e, phone, `${sub.id}-phone`)}
                                      className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors cursor-pointer"
                                    >
                                      <Phone className="w-3.5 h-3.5" />
                                    </button>
                                    <div className={`transition-all duration-200 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 text-white text-[11px] font-semibold rounded-lg shadow-lg whitespace-nowrap z-30 ${copiedKey === `${sub.id}-phone`
                                      ? 'opacity-100 bg-emerald-600 scale-100'
                                      : 'opacity-0 group-hover:opacity-100 bg-slate-900'
                                      }`}>
                                      {copiedKey === `${sub.id}-phone` ? 'Phone number copied' : phone}
                                    </div>
                                  </div>

                                  {/* WhatsApp */}
                                  <div className="relative group">
                                    <button
                                      type="button"
                                      onClick={(e) => handleCopy(e, whatsapp || phone, `${sub.id}-wa`)}
                                      className="w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors cursor-pointer"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" />
                                    </button>
                                    <div className={`transition-all duration-200 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 text-white text-[11px] font-semibold rounded-lg shadow-lg whitespace-nowrap z-30 ${copiedKey === `${sub.id}-wa`
                                      ? 'opacity-100 bg-emerald-600 scale-100'
                                      : 'opacity-0 group-hover:opacity-100 bg-slate-900'
                                      }`}>
                                      {copiedKey === `${sub.id}-wa` ? 'WhatsApp number copied' : (whatsapp || phone)}
                                    </div>
                                  </div>

                                  {/* Email */}
                                  <div className="relative group">
                                    <button
                                      type="button"
                                      onClick={(e) => handleCopy(e, email, `${sub.id}-email`)}
                                      className="w-8 h-8 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-600 flex items-center justify-center transition-colors cursor-pointer"
                                    >
                                      <Mail className="w-3.5 h-3.5" />
                                    </button>
                                    <div className={`transition-all duration-200 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 text-white text-[11px] font-semibold rounded-lg shadow-lg whitespace-nowrap z-30 ${copiedKey === `${sub.id}-email`
                                      ? 'opacity-100 bg-emerald-600 scale-100'
                                      : 'opacity-0 group-hover:opacity-100 bg-slate-900'
                                      }`}>
                                      {copiedKey === `${sub.id}-email` ? 'Email address copied' : email}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* 3. Product & Offering */}
                              <td className="py-4 px-5 border border-slate-200">
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Offering</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${getProductDotColor(prodName)}`} />
                                  <span className="font-bold text-slate-900 text-xs sm:text-[13px]">{prodName}</span>
                                </div>
                              </td>

                              {/* 4. Plan & Fee */}
                              <td className="py-4 px-5 border border-slate-200">
                                <p className="font-bold text-[#33077C] text-xs sm:text-[13px]">{sub.plan}</p>
                                <p className="text-xs font-bold text-slate-900 mt-0.5">
                                  ₹{Number(sub.amount || 0).toLocaleString()} <span className="text-[11px] text-slate-500 font-normal">/ {sub.billingCycle}</span>
                                </p>
                              </td>

                              {/* 5. Status & Priority / Cycle */}
                              <td className="py-4 px-5 border border-slate-200">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs ${getStatusBadgeClass(sub.status)}`}>
                                  {sub.status}
                                </span>
                                <p className="text-[11px] text-slate-400 font-medium mt-1">
                                  Cycle: {sub.billingCycle}
                                </p>
                              </td>

                              {/* 6. Renewal Date */}
                              <td className="py-4 px-5 border border-slate-200">
                                <div className="flex items-center gap-2 text-xs sm:text-[13px] font-medium text-slate-700">
                                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                                  <span>{sub.endDate}</span>
                                </div>
                                <span className="text-[11px] text-slate-400 block mt-0.5 pl-6">
                                  Since: {formatDisplayDate(sub.startDate)}
                                </span>
                              </td>

                              {/* 7. Action (3-Dots Menu) */}
                              <td className="py-4 px-5 border border-slate-200 text-center">
                                <div className="relative inline-block text-left client-sub-action-dropdown-container">
                                  <button
                                    type="button"
                                    title="Subscription Actions"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (activeClientSubDropdownId === sub.id) {
                                        setActiveClientSubDropdownId(null);
                                        setClientSubDropdownPos(null);
                                      } else {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const spaceBelow = window.innerHeight - rect.bottom;
                                        const dropdownHeight = 160;
                                        const rightPos = window.innerWidth - rect.right;

                                        if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
                                          setClientSubDropdownPos({
                                            bottom: window.innerHeight - rect.top + 6,
                                            right: rightPos,
                                          });
                                        } else {
                                          setClientSubDropdownPos({
                                            top: rect.bottom + 6,
                                            right: rightPos,
                                          });
                                        }
                                        setActiveClientSubDropdownId(sub.id);
                                      }
                                    }}
                                    className="w-8 h-8 rounded-lg bg-[#33077C] hover:bg-[#432fb3] flex items-center justify-center text-white shadow-xs transition-all hover:scale-105 active:scale-95 mx-auto cursor-pointer"
                                  >
                                    <MoreVertical className="w-4 h-4 fill-white" />
                                  </button>

                                  {/* Portal Dropdown Menu */}
                                  {activeClientSubDropdownId === sub.id && clientSubDropdownPos && (
                                    <div
                                      className="client-sub-action-dropdown-menu fixed z-50 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 py-3 px-2 animate-in fade-in zoom-in-95 duration-100"
                                      style={{
                                        top: clientSubDropdownPos.top !== undefined ? `${clientSubDropdownPos.top}px` : undefined,
                                        bottom: clientSubDropdownPos.bottom !== undefined ? `${clientSubDropdownPos.bottom}px` : undefined,
                                        right: `${clientSubDropdownPos.right}px`,
                                      }}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveClientSubDropdownId(null);
                                          handleRenewSubscription(sub);
                                        }}
                                        className="w-full px-3 py-2 text-left text-[13px] font-bold text-slate-800 hover:bg-slate-50 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                                      >
                                        <span
                                          style={{ width: '26.25px', height: '26.25px' }}
                                          className="rounded-full bg-[#4309A2] flex items-center justify-center shrink-0 shadow-2xs"
                                        >
                                          <History style={{ width: '13.13px', height: '13.13px' }} className="text-white stroke-[2.2]" />
                                        </span>
                                        <span>Renew</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveClientSubDropdownId(null);
                                          handleOpenEditSubscription(sub);
                                        }}
                                        className="w-full px-3 py-2 text-left text-[13px] font-bold text-slate-800 hover:bg-slate-50 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                                      >
                                        <span
                                          style={{ width: '26.25px', height: '26.25px' }}
                                          className="rounded-full bg-[#3B82F6] flex items-center justify-center shrink-0 shadow-2xs"
                                        >
                                          <Pencil style={{ width: '13.13px', height: '13.13px' }} className="text-white stroke-[2.2]" />
                                        </span>
                                        <span>Edit</span>
                                      </button>

                                      <div className="my-1.5 mx-2 border-t border-slate-100" />

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveClientSubDropdownId(null);
                                          handleDeleteSubscription(sub);
                                        }}
                                        className="w-full px-3 py-2 text-left text-[13px] font-bold text-[#E11D48] hover:bg-rose-50/70 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                                      >
                                        <span
                                          style={{ width: '26.25px', height: '26.25px' }}
                                          className="rounded-full bg-[#E11D48] flex items-center justify-center shrink-0 shadow-2xs"
                                        >
                                          <Trash2 style={{ width: '13.13px', height: '13.13px' }} className="text-white stroke-[2.2]" />
                                        </span>
                                        <span>Delete</span>
                                      </button>
                                    </div>
                                  )}
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

              {/* Pagination Card */}
              {apiClientSubsTotal > 0 && (
                <Pagination
                  currentPage={safeSubsPage}
                  total={apiClientSubsTotal}
                  pageSize={subsPageSize}
                  onPageChange={(page) => setSubsPage(page)}
                  onPageSizeChange={(size) => {
                    setSubsPageSize(size);
                    setSubsPage(1);
                  }}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: PRODUCT PLANS & FLEXIBLE PRICING                   */}
      {/* ========================================================= */}
      {viewMode === 'plans' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {isSuperAdmin ? (
            // =====================================================
            // SUPER ADMIN: Modern 5-Plans Table with GST & Plan Type
            // =====================================================
            <div className="space-y-6">
              {/* Top SearchBar with Status FilterDropdown, Apply, Reset, and RightSlot */}
              <SearchBar
                value={pendingPlanSearch}
                onChange={(val) => setPendingPlanSearch(val)}
                placeholder="Search plans by name, price, billing cycle, plan type..."
                onSubmit={() => {
                  setAppliedPlanSearch(pendingPlanSearch);
                  setAppliedPlanStatus(pendingPlanStatus);
                  setPlansPage(1);
                }}
                onReset={() => {
                  setPendingPlanSearch('');
                  setAppliedPlanSearch('');
                  setPendingPlanStatus('ALL');
                  setAppliedPlanStatus('ALL');
                  setPlansPage(1);
                }}
                filterSlot={
                  <FilterDropdown
                    options={[
                      { label: 'Status : All', value: 'ALL' },
                      { label: 'Active', value: 'Active', dotColor: '#10b981' },
                      { label: 'Inactive', value: 'Inactive', dotColor: '#f43f5e' },
                    ]}
                    value={pendingPlanStatus}
                    onChange={(val) => setPendingPlanStatus(val)}
                    placeholder="Status : All"
                  />
                }
                rightSlot={
                  <span className="text-xs font-semibold text-slate-500 pr-2">
                    Total Plans :{' '}
                    <span className="text-[#33077C] font-bold">{isSuperAdmin ? apiPlansTotal : filteredPlansList.length}</span>
                  </span>
                }
              />

              {/* Modern Enterprise Plans Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-slate-200 min-w-[950px]">
                    <thead>
                      <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white tracking-wider uppercase">
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">PLAN NAME</th>
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">PRICE</th>
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">TOTAL PRICE WITH GST</th>
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">BILLING CYCLE</th>
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">PLAN TYPE</th>
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">STATUS</th>
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {isPlansLoading ? (
                        <tr>
                          <td colSpan={8} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <div className="w-7 h-7 border-3 border-[#33077C] border-t-transparent rounded-full animate-spin" />
                              <span className="text-xs text-slate-500 font-medium">Loading subscription plans...</span>
                            </div>
                          </td>
                        </tr>
                      ) : pagedPlans.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                            No subscription plans found matching your filter criteria.
                          </td>
                        </tr>
                      ) : (
                        pagedPlans.map((item) => {
                          const { plan, product } = item;
                          const isDropdownOpen = activePlanDropdownId === plan.id;
                          const currencySymbol = plan.currency || '\u20B9';
                          const isCustom = plan.customizablePrice;
                          const basePrice = plan.price || 0;
                          const totalPriceWithGst = Math.round(basePrice * 1.18);
                          const planType = plan.pricingType || plan.tier || (isCustom ? 'Custom' : 'Fixed');

                          return (
                            <tr key={plan.id} className="hover:bg-slate-50/80 transition-colors">
                              {/* 1. Plan Name */}
                              <td className="py-4 px-5 border border-slate-200">
                                <span className="font-bold text-slate-900 text-sm">{plan.name}</span>
                              </td>

                              {/* 2. Price */}
                              <td className="py-4 px-5 border border-slate-200">
                                <span className="font-bold text-slate-900 text-sm">
                                  {isCustom ? (
                                    <span className="text-slate-700">Custom Quote</span>
                                  ) : (
                                    `${currencySymbol}${basePrice.toLocaleString()}`
                                  )}
                                </span>
                              </td>

                              {/* 3. Total Price with GST (18%) */}
                              <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                                {isCustom ? (
                                  <span className="text-xs font-semibold text-slate-500">Subject to GST</span>
                                ) : (
                                  <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                                    <span className="font-bold text-[#33077C] text-sm sm:text-base">
                                      {currencySymbol}{totalPriceWithGst.toLocaleString()}
                                    </span>
                                    <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                                      (Incl. 18% GST)
                                    </span>
                                  </div>
                                )}
                              </td>

                              {/* 4. Billing Cycle */}
                              <td className="py-4 px-5 border border-slate-200">
                                {(() => {
                                  const cycle = plan.billingCycle || 'Monthly';
                                  const isYearly = cycle.toLowerCase().includes('year') || cycle.toLowerCase().includes('annual');
                                  const badgeClass = isYearly
                                    ? 'bg-purple-50 text-[#33077C]'
                                    : 'bg-[#FFF4EB] text-[#FF5A1F]';
                                  return (
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${badgeClass}`}>
                                      {cycle}
                                    </span>
                                  );
                                })()}
                              </td>

                              {/* 5. Plan Type */}
                              <td className="py-4 px-5 border border-slate-200 text-center">
                                <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800 text-sm">
                                  <span className="w-2 h-2 rounded-full bg-[#f43f5e]" />
                                  <span>{planType}</span>
                                </span>
                              </td>


                              {/* 7. Status Badge */}
                              <td className="py-4 px-5 border border-slate-200 text-center">
                                <span
                                  className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold ${plan.status === 'Inactive'
                                    ? 'bg-rose-50 text-rose-600'
                                    : 'bg-emerald-50 text-emerald-600'
                                    }`}
                                >
                                  {plan.status || 'Active'}
                                </span>
                              </td>

                              {/* 8. Action (3-Dots Menu) */}
                              <td className="py-4 px-5 border border-slate-200 text-center">
                                <div className="relative inline-block text-left plan-action-dropdown-container">
                                  <button
                                    type="button"
                                    title="Plan Actions"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (activePlanDropdownId === plan.id) {
                                        setActivePlanDropdownId(null);
                                        setPlanDropdownPos(null);
                                      } else {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const spaceBelow = window.innerHeight - rect.bottom;
                                        const dropdownHeight = 150;
                                        const rightPos = window.innerWidth - rect.right;

                                        if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
                                          setPlanDropdownPos({
                                            bottom: window.innerHeight - rect.top + 6,
                                            right: rightPos,
                                          });
                                        } else {
                                          setPlanDropdownPos({
                                            top: rect.bottom + 6,
                                            right: rightPos,
                                          });
                                        }
                                        setActivePlanDropdownId(plan.id);
                                      }
                                    }}
                                    className="w-8 h-8 rounded-lg bg-[#33077C] hover:bg-[#432fb3] flex items-center justify-center text-white shadow-xs transition-all hover:scale-105 active:scale-95 mx-auto cursor-pointer"
                                  >
                                    <MoreVertical className="w-4 h-4 fill-white" />
                                  </button>

                                  {/* Portal Dropdown Menu */}
                                  {isDropdownOpen && planDropdownPos && (
                                    <div
                                      className="plan-action-dropdown-menu fixed z-50 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 py-3 px-2 animate-in fade-in zoom-in-95 duration-100"
                                      style={{
                                        top: planDropdownPos.top !== undefined ? `${planDropdownPos.top}px` : undefined,
                                        bottom: planDropdownPos.bottom !== undefined ? `${planDropdownPos.bottom}px` : undefined,
                                        right: `${planDropdownPos.right}px`,
                                      }}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActivePlanDropdownId(null);
                                          handleOpenEditPlan(product, plan);
                                        }}
                                        className="w-full px-3 py-2 text-left text-[13px] font-bold text-slate-800 hover:bg-slate-50 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                                      >
                                        <span
                                          style={{ width: '26.25px', height: '26.25px' }}
                                          className="rounded-full bg-[#6342E8] flex items-center justify-center shrink-0 shadow-2xs"
                                        >
                                          <Edit2 style={{ width: '13.13px', height: '13.13px' }} className="text-white stroke-[2.2]" />
                                        </span>
                                        <span>Edit</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActivePlanDropdownId(null);
                                          handleDuplicatePlan(product, plan);
                                        }}
                                        className="w-full px-3 py-2 text-left text-[13px] font-bold text-slate-800 hover:bg-slate-50 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                                      >
                                        <span
                                          style={{ width: '26.25px', height: '26.25px' }}
                                          className="rounded-full bg-[#F59E0B] flex items-center justify-center shrink-0 shadow-2xs"
                                        >
                                          <Copy style={{ width: '13.13px', height: '13.13px' }} className="text-white stroke-[2.2]" />
                                        </span>
                                        <span>Duplicate</span>
                                      </button>

                                      <div className="my-1.5 mx-2 border-t border-slate-100" />

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActivePlanDropdownId(null);
                                          handleDeletePlan(product, plan);
                                        }}
                                        className="w-full px-3 py-2 text-left text-[13px] font-bold text-[#E11D48] hover:bg-rose-50/70 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                                      >
                                        <span
                                          style={{ width: '26.25px', height: '26.25px' }}
                                          className="rounded-full bg-[#E11D48] flex items-center justify-center shrink-0 shadow-2xs"
                                        >
                                          <Trash2 style={{ width: '13.13px', height: '13.13px' }} className="text-white stroke-[2.2]" />
                                        </span>
                                        <span>Delete</span>
                                      </button>
                                    </div>
                                  )}
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

              {/* Standalone Pagination Card */}
              {(isSuperAdmin ? apiPlansTotal : filteredPlansList.length) > 0 && (
                <Pagination
                  currentPage={safePlansPage}
                  total={isSuperAdmin ? apiPlansTotal : filteredPlansList.length}
                  pageSize={plansPageSize}
                  onPageChange={(page) => setPlansPage(page)}
                  onPageSizeChange={(size) => {
                    setPlansPageSize(size);
                    setPlansPage(1);
                  }}
                />
              )}
            </div>
          ) : (
            // =====================================================
            // ADMIN / STAFF: Original Product Plan Selector & Cards UI
            // =====================================================
            <div className="space-y-6">
              {/* Product Filter Pill Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  {products.map((p) => {
                    const isSelected = selectedPlanProductId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPlanProductId(isSelected ? null : p.id)}
                        className={`h-11 px-6 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs hover:scale-[1.02] active:scale-[0.98] ${isSelected
                          ? 'bg-[#33077C] text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                          }`}
                      >
                        {isSelected && (
                          <Check className="w-4 h-4 stroke-[3] text-white" />
                        )}
                        <span>{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Product Cards Grid */}
              <div className="space-y-8">
                {!selectedPlanProductId ? (
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center shadow-xs">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-50 text-[#4309A2] flex items-center justify-center mb-3.5 shadow-2xs">
                      <Boxes className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">No Product Selected</h3>
                    <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1 font-normal">
                      Please select a product offering above to view and manage its subscription plan tiers.
                    </p>
                  </div>
                ) : (
                  products
                    .filter((p) => p.id === selectedPlanProductId)
                    .map((product) => {
                      return (
                        <div key={product.id} className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                          {/* Banner */}
                          <div className="p-5 sm:p-6 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">{product.name}</h2>
                              {product.tagline && (
                                <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">{product.tagline}</p>
                              )}
                            </div>
                            <Button
                              variant="primary"
                              size="md"
                              onClick={() => handleOpenCreatePlan(product.id)}
                              icon={<Plus className="w-4 h-4 text-white" strokeWidth={2.5} />}
                            >
                              Add Plan
                            </Button>
                          </div>

                          {/* Plans Grid */}
                          <div className="p-5 sm:p-6">
                            {isProductPlansLoading ? (
                              <div className="text-center py-16 bg-slate-50/50 rounded-xl border border-slate-200">
                                <div className="flex flex-col items-center justify-center gap-2.5">
                                  <div className="w-8 h-8 border-3 border-[#33077C] border-t-transparent rounded-full animate-spin" />
                                  <span className="text-xs sm:text-sm text-slate-500 font-semibold">Loading plans for {product.name}...</span>
                                </div>
                              </div>
                            ) : (() => {
                              const currentPlans = productPlansByProductId[product.id] || [];
                              if (currentPlans.length === 0) {
                                return (
                                  <div className="text-center py-10 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                                    <Zap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                    <p className="text-sm font-semibold text-slate-700">No plans created yet</p>
                                  </div>
                                );
                              }

                              return (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                  {currentPlans.map((plan) => (
                                  <div
                                    key={plan.id}
                                    className="bg-white rounded-[26px] border border-slate-200/80 shadow-md shadow-slate-200/40 overflow-hidden flex flex-col justify-between hover:shadow-xl hover:border-[#33077C]/20 transition-all duration-300 relative group"
                                  >
                                    {/* Top Header Banner */}
                                    <div className="relative overflow-hidden bg-gradient-to-r from-[#33077C] via-[#3E0A96] to-[#4309A2] px-6 py-5 flex items-center justify-between shadow-xs">
                                      <div className="flex items-center min-w-0 mr-2">
                                        <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-xs flex items-center justify-center text-white mr-3 shrink-0 shadow-inner">
                                          <Zap className="w-4.5 h-4.5 fill-white text-white" />
                                        </div>
                                        <h3 className="text-white text-lg font-bold tracking-tight line-clamp-1 relative z-10">
                                          {plan.name}
                                        </h3>
                                      </div>

                                      <div className="flex items-center gap-1.5 shrink-0 relative z-10">
                                        <span
                                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${plan.status === 'Inactive'
                                            ? 'bg-white/20 text-white/70 border border-white/30'
                                            : 'bg-white text-[#33077C] shadow-xs'
                                            }`}
                                        >
                                          {plan.status || 'Active'}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Card Body */}
                                    <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-6">
                                      <div className="space-y-4">
                                        {plan.description && (
                                          <p className="text-slate-500 text-xs sm:text-[13px] font-normal leading-relaxed line-clamp-2">
                                            {plan.description}
                                          </p>
                                        )}

                                        {/* Price */}
                                        <div className="flex items-baseline gap-1 pt-1 pb-1">
                                          <span className="text-3xl sm:text-4xl font-extrabold text-[#0B1E33] tracking-tight">
                                            {plan.customizablePrice
                                              ? 'Flexible'
                                              : `${plan.currency || '₹'}${plan.price.toLocaleString()}`}
                                          </span>
                                          <span className="text-xs sm:text-sm font-semibold text-slate-400 ml-1">
                                            / {plan.billingCycle ? plan.billingCycle.toLowerCase() : 'month'}
                                          </span>
                                        </div>

                                        {/* Deliverables & Limits Badges */}
                                        {(() => {
                                          const specs = plan.specs || {};
                                          let posts = specs.monthlyPostLimit;
                                          let videos = specs.monthlyVideoLimit;

                                          if (!posts) {
                                            const postFeat = plan.features?.find(f => /post|graphic/i.test(f));
                                            if (postFeat) {
                                              const match = postFeat.match(/(\d+)\s*(custom graphic|content post|post|graphic)/i);
                                              if (match) posts = Number(match[1]);
                                            }
                                          }
                                          if (!videos) {
                                            const vidFeat = plan.features?.find(f => /video/i.test(f));
                                            if (vidFeat) {
                                              const match = vidFeat.match(/(\d+)\s*video/i);
                                              if (match) videos = match ? Number(match[1]) : (vidFeat.toLowerCase().includes('daily') ? 30 : 2);
                                            }
                                          }

                                          const hasDeliverables = posts || videos;
                                          if (!hasDeliverables) return null;

                                          return (
                                            <div className="space-y-1.5">
                                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Deliverables:</span>
                                              <div className="flex flex-wrap gap-1.5">
                                                {posts && (
                                                  <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#33077C]/10 text-[#33077C] inline-flex items-center">
                                                    {posts} Posts/Month
                                                  </span>
                                                )}
                                                {videos && (
                                                  <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#33077C]/10 text-[#33077C] inline-flex items-center">
                                                    {videos} Videos/Month
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })()}

                                        {/* Services Included Badges */}
                                        {(() => {
                                          const specs = plan.specs || {};
                                          const activeServices: string[] = [];
                                          if (specs.socialMediaManagement || plan.features?.some(f => /social media/i.test(f))) activeServices.push('Social Media');
                                          if (specs.seo || plan.features?.some(f => /seo/i.test(f))) activeServices.push('SEO');
                                          if (specs.adsManagement || plan.features?.some(f => /ads/i.test(f))) activeServices.push('Ads Management');

                                          if (activeServices.length === 0) return null;

                                          return (
                                            <div className="space-y-1.5">
                                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Included Services:</span>
                                              <div className="flex flex-wrap gap-1.5">
                                                {activeServices.map((srv, sIdx) => (
                                                  <span
                                                    key={sIdx}
                                                    className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#33077C]/10 text-[#33077C] inline-flex items-center"
                                                  >
                                                    {srv}
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                          );
                                        })()}

                                        {/* Features Checklist */}
                                        <div className="space-y-3.5 pt-2">
                                          {plan.features && plan.features.length > 0 ? (
                                            plan.features.map((feat, fIdx) => (
                                              <div key={fIdx} className="flex items-center gap-3">
                                                <div className="w-5 h-5 rounded-full bg-[#33077C]/10 text-[#33077C] flex items-center justify-center shrink-0 shadow-2xs">
                                                  <Check className="w-3 h-3 text-[#33077C] stroke-[3.5]" />
                                                </div>
                                                <span className="text-xs sm:text-[13px] font-semibold text-slate-800 tracking-tight line-clamp-1">
                                                  {feat}
                                                </span>
                                              </div>
                                            ))
                                          ) : (
                                            <p className="text-xs text-slate-400 italic">No features specified yet.</p>
                                          )}
                                        </div>
                                      </div>

                                      {/* Bottom Action Buttons */}
                                      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditPlan(product, plan)}
                                          className="h-10 rounded-xl bg-slate-50 hover:bg-[#33077C]/10 text-slate-700 hover:text-[#33077C] border border-slate-200 hover:border-[#33077C]/30 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                          <span>Edit</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => handleDeletePlan(product, plan)}
                                          className="h-10 rounded-xl bg-rose-50/70 hover:bg-rose-100 text-rose-600 border border-rose-200/80 hover:border-rose-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                          <span>Delete</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Plan Form Modal */}
      <PlanFormModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        onSave={handleSavePlan}
        products={products}
        initialProductId={planModalProductId}
        initialPlan={editingPlan}
        isSuperAdmin={isSuperAdmin}
      />

      {/* Client Subscription Modal */}
      <Modal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        title={editingSub ? `Edit Subscription: ${editingSub.customerName}` : 'Assign Client Product Subscription'}
        subtitle="Assign a product subscription plan to a client with billing cycle and date details."
        maxWidth="4xl"
        headerGradient={true}
        showBackIcon={true}
        hideCloseButton={true}
      >
        <form noValidate onSubmit={handleSaveSubscription} className="space-y-4.5 p-2 sm:p-4 animate-in fade-in duration-150">
          <div className="space-y-4">
            {/* Row 1: Select Customer, Target Product, Select Plan Tier */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Select Customer <span className="text-slate-500">*</span>
                </label>
                <CustomSelect
                  value={subCustomerId}
                  onChange={(val) => {
                    setSubCustomerId(val);
                    const found = customers.find((c) => c.id === val);
                    setSubCustomerName(found?.company || found?.name || '');
                  }}
                  options={customers.map((c) => ({
                    value: c.id,
                    label: c.company ? `${c.company} (${c.name})` : c.name,
                  }))}
                  placeholder="Select Customer"
                  activeColor="brand"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Target Product <span className="text-slate-500">*</span>
                </label>
                <CustomSelect
                  value={subProductId}
                  onChange={(val) => handleProductChangeInSubModal(val)}
                  options={products.map((p) => ({
                    value: p.id,
                    label: p.name,
                  }))}
                  placeholder="Select Product"
                  activeColor="brand"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Select Plan Tier <span className="text-slate-500">*</span>
                </label>
                <CustomSelect
                  value={subPlanName}
                  onChange={(val) => handlePlanChangeInSubModal(val)}
                  options={
                    subProductId
                      ? ((productPlansByProductId[subProductId] && productPlansByProductId[subProductId].length > 0)
                          ? productPlansByProductId[subProductId]
                          : products.find((p) => p.id === subProductId)?.plans || []
                        ).map((pl) => ({
                          value: pl.name,
                          label: `${pl.name} (₹${pl.price.toLocaleString()} / ${pl.billingCycle})`,
                        }))
                      : []
                  }
                  placeholder="Select Plan Tier"
                  activeColor="brand"
                />
              </div>
            </div>

            {/* Row 2: Billing Cycle, Agreed Fee Amount, Start Date */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Billing Cycle <span className="text-slate-500">*</span>
                </label>
                <CustomSelect
                  value={subBillingCycle}
                  onChange={(val) => {
                    setSubBillingCycle(val as any);
                    if (subStartDate) {
                      setSubEndDate(computeEndDate(subStartDate, val));
                    }
                  }}
                  options={[
                    { value: 'Monthly', label: 'Monthly' },
                    { value: 'Quarterly', label: 'Quarterly' },
                    { value: 'Annually', label: 'Annually' },
                    { value: 'One-Time', label: 'One-Time' },
                    { value: 'Custom', label: 'Custom' },
                  ]}
                  placeholder="Select Billing Cycle"
                  activeColor="brand"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Agreed Fee Amount (₹) <span className="text-slate-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={subAmount}
                  onChange={(e) => setSubAmount(Number(e.target.value))}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Start Date <span className="text-slate-500">*</span>
                </label>
                <input
                  type={subStartDate ? "date" : "text"}
                  onFocus={(e) => (e.currentTarget.type = "date")}
                  onBlur={(e) => {
                    if (!e.currentTarget.value) e.currentTarget.type = "text";
                  }}
                  placeholder="dd/mm/yyyy"
                  required
                  value={subStartDate}
                  onChange={(e) => {
                    setSubStartDate(e.target.value);
                    if (subBillingCycle) {
                      setSubEndDate(computeEndDate(e.target.value, subBillingCycle));
                    }
                  }}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all cursor-pointer placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Row 3: Renewal Date, Status, Notes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Renewal Date <span className="text-slate-500">*</span>
                </label>
                <input
                  type={subEndDate ? "date" : "text"}
                  onFocus={(e) => (e.currentTarget.type = "date")}
                  onBlur={(e) => {
                    if (!e.currentTarget.value) e.currentTarget.type = "text";
                  }}
                  placeholder="dd/mm/yyyy"
                  required
                  value={subEndDate}
                  onChange={(e) => setSubEndDate(e.target.value)}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all cursor-pointer placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Status <span className="text-slate-500">*</span>
                </label>
                <CustomSelect
                  value={subStatus}
                  onChange={(val) => setSubStatus(val as any)}
                  options={[
                    { value: 'Active', label: 'Active' },
                    { value: 'Expiring Soon', label: 'Expiring Soon' },
                    { value: 'Expired', label: 'Expired' },
                    { value: 'Cancelled', label: 'Cancelled' },
                  ]}
                  placeholder="Select Status"
                  activeColor="brand"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Notes / Contract Info
                </label>
                <input
                  type="text"
                  placeholder="e.g. Annual maintenance contract included"
                  value={subNotes}
                  onChange={(e) => setSubNotes(e.target.value)}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsSubModalOpen(false)}
              className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center gap-2"
            >
              <X className="w-4 h-4 text-slate-500" />
              <span>Cancel</span>
            </button>
            <button
              type="submit"
              className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{editingSub ? 'Save Changes' : 'Assign Subscription'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Super Admin Modal: New / Edit Organization Subscription */}
      <Modal
        isOpen={isOrgSubModalOpen}
        onClose={() => setIsOrgSubModalOpen(false)}
        title={editingOrgSub ? 'Edit Organization Subscription' : 'New Organization Subscription'}
        subtitle="Enroll an organization into a platform subscription tier with automated billing cycles."
        maxWidth="4xl"
        headerGradient={true}
        showBackIcon={true}
        hideCloseButton={true}
      >
        <form noValidate onSubmit={handleSaveOrgSubscription} className="space-y-4.5 p-2 sm:p-4 animate-in fade-in duration-150">
          <div className="space-y-4">
            {/* Row 1: Select Organization, Subscription Plan, Billing Cycle (3 columns) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Select Organization <span className="text-slate-500">*</span>
                </label>
                <CustomSelect
                  value={orgSubOrgId}
                  onChange={(val) => handleSelectOrgInModal(val)}
                  options={availableOrgs.map((org: any) => ({
                    value: org.id,
                    label: org.name,
                  }))}
                  placeholder="Select Organization"
                  activeColor="brand"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Subscription Plan <span className="text-slate-500">*</span>
                </label>
                <CustomSelect
                  value={orgSubPlan}
                  onChange={(val) => handlePlanChangeInOrgModal(val)}
                  options={orgPlans.map((p) => ({
                    value: p.name,
                    label: p.name,
                  }))}
                  placeholder="Select Subscription Plan"
                  activeColor="brand"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Billing Cycle <span className="text-slate-500">*</span>
                </label>
                <CustomSelect
                  value={orgSubBillingCycle}
                  onChange={(val) => handleBillingCycleChangeInOrgModal(val as any)}
                  options={[
                    { value: 'Monthly', label: 'Monthly' },
                    { value: 'Quarterly', label: 'Quarterly' },
                    { value: 'Annually', label: 'Annually' },
                  ]}
                  placeholder="Select Billing Cycle"
                  activeColor="brand"
                />
              </div>
            </div>

            {/* Custom Organization Fields if 'org_custom' is selected */}
            {orgSubOrgId === 'org_custom' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Organization Name <span className="text-slate-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={orgSubOrgName}
                    onChange={(e) => setOrgSubOrgName(e.target.value)}
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Organization Code
                  </label>
                  <input
                    type="text"
                    value={orgSubOrgCode}
                    onChange={(e) => setOrgSubOrgCode(e.target.value)}
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Industry
                  </label>
                  <input
                    type="text"
                    value={orgSubIndustry}
                    onChange={(e) => setOrgSubIndustry(e.target.value)}
                    placeholder="e.g. Real Estate, IT, Retail"
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {/* Row 2: Fee Amount (₹), Start Date, Next Renewal Date (3 columns) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Fee Amount (₹) <span className="text-slate-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={orgSubAmount === 0 ? '' : orgSubAmount}
                  onChange={(e) => setOrgSubAmount(Number(e.target.value))}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Start Date <span className="text-slate-500">*</span>
                </label>
                <input
                  type={orgSubStartDate ? "date" : "text"}
                  onFocus={(e) => (e.currentTarget.type = "date")}
                  onBlur={(e) => {
                    if (!e.currentTarget.value) e.currentTarget.type = "text";
                  }}
                  placeholder="dd/mm/yyyy"
                  required
                  value={orgSubStartDate}
                  onChange={(e) => {
                    setOrgSubStartDate(e.target.value);
                    if (orgSubBillingCycle) {
                      setOrgSubEndDate(computeEndDate(e.target.value, orgSubBillingCycle));
                    }
                  }}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all cursor-pointer placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Next Renewal Date <span className="text-slate-500">*</span>
                </label>
                <input
                  type={orgSubEndDate ? "date" : "text"}
                  onFocus={(e) => (e.currentTarget.type = "date")}
                  onBlur={(e) => {
                    if (!e.currentTarget.value) e.currentTarget.type = "text";
                  }}
                  placeholder="dd/mm/yyyy"
                  required
                  value={orgSubEndDate}
                  onChange={(e) => setOrgSubEndDate(e.target.value)}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all cursor-pointer placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Row 3: Contact Person, Email Address, Phone Number (3 columns) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={orgSubContactPerson}
                  onChange={(e) => setOrgSubContactPerson(e.target.value)}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={orgSubEmail}
                  onChange={(e) => setOrgSubEmail(e.target.value)}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={orgSubPhone}
                  onChange={(e) => setOrgSubPhone(e.target.value)}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all"
                />
              </div>
            </div>

            {/* Row 4: Notes & Terms (1 column width in 3-column grid) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Notes & Terms
                </label>
                <input
                  type="text"
                  value={orgSubNotes}
                  onChange={(e) => setOrgSubNotes(e.target.value)}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex justify-end items-center gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsOrgSubModalOpen(false)}
              className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center gap-2"
            >
              <X className="w-4 h-4 text-slate-500" />
              <span>Cancel</span>
            </button>
            <button
              type="submit"
              className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{editingOrgSub ? 'Save Changes' : 'Save'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
