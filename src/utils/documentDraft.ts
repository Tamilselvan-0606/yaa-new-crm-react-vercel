import type {
  DocumentDraft,
  DocumentDraftItem,
  DocumentDraftType,
  DraftItemPayload,
} from '../api/commerce/documentDraftTypes';

/** Which party field a document type uses on the draft header. */
export type DraftParty = 'customer' | 'supplier';

/** One bill screen -> the draft `type` and party the backend expects (document-drafts-frontend-integration.md, section 2). */
export const DRAFT_MODULES = {
  salesInvoice: { type: 'SALES_INVOICE', party: 'customer', label: 'sales invoice' },
  proforma: { type: 'PROFORMA_INVOICE', party: 'customer', label: 'proforma invoice' },
  quotation: { type: 'ESTIMATION_QUOTATION', party: 'customer', label: 'estimate' },
  saleOrder: { type: 'SALES_ORDER', party: 'customer', label: 'sale order' },
  deliveryChallan: { type: 'DELIVERY_CHALLAN', party: 'customer', label: 'delivery challan' },
  salesReturn: { type: 'SALE_RETURN', party: 'customer', label: 'sales return' },
  purchaseOrder: { type: 'PURCHASE_ORDER', party: 'supplier', label: 'purchase order' },
  purchaseRequest: { type: 'PURCHASE_REQUEST', party: 'supplier', label: 'purchase request' },
  purchaseReturn: { type: 'PURCHASE_RETURN', party: 'supplier', label: 'purchase return' },
} as const satisfies Record<string, { type: DocumentDraftType; party: DraftParty; label: string }>;

export type DraftModuleKey = keyof typeof DRAFT_MODULES;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isDraftUuid = (value: unknown): value is string => typeof value === 'string' && UUID_RE.test(value.trim());

/** The raw fields of one bill row that the draft stores. Every module's item shape already has these. */
export interface DraftableLine {
  productId?: string | null;
  batch?: string | null;
  quantity?: number | string | null;
  unitPrice?: number | string | null;
  discountPercent?: number | string | null;
  discountAmount?: number | string | null;
  discountType?: 'percent' | 'amount' | string | null;
  taxPercent?: number | string | null;
}

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const clampPct = (n: number) => Math.min(100, Math.max(0, n));
const fixed = (n: number, digits: number) => n.toFixed(digits);

export interface DraftBuildOptions {
  /** false = the bill has no GST, so every row is sent with 0% tax. */
  withGst?: boolean;
}

/**
 * Bill rows -> `items` payload for POST / PUT. Rows that the backend would reject are skipped, so one half-filled row
 * (no product picked yet, quantity 0, a typed-in custom item without a product id) never blocks the whole autosave.
 * Totals are never sent: the backend calculates them.
 */
export const buildDraftItems = (lines: readonly DraftableLine[], opts: DraftBuildOptions = {}): DraftItemPayload[] => {
  const withGst = opts.withGst !== false;
  const out: DraftItemPayload[] = [];
  for (const line of lines) {
    if (!isDraftUuid(line.productId)) continue;
    const qty = num(line.quantity);
    const price = num(line.unitPrice);
    if (!(qty > 0) || price < 0) continue;

    let discountPercent = clampPct(num(line.discountPercent));
    // A row discounted by a flat amount is sent as the equivalent percentage (the API only accepts a percentage).
    if (line.discountType === 'amount' && qty * price > 0) {
      discountPercent = clampPct((num(line.discountAmount) / (qty * price)) * 100);
    }

    const batch = typeof line.batch === 'string' ? line.batch.trim() : '';
    out.push({
      product_id: line.productId.trim(),
      batch_no: batch || null,
      qty: fixed(qty, 3),
      price_per_unit: fixed(price, 2),
      discount_percent: fixed(discountPercent, 2),
      tax_percentage: fixed(withGst ? clampPct(num(line.taxPercent)) : 0, 2),
    });
  }
  return out;
};

/** Normalised "overall discount" value for the draft header ("0.00" when empty / invalid). */
export const toDraftMoney = (value: unknown): string => fixed(Math.max(0, num(value)), 2);

export interface DraftSnapshotInput {
  customerId?: string | null;
  supplierId?: string | null;
  overallDiscount?: unknown;
  items: DraftItemPayload[];
}

/** Stable text of what would be sent. Autosave compares it to the last saved text so unchanged forms do not call the API. */
export const draftSnapshot = (input: DraftSnapshotInput): string =>
  JSON.stringify({
    c: isDraftUuid(input.customerId) ? input.customerId : null,
    s: isDraftUuid(input.supplierId) ? input.supplierId : null,
    d: toDraftMoney(input.overallDiscount),
    i: input.items.map((it) => [
      it.product_id,
      it.batch_no ?? null,
      String(it.qty),
      String(it.price_per_unit),
      String(it.discount_percent ?? '0.00'),
      String(it.tax_percentage ?? '0.00'),
    ]),
  });

/** A draft line coming back from the API, as plain numbers for the bill form. */
export interface RestoredDraftLine {
  draftItemId: string;
  productId: string;
  batch: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
}

export const draftItemsToLines = (draft: Pick<DocumentDraft, 'items'>): RestoredDraftLine[] =>
  (draft.items ?? [])
    .filter((it: DocumentDraftItem) => !it.deleted_at)
    .map((it) => ({
      draftItemId: it.id,
      productId: it.product_id,
      batch: it.batch_no ?? '',
      quantity: num(it.qty),
      unitPrice: num(it.price_per_unit),
      discountPercent: num(it.discount_percent),
      taxPercent: num(it.tax_percentage),
    }));

/** True when the draft has something worth offering back to the user. */
export const isResumableDraft = (draft: Pick<DocumentDraft, 'item_count' | 'status'> | null | undefined): boolean =>
  !!draft && draft.status === 'DRAFT' && Number(draft.item_count) > 0;
