-- Simplify the platform to a strict 2-role system: PLATFORM_OWNER and VENDOR.
-- Postgres enums can't drop values directly, so swap in a new type.
-- Any existing rows referencing a removed role must already have been
-- reassigned to VENDOR before this migration runs.

ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;

CREATE TYPE "UserRole_new" AS ENUM ('PLATFORM_OWNER', 'VENDOR');

ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TABLE "audit_logs" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");

DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";

ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'VENDOR';
