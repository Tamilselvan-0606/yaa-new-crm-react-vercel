# Super Admin API Specification & Backend Issue Report

This document details all **Super Admin modules**, data field definitions, currently integrated API contracts, and an explicit **Issue & Requirements Analysis Report** for the backend engineering team regarding issues in Organization filters, update, deactivate, and delete actions.

---

## Table of Contents
1. [Status Summary & Backend Action Items](#1-status-summary--backend-action-items)
2. [Authentication & Account Security (Integrated)](#2-authentication--account-security-integrated)
3. [Organizations Management (Integrated - Action Required on Issues)](#3-organizations-management-integrated---action-required-on-issues)
4. [Quotations & Estimates](#4-quotations--estimates)
5. [Proforma Invoices](#5-proforma-invoices)
6. [Invoices & Billing](#6-invoices--billing)
7. [Subscription Plans Management](#7-subscription-plans-management)
8. [Organization Subscriptions Management](#8-organization-subscriptions-management)
9. [Platform Settings & Profile](#9-platform-settings--profile)
10. [Standard Error & Success Response Conventions](#10-standard-error--success-response-conventions)

---

## 1. Status Summary & Backend Action Items

### 🟢 Fully Integrated Endpoints:
- `POST /api/v1/auth/login` (Admin session login)
- `POST /api/v1/auth/refresh` (Token refresh)
- `POST /api/v1/auth/logout` & `/logout-all` (Session revocation)
- `GET /api/v1/auth/me` (Super admin identity verification)
- `POST /api/v1/auth/change-password` (Password update & session rotation)
- `GET /api/v1/platform/organizations?page=1&limit=10` (Paginated list)
- `POST /api/v1/platform/organizations` (Create organization)
- `GET /api/v1/platform/organizations/:id` (Get organization by ID)
- `PUT /api/v1/platform/organizations/:id` (Update organization)
- `DELETE /api/v1/platform/organizations/:id` (Deactivate organization)

### ⚠️ Backend Issues Identified & Required Fixes:

| Issue Area | Symptom / Current Behavior | Backend Fix Required |
| :--- | :--- | :--- |
| **Search & Filters** | `search`, `status`, and `organizationType` query params in `GET /platform/organizations` do not filter results on the server, or return empty/unfiltered lists. | Support `search` (searching across `name`, `legalName`, `code`, `email`), `status` (`Active`, `Inactive`, `Suspend`), and `organizationType` (`Client Management`, `Sales Management`) query parameters in SQL/ORM query. |
| **Update Organization** | `PUT /platform/organizations/:id` fails or ignores fields like `legalName`, `panNumber`, `gstNumber`, `phone`, `email`, `subOrganizationSupport`. | Ensure the `PUT` handler accepts and persists all payload fields (including contact, tax info, and sub-org flags). |
| **Status / Deactivate Action** | Setting status to `Inactive` or `Suspend` requires an explicit status payload, but API only accepts `PUT` with full or partial update. | Support `status` field in `PUT /platform/organizations/:id` or provide a dedicated `PATCH /platform/organizations/:id/status` endpoint with `{ "status": "Active" | "Inactive" | "Suspend" }`. |
| **Delete / Deactivate Organization** | `DELETE /platform/organizations/:id` returns `404 Organization not found` or fails when linked with relational foreign keys (users/memberships). | Implement soft-deletion (`active = false` or `deletedAt = NOW()`) rather than hard deletion to avoid foreign key constraints errors, and ensure ID lookup handles UUID format properly. |

---

## 2. Authentication & Account Security (Integrated)

### 2.1 Login
- **Endpoint**: `POST /api/v1/auth/login`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "email": "superadmin@crm.com",
    "password": "SecurePassword123!@#"
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "accessToken": "eyJhbGciOi...",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "user": {
      "id": "34ab6a38-6bf3-4b27-ad66-fedb0049ed8c",
      "email": "admin@yaa.com",
      "name": "Platform Administrator",
      "active": true,
      "isPlatformAdmin": true,
      "role": {
        "id": "uuid",
        "code": "SUPER_ADMIN",
        "name": "Super Admin"
      }
    }
  }
  ```

### 2.2 Refresh Token
- **Endpoint**: `POST /api/v1/auth/refresh`
- **Headers**: `X-CSRF-Protection: 1`, `Cookie: yaa_crm_refresh=...`
- **Response (`200 OK`)**: Returns new `accessToken`.

### 2.3 Logout & Revoke Sessions
- **Single Logout**: `POST /api/v1/auth/logout`
- **All Devices Logout**: `POST /api/v1/auth/logout-all`
- **Response**: `200 OK` or `204 No Content`

### 2.4 Get Current User (`/me`)
- **Endpoint**: `GET /api/v1/auth/me`
- **Headers**: `Authorization: Bearer <token>`
- **Response (`200 OK`)**:
  ```json
  {
    "user": {
      "id": "34ab6a38-6bf3-4b27-ad66-fedb0049ed8c",
      "email": "admin@yaa.com",
      "name": "Platform Administrator",
      "active": true,
      "isPlatformAdmin": true,
      "role": "SUPER_ADMIN"
    }
  }
  ```

### 2.5 Change Password
- **Endpoint**: `POST /api/v1/auth/change-password`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "currentPassword": "OldPassword123!@#",
    "newPassword": "NewStrongPassword456!@#"
  }
  ```
- **Response (`204 No Content`)**: Password updated and all active sessions revoked.

---

## 3. Organizations Management (Integrated - Action Required on Issues)

### 3.1 List Organizations (Paginated & Filterable)
- **Endpoint**: `GET /api/v1/platform/organizations`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <token>`
- **Expected Query Parameters**:
  - `page` (integer, e.g. `1`)
  - `limit` (integer, e.g. `10`)
  - `search` (string, e.g. `"Polihills"`)
  - `status` (string: `'Active' | 'Inactive' | 'Suspend' | 'All'`)
  - `organizationType` (string: `'Client Management' | 'Sales Management' | 'All'`)

#### Expected Response Format (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Organizations fetched successfully",
  "data": [
    {
      "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "code": "ORG-001",
      "name": "Yaa Creations Tech",
      "legalName": "Yaa Creations Private Limited",
      "active": true,
      "status": "Active",
      "organizationType": "Client Management",
      "registrationType": "Pvt Ltd",
      "subscriptionPlan": "Enterprise Pro",
      "gstNumber": "33AAAAA0000A1Z5",
      "panNumber": "AAAAA0000A",
      "industry": "IT & Software Services",
      "location": "Chennai",
      "address": "No 45, Anna Salai, Guindy, Chennai - 600032",
      "contactPerson": "Eswaran A",
      "phone": "+91 98765 43210",
      "whatsapp": "+91 98765 43210",
      "email": "contact@yaacreations.com",
      "logo": "https://cdn.domain.com/logos/org-1.png",
      "subOrganizationSupport": true,
      "branchesCount": 4,
      "membersCount": 28,
      "createdAt": "2026-01-15T08:00:00.000Z",
      "updatedAt": "2026-10-06T09:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalRecords": 48,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "meta": {
    "timestamp": "2026-10-06T12:00:00.000Z",
    "requestId": "f69f7da1-edb2-4ce0-a6db-e1dc7d3e78f4"
  }
}
```

> **Backend Action on Filter**: Backend must apply SQL filters `WHERE (name ILIKE %search% OR code ILIKE %search% OR email ILIKE %search%) AND (status = :status OR :status = 'All') AND (organizationType = :organizationType OR :organizationType = 'All')`.

---

### 3.2 Create Organization (3 Fields Per Row Modal Schema)
- **Endpoint**: `POST /api/v1/platform/organizations`
- **Method**: `POST`
- **Request Body**:
```json
{
  "logo": "data:image/png;base64,...",
  "name": "Polihills",
  "code": "POLI-01",
  "organizationType": "Sales Management",
  "legalName": "Polihills Commercial Infra Pvt Ltd",
  "registrationType": "Pvt Ltd",
  "formStatus": "Active",
  "subscriptionPlan": "Yaa Gold",
  "gstNumber": "33BBBBB1111B1Z2",
  "panNumber": "BBBBB1111B",
  "industry": "Real Estate & Infrastructure",
  "location": "Bangalore",
  "contactPerson": "Sarah Jenkins",
  "phone": "+91 98765 43211",
  "whatsapp": "+91 98765 43211",
  "email": "info@polihills.com",
  "password": "InitialAdminPassword123!@#",
  "address": "Plot 12, Whitefield Tech Zone, Bangalore",
  "subOrganizationSupport": true
}
```

#### Field Schema Matrix:
| Field Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | String | **Yes** | Organization Display Name |
| `code` | String | **Yes** | Unique Organization Identifier (e.g. `POLI-01`) |
| `organizationType` | String | **Yes** | `'Client Management'` or `'Sales Management'` |
| `email` | String | Optional | Official Organization Admin Email |
| `password` | String | Optional | Initial organization admin credentials |
| `legalName` | String | Optional | Legal Entity Registered Name |
| `registrationType` | String | Optional | `'Pvt Ltd' \| 'LLP' \| 'Proprietorship' \| 'Partnership' \| 'Public Ltd'` |
| `gstNumber` | String | Optional | 15-character GSTIN |
| `panNumber` | String | Optional | 10-character PAN |
| `industry` | String | Optional | Industry/Domain |
| `location` | String | Optional | City / HQ Location |
| `address` | String | Optional | Registered Office Address |
| `contactPerson` | String | Optional | Primary Contact Person Name |
| `phone` | String | Optional | Contact Number |
| `whatsapp` | String | Optional | WhatsApp Support Number |
| `subscriptionPlan` | String | Optional | Plan name or ID (e.g., `'Yaa Gold'`, `'Enterprise Pro'`) |
| `subOrganizationSupport` | Boolean | Optional | Allow sub-branches / multi-tenant child orgs |
| `logo` | String (Base64/URL)| Optional | Organization Brand Logo |

---

### 3.3 Update Organization
- **Endpoint**: `PUT /api/v1/platform/organizations/:id`
- **Method**: `PUT`
- **Request Body**: Accepts any or all attributes listed in Section 3.2.
- **Backend Fix Needed**: Ensure partial updates work properly without wiping out fields that are omitted.

---

### 3.4 Deactivate & Delete Organization
- **Endpoint**: `DELETE /api/v1/platform/organizations/:id`
- **Method**: `DELETE`
- **Headers**: `Authorization: Bearer <token>`
- **Expected Success Response (`200 OK`)**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Organization deactivated successfully",
  "data": null,
  "meta": {
    "timestamp": "2026-10-06T12:00:00.000Z",
    "requestId": "0f8fad5b-d9cb-469f-a165-70867728950e"
  }
}
```
- **Backend Fix Needed**:
  1. Fix `404 Not Found` when a valid ID is passed.
  2. Implement soft-deactivation (`active = false` or `status = 'Inactive'`) so that existing foreign keys (quotes, invoices, members) do not trigger SQL foreign key constraint errors.

---

## 4. Quotations & Estimates

### 4.1 Endpoints Required:
- `GET /api/v1/platform/quotes?page=1&limit=10&status=ALL`
- `POST /api/v1/platform/quotes`
- `GET /api/v1/platform/quotes/:id`
- `PUT /api/v1/platform/quotes/:id`
- `DELETE /api/v1/platform/quotes/:id`
- `POST /api/v1/platform/quotes/:id/convert` (Convert to Proforma or Invoice)

### 4.2 Data Attributes / Schema:
- `id` (string / UUID)
- `estimateNumber` (string, e.g. `"EST-2026-0042"`)
- `referenceNumber` (string, e.g. `"REF-YAA-889"`)
- `date` (ISO date string)
- `expiryDate` (ISO date string)
- `customerId` / `customerName` (string)
- `customerCompany` (string)
- `customerEmail` (string)
- `customerPhone` (string)
- `productName` (string)
- `status` (`'DRAFT' | 'SENT' | 'ACCEPTED' | 'EXPIRED' | 'DECLINED'`)
- `amount` (number)
- `subtotal` (number)
- `taxAmount` (number)
- `discountAmount` (number)
- `notes` / `termsAndConditions` (string)
- `items`: Line items Array:
  - `id` (string)
  - `description` (string)
  - `quantity` (number)
  - `unitPrice` (number)
  - `taxRate` (number)
  - `amount` (number)

---

## 5. Proforma Invoices

### 5.1 Endpoints Required:
- `GET /api/v1/platform/proforma-invoices?page=1&limit=10`
- `POST /api/v1/platform/proforma-invoices`
- `GET /api/v1/platform/proforma-invoices/:id`
- `PUT /api/v1/platform/proforma-invoices/:id`
- `DELETE /api/v1/platform/proforma-invoices/:id`
- `POST /api/v1/platform/proforma-invoices/:id/convert-to-invoice`

### 5.2 Data Attributes / Schema:
- `id` (UUID)
- `proformaNumber` (string, e.g. `"PI-2026-0104"`)
- `invoiceDate` (ISO Date)
- `dueDate` (ISO Date)
- `customerName` (string)
- `customerEmail` / `customerPhone` (string)
- `billingAddress` / `shippingAddress` (string)
- `gstin` / `pan` (string)
- `status` (`'Draft' | 'Sent' | 'Approved' | 'Converted' | 'Cancelled'`)
- `subTotal`, `taxTotal`, `discountTotal`, `grandTotal` (number)
- `items`: `[ { itemId, itemDescription, hsnCode, quantity, unitPrice, gstPercent, lineTotal } ]`

---

## 6. Invoices & Billing

### 6.1 Endpoints Required:
- `GET /api/v1/platform/invoices?page=1&limit=10`
- `POST /api/v1/platform/invoices`
- `GET /api/v1/platform/invoices/:id`
- `PUT /api/v1/platform/invoices/:id`
- `DELETE /api/v1/platform/invoices/:id`
- `POST /api/v1/platform/invoices/:id/payments` (Record incoming payment)

### 6.2 Payment Record Payload:
```json
{
  "amount": 25000.00,
  "paymentDate": "2026-10-06",
  "paymentMode": "Bank Transfer", // "Bank Transfer" | "UPI" | "Credit Card" | "Cash" | "Cheque"
  "referenceNumber": "UTR99283741892",
  "notes": "Full settlement received via NEFT"
}
```

---

## 7. Subscription Plans Management

### 7.1 Endpoints Required:
- `GET /api/v1/platform/subscription-plans`
- `POST /api/v1/platform/subscription-plans`
- `PUT /api/v1/platform/subscription-plans/:id`
- `DELETE /api/v1/platform/subscription-plans/:id`

### 7.2 Plan Schema:
```json
{
  "id": "plan-diamond",
  "name": "Yaa Diamond",
  "code": "YAA_DIAMOND",
  "tier": "Diamond Specialty Suite",
  "description": "Comprehensive enterprise management for large multi-branch orgs",
  "monthlyPrice": 3599,
  "annualPrice": 35990,
  "gstRate": 18,
  "billingCycle": "Monthly", // "Monthly" | "Quarterly" | "Annually" | "One-Time"
  "pricingType": "Fixed",    // "Fixed" | "Per-User" | "Usage-Based" | "Tiered"
  "status": "Active",
  "features": [
    "Multi-Branch Support",
    "Unlimited Leads & Inquiries",
    "Advanced Financial & GST Reports",
    "24/7 Priority Support"
  ],
  "limits": {
    "adminUsers": 10,
    "staffUsers": 50,
    "branches": 5,
    "storageGB": 100
  },
  "isPopular": true
}
```

---

## 8. Organization Subscriptions Management

### 8.1 Endpoints Required:
- `GET /api/v1/platform/organization-subscriptions?page=1&limit=10&status=Active`
- `POST /api/v1/platform/organization-subscriptions` (Assign / Create Subscription)
- `POST /api/v1/platform/organization-subscriptions/:id/renew`
- `POST /api/v1/platform/organization-subscriptions/:id/cancel`

### 8.2 Subscription Entity Schema:
```json
{
  "id": "SUB-ORG-101",
  "organizationId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "orgName": "Polihills Infra",
  "orgCode": "POLI-01",
  "industry": "Real Estate & Infrastructure",
  "contactPerson": "Sarah Jenkins",
  "email": "info@polihills.com",
  "phone": "+91 98765 43211",
  "planId": "plan-diamond",
  "planName": "Yaa Diamond",
  "billingCycle": "Monthly",
  "amount": 3599,
  "startDate": "2026-01-01",
  "endDate": "2026-11-01",
  "status": "Active", // "Active" | "Expiring Soon" | "Expired" | "Cancelled"
  "autoRenew": true,
  "notes": "Annual subscription auto-renew on 1st of every month"
}
```

---

## 9. Platform Settings & Profile

### 9.1 Super Admin Profile Update
- **Endpoint**: `PUT /api/v1/platform/profile`
- **Request Body**:
  ```json
  {
    "name": "Platform Administrator",
    "email": "admin@yaacreations.com",
    "phone": "+91 98765 43210"
  }
  ```

### 9.2 Global System & Brand Settings
- **Endpoint**: `GET /api/v1/platform/settings` & `PUT /api/v1/platform/settings`
- **Fields**:
  - `systemName`: `"Yaa Creations CMS"`
  - `defaultLanguage`: `"English (US)"`
  - `currency`: `"INR (₹)"`
  - `dateFormat`: `"DD/MM/YYYY"`
  - `maintenanceMode`: `false`
  - `leadFollowUpDays`: `2`
  - `paymentDueReminderDays`: `3`
  - `subscriptionExpiryNoticeDays`: `14`

---

## 10. Standard Error & Success Response Conventions

### 10.1 Success Response (`200 OK` / `201 Created`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation completed successfully",
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalRecords": 48,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "meta": {
    "timestamp": "2026-10-06T13:56:00.000Z",
    "requestId": "e6a4bcf9-54d2-432a-bc93-a61198de7e55"
  }
}
```

### 10.2 Error Response Format (`400`, `401`, `403`, `404`, `429`)
```json
{
  "error": {
    "code": "VALIDATION_ERROR", // "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "TOO_MANY_REQUESTS" | "INTERNAL_SERVER_ERROR"
    "message": "Invalid request payload",
    "fields": [
      {
        "path": ["email"],
        "message": "Invalid email address format"
      },
      {
        "path": ["code"],
        "message": "Organization code already exists"
      }
    ]
  }
}
```

---
*Updated on October 6, 2026 with Issue Analysis & Integration Status for the Backend Engineering Team.*
