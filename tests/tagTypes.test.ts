import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { TAG_TYPES, PLATFORM_TAG_TYPES, ALL_TAG_TYPES } from '../src/store/api/tagTypes';

const SRC = path.resolve(process.cwd(), 'src'); // `npm test` runs from the repo root
const REGISTERED = new Set<string>(ALL_TAG_TYPES);
const LEGACY = ['Quotation', 'Proforma', 'SalesOrder', 'Purchase', 'Report'];

const walk = (dir: string, out: string[] = []): string[] => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(p)) out.push(p);
  }
  return out;
};

/** End of a property value (`providesTags: ...,`) or of call arguments (`invalidateTags(...)`). */
const scanEnd = (s: string, i: number, call: boolean): number => {
  let depth = call ? 1 : 0;
  let j = i;
  const skipString = (q: string) => {
    j++;
    while (j < s.length) {
      const c = s[j];
      if (c === '\\') { j += 2; continue; }
      if (q === '`' && c === '$' && s[j + 1] === '{') {
        let d = 1; j += 2;
        while (j < s.length && d > 0) { if (s[j] === '{') d++; else if (s[j] === '}') d--; j++; }
        continue;
      }
      if (c === q) return;
      j++;
    }
  };
  for (; j < s.length; j++) {
    const c = s[j];
    if (c === '"' || c === "'" || c === '`') { skipString(c); continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') {
      if (depth === 0) return j;
      depth--;
      if (call && depth === 0) return j;
    } else if (c === ',' && depth === 0) return j;
  }
  return j;
};

interface Use { file: string; tag: string }

/** Every tag name used inside providesTags / invalidatesTags / invalidateTags expressions, plus the Sidebar refresh map. */
const collectTagUses = (): Use[] => {
  const uses: Use[] = [];
  for (const file of walk(SRC)) {
    const rel = path.relative(SRC, file).replace(/\\/g, '/');
    if (rel === 'store/api/tagTypes.ts') continue;
    const s = fs.readFileSync(file, 'utf8');
    const grab = (expr: string) => {
      // Tag names are PascalCase ('Product'); ids such as 'LIST' / 'INVOICES_LIST' are upper-case and are skipped.
      for (const m of expr.matchAll(/(["'])([A-Z][a-z][A-Za-z]*)\1/g)) uses.push({ file: rel, tag: m[2] });
    };
    const re = /(providesTags|invalidatesTags)\s*:\s*|invalidateTags\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s))) {
      const call = m[0].endsWith('(');
      const start = m.index + m[0].length;
      const end = scanEnd(s, start, call);
      grab(s.slice(start, end));
      re.lastIndex = end;
    }
    if (rel === 'components/layout/Sidebar.tsx') {
      const a = s.indexOf('const tagMap');
      const b = s.indexOf('};', a);
      if (a > 0 && b > a) grab(s.slice(a, b));
    }
  }
  return uses;
};

describe('canonical RTK Query tags', () => {
  const uses = collectTagUses();

  it('finds the tag expressions (sanity check that the scan works)', () => {
    assert.ok(uses.length > 400, `only ${uses.length} tag uses found`);
  });

  it('every tag used by a slice, a view or the sidebar is registered', () => {
    const unknown = uses.filter((u) => !REGISTERED.has(u.tag));
    assert.deepEqual(unknown, []);
  });

  it('the old duplicate names are gone (Quotation, Proforma, SalesOrder, Purchase, Report)', () => {
    const legacy = uses.filter((u) => LEGACY.includes(u.tag));
    assert.deepEqual(legacy, []);
  });

  it('the legacy names are not registered either', () => {
    for (const t of LEGACY) assert.equal(REGISTERED.has(t), false, t);
  });

  it('tag names are unique PascalCase, with no overlap between Sale Management and platform lists', () => {
    assert.equal(new Set(ALL_TAG_TYPES).size, ALL_TAG_TYPES.length);
    for (const t of ALL_TAG_TYPES) assert.match(t, /^[A-Z][a-z][A-Za-z]*$/, t);
    const overlap = TAG_TYPES.filter((t) => (PLATFORM_TAG_TYPES as readonly string[]).includes(t));
    assert.deepEqual(overlap, []);
  });

  it('contains every canonical tag required for Inventory, Purchase, Sales Hub and cross-cutting data', () => {
    const required = [
      'Product', 'Category', 'Subcategory', 'Stock', 'Batch', 'Supplier', 'PurchaseRequest', 'PurchaseOrder', 'PurchaseBill',
      'PurchaseReturn', 'PaymentOut', 'Expense', 'Customer', 'SalesRepresentative', 'Estimation', 'ProformaInvoice', 'SaleOrder',
      'DeliveryChallan', 'SalesInvoice', 'PaymentIn', 'SalesReturn', 'Notification', 'Dashboard', 'SalesReport', 'SupplierLedger',
      'CustomerLedger',
    ];
    for (const t of required) assert.ok((TAG_TYPES as readonly string[]).includes(t), t);
  });

  it('Client Management / CRM entities no longer share a tag with Sale Management entities', () => {
    const platformFiles = ['api/platform/quoteApi.ts', 'api/platform/proformaInvoiceApi.ts', 'api/platform/invoiceApi.ts', 'api/crm/crmApi.ts'];
    const sharedWithSales = ['Estimation', 'ProformaInvoice', 'SalesInvoice', 'Customer', 'Product', 'Dashboard', 'SalesReport', 'SaleOrder'];
    const leaked = uses.filter((u) => platformFiles.includes(u.file) && sharedWithSales.includes(u.tag));
    assert.deepEqual(leaked, []);
  });

  it('the batches endpoint and batch invalidations use the Batch tag, not a Stock sub-id', () => {
    const stock = fs.readFileSync(path.join(SRC, 'api/commerce/stockApi.ts'), 'utf8');
    assert.ok(/\{ type: 'Batch', id: 'LIST' \}/.test(stock));
    assert.ok(!/id: 'BATCHES'/.test(stock));
  });
});
