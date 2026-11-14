import type {
  SaleProductItem,
  SaleStatus,
  PaymentSplitItem,
  SalePaymentRecord,
} from "../../../../store/useSalesManagementStore";
import type { calculateDocumentTotals } from "../../../../utils/financialCalculations";

/** State of the Create / Edit Sales Invoice form. */
export interface SalesInvoiceFormData {
  invoiceNo: string;
  salesInvoiceManualNo: string;
  invoiceStatus: "Draft" | "Generated" | "Invoiced";
  referenceNo: string;
  saleDate: string;
  dueDate: string;
  customerId: string;
  customerName: string;
  customerCompany: string;
  customerPhone: string;
  customerEmail: string;
  billingAddress: string;
  shippingAddress: string;
  items: SaleProductItem[];
  withGst: boolean;
  gstType: "intra_state" | "inter_state";
  overallDiscount: number;
  shippingCharges: number;
  otherCharges: number;
  paymentMethod:
    | "Cash"
    | "UPI"
    | "Card"
    | "Bank Transfer"
    | "Cheque"
    | "Credit"
    | "Online Payment"
    | "Other";
  paymentSplits: PaymentSplitItem[];
  paymentRecords: SalePaymentRecord[];
  paymentTerms: string;
  paidAmount: number;
  roundMode: "none" | "up" | "down";
  saleStatus: SaleStatus;
  salesperson: string;
  notes: string;
}

/** Live totals shown in the invoice summary (derived from the form by calculateDocumentTotals). */
export interface SalesInvoiceTotals {
  subtotal: number;
  lineDiscountTotal: number;
  overallDiscount: number;
  totalDiscount: number;
  taxableAmount: number;
  totalTax: number;
  cgst: number;
  sgst: number;
  igst: number;
  shippingCharges: number;
  roundOff: number;
  roundDownDiff: number;
  roundUpDiff: number;
  grandTotal: number;
  paid: number;
  balance: number;
  paymentStatus: ReturnType<typeof calculateDocumentTotals>["paymentStatus"];
}
