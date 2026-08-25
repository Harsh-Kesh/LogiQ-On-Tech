import { UserRole } from '@prisma/client';

export type AppModule =
  | 'GOVERNANCE'
  | 'VENDOR_MANAGEMENT'
  | 'WAREHOUSE_OPERATIONS'
  | 'MASTER_DATA_MDM';

export type ActionType = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';

export interface PermissionRule {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

// Matrix defining Role x Module x CRUD Permissions
export const PERMISSION_MATRIX: Record<UserRole, Record<AppModule, PermissionRule>> = {
  PLATFORM_OWNER: {
    GOVERNANCE: { create: true, read: true, update: true, delete: true },
    VENDOR_MANAGEMENT: { create: true, read: true, update: true, delete: true },
    WAREHOUSE_OPERATIONS: { create: true, read: true, update: true, delete: true },
    MASTER_DATA_MDM: { create: true, read: true, update: true, delete: true },
  },
  VENDOR: {
    GOVERNANCE: { create: false, read: false, update: false, delete: false },
    VENDOR_MANAGEMENT: { create: true, read: true, update: true, delete: false },
    WAREHOUSE_OPERATIONS: { create: false, read: true, update: false, delete: false },
    MASTER_DATA_MDM: { create: true, read: true, update: true, delete: false },
  },
  WAREHOUSE: {
    GOVERNANCE: { create: false, read: false, update: false, delete: false },
    VENDOR_MANAGEMENT: { create: false, read: true, update: false, delete: false },
    WAREHOUSE_OPERATIONS: { create: true, read: true, update: true, delete: false },
    MASTER_DATA_MDM: { create: false, read: true, update: false, delete: false },
  },
  MDM: {
    GOVERNANCE: { create: false, read: false, update: false, delete: false },
    VENDOR_MANAGEMENT: { create: false, read: true, update: false, delete: false },
    WAREHOUSE_OPERATIONS: { create: false, read: true, update: false, delete: false },
    MASTER_DATA_MDM: { create: true, read: true, update: true, delete: true },
  },
  CUSTOMER: {
    GOVERNANCE: { create: false, read: false, update: false, delete: false },
    VENDOR_MANAGEMENT: { create: false, read: false, update: false, delete: false },
    WAREHOUSE_OPERATIONS: { create: false, read: false, update: false, delete: false },
    MASTER_DATA_MDM: { create: false, read: true, update: false, delete: false },
  },
};

export function hasPermission(
  role: UserRole,
  module: AppModule,
  action: ActionType
): boolean {
  const rule = PERMISSION_MATRIX[role]?.[module];
  if (!rule) return false;
  switch (action) {
    case 'CREATE':
      return rule.create;
    case 'READ':
      return rule.read;
    case 'UPDATE':
      return rule.update;
    case 'DELETE':
      return rule.delete;
    default:
      return false;
  }
}

export function getDefaultDashboardForRole(role: UserRole): string {
  switch (role) {
    case 'PLATFORM_OWNER':
      return '/dashboard/owner';
    case 'VENDOR':
      return '/dashboard/vendor';
    case 'WAREHOUSE':
      return '/dashboard/warehouse';
    case 'MDM':
      return '/dashboard/owner/items';
    default:
      return '/dashboard/vendor';
  }
}
