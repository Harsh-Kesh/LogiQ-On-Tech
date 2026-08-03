# LogiQ-On Tech — RBAC Permission Matrix Document

**Jira Task:** KAN-2 (Day 2 — Authentication, RBAC, MFA & Audit Logging)  
**Target Manager:** Induja Manavimukthi  
**Architecture Version:** 2.0 (Full 4-Role x 5-Module Matrix Implementation)  

---

## 1. Overview & Security Architecture

The **Role-Based Access Control (RBAC)** matrix governs all resource access across the LogiQ-On Tech platform. The system defines **4 Primary User Roles** interacting across **5 Core Functional Modules**:

* **Primary Roles**:
  1. 👑 **`PLATFORM_OWNER`**: Super Admin / System Control with full cross-module governance.
  2. 🏬 **`VENDOR`**: Supplier / Vendor Account managing profile, compliance docs, and supplied items.
  3. 🏭 **`WAREHOUSE`**: Warehouse Manager / Operator handling storage, stock receipts, and ledger.
  4. 🛒 **`CUSTOMER`**: Customer CRM account placing orders, tracking shipments, and managing profile.
  5. 📦 **`MDM`** *(Secondary)*: Master Data Manager focused on SKU, Category, and UOM governance.

---

## 2. Role x Module x CRUD Permission Matrix

| Primary Role | Module | Create | Read | Update | Delete | Business Justification & Enforcement Point |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **`PLATFORM_OWNER`** | **Governance** | ✅ | ✅ | ✅ | ✅ | System ownership, role assignment, audit log inspection. |
| | **Vendor Management** | ✅ | ✅ | ✅ | ✅ | Vendor onboarding approvals, suspensions, document audits. |
| | **Warehouse Operations**| ✅ | ✅ | ✅ | ✅ | Facility management, warehouse allocations. |
| | **Customer CRM** | ✅ | ✅ | ✅ | ✅ | Customer dispute resolution, order oversight. |
| | **Master Data MDM** | ✅ | ✅ | ✅ | ✅ | Global catalog governance & SKU approval. |
| **`VENDOR`** | **Governance** | ❌ | ❌ | ❌ | ❌ | Strictly blocked from system governance & user logs. |
| | **Vendor Management** | ✅ | ✅ | ✅ | ❌ | Submits company profile & statutory compliance docs. |
| | **Warehouse Operations**| ❌ | ✅ | ❌ | ❌ | Read-only view of stock levels for supplied items. |
| | **Customer CRM** | ❌ | ❌ | ❌ | ❌ | No access to customer private data. |
| | **Master Data MDM** | ✅ | ✅ | ✅ | ❌ | Creates & updates draft/active supplied product items. |
| **`WAREHOUSE`** | **Governance** | ❌ | ❌ | ❌ | ❌ | Blocked from administrative controls. |
| | **Vendor Management** | ❌ | ✅ | ❌ | ❌ | Views approved vendor facility assignments (`vendor_warehouses`). |
| | **Warehouse Operations**| ✅ | ✅ | ✅ | ❌ | Executes GRN receipts, picking, dispatch & ledger delta. |
| | **Customer CRM** | ❌ | ✅ | ✅ | ❌ | Reads order details for fulfillment & updates tracking. |
| | **Master Data MDM** | ❌ | ✅ | ❌ | ❌ | Reads item master specs & barcode metadata for picking. |
| **`CUSTOMER`** | **Governance** | ❌ | ❌ | ❌ | ❌ | Blocked from administrative controls. |
| | **Vendor Management** | ❌ | ❌ | ❌ | ❌ | No access to vendor internal profiles. |
| | **Warehouse Operations**| ❌ | ❌ | ❌ | ❌ | No direct access to warehouse internal bin structures. |
| | **Customer CRM** | ✅ | ✅ | ✅ | ❌ | Registers profile, places sales orders & tracks shipments. |
| | **Master Data MDM** | ❌ | ✅ | ❌ | ❌ | Browses public active product catalog & pricing. |

---

## 3. Code Implementation & Edge Middleware Verification

1. **Declarative Engine**: Implemented in [`src/lib/rbac.ts`](file:///g:/LogiQ-On%20Tech/src/lib/rbac.ts) using the `hasPermission(role, module, action)` engine.
2. **Next.js Edge Middleware**: Implemented in [`src/middleware.ts`](file:///g:/LogiQ-On%20Tech/src/middleware.ts) protecting `/dashboard/owner`, `/dashboard/vendor`, `/dashboard/warehouse`, and `/dashboard/customer`.
