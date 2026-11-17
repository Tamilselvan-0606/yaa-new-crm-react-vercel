import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { documentDraftCalls, getDraftErrorCode, getDraftErrorMessage } from '../api/commerce/documentDraftApi';
import { useAppDispatch } from './redux';
import type { DocumentDraft } from '../api/commerce/documentDraftTypes';
import {
  DRAFT_MODULES,
  DraftableLine,
  DraftModuleKey,
  RestoredDraftLine,
  buildDraftItems,
  draftItemsToLines,
  draftSnapshot,
  isDraftUuid,
  isResumableDraft,
  toDraftMoney,
} from '../utils/documentDraft';
import type { DraftItemPayload } from '../api/commerce/documentDraftTypes';

export type DraftSyncStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface UseBillDraftOptions {
  module: DraftModuleKey;
  /**
   * true only while a NEW bill is being created (form open, not editing a saved record).
   * Turning it off flushes any unsaved change and stops autosave.
   */
  enabled: boolean;
  /**
   * Identifies which bill is on screen. Screens with several bill tabs pass the tab id so each tab keeps its own
   * draft. Defaults to one shared draft.
   */
  contextKey?: string;
  /** Customer id (sales documents) or supplier id (purchase documents). Non-UUID values (walk-in etc.) are sent as null. */
  partyId?: string | null;
  /** Document-level discount amount (the backend allocates it across lines before tax). */
  overallDiscount?: unknown;
  /** The rows currently in the bill. */
  lines: readonly DraftableLine[];
  /** false = no GST on this bill (rows are sent with 0% tax). */
  withGst?: boolean;
  /** Wait this long after the last change before saving (default 800 ms). */
  debounceMs?: number;
  /**
   * Look for an unfinished draft of this type while true. Defaults to `enabled`; pass the "form is open" flag when
   * autosave only starts later (so opening the form makes one list call, not one per autosave start).
   */
  detectResume?: boolean;
}

interface Ctx {
  draftId: string | null;
  version: number | undefined;
  /** Snapshot text of the last successfully saved state. */
  snapshot: string | null;
}

interface SyncInput {
  partyId: string | null;
  overallDiscount: string;
  items: DraftItemPayload[];
}

export interface DraftTotals {
  itemCount: number;
  subTotal: string;
  overallTax: string;
  grandTotal: string;
}

/**
 * Keeps the bill that is being created saved on the server as a document draft (see
 * document-drafts-frontend-integration.md): every change to the rows / party / overall discount is saved a moment
 * later with one PUT (create on the first row), so 100+ rows survive a refresh or a closed tab. When the real bill is
 * saved, `finalize()` marks the draft COMPLETE so it stops appearing in the draft list.
 *
 * Autosave never blocks the form: a failed save only shows in `status` / `error`, and the bill can still be saved.
 */
export const useBillDraft = (opts: UseBillDraftOptions) => {
  const {
    module,
    enabled,
    contextKey = 'default',
    partyId,
    overallDiscount,
    lines,
    withGst,
    debounceMs = 800,
    detectResume,
  } = opts;
  const meta = DRAFT_MODULES[module];

  // The draft endpoints are RTK Query endpoints (tag DocumentDraft): reads go to the server each time, and every write
  // invalidates the DocumentDraft tags, exactly like the other Sale Management APIs.
  const dispatch = useAppDispatch();
  const documentDraftApi = useMemo(
    () => ({
      list: (...a: Parameters<typeof documentDraftCalls.list>) => dispatch(documentDraftCalls.list(...a)).unwrap(),
      getById: (...a: Parameters<typeof documentDraftCalls.getById>) => dispatch(documentDraftCalls.getById(...a)).unwrap(),
      create: (...a: Parameters<typeof documentDraftCalls.create>) => dispatch(documentDraftCalls.create(...a)).unwrap(),
      replace: (...a: Parameters<typeof documentDraftCalls.replace>) => dispatch(documentDraftCalls.replace(...a)).unwrap(),
      clearItems: (...a: Parameters<typeof documentDraftCalls.clearItems>) => dispatch(documentDraftCalls.clearItems(...a)).unwrap(),
      finalize: (...a: Parameters<typeof documentDraftCalls.finalize>) => dispatch(documentDraftCalls.finalize(...a)).unwrap(),
    }),
    [dispatch],
  );

  const [status, setStatus] = useState<DraftSyncStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [totals, setTotals] = useState<DraftTotals | null>(null);
  const [pendingDraft, setPendingDraft] = useState<DocumentDraft | null>(null);

  const ctxs = useRef(new Map<string, Ctx>());
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ key: string; input: SyncInput; snap: string } | null>(null);
  const skipSnap = useRef<string | null>(null);
  const mounted = useRef(true);

  const getCtx = (key: string): Ctx => {
    let c = ctxs.current.get(key);
    if (!c) {
      c = { draftId: null, version: undefined, snapshot: null };
      ctxs.current.set(key, c);
    }
    return c;
  };

  // ---- what would be saved right now -------------------------------------------------------------------------
  const items = useMemo(() => buildDraftItems(lines, { withGst }), [lines, withGst]);
  const party = isDraftUuid(partyId) ? partyId.trim() : null;
  const discount = toDraftMoney(overallDiscount);
  const snap = draftSnapshot(
    meta.party === 'customer'
      ? { customerId: party, overallDiscount: discount, items }
      : { supplierId: party, overallDiscount: discount, items },
  );
  const input: SyncInput = { partyId: party, overallDiscount: discount, items };
  const inputRef = useRef({ input, snap });
  inputRef.current = { input, snap };

  const headerFields = (p: string | null) =>
    meta.party === 'customer' ? { customer_id: p, supplier_id: null } : { supplier_id: p, customer_id: null };

  // ---- one save (create / replace / clear), serialised so saves never overlap -------------------------------------
  const saveNow = useCallback(
    async (key: string, saveInput: SyncInput, saveSnap: string) => {
      const ctx = getCtx(key);
      if (saveSnap === ctx.snapshot) return;
      if (!ctx.draftId && saveInput.items.length === 0) return;
      if (skipSnap.current === saveSnap) return;

      if (mounted.current) {
        setStatus('saving');
        setError(null);
      }

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          let draft: DocumentDraft;
          if (!ctx.draftId) {
            draft = (
              await documentDraftApi.create({
                type: meta.type,
                ...headerFields(saveInput.partyId),
                overall_discount: saveInput.overallDiscount,
                items: saveInput.items,
                merge_duplicates: false,
              })
            ).data;
          } else if (saveInput.items.length === 0) {
            draft = (await documentDraftApi.clearItems(ctx.draftId, ctx.version)).data;
          } else {
            draft = (
              await documentDraftApi.replace(
                ctx.draftId,
                {
                  type: meta.type,
                  ...headerFields(saveInput.partyId),
                  overall_discount: saveInput.overallDiscount,
                  items: saveInput.items,
                  merge_duplicates: false,
                },
                ctx.version,
              )
            ).data;
          }
          ctx.draftId = draft.id;
          ctx.version = draft.version;
          ctx.snapshot = saveSnap;
          if (mounted.current) {
            setStatus('saved');
            setLastSavedAt(new Date());
            setTotals({
              itemCount: Number(draft.item_count) || 0,
              subTotal: draft.sub_total,
              overallTax: draft.overall_tax,
              grandTotal: draft.grand_total,
            });
          }
          return;
        } catch (err) {
          const code = getDraftErrorCode(err);
          if (attempt === 0 && (code === 'DRAFT_NOT_FOUND' || code === 'DRAFT_NOT_EDITABLE')) {
            // The saved draft is gone or already completed: start a new one with the current rows.
            ctx.draftId = null;
            ctx.version = undefined;
            continue;
          }
          if (attempt === 0 && code === 'STALE_DRAFT_VERSION' && ctx.draftId) {
            try {
              const fresh = await documentDraftApi.getById(ctx.draftId);
              ctx.version = fresh.data.version;
              continue;
            } catch {
              /* fall through to the error state */
            }
          }
          if (mounted.current) {
            setStatus('error');
            setError(getDraftErrorMessage(err, 'Could not save the draft.'));
          }
          return;
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [meta.type, meta.party],
  );

  const enqueue = useCallback(
    (key: string, saveInput: SyncInput, saveSnap: string) => {
      const run = () => saveNow(key, saveInput, saveSnap);
      queue.current = queue.current.then(run, run);
      return queue.current;
    },
    [saveNow],
  );

  const flushPending = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const p = pending.current;
    pending.current = null;
    if (p) void enqueue(p.key, p.input, p.snap);
  }, [enqueue]);

  // ---- autosave -----------------------------------------------------------------------------------------------
  useEffect(() => {
    if (!enabled) {
      flushPending();
      return;
    }
    if (skipSnap.current !== null && skipSnap.current !== snap) skipSnap.current = null;
    const ctx = getCtx(contextKey);
    if (snap === ctx.snapshot || (!ctx.draftId && items.length === 0) || skipSnap.current === snap) return;

    pending.current = { key: contextKey, input: inputRef.current.input, snap };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      const p = pending.current;
      pending.current = null;
      if (p) void enqueue(p.key, p.input, p.snap);
    }, debounceMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, contextKey, snap, debounceMs]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      flushPending();
    };
  }, [flushPending]);

  // ---- look for an unfinished draft when a new bill is opened -------------------------------------------------
  useEffect(() => {
    if (!(detectResume ?? enabled)) {
      setPendingDraft(null);
      return;
    }
    if (getCtx(contextKey).draftId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await documentDraftApi.list({ type: meta.type, limit: 10, sort_by: 'updated_at', sort_order: 'desc' });
        if (cancelled) return;
        setPendingDraft((res.data ?? []).find((d) => isResumableDraft(d)) ?? null);
      } catch {
        if (!cancelled) setPendingDraft(null); // checking is optional; never block creating a bill
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detectResume, enabled, meta.type]);

  // ---- actions ----------------------------------------------------------------------------------------------
  /** Loads the full pending draft and makes autosave continue it. The caller puts `lines` into the form. */
  const resume = useCallback(async (): Promise<{ draft: DocumentDraft; lines: RestoredDraftLine[] } | null> => {
    if (!pendingDraft) return null;
    try {
      const full = (await documentDraftApi.getById(pendingDraft.id)).data;
      if (full.status !== 'DRAFT') {
        setPendingDraft(null);
        return null;
      }
      const ctx = getCtx(contextKey);
      ctx.draftId = full.id;
      ctx.version = full.version;
      ctx.snapshot = null;
      setPendingDraft(null);
      setStatus('saved');
      setTotals({ itemCount: Number(full.item_count) || 0, subTotal: full.sub_total, overallTax: full.overall_tax, grandTotal: full.grand_total });
      return { draft: full, lines: draftItemsToLines(full) };
    } catch (err) {
      setPendingDraft(null);
      setError(getDraftErrorMessage(err, 'Could not load the draft.'));
      return null;
    }
  }, [pendingDraft, contextKey]);

  /** "Start fresh": empties the saved draft's rows so it is not offered again. */
  const discardPending = useCallback(async () => {
    const target = pendingDraft;
    setPendingDraft(null);
    if (!target) return;
    try {
      await documentDraftApi.clearItems(target.id);
    } catch {
      /* an old draft that could not be cleared is simply offered again next time */
    }
  }, [pendingDraft]);

  /** Call after the real bill was saved successfully: marks the draft COMPLETE. Never throws; returns false if it failed. */
  const finalize = useCallback(async (): Promise<boolean> => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    pending.current = null;
    skipSnap.current = inputRef.current.snap; // the form still shows the saved bill; do not re-create a draft from it
    try {
      await queue.current;
    } catch {
      /* saves never reject */
    }
    const ctx = getCtx(contextKey);
    const id = ctx.draftId;
    ctx.draftId = null;
    ctx.version = undefined;
    ctx.snapshot = null;
    if (mounted.current) {
      setStatus('idle');
      setTotals(null);
      setLastSavedAt(null);
      setError(null);
    }
    if (!id) return true;
    try {
      await documentDraftApi.finalize(id);
      return true;
    } catch (err) {
      const code = getDraftErrorCode(err);
      // Nothing to complete / already gone / already completed: the draft is no longer an open draft either way.
      return code === 'EMPTY_DRAFT' || code === 'DRAFT_NOT_FOUND' || code === 'DRAFT_NOT_EDITABLE';
    }
  }, [contextKey]);

  return {
    /** idle | saving | saved | error */
    status,
    error,
    lastSavedAt,
    /** Backend-calculated totals of the saved draft (null until the first save). */
    totals,
    /** An unfinished draft of this type found when the form opened (null if none / already handled). */
    pendingDraft,
    resume,
    discardPending,
    finalize,
  };
};
