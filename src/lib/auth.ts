import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { logAuditEvent } from './audit';

const DEMO_ACCOUNTS: Record<string, { id: string; fullName: string; role: UserRole; mfaEnabled: boolean }> = {
  'admin@logiqon.tech': { id: 'usr_admin_01', fullName: 'System Admin (Owner)', role: 'PLATFORM_OWNER', mfaEnabled: true },
  'vendor@logiqon.tech': { id: 'usr_vendor_01', fullName: 'Apex Hardware Manager', role: 'VENDOR', mfaEnabled: false },
  'warehouse@logiqon.tech': { id: 'usr_wh_01', fullName: 'Sydney Hub Operator', role: 'WAREHOUSE', mfaEnabled: true },
  'customer@logiqon.tech': { id: 'usr_cust_01', fullName: 'Induja Retail Buyer', role: 'CUSTOMER', mfaEnabled: false },
};

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
            if (!isValidPassword) {
              await logAuditEvent({
                userId: user.id,
                role: user.role,
                action: 'USER_LOGIN_FAILED',
                module: 'GOVERNANCE',
                payloadJson: { reason: 'Incorrect password' },
              }).catch(() => {});
              throw new Error('Invalid email or password.');
            }

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
        } catch (dbError: any) {
          console.warn('Prisma DB lookup warning, evaluating demo fallback:', dbError.message);
        }

        // Demo Accounts Fallback
        if (DEMO_ACCOUNTS[emailClean] && credentials.password === 'Password123!') {
          const demo = DEMO_ACCOUNTS[emailClean];
          return {
            id: demo.id,
            email: emailClean,
            name: demo.fullName,
            role: demo.role,
            mfaEnabled: demo.mfaEnabled,
          };
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
