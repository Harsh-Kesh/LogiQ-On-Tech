-- Seed vendor PO emails and supplier item codes.
-- Run once in the Neon SQL editor (safe to re-run — uses conditional updates).
-- ============================================================

-- STEP 1: Set vendor poEmail from their registered account email (one email per vendor)
UPDATE vendors v
SET "poEmail" = u.email
FROM users u
WHERE v."userId" = u.id
  AND v."poEmail" IS NULL;

-- STEP 2: Set supplier catalog codes for all items
-- Apex Hardware & Logistics Ltd items
UPDATE item_masters SET "supplierItemCode" = 'APX-HD900-2D'      WHERE sku = 'LQ-SCN-00101' AND "supplierItemCode" IS NULL;
UPDATE item_masters SET "supplierItemCode" = 'APX-LP300-TT'      WHERE sku = 'LQ-PRT-00102' AND "supplierItemCode" IS NULL;
UPDATE item_masters SET "supplierItemCode" = 'APX-PDAX5-A13'     WHERE sku = 'LQ-MOB-00103' AND "supplierItemCode" IS NULL;
UPDATE item_masters SET "supplierItemCode" = 'APX-RFDT-UHF100'   WHERE sku = 'LQ-RFD-00104' AND "supplierItemCode" IS NULL;
UPDATE item_masters SET "supplierItemCode" = 'APX-LS300-SS'      WHERE sku = 'LQ-SCL-00105' AND "supplierItemCode" IS NULL;
UPDATE item_masters SET "supplierItemCode" = 'APX-GATE400-4P'    WHERE sku = 'LQ-RFD-00109' AND "supplierItemCode" IS NULL;
UPDATE item_masters SET "supplierItemCode" = 'APX-RNG20-BT2D'    WHERE sku = 'LQ-SCN-00113' AND "supplierItemCode" IS NULL;
UPDATE item_masters SET "supplierItemCode" = 'APX-LPH-203DPI'    WHERE sku = 'LQ-PRT-00114' AND "supplierItemCode" IS NULL;
UPDATE item_masters SET "supplierItemCode" = 'APX-FRZX-MINUS30'  WHERE sku = 'LQ-MOB-00115' AND "supplierItemCode" IS NULL;
UPDATE item_masters SET "supplierItemCode" = 'APX-VESA-FLK-DC'   WHERE sku = 'LQ-MNT-00116' AND "supplierItemCode" IS NULL;
UPDATE item_masters SET "supplierItemCode" = 'APX-VFY-1D2D-ISO'  WHERE sku = 'LQ-VER-00117' AND "supplierItemCode" IS NULL;
UPDATE item_masters SET "supplierItemCode" = 'APX-ANT-9DBI-CP'   WHERE sku = 'LQ-ANT-00118' AND "supplierItemCode" IS NULL;
UPDATE item_masters SET "supplierItemCode" = 'APX-BAT-6700-X5'   WHERE sku = 'LQ-BAT-00121' AND "supplierItemCode" IS NULL;
UPDATE item_masters SET "supplierItemCode" = 'APX-CHG-4T4B-ETH'  WHERE sku = 'LQ-CHG-00122' AND "supplierItemCode" IS NULL;
UPDATE item_masters SET "supplierItemCode" = 'APX-TBF-G2-WIN11'  WHERE sku = 'LQ-TBL-00110' AND "supplierItemCode" IS NULL;

-- Smith Logistics Pty Ltd items
UPDATE item_masters SET "supplierItemCode" = 'SML-DT100150-1K'   WHERE sku = 'LQ-LBL-00106' AND "supplierItemCode" IS NULL;
UPDATE item_masters SET "supplierItemCode" = 'SML-TTR110300-RES' WHERE sku = 'LQ-RBN-00107' AND "supplierItemCode" IS NULL;
UPDATE item_masters SET "supplierItemCode" = 'SML-PLT-HW1165'    WHERE sku = 'LQ-PLT-00108' AND "supplierItemCode" IS NULL;
UPDATE item_masters SET "supplierItemCode" = 'SML-CTN504030-DW'  WHERE sku = 'LQ-BOX-00111' AND "supplierItemCode" IS NULL;
UPDATE item_masters SET "supplierItemCode" = 'SML-CRY5025-500'   WHERE sku = 'LQ-LBL-00112' AND "supplierItemCode" IS NULL;
UPDATE item_masters SET "supplierItemCode" = 'SML-GHS-FLM-500'   WHERE sku = 'LQ-LBL-00119' AND "supplierItemCode" IS NULL;
UPDATE item_masters SET "supplierItemCode" = 'SML-WAP70150-RGF'  WHERE sku = 'LQ-TP-00120'  AND "supplierItemCode" IS NULL;
UPDATE item_masters SET "supplierItemCode" = 'SML-VOID-PP-500'   WHERE sku = 'LQ-LBL-00123' AND "supplierItemCode" IS NULL;

-- Fixed-mount scanner (no vendor — LogiQ internal stock)
-- LQ-SCN-00110 intentionally left without supplierItemCode (vendorId IS NULL)

-- Verify results
SELECT v."companyName", v."poEmail", u.email AS "registeredEmail"
FROM vendors v JOIN users u ON v."userId" = u.id
ORDER BY v."companyName";

SELECT sku, "supplierItemCode", "vendorId" IS NOT NULL AS "hasVendor"
FROM item_masters
ORDER BY sku;
