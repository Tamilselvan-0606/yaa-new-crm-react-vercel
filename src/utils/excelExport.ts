/**
 * Utility to export table data as an Excel (.xls / .xlsx-compatible) file.
 * Generates an XML Spreadsheet / HTML Excel table with styled headers, correct cell types, and metadata.
 */

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  type?: 'string' | 'number' | 'currency' | 'date';
}

export interface ExportToExcelOptions {
  filename: string;
  sheetName?: string;
  title?: string;
  subtitle?: string;
  columns: ExcelColumn[];
  data: Record<string, any>[];
  summaryRow?: Record<string, any>;
}

export function exportTableToExcel({
  filename,
  sheetName = 'Sheet1',
  title,
  subtitle,
  columns,
  data,
  summaryRow,
}: ExportToExcelOptions): void {
  const cleanFilename = filename.endsWith('.xls') ? filename : `${filename}.xls`;

  // Build HTML Excel Table format (compatible with Excel, Google Sheets, LibreOffice, Apple Numbers)
  let html = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:x="urn:schemas-microsoft-com:office:excel"
        xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
    <!--[if gte mso 9]>
    <xml>
      <x:ExcelWorkbook>
        <x:ExcelWorksheets>
          <x:ExcelWorksheet>
            <x:Name>${sheetName.replace(/[:\\/?*\[\]]/g, '')}</x:Name>
            <x:WorksheetOptions>
              <x:DisplayGridlines/>
            </x:WorksheetOptions>
          </x:ExcelWorksheet>
        </x:ExcelWorksheets>
      </x:ExcelWorkbook>
    </xml>
    <![endif]-->
    <style>
      body { font-family: Calibri, Arial, sans-serif; }
      table { border-collapse: collapse; width: 100%; }
      th {
        background-color: #33077C;
        color: #ffffff;
        font-weight: bold;
        font-size: 11pt;
        text-transform: uppercase;
        border: 1px solid #230459;
        padding: 8px 12px;
        text-align: left;
      }
      th.center { text-align: center; }
      th.right { text-align: right; }
      td {
        border: 1px solid #d1d5db;
        padding: 6px 10px;
        font-size: 10pt;
        color: #1f2937;
      }
      td.center { text-align: center; }
      td.right { text-align: right; }
      tr:nth-child(even) td { background-color: #f9fafb; }
      .title-row {
        font-size: 16pt;
        font-weight: bold;
        color: #33077C;
        text-align: left;
        padding: 10px 0;
      }
      .subtitle-row {
        font-size: 10pt;
        color: #6b7280;
        text-align: left;
        padding-bottom: 12px;
      }
      .summary-row td {
        background-color: #f3e8ff;
        font-weight: bold;
        border-top: 2px solid #33077C;
        color: #33077C;
      }
    </style>
  </head>
  <body>
  <table>
  `;

  // Optional Title & Subtitle Header in Excel
  if (title) {
    html += `<tr><td colspan="${columns.length}" class="title-row">${title}</td></tr>`;
  }
  if (subtitle) {
    html += `<tr><td colspan="${columns.length}" class="subtitle-row">${subtitle}</td></tr>`;
  }
  if (title || subtitle) {
    html += `<tr><td colspan="${columns.length}"></td></tr>`;
  }

  // Header Row
  html += '<thead><tr>';
  columns.forEach((col) => {
    const alignClass = col.align === 'center' ? ' class="center"' : col.align === 'right' ? ' class="right"' : '';
    html += `<th${alignClass}>${col.header}</th>`;
  });
  html += '</tr></thead>';

  // Data Rows
  html += '<tbody>';
  data.forEach((row, idx) => {
    html += '<tr>';
    columns.forEach((col) => {
      let val = row[col.key];
      if (val === undefined || val === null) val = '-';
      const alignClass = col.align === 'center' ? ' class="center"' : col.align === 'right' ? ' class="right"' : '';

      if (col.type === 'currency' && typeof val === 'number') {
        html += `<td${alignClass}>₹ ${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>`;
      } else {
        html += `<td${alignClass}>${String(val)}</td>`;
      }
    });
    html += '</tr>';
  });

  // Summary Row (if provided)
  if (summaryRow) {
    html += '<tr class="summary-row">';
    columns.forEach((col, idx) => {
      const alignClass = col.align === 'center' ? ' class="center"' : col.align === 'right' ? ' class="right"' : '';
      let val = summaryRow[col.key];
      if (val === undefined || val === null) {
        val = idx === 0 ? 'Total' : '';
      }
      if (col.type === 'currency' && typeof val === 'number') {
        html += `<td${alignClass}>₹ ${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>`;
      } else {
        html += `<td${alignClass}>${String(val)}</td>`;
      }
    });
    html += '</tr>';
  }

  html += '</tbody></table></body></html>';

  // Create Blob & Download Link
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', cleanFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
