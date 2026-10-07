# Purchase Management & Pending Dues API Specification

This document provides a comprehensive RESTful API specification for **Purchase Request**, **Purchase Return (Debit Note)**, and **Customer Pending Dues & Aging** modules for the backend engineering team to implement.

---

## 📋 Table of Contents
1. [General API Conventions & Headers](#1-general-api-conventions--headers)
2. [Purchase Request API](#2-purchase-request-api)
   - [2.1 List Purchase Requests (with Pagination & Filters)](#21-list-purchase-requests)
   - [2.2 Get Purchase Request by ID](#22-get-purchase-request-by-id)
   - [2.3 Create Purchase Request](#23-create-purchase-request)
   - [2.4 Update Purchase Request](#24-update-purchase-request)
   - [2.5 Update Status / Approve / Reject Purchase Request](#25-update-status--approve--reject-purchase-request)
   - [2.6 Convert Purchase Request to Purchase Order](#26-convert-purchase-request-to-purchase-order)
   - [2.7 Delete Purchase Request](#27-delete-purchase-request)
3. [Purchase Return (Debit Note) API](#3-purchase-return-debit-note-api)
   - [3.1 List Purchase Returns (with Pagination & Filters)](#31-list-purchase-returns)
   - [3.2 Get Purchase Return by ID](#32-get-purchase-return-by-id)
   - [3.3 Create Purchase Return](#33-create-purchase-return)
   - [3.4 Update Purchase Return](#34-update-purchase-return)
   - [3.5 Update Return & Refund Status](#35-update-return--refund-status)
   - [3.6 Delete Purchase Return](#36-delete-purchase-return)
4. [Pending Dues & Accounts Receivable API](#4-pending-dues--accounts-receivable-api)
   - [4.1 List Pending Dues & Aging Records](#41-list-pending-dues--aging-records)
   - [4.2 Get Pending Due Summary / Statistics](#42-get-pending-due-summary--statistics)
   - [4.3 Create / Record Manual Pending Due](#43-create--record-manual-pending-due)
   - [4.4 Update Pending Due Record](#44-update-pending-due-record)
   - [4.5 Record Payment against Due](#45-record-payment-against-due)
   - [4.6 Send Payment Reminder (Email / SMS / WhatsApp)](#46-send-payment-reminder)
   - [4.7 Delete / Settle Pending Due Record](#47-delete--settle-pending-due-record)
5. [Data Models & Schema Definitions](#5-data-models--schema-definitions)
6. [Standard Error Responses](#6-standard-error-responses)

---

## 1. General API Conventions & Headers

### Base URL
```
https://api.yourdomain.com/api/v1
```

### Standard Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer <JWT_ACCESS_TOKEN>` | Bearer authentication token |
| `Content-Type` | `application/json` | Required for `POST`, `PUT`, `PATCH` requests |
| `X-Organization-Id` | `<uuid>` *(Optional)* | Multi-tenant organization scope if applicable |

### Standard Response Envelope
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```

---

## 2. Purchase Request API

Purchase Requests are internal requisitions raised by employees or department leads to request material/product procurement before raising a formal Purchase Order.

### 2.1 List Purchase Requests
- **Endpoint**: `GET /api/v1/purchase-requests`
- **Method**: `GET`
- **Query Parameters**:
  - `page` (integer, default: `1`)
  - `limit` (integer, default: `10`)
  - `search` (string, optional) - searches in `requestNo`, `requestedBy`, `department`
  - `status` (string, optional) - `Draft` | `Submitted` | `Pending Approval` | `Approved` | `Rejected` | `Purchase Created` | `Completed`
  - `priority` (string, optional) - `Low` | `Medium` | `High` | `Urgent`
  - `startDate` (string, ISO date: `YYYY-MM-DD`, optional)
  - `endDate` (string, ISO date: `YYYY-MM-DD`, optional)
  - `sortBy` (string, default: `createdAt`)
  - `sortOrder` (string, `asc` | `desc`, default: `desc`)

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Purchase requests fetched successfully",
  "data": [
    {
      "id": "pr_9f82d1",
      "requestNo": "PR-2026-001",
      "requestDate": "2026-10-01",
      "requestedBy": "Tamilselvan (Procurement Lead)",
      "department": "Warehouse / Production",
      "requiredDate": "2026-10-10",
      "priority": "High",
      "status": "Approved",
      "items": [
        {
          "id": "pri_1",
          "productId": "prod_101",
          "productName": "Industrial Fastener A4",
          "currentStock": 24,
          "requestedQuantity": 100,
          "estimatedUnitPrice": 150.00,
          "requiredDate": "2026-10-10",
          "remarks": "Urgent restocking for batch run"
        }
      ],
      "totalEstimatedAmount": 15000.00,
      "notes": "Required before next Monday production shift",
      "rejectionReason": null,
      "approvedBy": "Rajesh Kumar (Operations Manager)",
      "approvedAt": "2026-10-02T11:30:00Z",
      "createdPurchaseId": null,
      "createdAt": "2026-10-01T09:15:00Z",
      "updatedAt": "2026-10-02T11:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### 2.2 Get Purchase Request by ID
- **Endpoint**: `GET /api/v1/purchase-requests/:id`
- **Method**: `GET`

#### Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "id": "pr_9f82d1",
    "requestNo": "PR-2026-001",
    "requestDate": "2026-10-01",
    "requestedBy": "Tamilselvan",
    "department": "Warehouse",
    "requiredDate": "2026-10-10",
    "priority": "High",
    "status": "Pending Approval",
    "items": [
      {
        "id": "pri_1",
        "productId": "prod_101",
        "productName": "Industrial Fastener A4",
        "currentStock": 24,
        "requestedQuantity": 100,
        "estimatedUnitPrice": 150.00,
        "requiredDate": "2026-10-10",
        "remarks": "Restock"
      }
    ],
    "notes": "Fast track approval needed",
    "rejectionReason": null,
    "approvedBy": null,
    "approvedAt": null,
    "createdPurchaseId": null,
    "createdAt": "2026-10-01T09:15:00Z",
    "updatedAt": "2026-10-01T09:15:00Z"
  }
}
```

---

### 2.3 Create Purchase Request
- **Endpoint**: `POST /api/v1/purchase-requests`
- **Method**: `POST`
- **Request Body**:
```json
{
  "requestNo": "PR-2026-002",
  "requestDate": "2026-10-07",
  "requestedBy": "Tamilselvan",
  "department": "Inventory Management",
  "requiredDate": "2026-10-15",
  "priority": "High",
  "status": "Pending Approval",
  "items": [
    {
      "productId": "prod_204",
      "productName": "Packaging Box Large",
      "currentStock": 15,
      "requestedQuantity": 500,
      "estimatedUnitPrice": 25.00,
      "requiredDate": "2026-10-15",
      "remarks": "Order from vendor YAA Supplies"
    }
  ],
  "notes": "Monthly batch requirements"
}
```

#### Response (`201 Created`):
```json
{
  "success": true,
  "message": "Purchase request created successfully",
  "data": {
    "id": "pr_b41a99",
    "requestNo": "PR-2026-002",
    "status": "Pending Approval",
    "createdAt": "2026-10-07T10:30:00Z",
    "updatedAt": "2026-10-07T10:30:00Z"
  }
}
```

---

### 2.4 Update Purchase Request
- **Endpoint**: `PUT /api/v1/purchase-requests/:id`
- **Method**: `PUT`
- **Request Body**: (Full or partial fields to update)
```json
{
  "department": "Logistics & Dispatch",
  "priority": "Urgent",
  "requiredDate": "2026-10-12",
  "notes": "Updated due date per client demand",
  "items": [
    {
      "id": "pri_1",
      "productId": "prod_204",
      "productName": "Packaging Box Large",
      "currentStock": 15,
      "requestedQuantity": 600,
      "estimatedUnitPrice": 25.00,
      "requiredDate": "2026-10-12",
      "remarks": "Quantity increased to 600"
    }
  ]
}
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Purchase request updated successfully",
  "data": {
    "id": "pr_b41a99",
    "requestNo": "PR-2026-002",
    "priority": "Urgent",
    "updatedAt": "2026-10-07T10:45:00Z"
  }
}
```

---

### 2.5 Update Status / Approve / Reject Purchase Request
- **Endpoint**: `PATCH /api/v1/purchase-requests/:id/status`
- **Method**: `PATCH`
- **Request Body (Approve)**:
```json
{
  "status": "Approved",
  "approvedBy": "Rajesh Kumar (Operations Manager)",
  "remarks": "Approved for PO generation"
}
```

- **Request Body (Reject)**:
```json
{
  "status": "Rejected",
  "rejectionReason": "Current stock is sufficient for the next 30 days."
}
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Purchase request status updated to Approved",
  "data": {
    "id": "pr_b41a99",
    "status": "Approved",
    "approvedBy": "Rajesh Kumar (Operations Manager)",
    "approvedAt": "2026-10-07T11:00:00Z"
  }
}
```

---

### 2.6 Convert Purchase Request to Purchase Order
- **Endpoint**: `POST /api/v1/purchase-requests/:id/convert-to-purchase`
- **Method**: `POST`
- **Request Body**:
```json
{
  "supplierId": "sup_101",
  "supplierName": "Global Industrial Traders",
  "purchaseNo": "PO-2026-089",
  "purchaseDate": "2026-10-07",
  "dueDate": "2026-10-21",
  "paymentTerms": "Net 15",
  "paymentMethod": "Bank Transfer"
}
```

#### Response (`201 Created`):
```json
{
  "success": true,
  "message": "Purchase Order created from Purchase Request",
  "data": {
    "purchaseRequestId": "pr_b41a99",
    "purchaseId": "po_90432",
    "purchaseNo": "PO-2026-089",
    "requestStatus": "Purchase Created"
  }
}
```

---

### 2.7 Delete Purchase Request
- **Endpoint**: `DELETE /api/v1/purchase-requests/:id`
- **Method**: `DELETE`

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Purchase request deleted successfully"
}
```

---

## 3. Purchase Return (Debit Note) API

Purchase Returns (Debit Notes) track items returned back to suppliers due to damage, defects, incorrect specs, or excess quantities, and manage debit balance/refund reconciliations.

### 3.1 List Purchase Returns
- **Endpoint**: `GET /api/v1/purchase-returns`
- **Method**: `GET`
- **Query Parameters**:
  - `page` (integer, default: `1`)
  - `limit` (integer, default: `10`)
  - `search` (string, optional) - searches in `returnNo`, `purchaseNo`, `supplierName`
  - `supplierId` (string, optional) - filter by specific vendor
  - `returnStatus` (string, optional) - `Requested` | `Approved` | `Returned` | `Completed` | `Cancelled`
  - `refundStatus` (string, optional) - `Pending` | `Refunded` | `Supplier Credit` | `Adjusted`
  - `startDate` (string, `YYYY-MM-DD`, optional)
  - `endDate` (string, `YYYY-MM-DD`, optional)
  - `sortBy` (string, default: `createdAt`)
  - `sortOrder` (string, `asc` | `desc`, default: `desc`)

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Purchase returns fetched successfully",
  "data": [
    {
      "id": "pret_5501",
      "returnNo": "PRN-2026-001",
      "purchaseId": "po_90432",
      "purchaseNo": "PO-2026-089",
      "supplierId": "sup_101",
      "supplierName": "Global Industrial Traders",
      "returnDate": "2026-10-07",
      "items": [
        {
          "id": "pri_item_1",
          "productId": "prod_204",
          "productName": "Packaging Box Large",
          "batch": "BATCH-2026-A",
          "purchasedQuantity": 500,
          "returnQuantity": 50,
          "unitPrice": 25.00,
          "returnAmount": 1250.00,
          "reason": "Damaged",
          "remarks": "Crushed boxes during transit"
        }
      ],
      "returnAmount": 1250.00,
      "refundStatus": "Supplier Credit",
      "returnStatus": "Completed",
      "notes": "Adjusted in supplier pending balance ledger",
      "createdAt": "2026-10-07T10:00:00Z",
      "updatedAt": "2026-10-07T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### 3.2 Get Purchase Return by ID
- **Endpoint**: `GET /api/v1/purchase-returns/:id`
- **Method**: `GET`

#### Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "id": "pret_5501",
    "returnNo": "PRN-2026-001",
    "purchaseId": "po_90432",
    "purchaseNo": "PO-2026-089",
    "supplierId": "sup_101",
    "supplierName": "Global Industrial Traders",
    "returnDate": "2026-10-07",
    "items": [
      {
        "id": "pri_item_1",
        "productId": "prod_204",
        "productName": "Packaging Box Large",
        "batch": "BATCH-2026-A",
        "purchasedQuantity": 500,
        "returnQuantity": 50,
        "unitPrice": 25.00,
        "returnAmount": 1250.00,
        "reason": "Damaged",
        "remarks": "Crushed boxes during transit"
      }
    ],
    "returnAmount": 1250.00,
    "refundStatus": "Supplier Credit",
    "returnStatus": "Completed",
    "notes": "Adjusted in supplier pending balance ledger",
    "createdAt": "2026-10-07T10:00:00Z",
    "updatedAt": "2026-10-07T10:00:00Z"
  }
}
```

---

### 3.3 Create Purchase Return (Debit Note)
- **Endpoint**: `POST /api/v1/purchase-returns`
- **Method**: `POST`
- **Request Body**:
```json
{
  "returnNo": "PRN-2026-002",
  "purchaseId": "po_90432",
  "purchaseNo": "PO-2026-089",
  "supplierId": "sup_101",
  "supplierName": "Global Industrial Traders",
  "returnDate": "2026-10-07",
  "items": [
    {
      "productId": "prod_101",
      "productName": "Industrial Fastener A4",
      "batch": "B-88",
      "purchasedQuantity": 100,
      "returnQuantity": 10,
      "unitPrice": 150.00,
      "returnAmount": 1500.00,
      "reason": "Defective",
      "remarks": "Incorrect thread size"
    }
  ],
  "returnAmount": 1500.00,
  "refundStatus": "Supplier Credit",
  "returnStatus": "Requested",
  "notes": "Debit note issued for ₹1,500"
}
```

> **Backend Logic Note**: On creating a purchase return:
> 1. Deduct the returned product quantity from warehouse inventory / batch stock.
> 2. Deduct `returnAmount` from the supplier's outstanding payable balance or record a credit balance.

#### Response (`201 Created`):
```json
{
  "success": true,
  "message": "Purchase return created and debit note generated",
  "data": {
    "id": "pret_5502",
    "returnNo": "PRN-2026-002",
    "returnAmount": 1500.00,
    "returnStatus": "Requested",
    "refundStatus": "Supplier Credit",
    "createdAt": "2026-10-07T10:35:00Z"
  }
}
```

---

### 3.4 Update Purchase Return
- **Endpoint**: `PUT /api/v1/purchase-returns/:id`
- **Method**: `PUT`
- **Request Body**:
```json
{
  "returnDate": "2026-10-08",
  "refundStatus": "Refunded",
  "returnStatus": "Completed",
  "notes": "Bank refund received into primary account"
}
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Purchase return updated successfully",
  "data": {
    "id": "pret_5502",
    "returnNo": "PRN-2026-002",
    "returnStatus": "Completed",
    "refundStatus": "Refunded",
    "updatedAt": "2026-10-08T09:00:00Z"
  }
}
```

---

### 3.5 Update Return & Refund Status
- **Endpoint**: `PATCH /api/v1/purchase-returns/:id/status`
- **Method**: `PATCH`
- **Request Body**:
```json
{
  "returnStatus": "Completed",
  "refundStatus": "Supplier Credit"
}
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Purchase return status updated successfully",
  "data": {
    "id": "pret_5502",
    "returnStatus": "Completed",
    "refundStatus": "Supplier Credit",
    "updatedAt": "2026-10-08T09:10:00Z"
  }
}
```

---

### 3.6 Delete Purchase Return
- **Endpoint**: `DELETE /api/v1/purchase-returns/:id`
- **Method**: `DELETE`

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Purchase return deleted and stock adjusted"
}
```

---

## 4. Pending Dues & Accounts Receivable API

Tracks unpaid client sales invoices, pending receivables, payment collections, aging analysis, and automated reminder alerts.

### 4.1 List Pending Dues & Aging Records
- **Endpoint**: `GET /api/v1/pending-dues`
- **Method**: `GET`
- **Query Parameters**:
  - `page` (integer, default: `1`)
  - `limit` (integer, default: `10`)
  - `search` (string, optional) - searches in `customerName`, `invoiceNo`, `phone`, `productName`
  - `status` (string, optional) - `ALL` | `Pending` | `Overdue` | `Partially Paid` | `Paid`
  - `productName` (string, optional) - filter by product/service
  - `agingBucket` (string, optional) - `0-30` | `31-60` | `61-90` | `90+`
  - `startDate` (string, `YYYY-MM-DD`, optional) - due date start
  - `endDate` (string, `YYYY-MM-DD`, optional) - due date end
  - `sortBy` (string, default: `dueDate`)
  - `sortOrder` (string, `asc` | `desc`, default: `asc`)

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Pending dues fetched successfully",
  "data": [
    {
      "id": "due_101",
      "sNo": 1,
      "invoiceId": "inv_8011",
      "invoiceNo": "INV-2026-001",
      "customerId": "cust_301",
      "customerName": "Acme Technologies",
      "phone": "+91 98765 43210",
      "email": "billing@acmetech.com",
      "productName": "YaaConnect Enterprise",
      "dueDate": "2026-10-05",
      "invoiceDate": "2026-09-05",
      "totalAmount": 45000.00,
      "paidAmount": 15000.00,
      "dueAmount": 30000.00,
      "overdueDays": 2,
      "status": "Partially Paid",
      "createdAt": "2026-09-05T10:00:00Z",
      "updatedAt": "2026-10-05T10:00:00Z"
    },
    {
      "id": "due_102",
      "sNo": 2,
      "invoiceId": "inv_8014",
      "invoiceNo": "INV-2026-004",
      "customerId": "cust_302",
      "customerName": "Nexis LogiTech Solutions",
      "phone": "+91 97890 12345",
      "email": "finance@nexislogi.in",
      "productName": "Doc DentQ",
      "dueDate": "2026-09-20",
      "invoiceDate": "2026-08-20",
      "totalAmount": 25000.00,
      "paidAmount": 0.00,
      "dueAmount": 25000.00,
      "overdueDays": 17,
      "status": "Overdue",
      "createdAt": "2026-08-20T10:00:00Z",
      "updatedAt": "2026-09-20T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "totalPages": 1
  }
}
```

---

### 4.2 Get Pending Due Summary / Statistics
- **Endpoint**: `GET /api/v1/pending-dues/summary`
- **Method**: `GET`

#### Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "totalPendingAmount": 115000.00,
    "totalOverdueAmount": 25000.00,
    "totalPartiallyPaidAmount": 30000.00,
    "totalCollectedThisMonth": 45000.00,
    "totalPendingInvoices": 5,
    "totalOverdueInvoices": 2,
    "agingBreakdown": {
      "current_0_30_days": 60000.00,
      "overdue_31_60_days": 35000.00,
      "overdue_61_90_days": 20000.00,
      "overdue_90_plus_days": 0.00
    }
  }
}
```

---

### 4.3 Create / Record Manual Pending Due
- **Endpoint**: `POST /api/v1/pending-dues`
- **Method**: `POST`
- **Request Body**:
```json
{
  "invoiceNo": "INV-2026-009",
  "customerId": "cust_405",
  "customerName": "Apex HealthCare Ltd",
  "phone": "+91 99441 55223",
  "email": "accounts@apexhealth.org",
  "productName": "DocMotez Hospital Suite",
  "dueDate": "2026-10-25",
  "invoiceDate": "2026-10-07",
  "totalAmount": 60000.00,
  "paidAmount": 10000.00,
  "dueAmount": 50000.00,
  "notes": "Custom installation billed with 30-day payment term"
}
```

#### Response (`201 Created`):
```json
{
  "success": true,
  "message": "Pending due record created successfully",
  "data": {
    "id": "due_103",
    "invoiceNo": "INV-2026-009",
    "customerName": "Apex HealthCare Ltd",
    "dueAmount": 50000.00,
    "status": "Partially Paid",
    "createdAt": "2026-10-07T10:40:00Z"
  }
}
```

---

### 4.4 Update Pending Due Record
- **Endpoint**: `PUT /api/v1/pending-dues/:id`
- **Method**: `PUT`
- **Request Body**:
```json
{
  "dueDate": "2026-10-31",
  "paidAmount": 20000.00,
  "dueAmount": 40000.00,
  "notes": "Customer requested extension till Oct 31st"
}
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Pending due updated successfully",
  "data": {
    "id": "due_103",
    "dueDate": "2026-10-31",
    "paidAmount": 20000.00,
    "dueAmount": 40000.00,
    "status": "Partially Paid",
    "updatedAt": "2026-10-07T10:45:00Z"
  }
}
```

---

### 4.5 Record Payment against Due
- **Endpoint**: `POST /api/v1/pending-dues/:id/payments`
- **Method**: `POST`
- **Request Body**:
```json
{
  "paymentDate": "2026-10-07",
  "amountPaid": 40000.00,
  "paymentMethod": "UPI",
  "referenceNo": "UPI/949281048102",
  "notes": "Full balance cleared via GooglePay"
}
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Payment recorded and due marked as Paid",
  "data": {
    "dueId": "due_103",
    "totalAmount": 60000.00,
    "paidAmount": 60000.00,
    "dueAmount": 0.00,
    "status": "Paid",
    "paymentReceiptId": "rec_3019",
    "settledAt": "2026-10-07T10:50:00Z"
  }
}
```

---

### 4.6 Send Payment Reminder (Email / SMS / WhatsApp)
- **Endpoint**: `POST /api/v1/pending-dues/:id/send-reminder`
- **Method**: `POST`
- **Request Body**:
```json
{
  "channels": ["email", "whatsapp"],
  "customMessage": "Dear Customer, please find attached reminder for overdue invoice INV-2026-001."
}
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Payment reminder dispatched successfully via Email and WhatsApp",
  "data": {
    "dueId": "due_101",
    "dispatchedChannels": ["email", "whatsapp"],
    "sentAt": "2026-10-07T10:55:00Z"
  }
}
```

---

### 4.7 Delete / Settle Pending Due Record
- **Endpoint**: `DELETE /api/v1/pending-dues/:id`
- **Method**: `DELETE`

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Pending due record removed successfully"
}
```

---

## 5. Data Models & Schema Definitions

### 5.1 Purchase Request Schema
```typescript
export type PurchaseRequestPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type PurchaseRequestStatus =
  | 'Draft'
  | 'Submitted'
  | 'Pending Approval'
  | 'Approved'
  | 'Rejected'
  | 'Purchase Created'
  | 'Completed';

export interface PurchaseRequestItem {
  id?: string;
  productId: string;
  productName: string;
  currentStock: number;
  requestedQuantity: number;
  estimatedUnitPrice?: number;
  requiredDate: string; // ISO date format "YYYY-MM-DD"
  remarks?: string;
}

export interface PurchaseRequest {
  id: string;
  requestNo: string;
  requestDate: string; // "YYYY-MM-DD"
  requestedBy: string;
  department: string;
  requiredDate: string;
  priority: PurchaseRequestPriority;
  status: PurchaseRequestStatus;
  items: PurchaseRequestItem[];
  notes?: string;
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdPurchaseId?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

### 5.2 Purchase Return (Debit Note) Schema
```typescript
export type PurchaseReturnStatus = 'Requested' | 'Approved' | 'Returned' | 'Completed' | 'Cancelled';
export type PurchaseRefundStatus = 'Pending' | 'Refunded' | 'Supplier Credit' | 'Adjusted';
export type ReturnReason = 'Damaged' | 'Defective' | 'Wrong Product' | 'Excess Quantity' | 'Quality Issue' | 'Other';

export interface PurchaseReturnItem {
  id?: string;
  productId: string;
  productName: string;
  batch?: string;
  purchasedQuantity: number;
  returnQuantity: number;
  unitPrice: number;
  returnAmount: number;
  reason: ReturnReason;
  remarks?: string;
}

export interface PurchaseReturn {
  id: string;
  returnNo: string;
  purchaseNo: string;
  purchaseId: string;
  supplierId: string;
  supplierName: string;
  returnDate: string; // "YYYY-MM-DD"
  items: PurchaseReturnItem[];
  returnAmount: number;
  refundStatus: PurchaseRefundStatus;
  returnStatus: PurchaseReturnStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

### 5.3 Pending Dues Schema
```typescript
export type DueStatus = 'Pending' | 'Overdue' | 'Partially Paid' | 'Paid';

export interface PendingDueItem {
  id: string;
  sNo?: number;
  invoiceId?: string;
  invoiceNo: string;
  customerId?: string;
  customerName: string;
  phone: string;
  email?: string;
  productName: string;
  invoiceDate?: string;
  dueDate: string; // "YYYY-MM-DD"
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  overdueDays?: number; // Calculated: max(0, today - dueDate)
  status: DueStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 6. Standard Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "BAD_REQUEST",
  "message": "Invalid request payload or missing required fields",
  "details": [
    {
      "field": "items",
      "issue": "Purchase return must contain at least 1 item"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Authentication token expired or missing"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "FORBIDDEN",
  "message": "You do not have permission to approve purchase requests"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "NOT_FOUND",
  "message": "Purchase request with ID 'pr_9999' not found"
}
```

### 422 Unprocessable Entity (Business Validation)
```json
{
  "success": false,
  "error": "VALIDATION_FAILED",
  "message": "Return quantity (60) cannot exceed purchased quantity (50)"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "INTERNAL_SERVER_ERROR",
  "message": "An unexpected server error occurred. Please try again later."
}
```
