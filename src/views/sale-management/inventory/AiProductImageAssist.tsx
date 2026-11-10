import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, Sparkles, X } from 'lucide-react';
import { productImageApi, ProductImageSuggestions } from '../../../api/ai/productImageApi';

export interface AiAssistMasters {
  categories: { id: string; name: string }[];
  subcategories: { id: string; name: string; categoryName?: string }[];
  units: { id: string; name: string; shortCode: string }[];
}

export interface AiAssistCurrent {
  productName: string;
  description: string;
  category: string;
  subcategory: string;
  unit: string;
}

/** Values the form can take from the AI. Only the ticked fields are passed back. */
export interface AiAssistApply {
  productName?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  unit?: string;
  baseUnitId?: string;
}

interface Props {
  /** Newly selected image as a data URI. A stored image (URL) cannot be analyzed: the user chooses it again first. */
  image: string;
  productId?: string;
  current: AiAssistCurrent;
  masters: AiAssistMasters;
  onApply: (values: AiAssistApply, filledLabels: string[]) => void;
}

type Key = 'productName' | 'description' | 'category' | 'subcategory' | 'unit';
interface Row {
  key: Key;
  label: string;
  suggested: string;
  current: string;
  apply: AiAssistApply;
  uncertain: boolean;
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const text = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v).trim();
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const name = text(o.name ?? o.label ?? o.key);
    const value = text(o.value);
    return name && value ? `${name}: ${value}` : name || value;
  }
  return '';
};

export const AiProductImageAssist: React.FC<Props> = ({ image, productId, current, masters, onApply }) => {
  const isDataUri = /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(image);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ProductImageSuggestions | null>(null);
  const [ticked, setTicked] = useState<Record<string, boolean>>({});

  // A different image means the earlier suggestions no longer apply.
  useEffect(() => {
    setResult(null);
    setError('');
  }, [image]);

  const rows: Row[] = useMemo(() => {
    if (!result) return [];
    const fs = result.formSuggestions || {};
    const uncertain = new Set(result.uncertainFields || []);
    const out: Row[] = [];
    const name = (fs.name || result.productName || '').toString().trim();
    if (name) out.push({ key: 'productName', label: 'Item name', suggested: name, current: current.productName, apply: { productName: name }, uncertain: uncertain.has('productName') });
    const desc = (fs.description || result.description || '').toString().trim();
    if (desc) out.push({ key: 'description', label: 'Description', suggested: desc, current: current.description, apply: { description: desc }, uncertain: uncertain.has('description') });
    // Category / subcategory / unit can only be set to EXISTING records (an id the server matched exactly).
    const cat = masters.categories.find((c) => c.id === fs.categoryId);
    if (cat) out.push({ key: 'category', label: 'Category', suggested: cat.name, current: current.category, apply: { category: cat.name }, uncertain: uncertain.has('category') });
    const sub = masters.subcategories.find((s) => s.id === fs.subcategoryId);
    if (sub && cat) out.push({ key: 'subcategory', label: 'Subcategory', suggested: sub.name, current: current.subcategory, apply: { category: cat.name, subcategory: sub.name }, uncertain: uncertain.has('subcategory') });
    const unit = masters.units.find((u) => u.id === fs.baseUnitId);
    if (unit) out.push({ key: 'unit', label: 'Unit', suggested: unit.shortCode || unit.name, current: current.unit, apply: { unit: unit.shortCode || unit.name, baseUnitId: unit.id }, uncertain: uncertain.has('unit') });
    return out;
  }, [result, masters, current]);

  const analyze = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await productImageApi.analyzeImage(image, productId);
      setResult(r);
      // Ticked by default only when the form field is empty; a field that already has a different value must be ticked on purpose.
      const fs = r.formSuggestions || {};
      setTicked({
        productName: !current.productName.trim(),
        description: !current.description.trim(),
        category: !current.category.trim() && !!fs.categoryId,
        subcategory: !current.subcategory.trim() && !!fs.subcategoryId,
        unit: !current.unit.trim() || current.unit === 'None',
      });
    } catch (e: any) {
      setResult(null);
      setError(e?.message || 'The image could not be analyzed.');
    } finally {
      setBusy(false);
    }
  };

  const isApplicable = (r: Row) => !!ticked[r.key] && !same(r.suggested, r.current);

  const applyTicked = () => {
    const values: AiAssistApply = {};
    const labels: string[] = [];
    rows.forEach((r) => {
      if (isApplicable(r)) {
        Object.assign(values, r.apply);
        labels.push(r.label);
      }
    });
    if (labels.length === 0) return;
    onApply(values, labels);
    setResult(null);
  };

  const details = result
    ? ([
        ['Brand', result.brand],
        ['Model', result.model],
        ['Colour', result.color],
        ['Size', result.size],
        ['Material', result.material],
        ['Packaging', result.packaging],
        ['Net quantity', result.netQuantity],
        ['SKU (as printed)', result.sku],
        ['Barcode', result.barcode],
      ] as [string, unknown][])
        .map(([l, v]) => [l, text(v)] as const)
        .filter(([, v]) => v)
    : [];
  const specs = (result?.specifications || []).map(text).filter(Boolean);

  return (
    <div className="mt-2">
      {!result && (
        <>
          <button
            type="button"
            onClick={analyze}
            disabled={busy || !isDataUri}
            title={isDataUri ? 'Read the product details from this image' : 'Choose the image again to analyze it (a saved image cannot be analyzed)'}
            className="w-full h-9 px-3 rounded-xl border border-[#33077C]/25 bg-[#33077C]/5 hover:bg-[#33077C]/10 text-[#33077C] text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {busy ? 'Reading image…' : 'Extract Details with AI'}
          </button>
          {!isDataUri && <p className="text-[11px] text-slate-500 mt-1">Choose the image again to analyze it.</p>}
        </>
      )}
      {error && (
        <p className="flex items-start gap-1 text-[11px] font-medium text-rose-500 mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {result && (
        <div className="mt-1 rounded-xl border border-[#33077C]/20 bg-white p-3 space-y-2.5 text-xs">
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold text-[#33077C] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> AI suggestions — please review
            </p>
            <button type="button" onClick={() => setResult(null)} className="text-slate-400 hover:text-rose-500 cursor-pointer" title="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </div>

          {rows.length === 0 && <p className="text-slate-500">Nothing here can be filled automatically.</p>}
          {rows.map((r) => {
            const equal = same(r.suggested, r.current);
            return (
              <label key={r.key} className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  disabled={equal}
                  checked={!equal && !!ticked[r.key]}
                  onChange={(e) => setTicked((p) => ({ ...p, [r.key]: e.target.checked }))}
                />
                <span className="min-w-0">
                  <span className="font-bold text-slate-700">{r.label}: </span>
                  <span className="text-slate-800 break-words">{r.suggested}</span>
                  {r.uncertain && <span className="ml-1 text-amber-600">(guessed from appearance)</span>}
                  {equal ? (
                    <span className="ml-1 text-slate-400">already set</span>
                  ) : r.current.trim() && r.current !== 'None' ? (
                    <span className="ml-1 text-slate-500">replaces "{r.current}"</span>
                  ) : null}
                </span>
              </label>
            );
          })}

          {(details.length > 0 || specs.length > 0) && (
            <div className="border-t border-slate-100 pt-2 text-slate-600 space-y-0.5">
              <p className="font-bold text-slate-500">Detected details (not filled)</p>
              {details.map(([l, v]) => (
                <p key={l}>
                  <span className="font-semibold">{l}:</span> {v}
                </p>
              ))}
              {specs.length > 0 && (
                <p>
                  <span className="font-semibold">Label:</span> {specs.join(' · ')}
                </p>
              )}
            </div>
          )}

          {(result.warnings || []).length > 0 && (
            <ul className="border-t border-slate-100 pt-2 space-y-0.5 text-amber-700">
              {(result.warnings || []).map((w, i) => (
                <li key={`${w.code}-${i}`} className="flex items-start gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
                  <span>{w.message}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={applyTicked}
              disabled={!rows.some(isApplicable)}
              className="px-3 h-8 rounded-lg bg-[#33077C] text-white font-bold cursor-pointer disabled:opacity-50"
            >
              Apply selected
            </button>
            <button type="button" onClick={analyze} disabled={busy} className="px-3 h-8 rounded-lg border border-slate-200 text-slate-600 font-bold cursor-pointer">
              {busy ? 'Reading…' : 'Analyze again'}
            </button>
          </div>
          <p className="text-[10px] text-slate-400">Prices, stock and tax are never filled by AI. Review everything, then save as usual.</p>
        </div>
      )}
    </div>
  );
};
