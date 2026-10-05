-- Fix: add any missing columns on the warranty tables to match schema.prisma.
-- Safe to run multiple times — every statement uses IF NOT EXISTS.
-- Root cause: warranty_records likely predates later schema additions
-- (e.g. batchNumber) that were never pushed to this database, so any query
-- selecting them 500s — which silently empties the Warranties page and
-- breaks Global Traceability's per-result investigation fetch.

ALTER TABLE warranty_records ADD COLUMN IF NOT EXISTS "itemMasterId"          TEXT;
ALTER TABLE warranty_records ADD COLUMN IF NOT EXISTS "partDescription"       TEXT;
ALTER TABLE warranty_records ADD COLUMN IF NOT EXISTS "serialNumber"          TEXT;
ALTER TABLE warranty_records ADD COLUMN IF NOT EXISTS "batchNumber"           TEXT;
ALTER TABLE warranty_records ADD COLUMN IF NOT EXISTS "customerId"            TEXT;
ALTER TABLE warranty_records ADD COLUMN IF NOT EXISTS "customerName"          TEXT;
ALTER TABLE warranty_records ADD COLUMN IF NOT EXISTS "salesOrderId"          TEXT;
ALTER TABLE warranty_records ADD COLUMN IF NOT EXISTS "salesOrderNumber"      TEXT;
ALTER TABLE warranty_records ADD COLUMN IF NOT EXISTS "customerInvoiceId"     TEXT;
ALTER TABLE warranty_records ADD COLUMN IF NOT EXISTS "customerInvoiceNumber" TEXT;
ALTER TABLE warranty_records ADD COLUMN IF NOT EXISTS "vendorId"              TEXT;
ALTER TABLE warranty_records ADD COLUMN IF NOT EXISTS "vendorName"            TEXT;
ALTER TABLE warranty_records ADD COLUMN IF NOT EXISTS "purchaseOrderId"       TEXT;
ALTER TABLE warranty_records ADD COLUMN IF NOT EXISTS "purchaseOrderNumber"   TEXT;
ALTER TABLE warranty_records ADD COLUMN IF NOT EXISTS "supplierInvoiceId"     TEXT;
ALTER TABLE warranty_records ADD COLUMN IF NOT EXISTS "supplierInvoiceNumber" TEXT;
ALTER TABLE warranty_records ADD COLUMN IF NOT EXISTS "deliveryDate"          TIMESTAMP(3);
ALTER TABLE warranty_records ADD COLUMN IF NOT EXISTS "warrantyStartRule"     TEXT NOT NULL DEFAULT 'DELIVERY_DATE';
ALTER TABLE warranty_records ADD COLUMN IF NOT EXISTS "warrantyStartDate"     TIMESTAMP(3);
ALTER TABLE warranty_records ADD COLUMN IF NOT EXISTS "warrantyExpiryDate"    TIMESTAMP(3);
ALTER TABLE warranty_records ADD COLUMN IF NOT EXISTS "remainingDays"         INTEGER;
ALTER TABLE warranty_records ADD COLUMN IF NOT EXISTS "notifiedAt180Days"     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE warranty_records ADD COLUMN IF NOT EXISTS "notifiedAt90Days"      BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE warranty_records ADD COLUMN IF NOT EXISTS "notifiedAt60Days"      BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE warranty_records ADD COLUMN IF NOT EXISTS "notifiedAt30Days"      BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE warranty_records ADD COLUMN IF NOT EXISTS "notifiedAt14Days"      BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE warranty_records ADD COLUMN IF NOT EXISTS "notifiedAt7Days"       BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE warranty_records ADD COLUMN IF NOT EXISTS "notifiedAtExpiry"      BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE warranty_records ADD COLUMN IF NOT EXISTS "notificationEmails"    TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE warranty_records ADD COLUMN IF NOT EXISTS "overrideReason"        TEXT;
ALTER TABLE warranty_records ADD COLUMN IF NOT EXISTS "overriddenBy"          TEXT;
ALTER TABLE warranty_records ADD COLUMN IF NOT EXISTS "closedAt"              TIMESTAMP(3);
ALTER TABLE warranty_records ADD COLUMN IF NOT EXISTS "closedBy"              TEXT;
ALTER TABLE warranty_records ADD COLUMN IF NOT EXISTS "createdBy"             TEXT;

-- Indexes (safe no-ops if already present)
CREATE INDEX IF NOT EXISTS "warranty_records_status_idx"           ON warranty_records("status");
CREATE INDEX IF NOT EXISTS "warranty_records_warrantyExpiryDate_idx" ON warranty_records("warrantyExpiryDate");
CREATE INDEX IF NOT EXISTS "warranty_records_partNumber_idx"       ON warranty_records("partNumber");
CREATE INDEX IF NOT EXISTS "warranty_records_serialNumber_idx"     ON warranty_records("serialNumber");
CREATE INDEX IF NOT EXISTS "warranty_records_salesOrderId_idx"     ON warranty_records("salesOrderId");

-- Create warranty_evidence table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS warranty_evidence (
  id          TEXT         NOT NULL PRIMARY KEY,
  "warrantyId" TEXT        NOT NULL,
  "fileName"  TEXT         NOT NULL,
  "fileType"  TEXT         NOT NULL,
  "fileData"  TEXT         NOT NULL,
  "uploadedBy" TEXT,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "warranty_evidence_warrantyId_idx" ON warranty_evidence("warrantyId");

-- Create warranty_notifications table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS warranty_notifications (
  id           TEXT         NOT NULL PRIMARY KEY,
  "warrantyId" TEXT         NOT NULL,
  "daysBucket" INTEGER      NOT NULL,
  "sentAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  recipients   TEXT[]       NOT NULL DEFAULT '{}',
  status       TEXT         NOT NULL DEFAULT 'PENDING',
  "errorMessage" TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "warranty_notifications_warrantyId_idx" ON warranty_notifications("warrantyId");

-- Verify: should list every column above with no errors
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'warranty_records' ORDER BY column_name;
