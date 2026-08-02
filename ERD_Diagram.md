# LogiQ-On Tech — Architectural Database ERD (Enhanced)

**Jira Task:** KAN-1 (Day 1 — Environment Setup & Database Schema)  
**Database Engine:** PostgreSQL 16 (Managed via Prisma ORM)  
**Architectural Version:** 2.0 (Enhanced with VendorWarehouse Junction, User-StockLedger Relation, 1:1 User-Vendor Uniqueness, and PostgreSQL Performance Indexes)

---

## 1. Clean Crow's Foot ERD Diagram (Mermaid)

```mermaid
erDiagram

    %% ----------------------------------------------------
    %% 1. GOVERNANCE & SYSTEM CONTROL
    %% ----------------------------------------------------
    users {
        string id PK
        string email
        string passwordHash
        string fullName
        string role
        boolean mfaEnabled
        boolean isSuspended
        timestamp createdAt
    }

    audit_logs {
        string id PK
        string userId FK
        string role
        string action
        string module
        string targetId
        timestamp timestamp
    }

    %% ----------------------------------------------------
    %% 2. VENDOR MANAGEMENT (PILLAR 1)
    %% ----------------------------------------------------
    vendors {
        string id PK
        string companyName
        string abnAcn
        string status
        string userId FK "UNIQUE (1-to-1)"
        timestamp approvedAt
    }

    vendor_warehouses {
        string id PK
        string vendorId FK
        string warehouseId FK
        timestamp assignedAt
    }

    compliance_docs {
        string id PK
        string vendorId FK
        string docType
        string fileUrl
        string status
        timestamp expiryDate
    }

    %% ----------------------------------------------------
    %% 3. INVENTORY & MASTER DATA MDM (PILLAR 4)
    %% ----------------------------------------------------
    item_masters {
        string id PK
        string sku
        string barcode
        string itemName
        string categoryId FK
        string uomId FK
        decimal costPrice
        decimal sellingPrice
        string status
        string vendorId FK
    }

    categories {
        string id PK
        string name
        string slug
        string parentId FK
    }

    unit_of_measures {
        string id PK
        string code
        string name
    }

    %% ----------------------------------------------------
    %% 4. WAREHOUSE OPERATIONS (PILLAR 2)
    %% ----------------------------------------------------
    warehouses {
        string id PK
        string code
        string name
        string address
    }

    warehouse_stock {
        string id PK
        string warehouseId FK
        string itemMasterId FK
        string binLocation
        int quantityOnHand
        int quantityReserved
    }

    stock_ledger {
        string id PK
        string warehouseId FK
        string itemMasterId FK
        string binLocation
        string movementType
        int quantityDelta
        string referenceNumber
        string createdById FK
        timestamp createdAt
    }

    %% ----------------------------------------------------
    %% 5. ORDERS & CUSTOMER CRM (PILLAR 3)
    %% ----------------------------------------------------
    orders {
        string id PK
        string orderNumber
        string customerId FK
        string warehouseId FK
        string status
        decimal totalAmount
        string shippingAddress
    }

    order_items {
        string id PK
        string orderId FK
        string itemMasterId FK
        int quantity
        decimal unitPrice
    }

    %% ====================================================
    %% CROW'S FOOT RELATIONSHIPS (1-to-1 / 1-to-Many / Junction)
    %% ====================================================
    users ||--|| vendors : "1-to-1 onboarding profile"
    users ||--o{ orders : "places as customer"
    users ||--o{ audit_logs : "triggers"
    users ||--o{ stock_ledger : "created by operator (createdById)"

    vendors ||--o{ compliance_docs : "submits"
    vendors ||--o{ item_masters : "supplies"
    vendors ||--o{ vendor_warehouses : "granted access (Step 4)"
    warehouses ||--o{ vendor_warehouses : "allocates facility"

    categories ||--o{ item_masters : "classifies"
    categories ||--o{ categories : "parent of"
    unit_of_measures ||--o{ item_masters : "quantifies"

    item_masters ||--o{ warehouse_stock : "holds stock balance"
    item_masters ||--o{ stock_ledger : "records movement"
    item_masters ||--o{ order_items : "contained in"

    warehouses ||--o{ warehouse_stock : "stores"
    warehouses ||--o{ stock_ledger : "houses ledger"
    warehouses ||--o{ orders : "fulfills"

    orders ||--o{ order_items : "includes"
```

---

## 2. Key Architectural Enhancements Implemented

### 1. Added `User` $\rightarrow$ `StockLedger` Audit Relation (`createdBy`)
* **Relation**: `User ||--o{ stock_ledger`
* **Schema Fields**: `User.ledgerEntries StockLedger[] @relation("LedgerCreatedBy")` $\leftrightarrow$ `StockLedger.createdBy User @relation("LedgerCreatedBy", fields: [createdById], references: [id])`.
* **Business Purpose**: Tracks the exact warehouse operator/user who executed each inventory movement (`RECEIPT`, `ISSUE`, `ADJUSTMENT`, `RETURN`, `TRANSFER`) for accountability.

### 2. Added Vendor ↔ Warehouse Access Junction Table (`vendor_warehouses`)
* **Relation**: `Vendor 1 --- * VendorWarehouse * --- 1 Warehouse`
* **Diagram Step**: Directly satisfies **Diagram Step 4 ("Access Granted to Warehouse Point")**.
* **Schema Fields**: `vendor_warehouses` table storing `vendorId`, `warehouseId`, and `assignedAt` with composite unique constraint `@@unique([vendorId, warehouseId])`.

### 3. Added 1-to-1 User-Vendor Uniqueness
* **Relation**: `User 1 --- 1 Vendor`
* **Schema Fields**: Changed `userId` on `Vendor` to `userId String @unique` and `User.vendor Vendor?`.
* **Business Purpose**: Ensures every vendor onboarding account maps strictly to exactly one corporate vendor entity.

### 4. Added PostgreSQL Performance Indexes
* **`warehouse_stock`**: `@@index([warehouseId])`, `@@index([itemMasterId])`
* **`stock_ledger`**: `@@index([warehouseId])`, `@@index([itemMasterId])`, `@@index([createdAt])`, `@@index([referenceNumber])`
* **`orders`**: `@@index([customerId])`, `@@index([warehouseId])`, `@@index([status])`
* **`order_items`**: `@@index([orderId])`, `@@index([itemMasterId])`
* **`audit_logs`**: `@@index([userId])`, `@@index([timestamp])`
* **`compliance_docs`**: `@@index([vendorId])`, `@@index([expiryDate])`
* **`item_masters`**: `@@index([vendorId])`, `@@index([categoryId])`
