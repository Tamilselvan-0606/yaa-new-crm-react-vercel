import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export interface OrgCapabilities {
  isAll: boolean;
  isSaleOnly: boolean;
  isClientOnly: boolean;
}

export function useActiveOrgType() {
  const { currentUser } = useAuth();

  const getCapabilities = useCallback((): OrgCapabilities => {
    const org =
      (currentUser as any)?.organization ||
      (currentUser as any)?.memberships?.[0]?.organization;
    const rawType =
      org?.organizationType ??
      (currentUser as any)?.organizationType ??
      localStorage.getItem('user_organization_type');
    const rawTypeName = (
      org?.organizationTypeName ??
      (currentUser as any)?.organizationTypeName ??
      localStorage.getItem('user_organization_type_name') ??
      ''
    )
      .toString()
      .toUpperCase();
    const normalizedTypeName = rawTypeName.replace(/_/g, ' ').trim();
    const orgName = (
      org?.name ||
      currentUser?.name ||
      localStorage.getItem('active_organization') ||
      ''
    ).toLowerCase();

    const rawTypeStr = rawType !== undefined && rawType !== null ? String(rawType).trim() : '';

    let isAll = false;
    let isSaleOnly = false;
    let isClientOnly = false;

    // Strict capability detection:
    // 1 / CLIENT_MANAGEMENT -> Client Management Only
    // 2 / SALE_MANAGEMENT -> Sale Management Only
    // 0 / ALL -> Both Suites Switchable
    if (
      rawTypeStr === '1' ||
      normalizedTypeName === 'CLIENT MANAGEMENT' ||
      rawTypeName === 'CLIENT_MANAGEMENT'
    ) {
      isClientOnly = true;
    } else if (
      rawTypeStr === '2' ||
      normalizedTypeName === 'SALE MANAGEMENT' ||
      normalizedTypeName === 'SALES MANAGEMENT' ||
      rawTypeName === 'SALE_MANAGEMENT' ||
      rawTypeName === 'SALES_MANAGEMENT'
    ) {
      isSaleOnly = true;
    } else if (
      rawTypeStr === '0' ||
      rawTypeName === 'ALL' ||
      normalizedTypeName === 'ALL'
    ) {
      isAll = true;
    } else {
      if (orgName.includes('yaa creations') || orgName.includes('yaa connect')) {
        isAll = true;
      } else if (
        ['fts academy', 'fyndus academy', 'polihills'].includes(orgName) ||
        orgName.includes('sale')
      ) {
        isSaleOnly = true;
      } else if (orgName.includes('client')) {
        isClientOnly = true;
      } else {
        isAll = true;
      }
    }

    return { isAll, isSaleOnly, isClientOnly };
  }, [currentUser]);

  const getActiveType = useCallback((): 'Client Management' | 'Sales Management' => {
    const caps = getCapabilities();
    if (caps.isClientOnly) return 'Client Management';
    if (caps.isSaleOnly) return 'Sales Management';

    const savedType =
      localStorage.getItem('active_org_type_view') ||
      localStorage.getItem('active_org_type_orgsuperadmin');
    if (savedType) {
      if (savedType.toLowerCase().includes('sale')) return 'Sales Management';
      if (savedType.toLowerCase().includes('client')) return 'Client Management';
    }
    return 'Client Management';
  }, [getCapabilities]);

  const [activeOrgType, setActiveOrgTypeState] = useState<'Client Management' | 'Sales Management'>(
    getActiveType
  );

  const setOrgType = useCallback(
    (type: 'Client Management' | 'Sales Management') => {
      const caps = getCapabilities();
      if (caps.isClientOnly && type !== 'Client Management') return;
      if (caps.isSaleOnly && type !== 'Sales Management') return;

      setActiveOrgTypeState(type);
      localStorage.setItem('active_org_type_view', type);
      localStorage.setItem('active_org_type_orgsuperadmin', type);
      window.dispatchEvent(new CustomEvent('orgTypeChanged', { detail: type }));
    },
    [getCapabilities]
  );

  useEffect(() => {
    setActiveOrgTypeState(getActiveType());

    const handleOrgTypeChange = (e: any) => {
      const caps = getCapabilities();
      if (caps.isClientOnly) {
        setActiveOrgTypeState('Client Management');
        return;
      }
      if (caps.isSaleOnly) {
        setActiveOrgTypeState('Sales Management');
        return;
      }
      if (e?.detail) {
        const val = typeof e.detail === 'string' ? e.detail : e.detail.organizationType || '';
        if (val.toLowerCase().includes('sale')) {
          setActiveOrgTypeState('Sales Management');
        } else if (val.toLowerCase().includes('client')) {
          setActiveOrgTypeState('Client Management');
        } else {
          setActiveOrgTypeState(getActiveType());
        }
      } else {
        setActiveOrgTypeState(getActiveType());
      }
    };

    const handleOrgChange = (e: any) => {
      const caps = getCapabilities();
      if (caps.isClientOnly) {
        setActiveOrgTypeState('Client Management');
        return;
      }
      if (caps.isSaleOnly) {
        setActiveOrgTypeState('Sales Management');
        return;
      }
      if (e?.detail?.organizationType) {
        const val = e.detail.organizationType;
        if (val.toLowerCase().includes('sale')) {
          setActiveOrgTypeState('Sales Management');
        } else if (val.toLowerCase().includes('client')) {
          setActiveOrgTypeState('Client Management');
        }
      }
    };

    window.addEventListener('orgTypeChanged', handleOrgTypeChange);
    window.addEventListener('orgChanged', handleOrgChange);
    window.addEventListener('storage', handleOrgTypeChange);

    return () => {
      window.removeEventListener('orgTypeChanged', handleOrgTypeChange);
      window.removeEventListener('orgChanged', handleOrgChange);
      window.removeEventListener('storage', handleOrgTypeChange);
    };
  }, [getActiveType, getCapabilities]);

  const caps = getCapabilities();
  const resolvedActiveType = caps.isClientOnly
    ? 'Client Management'
    : caps.isSaleOnly
    ? 'Sales Management'
    : activeOrgType;

  const isSaleManagement = resolvedActiveType === 'Sales Management';
  const isClientManagement = !isSaleManagement;

  return {
    activeOrgType: resolvedActiveType,
    setOrgType,
    isSaleManagement,
    isClientManagement,
    isAll: caps.isAll,
    isSaleOnly: caps.isSaleOnly,
    isClientOnly: caps.isClientOnly,
  };
}
