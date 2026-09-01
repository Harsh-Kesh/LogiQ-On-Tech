// SRS Role-Based Access Control (RBAC) System
// Strictly 2-Role System: PLATFORM_OWNER and VENDOR

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

export const PERMISSION_MATRIX: Record<string, Record<AppModule, PermissionRule>> = {
  PLATFORM_OWNER: build({
    GOVERNANCE: FULL,
    VENDOR_MANAGEMENT: FULL,
    WAREHOUSE_OPERATIONS: FULL,
    MASTER_DATA_MDM: FULL,
    SALES_ORDERS: FULL,
    ALLOCATION: FULL,
    DISPATCH: FULL,
    CUSTOMER_INVOICING: FULL,
    CUSTOMER_PAYMENTS: FULL,
    PURCHASE_ORDERS: FULL,
    VENDOR_INVOICING: FULL,
    VENDOR_PAYMENTS: FULL,
    TRANSACTION_WORKSPACE: FULL,
    REPORTS: FULL,
    AUDIT: FULL,
  }),
  VENDOR: build({
    VENDOR_MANAGEMENT: RW,
    WAREHOUSE_OPERATIONS: RW,
    DISPATCH: RW,
    MASTER_DATA_MDM: RW,
    SALES_ORDERS: READ,
    ALLOCATION: READ,
    PURCHASE_ORDERS: RW,
    VENDOR_INVOICING: RW,
    REPORTS: READ,
  }),
};

export function hasPermission(role: string, module: AppModule, action: ActionType): boolean {
  const normalizedRole = role === 'PLATFORM_OWNER' ? 'PLATFORM_OWNER' : 'VENDOR';
  const rule = PERMISSION_MATRIX[normalizedRole]?.[module];
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

export const MFA_REQUIRED_ROLES: string[] = ['PLATFORM_OWNER'];

export function getDefaultDashboardForRole(role: string): string {
  switch (role) {
    case 'PLATFORM_OWNER':
      return '/dashboard/owner';
    case 'VENDOR':
    default:
      return '/dashboard/vendor';
  }
}

export function roleRequires2FA(role: string): boolean {
  return role === 'PLATFORM_OWNER';
}
