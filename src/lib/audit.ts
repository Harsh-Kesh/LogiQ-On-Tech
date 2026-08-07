import { prisma } from './prisma';
import { UserRole } from '@prisma/client';

export interface AuditEventParams {
  userId?: string;
  role?: UserRole;
  action: string;
  module: 'GOVERNANCE' | 'VENDOR_MANAGEMENT' | 'WAREHOUSE_OPERATIONS' | 'MASTER_DATA_MDM';
  targetId?: string;
  payloadJson?: Record<string, any>;
  ipAddress?: string;
}

export async function logAuditEvent(params: AuditEventParams) {
  try {
    const log = await prisma.auditLog.create({
      data: {
        userId: params.userId,
        role: params.role,
        action: params.action,
        module: params.module,
        targetId: params.targetId,
        payloadJson: params.payloadJson ? JSON.stringify(params.payloadJson) : null,
        ipAddress: params.ipAddress,
      },
    });
    return log;
  } catch (error) {
    console.warn(`Audit Log Notice [${params.action}]: DB unattached/offline`, error);
    return null;
  }
}
