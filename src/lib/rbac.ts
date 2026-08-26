import { UserRole } from '@prisma/client';

// SRS §7 module map. Broadened to cover the transactional domains added in
// Phase A + Phase B. Old modules retained for legacy owner pages.
export type AppModule =
  | 'GOVERNANCE'
  | 'VENDOR_MANAGEMENT'
  | 'WAREHOUSE_OPERATIONS'
  | 'MASTER_DATA_MDM'
  | 'SALES_ORDERS'
  | 'ALLOCATION'
  | 'DISPATCH'
  | 'CUSTOMER_INVOICING'
  | 'CUSTOMER_PAYMENTS'
  | 'PURCHASE_ORDERS'
  | 'VENDOR_INVOICING'
  | 'VENDOR_PAYMENTS'
  | 'TRANSACTION_WORKSPACE'
  | 'REPORTS'
  | 'AUDIT';

export type ActionType = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'APPROVE';

export interface PermissionRule {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  approve?: boolean;
}

const FULL: PermissionRule = { create: true, read: true, update: true, delete: true, approve: true };
const RW: PermissionRule = { create: true, read: true, update: true, delete: false, approve: false };
const READ: PermissionRule = { create: false, read: true, update: false, delete: false, approve: false };
const NONE: PermissionRule = { create: false, read: false, update: false, delete: false, approve: false };

function build(perms: Partial<Record<AppModule, PermissionRule>>): Record<AppModule, PermissionRule> {
  const all: AppModule[] = [
    'GOVERNANCE', 'VENDOR_MANAGEMENT', 'WAREHOUSE_OPERATIONS', 'MASTER_DATA_MDM',
    'SALES_ORDERS', 'ALLOCATION', 'DISPATCH', 'CUSTOMER_INVOICING', 'CUSTOMER_PAYMENTS',
    'PURCHASE_ORDERS', 'VENDOR_INVOICING', 'VENDOR_PAYMENTS',
    'TRANSACTION_WORKSPACE', 'REPORTS', 'AUDIT',
  ];
  const out: Record<AppModule, PermissionRule> = {} as any;
  for (const m of all) out[m] = perms[m] ?? NONE;
  return out;
}

// SRS §12.1 permission matrix + Phase-A + Phase-B roles.
export const PERMISSION_MATRIX: Record<UserRole, Record<AppModule, PermissionRule>> = {
  PLATFORM_OWNER: build({
    GOVERNANCE: FULL, VENDOR_MANAGEMENT: FULL, WAREHOUSE_OPERATIONS: FULL, MASTER_DATA_MDM: FULL,
    SALES_ORDERS: FULL, ALLOCATION: FULL, DISPATCH: FULL, CUSTOMER_INVOICING: FULL, CUSTOMER_PAYMENTS: FULL,
    PURCHASE_ORDERS: FULL, VENDOR_INVOICING: FULL, VENDOR_PAYMENTS: FULL,
    TRANSACTION_WORKSPACE: FULL, REPORTS: FULL, AUDIT: FULL,
  }),
  SALES_OPS: build({
    MASTER_DATA_MDM: READ, VENDOR_MANAGEMENT: READ,
    SALES_ORDERS: RW, ALLOCATION: RW, DISPATCH: RW,
    CUSTOMER_INVOICING: READ, CUSTOMER_PAYMENTS: READ,
    PURCHASE_ORDERS: RW, VENDOR_INVOICING: READ, VENDOR_PAYMENTS: READ,
    TRANSACTION_WORKSPACE: READ, REPORTS: READ,
  }),
  FINANCE: build({
    MASTER_DATA_MDM: READ, VENDOR_MANAGEMENT: READ, SALES_ORDERS: READ, ALLOCATION: READ, DISPATCH: READ,
    CUSTOMER_INVOICING: { ...FULL, delete: false },
    CUSTOMER_PAYMENTS: FULL,
    PURCHASE_ORDERS: RW,
    VENDOR_INVOICING: FULL,
    VENDOR_PAYMENTS: FULL,
    TRANSACTION_WORKSPACE: RW, REPORTS: FULL, AUDIT: READ,
  }),
  WAREHOUSE_MANAGER: build({
    WAREHOUSE_OPERATIONS: RW,
    DISPATCH: RW,
    SALES_ORDERS: READ, ALLOCATION: READ,
    MASTER_DATA_MDM: READ,
    REPORTS: READ,
  }),
  WAREHOUSE_OPERATOR: build({
    WAREHOUSE_OPERATIONS: { create: false, read: true, update: true, delete: false, approve: false },
    DISPATCH: { create: false, read: true, update: true, delete: false, approve: false },
    SALES_ORDERS: READ,
  }),
  AUDITOR: build({
    GOVERNANCE: READ, VENDOR_MANAGEMENT: READ, WAREHOUSE_OPERATIONS: READ, MASTER_DATA_MDM: READ,
    SALES_ORDERS: READ, ALLOCATION: READ, DISPATCH: READ, CUSTOMER_INVOICING: READ, CUSTOMER_PAYMENTS: READ,
    PURCHASE_ORDERS: READ, VENDOR_INVOICING: READ, VENDOR_PAYMENTS: READ,
    TRANSACTION_WORKSPACE: READ, REPORTS: READ, AUDIT: READ,
  }),
  // Legacy roles — kept working while migration to the SRS role model completes.
  VENDOR: build({
    VENDOR_MANAGEMENT: RW,
    WAREHOUSE_OPERATIONS: READ,
    MASTER_DATA_MDM: RW,
    PURCHASE_ORDERS: READ, VENDOR_INVOICING: RW,
  }),
  WAREHOUSE: build({
    WAREHOUSE_OPERATIONS: RW,
    DISPATCH: RW,
    VENDOR_MANAGEMENT: READ, MASTER_DATA_MDM: READ,
  }),
  MDM: build({
    MASTER_DATA_MDM: FULL,
    VENDOR_MANAGEMENT: READ, WAREHOUSE_OPERATIONS: READ,
    SALES_ORDERS: RW, PURCHASE_ORDERS: RW,
  }),
  CUSTOMER: build({
    MASTER_DATA_MDM: READ,
  }),
};

export function hasPermission(role: UserRole, module: AppModule, action: ActionType): boolean {
  const rule = PERMISSION_MATRIX[role]?.[module];
  if (!rule) return false;
  switch (action) {
    case 'CREATE': return rule.create;
    case 'READ': return rule.read;
    case 'UPDATE': return rule.update;
    case 'DELETE': return rule.delete;
    case 'APPROVE': return !!rule.approve;
    default: return false;
  }
}

// Roles that must have MFA enrolled before touching sensitive data.
// FR-AU-006, SRS §12.2.
export const MFA_REQUIRED_ROLES: UserRole[] = ['PLATFORM_OWNER', 'FINANCE'];

export function getDefaultDashboardForRole(role: UserRole): string {
  switch (role) {
    case 'PLATFORM_OWNER':
      return '/dashboard/owner';
    case 'SALES_OPS':
      return '/dashboard/owner/b2b-orders';
    case 'FINANCE':
      return '/dashboard/owner/b2b-orders';
    case 'AUDITOR':
      return '/dashboard/owner/audit-logs';
    case 'WAREHOUSE_MANAGER':
    case 'WAREHOUSE_OPERATOR':
    case 'WAREHOUSE':
      return '/dashboard/warehouse';
    case 'VENDOR':
      return '/dashboard/vendor';
    case 'MDM':
      return '/dashboard/owner/items';
    default:
      return '/dashboard/vendor';
  }
}
