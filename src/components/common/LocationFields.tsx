import React, { useEffect, useMemo, useState } from 'react';
import { CustomSelect } from './CustomSelect';
import { masterApi, MasterCountry, MasterDistrict, MasterState } from '../../api/platform/masterApi';

export interface LocationMeta {
  /** False when the chosen country has no states in the master data (State is then optional). */
  stateRequired: boolean;
  /** False when the chosen state has no districts (District is then optional). */
  districtRequired: boolean;
  /** Postal code rule of the chosen country, when the master data has one. */
  pincodeRegex?: string | null;
  pincodeFormat?: string | null;
}

interface LocationFieldsProps {
  country: string;
  state: string;
  district: string;
  /** Names are for display; the ids are what the API payloads carry (countryId / stateId / districtId). */
  onChange: (patch: {
    country?: string;
    countryId?: string;
    state?: string;
    stateId?: string;
    district?: string;
    districtId?: string;
  }) => void;
  onMeta?: (meta: LocationMeta) => void;
  errors?: { country?: string; state?: string; district?: string };
  required?: boolean;
}

const Label: React.FC<{ text: string; required?: boolean }> = ({ text, required }) => (
  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
    {text} {required && <span className="text-rose-500 font-bold">*</span>}
  </label>
);

/** Adds the saved value as an option when the list does not contain it (older records), so it is not lost. */
const withCurrent = (names: string[], current: string) =>
  current && !names.includes(current) ? [current, ...names] : names;

/**
 * Country → State → District dropdowns fed by the master API. Renders three grid cells (no wrapper),
 * so the parent form decides the layout. Values are the display names.
 */
export const LocationFields: React.FC<LocationFieldsProps> = ({
  country,
  state,
  district,
  onChange,
  onMeta,
  errors = {} as NonNullable<LocationFieldsProps["errors"]>,
  required = true,
}) => {
  const [countries, setCountries] = useState<MasterCountry[]>([]);
  const [states, setStates] = useState<MasterState[]>([]);
  const [districts, setDistricts] = useState<MasterDistrict[]>([]);
  const [statesLoaded, setStatesLoaded] = useState(false);
  const [districtsLoaded, setDistrictsLoaded] = useState(false);

  const selectedCountry = useMemo(() => countries.find((c) => c.name === country), [countries, country]);
  const selectedState = useMemo(() => states.find((s) => s.stateName === state), [states, state]);

  useEffect(() => {
    let alive = true;
    masterApi
      .getCountries()
      .then((c) => alive && setCountries(c))
      .catch(() => alive && setCountries([]));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    setStates([]);
    setStatesLoaded(false);
    if (!selectedCountry) return;
    masterApi
      .getStates(selectedCountry.id)
      .then((s) => {
        if (!alive) return;
        setStates(s);
        setStatesLoaded(true);
      })
      .catch(() => alive && setStatesLoaded(false));
    return () => {
      alive = false;
    };
  }, [selectedCountry?.id]);

  useEffect(() => {
    let alive = true;
    setDistricts([]);
    setDistrictsLoaded(false);
    if (!selectedState) return;
    masterApi
      .getDistricts(selectedState.id, selectedState.countryId)
      .then((d) => {
        if (!alive) return;
        setDistricts(d);
        setDistrictsLoaded(true);
      })
      .catch(() => alive && setDistrictsLoaded(false));
    return () => {
      alive = false;
    };
  }, [selectedState?.id]);

  const stateRequired = !(selectedCountry && statesLoaded && states.length === 0);
  const districtRequired = !(selectedState && districtsLoaded && districts.length === 0);
  const pincodeRegex = selectedCountry?.postalCodeRegex ?? null;
  const pincodeFormat = selectedCountry?.postalCodeFormat ?? null;

  useEffect(() => {
    onMeta?.({ stateRequired, districtRequired, pincodeRegex, pincodeFormat });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateRequired, districtRequired, pincodeRegex, pincodeFormat]);

  return (
    <>
      <div>
        <Label text="Country" required={required} />
        <CustomSelect
          searchable
          value={country}
          error={!!errors.country}
          onChange={(v) =>
            onChange({
              country: v,
              countryId: countries.find((c) => c.name === v)?.id ?? '',
              state: '',
              stateId: '',
              district: '',
              districtId: '',
            })
          }
          options={withCurrent(countries.map((c) => c.name), country)}
          placeholder="Select country"
          activeColor="brand"
        />
        {errors.country && <p className="text-[11px] font-medium text-red-500 mt-1">{errors.country}</p>}
      </div>
      <div>
        <Label text="State" required={required && stateRequired} />
        <CustomSelect
          searchable
          value={state}
          error={!!errors.state}
          disabled={!country}
          onChange={(v) =>
            onChange({
              state: v,
              stateId: states.find((x) => x.stateName === v)?.id ?? '',
              district: '',
              districtId: '',
            })
          }
          options={withCurrent(states.map((s) => s.stateName), state)}
          placeholder={country ? 'Select state' : 'Select country first'}
          activeColor="brand"
        />
        {errors.state && <p className="text-[11px] font-medium text-red-500 mt-1">{errors.state}</p>}
      </div>
      <div>
        <Label text="District" required={required && districtRequired} />
        <CustomSelect
          searchable
          value={district}
          error={!!errors.district}
          disabled={!state}
          onChange={(v) =>
            onChange({ district: v, districtId: districts.find((d) => d.districtName === v)?.id ?? '' })
          }
          options={withCurrent(districts.map((d) => d.districtName), district)}
          placeholder={state ? 'Select district' : 'Select state first'}
          activeColor="brand"
        />
        {errors.district && <p className="text-[11px] font-medium text-red-500 mt-1">{errors.district}</p>}
      </div>
    </>
  );
};
