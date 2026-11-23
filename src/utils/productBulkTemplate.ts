/**
 * Builds and downloads the sample Excel (.xlsx) workbook for POST /commerce/products/bulk-upload.
 * The columns follow the agreed sample file (product_inventory_without_product_code_and_opening_stock.xlsx):
 * no productCode (the server generates it) and no openingStock.
 * exceljs is loaded only when the button is pressed, so it does not add to the page's first load.
 */

export const PRODUCT_BULK_COLUMNS: { key: string; width: number }[] = [
  { key: 'productName', width: 36 },
  { key: 'unit', width: 12 },
  { key: 'baseUnitId', width: 38 },
  { key: 'secondaryUnitId', width: 38 },
  { key: 'category', width: 18 },
  { key: 'subcategory', width: 20 },
  { key: 'itemImage', width: 30 },
  { key: 'salePrice', width: 12 },
  { key: 'salePriceTaxType', width: 18 },
  { key: 'discountValue', width: 14 },
  { key: 'discountType', width: 14 },
  { key: 'hasWholesale', width: 14 },
  { key: 'wholesalePrice', width: 15 },
  { key: 'wholesaleTaxType', width: 18 },
  { key: 'minWholesaleQty', width: 16 },
  { key: 'purchasePrice', width: 14 },
  { key: 'purchasePriceTaxType', width: 20 },
  { key: 'taxRate', width: 14 },
  { key: 'atPrice', width: 10 },
  { key: 'asOfDate', width: 14 },
  { key: 'minStockAlert', width: 15 },
  { key: 'location', width: 22 },
  { key: 'status', width: 10 },
  { key: 'isBatchTracking', width: 16 },
  { key: 'batchNo', width: 16 },
  { key: 'mfgDate', width: 14 },
  { key: 'expDate', width: 14 },
];

// Two example rows. baseUnitId is left empty: it is an id that belongs to each organization, and the unit name is enough.
const SAMPLE_ROWS: Record<string, string | number | boolean>[] = [
  {
    productName: 'Sample Product A (10 Kg)', unit: 'BAG', category: 'Grains & Flours', subcategory: 'Flours',
    salePrice: 495, salePriceTaxType: 'Included', discountValue: 5, discountType: 'Percentage', hasWholesale: 'Yes', wholesalePrice: 440,
    wholesaleTaxType: 'Excluded', minWholesaleQty: 20, purchasePrice: 420, purchasePriceTaxType: 'Excluded', taxRate: 'GST @ 5%', atPrice: 420,
    asOfDate: '2026-10-01', minStockAlert: 15, location: 'Warehouse A - Bay 3', status: 'Active', isBatchTracking: 'Yes', batchNo: 'BAT-0001',
    mfgDate: '2026-08-15', expDate: '2027-02-15',
  },
  {
    productName: 'Sample Product B (1 Kg)', unit: 'PACK', category: 'Pulses & Lentils', subcategory: 'Pulses',
    salePrice: 165, salePriceTaxType: 'Included', discountValue: 0, discountType: 'Percentage', hasWholesale: 'No',
    purchasePrice: 138, purchasePriceTaxType: 'Excluded', taxRate: 'GST @ 0%', atPrice: 138, asOfDate: '2026-10-01', minStockAlert: 25,
    location: 'Warehouse B - Shelf 2', status: 'Active', isBatchTracking: 'No',
  },
];

const TAX_RATE_LIST = ['None', 'Exempted', 'GST @ 0%', 'GST @ 0.25%', 'GST @ 3%', 'GST @ 5%', 'GST @ 18%', 'GST @ 40%'];
const LAST_VALIDATED_ROW = 1000;

const uniqueClean = (list: Array<string | undefined | null>): string[] =>
  Array.from(new Set(list.map((v) => String(v ?? '').trim()).filter(Boolean)));

/** Category / subcategory / unit names from the API, the same lists the Add Item form uses. A failed call gives an empty list. */
async function loadDropdownLists(): Promise<{ units: string[]; categories: string[]; subcategories: string[] }> {
  const [{ categoryApi }, { subcategoryApi }, { unitApi }] = await Promise.all([
    import('../api/commerce/categoryApi'),
    import('../api/commerce/subcategoryApi'),
    import('../api/commerce/unitApi'),
  ]);
  const [cats, subs, units] = await Promise.allSettled([
    categoryApi.getCategories({ pagination_required: false, status: 'Active' }),
    subcategoryApi.getSubcategories({ pagination_required: false, status: 'Active' }),
    unitApi.getUnits({ sortOrder: 'asc' }),
  ]);
  const rows = (r: PromiseSettledResult<any>): any[] => {
    if (r.status !== 'fulfilled') return [];
    const v = r.value;
    return Array.isArray(v?.data) ? v.data : Array.isArray(v) ? v : Array.isArray(v?.data?.data) ? v.data.data : [];
  };
  return {
    categories: uniqueClean(rows(cats).filter((c) => String(c.status || 'Active').toLowerCase() !== 'inactive').map((c) => c.name || c.categoryName || c.category)),
    subcategories: uniqueClean(rows(subs).filter((s) => String(s.status || 'Active').toLowerCase() !== 'inactive').map((s) => s.subcategory || s.name)),
    units: uniqueClean(rows(units).map((u) => u.shortCode || u.name)),
  };
}

export async function downloadProductBulkTemplate(): Promise<void> {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();

  const ws = wb.addWorksheet('Products');
  ws.columns = PRODUCT_BULK_COLUMNS.map((c) => ({ header: c.key, key: c.key, width: c.width }));
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF33077C' } };
  SAMPLE_ROWS.forEach((r) => ws.addRow(r));
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  // Dropdown lists: a hidden "Lists" sheet holds the values, and each column points at its list.
  const api = await loadDropdownLists().catch(() => ({ units: [], categories: [], subcategories: [] }));
  const lists: Record<string, string[]> = {
    unit: api.units,
    category: api.categories,
    subcategory: api.subcategories,
    taxType: ['Included', 'Excluded'],
    discountType: ['Percentage', 'Amount'],
    yesNo: ['Yes', 'No'],
    taxRate: TAX_RATE_LIST,
    status: ['Active', 'Inactive'],
  };
  const columnList: Record<string, keyof typeof lists> = {
    unit: 'unit',
    category: 'category',
    subcategory: 'subcategory',
    salePriceTaxType: 'taxType',
    wholesaleTaxType: 'taxType',
    purchasePriceTaxType: 'taxType',
    discountType: 'discountType',
    hasWholesale: 'yesNo',
    isBatchTracking: 'yesNo',
    taxRate: 'taxRate',
    status: 'status',
  };

  const listSheet = wb.addWorksheet('Lists', { state: 'hidden' });
  const listRange: Record<string, string> = {};
  Object.keys(lists).forEach((name, i) => {
    const values = lists[name];
    const col = i + 1;
    listSheet.getCell(1, col).value = name;
    values.forEach((v, r) => { listSheet.getCell(r + 2, col).value = v; });
    if (values.length > 0) {
      const letter = listSheet.getColumn(col).letter;
      listRange[name] = `Lists!$${letter}$2:$${letter}$${values.length + 1}`;
    }
  });

  PRODUCT_BULK_COLUMNS.forEach((c, i) => {
    const listName = columnList[c.key];
    const range = listName ? listRange[listName] : undefined;
    if (!range) return; // no values (API list failed): leave the column free-text
    for (let r = 2; r <= LAST_VALIDATED_ROW; r++) {
      ws.getCell(r, i + 1).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [range],
        showErrorMessage: true,
        errorStyle: 'warning',
        errorTitle: 'Value not in list',
        error: `Please pick a value from the dropdown for ${c.key}.`,
      };
    }
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'product_bulk_upload_template.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
