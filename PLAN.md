# LogiQ-On Tech — Integrated Supply Chain Build Plan

## Overview

Full end-to-end supply chain platform: Customer storefront → Stripe payment → Sales Order → 
Purchase Order → Supplier fulfillment (Sektor) → IMAP invoice receipt → 3-way match → 
MYOB bill → Monoova bank transfer → Warranty lifecycle monitoring.

**Stack:** Next.js 14.2.5 App Router · Prisma 5.x · PostgreSQL (local) / Neon (prod) ·
NextAuth v4 JWT + TOTP MFA · Stripe · MYOB AccountRight API · Monoova NPP · IMAP/Gmail

**Production URL:** https://logi-q-on-tech.vercel.app  
**Repo branch strategy:** `dev` → `main` (Vercel auto-deploys main)  
**DB migration strategy:** `prisma db push` (no migrate deploy) — `--accept-data-loss` for Neon

---

## Integration Stack

| Integration | Purpose | Credentials needed |
|---|---|---|
| **Stripe** | Customer card payment (test mode) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` ✅ configured |
| **MYOB AccountRight** | All financial recording: PO numbers, Bill numbers, Payment bookkeeping | `MYOB_CLIENT_ID`, `MYOB_CLIENT_SECRET`, `MYOB_COMPANY_FILE_ID` — developer sandbox |
| **Monoova** | Actual AUD bank transfer to supplier via NPP/OSKO | `MONOOVA_USERNAME`, `MONOOVA_PASSWORD` — sandbox available |
| **IMAP / Gmail** | Poll supplier invoice inbox every 5 min | `IMAP_HOST`, `IMAP_PORT`, `IMAP_USER`, `IMAP_PASS` (Gmail App Password) |
| **Sektor API** | Tracking webhooks relayed to customer | `SEKTOR_API_KEY` |
| **Nodemailer / SMTP** | Outbound emails (order confirm, PO, remittance, warranty alerts) | Already wired via existing `src/lib/email.ts` |

---

## Complete Process Flow (13 steps)

1. **Customer Order** — guest fills checkout form on `/products/shop/checkout`
2. **Stripe Payment** — redirected to Stripe Checkout; card charged; `checkout.session.completed` webhook fires
3. **StorefrontOrder + SalesOrder created** — webhook handler creates both records, status `SO_CREATED`
4. **Customer Invoice** — auto-generated from SalesOrder; MYOB invoice number recorded
5. **Item/Supplier Match** — system identifies which vendor supplies each line item (via ItemMaster.vendorId)
6. **MYOB Purchase Order** — `POST /Purchase/Order` to MYOB → stores `myobPoNumber`; PO PDF emailed to `vendor.poEmail`
7. **Sektor Fulfillment** — supplier ships; Sektor tracking webhooks relayed to customer email
8. **IMAP Invoice Receipt** — poll `vendor.apEmail` inbox every 5 min; parse PDF → create `SupplierInvoice` record
9. **3-Way Match** — PO lines ↔ Goods Receipt lines ↔ Supplier Invoice lines (±2% tolerance)
10. **MYOB Bill** — on clean match: `POST /Purchase/Bill` → stores `myobBillNumber`
11. **Monoova Payment** — admin clicks "Pay Supplier" → `POST /transactions/osko/v1` → actual NPP transfer; MYOB records bookkeeping entry via `POST /Purchase/SupplierPayment`
12. **Warranty Monitoring** — WarrantyRecord created per serial/batch from confirmed invoice; daily cron recalculates `remainingDays`; escalating alerts at 180/90/60/30/14/7/0 days
13. **Global Traceability** — search any reference (SO#, PO#, invoice#, serial#, customer email) → full chain view

---

## Phases

### ✅ Phase 1 — Schema Expansion + Master Data UI (COMPLETE)

**Schema changes (`prisma/schema.prisma`):**
- `UserRole` enum: 9 roles (added PROCUREMENT, WAREHOUSE, ACCOUNTS_PAYABLE, FINANCE_APPROVER, WARRANTY_MANAGER, ANALYST)
- `Vendor`: 8 new fields (poEmail, apEmail, paymentTerms, currency, bankBsb, bankAccountNumber, bankAccountName, myobContactId)
- `ItemMaster`: 11 new fields (manufacturerCode, supplierItemCode, supplierEmail, leadTimeDays, mrq, serialTracked, batchTracked, warrantyPeriodMonths, warrantyStartRule, taxPercent)
- New models: `WarrantyRecord`, `WarrantyNotification`, `StorefrontOrder`, `StorefrontOrderItem`
- New enums: `WarrantyStatus`, `StorefrontOrderStatus` (13 statuses)
- MYOB ref fields on: PurchaseOrder, SupplierInvoice, SupplierPayment, CustomerInvoice, CustomerPayment
- Monoova fields on: SupplierInvoice, SupplierPayment, StorefrontOrder

**UI changes:**
- Item Master form: Section 5 "Supply Chain Codes & Warranty" (manufacturer/supplier codes, supplier email, lead time, MRQ, tax%, warranty period/rule, serial/batch tracking)
- Vendor Directory: "Supplier Payment & Contact Details" panel + edit modal in the Inspect modal

**API changes:**
- `GET /api/admin/vendors` — returns new payment fields
- `PUT /api/admin/vendors` — saves bank details + contact emails
- `POST /api/mdm/items` + `PUT /api/mdm/items` — accepts all new supply chain fields

---

### ✅ Phase 2 — Stripe Checkout (COMPLETE)

**New files:**
- `src/lib/stripe.ts` — Stripe singleton (v22, API `2026-08-26.dahlia`)
- `src/app/api/checkout/stripe-session/route.ts` — POST: server-side price re-resolution → Stripe Checkout session → returns `session.url`
- `src/app/api/webhooks/stripe/route.ts` — handles `checkout.session.completed`: verify sig → idempotency guard → create StorefrontOrder + StorefrontOrderItem + SalesOrder → confirmation email
- `src/app/api/checkout/order-status/route.ts` — GET: polled by confirmation page, returns order once webhook has processed

**Updated files:**
- `src/app/products/shop/checkout/page.tsx` — Stripe redirect flow (removed invoice-terms dropdown)
- `src/app/products/shop/confirmation/page.tsx` — handles `?session_id=` with polling loop
- `src/lib/document-sequences.ts` — added `SFO` sequence key (prefix `SFO-YYYY-NNNNN`)

**Env vars (all set in Vercel + local .env):**
- `STRIPE_SECRET_KEY` ✅
- `STRIPE_WEBHOOK_SECRET` ✅ (`whsec_HXfLgRDQqINNDjLJ6XgfCH1rMIxbjQvv`)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` ✅

**Stripe webhook endpoint:** `https://logi-q-on-tech.vercel.app/api/webhooks/stripe`  
**Event:** `checkout.session.completed`

---

### ⏸ Phase 3 — MYOB Integration (live API) — DEFERRED

> Deferred. For now MYOB gets its data through the monthly file export in **Next Steps** below. The live API integration stays possible later and needs a MYOB plan with API access plus a MYOB developer key. Until then `src/lib/myob.ts` runs in demo mode (no `MYOB_CLIENT_ID`).

**Trigger:** After StorefrontOrder status reaches `SO_CREATED` (set by Stripe webhook)

**What to build:**

#### 3a. MYOB OAuth + Client Setup
- `src/lib/myob.ts` — MYOB AccountRight client
  - OAuth2 token fetch (client credentials flow): `POST https://secure.myob.com/oauth2/v1/authorize`
  - Token refresh logic (tokens expire in 20 min)
  - Base URL pattern: `https://api.myob.com/accountright/{companyFileId}/`

#### 3b. Create Purchase Order in MYOB
- After SO_CREATED: call `POST /Purchase/Order/Item` in MYOB
  - Body: supplier (from vendor.myobContactId), lines (itemCode, description, qty, unitPrice, taxCode AUS), shipTo (deliveryAddress)
  - Store returned GUID + order number on `StorefrontOrder.myobPoGuid` + `myobPoNumber`
  - Advance status to `PO_SENT`

#### 3c. Generate PO PDF + Email to Supplier
- Generate PDF (use existing PO PDF pattern in `src/lib/pdf.ts` or create via html-to-pdf)
- Email to `vendor.poEmail` with subject `Purchase Order {myobPoNumber} — LogiQ-On Tech`
- Store `StorefrontOrder.poEmailSentAt` + `poEmailSentTo`

#### 3d. Trigger point
- Option A: call synchronously from Stripe webhook (after SalesOrder created)
- Option B: background job / cron that picks up `SO_CREATED` records
- **Decision: Option A** — keep it synchronous in the webhook handler for simplicity

**New env vars needed:**
- `MYOB_CLIENT_ID`
- `MYOB_CLIENT_SECRET`
- `MYOB_COMPANY_FILE_ID`
- `MYOB_USERNAME` (the MYOB user's email)
- `MYOB_PASSWORD` (the MYOB user's password)

**Files to create:**
- `src/lib/myob.ts` — MYOB API client + PO creation helper
- `src/app/api/myob/po/route.ts` — manual trigger endpoint (POST, PLATFORM_OWNER only) for retrying failed PO creation

---

### 🔲 Phase 4 — IMAP Polling + PDF Invoice Parsing

**What to build:**

#### 4a. IMAP Poller (cron every 5 min)
- `src/lib/imap.ts` — IMAP client using `imap` npm package
  - Connect to Gmail IMAPS (imap.gmail.com:993)
  - Search UNSEEN emails in INBOX
  - Download attachments (PDF only)
  - Mark as SEEN after processing
- `src/app/api/cron/poll-invoices/route.ts` — GET endpoint called by Vercel cron
- `vercel.json` — add cron: `{ "path": "/api/cron/poll-invoices", "schedule": "*/5 * * * *" }`

#### 4b. PDF Invoice Parser
- `src/lib/invoice-parser.ts` — regex-based PDF text extraction
  - Extract: invoice number, invoice date, supplier name, line items (description, qty, unit price), total, GST
  - Use `pdf-parse` npm package
  - Match to open PurchaseOrder via supplier name / PO number reference in email subject or body

#### 4c. SupplierInvoice record creation
- Create `SupplierInvoice` row linked to `PurchaseOrder`
- Set `StorefrontOrder.supplierInvoiceReceivedAt`
- Advance status to `INVOICE_RECEIVED`
- Trigger 3-way match check (Phase 5)

**New env vars needed:**
- `IMAP_HOST` (e.g. `imap.gmail.com`)
- `IMAP_PORT` (993)
- `IMAP_USER` (Gmail address)
- `IMAP_PASS` (Gmail App Password — not account password)

**npm packages to install:** `imap`, `mailparser`, `pdf-parse`

---

### 🔲 Phase 5 — 3-Way Match + MYOB Bill + Monoova Payment

**What to build:**

#### 5a. 3-Way Match Engine
- `src/lib/three-way-match.ts`
  - Compare: PO lines ↔ GoodsReceipt lines ↔ SupplierInvoice lines
  - Tolerance: ±2% on price, exact on quantity (or flag as exception)
  - Result: `MATCHED` | `MATCH_EXCEPTION` with notes
  - Store on `StorefrontOrder.threeWayMatchResult` + `matchedAt`

#### 5b. MYOB Bill creation (on clean match)
- `POST /Purchase/Bill/Item` in MYOB
- Store `myobBillGuid` + `myobBillNumber` on StorefrontOrder
- Advance status to `BILL_CREATED`

#### 5c. Monoova Payment (admin-triggered)
- Admin pipeline view → "Pay Supplier" button
- `src/app/api/payments/supplier/route.ts` — POST (PLATFORM_OWNER + FINANCE_APPROVER only)
  - Call Monoova `POST /transactions/osko/v1`:
    ```json
    { "sourceAccountId": "...", "toAccountBSB": vendor.bankBsb, 
      "toAccountNumber": vendor.bankAccountNumber, 
      "toAccountName": vendor.bankAccountName,
      "amount": totalAmount, "description": "PO {myobPoNumber}" }
    ```
  - Store `monoovaTxnId` + `monoovaStatus` on StorefrontOrder
  - Call MYOB `POST /Purchase/SupplierPayment` to record bookkeeping entry → store `myobPaymentGuid`
  - Advance status to `SUPPLIER_PAID`

**New env vars needed:**
- `MONOOVA_USERNAME`
- `MONOOVA_PASSWORD`
- `MONOOVA_SOURCE_ACCOUNT_ID`
- `MONOOVA_BASE_URL` (sandbox: `https://sandbox.monoova.com`)

---

### 🔲 Phase 6 — Warranty Lifecycle Module

**What to build:**

#### 6a. WarrantyRecord creation
- Triggered when SupplierInvoice is confirmed (3-way match passes)
- One WarrantyRecord per serial number (if serialTracked) or per line (if not)
- Fields: itemMasterId, partNumber, serialNumber, salesOrderId, purchaseOrderId, 
  customerName, vendorName, warrantyStartRule, warrantyStartDate, warrantyPeriodMonths, 
  warrantyExpiryDate, remainingDays, status

#### 6b. Daily remaining-days cron
- `src/app/api/cron/warranty-check/route.ts`
- `vercel.json` cron: `{ "path": "/api/cron/warranty-check", "schedule": "0 1 * * *" }` (1am daily)
- Recalculates `remainingDays` = `warrantyExpiryDate` - today for all ACTIVE records
- Updates `status` based on remainingDays thresholds:
  - > 180 days → ACTIVE
  - 90–180 days → FINAL_SIX_MONTHS
  - 0–90 days → EXPIRING_SOON
  - 0 days → triggers EXPIRED transition

#### 6c. Escalating notifications
- Notification at: 180, 90, 60, 30, 14, 7, 0 days remaining
- Check `notifiedAt180Days`, `notifiedAt90Days` etc. flags on WarrantyRecord
- Send email to: customer + WARRANTY_MANAGER role users
- Create `WarrantyNotification` row per alert sent
- Update the corresponding `notifiedAtXXDays` flag

---

### 🔲 Phase 7 — Admin Pipeline View + Global Traceability + Exports

**What to build:**

#### 7a. Admin Pipeline View (`/dashboard/owner/pipeline`)
- Table of all StorefrontOrders with full status pipeline column
- Columns: Order#, Customer, Total, Stripe paid, SO#, MYOB PO#, Supplier Invoice received, Match result, MYOB Bill#, Monoova status, Warranty records
- Status badge color-coded by `StorefrontOrderStatus`
- "Pay Supplier" button (for BILL_CREATED orders) → triggers Phase 5 payment flow
- "Retry MYOB PO" button (for SO_CREATED orders where PO failed)

#### 7b. Global Traceability Search (`/dashboard/owner/traceability`)
- Single search input: accepts SO#, PO#, Invoice#, serial#, customer email, vendor name, MYOB reference
- Returns full chain: StorefrontOrder → SalesOrder → PurchaseOrder → SupplierInvoice → SupplierPayment → WarrantyRecords
- API: `GET /api/traceability/search?q={query}`

#### 7c. Exports
- Pipeline CSV export
- Warranty expiry report (Excel) — items expiring in next 30/60/90 days
- Use existing `xlsx` package (already installed)

---

### 🔲 Phase 8 — Sektor Tracking Webhook Relay

**What to build:**
- `src/app/api/webhooks/sektor/route.ts` — receives Sektor dispatch/tracking events
- Match event to SalesOrder via order reference
- Update `SalesOrder.status` → `IN_TRANSIT` / `DELIVERED`
- Email customer with tracking update + Sektor tracking link
- Update `StorefrontOrder.status` → `FULFILLED` on delivery confirmed

**New env vars needed:**
- `SEKTOR_WEBHOOK_SECRET` (for signature verification)

---

## Next Steps

### ✅ Microsoft 365 email (built, waiting on the client's tenant setup)

Built so the app works as soon as the env vars from the client meeting are added (`.env.example` → `MS_*`). Until then everything falls back to the old behaviour (SMTP / IMAP / simulated).

| Piece | Files | What it does |
|---|---|---|
| Graph client | `src/lib/msgraph.ts` | App-only token (client credentials), `graph()` helper |
| Sending | `src/lib/email.ts` | All outbound email from `MS_SENDER_MAILBOX` via `sendMail`, not saved to Sent Items. Failures logged as `failed` (Email Inbox shows FAILED) instead of pretending to be a demo send |
| Invoice reader | `src/lib/imap-poller.ts`, `/api/cron/poll-invoices` | Reads `MS_INVOICE_MAILBOX` inbox (last 30 days, with attachments), only from known supplier senders, parses PDFs, tags each email in Outlook `LogiQ: invoice processed` / `LogiQ: invoice failed`. Unknown senders are left untouched |
| Customer Inquiries | `src/lib/inquiries.ts`, `/api/inquiries`, `/dashboard/owner/inquiries` | Lists `MS_SENDER_MAILBOX` conversations live from Graph (no DB copy), shows the thread as plain text, replies in the same thread (goes to Reply-To when set), Mark handled = Outlook category `LogiQ: handled`, links to the order when an `SO-YYYY-NNNNN` number appears |
| Website forms | `/api/contact`, `src/lib/website-form.ts`, Contact / hero / Request Demo / Request Quote forms | Previously sent nothing. Now email the orders mailbox with Reply-To = customer, so they land in Customer Inquiries. Honeypot field against bots |

**Client meeting (Microsoft 365 admin) — required for this to work:**
- [ ] Shared mailboxes `orders@` and `accounts@` created; staff given access
- [ ] Entra app registration: Tenant ID, Client ID, client secret (note expiry). NO Mail permissions granted in Entra
- [ ] Exchange RBAC for Applications: `Application Mail.Send` + `Application Mail.ReadWrite` scoped to `orders@`; `Application Mail.ReadWrite` scoped to `accounts@`
- [ ] Verify with `Test-ServicePrincipalAuthorization`, then set `MS_*` env vars on the host and redeploy

**After go-live check:** place a test order (confirmation arrives from orders@), email a test PDF invoice from a vendor address to accounts@ and run `/api/cron/poll-invoices`, send a website contact form and reply to it from Customer Inquiries.

**Known limits:** invoice cron is still daily (`vercel.json`, Hobby-plan limit) — move to every 15 min on Vercel Pro. No retry on Graph throttling (429). Contact endpoint has no rate limit (honeypot only).

### 🔲 Invoice reading with Claude

Replace the regex parser in `src/lib/invoice-parser.ts` with the Claude API (PDF in, structured JSON out, incl. serial/batch numbers), validated against the PO (line totals = invoice total, PO number matches an open order). Needs `ANTHROPIC_API_KEY` and 10–20 real supplier invoice samples to test with.

### 🔲 Export for MYOB (monthly file pack)

**Goal:** instead of integrating MYOB, the owner downloads a pack of import files each month (or on demand) and imports them into the client's MYOB company file with MYOB's Import/Export Assistant.

**What MYOB supports (checked against MYOB's own help pages):**
- Import of tab-delimited or comma-separated `.txt` files: Cards, Items, Sales (Service / Item / Professional / Miscellaneous), Purchases, Receive Payments, Pay Bills, Receive Money, Spend Money.
- Pay Bills and Receive Payments are import-only (cannot be exported from MYOB to copy from).
- Sales layouts have an `Invoice #` field (8 alphanumeric characters).
- Cards, accounts and GST codes must already exist in the company file. An unknown GST code on a payment imports the amount GST-exclusive.
- MYOB recommends building the file from an export of the client's own file. Excel files must be saved as text/CSV, not `.xlsx`.
- No scheduled or automatic file import was found, so a person runs the import. A fully automatic transfer would need the API (deferred above).

**Needed from the client before building:**
- [ ] Which MYOB product: AccountRight, or the browser-only MYOB Business. One community report (unconfirmed, page returned 403) says MYOB Business has no invoice import. If it is MYOB Business this approach may not work.
- [ ] A sample export from their company file (Sales, Purchases, Receive Payments, Pay Bills, Cards) to copy the exact columns from.
- [ ] Account numbers: income, Stripe clearing, bank, cost of sales/purchases. GST codes in use. Item or Service layout, and item numbers if Item layout.

**Build:**
- Page `/dashboard/owner/myob-export` (PLATFORM_OWNER only): date range, preview counts, download.
- Generate files in import order: (1) new customer and supplier cards, (2) sales invoices for delivered storefront orders, (3) Receive Payments for Stripe payments, (4) supplier purchases (bills), (5) Pay Bills for orders marked paid.
- Flag every exported record (batch id and timestamp on the order and its documents) so nothing exports twice. Keep batches re-downloadable.
- Column layouts come from the client's sample export, not hard-coded guesses.
- Stripe fees and payouts are not part of the import. The client reconciles them against the bank.

**Not in this step:** continuing the client's MYOB invoice numbering (e.g. from 1050) in the app. The app keeps its own numbering for now.

**Done when:** the client imports one month's pack into a copy of their company file with a clean import log.

---

## Outstanding Items (non-phase)

- [ ] Run `prisma/seed-storefront.ts` against Neon production DB
- [ ] Run `prisma/backfill-vendor-invoice-ids.ts` against Neon production DB
- [ ] Nav/UI: visually hide all legacy nav sections (keep the new supply chain flow + admin pipeline)
- [ ] `NEXTAUTH_URL` must be `https://logi-q-on-tech.vercel.app` in Vercel env vars (not localhost)
- [ ] Test full Stripe → StorefrontOrder → SalesOrder flow end-to-end on production

---

## Key Files Reference

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | Full DB schema — source of truth |
| `src/lib/stripe.ts` | Stripe singleton |
| `src/lib/myob.ts` | MYOB API client (to build in Phase 3) |
| `src/lib/products.ts` | ItemMaster CRUD |
| `src/lib/store-catalog.ts` | Public storefront read model |
| `src/lib/document-sequences.ts` | Atomic doc number generation (SO, PO, SFO etc.) |
| `src/lib/sales-orders.ts` | SalesOrder CRUD |
| `src/lib/purchase-orders.ts` | PurchaseOrder CRUD |
| `src/lib/email.ts` | Outbound email (Nodemailer) |
| `src/app/api/checkout/stripe-session/route.ts` | Creates Stripe Checkout session |
| `src/app/api/webhooks/stripe/route.ts` | Handles Stripe payment confirmation |
| `src/app/api/checkout/order-status/route.ts` | Polled by confirmation page |
| `src/app/api/admin/vendors/route.ts` | Vendor GET (list) + PUT (update payment details) |
| `src/app/dashboard/owner/vendors/page.tsx` | Vendor Directory + payment details UI |
| `src/app/dashboard/owner/items/page.tsx` | Item Master UI + supply chain fields |
| `src/app/products/shop/checkout/page.tsx` | Storefront checkout (Stripe redirect) |
| `src/app/products/shop/confirmation/page.tsx` | Post-payment confirmation (polls order-status) |

---

## Current Status

**Last completed:** Phase 2 (Stripe Checkout) — committed and deployed to production  
**Next up:** Export for MYOB (see Next Steps). Live MYOB API (Phase 3) is deferred.  
**Blocking the export:** client must confirm their MYOB product and send a sample export from their company file.
