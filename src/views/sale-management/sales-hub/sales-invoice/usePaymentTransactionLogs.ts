import { useMemo, useState } from "react";
import type {
  SaleTransaction,
  SalePaymentStatus,
} from "../../../../store/useSalesManagementStore";

export interface PaymentTransactionLog {
  id: string;
  saleId: string;
  invoiceNo: string;
  customerName: string;
  date: string;
  method: string;
  referenceNo: string;
  amount: number;
  saleTotal: number;
  paymentStatus: SalePaymentStatus;
  notes?: string;
  sale: SaleTransaction;
}

/**
 * Flattens the payments of the loaded invoices into audit-log rows and owns the
 * search / method filter / pagination state of the "Payment History & Transaction Logs" panel.
 */
export const usePaymentTransactionLogs = (sales: SaleTransaction[]) => {
  const [paymentLogSearch, setPaymentLogSearch] = useState("");
  const [paymentLogMethodFilter, setPaymentLogMethodFilter] = useState("All");
  const [paymentLogPage, setPaymentLogPage] = useState(1);
  const [paymentLogPageSize, setPaymentLogPageSize] = useState(5);

  const allPaymentLogs = useMemo(() => {
    const logs: PaymentTransactionLog[] = [];

    sales.forEach((s) => {
      if (s.paymentSplits && s.paymentSplits.length > 0) {
        s.paymentSplits.forEach((split, idx) => {
          if (Number(split.amount) > 0 || s.paidAmount > 0) {
            logs.push({
              id: `${s.id}-split-${idx}-${split.id || idx}`,
              saleId: s.id,
              invoiceNo: s.invoiceNo,
              customerName: s.customerName,
              date: s.saleDate,
              method: split.method || s.paymentMethod || "Cash",
              referenceNo: split.referenceNo || "",
              amount: Number(split.amount || 0),
              saleTotal: s.grandTotal,
              paymentStatus: s.paymentStatus,
              notes: s.notes,
              sale: s,
            });
          }
        });
      } else if (s.paidAmount > 0) {
        logs.push({
          id: `${s.id}-single`,
          saleId: s.id,
          invoiceNo: s.invoiceNo,
          customerName: s.customerName,
          date: s.saleDate,
          method: s.paymentMethod || "Cash",
          referenceNo: "",
          amount: s.paidAmount,
          saleTotal: s.grandTotal,
          paymentStatus: s.paymentStatus,
          notes: s.notes,
          sale: s,
        });
      }
    });

    return logs;
  }, [sales]);

  const filteredPaymentLogs = useMemo(() => {
    return allPaymentLogs.filter((log) => {
      const q = paymentLogSearch.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        log.invoiceNo.toLowerCase().includes(q) ||
        log.customerName.toLowerCase().includes(q) ||
        log.referenceNo.toLowerCase().includes(q) ||
        log.method.toLowerCase().includes(q);

      const matchesMethod =
        paymentLogMethodFilter === "All" ||
        log.method.toLowerCase() === paymentLogMethodFilter.toLowerCase();

      return matchesSearch && matchesMethod;
    });
  }, [allPaymentLogs, paymentLogSearch, paymentLogMethodFilter]);

  const paginatedPaymentLogs = useMemo(() => {
    const start = (paymentLogPage - 1) * paymentLogPageSize;
    return filteredPaymentLogs.slice(start, start + paymentLogPageSize);
  }, [filteredPaymentLogs, paymentLogPage, paymentLogPageSize]);

  return {
    allPaymentLogs,
    filteredPaymentLogs,
    paginatedPaymentLogs,
    paymentLogSearch,
    setPaymentLogSearch,
    paymentLogMethodFilter,
    setPaymentLogMethodFilter,
    paymentLogPage,
    setPaymentLogPage,
    paymentLogPageSize,
    setPaymentLogPageSize,
  };
};

export type PaymentTransactionLogsState = ReturnType<
  typeof usePaymentTransactionLogs
>;
