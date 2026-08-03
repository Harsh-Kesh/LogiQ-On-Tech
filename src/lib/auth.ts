import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { logAuditEvent } from './audit';

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

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });

        if (!user) {
          await logAuditEvent({
            action: 'USER_LOGIN_FAILED',
            module: 'GOVERNANCE',
            payloadJson: { email: credentials.email, reason: 'User not found' },
          });
          throw new Error('Invalid email or password.');
        }

        if (user.isSuspended) {
          await logAuditEvent({
            userId: user.id,
            role: user.role,
            action: 'USER_LOGIN_BLOCKED',
            module: 'GOVERNANCE',
            payloadJson: { reason: 'Account suspended' },
          });
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
          });
          throw new Error('Invalid email or password.');
        }

        // Audit Log Success
        await logAuditEvent({
          userId: user.id,
          role: user.role,
          action: 'USER_LOGIN_SUCCESS',
          module: 'GOVERNANCE',
          payloadJson: { email: user.email, role: user.role },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
          mfaEnabled: user.mfaEnabled,
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
