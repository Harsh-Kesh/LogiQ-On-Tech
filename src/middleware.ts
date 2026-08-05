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

    const role = (token.role as UserRole) || 'CUSTOMER';

    // Route RBAC Enforcement
    if (pathname.startsWith('/dashboard/owner') && role !== 'PLATFORM_OWNER' && role !== 'MDM') {
      const fallbackUrl = new URL(getDefaultDashboardForRole(role), req.url);
      return NextResponse.redirect(fallbackUrl);
    }

    if (pathname.startsWith('/dashboard/vendor') && role !== 'VENDOR' && role !== 'PLATFORM_OWNER') {
      const fallbackUrl = new URL(getDefaultDashboardForRole(role), req.url);
      return NextResponse.redirect(fallbackUrl);
    }

    if (pathname.startsWith('/dashboard/warehouse') && role !== 'WAREHOUSE' && role !== 'PLATFORM_OWNER') {
      const fallbackUrl = new URL(getDefaultDashboardForRole(role), req.url);
      return NextResponse.redirect(fallbackUrl);
    }

    if (pathname.startsWith('/dashboard/customer') && role !== 'CUSTOMER' && role !== 'PLATFORM_OWNER') {
      const fallbackUrl = new URL(getDefaultDashboardForRole(role), req.url);
      return NextResponse.redirect(fallbackUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
