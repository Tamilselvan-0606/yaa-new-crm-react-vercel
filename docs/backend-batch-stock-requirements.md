# Batch-Wise Stock Validation: Backend Requirements

**Audience:** Backend team
**Raised by:** Frontend
**Status:** Request for API changes / confirmation
**Scope:** Estimate/Quotation, Proforma Invoice, Sale Order, Delivery Challan, Sales Invoice (and Sales Returns where noted)

## 1. What the frontend does now

The five sales-document forms validate a line's quantity against the selected batch's stock, inline, before any create/update/convert call:

- When a product is chosen, the frontend loads its batches with `GET /commerce/stocks/batches?productId=…` (RTK Query endpoint `getCommerceStockBatches`, tag `Stock/BATCHES`) and shows "N in stock" for the chosen batch.
- A quantity above the batch stock is flagged immediately ("Only 565 units are available in this batch. Please reduce the quantity.").
- Several rows with the same product + batch are added together ("Total quantity for this batch exceeds the available stock of 100 units.").
- Just before Save/convert the frontend re-fetches the batches of the products on the document and validates every line again. If stock is short, no request is sent.

This is **immediate feedback only**. It cannot prevent overselling between two users, and it cannot see reservations (section 2). The backend must be the authority.

## 2. What the frontend can and cannot see

| Question | Answer from the frontend's point of view |
|---|---|
| What is the batch figure? | `quantity` on `ApiStockBatch`: on-hand stock. Nothing says whether it is physical, reserved or sellable. |
| Reserved / allocated quantity? | **Not exposed anywhere** (batch, stock, order, challan, invoice types). The frontend cannot subtract stock held by other open documents. |
| Does creating a Sale Order / Challan reserve or deduct stock? | **Unknown.** Nothing in the request/response types says so. The `Stock` cache tag is invalidated after order convert and challan convert, which hints that stock may change on conversion. `invoiceApi` documents "Create new sales invoice (deducts stock)". |
| Does the frontend deduct stock? | No stock API call is made at Estimate, Proforma, Sale Order or Challan stage. For invoices, the frontend does not call any outward adjustment; the backend posts the movement. (A local-store mirror updates a local copy only, for the offline fallback.) |

Because of the first three rows, the frontend currently checks each document against **on-hand** stock only. Two open Sale Orders can each pass for the same batch, and a challan can pass on top of both.

## 3. Requests

### 3.1 Say what the stock figures mean, and expose the sellable one
On `GET /commerce/stocks/batches` and `GET /commerce/stocks` return, per batch:

- `quantity`: physical on hand (as today)
- `reservedQuantity`: held by open documents (define which stages reserve)
- `availableQuantity`: `quantity − reservedQuantity`, i.e. what can still be sold

The frontend will validate against `availableQuantity` as soon as it exists (a one-line change in `useBatchStock`).

### 3.2 Validate stock on create and update (authoritative)
For Sale Order, Delivery Challan and Sales Invoice (and Estimate / Proforma if the business wants them blocked), `POST` / `PUT`:

1. The batch belongs to the product (`batchNo` ↔ `productId`, same organisation / branch).
2. The **sum of quantities per product + batch across all lines** does not exceed the available stock (splitting a quantity over rows must not bypass the check).
3. Checked **atomically** with the write (row lock or conditional update), so two users ordering the last units cannot both succeed.
4. Failure returns a validation error the frontend can place on the line:

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Not enough stock in batch BAT-OCT.",
    "fields": [
      { "path": ["items", 0, "quantity"], "message": "Only 565 units are available in this batch." }
    ],
    "details": [{ "line": 0, "productId": "…", "batchNo": "BAT-OCT", "requested": 600, "available": 565 }]
  }
}
```

The frontend already maps `error.fields[].path` onto the quantity field of that line and shows it inline.

### 3.3 Define the reservation lifecycle
Please document, and implement consistently:

- Which stage reserves stock (Sale Order? Delivery Challan?), which stage **deducts** it (Challan dispatch or Invoice posting), and that **deduction happens at exactly one stage**.
- A reservation **moves** along the chain Estimate → Proforma → Sale Order → Challan → Invoice. It must never be counted again at the next stage (for example, an invoice created from a challan must not deduct what the challan already deducted).
- Reservations are **released** when a document is cancelled, deleted or converted, and when it is edited to a lower quantity.
- Deduction / restore is **idempotent**; retries do not move stock twice. Sales Returns restore stock to the original batch.

### 3.4 Conversions carry lines and lineage
`convertQuotation`, `convertProforma`, `convertOrder` and `bulkConvertOrders` currently receive only ids / target type / due date. Please confirm and guarantee that they:

- copy `productId`, `batchNo` and `quantity` of every line from the source document;
- return the created document's `id` and number, and the source link;
- re-validate stock at conversion time (same error format as 3.2) and do not create the target document when stock is short;
- do not double-reserve stock already reserved by the source document.

Gap found on our side: `POST /commerce/challans` has **no `saleOrderId` field**, so a challan is linked to its order only by `referenceNo`. Please add `saleOrderId` (and ideally a per-line source reference) to challans and invoices.

### 3.5 Editing an existing document
When a saved Sale Order / Challan / Invoice is edited, its own previous quantity must not count against itself. Either:

- return, per line, the quantity the document currently holds (`heldQuantity` or `reservedQuantity`), so the frontend can credit it, **or**
- make the backend validation net of the document's own holdings (recommended in any case).

Today the frontend credits this only for saved invoices (it knows an invoice already holds the stock). For orders and challans it applies no credit, so an unchanged quantity may be flagged if the backend already counts the document.

### 3.6 Scope
All of the above must respect organisation, sub-organisation and branch scope (the frontend sends the same headers it sends for every other call; `branchId` is accepted by the batches endpoint).

### 3.7 Stock changed between load and submit
If stock changes after the form loaded, the backend must return the 3.2 error with the fresh `available` value (HTTP 409/422). The frontend then refreshes the batches and shows the message inline.

## 4. Backend test scenarios

1. Quantity equal to the available stock succeeds; one more unit fails with `INSUFFICIENT_STOCK` on that line.
2. Two lines, same product + batch, 60 + 50 against 100: the second line is rejected.
3. Same product, different batches: each batch is checked on its own.
4. A batch that belongs to another product is rejected.
5. Two users create orders for the last 10 units at the same time: exactly one succeeds.
6. Edit a saved order without changing the quantity: it is not rejected.
7. Order → Challan → Invoice: stock is deducted once in total and never double-reserved.
8. Cancel / delete at each stage: reservation released, or deduction restored, exactly once.
9. Partial fulfilment: a challan for part of an order leaves the rest reserved on the order.
10. A Sales Return restores stock to the original batch.

## 5. Frontend follow-up once this ships

- Validate against `availableQuantity` instead of `quantity`.
- Use the per-line held quantity for edit-mode credit on orders and challans.
- Send / read `saleOrderId` and source references on challans and invoices.
- Remove the remaining local-store stock mirror used by the offline fallback.

## 6. Known frontend limitations until then

- On-hand stock is the only figure available, so reservations by other documents are not subtracted.
- Products with no loaded batches keep a free-text batch field and are not stock-checked (stock unknown).
- Challan → Invoice conversion is not stock-checked in the frontend (it is not a dispatch step); the invoice form validates the lines when the invoice is saved.
- Single Sale Order → Invoice just opens the invoice form, which does the validation.
