# Backend Calculation Specification (Sales, Purchase, Payments & Client Management)

**Audience**: Backend developers and API engineers.  
**Purpose**: Mandate server-side recalculation of all financial calculations across every module in the application. Establish the backend as the single source of truth for all computed values. The backend MUST recalculate all values from raw inputs, ignoring any pre-calculated totals passed by the frontend in request payloads, and return the official calculated values in the response. The frontend displays backend-calculated values only.

---

## CRITICAL ARCHITECTURAL DIRECTIVE: MANDATORY BACKEND RECALCULATION & SINGLE SOURCE OF TRUTH

> [!IMPORTANT]
> ### 1. Zero Trust for Client-Supplied Calculation Totals
> - The frontend currently sends request payloads that may include computed fields such as `subtotal`, `taxableAmount`, `totalTax`, `cgst`, `sgst`, `igst`, `roundOff`, `grandTotal`, `paidAmount`, `balanceDue`, and line-level `lineTotal`.
> - **The backend MUST NOT blindly trust, persist, or pass through any calculation values received in request payloads.**
> - The backend **MUST independently recompute every single calculation** from the fundamental inputs: line-item `quantity`, `unitPrice`, line discounts, line `taxPercent`, `isTaxInclusive`, `overallDiscount`, `shippingCharges`, `otherCharges`, `roundMode` / `manualRoundOff`, and place of supply.
> - Client-passed totals in create/update payloads must be treated purely as advisory/preview artifacts or ignored entirely during persistence.
> 
> ### 2. Response Authority
> - Every API response for created, updated, fetched, or listed documents (Invoices, Quotations, Proformas, Sales Orders, Purchase Bills, Challans, Payments, etc.) **MUST return backend-calculated totals and line breakdowns**.
> - The frontend UI across all modules will bind and display these returned values directly, eliminating discrepancies between client state and database state.
> 
> ### 3. Uniformity Across All Modules
> This recalculation and server-side authority applies universally across:
> - **Sales Hub**: Sales Invoices, Sale Orders, Proforma Invoices, Estimates / Quotations, Delivery Challans, Sales Returns.
> - **Purchase Hub**: Purchase Requests, Purchase Orders, Purchase Bills, Purchase Returns, Vendor Expenses.
> - **Client Management (CRM)**: Invoices (`/platform/invoices`), Proformas (`/platform/proforma-invoices`), Quotations (`/platform/quotes`).
> - **Payments & Collections**: Payment In, Payment Out, Allocation to Documents, Customer Ledger & Outstanding, Supplier Ledger & Payables.
> - **Inventory & Stocks**: Valuation, weighted average cost, on-hand value.
> - **Dashboards & Analytics**: KPI summary cards, aging buckets, tax reports.

Source of truth for the calculation formulas below (referenced from existing frontend logic):
- `src/utils/financialCalculations.ts` (document, line-item, GST, rounding, payment status)
- `src/utils/outstandingBalance.ts` (customer outstanding, sales representative metrics)
- `src/views/invoices/NewInvoiceView.tsx` (CRM invoice/proforma/quotation create screen)
- `src/views/sale-management/sales-hub/` (Sales Hub transaction forms & calculations)
- `src/views/purchase/` (Purchase transaction forms & calculations)

---

## 1. Where calculations are needed

| Area | Documents / screens | Needs |
|---|---|---|
| Sales | Sales Invoice, Sale Order, Proforma Invoice, Estimate / Quotation, Delivery Challan, Sales Return | line totals, discount, GST, grand total, round-off, paid, balance |
| Purchase | Purchase Order, Purchase Request, Purchase Return, Payment Out, Expense | line totals, GST, grand total, paid, balance |
| Client management (CRM) | Invoice, Proforma Invoice, Quotation | discount, GST (CGST/SGST/IGST), grand total, round-off, payments |
| Payments | Payment In, Collections, Payments, Pending Dues | received amounts, allocation, outstanding |
| Customers | Customer list / detail | outstanding balance, credit limit, available credit |
| Sales representatives | Rep list / detail | outstanding, collected, collection rate |
| Inventory | Stocks, Inventory report | stock quantity and value |
| Reports / dashboards | Sales report, Sale management reports, dashboards | aggregates (sums, counts, group by) |

---

## 2. Rounding and number rules (apply everywhere)

- All money values are stored and returned as numbers with **2 decimal places** (`round2`).
- `round2(x) = Math.round((x + Number.EPSILON) * 100) / 100` (half-up). In Java use `BigDecimal` with `RoundingMode.HALF_UP`, scale 2. Do not use `double` for money.
- Intermediate percentages may use 4 decimals (`round4`).
- Invalid / empty / null numeric input is treated as `0`.
- Quantity, unit price, tax percent are clamped to `>= 0`.
- Round each **line** to 2 decimals first, then sum the lines. Do not round only the final total.

---

## 3. Line item calculation

Input per line: `quantity`, `unitPrice`, `discountPercent?`, `discountAmount?`, `taxPercent?`, `isTaxInclusive?`.
Document flags: `withGst` (default true), `gstType` (see section 4).

```
gross            = round2(quantity * unitPrice)

# Discount (fixed amount wins over percent)
if discountAmount > 0:
    discountAmount  = min(gross, round2(discountAmount))
    discountPercent = gross > 0 ? round2(discountAmount / gross * 100) : 0
else if discountPercent > 0:
    discountPercent = clamp(discountPercent, 0, 100)
    discountAmount  = round2(gross * discountPercent / 100)
else:
    both 0
```

### 3.1 GST-exclusive price (default)

```
taxable   = max(0, gross - discountAmount)
taxAmount = (withGst and taxPercent > 0) ? round2(taxable * taxPercent / 100) : 0
lineTotal = round2(taxable + taxAmount)
```

### 3.2 GST-inclusive price (`isTaxInclusive = true`, `withGst`, `taxPercent > 0`)

```
netInclusive = max(0, gross - discountAmount)
taxable      = round2(netInclusive / (1 + taxPercent / 100))
taxAmount    = round2(netInclusive - taxable)
lineTotal    = netInclusive
```

### 3.3 Tax split per line

```
if withGst and taxAmount > 0:
    if gstType == INTRA_STATE:
        cgst = round2(taxAmount / 2)
        sgst = round2(taxAmount - cgst)      # guarantees cgst + sgst == taxAmount
        igst = 0
    else:                                    # INTER_STATE
        igst = taxAmount
        cgst = sgst = 0
```

**Important: GST is always calculated on the amount AFTER discount (`taxable`), never on `gross`.**

---

## 4. GST type (CGST+SGST vs IGST)

```
companyStateCode = state code of the seller (default "33" = Tamil Nadu)
stateOfSupply    = customer / place-of-supply state, e.g. "33-Tamil Nadu"

if stateOfSupply is empty                      -> INTRA_STATE
if stateOfSupply starts with 2 digits:
      code == companyStateCode                 -> INTRA_STATE
      else                                     -> INTER_STATE
if stateOfSupply contains "tamil nadu" or == "tn" -> INTRA_STATE
else                                           -> INTER_STATE
```

Tax rate parsing (`parseTaxRate`): accepts number or text such as `"GST@18%"`, `"18%"`, `"5"`. Text containing `exempt`, `nil` or `zero` -> `0`. If nothing parses -> default `18`.

---

## 5. Document totals

Input: lines (section 3) plus `overallDiscount?`, `shippingCharges?`, `otherCharges?`, `roundMode?`, `manualRoundOff?`, `paidAmount?`.

```
subtotal          = round2(sum(line.gross))
lineDiscountTotal = round2(sum(line.discountAmount))
unadjustedTaxable = round2(sum(line.taxable))
```

### 5.1 Overall (document-level) discount

Reduces the taxable base **before** GST, allocated pro-rata across lines.

```
overallDiscount = min(unadjustedTaxable, round2(max(0, overallDiscount)))
totalDiscount   = round2(lineDiscountTotal + overallDiscount)

if overallDiscount > 0 and unadjustedTaxable > 0:
    for each line i (last line takes the remainder so shares add up exactly):
        share_i   = (i is last) ? round2(overallDiscount - sum(previous shares))
                                : round2(line.taxable / unadjustedTaxable * overallDiscount)
        taxable_i = max(0, round2(line.taxable - share_i))
        tax_i     = (withGst and taxPercent > 0) ? round2(taxable_i * taxPercent / 100) : 0
        split tax_i into cgst/sgst or igst (section 3.3)
        lineTotal_i = round2(taxable_i + tax_i)
    taxableAmount = round2(sum(taxable_i))
    totalTax      = round2(sum(tax_i))
else:
    taxableAmount = unadjustedTaxable
    totalTax      = round2(sum(line.taxAmount))
```

### 5.2 Tax breakdown

```
if withGst and totalTax > 0:
    INTRA_STATE: cgst = round2(totalTax / 2); sgst = round2(totalTax - cgst); igst = 0
    INTER_STATE: igst = totalTax; cgst = sgst = 0
```

### 5.3 Charges, round-off, grand total

```
shippingCharges = max(0, round2(shippingCharges))
otherCharges    = max(0, round2(otherCharges))
unroundedTotal  = round2(taxableAmount + totalTax + shippingCharges + otherCharges)

if manualRoundOff provided:
    roundOff   = round2(manualRoundOff)
    grandTotal = max(0, round2(unroundedTotal + roundOff))
else switch roundMode:
    "auto" : grandTotal = max(0, round(unroundedTotal));  roundOff = round2(grandTotal - unroundedTotal)
    "up"   : grandTotal = max(0, ceil(unroundedTotal));   roundOff = round2(grandTotal - unroundedTotal)
    "down" : grandTotal = max(0, floor(unroundedTotal));  roundOff = round2(grandTotal - unroundedTotal)
    "none" : roundOff = 0; grandTotal = unroundedTotal      # default
```

`roundOff` is signed: negative when rounded down, positive when rounded up.

### 5.4 Paid amount, balance, payment status

```
paidAmount = min(grandTotal, round2(max(0, paidAmount)))
balance    = max(0, round2(grandTotal - paidAmount))

if grandTotal > 0 and balance <= 0 and paidAmount >= grandTotal : "Paid"
else if paidAmount > 0                                           : "Partial"
else                                                             : "Unpaid"
```

### 5.5 Fields the API should return for every sales / purchase document

```
totalQty, subtotal, lineDiscountTotal, overallDiscount, totalDiscount,
taxableAmount            (this is "Amount (After Discount)" on the screens),
totalTax, cgst, sgst, igst, shippingCharges, otherCharges,
unroundedTotal, roundOff, grandTotal, paidAmount, balance, paymentStatus,
items[]: { quantity, unitPrice, grossAmount, discountPercent, discountAmount,
           taxableAmount, taxPercent, taxAmount, cgst, sgst, igst, lineTotal }
```

Reconciliation that must always hold:
`grandTotal = subtotal - totalDiscount + totalTax + shippingCharges + otherCharges + roundOff`

---

## 6. Differences found in the CRM invoice / quotation screen

`NewInvoiceView.tsx` (CRM) currently uses a simpler version of the same rules. When the backend takes over, use **section 3-5 for everything** so the two sides stop disagreeing:

| Topic | CRM screen today | Backend should do |
|---|---|---|
| Intra/inter state | Always shows CGST + SGST (half/half) | Decide using section 4 and return IGST when inter-state |
| Rounding | Only `none`, `up`, `down` and only on the final total | Support `none/up/down/auto` and `manualRoundOff` |
| Line rounding | Unrounded floats, sums at the end | Round each line to 2 decimals first |
| Overall discount | Not supported (line discount only) | Support `overallDiscount` (section 5.1) |
| Percent discount | `toFixed(2)` | `round2` half-up |
| Fixed discount cap | Capped at gross | Same |

### Known issue to verify in the backend

An invoice was seen with: rate 1,000, discount 50, GST 18%.
- Line CGST + SGST shown = 85.50 + 85.50 = **171.00** (correct: 950 x 18%).
- "GST Total" = **180.00** and "Grand Total" = **1,130.00**, which is GST calculated on the **gross** 1,000.

Correct values are taxable 950.00, GST 171.00, grand total **1,121.00**. The backend must calculate GST on the discounted amount and store the same GST on the line and in the totals. Please check whether existing documents were saved with GST on gross.

---

## 7. Customer outstanding balance

```
openingBalance     = max(0, customer.openingBalance)
totalSalesAmount   = sum(invoice.grandTotal)                         # over valid invoices
invoicePaidAmount  = sum(invoice.paidAmount)
invoiceBalanceSum  = sum(invoice.balance ?? max(0, grandTotal - paidAmount))

totalReturnAmount  = sum(return.returnAmount)
totalRefunded      = sum(return.refundAmount) where refundStatus in ("Refunded","Store Credit")
netCreditReturns   = max(0, totalReturnAmount - totalRefunded)

unallocatedPayments = sum(payment.receivedAmount ?? payment.amount) where payment.invoiceId is null

totalPaidAmount    = invoicePaidAmount + unallocatedPayments
outstanding        = max(0, openingBalance + invoiceBalanceSum - netCreditReturns - unallocatedPayments)

# no transactions at all for the customer:
if no invoices, returns or payments:
    outstanding = customer.outstandingAmount > 0 ? that value : openingBalance

creditLimit              = max(0, customer.creditLimit)
availableCredit          = max(0, creditLimit - outstanding)
creditUtilizationPercent = creditLimit > 0 ? min(100, outstanding / creditLimit * 100) : 0
```

Which records count:

- Invoices: exclude `saleStatus`/`status` = `Cancelled` or `Void`.
- Returns: exclude `returnStatus` = `Rejected` or `Cancelled`.
- Payments: exclude `status` = `Cancelled` or `Rejected`.
- Match a document to a customer by `customerId` only. Use name / code only for old records that have no id.
- Optional filters: `organizationId`, `subOrganizationId`, `branchId`, `status`, date range (`saleDate`/`invoiceDate`, `returnDate`, `paymentDate`).
- Payments linked to an invoice are already inside `invoice.paidAmount` / `balance`. Only unallocated payments are subtracted again. This prevents double counting.

Return fields: `totalSalesAmount, totalPaidAmount, invoiceBalanceSum, openingBalance, totalReturnAmount, netCreditReturns, unallocatedPayments, outstandingAmount, totalSalesCount, totalReturnsCount, creditLimit, availableCredit, creditUtilizationPercent`.

---

## 8. Sales representative metrics

A representative's customers are the customers whose record has that `salesRepresentativeId` (fallback: `salesRepresentativeName`, then the assignment table). Invoices belong to the rep through the **customer assignment**, not through the invoice.

```
for each assigned customer c: metrics_c = customer outstanding (section 7)

totalOutstanding      = sum(metrics_c.outstandingAmount)
totalCollected        = sum(metrics_c.totalPaidAmount)
customersCount        = number of assigned customers
invoicesCount         = number of non-cancelled invoices of assigned customers
collectionRatePercent = (totalCollected + totalOutstanding) > 0
                          ? totalCollected / (totalCollected + totalOutstanding) * 100
                          : 0
```

Per-invoice status for the rep screen:
`balance <= 0 -> "Paid"`, `paid > 0 -> "Partial"`, otherwise `"Pending"`.

---

## 9. Inventory and reports

These screens only aggregate stored values. The backend should expose them as endpoints (group by, date range, scope filters) instead of the frontend summing lists:

- **Stock value** = `sum(stockQuantity * purchasePrice)` per product / category / warehouse (confirm the cost basis you want).
- **Sales / purchase reports and dashboards**: `sum(grandTotal)`, `sum(paidAmount)`, `sum(balance)`, counts, top customers / products, grouped by day / month / customer / product / representative.
- **Today's totals**: filter by the document date in the business time zone.
- Exclude cancelled / void / rejected records from every total.
- All scope filters (organization, sub-organization, branch) must apply to every aggregate.

---

## 10. API Contract & Recalculation Flow (Module-by-Module)

### 10.1 Request Payload Handling vs Backend Recalculation

For every create (`POST`) and update (`PUT`/`PATCH`) endpoint across all modules:
1. **Frontend Request Payload**: May pass line items and charge fields. Even if the payload includes computed fields (`subtotal`, `taxableAmount`, `totalTax`, `cgst`, `sgst`, `igst`, `roundOff`, `grandTotal`, `paidAmount`, `balanceDue`, `lineTotal`), the **backend must overwrite them with its own recalculated values**.
2. **Minimal Required Inputs from Client**:
   - `items`: array of `{ productId/id, quantity, unitPrice, discountPercent?, discountAmount?, taxPercent?, isTaxInclusive? }`
   - `overallDiscount`: `{ type: "percent" | "fixed", value: number }` (or direct amount)
   - `shippingCharges`: `number` (optional, default 0)
   - `otherCharges`: `number` (optional, default 0)
   - `roundMode`: `"auto" | "up" | "down" | "none"` or `manualRoundOff: number`
   - `stateOfSupply`: string (e.g. `"33-Tamil Nadu"`, used to determine Intra vs Inter GST)
   - `withGst`: boolean (default true)
3. **Backend Execution Sequence**:
   1. Validate inputs (positive rates/quantities, valid discount ranges).
   2. Fetch authoritative product GST rates or use provided line `taxPercent`.
   3. Execute line item calculations (Sections 3 & 4).
   4. Distribute overall discount pro-rata across eligible lines (Section 5.1).
   5. Recompute taxable and GST per line (intra vs inter-state).
   6. Aggregate subtotal, total discount, taxable amount, tax components (CGST, SGST, IGST).
   7. Apply shipping/other charges and compute round-off (Section 5.3 & 5.4).
   8. Compute `grandTotal` and verify / compute `balanceDue = grandTotal - paidAmount`.
   9. Persist the authoritative recalculated values.
   10. Return the full calculation tree in the response.

### 10.2 Standard Response Contract

Every document response (`GET`, `POST`, `PUT`) must return the full calculated fields:

```json
{
  "id": "doc-uuid",
  "documentNumber": "INV-2026-0001",
  "status": "Issued",
  "paymentStatus": "Unpaid",
  
  "items": [
    {
      "id": "line-uuid",
      "productId": "prod-uuid",
      "quantity": 2,
      "unitPrice": 1000.00,
      "discountPercent": 10.00,
      "discountAmount": 200.00,
      "grossAmount": 2000.00,
      "taxableAmount": 1800.00,
      "taxPercent": 18.00,
      "isTaxInclusive": false,
      "taxAmount": 324.00,
      "cgst": 162.00,
      "sgst": 162.00,
      "igst": 0.00,
      "lineTotal": 2124.00
    }
  ],

  "subtotal": 2000.00,
  "totalDiscount": 200.00,
  "taxableAmount": 1800.00,
  "totalTax": 324.00,
  "cgst": 162.00,
  "sgst": 162.00,
  "igst": 0.00,
  "shippingCharges": 0.00,
  "otherCharges": 0.00,
  "roundOff": 0.00,
  "roundMode": "auto",
  "grandTotal": 2124.00,
  
  "paidAmount": 0.00,
  "balanceDue": 2124.00
}
```

*Note*: The frontend displays `taxableAmount` as "Amount (After Discount)".

### 10.3 Calculation Endpoints Across All Application Modules

| Module | Document / Endpoint | Backend Recalculation Responsibility |
|---|---|---|
| **Client Management (CRM)** | `/platform/invoices`<br>`/platform/proforma-invoices`<br>`/platform/quotes` | Recompute lines, GST split (Intra/Inter), overall discount, round-off, grand total, balance due, payment status. |
| **Sales Hub** | `/sales/invoices`<br>`/sales/orders`<br>`/sales/proformas`<br>`/sales/estimates`<br>`/sales/challans`<br>`/sales/returns` | Recompute all gross/taxable/tax/total amounts. For Sales Returns, recalculate return credit against original invoice line prices and deduct from outstanding balance. |
| **Purchase Hub** | `/purchase/bills`<br>`/purchase/orders`<br>`/purchase/requests`<br>`/purchase/returns`<br>`/purchase/expenses` | Recompute input tax credits (ITC GST split), line totals, vendor payable balances, expense distributions. |
| **Payments & Collections** | `/payments/in`<br>`/payments/out`<br>`/payments/allocations` | Calculate payment allocations across unpaid documents in FIFO or manual order. Recalculate document `paidAmount`, `balanceDue`, and `paymentStatus` atomically. Recalculate customer/vendor ledger balances. |
| **Customer Ledger & Reps** | `/customers/{id}/outstanding`<br>`/sales-reps/{id}/metrics` | Recalculate total billed, total collected, net returns, unallocated payments, outstanding balance, credit limit utilization, and collection rates dynamically from transaction records. |
| **Calculation Preview** | `POST /{module}/calculate` (e.g. `/sales/invoices/calculate`, `/platform/quotes/calculate`) | Recommended preview endpoint: takes current form input payload, executes full calculation logic, and returns the calculated response *without persisting to DB*, enabling real-time instant calculation previews in frontend forms. |

---

## 11. Worked examples

### Example A: single line, intra-state, line discount

Quantity 1, rate 1,000, discount 50 (amount), GST 18%.

```
gross 1000.00, discount 50.00, taxable 950.00
tax 171.00 -> cgst 85.50, sgst 85.50
subtotal 1000.00, totalDiscount 50.00, taxableAmount 950.00, totalTax 171.00
grandTotal 1121.00
```

### Example B: two lines with an overall discount

Line 1: 2 x 500 = 1,000, GST 18%. Line 2: 1 x 1,000, GST 5%. Overall discount 200. Intra-state.

```
taxable before overall discount: 1000.00 + 1000.00 = 2000.00
shares: line 1 = round2(1000/2000*200) = 100.00 ; line 2 = 200 - 100 = 100.00
line 1: taxable 900.00, tax 162.00 (18%)
line 2: taxable 900.00, tax 45.00  (5%)
taxableAmount 1800.00, totalTax 207.00 (cgst 103.50, sgst 103.50)
unroundedTotal 2007.00 ; roundMode none -> grandTotal 2007.00
```

### Example C: inter-state, round up

One line taxable 333.33, GST 18%, state of supply `29-Karnataka`.

```
tax = round2(333.33 * 0.18) = 60.00 -> igst 60.00, cgst 0, sgst 0
unroundedTotal 393.33 ; roundMode up -> grandTotal 394.00, roundOff +0.67
```

### Example D: customer outstanding

Opening balance 1,000. Invoices: A (grand 5,000, paid 2,000, balance 3,000), B (grand 2,000, paid 0, balance 2,000). Return (amount 500, refund status Pending). Unallocated payment 700.

```
invoiceBalanceSum = 5000
netCreditReturns  = 500
outstanding       = max(0, 1000 + 5000 - 500 - 700) = 4800
totalPaidAmount   = 2000 + 700 = 2700
```

---

## 12. Suggested tests for the backend

1. Discount then GST: rate 1,000, discount 50, GST 18% -> grand total 1,121.00 (not 1,130.00).
2. Percent discount and amount discount give identical results when equal.
3. GST-inclusive price: gross 118, GST 18% -> taxable 100.00, tax 18.00, total 118.00.
4. Pro-rata overall discount: shares always sum exactly to the discount (last line takes the remainder).
5. CGST + SGST always equals total tax (odd paise go to SGST).
6. Round up / down / auto and manual round-off keep `grandTotal >= 0`.
7. Payment status transitions: Unpaid -> Partial -> Paid, and back when a payment is cancelled.
8. Customer outstanding does not double count invoice-linked payments.
9. Cancelled / void documents are excluded from every total.
10. Inter-state returns IGST only; intra-state returns CGST + SGST only.
