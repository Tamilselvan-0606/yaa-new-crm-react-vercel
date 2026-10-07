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
  plan: string;
  billingCycle: BillingCycle;
  amount: number;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Expiring Soon' | 'Expired' | 'Cancelled';
  autoRenew: boolean;
  notes?: string;
}

export const ORG_PLANS = [
  { name: 'Yaa Diamond', monthlyPrice: 3599, annualPrice: 35990, tier: 'Diamond Specialty Suite' },
  { name: 'Yaa Platinum', monthlyPrice: 4999, annualPrice: 49990, tier: 'Enterprise Platform Suite' },
  { name: 'Yaa Gold', monthlyPrice: 2499, annualPrice: 24990, tier: 'Growth Business Platform' },
  { name: 'Yaa Silver', monthlyPrice: 1749, annualPrice: 17490, tier: 'Standard Business Suite' },
  { name: 'Yaa Bronze', monthlyPrice: 999, annualPrice: 9990, tier: 'Starter Platform' },
];

export const INITIAL_ORG_SUBSCRIPTIONS: OrgSubscriptionItem[] = [
  {
    id: 'SUB-ORG-101',
    orgId: 'org_2',
    orgName: 'Polihills',
    orgCode: 'POLI-01',
    industry: 'Real Estate, Commercial Infra & Development',
    contactPerson: 'Sarah Jenkins',
    email: 'info@polihills.com',
    phone: '+91 98765 43211',
    whatsapp: '+91 98765 43211',
    plan: 'Yaa Gold',
    billingCycle: 'Monthly',
    amount: 2499,
    startDate: '2025-06-01',
    endDate: '2026-06-01',
    status: 'Active',
    autoRenew: true,
    notes: 'Primary real estate multi-branch organization contract.',
  },
  {
    id: 'SUB-ORG-102',
    orgId: 'org_1',
    orgName: 'YaaCreations',
    orgCode: 'YC-HQ',
    industry: 'Media, Branding & Digital Creative Tech',
    contactPerson: 'Alex Rivera',
    email: 'yaaadmin@gmail.com',
    phone: '+91 98765 43210',
    whatsapp: '+91 98765 43210',
    plan: 'Yaa Platinum',
    billingCycle: 'Annually',
    amount: 49990,
    startDate: '2025-01-15',
    endDate: '2026-01-15',
    status: 'Active',
    autoRenew: true,
    notes: 'Platform headquarters enterprise annual subscription.',
  },
  {
    id: 'SUB-ORG-103',
    orgId: 'org_3',
    orgName: 'Enmin Labs',
    orgCode: 'EML-02',
    industry: 'Software Engineering, AI & Bio-Diagnostics',
    contactPerson: 'Vikram Malhotra',
    email: 'hello@enminlabs.io',
    phone: '+91 98765 43212',
    whatsapp: '+91 98765 43212',
    plan: 'Yaa Silver',
    billingCycle: 'Monthly',
    amount: 1749,
    startDate: '2025-09-10',
    endDate: '2026-09-10',
    status: 'Active',
    autoRenew: true,
    notes: 'Diagnostic and lab workflow platform plan.',
  },
  {
    id: 'SUB-ORG-104',
    orgId: 'org_4',
    orgName: 'Apex Global Logistics',
    orgCode: 'AGL-03',
    industry: 'Supply Chain & Fleet Automation',
    contactPerson: 'Marcus Chen',
    email: 'ops@apexgl.com',
    phone: '+91 98765 43213',
    whatsapp: '+91 98765 43213',
    plan: 'Yaa Gold',
    billingCycle: 'Annually',
    amount: 24990,
    startDate: '2025-08-01',
    endDate: '2026-08-01',
    status: 'Expiring Soon',
    autoRenew: true,
    notes: 'Annual contract renewal scheduled for upcoming month.',
  },
  {
    id: 'SUB-ORG-105',
    orgId: 'org_5',
    orgName: 'CloudCore Solutions',
    orgCode: 'CCS-04',
    industry: 'Cloud Infrastructure & SaaS Hosting',
    contactPerson: 'Neha Sharma',
    email: 'billing@cloudcore.in',
    phone: '+91 98765 43214',
    whatsapp: '+91 98765 43214',
    plan: 'Yaa Bronze',
    billingCycle: 'Monthly',
    amount: 999,
    startDate: '2025-04-10',
    endDate: '2026-04-10',
    status: 'Active',
    autoRenew: false,
    notes: 'Starter tier cloud infrastructure setup.',
  },
];

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

  // Product Plan Selector: Dropdown selection (product.id or null) - default to Digital Marketing (prod_6)
  const [selectedPlanProductId, setSelectedPlanProductId] = useState<string | null>('prod_6');

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
  // SUPER ADMIN: Organization Subscriptions State & Storage
  // -------------------------------------------------------------
  const [orgSubscriptions, setOrgSubscriptions] = useState<OrgSubscriptionItem[]>(() => {
    const saved = localStorage.getItem('org_subscriptions_catalog');
    if (saved) {
      try {
        const parsed: OrgSubscriptionItem[] = JSON.parse(saved);
        // Validate amounts against current ORG_PLANS pricing; reset if stale
        const isStale = parsed.some((sub) => {
          const plan = ORG_PLANS.find((p) => p.name === sub.plan);
          if (!plan) return false;
          const expectedAmount =
            sub.billingCycle === 'Annually' ? plan.annualPrice : plan.monthlyPrice;
          return sub.amount !== expectedAmount;
        });
        if (!isStale) {
          return parsed.map((sub) =>
            sub.orgId === 'org_1' || sub.orgName?.toLowerCase() === 'yaacreations'
              ? { ...sub, email: 'yaaadmin@gmail.com' }
              : sub
          );
        }
        // Stale data detected &mdash; reset to fresh defaults
        localStorage.removeItem('org_subscriptions_catalog');
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_ORG_SUBSCRIPTIONS;
  });

  const saveOrgSubscriptions = (data: OrgSubscriptionItem[]) => {
    setOrgSubscriptions(data);
    localStorage.setItem('org_subscriptions_catalog', JSON.stringify(data));
  };

  // Available organizations from catalog
  const availableOrgs = useMemo(() => {
    const isOrgSuperAdmin = currentUser?.email?.toLowerCase() === 'orgsuperadmin@gmail.com' || currentUser?.email?.toLowerCase() === 'orgadmin@gmail.com';
    const storageKey = isOrgSuperAdmin ? 'organizations_catalog_orgsuperadmin' : 'organizations_catalog';

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed: any[] = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  }, [currentUser?.email]);

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
  const [orgSubPlan, setOrgSubPlan] = useState('');
  const [orgSubBillingCycle, setOrgSubBillingCycle] = useState<string>('');
  const [orgSubAmount, setOrgSubAmount] = useState<number>(0);
  const [orgSubStartDate, setOrgSubStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [orgSubEndDate, setOrgSubEndDate] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [orgSubAutoRenew, setOrgSubAutoRenew] = useState(true);
  const [orgSubNotes, setOrgSubNotes] = useState('');

  // Initial Data Load
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [prodsData, subsData, custsData] = await Promise.all([
        api.getProducts(),
        api.getSubscriptions(),
        api.getCustomers().catch(() => []),
      ]);
      const prods = prodsData || [];
      setProducts(prods);
      setSubscriptions(subsData || []);
      setCustomers(custsData || []);

      // Default selected product to Digital Marketing
      setSelectedPlanProductId((prev) => {
        if (prev && prods.some((p) => p.id === prev)) return prev;
        const dmk = prods.find((p) => p.name?.toLowerCase().includes('digital marketing') || p.id === 'prod_6');
        return dmk ? dmk.id : (prods[0]?.id || 'prod_6');
      });
    } catch (e: any) {
      console.error(e);
      showToast('error', 'Data Load Error', e.message || 'Failed to load subscription details');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // SUPER ADMIN: Organization Plans State & Storage
  // -------------------------------------------------------------
  const [orgPlans, setOrgPlans] = useState<ProductPlan[]>(() => {
    const defaultBranchLimits: Record<string, number> = {
      'Yaa Diamond': 50,
      'Yaa Platinum': 25,
      'Yaa Gold': 10,
      'Yaa Silver': 5,
      'Yaa Bronze': 2,
    };

    const saved = localStorage.getItem('superadmin_org_plans_catalog');
    if (saved) {
      try {
        const parsed: ProductPlan[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p) => {
            const limit = p.maxBranchLimit !== undefined ? p.maxBranchLimit : (p.specs?.maxBranchLimit !== undefined ? p.specs.maxBranchLimit : (defaultBranchLimits[p.name] ?? 5));
            return {
              ...p,
              description: '',
              maxBranchLimit: limit,
              specs: {
                ...p.specs,
                maxBranchLimit: limit,
              },
            };
          });
        }
      } catch (e) {
        console.error(e);
      }
    }
    return ORG_PLANS.map((op, idx) => {
      const branchLimit = defaultBranchLimits[op.name] ?? (idx === 0 ? 50 : idx === 1 ? 25 : idx === 2 ? 10 : idx === 3 ? 5 : 2);
      return {
        id: `org_plan_${idx + 1}`,
        name: op.name,
        price: op.monthlyPrice,
        billingCycle: 'Monthly' as BillingCycle,
        pricingType: 'Fixed' as PricingType,
        tier: op.tier as any,
        features: ['Organization Platform License', 'Multi-Branch Support', 'Enterprise Governance'],
        description: '',
        maxBranchLimit: branchLimit,
        specs: {
          maxBranchLimit: branchLimit,
        },
        status: 'Active' as const,
        currency: '₹',
        customizablePrice: false,
      } as ProductPlan;
    });
  });

  const saveOrgPlans = (data: ProductPlan[]) => {
    setOrgPlans(data);
    localStorage.setItem('superadmin_org_plans_catalog', JSON.stringify(data));
  };

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
        let updatedPlans: ProductPlan[];
        if (planId) {
          updatedPlans = orgPlans.map((p) =>
            p.id === planId ? ({ ...p, ...planData } as ProductPlan) : p
          );
          saveOrgPlans(updatedPlans);
          showToast('success', 'Plan Updated', `Saved pricing and configuration for ${planData.name || 'plan'}.`);
        } else {
          const newPlan: ProductPlan = {
            id: `org_plan_${Date.now()}`,
            name: planData.name || 'New Enterprise Plan',
            price: planData.price || 0,
            billingCycle: planData.billingCycle || 'Monthly',
            pricingType: planData.pricingType || 'Fixed',
            tier: planData.tier || ('Enterprise' as any),
            features: planData.features || ['Organization Platform License', 'Multi-Branch Support', 'Enterprise Governance'],
            description: planData.description || (planData.tier as string) || '',
            status: planData.status || 'Active',
            currency: planData.currency || '₹',
            customizablePrice: planData.customizablePrice || false,
            maxBranchLimit: planData.maxBranchLimit,
            specs: planData.specs,
          };
          updatedPlans = [...orgPlans, newPlan];
          saveOrgPlans(updatedPlans);
          showToast('success', 'Plan Created', `New enterprise plan "${planData.name}" created.`);
        }
        setIsPlanModalOpen(false);
        return;
      }

      if (planId) {
        await api.updateProductPlan(productId, planId, planData);
        showToast('success', 'Plan Updated', `Saved flexible pricing for ${planData.name}.`);
      } else {
        await api.createProductPlan(productId, planData);
        showToast('success', 'Plan Created', `New plan "${planData.name}" added to product.`);
      }
      await loadAllData();
    } catch (e: any) {
      showToast('error', 'Plan Save Failed', e.message || 'Error occurred while saving plan.');
      throw e;
    }
  };

  const handleDeletePlan = async (product: Product, plan: ProductPlan) => {
    if (!confirm(`Are you sure you want to remove the plan "${plan.name}" from ${product.name}?`)) {
      return;
    }
    try {
      if (isSuperAdmin || product.id === 'prod_org') {
        const updatedPlans = orgPlans.filter((p) => p.id !== plan.id);
        saveOrgPlans(updatedPlans);
        showToast('success', 'Plan Removed', `Deleted ${plan.name} from enterprise plans.`);
        return;
      }

      await api.deleteProductPlan(product.id, plan.id);
      showToast('success', 'Plan Removed', `Deleted ${plan.name} from ${product.name}.`);
      await loadAllData();
    } catch (e: any) {
      showToast('error', 'Delete Failed', e.message || 'Failed to delete plan.');
    }
  };

  const handleDuplicatePlan = async (product: Product, plan: ProductPlan) => {
    try {
      const duplicatedPlan: Partial<ProductPlan> = {
        ...plan,
        name: `${plan.name} (Copy)`,
        isPopular: false,
      };

      if (isSuperAdmin || product.id === 'prod_org') {
        const newPlan: ProductPlan = {
          ...duplicatedPlan,
          id: `org_plan_${Date.now()}`,
        } as ProductPlan;
        const updatedPlans = [...orgPlans, newPlan];
        saveOrgPlans(updatedPlans);
        showToast('success', 'Plan Duplicated', `Created copy of ${plan.name}.`);
        return;
      }

      await api.createProductPlan(product.id, duplicatedPlan);
      showToast('success', 'Plan Duplicated', `Created copy of ${plan.name}.`);
      await loadAllData();
    } catch (e: any) {
      showToast('error', 'Duplicate Failed', e.message);
    }
  };

  // -------------------------------------------------------------
  // CUSTOMER SUBSCRIPTION ACTIONS (Create, Edit, Renew)
  // -------------------------------------------------------------
  const handleOpenAssignSubscription = (product?: Product, plan?: ProductPlan) => {
    setEditingSub(null);
    setSubCustomerId('');
    setSubCustomerName('');
    setSubProductId(product ? product.id : '');
    setSubPlanName(plan ? plan.name : '');
    setSubBillingCycle(plan ? plan.billingCycle : '');
    setSubAmount(plan ? plan.price : '');
    setSubStartDate('');
    setSubEndDate('');
    setSubAutoRenew(true);
    setSubStatus('');
    setSubNotes('');
    setIsSubModalOpen(true);
  };

  const handleOpenEditSubscription = (sub: SubscriptionItem) => {
    setEditingSub(sub);
    setSubCustomerId(sub.customerId || '');
    setSubCustomerName(sub.customerName || '');

    const matchedProd = products.find((p) => p.name === sub.productOrService || p.name === sub.productName) || products[0];
    setSubProductId(matchedProd ? matchedProd.id : 'prod_1');
    setSubPlanName(sub.plan || '');
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
    setSubPlanName('');
    setSubAmount('');
    setSubBillingCycle('');
  };

  const handlePlanChangeInSubModal = (planName: string) => {
    setSubPlanName(planName);
    const prod = products.find((p) => p.id === subProductId);
    const foundPlan = prod?.plans.find((pl) => pl.name === planName);
    if (foundPlan) {
      setSubAmount(foundPlan.price);
      setSubBillingCycle(foundPlan.billingCycle);
    }
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === subProductId);
    const resolvedProdName = prod ? prod.name : 'OmniFlow ERP';

    try {
      if (editingSub) {
        await api.updateSubscription(editingSub.id, {
          customerId: subCustomerId,
          customerName: subCustomerName,
          productOrService: resolvedProdName,
          productName: resolvedProdName,
          plan: subPlanName,
          billingCycle: (subBillingCycle || 'Monthly') as BillingCycle,
          amount: Number(subAmount),
          startDate: subStartDate,
          endDate: subEndDate,
          status: (subStatus || 'Active') as SubscriptionStatus,
          autoRenew: subAutoRenew,
          notes: subNotes,
        });
        showToast('success', 'Subscription Updated', `Updated terms for ${subCustomerName}`);
      } else {
        await api.createSubscription({
          customerId: subCustomerId,
          customerName: subCustomerName,
          productOrService: resolvedProdName,
          productName: resolvedProdName,
          plan: subPlanName,
          billingCycle: (subBillingCycle || 'Monthly') as BillingCycle,
          amount: Number(subAmount),
          startDate: subStartDate,
          endDate: subEndDate,
          status: (subStatus || 'Active') as SubscriptionStatus,
          autoRenew: subAutoRenew,
          notes: subNotes,
        });
        showToast('success', 'Subscription Created', `Enrolled ${subCustomerName} in ${subPlanName}`);
      }
      setIsSubModalOpen(false);
      loadAllData();
    } catch (e: any) {
      showToast('error', 'Save Failed', e.message);
    }
  };

  const handleRenewSubscription = async (sub: SubscriptionItem) => {
    try {
      const currentEnd = new Date(sub.endDate);
      const monthsToAdd = sub.billingCycle === 'Annually' ? 12 : sub.billingCycle === 'Quarterly' ? 3 : 1;
      currentEnd.setMonth(currentEnd.getMonth() + monthsToAdd);
      const newEnd = currentEnd.toISOString().split('T')[0];

      await api.updateSubscription(sub.id, {
        endDate: newEnd,
        status: 'Active',
      });
      showToast('success', 'Subscription Renewed', `Extended renewal date through ${newEnd}`);
      loadAllData();
    } catch (e: any) {
      showToast('error', 'Renewal Failed', e.message);
    }
  };

  const handleDeleteSubscription = async (sub: SubscriptionItem) => {
    if (!confirm(`Cancel subscription contract for ${sub.customerName}?`)) return;
    try {
      await api.deleteSubscription(sub.id);
      showToast('success', 'Subscription Cancelled', `Removed subscription for ${sub.customerName}`);
      loadAllData();
    } catch (e: any) {
      showToast('error', 'Cancellation Failed', e.message);
    }
  };

  // -------------------------------------------------------------
  // SUPER ADMIN: Organization Subscription Actions & Handlers
  // -------------------------------------------------------------
  const handleOpenCreateOrgSub = () => {
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
    const org = availableOrgs.find((o: any) => o.id === orgId);
    if (org) {
      setOrgSubOrgName(org.name);
      setOrgSubOrgCode(org.code);
      setOrgSubIndustry(org.industry || '');
      setOrgSubContactPerson(org.contactPerson || '');
      setOrgSubEmail(org.email || '');
      setOrgSubPhone(org.phone || '');
      setOrgSubWhatsapp(org.whatsapp || org.phone || '');
    }
  };

  const handlePlanChangeInOrgModal = (planName: string) => {
    setOrgSubPlan(planName);
    const found = orgPlans.find((p) => p.name === planName);
    const fallback = ORG_PLANS.find((p) => p.name === planName);
    if (found) {
      const monthly = found.price || 0;
      const annual = monthly * 10;
      setOrgSubAmount(orgSubBillingCycle === 'Annually' ? annual : monthly);
    } else if (fallback) {
      setOrgSubAmount(orgSubBillingCycle === 'Annually' ? fallback.annualPrice : fallback.monthlyPrice);
    } else {
      setOrgSubAmount(0);
    }
  };

  const handleBillingCycleChangeInOrgModal = (cycle: string) => {
    setOrgSubBillingCycle(cycle);
    const found = orgPlans.find((p) => p.name === orgSubPlan);
    const fallback = ORG_PLANS.find((p) => p.name === orgSubPlan);
    if (found) {
      const monthly = found.price || 0;
      const annual = monthly * 10;
      setOrgSubAmount(cycle === 'Annually' ? annual : monthly);
    } else if (fallback) {
      setOrgSubAmount(cycle === 'Annually' ? fallback.annualPrice : fallback.monthlyPrice);
    }
  };

  const handleSaveOrgSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgSubOrgName.trim()) {
      showToast('error', 'Validation Error', 'Please select or enter an organization.');
      return;
    }
    if (!orgSubPlan.trim()) {
      showToast('error', 'Validation Error', 'Please select a subscription plan.');
      return;
    }
    if (!orgSubBillingCycle) {
      showToast('error', 'Validation Error', 'Please select a billing cycle.');
      return;
    }
    if (!orgSubStartDate || !orgSubEndDate) {
      showToast('error', 'Validation Error', 'Please select both start date and next renewal date.');
      return;
    }

    if (editingOrgSub) {
      const updated = orgSubscriptions.map((s) =>
        s.id === editingOrgSub.id
          ? {
            ...s,
            orgId: orgSubOrgId,
            orgName: orgSubOrgName,
            orgCode: orgSubOrgCode,
            industry: orgSubIndustry,
            contactPerson: orgSubContactPerson,
            email: orgSubEmail,
            phone: orgSubPhone,
            whatsapp: orgSubWhatsapp,
            plan: orgSubPlan,
            billingCycle: (orgSubBillingCycle as BillingCycle) || 'Monthly',
            amount: Number(orgSubAmount),
            startDate: orgSubStartDate,
            endDate: orgSubEndDate,
            autoRenew: orgSubAutoRenew,
            notes: orgSubNotes,
          }
          : s
      );
      saveOrgSubscriptions(updated);
      showToast('success', 'Subscription Updated', `Updated subscription for ${orgSubOrgName}`);
    } else {
      const newId = `SUB-ORG-${100 + orgSubscriptions.length + 1}`;
      const newSub: OrgSubscriptionItem = {
        id: newId,
        orgId: orgSubOrgId || `org_${Date.now()}`,
        orgName: orgSubOrgName,
        orgCode: orgSubOrgCode || orgSubOrgName.substring(0, 4).toUpperCase(),
        industry: orgSubIndustry || 'General Enterprise',
        contactPerson: orgSubContactPerson || 'Primary Contact',
        email: orgSubEmail,
        phone: orgSubPhone,
        whatsapp: orgSubWhatsapp || orgSubPhone,
        plan: orgSubPlan,
        billingCycle: (orgSubBillingCycle as BillingCycle) || 'Monthly',
        amount: Number(orgSubAmount),
        startDate: orgSubStartDate,
        endDate: orgSubEndDate,
        status: 'Active',
        autoRenew: orgSubAutoRenew,
        notes: orgSubNotes,
      };
      saveOrgSubscriptions([newSub, ...orgSubscriptions]);
      showToast('success', 'Subscription Created', `Enrolled ${orgSubOrgName} in ${orgSubPlan}`);
    }
    setIsOrgSubModalOpen(false);
  };

  const handleRenewOrgSubscription = (sub: OrgSubscriptionItem) => {
    const currentEnd = new Date(sub.endDate);
    const monthsToAdd = sub.billingCycle === 'Annually' ? 12 : sub.billingCycle === 'Quarterly' ? 3 : 1;
    currentEnd.setMonth(currentEnd.getMonth() + monthsToAdd);
    const newEnd = currentEnd.toISOString().split('T')[0];

    const updated = orgSubscriptions.map((s) =>
      s.id === sub.id ? { ...s, endDate: newEnd, status: 'Active' as const } : s
    );
    saveOrgSubscriptions(updated);
    showToast('success', 'Subscription Renewed', `Extended renewal date for ${sub.orgName} to ${newEnd}`);
  };

  const handleDeleteOrgSubscription = (sub: OrgSubscriptionItem) => {
    if (!confirm(`Are you sure you want to cancel the subscription for ${sub.orgName}?`)) return;
    const updated = orgSubscriptions.filter((s) => s.id !== sub.id);
    saveOrgSubscriptions(updated);
    showToast('success', 'Subscription Cancelled', `Removed subscription for ${sub.orgName}`);
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

  // Filtered Organization Subscriptions
  // Super Admin: restricted to only 3 orgs; all Yaa plans are visible
  const SUPER_ADMIN_ORGS = ['YaaCreations', 'Polihills', 'Enmin Labs'];

  const filteredOrgSubs = useMemo(() => {
    return orgSubscriptions.filter((sub) => {
      // Super Admin org scope restriction (plans unrestricted)
      if (isSuperAdmin) {
        const orgAllowed = SUPER_ADMIN_ORGS.some(
          (name) => sub.orgName.trim().toLowerCase() === name.trim().toLowerCase()
        );
        if (!orgAllowed) return false;
      }

      const q = appliedSubSearch.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        sub.orgName.toLowerCase().includes(q) ||
        sub.orgCode.toLowerCase().includes(q) ||
        sub.plan.toLowerCase().includes(q) ||
        sub.id.toLowerCase().includes(q) ||
        sub.contactPerson.toLowerCase().includes(q) ||
        sub.email.toLowerCase().includes(q) ||
        sub.industry.toLowerCase().includes(q);

      const matchesPlan = appliedOrgPlan === 'ALL' || sub.plan.toLowerCase() === appliedOrgPlan.toLowerCase();
      const matchesStatus = appliedSubStatus === 'ALL' || sub.status === appliedSubStatus;

      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [orgSubscriptions, appliedSubSearch, appliedOrgPlan, appliedSubStatus, isSuperAdmin]);

  const totalOrgSubsPages = Math.max(1, Math.ceil(filteredOrgSubs.length / orgSubsPageSize));
  const safeOrgSubsPage = Math.min(orgSubsPage, totalOrgSubsPages);
  const pagedOrgSubs = useMemo(() => {
    return filteredOrgSubs.slice((safeOrgSubsPage - 1) * orgSubsPageSize, safeOrgSubsPage * orgSubsPageSize);
  }, [filteredOrgSubs, safeOrgSubsPage, orgSubsPageSize]);

  // -------------------------------------------------------------
  // NORMALIZERS & BADGES (Matching reference image)
  // -------------------------------------------------------------
  const formatDisplayDate = (dateStr?: string): string => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
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

  const totalPlansPages = Math.max(1, Math.ceil(filteredPlansList.length / plansPageSize));
  const safePlansPage = Math.min(plansPage, totalPlansPages);
  const pagedPlans = useMemo(() => {
    return filteredPlansList.slice((safePlansPage - 1) * plansPageSize, safePlansPage * plansPageSize);
  }, [filteredPlansList, safePlansPage, plansPageSize]);

  // Filtered Subscriptions
  const filteredSubs = useMemo(() => {
    return subscriptions.filter((s) => {
      const q = appliedSubSearch.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        s.customerName.toLowerCase().includes(q) ||
        (s.productOrService && s.productOrService.toLowerCase().includes(q)) ||
        (s.productName && s.productName.toLowerCase().includes(q)) ||
        s.plan.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q);

      const prodName = s.productOrService || s.productName || '';
      const matchedProd = products.find((p) => p.name === prodName);
      const matchesProduct =
        appliedSubProduct === 'ALL' ||
        prodName === appliedSubProduct ||
        matchedProd?.id === appliedSubProduct;
      const matchesStatus = appliedSubStatus === 'ALL' || s.status === appliedSubStatus;

      return matchesSearch && matchesProduct && matchesStatus;
    });
  }, [subscriptions, appliedSubSearch, appliedSubProduct, appliedSubStatus, products]);

  const totalSubsPages = Math.max(1, Math.ceil(filteredSubs.length / subsPageSize));
  const safeSubsPage = Math.min(subsPage, totalSubsPages);
  const pagedSubs = useMemo(() => {
    return filteredSubs.slice((safeSubsPage - 1) * subsPageSize, safeSubsPage * subsPageSize);
  }, [filteredSubs, safeSubsPage, subsPageSize]);

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
                        { label: 'Yaa Diamond', value: 'Yaa Diamond' },
                        { label: 'Yaa Platinum', value: 'Yaa Platinum' },
                        { label: 'Yaa Gold', value: 'Yaa Gold' },
                        { label: 'Yaa Silver', value: 'Yaa Silver' },
                        { label: 'Yaa Bronze', value: 'Yaa Bronze' },
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
                    <span className="text-[#33077C] font-bold">{filteredOrgSubs.length}</span>
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
                      {pagedOrgSubs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                            No organization subscriptions found matching your criteria.
                          </td>
                        </tr>
                      ) : (
                        pagedOrgSubs.map((sub) => {
                          return (
                            <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                              {/* 1. Organization */}
                              <td className="py-4 px-5 border border-slate-200">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-[#33077C] text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-xs shrink-0">
                                    {sub.orgName.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase()}
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
              {filteredOrgSubs.length > 0 && (
                <Pagination
                  currentPage={safeOrgSubsPage}
                  total={filteredOrgSubs.length}
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
                      <span className="text-[#33077C] font-bold">{filteredSubs.length}</span>
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
                      {pagedSubs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                            No subscriptions found matching your criteria.
                          </td>
                        </tr>
                      ) : (
                        pagedSubs.map((sub, idx) => {
                          const prodName = sub.productOrService || sub.productName || 'OmniFlow ERP';
                          const matchedCust = customers.find(
                            (c) => c.company.toLowerCase() === sub.customerName.toLowerCase() || c.id === sub.customerId
                          );
                          const displayId = formatDisplaySubId(sub.id, (safeSubsPage - 1) * subsPageSize + 101 + idx);
                          const phone = matchedCust?.phone || '+1 (555) 234-5678';
                          const whatsapp = matchedCust?.whatsapp || phone;
                          const email = matchedCust?.email || 'contact@client.com';

                          return (
                            <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                              {/* 1. Client & ID */}
                              <td className="py-4 px-5 border border-slate-200">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-slate-900 text-sm">{sub.customerName}</span>
                                  <span className="text-xs font-semibold text-[#4309A2]">({displayId})</span>
                                </div>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                  {matchedCust?.contactPerson || 'Primary Account Holder'}
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
                                  ₹{sub.amount.toLocaleString()} <span className="text-[11px] text-slate-500 font-normal">/ {sub.billingCycle}</span>
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
                                  Since: {sub.startDate}
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
              {filteredSubs.length > 0 && (
                <Pagination
                  currentPage={safeSubsPage}
                  total={filteredSubs.length}
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
                    <span className="text-[#33077C] font-bold">{filteredPlansList.length}</span>
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
                      {pagedPlans.length === 0 ? (
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
              {filteredPlansList.length > 0 && (
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
                              Add Plan to {product.name}
                            </Button>
                          </div>

                          {/* Plans Grid */}
                          <div className="p-5 sm:p-6">
                            {(!product.plans || product.plans.length === 0) ? (
                              <div className="text-center py-10 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                                <Zap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                <p className="text-sm font-semibold text-slate-700">No subscription plans created for {product.name} yet.</p>
                                <button
                                  type="button"
                                  onClick={() => handleOpenCreatePlan(product.id)}
                                  className="h-11 px-6 bg-[#33077C] hover:bg-[#432eb5] text-white text-sm font-bold rounded-xl cursor-pointer mt-3 inline-flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                  + Create First Plan
                                </button>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {product.plans.map((plan) => (
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
                                              : `${plan.currency || '\u20B9'}${plan.price.toLocaleString()}`}
                                          </span>
                                          <span className="text-xs sm:text-sm font-semibold text-slate-400 ml-1">
                                            / {plan.billingCycle ? plan.billingCycle.toLowerCase() : 'month'}
                                          </span>
                                        </div>

                                        {/* Deliverables & Limits Badges */}
                                        {(() => {
                                          const specs = plan.specs || {};
                                          // Check specs or fallback extraction from features
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
                            )}
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
        <form onSubmit={handleSaveSubscription} className="space-y-4.5 p-2 sm:p-4 animate-in fade-in duration-150">
          <div className="space-y-4">
            {/* Row 1: Target Product, Select Plan Tier, Billing Cycle */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      ? products
                          .find((p) => p.id === subProductId)
                          ?.plans?.map((pl) => ({
                            value: pl.name,
                            label: pl.name,
                          })) || []
                      : []
                  }
                  placeholder="Select Plan Tier"
                  activeColor="brand"
                />
              </div>

              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Billing Cycle <span className="text-slate-500">*</span>
                </label>
                <CustomSelect
                  value={subBillingCycle}
                  onChange={(val) => setSubBillingCycle(val as any)}
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
            </div>

            {/* Row 2: Agreed Fee Amount, Start Date, Renewal Date */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  onChange={(e) => setSubStartDate(e.target.value)}
                  className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all cursor-pointer placeholder:text-slate-400"
                />
              </div>

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
        <form onSubmit={handleSaveOrgSubscription} className="space-y-4.5 p-2 sm:p-4 animate-in fade-in duration-150">
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
                  onChange={(e) => setOrgSubStartDate(e.target.value)}
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
