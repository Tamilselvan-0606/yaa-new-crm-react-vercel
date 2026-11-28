# Auth Module: OTP & 2FA Backend API Specification

**Audience:** Backend Developers & API Engineers  
**Frontend Client:** React CRM Web App (`src/views/login/LoginView.tsx`, `src/api/auth/*`, `src/context/AuthContext.tsx`)  
**Base Path:** `/api/v1/auth` (or `/auth` depending on environment gateway)  
**Status:** High Priority Feature Request

---

## 1. Architectural Clarification: Single API vs. Dedicated OTP Endpoints

### Question:
> *"Can OTP be added to the existing login API itself, or should we create new APIs for OTP?"*

### Answer & Recommendation:
**Best Practice is a Hybrid 2-Step Pattern (Separate Endpoints for Request & Verification), with optional Backward Compatibility on the Login API.**

Here is why:

1. **Step-by-step nature of OTP:**
   - **Step 1 (Request OTP):** The user enters their mobile number (or email) and clicks "Send OTP". At this moment, the user does **not** have an OTP code yet.
   - **Step 2 (Verify OTP & Issue Session):** The user receives the 6-digit OTP, enters it, and clicks "Verify & Sign In".
   
   Because sending the OTP and verifying the OTP happen at two completely different moments in time, you **must have at least one dedicated endpoint to trigger/send the OTP** (`POST /auth/send-otp` or `POST /auth/otp/send`).

2. **Can `POST /auth/login` handle the verification step?**
   - **Option A (Dedicated OTP Route - Highly Recommended):**
     - `POST /auth/send-otp`: Sends the OTP SMS/email.
     - `POST /auth/verify-otp` (or `POST /auth/login/otp`): Verifies the OTP and issues tokens (`accessToken` + HttpOnly cookie `yaa_crm_refresh`).
     - *Advantages:* Clean separation of concerns, simpler validation rules, isolated rate limiting against SMS brute-force/DDoS attacks, and does not contaminate the password-based login schema.
   
   - **Option B (Combined in `POST /auth/login`):**
     - Allow `POST /auth/login` to accept an optional `otp` field:
       - If `{ identifier/email/phone, password }` is supplied -> Password login.
       - If `{ phone/email, otp }` is supplied -> OTP login.
     - *Note:* Even with Option B, you **still need a separate API** (`POST /auth/send-otp`) to generate and dispatch the SMS code to the user's phone in the first place.

**Recommendation:** Implement dedicated endpoints:
- `POST /auth/send-otp` (Triggers code generation & SMS delivery)
- `POST /auth/verify-otp` (Verifies code, authenticates user, and issues tokens)
- `POST /auth/resend-otp` (Handles resend with cooldown timer & rate-limit throttling)

---

## 2. Supported Auth Flows

The frontend UI supports two distinct OTP flows:

1. **Flow A: Direct Mobile / Email OTP Login (Passwordless Login)**
   - User chooses "Sign in with OTP" tab.
   - User inputs 10-digit mobile number or email.
   - Frontend calls `POST /auth/send-otp`.
   - User enters 6-digit OTP code in the input boxes.
   - Frontend calls `POST /auth/verify-otp`.
   - Backend returns `accessToken`, sets `yaa_crm_refresh` HttpOnly cookie, and returns user profile + organization memberships.

2. **Flow B: Two-Factor Authentication (2FA) / Step-Up Challenge (Optional Future-Proofing)**
   - User submits `{ email, password }` to `POST /auth/login`.
   - If user account has 2FA enabled, backend returns `200 OK` or `401 Unauthorized` with status:
     ```json
     {
       "success": false,
       "requires2FA": true,
       "twoFactorToken": "temp_session_token_xyz",
       "message": "OTP sent to your registered mobile number"
     }
     ```
   - User enters OTP, frontend submits `{ twoFactorToken, otp }` to `POST /auth/verify-otp`.

3. **Flow C: Forgot Password OTP Verification**
   - Triggered via `POST /auth/forgot-password` (Sends reset code).
   - Verified via `POST /auth/reset-password` (Requires email, 6-digit code, and new password).

---

## 3. Detailed API Specifications

### 3.1 Send Login OTP

Generates a secure 6-digit OTP, stores its hash with expiration (e.g., 5-10 minutes) in Redis/Database, and sends an SMS/Email.

- **Endpoint:** `POST /api/v1/auth/send-otp`
- **Access:** Public (Protected by rate limiting & IP throttling)
- **Headers:** `Content-Type: application/json`

#### Request Payload:
```json
{
  "identifier": "+919876543210",
  "type": "LOGIN",
  "channel": "SMS"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `identifier` | string | **Yes** | 10-digit mobile number (with or without country code `+91`) or registered email. |
| `type` | string | No | Purpose: `LOGIN` (default), `2FA`, or `VERIFY`. |
| `channel` | string | No | `SMS` (default), `WHATSAPP`, or `EMAIL`. |

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Verification OTP sent successfully",
  "data": {
    "identifier": "+91******3210",
    "expiresIn": 300,
    "resendCooldown": 60
  }
}
```

#### Error Responses:
- **`400 Bad Request`**:
  ```json
  {
    "success": false,
    "statusCode": 400,
    "error": {
      "message": "Invalid phone number format",
      "fields": [{ "path": ["identifier"], "message": "Please enter a valid 10-digit mobile number" }]
    }
  }
  ```
- **`404 Not Found`**:
  ```json
  {
    "success": false,
    "statusCode": 404,
    "error": {
      "message": "No registered account found with this mobile number"
    }
  }
  ```
- **`429 Too Many Requests`** (Rate limited):
  ```json
  {
    "success": false,
    "statusCode": 429,
    "error": {
      "message": "Too many OTP requests. Please wait 60 seconds before trying again."
    }
  }
  ```

---

### 3.2 Verify Login OTP

Validates the submitted 6-digit OTP. Upon successful verification, authenticates the user, generates JWT tokens, sets the `yaa_crm_refresh` HttpOnly cookie, and returns the full user payload.

- **Endpoint:** `POST /api/v1/auth/verify-otp` (or `POST /api/v1/auth/login/otp`)
- **Access:** Public
- **Headers:** `Content-Type: application/json`

#### Request Payload:
```json
{
  "identifier": "+919876543210",
  "otp": "482910",
  "rememberMe": true
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `identifier` | string | **Yes** | The mobile number or email the OTP was sent to. |
| `otp` | string | **Yes** | Exactly 6 numeric digits (e.g. `"482910"`). |
| `rememberMe` | boolean | No | Extends refresh token session duration if `true`. |

#### Success Response (`200 OK`):
*Note: Backend must set the HttpOnly cookie `yaa_crm_refresh` in the `Set-Cookie` response header.*

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Logged in successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": 86400,
    "user": {
      "id": "usr_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "email": "admin@example.com",
      "name": "Alex Johnson",
      "active": true,
      "isPlatformAdmin": false,
      "roleId": "role_org_admin",
      "roleCode": "ORG_ADMIN",
      "organizationId": "org_550e8400-e29b-41d4-a716-446655440000",
      "subOrganizationId": null,
      "accessibleBranchIds": ["branch_01", "branch_02"],
      "organizationType": 1,
      "organizationTypeName": "Client Management",
      "organization": {
        "id": "org_550e8400-e29b-41d4-a716-446655440000",
        "name": "Acme Technologies",
        "organizationType": 1,
        "organizationTypeName": "Client Management"
      },
      "role": {
        "id": "role_org_admin",
        "code": "ORG_ADMIN",
        "name": "Organization Administrator",
        "permissions": [
          { "permission": { "code": "MANAGE_ALL" } }
        ]
      },
      "memberships": [
        {
          "id": "mem_01",
          "organizationId": "org_550e8400-e29b-41d4-a716-446655440000",
          "organization": {
            "id": "org_550e8400-e29b-41d4-a716-446655440000",
            "name": "Acme Technologies"
          },
          "role": {
            "code": "ORG_ADMIN",
            "name": "Organization Administrator"
          }
        }
      ]
    }
  }
}
```

#### Set-Cookie Header:
```http
Set-Cookie: yaa_crm_refresh=def50200...; Path=/api/v1/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000
```

#### Error Responses:
- **`400 Bad Request`** (Invalid or expired code):
  ```json
  {
    "success": false,
    "statusCode": 400,
    "error": {
      "message": "Invalid or expired OTP code. Please try again."
    }
  }
  ```
- **`429 Too Many Requests`** (Brute-force protection: > 5 incorrect attempts):
  ```json
  {
    "success": false,
    "statusCode": 429,
    "error": {
      "message": "Maximum OTP verification attempts exceeded. Please request a new OTP."
    }
  }
  ```

---

### 3.3 Resend OTP

Invalidates previously generated active OTPs for the identifier and generates a fresh one.

- **Endpoint:** `POST /api/v1/auth/resend-otp`
- **Access:** Public

#### Request Payload:
```json
{
  "identifier": "+919876543210",
  "type": "LOGIN",
  "channel": "SMS"
}
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "A new verification OTP has been sent",
  "data": {
    "identifier": "+91******3210",
    "expiresIn": 300,
    "resendCooldown": 60
  }
}
```

---

## 4. Frontend & Backend Error Handling Conventions

To work seamlessly with the frontend's standard error extractor (`getApiErrorMessage`), backend error responses must follow either:

1. **Standard Error Envelope with field details:**
   ```json
   {
     "success": false,
     "statusCode": 400,
     "error": {
       "message": "Invalid OTP code",
       "fields": [
         { "path": ["otp"], "message": "Code must be 6 numeric digits" }
       ]
     }
   }
   ```
2. **Standard Message Envelope:**
   ```json
   {
     "success": false,
     "statusCode": 400,
     "message": "Invalid or expired OTP code. Please verify and try again."
   }
   ```

---

## 5. Security & Rate-Limiting Requirements

1. **Hashing in Storage:** Never store plain-text OTPs in the database or Redis. Store a salted bcrypt or SHA-256 hash:
   `hash(otp + salt)`.
2. **Short TTL:** OTP expiration must be strictly configured to **5 minutes** (maximum 10 minutes).
3. **Attempt Limiting:** Allow a maximum of **3 to 5 failed verification attempts** per OTP. On the 5th failed attempt, immediately invalidate the OTP.
4. **Resend Throttling:** Enforce a strict **60-second cooldown** between successive resend requests for the same identifier/IP.
5. **Daily Quota:** Limit maximum OTP requests to **10 per mobile number per 24 hours** to prevent SMS toll fraud / bill inflation.
6. **SMS Template Compliance:** Follow DLT (Distributed Ledger Technology) registered SMS templates for Indian phone numbers (+91), ensuring brand consistency:
   > *"Your CRM verification code is 482910. Valid for 5 minutes. Do not share this code with anyone."*

---

## 6. Summary Checklist for Backend Implementation

- [ ] Create `POST /api/v1/auth/send-otp` endpoint.
- [ ] Create `POST /api/v1/auth/verify-otp` endpoint.
- [ ] Create `POST /api/v1/auth/resend-otp` endpoint (or support `send-otp` with cooldown check).
- [ ] Return identical `user` and token payload structure as `POST /api/v1/auth/login`.
- [ ] Attach `yaa_crm_refresh` HttpOnly cookie on successful verification.
- [ ] Implement Redis/Cache TTL (5 min expiration, 60 sec resend cooldown).
- [ ] Add brute-force limit (max 5 incorrect tries before invalidation).
- [ ] Configure SMS Gateway (Twilio / MSG91 / Fast2SMS).
