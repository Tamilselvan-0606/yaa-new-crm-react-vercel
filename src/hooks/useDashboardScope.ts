import { useEffect, useMemo, useState } from 'react';
import { getStoredOrganizationId } from '../api/config';
import { useScopeLock } from './useScopeLock';

/**
 * The organization / sub-organization / branch the dashboards are scoped to: org admins follow the header's
 * pickers, sub-org and branch admins are pinned to the scope they logged in with.
 */
export const useDashboardScope = () => {
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

  return { orgId, subOrgId, branchId, subOrgName, branchName };
};
