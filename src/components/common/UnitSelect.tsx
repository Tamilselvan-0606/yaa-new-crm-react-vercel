import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Plus, Search, X } from "lucide-react";
import { unitApi } from "../../api/commerce/unitApi";
import { toast } from "../../utils/toast";

export interface UnitOption {
  value: string; // short code (or name) in uppercase - what gets stored on the line item
  label: string; // e.g. "DOZEN (Dz)"
}

let cachedUnits: UnitOption[] | null = null;
let inflight: Promise<UnitOption[]> | null = null;
const listeners = new Set<(o: UnitOption[]) => void>();

const toOptions = (list: any[]): UnitOption[] => {
  const seen = new Set<string>();
  const options: UnitOption[] = [];
  list.forEach((u) => {
    const isActive =
      u.status === undefined ||
      u.status === 1 ||
      String(u.status).toLowerCase() === "active";
    if (!isActive) return;
    const value = String(u.shortCode || u.name || "").trim().toUpperCase();
    if (!value || seen.has(value)) return;
    seen.add(value);
    options.push({
      value,
      label: u.shortCode && u.name ? `${String(u.name).toUpperCase()} (${u.shortCode})` : value,
    });
  });
  return options;
};

const fetchUnits = (force = false): Promise<UnitOption[]> => {
  if (cachedUnits && !force) return Promise.resolve(cachedUnits);
  if (inflight) return inflight;
  inflight = unitApi
    .getUnits({ sortOrder: "asc" })
    .then((res: any) => {
      const list: any[] = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
          ? res
          : Array.isArray(res?.data?.data)
            ? res.data.data
            : [];
      cachedUnits = toOptions(list);
      listeners.forEach((l) => l(cachedUnits!));
      return cachedUnits;
    })
    .catch((err) => {
      console.warn("Failed to load units:", err);
      return cachedUnits || ([] as UnitOption[]);
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
};

export const useUnitOptions = (): UnitOption[] => {
  const [options, setOptions] = useState<UnitOption[]>(cachedUnits || []);
  useEffect(() => {
    let alive = true;
    const l = (o: UnitOption[]) => alive && setOptions(o);
    listeners.add(l);
    fetchUnits().then(l);
    return () => {
      alive = false;
      listeners.delete(l);
    };
  }, []);
  return options;
};

interface UnitSelectProps {
  value?: string;
  onChange: (value: string) => void;
  /** Extra classes for the trigger button (sizing / alignment). */
  className?: string;
}

/** Searchable unit dropdown (with "+ Add New Unit") populated from /commerce/units */
const UnitSelect: React.FC<UnitSelectProps> = ({ value, onChange, className }) => {
  const options = useUnitOptions();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [creating, setCreating] = useState(false);

  const current = (value || "").trim().toUpperCase();
  const hasValue = !!current && current !== "NONE";
  const selected = options.find((o) => o.value === current);
  const displayLabel = hasValue ? selected?.value || current : "";

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.max(r.width, 240);
    const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
    const below = window.innerHeight - r.bottom;
    if (below < 300 && r.top > below) {
      setPos({ bottom: window.innerHeight - r.top + 6, left, width });
    } else {
      setPos({ top: r.bottom + 6, left, width });
    }
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    place();
    const onScroll = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setIsOpen(false);
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", place);
    };
  }, [isOpen, place]);

  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setIsOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    setTimeout(() => searchRef.current?.focus(), 30);
    return () => document.removeEventListener("mousedown", onDown);
  }, [isOpen]);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(query.toLowerCase().trim()),
  );

  const closeAdd = () => {
    setAddOpen(false);
    setNewName("");
    setNewCode("");
    setAttempted(false);
  };

  const handleCreate = async () => {
    setAttempted(true);
    const name = newName.trim();
    const code = newCode.trim();
    if (!name || !code || creating) return;
    setCreating(true);
    try {
      const res: any = await unitApi.createUnit({
        name,
        shortCode: code,
        status: 1,
      });
      const created = res?.data ?? res;
      await fetchUnits(true);
      toast.success(`Unit "${name.toUpperCase()} (${code})" created`);
      onChange(String(created?.shortCode || code).toUpperCase());
      closeAdd();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to create unit.",
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => {
          setQuery("");
          setIsOpen((o) => !o);
        }}
        className={`w-full h-8 px-2 flex items-center justify-between gap-1 bg-transparent hover:bg-slate-50 border rounded-lg text-xs font-semibold uppercase transition-colors cursor-pointer ${
          isOpen ? "border-[#33077C] bg-white" : "border-transparent"
        } ${hasValue ? "text-slate-700" : "text-slate-400"} ${className || ""}`}
      >
        <span className="truncate flex-1 text-center">{displayLabel || "Unit"}</span>
        <span className="text-[9px] text-slate-500 select-none">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: pos.top,
              bottom: pos.bottom,
              left: pos.left,
              width: pos.width,
              zIndex: 9999,
            }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 normal-case"
          >
            <div className="flex items-center w-full h-9 px-3 mb-2 bg-white border border-slate-200 rounded-full focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/10 transition-all">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search Unit"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-slate-400 hover:text-slate-600 p-0.5 ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setAddOpen(true);
              }}
              className="w-full px-3 py-2 text-left text-xs font-bold text-[#33077C] hover:bg-[#33077C]/10 rounded-xl flex items-center gap-2 transition-colors cursor-pointer mb-1"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add New Unit</span>
            </button>

            <div className="max-h-48 overflow-y-auto space-y-1 p-0.5">
              {filtered.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400 font-medium">
                  No units found
                </div>
              ) : (
                filtered.map((opt) => {
                  const isSel = current === opt.value;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-left text-xs font-medium flex items-center gap-2.5 cursor-pointer transition-colors ${
                        isSel
                          ? "bg-[#33077C]/10 text-[#33077C] font-bold"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0 ${
                          isSel
                            ? "border-[#33077C] bg-[#33077C] text-white"
                            : "border-slate-400 bg-white"
                        }`}
                      >
                        {isSel && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="truncate">{opt.label}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )}

      {addOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4"
            onMouseDown={(e) => e.target === e.currentTarget && closeAdd()}
          >
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 normal-case">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800">Add New Unit</h3>
                <button type="button" onClick={closeAdd} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Unit Name</label>
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Dozen"
                    className={`w-full h-10 px-3 rounded-xl border text-sm outline-none focus:border-[#4309A2] ${
                      attempted && !newName.trim() ? "border-rose-400" : "border-slate-200"
                    }`}
                  />
                  {attempted && !newName.trim() && (
                    <p className="text-[11px] text-rose-500 mt-1">Please enter the unit name.</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Short Code</label>
                  <input
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="e.g. Dz"
                    className={`w-full h-10 px-3 rounded-xl border text-sm outline-none focus:border-[#4309A2] ${
                      attempted && !newCode.trim() ? "border-rose-400" : "border-slate-200"
                    }`}
                  />
                  {attempted && !newCode.trim() && (
                    <p className="text-[11px] text-rose-500 mt-1">Please enter the unit short code.</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <button
                  type="button"
                  onClick={closeAdd}
                  className="h-9 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={creating}
                  onClick={handleCreate}
                  className="h-9 px-4 rounded-xl bg-[#33077C] text-white text-xs font-bold hover:bg-[#4309A2] disabled:opacity-60"
                >
                  {creating ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default UnitSelect;
