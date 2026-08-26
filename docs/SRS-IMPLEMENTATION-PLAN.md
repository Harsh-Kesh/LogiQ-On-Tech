# LogiQ-On Tech — SRS Implementation Plan

**Version:** 1.0  
**Date:** 2026-08-26  
**Source:** SRS v0.2 + Owner-Side Functions + Warehouse Dispatch List + Dispatch Invoice & Payment List + user-requested changes

## 0. Executive summary

The current app is a strong foundation but only covers ~15% of the SRS scope. It has: auth, users, MDM items, vendors (with performance), warehouses (embedded in inventory), stock ledger, outbound orders, returns, audit logs. The SRS requires a full **order-to-cash + procure-to-pay** system with linked-transaction workspace, dispatch notes, customer invoicing, customer payments, purchase orders, vendor invoicing, vendor payments, closure controls, notifications, MyHitch helpdesk integration and reports.

This document maps every requirement to a concrete deliverable and phases them so the user can see the whole picture before code changes begin.

---

## 1. Immediate "major changes" (user-listed) — Phase A

| # | Change | Files to add/edit |
|---|---|---|
| A1 | Warehouse-create form: replace "Add more bins" with **"Add items"** button and a **searchable item picker sourced from Master Data (MDM items)** | `src/app/dashboard/owner/inventory/page.tsx` (locations tab), new `WarehouseItemPicker.tsx`, API `/api/inventory/warehouses` accept `items[]` |
| A2 | **B2B outbound order placement** section on owner side: implement the 15 owner-side functions verbatim from `LogiQ-On_Tech_Owner_Side_System_Functions.docx` (Sales Order Creation, SO List & Status, Warehouse Stock Availability, Warehouse Allocation, Dispatch Note Creation, Dispatch Status Tracking, Sales Invoice Creation, Send Invoice to Customer, Purchase Order Creation, PO List & Status, Vendor Invoice Registration, Vendor Invoice View/Download, Vendor Payment Processing, Payment Status, Audit Trail) | New: `src/app/dashboard/owner/sales-orders/`, `purchase-orders/`, `dispatch-notes/`, `customer-invoices/`, `vendor-invoices/`, `payments/` |
| A3 | **Warehouse portal**: add **Warehouse Dispatch Note List** page (columns: Sales Order No., Dispatch No., Customer, Item Code / Item, Quantity, Status, Tracking No., Comments) and **Dispatch Invoice & Payment List** page (columns: Dispatch No., PO Number, Amount Value, Invoice No., Attachment, Payment Status) | New: `src/app/dashboard/warehouse/dispatch-notes/page.tsx`, `src/app/dashboard/warehouse/dispatch-invoices/page.tsx` |
| A4 | **Remove Vendor Performance** section | Edit `src/app/dashboard/owner/vendors/page.tsx` (strip perf fields), `src/app/dashboard/owner/page.tsx` (remove KPI tiles), `src/lib/vendor-metrics.ts` (delete), Prisma model `Vendor` (drop `fulfillmentRate`, `onTimeDeliveryRate`, `qualityRating`, `ordersFulfilled` — migration) |
| A5 | **MyHitch Helpdesk** integration (FR-HLP-001..008) — visible "Help / MyHitch Helpdesk" link in owner + finance nav; role-gated; opens configured URL in new tab with SSO placeholder; failure fallback page; audit log for launches | New: `src/components/HelpdeskLauncher.tsx`, `src/app/dashboard/helpdesk/page.tsx` (fallback), `src/app/api/helpdesk/launch/route.ts`, env `MYHITCH_HELPDESK_URL` |
| A6 | Add **Vendor Master Data** and **Customer Master Data** tabs next to Master Data tab. Key fields per user screenshot: `Vendor Name, Item Code, Item Description, Purchase Price, Currency, MOQ, Lead Time, Payment Terms` for Vendor MD; `Customer Name, Item Code, Item Description, Selling Price, Currency, MOQ, Payment Terms` for Customer MD | New: `src/app/dashboard/owner/vendor-master/page.tsx`, `src/app/dashboard/owner/customer-master/page.tsx`, API `/api/mdm/vendor-pricing`, `/api/mdm/customer-pricing`, JSON stores `vendor_master_data.json`, `customer_master_data.json` |

---

## 2. SRS Functional Requirements — full mapping

### 2.1 FR-AU — Auth/Users/Access  *(existing → refine)*

| ID | Requirement | Current state | Action |
|---|---|---|---|
| FR-AU-001 | Everyone authenticates | ✅ NextAuth | Keep |
| FR-AU-002 | Roles: Owner/Admin, Sales/Ops, Warehouse Manager, Warehouse Operator, Finance, Read-only Auditor | Partial (`PLATFORM_OWNER, VENDOR, WAREHOUSE, MDM, CUSTOMER`) | **Add roles** `SALES_OPS`, `WAREHOUSE_MANAGER`, `WAREHOUSE_OPERATOR`, `FINANCE`, `AUDITOR`. Keep `PLATFORM_OWNER` as super-admin. Retire `MDM`/`CUSTOMER` or repurpose. Update `rbac.ts`, `prisma/schema.prisma` enum + migration |
| FR-AU-003 | Warehouse users limited to own warehouse | ❌ | Add `warehouseId` scope to `User`; enforce in every warehouse API route |
| FR-AU-004 | Activate/suspend/deactivate w/o data loss | ✅ suspend exists | Add `deactivate` state |
| FR-AU-005 | Password/lockout/session policies | ⚠️ Partial | Add lockout tracker + session expiry config |
| FR-AU-006 | MFA for privileged/finance | ✅ TOTP MFA exists | Force MFA for FINANCE, OWNER roles |
| FR-AU-007 | Log login/logout/failed/priv events | ✅ audit exists | Ensure all covered |
| FR-AU-008 | Segregation of duties | ❌ | Add SoD check on approval endpoints |

### 2.2 FR-MD — Master Data

| ID | Requirement | Current | Action |
|---|---|---|---|
| FR-MD-001 | Customer master (legal name, contacts, billing/delivery addr, email, tax, terms) | ❌ | **New**: `Customer` Prisma model + `/api/mdm/customers` + `owner/customer-master` page (extended beyond A6 table) |
| FR-MD-002 | Supplier/Warehouse org master | ⚠️ Vendor model exists | Extend `Vendor` → `SupplierOrganization`, add addresses/tax/payment |
| FR-MD-003 | Items with SKU/UOM/prices/tax/status | ✅ `ItemMaster` | Add `taxClassId` FK |
| FR-MD-004 | Customer-specific sales prices; supplier-specific costs w/ effective dates | Partial (A6 covers item-level) | Full `CustomerPricing`, `VendorPricing` tables w/ effective_from |
| FR-MD-005 | Configurable tax codes | ❌ | New `TaxCode` model + admin page |
| FR-MD-006 | Payment terms, currencies, payment methods | ❌ | New `PaymentTerm`, `Currency`, `PaymentMethod` models + admin page |
| FR-MD-007 | Doc number sequences (SO, DN, CI, PO, SI, payments) | ❌ | New `DocumentSequence` model + `getNextNumber()` service (atomic) |
| FR-MD-008 | No delete if referenced; only deactivate | ⚠️ Partial | Enforce across all master data endpoints |
| FR-MD-009 | Validate required fields/duplicates | ✅ Zod | Extend |
| FR-MD-010 | Audit master-data changes | ✅ auditLog | Extend to new master models |

### 2.3 FR-SO — Sales Orders

| ID | Requirement | Action |
|---|---|---|
| FR-SO-001..010 | Order intake, uniquely-numbered SO w/ lines, calc totals, draft/confirm/amend/cancel, block silent reduce, linked view, search | **New**: `SalesOrder`, `SalesOrderLine`, `OrderIntake` Prisma models. Pages: `owner/sales-orders/page.tsx` (list w/ filters), `owner/sales-orders/[id]/page.tsx` (detail workspace showing linked allocations/dispatches/invoices/payments/POs). API: `/api/sales-orders/*` |

### 2.4 FR-IN — Availability & Allocation

| ID | Requirement | Action |
|---|---|---|
| FR-IN-001..007 | Availability by warehouse, allocation, block over-allocation | **New**: `Allocation` Prisma model. Reuse existing `WarehouseStock`. Page: `owner/sales-orders/[id]/allocate` inline. API: `/api/allocations/*` |

### 2.5 FR-DN — Dispatch Notes & Warehouse Fulfilment

| ID | Requirement | Action |
|---|---|---|
| FR-DN-001..012 | Uniquely-numbered DN from allocations, snapshot, warehouse-scoped, acknowledge, pick, dispatch, tracking, PDF, partial dispatches, controlled reversal | **New**: `DispatchNote`, `DispatchNoteLine`, `PickEvent` models. Pages: `owner/dispatch-notes/*` and `warehouse/dispatch-notes/*`. PDF via `@react-pdf/renderer`. Also delivers A3 |

### 2.6 FR-DL — Delivery Confirmation

| ID | Requirement | Action |
|---|---|---|
| FR-DL-001..005 | Delivery record w/ evidence, source, partial/failed status, notify, block premature invoicing | **New**: `DeliveryConfirmation` model + upload evidence. Page: warehouse detail view. API: `/api/deliveries/*` |

### 2.7 FR-CI / FR-CR — Customer Invoicing & Receipts

| ID | Requirement | Action |
|---|---|---|
| FR-CI-001..008 | Generate CI from delivered qty, unique number, PDF, draft/approve/issue/send/void, immutable snapshot, email w/ preview, calc outstanding, overdue detection | **New**: `CustomerInvoice`, `CustomerInvoiceLine`, `EmailCommunication` models. Pages: `owner/customer-invoices/*`. PDF renderer. SMTP via existing `email.ts` |
| FR-CR-001..005 | Record customer payment (date, amount, method, ref, evidence), allocate to invoices, duplicate detection, unallocated preservation, reverse w/ reason | **New**: `CustomerPayment`, `CustomerPaymentAllocation` models. Page: `owner/payments/customer/*` |

### 2.8 FR-PO / FR-SI / FR-SP — POs, Supplier Invoices, Supplier Payments

| ID | Requirement | Action |
|---|---|---|
| FR-PO-001..005 | Create PO from SO shortage/replenishment, unique #, lines, tax, terms, versioned amendments, portal delivery | **New**: `PurchaseOrder`, `PurchaseOrderLine` models. Pages: `owner/purchase-orders/*`, `vendor/purchase-orders/*` (vendor sees their POs) |
| FR-SI-001..005 | Vendor submits invoice linked to PO, duplicate check, variance vs PO/receipt, approve/reject/hold w/ reason, outstanding balance | **New**: `VendorInvoice` model + attachment. Pages: `vendor/vendor-invoices/*` (submit), `owner/vendor-invoices/*` (review/approve). Delivers A3's Dispatch Invoice & Payment List |
| FR-SP-001..003 | Vendor payment record + allocation + reversal | **New**: `VendorPayment`, `VendorPaymentAllocation` models. Page: `owner/payments/vendor/*` |

### 2.9 FR-CL — Transaction Closure & Linked View

| ID | Requirement | Action |
|---|---|---|
| FR-CL-001..005 | Transaction workspace linking every doc, calc'd overall status, closure checklist, exception closure, read-only after closure | **New**: `Transaction` root record aggregating SO+DN+CI+CP+PO+SI+SP. Page: `owner/transactions/[id]/page.tsx` (single timeline view). Closure engine in `src/lib/transaction-lifecycle.ts` |

### 2.10 FR-NT/DM/RP/AD — Notifications/Documents/Reporting/Admin

| ID | Requirement | Action |
|---|---|---|
| FR-NT-001..003 | Event-based email notifications w/ retry, communication history | New `Notification` service + queue (BullMQ or simple polling worker) |
| FR-DM-001..002 | Attachment validation, scan, private URLs | Extend `storage.ts` — content-type/size/magic checks; signed short-lived URLs |
| FR-RP-001..002 | Dashboards (open orders, fulfilment, delivery exceptions, receivables, payables, ready-to-close) w/ filters+export | New pages: `owner/reports/*` — RPT-01..10 from §14 |
| FR-AD-001..003 | Configurable statuses/sequences/templates/tax/terms/notif rules; audit UI; ref-data import | Extend admin section |

### 2.11 FR-HLP — MyHitch Helpdesk *(delivered by A5)*

| ID | Requirement | Action |
|---|---|---|
| FR-HLP-001..008 | Entry point, role-gated, secure hand-off, fallback, role→helpdesk mapping, non-sensitive context passing, launch audit, failure UI | See A5 above |

---

## 3. Data model additions (Prisma)

New models (in dependency order):

```
Customer, TaxCode, PaymentTerm, Currency, PaymentMethod, DocumentSequence,
CustomerPricing, VendorPricing,
OrderIntake, SalesOrder, SalesOrderLine,
Allocation,
DispatchNote, DispatchNoteLine, PickEvent, DeliveryConfirmation,
CustomerInvoice, CustomerInvoiceLine, CustomerPayment, CustomerPaymentAllocation,
PurchaseOrder, PurchaseOrderLine,
VendorInvoice, VendorPayment, VendorPaymentAllocation,
Transaction, TransactionEvent,
EmailCommunication, Notification,
Attachment (unified doc metadata + hash/scan),
DocumentSnapshot (immutable JSON snapshots for issued docs)
```

Removals: `Vendor.fulfillmentRate`, `onTimeDeliveryRate`, `qualityRating`, `ordersFulfilled` (A4).

Enums: `UserRole` expanded, `SalesOrderStatus`, `AllocationStatus`, `DispatchStatus`, `CustomerInvoiceStatus`, `CustomerPaymentStatus`, `PurchaseOrderStatus`, `VendorInvoiceStatus`, `VendorPaymentStatus`, `TransactionStatus` — per SRS §9.

Migration strategy: additive; existing tables untouched. New tables prefixed with feature area if collisions.

---

## 4. Status models (SRS §9) — enforced in `src/lib/lifecycle/*`

- `salesOrder.ts` — DRAFT → CONFIRMED → STOCK_CHECK_PENDING → ALLOCATED → DISPATCHED → DELIVERED → INVOICED → PAID → CLOSED (+ PARTIALLY_*, CANCELLED)
- `dispatch.ts` — DRAFT → ISSUED → ACKNOWLEDGED → PICKING → PICKED → DISPATCHED → DELIVERED (+ PARTIALLY_*, DELIVERY_EXCEPTION, CANCELLED)
- `customerInvoice.ts` — DRAFT → APPROVED → SENT → PARTIALLY_PAID → PAID | OVERDUE | VOID
- `purchaseOrder.ts` — DRAFT → APPROVED → ISSUED → ACKNOWLEDGED → PARTIALLY_INVOICED → INVOICED → CLOSED (+ CANCELLED)
- `vendorInvoice.ts` — SUBMITTED → UNDER_REVIEW → ON_HOLD → APPROVED → PARTIALLY_PAID → PAID | REJECTED | VOID | OVERDUE
- `transaction.ts` — OPEN → FULFILMENT_IN_PROGRESS → DELIVERED_AWAITING_CUSTOMER_PAYMENT → … → READY_TO_CLOSE → CLOSED (per §9 table)

Guarded transitions (`canTransition(from,to,role,context)`). Any illegal transition = 400 w/ reason.

---

## 5. Business rules (SRS §10) — enforced centrally

BR-001..015 implemented as pure functions in `src/lib/business-rules/*` and called from mutating endpoints. Highlights:

- BR-002 dispatch qty ≤ open allocated qty  
- BR-006 issued doc snapshots frozen (write to `DocumentSnapshot` table on issue)  
- BR-012 doc numbers atomic — Postgres `SELECT ... FOR UPDATE` on `DocumentSequence` row  
- BR-013 internal notes flag `isInternal boolean` — never render on external PDFs  

---

## 6. Non-functional (SRS §11)

- Perf: existing Next.js is fine; add DB indexes on `salesOrderNumber`, `customerId`, `warehouseId`, `dispatchNumber`, `invoiceNumber`, `poNumber`, status columns  
- Reliability: wrap multi-record writes in Prisma `$transaction`  
- Security: signed download URLs (nanoid+HMAC, TTL 5min); every mutation checks role+scope; no floats on money — `Decimal(18,4)`  
- A11y: existing shadcn components mostly comply; add label/aria on new forms  
- Observability: extend `audit.ts` for controlled events; add `/api/health` (already exists) and job status  

---

## 7. Reporting (SRS §14) — new pages under `owner/reports/`

RPT-01 Open Sales Orders · RPT-02 Warehouse Fulfilment · RPT-03 Delivery Exceptions · RPT-04 Customer Receivables · RPT-05 Supplier Payables · RPT-06 Transaction Profitability · RPT-07 Ready to Close · RPT-08 Document Completeness · RPT-09 Communication Failures · RPT-10 Audit & User Activity.

Each has filter panel + CSV export.

---

## 8. UAT scenarios (SRS §17) — implementation acceptance

UAT-01..UAT-16 will each get a Playwright e2e test under `tests/uat/`. Coverage becomes the ship gate.

---

## 9. Delivery phases

| Phase | Contents | Approx scope |
|---|---|---|
| **A** *(immediate)* | A1–A6 user-listed changes; **removes vendor performance**; **A3 warehouse pages**; **A5 MyHitch link**; **A6 vendor/customer master tabs** | 8–12 files |
| **B** *(core)* | New Prisma models + migrations + role expansion + doc-sequence service | 20–30 files |
| **C** *(order-to-cash)* | Sales Orders → Allocation → Dispatch → Delivery → Customer Invoice → Customer Payment | 30–40 files |
| **D** *(procure-to-pay)* | Purchase Orders → Vendor Invoice → Vendor Payment | 15–25 files |
| **E** *(closure + reporting)* | Transaction workspace, closure engine, 10 reports, dashboards | 15–25 files |
| **F** *(NFR + UAT)* | MFA-force for finance, SoD, notifications retry, signed URLs, WCAG polish, UAT-01..16 tests | 10–20 files |

Order of A → F is the recommended build order. A can ship on its own; B..F should ship together as "SRS Release 1."

---

## 10. Open decisions (SRS §19.2 Q-01..Q-16)

The SRS lists 16 questions requiring business approval. For build purposes I will use the following **default assumptions** and flag them in the code with `// SRS-DECISION` comments so they can be revisited:

- Q-01 order intake: manual entry + mailbox import (mailbox in Phase E)
- Q-04 stock: manually confirmed + existing ledger; live feeds in Phase E
- Q-05 partial dispatch: yes; returns/credit notes deferred to Phase F  
- Q-07 invoice trigger: full delivery by default; owner override allowed w/ reason
- Q-11 email provider: existing SMTP env config
- Q-15/16 MyHitch: role list = Owner, Finance, Sales/Ops, Auditor; SSO deferred; deep-link launch w/ HMAC-signed short-lived token as approved fallback (FR-HLP-004)

---

## 11. Traceability

Every FR-* and BR-* ID appears as a comment in the implementing file so tests and reviewers can trace. Appendix B of SRS is preserved in the acceptance test names.
