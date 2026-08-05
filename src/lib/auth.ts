import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { logAuditEvent } from './audit';
import fs from 'fs';
import path from 'path';

export interface PersistentUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  mfaEnabled: boolean;
  mfaVerified?: boolean;
  passwordHash: string;
  createdAt: string;
  companyName?: string;
  abnAcn?: string;
  status?: string;
  docs?: any[];
}

const STORAGE_DIR = path.join(process.cwd(), '.data');
const STORAGE_FILE = path.join(STORAGE_DIR, 'registered_users.json');
const OTP_FILE = path.join(STORAGE_DIR, 'reset_otps.json');

function ensureStorageDirExists() {
  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
  } catch (e) {}
}

function getSeededDemoAccounts(): Record<string, PersistentUser> {
  const defaultPasswordHash = bcrypt.hashSync('Password123!', 10);
  return {
    'admin@logiqon.tech': { id: 'usr_admin_01', email: 'admin@logiqon.tech', fullName: 'System Admin (Owner)', role: 'PLATFORM_OWNER', mfaEnabled: true, passwordHash: defaultPasswordHash, createdAt: new Date().toISOString() },
    'owner@logiqon.com': { id: 'usr_owner_01', email: 'owner@logiqon.com', fullName: 'Platform Owner', role: 'PLATFORM_OWNER', mfaEnabled: true, passwordHash: defaultPasswordHash, createdAt: new Date().toISOString() },
    'vendor@logiqon.tech': { id: 'usr_vendor_01', email: 'vendor@logiqon.tech', fullName: 'Apex Hardware Manager', role: 'VENDOR', mfaEnabled: false, passwordHash: defaultPasswordHash, createdAt: new Date().toISOString(), companyName: 'Apex Hardware & Logistics Ltd', abnAcn: '51 824 753 910', status: 'APPROVED' },
    'vendor@logiqon.com': { id: 'usr_vendor_02', email: 'vendor@logiqon.com', fullName: 'Apex Hardware Manager', role: 'VENDOR', mfaEnabled: false, passwordHash: defaultPasswordHash, createdAt: new Date().toISOString(), companyName: 'Apex Hardware & Logistics Ltd', abnAcn: '51 824 753 910', status: 'APPROVED' },
    'warehouse@logiqon.tech': { id: 'usr_wh_01', email: 'warehouse@logiqon.tech', fullName: 'Sydney Hub Operator', role: 'WAREHOUSE', mfaEnabled: true, passwordHash: defaultPasswordHash, createdAt: new Date().toISOString() },
    'warehouse@logiqon.com': { id: 'usr_wh_02', email: 'warehouse@logiqon.com', fullName: 'Sydney Hub Operator', role: 'WAREHOUSE', mfaEnabled: true, passwordHash: defaultPasswordHash, createdAt: new Date().toISOString() },
    'customer@logiqon.tech': { id: 'usr_cust_01', email: 'customer@logiqon.tech', fullName: 'Induja Retail Buyer', role: 'CUSTOMER', mfaEnabled: false, passwordHash: defaultPasswordHash, createdAt: new Date().toISOString() },
    'customer@logiqon.com': { id: 'usr_cust_02', email: 'customer@logiqon.com', fullName: 'Induja Retail Buyer', role: 'CUSTOMER', mfaEnabled: false, passwordHash: defaultPasswordHash, createdAt: new Date().toISOString() },
  };
}

export function loadPersistentUsers(): Record<string, PersistentUser> {
  ensureStorageDirExists();
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return { ...getSeededDemoAccounts(), ...parsed };
    }
  } catch (e) {}
  return getSeededDemoAccounts();
}

export function savePersistentUsers(users: Record<string, PersistentUser>) {
  ensureStorageDirExists();
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (e) {}
}

export function updateRuntimeVendorProfile(userEmail: string, companyName: string, abnAcn: string, status: string = 'UNDER_REVIEW') {
  const users = loadPersistentUsers();
  const emailClean = (userEmail || '').toLowerCase().trim();
  let entry = users[emailClean] || Object.values(users).find(u => u.email.toLowerCase() === emailClean || u.id === userEmail);
  
  if (!entry && emailClean) {
    entry = {
      id: `usr_reg_${Date.now()}`,
      email: emailClean,
      fullName: 'Vendor Partner',
      role: 'VENDOR',
      mfaEnabled: false,
      passwordHash: '',
      createdAt: new Date().toISOString(),
      companyName,
      abnAcn,
      status,
      docs: [],
    };
    users[emailClean] = entry;
  } else if (entry) {
    entry.companyName = companyName;
    entry.abnAcn = abnAcn;
    entry.status = status;
    users[entry.email.toLowerCase()] = entry;
  }
  
  savePersistentUsers(users);
}

export function addRuntimeVendorDoc(userEmail: string, doc: any) {
  const users = loadPersistentUsers();
  const emailClean = (userEmail || '').toLowerCase().trim();
  let entry = users[emailClean] || Object.values(users).find(u => u.email.toLowerCase() === emailClean || u.id === userEmail);
  
  if (!entry && emailClean) {
    entry = {
      id: `usr_reg_${Date.now()}`,
      email: emailClean,
      fullName: 'Vendor Partner',
      role: 'VENDOR',
      mfaEnabled: false,
      passwordHash: '',
      createdAt: new Date().toISOString(),
      companyName: '',
      abnAcn: '',
      status: 'UNDER_REVIEW',
      docs: [doc],
    };
    users[emailClean] = entry;
  } else if (entry) {
    if (!entry.docs) entry.docs = [];
    const idx = entry.docs.findIndex((d) => d.docType === doc.docType);
    if (idx >= 0) {
      entry.docs[idx] = doc;
    } else {
      entry.docs.unshift(doc);
    }
    entry.status = 'UNDER_REVIEW';
    users[entry.email.toLowerCase()] = entry;
  }
  
  savePersistentUsers(users);
}

export function isUserRegistered(email: string): boolean {
  const emailClean = email.toLowerCase().trim();
  const users = loadPersistentUsers();
  return !!users[emailClean];
}

export function registerRuntimeUser(email: string, fullName: string, role: UserRole, passwordHash: string): boolean {
  const emailClean = email.toLowerCase().trim();
  const users = loadPersistentUsers();

  if (users[emailClean]) {
    return false;
  }

  users[emailClean] = {
    id: `usr_reg_${Date.now()}`,
    email: emailClean,
    fullName,
    role,
    mfaEnabled: false,
    passwordHash,
    createdAt: new Date().toISOString(),
    companyName: '',
    abnAcn: '',
    status: 'PENDING',
    docs: [],
  };

  savePersistentUsers(users);
  return true;
}

export function updateRuntimeUserPassword(email: string, newPasswordHash: string) {
  const emailClean = email.toLowerCase().trim();
  const users = loadPersistentUsers();
  if (users[emailClean]) {
    users[emailClean].passwordHash = newPasswordHash;
    savePersistentUsers(users);
  }
}

export function generatePasswordResetOtp(email: string): string {
  const emailClean = email.toLowerCase().trim();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000;

  ensureStorageDirExists();
  try {
    let otps: Record<string, { code: string; expiresAt: number }> = {};
    if (fs.existsSync(OTP_FILE)) {
      otps = JSON.parse(fs.readFileSync(OTP_FILE, 'utf-8'));
    }
    otps[emailClean] = { code, expiresAt };
    fs.writeFileSync(OTP_FILE, JSON.stringify(otps, null, 2), 'utf-8');
  } catch (e) {}

  return code;
}

export function verifyPasswordResetOtp(email: string, inputCode: string): boolean {
  const emailClean = email.toLowerCase().trim();
  ensureStorageDirExists();
  try {
    if (fs.existsSync(OTP_FILE)) {
      const otps: Record<string, { code: string; expiresAt: number }> = JSON.parse(fs.readFileSync(OTP_FILE, 'utf-8'));
      const record = otps[emailClean];
      if (!record) return false;
      if (Date.now() > record.expiresAt) {
        delete otps[emailClean];
        fs.writeFileSync(OTP_FILE, JSON.stringify(otps, null, 2), 'utf-8');
        return false;
      }

      if (record.code === inputCode.trim()) {
        delete otps[emailClean];
        fs.writeFileSync(OTP_FILE, JSON.stringify(otps, null, 2), 'utf-8');
        return true;
      }
    }
  } catch (e) {}
  return false;
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
                mfaVerified: !user.mfaEnabled,
              };
            }
          }
        } catch (dbError: any) {
          console.warn('Prisma DB lookup warning, falling back to persistent file store:', dbError.message);
        }

        const persistentUsers = loadPersistentUsers();
        const runtimeUser = persistentUsers[emailClean];
        if (runtimeUser) {
          const isValidPassword = await bcrypt.compare(credentials.password, runtimeUser.passwordHash);
          if (isValidPassword) {
            return {
              id: runtimeUser.id,
              email: emailClean,
              name: runtimeUser.fullName,
              role: runtimeUser.role,
              mfaEnabled: runtimeUser.mfaEnabled,
              mfaVerified: !runtimeUser.mfaEnabled,
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
        token.mfaVerified = (user as any).mfaVerified;
      }
      if (trigger === 'update') {
        if (session?.role) token.role = session.role;
        if (session?.mfaEnabled !== undefined) token.mfaEnabled = session.mfaEnabled;
        if (session?.mfaVerified !== undefined) token.mfaVerified = session.mfaVerified;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role as UserRole;
        (session.user as any).mfaEnabled = token.mfaEnabled as boolean;
        (session.user as any).mfaVerified = token.mfaVerified as boolean;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'super-secret-ci-key-logiq-2026',
};
