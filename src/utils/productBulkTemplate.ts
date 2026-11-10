/**
 * Builds and downloads the sample Excel (.xlsx) workbook for POST /commerce/products/bulk-upload.
 * The columns follow the agreed sample file (product_inventory_without_product_code_and_opening_stock.xlsx):
 * no productCode (the server generates it) and no openingStock.
 * exceljs is loaded only when the button is pressed, so it does not add to the page's first load.
 */

export const PRODUCT_BULK_COLUMNS: { key: string; width: number }[] = [
  { key: 'itemType', width: 12 },
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
    itemType: 'Product', productName: 'Sample Product A (10 Kg)', unit: 'BAG', category: 'Grains & Flours', subcategory: 'Flours',
    salePrice: 495, salePriceTaxType: 'Included', discountValue: 5, discountType: 'Percentage', hasWholesale: true, wholesalePrice: 440,
    wholesaleTaxType: 'Excluded', minWholesaleQty: 20, purchasePrice: 420, purchasePriceTaxType: 'Excluded', taxRate: 'GST @ 5%', atPrice: 420,
    asOfDate: '2026-10-01', minStockAlert: 15, location: 'Warehouse A - Bay 3', status: 'Active', isBatchTracking: true, batchNo: 'BAT-0001',
    mfgDate: '2026-08-15', expDate: '2027-02-15',
  },
  {
    itemType: 'Product', productName: 'Sample Product B (1 Kg)', unit: 'PACK', category: 'Pulses & Lentils', subcategory: 'Pulses',
    salePrice: 165, salePriceTaxType: 'Included', discountValue: 0, discountType: 'Percentage', hasWholesale: false,
    purchasePrice: 138, purchasePriceTaxType: 'Excluded', taxRate: 'GST @ 0%', atPrice: 138, asOfDate: '2026-10-01', minStockAlert: 25,
    location: 'Warehouse B - Shelf 2', status: 'Active', isBatchTracking: false,
  },
];

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
