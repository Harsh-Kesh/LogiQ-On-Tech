import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { logAuditEvent } from './audit';

export async function isUserRegistered(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  return !!user;
}

export async function updateRuntimeUserPassword(email: string, newPasswordHash: string): Promise<void> {
  await prisma.user.update({ where: { email: email.toLowerCase().trim() }, data: { passwordHash: newPasswordHash } }).catch(() => {});
}

/** One row per email — a new OTP request replaces any previous one for that email. */
export async function generatePasswordResetOtp(email: string): Promise<string> {
  const emailClean = email.toLowerCase().trim();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await prisma.passwordResetOtp.upsert({
    where: { email: emailClean },
    update: { code, expiresAt },
    create: { email: emailClean, code, expiresAt },
  });
  return code;
}

export async function verifyPasswordResetOtp(email: string, inputCode: string): Promise<boolean> {
  const emailClean = email.toLowerCase().trim();
  const record = await prisma.passwordResetOtp.findUnique({ where: { email: emailClean } });
  if (!record) return false;
  if (Date.now() > record.expiresAt.getTime()) {
    await prisma.passwordResetOtp.delete({ where: { email: emailClean } }).catch(() => {});
    return false;
  }
  if (record.code === inputCode.trim()) {
    await prisma.passwordResetOtp.delete({ where: { email: emailClean } }).catch(() => {});
    return true;
  }
  return false;
}

/**
 * Resolves a vendor by any of the id shapes callers historically pass around: a real
 * Vendor.id, a `vnd_`-prefixed User.id, a raw User.id, or an email — so existing routes
 * that grew up around the old JSON-store's fuzzy key matching keep working unchanged.
 */
async function findVendorByKey(userEmailOrId: string) {
  const key = (userEmailOrId || '').toLowerCase().trim();
  const rawId = key.replace(/^vnd_/, '');
  return prisma.vendor.findFirst({
    where: {
      OR: [
        { id: key },
        { id: rawId },
        { userId: key },
        { userId: rawId },
        { user: { email: key } },
      ],
    },
    include: { user: true },
  });
}

/** Finds the vendor for this key, or creates the underlying User+Vendor if this is a
 * brand-new self-registering vendor (key looks like an email with no existing account). */
async function findOrCreateVendorByKey(userEmailOrId: string, defaults?: { companyName?: string; abnAcn?: string; status?: string }) {
  const vendor = await findVendorByKey(userEmailOrId);
  if (vendor) return vendor;

  const key = (userEmailOrId || '').toLowerCase().trim();
  if (!key.includes('@')) return null;

  let user = await prisma.user.findUnique({ where: { email: key } });
  if (!user) {
    user = await prisma.user.create({ data: { email: key, fullName: 'Vendor Partner', role: 'VENDOR', passwordHash: '' } });
  }
  return prisma.vendor.create({
    data: {
      userId: user.id,
      companyName: defaults?.companyName || '',
      abnAcn: defaults?.abnAcn || `PENDING-${Date.now().toString().slice(-8)}`,
      status: (defaults?.status as any) || 'UNDER_REVIEW',
    },
    include: { user: true },
  });
}

export async function updateRuntimeVendorProfile(
  userEmailOrId: string,
  companyName?: string,
  abnAcn?: string,
  status?: string,
  rejectionReason?: string,
  businessRegisteredAddress?: string,
  businessLocation?: string
) {
  const vendor = await findOrCreateVendorByKey(userEmailOrId, { companyName, abnAcn, status });
  if (!vendor) return null;

  const data: any = {};
  if (companyName !== undefined && companyName !== '') data.companyName = companyName;
  if (abnAcn !== undefined && abnAcn !== '') data.abnAcn = abnAcn;
  if (businessRegisteredAddress !== undefined && businessRegisteredAddress !== '') data.businessRegisteredAddress = businessRegisteredAddress;
  if (businessLocation !== undefined && businessLocation !== '') data.businessLocation = businessLocation;
  if (status !== undefined) data.status = status;
  if (rejectionReason !== undefined) data.rejectionReason = rejectionReason;

  if (Object.keys(data).length === 0) return vendor;
  return prisma.vendor.update({ where: { id: vendor.id }, data, include: { user: true } });
}

export async function addRuntimeVendorDoc(userEmailOrId: string, doc: { docType: string; fileName: string; fileUrl: string; fileSize: number; status: string }) {
  const vendor = await findOrCreateVendorByKey(userEmailOrId);
  if (!vendor) return null;

  const existingDoc = await prisma.complianceDoc.findFirst({ where: { vendorId: vendor.id, docType: doc.docType } });
  const savedDoc = existingDoc
    ? await prisma.complianceDoc.update({
        where: { id: existingDoc.id },
        data: { fileName: doc.fileName, fileUrl: doc.fileUrl, fileSize: doc.fileSize, status: doc.status || 'PENDING', uploadedAt: new Date() },
      })
    : await prisma.complianceDoc.create({
        data: { vendorId: vendor.id, docType: doc.docType, fileName: doc.fileName, fileUrl: doc.fileUrl, fileSize: doc.fileSize, status: doc.status || 'PENDING' },
      });

  if (vendor.status === 'PENDING') {
    await prisma.vendor.update({ where: { id: vendor.id }, data: { status: 'UNDER_REVIEW' } });
  }
  return savedDoc;
}

if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_SECRET) {
  console.warn('CRITICAL: NEXTAUTH_SECRET is not set in production. This is insecure.');
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required.');
        }

        const emailClean = credentials.email.toLowerCase().trim();

        const user = await prisma.user.findUnique({
          where: { email: emailClean },
          include: { vendor: true },
        });

        if (!user) {
          throw new Error('Invalid email or password.');
        }

        if (user.isSuspended || user.vendor?.status === 'SUSPENDED') {
          await logAuditEvent({
            userId: user.id,
            role: user.role,
            action: 'USER_LOGIN_BLOCKED',
            module: 'GOVERNANCE',
            payloadJson: { reason: 'Account suspended by Platform Owner' },
          }).catch(() => {});
          throw new Error('Account suspended by Platform Owner.');
        }

        if (user.role === 'VENDOR' && user.vendor?.status === 'REJECTED') {
          const reason = user.vendor.rejectionReason || 'Compliance verification failed';
          await logAuditEvent({
            userId: user.id,
            role: user.role,
            action: 'USER_LOGIN_BLOCKED_REJECTED',
            module: 'GOVERNANCE',
            payloadJson: { reason },
          }).catch(() => {});
          throw new Error(`Account registration rejected by Platform Owner. Reason: ${reason}`);
        }

        const isValidPassword = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValidPassword) {
          throw new Error('Invalid email or password.');
        }

        await logAuditEvent({
          userId: user.id,
          role: user.role,
          action: 'USER_LOGIN_SUCCESS',
          module: 'GOVERNANCE',
          payloadJson: { email: user.email, role: user.role },
        }).catch(() => {});

        const isMfaActive = Boolean(user.mfaEnabled && user.mfaSecret);
        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
          mfaEnabled: isMfaActive,
          mfaVerified: !isMfaActive,
          mfaSecret: user.mfaSecret || null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.mfaEnabled = (user as any).mfaEnabled;
        token.mfaVerified = (user as any).mfaVerified;
        token.mfaSecret = (user as any).mfaSecret || null;
      }
      if (trigger === 'update') {
        if (session?.role) token.role = session.role;
        if (session?.mfaEnabled !== undefined) token.mfaEnabled = session.mfaEnabled;
        if (session?.mfaVerified !== undefined) token.mfaVerified = session.mfaVerified;
        if (session?.mfaSecret !== undefined) token.mfaSecret = session.mfaSecret;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role as UserRole;
        (session.user as any).mfaEnabled = token.mfaEnabled as boolean;
        (session.user as any).mfaVerified = token.mfaVerified as boolean;
        (session.user as any).mfaSecret = token.mfaSecret as string;
      }
      return session;
    },
  },
  // Insecure for production, only used as fallback for development
  secret: process.env.NEXTAUTH_SECRET || 'super-secret-ci-key-logiq-2026',
};
