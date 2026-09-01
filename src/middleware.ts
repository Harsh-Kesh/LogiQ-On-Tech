import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

type UserRole = 'PLATFORM_OWNER' | 'VENDOR';

const OWNER_DASHBOARD_ROLES: string[] = ['PLATFORM_OWNER'];
const WAREHOUSE_DASHBOARD_ROLES: string[] = ['PLATFORM_OWNER', 'VENDOR'];

function getDefaultDashboardForRole(role: string): string {
  switch (role) {
    case 'PLATFORM_OWNER': return '/dashboard/owner';
    case 'VENDOR':
    default:
      return '/dashboard/vendor';
  }
}

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

    const role = (token.role as UserRole) || 'VENDOR';
    const hasMfaSecret = Boolean(token.mfaSecret);

    // Mandatory MFA Enrolment Guard — only PLATFORM_OWNER is required to enrol.
    // A VENDOR without a secret yet is not blocked; they can opt in from MFA Security.
    if (role === 'PLATFORM_OWNER' && !hasMfaSecret && pathname !== '/dashboard/mfa-enrol') {
      return NextResponse.redirect(new URL('/dashboard/mfa-enrol', req.url));
    }

    // Login 2FA Verification Guard: If MFA is enabled & configured but not yet verified for this session
    if (hasMfaSecret && token.mfaEnabled === true && token.mfaVerified !== true) {
      return NextResponse.redirect(new URL('/auth/mfa-verify', req.url));
    }

    // Route RBAC Enforcement
    if (pathname.startsWith('/dashboard/owner')) {
      // Allow VENDOR access to the facility-scoped Stock Control Desk
      if (pathname.startsWith('/dashboard/owner/inventory') && (role === 'VENDOR' || role === 'PLATFORM_OWNER')) {
        return NextResponse.next();
      }

      if (!OWNER_DASHBOARD_ROLES.includes(role)) {
        const fallbackUrl = new URL(getDefaultDashboardForRole(role), req.url);
        return NextResponse.redirect(fallbackUrl);
      }
    }

    if (pathname.startsWith('/dashboard/vendor') && role !== 'VENDOR' && role !== 'PLATFORM_OWNER') {
      const fallbackUrl = new URL(getDefaultDashboardForRole(role), req.url);
      return NextResponse.redirect(fallbackUrl);
    }

    if (pathname.startsWith('/dashboard/warehouse') && !WAREHOUSE_DASHBOARD_ROLES.includes(role)) {
      const fallbackUrl = new URL(getDefaultDashboardForRole(role), req.url);
      return NextResponse.redirect(fallbackUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
