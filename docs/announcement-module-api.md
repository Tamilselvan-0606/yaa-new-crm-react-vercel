# Announcement Module: Backend API Requirements

Audience: backend developers.
Frontend owner: CRM web app (React). Screens: `src/views/announcements/*`, editor: `src/components/common/RichTextEditor.tsx`.

Today the screens work end to end but keep their data in the browser (`localStorage`). This document lists everything the backend must provide so the frontend can switch to real APIs without changing the screens.

---

## 1. What the module does

A **Platform Administrator** (Super Admin) writes an announcement and sends it to organizations:

- to **all organizations**,
- to organizations of a given **organization type** (Client Management and/or Sales Management), or
- to **particular organizations** picked from a list.

The announcement has a theme, a subject, a rich text (HTML) body, and an optional attachment. The body can be started from **email templates**. Sent announcements are listed, can be viewed and deleted.

Only the Platform Administrator uses the module. Other roles do not see it.

---

## 2. Screens and what they need

### 2.1 Announcements list (`/announcements`)

| UI element | Needs from the API |
| --- | --- |
| Table: subject, theme, recipients, attachment, sent date, status | Paginated list |
| Search box (subject, theme, body text) | `search` query parameter |
| Filter "Recipients": All / All Organizations / By Organization Type / Particular Organizations | `recipientMode` query parameter |
| "Total Announcements" counter | `pagination.totalRecords` |
| Page size selector (5, 10, 20, 50) and page buttons | `page_no`, `page_size` |
| View (eye) | Get one announcement (full HTML body, recipient names) |
| Delete (bin) | Delete one announcement |
| Add Announcement button | Opens the Create screen |

### 2.2 Create Announcement (`/announcements/new`)

| UI element | Details |
| --- | --- |
| Theme (text, required) | Short label, e.g. "Maintenance", "New Feature", "Offer" |
| Subject (text, required) | Email subject / title |
| Announcement Content (rich text, required) | HTML. Tabs: Email Composer and Email Client Preview |
| Email Templates (multi-select, search) | Templates that fill the body (section 6) |
| Attachment (optional, one file) | PDF, DOC, DOCX, JPG, JPEG, PNG, max 5 MB |
| Recipients (3 options) | All Organizations, By Organization Type, Particular Organization |
| Organization Type choices | Client Management, Sales Management (one or both) |
| Particular Organization list | Searchable multi-select of organizations (name and code) |
| Cancel | Back to the list |
| Send Announcement | Creates and sends the announcement |

Validation shown in the UI (the backend must enforce the same rules):

| Field | Rule | Message |
| --- | --- | --- |
| theme | required | Theme is required |
| subject | required | Subject is required |
| content | required, must contain visible text (not only empty tags) | Announcement content is required |
| recipients (particular) | at least one organization | Select at least one organization |
| recipients (by type) | at least one type | Select at least one organization type |

---

## 3. Conventions (same as the existing platform APIs)

Base path: `/api/v1/platform/announcements`

Authentication: `Authorization: Bearer <accessToken>`. Cookies are sent (`withCredentials`).

Permission: Platform Administrator only (`isPlatformAdmin` / role `SUPER_ADMIN`). Everyone else gets `403 FORBIDDEN`.

Success envelope:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Announcements fetched successfully",
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "page_no": 1,
    "page_size": 10,
    "totalRecords": 0,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  },
  "meta": { "timestamp": "2026-11-05T10:00:00.000Z", "requestId": "uuid" }
}
```

Validation error (important: the frontend shows each entry of `fields` to the user, so give clear messages and a `path` per field):

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "fields": [
      { "path": ["subject"], "message": "Subject is required" }
    ]
  }
}
```

Other errors use the same shape with `code` and `message` (`NOT_FOUND`, `FORBIDDEN`, `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`).

Query parameters follow the rest of the platform: `page_no`, `page_size`, `search`, `sortBy`, `sortOrder`, plus `page` and `limit` accepted as aliases.

Unknown JSON keys in a request are rejected by other APIs of this project (for example `Unrecognized key`). Please keep the field names in this document exactly, or tell the frontend if they change.

---

## 4. Data model

### 4.1 Announcement

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | uuid | server | |
| `code` | string | server | Optional readable code, e.g. `ANN-2026-0001` |
| `theme` | string (max 100) | yes | |
| `subject` | string (max 200) | yes | |
| `contentHtml` | string (HTML, max about 200 KB) | yes | Sanitized on the server (section 7) |
| `contentText` | string | server | Plain text of the body, for search and previews |
| `recipientMode` | enum `ALL` / `TYPE` / `SELECTED` | yes | |
| `organizationTypes` | number[] | when `TYPE` | `1` = Client Management, `2` = Sales Management |
| `organizationIds` | uuid[] | when `SELECTED` | |
| `recipientCount` | integer | server | Number of organizations the announcement was sent to (computed at send time) |
| `attachment` | object or null | no | See 4.2 |
| `status` | enum | server | `Sent` today. `Draft`, `Scheduled`, `Failed` are optional future values |
| `sentAt` | ISO datetime | server | The frontend shows this as "Sent Date" |
| `createdBy` | `{ id, name, email }` | server | |
| `createdAt`, `updatedAt` | ISO datetime | server | |

`recipientMode` meaning:

| Mode | Who receives it |
| --- | --- |
| `ALL` | Every active organization |
| `TYPE` | Organizations whose `organizationType` is in `organizationTypes`. An organization with type `0` (All) receives it when either `1` or `2` is chosen |
| `SELECTED` | Only the organizations in `organizationIds` |

Notes for `recipientCount`:
- "Active" means organization status `Active`. Skip `Inactive` and `Suspend` organizations.
- The count is fixed when the announcement is sent, even if organizations change later.

### 4.2 Attachment

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | |
| `fileName` | string | Original name |
| `mimeType` | string | |
| `size` | integer (bytes) | |
| `url` | string | Download URL (signed or authenticated) |

Rules: one file per announcement, at most 5 MB, extensions `pdf`, `doc`, `docx`, `jpg`, `jpeg`, `png`. Check the real content type on the server, not only the extension. Respond `413` for a larger file and `415` for another type.

### 4.3 Recipient record (one per organization per announcement)

Needed to know who received and read it.

| Field | Type | Notes |
| --- | --- | --- |
| `announcementId` | uuid | |
| `organizationId` | uuid | |
| `deliveryStatus` | enum `Pending` / `Delivered` / `Failed` | |
| `readAt` | ISO datetime or null | Set when an organization user reads it |
| `error` | string or null | Reason when delivery failed |

---

## 5. Endpoints

### 5.1 List announcements

`GET /platform/announcements`

Query parameters:

| Name | Type | Notes |
| --- | --- | --- |
| `page_no`, `page_size` | integer | Default 1 and 10. Maximum page size 100 |
| `search` | string | Case-insensitive match on `subject`, `theme` and `contentText` |
| `recipientMode` | `ALL` / `TYPE` / `SELECTED` | Optional filter |
| `status` | string | Optional |
| `from`, `to` | ISO date | Optional filter on `sentAt` |
| `sortBy` | `sentAt` / `subject` / `theme` | Default `sentAt` |
| `sortOrder` | `asc` / `desc` | Default `desc` |

Response `data` is an array of list items. The list does not need the full body.

```json
{
  "id": "uuid",
  "code": "ANN-2026-0001",
  "theme": "Maintenance",
  "subject": "Scheduled maintenance on Sunday",
  "contentPreview": "The platform will be unavailable for a short time...",
  "recipientMode": "TYPE",
  "organizationTypes": [1],
  "recipientCount": 18,
  "attachment": { "id": "uuid", "fileName": "notice.pdf", "size": 120394 },
  "status": "Sent",
  "sentAt": "2026-11-05T09:30:00.000Z",
  "createdAt": "2026-11-05T09:30:00.000Z"
}
```

The frontend reads `attachment.fileName` and `recipientMode`, `organizationTypes`, `recipientCount` for the Recipients column.

### 5.2 Get one announcement

`GET /platform/announcements/{id}`

Returns the list item plus:

```json
{
  "contentHtml": "<h2>...</h2><p>...</p>",
  "organizationIds": ["uuid"],
  "recipients": [
    { "organizationId": "uuid", "name": "Client Organization", "code": "CO-001", "deliveryStatus": "Delivered", "readAt": null }
  ],
  "createdBy": { "id": "uuid", "name": "Platform Admin", "email": "admin@example.com" }
}
```

`recipients` lists the organizations the announcement went to. For `ALL` this can be a long list, so it is acceptable to return the first 100 and a `recipientCount`. The view window shows "To: name, name, ..." only for `SELECTED`.

`404 NOT_FOUND` when the id does not exist.

### 5.3 Create and send

`POST /platform/announcements`

Request body (JSON), `recipientMode: "ALL"`:

```json
{
  "theme": "Maintenance",
  "subject": "Scheduled maintenance on Sunday",
  "contentHtml": "<h2>Scheduled maintenance</h2><p>...</p>",
  "recipientMode": "ALL",
  "attachmentId": "uuid"
}
```

By organization type:

```json
{
  "theme": "New Feature",
  "subject": "What is new",
  "contentHtml": "<p>...</p>",
  "recipientMode": "TYPE",
  "organizationTypes": [1, 2]
}
```

Particular organizations:

```json
{
  "theme": "Renewal",
  "subject": "Your subscription renews soon",
  "contentHtml": "<p>...</p>",
  "recipientMode": "SELECTED",
  "organizationIds": ["uuid", "uuid"]
}
```

Rules:
- `theme`, `subject`, `contentHtml`, `recipientMode` are required.
- `organizationTypes` is required (and not empty) only for `TYPE`. Values are `1` and `2`. Do not accept `organizationIds` with `TYPE`.
- `organizationIds` is required (and not empty) only for `SELECTED`. Every id must be an existing organization, otherwise `404` or `422` naming the id.
- `attachmentId` is optional and refers to a file uploaded with 5.5 (the file must belong to the caller and not be used by another announcement).
- If the resolved recipient list is empty, respond `422` with a clear message, for example "No organizations match the chosen recipients".

Response `201`: the announcement as in 5.2. The announcement is `Sent` once it is accepted. Delivery to organizations may continue in the background (section 8).

### 5.4 Delete

`DELETE /platform/announcements/{id}`

Removes the announcement from the Platform Administrator list. Please decide and tell the frontend one of the two behaviors:
- hard delete (organizations no longer see it), or
- soft delete from the Platform Administrator list only (organizations keep what they already received).

Response `200` with `{ "success": true, "message": "Announcement deleted successfully" }`.

### 5.5 Upload attachment

`POST /platform/announcements/attachments` (`multipart/form-data`, field `file`)

Response `201`:

```json
{
  "success": true,
  "data": { "id": "uuid", "fileName": "notice.pdf", "mimeType": "application/pdf", "size": 120394, "url": "https://..." }
}
```

Uploaded files that are never attached to an announcement should be removed automatically after about 24 hours.

### 5.6 Recipient helpers (for the Create screen)

The "Particular Organization" list and the counts use the existing organization APIs, so no new endpoint is strictly needed:

- `GET /platform/organizations?page_no=1&page_size=100&pagination_required=true` is used today for the list (name, code, `organizationType`).

Optional but recommended, so the screen can show how many organizations will receive an announcement without loading every organization:

`GET /platform/announcements/recipient-count`

| Query | Notes |
| --- | --- |
| `recipientMode` | `ALL` / `TYPE` / `SELECTED` |
| `organizationTypes` | comma separated, e.g. `1,2` |
| `organizationIds` | comma separated |

Response: `{ "success": true, "data": { "count": 18 } }`, using the same rules as 4.1.

### 5.7 Templates

The editor offers email templates (section 6). Two options:

1. **Built in, no API.** The five templates in section 6 stay in the frontend. Choose this if templates will not change.
2. **Managed by the backend (recommended).** The Platform Administrator can add and edit templates later.

If option 2 is chosen, provide:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/platform/announcement-templates` | List (`search`, `page_no`, `page_size`). Returns `id`, `name`, `description`, `contentHtml`, `isSystem`, `isActive` |
| `GET` | `/platform/announcement-templates/{id}` | One template |
| `POST` | `/platform/announcement-templates` | Create (`name`, `description`, `contentHtml`) |
| `PATCH` | `/platform/announcement-templates/{id}` | Update |
| `DELETE` | `/platform/announcement-templates/{id}` | Delete. System templates cannot be deleted |

Seed the five templates of section 6 with `isSystem: true`. The template body is HTML and goes through the same sanitizer (section 7).

### 5.8 Endpoints for organization users (implemented by the backend, used by the frontend)

Base: `/platform/announcements/inbox`. Permission `platform.read`; the organization comes from the `x-organization-id` header (the frontend sends it for every organization user).

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/platform/announcements/inbox` | Announcements sent to the caller's organization. Query: `page_no`, `page_size`, `search`, `isRead`. Returns `summary.unreadCount` |
| `GET` | `/platform/announcements/inbox/unread-count` | `{ data: { count } }` for the sidebar badge |
| `GET` | `/platform/announcements/inbox/{id}` | Opens one announcement (full `contentHtml`, attachment with `url`) and marks it read |
| `PATCH` | `/platform/announcements/inbox/{id}/read` | Marks it read |

An organization sees an announcement when it is in the recipient records (section 4.3).

---

## 6. Email templates (exact content)

These are the templates the editor offers today. The user can tick several; they are added to the message in list order with a horizontal line (`<hr>`) between them, below any text already written.

The class `rte-callout` is a highlighted box and must survive sanitizing (section 7).

### 6.1 Welcome Message
`id: welcome`, description: "Greet organizations and share the next steps"

```html
<h2>Welcome to the platform</h2>
<p>Hello team,</p>
<p>We are glad to have you with us. Your account is ready, and you can start managing your organization right away.</p>
<ul><li>Complete your organization profile</li><li>Add your branches and products</li><li>Invite your team</li></ul>
<p>If you need any help, our support team is always here for you.</p>
<p>Regards,<br>Platform Team</p>
```

### 6.2 Scheduled Maintenance
`id: maintenance`, description: "Tell organizations about planned downtime"

```html
<h2>Scheduled maintenance</h2>
<div class="rte-callout"><strong>Heads up:</strong> The platform will be unavailable for a short time during maintenance.</div>
<table><tbody><tr><th>Date</th><th>Time</th><th>Expected downtime</th></tr>
<tr><td>DD / MM / YYYY</td><td>00:00 - 02:00</td><td>About 2 hours</td></tr></tbody></table>
<p>Please save your work before the maintenance window starts. Thank you for your patience.</p>
```

### 6.3 New Feature Release
`id: feature`, description: "Announce a new feature or improvement"

```html
<h2>What is new</h2>
<p>We have just released an update that makes your work easier:</p>
<ul><li><strong>Feature name</strong> - short description of the benefit</li><li><strong>Improvement</strong> - what is faster or simpler now</li></ul>
<blockquote>Tell us what you think. Your feedback shapes what we build next.</blockquote>
```

### 6.4 Subscription Renewal Reminder
`id: payment`, description: "Remind organizations about an upcoming renewal"

```html
<h2>Your subscription renews soon</h2>
<p>This is a friendly reminder that your subscription is due for renewal.</p>
<div class="rte-callout"><strong>Renewal date:</strong> DD / MM / YYYY</div>
<p>Renew before the due date to continue without interruption.</p>
```

### 6.5 Holiday Notice
`id: holiday`, description: "Share holiday timings and support availability"

```html
<h2>Holiday notice</h2>
<p>Our team will be on leave on <strong>DD / MM / YYYY</strong> for the holiday.</p>
<p>Support requests raised during this time will be answered on the next working day.</p>
<p>Wishing you a wonderful holiday! 🎉</p>
```

The placeholders `DD / MM / YYYY` are for the user to replace. The backend does not fill them in.

---

## 7. Rich text (HTML) body

The editor is a browser `contentEditable` editor. It produces plain HTML and the same HTML is used for the preview, the view window and the email.

### 7.1 Formatting the editor can produce

| Feature | HTML |
| --- | --- |
| Text style | `<p>`, `<h1>`, `<h2>`, `<h3>`, `<blockquote>`, `<div>` |
| Text size | `<font size="2..6">` (browser generated) |
| Bold, italic, underline, strike | `<b>` / `<strong>`, `<i>` / `<em>`, `<u>`, `<strike>` / `<s>` |
| Code, subscript, superscript | `<code>`, `<sub>`, `<sup>` |
| Text colour | `<font color="#hex">` or `<span style="color: ...">` |
| Highlight | `<span style="background-color: ...">` |
| Alignment | `style="text-align: left / center / right / justify"` on `<p>` / `<div>` |
| Lists | `<ul>`, `<ol>`, `<li>` |
| Callout box | `<div class="rte-callout">...</div>` |
| Table | `<table>`, `<tbody>`, `<tr>`, `<th>`, `<td>` (`<thead>` allowed) |
| Link | `<a href="https://...">` (only `http`, `https`, `mailto`) |
| Horizontal line | `<hr>` |
| Line break | `<br>` |
| Emoji | plain Unicode text (store as UTF-8) |

### 7.2 Sanitizing on the server (required)

The frontend removes dangerous markup before showing it, but the backend must sanitize too because it stores and emails the HTML.

- Remove `script`, `style`, `iframe`, `object`, `embed`, `link`, `meta`, `base`, `form` and every other tag not in the list above.
- Remove every `on*` attribute and any `href` / `src` starting with `javascript:` or `data:`.
- Allow only these attributes: `href` (on `a`), `target`, `rel`, `class` (only the value `rte-callout`), `style` (only `color`, `background-color`, `text-align`, `font-size`), `color` and `size` (on `font`).
- Force `rel="noopener noreferrer"` and `target="_blank"` on links.
- Reject a body larger than about 200 KB with `413`.
- Store the sanitized HTML in `contentHtml` and a plain text version in `contentText` (used for search and `contentPreview`, first 160 characters).
- The body is "empty" when `contentText` is empty after trimming. Respond `400` with `path: ["contentHtml"]`.

### 7.3 Email rendering

When the announcement is sent by email, wrap `contentHtml` in the platform's email layout. Add inline styles for headings, lists, tables and `rte-callout`, because many email clients ignore CSS classes. Suggested callout style: `border-left: 4px solid #33077C; background: #F5F3FF; padding: 10px 14px; border-radius: 6px;`.

---

## 8. Sending and delivery

1. On `POST`, validate, resolve the recipient organizations, store the announcement and one recipient record per organization.
2. Deliver in the background: email to the organization's contact email (and the organization administrator login email), and an in-app notification (section 8.1). Mark each recipient `Delivered` or `Failed` with the reason.
3. The API does not need to wait for every email. It returns `201` once the announcement is stored and queued.
4. A failed recipient must not stop the others. Retry failed emails a few times.
5. Include the attachment with the email when there is one.
6. The Platform Administrator should be able to see delivery results. Suggested: `GET /platform/announcements/{id}/recipients` with `deliveryStatus`, `readAt`, `error`, paginated.

### 8.1 In-app notification

If the project's existing notification system (`/admin-notifications`) is used, create one notification per organization with:

| Field | Value |
| --- | --- |
| `type` | `ALL` (or `CLIENT` / `SALES` by the organization's type, as the project does today) |
| `module` | `announcements` |
| `action` | `created` |
| `title` | the subject |
| `message` | the first 160 characters of the body text |
| `link` | `/announcements/{id}` |

---

## 9. Other rules and details

- **Audit:** record who created and deleted each announcement (`createdBy`, and a deleted-by/at if soft delete is used). Platform notifications of type `SUPER_ADMIN` can be created for these actions, as for other modules.
- **Editing:** the current UI does not edit a sent announcement. Only create, view and delete are needed. (An edit or resend endpoint can be added later.)
- **Drafts and scheduling:** not in the UI yet. If the backend wants to prepare for them, `status` can already allow `Draft` and `Scheduled`, and `POST` can accept optional `scheduledAt`. The frontend will tell you when these screens are added.
- **Dates:** return ISO 8601 UTC. The screen shows dates like "05 Nov 2026".
- **Search:** `search` matches `subject`, `theme` and `contentText`, case-insensitive, trimmed, blank ignored, at most 100 characters.
- **Limits:** subject 200 characters, theme 100 characters, body about 200 KB, one attachment of 5 MB.
- **Caching:** the frontend caches list calls by URL and parameters and clears them after a create or delete. No special headers are needed.
- **Idempotency:** please protect against a double click on Send (for example ignore a second identical request from the same user within a few seconds, or support an `Idempotency-Key` header).

---

## 10. Mapping from what the frontend stores today

This is how the browser record maps to the API, so the migration is mechanical.

| Frontend field today | API field |
| --- | --- |
| `theme` | `theme` |
| `subject` | `subject` |
| `contentHtml` | `contentHtml` |
| `attachment.name` / `attachment.size` | `attachment.fileName` / `attachment.size` (file uploaded with 5.5) |
| `recipientMode` (`ALL` / `TYPE` / `SELECTED`) | `recipientMode` |
| `recipientTypes` (`"Client Management"`, `"Sales Management"`) | `organizationTypes` (`1`, `2`) |
| `recipients` (organization names) | `recipients[].name` (from `organizationIds`) |
| `recipientCount` | `recipientCount` |
| `status` (`Sent`) | `status` |
| `createdAt` (shown as sent date) | `sentAt` |

---

## 11. Checklist for the backend

- [ ] `POST /platform/announcements` for `ALL`, `TYPE`, `SELECTED`, with validation errors in the `fields` format
- [ ] `GET /platform/announcements` with `search`, `recipientMode`, `status`, dates, sorting and pagination
- [ ] `GET /platform/announcements/{id}` with the full HTML body and recipients
- [ ] `DELETE /platform/announcements/{id}`
- [ ] `POST /platform/announcements/attachments` (5 MB, PDF / DOC / DOCX / JPG / JPEG / PNG)
- [ ] HTML sanitizer and plain text extraction
- [ ] Recipient resolution (`ALL`, by organization type with type `0` counted in both, specific organizations, active organizations only)
- [ ] Background delivery (email and in-app notification) with per-organization status
- [ ] `GET /platform/announcements/recipient-count` (recommended)
- [ ] Templates: either keep them in the frontend or provide the template endpoints and seed the five templates of section 6
- [ ] Organization-side endpoints of section 5.8 (can be a later phase)
- [ ] Platform Administrator only, everything else returns `403`

Please send the final request and response shapes to the frontend team, especially the field names, the delete behavior (hard or soft) and whether templates are built in or managed by the backend.
