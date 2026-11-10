// Same two suites as the sub-organization type.
export const SUITE_MAP_KEY = 'yaa_crm_branch_suites';

/** Suite (Client / Sales Management) remembered for a branch id, for when the API does not send the type back. */
export const readSuiteMap = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(SUITE_MAP_KEY) || '{}') || {};
  } catch {
    return {};
  }
};

/** Normalises the API type (1 / 2 / 3 or a name) to 'Client Management', 'Sales Management' or 'All'. */
export const normalizeSuite = (raw: unknown): string | undefined => {
  const t = String(raw ?? '').trim().toLowerCase();
  if (!t) return undefined;
  if (t === '1' || t.includes('client')) return 'Client Management';
  if (t === '2' || t.includes('sale')) return 'Sales Management';
  if (t === '0' || t === '3' || t === 'all' || t.includes('both')) return 'All';
  return undefined;
};

/** Keeps only the branches that belong to the active suite (branches of type "All" belong to both). */
export const filterBranchesForSuite = <T extends { id: string }>(list: T[], isSaleManagement: boolean): T[] => {
  const map = readSuiteMap();
  return list.filter((b) => {
    const raw = b as any;
    const suite = (
      normalizeSuite(raw.organizationType ?? raw.organization_type ?? raw.branchType) || map[b.id] || ''
    ).toLowerCase();
    if (suite === 'all') return true;
    return isSaleManagement ? suite.includes('sale') : !suite.includes('sale');
  });
};
