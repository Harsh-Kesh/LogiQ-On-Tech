import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { logAuditEvent } from './audit';

// Pre-hashed 'Password123!' for demo accounts
const DEMO_PASSWORD_HASH = '$2a$10$wNqBqH9kE3J9z8e4b7v1t.6Gq5Y8Z9X0W1V2U3T4S5R6Q7P8O9N0M'; // Password123!

// Global runtime user store for fallback and newly registered accounts
const globalForAuth = global as unknown as {
  runtimeUsers: Record<string, { id: string; fullName: string; role: UserRole; mfaEnabled: boolean; passwordHash: string }>;
};

if (!globalForAuth.runtimeUsers) {
  const defaultPasswordHash = bcrypt.hashSync('Password123!', 10);
  globalForAuth.runtimeUsers = {
    'admin@logiqon.tech': { id: 'usr_admin_01', fullName: 'System Admin (Owner)', role: 'PLATFORM_OWNER', mfaEnabled: true, passwordHash: defaultPasswordHash },
    'vendor@logiqon.tech': { id: 'usr_vendor_01', fullName: 'Apex Hardware Manager', role: 'VENDOR', mfaEnabled: false, passwordHash: defaultPasswordHash },
    'warehouse@logiqon.tech': { id: 'usr_wh_01', fullName: 'Sydney Hub Operator', role: 'WAREHOUSE', mfaEnabled: true, passwordHash: defaultPasswordHash },
    'customer@logiqon.tech': { id: 'usr_cust_01', fullName: 'Induja Retail Buyer', role: 'CUSTOMER', mfaEnabled: false, passwordHash: defaultPasswordHash },
  };
}

export function registerRuntimeUser(email: string, fullName: string, role: UserRole, passwordHash: string) {
  const emailClean = email.toLowerCase().trim();
  globalForAuth.runtimeUsers[emailClean] = {
    id: `usr_reg_${Date.now()}`,
    fullName,
    role,
    mfaEnabled: false,
    passwordHash,
  };
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

        // 1. Attempt Database Authentication
        try {
          const user = await prisma.user.findUnique({
            where: { email: emailClean },
          });

          if (user) {
            if (user.isSuspended) {
              await logAuditEvent({
                userId: user.id,
                role: user.role,
                action: 'USER_LOGIN_BLOCKED',
                module: 'GOVERNANCE',
                payloadJson: { reason: 'Account suspended' },
              }).catch(() => {});
              throw new Error('Account suspended by Platform Owner.');
            }

            const isValidPassword = await bcrypt.compare(credentials.password, user.passwordHash);
            if (isValidPassword) {
              await logAuditEvent({
                userId: user.id,
                role: user.role,
                action: 'USER_LOGIN_SUCCESS',
                module: 'GOVERNANCE',
                payloadJson: { email: user.email, role: user.role },
              }).catch(() => {});

              return {
                id: user.id,
                email: user.email,
                name: user.fullName,
                role: user.role,
                mfaEnabled: user.mfaEnabled,
              };
            }
          }
        } catch (dbError: any) {
          console.warn('Prisma DB lookup warning, falling back to runtime user store:', dbError.message);
        }

        // 2. Check Shared Runtime User Store (Includes newly registered accounts & demo accounts)
        const runtimeUser = globalForAuth.runtimeUsers[emailClean];
        if (runtimeUser) {
          const isValidPassword = await bcrypt.compare(credentials.password, runtimeUser.passwordHash);
          if (isValidPassword) {
            return {
              id: runtimeUser.id,
              email: emailClean,
              name: runtimeUser.fullName,
              role: runtimeUser.role,
              mfaEnabled: runtimeUser.mfaEnabled,
            };
          }
        }

        throw new Error('Invalid email or password.');
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.mfaEnabled = (user as any).mfaEnabled;
      }
      if (trigger === 'update' && session?.role) {
        token.role = session.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role as UserRole;
        (session.user as any).mfaEnabled = token.mfaEnabled as boolean;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'super-secret-ci-key-logiq-2026',
};
