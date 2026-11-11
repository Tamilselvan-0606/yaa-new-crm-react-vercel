import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Repeat,
  Building2,
  Boxes,
  Activity,
  MessageSquareShare,
  CheckSquare,
  ExternalLink,
  Search,
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
  Loader2,
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
import { ContactCopyButtons } from '../../components/common/ContactCopyButtons';
import { PlanBadge, PlanStatusBadge, SubscriptionStatusBadge, dotColorFor } from '../../components/common/SubscriptionBadges';
import {  alphabetsOnly,  digitsOnly,  emailAddress,  indianMobile,  lettersOnly,  liveMobileStartError,  nonNegativeAmount,  required,  validateFields,} from '../../utils/fieldValidators';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { useRowActionMenu } from '../../hooks/useRowActionMenu';
import { Button } from '../../components/common/Button';
import { Pagination } from '../../components/common/Pagination';
import { ConfirmationModal } from '../../utils/confirmationModal';
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
  platformClientApi,
  PlatformClientItem,
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
  discount?: number;
  gstRate?: number;
  amountWithGst?: number;
  bonusMonths?: number;
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
  const { copiedKey, copy: handleCopy } = useCopyToClipboard();


  // One 3-dots row menu serves the plans, organization-subscription and client-subscription tables
  const rowMenu = useRowActionMenu(240);

  // Modals for Plans
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planModalProductId, setPlanModalProductId] = useState<string>('prod_1');
  const [editingPlan, setEditingPlan] = useState<ProductPlan | null>(null);

  // View an organization subscription: opens with the list row, then loads the full record (GET by id).
  const [viewingOrgSubId, setViewingOrgSubId] = useState<string | null>(null);
  const [viewingOrgSubDetail, setViewingOrgSubDetail] = useState<OrganizationSubscriptionApiItem | null>(null);
  const [viewOrgSubLoading, setViewOrgSubLoading] = useState(false);
  useEffect(() => {
    setViewingOrgSubDetail(null);
    if (!viewingOrgSubId) return;
    let cancelled = false;
    setViewOrgSubLoading(true);
    organizationSubscriptionApi
      .getOrganizationSubscriptionById(viewingOrgSubId)
      .then((res) => {
        if (!cancelled && res?.success && res.data) setViewingOrgSubDetail(res.data);
      })
      .catch(() => {
        /* keep the list row that is already on screen */
      })
      .finally(() => {
        if (!cancelled) setViewOrgSubLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewingOrgSubId]);

  // View a product subscription plan: opens with the list row, then loads the full plan (GET product plan by id).
  const [viewingProductPlan, setViewingProductPlan] = useState<{ productId: string; planId: string } | null>(null);
  const [viewingProductPlanDetail, setViewingProductPlanDetail] = useState<ProductPlanApiItem | null>(null);
  const [viewProductPlanLoading, setViewProductPlanLoading] = useState(false);
  const viewingProductPlanKey = viewingProductPlan ? `${viewingProductPlan.productId}/${viewingProductPlan.planId}` : '';
  useEffect(() => {
    setViewingProductPlanDetail(null);
    if (!viewingProductPlan) return;
    let cancelled = false;
    setViewProductPlanLoading(true);
    productPlanApi
      .getProductPlanById(viewingProductPlan.productId, viewingProductPlan.planId)
      .then((res) => {
        if (!cancelled && res?.success && res.data) setViewingProductPlanDetail(res.data);
      })
      .catch(() => {
        /* keep the list row that is already on screen */
      })
      .finally(() => {
        if (!cancelled) setViewProductPlanLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewingProductPlanKey]);

  // View a client subscription: opens with the list row, then loads the full record (GET by id).
  const [viewingClientSubId, setViewingClientSubId] = useState<string | null>(null);
  const [viewingClientSubDetail, setViewingClientSubDetail] = useState<ClientSubscriptionApiItem | null>(null);
  const [viewClientSubLoading, setViewClientSubLoading] = useState(false);
  useEffect(() => {
    setViewingClientSubDetail(null);
    if (!viewingClientSubId) return;
    let cancelled = false;
    setViewClientSubLoading(true);
    clientSubscriptionApi
      .getClientSubscriptionById(viewingClientSubId)
      .then((res) => {
        if (!cancelled && res?.success && res.data) setViewingClientSubDetail(res.data);
      })
      .catch(() => {
        /* keep the list row that is already on screen */
      })
      .finally(() => {
        if (!cancelled) setViewClientSubLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewingClientSubId]);

  // View a subscription plan: opens with the list row, then loads the full record (GET plan by id).
  const [viewingPlanId, setViewingPlanId] = useState<string | null>(null);
  const [viewingPlanDetail, setViewingPlanDetail] = useState<SubscriptionPlanApiItem | null>(null);
  const [viewPlanLoading, setViewPlanLoading] = useState(false);
  useEffect(() => {
    setViewingPlanDetail(null);
    if (!viewingPlanId) return;
    let cancelled = false;
    setViewPlanLoading(true);
    subscriptionPlanApi
      .getSubscriptionPlanById(viewingPlanId)
      .then((res) => {
        if (!cancelled && res?.success && res.data) setViewingPlanDetail(res.data);
      })
      .catch(() => {
        /* keep the list row that is already on screen */
      })
      .finally(() => {
        if (!cancelled) setViewPlanLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewingPlanId]);

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
  const [subFormErrors, setSubFormErrors] = useState<Record<string, string>>({});

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
  const [orgSubDiscount, setOrgSubDiscount] = useState<string>('');
  const [orgSubGstRate, setOrgSubGstRate] = useState<string>('');
  const [orgSubAmountWithGst, setOrgSubAmountWithGst] = useState<string>('');
  const [orgSubBonusMonths, setOrgSubBonusMonths] = useState<string>('');

  const [orgSubStartDate, setOrgSubStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [orgSubEndDate, setOrgSubEndDate] = useState('');
  const [orgSubAutoRenew, setOrgSubAutoRenew] = useState(true);
  const [orgSubNotes, setOrgSubNotes] = useState('');
  const [orgSubErrors, setOrgSubErrors] = useState<Record<string, string>>({});

  // Confirmation Modal State for Delete / Cancel
  const [subConfirmAction, setSubConfirmAction] = useState<{
    type: 'plan' | 'org_sub' | 'client_sub';
    title: string;
    description: string;
    buttonText: string;
    targetId: string;
    targetName: string;
    extraData?: any;
  } | null>(null);
  const [isProcessingSubAction, setIsProcessingSubAction] = useState(false);

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
      const [prodsData] = await Promise.all([
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
      ]);
      const prods = prodsData || [];
      setProducts(prods);

      const firstProdId = prods[0]?.id || '';
      if (firstProdId) {
        setPendingPlanProduct((prev) => (prev && prev !== 'ALL' ? prev : firstProdId));
        setAppliedPlanProduct((prev) => (prev && prev !== 'ALL' ? prev : firstProdId));
      }

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

  // Clients are only needed for the customer dropdown in the Assign Subscription form,
  // so they load the first time that form opens (once), not with either list tab.
  const customersRequested = useRef(false);
  const loadCustomers = async () => {
    if (isSuperAdmin || customersRequested.current) return;
    customersRequested.current = true;
    const loaded = await (
      platformClientApi.getClients({ limit: 100 })
        .then((res) => {
          if (res && res.success && Array.isArray(res.data)) {
            return res.data.map((c: PlatformClientItem) => ({
              id: c.id,
              clientId: c.code || c.id,
              clientName: c.name,
              businessName: c.legalName || c.name,
              name: c.name,
              company: c.legalName || c.name,
              email: c.email || '',
              phone: c.phone || '',
              whatsapp: c.whatsapp || c.phone || '',
              contactPerson: c.contactPerson || c.name,
              address: c.address || c.location || '',
              location: c.location || '',
              city: c.location || '',
              industry: c.industry || '',
              gstin: c.gstNumber || '',
              pan: c.panNumber || '',
              status: c.status || (c.active ? 'Active' : 'Inactive'),
              linkedProducts: [],
            })) as Customer[];
          }
          return [];
        })
        .catch(() => [])
    );
    setCustomers((loaded as Customer[]) || []);
  };

  useEffect(() => {
    if (isSubModalOpen) loadCustomers();
  }, [isSubModalOpen, isSuperAdmin]);

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

  const loadedProductPlansRef = useRef<Set<string>>(new Set());
  const loadingProductPlansRef = useRef<Set<string>>(new Set());

  const loadProductPlans = async (productId: string, status?: string, force = false) => {
    if (!productId) return;
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(productId);
    if (!isUuid) return; // Mock / local product ID, don't query remote API

    // Avoid duplicate simultaneous or repeated requests if already loaded without specific status filter (unless force is requested)
    if (!force && !status && (loadedProductPlansRef.current.has(productId) || loadingProductPlansRef.current.has(productId))) {
      return;
    }

    loadingProductPlansRef.current.add(productId);
    setIsProductPlansLoading(true);
    try {
      const res = await productPlanApi.getProductPlans(productId, {
        status: status && status !== 'ALL' ? status : undefined,
      });
      if (res.success && Array.isArray(res.data)) {
        const mappedPlans = res.data.map(mapApiProductPlanToProductPlan);
        loadedProductPlansRef.current.add(productId);
        setProductPlansByProductId((prev) => ({
          ...prev,
          [productId]: mappedPlans,
        }));
      }
    } catch (e: any) {
      console.error('Failed to load product plans for productId:', productId, e);
      showToast('error', 'Plans Load Failed', e.message || 'Failed to fetch product plans');
    } finally {
      loadingProductPlansRef.current.delete(productId);
      setIsProductPlansLoading(false);
    }
  };

  useEffect(() => {
    if (!isSuperAdmin && viewMode === 'plans') {
      if (appliedPlanProduct && appliedPlanProduct !== 'ALL') {
        loadProductPlans(appliedPlanProduct);
      }
    }
  }, [isSuperAdmin, viewMode, appliedPlanProduct]);

  // Ensure plans are loaded when the subscription modal opens for a selected product
  useEffect(() => {
    if (isSubModalOpen && subProductId && !productPlansByProductId[subProductId]) {
      loadProductPlans(subProductId);
    }
  }, [isSubModalOpen, subProductId, productPlansByProductId]);

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
      productId || (isSuperAdmin ? 'prod_org' : (appliedPlanProduct || products[0]?.id || ''))
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
        loadedProductPlansRef.current.delete(productId);
        await loadProductPlans(productId, undefined, true);
      }
    } catch (e: any) {
      console.error('Plan Save Failed:', e);
      const errMsg = e?.response?.data?.message || e?.response?.data?.error?.message || e.message || 'Error occurred while saving plan.';
      showToast('error', 'Plan Save Failed', errMsg);
      throw e;
    }
  };

  const handleDeletePlan = async (product: Product, plan: ProductPlan) => {
    try {
      if (isSuperAdmin || product.id === 'prod_org') {
        setApiPlans((prev) => prev.filter((p) => p.id !== plan.id));
        await subscriptionPlanApi.deleteSubscriptionPlan(plan.id);
        showToast('success', 'Plan Removed', `Deleted ${plan.name} from enterprise plans.`);
        await loadSubscriptionPlans();
        return;
      }

      // Optimistically remove from state immediately so UI updates without waiting
      setProductPlansByProductId((prev) => ({
        ...prev,
        [product.id]: (prev[product.id] || []).filter((p) => p.id !== plan.id),
      }));

      await productPlanApi.deleteProductPlan(product.id, plan.id);
      loadedProductPlansRef.current.delete(product.id);
      showToast('success', 'Plan Removed', `Deleted ${plan.name} from ${product.name}.`);
      await loadProductPlans(product.id, undefined, true);
    } catch (e: any) {
      console.error('Delete Failed:', e);
      const errMsg = e?.response?.data?.message || e?.response?.data?.error?.message || e.message || 'Failed to delete plan.';
      showToast('error', 'Delete Failed', errMsg);
      // Re-fetch to restore state if deletion failed on server
      loadedProductPlansRef.current.delete(product.id);
      await loadProductPlans(product.id, undefined, true);
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
    const initialProdId = targetProd ? targetProd.id : '';
    setSubProductId(initialProdId);
    if (initialProdId) {
      loadProductPlans(initialProdId);
    }
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
    setSubFormErrors({});
    setIsSubModalOpen(true);
  };

  const handleOpenEditSubscription = (sub: SubscriptionItem) => {
    setEditingSub(sub);
    setSubCustomerId(sub.customerId || '');
    setSubCustomerName(sub.customerName || '');

    const matchedProd = products.find((p) => p.name === sub.productOrService || p.name === sub.productName || p.id === (sub as any).productId) || products[0];
    const editProdId = matchedProd ? matchedProd.id : 'prod_1';
    setSubProductId(editProdId);
    if (editProdId) {
      loadProductPlans(editProdId);
    }
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
    setSubFormErrors({});
    setIsSubModalOpen(true);
  };

  const handleProductChangeInSubModal = (prodId: string) => {
    setSubProductId(prodId);
    setSubPlanId('');
    setSubPlanName('');
    setSubAmount('');
    setSubBillingCycle('');
    if (prodId) {
      loadProductPlans(prodId);
    }
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

    const errors: Record<string, string> = {};

    if (!subCustomerId) {
      errors.customerId = 'Select Customer is required';
    }
    if (!subProductId) {
      errors.productId = 'Target Product is required';
    }
    if (!subBillingCycle) {
      errors.billingCycle = 'Billing Cycle is required';
    }
    if (subAmount === '' || subAmount === undefined || subAmount === null) {
      errors.amount = 'Agreed Fee Amount is required';
    } else if (Number(subAmount) < 0 || isNaN(Number(subAmount))) {
      errors.amount = 'Please enter a valid amount';
    }
    if (!subStartDate) {
      errors.startDate = 'Start Date is required';
    }
    if (!subEndDate) {
      errors.endDate = 'Renewal Date is required';
    }
    if (!subStatus) {
      errors.status = 'Status is required';
    }

    if (Object.keys(errors).length > 0) {
      setSubFormErrors(errors);
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
    setOrgSubDiscount('');
    setOrgSubGstRate('');
    setOrgSubAmountWithGst('');
    setOrgSubBonusMonths('');
    setOrgSubStartDate('');
    setOrgSubEndDate('');
    setOrgSubAutoRenew(false);
    setOrgSubNotes('');
    setOrgSubErrors({});
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
    setOrgSubDiscount(sub.discount ? String(sub.discount) : '');
    setOrgSubGstRate(sub.gstRate !== undefined && sub.gstRate !== null ? String(sub.gstRate) : String(apiPlans.find((p) => p.id === sub.planId)?.gstRate ?? ''));
    setOrgSubAmountWithGst(sub.amountWithGst ? String(sub.amountWithGst) : '');
    setOrgSubBonusMonths(sub.bonusMonths ? String(sub.bonusMonths) : '');
    setOrgSubStartDate((sub.startDate || '').split('T')[0]);
    setOrgSubEndDate((sub.endDate || '').split('T')[0]);
    setOrgSubAutoRenew(sub.autoRenew);
    setOrgSubNotes(sub.notes || '');
    setOrgSubErrors({});
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
      if (foundApiPlan.gstRate !== undefined && foundApiPlan.gstRate !== null) setOrgSubGstRate(String(foundApiPlan.gstRate));
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
    const errors = validateFields([
      ['organization', orgSubOrgId === 'org_custom' ? '' : orgSubOrgId, [required('Select Organization is required')]],
      ['plan', String(orgSubPlan ?? ''), [required('Subscription Plan is required')]],
      ['billingCycle', String(orgSubBillingCycle ?? ''), [required('Billing Cycle is required')]],
      ['amount', Number(orgSubAmount) > 0 ? String(orgSubAmount) : '', [required('Fee Amount is required')]],
      ['discount', orgSubDiscount, [nonNegativeAmount('Discount'), (v) => (Number(v) > Number(orgSubAmount) ? 'Discount cannot exceed the fee amount' : null)]],
      ['gstRate', orgSubGstRate, [required('GST Rate is required')]],
      ['bonusMonths', orgSubBonusMonths, [(v) => (v.trim() === '' || /^\d{1,3}$/.test(v.trim()) ? null : 'Bonus Month must be a whole number')]],
      ['startDate', orgSubStartDate, [required('Start Date is required')]],
      ['endDate', orgSubEndDate, [required('Next Renewal Date is required')]],
      ['contactPerson', orgSubContactPerson, [required('Contact Person is required'), alphabetsOnly('Contact Person')]],
      ['email', orgSubEmail, [required('Email Address is required'), emailAddress]],
      ['phone', orgSubPhone, [required('Phone Number is required'), indianMobile('Phone Number')]],
    ]);
    setOrgSubErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const resolvedPlan = apiPlans.find((p) => p.name === orgSubPlan || p.id === orgSubPlanId);
    if (!resolvedPlan) {
      showToast('error', 'Validation Error', 'Please select a valid subscription plan.');
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
        discountAmount: orgSubDiscount.trim() === '' ? undefined : Number(orgSubDiscount),
        gstRate: orgSubGstRate === '' ? undefined : Number(orgSubGstRate),
        gstAmount: orgSubGstRate === ''
          ? undefined
          : Math.round(Math.max(0, Number(orgSubAmount || 0) - Number(orgSubDiscount || 0)) * Number(orgSubGstRate) ) / 100,
        amountWithGst: orgSubAmountWithGst.trim() === '' ? undefined : Number(orgSubAmountWithGst),
        bonusMonths: orgSubBonusMonths.trim() === '' ? undefined : Number(orgSubBonusMonths),
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


  // Amount with GST = (fee amount - discount) + the selected GST rate. Calculated, not typed.
  useEffect(() => {
    const rate = Number(orgSubGstRate || 0);
    const taxable = Math.max(0, Number(orgSubAmount || 0) - Number(orgSubDiscount || 0));
    setOrgSubAmountWithGst(orgSubAmount > 0 ? String(Math.round(taxable * (1 + rate / 100) * 100) / 100) : '');
  }, [orgSubAmount, orgSubDiscount, orgSubGstRate]);

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
      discount: item.discountAmount,
      gstRate: item.gstRate,
      amountWithGst: item.amountWithGst,
      bonusMonths: item.bonusMonths,
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

    return products.flatMap((product) => {
      const plans = (productPlansByProductId[product.id] && productPlansByProductId[product.id].length > 0)
        ? productPlansByProductId[product.id]
        : (product.plans || []);
      return plans.map((plan) => ({
        plan,
        product,
      }));
    });
  }, [products, isSuperAdmin, orgPlans, productPlansByProductId]);

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

      const matchesProduct =
        appliedPlanProduct === 'ALL' || product.id === appliedPlanProduct || product.name.toLowerCase() === appliedPlanProduct.toLowerCase();

      const matchesStatus =
        appliedPlanStatus === 'ALL' || (plan.status || 'Active') === appliedPlanStatus;

      return matchesSearch && matchesProduct && matchesStatus;
    });
  }, [allPlansWithProduct, appliedPlanSearch, appliedPlanProduct, appliedPlanStatus]);

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
      const planName = item.plan?.name || item.billingCycle || '-';

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
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {isSuperAdmin
                  ? (viewMode === 'subscriptions' ? 'Organization Subscriptions' : 'Subscription Plans')
                  : (viewMode === 'plans' ? 'Select Product Offering' : 'Client Subscriptions List')}
              </h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
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
            {viewMode === 'subscriptions' ? (
              <Button
                variant="primary"
                size="md"
                onClick={() => handleOpenAssignSubscription()}
                icon={<Plus className="w-4 h-4" strokeWidth={2.5} />}
              >
                Assign Subscription
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={() =>
                  handleOpenCreatePlan(
                    appliedPlanProduct !== 'ALL'
                      ? appliedPlanProduct
                      : (pendingPlanProduct !== 'ALL' ? pendingPlanProduct : (products[0]?.id || ''))
                  )
                }
                icon={<Plus className="w-4 h-4" strokeWidth={2.5} />}
              >
                Add Plan
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

      {/* Standalone Centered View Switcher */}
      {!lockMode && (
        <div className="flex justify-center items-center w-full">
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => setViewMode('plans')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer flex items-center gap-2 ${
                viewMode === 'plans'
                  ? 'bg-[#33077C] text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              {viewMode === 'plans' && (
                <Check className="w-3.5 h-3.5 stroke-[3] text-white" />
              )}
              <span>Product Subscription Plans</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('subscriptions')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer flex items-center gap-2 ${
                viewMode === 'subscriptions'
                  ? 'bg-[#33077C] text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              {viewMode === 'subscriptions' && (
                <Check className="w-3.5 h-3.5 stroke-[3] text-white" />
              )}
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
                                <PlanBadge planName={sub.plan} />
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
                                <SubscriptionStatusBadge status={sub.status} />
                              </td>

                              {/* 7. Action (3-Dots Menu) */}
                              <td className="py-4 px-5 border border-slate-200 text-center">
                                <div className="relative inline-block text-left" data-row-menu-trigger>
                                  <button
                                    type="button"
                                    title="Subscription Actions"
                                    onClick={(e) => rowMenu.toggle(e, sub.id)}
                                    className="w-8 h-8 rounded-lg bg-[#33077C] hover:bg-[#432fb3] flex items-center justify-center text-white shadow-xs transition-all hover:scale-105 active:scale-95 mx-auto cursor-pointer"
                                  >
                                    <MoreVertical className="w-4 h-4 fill-white" />
                                  </button>

                                  {/* Portal Dropdown Menu */}
                                  {rowMenu.activeId === sub.id && rowMenu.pos && (
                                    <div
                                      data-row-menu className="fixed z-50 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 py-3 px-2 animate-in fade-in zoom-in-95 duration-100"
                                      style={{
                                        top: rowMenu.pos.top !== undefined ? `${rowMenu.pos.top}px` : undefined,
                                        bottom: rowMenu.pos.bottom !== undefined ? `${rowMenu.pos.bottom}px` : undefined,
                                        right: `${rowMenu.pos.right}px`,
                                      }}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          rowMenu.close();
                                          setViewingOrgSubId(sub.id);
                                        }}
                                        className="w-full px-3 py-2 text-left text-[13px] font-bold text-slate-800 hover:bg-slate-50 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                                      >
                                        <span
                                          style={{ width: '26.25px', height: '26.25px' }}
                                          className="rounded-full bg-[#F97316] flex items-center justify-center shrink-0 shadow-2xs"
                                        >
                                          <Eye style={{ width: '13.13px', height: '13.13px' }} className="text-white stroke-[2.2]" />
                                        </span>
                                        <span>View</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          rowMenu.close();
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
                                          rowMenu.close();
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
                                          rowMenu.close();
                                          setSubConfirmAction({
                                            type: 'org_sub',
                                            title: 'Cancel Organization Subscription',
                                            description: `Are you sure you want to cancel the subscription for ${sub.orgName}?`,
                                            buttonText: 'Yes, Cancel',
                                            targetId: sub.id,
                                            targetName: sub.orgName,
                                            extraData: sub,
                                          });
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
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">STATUS & CYCLE</th>
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
                          const displayId = sub.subscriptionNumber || formatDisplaySubId(sub.id, (safeSubsPage - 1) * subsPageSize + 101 + idx);
                          const contactName = sub.customer?.name || 'Primary Account Holder';
                          const phone = sub.customer?.phone || '';
                          const whatsapp = (sub.customer as any)?.whatsapp || '';
                          const email = sub.customer?.email || '';

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
                                <ContactCopyButtons
                                  id={sub.id}
                                  phone={phone}
                                  whatsapp={whatsapp}
                                  email={email}
                                  copiedKey={copiedKey}
                                  onCopy={handleCopy}
                                />
                              </td>

                              {/* 3. Product & Offering */}
                              <td className="py-4 px-5 border border-slate-200">
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Offering</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${dotColorFor(prodName)}`} />
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
                                <SubscriptionStatusBadge status={sub.status} />
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
                                <div className="relative inline-block text-left" data-row-menu-trigger>
                                  <button
                                    type="button"
                                    title="Subscription Actions"
                                    onClick={(e) => rowMenu.toggle(e, sub.id)}
                                    className="w-8 h-8 rounded-lg bg-[#33077C] hover:bg-[#432fb3] flex items-center justify-center text-white shadow-xs transition-all hover:scale-105 active:scale-95 mx-auto cursor-pointer"
                                  >
                                    <MoreVertical className="w-4 h-4 fill-white" />
                                  </button>

                                  {/* Portal Dropdown Menu */}
                                  {rowMenu.activeId === sub.id && rowMenu.pos && (
                                    <div
                                      data-row-menu className="fixed z-50 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 py-3 px-2 animate-in fade-in zoom-in-95 duration-100"
                                      style={{
                                        top: rowMenu.pos.top !== undefined ? `${rowMenu.pos.top}px` : undefined,
                                        bottom: rowMenu.pos.bottom !== undefined ? `${rowMenu.pos.bottom}px` : undefined,
                                        right: `${rowMenu.pos.right}px`,
                                      }}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          rowMenu.close();
                                          setViewingClientSubId(sub.id);
                                        }}
                                        className="w-full px-3 py-2 text-left text-[13px] font-bold text-slate-800 hover:bg-slate-50 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                                      >
                                        <span
                                          style={{ width: '26.25px', height: '26.25px' }}
                                          className="rounded-full bg-[#F97316] flex items-center justify-center shrink-0 shadow-2xs"
                                        >
                                          <Eye style={{ width: '13.13px', height: '13.13px' }} className="text-white stroke-[2.2]" />
                                        </span>
                                        <span>View</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          rowMenu.close();
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
                                          rowMenu.close();
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
                                          rowMenu.close();
                                          setSubConfirmAction({
                                            type: 'client_sub',
                                            title: 'Remove Subscription',
                                            description: `Are you sure you want to delete/cancel the subscription for ${sub.customerName}?`,
                                            buttonText: 'Yes, Delete',
                                            targetId: sub.id,
                                            targetName: sub.customerName,
                                            extraData: sub,
                                          });
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
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">PLAN TYPE</th>
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
                          const isDropdownOpen = rowMenu.activeId === plan.id;
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
                                <PlanStatusBadge status={plan.status} />
                              </td>

                              {/* 8. Action (3-Dots Menu) */}
                              <td className="py-4 px-5 border border-slate-200 text-center">
                                <div className="relative inline-block text-left" data-row-menu-trigger>
                                  <button
                                    type="button"
                                    title="Plan Actions"
                                    onClick={(e) => rowMenu.toggle(e, plan.id)}
                                    className="w-8 h-8 rounded-lg bg-[#33077C] hover:bg-[#432fb3] flex items-center justify-center text-white shadow-xs transition-all hover:scale-105 active:scale-95 mx-auto cursor-pointer"
                                  >
                                    <MoreVertical className="w-4 h-4 fill-white" />
                                  </button>

                                  {/* Portal Dropdown Menu */}
                                  {isDropdownOpen && rowMenu.pos && (
                                    <div
                                      data-row-menu className="fixed z-50 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 py-3 px-2 animate-in fade-in zoom-in-95 duration-100"
                                      style={{
                                        top: rowMenu.pos.top !== undefined ? `${rowMenu.pos.top}px` : undefined,
                                        bottom: rowMenu.pos.bottom !== undefined ? `${rowMenu.pos.bottom}px` : undefined,
                                        right: `${rowMenu.pos.right}px`,
                                      }}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          rowMenu.close();
                                          setViewingPlanId(plan.id);
                                        }}
                                        className="w-full px-3 py-2 text-left text-[13px] font-bold text-slate-800 hover:bg-slate-50 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                                      >
                                        <span
                                          style={{ width: '26.25px', height: '26.25px' }}
                                          className="rounded-full bg-[#F97316] flex items-center justify-center shrink-0 shadow-2xs"
                                        >
                                          <Eye style={{ width: '13.13px', height: '13.13px' }} className="text-white stroke-[2.2]" />
                                        </span>
                                        <span>View</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          rowMenu.close();
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
                                          rowMenu.close();
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
                                          rowMenu.close();
                                          setSubConfirmAction({
                                            type: 'plan',
                                            title: 'Delete Subscription Plan',
                                            description: `Are you sure you want to remove the plan "${plan.name}"? This action cannot be undone.`,
                                            buttonText: 'Yes, Delete',
                                            targetId: plan.id,
                                            targetName: plan.name,
                                            extraData: { product, plan },
                                          });
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
            </div>
          ) : (
            // =====================================================
            // ADMIN / STAFF: Modern Product Plans Table UI (Matching Reference)
            // =====================================================
            <div className="space-y-6">
              {/* Top SearchBar with Product & Status FilterDropdowns, Apply, Reset, and RightSlot */}
              <SearchBar
                value={pendingPlanSearch}
                onChange={(val) => setPendingPlanSearch(val)}
                placeholder="Search plans by name, price, billing cycle, plan type..."
                onSubmit={() => {
                  setAppliedPlanSearch(pendingPlanSearch);
                  setAppliedPlanProduct(pendingPlanProduct);
                  setAppliedPlanStatus(pendingPlanStatus);
                  setPlansPage(1);
                }}
                onReset={() => {
                  setPendingPlanSearch('');
                  setAppliedPlanSearch('');
                  const firstProdId = products[0]?.id || '';
                  setPendingPlanProduct(firstProdId);
                  setAppliedPlanProduct(firstProdId);
                  setPendingPlanStatus('ALL');
                  setAppliedPlanStatus('ALL');
                  setPlansPage(1);
                }}
                filterSlot={
                  <div className="flex items-center gap-2.5">
                    {/* Product Filter Dropdown */}
                    <FilterDropdown
                      options={products.map((p) => ({
                        label: p.name,
                        value: p.id,
                      }))}
                      value={pendingPlanProduct}
                      onChange={(val) => setPendingPlanProduct(val)}
                      placeholder="Select Product"
                    />

                    {/* Status Filter Dropdown */}
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
                  </div>
                }
                rightSlot={
                  <span className="text-xs font-semibold text-slate-500 pr-2">
                    Total Plans :{' '}
                    <span className="text-[#33077C] font-bold">{filteredPlansList.length}</span>
                  </span>
                }
              />

              {/* Modern Product Plans Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-slate-200 min-w-[950px]">
<thead>
                      <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white tracking-wider uppercase">
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">PRODUCT NAME</th>
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">PLAN NAME</th>
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">PRICE</th>
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">TOTAL PRICE WITH GST</th>
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">BILLING CYCLE</th>
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">STATUS</th>
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {loading || isProductPlansLoading ? (
                        <tr>
                          <td colSpan={7} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <div className="w-7 h-7 border-3 border-[#33077C] border-t-transparent rounded-full animate-spin" />
                              <span className="text-xs text-slate-500 font-medium">Loading subscription plans...</span>
                            </div>
                          </td>
                        </tr>
                      ) : pagedPlans.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                            No subscription plans found matching your filter criteria.
                          </td>
                        </tr>
                      ) : (
                        pagedPlans.map((item) => {
                          const { plan, product } = item;
                          const isDropdownOpen = rowMenu.activeId === plan.id;
                          const currencySymbol = plan.currency || '₹';
                          const isCustom = plan.customizablePrice;
                          const basePrice = plan.price || 0;
                          const totalPriceWithGst = Math.round(basePrice * 1.18);

                          return (
                            <tr key={`${product.id}-${plan.id}`} className="hover:bg-slate-50/80 transition-colors">
                              {/* 1. Product Name */}
                              <td className="py-4 px-5 border border-slate-200">
                                <span className="font-bold text-slate-900 text-sm block">
                                  {product?.name || 'CRM Product'}
                                </span>
                              </td>

                              {/* 2. Plan Name */}
                              <td className="py-4 px-5 border border-slate-200">
                                <span className="font-bold text-slate-900 text-sm block">
                                  {plan.name}
                                </span>
                              </td>

                              {/* 3. Price */}
                              <td className="py-4 px-5 border border-slate-200">
                                <span className="font-bold text-slate-900 text-sm">
                                  {isCustom ? (
                                    <span className="text-slate-700">Custom Quote</span>
                                  ) : (
                                    `${currencySymbol}${basePrice.toLocaleString()}`
                                  )}
                                </span>
                              </td>

                              {/* 4. Total Price with GST (18%) */}
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

                              {/* 5. Billing Cycle */}
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

                              {/* 6. Status Badge */}
                              <td className="py-4 px-5 border border-slate-200 text-center">
                                <PlanStatusBadge status={plan.status} />
                              </td>

                              {/* 7. Action (3-Dots Menu) */}
                              <td className="py-4 px-5 border border-slate-200 text-center">
                                <div className="relative inline-block text-left" data-row-menu-trigger>
                                  <button
                                    type="button"
                                    title="Plan Actions"
                                    onClick={(e) => rowMenu.toggle(e, plan.id)}
                                    className="w-8 h-8 rounded-lg bg-[#33077C] hover:bg-[#432fb3] flex items-center justify-center text-white shadow-xs transition-all hover:scale-105 active:scale-95 mx-auto cursor-pointer"
                                  >
                                    <MoreVertical className="w-4 h-4 fill-white" />
                                  </button>

                                  {/* Portal Dropdown Menu */}
                                  {isDropdownOpen && rowMenu.pos && (
                                    <div
                                      data-row-menu className="fixed z-50 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 py-3 px-2 animate-in fade-in zoom-in-95 duration-100"
                                      style={{
                                        top: rowMenu.pos.top !== undefined ? `${rowMenu.pos.top}px` : undefined,
                                        bottom: rowMenu.pos.bottom !== undefined ? `${rowMenu.pos.bottom}px` : undefined,
                                        right: `${rowMenu.pos.right}px`,
                                      }}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          rowMenu.close();
                                          setViewingProductPlan({ productId: product.id, planId: plan.id });
                                        }}
                                        className="w-full px-3 py-2 text-left text-[13px] font-bold text-slate-800 hover:bg-slate-50 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                                      >
                                        <span
                                          style={{ width: '26.25px', height: '26.25px' }}
                                          className="rounded-full bg-[#F97316] flex items-center justify-center shrink-0 shadow-2xs"
                                        >
                                          <Eye style={{ width: '13.13px', height: '13.13px' }} className="text-white stroke-[2.2]" />
                                        </span>
                                        <span>View</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          rowMenu.close();
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
                                          rowMenu.close();
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
                                          rowMenu.close();
                                          setSubConfirmAction({
                                            type: 'plan',
                                            title: 'Delete Subscription Plan',
                                            description: `Are you sure you want to remove the plan "${plan.name}"? This action cannot be undone.`,
                                            buttonText: 'Yes, Delete',
                                            targetId: plan.id,
                                            targetName: plan.name,
                                            extraData: { product, plan },
                                          });
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
              <Pagination
                  currentPage={safePlansPage}
                  total={filteredPlansList.length}
                  pageSize={plansPageSize}
                  onPageChange={(page) => setPlansPage(page)}
                  onPageSizeChange={(size) => {
                    setPlansPageSize(size);
                    setPlansPage(1);
                  }}
                />
            </div>
          )}
        </div>
      )}

      {/* Modal: View Product Subscription Plan */}
      {viewingProductPlan && (() => {
        const productRow = products.find((x) => x.id === viewingProductPlan.productId);
        const row0 = (productPlansByProductId[viewingProductPlan.productId] || productRow?.plans || []).find(
          (x: ProductPlan) => x.id === viewingProductPlan.planId
        );
        const d = viewingProductPlanDetail;
        // detail wins; the list row fills anything the detail does not carry
        const p = d
          ? {
              name: d.name || row0?.name || '-',
              code: d.code || '',
              price: Number(d.price) || 0,
              billingCycle: d.billingCycle || row0?.billingCycle || '-',
              features: d.features?.length ? d.features : row0?.features || [],
              status: d.status || row0?.status || 'Active',
              createdAt: d.createdAt,
              updatedAt: d.updatedAt,
            }
          : row0
            ? {
                name: row0.name,
                code: '',
                price: Number(row0.price) || 0,
                billingCycle: row0.billingCycle,
                features: row0.features || [],
                status: row0.status || 'Active',
                createdAt: '',
                updatedAt: '',
              }
            : null;
        if (!p) return null;
        const money = (n?: number) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;
        const rowEl = (label: string, value: React.ReactNode, first = false) => (
          <div className={`flex items-start justify-between gap-4 ${first ? '' : 'pt-2.5 border-t border-slate-100'}`}>
            <span className="text-slate-400 font-medium shrink-0">{label}</span>
            <span className="font-bold text-slate-800 text-right leading-snug">{value || '-'}</span>
          </div>
        );
        return (
          <Modal
            isOpen
            onClose={() => setViewingProductPlan(null)}
            title="Subscription Plan Details"
            subtitle="View plan pricing, billing cycle and included features"
            maxWidth="4xl"
            headerGradient={true}
            showBackIcon={true}
            hideCloseButton={true}
          >
            <div className="space-y-5" aria-busy={viewProductPlanLoading}>
              {viewProductPlanLoading && <p className="text-[11px] font-medium text-slate-400">Loading latest details…</p>}

              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">{p.name}</h3>
                    {p.code && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">{p.code}</span>
                    )}
                    {productRow?.name && (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">{productRow.name}</span>
                    )}
                  </div>
                </div>
                <PlanStatusBadge status={p.status} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3.5">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[#33077C] flex items-center justify-center">
                      <Tag className="w-3.5 h-3.5" />
                    </div>
                    <span>Pricing & Billing</span>
                  </div>
                  <div className="space-y-3 text-xs sm:text-[13px]">
                    {rowEl('Price', money(p.price), true)}
                    {rowEl('Price incl. 18% GST', money(Math.round(p.price * 1.18)))}
                    {rowEl('Billing Cycle', p.billingCycle)}
                    {rowEl('Product', productRow?.name)}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3.5">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[#33077C] flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span>Included Features</span>
                  </div>
                  {p.features.length === 0 ? (
                    <p className="text-xs text-slate-400">No features listed.</p>
                  ) : (
                    <ul className="space-y-2 text-xs sm:text-[13px]">
                      {p.features.map((f: string) => (
                        <li key={f} className="flex items-start gap-2 font-medium text-slate-700">
                          <Check className="w-3.5 h-3.5 mt-0.5 text-emerald-600 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {(p.createdAt || p.updatedAt) && (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3 text-xs sm:text-[13px]">
                  {rowEl('Created', formatDisplayDate(p.createdAt), true)}
                  {rowEl('Last Updated', formatDisplayDate(p.updatedAt))}
                </div>
              )}

              <div className="pt-4 flex justify-end items-center gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setViewingProductPlan(null)}
                  className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center gap-2"
                >
                  <X className="w-4 h-4 text-slate-500" />
                  <span>Close</span>
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Modal: View Client Subscription */}
      {viewingClientSubId && (() => {
        const list = apiClientSubs.find((x) => x.id === viewingClientSubId);
        const d = viewingClientSubDetail;
        // detail wins, but never blanks what the list row already carries (customer / product / plan objects)
        const s = d ? ({ ...list, ...d, customer: d.customer ?? list?.customer, product: d.product ?? list?.product, plan: d.plan ?? list?.plan } as ClientSubscriptionApiItem) : list;
        if (!s) return null;
        const money = (n?: number) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;
        const row = (label: string, value: React.ReactNode, first = false) => (
          <div className={`flex items-start justify-between gap-4 ${first ? '' : 'pt-2.5 border-t border-slate-100'}`}>
            <span className="text-slate-400 font-medium shrink-0">{label}</span>
            <span className="font-bold text-slate-800 text-right leading-snug break-all">{value || '-'}</span>
          </div>
        );
        const days = s.daysRemaining;
        const clientName = s.customer?.company || s.customer?.name || 'Client';
        return (
          <Modal
            isOpen
            onClose={() => setViewingClientSubId(null)}
            title="Client Subscription Details"
            subtitle="View client, product, plan, billing period and renewal information"
            maxWidth="4xl"
            headerGradient={true}
            showBackIcon={true}
            hideCloseButton={true}
          >
            <div className="space-y-5" aria-busy={viewClientSubLoading}>
              {viewClientSubLoading && <p className="text-[11px] font-medium text-slate-400">Loading latest details…</p>}

              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">{clientName}</h3>
                    {s.customer?.customerCode && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">{s.customer.customerCode}</span>
                    )}
                    {s.subscriptionNumber && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">{s.subscriptionNumber}</span>
                    )}
                  </div>
                  {s.customer?.company && s.customer?.name && (
                    <p className="text-xs font-medium text-slate-500 mt-0.5">{s.customer.name}</p>
                  )}
                </div>
                <SubscriptionStatusBadge status={s.status} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3.5">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[#33077C] flex items-center justify-center">
                      <Repeat className="w-3.5 h-3.5" />
                    </div>
                    <span>Product & Billing</span>
                  </div>
                  <div className="space-y-3 text-xs sm:text-[13px]">
                    {row('Product', s.product?.name, true)}
                    {row('Plan', s.plan?.name ? `${s.plan.name}${s.plan.code ? ` (${s.plan.code})` : ''}` : '')}
                    {row('Billing Cycle', s.billingCycle)}
                    {row('Amount', money(s.amount))}
                    {row('Discount', money(s.discount))}
                    {row('GST Rate', s.gstRate !== undefined && s.gstRate !== null ? `${s.gstRate}%` : '-')}
                    {row('Amount with GST', money(s.amountWithGst))}
                    {row('Bonus Months', s.bonusMonths ? `${s.bonusMonths} month${s.bonusMonths === 1 ? '' : 's'}` : '0')}
                    {row('Start Date', formatDisplayDate(s.startDate))}
                    {row('Next Renewal', formatDisplayDate(s.endDate))}
                    {row('Days Remaining', days === null || days === undefined ? '-' : `${days} day${days === 1 ? '' : 's'}`)}
                    {row('Auto Renew', s.autoRenew ? 'Enabled' : 'Disabled')}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3.5">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[#33077C] flex items-center justify-center">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <span>Client & History</span>
                  </div>
                  <div className="space-y-3 text-xs sm:text-[13px]">
                    {row('Contact Person', s.customer?.name, true)}
                    {row('Email', s.customer?.email)}
                    {row('Phone', s.customer?.phone)}
                    {row('Last Renewed', s.lastRenewedAt ? formatDisplayDate(s.lastRenewedAt) : '-')}
                    {s.cancelledAt && row('Cancelled On', formatDisplayDate(s.cancelledAt))}
                    {row('Created', formatDisplayDate(s.createdAt))}
                  </div>
                </div>
              </div>

              {s.notes && (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-2">
                  <p className="text-slate-900 font-bold text-sm">Notes</p>
                  <p className="text-xs sm:text-[13px] text-slate-600 whitespace-pre-wrap">{s.notes}</p>
                </div>
              )}

              <div className="pt-4 flex justify-end items-center gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setViewingClientSubId(null)}
                  className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center gap-2"
                >
                  <X className="w-4 h-4 text-slate-500" />
                  <span>Close</span>
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Modal: View Organization Subscription (Platform Admin) */}
      {viewingOrgSubId && (() => {
        const s = viewingOrgSubDetail ?? apiOrgSubs.find((x) => x.id === viewingOrgSubId);
        if (!s) return null;
        const money = (n?: number) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;
        const row = (label: string, value: React.ReactNode, first = false) => (
          <div className={`flex items-start justify-between gap-4 ${first ? '' : 'pt-2.5 border-t border-slate-100'}`}>
            <span className="text-slate-400 font-medium shrink-0">{label}</span>
            <span className="font-bold text-slate-800 text-right leading-snug break-all">{value || '-'}</span>
          </div>
        );
        const days = s.daysRemaining;
        return (
          <Modal
            isOpen
            onClose={() => setViewingOrgSubId(null)}
            title="Organization Subscription Details"
            subtitle="View plan, billing period, renewal and contact information"
            maxWidth="4xl"
            headerGradient={true}
            showBackIcon={true}
            hideCloseButton={true}
          >
            <div className="space-y-5" aria-busy={viewOrgSubLoading}>
              {viewOrgSubLoading && <p className="text-[11px] font-medium text-slate-400">Loading latest details…</p>}

              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">{s.orgName || 'Organization'}</h3>
                    {s.orgCode && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">{s.orgCode}</span>
                    )}
                    {s.subscriptionNumber && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">{s.subscriptionNumber}</span>
                    )}
                  </div>
                  {s.industry && <p className="text-xs font-medium text-slate-500 mt-0.5">{s.industry}</p>}
                </div>
                <div className="flex sm:flex-col items-start sm:items-end gap-2 shrink-0">
                  <SubscriptionStatusBadge status={s.status} />
                  <PlanBadge planName={s.planName} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3.5">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[#33077C] flex items-center justify-center">
                      <Repeat className="w-3.5 h-3.5" />
                    </div>
                    <span>Plan & Billing</span>
                  </div>
                  <div className="space-y-3 text-xs sm:text-[13px]">
                    {row('Plan', `${s.planName || '-'}${s.planCode ? ` (${s.planCode})` : ''}`, true)}
                    {row('Billing Cycle', s.billingCycle)}
                    {row('Amount', money(s.amount))}
                    {row('Start Date', formatDisplayDate(s.startDate))}
                    {row('Expiry Date', formatDisplayDate(s.endDate))}
                    {row('Days Remaining', days === null || days === undefined ? '-' : `${days} day${days === 1 ? '' : 's'}`)}
                    {row('Auto Renew', s.autoRenew ? 'Enabled' : 'Disabled')}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3.5">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[#33077C] flex items-center justify-center">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <span>Contact & History</span>
                  </div>
                  <div className="space-y-3 text-xs sm:text-[13px]">
                    {row('Contact Person', s.contactPerson, true)}
                    {row('Email', s.email)}
                    {row('Phone', s.phone)}
                    {row('Last Renewed', s.lastRenewedAt ? formatDisplayDate(s.lastRenewedAt) : '-')}
                    {s.cancelledAt && row('Cancelled On', formatDisplayDate(s.cancelledAt))}
                    {s.cancelledAt && row('Cancellation Reason', s.cancellationReason)}
                    {row('Created', formatDisplayDate(s.createdAt))}
                  </div>
                </div>
              </div>

              {s.notes && (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-2">
                  <p className="text-slate-900 font-bold text-sm">Notes</p>
                  <p className="text-xs sm:text-[13px] text-slate-600 whitespace-pre-wrap">{s.notes}</p>
                </div>
              )}

              <div className="pt-4 flex justify-end items-center gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setViewingOrgSubId(null)}
                  className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center gap-2"
                >
                  <X className="w-4 h-4 text-slate-500" />
                  <span>Close</span>
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Modal: View Subscription Plan (Platform Admin) */}
      {viewingPlanId && (() => {
        const p = viewingPlanDetail ?? apiPlans.find((x) => x.id === viewingPlanId);
        if (!p) return null;
        const gst = Number(p.gstRate) || 0;
        const money = (n?: number) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;
        const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB') : '-');
        const row = (label: string, value: React.ReactNode, first = false) => (
          <div className={`flex items-start justify-between gap-4 ${first ? '' : 'pt-2.5 border-t border-slate-100'}`}>
            <span className="text-slate-400 font-medium shrink-0">{label}</span>
            <span className="font-bold text-slate-800 text-right leading-snug">{value}</span>
          </div>
        );
        const limits = Object.entries(p.limits || {}).filter(([, v]) => v !== null && v !== undefined);
        const limitLabel = (k: string) => k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
        return (
          <Modal
            isOpen
            onClose={() => setViewingPlanId(null)}
            title="Subscription Plan Details"
            subtitle="View plan pricing, limits and included features"
            maxWidth="4xl"
            headerGradient={true}
            showBackIcon={true}
            hideCloseButton={true}
          >
            <div className="space-y-5" aria-busy={viewPlanLoading}>
              {viewPlanLoading && <p className="text-[11px] font-medium text-slate-400">Loading latest details…</p>}

              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">{p.name}</h3>
                    {p.code && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">{p.code}</span>
                    )}
                    {p.isPopular && (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">Popular</span>
                    )}
                  </div>
                  {p.tier && <p className="text-xs font-medium text-slate-500 mt-0.5">{p.tier}</p>}
                  {p.description && <p className="text-xs text-slate-500 mt-1.5 max-w-xl">{p.description}</p>}
                </div>
                <PlanStatusBadge status={(p.status as 'Active' | 'Inactive') || 'Active'} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3.5">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[#33077C] flex items-center justify-center">
                      <Tag className="w-3.5 h-3.5" />
                    </div>
                    <span>Pricing & Billing</span>
                  </div>
                  <div className="space-y-3 text-xs sm:text-[13px]">
                    {row('Monthly Price', money(p.monthlyPrice), true)}
                    {row('Annual Price', money(p.annualPrice))}
                    {row('GST Rate', `${gst}%`)}
                    {row('Monthly Price incl. GST', money(Math.round((Number(p.monthlyPrice) || 0) * (1 + gst / 100))))}
                    {row('Billing Cycle', p.billingCycle || '-')}
                    {row('Plan Type', p.pricingType || '-')}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3.5">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[#33077C] flex items-center justify-center">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <span>Limits & Usage</span>
                  </div>
                  <div className="space-y-3 text-xs sm:text-[13px]">
                    {limits.length === 0
                      ? row('Limits', '-', true)
                      : limits.map(([k, v], i) => row(limitLabel(k), k.toLowerCase().includes('storage') ? `${v} GB` : String(v), i === 0))}
                    {row('Active Subscriptions', p.activeSubscriptions ?? 0)}
                    {row('Created', fmtDate(p.createdAt))}
                    {row('Last Updated', fmtDate(p.updatedAt))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[#33077C] flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>Included Features</span>
                </div>
                {(p.features || []).length === 0 ? (
                  <p className="text-xs text-slate-400">No features listed.</p>
                ) : (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs sm:text-[13px]">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 font-medium text-slate-700">
                        <Check className="w-3.5 h-3.5 mt-0.5 text-emerald-600 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="pt-4 flex justify-end items-center gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setViewingPlanId(null)}
                  className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center gap-2"
                >
                  <X className="w-4 h-4 text-slate-500" />
                  <span>Close</span>
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

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
            {/* Row 1: Select Customer, Target Product, Billing Cycle */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Select Customer <span className="text-rose-500 font-bold">*</span>
                </label>
                <CustomSelect
                  value={subCustomerId}
                  error={!!subFormErrors.customerId}
                  onChange={(val) => {
                    setSubCustomerId(val);
                    const found = customers.find((c) => c.id === val);
                    setSubCustomerName(found?.company || found?.name || '');
                    if (subFormErrors.customerId) setSubFormErrors((prev) => ({ ...prev, customerId: '' }));
                  }}
                  options={customers.map((c) => ({
                    value: c.id,
                    label: `${c.company || c.name}${c.clientId && c.clientId !== c.id ? ` (${c.clientId})` : ''}`,
                  }))}
                  optionVariant="strong"
                  placeholder="Select Customer"
                  activeColor="brand"
                />
                {subFormErrors.customerId && (
                  <p className="text-[11px] font-medium text-red-500 mt-1">{subFormErrors.customerId}</p>
                )}
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Target Product <span className="text-rose-500 font-bold">*</span>
                </label>
                <CustomSelect
                  value={subProductId}
                  error={!!subFormErrors.productId}
                  onChange={(val) => {
                    handleProductChangeInSubModal(val);
                    if (subFormErrors.productId) setSubFormErrors((prev) => ({ ...prev, productId: '' }));
                  }}
                  options={products.map((p) => ({
                    value: p.id,
                    label: p.code ? `${p.name} (${p.code})` : p.name,
                  }))}
                  optionVariant="strong"
                  placeholder="Select Product"
                  activeColor="brand"
                />
                {subFormErrors.productId && (
                  <p className="text-[11px] font-medium text-red-500 mt-1">{subFormErrors.productId}</p>
                )}
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Billing Cycle <span className="text-rose-500 font-bold">*</span>
                </label>
                <CustomSelect
                  value={subBillingCycle}
                  error={!!subFormErrors.billingCycle}
                  onChange={(val) => {
                    setSubBillingCycle(val as any);
                    if (subStartDate) {
                      setSubEndDate(computeEndDate(subStartDate, val));
                    }
                    if (subFormErrors.billingCycle) setSubFormErrors((prev) => ({ ...prev, billingCycle: '' }));
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
                {subFormErrors.billingCycle && (
                  <p className="text-[11px] font-medium text-red-500 mt-1">{subFormErrors.billingCycle}</p>
                )}
              </div>
            </div>

            {/* Row 2: Agreed Fee Amount, Start Date, Renewal Date */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Agreed Fee Amount (₹) <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={subAmount}
                  onChange={(e) => {
                    setSubAmount(e.target.value === '' ? '' : Number(e.target.value));
                    if (subFormErrors.amount) setSubFormErrors((prev) => ({ ...prev, amount: '' }));
                  }}
                  className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                    subFormErrors.amount
                      ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                      : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                  }`}
                />
                {subFormErrors.amount && (
                  <p className="text-[11px] font-medium text-red-500 mt-1">{subFormErrors.amount}</p>
                )}
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Start Date <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type={subStartDate ? "date" : "text"}
                  onFocus={(e) => (e.currentTarget.type = "date")}
                  onBlur={(e) => {
                    if (!e.currentTarget.value) e.currentTarget.type = "text";
                  }}
                  placeholder="dd/mm/yyyy"
                  value={subStartDate}
                  onChange={(e) => {
                    setSubStartDate(e.target.value);
                    if (subBillingCycle) {
                      setSubEndDate(computeEndDate(e.target.value, subBillingCycle));
                    }
                    if (subFormErrors.startDate) setSubFormErrors((prev) => ({ ...prev, startDate: '' }));
                  }}
                  className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all cursor-pointer placeholder:text-slate-400 ${
                    subFormErrors.startDate
                      ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                      : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                  }`}
                />
                {subFormErrors.startDate && (
                  <p className="text-[11px] font-medium text-red-500 mt-1">{subFormErrors.startDate}</p>
                )}
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Renewal Date <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type={subEndDate ? "date" : "text"}
                  onFocus={(e) => (e.currentTarget.type = "date")}
                  onBlur={(e) => {
                    if (!e.currentTarget.value) e.currentTarget.type = "text";
                  }}
                  placeholder="dd/mm/yyyy"
                  value={subEndDate}
                  onChange={(e) => {
                    setSubEndDate(e.target.value);
                    if (subFormErrors.endDate) setSubFormErrors((prev) => ({ ...prev, endDate: '' }));
                  }}
                  className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all cursor-pointer placeholder:text-slate-400 ${
                    subFormErrors.endDate
                      ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                      : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                  }`}
                />
                {subFormErrors.endDate && (
                  <p className="text-[11px] font-medium text-red-500 mt-1">{subFormErrors.endDate}</p>
                )}
              </div>
            </div>

            {/* Row 3: Status, Notes / Contract Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Status <span className="text-rose-500 font-bold">*</span>
                </label>
                <CustomSelect
                  value={subStatus}
                  error={!!subFormErrors.status}
                  onChange={(val) => {
                    setSubStatus(val as any);
                    if (subFormErrors.status) setSubFormErrors((prev) => ({ ...prev, status: '' }));
                  }}
                  options={[
                    { value: 'Active', label: 'Active' },
                    { value: 'Expiring Soon', label: 'Expiring Soon' },
                    { value: 'Expired', label: 'Expired' },
                    { value: 'Cancelled', label: 'Cancelled' },
                  ]}
                  placeholder="Select Status"
                  activeColor="brand"
                />
                {subFormErrors.status && (
                  <p className="text-[11px] font-medium text-red-500 mt-1">{subFormErrors.status}</p>
                )}
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
                  Select Organization <span className="text-rose-500 font-bold">*</span>
                </label>
                <CustomSelect
                  value={orgSubOrgId}
                  onChange={(val) => {
                    handleSelectOrgInModal(val);
                    if (orgSubErrors.organization) setOrgSubErrors((prev) => ({ ...prev, organization: '' }));
                  }}
                  options={availableOrgs.map((org: any) => ({
                    value: org.id,
                    label: org.code ? `${org.name} (${org.code})` : org.name,
                  }))}
                  optionVariant="strong"
                  placeholder="Select Organization"
                  activeColor="brand"
                  error={!!orgSubErrors.organization}
                />
                {orgSubErrors.organization && (
                  <p className="text-[11px] font-medium text-red-500 mt-1">{orgSubErrors.organization}</p>
                )}
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Subscription Plan <span className="text-rose-500 font-bold">*</span>
                </label>
                <CustomSelect
                  value={orgSubPlan}
                  onChange={(val) => {
                    handlePlanChangeInOrgModal(val);
                    if (orgSubErrors.plan) setOrgSubErrors((prev) => ({ ...prev, plan: '' }));
                  }}
                  options={orgPlans.map((p) => ({
                    value: p.name,
                    label: p.name,
                  }))}
                  placeholder="Select Subscription Plan"
                  activeColor="brand"
                  error={!!orgSubErrors.plan}
                />
                {orgSubErrors.plan && (
                  <p className="text-[11px] font-medium text-red-500 mt-1">{orgSubErrors.plan}</p>
                )}
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Billing Cycle <span className="text-rose-500 font-bold">*</span>
                </label>
                <CustomSelect
                  value={orgSubBillingCycle}
                  onChange={(val) => {
                    handleBillingCycleChangeInOrgModal(val as any);
                    if (orgSubErrors.billingCycle) setOrgSubErrors((prev) => ({ ...prev, billingCycle: '' }));
                  }}
                  options={[
                    { value: 'Monthly', label: 'Monthly' },
                    { value: 'Quarterly', label: 'Quarterly' },
                    { value: 'Annually', label: 'Annually' },
                  ]}
                  placeholder="Select Billing Cycle"
                  activeColor="brand"
                  error={!!orgSubErrors.billingCycle}
                />
                {orgSubErrors.billingCycle && (
                  <p className="text-[11px] font-medium text-red-500 mt-1">{orgSubErrors.billingCycle}</p>
                )}
              </div>
            </div>

            {/* Custom Organization Fields if 'org_custom' is selected */}
            {orgSubOrgId === 'org_custom' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Organization Name <span className="text-rose-500 font-bold">*</span>
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
                  Fee Amount (₹) <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={orgSubAmount === 0 ? '' : orgSubAmount}
                  onChange={(e) => {
                    setOrgSubAmount(Number(e.target.value));
                    if (orgSubErrors.amount) setOrgSubErrors((prev) => ({ ...prev, amount: '' }));
                  }}
                  className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                    orgSubErrors.amount
                      ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                      : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                  }`}
                />
                {orgSubErrors.amount && (
                  <p className="text-[11px] font-medium text-red-500 mt-1">{orgSubErrors.amount}</p>
                )}
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Start Date <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type={orgSubStartDate ? "date" : "text"}
                  onFocus={(e) => (e.currentTarget.type = "date")}
                  onBlur={(e) => {
                    if (!e.currentTarget.value) e.currentTarget.type = "text";
                  }}
                  placeholder="dd/mm/yyyy"
                  value={orgSubStartDate}
                  onChange={(e) => {
                    setOrgSubStartDate(e.target.value);
                    if (orgSubBillingCycle) {
                      setOrgSubEndDate(computeEndDate(e.target.value, orgSubBillingCycle));
                    }
                    if (orgSubErrors.startDate) setOrgSubErrors((prev) => ({ ...prev, startDate: '' }));
                    if (orgSubErrors.endDate) setOrgSubErrors((prev) => ({ ...prev, endDate: '' }));
                  }}
                  className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all cursor-pointer placeholder:text-slate-400 ${
                    orgSubErrors.startDate
                      ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                      : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                  }`}
                />
                {orgSubErrors.startDate && (
                  <p className="text-[11px] font-medium text-red-500 mt-1">{orgSubErrors.startDate}</p>
                )}
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Next Renewal Date <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type={orgSubEndDate ? "date" : "text"}
                  onFocus={(e) => (e.currentTarget.type = "date")}
                  onBlur={(e) => {
                    if (!e.currentTarget.value) e.currentTarget.type = "text";
                  }}
                  placeholder="dd/mm/yyyy"
                  value={orgSubEndDate}
                  onChange={(e) => {
                    setOrgSubEndDate(e.target.value);
                    if (orgSubErrors.endDate) setOrgSubErrors((prev) => ({ ...prev, endDate: '' }));
                  }}
                  className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all cursor-pointer placeholder:text-slate-400 ${
                    orgSubErrors.endDate
                      ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                      : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                  }`}
                />
                {orgSubErrors.endDate && (
                  <p className="text-[11px] font-medium text-red-500 mt-1">{orgSubErrors.endDate}</p>
                )}
              </div>
            </div>

            {/* Row 2b: Discount, GST Rate, Amount with GST */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Discount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 500"
                  value={orgSubDiscount}
                  onChange={(e) => {
                    setOrgSubDiscount(e.target.value);
                    if (orgSubErrors.discount) setOrgSubErrors((prev) => ({ ...prev, discount: '' }));
                  }}
                  className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                    orgSubErrors.discount
                      ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                      : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                  }`}
                />
                {orgSubErrors.discount && (
                  <p className="text-[11px] font-medium text-red-500 mt-1">{orgSubErrors.discount}</p>
                )}
              </div>
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  GST Rate <span className="text-rose-500 font-bold">*</span>
                </label>
                <CustomSelect
                  value={orgSubGstRate}
                  error={!!orgSubErrors.gstRate}
                  onChange={(val) => {
                    setOrgSubGstRate(val);
                    if (orgSubErrors.gstRate) setOrgSubErrors((prev) => ({ ...prev, gstRate: '' }));
                  }}
                  options={[
                    { value: '18', label: '18% (Standard GST)' },
                    { value: '12', label: '12% GST' },
                    { value: '5', label: '5% GST' },
                    { value: '0', label: '0% (Tax Exempt)' },
                  ]}
                  placeholder="Select GST Rate"
                  activeColor="brand"
                />
                {orgSubErrors.gstRate && (
                  <p className="text-[11px] font-medium text-red-500 mt-1">{orgSubErrors.gstRate}</p>
                )}
              </div>
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Amount with GST (₹)
                </label>
                <input
                  readOnly
                  tabIndex={-1}
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 11800"
                  value={orgSubAmountWithGst}
                  onChange={(e) => {
                    setOrgSubAmountWithGst(e.target.value);
                    if (orgSubErrors.amountWithGst) setOrgSubErrors((prev) => ({ ...prev, amountWithGst: '' }));
                  }}
                  className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                    orgSubErrors.amountWithGst
                      ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                      : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                  }`}
                />
                {orgSubErrors.amountWithGst && (
                  <p className="text-[11px] font-medium text-red-500 mt-1">{orgSubErrors.amountWithGst}</p>
                )}
              </div>
            </div>

            {/* Row 3: Contact Person, Email Address, Phone Number (3 columns) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Contact Person <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  value={orgSubContactPerson}
                  onChange={(e) => {
                    setOrgSubContactPerson(lettersOnly(e.target.value));
                    if (orgSubErrors.contactPerson) setOrgSubErrors((prev) => ({ ...prev, contactPerson: '' }));
                  }}
                  placeholder="Enter contact person"
                  className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                    orgSubErrors.contactPerson
                      ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                      : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                  }`}
                />
                {orgSubErrors.contactPerson && (
                  <p className="text-[11px] font-medium text-red-500 mt-1">{orgSubErrors.contactPerson}</p>
                )}
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Email Address <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="email"
                  value={orgSubEmail}
                  onChange={(e) => {
                    setOrgSubEmail(e.target.value);
                    if (orgSubErrors.email) setOrgSubErrors((prev) => ({ ...prev, email: '' }));
                  }}
                  placeholder="e.g. contact@domain.com"
                  className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                    orgSubErrors.email
                      ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                      : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                  }`}
                />
                {orgSubErrors.email && (
                  <p className="text-[11px] font-medium text-red-500 mt-1">{orgSubErrors.email}</p>
                )}
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Phone Number <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  value={orgSubPhone}
                  onChange={(e) => {
                    const val = digitsOnly(e.target.value);
                    setOrgSubPhone(val);
                    setOrgSubErrors((prev) => ({ ...prev, phone: liveMobileStartError('Phone Number', val) }));
                  }}
                  placeholder="e.g. 9876543210"
                  className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                    orgSubErrors.phone
                      ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                      : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                  }`}
                />
                {orgSubErrors.phone && (
                  <p className="text-[11px] font-medium text-red-500 mt-1">{orgSubErrors.phone}</p>
                )}
              </div>
            </div>

            {/* Row 4: Bonus Month, Notes & Terms */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Bonus Month
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 1"
                  value={orgSubBonusMonths}
                  onChange={(e) => {
                    setOrgSubBonusMonths(e.target.value);
                    if (orgSubErrors.bonusMonths) setOrgSubErrors((prev) => ({ ...prev, bonusMonths: '' }));
                  }}
                  className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                    orgSubErrors.bonusMonths
                      ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                      : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                  }`}
                />
                {orgSubErrors.bonusMonths && (
                  <p className="text-[11px] font-medium text-red-500 mt-1">{orgSubErrors.bonusMonths}</p>
                )}
              </div>
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

      {/* Reusable Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!subConfirmAction}
        onClose={() => {
          if (!isProcessingSubAction) setSubConfirmAction(null);
        }}
        type="Delete"
        title={subConfirmAction?.title}
        description={subConfirmAction?.description}
        confirmButtonText={subConfirmAction?.buttonText || 'Yes, Delete'}
        isLoading={isProcessingSubAction}
        onConfirm={async () => {
          if (!subConfirmAction) return;
          setIsProcessingSubAction(true);
          try {
            if (subConfirmAction.type === 'plan') {
              await handleDeletePlan(subConfirmAction.extraData.product, subConfirmAction.extraData.plan);
            } else if (subConfirmAction.type === 'org_sub') {
              await handleDeleteOrgSubscription(subConfirmAction.extraData);
            } else if (subConfirmAction.type === 'client_sub') {
              await handleDeleteSubscription(subConfirmAction.extraData);
            }
            setSubConfirmAction(null);
          } catch (err: any) {
            console.error('Action failed:', err);
          } finally {
            setIsProcessingSubAction(false);
          }
        }}
      />
    </div>
  );
};
