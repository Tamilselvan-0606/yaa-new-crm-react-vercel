/**
 * Sales Document Workflow & Cross-Module Lineage Manager
 * 
 * Provides end-to-end synchronization, lineage tracking, and navigation across:
 * 1. Estimate / Quotation (EST-XXXX)
 * 2. Proforma Invoice (PRO-XXXX / PI-XXXX)
 * 3. Sales Order (SO-XXXX)
 * 4. Delivery Challan (DC-XXXX)
 * 5. Sales Invoice (INV-XXXX)
 * 
 * Guarantees that document conversions are:
 * - Reflected immediately in both source and target modules
 * - Preserved across page refreshes, tab switches, and logins
 * - Linked bidirectionally (e.g. EST -> PI -> SO -> INV and vice versa)
 */

export type SalesDocType = 'Estimate' | 'Proforma' | 'Order' | 'Challan' | 'Invoice';

export interface SalesDocumentLineage {
  id: string; // unique lineage tracking id
  estimateId?: string;
  estimateNo?: string;
  proformaId?: string;
  proformaNo?: string;
  orderId?: string;
  orderNo?: string;
  challanId?: string;
  challanNo?: string;
  invoiceId?: string;
  invoiceNo?: string;
  customerId?: string;
  customerCode?: string;
  partyName?: string;
  grandTotal?: number;
  createdAt: string;
  updatedAt: string;
}

export const STORAGE_KEYS = {
  DOCUMENT_LINEAGE: 'yaa_crm_sales_document_lineage',
  QUOTATIONS: 'nexus_crm_sale_quotations',
  PROFORMAS: 'yaa_crm_proforma_invoices',
  ORDERS: 'yaa_crm_sale_orders',
  CHALLANS: 'yaa_crm_delivery_challans',
  SALES: 'nexus_crm_sales_transactions',
};

// =========================================================================
// 1. Lineage Storage & Query Helpers
// =========================================================================

// Document "converted from / to" history is NOT kept on the client any more (neither in the browser's storage nor in
// memory): screens show what the API returns for each record (status, convertedAt, convertedToInvoiceNo, ...). The
// helpers stay so existing callers keep compiling, but they hold and return nothing, so every lineage-derived badge,
// customer-code fallback and converted-date fallback resolves to the API data only.
export const getStoredLineages = (): SalesDocumentLineage[] => [];

export const persistLineages = (_lineages: SalesDocumentLineage[]): void => {
  /* intentionally not stored */
};

/**
 * Infers Sales Document Type from document reference number prefix
 */
export const inferDocType = (docRef?: string | null): SalesDocType | undefined => {
  if (!docRef || !docRef.trim()) return undefined;
  // A document number is "<PREFIX>-<year>-<seq>". Requiring the dash keeps an ordinary reference such as "SOFA-12" or
  // "DCR/44" from being mistaken for a sale order or a challan.
  const clean = docRef.trim().toUpperCase();
  if (/^(EST|QT|QUOT)-/.test(clean)) return 'Estimate';
  if (/^(PRO|PI)-/.test(clean)) return 'Proforma';
  if (/^(SO|ORD)-/.test(clean)) return 'Order';
  if (/^(DC|CHAL)-/.test(clean)) return 'Challan';
  if (/^INV-/.test(clean)) return 'Invoice';
  return undefined;
};

/** The document kind named by the API's `convertedToType` (the values differ a little between endpoints). */
export const docTypeFromApiType = (type?: string | null): SalesDocType | undefined => {
  const t = (type || '').toString().trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (!t) return undefined;
  if (t === 'invoice' || t === 'salesinvoice' || t === 'saleinvoice') return 'Invoice';
  if (t === 'order' || t === 'saleorder' || t === 'salesorder') return 'Order';
  if (t === 'challan' || t === 'deliverychallan') return 'Challan';
  if (t === 'proforma' || t === 'proformainvoice') return 'Proforma';
  if (t === 'estimate' || t === 'quotation' || t === 'quote') return 'Estimate';
  return undefined;
};

/**
 * Has the SERVER converted this document? One rule for every sales-document page (estimate, proforma, sale order, challan).
 *
 * "Converted" is the server's status, or a destination the server recorded (a converted-to id or document number). A document
 * the server reports as open, cancelled or expired is not converted, whatever a stale field says. Nothing on the screen (a
 * clicked button, a local patch) can make a document count as converted: the lists are re-read from the server after a
 * conversion, and this is evaluated on that record.
 *
 * The API stores ONE destination per document and no per-line quantities, so a document is either converted or not here.
 * Partial and one-to-many conversions cannot be represented by the server record, so they are not simulated.
 */
export const getConversionState = (doc?: {
  status?: string | null;
  convertedToType?: string | null;
  convertedToId?: string | null;
  convertedToInvoiceNo?: string | null;
} | null): { isFullyConverted: boolean; target?: { type: SalesDocType; no: string } } => {
  const status = (doc?.status || '').toString().trim().toLowerCase();
  if (['open', 'cancelled', 'canceled', 'expired'].includes(status)) return { isFullyConverted: false };
  const target = resolveConvertedTarget(doc);
  const recorded = status === 'converted' || !!target || !!(doc?.convertedToId || '').toString().trim();
  return { isFullyConverted: recorded, target };
};

/**
 * The document this one was converted into, read only from what the server returned for THIS record
 * (`convertedToType` + `convertedToInvoiceNo`, which holds the destination's document number whatever its kind).
 * Returns nothing when the server reports no conversion, so a document never claims a destination it does not have.
 */
export const resolveConvertedTarget = (doc?: {
  convertedToType?: string | null;
  convertedToInvoiceNo?: string | null;
  status?: string | null;
} | null): { type: SalesDocType; no: string } | undefined => {
  const no = (doc?.convertedToInvoiceNo || '').toString().trim();
  if (!no) return undefined;
  // A document the server reports as open / cancelled / expired is not converted, whatever a stale field says.
  if (['open', 'cancelled', 'canceled', 'expired'].includes((doc?.status || '').toString().trim().toLowerCase())) return undefined;
  const type = docTypeFromApiType(doc?.convertedToType) ?? inferDocType(no);
  return type ? { type, no } : undefined;
};

const LINEAGE_KEYS: Record<SalesDocType, readonly [keyof SalesDocumentLineage, keyof SalesDocumentLineage]> = {
  Estimate: ['estimateId', 'estimateNo'],
  Proforma: ['proformaId', 'proformaNo'],
  Order: ['orderId', 'orderNo'],
  Challan: ['challanId', 'challanNo'],
  Invoice: ['invoiceId', 'invoiceNo'],
};

const isRealDocId = (v?: string | null): boolean => !!v && v.trim() !== '' && !/^[0-9]+$/.test(v.trim());

/**
 * Does this stored lineage record really describe THIS document?
 * Document numbers repeat (after deletions, resets or a re-seeded database), so a number alone must
 * not link a new document to an old conversion:
 *  - when both sides carry a real id, the ids decide (a different id is a different document);
 *  - otherwise a number match is accepted only if the conversion is not older than the document.
 */
export const lineageBelongsToDocument = (
  lineage: SalesDocumentLineage,
  doc: { id?: string | null; no?: string | null; createdAt?: string | null },
  type: SalesDocType,
): boolean => {
  const [idKey, noKey] = LINEAGE_KEYS[type];
  const lineageId = lineage[idKey] as string | undefined;
  const lineageNo = lineage[noKey] as string | undefined;
  if (isRealDocId(lineageId) && isRealDocId(doc.id)) {
    return lineageId!.trim().toLowerCase() === doc.id!.trim().toLowerCase();
  }
  const docNo = (doc.no || '').trim().toLowerCase();
  if (lineageNo && docNo && lineageNo.trim().toLowerCase() === docNo) {
    const converted = Date.parse(lineage.createdAt);
    const created = Date.parse(doc.createdAt || '');
    // A conversion cannot predate the document it converted (one minute of clock slack).
    if (!isNaN(converted) && !isNaN(created) && converted < created - 60000) return false;
    return true;
  }
  return false;
};

/**
 * Finds the lineage record containing any matching document number or ID.
 * Pass `doc` (the document being looked up) to ignore stale records of an older document that merely
 * had the same number.
 */
export const findDocumentLineage = (
  docRef?: string | null,
  docType?: SalesDocType,
  doc?: { id?: string | null; no?: string | null; createdAt?: string | null },
): SalesDocumentLineage | undefined => {
  if (!docRef || !docRef.trim()) return undefined;
  const clean = docRef.trim().toLowerCase();
  const allStored = getStoredLineages();

  const effectiveType = docType || inferDocType(docRef);
  const all =
    doc && effectiveType
      ? allStored.filter((l) => lineageBelongsToDocument(l, { ...doc, no: doc.no ?? docRef }, effectiveType))
      : allStored;

  if (effectiveType === 'Estimate') {
    return all.find(
      (item) =>
        (item.estimateNo && item.estimateNo.toLowerCase() === clean) ||
        (item.estimateId && item.estimateId.toLowerCase() === clean)
    );
  }

  if (effectiveType === 'Proforma') {
    return all.find(
      (item) =>
        (item.proformaNo && item.proformaNo.toLowerCase() === clean) ||
        (item.proformaId && item.proformaId.toLowerCase() === clean)
    );
  }

  if (effectiveType === 'Order') {
    return all.find(
      (item) =>
        (item.orderNo && item.orderNo.toLowerCase() === clean) ||
        (item.orderId && item.orderId.toLowerCase() === clean)
    );
  }

  if (effectiveType === 'Challan') {
    return all.find(
      (item) =>
        (item.challanNo && item.challanNo.toLowerCase() === clean) ||
        (item.challanId && item.challanId.toLowerCase() === clean)
    );
  }

  if (effectiveType === 'Invoice') {
    return all.find(
      (item) =>
        (item.invoiceNo && item.invoiceNo.toLowerCase() === clean) ||
        (item.invoiceId && item.invoiceId.toLowerCase() === clean)
    );
  }

  // Fallback for untyped references (matches either document number or document ID)
  return all.find((item) => {
    return (
      (item.estimateNo && item.estimateNo.toLowerCase() === clean) ||
      (item.estimateId && item.estimateId.toLowerCase() === clean) ||
      (item.proformaNo && item.proformaNo.toLowerCase() === clean) ||
      (item.proformaId && item.proformaId.toLowerCase() === clean) ||
      (item.orderNo && item.orderNo.toLowerCase() === clean) ||
      (item.orderId && item.orderId.toLowerCase() === clean) ||
      (item.challanNo && item.challanNo.toLowerCase() === clean) ||
      (item.challanId && item.challanId.toLowerCase() === clean) ||
      (item.invoiceNo && item.invoiceNo.toLowerCase() === clean) ||
      (item.invoiceId && item.invoiceId.toLowerCase() === clean)
    );
  });
};

/**
 * Records a new conversion link or merges with existing upstream lineage
 */
export const recordDocumentConversion = (params: {
  fromType: SalesDocType;
  fromId?: string;
  fromNo?: string;
  toType: SalesDocType;
  toId?: string;
  toNo?: string;
  partyName?: string;
  customerId?: string;
  customerCode?: string;
  grandTotal?: number;
}): SalesDocumentLineage => {
  const current = getStoredLineages();
  const now = new Date().toISOString();

  const cleanFromNo = params.fromNo?.trim().toLowerCase();
  const cleanFromId = params.fromId?.trim().toLowerCase();
  const cleanToNo = params.toNo?.trim().toLowerCase();
  const cleanToId = params.toId?.trim().toLowerCase();

  const isTypeMatch = (
    item: SalesDocumentLineage,
    type: SalesDocType,
    no?: string,
    id?: string
  ) => {
    // If both the stored record and this conversion carry a real id for this document type, the ids
    // decide: the same number on a different id is a different (older) document.
    const [idKey] = LINEAGE_KEYS[type];
    const storedId = item[idKey] as string | undefined;
    if (isRealDocId(storedId) && isRealDocId(id)) {
      return storedId!.trim().toLowerCase() === id!.trim().toLowerCase();
    }
    if (type === 'Estimate') {
      return Boolean((no && item.estimateNo?.toLowerCase() === no) || (id && item.estimateId?.toLowerCase() === id));
    }
    if (type === 'Proforma') {
      return Boolean((no && item.proformaNo?.toLowerCase() === no) || (id && item.proformaId?.toLowerCase() === id));
    }
    if (type === 'Order') {
      return Boolean((no && item.orderNo?.toLowerCase() === no) || (id && item.orderId?.toLowerCase() === id));
    }
    if (type === 'Challan') {
      return Boolean((no && item.challanNo?.toLowerCase() === no) || (id && item.challanId?.toLowerCase() === id));
    }
    if (type === 'Invoice') {
      return Boolean((no && item.invoiceNo?.toLowerCase() === no) || (id && item.invoiceId?.toLowerCase() === id));
    }
    return false;
  };

  const isMatch = (item: SalesDocumentLineage) => {
    return (
      isTypeMatch(item, params.fromType, cleanFromNo, cleanFromId) ||
      isTypeMatch(item, params.toType, cleanToNo, cleanToId)
    );
  };

  // Find all lineages that match either source or target to stitch disjoint segments
  const matchingIndices: number[] = [];
  current.forEach((item, idx) => {
    if (isMatch(item)) matchingIndices.push(idx);
  });

  let lineage: SalesDocumentLineage;

  if (matchingIndices.length > 0) {
    // Merge all matching records into one unified lineage
    lineage = matchingIndices.reduce<SalesDocumentLineage>(
      (acc, idx) => ({ ...acc, ...current[idx] }),
      { ...current[matchingIndices[0]] }
    );
  } else {
    lineage = {
      id: `lin_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };
  }

  // Update source info
  if (params.fromType === 'Estimate') {
    if (params.fromId) lineage.estimateId = params.fromId;
    if (params.fromNo) lineage.estimateNo = params.fromNo;
  } else if (params.fromType === 'Proforma') {
    if (params.fromId) lineage.proformaId = params.fromId;
    if (params.fromNo) lineage.proformaNo = params.fromNo;
  } else if (params.fromType === 'Order') {
    if (params.fromId) lineage.orderId = params.fromId;
    if (params.fromNo) lineage.orderNo = params.fromNo;
  } else if (params.fromType === 'Challan') {
    if (params.fromId) lineage.challanId = params.fromId;
    if (params.fromNo) lineage.challanNo = params.fromNo;
  } else if (params.fromType === 'Invoice') {
    if (params.fromId) lineage.invoiceId = params.fromId;
    if (params.fromNo) lineage.invoiceNo = params.fromNo;
  }

  // Update target info
  if (params.toType === 'Estimate') {
    if (params.toId) lineage.estimateId = params.toId;
    if (params.toNo) lineage.estimateNo = params.toNo;
  } else if (params.toType === 'Proforma') {
    if (params.toId) lineage.proformaId = params.toId;
    if (params.toNo) lineage.proformaNo = params.toNo;
  } else if (params.toType === 'Order') {
    if (params.toId) lineage.orderId = params.toId;
    if (params.toNo) lineage.orderNo = params.toNo;
  } else if (params.toType === 'Challan') {
    if (params.toId) lineage.challanId = params.toId;
    if (params.toNo) lineage.challanNo = params.toNo;
  } else if (params.toType === 'Invoice') {
    if (params.toId) lineage.invoiceId = params.toId;
    if (params.toNo) lineage.invoiceNo = params.toNo;
  }

  if (params.partyName) lineage.partyName = params.partyName;
  if (params.customerId) lineage.customerId = params.customerId;
  if (params.customerCode) lineage.customerCode = params.customerCode;
  if (params.grandTotal !== undefined) lineage.grandTotal = params.grandTotal;
  lineage.updatedAt = now;

  // Filter out all previous matching instances and insert the unified lineage
  const updatedList = current.filter((_, idx) => !matchingIndices.includes(idx));
  updatedList.unshift(lineage);

  persistLineages(updatedList);
  return lineage;
};

/**
 * Resolves the conversion timestamp for any sales document across all workflows.
 * Guarantees converted time is reflected whether stored in backend API, local record,
 * document lineage, or updated audit status.
 */
export const resolveDocumentConvertedAt = (
  docType: SalesDocType,
  item?: {
    id?: string;
    status?: string;
    createdAt?: string | null;
    updatedAt?: string | null;
    convertedAt?: string | null;
    convertedDate?: string | null;
    converted_at?: string | null;
    convertedToInvoiceNo?: string | null;
    convertedToId?: string | null;
    convertedToType?: string | null;
    referenceNo?: string | null;
    invoiceNo?: string | null;
    orderNo?: string | null;
    challanNo?: string | null;
    proformaNo?: string | null;
    quotationNo?: string | null;
    [key: string]: any;
  } | null
): string | null => {
  if (!item) return null;

  // 1. Direct explicit convertedAt property on the item
  const direct = item.convertedAt || item.convertedDate || item.converted_at;
  if (direct && typeof direct === 'string' && direct.trim() && !isNaN(new Date(direct).getTime())) {
    return direct;
  }

  // 2. Resolve document reference for cross-module lineage lookup
  const docRef =
    (docType === 'Estimate' ? item.quotationNo :
     docType === 'Proforma' ? item.proformaNo :
     docType === 'Order' ? item.orderNo :
     docType === 'Challan' ? item.challanNo :
     item.invoiceNo) ||
    item.referenceNo ||
    item.id;

  const lineage = findDocumentLineage(docRef, docType, {
    id: item.id,
    no: docRef,
    createdAt: item.createdAt,
  });

  // 3. Inspect lineage conversion status per document type
  if (lineage) {
    if (docType === 'Estimate') {
      const hasDownstream = Boolean(
        lineage.proformaNo || lineage.orderNo || lineage.challanNo || lineage.invoiceNo
      );
      if (hasDownstream) {
        return lineage.updatedAt || lineage.createdAt || item.updatedAt || null;
      }
    } else if (docType === 'Proforma') {
      const hasDownstream = Boolean(
        lineage.orderNo || lineage.challanNo || lineage.invoiceNo
      );
      if (hasDownstream) {
        return lineage.updatedAt || lineage.createdAt || item.updatedAt || null;
      }
    } else if (docType === 'Order') {
      const hasDownstream = Boolean(
        lineage.challanNo || lineage.invoiceNo
      );
      if (hasDownstream) {
        return lineage.updatedAt || lineage.createdAt || item.updatedAt || null;
      }
    } else if (docType === 'Challan') {
      const hasDownstream = Boolean(lineage.invoiceNo);
      if (hasDownstream) {
        return lineage.updatedAt || lineage.createdAt || item.updatedAt || null;
      }
    } else if (docType === 'Invoice') {
      const hasUpstream = Boolean(
        lineage.estimateNo || lineage.proformaNo || lineage.orderNo || lineage.challanNo
      );
      if (hasUpstream) {
        return lineage.updatedAt || item.createdAt || lineage.createdAt || null;
      }
    }
  }

  // 4. Check status & converted document indicators on item itself
  const isMarkedConverted =
    item.status === 'Converted' ||
    Boolean(item.convertedToInvoiceNo) ||
    Boolean(item.convertedToId) ||
    (docType === 'Challan' && item.status === 'Delivered' && Boolean(item.convertedToInvoiceNo));

  if (isMarkedConverted) {
    if (item.updatedAt && !isNaN(new Date(item.updatedAt).getTime())) {
      return item.updatedAt;
    }
    if (item.createdAt && !isNaN(new Date(item.createdAt).getTime())) {
      return item.createdAt;
    }
  }

  // 5. For Invoices, check if referenceNo indicates an upstream document
  if (docType === 'Invoice' && item.referenceNo) {
    const ref = item.referenceNo.trim().toUpperCase();
    if (
      ref.startsWith('EST-') ||
      ref.startsWith('QT-') ||
      ref.startsWith('PRO-') ||
      ref.startsWith('PI-') ||
      ref.startsWith('SO-') ||
      ref.startsWith('ORD-') ||
      ref.startsWith('DC-') ||
      ref.startsWith('CHAL-')
    ) {
      return item.createdAt || item.updatedAt || null;
    }
  }

  return null;
};

// =========================================================================
// 2. Module In-Memory Event Dispatchers (API is Single Source of Truth)
// =========================================================================

/**
 * Dispatches event for converted Proforma Invoice without localStorage persistence
 */
export const syncConvertedProformaToStorage = (proforma: any): void => {
  try {
    window.dispatchEvent(new CustomEvent('yaa_crm_proformas_updated', { detail: [proforma] }));
  } catch (err) {
    console.error('Failed to dispatch proforma update:', err);
  }
};

/**
 * Dispatches event for converted Sale Order without localStorage persistence
 */
export const syncConvertedOrderToStorage = (order: any): void => {
  try {
    window.dispatchEvent(new CustomEvent('yaa_crm_orders_updated', { detail: [order] }));
  } catch (err) {
    console.error('Failed to dispatch order update:', err);
  }
};

/**
 * Dispatches event for converted Delivery Challan without localStorage persistence
 */
export const syncConvertedChallanToStorage = (challan: any): void => {
  try {
    window.dispatchEvent(new CustomEvent('yaa_crm_challans_updated', { detail: [challan] }));
  } catch (err) {
    console.error('Failed to dispatch challan update:', err);
  }
};

/**
 * Dispatches event for converted Sales Invoice without localStorage persistence
 */
export const syncConvertedInvoiceToStorage = (invoice: any): void => {
  try {
    window.dispatchEvent(new CustomEvent('yaa_crm_sales_updated', { detail: [invoice] }));
  } catch (err) {
    console.error('Failed to dispatch invoice update:', err);
  }
};

/**
 * Updates quotation status (in-memory notification only)
 */
export const syncQuotationStatusInStorage = (
  quotationIdOrNo: string,
  newStatus: 'Converted' | 'Open' | 'Cancelled',
  convertedTo?: { type?: string; documentNo?: string; id?: string; convertedAt?: string } | string
): void => {
  try {
    const convertedAt = new Date().toISOString();
    window.dispatchEvent(new CustomEvent('yaa_crm_quotations_updated', {
      detail: { idOrNo: quotationIdOrNo, status: newStatus, convertedTo, convertedAt }
    }));
  } catch (err) {
    console.error('Failed to dispatch quotation status update:', err);
  }
};

/**
 * Updates proforma status (in-memory notification only)
 */
export const syncProformaStatusInStorage = (
  proformaIdOrNo: string,
  newStatus: 'Converted' | 'Open' | 'Cancelled',
  convertedTo?: { type?: string; documentNo?: string; id?: string; convertedAt?: string } | string
): void => {
  try {
    const convertedAt = new Date().toISOString();
    window.dispatchEvent(new CustomEvent('yaa_crm_proformas_updated', {
      detail: { idOrNo: proformaIdOrNo, status: newStatus, convertedTo, convertedAt }
    }));
  } catch (err) {
    console.error('Failed to dispatch proforma status update:', err);
  }
};

/**
 * Updates order status (in-memory notification only)
 */
export const syncOrderStatusInStorage = (
  orderIdOrNo: string,
  newStatus: 'Converted' | 'Confirmed' | 'Cancelled',
  convertedTo?: { type?: string; documentNo?: string; id?: string; convertedAt?: string } | string
): void => {
  try {
    const convertedAt = new Date().toISOString();
    window.dispatchEvent(new CustomEvent('yaa_crm_orders_updated', {
      detail: { idOrNo: orderIdOrNo, status: newStatus, convertedTo, convertedAt }
    }));
  } catch (err) {
    console.error('Failed to dispatch order status update:', err);
  }
};

/**
 * Checks if a Delivery Challan record is legacy mock data
 */
export const isMockChallan = (c: any): boolean => {
  if (!c) return false;
  const isMockId = c.id === 'dc_1' || c.id === 'dc_2' || c.id === 'challan_1';
  const isMockPhone = c.customerPhone === '7839396753';
  const isMockCompany = c.customerCompany === 'Keerthi Retailers';
  const isMockVehicle = c.vehicleNo === 'TN-30-AZ-1122';
  const hasMockItem =
    Array.isArray(c.items) &&
    c.items.some(
      (it: any) =>
        it.productId === 'PROD_1001' ||
        (String(it.productName || '').includes('India Gate Super Basmati Rice') &&
          (it.total === 29925 || it.unitPrice === 2850))
    );
  return isMockId || isMockPhone || isMockCompany || isMockVehicle || hasMockItem;
};

/**
 * Legacy workflow bootstrap placeholder.
 * Retained as a safe no-op so callers do not break.
 * All authoritative data now comes strictly from the backend database/API.
 */
export const initializeWorkflowIntegrity = (): void => {
  // Safe no-op: Backend API is the sole source of truth.
};


