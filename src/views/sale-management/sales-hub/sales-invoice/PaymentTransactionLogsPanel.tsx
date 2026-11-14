import React from "react";
import { History, Search, X, Eye, Filter, Receipt, CheckCircle2 } from "lucide-react";
import { CommonTableHead } from "../../../../components/common/CommonTableHead";
import type { SaleTransaction } from "../../../../store/useSalesManagementStore";
import { Pagination } from "../../../../components/common/Pagination";
import { formatDate } from "../../utils/dateUtils";
import type { PaymentTransactionLogsState } from "./usePaymentTransactionLogs";

interface PaymentTransactionLogsPanelProps {
  sales: SaleTransaction[];
  logs: PaymentTransactionLogsState;
  setSelectedSale: (sale: SaleTransaction) => void;
  setIsInvoiceModalOpen: (open: boolean) => void;
  setIsPaymentHistoryModalOpen: (open: boolean) => void;
}

/** "Payment History & Transaction Logs" panel shown under the Sales Invoice table. */
export const PaymentTransactionLogsPanel: React.FC<
  PaymentTransactionLogsPanelProps
> = ({
  sales,
  logs,
  setSelectedSale,
  setIsInvoiceModalOpen,
  setIsPaymentHistoryModalOpen,
}) => {
  const {
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
  } = logs;
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden p-5 sm:p-6 space-y-5">
      {/* Header & Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#33077C] border border-purple-200 flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <History className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Payment History &amp; Transaction Logs
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-[#33077C] text-xs font-bold border border-purple-200">
                {allPaymentLogs.length} Total Logs
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Comprehensive settlement records, split payment traces, and
              transaction audit trails across all sales.
            </p>
          </div>
        </div>

        {/* Search & Method Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={paymentLogSearch}
              onChange={(e) => {
                setPaymentLogSearch(e.target.value);
                setPaymentLogPage(1);
              }}
              placeholder="Search Txn ID, Inv #, Customer..."
              className="w-full h-9 pl-8 pr-3 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] rounded-xl text-xs font-medium text-slate-700 outline-none transition-all shadow-2xs"
            />
            {paymentLogSearch && (
              <button
                type="button"
                onClick={() => setPaymentLogSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Method Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={paymentLogMethodFilter}
              onChange={(e) => {
                setPaymentLogMethodFilter(e.target.value);
                setPaymentLogPage(1);
              }}
              className="h-9 px-3 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer transition-all shadow-2xs"
            >
              <option value="All">All Methods</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
              <option value="Cheque">Cheque</option>
              <option value="Credit">Credit</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quick Summary Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-purple-50/60 border border-purple-100 rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
            Total Collected Logged
          </span>
          <div className="text-base sm:text-lg font-black text-[#33077C] mt-0.5">
            ₹
            {allPaymentLogs
              .reduce((acc, l) => acc + (Number(l.amount) || 0), 0)
              .toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            Total Payment Entries
          </span>
          <div className="text-base sm:text-lg font-black text-emerald-700 mt-0.5">
            {allPaymentLogs.length} Receipts
          </div>
        </div>
        <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
            Active Sales Orders
          </span>
          <div className="text-base sm:text-lg font-black text-indigo-700 mt-0.5">
            {sales.length} Invoices
          </div>
        </div>
        <div className="p-3.5 bg-amber-50/60 border border-amber-100 rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
            Pending Payments Total
          </span>
          <div className="text-base sm:text-lg font-black text-amber-600 mt-0.5">
            ₹
            {sales
              .reduce((acc, s) => acc + (s.balance || 0), 0)
              .toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Table of Payment Logs */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs">
          <CommonTableHead
            columns={[
              { label: "#", align: "center", width: "45px" },
              { label: "INVOICE #", align: "left", minWidth: "140px" },
              {
                label: "CUSTOMER NAME",
                align: "left",
                minWidth: "160px",
              },
              { label: "DATE", align: "left", minWidth: "120px" },
              {
                label: "PAYMENT METHOD",
                align: "center",
                minWidth: "140px",
              },
              {
                label: "REFERENCE / TXN ID",
                align: "left",
                minWidth: "150px",
              },
              { label: "AMOUNT PAID", align: "right", minWidth: "130px" },
              { label: "STATUS", align: "center", minWidth: "110px" },
              { label: "ACTIONS", align: "center", minWidth: "90px" },
            ]}
          />
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {paginatedPaymentLogs.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="py-8 text-center text-slate-400"
                >
                  <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-600">
                    No payment transaction logs found
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Try adjusting your search query or method filter.
                  </p>
                </td>
              </tr>
            ) : (
              paginatedPaymentLogs.map((log, idx) => {
                const globalIdx =
                  (paymentLogPage - 1) * paymentLogPageSize + idx + 1;
                return (
                  <tr
                    key={log.id}
                    className="hover:bg-purple-50/30 transition-colors"
                  >
                    <td className="py-3 px-3.5 text-slate-400 font-medium">
                      {globalIdx}
                    </td>
                    <td className="py-3 px-3.5 font-bold text-[#33077C]">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSale(log.sale);
                          setIsInvoiceModalOpen(true);
                        }}
                        className="hover:underline cursor-pointer"
                      >
                        {log.invoiceNo}
                      </button>
                    </td>
                    <td className="py-3 px-3.5 font-semibold text-slate-900">
                      {log.customerName}
                    </td>
                    <td className="py-3 px-3.5 text-slate-500 font-medium">
                      {formatDate(log.date)}
                    </td>
                    <td className="py-3 px-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${
                          log.method === "UPI"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : log.method === "Bank Transfer"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : log.method === "Cash"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : log.method === "Card"
                                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                  : log.method === "Cheque"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {log.method}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600">
                      {log.referenceNo || (
                        <span className="text-slate-300 italic">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold text-emerald-600 text-[13px]">
                      ₹
                      {Number(log.amount).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Settled</span>
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSale(log.sale);
                            setIsInvoiceModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-all cursor-pointer shadow-2xs"
                          title="View Invoice"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSale(log.sale);
                            setIsPaymentHistoryModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-all cursor-pointer shadow-2xs"
                          title="View Payment History"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Pagination for Logs */}
      {filteredPaymentLogs.length > 0 && (
        <Pagination
          total={filteredPaymentLogs.length}
          currentPage={paymentLogPage}
          pageSize={paymentLogPageSize}
          pageSizeOptions={[5, 10, 20, 50]}
          onPageChange={(p) => setPaymentLogPage(p)}
          onPageSizeChange={(newSize) => {
            setPaymentLogPageSize(newSize);
            setPaymentLogPage(1);
          }}
        />
      )}
    </div>
  );
};
