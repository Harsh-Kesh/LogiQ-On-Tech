-- One-time fix: add all missing columns to storefront_orders.
-- Safe to run multiple times — ADD COLUMN IF NOT EXISTS is idempotent.
-- Run this in the Neon SQL editor, then redeploy.

ALTER TABLE storefront_orders ADD COLUMN IF NOT EXISTS "salesOrderId"               TEXT;
ALTER TABLE storefront_orders ADD COLUMN IF NOT EXISTS "myobSoGuid"                  TEXT;
ALTER TABLE storefront_orders ADD COLUMN IF NOT EXISTS "myobSoNumber"                TEXT;
ALTER TABLE storefront_orders ADD COLUMN IF NOT EXISTS "myobPoGuid"                  TEXT;
ALTER TABLE storefront_orders ADD COLUMN IF NOT EXISTS "myobPoNumber"                TEXT;
ALTER TABLE storefront_orders ADD COLUMN IF NOT EXISTS "myobBillGuid"                TEXT;
ALTER TABLE storefront_orders ADD COLUMN IF NOT EXISTS "myobBillNumber"              TEXT;
ALTER TABLE storefront_orders ADD COLUMN IF NOT EXISTS "myobPaymentGuid"             TEXT;
ALTER TABLE storefront_orders ADD COLUMN IF NOT EXISTS "myobInvoiceGuid"             TEXT;
ALTER TABLE storefront_orders ADD COLUMN IF NOT EXISTS "myobInvoiceNumber"           TEXT;
ALTER TABLE storefront_orders ADD COLUMN IF NOT EXISTS "monoovaTxnId"                TEXT;
ALTER TABLE storefront_orders ADD COLUMN IF NOT EXISTS "monoovaStatus"               TEXT;
ALTER TABLE storefront_orders ADD COLUMN IF NOT EXISTS "supplierPaidAt"              TIMESTAMP(3);
ALTER TABLE storefront_orders ADD COLUMN IF NOT EXISTS "poEmailSentAt"               TIMESTAMP(3);
ALTER TABLE storefront_orders ADD COLUMN IF NOT EXISTS "poEmailSentTo"               TEXT;
ALTER TABLE storefront_orders ADD COLUMN IF NOT EXISTS "supplierInvoiceReceivedAt"   TIMESTAMP(3);
ALTER TABLE storefront_orders ADD COLUMN IF NOT EXISTS "threeWayMatchResult"         TEXT;
ALTER TABLE storefront_orders ADD COLUMN IF NOT EXISTS "threeWayMatchNotes"          TEXT;
ALTER TABLE storefront_orders ADD COLUMN IF NOT EXISTS "matchedAt"                   TIMESTAMP(3);
ALTER TABLE storefront_orders ADD COLUMN IF NOT EXISTS "sektorStatus"                TEXT;
ALTER TABLE storefront_orders ADD COLUMN IF NOT EXISTS "sektorStatusUpdatedAt"       TIMESTAMP(3);
ALTER TABLE storefront_orders ADD COLUMN IF NOT EXISTS "sektorTrackingNumber"        TEXT;
ALTER TABLE storefront_orders ADD COLUMN IF NOT EXISTS "fulfilledAt"                 TIMESTAMP(3);

-- Add unique index on salesOrderId if not already present
CREATE UNIQUE INDEX IF NOT EXISTS "storefront_orders_salesOrderId_key" ON storefront_orders("salesOrderId");

-- Add indexes if missing
CREATE INDEX IF NOT EXISTS "storefront_orders_customerEmail_idx" ON storefront_orders("customerEmail");
CREATE INDEX IF NOT EXISTS "storefront_orders_status_idx"        ON storefront_orders("status");

-- Create email_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS email_logs (
  id        TEXT         NOT NULL PRIMARY KEY,
  "to"      TEXT         NOT NULL,
  cc        TEXT,
  subject   TEXT         NOT NULL,
  html      TEXT         NOT NULL,
  "sentAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  mode      TEXT         NOT NULL DEFAULT 'simulated',
  "orderId" TEXT
);
CREATE INDEX IF NOT EXISTS "email_logs_sentAt_idx" ON email_logs("sentAt");
