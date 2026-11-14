import { toast } from './toast';

/** One page of a list API, already mapped to the shape the module's table uses. */
export interface ReportPage<T> {
  items: T[];
  /** From `response.pagination` when the API sends it. */
  totalRecords?: number;
  totalPages?: number;
  hasNextPage?: boolean;
}

/** Page size used when the Excel / Print buttons pull the full list from the API. */
export const REPORT_PAGE_SIZE = 100;
/** Safety stop so a bad pagination response can never loop forever (100 x 200 = 20,000 rows). */
const REPORT_MAX_PAGES = 200;

/**
 * Fetches EVERY page of a list API (with whatever filters the module's `fetchPage` applies) and returns
 * all rows. Used by the header "Excel Report" / "Print Report" buttons so the report comes from the API,
 * not from the single page that is currently on screen.
 *
 * `fetchPage(page, pageSize)` must call the module's list endpoint with the screen's applied filters
 * and return the mapped rows plus the response's `pagination` values.
 */
export const fetchAllReportRows = async <T>(
  fetchPage: (page: number, pageSize: number) => Promise<ReportPage<T>>,
  pageSize: number = REPORT_PAGE_SIZE,
): Promise<T[]> => {
  const all: T[] = [];
  for (let page = 1; page <= REPORT_MAX_PAGES; page += 1) {
    const res = await fetchPage(page, pageSize);
    const items = Array.isArray(res.items) ? res.items : [];
    all.push(...items);

    if (items.length === 0) break;
    if (typeof res.hasNextPage === 'boolean') {
      if (!res.hasNextPage) break;
    } else if (typeof res.totalPages === 'number') {
      if (page >= res.totalPages) break;
    } else if (typeof res.totalRecords === 'number') {
      if (all.length >= res.totalRecords) break;
    } else if (items.length < pageSize) {
      break;
    }
  }
  return all;
};

/**
 * Wraps a report button: shows a "preparing" toast, loads the rows from the API, then hands them to
 * `onRows` (which builds the Excel file / print view). Nothing is generated if the API fails or returns no rows.
 *
 * Example:
 *   const handleExportExcel = () => runReport({
 *     label: 'sale orders',
 *     load: () => fetchAllReportRows(fetchOrdersPage),
 *     onRows: (rows) => exportTableToExcel({ ... data: rows.map(...) }),
 *   });
 */
export const runReport = async <T>(opts: {
  /** Plural record name for messages, e.g. "sale orders". */
  label: string;
  load: () => Promise<T[]>;
  onRows: (rows: T[]) => void;
}): Promise<void> => {
  const { label, load, onRows } = opts;
  try {
    toast.info(`Preparing ${label} report…`);
    const rows = await load();
    if (rows.length === 0) {
      toast.info(`No ${label} to include in the report.`);
      return;
    }
    onRows(rows);
  } catch (err) {
    console.warn(`Report for ${label} failed:`, err);
    toast.error(`Could not load ${label} from the server. Please try again.`);
  }
};
