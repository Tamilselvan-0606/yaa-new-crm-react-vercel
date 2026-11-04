import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { masterApi, MasterCountry } from '../../api/platform/masterApi';
import { PHONE_MAX_DIGITS } from '../../utils/fieldValidators';

interface PhoneFieldProps {
  label: string;
  required?: boolean;
  /** Full number with its country code, e.g. "+919876543210" (empty when no number is typed). */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}

const digitsOf = (s?: string | null) => (s || '').replace(/\D/g, '');

const Flag: React.FC<{ country?: MasterCountry }> = ({ country }) => {
  const [failed, setFailed] = useState(false);
  const code = country?.shortName?.toLowerCase();
  if (!code || failed) {
    return <span className="w-5 text-[10px] font-bold text-slate-500">{country?.shortName || ''}</span>;
  }
  return (
    <img
      src={`https://flagcdn.com/w20/${code}.png`}
      alt=""
      width={20}
      height={14}
      className="rounded-[2px] object-cover"
      onError={() => setFailed(true)}
    />
  );
};

/**
 * Phone input with a country-code dropdown (flag + dial code) in front of the number.
 * The code is chosen here and is independent of the Country field of the form.
 */
export const PhoneField: React.FC<PhoneFieldProps> = ({ label, required, value, onChange, error, placeholder }) => {
  const [countries, setCountries] = useState<MasterCountry[]>([]);
  const [chosenId, setChosenId] = useState('');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    masterApi
      .getCountries()
      .then((c) => alive && setCountries(c.filter((x) => digitsOf(x.mobileCode))))
      .catch(() => alive && setCountries([]));
    return () => {
      alive = false;
    };
  }, []);

  // Split the stored value into country + national number.
  const { parsedCountry, national } = useMemo(() => {
    const v = (value || '').trim();
    if (v.startsWith('+')) {
      const digits = digitsOf(v);
      const match = countries
        .filter((c) => digits.startsWith(digitsOf(c.mobileCode)))
        .sort((a, b) => digitsOf(b.mobileCode).length - digitsOf(a.mobileCode).length)[0];
      return { parsedCountry: match, national: match ? digits.slice(digitsOf(match.mobileCode).length) : digits };
    }
    return { parsedCountry: undefined, national: digitsOf(v) };
  }, [value, countries]);

  const defaultCountry = useMemo(() => countries.find((c) => c.shortName === 'IN') ?? countries[0], [countries]);
  const chosen = countries.find((c) => c.id === chosenId);
  const active =
    chosen && (!value || !parsedCountry || digitsOf(chosen.mobileCode) === digitsOf(parsedCountry.mobileCode))
      ? chosen
      : parsedCountry ?? defaultCountry;
  const code = active?.mobileCode?.startsWith('+') ? active.mobileCode : active ? `+${digitsOf(active.mobileCode)}` : '';
  const maxNational = Math.max(1, PHONE_MAX_DIGITS - digitsOf(code).length);

  const emit = (c: string, nat: string) => onChange(nat ? `${c}${nat}` : '');

  const place = () => {
    if (!boxRef.current) return;
    const r = boxRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: r.left, width: Math.max(r.width, 260) });
  };

  useEffect(() => {
    if (!open) return;
    place();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (boxRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
      setQuery('');
    };
    const onScroll = () => place();
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.mobileCode || '').includes(q) || (c.shortName || '').toLowerCase().includes(q)
    );
  }, [countries, query]);

  return (
    <div>
      <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
        {label} {required && <span className="text-rose-500 font-bold">*</span>}
      </label>
      <div
        ref={boxRef}
        className={`flex items-center h-11 bg-white rounded-xl border transition-all ${
          error
            ? 'border-red-500 focus-within:ring-4 focus-within:ring-red-500/10'
            : 'border-slate-200 hover:border-slate-300 focus-within:border-[#4309A2] focus-within:ring-4 focus-within:ring-[#4309A2]/10'
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="h-full pl-3 pr-2 flex items-center gap-1.5 shrink-0 border-r border-slate-200 rounded-l-xl hover:bg-slate-50 cursor-pointer"
        >
          <Flag country={active} />
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          <span className="text-xs sm:text-[13px] font-semibold text-slate-700">{code}</span>
        </button>
        <input
          type="tel"
          inputMode="numeric"
          value={national}
          maxLength={maxNational}
          placeholder={placeholder || 'Phone number'}
          onChange={(e) => emit(code, digitsOf(e.target.value).slice(0, maxNational))}
          className="flex-1 min-w-0 h-full px-3 bg-transparent outline-none text-xs sm:text-[13px] font-medium text-slate-800 placeholder:text-slate-400"
        />
      </div>
      {error && <p className="text-[11px] font-medium text-red-500 mt-1">{error}</p>}

      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 999999 }}
            className="bg-white rounded-xl border border-slate-200/90 shadow-2xl shadow-slate-900/15 overflow-hidden"
          >
            <div className="p-1.5 border-b border-slate-100">
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search country or code..."
                className="w-full h-8 px-2.5 text-[11.5px] border border-slate-200 rounded-md outline-none focus:border-[#4309A2]"
              />
            </div>
            <div className="max-h-56 overflow-y-auto p-1">
              {visible.length === 0 && (
                <div className="px-3 py-2.5 text-xs text-slate-400 text-center italic">No countries found</div>
              )}
              {visible.map((c) => {
                const selected = active?.id === c.id;
                const cCode = c.mobileCode?.startsWith('+') ? c.mobileCode : `+${digitsOf(c.mobileCode)}`;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setChosenId(c.id);
                      setOpen(false);
                      setQuery('');
                      // Keep the typed number; only the code changes (the digit cap may trim it).
                      const cap = Math.max(1, PHONE_MAX_DIGITS - digitsOf(cCode).length);
                      emit(cCode, national.slice(0, cap));
                    }}
                    className={`px-2.5 py-1.5 text-[11.5px] flex items-center gap-2 cursor-pointer rounded ${
                      selected ? 'bg-[#33077C]/10 text-[#33077C] font-bold' : 'text-slate-700 font-medium hover:bg-purple-50/60'
                    }`}
                  >
                    <Flag country={c} />
                    <span className="truncate flex-1">{c.name}</span>
                    <span className="text-slate-500 shrink-0">{cCode}</span>
                  </div>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
