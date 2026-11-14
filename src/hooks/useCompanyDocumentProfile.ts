import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { organizationApi, OrganizationApiItem } from '../api/platform/organizationApi';
import { subOrganizationApi, SubOrganizationApiItem } from '../api/platform/subOrganizationApi';
import { getStoredOrganizationId, USER_CACHE_STORAGE_KEY } from '../api/config';

export interface CompanyDocumentProfile {
  companyName: string;
  companySubtitle?: string;
  companyAddress: string;
  companyGstin: string;
  companyPhone: string;
  companyEmail: string;
  logo?: string;
  isLoading: boolean;
}

// In-memory cache across hook instances during user session
let cachedProfile: CompanyDocumentProfile | null = null;
let cachedKey = '';
let profilePromise: Promise<CompanyDocumentProfile> | null = null;

export const fetchOrganizationDocumentProfile = async (
  explicitOrgId?: string
): Promise<CompanyDocumentProfile> => {
  const storedOrgId = explicitOrgId || getStoredOrganizationId();
  // A sub-organization user (per GET /auth/me) always prints their own sub-organization's details, not the
  // parent organization's. Other users follow the sub-organization selected in the header.
  let loggedInSubOrgId: string | undefined;
  let loggedInRole = '';
  try {
    const cachedUser = JSON.parse(localStorage.getItem(USER_CACHE_STORAGE_KEY) || 'null');
    loggedInSubOrgId = cachedUser?.subOrganizationId || undefined;
    loggedInRole = String(cachedUser?.role || '');
  } catch {
    /* no cached user */
  }
  const headerSubOrgId = localStorage.getItem('active_sub_organization_id');
  const activeSubOrgId =
    loggedInRole === 'SUB_ORG_ADMIN' && loggedInSubOrgId
      ? loggedInSubOrgId
      : headerSubOrgId && headerSubOrgId !== 'all'
        ? headerSubOrgId
        : loggedInSubOrgId || null;
  // The cache is only valid for the organization / sub-organization it was built for.
  const currentKey = `${storedOrgId || ''}|${activeSubOrgId || ''}`;
  if (cachedProfile && cachedKey === currentKey) {
    return cachedProfile;
  }
  cachedKey = currentKey;
  const storedOrgName =
    localStorage.getItem('active_organization_orgsuperadmin') ||
    localStorage.getItem('active_organization');

  // Fallback default profile
  let resolved: CompanyDocumentProfile = {
    companyName: storedOrgName && storedOrgName !== 'All' ? storedOrgName : 'YAA CREATIONS CRM',
    companySubtitle: 'Sales & Enterprise Distribution',
    companyAddress: '',
    companyGstin: '',
    companyPhone: '',
    companyEmail: '',
    isLoading: false,
  };

  try {
    // 1. Try fetching Sub-Organization if active
    if (activeSubOrgId && activeSubOrgId !== 'all') {
      try {
        const subRes = await subOrganizationApi.getSubOrganizations({
          page_no: 1,
          page_size: 100,
          pagination_required: 'false',
        });
        const subList: SubOrganizationApiItem[] = Array.isArray(subRes?.data) ? subRes.data : [];
        const matchedSub = subList.find((s) => s.id === activeSubOrgId);
        if (matchedSub) {
          resolved = {
            companyName: matchedSub.legalName || matchedSub.name || resolved.companyName,
            companySubtitle: matchedSub.industry || 'Sales & Enterprise Distribution',
            companyAddress: matchedSub.address || matchedSub.location || '',
            companyGstin: matchedSub.gstNumber || '',
            companyPhone: matchedSub.phone || matchedSub.whatsapp || '',
            companyEmail: matchedSub.email || '',
            logo: matchedSub.logo,
            isLoading: false,
          };
          cachedProfile = resolved;
          return resolved;
        }
      } catch (subErr) {
        console.warn('[useCompanyProfile] Sub-organization fetch fallback:', subErr);
      }
    }

    // 2. Fetch primary organization by ID if valid UUID
    if (storedOrgId && storedOrgId !== '11111111-1111-4111-8111-111111111111') {
      try {
        const orgRes = await organizationApi.getOrganizationById(storedOrgId);
        if (orgRes?.success && orgRes.data) {
          const org = orgRes.data;
          resolved = {
            companyName: org.legalName || org.name || resolved.companyName,
            companySubtitle: org.industry || 'Sales & Enterprise Distribution',
            companyAddress: org.address || org.location || '',
            companyGstin: org.gstNumber || '',
            companyPhone: org.phone || org.whatsapp || '',
            companyEmail: org.email || '',
            logo: org.logo || org.logoUrl,
            isLoading: false,
          };
          cachedProfile = resolved;
          return resolved;
        }
      } catch (orgErr) {
        console.warn('[useCompanyProfile] getOrganizationById fallback:', orgErr);
      }
    }

    // 3. Fallback: list organizations and take first/matching
    try {
      const listRes = await organizationApi.getOrganizations(1, 20);
      const list: OrganizationApiItem[] = Array.isArray(listRes?.data) ? listRes.data : [];
      const match =
        (storedOrgId ? list.find((o) => o.id === storedOrgId) : null) ||
        (storedOrgName ? list.find((o) => o.name === storedOrgName || o.legalName === storedOrgName) : null) ||
        list[0];

      if (match) {
        resolved = {
          companyName: match.legalName || match.name || resolved.companyName,
          companySubtitle: match.industry || 'Sales & Enterprise Distribution',
          companyAddress: match.address || match.location || '',
          companyGstin: match.gstNumber || '',
          companyPhone: match.phone || match.whatsapp || '',
          companyEmail: match.email || '',
          logo: match.logo || match.logoUrl,
          isLoading: false,
        };
      }
    } catch (listErr) {
      console.warn('[useCompanyProfile] getOrganizations fallback:', listErr);
    }
  } catch (globalErr) {
    console.error('[useCompanyProfile] Failed to load company profile:', globalErr);
  }

  cachedProfile = resolved;
  return resolved;
};

/**
 * React hook to retrieve current organization profile for Sales Hub documents/PDFs
 */
export const useCompanyDocumentProfile = (): CompanyDocumentProfile => {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState<CompanyDocumentProfile>(() => {
    if (cachedProfile) return cachedProfile;
    const orgName =
      currentUser?.organization?.name ||
      localStorage.getItem('active_organization_orgsuperadmin') ||
      localStorage.getItem('active_organization') ||
      currentUser?.name ||
      'YAA CREATIONS CRM';
    return {
      companyName: orgName,
      companySubtitle: 'Sales & Enterprise Distribution',
      companyAddress: '',
      companyGstin: '',
      companyPhone: currentUser?.phone || '',
      companyEmail: currentUser?.email || '',
      isLoading: true,
    };
  });

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!profilePromise) {
        profilePromise = fetchOrganizationDocumentProfile(currentUser?.organizationId);
      }
      try {
        const res = await profilePromise;
        if (isMounted) {
          setProfile(res);
        }
      } finally {
        profilePromise = null;
      }
    };

    load();

    const handleOrgChanged = () => {
      cachedProfile = null;
      profilePromise = null;
      load();
    };

    window.addEventListener('orgChanged', handleOrgChanged);
    window.addEventListener('subOrgChanged', handleOrgChanged);

    return () => {
      isMounted = false;
      window.removeEventListener('orgChanged', handleOrgChanged);
      window.removeEventListener('subOrgChanged', handleOrgChanged);
    };
  }, [currentUser?.organizationId]);

  return profile;
};

