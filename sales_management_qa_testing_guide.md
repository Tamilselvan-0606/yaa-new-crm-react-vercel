# YAA CRM — Complete Business Flow Guide & Scenarios: Inventory, Purchase & Sales Hub

This comprehensive manual provides an end-to-end breakdown of every sub-module in **Inventory**, **Purchase**, and **Sales Hub**, along with **all 8 real-world operational scenarios** from supplier procurement to customer billing.

---

## 1. Master Architecture & Complete Business Lifecycle

```mermaid
graph TD
    classDef master fill:#ede9fe,stroke:#6d28d9,stroke-width:2px;
    classDef purchase fill:#fef3c7,stroke:#d97706,stroke-width:2px;
    classDef inventory fill:#d1fae5,stroke:#059669,stroke-width:2px;
    classDef sales fill:#e0f2fe,stroke:#0284c7,stroke-width:2px;

    %% 1. Masters
    CAT[Category & Subcategory]:::master --> PROD[Product Master<br/>• Cost: ₹500 | Sale: ₹800<br/>• Tax: 18% | SKU: KRT-001]:::master
    SUP[Supplier Master<br/>YAA Textiles]:::master
    CUST[Customer Master<br/>Apex Corp]:::master

    %% 2. Inbound Purchase
    PR[1. Purchase Request<br/>100 units requested]:::purchase -->|Manager Approves| APPR[Approved Requisition]:::purchase
    APPR -->|Convert| PB[2. Purchase Bill<br/>Pending ➔ Ordered ➔ Received]:::purchase
    SUP --> PB
    PROD --> PB
    PB -->|Mark Received| STK[(3. Inventory Batches<br/>+100 units in stock<br/>Batch: BAT-2026-01)]:::inventory
    PB -->|Settle| POUT[4. Payment Out<br/>₹59,000 paid to Supplier]:::purchase
    PB -.->|Damaged Goods| PRET[5. Purchase Return<br/>Debit Note to Supplier]:::purchase

    %% 3. Outbound Sales
    PROD --> EST
    CUST --> EST
    EST[6. Estimate / Quotation<br/>50 units @ ₹800]:::sales -->|Convert| PI[7. Proforma Invoice<br/>Advance commercial agreement]:::sales
    PI -->|Convert| SO[8. Sale Order<br/>Order Confirmed]:::sales
    SO -->|Convert| DC[9. Delivery Challan<br/>Goods Dispatched<br/>Vehicle: TN-09-AB-1234]:::sales
    DC -->|Convert| INV[10. Sales Invoice / Bill<br/>Official Tax Bill]:::sales
    STK -->|Depletes 50 units| INV
    INV -->|Receipt| PIN[11. Payment In / Collections<br/>₹47,200 collected]:::sales
    INV -.->|Customer Return| CN[12. Credit Note / Sales Return<br/>Defective goods returned]:::sales
```

---

## 2. Walkthrough Example Reference

Throughout this guide, we trace one complete product journey:
* **Product:** *Premium Cotton Kurti* | **SKU:** `KRT-2026-001`
* **Default Purchase Cost:** ₹500.00
* **Default Selling Price:** ₹800.00
* **Tax:** GST @ 18% | **HSN:** 6204
* **Supplier:** *YAA Textiles Ltd* (Chennai, Tamil Nadu)
* **Customer:** *Apex Hospitality Corp* (Chennai, Tamil Nadu)

---

## 3. Top-to-Bottom Sub-Module Explanations

### A. INVENTORY MODULE (The Foundation)
1. **Category & Subcategory (`Inventory ➔ Categories / Subcategory`):**
   * Establishes product classifications (e.g., `Apparel` ➔ `Women Ethnic Wear`).
   * Used for search filtering, reporting, and accounting categorization.
2. **Product Master (`Inventory ➔ Products`):**
   * Sets the product identity, SKU, unit (`PCS`), tax rate (`18% GST`), and dual pricing:
     * **Purchase Price (₹500.00):** Auto-fills on Purchase Bills.
     * **Sale Price (₹800.00):** Auto-fills on Quotes, Orders, and Sales Invoices.
3. **Stock & Batches (`Inventory ➔ Stock`):**
   * Live physical stock ledger showing quantities on hand, batch numbers (`BAT-2026-001`), and manufacturing/expiry dates.
   * Incremented automatically when Purchase Bills are **Received**.
   * Decremented automatically when Sales Invoices are **Generated**.

---

### B. PURCHASE MODULE (Inbound Procurement)
1. **Supplier Master (`Purchase ➔ Supplier`):**
   * Vendor profiles, GSTIN, payment terms, and phone validation (10 digits starting with 6–9).
2. **Purchase Request (`Purchase ➔ Purchase Request`):**
   * Internal department requisition for low stock.
   * Review workflow: `Pending Approval` ➔ `Approved` or `Rejected` (with mandatory reason).
3. **Purchase Bills (`Purchase ➔ Purchase Bills`):**
   * Inbound purchase invoices.
   * Selecting **"With Purchase Request"** displays **only pending/approved requests**. Once converted, requests change to `Purchase Created` and vanish from future bill dropdowns.
   * Operational Status: `Pending` ➔ `Approved` ➔ `Ordered` ➔ `Received` *(Receives stock into warehouse and locks bill)*.
   * Financial Status: `Unpaid` ➔ `Partial` ➔ `Paid`.
4. **Payment Out (`Purchase ➔ Payment Out`):**
   * Records wire transfers, cheques, or cash paid to vendors against unpaid bills.
5. **Purchase Return (`Purchase ➔ Purchase Return`):**
   * Returns defective goods back to the supplier, creates a debit note, and deducts defective stock.
6. **Expense (`Purchase ➔ Expense`):**
   * Tracks overhead costs (freight, packaging, transport, office utilities).

---

### C. SALES HUB MODULE (Outbound Customer Flow)
1. **Customer Master (`Sales Hub ➔ Customer`):**
   * Client accounts, GSTIN, credit limits, and addresses.
2. **Estimate / Quotation (`Sales Hub ➔ Estimate / Quotation`):**
   * Official price proposal (`Draft` ➔ `Sent` ➔ `Accepted`). Can convert to Proforma, Sale Order, or direct Invoice.
3. **Proforma Invoice (`Sales Hub ➔ Proforma Invoice`):**
   * Advance commercial invoice for payment terms or client purchase order approval.
4. **Sale Order (`Sales Hub ➔ Sale Order`):**
   * Confirmed client order booking. Supports single or bulk conversion to invoices.
5. **Delivery Challan (`Sales Hub ➔ Delivery Challan`):**
   * Dispatch note and vehicle gate pass (Vehicle No., Driver Name, Driver Phone).
6. **Sales Invoice / Bill (`Sales Hub ➔ Sales / Bills`):**
   * Official legal tax invoice. Deducts warehouse stock and updates customer receivables.
7. **Payment In (`Sales Hub ➔ Payment In`):**
   * Customer collection receipts (Cash, UPI, NEFT) clearing invoice balances to ₹0.00.
8. **Credit Note (`Sales Hub ➔ Sales / Bills ➔ Convert to Return`):**
   * Sales return for defective goods, reducing customer balance.

---

## 4. ALL 8 Real-World Business Working Scenarios

Test every scenario to ensure complete coverage of the application:

---

### Scenario 1: Complete Enterprise B2B Cycle (Full 6-Stage Fulfillment)
* **Workflow:** `Estimate ➔ Proforma ➔ Sale Order ➔ Delivery Challan ➔ Sales Invoice ➔ Payment In`
* **Story:** *Apex Hospitality Corp* requests 100 Kurtis. They need a quote, an advance proforma for procurement board sign-off, a confirmed sale order, warehouse dispatch with gate pass, final tax bill, and payment settlement.
* **Execution:**
  1. Create Estimate `EST-2026-001` (100 Kurtis @ ₹800 + 18% GST = ₹94,400).
  2. Mark `Accepted` $\rightarrow$ Click **Convert to Proforma**.
  3. Proforma `PI-2026-001` generated with `EST-2026-001` lineage badge.
  4. From Proforma menu $\rightarrow$ Click **Convert to Sale Order**.
  5. Sale Order `SO-2026-001` created. Click **Convert to Delivery Challan**.
  6. Fill dispatch details (Vehicle `TN-09-AB-1234`, Driver `Muthu Vel`, `9840123456`). Save Challan `DC-2026-001`.
  7. On delivery acknowledgement $\rightarrow$ Click **CONVERT TO SALE**.
  8. Sales Invoice `INV-2026-001` created. Stock decrements by 100 units. Lineage displays: `EST-001` ➔ `SO-001` ➔ `DC-001`.
  9. Record Payment: ₹94,400 via `Bank Transfer`. Invoice status turns to `Paid` (₹0 balance).

---

### Scenario 2: Quick Over-The-Counter Retail Sale (Direct Cash / UPI Billing)
* **Workflow:** `Direct Sales Invoice (Immediate Payment)`
* **Story:** A walk-in customer buys 2 Kurtis directly off the shelf and pays via UPI on the spot.
* **Execution:**
  1. Open **`Sales Hub ➔ Sales / Bills`** $\rightarrow$ Click **Add Sale / Bill**.
  2. Select/create customer with 10-digit phone `9840012345`.
  3. Add *Premium Cotton Kurti* (Qty: 2, Rate: ₹800, GST @ 18% = ₹1,888).
  4. Under Payment: select `UPI / GPay / PhonePe`, enter paid amount `₹1,888.00`.
  5. Save Bill.
* **Outcome:** Invoice is immediately `Confirmed` & `Paid` (green badge), balance is `₹0.00`, and inventory stock drops by 2 units.

---

### Scenario 3: Inbound Procurement & Restocking (PR ➔ PO ➔ Stock Received ➔ Payment Out)
* **Workflow:** `Purchase Request ➔ Approved ➔ Purchase Bill ➔ Goods Received ➔ Payment Out`
* **Story:** Warehouse inventory is low. Staff raises an internal requisition, management approves, accounts places a purchase bill with *YAA Textiles Ltd*, goods arrive, and payment is wired.
* **Execution:**
  1. **Purchase Request:** Raise `PR-2026-101` for 150 Kurtis @ ₹500. Status: `Pending Approval`.
  2. **Approval:** Manager clicks **Approve** $\rightarrow$ Status changes to `Approved`.
  3. **Purchase Bill:** Click **New Purchase Bill** $\rightarrow$ Select `With Purchase Request`.
     * *Validation check:* `PR-2026-101` appears in the dropdown; old purchased requests **do not appear**.
     * Select `PR-2026-101` $\rightarrow$ Vendor, items, and cost auto-populate. Save bill `PO-00025`.
     * Request `PR-2026-101` status updates to `Purchase Created`.
  4. **Order Status:** Transition bill: `Pending` ➔ `Approved` ➔ `Ordered`.
  5. **Goods Intake:** When truck arrives at warehouse $\rightarrow$ Click **Mark as Received**.
     * Bill status becomes `Received` (locked from deletion).
     * Warehouse stock increases by +150 units.
  6. **Payment Out:** Record supplier wire transfer of ₹88,500 ($150 \times ₹500 + 18\%$). Bill status turns to `Paid`.

---

### Scenario 4: Fast-Track Quote to Invoice (Skipping Proforma & Order)
* **Workflow:** `Estimate / Quotation ➔ Direct Sales Invoice`
* **Story:** Existing trusted customer receives a quotation and confirms immediately via phone, requesting direct delivery and invoice without intermediate paperwork.
* **Execution:**
  1. Open **`Sales Hub ➔ Estimate / Quotation`** $\rightarrow$ Select `EST-2026-042`.
  2. Click 3-dots menu $\rightarrow$ **Convert to Sale (Direct Invoice)**.
  3. Sales Invoice opens with customer, items, and tax pre-filled.
  4. Save Invoice.
* **Outcome:** Estimate marked `Converted`. Sales invoice shows `EST-2026-042` lineage badge. Stock depleted.

---

### Scenario 5: Confirmed Order to Staged Delivery (Order ➔ Challan ➔ Invoice)
* **Workflow:** `Sale Order ➔ Delivery Challan ➔ Sales Invoice`
* **Story:** A construction or hospital client books an order for 200 items, but requires delivery in batches accompanied by official transport gate passes.
* **Execution:**
  1. Create Sale Order `SO-2026-088` for 200 units.
  2. Dispatch first lot of 50 units $\rightarrow$ Click **Convert to Delivery Challan**.
  3. Enter Vehicle Number and driver contact for Batch 1.
  4. Once delivered $\rightarrow$ Convert Challan to Sales Invoice `INV-2026-101`.

---

### Scenario 6: Customer Sales Return & Credit Adjustment (Defective Goods Return)
* **Workflow:** `Sales Invoice ➔ Convert to Return / Credit Note ➔ Ledger Adjustment`
* **Story:** Customer received 10 units, but 2 units arrived damaged. The customer requests a return and balance adjustment.
* **Execution:**
  1. On `INV-2026-001`, click 3-dots $\rightarrow$ **Convert to Return / Credit Note**.
  2. Set return quantity to `2`, reason: `Defective / Damaged in Transit`. Save Credit Note `CN-2026-001`.
* **Outcome:** Customer receivable balance reduced by ₹1,888 ($2 \times ₹800 + 18\%$). Defective stock logged.

---

### Scenario 7: Supplier Purchase Return (Defective Items Returned to Vendor)
* **Workflow:** `Purchase Bill ➔ Convert to Purchase Return / Debit Note`
* **Story:** During warehouse inspection, 5 units from Supplier *YAA Textiles Ltd* have stitching defects.
* **Execution:**
  1. In **`Purchase Bills`**, locate `PO-00025` $\rightarrow$ Click **Convert to Return**.
  2. Enter defective quantity: `5`, reason: `Stitching Defect`. Save Return `PRET-2026-001`.
* **Outcome:** Accounts payable to supplier is reduced by ₹2,950 ($5 \times ₹500 + 18\%$). 5 units deducted from warehouse stock.

---

### Scenario 8: End-of-Day Multi-Order Bulk Conversion
* **Workflow:** `Sale Orders (Multiple) ➔ Bulk Convert ➔ Multiple Sales Invoices`
* **Story:** At 5:00 PM dispatch, 3 separate customers have open sale orders scheduled for shipment. The billing team converts all open orders into invoices with one click.
* **Execution:**
  1. Navigate to **`Sales Hub ➔ Sale Order`**.
  2. Click **Bulk Convert** $\rightarrow$ Check 3 open orders $\rightarrow$ Click **Convert Selected (3)**.
* **Outcome:** 3 separate invoices generated with sequential numbering, source orders updated to `Converted`, and full lineage preserved.

---

## 5. Traceability Matrix & Document Lineage Summary

| From Document | To Document | Trigger Action | Stock Change | Financial Change |
| :--- | :--- | :--- | :--- | :--- |
| **Purchase Request** | **Purchase Bill** | Create Bill with PR | None | None |
| **Purchase Bill** | **Stock Intake** | Mark as Received | **+ Qty Added** | Accounts Payable recorded |
| **Purchase Bill** | **Payment Out** | Record Payment | None | Accounts Payable cleared |
| **Purchase Bill** | **Purchase Return** | Convert to Return | **- Qty Deducted** | Accounts Payable reduced |
| **Estimate** | **Proforma Invoice** | Convert to Proforma | None | None |
| **Estimate / Proforma**| **Sale Order** | Convert to Order | None | None |
| **Sale Order** | **Delivery Challan** | Convert to Challan | In Transit | Transport gate pass issued |
| **Delivery Challan / SO**| **Sales Invoice** | Convert to Sale | **- Qty Depleted**| Accounts Receivable recorded |
| **Sales Invoice** | **Payment In** | Record Payment | None | Accounts Receivable cleared |
| **Sales Invoice** | **Credit Note** | Convert to Return | None / Return | Accounts Receivable reduced |

---

## 6. QA Validation Rules & Functional Checklist

Verify these functional rules during testing:

### 1. Pricing Consistency
* [ ] Verify Product **Purchase Price** (₹500) pre-fills on Purchase Bills.
* [ ] Verify Product **Sale Price** (₹800) pre-fills on Quotations, Orders, and Sales Invoices.
* [ ] Verify editing quantity updates subtotal, GST, and grand total in real-time.

### 2. Purchase Request Filtering
* [ ] Open **New Purchase Bill** $\rightarrow$ Select **With Purchase Request**.
* [ ] Verify **only pending/approved requests appear**.
* [ ] Verify already purchased requests (`Purchase Created`, `Completed`) **never appear**.
* [ ] Verify saving the bill updates the linked requisition status to `Purchase Created`.

### 3. GST Tax Calculation Rules
* [ ] **Intra-State (Same State: TN ➔ TN):** Tax splits 50/50 into **CGST 9% + SGST 9%**.
* [ ] **Inter-State (Different State: TN ➔ KA):** Tax assigns 100% to **IGST 18%**.
* [ ] **Without GST Toggle:** Tax calculates as ₹0.00.

### 4. Phone Number Validations
* [ ] Letters, symbols, or negative signs are blocked on keypress.
* [ ] Phone must be exactly 10 digits starting with 6, 7, 8, or 9.
* [ ] Rejects 9-digit or invalid numbers with clear validation feedback.

### 5. Status Locking
* [ ] Purchase Bills with status `Received` cannot be deleted.
* [ ] Converted documents display appropriate status badges (`Converted`) and link back to their lineage.
