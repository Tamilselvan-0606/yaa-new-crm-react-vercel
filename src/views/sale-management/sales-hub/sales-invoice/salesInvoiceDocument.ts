import type { SaleTransaction } from "../../../../store/useSalesManagementStore";
import type { DocumentPrintOptions } from "../../../../utils/printUtils";
import type { CompanyDocumentProfile } from "../../../../hooks/useCompanyDocumentProfile";
import { isoToDdmmyyyy } from "./salesInvoiceFormat";

/** Maps a saved invoice to the shared DocumentPrintOptions used by print / PDF download. */
export const mapSaleToDocumentPrintOptions = (
  sale: SaleTransaction,
  companyProfile: CompanyDocumentProfile,
): DocumentPrintOptions => {
  const isGstActive =
    sale.withGst !== false && Number(sale.totalTax || 0) > 0;
  return {
    docTypeTitle: "TAX INVOICE",
    docNo: sale.invoiceNo,
    docDate: isoToDdmmyyyy(sale.saleDate),
    dueDate: sale.dueDate ? isoToDdmmyyyy(sale.dueDate) : undefined,
    status: sale.paymentStatus,
    statusColor:
      sale.paymentStatus === "Paid"
        ? "emerald"
        : sale.paymentStatus === "Partial"
          ? "amber"
          : "rose",
    referenceNo: sale.referenceNo,
    companyName: companyProfile.companyName,
    companySubtitle: companyProfile.companySubtitle,
    companyAddress: companyProfile.companyAddress,
    companyGstin: companyProfile.companyGstin,
    companyPhone: companyProfile.companyPhone,
    companyEmail: companyProfile.companyEmail,
    partyTitle: "Billed To",
    partyName: sale.customerName,
    partyCompany: sale.customerCompany,
    partyPhone: sale.customerPhone,
    partyEmail: sale.customerEmail,
    partyAddress: sale.billingAddress,
    extraMeta: [
      { label: "Payment Status", value: sale.paymentStatus },
      { label: "Payment Method", value: sale.paymentMethod || "Cash" },
      { label: "Salesperson", value: sale.salesperson || "Staff" },
      { label: "Payment Terms", value: sale.paymentTerms || "Net 15 Days" },
    ],
    items: (sale.items || []).map((it) => ({
      name: it.productName,
      sku: it.sku,
      batch: it.batch,
      unit: (it as any).unit || "PCS",
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discountPercent: it.discountPercent,
      taxPercent: isGstActive ? it.taxPercent || 0 : 0,
      total: it.total,
    })),
    subtotal: sale.subtotal,
    discount: sale.totalDiscount,
    tax: {
      withGst: isGstActive,
      taxAmount: sale.totalTax,
      cgst: sale.cgst,
      sgst: sale.sgst,
      igst: sale.igst,
    },
    shipping: sale.shippingCharges,
    otherCharges: sale.otherCharges,
    roundOff: (sale as any).roundOff,
    grandTotal: sale.grandTotal,
    paidAmount: sale.paidAmount,
    balance: sale.balance,
    notes: sale.notes,
    terms: (sale as any).terms || sale.paymentTerms,
    primarySignatoryLabel: "Authorized Signatory",
  };
};

/** Builds the standalone HTML page that the browser print window renders for an invoice. */
export const buildSalesInvoicePrintHtml = (
  sale: SaleTransaction,
  companyProfile: CompanyDocumentProfile,
): string => {

  const itemsRows = sale.items
    .map(
      (item, idx) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: center; color: #64748b;">${idx + 1}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 600; color: #1e293b;">
          ${item.productName} ${item.sku ? `<span style="color: #94a3b8; font-weight: normal;">(${item.sku})</span>` : ""}
        </td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: center; color: #33077C; font-family: monospace; font-weight: 700;">${item.batch || "—"}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: center; font-weight: 700; color: #1e293b;">${item.quantity}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: right; color: #1e293b;">₹${item.unitPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: center; color: #1e293b;">${item.discountPercent || 0}%</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: center; color: #1e293b;">${sale.withGst !== false && Number(sale.totalTax || 0) > 0 ? `${item.taxPercent || 0}%` : "0%"}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: right; font-weight: 700; color: #1e293b;">₹${item.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
      </tr>
    `,
    )
    .join("");

  const taxRows =
    sale.withGst !== false && sale.totalTax > 0
      ? sale.gstType === "inter_state"
        ? `<tr>
            <td style="padding: 4px 0; color: #64748b; font-size: 12px;">IGST:</td>
            <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #1e293b; font-size: 12px;">+₹${(sale.igst !== undefined ? sale.igst : sale.totalTax).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
          </tr>`
        : `<tr>
            <td style="padding: 4px 0; color: #64748b; font-size: 12px;">CGST (50%):</td>
            <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #1e293b; font-size: 12px;">+₹${(sale.cgst !== undefined ? sale.cgst : sale.totalTax / 2).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b; font-size: 12px;">SGST (50%):</td>
            <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #1e293b; font-size: 12px;">+₹${(sale.sgst !== undefined ? sale.sgst : sale.totalTax / 2).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
          </tr>`
      : `<tr>
          <td style="padding: 4px 0; color: #64748b; font-size: 12px;">Tax (Exempt):</td>
          <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #1e293b; font-size: 12px;">₹0.00</td>
        </tr>`;
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice - ${sale.invoiceNo}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', sans-serif; }
          body { background: #fff; color: #0f172a; padding: 32px; font-size: 13px; }
          @media print {
            body { padding: 16px; }
            @page { margin: 12mm; }
          }
        </style>
      </head>
      <body>
        <div style="max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px;">
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #33077C; padding-bottom: 20px; margin-bottom: 20px;">
            <div>
              <h1 style="font-size: 22px; font-weight: 800; color: #33077C; margin-bottom: 4px;">${companyProfile.companyName}</h1>
              <p style="font-size: 12px; color: #64748b; line-height: 1.4;">
                ${companyProfile.companyAddress || ""}<br/>
                GSTIN: ${companyProfile.companyGstin || ""} | Phone: ${companyProfile.companyPhone || ""}<br/>
                Email: ${companyProfile.companyEmail || ""}
              </p>
            </div>
            <div style="text-align: right;">
              <h2 style="font-size: 20px; font-weight: 800; color: #1e293b; letter-spacing: 0.5px;">TAX INVOICE</h2>
              <div style="margin-top: 6px; font-size: 13px; font-weight: 700; color: #33077C;">Invoice #: ${sale.invoiceNo}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Date: ${isoToDdmmyyyy(sale.saleDate)}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Due Date: ${isoToDdmmyyyy(sale.dueDate)}</div>
            </div>
          </div>

          <!-- Customer & Order Meta -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; padding: 14px; background: #f8fafc; border-radius: 8px;">
            <div>
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Billed To</div>
              <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${sale.customerName}</div>
              ${sale.customerCompany ? `<div style="font-size: 12px; color: #475569;">${sale.customerCompany}</div>` : ""}
              ${sale.customerPhone ? `<div style="font-size: 12px; color: #64748b;">Phone: ${sale.customerPhone}</div>` : ""}
              ${sale.customerEmail ? `<div style="font-size: 12px; color: #64748b;">Email: ${sale.customerEmail}</div>` : ""}
              ${sale.billingAddress ? `<div style="font-size: 12px; color: #64748b; margin-top: 2px;">${sale.billingAddress}</div>` : ""}
            </div>
            <div style="text-align: right;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Invoice Details</div>
              <div style="font-size: 12px; color: #475569;">Payment Status: <strong style="color: ${sale.paymentStatus === "Paid" ? "#16a34a" : sale.paymentStatus === "Partial" ? "#d97706" : "#dc2626"};">${sale.paymentStatus}</strong></div>
              <div style="font-size: 12px; color: #475569; margin-top: 2px;">Salesperson: <strong>${sale.salesperson || "Staff"}</strong></div>
              <div style="font-size: 12px; color: #475569; margin-top: 2px;">Payment Terms: <strong>${sale.paymentTerms || "Net 15 Days"}</strong></div>
              ${sale.referenceNo ? `<div style="font-size: 12px; color: #64748b; margin-top: 2px;">Ref #: ${sale.referenceNo}</div>` : ""}
            </div>
          </div>

          <!-- Items Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #33077C; color: #ffffff;">
                <th style="padding: 8px 12px; font-size: 11px; text-transform: uppercase; text-align: center; border-top-left-radius: 6px;">#</th>
                <th style="padding: 8px 12px; font-size: 11px; text-transform: uppercase; text-align: left;">Item Description</th>
                <th style="padding: 8px 12px; font-size: 11px; text-transform: uppercase; text-align: center;">Batch</th>
                <th style="padding: 8px 12px; font-size: 11px; text-transform: uppercase; text-align: center;">Qty</th>
                <th style="padding: 8px 12px; font-size: 11px; text-transform: uppercase; text-align: right;">Unit Price</th>
                <th style="padding: 8px 12px; font-size: 11px; text-transform: uppercase; text-align: center;">Disc</th>
                <th style="padding: 8px 12px; font-size: 11px; text-transform: uppercase; text-align: center;">GST</th>
                <th style="padding: 8px 12px; font-size: 11px; text-transform: uppercase; text-align: right; border-top-right-radius: 6px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <!-- Summary & Totals -->
          <div style="display: flex; justify-content: flex-end; margin-bottom: 24px;">
            <div style="width: 320px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;">
              <table style="width: 100%;">
                <tr>
                  <td style="padding: 4px 0; color: #64748b; font-size: 12px;">Subtotal:</td>
                  <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #1e293b; font-size: 12px;">₹${sale.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                </tr>
                ${
                  sale.totalDiscount > 0
                    ? `
                <tr>
                  <td style="padding: 4px 0; color: #16a34a; font-size: 12px;">Discount:</td>
                  <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #16a34a; font-size: 12px;">-₹${sale.totalDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                </tr>`
                    : ""
                }
                ${taxRows}
                ${
                  sale.shippingCharges > 0
                    ? `
                <tr>
                  <td style="padding: 4px 0; color: #64748b; font-size: 12px;">Shipping:</td>
                  <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #1e293b; font-size: 12px;">+₹${sale.shippingCharges.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                </tr>`
                    : ""
                }
                <tr style="border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
                  <td style="padding: 8px 0; font-weight: 800; color: #33077C; font-size: 14px;">Grand Total:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 800; color: #33077C; font-size: 15px;">₹${sale.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #16a34a; font-weight: 600; font-size: 12px;">Amount Paid:</td>
                  <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #16a34a; font-size: 12px;">₹${sale.paidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #d97706; font-weight: 700; font-size: 12px;">Balance Due:</td>
                  <td style="padding: 4px 0; text-align: right; font-weight: 700; color: #d97706; font-size: 13px;">₹${sale.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                </tr>
              </table>
            </div>
          </div>

          <!-- Footer Notes -->
          <div style="border-top: 1px dashed #cbd5e1; padding-top: 14px; text-align: center; color: #94a3b8; font-size: 11px;">
            <p style="font-weight: 600; color: #64748b;">Thank you for your business with YAA Mart!</p>
            <p style="margin-top: 2px;">This is a computer-generated invoice and requires no signature.</p>
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
};
