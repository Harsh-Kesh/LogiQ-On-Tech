-- SRS Phase B — Transactional entities + role expansion + document sequences.
-- Applies on top of 0_init.

-- ============================================================
-- 1. UserRole enum expansion (SRS §7.1)
-- ============================================================
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SALES_OPS';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'FINANCE';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'WAREHOUSE_MANAGER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'WAREHOUSE_OPERATOR';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'AUDITOR';

-- ============================================================
-- 2. Vendor performance columns removal (Phase A A4)
-- ============================================================
ALTER TABLE "vendors" DROP COLUMN IF EXISTS "fulfillmentRate";
ALTER TABLE "vendors" DROP COLUMN IF EXISTS "onTimeDeliveryRate";
ALTER TABLE "vendors" DROP COLUMN IF EXISTS "qualityRating";
ALTER TABLE "vendors" DROP COLUMN IF EXISTS "ordersFulfilled";

-- ============================================================
-- 3. New enums (SRS §9 status lifecycles)
-- ============================================================
CREATE TYPE "SalesOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'STOCK_CHECK_PENDING', 'PARTIALLY_ALLOCATED', 'ALLOCATED', 'DISPATCH_REQUESTED', 'PARTIALLY_DISPATCHED', 'DISPATCHED', 'DELIVERED', 'INVOICED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'CLOSED');
CREATE TYPE "AllocationStatus" AS ENUM ('PENDING', 'ALLOCATED', 'PARTIALLY_ALLOCATED', 'RELEASED', 'CONSUMED', 'CANCELLED');
CREATE TYPE "DispatchStatus" AS ENUM ('DRAFT', 'ISSUED', 'ACKNOWLEDGED', 'PICKING', 'PICKED', 'PARTIALLY_DISPATCHED', 'DISPATCHED', 'PARTIALLY_DELIVERED', 'DELIVERED', 'DELIVERY_EXCEPTION', 'CANCELLED');
CREATE TYPE "CustomerInvoiceStatus" AS ENUM ('DRAFT', 'APPROVED', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID');
CREATE TYPE "CustomerPaymentStatus" AS ENUM ('DRAFT', 'POSTED', 'PARTIALLY_ALLOCATED', 'ALLOCATED', 'REVERSED');
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'APPROVED', 'ISSUED', 'ACKNOWLEDGED', 'PARTIALLY_INVOICED', 'INVOICED', 'CLOSED', 'CANCELLED');
CREATE TYPE "SupplierInvoiceStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'ON_HOLD', 'APPROVED', 'REJECTED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID');
CREATE TYPE "SupplierPaymentStatus" AS ENUM ('DRAFT', 'POSTED', 'PARTIALLY_ALLOCATED', 'ALLOCATED', 'REVERSED');
CREATE TYPE "TransactionOverallStatus" AS ENUM ('OPEN', 'FULFILMENT_IN_PROGRESS', 'DELIVERED_AWAITING_CUSTOMER_PAYMENT', 'CUSTOMER_SETTLED_SUPPLIER_PENDING', 'SUPPLIER_SETTLED_CUSTOMER_PENDING', 'READY_TO_CLOSE', 'CLOSED', 'CANCELLED', 'EXCEPTION');
CREATE TYPE "OrderIntakeStatus" AS ENUM ('RECEIVED', 'UNDER_REVIEW', 'CONVERTED', 'REJECTED', 'CANCELLED');
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'BOUNCED', 'RETRYING');

-- ============================================================
-- 4. Master data / config (FR-MD-005..007)
-- ============================================================
CREATE TABLE "tax_codes" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "ratePercent" DECIMAL(6,3) NOT NULL,
  "jurisdiction" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tax_codes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tax_codes_code_key" ON "tax_codes"("code");

CREATE TABLE "payment_terms" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "dueDays" INTEGER NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payment_terms_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payment_terms_code_key" ON "payment_terms"("code");

CREATE TABLE "currencies" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "currencies_code_key" ON "currencies"("code");

CREATE TABLE "payment_methods" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payment_methods_code_key" ON "payment_methods"("code");

-- BR-012 atomic document numbering.
CREATE TABLE "document_sequences" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "yearScope" BOOLEAN NOT NULL DEFAULT true,
  "currentYear" INTEGER,
  "currentValue" INTEGER NOT NULL DEFAULT 0,
  "padLength" INTEGER NOT NULL DEFAULT 5,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_sequences_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "document_sequences_key_key" ON "document_sequences"("key");

-- ============================================================
-- 5. Customer master + pricing (FR-MD-001, FR-MD-004)
-- ============================================================
CREATE TABLE "customers" (
  "id" TEXT NOT NULL,
  "customerCode" TEXT NOT NULL,
  "legalName" TEXT NOT NULL,
  "tradingName" TEXT,
  "billingEmail" TEXT,
  "billingAddress" TEXT,
  "deliveryAddresses" JSONB,
  "taxNumber" TEXT,
  "paymentTermsId" TEXT,
  "currencyCode" TEXT NOT NULL DEFAULT 'AUD',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "customers_customerCode_key" ON "customers"("customerCode");
ALTER TABLE "customers" ADD CONSTRAINT "customers_paymentTermsId_fkey" FOREIGN KEY ("paymentTermsId") REFERENCES "payment_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "customer_pricing" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "itemMasterId" TEXT,
  "itemCode" TEXT NOT NULL,
  "itemDescription" TEXT NOT NULL,
  "sellingPrice" DECIMAL(18,4) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'AUD',
  "moq" INTEGER NOT NULL DEFAULT 1,
  "paymentTerms" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customer_pricing_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "customer_pricing_customerId_idx" ON "customer_pricing"("customerId");
CREATE INDEX "customer_pricing_itemCode_idx" ON "customer_pricing"("itemCode");
ALTER TABLE "customer_pricing" ADD CONSTRAINT "customer_pricing_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "vendor_pricing" (
  "id" TEXT NOT NULL,
  "vendorId" TEXT,
  "vendorName" TEXT NOT NULL,
  "itemMasterId" TEXT,
  "itemCode" TEXT NOT NULL,
  "itemDescription" TEXT NOT NULL,
  "purchasePrice" DECIMAL(18,4) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'AUD',
  "moq" INTEGER NOT NULL DEFAULT 1,
  "leadTimeDays" INTEGER NOT NULL DEFAULT 0,
  "paymentTerms" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vendor_pricing_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "vendor_pricing_vendorId_idx" ON "vendor_pricing"("vendorId");
CREATE INDEX "vendor_pricing_itemCode_idx" ON "vendor_pricing"("itemCode");

-- ============================================================
-- 6. Sales domain (FR-SO, FR-IN, FR-DN, FR-DL)
-- ============================================================
CREATE TABLE "sales_orders" (
  "id" TEXT NOT NULL,
  "salesOrderNumber" TEXT NOT NULL,
  "customerId" TEXT,
  "customerName" TEXT NOT NULL,
  "customerPoReference" TEXT,
  "deliveryLocation" TEXT NOT NULL,
  "requestedDeliveryDate" TIMESTAMP(3),
  "paymentTerms" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'AUD',
  "status" "SalesOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "taxTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "totalValue" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "internalNotes" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sales_orders_salesOrderNumber_key" ON "sales_orders"("salesOrderNumber");
CREATE INDEX "sales_orders_customerId_idx" ON "sales_orders"("customerId");
CREATE INDEX "sales_orders_status_idx" ON "sales_orders"("status");
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "sales_order_lines" (
  "id" TEXT NOT NULL,
  "salesOrderId" TEXT NOT NULL,
  "itemMasterId" TEXT,
  "itemCode" TEXT NOT NULL,
  "itemName" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "sellingPrice" DECIMAL(18,4) NOT NULL,
  "taxCodeId" TEXT,
  "taxPercent" DECIMAL(6,3) NOT NULL DEFAULT 0,
  "lineTotal" DECIMAL(18,4) NOT NULL,
  "dispatchedQty" INTEGER NOT NULL DEFAULT 0,
  "invoicedQty" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sales_order_lines_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "sales_order_lines_salesOrderId_idx" ON "sales_order_lines"("salesOrderId");
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_taxCodeId_fkey" FOREIGN KEY ("taxCodeId") REFERENCES "tax_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "allocations" (
  "id" TEXT NOT NULL,
  "salesOrderId" TEXT NOT NULL,
  "salesOrderLineId" TEXT NOT NULL,
  "warehouseCode" TEXT NOT NULL,
  "allocatedQty" INTEGER NOT NULL,
  "freshnessSource" TEXT NOT NULL DEFAULT 'MANUAL',
  "status" "AllocationStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "allocations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "allocations_salesOrderId_idx" ON "allocations"("salesOrderId");
CREATE INDEX "allocations_warehouseCode_idx" ON "allocations"("warehouseCode");
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_salesOrderLineId_fkey" FOREIGN KEY ("salesOrderLineId") REFERENCES "sales_order_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "order_intakes" (
  "id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "customerId" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT,
  "attachments" JSONB,
  "status" "OrderIntakeStatus" NOT NULL DEFAULT 'RECEIVED',
  "salesOrderId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "order_intakes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "order_intakes_salesOrderId_key" ON "order_intakes"("salesOrderId");
ALTER TABLE "order_intakes" ADD CONSTRAINT "order_intakes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "order_intakes" ADD CONSTRAINT "order_intakes_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "dispatch_notes" (
  "id" TEXT NOT NULL,
  "dispatchNumber" TEXT NOT NULL,
  "salesOrderId" TEXT,
  "salesOrderNumber" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "customerAddress" TEXT NOT NULL,
  "warehouseCode" TEXT NOT NULL,
  "warehouseName" TEXT,
  "status" "DispatchStatus" NOT NULL DEFAULT 'DRAFT',
  "dispatchDate" TIMESTAMP(3),
  "carrier" TEXT,
  "trackingNumber" TEXT,
  "expectedDeliveryDate" TIMESTAMP(3),
  "actualDeliveryDate" TIMESTAMP(3),
  "comments" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "dispatch_notes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "dispatch_notes_dispatchNumber_key" ON "dispatch_notes"("dispatchNumber");
CREATE INDEX "dispatch_notes_salesOrderId_idx" ON "dispatch_notes"("salesOrderId");
CREATE INDEX "dispatch_notes_warehouseCode_idx" ON "dispatch_notes"("warehouseCode");
CREATE INDEX "dispatch_notes_status_idx" ON "dispatch_notes"("status");
ALTER TABLE "dispatch_notes" ADD CONSTRAINT "dispatch_notes_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "dispatch_note_lines" (
  "id" TEXT NOT NULL,
  "dispatchNoteId" TEXT NOT NULL,
  "itemCode" TEXT NOT NULL,
  "itemName" TEXT NOT NULL,
  "orderedQty" INTEGER NOT NULL,
  "pickedQty" INTEGER NOT NULL DEFAULT 0,
  "dispatchQty" INTEGER NOT NULL DEFAULT 0,
  "deliveredQty" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "dispatch_note_lines_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "dispatch_note_lines_dispatchNoteId_idx" ON "dispatch_note_lines"("dispatchNoteId");
ALTER TABLE "dispatch_note_lines" ADD CONSTRAINT "dispatch_note_lines_dispatchNoteId_fkey" FOREIGN KEY ("dispatchNoteId") REFERENCES "dispatch_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "delivery_confirmations" (
  "id" TEXT NOT NULL,
  "dispatchNoteId" TEXT NOT NULL,
  "confirmingSource" TEXT NOT NULL,
  "recipientName" TEXT,
  "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deliveredQty" INTEGER NOT NULL,
  "evidenceUrl" TEXT,
  "outcome" TEXT NOT NULL,
  "notes" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "delivery_confirmations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "delivery_confirmations_dispatchNoteId_idx" ON "delivery_confirmations"("dispatchNoteId");
ALTER TABLE "delivery_confirmations" ADD CONSTRAINT "delivery_confirmations_dispatchNoteId_fkey" FOREIGN KEY ("dispatchNoteId") REFERENCES "dispatch_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "dispatch_invoice_records" (
  "id" TEXT NOT NULL,
  "dispatchNoteId" TEXT,
  "dispatchNumber" TEXT NOT NULL,
  "salesOrderNumber" TEXT,
  "customerPoNumber" TEXT,
  "customerName" TEXT NOT NULL,
  "dispatchValue" DECIMAL(18,4) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'AUD',
  "invoiceNumber" TEXT NOT NULL,
  "invoiceDate" TIMESTAMP(3),
  "invoiceAmount" DECIMAL(18,4) NOT NULL,
  "attachmentUrl" TEXT,
  "attachmentType" TEXT,
  "paymentDueDate" TIMESTAMP(3),
  "paymentStatus" TEXT NOT NULL DEFAULT 'PAYMENT_PENDING',
  "paymentDate" TIMESTAMP(3),
  "paymentReference" TEXT,
  "comments" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "dispatch_invoice_records_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "dispatch_invoice_records_dispatchNoteId_idx" ON "dispatch_invoice_records"("dispatchNoteId");
ALTER TABLE "dispatch_invoice_records" ADD CONSTRAINT "dispatch_invoice_records_dispatchNoteId_fkey" FOREIGN KEY ("dispatchNoteId") REFERENCES "dispatch_notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- 7. Customer receivables (FR-CI, FR-CR)
-- ============================================================
CREATE TABLE "customer_invoices" (
  "id" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "salesOrderId" TEXT,
  "salesOrderNumber" TEXT NOT NULL,
  "dispatchNumber" TEXT,
  "customerId" TEXT,
  "customerName" TEXT NOT NULL,
  "customerEmail" TEXT,
  "billingAddress" TEXT,
  "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'AUD',
  "subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "taxTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "totalValue" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "amountPaid" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "status" "CustomerInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "sentAt" TIMESTAMP(3),
  "viewedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "pdfSnapshotUrl" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customer_invoices_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "customer_invoices_invoiceNumber_key" ON "customer_invoices"("invoiceNumber");
CREATE INDEX "customer_invoices_salesOrderId_idx" ON "customer_invoices"("salesOrderId");
CREATE INDEX "customer_invoices_customerId_idx" ON "customer_invoices"("customerId");
CREATE INDEX "customer_invoices_status_idx" ON "customer_invoices"("status");
ALTER TABLE "customer_invoices" ADD CONSTRAINT "customer_invoices_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_invoices" ADD CONSTRAINT "customer_invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "customer_invoice_lines" (
  "id" TEXT NOT NULL,
  "customerInvoiceId" TEXT NOT NULL,
  "itemCode" TEXT NOT NULL,
  "itemName" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DECIMAL(18,4) NOT NULL,
  "taxCodeId" TEXT,
  "taxPercent" DECIMAL(6,3) NOT NULL DEFAULT 0,
  "lineTotal" DECIMAL(18,4) NOT NULL,
  CONSTRAINT "customer_invoice_lines_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "customer_invoice_lines_customerInvoiceId_idx" ON "customer_invoice_lines"("customerInvoiceId");
ALTER TABLE "customer_invoice_lines" ADD CONSTRAINT "customer_invoice_lines_customerInvoiceId_fkey" FOREIGN KEY ("customerInvoiceId") REFERENCES "customer_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_invoice_lines" ADD CONSTRAINT "customer_invoice_lines_taxCodeId_fkey" FOREIGN KEY ("taxCodeId") REFERENCES "tax_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "customer_payments" (
  "id" TEXT NOT NULL,
  "paymentNumber" TEXT NOT NULL,
  "customerId" TEXT,
  "paymentDate" TIMESTAMP(3) NOT NULL,
  "amount" DECIMAL(18,4) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'AUD',
  "paymentMethod" TEXT NOT NULL,
  "bankReference" TEXT,
  "evidenceUrl" TEXT,
  "notes" TEXT,
  "status" "CustomerPaymentStatus" NOT NULL DEFAULT 'DRAFT',
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customer_payments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "customer_payments_paymentNumber_key" ON "customer_payments"("paymentNumber");
CREATE INDEX "customer_payments_customerId_idx" ON "customer_payments"("customerId");
ALTER TABLE "customer_payments" ADD CONSTRAINT "customer_payments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "customer_payment_allocations" (
  "id" TEXT NOT NULL,
  "customerPaymentId" TEXT NOT NULL,
  "customerInvoiceId" TEXT NOT NULL,
  "amountAllocated" DECIMAL(18,4) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_payment_allocations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "customer_payment_allocations_customerPaymentId_idx" ON "customer_payment_allocations"("customerPaymentId");
CREATE INDEX "customer_payment_allocations_customerInvoiceId_idx" ON "customer_payment_allocations"("customerInvoiceId");
ALTER TABLE "customer_payment_allocations" ADD CONSTRAINT "customer_payment_allocations_customerPaymentId_fkey" FOREIGN KEY ("customerPaymentId") REFERENCES "customer_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_payment_allocations" ADD CONSTRAINT "customer_payment_allocations_customerInvoiceId_fkey" FOREIGN KEY ("customerInvoiceId") REFERENCES "customer_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- 8. Procurement / payables (FR-PO, FR-SI, FR-SP)
-- ============================================================
CREATE TABLE "purchase_orders" (
  "id" TEXT NOT NULL,
  "poNumber" TEXT NOT NULL,
  "vendorId" TEXT,
  "vendorName" TEXT NOT NULL,
  "linkedSalesOrderId" TEXT,
  "linkedSalesOrderNumber" TEXT,
  "requestedDeliveryDate" TIMESTAMP(3),
  "paymentTerms" TEXT NOT NULL DEFAULT 'Net 30',
  "currency" TEXT NOT NULL DEFAULT 'AUD',
  "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "taxTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "totalValue" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "moq" INTEGER,
  "leadTimeDays" INTEGER,
  "notes" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "purchase_orders_poNumber_key" ON "purchase_orders"("poNumber");
CREATE INDEX "purchase_orders_vendorId_idx" ON "purchase_orders"("vendorId");
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_linkedSalesOrderId_fkey" FOREIGN KEY ("linkedSalesOrderId") REFERENCES "sales_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "purchase_order_lines" (
  "id" TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL,
  "itemCode" TEXT NOT NULL,
  "itemName" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitCost" DECIMAL(18,4) NOT NULL,
  "taxCodeId" TEXT,
  "taxPercent" DECIMAL(6,3) NOT NULL DEFAULT 0,
  "lineTotal" DECIMAL(18,4) NOT NULL,
  "receivedQty" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "purchase_order_lines_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "purchase_order_lines_purchaseOrderId_idx" ON "purchase_order_lines"("purchaseOrderId");
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_taxCodeId_fkey" FOREIGN KEY ("taxCodeId") REFERENCES "tax_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "supplier_invoices" (
  "id" TEXT NOT NULL,
  "vendorInvoiceNumber" TEXT NOT NULL,
  "purchaseOrderId" TEXT,
  "linkedPoNumber" TEXT NOT NULL,
  "vendorId" TEXT,
  "vendorName" TEXT NOT NULL,
  "invoiceDate" TIMESTAMP(3) NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'AUD',
  "invoiceAmount" DECIMAL(18,4) NOT NULL,
  "amountPaid" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "varianceVsPo" DECIMAL(18,4),
  "attachmentUrl" TEXT,
  "attachmentFileName" TEXT,
  "status" "SupplierInvoiceStatus" NOT NULL DEFAULT 'SUBMITTED',
  "approvalReason" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "supplier_invoices_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "supplier_invoices_purchaseOrderId_idx" ON "supplier_invoices"("purchaseOrderId");
CREATE INDEX "supplier_invoices_vendorId_idx" ON "supplier_invoices"("vendorId");
CREATE INDEX "supplier_invoices_status_idx" ON "supplier_invoices"("status");
CREATE UNIQUE INDEX "supplier_invoices_vendorId_vendorInvoiceNumber_key" ON "supplier_invoices"("vendorId", "vendorInvoiceNumber");
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "supplier_payments" (
  "id" TEXT NOT NULL,
  "paymentNumber" TEXT NOT NULL,
  "vendorId" TEXT,
  "vendorName" TEXT NOT NULL,
  "paymentDate" TIMESTAMP(3) NOT NULL,
  "amount" DECIMAL(18,4) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'AUD',
  "paymentMethod" TEXT NOT NULL,
  "bankReference" TEXT,
  "evidenceUrl" TEXT,
  "notes" TEXT,
  "status" "SupplierPaymentStatus" NOT NULL DEFAULT 'DRAFT',
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "supplier_payments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "supplier_payments_paymentNumber_key" ON "supplier_payments"("paymentNumber");
CREATE INDEX "supplier_payments_vendorId_idx" ON "supplier_payments"("vendorId");

CREATE TABLE "supplier_payment_allocations" (
  "id" TEXT NOT NULL,
  "supplierPaymentId" TEXT NOT NULL,
  "supplierInvoiceId" TEXT NOT NULL,
  "amountAllocated" DECIMAL(18,4) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "supplier_payment_allocations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "supplier_payment_allocations_supplierPaymentId_idx" ON "supplier_payment_allocations"("supplierPaymentId");
CREATE INDEX "supplier_payment_allocations_supplierInvoiceId_idx" ON "supplier_payment_allocations"("supplierInvoiceId");
ALTER TABLE "supplier_payment_allocations" ADD CONSTRAINT "supplier_payment_allocations_supplierPaymentId_fkey" FOREIGN KEY ("supplierPaymentId") REFERENCES "supplier_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplier_payment_allocations" ADD CONSTRAINT "supplier_payment_allocations_supplierInvoiceId_fkey" FOREIGN KEY ("supplierInvoiceId") REFERENCES "supplier_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- 9. Transaction workspace + comms + attachments + snapshots
-- ============================================================
CREATE TABLE "transactions" (
  "id" TEXT NOT NULL,
  "salesOrderId" TEXT NOT NULL,
  "overallStatus" "TransactionOverallStatus" NOT NULL DEFAULT 'OPEN',
  "closureChecklistJson" JSONB,
  "exceptionReason" TEXT,
  "closedAt" TIMESTAMP(3),
  "closedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "transactions_salesOrderId_key" ON "transactions"("salesOrderId");
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "transaction_events" (
  "id" TEXT NOT NULL,
  "transactionId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "actor" TEXT,
  "message" TEXT,
  "payloadJson" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "transaction_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "transaction_events_transactionId_idx" ON "transaction_events"("transactionId");
CREATE INDEX "transaction_events_occurredAt_idx" ON "transaction_events"("occurredAt");
ALTER TABLE "transaction_events" ADD CONSTRAINT "transaction_events_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "email_communications" (
  "id" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'EMAIL',
  "templateKey" TEXT,
  "templateVersion" TEXT,
  "senderEmail" TEXT,
  "recipientEmails" JSONB NOT NULL,
  "subject" TEXT,
  "relatedEntity" TEXT,
  "relatedEntityId" TEXT,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
  "lastAttemptAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "email_communications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "email_communications_relatedEntity_relatedEntityId_idx" ON "email_communications"("relatedEntity", "relatedEntityId");

CREATE TABLE "attachments" (
  "id" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "storageKey" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "scanStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "version" INTEGER NOT NULL DEFAULT 1,
  "uploadedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "attachments_entityType_entityId_idx" ON "attachments"("entityType", "entityId");

CREATE TABLE "document_snapshots" (
  "id" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "documentNumber" TEXT NOT NULL,
  "snapshotJson" JSONB NOT NULL,
  "contentHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_snapshots_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "document_snapshots_entityType_entityId_idx" ON "document_snapshots"("entityType", "entityId");

-- ============================================================
-- 10. Seed the required document sequences (BR-012)
-- ============================================================
INSERT INTO "document_sequences" ("id", "key", "prefix", "yearScope", "currentYear", "currentValue", "padLength", "updatedAt", "createdAt") VALUES
  ('seq_so',  'SO',  'SO',  true, EXTRACT(YEAR FROM NOW())::int, 0, 5, NOW(), NOW()),
  ('seq_po',  'PO',  'PO',  true, EXTRACT(YEAR FROM NOW())::int, 0, 5, NOW(), NOW()),
  ('seq_dn',  'DN',  'DSP', true, EXTRACT(YEAR FROM NOW())::int, 0, 5, NOW(), NOW()),
  ('seq_ci',  'CI',  'INV', true, EXTRACT(YEAR FROM NOW())::int, 0, 4, NOW(), NOW()),
  ('seq_vi',  'VI',  'VIN', true, EXTRACT(YEAR FROM NOW())::int, 0, 4, NOW(), NOW()),
  ('seq_cp',  'CP',  'PMT', true, EXTRACT(YEAR FROM NOW())::int, 0, 5, NOW(), NOW()),
  ('seq_vp',  'VP',  'VPT', true, EXTRACT(YEAR FROM NOW())::int, 0, 5, NOW(), NOW()),
  ('seq_oi',  'OI',  'ORQ', true, EXTRACT(YEAR FROM NOW())::int, 0, 5, NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;
