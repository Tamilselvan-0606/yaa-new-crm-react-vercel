import type { SaleTransaction } from "../../../../store/useSalesManagementStore";
import { toast } from "../../../../utils/toast";
import { exportTableToExcel } from "../../../../utils/excelExport";
import { printTableReport } from "../../../../utils/printUtils";
import { resolveDocumentConvertedAt } from "../../../../utils/salesDocumentWorkflow";
import { formatDateTime } from "./salesInvoiceFormat";

/** Headline figures shown in the exported / printed Sales Invoice reports. */
export interface SalesInvoiceReportSummary {
  totalCount: number;
  completedCount: number;
  totalSalesAmount: number;
  pendingPaymentsAmount: number;
}

export const exportSalesInvoicesToExcel = (
  filteredSales: SaleTransaction[],
  appliedSaleStatus: string,
  summary: SalesInvoiceReportSummary,
): void => {
  if (filteredSales.length === 0) {
    toast.info("No sales records to export.");
    return;
  }

  const excelRows = filteredSales.map((s, idx) => {
    const createdDt = formatDateTime(s.createdAt);
    const convertedAt = resolveDocumentConvertedAt("Invoice", s);
    const convertedDt = formatDateTime(convertedAt);
    return {
      srNo: idx + 1,
      invoiceNo: s.invoiceNo,
      date: s.saleDate,
      dueDate: s.dueDate || "-",
      createdDt: createdDt ? createdDt.full : "—",
      convertedDt: convertedDt ? convertedDt.full : "—",
      customerName: s.customerName,
      customerPhone: s.customerPhone || "-",
      itemsCount: s.items?.length || 0,
      itemsList:
        (s.items || [])
          .map((it) => `${it.productName} (x${it.quantity})`)
          .join(", ") || "-",
      subtotal: Number(s.subtotal || 0),
      discount: Number(s.totalDiscount || 0),
      tax: Number(s.totalTax || 0),
      grandTotal: Number(s.grandTotal || 0),
      paidAmount: Number(s.paidAmount || 0),
      balance: Number(s.balance || 0),
      paymentMethod: s.paymentMethod || "Cash",
      paymentStatus: s.paymentStatus || "Unpaid",
      saleStatus: s.saleStatus || "Confirmed",
      salesperson: s.salesperson || "-",
    };
  });

  exportTableToExcel({
    filename: `Sales_Invoices_Report_${new Date().toISOString().split("T")[0]}`,
    sheetName: "Sales Invoices",
    title: "YAA CREATIONS CRM - SALES INVOICES & ORDERS REPORT",
    subtitle: `Filter: ${appliedSaleStatus} | Total Invoices: ${filteredSales.length} | Generated: ${new Date().toLocaleDateString("en-GB")}`,
    columns: [
      { header: "#", key: "srNo", align: "center", width: 8 },
      { header: "Invoice No", key: "invoiceNo", align: "center", width: 16 },
      { header: "Sale Date", key: "date", align: "center", width: 14 },
      { header: "Due Date", key: "dueDate", align: "center", width: 14 },
      {
        header: "Created Date & Time",
        key: "createdDt",
        align: "center",
        width: 22,
      },
      {
        header: "Converted Date & Time",
        key: "convertedDt",
        align: "center",
        width: 22,
      },
      { header: "Customer", key: "customerName", align: "left", width: 26 },
      { header: "Contact", key: "customerPhone", align: "left", width: 16 },
      { header: "Items", key: "itemsList", align: "left", width: 32 },
      {
        header: "Total Amount (₹)",
        key: "grandTotal",
        align: "right",
        type: "currency",
        width: 18,
      },
      {
        header: "Paid Amount (₹)",
        key: "paidAmount",
        align: "right",
        type: "currency",
        width: 18,
      },
      {
        header: "Balance Due (₹)",
        key: "balance",
        align: "right",
        type: "currency",
        width: 18,
      },
      {
        header: "Payment Method",
        key: "paymentMethod",
        align: "left",
        width: 16,
      },
      {
        header: "Payment Status",
        key: "paymentStatus",
        align: "center",
        width: 16,
      },
      {
        header: "Sale Status",
        key: "saleStatus",
        align: "center",
        width: 14,
      },
      { header: "Salesperson", key: "salesperson", align: "left", width: 18 },
    ],
    data: excelRows,
    summaryRow: {
      srNo: "TOTAL",
      customerName: `${filteredSales.length} Sales Invoices`,
      grandTotal: summary.totalSalesAmount,
      paidAmount: Math.max(
        0,
        summary.totalSalesAmount - summary.pendingPaymentsAmount,
      ),
      balance: summary.pendingPaymentsAmount,
    },
  });

  toast.success(`Exported ${filteredSales.length} sales invoices to Excel!`);
};

/** Prints the Sales Invoice table report via the universal printUtils. */
export const printSalesInvoicesReport = (
  filteredSales: SaleTransaction[],
  appliedSaleStatus: string,
  summary: SalesInvoiceReportSummary,
): void => {
  if (filteredSales.length === 0) {
    toast.info("No sales records to print.");
    return;
  }

  const printRows = filteredSales.map((s, idx) => {
    const createdDt = formatDateTime(s.createdAt);
    const convertedAt = resolveDocumentConvertedAt("Invoice", s);
    const convertedDt = formatDateTime(convertedAt);
    return {
      srNo: idx + 1,
      invoiceNo: s.invoiceNo,
      date: s.saleDate,
      dueDate: s.dueDate || "-",
      createdDt: createdDt ? createdDt.full : "—",
      convertedDt: convertedDt ? convertedDt.full : "—",
      customerName:
        s.customerName + (s.customerCompany ? ` (${s.customerCompany})` : ""),
      customerPhone: s.customerPhone || "-",
      itemsList:
        (s.items || [])
          .map((it) => `${it.productName} (x${it.quantity})`)
          .join(", ") || "-",
      grandTotal: Number(s.grandTotal || 0),
      paidAmount: Number(s.paidAmount || 0),
      balance: Number(s.balance || 0),
      paymentMethod: s.paymentMethod || "Cash",
      paymentStatus: s.paymentStatus || "Unpaid",
      saleStatus: s.saleStatus || "Confirmed",
      salesperson: s.salesperson || "-",
    };
  });

  printTableReport({
    title: "Sales Invoices & Transactions Ledger",
    subtitle: `Filter: ${appliedSaleStatus} | Total: ${filteredSales.length} Invoices`,
    orientation: "landscape",
    metrics: [
      { label: "Total Invoices", value: summary.totalCount },
      { label: "Total Sales", value: summary.totalSalesAmount },
      {
        label: "Total Paid",
        value: Math.max(
          0,
          summary.totalSalesAmount - summary.pendingPaymentsAmount,
        ),
      },
      { label: "Pending Balance", value: summary.pendingPaymentsAmount },
      { label: "Completed", value: summary.completedCount },
    ],
    columns: [
      { header: "#", key: "srNo", align: "center", width: "35px" },
      {
        header: "Invoice No",
        key: "invoiceNo",
        align: "center",
        width: "105px",
      },
      { header: "Date", key: "date", align: "center", width: "85px" },
      {
        header: "Created At",
        key: "createdDt",
        align: "center",
        width: "110px",
      },
      {
        header: "Converted At",
        key: "convertedDt",
        align: "center",
        width: "110px",
      },
      {
        header: "Customer",
        key: "customerName",
        align: "left",
        width: "160px",
      },
      { header: "Items Purchased", key: "itemsList", align: "left" },
      {
        header: "Total (₹)",
        key: "grandTotal",
        align: "right",
        type: "currency",
        width: "95px",
      },
      {
        header: "Paid (₹)",
        key: "paidAmount",
        align: "right",
        type: "currency",
        width: "95px",
      },
      {
        header: "Balance (₹)",
        key: "balance",
        align: "right",
        type: "currency",
        width: "95px",
      },
      {
        header: "Payment",
        key: "paymentStatus",
        align: "center",
        width: "80px",
      },
      {
        header: "Status",
        key: "saleStatus",
        align: "center",
        width: "80px",
      },
      {
        header: "Salesperson",
        key: "salesperson",
        align: "left",
        width: "100px",
      },
    ],
    data: printRows,
    summaryRow: {
      srNo: "TOTAL",
      customerName: `${filteredSales.length} Invoices`,
      grandTotal: summary.totalSalesAmount,
      paidAmount: Math.max(
        0,
        summary.totalSalesAmount - summary.pendingPaymentsAmount,
      ),
      balance: summary.pendingPaymentsAmount,
    },
  });
};
