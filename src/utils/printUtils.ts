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
