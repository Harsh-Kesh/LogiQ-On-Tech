import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getDefaultDashboardForRole } from '@/lib/rbac';
import { UserRole } from '@prisma/client';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET || 'super-secret-ci-key-logiq-2026' });
  const pathname = req.nextUrl.pathname;

  // Protected Dashboard Routes
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      const url = new URL('/auth/login', req.url);
      url.searchParams.set('callbackUrl', encodeURI(req.url));
      return NextResponse.redirect(url);
    }

    // Mandatory MFA Enrolment Guard: If account does not have a configured mfaSecret yet, force redirect to enrolment page
    const hasMfaSecret = Boolean(token.mfaSecret);
    if (!hasMfaSecret && pathname !== '/dashboard/mfa-enrol') {
      return NextResponse.redirect(new URL('/dashboard/mfa-enrol', req.url));
    }

    // Login 2FA Verification Guard: If MFA is enabled & configured but not yet verified for this session
    if (hasMfaSecret && token.mfaEnabled === true && token.mfaVerified !== true) {
      return NextResponse.redirect(new URL('/auth/mfa-verify', req.url));
    }

    const role = (token.role as UserRole) || 'VENDOR';

    // Route RBAC Enforcement
    if (pathname.startsWith('/dashboard/owner')) {
      if (role !== 'PLATFORM_OWNER') {
        // Allow WAREHOUSE managers access to facility-scoped inventory management
        if (pathname === '/dashboard/owner/inventory' && role === 'WAREHOUSE') {
          return NextResponse.next();
        }
        // Allow MDM users access to items and inventory pages
        if (role === 'MDM' && (pathname === '/dashboard/owner/items' || pathname === '/dashboard/owner/inventory')) {
          return NextResponse.next();
        }
        const fallbackUrl = new URL(getDefaultDashboardForRole(role), req.url);
        return NextResponse.redirect(fallbackUrl);
      }
    }

    if (pathname.startsWith('/dashboard/vendor') && role !== 'VENDOR' && role !== 'PLATFORM_OWNER') {
      const fallbackUrl = new URL(getDefaultDashboardForRole(role), req.url);
      return NextResponse.redirect(fallbackUrl);
    }

    if (pathname.startsWith('/dashboard/warehouse') && role !== 'WAREHOUSE' && role !== 'PLATFORM_OWNER') {
      const fallbackUrl = new URL(getDefaultDashboardForRole(role), req.url);
      return NextResponse.redirect(fallbackUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
