// Shared auth guard helpers used by API routes.
// Centralised so role additions in SRS §7.1 propagate everywhere without
// touching every route by hand.

import { UserRole } from '@prisma/client';

export type SessionUser = { id: string; email?: string; role: UserRole; name?: string; warehouseCode?: string; mfaEnabled?: boolean };

export const OWNER_ROLES: UserRole[] = ['PLATFORM_OWNER'];
export const SALES_ROLES: UserRole[] = ['PLATFORM_OWNER', 'SALES_OPS', 'MDM'];
export const FINANCE_ROLES: UserRole[] = ['PLATFORM_OWNER', 'FINANCE'];
export const MDM_ROLES: UserRole[] = ['PLATFORM_OWNER', 'MDM'];
export const WAREHOUSE_ROLES: UserRole[] = ['PLATFORM_OWNER', 'WAREHOUSE_MANAGER', 'WAREHOUSE_OPERATOR', 'WAREHOUSE'];
export const AUDIT_ROLES: UserRole[] = ['PLATFORM_OWNER', 'AUDITOR'];

// Sales-Ops + Finance + Owner can create commercial documents (SOs, POs, CIs, VIs).
export const COMMERCIAL_ROLES: UserRole[] = ['PLATFORM_OWNER', 'SALES_OPS', 'FINANCE', 'MDM'];

// Finance + Owner approve/settle payments.
export const PAYMENT_ROLES: UserRole[] = ['PLATFORM_OWNER', 'FINANCE'];

export function isRoleIn(user: any, allowed: UserRole[]): boolean {
  return !!user && allowed.includes(user.role);
}
