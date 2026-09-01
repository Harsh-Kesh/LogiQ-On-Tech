// Shared auth guard helpers used by API routes.
// Strictly 2-Role System: PLATFORM_OWNER and VENDOR

import { hasPermission, type AppModule, type ActionType } from './rbac';
import { prisma } from './prisma';

export type SessionUser = { id: string; email?: string; role: string; name?: string; mfaEnabled?: boolean };

export const OWNER_ROLES: string[] = ['PLATFORM_OWNER'];
export const VENDOR_ROLES: string[] = ['VENDOR'];
export const COMMERCIAL_ROLES: string[] = ['PLATFORM_OWNER'];
export const WAREHOUSE_ROLES: string[] = ['PLATFORM_OWNER', 'VENDOR'];
export const MDM_ROLES: string[] = ['PLATFORM_OWNER', 'VENDOR'];
export const AUDIT_ROLES: string[] = ['PLATFORM_OWNER'];
export const PAYMENT_ROLES: string[] = ['PLATFORM_OWNER'];
export const SALES_ROLES: string[] = ['PLATFORM_OWNER'];
export const FINANCE_ROLES: string[] = ['PLATFORM_OWNER'];

export function isRoleIn(user: any, allowed: string[]): boolean {
  if (!user?.role) return false;
  return allowed.includes(user.role);
}

export function guardPermission(user: any, module: AppModule, action: ActionType): boolean {
  if (!user?.role) return false;
  return hasPermission(user.role, module, action);
}

// The VENDOR session token never carries a reliable `companyName` (it's the person's
// display name, e.g. "Apex Hardware Manager", not the legal entity on file), so a
// vendor's own records can't be found by strict equality against vendorName. This is
// the same fuzzy match already duplicated across several routes — centralized here so
// new vendor-ownership checks don't silently break the way a strict-equals one did.
// Registration (statutory profile + compliance docs) must be fully approved by the
// Platform Owner before a vendor can act on any commercial process — confirm a PO,
// submit an invoice, claim a transport cost, dispatch stock, etc. Non-vendor roles are
// never gated by this (they have no registration record to approve).
export async function isVendorApproved(user: any): Promise<boolean> {
  if (!user || user.role !== 'VENDOR') return true;
  const dbUser = await prisma.user.findUnique({
    where: { email: (user.email || '').toLowerCase().trim() },
    include: { vendor: true },
  });
  return dbUser?.vendor?.status === 'APPROVED';
}

// The session's `user.id` is the User.id, not the Vendor.id — records that store vendor
// ownership (stock ledger rows, POs, transport cost claims, ...) store the real Vendor.id.
// Resolve it once per request rather than comparing the wrong id everywhere.
export async function resolveVendorIdForUser(user: any): Promise<string | null> {
  if (!user || user.role !== 'VENDOR') return null;
  const dbUser = await prisma.user.findUnique({
    where: { email: (user.email || '').toLowerCase().trim() },
    include: { vendor: true },
  });
  return dbUser?.vendor?.id || null;
}

export function vendorOwnsRecord(
  user: any,
  record: { vendorName?: string; vendorEmail?: string; vendorId?: string },
  sessionVendorId?: string | null
): boolean {
  if (!user) return false;
  const userEmail = (user.email || '').toLowerCase();
  const userComp = (user.companyName || '').toLowerCase();
  const vEmail = (record.vendorEmail || '').toLowerCase();
  const vName = (record.vendorName || '').toLowerCase();
  return Boolean(
    (record.vendorId && sessionVendorId && record.vendorId === sessionVendorId) ||
    (record.vendorId && user.id && record.vendorId === user.id) ||
    (vEmail && vEmail === userEmail) ||
    (userComp && vName && (vName.includes(userComp) || userComp.includes(vName)))
  );
}
