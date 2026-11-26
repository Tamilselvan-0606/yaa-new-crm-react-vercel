# Settings & Configuration Module Specification

This document provides a comprehensive technical and functional specification of the **Settings & Configuration** module within the Enterprise ERP & CRM platform (`SettingsView.tsx`).

> [!NOTE]
> Per system configuration requirements, this documentation covers all settings domains excluding *Staff*, *WhatsApp Integration*, and *Permission & Role Management*.

---

## Architecture & Layout Overview

The Settings module uses an enterprise responsive split-layout:
- **Left Navigation Sidebar**: Grouped categorized menu with active state tracking (`#33077C` deep brand purple).
- **Right Configuration Viewport**: Clean white cards with subtle border treatment (`rounded-[4px] border border-slate-200/90 shadow-2xs`).
- **Standardized Field Grids**: Uniform 4-column responsive layout (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-5`).
- **Interactive Controls**: Height `h-11` inputs with custom dropdowns, rounded circular image previews, and smooth purple toggle switches.

---

## 1. General Settings (`superAdminTab === 'general'`)

The General Settings tab provides core organizational identity, internationalization preferences, and automated system alerts.

### A. Company Information
Configures official corporate credentials, registration IDs, and public branding:

| Field Name | Type | Constraints / Format | Description |
| :--- | :--- | :--- | :--- |
| **Company Logo** | Image Upload | PNG, JPG, WEBP, SVG (&le; 2MB) | Large circular avatar preview (`w-16 h-16 rounded-full`) with adjacent `Upload Logo` / `Change` button and instant delete capability. Displayed on generated invoices, delivery challans, and outgoing PDF vouchers. |
| **Company Name** | Text Input | Required (`*`) | Official legal entity or trade name (e.g., *Yaa Creations Pvt Ltd*). |
| **Company Email** | Email Input | Required (`*`) Valid RFC email | Primary contact email for administrative notices and client correspondence. |
| **Contact Number** | Tel Input | Required (`*`) E.164 / standard | Central phone or mobile number for communication. |
| **Company Address** | Text Input | Full street / mailing address | Registered office address rendered on header blocks of financial documents. |
| **Website URL** | URL Input | Valid `https://...` | Public corporate or eCommerce portal link. |
| **GST Number** | Text Input | 15-char uppercase alphanumeric | Indian Goods & Services Tax Identification Number (GSTIN), automatically transformed to uppercase. |
| **PAN Number** | Text Input | 10-char uppercase alphanumeric | Income Tax Permanent Account Number (PAN), automatically capitalized. |

---

### B. Regional Settings
Defines regional formatting, internationalization, and time handling:

| Setting | Control Type | Options / Formats | Default Value | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Default Currency** | Select Dropdown | `INR (₹)`, `USD ($)`, `EUR (€)`, `GBP (£)`, `AED (د.إ)`, `SGD (S$)` | `INR` | Base bookkeeping and reporting currency across invoices and ledgers. |
| **Date Format** | Select Dropdown | `DD/MM/YYYY`, `MM/DD/YYYY`, `YYYY-MM-DD` | `DD/MM/YYYY` | Global presentation format for document dates, statements, and logs. |
| **Time Format** | Select Dropdown | `12 Hours with AM/PM`, `24 Hours` | `12 Hours` | Global clock display across timestamps, activity trails, and schedules. |
| **Time Zone** | Select Dropdown | `Asia/Kolkata (IST)`, `UTC`, `America/New_York (EST)`, `Europe/London (GMT)`, `Asia/Dubai (GST)`, `Asia/Singapore (SGT)` | `Asia/Kolkata` | System scheduling and transaction audit trail time anchor. |
| **Default Language** | Select Dropdown | `English`, `Tamil`, `Hindi`, `Malayalam`, `Telugu`, `Kannada` | `English` | Localization language code for UI typography and prompts. |

---

### C. Notification Preferences
Configures automated communication channels and proactive business alert thresholds:

| Trigger / Preference | Control Type | Description |
| :--- | :--- | :--- |
| **Email Notifications** | Purple Toggle Switch | Dispatches automated transaction copies, balance reminders, and summary digests via email. |
| **In-App Notifications** | Purple Toggle Switch | Enables real-time toast popups, counter badges, and notification center items within the application. |
| **Payment Reminders** | Purple Toggle Switch | Automatic notifications prior to upcoming payment deadlines or overdue client balances. |
| **Subscription Expiry Reminders** | Purple Toggle Switch | Alerts platform administrators 14 days before license or plan expiration. |
| **Invoice Notifications** | Purple Toggle Switch | Triggers alerts upon invoice creation, finalization, dispatch, and settlement. |
| **Low Stock Alerts** | Purple Toggle Switch | Immediate dashboard warnings when inventory quantity falls below reorder buffer levels. |
| **Notification Sounds** | Purple Toggle Switch | Auditory alerts on new transactions, approvals, and system alerts. |

---

## 2. Account Settings (`superAdminTab === 'account'`)

Manages the authenticated user's profile, contact details, authentication credentials, and account protection.

### A. Profile Information
- **Profile Photo**: Circular avatar (`w-16 h-16 rounded-full bg-[#33077C]`) displaying two-letter name initials by default, with adjacent "Upload Photo" / "Change" button and removal option.
- **Full Name (`*`)**: User display name (persisted across audit trails and document signatures).
- **Email Address (`*`)**: Login and recovery email identifier.
- **Mobile Number (`*`)**: Contact telephone number for 2FA OTP and system SMS notifications.

---

### B. Login & Security
Secures account access through credential rotation and multi-factor authentication:

1. **Change Password**:
   - **Current Password**: Input with show/hide eye toggle button.
   - **New Password**: Minimum 8 characters with show/hide eye toggle button.
   - **Confirm New Password**: Matching verification field with show/hide eye toggle button.
   - **Update Password Action**: Dedicated button executing authenticated API password rotation with live loader state (`isUpdatingPassword`).
2. **Two-Factor Authentication (2FA)**:
   - Modern purple toggle switch button (`role="switch"`).
   - Enables multi-factor verification requirement (TOTP authenticator or SMS verification code) on subsequent administrative logins.

---

## 3. Taxes & GST Configuration (`superAdminTab === 'taxes_gst'`)

Comprehensive Goods & Services Tax (GST) compliance and rate table management.

### A. GST Compliance Rules (Column 1)
Structured as a list of boolean configuration checkboxes:

| Configuration Item | Status | Purpose |
| :--- | :--- | :--- |
| **Enable GST** | Checkbox | Activates CGST, SGST, and IGST computations across sales and purchases. |
| **Enable HSN/SAC Code** | Checkbox | Mandates Harmonized System of Nomenclature and Service Accounting Codes on item lines. |
| **Reverse Charge (RCM)** | Checkbox | Enables Reverse Charge Mechanism flags on vendor procurement vouchers. |
| **Enable Place of Supply** | Checkbox | Determines intrastate (CGST + SGST) vs. interstate (IGST) tax logic based on state codes. |
| **Composite Scheme** | Checkbox | Restricts tax collection and simplifies compliance for composition taxpayers. |
| **Enable TCS** | Checkbox | Tax Collected at Source deduction under section 206C. |
| **Enable TDS** | Checkbox | Tax Deducted at Source deduction under section 51 of GST law. |

---

### B. Tax Rates Master Table (Column 2)
Interactive tax slab registry providing split CGST/SGST and consolidated IGST rate definitions:

- **Preconfigured Tax Slabs**:
  - `0%` (IGST@0%, CGST@0%, SGST@0%)
  - `0.25%` (IGST@0.25%, CGST@0.125%, SGST@0.125%)
  - `3%` (IGST@3%, CGST@1.5%, SGST@1.5%)
  - `5%` (IGST@5%, CGST@2.5%, SGST@2.5%)
  - `12%` (IGST@12%, CGST@6%, SGST@6%)
  - `18%` (IGST@18%, CGST@9%, SGST@9%)
  - `28%` (IGST@28%, CGST@14%, SGST@14%)
  - `40%` (IGST@40%, CGST@20%, SGST@20%)
- **Tax Slab Actions**:
  - **Add Rate Modal**: Allows creating custom rate rules (`Rate Name` and percentage `Rate %`).
  - **Inline Edit**: Edit percentage rate with immediate recalculation.
  - **Delete Action**: Red delete icon with confirmation safeguard.

---

## 4. Numbering & Prefix Configuration (`superAdminTab === 'numbering_prefix'`)

Manages dynamic prefixes, custom alphanumeric tags, and auto-increment sequences across all business modules. Organized into two distinct cards:

### Box 1: Core Transaction Prefixes
Configures the 4 primary transaction types:
1. **Invoice**
2. **Proforma**
3. **Payment**
4. **Quotation**

### Box 2: Module Specific Prefixes
Configures transaction numbering for the 11 specialized workflow modules:
1. **Sale Estimation**
2. **Sale Proforma Invoice**
3. **Sale Invoice**
4. **Sales Order**
5. **Delivery Challan**
6. **Payment In**
7. **Sales Return**
8. **Purchase Request**
9. **Purchase Bill**
10. **Purchase Return**
11. **Payment Out**

### Prefix Selector & Dropdown Features:
- **Custom Dropdown Selector**: Displays currently selected prefix (e.g. `2026-27`, `INV-`, `EST-`, `None`).
- **Dynamic Prefix List**:
  - `2026-27`
  - `FY26-27`
  - `INV-`
  - `EST-`
  - `DC-`
  - `REC-`
- **Delete on Hover**: Hovering over any prefix item in the dropdown reveals a trash can icon to remove it from the system.
- **Add Custom Prefix**: Built-in inline input at the bottom of the dropdown with an uppercase `ADD` button to register new prefix patterns instantly.

---

## 5. Audit Trail & Activity Logs (`superAdminTab === 'activity_logs'`)

Real-time immutable audit trail recording administrative actions, login attempts, configuration changes, and data modifications.

### Visual Styling:
- Signature purple table header (`bg-[#33077C] text-white`).
- High-contrast typography and subtle row hover highlights.

### Data Model & Columns:
| Column | Format / Example | Description |
| :--- | :--- | :--- |
| **TIMESTAMP** | `dd/mm/yyyy hh:mm:ss a` (e.g. `23/11/2026 03:02:18 PM`) | 12-hour timestamp with seconds and AM/PM indicator. |
| **USER** | Email address (`superadmin@gmail.com`) | Account identity responsible for the logged activity. |
| **ACTION** | Title Case (`Update Settings`, `Generate Invoice`) | System operation executed. |
| **MODULE / TARGET** | Hierarchical string (`System / Theme`, `Sale Mgmt / Invoices`) | Affected module or data entity. |
| **IP ADDRESS** | IPv4 string (`103.24.182.10`, `115.99.231.54`) | Origin IP address of client request. |
| **STATUS** | Status Badge (`Success` - Green, `Blocked` / `Failed` - Red) | Result of the action. |

---

## Technical Summary of State Management

```typescript
// Core General State
const [genCompanyName, setGenCompanyName] = useState('Yaa Creations Pvt Ltd');
const [genCompanyLogo, setGenCompanyLogo] = useState<string | null>(null);
const [genCompanyEmail, setGenCompanyEmail] = useState('contact@yaacreations.com');
const [genContactNumber, setGenContactNumber] = useState('+91 98765 43210');
const [genCompanyAddress, setGenCompanyAddress] = useState('...');
const [genWebsiteUrl, setGenWebsiteUrl] = useState('https://yaacreations.com');
const [genGstNumber, setGenGstNumber] = useState('33AAAAA0000A1Z5');
const [genPanNumber, setGenPanNumber] = useState('AAAAA0000A');

// Regional State
const [currency, setCurrency] = useState('INR');
const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
const [timeFormat, setTimeFormat] = useState<'12' | '24'>('12');
const [timezone, setTimezone] = useState('Asia/Kolkata');
const [defaultLanguage, setDefaultLanguage] = useState('English');

// Notification Preferences
const [notifEmail, setNotifEmail] = useState(true);
const [notifInApp, setNotifInApp] = useState(true);
const [notifPaymentReminders, setNotifPaymentReminders] = useState(true);
const [notifSubscriptionExpiry, setNotifSubscriptionExpiry] = useState(true);
const [notifInvoices, setNotifInvoices] = useState(true);
const [notifLowStock, setNotifLowStock] = useState(true);
const [enableSoundAlerts, setEnableSoundAlerts] = useState(true);

// Account Profile & Security State
const [accountProfilePhoto, setAccountProfilePhoto] = useState<string | null>(null);
const [accountFullName, setAccountFullName] = useState(currentUser?.name || 'Super Admin');
const [accountEmail, setAccountEmail] = useState(currentUser?.email || 'superadmin@gmail.com');
const [accountPhone, setAccountPhone] = useState('+91 98765 43210');
const [currentPassword, setCurrentPassword] = useState('');
const [newPassword, setNewPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
const [twoFactorAuth, setTwoFactorAuth] = useState(true);

// Taxes & GST State
const [enableGst, setEnableGst] = useState(true);
const [enableHsnSac, setEnableHsnSac] = useState(true);
const [reverseCharge, setReverseCharge] = useState(false);
const [enablePlaceOfSupply, setEnablePlaceOfSupply] = useState(true);
const [compositeScheme, setCompositeScheme] = useState(false);
const [enableTcs, setEnableTcs] = useState(false);
const [enableTdsState, setEnableTdsState] = useState(false);
const [taxRates, setTaxRates] = useState<TaxRate[]>(...);

// Prefix Management State
const [prefixOptions, setPrefixOptions] = useState<string[]>(['2026-27', 'FY26-27', 'INV-', 'EST-', 'DC-', 'REC-']);
const [transactionPrefixes, setTransactionPrefixes] = useState<Record<string, { prefix: string; nextNumber: string }>>(...);
```
