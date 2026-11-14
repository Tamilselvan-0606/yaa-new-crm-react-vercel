import React from "react";
import { ShoppingCart, User, Phone, Clock } from "lucide-react";
import { toast } from "../../../../utils/toast";
import type { SaleTransaction } from "../../../../store/useSalesManagementStore";
import { CommonTableHead } from "../../../../components/common/CommonTableHead";
import { DocumentLineageBadges } from "../../../../components/common/DocumentLineageBadges";
import { UniversalShareDropdown, formatInvoiceShare } from "../../../../utils/shareUtils";
import { resolveDocumentConvertedAt, findDocumentLineage } from "../../../../utils/salesDocumentWorkflow";
import { SaleActionDropdown } from "../../utils";
import { formatDateTime } from "./salesInvoiceFormat";

/** Minimal customer shape used to resolve a customer code for an invoice row. */
export interface CustomerLookupRecord {
  id: string;
  name?: string;
  phone?: string;
  customerCode?: string;
}

type SharePosition = { top?: number; bottom?: number; right: number } | null;

interface SalesInvoiceTableProps {
  paginatedSales: SaleTransaction[];
  customers: CustomerLookupRecord[];
  customerList: CustomerLookupRecord[];
  activeShareDropdownId: string | null;
  setActiveShareDropdownId: React.Dispatch<React.SetStateAction<string | null>>;
  shareDropdownPos: SharePosition;
  setShareDropdownPos: React.Dispatch<React.SetStateAction<SharePosition>>;
  handleOpenViewInvoice: (sale: SaleTransaction) => void | Promise<void>;
  handleOpenEditModal: (sale: SaleTransaction) => void | Promise<void>;
  handleDuplicateSale: (sale: SaleTransaction) => void;
  handlePrintSaleInvoice: (sale: SaleTransaction) => void | Promise<void>;
  handleDownloadSaleInvoice: (sale: SaleTransaction) => void | Promise<void>;
  setSelectedSale: (sale: SaleTransaction) => void;
  setIsPaymentHistoryModalOpen: (open: boolean) => void;
  handleOpenAddPayment: (sale?: SaleTransaction) => void;
  handleOpenAssignInvoiceModal: (sale: SaleTransaction) => void;
  navigate: (path: string) => void;
  handleCancelInvoice: (sale: SaleTransaction) => void | Promise<void>;
  handleOpenDeleteModal: (sale: SaleTransaction) => void;
}

/** Transactions table of the Sales Invoice list (rows, status badges and the row action menus). */
export const SalesInvoiceTable: React.FC<SalesInvoiceTableProps> = ({
  paginatedSales,
  customers,
  customerList,
  activeShareDropdownId,
  setActiveShareDropdownId,
  shareDropdownPos,
  setShareDropdownPos,
  handleOpenViewInvoice,
  handleOpenEditModal,
  handleDuplicateSale,
  handlePrintSaleInvoice,
  handleDownloadSaleInvoice,
  setSelectedSale,
  setIsPaymentHistoryModalOpen,
  handleOpenAddPayment,
  handleOpenAssignInvoiceModal,
  navigate,
  handleCancelInvoice,
  handleOpenDeleteModal,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Table Header Bar with Transactions title & Tool Icons (Search, Analytics, Excel, Print) */}
      <div className="px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between bg-white">
        <h3 className="text-base font-bold text-slate-800 tracking-tight">
          Transactions
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse border border-slate-200 min-w-[1050px]">
          <CommonTableHead
            columns={[
              {
                label: "INVOICE S.NO.",
                align: "center",
                minWidth: "140px",
              },
              { label: "CUSTOMER", align: "left", minWidth: "180px" },
              {
                label: "CREATED DATE & TIME",
                align: "left",
                minWidth: "150px",
              },
              {
                label: "CONVERTED DATE & TIME",
                align: "left",
                minWidth: "150px",
              },
              { label: "ITEMS", align: "left", minWidth: "150px" },
              {
                label: "TOTAL AMOUNT",
                align: "right",
                minWidth: "130px",
              },
              {
                label: "PAID / BALANCE",
                align: "right",
                minWidth: "140px",
              },
              { label: "PAYMENT", align: "center", minWidth: "110px" },
              { label: "STATUS", align: "center", minWidth: "110px" },
              { label: "ACTIONS", align: "center", minWidth: "130px" },
            ]}
          />
          <tbody className="text-sm">
            {paginatedSales.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="py-16 text-center text-slate-400 border border-slate-200 font-medium"
                >
                  <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                  <p className="font-semibold text-slate-600 text-sm">
                    No sales transactions found
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Try changing search filters or create a new sale
                    order.
                  </p>
                </td>
              </tr>
            ) : (
              paginatedSales.map((sale) => {
                const createdDt = formatDateTime(sale.createdAt);
                const convertedAt = resolveDocumentConvertedAt(
                  "Invoice",
                  sale,
                );
                const convertedDt = formatDateTime(convertedAt);
                const resolvedCustomerCode =
                  sale.customerCode ||
                  customers.find(
                    (c) =>
                      (sale.customerId && c.id === sale.customerId) ||
                      (c.phone &&
                        sale.customerPhone &&
                        c.phone === sale.customerPhone) ||
                      (c.name &&
                        sale.customerName &&
                        c.name.trim().toLowerCase() ===
                          sale.customerName.trim().toLowerCase()),
                  )?.customerCode ||
                  customerList.find(
                    (c) =>
                      (sale.customerId && c.id === sale.customerId) ||
                      (c.phone &&
                        sale.customerPhone &&
                        c.phone === sale.customerPhone) ||
                      (c.name &&
                        sale.customerName &&
                        c.name.trim().toLowerCase() ===
                          sale.customerName.trim().toLowerCase()),
                  )?.customerCode ||
                  findDocumentLineage(sale.invoiceNo)?.customerCode ||
                  (sale.referenceNo
                    ? findDocumentLineage(sale.referenceNo)?.customerCode
                    : "") ||
                  "";

                return (
                  <tr
                    key={sale.id}
                    className="hover:bg-slate-50/80 transition-colors border-b border-slate-200 font-sans"
                  >
                    {/* 1. Invoice No. */}
                    <td className="py-3.5 px-3 font-bold text-slate-800 text-center border border-slate-200 whitespace-nowrap align-middle">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <span
                          className="cursor-pointer hover:underline"
                          onClick={() => handleOpenViewInvoice(sale)}
                        >
                          {sale.invoiceNo}
                        </span>
                        <DocumentLineageBadges
                          docRef={sale.invoiceNo}
                          sourceDocNo={sale.referenceNo}
                          currentType="Invoice"
                          className="justify-center"
                        />
                      </div>
                    </td>

                    {/* 2. Customer */}
                    <td className="py-4 px-5 border border-slate-200 whitespace-nowrap align-middle">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-[#33077C]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-xs sm:text-[13px]">
                              {sale.customerName}
                            </span>
                            {resolvedCustomerCode && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-50 text-[#33077C] border border-purple-200/80">
                                {resolvedCustomerCode}
                              </span>
                            )}
                          </div>
                          {sale.customerCompany && (
                            <span className="text-[10px] text-slate-400 font-medium block">
                              {sale.customerCompany}
                            </span>
                          )}
                          {sale.customerPhone && (
                            <div>
                              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-semibold font-mono tracking-tight">
                                <Phone className="w-3 h-3 text-[#33077C] shrink-0" />
                                {sale.customerPhone}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* CREATED DATE & TIME */}
                    <td className="py-4 px-4 border border-slate-200 whitespace-nowrap align-middle">
                      {createdDt ? (
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 text-xs sm:text-[13px]">
                            {createdDt.date}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{createdDt.time}</span>
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>

                    {/* CONVERTED DATE & TIME */}
                    <td className="py-4 px-4 border border-slate-200 whitespace-nowrap align-middle">
                      {convertedDt ? (
                        <div className="flex flex-col">
                          <span className="font-semibold text-emerald-800 text-xs sm:text-[13px]">
                            {convertedDt.date}
                          </span>
                          <span className="text-[11px] text-emerald-600 font-mono flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-emerald-500 shrink-0" />
                            <span>{convertedDt.time}</span>
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>

                    {/* 3. Items */}
                    <td className="py-4 px-5 border border-slate-200 whitespace-nowrap align-middle">
                      <div className="font-medium text-slate-800 text-xs">
                        {sale.items[0]?.productName || "Custom Line Item"}
                      </div>
                      {sale.items.length > 1 && (
                        <span className="text-[11px] text-[#33077C] font-bold block mt-0.5">
                          +{sale.items.length - 1} more item(s)
                        </span>
                      )}
                    </td>

                    {/* 4. Total Amount */}
                    <td className="py-4 px-4 border border-slate-200 text-right whitespace-nowrap font-bold text-slate-900 text-xs sm:text-[13px] align-middle">
                      ₹
                      {sale.grandTotal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </td>

                    {/* 5. Paid / Balance */}
                    <td className="py-4 px-4 border border-slate-200 text-right whitespace-nowrap align-middle">
                      <div className="font-bold text-emerald-600 text-xs">
                        ₹
                        {sale.paidAmount.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                      {sale.balance > 0 ? (
                        <div className="text-[10px] text-amber-600 font-semibold mt-0.5">
                          Bal: ₹
                          {sale.balance.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400">
                          Settled
                        </div>
                      )}
                    </td>

                    {/* 6. Payment Status */}
                    <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap align-middle min-w-[130px] w-36">
                      {sale.paymentStatus === "Paid" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50/90 text-emerald-700 border border-emerald-300/80 text-xs font-bold shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span>Paid</span>
                        </span>
                      ) : sale.paymentStatus === "Partial" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-300 text-xs font-bold shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          <span>Partial</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-300 text-xs font-bold shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                          <span>Unpaid</span>
                        </span>
                      )}
                    </td>

                    {/* 7. Sale Status */}
                    <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap align-middle min-w-[130px] w-36">
                      {sale.saleStatus === "Completed" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50/90 text-emerald-700 border border-emerald-300/80 text-xs font-bold shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span>Completed</span>
                        </span>
                      ) : sale.saleStatus === "Confirmed" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-[#33077C] border border-purple-300 text-xs font-bold shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#33077C] shrink-0" />
                          <span>Confirmed</span>
                        </span>
                      ) : sale.saleStatus === "Cancelled" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-300 text-xs font-bold shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                          <span>Cancelled</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                          <span>Draft</span>
                        </span>
                      )}
                    </td>

                    {/* 9. Actions */}
                    <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap align-middle min-w-[130px] w-36">
                      <div className="flex items-center justify-center gap-1.5 action-dropdown-container">
                        {/* 1. Share Action Button with Floating Popover */}
                        <UniversalShareDropdown
                          id={sale.id}
                          activeShareId={activeShareDropdownId}
                          setActiveShareId={setActiveShareDropdownId}
                          sharePos={shareDropdownPos}
                          setSharePos={setShareDropdownPos}
                          getShareData={() => formatInvoiceShare(sale)}
                          title="Share Invoice"
                        />

                        {/* 3. Actions Dropdown */}
                        <SaleActionDropdown
                          items={[
                            {
                              label: "View/Edit",
                              variant: "edit",
                              onClick: () => handleOpenEditModal(sale),
                            },
                            {
                              label: "Duplicate",
                              variant: "duplicate",
                              onClick: () => handleDuplicateSale(sale),
                            },
                            {
                              label: "Print Invoice",
                              variant: "print",
                              onClick: () => handlePrintSaleInvoice(sale),
                            },
                            {
                              label: "Download Invoice",
                              variant: "download",
                              onClick: () =>
                                handleDownloadSaleInvoice(sale),
                            },
                            {
                              label: "View History",
                              variant: "view",
                              onClick: () => {
                                setSelectedSale(sale);
                                setIsPaymentHistoryModalOpen(true);
                              },
                            },
                            {
                              label: "Receive Payment",
                              variant: "payment",
                              disabled:
                                sale.paymentStatus === "Paid" ||
                                sale.balance <= 0,
                              onClick: () => handleOpenAddPayment(sale),
                            },
                            {
                              label: "Assign Sales Rep",
                              variant: "assign",
                              onClick: () =>
                                handleOpenAssignInvoiceModal(sale),
                            },
                            {
                              label: "Convert To Return",
                              variant: "return",
                              disabled: sale.saleStatus === "Cancelled",
                              onClick: () => {
                                navigate(
                                  "/sale-management/sales/return",
                                  {
                                    state: {
                                      invoiceNo: sale.invoiceNo,
                                      saleId: sale.id,
                                      customerName: sale.customerName,
                                      customerPhone: sale.customerPhone,
                                      amount: sale.grandTotal,
                                      items: sale.items,
                                    },
                                  },
                                );
                                toast.info(
                                  `Converting invoice ${sale.invoiceNo} to Sales Return`,
                                );
                              },
                            },
                            {
                              label: "Cancel Invoice",
                              variant: "cancel",
                              dividerBefore: true,
                              onClick: () => handleCancelInvoice(sale),
                            },
                            {
                              label: "Delete",
                              variant: "delete",
                              danger: true,
                              onClick: () => handleOpenDeleteModal(sale),
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
