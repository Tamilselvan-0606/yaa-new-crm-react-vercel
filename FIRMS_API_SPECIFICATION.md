# Firms Management API Specification

This document outlines the API endpoints, schemas, parameters, and business logic required by the frontend for the **Firms Management Module** under **Sales Management**.

---

## 1. Overview & Hierarchy

In the organization hierarchy, a **Firm** represents a registered business entity / invoicing unit:
- **Organization** (Root / Parent Org)
  - **Sub-Organization** *(Optional / Nullable for direct Org firms)*
    - **Branch** *(Optional / Nullable)*
      - **Firm** (Invoicing entity under an Org, Sub-Org, or Branch)

---

## 2. Base URL & Authentication

- **Base Path**: `/api/v1/firms` (or `/firms`)
- **Headers**:
  ```http
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  Content-Type: application/json
  ```
- **Standard Organization Header / Context**:
  - The backend should automatically infer or support `organization_id` from the user session/JWT, or via header `X-Organization-Id` / query param.

---

## 3. Firm Data Model / Schema

### `Firm` Object

| Field | Type | Required | Description | Example |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `string` (UUID) | System | Unique Identifier | `"frm_9f8e7d6c-5b4a-3210"` |
| `organization_id` | `string` (UUID) | **Yes** | Root organization ID | `"org_001"` |
| `sub_organization_id` | `string` (UUID) | No | Parent Sub-Organization ID (null if directly under main org) | `"sub_123"` or `null` |
| `sub_organization_name` | `string` | Read-only | Name of the Sub-Organization | `"Yaa Creations (Main Organization)"` |
| `branch_id` | `string` (UUID) | No | Branch ID (null if not branch-specific) | `"br_456"` or `null` |
| `branch_name` | `string` | Read-only | Name of the Branch | `"Chennai Central Branch"` |
| `firm_name` | `string` | **Yes** | Registered name of the firm | `"Apex Global Trading Co."` |
| `firm_code` | `string` | System / Auto | Auto-generated firm code (e.g., `FRM-001`, `FRM-002`) | `"FRM-001"` |
| `mobile_number` | `string` | **Yes** | Primary contact/phone number (10 digits) | `"9876543210"` |
| `status` | `string` (enum) | **Yes** | Status: `'Active'` \| `'Inactive'` \| `'Suspended'` | `"Active"` |
| `created_at` | `string` (ISO 8601) | System | Timestamp created | `"2026-11-24T12:00:00Z"` |
| `updated_at` | `string` (ISO 8601) | System | Timestamp last updated | `"2026-11-24T12:00:00Z"` |

> **Note on Removed / Optional Fields**:
> The UI Add/Edit form focuses purely on the essential fields above. If the backend schema maintains legacy/extended fields (e.g. `gst_number`, `pan_number`, `email`, `logo_url`, `address`, `city`, `state`, `pincode`), they should be treated as **optional / nullable** so that creating and updating firms with the streamlined form succeeds without validation errors.

---

## 4. Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/firms` | List firms with search, filters, and pagination |
| `GET` | `/firms/:id` | Get details of a single firm |
| `POST` | `/firms` | Create a new firm (auto-generates firm code) |
| `PUT` / `PATCH` | `/firms/:id` | Update an existing firm |
| `PATCH` | `/firms/:id/status` | Update firm status (`Active` / `Inactive` / `Suspended`) |
| `DELETE` | `/firms/:id` | Soft delete or remove a firm |

---

## 5. Detailed Endpoint Specifications

### 5.1. List Firms

- **Endpoint**: `GET /firms`
- **Query Parameters**:

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :---: | :---: | :--- |
| `page_no` | `integer` | No | `1` | Page number |
| `page_size` | `integer` | No | `10` | Records per page |
| `pagination_required` | `string` / `boolean` | No | `'true'` | Pass `'false'` for full dropdown list |
| `search` | `string` | No | - | Filter by `firm_name`, `firm_code`, `mobile_number` |
| `status` | `string` | No | `'All'` | Filter by status: `'Active'`, `'Inactive'`, `'All'` |
| `sub_organization_id` | `string` | No | - | Filter firms under specific sub-organization |
| `branch_id` | `string` | No | - | Filter firms under specific branch |
| `sort_by` | `string` | No | `'created_at'` | Sorting column |
| `sort_order` | `string` | No | `'desc'` | `'asc'` or `'desc'` |

#### Response (`200 OK`)
```json
{
  "status": true,
  "message": "Firms fetched successfully",
  "data": [
    {
      "id": "frm_68a01123-b1c4-4902-8d9e",
      "firm_name": "Apex Global Trading Co.",
      "firm_code": "FRM-001",
      "mobile_number": "9876543210",
      "status": "Active",
      "organization_id": "org_001",
      "sub_organization_id": "sub_101",
      "sub_organization_name": "New Sale Sub (NSS001)",
      "branch_id": "br_201",
      "branch_name": "main branch (BR-2026-0002)",
      "created_at": "2026-11-24T06:30:00Z",
      "updated_at": "2026-11-24T06:30:00Z"
    }
  ],
  "pagination": {
    "total": 45,
    "page_no": 1,
    "page_size": 10,
    "total_pages": 5
  }
}
```

---

### 5.2. Get Single Firm

- **Endpoint**: `GET /firms/:id`

#### Response (`200 OK`)
```json
{
  "status": true,
  "message": "Firm details fetched successfully",
  "data": {
    "id": "frm_68a01123-b1c4-4902-8d9e",
    "firm_name": "Apex Global Trading Co.",
    "firm_code": "FRM-001",
    "mobile_number": "9876543210",
    "status": "Active",
    "organization_id": "org_001",
    "sub_organization_id": "sub_101",
    "sub_organization_name": "New Sale Sub (NSS001)",
    "branch_id": "br_201",
    "branch_name": "main branch (BR-2026-0002)",
    "created_at": "2026-11-24T06:30:00Z",
    "updated_at": "2026-11-24T06:30:00Z"
  }
}
```

---

### 5.3. Create Firm

- **Endpoint**: `POST /firms`
- **Request Body**:

```json
{
  "firm_name": "Apex Global Trading Co.",
  "mobile_number": "9876543210",
  "sub_organization_id": "sub_101",
  "branch_id": "br_201",
  "status": "Active"
}
```

#### Field Rules:
- `firm_name`: **Required** (String, min 2 chars, max 150 chars).
- `mobile_number`: **Required** (10-digit valid mobile format).
- `status`: **Required** (`Active` or `Inactive`, default `Active`).
- `sub_organization_id`: **Optional** (nullable if firm belongs to main parent organization).
- `branch_id`: **Optional** (nullable if firm is organization-wide).
- `firm_code`: Auto-generated sequentially by backend if omitted (e.g. `FRM-001`, `FRM-002`).

#### Response (`201 Created`)
```json
{
  "status": true,
  "message": "Firm created successfully",
  "data": {
    "id": "frm_68a01123-b1c4-4902-8d9e",
    "firm_name": "Apex Global Trading Co.",
    "firm_code": "FRM-004",
    "mobile_number": "9876543210",
    "status": "Active",
    "organization_id": "org_001",
    "sub_organization_id": "sub_101",
    "branch_id": "br_201",
    "created_at": "2026-11-24T07:15:00Z",
    "updated_at": "2026-11-24T07:15:00Z"
  }
}
```

---

### 5.4. Update Firm

- **Endpoint**: `PUT /firms/:id` (or `PATCH /firms/:id`)
- **Request Body**:

```json
{
  "firm_name": "Apex Global Trading Co. Ltd",
  "mobile_number": "9876543210",
  "sub_organization_id": "sub_101",
  "branch_id": "br_201",
  "status": "Active"
}
```

#### Response (`200 OK`)
```json
{
  "status": true,
  "message": "Firm updated successfully",
  "data": {
    "id": "frm_68a01123-b1c4-4902-8d9e",
    "firm_name": "Apex Global Trading Co. Ltd",
    "firm_code": "FRM-004",
    "mobile_number": "9876543210",
    "status": "Active",
    "updated_at": "2026-11-24T07:20:00Z"
  }
}
```

---

### 5.5. Toggle / Update Status

- **Endpoint**: `PATCH /firms/:id/status`
- **Request Body**:
```json
{
  "status": "Inactive"
}
```

#### Response (`200 OK`)
```json
{
  "status": true,
  "message": "Firm status updated to Inactive",
  "data": {
    "id": "frm_68a01123-b1c4-4902-8d9e",
    "status": "Inactive",
    "updated_at": "2026-11-24T07:22:00Z"
  }
}
```

---

### 5.6. Delete Firm

- **Endpoint**: `DELETE /firms/:id`

#### Response (`200 OK`)
```json
{
  "status": true,
  "message": "Firm deleted successfully"
}
```

#### Error Response (e.g. Firm has existing invoices / transactions) (`400 Bad Request` or `409 Conflict`)
```json
{
  "status": false,
  "message": "Cannot delete firm. There are 12 invoices associated with this firm. Please deactivate or reassign them first.",
  "code": "FIRM_HAS_ACTIVE_DEPENDENCIES"
}
```

---

## 6. Error Response Schema

All error responses follow this standard format:

```json
{
  "status": false,
  "message": "Validation failed",
  "errors": {
    "firm_name": ["Firm name is required"],
    "mobile_number": ["Please provide a valid 10-digit mobile number"]
  }
}
```
