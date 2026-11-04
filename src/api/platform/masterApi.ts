import { baseClient } from '../baseApi';

/** Master data for the Country / State / District dropdowns. Public, read-only endpoints (`/master/...`). */
export interface MasterCountry {
  id: string;
  name: string;
  countryCode?: string;
  shortName?: string;
  mobileCode?: string;
  postalCodeFormat?: string | null;
  postalCodeRegex?: string | null;
}

export interface MasterState {
  id: string;
  countryId: string;
  stateName: string;
  stateCode?: string;
  shortName?: string | null;
}

export interface MasterDistrict {
  id: string;
  countryId: string;
  stateId: string;
  districtName: string;
  districtCode?: string;
}

export interface MasterCity {
  id: string;
  countryId: string;
  stateId: string;
  districtId: string;
  cityName: string;
}

const PAGE_LIMIT = 100; // the API maximum

/** Reads every page of a master list. */
const fetchAll = async <T>(url: string, params: Record<string, string> = {}): Promise<T[]> => {
  const out: T[] = [];
  for (let page = 1; page <= 50; page += 1) {
    const res = await baseClient.get(url, { params: { ...params, page, limit: PAGE_LIMIT } });
    out.push(...((res.data?.data as T[]) || []));
    if (!res.data?.pagination?.hasNextPage) break;
  }
  return out;
};

// Master data rarely changes: keep each list for the session so the form never refetches it.
const memo = new Map<string, Promise<any>>();
const once = <T>(key: string, load: () => Promise<T>): Promise<T> => {
  let p = memo.get(key);
  if (!p) {
    p = load().catch((err) => {
      memo.delete(key); // do not cache a failure
      throw err;
    });
    memo.set(key, p);
  }
  return p;
};

export const masterApi = {
  getCities: (districtId: string, stateId?: string, countryId?: string) =>
    once(`cities:${districtId}`, () =>
      fetchAll<MasterCity>('/master/cities', {
        districtId,
        ...(stateId ? { stateId } : {}),
        ...(countryId ? { countryId } : {}),
      })
    ),
  getCountries: () => once('countries', () => fetchAll<MasterCountry>('/master/countries')),
  getStates: (countryId: string) =>
    once(`states:${countryId}`, () => fetchAll<MasterState>('/master/states', { countryId })),
  getDistricts: (stateId: string, countryId?: string) =>
    once(`districts:${stateId}`, () =>
      fetchAll<MasterDistrict>('/master/districts', { stateId, ...(countryId ? { countryId } : {}) })
    ),
};
