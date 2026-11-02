import { useCallback, useEffect, useMemo, useState } from 'react';
import { getStoredOrganizationId } from '../api/config';
import { useScopeLock } from './useScopeLock';
import { useGetPlatformLeadsQuery } from '../api/platform/leadApi';
import { useGetPlatformClientsQuery } from '../api/platform/clientApi';
import { useGetClientSubscriptionsQuery } from '../api/platform/clientSubscriptionApi';
import { useGetPlatformPaymentsQuery } from '../api/platform/paymentApi';
import { useGetClientProductsQuery } from '../api/platform/clientProductApi';
import { useGetPlatformBranchesQuery } from '../api/platform/branchApi';
import { useGetSubOrganizationsQuery } from '../api/platform/subOrganizationApi';
import { useGetPlatformQuotesQuery } from '../api/platform/quoteApi';
import { useGetPlatformInvoicesQuery } from '../api/platform/invoiceApi';

const LIMIT = 100;

/**
 * Loads the client-management data one dashboard needs, already scoped to the logged-in admin:
 * org admins follow the header's sub-organization / branch pickers, sub-org and branch admins are pinned
 * to the scope they logged in with.
 */
export const useDashboardData = (opts: { subOrgs?: boolean; branches?: boolean } = {}) => {
  const { lockedSubOrgId, lockedBranchId } = useScopeLock();
  const orgId = getStoredOrganizationId() || undefined;

  // Re-read the header's sub-org / branch selection when it changes.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener('subOrgChanged', bump);
    window.addEventListener('branchChanged', bump);
    return () => {
      window.removeEventListener('subOrgChanged', bump);
      window.removeEventListener('branchChanged', bump);
    };
  }, []);

  const { subOrgId, branchId, subOrgName, branchName } = useMemo(() => {
    const pick = (key: string) => {
      const v = localStorage.getItem(key);
      return v && v !== 'all' ? v : undefined;
    };
    const headerSubName = localStorage.getItem('active_sub_organization') || 'All';
    const headerBranchName = localStorage.getItem('active_branch') || 'All';
    return {
      subOrgId: lockedSubOrgId || (headerSubName !== 'All' ? pick('active_sub_organization_id') : undefined),
      branchId: lockedBranchId || (headerBranchName !== 'All' ? pick('active_branch_id') : undefined),
      subOrgName: headerSubName !== 'All' ? headerSubName : undefined,
      branchName: headerBranchName !== 'All' ? headerBranchName : undefined,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedSubOrgId, lockedBranchId, tick]);

  const scope = { organization_id: orgId, sub_organization_id: subOrgId, branch_id: branchId };

  const leadsQ = useGetPlatformLeadsQuery({ page: 1, limit: LIMIT, ...scope });
  const clientsQ = useGetPlatformClientsQuery({ page: 1, limit: LIMIT, organizationType: 'All', ...scope });
  const subsQ = useGetClientSubscriptionsQuery({ page: 1, limit: LIMIT });
  const paymentsQ = useGetPlatformPaymentsQuery({ page: 1, limit: LIMIT, pagination_required: 'false', ...scope });
  const productsQ = useGetClientProductsQuery({
    page: 1,
    limit: LIMIT,
    organizationId: orgId,
    subOrganizationId: subOrgId,
    branchId,
  } as any);
  const quotesQ = useGetPlatformQuotesQuery({ page: 1, limit: LIMIT, ...scope } as any);
  const invoicesQ = useGetPlatformInvoicesQuery({ page: 1, limit: LIMIT, ...scope } as any);
  const branchesQ = useGetPlatformBranchesQuery(
    { params: { page_no: 1, page_size: LIMIT, pagination_required: 'false', organization_id: orgId, sub_organization_id: subOrgId } },
    { skip: !opts.branches }
  );
  const subOrgsQ = useGetSubOrganizationsQuery({ params: { page_no: 1, page_size: LIMIT, pagination_required: 'false' } }, { skip: !opts.subOrgs });

  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [refreshing, setRefreshing] = useState(false);
  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        leadsQ.refetch(),
        clientsQ.refetch(),
        subsQ.refetch(),
        paymentsQ.refetch(),
        quotesQ.refetch(),
        invoicesQ.refetch(),
        productsQ.refetch(),
        opts.branches ? branchesQ.refetch() : Promise.resolve(),
        opts.subOrgs ? subOrgsQ.refetch() : Promise.resolve(),
      ]);
      setLastUpdated(new Date());
    } finally {
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.branches, opts.subOrgs]);

  return {
    leads: asArray(leadsQ.data?.data),
    totalLeads: leadsQ.data?.pagination?.totalRecords ?? leadsQ.data?.data?.length ?? 0,
    clients: asArray(clientsQ.data?.data),
    totalClients: clientsQ.data?.pagination?.totalRecords ?? clientsQ.data?.data?.length ?? 0,
    subscriptions: asArray(subsQ.data?.data),
    payments: asArray(paymentsQ.data?.data),
    quotes: asArray(quotesQ.data?.data),
    invoices: asArray(invoicesQ.data?.data),
    products: asArray(productsQ.data?.data),
    totalProducts: productsQ.data?.pagination?.totalRecords ?? productsQ.data?.data?.length ?? 0,
    branches: asArray(branchesQ.data?.data),
    subOrgs: asArray(subOrgsQ.data?.data),
    loading: leadsQ.isLoading || clientsQ.isLoading || subsQ.isLoading || paymentsQ.isLoading || productsQ.isLoading,
    lastUpdated,
    refreshing,
    refreshAll,
    scopeNames: { subOrgName, branchName },
  };
};

/** API list payloads are sometimes `{ items: [...] }` instead of a bare array. */
const asArray = (raw: any): any[] => {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.items)) return raw.items;
  if (raw && Array.isArray(raw.data)) return raw.data;
  return [];
};
