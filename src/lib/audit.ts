import { prisma } from './prisma';
import { UserRole } from '@prisma/client';

export interface AuditLogOptions {
  userId?: string;
  role?: UserRole;
  action: string;
  module: string;
  targetId?: string;
  ipAddress?: string;
  payloadJson?: Record<string, any>;
}

export async function logAuditEvent(options: AuditLogOptions) {
  try {
    const log = await prisma.auditLog.create({
      data: {
        userId: options.userId || null,
        role: options.role || null,
        action: options.action,
        module: options.module,
        targetId: options.targetId || null,
        ipAddress: options.ipAddress || '127.0.0.1',
        payloadJson: options.payloadJson ? JSON.stringify(options.payloadJson) : null,
      },
    });
    return log;
  } catch (error) {
    console.error('❌ Failed to create audit log entry:', error);
    return null;
  }
}
