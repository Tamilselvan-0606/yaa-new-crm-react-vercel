/**
 * Document Draft API types (backend: `commerce-service`, `/commerce/document-drafts`).
 * See document-drafts-frontend-integration.md. The backend calculates every total; the frontend only sends
 * raw inputs (qty, price_per_unit, discount_percent, tax_percentage, overall_discount).
 */
export type DocumentDraftType =
  | 'INVOICE'
  | 'PROFORMA_INVOICE'
  | 'ESTIMATION_QUOTATION'
  | 'QUOTATION'
  | 'SALES_ORDER'
  | 'DELIVERY_CHALLAN'
  | 'SALES_INVOICE'
  | 'SALE_RETURN'
  | 'SALES_RETURN'
  | 'PURCHASE_ORDER'
  | 'PURCHASE_REQUEST'
  | 'PURCHASE_RETURN';

export type DocumentDraftStatus = 'DRAFT' | 'COMPLETE' | 'DELETE';

/** Raw item payload sent FROM the frontend. Never send discount_amount / tax_amount / sub_total / grand_total. */
export interface DraftItemPayload {
  id?: string;
  product_id: string;
  batch_no?: string | null;
  /** > 0, up to 3 decimals */
  qty: string | number;
  /** >= 0, up to 2 decimals */
  price_per_unit: string | number;
  /** 0..100 */
  discount_percent?: string | number;
  /** 0..100 */
  tax_percentage?: string | number;
}

/** Calculated item returned FROM the backend (snake_case; camelCase duplicates also exist). */
export interface DocumentDraftItem {
  id: string;
  draft_id: string;
  product_id: string;
  batch_no: string | null;
  qty: string;
  price_per_unit: string;
  discount_percent: string;
  discount_amount: string;
  tax_percentage: string;
  tax_amount: string;
  sub_total: string;
  grand_total: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DocumentDraft {
  id: string;
  organization_id: string;
  branch_id: string | null;
  sub_organization_id: string | null;
  customer_id: string | null;
  supplier_id: string | null;
  invoice_id: string | null;
  type: DocumentDraftType;
  status: DocumentDraftStatus;
  sub_total: string;
  overall_discount: string;
  overall_tax: string;
  grand_total: string;
  item_count: number;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  items?: DocumentDraftItem[];
}

export interface CreateDocumentDraftRequest {
  /** Leave out: the x-organization-id header already scopes the call, and a different body value returns 403. */
  organization_id?: string;
  branch_id?: string | null;
  sub_organization_id?: string | null;
  customer_id?: string | null;
  supplier_id?: string | null;
  invoice_id?: string | null;
  type: DocumentDraftType | string;
  overall_discount?: string | number;
  merge_duplicates?: boolean;
  items?: DraftItemPayload[];
}

export interface ReplaceDocumentDraftRequest {
  branch_id?: string | null;
  sub_organization_id?: string | null;
  customer_id?: string | null;
  supplier_id?: string | null;
  invoice_id?: string | null;
  type?: DocumentDraftType | string;
  status?: 'DRAFT' | 'COMPLETE';
  overall_discount?: string | number;
  version?: number;
  merge_duplicates?: boolean;
  items: DraftItemPayload[];
}

export interface ListDocumentDraftsParams {
  page?: number;
  limit?: number;
  organization_id?: string;
  branch_id?: string;
  sub_organization_id?: string;
  product_id?: string;
  type?: DocumentDraftType | string;
  customer_id?: string;
  supplier_id?: string;
  sort_by?: 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

export interface DraftApiEnvelope<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next_page: boolean;
    has_previous_page: boolean;
  };
  meta?: { timestamp: string; requestId: string };
}
