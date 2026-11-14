import React from "react";
import type { SaleProductItem } from "../../../../store/useSalesManagementStore";
import type { ApiStockBatch } from "../../../../api";
import { type FieldErrors, fieldAttr } from "../../../../utils/formValidation";
import { Loader2, ChevronDown, Search, X, Plus, Check, Trash2 } from "lucide-react";
import { ProductStockLabel } from "../../../../components/common/ProductStockLabel";
import { FormError } from "../../../../components/common/FormError";
import { SearchableSelect } from "../../../../components/common/SearchableSelect";
import { handleNonNegativeKeyDown } from "../../utils/formUtils";
import { getInitials, FORM_ERROR_INPUT_CLS } from "./salesInvoiceFormat";
import type { SalesInvoiceFormData } from "./salesInvoiceTypes";

/** A selectable product in the invoice line-item dropdown (live product / stock records). */
export interface InvoiceProductOption {
  id: string;
  productId?: string;
  name?: string;
  productName?: string;
  sku?: string;
  code?: string;
  category?: string;
  hsnCode?: string;
  unit?: string;
  price?: number;
  unitPrice?: number;
  stockQty?: number;
  imageUrl?: string;
  image?: string;
}

interface InvoiceItemsTableProps {
  formData: SalesInvoiceFormData;
  setFormData: React.Dispatch<React.SetStateAction<SalesInvoiceFormData>>;
  formErrors: FieldErrors;
  liveStockErrors: FieldErrors;
  openProductDropdownRow: number | null;
  setOpenProductDropdownRow: (row: number | null) => void;
  productDropdownRef: React.RefObject<HTMLDivElement>;
  productSearchQuery: string;
  setProductSearchQuery: (query: string) => void;
  productSearchTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  productList: InvoiceProductOption[];
  availableProducts: InvoiceProductOption[];
  matchingProducts: InvoiceProductOption[];
  isLoadingProducts: boolean;
  fetchLiveProducts: (searchQuery?: string) => Promise<void>;
  setActiveItemRowIndex: (index: number | null) => void;
  setIsAddItemModalOpen: (open: boolean) => void;
  handleItemProductNameChange: (index: number, val: string) => void;
  handleItemProductChange: (index: number, prodId: string) => void;
  handleSelectProduct: (index: number, product: InvoiceProductOption) => void;
  getStockBatches: (productId?: string | null) => ApiStockBatch[];
  getBatchAvailable: (
    productId: string | null | undefined,
    batchNo: string | undefined,
  ) => number | null;
  handleItemBatchChange: (index: number, batchNo: string) => void;
  handleItemFieldChange: (
    index: number,
    field: keyof SaleProductItem,
    val: number,
  ) => void;
  handleRemoveItemRow: (index: number) => void;
  handleAddItemRow: () => void;
}

/** Itemized product table (product picker, batch, qty, price, discount, GST, line total) of the invoice form. */
export const InvoiceItemsTable: React.FC<InvoiceItemsTableProps> = ({
  formData,
  setFormData,
  formErrors,
  liveStockErrors,
  openProductDropdownRow,
  setOpenProductDropdownRow,
  productDropdownRef,
  productSearchQuery,
  setProductSearchQuery,
  productSearchTimerRef,
  productList,
  availableProducts,
  matchingProducts,
  isLoadingProducts,
  fetchLiveProducts,
  setActiveItemRowIndex,
  setIsAddItemModalOpen,
  handleItemProductNameChange,
  handleItemProductChange,
  handleSelectProduct,
  getStockBatches,
  getBatchAvailable,
  handleItemBatchChange,
  handleItemFieldChange,
  handleRemoveItemRow,
  handleAddItemRow,
}) => {
  return (
    <div className="pt-2 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs sm:text-[13px] font-bold text-slate-700 block">
          Add Items &amp; Pricing Details
        </label>
      </div>

      {/* Table with Purple Header matching application theme */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto min-h-[380px] pb-36">
          <table className="w-full text-left text-xs table-fixed min-w-[1060px] border-collapse border border-slate-200">
            <colgroup>
              <col className="w-auto min-w-[240px]" />
              <col className="w-[160px]" />
              <col className="w-[85px]" />
              <col className="w-[95px]" />
              <col className="w-[110px]" />
              <col className="w-[80px]" />
              <col className="w-[110px]" />
              <col className="w-[120px]" />
              <col className="w-[70px]" />
            </colgroup>
            <thead>
              <tr className="bg-[#33077C] text-[11px] font-bold text-white tracking-wider uppercase">
                <th
                  rowSpan={2}
                  className="py-3 px-5 text-left border border-[#33077C]/40 bg-[#33077C] text-white align-middle"
                >
                  PROJECTS
                </th>
                <th
                  rowSpan={2}
                  className="py-3 px-3 text-center border border-[#33077C]/40 bg-[#33077C] text-white align-middle"
                >
                  BATCH NO
                </th>
                <th
                  rowSpan={2}
                  className="py-3 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white align-middle"
                >
                  QTY
                </th>
                <th
                  rowSpan={2}
                  className="py-3 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white align-middle"
                >
                  {formData.withGst ? "GST (%)" : "GST (0%)"}
                </th>
                <th
                  rowSpan={2}
                  className="py-3 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white align-middle"
                >
                  PRICE
                </th>
                <th
                  colSpan={2}
                  className="py-1.5 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white"
                >
                  <span className="text-[11px] font-bold">
                    DISCOUNT
                  </span>
                </th>
                <th
                  rowSpan={2}
                  className="py-3 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white align-middle"
                >
                  TOTAL
                </th>
                <th
                  rowSpan={2}
                  className="py-3 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white align-middle"
                >
                  ACTION
                </th>
              </tr>
              <tr className="bg-[#33077C] text-[10px] font-bold text-purple-200 tracking-wider uppercase">
                <th className="py-1.5 px-1 text-center border border-[#33077C]/40 bg-[#33077C]">
                  %
                </th>
                <th className="py-1.5 px-2 text-center border border-[#33077C]/40 bg-[#33077C]">
                  AMOUNT
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {formData.items.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-12 text-center bg-slate-50/40 border border-slate-200"
                  >
                    <p className="text-xs sm:text-[13px] text-slate-400 font-medium">
                      No items added yet. Click &quot;+ Add Item&quot;
                      below to add line items.
                    </p>
                  </td>
                </tr>
              ) : (
                formData.items.map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    className={`hover:bg-slate-50/70 transition-colors ${idx % 2 === 1 ? "bg-slate-50/40" : "bg-white"}`}
                  >
                    {/* 1. Product Selection */}
                    <td className="px-4 py-3 align-top border border-slate-200 relative si-product-cell">
                      <div
                        className="relative"
                        ref={
                          openProductDropdownRow === idx
                            ? productDropdownRef
                            : undefined
                        }
                      >
                        <div
                          className={`w-full min-h-[38px] px-3 py-1.5 bg-white border rounded-xl flex items-center justify-between text-xs cursor-pointer transition-all ${
                            openProductDropdownRow === idx
                              ? "border-[#33077C] ring-2 ring-[#33077C]/10 bg-white"
                              : item.productName
                                ? "border-slate-300 hover:border-slate-400"
                                : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="text"
                            placeholder="Type or select product item..."
                            value={item.productName || ""}
                            {...fieldAttr(`items.${idx}.product`)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenProductDropdownRow(idx);
                              setProductSearchQuery(
                                item.productName || "",
                              );
                              if (productList.length === 0) {
                                fetchLiveProducts();
                              }
                            }}
                            onFocus={() => {
                              setOpenProductDropdownRow(idx);
                              setProductSearchQuery(
                                item.productName || "",
                              );
                              if (productList.length === 0) {
                                fetchLiveProducts();
                              }
                            }}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleItemProductNameChange(idx, val);
                              setProductSearchQuery(val);
                              setOpenProductDropdownRow(idx);
                              if (productSearchTimerRef.current) {
                                clearTimeout(
                                  productSearchTimerRef.current,
                                );
                              }
                              if (val.trim()) {
                                productSearchTimerRef.current =
                                  setTimeout(() => {
                                    fetchLiveProducts(val.trim());
                                  }, 300);
                              }
                            }}
                            className="w-full bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                          />
                          {isLoadingProducts ? (
                            <Loader2 className="w-3.5 h-3.5 text-[#33077C] animate-spin shrink-0 ml-1" />
                          ) : (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                if (openProductDropdownRow === idx) {
                                  setOpenProductDropdownRow(null);
                                } else {
                                  setOpenProductDropdownRow(idx);
                                  setProductSearchQuery(
                                    item.productName || "",
                                  );
                                  if (productList.length === 0) {
                                    fetchLiveProducts();
                                  }
                                }
                              }}
                              className="p-0.5 hover:bg-slate-100 rounded cursor-pointer shrink-0 ml-1"
                            >
                              <ChevronDown
                                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                                  openProductDropdownRow === idx
                                    ? "rotate-180 text-[#33077C]"
                                    : ""
                                }`}
                              />
                            </div>
                          )}
                        </div>

                        {/* Dropdown Menu for Product Selection */}
                        {openProductDropdownRow === idx && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="si-product-dropdown absolute left-0 top-full mt-1.5 w-[360px] sm:w-[420px] max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-purple-100 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                          >
                            {/* Search Bar matching Customer Dropdown */}
                            <div className="relative mb-2">
                              <div className="flex items-center w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl focus-within:border-[#33077C] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#33077C]/10 transition-all">
                                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
                                <input
                                  type="text"
                                  placeholder="Search product by name, SKU or category..."
                                  value={productSearchQuery}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setProductSearchQuery(val);
                                    if (
                                      productSearchTimerRef.current
                                    ) {
                                      clearTimeout(
                                        productSearchTimerRef.current,
                                      );
                                    }
                                    if (val.trim().length >= 1) {
                                      productSearchTimerRef.current =
                                        setTimeout(() => {
                                          fetchLiveProducts(
                                            val.trim(),
                                          );
                                        }, 300);
                                    }
                                  }}
                                  autoFocus
                                  className="w-full bg-transparent text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none"
                                />
                                {productSearchQuery && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setProductSearchQuery("")
                                    }
                                    className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* 1. Add New Product Button */}
                            <div className="pb-2 mb-1.5 border-b border-slate-100">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveItemRowIndex(idx);
                                  setOpenProductDropdownRow(null);
                                  setIsAddItemModalOpen(true);
                                }}
                                className="w-full py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100/80 text-[#33077C] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-purple-200/80 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Add New Product</span>
                              </button>
                            </div>

                            {/* 2. Options List */}
                            <div className="max-h-64 overflow-y-auto p-0.5 space-y-0.5 divide-y divide-slate-100/60 custom-scrollbar">
                              {/* Option: Clear / None */}
                              <div
                                onClick={() => {
                                  handleItemProductChange(idx, "");
                                  setOpenProductDropdownRow(null);
                                }}
                                className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                  !item.productName
                                    ? "bg-purple-50 text-[#33077C] font-bold"
                                    : "hover:bg-slate-50 text-slate-600"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400 italic">
                                    None / Clear Product
                                  </span>
                                </div>
                                {!item.productName && (
                                  <Check className="w-4 h-4 text-[#33077C]" />
                                )}
                              </div>

                              {isLoadingProducts &&
                              matchingProducts.length === 0 ? (
                                <div className="py-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                                  <Loader2 className="w-4 h-4 animate-spin text-[#33077C]" />
                                  <span>Loading products...</span>
                                </div>
                              ) : matchingProducts.length === 0 ? (
                                <div className="py-6 px-3 text-center text-slate-400">
                                  <p className="text-xs font-semibold text-slate-600">
                                    No products found
                                  </p>
                                  <p className="text-[11px] text-slate-400 mt-0.5">
                                    Try typing a different name,
                                    category, or SKU
                                  </p>
                                  {productSearchQuery.trim() && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveItemRowIndex(idx);
                                        setOpenProductDropdownRow(
                                          null,
                                        );
                                        setIsAddItemModalOpen(true);
                                      }}
                                      className="mt-2.5 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#33077C] text-white text-[11px] font-bold hover:bg-[#4309A2] transition-colors"
                                    >
                                      <Plus className="w-3 h-3" />
                                      <span>
                                        Add "
                                        {productSearchQuery.trim()}"
                                      </span>
                                    </button>
                                  )}
                                </div>
                              ) : (
                                matchingProducts.map((p: any) => {
                                  const isSelected =
                                    item.productId === p.id ||
                                    (item.productName &&
                                      item.productName === p.name);
                                  const imgUrl =
                                    p.imageUrl || p.image;
                                  const pName =
                                    p.name || p.productName || "";
                                  const pSku =
                                    p.sku || p.code || "PRD";
                                  const pCategory = p.category;
                                  const pUnit = p.unit || "Pcs";
                                  const pPrice = Number(
                                    p.price || p.unitPrice || 0,
                                  );

                                  return (
                                    <div
                                      key={p.id}
                                      onClick={() =>
                                        handleSelectProduct(idx, p)
                                      }
                                      className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer text-left ${
                                        isSelected
                                          ? "bg-purple-50 text-[#33077C] font-semibold border border-purple-200/60"
                                          : "hover:bg-slate-50/80 text-slate-800"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        <div className="w-8 h-8 rounded-full bg-purple-100 text-[#33077C] font-bold text-xs flex items-center justify-center shrink-0 border border-purple-200/60 overflow-hidden">
                                          {imgUrl ? (
                                            <img
                                              src={imgUrl}
                                              alt={pName}
                                              className="w-full h-full object-cover"
                                            />
                                          ) : (
                                            <span>
                                              {getInitials(
                                                pName,
                                                "PR",
                                              )}
                                            </span>
                                          )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-slate-900 truncate">
                                              {pName}
                                            </span>
                                            {pCategory && (
                                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium truncate max-w-[120px]">
                                                {pCategory}
                                              </span>
                                            )}
                                            {(p as any).status ? (
                                              <span
                                                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                                                  String(
                                                    (p as any).status,
                                                  ).toLowerCase() ===
                                                  "inactive"
                                                    ? "bg-rose-50 text-rose-700 border-rose-200/60"
                                                    : "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                                                }`}
                                              >
                                                {(p as any).status}
                                              </span>
                                            ) : (
                                              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                                Active
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                                            <span className="font-mono text-slate-600">
                                              SKU: {pSku}
                                            </span>
                                            <ProductStockLabel
                                              qty={p.stockQty}
                                              unit={pUnit}
                                            />
                                            {p.hsnCode && (
                                              <span className="text-slate-400 font-mono text-[10px]">
                                                • HSN: {p.hsnCode}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="font-bold text-[#33077C] text-xs">
                                          ₹
                                          {pPrice.toLocaleString(
                                            "en-IN",
                                          )}
                                        </span>
                                        {isSelected && (
                                          <Check className="w-4 h-4 text-[#33077C] stroke-[2.5]" />
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                        <FormError
                          message={formErrors[`items.${idx}.product`]}
                        />
                      </div>
                    </td>

                    {/* 2. Batch No */}
                    <td className="px-3 py-3.5 align-top border border-slate-200">
                      {(() => {
                        if (!item.productId) {
                          return (
                            <input
                              type="text"
                              disabled
                              placeholder="—"
                              className="w-full h-10 px-2 bg-slate-100/60 border border-slate-200 rounded-xl text-xs font-medium text-center text-slate-400 cursor-not-allowed"
                            />
                          );
                        }
                        const prod = availableProducts.find(
                          (p) => p.id === item.productId,
                        );
                        // Batches of THIS product from the backend stock; the local product
                        // list is only a fallback until the stock has loaded.
                        const stockBatches = getStockBatches(
                          item.productId,
                        );
                        const batches: any[] =
                          stockBatches.length > 0
                            ? stockBatches
                            : prod?.batches || [];
                        if (batches.length > 0) {
                          const batchAvail = getBatchAvailable(
                            item.productId,
                            item.batch,
                          );
                          return (
                            <>
                              <SearchableSelect
                                value={item.batch || ""}
                                onChange={(val) =>
                                  handleItemBatchChange(idx, val)
                                }
                                options={batches.map((b: any) => ({
                                  value: b.batchNo,
                                  label: b.batchNo,
                                  subLabel: `${b.quantity} in stock${b.expDate ? ` • Exp: ${b.expDate}` : ""}`,
                                  badge: `${b.quantity} in stock`,
                                }))}
                                placeholder="Select Batch..."
                                searchPlaceholder="Search batch..."
                                size="md"
                                triggerClassName="bg-purple-50/60 hover:bg-purple-50 text-[#33077C] font-bold border-purple-200 hover:border-purple-300"
                              />
                              {batchAvail !== null && (
                                <p className="mt-1 text-[10px] font-semibold text-slate-500 text-center">
                                  {batchAvail} in stock
                                </p>
                              )}
                            </>
                          );
                        }
                        return (
                          <input
                            type="text"
                            value={item.batch || ""}
                            onChange={(e) =>
                              setFormData((prev) => {
                                const copy = [...prev.items];
                                copy[idx] = {
                                  ...copy[idx],
                                  batch: e.target.value,
                                };
                                return { ...prev, items: copy };
                              })
                            }
                            placeholder="Batch No"
                            className="w-full h-10 px-2.5 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] rounded-xl text-xs font-bold text-center text-[#33077C] focus:ring-3 focus:ring-[#4309A2]/10 outline-none shadow-2xs transition-all"
                          />
                        );
                      })()}
                    </td>

                    {/* 2. QTY */}
                    <td className="px-2 py-3.5 align-top border border-slate-200">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        {...fieldAttr(`items.${idx}.quantity`)}
                        onKeyDown={handleNonNegativeKeyDown}
                        onChange={(e) =>
                          handleItemFieldChange(
                            idx,
                            "quantity",
                            Number(e.target.value),
                          )
                        }
                        className={`w-full h-10 px-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] rounded-xl text-xs font-semibold text-center text-slate-800 focus:ring-3 focus:ring-[#4309A2]/10 outline-none shadow-2xs transition-all ${formErrors[`items.${idx}.quantity`] || liveStockErrors[`items.${idx}.quantity`] ? FORM_ERROR_INPUT_CLS : ""}`}
                      />
                      <FormError
                        message={
                          formErrors[`items.${idx}.quantity`] ||
                          liveStockErrors[`items.${idx}.quantity`]
                        }
                      />
                    </td>

                    {/* 3. GST (%) */}
                    <td className="px-2 py-3.5 align-top border border-slate-200">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        disabled={!formData.withGst}
                        value={formData.withGst ? item.taxPercent : 0}
                        {...fieldAttr(`items.${idx}.taxPercent`)}
                        onKeyDown={handleNonNegativeKeyDown}
                        onChange={(e) =>
                          handleItemFieldChange(
                            idx,
                            "taxPercent",
                            Number(e.target.value),
                          )
                        }
                        className={`w-full h-10 px-2 text-center rounded-xl text-xs font-semibold outline-none shadow-2xs transition-all ${
                          formData.withGst
                            ? "bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] text-slate-800 focus:ring-3 focus:ring-[#4309A2]/10"
                            : "bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed"
                        }`}
                      />
                      <FormError
                        message={
                          formErrors[`items.${idx}.taxPercent`]
                        }
                      />
                    </td>

                    {/* 4. PRICE */}
                    <td className="px-2 py-3.5 align-top border border-slate-200">
                      <input
                        type="number"
                        min="0"
                        value={item.unitPrice}
                        {...fieldAttr(`items.${idx}.price`)}
                        onKeyDown={handleNonNegativeKeyDown}
                        onChange={(e) =>
                          handleItemFieldChange(
                            idx,
                            "unitPrice",
                            Number(e.target.value),
                          )
                        }
                        className={`w-full h-10 px-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] rounded-xl text-xs font-bold text-center text-slate-800 focus:ring-3 focus:ring-[#4309A2]/10 outline-none shadow-2xs transition-all ${formErrors[`items.${idx}.price`] ? FORM_ERROR_INPUT_CLS : ""}`}
                      />
                      <FormError
                        message={formErrors[`items.${idx}.price`]}
                      />
                    </td>

                    {/* 5. DISCOUNT (%) */}
                    <td className="px-1.5 py-3.5 align-top border border-slate-200">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={
                          item.discountPercent === 0
                            ? ""
                            : item.discountPercent || ""
                        }
                        {...fieldAttr(`items.${idx}.discountPercent`)}
                        onKeyDown={handleNonNegativeKeyDown}
                        onChange={(e) =>
                          handleItemFieldChange(
                            idx,
                            "discountPercent",
                            Number(e.target.value),
                          )
                        }
                        placeholder="0"
                        className={`w-full h-10 px-1 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] rounded-xl text-xs font-semibold text-center text-slate-800 focus:ring-3 focus:ring-[#4309A2]/10 outline-none shadow-2xs transition-all ${formErrors[`items.${idx}.discountPercent`] ? FORM_ERROR_INPUT_CLS : ""}`}
                      />
                      <FormError
                        message={
                          formErrors[`items.${idx}.discountPercent`]
                        }
                      />
                    </td>

                    {/* 6. DISCOUNT (AMOUNT) */}
                    <td className="px-1.5 py-3.5 align-top border border-slate-200">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={
                          item.discountAmount === 0
                            ? ""
                            : item.discountAmount || ""
                        }
                        {...fieldAttr(`items.${idx}.discountAmount`)}
                        onKeyDown={handleNonNegativeKeyDown}
                        onChange={(e) =>
                          handleItemFieldChange(
                            idx,
                            "discountAmount",
                            Number(e.target.value),
                          )
                        }
                        placeholder="0.00"
                        className={`w-full h-10 px-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] rounded-xl text-xs font-semibold text-center text-slate-800 focus:ring-3 focus:ring-[#4309A2]/10 outline-none shadow-2xs transition-all ${formErrors[`items.${idx}.discountAmount`] ? FORM_ERROR_INPUT_CLS : ""}`}
                      />
                      <FormError
                        message={
                          formErrors[`items.${idx}.discountAmount`]
                        }
                      />
                    </td>

                    {/* 6. TOTAL */}
                    <td className="px-2 py-3.5 align-top border border-slate-200">
                      <div className="h-10 flex items-center justify-center">
                        <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100/90 font-bold text-xs shadow-2xs font-sans min-w-[90px] text-center">
                          ₹
                          {item.total.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </td>

                    {/* 7. ACTION */}
                    <td className="px-2 py-3.5 align-top border border-slate-200">
                      <div className="h-10 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all cursor-pointer"
                          title="Delete Line Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* + Add Item Button */}
      <div className="pt-1">
        <button
          type="button"
          onClick={handleAddItemRow}
          className="h-10 px-5 bg-[#33077C] hover:bg-[#4309A2] text-white rounded-xl text-xs sm:text-[13px] font-bold flex items-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Item</span>
        </button>
        <div {...fieldAttr("items")}>
          <FormError message={formErrors.items} />
        </div>
      </div>
    </div>
  );
};
