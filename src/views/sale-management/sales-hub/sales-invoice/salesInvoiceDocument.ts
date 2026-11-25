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
      { label: "Invoice ID", value: sale.invoiceNo },
      ...(sale.salesInvoiceManualNo
        ? [{ label: "Invoice No", value: sale.salesInvoiceManualNo }]
        : []),
      { label: "Payment Status", value: sale.paymentStatus },
      // Only values the API returned: blank ones are left out, never defaulted.
      ...(sale.paymentMethod
        ? [{ label: "Payment Method", value: String(sale.paymentMethod) }]
        : []),
      ...(sale.salesperson
        ? [{ label: "Salesperson", value: sale.salesperson }]
        : []),
      ...(sale.paymentTerms
        ? [{ label: "Payment Terms", value: sale.paymentTerms }]
        : []),
      ...(Number(sale.totalReturned) > 0
        ? [
            {
              label: "Original Invoice Amount",
              value: `₹${Number(sale.grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
            },
            {
              label: "Sales Return",
              value: `-₹${Number(sale.totalReturned).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
            },
            {
              label: "Net Invoice Amount",
              value: `₹${Math.max(0, Number(sale.grandTotal) - Number(sale.totalReturned)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
            },
          ]
        : []),
    ],
    items: (sale.items || []).map((it) => ({
      name: it.productName,
      sku: it.sku,
      batch: it.batch,
      unit: (it as any).unit || undefined,
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
    terms: (sale as any).terms || undefined,
    primarySignatoryLabel: "Authorized Signatory",
  };
};
