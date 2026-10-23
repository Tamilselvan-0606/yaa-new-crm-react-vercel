/**
 * Universal Printing Utility for YAA CRM
 * Provides dedicated printing functions for Tables, Ledgers, Reports, and Document Receipts.
 */

export interface PrintColumn {
  header: string;
  key: string;
  align?: 'left' | 'center' | 'right';
  type?: 'string' | 'number' | 'currency' | 'date';
  width?: string;
}

export interface PrintMetric {
  label: string;
  value: string | number;
}

export interface PrintTableOptions {
  title: string;
  subtitle?: string;
  companyName?: string;
  companyDetails?: string;
  columns: PrintColumn[];
  data: Record<string, any>[];
  summaryRow?: Record<string, any>;
  metrics?: PrintMetric[];
  orientation?: 'portrait' | 'landscape';
  footerNote?: string;
}

/**
 * Generates and prints a clean, beautifully styled tabular report in an isolated print window.
 */
export function printTableReport({
  title,
  subtitle,
  companyName = 'Yaa Creations Inc.',
  companyDetails = 'Enterprise CRM & Sales Management Division | support@yaacreations.com',
  columns,
  data,
  summaryRow,
  metrics,
  orientation = 'landscape',
  footerNote = 'Confidential & Proprietary • Generated automatically by YAA CRM',
}: PrintTableOptions): void {
  const printWindow = window.open('', '_blank', 'width=1100,height=850');
  if (!printWindow) {
    alert('Please allow popups in your browser to print reports.');
    return;
  }

  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const currentTime = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  let metricsHtml = '';
  if (metrics && metrics.length > 0) {
    metricsHtml = `
      <div class="metrics-grid">
        ${metrics
          .map(
            (m) => `
          <div class="metric-card">
            <div class="metric-label">${m.label}</div>
            <div class="metric-val">${typeof m.value === 'number' ? `₹${m.value.toLocaleString('en-IN')}` : m.value}</div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  // Header row
  let headerHtml = '<thead><tr>';
  columns.forEach((col) => {
    const alignStyle = col.align === 'center' ? 'text-align:center;' : col.align === 'right' ? 'text-align:right;' : 'text-align:left;';
    const widthStyle = col.width ? `width:${col.width};` : '';
    headerHtml += `<th style="${alignStyle} ${widthStyle}">${col.header}</th>`;
  });
  headerHtml += '</tr></thead>';

  // Data rows
  let rowsHtml = '<tbody>';
  data.forEach((row, idx) => {
    rowsHtml += '<tr>';
    columns.forEach((col) => {
      let val = row[col.key];
      if (val === undefined || val === null) val = '-';
      const alignStyle = col.align === 'center' ? 'text-align:center;' : col.align === 'right' ? 'text-align:right;' : 'text-align:left;';

      if (col.type === 'currency' && typeof val === 'number') {
        rowsHtml += `<td style="${alignStyle}">₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>`;
      } else {
        rowsHtml += `<td style="${alignStyle}">${String(val)}</td>`;
      }
    });
    rowsHtml += '</tr>';
  });

  // Summary row
  if (summaryRow) {
    rowsHtml += '<tr class="summary-row">';
    columns.forEach((col, idx) => {
      const alignStyle = col.align === 'center' ? 'text-align:center;' : col.align === 'right' ? 'text-align:right;' : 'text-align:left;';
      let val = summaryRow[col.key];
      if (val === undefined || val === null) {
        val = idx === 0 ? 'TOTAL' : '';
      }
      if (col.type === 'currency' && typeof val === 'number') {
        rowsHtml += `<td style="${alignStyle}">₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>`;
      } else {
        rowsHtml += `<td style="${alignStyle}">${String(val)}</td>`;
      }
    });
    rowsHtml += '</tr>';
  }
  rowsHtml += '</tbody>';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: ${orientation};
            margin: 12mm 10mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #1e293b;
            background: #ffffff;
            font-size: 11px;
            line-height: 1.4;
            padding: 16px 20px;
          }
          .header-banner {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2.5px solid #33077C;
            padding-bottom: 12px;
            margin-bottom: 14px;
          }
          .brand-title {
            font-size: 18px;
            font-weight: 900;
            color: #33077C;
            letter-spacing: -0.3px;
          }
          .brand-sub {
            font-size: 10px;
            color: #64748b;
            margin-top: 2px;
          }
          .doc-info {
            text-align: right;
          }
          .doc-name {
            font-size: 16px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .doc-meta {
            font-size: 10px;
            color: #64748b;
            margin-top: 2px;
          }
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
            gap: 10px;
            margin-bottom: 14px;
          }
          .metric-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 8px 12px;
          }
          .metric-label {
            font-size: 9px;
            text-transform: uppercase;
            font-weight: 700;
            color: #64748b;
            letter-spacing: 0.5px;
          }
          .metric-val {
            font-size: 13px;
            font-weight: 800;
            color: #33077C;
            margin-top: 2px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10.5px;
            margin-bottom: 16px;
          }
          th {
            background-color: #33077C !important;
            color: #ffffff !important;
            font-weight: 700;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 8px 10px;
            border: 1px solid #33077C;
          }
          td {
            padding: 6.5px 10px;
            border: 1px solid #e2e8f0;
            color: #334155;
          }
          tr:nth-child(even) td {
            background-color: #f8fafc;
          }
          .summary-row td {
            background-color: #ede9fe !important;
            color: #33077C !important;
            font-weight: 800 !important;
            font-size: 11px;
            border-top: 2px solid #33077C;
          }
          .footer-section {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 9.5px;
            color: #94a3b8;
          }
          .signature-box {
            margin-top: 24px;
            display: flex;
            justify-content: flex-end;
          }
          .signature-line {
            width: 180px;
            border-top: 1px solid #0f172a;
            text-align: center;
            padding-top: 4px;
            font-size: 10px;
            font-weight: 700;
            color: #334155;
          }
        </style>
      </head>
      <body>
        <div class="header-banner">
          <div>
            <div class="brand-title">${companyName}</div>
            <div class="brand-sub">${companyDetails}</div>
          </div>
          <div class="doc-info">
            <div class="doc-name">${title}</div>
            ${subtitle ? `<div class="doc-meta">${subtitle}</div>` : ''}
            <div class="doc-meta">Printed on: <strong>${currentDate} at ${currentTime}</strong></div>
          </div>
        </div>

        ${metricsHtml}

        <table>
          ${headerHtml}
          ${rowsHtml}
        </table>

        <div class="signature-box">
          <div class="signature-line">Authorized Signatory</div>
        </div>

        <div class="footer-section">
          <div>${footerNote}</div>
          <div>Page 1 of 1</div>
        </div>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 350);
}

/**
 * Universal helper to print an existing DOM element by its ID or custom raw HTML document
 */
export function printHtmlElement(elementId: string, title?: string): void {
  const elem = document.getElementById(elementId);
  if (!elem) {
    window.print();
    return;
  }

  const printWindow = window.open('', '_blank', 'width=850,height=900');
  if (!printWindow) {
    window.print();
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title || 'Print Receipt / Document'}</title>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 24px; color: #0f172a; background: #fff; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #33077C; color: #fff; padding: 8px 10px; font-weight: 700; text-align: left; }
          td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        ${elem.innerHTML}
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 350);
}

/**
 * Converts a numeric amount to Indian Rupee Words (e.g. 25000 -> "Twenty Five Thousand Rupees Only")
 */
export function numberToWordsIndian(num: number): string {
  if (!num || isNaN(num)) return 'Zero Rupees Only';
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n: number): string {
    if (n < 20) return a[n];
    const digit = n % 10;
    return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : '');
  }

  const rounded = Math.floor(Math.abs(num));
  if (rounded === 0) return 'Zero Rupees Only';

  let str = '';
  const crore = Math.floor(rounded / 10000000);
  let rem = rounded % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;
  const thousand = Math.floor(rem / 1000);
  rem = rem % 1000;
  const hundred = Math.floor(rem / 100);
  const tens = rem % 100;

  if (crore > 0) str += inWords(crore) + ' Crore ';
  if (lakh > 0) str += inWords(lakh) + ' Lakh ';
  if (thousand > 0) str += inWords(thousand) + ' Thousand ';
  if (hundred > 0) str += inWords(hundred) + ' Hundred ';
  if (tens > 0) str += inWords(tens) + ' ';

  return str.trim() + ' Rupees Only';
}

export interface DocumentItemRow {
  name: string;
  sku?: string;
  batch?: string;
  unit?: string;
  quantity?: number | string;
  unitPrice?: number;
  discountPercent?: number;
  taxPercent?: number;
  total?: number;
  remarks?: string;
  extraCols?: Record<string, string | number>;
}

export interface DocumentTaxSummary {
  withGst?: boolean;
  gstType?: 'intra_state' | 'inter_state';
  taxAmount?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
}

export interface DocumentPrintOptions {
  docTypeTitle: string; // e.g. "TAX INVOICE", "ESTIMATE / QUOTATION", "PROFORMA INVOICE", "SALE ORDER", "DELIVERY CHALLAN", "CREDIT NOTE / SALES RETURN", "PURCHASE REQUISITION", "PURCHASE ORDER / BILL", "DEBIT NOTE / PURCHASE RETURN", "PAYMENT-OUT VOUCHER", "EXPENSE VOUCHER"
  docNo: string;
  docDate: string;
  dueDate?: string;
  status?: string;
  statusColor?: 'emerald' | 'amber' | 'purple' | 'blue' | 'rose' | 'slate';
  referenceNo?: string;

  // Company Details
  companyName?: string;
  companySubtitle?: string;
  companyAddress?: string;
  companyGstin?: string;
  companyPhone?: string;
  companyEmail?: string;

  // Party Details
  partyTitle?: string; // "Billed To" or "Supplier / Vendor" or "Paid To" or "Payee"
  partyName: string;
  partyCompany?: string;
  partyPhone?: string;
  partyEmail?: string;
  partyAddress?: string;
  partyGstin?: string;

  // Additional metadata items
  extraMeta?: { label: string; value: string }[];

  // Custom table column definition (optional, defaults to standard product items)
  columns?: { header: string; align?: 'left' | 'center' | 'right'; width?: string }[];
  items?: DocumentItemRow[];

  // Totals Breakdown
  subtotal?: number;
  discount?: number;
  tax?: DocumentTaxSummary;
  shipping?: number;
  otherCharges?: number;
  roundOff?: number;
  grandTotal: number;
  paidAmount?: number;
  balance?: number;
  paidAmountLabel?: string;
  balanceLabel?: string;

  // Additional sections
  amountInWords?: string;
  notes?: string;
  terms?: string;
  primarySignatoryLabel?: string;
  secondarySignatoryLabel?: string;
  watermarkText?: string;
}

/**
 * Standardized Business Document Printer
 * Generates an isolated, print-perfect document view that avoids all application web chrome.
 */
export function printBusinessDocument(options: DocumentPrintOptions): void {
  const printWindow = window.open('', '_blank', 'width=850,height=900');
  if (!printWindow) {
    alert('Please allow popups in your browser to view the printable document.');
    return;
  }

  const {
    docTypeTitle,
    docNo,
    docDate,
    dueDate,
    status,
    statusColor = 'purple',
    referenceNo,
    companyName = 'YAA SALES & MART',
    companySubtitle = 'Wholesale & Retail Enterprise FMCG Distribution',
    companyAddress = '128 Commercial Boulevard, Tech Park, Chennai - 600001, Tamil Nadu',
    companyGstin = '33AAAAA0000A1Z5',
    companyPhone = '+91 98765 43210',
    companyEmail = 'billing@yaacreations.com',
    partyTitle = 'Billed To',
    partyName,
    partyCompany,
    partyPhone,
    partyEmail,
    partyAddress,
    partyGstin,
    extraMeta = [],
    items = [],
    subtotal,
    discount = 0,
    tax,
    shipping = 0,
    otherCharges = 0,
    roundOff,
    grandTotal,
    paidAmount,
    balance,
    paidAmountLabel = 'Amount Paid',
    balanceLabel = 'Balance Due',
    amountInWords,
    notes,
    terms,
    primarySignatoryLabel = 'Authorized Signatory',
    secondarySignatoryLabel,
  } = options;

  // Status color styles
  const statusBgMap = {
    emerald: 'background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;',
    amber: 'background: #fffbeb; color: #b45309; border: 1px solid #fde68a;',
    purple: 'background: #f5f3ff; color: #5b21b6; border: 1px solid #ddd6fe;',
    blue: 'background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;',
    rose: 'background: #fff1f2; color: #be123c; border: 1px solid #fecdd3;',
    slate: 'background: #f8fafc; color: #334155; border: 1px solid #e2e8f0;',
  };

  // Build Tax Rows
  let taxRowsHtml = '';
  if (tax) {
    if (tax.withGst === false || (tax.taxAmount !== undefined && tax.taxAmount === 0)) {
      taxRowsHtml = `
        <tr>
          <td style="padding: 4px 0; color: #64748b; font-size: 11.5px;">Tax (GST Exempt):</td>
          <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #1e293b; font-size: 11.5px;">₹0.00</td>
        </tr>
      `;
    } else if (tax.gstType === 'inter_state') {
      const igstVal = tax.igst !== undefined ? tax.igst : tax.taxAmount || 0;
      taxRowsHtml = `
        <tr>
          <td style="padding: 4px 0; color: #64748b; font-size: 11.5px;">IGST (100%):</td>
          <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #1e293b; font-size: 11.5px;">+₹${igstVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    } else {
      const totalTax = tax.taxAmount || ((tax.cgst || 0) + (tax.sgst || 0));
      const cgstVal = tax.cgst !== undefined ? tax.cgst : totalTax / 2;
      const sgstVal = tax.sgst !== undefined ? tax.sgst : totalTax / 2;
      taxRowsHtml = `
        <tr>
          <td style="padding: 4px 0; color: #64748b; font-size: 11.5px;">CGST (50%):</td>
          <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #1e293b; font-size: 11.5px;">+₹${cgstVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b; font-size: 11.5px;">SGST (50%):</td>
          <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #1e293b; font-size: 11.5px;">+₹${sgstVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    }
  }

  // Build items rows
  const itemsHtml = items.length > 0 ? items.map((it, idx) => `
    <tr>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11.5px; text-align: center; color: #64748b;">${idx + 1}</td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11.5px; font-weight: 600; color: #0f172a;">
        ${it.name}
        ${it.sku ? `<div style="font-size: 10px; color: #64748b; font-weight: normal; margin-top: 1px;">SKU: ${it.sku}</div>` : ''}
        ${it.remarks ? `<div style="font-size: 10px; color: #0284c7; margin-top: 1px;">${it.remarks}</div>` : ''}
      </td>
      ${items.some(i => i.batch) ? `<td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: center; color: #33077C; font-family: monospace; font-weight: 700;">${it.batch || '—'}</td>` : ''}
      <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11.5px; text-align: center; font-weight: 700; color: #0f172a;">
        ${it.quantity ?? 1} ${it.unit ? `<span style="font-size: 10px; font-weight: normal; color: #64748b;">${it.unit}</span>` : ''}
      </td>
      ${it.unitPrice !== undefined ? `<td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11.5px; text-align: right; color: #0f172a;">₹${Number(it.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>` : ''}
      ${items.some(i => i.discountPercent !== undefined) ? `<td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: center; color: #0f172a;">${it.discountPercent || 0}%</td>` : ''}
      ${items.some(i => i.taxPercent !== undefined) ? `<td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: center; color: #0f172a;">${it.taxPercent || 0}%</td>` : ''}
      <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11.5px; text-align: right; font-weight: 700; color: #0f172a;">
        ₹${Number(it.total ?? (Number(it.quantity || 1) * Number(it.unitPrice || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </td>
    </tr>
  `).join('') : `
    <tr>
      <td colspan="7" style="padding: 24px; text-align: center; color: #94a3b8; font-style: italic;">No line items detailed in this record.</td>
    </tr>
  `;

  // Calculated In Words if not passed
  const calculatedWords = amountInWords || numberToWordsIndian(grandTotal);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${docTypeTitle} - ${docNo}</title>
        <meta charset="utf-8" />
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { background: #fff; color: #0f172a; padding: 28px; font-size: 12px; line-height: 1.45; }
          @page { margin: 10mm 12mm; size: portrait; }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
          }
          .container { max-width: 820px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #33077C; padding-bottom: 16px; margin-bottom: 18px; }
          .company-title { font-size: 20px; font-weight: 900; color: #33077C; letter-spacing: -0.3px; }
          .company-sub { font-size: 11px; color: #64748b; margin-top: 2px; line-height: 1.4; }
          .doc-header { text-align: right; }
          .doc-title { font-size: 18px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
          .doc-no { font-size: 13px; font-weight: 700; color: #33077C; margin-top: 3px; font-family: monospace; }
          .meta-pill { display: inline-block; padding: 2.5px 8.5px; border-radius: 9999px; font-size: 10px; font-weight: 700; text-transform: uppercase; margin-top: 5px; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 18px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; }
          .section-title { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 4px; }
          .party-name { font-size: 13.5px; font-weight: 800; color: #0f172a; }
          .meta-row { display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 2.5px; color: #475569; }
          .meta-row strong { color: #0f172a; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11.5px; }
          th { background: #33077C !important; color: #ffffff !important; font-size: 10.5px; text-transform: uppercase; font-weight: 700; padding: 8px 10px; letter-spacing: 0.3px; }
          .summary-card { width: 330px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; }
          .grand-total-row { border-top: 1.5px solid #33077C; border-bottom: 1.5px solid #33077C; padding: 6px 0; font-size: 13.5px; font-weight: 900; color: #33077C; }
          .sign-area { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 36px; padding-top: 14px; border-top: 1px dashed #cbd5e1; }
          .sign-box { text-align: center; min-width: 170px; border-top: 1px solid #475569; padding-top: 4px; font-size: 10.5px; font-weight: 700; color: #334155; }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- 1. Header -->
          <div class="header">
            <div>
              <div class="company-title">${companyName}</div>
              <div class="company-sub">
                ${companySubtitle}<br/>
                ${companyAddress}<br/>
                GSTIN: <strong>${companyGstin}</strong> | Phone: ${companyPhone} | Email: ${companyEmail}
              </div>
            </div>
            <div class="doc-header">
              <div class="doc-title">${docTypeTitle}</div>
              <div class="doc-no"># ${docNo}</div>
              ${status ? `<span class="meta-pill" style="${statusBgMap[statusColor] || statusBgMap.purple}">${status}</span>` : ''}
              <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Date: <strong>${docDate}</strong></div>
              ${dueDate ? `<div style="font-size: 11px; color: #64748b;">Due Date: <strong>${dueDate}</strong></div>` : ''}
            </div>
          </div>

          <!-- 2. Two Column Party and Document Meta -->
          <div class="grid-2">
            <div>
              <div class="section-title">${partyTitle}</div>
              <div class="party-name">${partyName}</div>
              ${partyCompany ? `<div style="font-size: 11.5px; color: #475569; margin-top: 1px;">${partyCompany}</div>` : ''}
              ${partyGstin ? `<div style="font-size: 11px; color: #475569; margin-top: 1px;">GSTIN: <strong>${partyGstin}</strong></div>` : ''}
              ${partyPhone ? `<div style="font-size: 11px; color: #475569;">Phone: ${partyPhone}</div>` : ''}
              ${partyEmail ? `<div style="font-size: 11px; color: #475569;">Email: ${partyEmail}</div>` : ''}
              ${partyAddress ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">${partyAddress}</div>` : ''}
            </div>
            <div>
              <div class="section-title">Record Details</div>
              <div class="meta-row"><span>Document No:</span><strong>${docNo}</strong></div>
              <div class="meta-row"><span>Date:</span><strong>${docDate}</strong></div>
              ${referenceNo ? `<div class="meta-row"><span>Ref / Order #:</span><strong>${referenceNo}</strong></div>` : ''}
              ${extraMeta.map(m => `<div class="meta-row"><span>${m.label}:</span><strong>${m.value}</strong></div>`).join('')}
            </div>
          </div>

          <!-- 3. Line Items Table -->
          <table>
            <thead>
              <tr>
                <th style="width: 38px; text-align: center; border-top-left-radius: 6px;">#</th>
                <th style="text-align: left;">Description</th>
                ${items.some(i => i.batch) ? '<th style="text-align: center; width: 90px;">Batch</th>' : ''}
                <th style="text-align: center; width: 70px;">Qty</th>
                ${items.some(i => i.unitPrice !== undefined) ? '<th style="text-align: right; width: 100px;">Rate (₹)</th>' : ''}
                ${items.some(i => i.discountPercent !== undefined) ? '<th style="text-align: center; width: 65px;">Disc %</th>' : ''}
                ${items.some(i => i.taxPercent !== undefined) ? '<th style="text-align: center; width: 65px;">GST %</th>' : ''}
                <th style="text-align: right; width: 115px; border-top-right-radius: 6px;">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- 4. Summary & Totals -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; gap: 20px;">
            <div style="flex: 1; font-size: 11px; color: #64748b;">
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px;">
                <span style="font-weight: 700; color: #475569; text-transform: uppercase; font-size: 10px; display: block; margin-bottom: 2px;">Amount in Words:</span>
                <span style="font-weight: 700; color: #33077C; font-size: 11.5px;">${calculatedWords}</span>
              </div>
              ${notes ? `
                <div style="margin-top: 6px; padding: 8px 10px; background: #fafafa; border-radius: 6px; border: 1px solid #f1f5f9;">
                  <strong style="color: #475569;">Notes:</strong> ${notes}
                </div>
              ` : ''}
              ${terms ? `
                <div style="margin-top: 6px; padding: 8px 10px; background: #fafafa; border-radius: 6px; border: 1px solid #f1f5f9; font-size: 10.5px; line-height: 1.4;">
                  <strong style="color: #475569;">Terms &amp; Conditions:</strong><br/>
                  ${terms}
                </div>
              ` : ''}
            </div>

            <div class="summary-card">
              <table style="width: 100%; margin-bottom: 0;">
                ${subtotal !== undefined ? `
                  <tr>
                    <td style="padding: 3px 0; color: #64748b; font-size: 11.5px;">Subtotal:</td>
                    <td style="padding: 3px 0; text-align: right; font-weight: 600; color: #1e293b; font-size: 11.5px;">₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ` : ''}
                ${discount > 0 ? `
                  <tr>
                    <td style="padding: 3px 0; color: #16a34a; font-size: 11.5px;">Discount:</td>
                    <td style="padding: 3px 0; text-align: right; font-weight: 600; color: #16a34a; font-size: 11.5px;">-₹${discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ` : ''}
                ${taxRowsHtml}
                ${shipping > 0 ? `
                  <tr>
                    <td style="padding: 3px 0; color: #64748b; font-size: 11.5px;">Shipping / Freight:</td>
                    <td style="padding: 3px 0; text-align: right; font-weight: 600; color: #1e293b; font-size: 11.5px;">+₹${shipping.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ` : ''}
                ${otherCharges > 0 ? `
                  <tr>
                    <td style="padding: 3px 0; color: #64748b; font-size: 11.5px;">Other Charges:</td>
                    <td style="padding: 3px 0; text-align: right; font-weight: 600; color: #1e293b; font-size: 11.5px;">+₹${otherCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ` : ''}
                ${roundOff !== undefined && roundOff !== 0 ? `
                  <tr>
                    <td style="padding: 3px 0; color: #64748b; font-size: 11.5px;">Round Off:</td>
                    <td style="padding: 3px 0; text-align: right; font-weight: 600; color: #1e293b; font-size: 11.5px;">${roundOff > 0 ? '+' : ''}₹${roundOff.toFixed(2)}</td>
                  </tr>
                ` : ''}
                <tr class="grand-total-row">
                  <td style="padding: 6px 0;">Grand Total:</td>
                  <td style="padding: 6px 0; text-align: right;">₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
                ${paidAmount !== undefined ? `
                  <tr>
                    <td style="padding: 4px 0 2px; color: #16a34a; font-size: 11.5px; font-weight: 600;">${paidAmountLabel}:</td>
                    <td style="padding: 4px 0 2px; text-align: right; font-weight: 600; color: #16a34a; font-size: 11.5px;">₹${paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ` : ''}
                ${balance !== undefined ? `
                  <tr>
                    <td style="padding: 2px 0 0; color: #d97706; font-size: 11.5px; font-weight: 700;">${balanceLabel}:</td>
                    <td style="padding: 2px 0 0; text-align: right; font-weight: 700; color: #d97706; font-size: 12px;">₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ` : ''}
              </table>
            </div>
          </div>

          <!-- 5. Signatures -->
          <div class="sign-area">
            ${secondarySignatoryLabel ? `
              <div class="sign-box">
                ${secondarySignatoryLabel}
              </div>
            ` : '<div></div>'}
            <div class="sign-box">
              ${primarySignatoryLabel}
            </div>
          </div>

          <!-- 6. Bottom Notice -->
          <div style="margin-top: 18px; padding-top: 8px; border-top: 1px dashed #e2e8f0; text-align: center; color: #94a3b8; font-size: 9.5px;">
            This is a computer-generated business document issued via YAA CRM. Generated on ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}.
          </div>
        </div>

        <script>
          window.onload = function() {
            window.focus();
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

