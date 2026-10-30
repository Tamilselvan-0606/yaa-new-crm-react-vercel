import { useAuth } from '../context/AuthContext';

const normalize = (v: unknown) => String(v ?? '').toUpperCase().replace(/[\s_-]/g, '');

/**
 * Sub-organization / branch admins are pinned to the scope returned at login.
 * - SUB_ORG_ADMIN: sub-organization is locked.
 * - BRANCH_ADMIN: sub-organization and branch are locked.
 */
export const useScopeLock = () => {
  const { currentUser } = useAuth();
  const user = currentUser as any;
  const membership = user?.memberships?.[0];

  const roleKey = normalize(
    (typeof user?.role === 'object' ? user?.role?.code : user?.role) ||
      user?.roleCode ||
      membership?.role?.code
  );

  const isBranchAdmin = roleKey === 'BRANCHADMIN';
  const isSubOrgAdmin = roleKey === 'SUBORGADMIN';

  const subOrgId: string = user?.subOrganizationId || membership?.subOrganizationId || '';
  const branchId: string = user?.accessibleBranchIds?.[0] || '';

  return {
    isBranchAdmin,
    isSubOrgAdminLocked: isSubOrgAdmin,
    lockSubOrg: (isBranchAdmin || isSubOrgAdmin) && !!subOrgId,
    lockBranch: isBranchAdmin && !!branchId,
    lockedSubOrgId: isBranchAdmin || isSubOrgAdmin ? subOrgId : '',
    lockedBranchId: isBranchAdmin ? branchId : '',
  };
};
