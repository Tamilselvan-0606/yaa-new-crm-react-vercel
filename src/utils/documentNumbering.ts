import { baseClient } from '../api/baseApi';

/**
 * Universal extractor for document numbers across varied backend response envelopes.
 * Handles string responses, nested data objects, and document-specific keys.
 */
export const extractDocumentNumber = (
  resData: any,
  customKeys: string[] = []
): string => {
  if (!resData) return '';
  if (typeof resData === 'string' && resData.trim()) return resData.trim();

  // If response is wrapped in standard API envelope: { success, statusCode, data: ... }
  const d =
    resData && typeof resData === 'object' && 'data' in resData
      ? resData.data
      : resData;

  if (typeof d === 'string' && d.trim()) return d.trim();

  const priorityKeys = [
    'nextNumber',
    'next_number',
    'number',
    ...customKeys,
    'quotationNo',
    'nextQuotationNo',
    'estimateNo',
    'nextEstimateNo',
    'requestNo',
    'nextRequestNo',
    'poNo',
    'nextPoNo',
    'returnNo',
    'nextReturnNo',
    'proformaNo',
    'nextProformaNo',
    'orderNo',
    'nextOrderNo',
    'challanNo',
    'nextChallanNo',
    'invoiceNo',
    'nextInvoiceNo',
  ];

  if (d && typeof d === 'object') {
    for (const key of priorityKeys) {
      const val = d[key];
      if (typeof val === 'string' && val.trim()) {
        return val.trim();
      }
    }
  }

  if (resData && typeof resData === 'object') {
    for (const key of priorityKeys) {
      const val = resData[key];
      if (typeof val === 'string' && val.trim()) {
        return val.trim();
      }
    }
  }

  return '';
};

/**
 * Calculates the next sequential document number based on existing records and a target prefix.
 * e.g., for Proforma ('PI-'): PI-001, PI-002 -> PI-003
 * for Sale Order ('SO-'): SO-001, SO-002 -> SO-003
 * for Delivery Challan ('DC-'): DC-001, DC-002 -> DC-003
 * for Sales Invoice ('INV-'): INV-001, INV-002 -> INV-003
 * for Purchase Request ('PR-'): PR-001, PR-002 -> PR-003
 * for Purchase Order / Bill ('PO-'): PO-00001, PO-00002 -> PO-00003
 * for Purchase Return ('PRT-'): PRT-00001, PRT-00002 -> PRT-00003
 */
export const getNextSequentialDocNumber = (
  items: Array<any>,
  defaultPrefix: string,
  fieldKeys: string[] = [],
  defaultDigits: number = 3
): string => {
  const candidateKeys = [
    ...fieldKeys,
    'proformaNo',
    'orderNo',
    'challanNo',
    'invoiceNo',
    'requestNo',
    'poNo',
    'purchaseNo',
    'returnNo',
    'quotationNo',
    'receiptNo',
    'paymentNo',
    'referenceNo',
    'number',
  ];

  const numbers: string[] = [];
  for (const item of items) {
    if (!item) continue;
    if (typeof item === 'string') {
      numbers.push(item);
    } else if (typeof item === 'object') {
      for (const k of candidateKeys) {
        if (typeof item[k] === 'string' && item[k].trim()) {
          numbers.push(item[k].trim());
          break;
        }
      }
    }
  }

  let maxNum = 0;
  let detectedPrefix = defaultPrefix;
  let detectedDigits = defaultDigits;

  for (const raw of numbers) {
    const rawNo = raw.trim();
    if (!rawNo) continue;

    const match = rawNo.match(/^(.*?)(\d+)$/);
    if (match) {
      const prefix = match[1];
      const digitsStr = match[2];
      const num = parseInt(digitsStr, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
        detectedPrefix = prefix;
        detectedDigits = Math.max(digitsStr.length, defaultDigits);
      }
    } else {
      const parts = rawNo.split('-');
      const lastPart = parts[parts.length - 1];
      const num = Number(lastPart);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
        detectedDigits = Math.max(lastPart.length, defaultDigits);
        detectedPrefix = parts.slice(0, -1).join('-') + '-';
      }
    }
  }

  const nextNum = maxNum + 1;
  const formattedDigits = String(nextNum).padStart(detectedDigits, '0');
  return `${detectedPrefix}${formattedDigits}`;
};

/**
 * Calculates the next sequential estimation number based on existing quotation/estimation records.
 * Follows the pattern established by the user (e.g. EST-001, EST-002 -> EST-003).
 */
export const getNextEstimationNumber = (
  estimations: Array<{ quotationNo?: string; referenceNo?: string } | string | null | undefined>
): string => {
  return getNextSequentialDocNumber(estimations, 'EST-', ['quotationNo', 'referenceNo'], 3);
};

export const getNextProformaNumber = (
  items: Array<{ proformaNo?: string; referenceNo?: string } | string | null | undefined>
): string => {
  return getNextSequentialDocNumber(items, 'PI-', ['proformaNo', 'referenceNo'], 3);
};

export const getNextSaleOrderNumber = (
  items: Array<{ orderNo?: string; referenceNo?: string } | string | null | undefined>
): string => {
  return getNextSequentialDocNumber(items, 'SO-', ['orderNo', 'referenceNo'], 3);
};

export const getNextDeliveryChallanNumber = (
  items: Array<{ challanNo?: string; referenceNo?: string } | string | null | undefined>
): string => {
  return getNextSequentialDocNumber(items, 'DC-', ['challanNo', 'referenceNo'], 3);
};

export const getNextSalesInvoiceNumber = (
  items: Array<{ invoiceNo?: string; referenceNo?: string } | string | null | undefined>
): string => {
  return getNextSequentialDocNumber(items, 'INV-', ['invoiceNo', 'referenceNo'], 3);
};

export const getNextPurchaseRequestNumber = (
  items: Array<{ requestNo?: string; referenceNo?: string } | string | null | undefined>
): string => {
  return getNextSequentialDocNumber(items, 'PR-', ['requestNo', 'referenceNo'], 3);
};

export const getNextPurchaseOrderNumber = (
  items: Array<{ poNo?: string; purchaseNo?: string; referenceNo?: string } | string | null | undefined>
): string => {
  return getNextSequentialDocNumber(items, 'PO-', ['poNo', 'purchaseNo', 'referenceNo'], 5);
};

export const getNextPurchaseBillNumber = (
  items: Array<{ purchaseNo?: string; poNo?: string; referenceNo?: string } | string | null | undefined>
): string => {
  return getNextSequentialDocNumber(items, 'PO-', ['purchaseNo', 'poNo', 'referenceNo'], 5);
};

export const getNextPurchaseReturnNumber = (
  items: Array<{ returnNo?: string; referenceNo?: string } | string | null | undefined>
): string => {
  return getNextSequentialDocNumber(items, 'PRT-', ['returnNo', 'referenceNo'], 5);
};

export const getNextPaymentInNumber = (
  items: Array<{ receiptNo?: string; referenceNo?: string } | string | null | undefined>
): string => {
  return getNextSequentialDocNumber(items, 'REC-', ['receiptNo', 'referenceNo'], 3);
};

export const getNextPaymentOutNumber = (
  items: Array<{ paymentNo?: string; referenceNo?: string } | string | null | undefined>
): string => {
  return getNextSequentialDocNumber(items, 'PAY-', ['paymentNo', 'referenceNo'], 3);
};

export const getNextSalesReturnNumber = (
  items: Array<{ returnNo?: string; referenceNo?: string } | string | null | undefined>
): string => {
  return getNextSequentialDocNumber(items, 'RET-', ['returnNo', 'referenceNo'], 3);
};

export interface FetchNextNumberOptions {
  /** Array of endpoints to try in order */
  endpoints: string[];
  /** Document-specific keys to inspect in the response */
  customKeys?: string[];
  /** Fallback prefix for sequence prediction (e.g. 'EST-', 'PR-', 'PO-') */
  prefix: string;
  /** Optional async fetcher to retrieve existing numbers from list API if next-number endpoint is unreachable */
  listFetcher?: () => Promise<(string | null | undefined)[]>;
  /** Default fallback if no existing records exist */
  defaultFallback?: string;
  defaultDigits?: number;
}

/**
 * Orchestrates fetching the preview document number.
 * 1. Queries backend GET .../next-number endpoints.
 * 2. Unpacks response using extractDocumentNumber.
 * 3. If unavailable (404/500/offline), falls back to predicting next number from existing documents.
 * 4. As a last resort, returns a valid default (e.g. EST-001 or EST-2026-0001).
 */
export const fetchNextNumberWithFallback = async ({
  endpoints,
  customKeys = [],
  prefix,
  listFetcher,
  defaultFallback,
  defaultDigits = 3,
}: FetchNextNumberOptions): Promise<string> => {
  // 1. Try each preview endpoint
  for (const url of endpoints) {
    try {
      const response = await baseClient.get<any>(url);
      const extracted = extractDocumentNumber(response.data, customKeys);
      if (extracted) return extracted;
    } catch {
      // Continue to next endpoint or fallback
    }
  }

  // 2. Fallback to predicting from existing documents
  if (listFetcher) {
    try {
      const existing = await listFetcher();
      if (Array.isArray(existing) && existing.length > 0) {
        return getNextSequentialDocNumber(existing, prefix, customKeys, defaultDigits);
      }
    } catch {
      // Continue to default fallback
    }
  }

  // 3. Default fallback
  return defaultFallback || `${prefix}${String(1).padStart(defaultDigits, '0')}`;
};
